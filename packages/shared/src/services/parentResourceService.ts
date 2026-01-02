/**
 * Parent Resource Service - Story 38.7 Task 5
 *
 * Service for parent resources.
 * AC6: Resources for parents: "Supporting your independent teen"
 */

import {
  createParentResource,
  type ParentResource,
  type ParentResourceCategory,
} from '../contracts/postGraduation'

// ============================================
// In-Memory Storage (would be Firestore in production)
// ============================================

const resourceStore: ParentResource[] = []
const readResourcesStore = new Map<string, string[]>() // parentId -> resourceIds

// ============================================
// Resource Retrieval Functions (AC6)
// ============================================

/**
 * Get all parent resources.
 * AC6: Resources for parents: "Supporting your independent teen".
 *
 * @returns Array of active parent resources
 */
export function getParentResources(): ParentResource[] {
  return resourceStore.filter((r) => r.isActive)
}

/**
 * Get resources by category.
 * AC6: Resources for parents.
 *
 * @param category - The resource category
 * @returns Array of resources in the category
 */
export function getResourcesByCategory(category: ParentResourceCategory): ParentResource[] {
  return resourceStore.filter((r) => r.isActive && r.category === category)
}

/**
 * Get resource by ID.
 *
 * @param resourceId - The resource ID
 * @returns The resource or null if not found
 */
export function getResourceById(resourceId: string): ParentResource | null {
  return resourceStore.find((r) => r.id === resourceId) || null
}

// ============================================
// Read Tracking Functions
// ============================================

/**
 * Mark a resource as read by a parent.
 *
 * @param parentId - The parent's ID
 * @param resourceId - The resource ID
 * @returns True if marked successfully
 */
export function markResourceRead(parentId: string, resourceId: string): boolean {
  let readResources = readResourcesStore.get(parentId)

  if (!readResources) {
    readResources = []
    readResourcesStore.set(parentId, readResources)
  }

  // Don't duplicate
  if (!readResources.includes(resourceId)) {
    readResources.push(resourceId)
  }

  return true
}

/**
 * Get list of read resource IDs for a parent.
 *
 * @param parentId - The parent's ID
 * @returns Array of read resource IDs
 */
export function getReadResources(parentId: string): string[] {
  return readResourcesStore.get(parentId) || []
}

// ============================================
// Initialization Functions (AC6)
// ============================================

/**
 * Initialize default parent resources.
 * AC6: Resources for parents: "Supporting your independent teen".
 */
export function initializeDefaultResources(): void {
  // Clear existing resources
  resourceStore.length = 0

  let order = 0

  // Supporting Independence resources
  const independenceResources = [
    {
      title: 'Supporting Your Independent Teen',
      summary: 'Tips for transitioning from monitoring to trust-based parenting.',
      content:
        "As your teen graduates from monitoring, it's important to shift from oversight to support. Here are key strategies: 1) Maintain open communication. 2) Set clear expectations. 3) Allow natural consequences. 4) Be available without being intrusive.",
    },
    {
      title: 'Trusting Your Teen Online',
      summary: 'How to maintain trust while respecting digital independence.',
      content:
        "Your teen has demonstrated responsibility online. Here's how to maintain that trust: 1) Have regular check-ins. 2) Discuss digital challenges openly. 3) Share your own digital experiences. 4) Be a resource, not a monitor.",
    },
  ]

  for (const resource of independenceResources) {
    const newResource = createParentResource(
      'supporting_independence',
      resource.title,
      resource.summary,
      resource.content
    )
    newResource.order = order++
    resourceStore.push(newResource)
  }

  // Transition Tips resources
  const transitionResources = [
    {
      title: 'The First Month Without Monitoring',
      summary: 'What to expect and how to navigate the transition period.',
      content:
        'The first month can feel uncertain. Normal feelings include: worry, relief, pride, and nostalgia. Tips: 1) Celebrate the milestone. 2) Establish new communication patterns. 3) Focus on quality time. 4) Trust the process.',
    },
    {
      title: 'Setting New Boundaries',
      summary: 'How to establish healthy digital boundaries without monitoring.',
      content:
        'Without monitoring tools, boundaries become agreement-based. Approach: 1) Discuss expectations together. 2) Create family tech agreements. 3) Model good digital habits. 4) Respect their privacy while staying connected.',
    },
  ]

  for (const resource of transitionResources) {
    const newResource = createParentResource(
      'transition_tips',
      resource.title,
      resource.summary,
      resource.content
    )
    newResource.order = order++
    resourceStore.push(newResource)
  }

  // Communication resources
  const communicationResources = [
    {
      title: 'Staying Connected Post-Graduation',
      summary: 'Maintaining meaningful communication about digital life.',
      content:
        "Connection doesn't require surveillance. Ways to stay connected: 1) Share interesting content with each other. 2) Ask about their online experiences. 3) Discuss news about technology together. 4) Create tech-free family time.",
    },
    {
      title: 'When Concerns Arise',
      summary: 'How to address digital concerns without returning to monitoring.',
      content:
        'If you notice concerning behavior: 1) Approach with curiosity, not accusation. 2) Have a calm conversation. 3) Listen before advising. 4) Work together on solutions. Remember: trust is rebuilt through communication, not surveillance.',
    },
  ]

  for (const resource of communicationResources) {
    const newResource = createParentResource(
      'communication',
      resource.title,
      resource.summary,
      resource.content
    )
    newResource.order = order++
    resourceStore.push(newResource)
  }
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all resource data (for testing).
 */
export function clearAllResourceData(): void {
  resourceStore.length = 0
  readResourcesStore.clear()
}

/**
 * Get count of resources (for testing).
 */
export function getResourceCount(): number {
  return resourceStore.length
}
