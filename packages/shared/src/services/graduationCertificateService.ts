/**
 * Graduation Certificate Service - Story 38.3 Task 6
 *
 * Service for generating graduation certificates.
 * AC7: Graduation certificate/record generated for family
 */

import type { GraduationCertificate } from '../contracts/graduationProcess'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const certificateStore: Map<string, GraduationCertificate> = new Map()
const childCertificateIndex: Map<string, string[]> = new Map()

// ============================================
// Types
// ============================================

export interface GenerateCertificateData {
  graduationDate: Date
  monthsAtPerfectTrust: number
  totalMonitoringDuration: number
}

export interface CertificateDisplayData {
  title: string
  childName: string
  dateFormatted: string
  achievementText: string
  journeyText: string
}

// ============================================
// Helper Functions
// ============================================

function generateCertificateId(): string {
  return `cert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ============================================
// Service Functions
// ============================================

/**
 * Generate graduation certificate.
 * AC7: Graduation certificate/record generated for family
 */
export function generateCertificate(
  childId: string,
  familyId: string,
  childName: string,
  data: GenerateCertificateData
): GraduationCertificate {
  const id = generateCertificateId()

  const certificate: GraduationCertificate = {
    id,
    childId,
    familyId,
    childName,
    graduationDate: data.graduationDate,
    monthsAtPerfectTrust: data.monthsAtPerfectTrust,
    totalMonitoringDuration: data.totalMonitoringDuration,
    generatedAt: new Date(),
  }

  certificateStore.set(id, certificate)

  // Update index
  const childCerts = childCertificateIndex.get(childId) || []
  childCerts.push(id)
  childCertificateIndex.set(childId, childCerts)

  return certificate
}

/**
 * Get certificate by ID.
 */
export function getCertificate(certificateId: string): GraduationCertificate | null {
  return certificateStore.get(certificateId) || null
}

/**
 * Get certificate display data.
 */
export function getCertificateDisplayData(
  certificate: GraduationCertificate
): CertificateDisplayData {
  return {
    title: 'Certificate of Graduation',
    childName: certificate.childName,
    dateFormatted: formatDate(certificate.graduationDate),
    achievementText: `${certificate.monthsAtPerfectTrust} months at 100% trust`,
    journeyText: `Completed a ${certificate.totalMonitoringDuration}-month monitoring journey`,
  }
}

/**
 * Get certificate for child.
 * Returns the most recent certificate if multiple exist.
 */
export function getCertificateForChild(childId: string): GraduationCertificate | null {
  const ids = childCertificateIndex.get(childId) || []

  if (ids.length === 0) {
    return null
  }

  // Return the most recently added certificate (last in the list)
  const lastId = ids[ids.length - 1]
  return certificateStore.get(lastId) || null
}

/**
 * Validate certificate authenticity.
 */
export function validateCertificate(certificateId: string): boolean {
  return certificateStore.has(certificateId)
}

/**
 * Get all certificates.
 */
export function getAllCertificates(): GraduationCertificate[] {
  return Array.from(certificateStore.values())
}

/**
 * Clear all stored data (for testing).
 */
export function clearAllCertificateData(): void {
  certificateStore.clear()
  childCertificateIndex.clear()
}
