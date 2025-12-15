import { describe, it, expect } from 'vitest'
import {
  familySchema,
  familyGuardianSchema,
  createFamilyInputSchema,
  guardianRoleSchema,
  guardianPermissionSchema,
  convertFirestoreToFamily,
  validateCreateFamilyInput,
  safeParseFamily,
  isGuardianInFamily,
  getGuardianRole,
  getGuardianPermissions,
  hasFullPermissions,
  type Family,
  type FamilyFirestore,
} from './family.schema'

describe('guardianRoleSchema', () => {
  it('accepts valid roles', () => {
    expect(() => guardianRoleSchema.parse('primary')).not.toThrow()
    expect(() => guardianRoleSchema.parse('co-parent')).not.toThrow()
  })

  it('rejects invalid roles', () => {
    expect(() => guardianRoleSchema.parse('admin')).toThrow()
    expect(() => guardianRoleSchema.parse('parent')).toThrow()
    expect(() => guardianRoleSchema.parse('')).toThrow()
  })
})

describe('guardianPermissionSchema', () => {
  it('accepts valid permissions', () => {
    expect(() => guardianPermissionSchema.parse('full')).not.toThrow()
    expect(() => guardianPermissionSchema.parse('readonly')).not.toThrow()
  })

  it('rejects invalid permissions', () => {
    expect(() => guardianPermissionSchema.parse('admin')).toThrow()
    expect(() => guardianPermissionSchema.parse('write')).toThrow()
    expect(() => guardianPermissionSchema.parse('')).toThrow()
  })
})

describe('familyGuardianSchema', () => {
  it('validates a complete guardian object', () => {
    const guardian = {
      uid: 'guardian-uid-123',
      role: 'primary',
      permissions: 'full',
      joinedAt: new Date(),
    }

    expect(() => familyGuardianSchema.parse(guardian)).not.toThrow()
  })

  it('rejects guardian with empty uid', () => {
    const guardian = {
      uid: '',
      role: 'primary',
      permissions: 'full',
      joinedAt: new Date(),
    }

    expect(() => familyGuardianSchema.parse(guardian)).toThrow()
  })

  it('rejects guardian with invalid role', () => {
    const guardian = {
      uid: 'guardian-uid-123',
      role: 'invalid-role',
      permissions: 'full',
      joinedAt: new Date(),
    }

    expect(() => familyGuardianSchema.parse(guardian)).toThrow()
  })
})

describe('familySchema', () => {
  const validFamily = {
    id: 'family-id-123',
    createdAt: new Date(),
    createdBy: 'user-uid-123',
    guardians: [
      {
        uid: 'user-uid-123',
        role: 'primary',
        permissions: 'full',
        joinedAt: new Date(),
      },
    ],
    children: [],
  }

  it('validates a complete family object', () => {
    expect(() => familySchema.parse(validFamily)).not.toThrow()
  })

  it('validates family with multiple guardians', () => {
    const family = {
      ...validFamily,
      guardians: [
        ...validFamily.guardians,
        {
          uid: 'co-parent-uid-456',
          role: 'co-parent',
          permissions: 'full',
          joinedAt: new Date(),
        },
      ],
    }

    expect(() => familySchema.parse(family)).not.toThrow()
  })

  it('validates family with children', () => {
    const family = {
      ...validFamily,
      children: ['child-1', 'child-2'],
    }

    expect(() => familySchema.parse(family)).not.toThrow()
  })

  it('rejects family with empty id', () => {
    const family = {
      ...validFamily,
      id: '',
    }

    expect(() => familySchema.parse(family)).toThrow()
  })

  it('rejects family with empty createdBy', () => {
    const family = {
      ...validFamily,
      createdBy: '',
    }

    expect(() => familySchema.parse(family)).toThrow()
  })

  it('rejects family with no guardians', () => {
    const family = {
      ...validFamily,
      guardians: [],
    }

    expect(() => familySchema.parse(family)).toThrow()
  })

  it('defaults children to empty array', () => {
    const familyWithoutChildren = {
      id: 'family-id-123',
      createdAt: new Date(),
      createdBy: 'user-uid-123',
      guardians: validFamily.guardians,
    }

    const result = familySchema.parse(familyWithoutChildren)
    expect(result.children).toEqual([])
  })
})

describe('createFamilyInputSchema', () => {
  it('validates valid input', () => {
    const input = { createdBy: 'user-uid-123' }
    expect(() => createFamilyInputSchema.parse(input)).not.toThrow()
  })

  it('rejects empty createdBy', () => {
    const input = { createdBy: '' }
    expect(() => createFamilyInputSchema.parse(input)).toThrow()
  })

  // Adversarial input validation tests
  describe('adversarial input validation', () => {
    it('rejects whitespace-only createdBy', () => {
      const input = { createdBy: '   ' }
      expect(() => createFamilyInputSchema.parse(input)).toThrow('Creator ID cannot be only whitespace')
    })

    it('rejects createdBy with forward slashes (path injection)', () => {
      const input = { createdBy: 'user/with/slashes' }
      expect(() => createFamilyInputSchema.parse(input)).toThrow('Creator ID contains invalid characters')
    })

    it('rejects very long createdBy (DoS prevention)', () => {
      const input = { createdBy: 'a'.repeat(2000) }
      expect(() => createFamilyInputSchema.parse(input)).toThrow('Creator ID is too long')
    })

    it('rejects createdBy with null bytes', () => {
      const input = { createdBy: 'user\x00id' }
      expect(() => createFamilyInputSchema.parse(input)).toThrow('Creator ID contains invalid characters')
    })

    it('accepts valid Firebase Auth uids', () => {
      // Firebase Auth UIDs are typically 28 characters
      const input = { createdBy: 'Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Q' }
      expect(() => createFamilyInputSchema.parse(input)).not.toThrow()
    })

    it('accepts uids with hyphens and underscores', () => {
      const input = { createdBy: 'user-id_123' }
      expect(() => createFamilyInputSchema.parse(input)).not.toThrow()
    })
  })
})

describe('convertFirestoreToFamily', () => {
  it('converts Firestore timestamps to Date objects', () => {
    const now = new Date()
    const firestoreData: FamilyFirestore = {
      id: 'family-id-123',
      createdAt: { toDate: () => now },
      createdBy: 'user-uid-123',
      guardians: [
        {
          uid: 'user-uid-123',
          role: 'primary',
          permissions: 'full',
          joinedAt: { toDate: () => now },
        },
      ],
      children: [],
    }

    const result = convertFirestoreToFamily(firestoreData)

    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.createdAt.getTime()).toBe(now.getTime())
    expect(result.guardians[0].joinedAt).toBeInstanceOf(Date)
    expect(result.guardians[0].joinedAt.getTime()).toBe(now.getTime())
  })
})

describe('validateCreateFamilyInput', () => {
  it('returns parsed input for valid data', () => {
    const input = { createdBy: 'user-uid-123' }
    const result = validateCreateFamilyInput(input)
    expect(result.createdBy).toBe('user-uid-123')
  })

  it('throws for invalid data', () => {
    expect(() => validateCreateFamilyInput({ createdBy: '' })).toThrow()
    expect(() => validateCreateFamilyInput({})).toThrow()
  })
})

describe('safeParseFamily', () => {
  const validFamily = {
    id: 'family-id-123',
    createdAt: new Date(),
    createdBy: 'user-uid-123',
    guardians: [
      {
        uid: 'user-uid-123',
        role: 'primary',
        permissions: 'full',
        joinedAt: new Date(),
      },
    ],
    children: [],
  }

  it('returns family for valid data', () => {
    const result = safeParseFamily(validFamily)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('family-id-123')
  })

  it('returns null for invalid data', () => {
    const result = safeParseFamily({ invalid: 'data' })
    expect(result).toBeNull()
  })
})

describe('guardian helper functions', () => {
  const family: Family = {
    id: 'family-id-123',
    createdAt: new Date(),
    createdBy: 'user-uid-123',
    guardians: [
      {
        uid: 'user-uid-123',
        role: 'primary',
        permissions: 'full',
        joinedAt: new Date(),
      },
      {
        uid: 'co-parent-uid-456',
        role: 'co-parent',
        permissions: 'readonly',
        joinedAt: new Date(),
      },
    ],
    children: ['child-1'],
  }

  describe('isGuardianInFamily', () => {
    it('returns true for existing guardian', () => {
      expect(isGuardianInFamily(family, 'user-uid-123')).toBe(true)
      expect(isGuardianInFamily(family, 'co-parent-uid-456')).toBe(true)
    })

    it('returns false for non-guardian', () => {
      expect(isGuardianInFamily(family, 'stranger-uid')).toBe(false)
      expect(isGuardianInFamily(family, 'child-1')).toBe(false)
    })
  })

  describe('getGuardianRole', () => {
    it('returns role for existing guardian', () => {
      expect(getGuardianRole(family, 'user-uid-123')).toBe('primary')
      expect(getGuardianRole(family, 'co-parent-uid-456')).toBe('co-parent')
    })

    it('returns null for non-guardian', () => {
      expect(getGuardianRole(family, 'stranger-uid')).toBeNull()
    })
  })

  describe('getGuardianPermissions', () => {
    it('returns permissions for existing guardian', () => {
      expect(getGuardianPermissions(family, 'user-uid-123')).toBe('full')
      expect(getGuardianPermissions(family, 'co-parent-uid-456')).toBe('readonly')
    })

    it('returns null for non-guardian', () => {
      expect(getGuardianPermissions(family, 'stranger-uid')).toBeNull()
    })
  })

  describe('hasFullPermissions', () => {
    it('returns true for guardian with full permissions', () => {
      expect(hasFullPermissions(family, 'user-uid-123')).toBe(true)
    })

    it('returns false for guardian with readonly permissions', () => {
      expect(hasFullPermissions(family, 'co-parent-uid-456')).toBe(false)
    })

    it('returns false for non-guardian', () => {
      expect(hasFullPermissions(family, 'stranger-uid')).toBe(false)
    })
  })
})
