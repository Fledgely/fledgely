/**
 * Tests for login session and device fingerprint schemas.
 *
 * Story 41.5: New Login Notifications - AC1, AC2, AC6
 */

import { describe, it, expect } from 'vitest'
import {
  deviceTypeSchema,
  deviceFingerprintSchema,
  loginSessionSchema,
  trustedDeviceSchema,
  parseUserAgent,
  generateFingerprintId,
  hashIpAddress,
  buildDeviceDescription,
  trackLoginSessionInputSchema,
  trackLoginSessionOutputSchema,
  addTrustedDeviceInputSchema,
  removeTrustedDeviceInputSchema,
  trustedDeviceListOutputSchema,
} from './loginSession'

describe('deviceTypeSchema', () => {
  it('accepts valid device types', () => {
    expect(deviceTypeSchema.parse('desktop')).toBe('desktop')
    expect(deviceTypeSchema.parse('mobile')).toBe('mobile')
    expect(deviceTypeSchema.parse('tablet')).toBe('tablet')
    expect(deviceTypeSchema.parse('unknown')).toBe('unknown')
  })

  it('rejects invalid device types', () => {
    expect(() => deviceTypeSchema.parse('laptop')).toThrow()
    expect(() => deviceTypeSchema.parse('')).toThrow()
  })
})

describe('deviceFingerprintSchema', () => {
  const validFingerprint = {
    id: 'fp-abc123',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    deviceType: 'desktop' as const,
    browser: 'Chrome',
    os: 'Windows 10',
    approximateLocation: 'San Francisco, CA',
    createdAt: Date.now(),
  }

  it('accepts valid fingerprint with location', () => {
    const result = deviceFingerprintSchema.parse(validFingerprint)
    expect(result.id).toBe('fp-abc123')
    expect(result.browser).toBe('Chrome')
    expect(result.approximateLocation).toBe('San Francisco, CA')
  })

  it('accepts fingerprint with null location', () => {
    const fp = { ...validFingerprint, approximateLocation: null }
    const result = deviceFingerprintSchema.parse(fp)
    expect(result.approximateLocation).toBeNull()
  })

  it('rejects fingerprint with missing id', () => {
    const { id: _id, ...incomplete } = validFingerprint
    expect(() => deviceFingerprintSchema.parse(incomplete)).toThrow()
  })

  it('rejects fingerprint with empty id', () => {
    expect(() => deviceFingerprintSchema.parse({ ...validFingerprint, id: '' })).toThrow()
  })
})

describe('loginSessionSchema', () => {
  const validSession = {
    id: 'session-123',
    userId: 'user-456',
    familyId: 'family-789',
    fingerprintId: 'fp-abc123',
    isNewDevice: true,
    isTrusted: false,
    ipHash: 'abcd1234efgh5678',
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  }

  it('accepts valid session', () => {
    const result = loginSessionSchema.parse(validSession)
    expect(result.id).toBe('session-123')
    expect(result.isNewDevice).toBe(true)
    expect(result.isTrusted).toBe(false)
  })

  it('accepts session with trusted device', () => {
    const session = { ...validSession, isNewDevice: false, isTrusted: true }
    const result = loginSessionSchema.parse(session)
    expect(result.isNewDevice).toBe(false)
    expect(result.isTrusted).toBe(true)
  })

  it('rejects session with missing userId', () => {
    const { userId: _userId, ...incomplete } = validSession
    expect(() => loginSessionSchema.parse(incomplete)).toThrow()
  })

  it('rejects session with empty familyId', () => {
    expect(() => loginSessionSchema.parse({ ...validSession, familyId: '' })).toThrow()
  })
})

describe('trustedDeviceSchema', () => {
  const validTrustedDevice = {
    id: 'fp-abc123',
    userId: 'user-456',
    fingerprintId: 'fp-abc123',
    deviceName: 'My MacBook Pro',
    createdAt: Date.now(),
  }

  it('accepts valid trusted device', () => {
    const result = trustedDeviceSchema.parse(validTrustedDevice)
    expect(result.id).toBe('fp-abc123')
    expect(result.deviceName).toBe('My MacBook Pro')
  })

  it('accepts trusted device with empty name', () => {
    const device = { ...validTrustedDevice, deviceName: '' }
    const result = trustedDeviceSchema.parse(device)
    expect(result.deviceName).toBe('')
  })

  it('rejects trusted device with missing fingerprintId', () => {
    const { fingerprintId: _fp, ...incomplete } = validTrustedDevice
    expect(() => trustedDeviceSchema.parse(incomplete)).toThrow()
  })
})

describe('parseUserAgent', () => {
  it('parses Chrome on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Chrome')
    expect(result.os).toBe('Windows 10')
    expect(result.deviceType).toBe('desktop')
  })

  it('parses Safari on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Safari')
    expect(result.os).toBe('macOS')
    expect(result.deviceType).toBe('desktop')
  })

  it('parses Chrome on Android mobile', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Chrome')
    expect(result.os).toBe('Android')
    expect(result.deviceType).toBe('mobile')
  })

  it('parses Safari on iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Safari')
    expect(result.os).toBe('iOS')
    expect(result.deviceType).toBe('mobile')
  })

  it('parses Safari on iPad', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Safari')
    expect(result.os).toBe('iOS')
    expect(result.deviceType).toBe('tablet')
  })

  it('parses Firefox on Linux', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/120.0'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Firefox')
    expect(result.os).toBe('Linux')
    expect(result.deviceType).toBe('desktop')
  })

  it('parses Edge on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Edge')
    expect(result.os).toBe('Windows 10')
    expect(result.deviceType).toBe('desktop')
  })

  it('parses Chrome OS', () => {
    const ua =
      'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Chrome')
    expect(result.os).toBe('Chrome OS')
    expect(result.deviceType).toBe('desktop')
  })

  it('returns unknown for unrecognized user agent', () => {
    const ua = 'Some unknown browser/1.0'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Unknown')
    expect(result.os).toBe('Unknown')
    expect(result.deviceType).toBe('desktop')
  })
})

describe('generateFingerprintId', () => {
  it('generates consistent fingerprint for same inputs', () => {
    const params = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      ipHash: 'abcd1234',
    }
    const id1 = generateFingerprintId(params)
    const id2 = generateFingerprintId(params)
    expect(id1).toBe(id2)
    expect(id1.length).toBe(32)
  })

  it('generates different fingerprints for different IPs', () => {
    const params1 = {
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      ipHash: 'abcd1234',
    }
    const params2 = {
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      ipHash: 'efgh5678',
    }
    expect(generateFingerprintId(params1)).not.toBe(generateFingerprintId(params2))
  })

  it('generates different fingerprints for different browsers', () => {
    const params1 = {
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      ipHash: 'abcd1234',
    }
    const params2 = {
      userAgent: 'Mozilla/5.0 Firefox/120.0',
      ipHash: 'abcd1234',
    }
    expect(generateFingerprintId(params1)).not.toBe(generateFingerprintId(params2))
  })
})

describe('hashIpAddress', () => {
  it('generates consistent hash for same IP', () => {
    const hash1 = hashIpAddress('192.168.1.1')
    const hash2 = hashIpAddress('192.168.1.1')
    expect(hash1).toBe(hash2)
    expect(hash1.length).toBe(16)
  })

  it('generates different hashes for different IPs', () => {
    const hash1 = hashIpAddress('192.168.1.1')
    const hash2 = hashIpAddress('192.168.1.2')
    expect(hash1).not.toBe(hash2)
  })

  it('uses salt in hash', () => {
    const hash1 = hashIpAddress('192.168.1.1', 'salt1')
    const hash2 = hashIpAddress('192.168.1.1', 'salt2')
    expect(hash1).not.toBe(hash2)
  })
})

describe('buildDeviceDescription', () => {
  it('builds description for desktop without location', () => {
    const desc = buildDeviceDescription({
      browser: 'Chrome',
      os: 'Windows 10',
      deviceType: 'desktop',
    })
    expect(desc).toBe('Chrome on Windows 10 computer')
  })

  it('builds description for mobile with location', () => {
    const desc = buildDeviceDescription({
      browser: 'Safari',
      os: 'iOS',
      deviceType: 'mobile',
      approximateLocation: 'San Francisco',
    })
    expect(desc).toBe('Safari on iOS phone near San Francisco')
  })

  it('builds description for tablet', () => {
    const desc = buildDeviceDescription({
      browser: 'Chrome',
      os: 'Android',
      deviceType: 'tablet',
    })
    expect(desc).toBe('Chrome on Android tablet')
  })

  it('handles null location', () => {
    const desc = buildDeviceDescription({
      browser: 'Firefox',
      os: 'Linux',
      deviceType: 'desktop',
      approximateLocation: null,
    })
    expect(desc).toBe('Firefox on Linux computer')
  })

  it('handles unknown device type', () => {
    const desc = buildDeviceDescription({
      browser: 'Unknown',
      os: 'Unknown',
      deviceType: 'unknown',
    })
    expect(desc).toBe('Unknown on Unknown device')
  })
})

describe('trackLoginSessionInputSchema', () => {
  it('accepts valid input with location', () => {
    const result = trackLoginSessionInputSchema.parse({
      familyId: 'family-123',
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      ipAddress: '192.168.1.1',
      approximateLocation: 'San Francisco, CA',
    })
    expect(result.familyId).toBe('family-123')
    expect(result.userAgent).toBe('Mozilla/5.0 Chrome/120.0.0.0')
    expect(result.approximateLocation).toBe('San Francisco, CA')
  })

  it('accepts input without location', () => {
    const result = trackLoginSessionInputSchema.parse({
      familyId: 'family-123',
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      ipAddress: '192.168.1.1',
    })
    expect(result.approximateLocation).toBeUndefined()
  })

  it('accepts input with null location', () => {
    const result = trackLoginSessionInputSchema.parse({
      familyId: 'family-123',
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      ipAddress: '192.168.1.1',
      approximateLocation: null,
    })
    expect(result.approximateLocation).toBeNull()
  })

  it('rejects input without familyId', () => {
    expect(() =>
      trackLoginSessionInputSchema.parse({
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
        ipAddress: '192.168.1.1',
      })
    ).toThrow()
  })
})

describe('trackLoginSessionOutputSchema', () => {
  it('accepts valid output', () => {
    const result = trackLoginSessionOutputSchema.parse({
      success: true,
      sessionId: 'session-123',
      isNewDevice: true,
      isTrusted: false,
      notificationSent: true,
      fingerprint: {
        id: 'fp-abc123',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows 10',
      },
    })
    expect(result.success).toBe(true)
    expect(result.sessionId).toBe('session-123')
    expect(result.isNewDevice).toBe(true)
    expect(result.fingerprint.id).toBe('fp-abc123')
  })
})

describe('addTrustedDeviceInputSchema', () => {
  it('accepts input with custom name', () => {
    const result = addTrustedDeviceInputSchema.parse({
      fingerprintId: 'fp-abc123',
      deviceName: 'My MacBook',
    })
    expect(result.fingerprintId).toBe('fp-abc123')
    expect(result.deviceName).toBe('My MacBook')
  })

  it('accepts input without custom name', () => {
    const result = addTrustedDeviceInputSchema.parse({
      fingerprintId: 'fp-abc123',
    })
    expect(result.fingerprintId).toBe('fp-abc123')
    expect(result.deviceName).toBeUndefined()
  })

  it('rejects input with empty fingerprintId', () => {
    expect(() => addTrustedDeviceInputSchema.parse({ fingerprintId: '' })).toThrow()
  })
})

describe('removeTrustedDeviceInputSchema', () => {
  it('accepts valid input', () => {
    const result = removeTrustedDeviceInputSchema.parse({
      fingerprintId: 'fp-abc123',
    })
    expect(result.fingerprintId).toBe('fp-abc123')
  })

  it('rejects input with empty fingerprintId', () => {
    expect(() => removeTrustedDeviceInputSchema.parse({ fingerprintId: '' })).toThrow()
  })
})

describe('trustedDeviceListOutputSchema', () => {
  it('accepts valid output with devices', () => {
    const result = trustedDeviceListOutputSchema.parse({
      devices: [
        {
          id: 'fp-abc123',
          userId: 'user-456',
          fingerprintId: 'fp-abc123',
          deviceName: 'My MacBook',
          createdAt: Date.now(),
        },
      ],
    })
    expect(result.devices).toHaveLength(1)
    expect(result.devices[0].deviceName).toBe('My MacBook')
  })

  it('accepts output with empty device list', () => {
    const result = trustedDeviceListOutputSchema.parse({
      devices: [],
    })
    expect(result.devices).toHaveLength(0)
  })
})
