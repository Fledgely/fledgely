'use client'

/**
 * PrivacyGate Component - Story 36.6 Task 2
 *
 * Gates trust score visibility based on privacy rules.
 * AC1: Each child sees only their own score
 * AC2: Parents see each child's score separately
 * AC3: Siblings cannot compare scores
 */

import { type ReactNode } from 'react'
import { type FamilyMember, canViewTrustScore } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface PrivacyGateProps {
  /** ID of the viewer */
  viewerId: string
  /** ID of the child whose score is being viewed */
  targetChildId: string
  /** Family members for access control */
  familyMembers: FamilyMember[]
  /** Protected content to show if access granted */
  children: ReactNode
  /** Optional custom fallback for access denied */
  fallback?: ReactNode
}

// ============================================================================
// Default Access Denied Component
// ============================================================================

function DefaultAccessDenied() {
  return (
    <div
      data-testid="access-denied"
      role="alert"
      style={{
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          fontSize: '32px',
          marginBottom: '12px',
        }}
        aria-hidden="true"
      >
        🔒
      </div>
      <p
        data-testid="privacy-message"
        style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        For privacy, you can only view your own trust score. Everyone&apos;s journey is personal and
        unique.
      </p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PrivacyGate({
  viewerId,
  targetChildId,
  familyMembers,
  children,
  fallback,
}: PrivacyGateProps) {
  const accessResult = canViewTrustScore(viewerId, targetChildId, familyMembers)

  if (accessResult.canView) {
    return <>{children}</>
  }

  // Show custom fallback or default access denied
  if (fallback) {
    return <>{fallback}</>
  }

  return <DefaultAccessDenied />
}
