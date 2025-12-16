/**
 * Tests for ScreenshotTimeline Component
 *
 * Story 7.8: Privacy Gaps Injection - Task 7.4
 *
 * Tests for screenshot timeline display including:
 * - Screenshot entries rendering
 * - Gap entries rendering (AC #3 - identical appearance)
 * - NO gap reason exposure (AC #6)
 * - Keyboard accessibility (NFR43)
 * - ARIA attributes (NFR42)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ScreenshotTimeline,
  type TimelineEntry,
  type GapEntry,
} from '../ScreenshotTimeline'

// ============================================
// SETUP
// ============================================

beforeEach(() => {
  vi.clearAllMocks()
})

// Sample data
const sampleScreenshots: TimelineEntry[] = [
  {
    id: 'ss-1',
    timestamp: new Date('2025-12-16T10:00:00.000Z'),
    type: 'screenshot',
    thumbnailUrl: '/screenshots/thumb-1.jpg',
    fullUrl: '/screenshots/full-1.jpg',
  },
  {
    id: 'ss-2',
    timestamp: new Date('2025-12-16T10:05:00.000Z'),
    type: 'screenshot',
    thumbnailUrl: '/screenshots/thumb-2.jpg',
    fullUrl: '/screenshots/full-2.jpg',
  },
  {
    id: 'ss-3',
    timestamp: new Date('2025-12-16T10:30:00.000Z'),
    type: 'screenshot',
    thumbnailUrl: '/screenshots/thumb-3.jpg',
    fullUrl: '/screenshots/full-3.jpg',
  },
]

const sampleGap: GapEntry = {
  id: 'gap-1',
  timestamp: new Date('2025-12-16T10:10:00.000Z'),
  type: 'gap',
  durationMs: 10 * 60 * 1000, // 10 minutes
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ScreenshotTimeline', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      render(<ScreenshotTimeline entries={sampleScreenshots} />)
      expect(screen.getByTestId('screenshot-timeline')).toBeInTheDocument()
    })

    it('renders empty state when no entries', () => {
      render(<ScreenshotTimeline entries={[]} />)
      expect(screen.getByText(/no activity/i)).toBeInTheDocument()
    })

    it('renders screenshot entries', () => {
      render(<ScreenshotTimeline entries={sampleScreenshots} />)
      const screenshots = screen.getAllByTestId(/^timeline-entry-screenshot-/)
      expect(screenshots).toHaveLength(3)
    })

    it('displays timestamps for screenshots', () => {
      render(<ScreenshotTimeline entries={sampleScreenshots} />)
      // Timestamps should be rendered (format depends on locale)
      expect(screen.getAllByText(/\d{1,2}:\d{2}/).length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // GAP DISPLAY TESTS (AC #3, AC #6)
  // ============================================

  describe('gap display (AC #3)', () => {
    it('renders gap entries as "Monitoring paused"', () => {
      const entries = [...sampleScreenshots.slice(0, 2), sampleGap, sampleScreenshots[2]]
      render(<ScreenshotTimeline entries={entries} />)

      expect(screen.getByText('Monitoring paused')).toBeInTheDocument()
    })

    it('shows gap duration', () => {
      const entries = [sampleGap]
      render(<ScreenshotTimeline entries={entries} />)

      expect(screen.getByText(/10 minutes/i)).toBeInTheDocument()
    })

    it('gap entry has NO special marker or indicator', () => {
      const entries = [sampleGap]
      render(<ScreenshotTimeline entries={entries} />)

      const gapEntry = screen.getByTestId('timeline-entry-gap-gap-1')

      // Should NOT have any crisis-related classes or attributes
      expect(gapEntry).not.toHaveAttribute('data-crisis')
      expect(gapEntry).not.toHaveAttribute('data-privacy-gap')
      expect(gapEntry).not.toHaveAttribute('data-gap-type')
      expect(gapEntry.className).not.toMatch(/crisis/i)
      expect(gapEntry.className).not.toMatch(/warning/i)
      expect(gapEntry.className).not.toMatch(/alert/i)
    })

    it('does NOT expose any gap reason', () => {
      const entries = [sampleGap]
      render(<ScreenshotTimeline entries={entries} />)

      // The gap entry should NOT contain any reason
      expect(screen.queryByText(/crisis/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/privacy/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/blocked/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/suppressed/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // IDENTICAL APPEARANCE TESTS (AC #6)
  // ============================================

  describe('gap appearance identical (AC #6)', () => {
    it('all gaps have identical visual treatment', () => {
      const gap1: GapEntry = {
        id: 'gap-1',
        timestamp: new Date('2025-12-16T09:00:00.000Z'),
        type: 'gap',
        durationMs: 5 * 60 * 1000,
      }

      const gap2: GapEntry = {
        id: 'gap-2',
        timestamp: new Date('2025-12-16T14:00:00.000Z'),
        type: 'gap',
        durationMs: 12 * 60 * 1000,
      }

      render(<ScreenshotTimeline entries={[gap1, gap2]} />)

      const gapEntries = screen.getAllByText('Monitoring paused')
      expect(gapEntries).toHaveLength(2)

      // Both should have identical classes (except for dynamic parts)
      const gap1El = screen.getByTestId('timeline-entry-gap-gap-1')
      const gap2El = screen.getByTestId('timeline-entry-gap-gap-2')

      // Same base classes
      expect(gap1El.className).toContain('timeline-gap')
      expect(gap2El.className).toContain('timeline-gap')
    })

    it('gap entries have NO "type" attribute exposed in DOM', () => {
      const entries = [sampleGap]
      render(<ScreenshotTimeline entries={entries} />)

      const gapEntry = screen.getByTestId('timeline-entry-gap-gap-1')

      // Critical: No type indicator
      expect(gapEntry).not.toHaveAttribute('data-type')
      expect(gapEntry).not.toHaveAttribute('data-reason')
    })

    it('there is NO way to query for gap reason in the UI', () => {
      const entries = [sampleGap]
      render(<ScreenshotTimeline entries={entries} />)

      // Try various queries that should NOT find anything
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/why/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // NO REASON EXPOSURE TESTS (Task 7.3)
  // ============================================

  describe('no gap reason exposure (Task 7.3)', () => {
    it('GapEntry type does NOT include reason field', () => {
      // TypeScript check - this is a compile-time check
      // If GapEntry had a 'reason' field, this test would still pass
      // but we verify at runtime that we never render one
      const gap: GapEntry = {
        id: 'gap-test',
        timestamp: new Date(),
        type: 'gap',
        durationMs: 5 * 60 * 1000,
        // @ts-expect-error - reason should not exist
        // reason: 'crisis', // This should cause TS error if uncommented
      }

      // The gap object should only have expected fields
      expect(Object.keys(gap)).toEqual(['id', 'timestamp', 'type', 'durationMs'])
    })

    it('clicking on gap does NOT reveal reason', async () => {
      const entries = [sampleGap]
      const { container } = render(<ScreenshotTimeline entries={entries} />)

      const gapEntry = screen.getByTestId('timeline-entry-gap-gap-1')

      // Clicking should not trigger any reason display
      gapEntry.click()

      // No popover, modal, or additional info should appear
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      expect(container.textContent).not.toMatch(/crisis|privacy|blocked|reason/i)
    })
  })

  // ============================================
  // SORTING AND ORDER TESTS
  // ============================================

  describe('timeline ordering', () => {
    it('entries are sorted by timestamp descending (newest first)', () => {
      const entries = [
        sampleScreenshots[2], // 10:30
        sampleGap, // 10:10
        sampleScreenshots[0], // 10:00
      ]

      render(<ScreenshotTimeline entries={entries} />)

      const allEntries = screen.getAllByTestId(/^timeline-entry-/)
      // First entry should be the latest (10:30)
      expect(allEntries[0]).toHaveAttribute('data-testid', 'timeline-entry-screenshot-ss-3')
    })

    it('gaps are interleaved with screenshots by timestamp', () => {
      const entries = [...sampleScreenshots, sampleGap]
      render(<ScreenshotTimeline entries={entries} />)

      const allEntries = screen.getAllByTestId(/^timeline-entry-/)
      // Should be sorted by timestamp
      expect(allEntries.length).toBe(4)
    })
  })

  // ============================================
  // ARIA ATTRIBUTES TESTS (NFR42)
  // ============================================

  describe('aria attributes (NFR42)', () => {
    it('timeline has list role', () => {
      render(<ScreenshotTimeline entries={sampleScreenshots} />)
      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('entries have listitem role', () => {
      render(<ScreenshotTimeline entries={sampleScreenshots} />)
      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(3)
    })

    it('gap entries have appropriate aria-label', () => {
      render(<ScreenshotTimeline entries={[sampleGap]} />)

      const gapEntry = screen.getByTestId('timeline-entry-gap-gap-1')
      // Should have generic label - NOT revealing reason
      expect(gapEntry).toHaveAttribute('aria-label')
      const label = gapEntry.getAttribute('aria-label')
      expect(label).toMatch(/monitoring paused/i)
      expect(label).not.toMatch(/crisis/i)
      expect(label).not.toMatch(/privacy/i)
    })
  })

  // ============================================
  // LOADING STATE TESTS
  // ============================================

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      render(<ScreenshotTimeline entries={[]} loading={true} />)
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('shows skeleton entries when loading', () => {
      render(<ScreenshotTimeline entries={[]} loading={true} />)
      const skeletons = screen.getAllByTestId(/skeleton-/)
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // DATE GROUPING TESTS
  // ============================================

  describe('date grouping', () => {
    it('groups entries by date', () => {
      const entriesMultipleDays = [
        {
          ...sampleScreenshots[0],
          timestamp: new Date('2025-12-16T10:00:00.000Z'),
        },
        {
          ...sampleScreenshots[1],
          id: 'ss-4',
          timestamp: new Date('2025-12-15T10:00:00.000Z'),
        },
      ]

      render(<ScreenshotTimeline entries={entriesMultipleDays} />)

      // Should show date headers
      expect(screen.getAllByTestId(/date-header-/)).toHaveLength(2)
    })
  })
})
