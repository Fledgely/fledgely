/**
 * Guardian badge component for displaying co-parent information.
 *
 * Shows a "Co-managed" badge with the other guardian's name when the family
 * has multiple guardians. Accessible for screen readers.
 *
 * Story 3.4: Equal Access Verification - AC7
 */

import { useEffect, useState } from 'react'
import { getUserProfile } from '../services/userService'
import type { FamilyGuardian } from '@fledgely/shared/contracts'

interface GuardianBadgeProps {
  /** All guardians in the family */
  guardians: FamilyGuardian[]
  /** Current user's UID to exclude from display */
  currentUserUid: string
}

interface GuardianInfo {
  uid: string
  displayName: string | null
  photoURL?: string | null
}

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '8px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    backgroundColor: '#ddd6fe',
    color: '#7c3aed',
    padding: '2px 10px',
    borderRadius: '9999px',
    fontWeight: 500,
  },
  avatar: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    marginRight: '2px',
  },
  avatarPlaceholder: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#c4b5fd',
    marginRight: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#7c3aed',
  },
}

/**
 * GuardianBadge - Displays co-parent information for co-managed families.
 *
 * Features:
 * - Shows "Co-managed with [Name]" for 2-guardian families
 * - Shows "Co-managed (X guardians)" for 3+ guardian families
 * - Accessible with ARIA label for screen readers
 * - Displays guardian avatar if available
 */
export default function GuardianBadge({ guardians, currentUserUid }: GuardianBadgeProps) {
  const [otherGuardians, setOtherGuardians] = useState<GuardianInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Validate props and check for co-management
  const isValidProps = guardians && Array.isArray(guardians) && currentUserUid
  const isCoManaged = isValidProps && guardians.length > 1

  useEffect(() => {
    if (!isCoManaged) {
      setLoading(false)
      return
    }

    const loadOtherGuardians = async () => {
      try {
        // Get all guardians except current user
        const otherGuardianUids = guardians
          .filter((g) => g.uid !== currentUserUid)
          .map((g) => g.uid)

        // Load user profiles for other guardians
        const profiles = await Promise.all(
          otherGuardianUids.map(async (uid) => {
            try {
              const profile = await getUserProfile(uid)
              return {
                uid,
                displayName: profile?.displayName ?? null,
                photoURL: profile?.photoURL,
              }
            } catch {
              // If profile lookup fails, return uid as fallback
              return { uid, displayName: null, photoURL: null }
            }
          })
        )

        setOtherGuardians(profiles)
      } catch (error) {
        console.error('Failed to load guardian profiles:', error)
        // Set fallback with UIDs only
        setOtherGuardians(
          guardians
            .filter((g) => g.uid !== currentUserUid)
            .map((g) => ({ uid: g.uid, displayName: null, photoURL: null }))
        )
      } finally {
        setLoading(false)
      }
    }

    loadOtherGuardians()
  }, [guardians, currentUserUid, isCoManaged])

  // Don't render if props are invalid or not co-managed
  if (!isValidProps || !isCoManaged) {
    return null
  }

  if (loading) {
    return (
      <span style={styles.container}>
        <span style={styles.badge} aria-label="Loading guardian information">
          Co-managed
        </span>
      </span>
    )
  }

  // Format display text based on number of other guardians
  let displayText: string
  let ariaLabel: string

  if (otherGuardians.length === 1) {
    const guardianName = otherGuardians[0].displayName || 'Co-parent'
    displayText = `Co-managed with ${guardianName}`
    ariaLabel = `This family is co-managed with ${guardianName}. Both guardians have equal access to family data.`
  } else {
    // Multiple other guardians (3+ total)
    const names = otherGuardians.map((g) => g.displayName || 'Co-parent').join(', ')
    displayText = `Co-managed (${guardians.length} guardians)`
    ariaLabel = `This family is co-managed by ${guardians.length} guardians: ${names}. All guardians have equal access to family data.`
  }

  // Get first other guardian for avatar display
  const primaryOtherGuardian = otherGuardians[0]

  return (
    <span style={styles.container}>
      <span style={styles.badge} role="status" aria-label={ariaLabel}>
        {primaryOtherGuardian?.photoURL ? (
          <img
            src={primaryOtherGuardian.photoURL}
            alt=""
            style={styles.avatar}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span style={styles.avatarPlaceholder} aria-hidden="true">
            {primaryOtherGuardian?.displayName?.charAt(0).toUpperCase() || '?'}
          </span>
        )}
        {displayText}
      </span>
    </span>
  )
}
