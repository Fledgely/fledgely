/**
 * JurisdictionService - Story 7.5.5 Task 2
 *
 * Service for determining jurisdiction and mandatory reporting requirements.
 * AC1: Jurisdiction information for mandatory reporting
 * AC6: Partner capability registration
 *
 * CRITICAL: Jurisdiction is derived from family profile address only.
 * This information is provided to crisis partners for proper routing.
 */

import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import {
  type CrisisPartner,
  type PartnerCapability,
  partnerSupportsJurisdiction,
} from '../contracts/crisisPartner'

// ============================================
// Constants
// ============================================

/**
 * Countries with mandatory reporting laws.
 *
 * This is a simplified list. In reality, mandatory reporting varies
 * significantly by jurisdiction, reporter category, and type of abuse.
 *
 * All US states have mandatory reporting laws.
 * Most developed countries have some form of mandatory reporting.
 */
export const MANDATORY_REPORTING_JURISDICTIONS = [
  'US', // All US states
  'UK', // United Kingdom
  'AU', // Australia
  'CA', // Canada
  'NZ', // New Zealand
  'IE', // Ireland
  'DE', // Germany
  'FR', // France
  'ES', // Spain
  'IT', // Italy
  'NL', // Netherlands
  'BE', // Belgium
  'SE', // Sweden
  'NO', // Norway
  'DK', // Denmark
  'FI', // Finland
] as const

/**
 * US postal code to state mapping (first digit).
 * Used to derive state from postal code when state not provided.
 */
const US_POSTAL_PREFIX_TO_STATE: Record<string, string> = {
  '0': 'CT', // CT, MA, ME, NH, NJ, PR, RI, VT, VI (using CT as default for 0)
  '1': 'NY', // DE, NY, PA
  '2': 'VA', // DC, MD, NC, SC, VA, WV
  '3': 'FL', // AL, FL, GA, MS, TN
  '4': 'OH', // IN, KY, MI, OH
  '5': 'MN', // IA, MN, MT, ND, SD, WI
  '6': 'IL', // IL, KS, MO, NE
  '7': 'TX', // AR, LA, OK, TX
  '8': 'CO', // AZ, CO, ID, NM, NV, UT, WY
  '9': 'CA', // AK, AS, CA, GU, HI, MH, FM, MP, OR, PW, WA
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate jurisdiction code format.
 *
 * Valid formats:
 * - Country code: exactly 2 uppercase letters (e.g., 'US', 'UK')
 * - Country-state: 2 uppercase letters, hyphen, 2-3 uppercase letters (e.g., 'US-CA', 'AU-NSW')
 *
 * @param code - Jurisdiction code to validate
 * @returns True if valid format
 */
export function isValidJurisdictionCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false
  }

  // Country code: exactly 2 uppercase letters
  const countryPattern = /^[A-Z]{2}$/
  // Country-state: 2 uppercase letters, hyphen, 2-3 uppercase letters
  const statePattern = /^[A-Z]{2}-[A-Z]{2,3}$/

  return countryPattern.test(code) || statePattern.test(code)
}

// ============================================
// Address to Jurisdiction Functions
// ============================================

/**
 * Derive jurisdiction code from address components.
 *
 * AC1: Jurisdiction is derived from family profile address.
 *
 * @param country - ISO 2-letter country code
 * @param stateProvince - State/province code (e.g., 'CA', 'NSW')
 * @param postalCode - Postal/ZIP code (used as fallback for state derivation)
 * @returns Jurisdiction code (e.g., 'US-CA', 'UK')
 * @throws Error if invalid input
 */
export function deriveJurisdictionFromAddress(
  country: string,
  stateProvince: string | null,
  postalCode: string | null
): string {
  if (!country || country.trim().length === 0) {
    throw new Error('Country is required')
  }

  const normalizedCountry = country.trim().toUpperCase()

  // Validate country format (2 letters)
  if (!/^[A-Z]{2}$/.test(normalizedCountry)) {
    throw new Error('Invalid country format')
  }

  // If state/province provided, validate and use it
  if (stateProvince && stateProvince.trim().length > 0) {
    const normalizedState = stateProvince.trim().toUpperCase()

    // Validate state format (2-3 letters)
    if (!/^[A-Z]{2,3}$/.test(normalizedState)) {
      throw new Error('Invalid state format')
    }

    return `${normalizedCountry}-${normalizedState}`
  }

  // Try to derive state from postal code for US
  if (normalizedCountry === 'US' && postalCode && postalCode.trim().length > 0) {
    const firstDigit = postalCode.trim()[0]
    const derivedState = US_POSTAL_PREFIX_TO_STATE[firstDigit]

    if (derivedState) {
      return `${normalizedCountry}-${derivedState}`
    }
  }

  // Return country-only jurisdiction
  return normalizedCountry
}

// ============================================
// Mandatory Reporting Functions
// ============================================

/**
 * Check if a jurisdiction has mandatory reporting requirements.
 *
 * @param jurisdiction - Jurisdiction code (e.g., 'US-CA', 'UK')
 * @returns True if jurisdiction has mandatory reporting
 */
export function jurisdictionHasMandatoryReporting(jurisdiction: string): boolean {
  if (!jurisdiction || jurisdiction.trim().length === 0) {
    return false
  }

  // Extract country code (everything before hyphen if present)
  const countryCode = jurisdiction.split('-')[0].toUpperCase()

  return MANDATORY_REPORTING_JURISDICTIONS.includes(
    countryCode as (typeof MANDATORY_REPORTING_JURISDICTIONS)[number]
  )
}

// ============================================
// Family Jurisdiction Functions
// ============================================

/**
 * Get jurisdiction code from family's address.
 *
 * AC1: Jurisdiction is derived from family profile address.
 *
 * @param familyId - Family ID
 * @returns Jurisdiction code
 * @throws Error if family not found or has no address
 */
export async function getFamilyJurisdiction(familyId: string): Promise<string> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }

  const db = getFirestore()
  const familyRef = doc(db, 'families', familyId)
  const familySnap = await getDoc(familyRef)

  if (!familySnap.exists()) {
    throw new Error('Family not found')
  }

  const familyData = familySnap.data()

  if (!familyData.address) {
    throw new Error('Family address not found')
  }

  if (!familyData.address.country) {
    throw new Error('Family address has no country')
  }

  return deriveJurisdictionFromAddress(
    familyData.address.country,
    familyData.address.stateProvince || null,
    familyData.address.postalCode || null
  )
}

// ============================================
// Partner Lookup Functions
// ============================================

/**
 * Get crisis partners for a jurisdiction with a specific capability.
 *
 * AC6: Partner capability registration with jurisdiction coverage.
 *
 * @param jurisdiction - Jurisdiction code (e.g., 'US-CA')
 * @param capability - Required capability (e.g., 'mandatory_reporting')
 * @returns Array of partners sorted by priority
 * @throws Error if invalid jurisdiction
 */
export async function getPartnersForJurisdiction(
  jurisdiction: string,
  capability: PartnerCapability
): Promise<CrisisPartner[]> {
  if (!isValidJurisdictionCode(jurisdiction)) {
    throw new Error('Invalid jurisdiction code')
  }

  const db = getFirestore()
  const partnersCol = collection(db, 'crisisPartners')

  // Query for active partners
  const q = query(partnersCol, where('active', '==', true))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return []
  }

  // Filter partners by jurisdiction and capability
  const matchingPartners: CrisisPartner[] = []

  for (const docSnap of snapshot.docs) {
    const partner = docSnap.data() as CrisisPartner

    // Check if partner has required capability
    if (!partner.capabilities.includes(capability)) {
      continue
    }

    // Check if partner supports jurisdiction
    if (!partnerSupportsJurisdiction(partner, jurisdiction)) {
      continue
    }

    matchingPartners.push(partner)
  }

  // Sort by priority (lower number = higher priority)
  matchingPartners.sort((a, b) => a.priority - b.priority)

  return matchingPartners
}
