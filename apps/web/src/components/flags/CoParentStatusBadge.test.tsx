/**
 * CoParentStatusBadge Tests - Story 22.6
 *
 * Tests for co-parent interaction status badge.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoParentStatusBadge } from './CoParentStatusBadge'
import type { FlagDocument } from '@fledgely/shared'

const createMockFlag = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
  id: 'flag-123',
  childId: 'child-456',
  familyId: 'family-789',
  screenshotRef: 'children/child-456/screenshots/ss-123',
  screenshotId: 'ss-123',
  category: 'Violence',
  severity: 'high',
  confidence: 85,
  reasoning: 'Test reasoning',
  status: 'pending',
  createdAt: Date.now(),
  ...overrides,
})

describe('CoParentStatusBadge', () => {
  const parentNameMap = new Map([
    ['parent-1', 'John'],
    ['parent-2', 'Jane'],
  ])

  describe('AC2: View status visibility', () => {
    it('should show viewed badge when other parent has viewed', () => {
      const flag = createMockFlag({ viewedBy: ['parent-2'] })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.getByTestId('viewed-badge')).toHaveTextContent('Jane viewed')
    })

    it('should not show viewed badge for current parent', () => {
      const flag = createMockFlag({ viewedBy: ['parent-1'] })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.queryByTestId('viewed-badge')).not.toBeInTheDocument()
    })

    it('should return null when no other parent interactions', () => {
      const flag = createMockFlag({ viewedBy: [], auditTrail: [] })
      const { container } = render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('AC3: Action visibility', () => {
    it('should show action badge when other parent has taken action', () => {
      const flag = createMockFlag({
        auditTrail: [
          {
            action: 'discuss',
            parentId: 'parent-2',
            parentName: 'Jane',
            timestamp: Date.now(),
          },
        ],
      })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.getByTestId('action-badge')).toHaveTextContent('Jane noted for discussion')
    })

    it('should show dismiss action correctly', () => {
      const flag = createMockFlag({
        auditTrail: [
          {
            action: 'dismiss',
            parentId: 'parent-2',
            parentName: 'Jane',
            timestamp: Date.now(),
          },
        ],
      })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.getByTestId('action-badge')).toHaveTextContent('Jane dismissed')
    })

    it('should show escalate action correctly', () => {
      const flag = createMockFlag({
        auditTrail: [
          {
            action: 'escalate',
            parentId: 'parent-2',
            parentName: 'Jane',
            timestamp: Date.now(),
          },
        ],
      })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.getByTestId('action-badge')).toHaveTextContent('Jane marked for action')
    })

    it('should show discussed_together action correctly', () => {
      const flag = createMockFlag({
        auditTrail: [
          {
            action: 'discussed_together',
            parentId: 'parent-2',
            parentName: 'Jane',
            timestamp: Date.now(),
          },
        ],
      })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.getByTestId('action-badge')).toHaveTextContent('Jane discussed together')
    })

    it('should not show viewed badge when parent has taken action', () => {
      const flag = createMockFlag({
        viewedBy: ['parent-2'],
        auditTrail: [
          {
            action: 'discuss',
            parentId: 'parent-2',
            parentName: 'Jane',
            timestamp: Date.now(),
          },
        ],
      })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.queryByTestId('viewed-badge')).not.toBeInTheDocument()
      expect(screen.getByTestId('action-badge')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined viewedBy', () => {
      const flag = createMockFlag({ viewedBy: undefined })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.queryByTestId('coparent-status')).not.toBeInTheDocument()
    })

    it('should handle undefined auditTrail', () => {
      const flag = createMockFlag({ auditTrail: undefined })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.queryByTestId('coparent-status')).not.toBeInTheDocument()
    })

    it('should use fallback name when parent not in map', () => {
      const flag = createMockFlag({ viewedBy: ['unknown-parent'] })
      render(
        <CoParentStatusBadge flag={flag} currentParentId="parent-1" parentNameMap={parentNameMap} />
      )

      expect(screen.getByTestId('viewed-badge')).toHaveTextContent('Co-parent viewed')
    })
  })
})
