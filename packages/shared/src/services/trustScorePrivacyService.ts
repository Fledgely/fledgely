/**
 * TrustScorePrivacyService - Story 36.6 Task 1
 *
 * Service for managing trust score privacy rules.
 * AC1: Each child sees only their own score
 * AC2: Parents see each child's score separately
 * AC3: Siblings cannot compare scores
 */

// ============================================================================
// Types
// ============================================================================

export type ViewerRole = 'parent' | 'child'

export interface FamilyMember {
  /** Member ID */
  id: string
  /** Role in family */
  role: ViewerRole
  /** Family this member belongs to */
  familyId: string
}

export interface TrustScoreAccessResult {
  /** Whether the viewer can access the trust score */
  canView: boolean
  /** Reason for access decision (privacy-safe) */
  reason?: string
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a viewer can access a target child's trust score.
 * @param viewerId - ID of the person trying to view
 * @param targetChildId - ID of the child whose score is being viewed
 * @param familyMembers - Array of family members
 * @returns Access result with reason
 */
export function canViewTrustScore(
  viewerId: string,
  targetChildId: string,
  familyMembers: FamilyMember[]
): TrustScoreAccessResult {
  // Find the viewer in family members
  const viewer = familyMembers.find((m) => m.id === viewerId)

  if (!viewer) {
    return {
      canView: false,
      reason: 'Viewer is not a member of this family',
    }
  }

  // Find the target child
  const target = familyMembers.find((m) => m.id === targetChildId)

  if (!target) {
    return {
      canView: false,
      reason: 'Target not found',
    }
  }

  // Parents can view any child's score
  if (viewer.role === 'parent') {
    if (target.role === 'child') {
      return { canView: true }
    }
  }

  // Children can only view their own score
  if (viewer.role === 'child') {
    if (viewerId === targetChildId) {
      return { canView: true }
    }

    // Sibling trying to view another sibling's score
    return {
      canView: false,
      reason: 'You can only view your own trust score for privacy',
    }
  }

  return {
    canView: false,
    reason: 'Access not permitted',
  }
}

/**
 * Get list of child IDs whose trust scores the viewer can access.
 * @param viewerId - ID of the viewer
 * @param familyMembers - Array of family members
 * @returns Array of child IDs the viewer can access
 */
export function getViewableTrustScores(viewerId: string, familyMembers: FamilyMember[]): string[] {
  const viewer = familyMembers.find((m) => m.id === viewerId)

  if (!viewer) {
    return []
  }

  // Parents can view all children
  if (viewer.role === 'parent') {
    return familyMembers.filter((m) => m.role === 'child').map((m) => m.id)
  }

  // Children can only view their own
  if (viewer.role === 'child') {
    return [viewerId]
  }

  return []
}

/**
 * Check if a viewer has parent role.
 * @param viewerId - ID of the viewer
 * @param familyMembers - Array of family members
 * @returns True if viewer is a parent
 */
export function isParentViewer(viewerId: string, familyMembers: FamilyMember[]): boolean {
  const viewer = familyMembers.find((m) => m.id === viewerId)
  return viewer?.role === 'parent'
}
