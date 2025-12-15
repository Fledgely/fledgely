import { getFirestore, Timestamp } from 'firebase-admin/firestore'

/**
 * Types of escape resources
 */
export const RESOURCE_TYPES = [
  'hotline',
  'text-line',
  'website',
  'guide',
  'legal-aid',
] as const

export type ResourceType = typeof RESOURCE_TYPES[number]

/**
 * Escape resource schema for domestic abuse support
 */
export interface EscapeResource {
  id: string
  name: string
  type: ResourceType
  value: string // Phone number, URL, or text code
  description: string
  displayOrder: number
  isActive: boolean
  verifiedAt: Timestamp
  verifiedBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Default resources to use if collection is empty or inaccessible
 * These are stable, well-known resources that are unlikely to change
 */
export const DEFAULT_ESCAPE_RESOURCES: Omit<EscapeResource, 'id' | 'verifiedAt' | 'verifiedBy' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'National Domestic Violence Hotline',
    type: 'hotline',
    value: '1-800-799-7233',
    description: '24/7 confidential support for domestic violence victims. Advocates available in 200+ languages.',
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Crisis Text Line',
    type: 'text-line',
    value: 'Text HOME to 741741',
    description: 'Free 24/7 crisis text support. Trained counselors available immediately.',
    displayOrder: 2,
    isActive: true,
  },
  {
    name: 'RAINN National Sexual Assault Hotline',
    type: 'hotline',
    value: '1-800-656-4673',
    description: '24/7 support for sexual assault survivors. Free and confidential.',
    displayOrder: 3,
    isActive: true,
  },
  {
    name: 'The Hotline - Safety Planning',
    type: 'website',
    value: 'https://www.thehotline.org/plan-for-safety/',
    description: 'Step-by-step safety planning guides for leaving an abusive situation.',
    displayOrder: 4,
    isActive: true,
  },
  {
    name: 'LawHelp.org',
    type: 'legal-aid',
    value: 'https://www.lawhelp.org/',
    description: 'Find free legal aid in your area. Search by state and issue type.',
    displayOrder: 5,
    isActive: true,
  },
  {
    name: 'Love Is Respect',
    type: 'website',
    value: 'https://www.loveisrespect.org/',
    description: 'Resources specifically for young people experiencing dating abuse.',
    displayOrder: 6,
    isActive: true,
  },
]

// In-memory cache for resources
let resourceCache: EscapeResource[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get all active escape resources, sorted by display order
 * Uses caching to minimize Firestore reads
 * Falls back to default resources if collection is empty or inaccessible
 */
export async function getActiveResources(): Promise<EscapeResource[]> {
  const now = Date.now()

  // Return cached resources if still valid
  if (resourceCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return resourceCache
  }

  try {
    const db = getFirestore()
    const snapshot = await db
      .collection('escapeResources')
      .where('isActive', '==', true)
      .orderBy('displayOrder', 'asc')
      .get()

    if (snapshot.empty) {
      // Use default resources if collection is empty
      return getDefaultResourcesWithMetadata()
    }

    const resources = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as EscapeResource))

    // Update cache
    resourceCache = resources
    cacheTimestamp = now

    return resources
  } catch {
    // Fall back to defaults on any error
    return getDefaultResourcesWithMetadata()
  }
}

/**
 * Convert default resources to full EscapeResource format
 */
function getDefaultResourcesWithMetadata(): EscapeResource[] {
  const now = Timestamp.now()
  return DEFAULT_ESCAPE_RESOURCES.map((resource, index) => ({
    ...resource,
    id: `default-${index}`,
    verifiedAt: now,
    verifiedBy: 'system',
    createdAt: now,
    updatedAt: now,
  }))
}

/**
 * Get resources grouped by type for display
 */
export async function getResourcesByType(): Promise<Record<ResourceType, EscapeResource[]>> {
  const resources = await getActiveResources()

  const grouped: Record<ResourceType, EscapeResource[]> = {
    'hotline': [],
    'text-line': [],
    'website': [],
    'guide': [],
    'legal-aid': [],
  }

  for (const resource of resources) {
    if (grouped[resource.type]) {
      grouped[resource.type].push(resource)
    }
  }

  return grouped
}

/**
 * Check for stale resources (not verified in >90 days)
 * Returns list of stale resource names
 */
export async function checkResourceStaleness(): Promise<{
  staleResources: string[]
  totalResources: number
}> {
  const db = getFirestore()
  const ninetyDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  )

  const snapshot = await db
    .collection('escapeResources')
    .where('isActive', '==', true)
    .get()

  const staleResources: string[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.verifiedAt && data.verifiedAt < ninetyDaysAgo) {
      staleResources.push(data.name)
    }
  }

  return {
    staleResources,
    totalResources: snapshot.size,
  }
}

/**
 * Clear resource cache (for testing or forced refresh)
 */
export function clearResourceCache(): void {
  resourceCache = null
  cacheTimestamp = 0
}
