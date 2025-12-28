/**
 * Unit tests for email service.
 */

import { describe, it, expect } from 'vitest'
import { isValidEmail } from './emailService'

describe('isValidEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('user+tag@example.org')).toBe(true)
    expect(isValidEmail('name123@test-domain.com')).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail('spaces in@email.com')).toBe(false)
    expect(isValidEmail('noat.example.com')).toBe(false)
  })

  it('rejects emails with multiple @ signs', () => {
    expect(isValidEmail('test@@example.com')).toBe(false)
    expect(isValidEmail('test@test@example.com')).toBe(false)
  })
})
