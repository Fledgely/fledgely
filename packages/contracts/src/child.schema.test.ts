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
