/**
 * Demo Data Constants
 *
 * Story 8.5.1: Demo Child Profile Creation
 *
 * Provides static demo data for new parents to preview Fledgely
 * before adding their real children.
 */

import type { ChildProfile } from '@fledgely/shared/contracts'

/**
 * Demo child ID pattern - distinct from real UUID-based IDs.
 * This ID is used to identify demo profiles in the UI.
 */
export const DEMO_CHILD_ID = 'demo-child'

/**
 * Demo child profile with sample data.
 * Used when family has no real children and showDemoProfile is true.
 *
 * Note: This is a static profile - not stored in Firestore.
 * The demo child is displayed locally on the dashboard.
 */
export const DEMO_CHILD_PROFILE: Omit<ChildProfile, 'guardians' | 'guardianUids' | 'custody'> & {
  isDemo: true
} = {
  id: DEMO_CHILD_ID,
  familyId: 'demo-family', // Placeholder - will be replaced with actual familyId in hook
  name: 'Alex Demo',
  birthdate: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000), // ~10 years old
  photoURL: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDemo: true,
}

/**
 * Check if a child profile is a demo profile.
 */
export function isDemoChild(childId: string): boolean {
  return childId === DEMO_CHILD_ID
}

/**
 * Demo screenshot categories for variety.
 */
export type DemoScreenshotCategory = 'homework' | 'gaming' | 'social' | 'video' | 'creative'

/**
 * Demo screenshot entry structure.
 * Story 8.5.1 AC3: Sample screenshots pre-populated
 */
export interface DemoScreenshot {
  id: string
  title: string
  url: string
  category: DemoScreenshotCategory
  timestamp: number
  /** Placeholder data URI for the demo thumbnail */
  thumbnailDataUri: string
}

/**
 * Generate a simple placeholder SVG data URI with category-specific color.
 */
function generatePlaceholderImage(category: DemoScreenshotCategory): string {
  const colors: Record<DemoScreenshotCategory, string> = {
    homework: '#4CAF50', // Green for educational
    gaming: '#9C27B0', // Purple for gaming
    social: '#2196F3', // Blue for social
    video: '#FF5722', // Orange for video
    creative: '#E91E63', // Pink for creative
  }
  const labels: Record<DemoScreenshotCategory, string> = {
    homework: 'Homework',
    gaming: 'Gaming',
    social: 'Social',
    video: 'Video',
    creative: 'Creative',
  }
  const color = colors[category]
  const label = labels[category]

  // Create a simple SVG placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
    <rect width="320" height="180" fill="${color}" opacity="0.2"/>
    <rect x="10" y="10" width="300" height="160" fill="${color}" opacity="0.3" rx="8"/>
    <text x="160" y="90" text-anchor="middle" fill="${color}" font-family="Arial" font-size="24" font-weight="bold">${label}</text>
    <text x="160" y="120" text-anchor="middle" fill="${color}" font-family="Arial" font-size="14" opacity="0.7">Demo Screenshot</text>
  </svg>`

  // Use browser-compatible base64 encoding (btoa works with ASCII, encodeURIComponent handles unicode)
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

/**
 * Sample screenshot data spanning multiple days.
 * Provides variety of categories and timestamps.
 *
 * Story 8.5.2 will expand this for the full gallery view.
 */
export const DEMO_SCREENSHOTS: DemoScreenshot[] = [
  {
    id: 'demo-screenshot-1',
    title: 'Math Practice',
    url: 'https://khanacademy.org/math/algebra',
    category: 'homework',
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    thumbnailDataUri: generatePlaceholderImage('homework'),
  },
  {
    id: 'demo-screenshot-2',
    title: 'Minecraft Building',
    url: 'https://minecraft.net',
    category: 'gaming',
    timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
    thumbnailDataUri: generatePlaceholderImage('gaming'),
  },
  {
    id: 'demo-screenshot-3',
    title: 'YouTube Kids Video',
    url: 'https://youtube.com/kids',
    category: 'video',
    timestamp: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
    thumbnailDataUri: generatePlaceholderImage('video'),
  },
  {
    id: 'demo-screenshot-4',
    title: 'Reading Assignment',
    url: 'https://readingeggs.com',
    category: 'homework',
    timestamp: Date.now() - 26 * 60 * 60 * 1000, // Yesterday
    thumbnailDataUri: generatePlaceholderImage('homework'),
  },
  {
    id: 'demo-screenshot-5',
    title: 'Drawing App',
    url: 'https://sketch.io',
    category: 'creative',
    timestamp: Date.now() - 48 * 60 * 60 * 1000, // 2 days ago
    thumbnailDataUri: generatePlaceholderImage('creative'),
  },
  {
    id: 'demo-screenshot-6',
    title: 'Educational Game',
    url: 'https://coolmathgames.com',
    category: 'gaming',
    timestamp: Date.now() - 50 * 60 * 60 * 1000, // 2 days ago
    thumbnailDataUri: generatePlaceholderImage('gaming'),
  },
  {
    id: 'demo-screenshot-7',
    title: 'Science Project',
    url: 'https://nasa.gov/kids',
    category: 'homework',
    timestamp: Date.now() - 72 * 60 * 60 * 1000, // 3 days ago
    thumbnailDataUri: generatePlaceholderImage('homework'),
  },
  {
    id: 'demo-screenshot-8',
    title: 'Animated Show',
    url: 'https://pbs.org/kids',
    category: 'video',
    timestamp: Date.now() - 96 * 60 * 60 * 1000, // 4 days ago
    thumbnailDataUri: generatePlaceholderImage('video'),
  },
]

/**
 * Get demo screenshots grouped by day for timeline display.
 */
export function getDemoScreenshotsByDay(): Map<string, DemoScreenshot[]> {
  const grouped = new Map<string, DemoScreenshot[]>()

  for (const screenshot of DEMO_SCREENSHOTS) {
    const date = new Date(screenshot.timestamp)
    const dayKey = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, [])
    }
    grouped.get(dayKey)!.push(screenshot)
  }

  return grouped
}

/**
 * Get count of demo screenshots by category.
 */
export function getDemoScreenshotCategoryCounts(): Record<DemoScreenshotCategory, number> {
  const counts: Record<DemoScreenshotCategory, number> = {
    homework: 0,
    gaming: 0,
    social: 0,
    video: 0,
    creative: 0,
  }

  for (const screenshot of DEMO_SCREENSHOTS) {
    counts[screenshot.category]++
  }

  return counts
}

/**
 * Demo activity summary for dashboard display.
 * Shows sample activity data for the demo child.
 */
export interface DemoActivitySummary {
  totalScreenshots: number
  lastCaptureTime: number
  topCategories: { category: DemoScreenshotCategory; count: number }[]
  daysWithActivity: number
}

/**
 * Get activity summary for the demo child.
 */
export function getDemoActivitySummary(): DemoActivitySummary {
  const categoryCounts = getDemoScreenshotCategoryCounts()
  const sortedCategories = (Object.entries(categoryCounts) as [DemoScreenshotCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }))

  const uniqueDays = new Set(DEMO_SCREENSHOTS.map((s) => new Date(s.timestamp).toDateString())).size

  return {
    totalScreenshots: DEMO_SCREENSHOTS.length,
    lastCaptureTime: Math.max(...DEMO_SCREENSHOTS.map((s) => s.timestamp)),
    topCategories: sortedCategories,
    daysWithActivity: uniqueDays,
  }
}
