import { describe, it, expect } from 'vitest'
import {
  childGuardianPermissionSchema,
  childGuardianSchema,
  childProfileSchema,
  createChildInputSchema,
  updateChildInputSchema,
  convertFirestoreToChildProfile,
  validateCreateChildInput,
  safeParseChildProfile,
  calculateAge,
  isGuardianForChild,
  getChildGuardianPermissions,
  hasFullChildPermissions,
  getChildDisplayName,
  getChildFullName,
  getAgeCategory,
  hasCustodyDeclaration,
  canStartMonitoring,
  // Story 2.6: Remove Child
  removeChildConfirmationSchema,
  childRemovalAuditMetadataSchema,
  validateRemoveChildConfirmation,
  safeParseRemoveChildConfirmation,
  isConfirmationTextValid,
  getChildRemovalErrorMessage,
  CHILD_REMOVAL_ERROR_MESSAGES,
  type ChildProfile,
  type ChildProfileFirestore,
} from './child.schema'

describe('childGuardianPermissionSchema', () => {
  it('accepts valid permissions', () => {
    expect(() => childGuardianPermissionSchema.parse('full')).not.toThrow()
    expect(() => childGuardianPermissionSchema.parse('readonly')).not.toThrow()
  })

  it('rejects invalid permissions', () => {
    expect(() => childGuardianPermissionSchema.parse('admin')).toThrow()
    expect(() => childGuardianPermissionSchema.parse('write')).toThrow()
    expect(() => childGuardianPermissionSchema.parse('')).toThrow()
  })
})

describe('childGuardianSchema', () => {
  it('validates a complete guardian object', () => {
    const guardian = {
      uid: 'guardian-uid-123',
      permissions: 'full',
      grantedAt: new Date(),
    }

    expect(() => childGuardianSchema.parse(guardian)).not.toThrow()
  })

  it('rejects guardian with empty uid', () => {
    const guardian = {
      uid: '',
      permissions: 'full',
      grantedAt: new Date(),
    }

    expect(() => childGuardianSchema.parse(guardian)).toThrow()
  })

  it('rejects guardian with invalid permissions', () => {
    const guardian = {
      uid: 'guardian-uid-123',
      permissions: 'invalid',
      grantedAt: new Date(),
    }

    expect(() => childGuardianSchema.parse(guardian)).toThrow()
  })
})

describe('childProfileSchema', () => {
  const validChild = {
    id: 'child-id-123',
    familyId: 'family-id-456',
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
    guardians: [
      {
        uid: 'guardian-uid-123',
        permissions: 'full',
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'guardian-uid-123',
  }

  it('validates a complete child profile', () => {
    expect(() => childProfileSchema.parse(validChild)).not.toThrow()
  })

  it('validates child with all optional fields', () => {
    const child = {
      ...validChild,
      lastName: 'Smith',
      nickname: 'Em',
      photoUrl: 'https://example.com/photo.jpg',
    }

    expect(() => childProfileSchema.parse(child)).not.toThrow()
  })

  it('validates child with multiple guardians', () => {
    const child = {
      ...validChild,
      guardians: [
        ...validChild.guardians,
        {
          uid: 'co-parent-uid-456',
          permissions: 'full',
          grantedAt: new Date(),
        },
      ],
    }

    expect(() => childProfileSchema.parse(child)).not.toThrow()
  })

  it('rejects child with empty id', () => {
    const child = {
      ...validChild,
      id: '',
    }

    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects child with empty familyId', () => {
    const child = {
      ...validChild,
      familyId: '',
    }

    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects child with empty firstName', () => {
    const child = {
      ...validChild,
      firstName: '',
    }

    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects child with no guardians', () => {
    const child = {
      ...validChild,
      guardians: [],
    }

    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects firstName over 50 characters', () => {
    const child = {
      ...validChild,
      firstName: 'A'.repeat(51),
    }

    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects lastName over 50 characters', () => {
    const child = {
      ...validChild,
      lastName: 'A'.repeat(51),
    }

    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects nickname over 30 characters', () => {
    const child = {
      ...validChild,
      nickname: 'A'.repeat(31),
    }

    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects invalid photoUrl', () => {
    const child = {
      ...validChild,
      photoUrl: 'not-a-valid-url',
    }

    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('accepts null values for optional fields', () => {
    const child = {
      ...validChild,
      lastName: null,
      nickname: null,
      photoUrl: null,
    }

    expect(() => childProfileSchema.parse(child)).not.toThrow()
  })
})

describe('createChildInputSchema', () => {
  const validInput = {
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
  }

  it('validates valid input with required fields', () => {
    expect(() => createChildInputSchema.parse(validInput)).not.toThrow()
  })

  it('validates input with all fields', () => {
    const input = {
      ...validInput,
      lastName: 'Smith',
      photoUrl: 'https://example.com/photo.jpg',
    }

    expect(() => createChildInputSchema.parse(input)).not.toThrow()
  })

  it('rejects empty firstName', () => {
    const input = { ...validInput, firstName: '' }
    expect(() => createChildInputSchema.parse(input)).toThrow('Name is required')
  })

  it('rejects whitespace-only firstName', () => {
    const input = { ...validInput, firstName: '   ' }
    expect(() => createChildInputSchema.parse(input)).toThrow('Name cannot be only spaces')
  })

  it('rejects firstName with forward slashes (path injection)', () => {
    const input = { ...validInput, firstName: 'name/with/slashes' }
    expect(() => createChildInputSchema.parse(input)).toThrow(
      'Name contains characters that are not allowed'
    )
  })

  it('rejects firstName with null bytes', () => {
    const input = { ...validInput, firstName: 'name\x00with\x00nulls' }
    expect(() => createChildInputSchema.parse(input)).toThrow(
      'Name contains characters that are not allowed'
    )
  })

  it('rejects firstName over 50 characters', () => {
    const input = { ...validInput, firstName: 'A'.repeat(51) }
    expect(() => createChildInputSchema.parse(input)).toThrow(
      'Name cannot be more than 50 characters'
    )
  })

  it('rejects birthdate in the future', () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const input = { ...validInput, birthdate: futureDate }
    expect(() => createChildInputSchema.parse(input)).toThrow('Birthdate cannot be in the future')
  })

  it('rejects child 18 or older', () => {
    const eighteenYearsAgo = new Date()
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
    eighteenYearsAgo.setDate(eighteenYearsAgo.getDate() - 1) // One day past 18th birthday

    const input = { ...validInput, birthdate: eighteenYearsAgo }
    expect(() => createChildInputSchema.parse(input)).toThrow(
      'Fledgely is designed for children under 18'
    )
  })

  it('accepts child just under 18', () => {
    const justUnder18 = new Date()
    justUnder18.setFullYear(justUnder18.getFullYear() - 18)
    justUnder18.setDate(justUnder18.getDate() + 1) // One day before 18th birthday

    const input = { ...validInput, birthdate: justUnder18 }
    expect(() => createChildInputSchema.parse(input)).not.toThrow()
  })

  it('accepts valid photoUrl', () => {
    const input = {
      ...validInput,
      photoUrl: 'https://storage.example.com/photos/child.jpg',
    }
    expect(() => createChildInputSchema.parse(input)).not.toThrow()
  })

  it('rejects invalid photoUrl', () => {
    const input = {
      ...validInput,
      photoUrl: 'not-a-url',
    }
    expect(() => createChildInputSchema.parse(input)).toThrow('Please enter a valid URL')
  })

  it('transforms empty lastName to null', () => {
    const input = {
      ...validInput,
      lastName: '',
    }
    const result = createChildInputSchema.parse(input)
    expect(result.lastName).toBeNull()
  })

  it('transforms empty photoUrl to null', () => {
    const input = {
      ...validInput,
      photoUrl: '',
    }
    const result = createChildInputSchema.parse(input)
    expect(result.photoUrl).toBeNull()
  })

  it('trims firstName', () => {
    const input = {
      ...validInput,
      firstName: '  Emma  ',
    }
    const result = createChildInputSchema.parse(input)
    expect(result.firstName).toBe('Emma')
  })

  it('trims lastName', () => {
    const input = {
      ...validInput,
      lastName: '  Smith  ',
    }
    const result = createChildInputSchema.parse(input)
    expect(result.lastName).toBe('Smith')
  })
})

describe('updateChildInputSchema', () => {
  it('accepts partial updates', () => {
    expect(() => updateChildInputSchema.parse({ firstName: 'Emma' })).not.toThrow()
    expect(() => updateChildInputSchema.parse({ lastName: 'Smith' })).not.toThrow()
    expect(() => updateChildInputSchema.parse({ nickname: 'Em' })).not.toThrow()
  })

  it('accepts empty object (no changes)', () => {
    expect(() => updateChildInputSchema.parse({})).not.toThrow()
  })

  it('applies same validation rules as create', () => {
    expect(() => updateChildInputSchema.parse({ firstName: '' })).toThrow()
    expect(() => updateChildInputSchema.parse({ nickname: 'A'.repeat(31) })).toThrow()
  })
})

describe('convertFirestoreToChildProfile', () => {
  it('converts Firestore timestamps to Date objects', () => {
    const now = new Date()
    const birthdate = new Date('2015-06-15')
    const firestoreData: ChildProfileFirestore = {
      id: 'child-id-123',
      familyId: 'family-id-456',
      firstName: 'Emma',
      lastName: null,
      nickname: null,
      birthdate: { toDate: () => birthdate },
      photoUrl: null,
      guardians: [
        {
          uid: 'guardian-uid-123',
          permissions: 'full',
          grantedAt: { toDate: () => now },
        },
      ],
      createdAt: { toDate: () => now },
      createdBy: 'guardian-uid-123',
    }

    const result = convertFirestoreToChildProfile(firestoreData)

    expect(result.birthdate).toBeInstanceOf(Date)
    expect(result.birthdate.getTime()).toBe(birthdate.getTime())
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.createdAt.getTime()).toBe(now.getTime())
    expect(result.guardians[0].grantedAt).toBeInstanceOf(Date)
    expect(result.guardians[0].grantedAt.getTime()).toBe(now.getTime())
  })
})

describe('validateCreateChildInput', () => {
  it('returns parsed input for valid data', () => {
    const input = {
      firstName: 'Emma',
      birthdate: new Date('2015-06-15'),
    }
    const result = validateCreateChildInput(input)
    expect(result.firstName).toBe('Emma')
  })

  it('throws for invalid data', () => {
    expect(() => validateCreateChildInput({ firstName: '' })).toThrow()
    expect(() => validateCreateChildInput({})).toThrow()
  })
})

describe('safeParseChildProfile', () => {
  const validChild = {
    id: 'child-id-123',
    familyId: 'family-id-456',
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
    guardians: [
      {
        uid: 'guardian-uid-123',
        permissions: 'full',
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'guardian-uid-123',
  }

  it('returns child for valid data', () => {
    const result = safeParseChildProfile(validChild)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('child-id-123')
  })

  it('returns null for invalid data', () => {
    const result = safeParseChildProfile({ invalid: 'data' })
    expect(result).toBeNull()
  })
})

describe('calculateAge', () => {
  it('calculates age correctly for past birthday this year', () => {
    const today = new Date()
    const birthdate = new Date(today.getFullYear() - 10, today.getMonth() - 1, today.getDate())

    expect(calculateAge(birthdate)).toBe(10)
  })

  it('calculates age correctly for future birthday this year', () => {
    const today = new Date()
    const birthdate = new Date(today.getFullYear() - 10, today.getMonth() + 1, today.getDate())

    expect(calculateAge(birthdate)).toBe(9)
  })

  it('calculates age correctly on birthday', () => {
    const today = new Date()
    const birthdate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())

    expect(calculateAge(birthdate)).toBe(10)
  })

  it('handles leap year birthdate', () => {
    // Test for a child born on Feb 29
    const leapYearBirthdate = new Date('2016-02-29')
    const expectedAge = new Date().getFullYear() - 2016

    // Age depends on whether their birthday has occurred
    const age = calculateAge(leapYearBirthdate)
    expect(age).toBeGreaterThanOrEqual(expectedAge - 1)
    expect(age).toBeLessThanOrEqual(expectedAge)
  })

  it('returns 0 for infant born today', () => {
    expect(calculateAge(new Date())).toBe(0)
  })

  it('returns correct age for various ages', () => {
    const today = new Date()

    // 5 year old
    const fiveYearsAgo = new Date(today.getFullYear() - 5, 0, 1)
    expect(calculateAge(fiveYearsAgo)).toBeGreaterThanOrEqual(4)
    expect(calculateAge(fiveYearsAgo)).toBeLessThanOrEqual(5)

    // 17 year old
    const seventeenYearsAgo = new Date(today.getFullYear() - 17, 0, 1)
    expect(calculateAge(seventeenYearsAgo)).toBeGreaterThanOrEqual(16)
    expect(calculateAge(seventeenYearsAgo)).toBeLessThanOrEqual(17)
  })
})

describe('guardian helper functions', () => {
  const child: ChildProfile = {
    id: 'child-id-123',
    familyId: 'family-id-456',
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
    guardians: [
      {
        uid: 'guardian-uid-123',
        permissions: 'full',
        grantedAt: new Date(),
      },
      {
        uid: 'caregiver-uid-456',
        permissions: 'readonly',
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'guardian-uid-123',
  }

  describe('isGuardianForChild', () => {
    it('returns true for existing guardian', () => {
      expect(isGuardianForChild(child, 'guardian-uid-123')).toBe(true)
      expect(isGuardianForChild(child, 'caregiver-uid-456')).toBe(true)
    })

    it('returns false for non-guardian', () => {
      expect(isGuardianForChild(child, 'stranger-uid')).toBe(false)
    })
  })

  describe('getChildGuardianPermissions', () => {
    it('returns permissions for existing guardian', () => {
      expect(getChildGuardianPermissions(child, 'guardian-uid-123')).toBe('full')
      expect(getChildGuardianPermissions(child, 'caregiver-uid-456')).toBe('readonly')
    })

    it('returns null for non-guardian', () => {
      expect(getChildGuardianPermissions(child, 'stranger-uid')).toBeNull()
    })
  })

  describe('hasFullChildPermissions', () => {
    it('returns true for guardian with full permissions', () => {
      expect(hasFullChildPermissions(child, 'guardian-uid-123')).toBe(true)
    })

    it('returns false for guardian with readonly permissions', () => {
      expect(hasFullChildPermissions(child, 'caregiver-uid-456')).toBe(false)
    })

    it('returns false for non-guardian', () => {
      expect(hasFullChildPermissions(child, 'stranger-uid')).toBe(false)
    })
  })
})

describe('name helper functions', () => {
  describe('getChildDisplayName', () => {
    it('returns nickname if present', () => {
      const child: ChildProfile = {
        id: 'child-id',
        familyId: 'family-id',
        firstName: 'Emma',
        nickname: 'Em',
        birthdate: new Date(),
        guardians: [{ uid: 'uid', permissions: 'full', grantedAt: new Date() }],
        createdAt: new Date(),
        createdBy: 'uid',
      }

      expect(getChildDisplayName(child)).toBe('Em')
    })

    it('returns firstName if no nickname', () => {
      const child: ChildProfile = {
        id: 'child-id',
        familyId: 'family-id',
        firstName: 'Emma',
        birthdate: new Date(),
        guardians: [{ uid: 'uid', permissions: 'full', grantedAt: new Date() }],
        createdAt: new Date(),
        createdBy: 'uid',
      }

      expect(getChildDisplayName(child)).toBe('Emma')
    })
  })

  describe('getChildFullName', () => {
    it('returns first and last name if present', () => {
      const child: ChildProfile = {
        id: 'child-id',
        familyId: 'family-id',
        firstName: 'Emma',
        lastName: 'Smith',
        birthdate: new Date(),
        guardians: [{ uid: 'uid', permissions: 'full', grantedAt: new Date() }],
        createdAt: new Date(),
        createdBy: 'uid',
      }

      expect(getChildFullName(child)).toBe('Emma Smith')
    })

    it('returns just firstName if no lastName', () => {
      const child: ChildProfile = {
        id: 'child-id',
        familyId: 'family-id',
        firstName: 'Emma',
        birthdate: new Date(),
        guardians: [{ uid: 'uid', permissions: 'full', grantedAt: new Date() }],
        createdAt: new Date(),
        createdBy: 'uid',
      }

      expect(getChildFullName(child)).toBe('Emma')
    })
  })
})

describe('getAgeCategory', () => {
  const createBirthdateForAge = (age: number): Date => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - age)
    return date
  }

  it('returns young-child for ages 0-7', () => {
    expect(getAgeCategory(createBirthdateForAge(0))).toBe('young-child')
    expect(getAgeCategory(createBirthdateForAge(5))).toBe('young-child')
    expect(getAgeCategory(createBirthdateForAge(7))).toBe('young-child')
  })

  it('returns tween for ages 8-10', () => {
    expect(getAgeCategory(createBirthdateForAge(8))).toBe('tween')
    expect(getAgeCategory(createBirthdateForAge(9))).toBe('tween')
    expect(getAgeCategory(createBirthdateForAge(10))).toBe('tween')
  })

  it('returns teen for ages 11-14', () => {
    expect(getAgeCategory(createBirthdateForAge(11))).toBe('teen')
    expect(getAgeCategory(createBirthdateForAge(12))).toBe('teen')
    expect(getAgeCategory(createBirthdateForAge(14))).toBe('teen')
  })

  it('returns older-teen for ages 15-17', () => {
    expect(getAgeCategory(createBirthdateForAge(15))).toBe('older-teen')
    expect(getAgeCategory(createBirthdateForAge(16))).toBe('older-teen')
    expect(getAgeCategory(createBirthdateForAge(17))).toBe('older-teen')
  })
})

describe('adversarial input validation', () => {
  describe('createChildInputSchema adversarial tests', () => {
    const validBirthdate = new Date('2015-06-15')

    it('rejects very long firstName (DoS prevention)', () => {
      const input = {
        firstName: 'A'.repeat(1000),
        birthdate: validBirthdate,
      }
      expect(() => createChildInputSchema.parse(input)).toThrow()
    })

    it('rejects firstName with XSS attempt (< character blocked)', () => {
      const input = {
        firstName: '<script>alert("xss")</script>',
        birthdate: validBirthdate,
      }
      // The < character is part of the invalid character regex
      // This provides defense-in-depth against XSS
      expect(() => createChildInputSchema.parse(input)).toThrow()
    })

    it('rejects firstName with SQL injection attempt (blocked by XSS protection)', () => {
      const input = {
        firstName: "'; DROP TABLE children; --",
        birthdate: validBirthdate,
      }
      // Although Firestore doesn't use SQL, XSS protection blocks special chars like '
      // This provides defense-in-depth against multiple attack vectors
      expect(() => createChildInputSchema.parse(input)).toThrow()
    })

    it('rejects invalid date types', () => {
      const input = {
        firstName: 'Emma',
        birthdate: 'not-a-date',
      }
      expect(() => createChildInputSchema.parse(input)).toThrow()
    })

    it('handles extremely old birthdate', () => {
      const input = {
        firstName: 'Emma',
        birthdate: new Date('1900-01-01'),
      }
      // Should fail age validation (over 18)
      expect(() => createChildInputSchema.parse(input)).toThrow()
    })

    it('handles negative year birthdate', () => {
      const input = {
        firstName: 'Emma',
        birthdate: new Date('-000001-01-01'),
      }
      // Invalid date should fail
      expect(() => createChildInputSchema.parse(input)).toThrow()
    })
  })
})

// Story 2.3: Custody Declaration Tests
describe('childProfileSchema with custody fields', () => {
  const baseChild = {
    id: 'child-id-123',
    familyId: 'family-id-456',
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
    guardians: [
      {
        uid: 'guardian-uid-123',
        permissions: 'full' as const,
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'guardian-uid-123',
  }

  it('accepts child without custody declaration (undefined)', () => {
    expect(() => childProfileSchema.parse(baseChild)).not.toThrow()
  })

  it('accepts child with null custody declaration', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: null,
    }
    expect(() => childProfileSchema.parse(child)).not.toThrow()
  })

  it('accepts child with sole custody declaration', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'sole',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(() => childProfileSchema.parse(child)).not.toThrow()
  })

  it('accepts child with shared custody declaration', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'shared',
        notes: 'Joint custody with co-parent',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
      requiresSharedCustodySafeguards: true,
    }
    const result = childProfileSchema.parse(child)
    expect(result.custodyDeclaration?.type).toBe('shared')
    expect(result.requiresSharedCustodySafeguards).toBe(true)
  })

  it('accepts child with complex custody declaration', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'complex',
        notes: 'Blended family with step-parents',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(() => childProfileSchema.parse(child)).not.toThrow()
  })

  it('accepts child with custody history', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'shared',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
      custodyHistory: [
        {
          previousDeclaration: {
            type: 'sole',
            declaredBy: 'guardian-uid-123',
            declaredAt: new Date('2024-01-01'),
          },
          changedAt: new Date('2024-06-01'),
          changedBy: 'guardian-uid-123',
        },
      ],
    }
    const result = childProfileSchema.parse(child)
    expect(result.custodyHistory.length).toBe(1)
    expect(result.custodyHistory[0].previousDeclaration.type).toBe('sole')
  })

  it('defaults custodyHistory to empty array', () => {
    const result = childProfileSchema.parse(baseChild)
    expect(result.custodyHistory).toEqual([])
  })

  it('defaults requiresSharedCustodySafeguards to false', () => {
    const result = childProfileSchema.parse(baseChild)
    expect(result.requiresSharedCustodySafeguards).toBe(false)
  })

  it('rejects invalid custody type', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'invalid-type',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(() => childProfileSchema.parse(child)).toThrow()
  })
})

describe('convertFirestoreToChildProfile with custody fields', () => {
  it('converts custody declaration timestamps', () => {
    const now = new Date()
    const birthdate = new Date('2015-06-15')
    const declaredAt = new Date('2024-06-01')

    const firestoreData: ChildProfileFirestore = {
      id: 'child-id-123',
      familyId: 'family-id-456',
      firstName: 'Emma',
      lastName: null,
      nickname: null,
      birthdate: { toDate: () => birthdate },
      photoUrl: null,
      guardians: [
        {
          uid: 'guardian-uid-123',
          permissions: 'full',
          grantedAt: { toDate: () => now },
        },
      ],
      createdAt: { toDate: () => now },
      createdBy: 'guardian-uid-123',
      custodyDeclaration: {
        type: 'shared',
        notes: 'Joint custody',
        declaredBy: 'guardian-uid-123',
        declaredAt: { toDate: () => declaredAt },
      },
      custodyHistory: [],
      requiresSharedCustodySafeguards: true,
    }

    const result = convertFirestoreToChildProfile(firestoreData)

    expect(result.custodyDeclaration).not.toBeNull()
    expect(result.custodyDeclaration?.type).toBe('shared')
    expect(result.custodyDeclaration?.declaredAt).toBeInstanceOf(Date)
    expect(result.custodyDeclaration?.declaredAt.getTime()).toBe(declaredAt.getTime())
    expect(result.requiresSharedCustodySafeguards).toBe(true)
  })

  it('converts custody history with timestamps', () => {
    const now = new Date()
    const birthdate = new Date('2015-06-15')
    const oldDeclaredAt = new Date('2024-01-01')
    const changedAt = new Date('2024-06-01')
    const newDeclaredAt = new Date('2024-06-01')

    const firestoreData: ChildProfileFirestore = {
      id: 'child-id-123',
      familyId: 'family-id-456',
      firstName: 'Emma',
      lastName: null,
      nickname: null,
      birthdate: { toDate: () => birthdate },
      photoUrl: null,
      guardians: [
        {
          uid: 'guardian-uid-123',
          permissions: 'full',
          grantedAt: { toDate: () => now },
        },
      ],
      createdAt: { toDate: () => now },
      createdBy: 'guardian-uid-123',
      custodyDeclaration: {
        type: 'shared',
        notes: null,
        declaredBy: 'guardian-uid-123',
        declaredAt: { toDate: () => newDeclaredAt },
      },
      custodyHistory: [
        {
          previousDeclaration: {
            type: 'sole',
            notes: null,
            declaredBy: 'guardian-uid-123',
            declaredAt: { toDate: () => oldDeclaredAt },
          },
          changedAt: { toDate: () => changedAt },
          changedBy: 'guardian-uid-123',
        },
      ],
      requiresSharedCustodySafeguards: true,
    }

    const result = convertFirestoreToChildProfile(firestoreData)

    expect(result.custodyHistory.length).toBe(1)
    expect(result.custodyHistory[0].previousDeclaration.type).toBe('sole')
    expect(result.custodyHistory[0].previousDeclaration.declaredAt).toBeInstanceOf(Date)
    expect(result.custodyHistory[0].changedAt).toBeInstanceOf(Date)
  })

  it('handles null custody declaration', () => {
    const now = new Date()
    const birthdate = new Date('2015-06-15')

    const firestoreData: ChildProfileFirestore = {
      id: 'child-id-123',
      familyId: 'family-id-456',
      firstName: 'Emma',
      lastName: null,
      nickname: null,
      birthdate: { toDate: () => birthdate },
      photoUrl: null,
      guardians: [
        {
          uid: 'guardian-uid-123',
          permissions: 'full',
          grantedAt: { toDate: () => now },
        },
      ],
      createdAt: { toDate: () => now },
      createdBy: 'guardian-uid-123',
      custodyDeclaration: null,
      custodyHistory: [],
      requiresSharedCustodySafeguards: false,
    }

    const result = convertFirestoreToChildProfile(firestoreData)
    expect(result.custodyDeclaration).toBeNull()
  })
})

describe('hasCustodyDeclaration', () => {
  const baseChild: ChildProfile = {
    id: 'child-id-123',
    familyId: 'family-id-456',
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
    guardians: [
      {
        uid: 'guardian-uid-123',
        permissions: 'full',
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'guardian-uid-123',
    custodyHistory: [],
    requiresSharedCustodySafeguards: false,
  }

  it('returns true when custody is declared (sole)', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: {
        type: 'sole',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(hasCustodyDeclaration(child)).toBe(true)
  })

  it('returns true when custody is declared (shared)', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: {
        type: 'shared',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(hasCustodyDeclaration(child)).toBe(true)
  })

  it('returns true when custody is declared (complex)', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: {
        type: 'complex',
        notes: 'Blended family',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(hasCustodyDeclaration(child)).toBe(true)
  })

  it('returns false when custody declaration is null', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: null,
    }
    expect(hasCustodyDeclaration(child)).toBe(false)
  })

  it('returns false when custody declaration is undefined', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: undefined,
    }
    expect(hasCustodyDeclaration(child)).toBe(false)
  })
})

describe('canStartMonitoring', () => {
  const baseChild: ChildProfile = {
    id: 'child-id-123',
    familyId: 'family-id-456',
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
    guardians: [
      {
        uid: 'guardian-uid-123',
        permissions: 'full',
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'guardian-uid-123',
    custodyHistory: [],
    requiresSharedCustodySafeguards: false,
  }

  it('returns true when custody is declared', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: {
        type: 'sole',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(canStartMonitoring(child)).toBe(true)
  })

  it('returns false when custody declaration is null', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: null,
    }
    expect(canStartMonitoring(child)).toBe(false)
  })

  it('returns false when custody declaration is undefined', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: undefined,
    }
    expect(canStartMonitoring(child)).toBe(false)
  })

  it('returns true for shared custody (monitoring allowed after declaration)', () => {
    const child: ChildProfile = {
      ...baseChild,
      custodyDeclaration: {
        type: 'shared',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
      requiresSharedCustodySafeguards: true,
    }
    // Monitoring can start once custody is declared, even with shared custody
    // The requiresSharedCustodySafeguards flag enables additional safeguards (Epic 3A)
    expect(canStartMonitoring(child)).toBe(true)
  })
})

describe('custody adversarial tests', () => {
  const baseChild = {
    id: 'child-id-123',
    familyId: 'family-id-456',
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
    guardians: [
      {
        uid: 'guardian-uid-123',
        permissions: 'full' as const,
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'guardian-uid-123',
  }

  it('rejects custody declaration with XSS in notes', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'complex',
        notes: '<script>alert("xss")</script>',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects custody declaration with empty declaredBy', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'sole',
        declaredBy: '',
        declaredAt: new Date(),
      },
    }
    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects custody history with XSS in notes', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'shared',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
      custodyHistory: [
        {
          previousDeclaration: {
            type: 'sole',
            notes: '<img onerror="alert(1)">',
            declaredBy: 'guardian-uid-123',
            declaredAt: new Date('2024-01-01'),
          },
          changedAt: new Date('2024-06-01'),
          changedBy: 'guardian-uid-123',
        },
      ],
    }
    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('rejects custody history with empty changedBy', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'shared',
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
      custodyHistory: [
        {
          previousDeclaration: {
            type: 'sole',
            declaredBy: 'guardian-uid-123',
            declaredAt: new Date('2024-01-01'),
          },
          changedAt: new Date('2024-06-01'),
          changedBy: '',
        },
      ],
    }
    expect(() => childProfileSchema.parse(child)).toThrow()
  })

  it('accepts custody notes at max length (500 chars)', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'complex',
        notes: 'A'.repeat(500),
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(() => childProfileSchema.parse(child)).not.toThrow()
  })

  it('rejects custody notes over max length', () => {
    const child = {
      ...baseChild,
      custodyDeclaration: {
        type: 'complex',
        notes: 'A'.repeat(501),
        declaredBy: 'guardian-uid-123',
        declaredAt: new Date(),
      },
    }
    expect(() => childProfileSchema.parse(child)).toThrow()
  })
})

// ============================================================================
// STORY 2.6: Remove Child from Family
// ============================================================================

describe('removeChildConfirmationSchema', () => {
  const validConfirmation = {
    childId: 'child-id-123',
    confirmationText: 'Emma',
    reauthToken: 'fresh-token-abc-123',
  }

  it('accepts valid confirmation input', () => {
    const result = removeChildConfirmationSchema.parse(validConfirmation)
    expect(result.childId).toBe('child-id-123')
    expect(result.confirmationText).toBe('Emma')
    expect(result.reauthToken).toBe('fresh-token-abc-123')
  })

  it('trims confirmation text', () => {
    const input = {
      ...validConfirmation,
      confirmationText: '  Emma  ',
    }
    const result = removeChildConfirmationSchema.parse(input)
    expect(result.confirmationText).toBe('Emma')
  })

  it('rejects empty childId', () => {
    const input = { ...validConfirmation, childId: '' }
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow('Child ID is required')
  })

  it('rejects childId over max length', () => {
    const input = { ...validConfirmation, childId: 'A'.repeat(201) }
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow('Invalid child ID')
  })

  it('rejects childId with forward slashes', () => {
    const input = { ...validConfirmation, childId: 'path/to/child' }
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow('Invalid child ID format')
  })

  it('rejects childId with null bytes', () => {
    const input = { ...validConfirmation, childId: 'child\x00id' }
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow('Invalid child ID format')
  })

  it('rejects empty confirmationText', () => {
    const input = { ...validConfirmation, confirmationText: '' }
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow("Please type the child's name to confirm")
  })

  it('rejects confirmationText over max length', () => {
    const input = { ...validConfirmation, confirmationText: 'A'.repeat(51) }
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow('Confirmation text is too long')
  })

  it('rejects empty reauthToken', () => {
    const input = { ...validConfirmation, reauthToken: '' }
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow('Please sign in again to confirm this action')
  })

  it('rejects missing required fields', () => {
    expect(() => removeChildConfirmationSchema.parse({})).toThrow()
    expect(() => removeChildConfirmationSchema.parse({ childId: 'id' })).toThrow()
    expect(() => removeChildConfirmationSchema.parse({ childId: 'id', confirmationText: 'Emma' })).toThrow()
  })
})

describe('childRemovalAuditMetadataSchema', () => {
  const validMetadata = {
    childName: 'Emma',
    childFullName: 'Emma Smith',
  }

  it('accepts valid metadata with required fields only', () => {
    const result = childRemovalAuditMetadataSchema.parse(validMetadata)
    expect(result.childName).toBe('Emma')
    expect(result.childFullName).toBe('Emma Smith')
    expect(result.hadDevices).toBe(false) // default
    expect(result.devicesUnenrolled).toBe(0) // default
    expect(result.hadScreenshots).toBe(false) // default
    expect(result.screenshotsDeleted).toBe(0) // default
  })

  it('accepts valid metadata with all fields', () => {
    const input = {
      ...validMetadata,
      hadDevices: true,
      devicesUnenrolled: 2,
      hadScreenshots: true,
      screenshotsDeleted: 150,
    }
    const result = childRemovalAuditMetadataSchema.parse(input)
    expect(result.hadDevices).toBe(true)
    expect(result.devicesUnenrolled).toBe(2)
    expect(result.hadScreenshots).toBe(true)
    expect(result.screenshotsDeleted).toBe(150)
  })

  it('rejects empty childName', () => {
    const input = { ...validMetadata, childName: '' }
    expect(() => childRemovalAuditMetadataSchema.parse(input)).toThrow()
  })

  it('rejects empty childFullName', () => {
    const input = { ...validMetadata, childFullName: '' }
    expect(() => childRemovalAuditMetadataSchema.parse(input)).toThrow()
  })

  it('rejects negative device counts', () => {
    const input = { ...validMetadata, devicesUnenrolled: -1 }
    expect(() => childRemovalAuditMetadataSchema.parse(input)).toThrow()
  })

  it('rejects negative screenshot counts', () => {
    const input = { ...validMetadata, screenshotsDeleted: -5 }
    expect(() => childRemovalAuditMetadataSchema.parse(input)).toThrow()
  })

  it('rejects non-integer device counts', () => {
    const input = { ...validMetadata, devicesUnenrolled: 2.5 }
    expect(() => childRemovalAuditMetadataSchema.parse(input)).toThrow()
  })
})

describe('validateRemoveChildConfirmation', () => {
  it('returns parsed confirmation for valid input', () => {
    const input = {
      childId: 'child-123',
      confirmationText: 'Emma',
      reauthToken: 'token-abc',
    }
    const result = validateRemoveChildConfirmation(input)
    expect(result.childId).toBe('child-123')
    expect(result.confirmationText).toBe('Emma')
  })

  it('throws for invalid input', () => {
    expect(() => validateRemoveChildConfirmation({})).toThrow()
    expect(() => validateRemoveChildConfirmation({ childId: '' })).toThrow()
  })
})

describe('safeParseRemoveChildConfirmation', () => {
  it('returns confirmation for valid input', () => {
    const input = {
      childId: 'child-123',
      confirmationText: 'Emma',
      reauthToken: 'token-abc',
    }
    const result = safeParseRemoveChildConfirmation(input)
    expect(result).not.toBeNull()
    expect(result?.childId).toBe('child-123')
  })

  it('returns null for invalid input', () => {
    expect(safeParseRemoveChildConfirmation({})).toBeNull()
    expect(safeParseRemoveChildConfirmation({ childId: '' })).toBeNull()
    expect(safeParseRemoveChildConfirmation(null)).toBeNull()
    expect(safeParseRemoveChildConfirmation(undefined)).toBeNull()
  })
})

describe('isConfirmationTextValid', () => {
  it('returns true for exact match (case-insensitive)', () => {
    expect(isConfirmationTextValid('Emma', 'Emma')).toBe(true)
    expect(isConfirmationTextValid('emma', 'Emma')).toBe(true)
    expect(isConfirmationTextValid('EMMA', 'Emma')).toBe(true)
    expect(isConfirmationTextValid('EmMa', 'emma')).toBe(true)
  })

  it('returns true with whitespace trimmed', () => {
    expect(isConfirmationTextValid('  Emma  ', 'Emma')).toBe(true)
    expect(isConfirmationTextValid('Emma', '  Emma  ')).toBe(true)
    expect(isConfirmationTextValid('  Emma  ', '  Emma  ')).toBe(true)
  })

  it('returns false for non-matching text', () => {
    expect(isConfirmationTextValid('Em', 'Emma')).toBe(false)
    expect(isConfirmationTextValid('Emma Smith', 'Emma')).toBe(false)
    expect(isConfirmationTextValid('Emmma', 'Emma')).toBe(false)
    expect(isConfirmationTextValid('', 'Emma')).toBe(false)
  })

  it('handles special cases', () => {
    expect(isConfirmationTextValid('O\'Connor', "O'Connor")).toBe(true)
    expect(isConfirmationTextValid('Mary-Jane', 'Mary-Jane')).toBe(true)
    expect(isConfirmationTextValid('Émilie', 'Émilie')).toBe(true)
  })
})

describe('getChildRemovalErrorMessage', () => {
  it('returns correct message for known error codes', () => {
    expect(getChildRemovalErrorMessage('child-not-found')).toBe('We could not find this child.')
    expect(getChildRemovalErrorMessage('permission-denied')).toBe(
      'You do not have permission to remove this child.'
    )
    expect(getChildRemovalErrorMessage('reauth-required')).toBe(
      'Please sign in again to confirm this action.'
    )
    expect(getChildRemovalErrorMessage('reauth-expired')).toBe(
      'Your sign-in has expired. Please try again.'
    )
    expect(getChildRemovalErrorMessage('reauth-cancelled')).toBe(
      'Sign-in was cancelled. Please try again.'
    )
    expect(getChildRemovalErrorMessage('confirmation-mismatch')).toBe(
      'The name you typed does not match. Please try again.'
    )
    expect(getChildRemovalErrorMessage('removal-failed')).toBe(
      'Could not remove the child. Please try again.'
    )
    expect(getChildRemovalErrorMessage('removal-in-progress')).toBe(
      'Removal is already in progress. Please wait.'
    )
    expect(getChildRemovalErrorMessage('network-error')).toBe(
      'Connection problem. Please check your internet and try again.'
    )
  })

  it('returns default message for unknown error codes', () => {
    expect(getChildRemovalErrorMessage('unknown-error')).toBe('Something went wrong. Please try again.')
    expect(getChildRemovalErrorMessage('')).toBe('Something went wrong. Please try again.')
    expect(getChildRemovalErrorMessage('random-code')).toBe('Something went wrong. Please try again.')
  })

  it('has all error messages at 6th-grade reading level', () => {
    // All messages should be simple sentences
    Object.values(CHILD_REMOVAL_ERROR_MESSAGES).forEach((message) => {
      expect(message).toBeTruthy()
      expect(message.length).toBeLessThan(100) // Short messages
      expect(message.split(' ').length).toBeLessThan(15) // Few words
    })
  })
})

describe('removeChildConfirmationSchema adversarial tests', () => {
  const validConfirmation = {
    childId: 'child-id-123',
    confirmationText: 'Emma',
    reauthToken: 'fresh-token-abc-123',
  }

  it('rejects XSS attempts in childId', () => {
    const input = {
      ...validConfirmation,
      childId: '<script>alert("xss")</script>',
    }
    // Forward slash is blocked by Firebase ID regex
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow()
  })

  it('rejects path traversal in childId', () => {
    const input = {
      ...validConfirmation,
      childId: '../../../etc/passwd',
    }
    expect(() => removeChildConfirmationSchema.parse(input)).toThrow()
  })

  it('accepts confirmationText with apostrophes (valid names like O\'Connor)', () => {
    // Note: Confirmation text doesn't have XSS protection since it's only
    // compared against the child's name, not stored or rendered
    const input = {
      ...validConfirmation,
      confirmationText: "O'Connor",
    }
    expect(() => removeChildConfirmationSchema.parse(input)).not.toThrow()
  })

  it('rejects whitespace-only inputs', () => {
    expect(() =>
      removeChildConfirmationSchema.parse({
        ...validConfirmation,
        confirmationText: '   ',
      })
    ).toThrow()
  })

  it('handles unicode characters in confirmationText', () => {
    const input = {
      ...validConfirmation,
      confirmationText: 'Éloïse',
    }
    const result = removeChildConfirmationSchema.parse(input)
    expect(result.confirmationText).toBe('Éloïse')
  })

  it('handles very long reauthToken (JWT tokens can be long)', () => {
    const input = {
      ...validConfirmation,
      reauthToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.' + 'a'.repeat(2000),
    }
    // Should accept long tokens as JWTs can be quite long
    expect(() => removeChildConfirmationSchema.parse(input)).not.toThrow()
  })
})
