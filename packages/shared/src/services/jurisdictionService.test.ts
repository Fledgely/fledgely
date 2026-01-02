/**
 * JurisdictionService Tests - Story 7.5.5 Task 2
 *
 * TDD tests for jurisdiction determination and mandatory reporting requirements.
 * AC1: Jurisdiction information for mandatory reporting
 * AC6: Partner capability registration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  getFamilyJurisdiction,
  isValidJurisdictionCode,
  deriveJurisdictionFromAddress,
  jurisdictionHasMandatoryReporting,
  getPartnersForJurisdiction,
  MANDATORY_REPORTING_JURISDICTIONS,
} from './jurisdictionService'
import { createCrisisPartner } from '../contracts/crisisPartner'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}))

describe('JurisdictionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================
  // isValidJurisdictionCode Tests
  // ============================================

  describe('isValidJurisdictionCode', () => {
    it('should validate country codes (2 uppercase letters)', () => {
      expect(isValidJurisdictionCode('US')).toBe(true)
      expect(isValidJurisdictionCode('UK')).toBe(true)
      expect(isValidJurisdictionCode('CA')).toBe(true)
      expect(isValidJurisdictionCode('AU')).toBe(true)
      expect(isValidJurisdictionCode('DE')).toBe(true)
      expect(isValidJurisdictionCode('FR')).toBe(true)
    })

    it('should validate country-state codes (2 letters, hyphen, 2-3 letters)', () => {
      expect(isValidJurisdictionCode('US-CA')).toBe(true)
      expect(isValidJurisdictionCode('US-NY')).toBe(true)
      expect(isValidJurisdictionCode('US-TX')).toBe(true)
      expect(isValidJurisdictionCode('AU-NSW')).toBe(true)
      expect(isValidJurisdictionCode('AU-VIC')).toBe(true)
      expect(isValidJurisdictionCode('CA-ON')).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(isValidJurisdictionCode('')).toBe(false)
      expect(isValidJurisdictionCode('A')).toBe(false)
      expect(isValidJurisdictionCode('USA')).toBe(false)
      expect(isValidJurisdictionCode('us')).toBe(false)
      expect(isValidJurisdictionCode('Us')).toBe(false)
      expect(isValidJurisdictionCode('US-')).toBe(false)
      expect(isValidJurisdictionCode('-CA')).toBe(false)
      expect(isValidJurisdictionCode('US-CALI')).toBe(false)
      expect(isValidJurisdictionCode('US-C')).toBe(false)
      expect(isValidJurisdictionCode('123')).toBe(false)
      expect(isValidJurisdictionCode('US-123')).toBe(false)
    })
  })

  // ============================================
  // deriveJurisdictionFromAddress Tests
  // ============================================

  describe('deriveJurisdictionFromAddress', () => {
    it('should derive country-state jurisdiction when state is provided', () => {
      expect(deriveJurisdictionFromAddress('US', 'CA', null)).toBe('US-CA')
      expect(deriveJurisdictionFromAddress('US', 'NY', null)).toBe('US-NY')
      expect(deriveJurisdictionFromAddress('AU', 'NSW', null)).toBe('AU-NSW')
      expect(deriveJurisdictionFromAddress('CA', 'ON', null)).toBe('CA-ON')
    })

    it('should derive country-only jurisdiction when no state', () => {
      expect(deriveJurisdictionFromAddress('US', null, null)).toBe('US')
      expect(deriveJurisdictionFromAddress('UK', null, null)).toBe('UK')
      expect(deriveJurisdictionFromAddress('AU', null, null)).toBe('AU')
    })

    it('should handle lowercase inputs by converting to uppercase', () => {
      expect(deriveJurisdictionFromAddress('us', 'ca', null)).toBe('US-CA')
      expect(deriveJurisdictionFromAddress('Uk', null, null)).toBe('UK')
      expect(deriveJurisdictionFromAddress('au', 'nsw', null)).toBe('AU-NSW')
    })

    it('should throw for empty country', () => {
      expect(() => deriveJurisdictionFromAddress('', null, null)).toThrow('Country is required')
    })

    it('should throw for invalid country format', () => {
      expect(() => deriveJurisdictionFromAddress('USA', null, null)).toThrow(
        'Invalid country format'
      )
      expect(() => deriveJurisdictionFromAddress('U', null, null)).toThrow('Invalid country format')
    })

    it('should throw for invalid state format', () => {
      expect(() => deriveJurisdictionFromAddress('US', 'California', null)).toThrow(
        'Invalid state format'
      )
      expect(() => deriveJurisdictionFromAddress('US', 'C', null)).toThrow('Invalid state format')
    })

    it('should use postal code to derive state for US (when applicable)', () => {
      // California postal codes start with 9
      expect(deriveJurisdictionFromAddress('US', null, '90210')).toBe('US-CA')
      // New York postal codes start with 1
      expect(deriveJurisdictionFromAddress('US', null, '10001')).toBe('US-NY')
      // Texas postal codes start with 7
      expect(deriveJurisdictionFromAddress('US', null, '75001')).toBe('US-TX')
    })

    it('should prefer state over postal code when both provided', () => {
      expect(deriveJurisdictionFromAddress('US', 'NY', '90210')).toBe('US-NY')
    })

    it('should return country only for unknown postal code patterns', () => {
      // Non-digit starting postal code won't match US postal prefix mapping
      expect(deriveJurisdictionFromAddress('US', null, 'INVALID')).toBe('US')
    })
  })

  // ============================================
  // jurisdictionHasMandatoryReporting Tests
  // ============================================

  describe('jurisdictionHasMandatoryReporting', () => {
    it('should return true for US jurisdictions (all states have mandatory reporting)', () => {
      expect(jurisdictionHasMandatoryReporting('US')).toBe(true)
      expect(jurisdictionHasMandatoryReporting('US-CA')).toBe(true)
      expect(jurisdictionHasMandatoryReporting('US-NY')).toBe(true)
      expect(jurisdictionHasMandatoryReporting('US-TX')).toBe(true)
    })

    it('should return true for UK', () => {
      expect(jurisdictionHasMandatoryReporting('UK')).toBe(true)
    })

    it('should return true for Australia', () => {
      expect(jurisdictionHasMandatoryReporting('AU')).toBe(true)
      expect(jurisdictionHasMandatoryReporting('AU-NSW')).toBe(true)
      expect(jurisdictionHasMandatoryReporting('AU-VIC')).toBe(true)
    })

    it('should return true for Canada', () => {
      expect(jurisdictionHasMandatoryReporting('CA')).toBe(true)
      expect(jurisdictionHasMandatoryReporting('CA-ON')).toBe(true)
    })

    it('should return false for jurisdictions without mandatory reporting', () => {
      // These are hypothetical - most developed countries have some form
      expect(jurisdictionHasMandatoryReporting('XX')).toBe(false)
      expect(jurisdictionHasMandatoryReporting('ZZ')).toBe(false)
    })

    it('should extract country code from state-level jurisdiction', () => {
      // If US-CA is checked and US has mandatory reporting, should return true
      expect(jurisdictionHasMandatoryReporting('US-CA')).toBe(true)
    })
  })

  // ============================================
  // MANDATORY_REPORTING_JURISDICTIONS Tests
  // ============================================

  describe('MANDATORY_REPORTING_JURISDICTIONS', () => {
    it('should include common jurisdictions with mandatory reporting', () => {
      expect(MANDATORY_REPORTING_JURISDICTIONS).toContain('US')
      expect(MANDATORY_REPORTING_JURISDICTIONS).toContain('UK')
      expect(MANDATORY_REPORTING_JURISDICTIONS).toContain('AU')
      expect(MANDATORY_REPORTING_JURISDICTIONS).toContain('CA')
    })
  })

  // ============================================
  // getFamilyJurisdiction Tests
  // ============================================

  describe('getFamilyJurisdiction', () => {
    it('should return jurisdiction from family address', async () => {
      const mockFamily = {
        exists: () => true,
        data: () => ({
          address: {
            country: 'US',
            stateProvince: 'CA',
            postalCode: '90210',
          },
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockFamily as any)

      const jurisdiction = await getFamilyJurisdiction('family_123')
      expect(jurisdiction).toBe('US-CA')
    })

    it('should throw if family not found', async () => {
      const mockFamily = {
        exists: () => false,
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockFamily as any)

      await expect(getFamilyJurisdiction('nonexistent')).rejects.toThrow('Family not found')
    })

    it('should throw if family has no address', async () => {
      const mockFamily = {
        exists: () => true,
        data: () => ({}),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockFamily as any)

      await expect(getFamilyJurisdiction('family_123')).rejects.toThrow('Family address not found')
    })

    it('should throw if family address has no country', async () => {
      const mockFamily = {
        exists: () => true,
        data: () => ({
          address: {
            stateProvince: 'CA',
          },
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockFamily as any)

      await expect(getFamilyJurisdiction('family_123')).rejects.toThrow(
        'Family address has no country'
      )
    })

    it('should handle family with only country in address', async () => {
      const mockFamily = {
        exists: () => true,
        data: () => ({
          address: {
            country: 'UK',
          },
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockFamily as any)

      const jurisdiction = await getFamilyJurisdiction('family_456')
      expect(jurisdiction).toBe('UK')
    })

    it('should throw for empty familyId', async () => {
      await expect(getFamilyJurisdiction('')).rejects.toThrow('familyId is required')
    })
  })

  // ============================================
  // getPartnersForJurisdiction Tests
  // ============================================

  describe('getPartnersForJurisdiction', () => {
    it('should return partners with mandatory_reporting capability for jurisdiction', async () => {
      const partner1 = createCrisisPartner(
        'Crisis Center 1',
        'https://crisis1.example.com/webhook',
        'key1',
        ['US', 'US-CA'],
        ['crisis_counseling', 'mandatory_reporting']
      )

      const partner2 = createCrisisPartner(
        'Crisis Center 2',
        'https://crisis2.example.com/webhook',
        'key2',
        ['US'],
        ['crisis_counseling']
      )

      const mockDocs = {
        docs: [{ data: () => partner1 }, { data: () => partner2 }],
        empty: false,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any)

      const partners = await getPartnersForJurisdiction('US-CA', 'mandatory_reporting')

      // Only partner1 has mandatory_reporting capability
      expect(partners).toHaveLength(1)
      expect(partners[0].name).toBe('Crisis Center 1')
    })

    it('should return empty array when no partners match', async () => {
      const mockDocs = {
        docs: [],
        empty: true,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any)

      const partners = await getPartnersForJurisdiction('XX', 'mandatory_reporting')
      expect(partners).toEqual([])
    })

    it('should filter by both jurisdiction and capability', async () => {
      const partnerUS = createCrisisPartner(
        'US Partner',
        'https://us.example.com/webhook',
        'key1',
        ['US'],
        ['mandatory_reporting']
      )

      const partnerUK = createCrisisPartner(
        'UK Partner',
        'https://uk.example.com/webhook',
        'key2',
        ['UK'],
        ['mandatory_reporting']
      )

      const mockDocs = {
        docs: [{ data: () => partnerUS }, { data: () => partnerUK }],
        empty: false,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any)

      const partners = await getPartnersForJurisdiction('US-CA', 'mandatory_reporting')

      // Only US partner covers US-CA
      expect(partners).toHaveLength(1)
      expect(partners[0].name).toBe('US Partner')
    })

    it('should throw for invalid jurisdiction code', async () => {
      await expect(getPartnersForJurisdiction('invalid', 'mandatory_reporting')).rejects.toThrow(
        'Invalid jurisdiction code'
      )
    })

    it('should match partners that cover parent country', async () => {
      const countryLevelPartner = createCrisisPartner(
        'National Partner',
        'https://national.example.com/webhook',
        'key1',
        ['US'],
        ['mandatory_reporting']
      )

      const mockDocs = {
        docs: [{ data: () => countryLevelPartner }],
        empty: false,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any)

      // Even though we query for US-CA, a partner covering 'US' should match
      const partners = await getPartnersForJurisdiction('US-CA', 'mandatory_reporting')

      expect(partners).toHaveLength(1)
      expect(partners[0].name).toBe('National Partner')
    })

    it('should sort partners by priority', async () => {
      const lowPriorityPartner = {
        ...createCrisisPartner(
          'Low Priority',
          'https://low.example.com/webhook',
          'key1',
          ['US'],
          ['mandatory_reporting']
        ),
        priority: 10,
      }

      const highPriorityPartner = {
        ...createCrisisPartner(
          'High Priority',
          'https://high.example.com/webhook',
          'key2',
          ['US'],
          ['mandatory_reporting']
        ),
        priority: 1,
      }

      const mockDocs = {
        docs: [{ data: () => lowPriorityPartner }, { data: () => highPriorityPartner }],
        empty: false,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any)

      const partners = await getPartnersForJurisdiction('US', 'mandatory_reporting')

      expect(partners).toHaveLength(2)
      // Lower priority number = higher priority (comes first)
      expect(partners[0].name).toBe('High Priority')
      expect(partners[1].name).toBe('Low Priority')
    })
  })
})
