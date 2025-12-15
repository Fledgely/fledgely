import { describe, it, expect } from 'vitest'
import {
  userSchema,
  createUserInputSchema,
  convertFirestoreToUser,
  validateCreateUserInput,
  safeParseUser,
  type User,
  type CreateUserInput,
} from './user.schema'

describe('userSchema', () => {
  const validUser: User = {
    uid: 'firebase-uid-123',
    email: 'parent@example.com',
    displayName: 'Jane Parent',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    lastLoginAt: new Date('2025-01-02T00:00:00Z'),
  }

  it('validates a complete user object', () => {
    expect(() => userSchema.parse(validUser)).not.toThrow()
    const result = userSchema.parse(validUser)
    expect(result.uid).toBe(validUser.uid)
    expect(result.email).toBe(validUser.email)
  })

  it('allows null displayName and photoURL', () => {
    const user = {
      ...validUser,
      displayName: null,
      photoURL: null,
    }

    expect(() => userSchema.parse(user)).not.toThrow()
  })

  it('allows undefined displayName and photoURL', () => {
    const user = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }

    expect(() => userSchema.parse(user)).not.toThrow()
  })

  it('rejects empty uid', () => {
    const user = { ...validUser, uid: '' }
    expect(() => userSchema.parse(user)).toThrow()
  })

  it('rejects missing uid', () => {
    const { uid, ...userWithoutUid } = validUser
    expect(() => userSchema.parse(userWithoutUid)).toThrow()
  })

  it('rejects invalid email', () => {
    const user = { ...validUser, email: 'not-an-email' }
    expect(() => userSchema.parse(user)).toThrow()
  })

  it('rejects missing email', () => {
    const { email, ...userWithoutEmail } = validUser
    expect(() => userSchema.parse(userWithoutEmail)).toThrow()
  })

  it('rejects invalid photoURL', () => {
    const user = { ...validUser, photoURL: 'not-a-url' }
    expect(() => userSchema.parse(user)).toThrow()
  })

  it('rejects photoURL with javascript: scheme (XSS prevention)', () => {
    const user = { ...validUser, photoURL: 'javascript:alert(1)' }
    expect(() => userSchema.parse(user)).toThrow()
  })

  it('rejects photoURL with data: scheme', () => {
    const user = { ...validUser, photoURL: 'data:image/png;base64,abc123' }
    expect(() => userSchema.parse(user)).toThrow()
  })

  it('accepts photoURL with http: scheme', () => {
    const user = { ...validUser, photoURL: 'http://example.com/photo.jpg' }
    expect(() => userSchema.parse(user)).not.toThrow()
  })

  it('normalizes email to lowercase', () => {
    const user = { ...validUser, email: 'PARENT@EXAMPLE.COM' }
    const result = userSchema.parse(user)
    expect(result.email).toBe('parent@example.com')
  })

  it('trims email whitespace', () => {
    const user = { ...validUser, email: '  parent@example.com  ' }
    const result = userSchema.parse(user)
    expect(result.email).toBe('parent@example.com')
  })

  it('rejects email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@example.com'
    const user = { ...validUser, email: longEmail }
    expect(() => userSchema.parse(user)).toThrow()
  })

  it('rejects missing createdAt', () => {
    const { createdAt, ...userWithoutCreatedAt } = validUser
    expect(() => userSchema.parse(userWithoutCreatedAt)).toThrow()
  })

  it('rejects missing lastLoginAt', () => {
    const { lastLoginAt, ...userWithoutLastLoginAt } = validUser
    expect(() => userSchema.parse(userWithoutLastLoginAt)).toThrow()
  })

  it('rejects invalid date for createdAt', () => {
    const user = { ...validUser, createdAt: 'not-a-date' }
    expect(() => userSchema.parse(user)).toThrow()
  })
})

describe('createUserInputSchema', () => {
  const validInput: CreateUserInput = {
    uid: 'firebase-uid-123',
    email: 'parent@example.com',
    displayName: 'Jane Parent',
    photoURL: 'https://example.com/photo.jpg',
  }

  it('validates a complete input', () => {
    expect(() => createUserInputSchema.parse(validInput)).not.toThrow()
  })

  it('allows null displayName and photoURL', () => {
    const input = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
      displayName: null,
      photoURL: null,
    }

    expect(() => createUserInputSchema.parse(input)).not.toThrow()
  })

  it('allows minimal input (uid and email only)', () => {
    const input = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
    }

    expect(() => createUserInputSchema.parse(input)).not.toThrow()
  })

  it('rejects empty uid', () => {
    const input = { ...validInput, uid: '' }
    expect(() => createUserInputSchema.parse(input)).toThrow()
  })

  it('rejects invalid email', () => {
    const input = { ...validInput, email: 'invalid' }
    expect(() => createUserInputSchema.parse(input)).toThrow()
  })

  it('rejects invalid photoURL', () => {
    const input = { ...validInput, photoURL: 'not-a-url' }
    expect(() => createUserInputSchema.parse(input)).toThrow()
  })

  it('rejects photoURL with javascript: scheme (XSS prevention)', () => {
    const input = { ...validInput, photoURL: 'javascript:alert(1)' }
    expect(() => createUserInputSchema.parse(input)).toThrow()
  })

  it('normalizes email to lowercase', () => {
    const input = { ...validInput, email: 'PARENT@EXAMPLE.COM' }
    const result = createUserInputSchema.parse(input)
    expect(result.email).toBe('parent@example.com')
  })
})

describe('convertFirestoreToUser', () => {
  it('converts Firestore timestamps to Date objects', () => {
    const now = new Date('2025-01-01T12:00:00Z')
    const later = new Date('2025-01-02T12:00:00Z')

    const firestoreData = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
      displayName: 'Jane Parent',
      photoURL: 'https://example.com/photo.jpg',
      createdAt: { toDate: () => now },
      lastLoginAt: { toDate: () => later },
    }

    const user = convertFirestoreToUser(firestoreData)

    expect(user.createdAt).toEqual(now)
    expect(user.lastLoginAt).toEqual(later)
    expect(user.uid).toBe('firebase-uid-123')
    expect(user.email).toBe('parent@example.com')
  })

  it('handles null displayName and photoURL', () => {
    const now = new Date()

    const firestoreData = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
      displayName: null,
      photoURL: null,
      createdAt: { toDate: () => now },
      lastLoginAt: { toDate: () => now },
    }

    const user = convertFirestoreToUser(firestoreData)

    expect(user.displayName).toBeNull()
    expect(user.photoURL).toBeNull()
  })
})

describe('validateCreateUserInput', () => {
  it('returns typed input when valid', () => {
    const input = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
      displayName: 'Jane Parent',
      photoURL: 'https://example.com/photo.jpg',
    }

    const result = validateCreateUserInput(input)

    expect(result.uid).toBe(input.uid)
    expect(result.email).toBe(input.email)
  })

  it('throws on invalid input', () => {
    const input = {
      uid: '',
      email: 'invalid',
    }

    expect(() => validateCreateUserInput(input)).toThrow()
  })
})

describe('safeParseUser', () => {
  it('returns User when valid', () => {
    const user = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
      displayName: null,
      photoURL: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }

    const result = safeParseUser(user)

    expect(result).not.toBeNull()
    expect(result?.uid).toBe(user.uid)
  })

  it('returns null when invalid', () => {
    const invalid = {
      uid: '',
      email: 'invalid',
    }

    const result = safeParseUser(invalid)

    expect(result).toBeNull()
  })

  it('returns null for non-object input', () => {
    expect(safeParseUser(null)).toBeNull()
    expect(safeParseUser(undefined)).toBeNull()
    expect(safeParseUser('string')).toBeNull()
  })
})
