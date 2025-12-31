/**
 * Tests for DemoFlagResolution Component
 *
 * Story 8.5.4: Sample Flag & Alert Examples
 * AC5: Resolution flow demonstration
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoFlagResolution } from './DemoFlagResolution'
import type { DemoFlagResolution as DemoFlagResolutionType } from '../../../data/demoData'

// Sample test data
const pendingResolution: DemoFlagResolutionType = {
  status: 'pending',
}

const reviewedResolution: DemoFlagResolutionType = {
  status: 'reviewed',
}

const resolvedTalkedResolution: DemoFlagResolutionType = {
  status: 'resolved',
  action: 'talked',
  resolvedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  note: 'Confirmed this was for a school project',
}

const resolvedDismissedResolution: DemoFlagResolutionType = {
  status: 'resolved',
  action: 'dismissed',
  resolvedAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
}

const resolvedFalsePositiveResolution: DemoFlagResolutionType = {
  status: 'resolved',
  action: 'false_positive',
  resolvedAt: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
}

describe('DemoFlagResolution', () => {
  describe('basic rendering', () => {
    it('should render the component', () => {
      render(<DemoFlagResolution resolution={pendingResolution} />)
      const component = screen.getByTestId('demo-flag-resolution')
      expect(component).toBeInTheDocument()
    })

    it('should show demo badge', () => {
      render(<DemoFlagResolution resolution={pendingResolution} />)
      const badge = screen.getByTestId('demo-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Demo')
    })

    it('should show status icon', () => {
      render(<DemoFlagResolution resolution={pendingResolution} />)
      const icon = screen.getByTestId('status-icon')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('pending status', () => {
    it('should display pending status label', () => {
      render(<DemoFlagResolution resolution={pendingResolution} />)
      const label = screen.getByTestId('resolution-status-label')
      expect(label).toHaveTextContent('Pending Review')
    })

    it('should show pending icon (hourglass)', () => {
      render(<DemoFlagResolution resolution={pendingResolution} />)
      const icon = screen.getByTestId('status-icon')
      expect(icon).toHaveTextContent('⏳')
    })

    it('should show pending hint', () => {
      render(<DemoFlagResolution resolution={pendingResolution} />)
      const hint = screen.getByTestId('pending-hint')
      expect(hint).toHaveTextContent('waiting for your review')
    })

    it('should not show action when pending', () => {
      render(<DemoFlagResolution resolution={pendingResolution} />)
      expect(screen.queryByTestId('resolution-action')).not.toBeInTheDocument()
    })
  })

  describe('reviewed status', () => {
    it('should display reviewed status label', () => {
      render(<DemoFlagResolution resolution={reviewedResolution} />)
      const label = screen.getByTestId('resolution-status-label')
      expect(label).toHaveTextContent('Reviewed')
    })

    it('should show reviewed icon (eyes)', () => {
      render(<DemoFlagResolution resolution={reviewedResolution} />)
      const icon = screen.getByTestId('status-icon')
      expect(icon).toHaveTextContent('👀')
    })
  })

  describe('resolved status (AC5)', () => {
    it('should display resolved status label', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      const label = screen.getByTestId('resolution-status-label')
      expect(label).toHaveTextContent('Resolved')
    })

    it('should show resolved icon (checkmark)', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      const icon = screen.getByTestId('status-icon')
      expect(icon).toHaveTextContent('✅')
    })

    it('should show action when resolved', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      const action = screen.getByTestId('resolution-action')
      expect(action).toBeInTheDocument()
    })

    it('should show "Discussed with child" for talked action', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      const action = screen.getByTestId('resolution-action')
      expect(action).toHaveTextContent('Discussed with child')
    })

    it('should show action icon for talked', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      const icon = screen.getByTestId('action-icon')
      expect(icon).toHaveTextContent('💬')
    })

    it('should show "Dismissed" for dismissed action', () => {
      render(<DemoFlagResolution resolution={resolvedDismissedResolution} />)
      const action = screen.getByTestId('resolution-action')
      expect(action).toHaveTextContent('Dismissed')
    })

    it('should show "False positive" for false_positive action', () => {
      render(<DemoFlagResolution resolution={resolvedFalsePositiveResolution} />)
      const action = screen.getByTestId('resolution-action')
      expect(action).toHaveTextContent('False positive')
    })

    it('should show resolved timestamp', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      const timestamp = screen.getByTestId('resolution-timestamp')
      expect(timestamp).toBeInTheDocument()
      expect(timestamp.textContent).toContain('ago')
    })

    it('should show resolution note', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      const note = screen.getByTestId('resolution-note')
      expect(note).toBeInTheDocument()
      expect(note).toHaveTextContent('Confirmed this was for a school project')
    })

    it('should not show note when not provided', () => {
      render(<DemoFlagResolution resolution={resolvedDismissedResolution} />)
      expect(screen.queryByTestId('resolution-note')).not.toBeInTheDocument()
    })

    it('should not show pending hint when resolved', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      expect(screen.queryByTestId('pending-hint')).not.toBeInTheDocument()
    })
  })

  describe('compact mode', () => {
    it('should render in compact mode', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} compact />)
      const component = screen.getByTestId('demo-flag-resolution')
      expect(component).toBeInTheDocument()
    })

    it('should show status badge in compact mode', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} compact />)
      const badge = screen.getByTestId('resolution-status-badge')
      expect(badge).toHaveTextContent('Resolved')
    })

    it('should show action badge in compact mode when action exists', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} compact />)
      const actionBadge = screen.getByTestId('resolution-action-badge')
      expect(actionBadge).toHaveTextContent('Discussed with child')
    })

    it('should not show action badge when no action', () => {
      render(<DemoFlagResolution resolution={pendingResolution} compact />)
      expect(screen.queryByTestId('resolution-action-badge')).not.toBeInTheDocument()
    })

    it('should not show demo badge in compact mode', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} compact />)
      expect(screen.queryByTestId('demo-badge')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should have green background for resolved status', () => {
      render(<DemoFlagResolution resolution={resolvedTalkedResolution} />)
      const component = screen.getByTestId('demo-flag-resolution')
      expect(component).toHaveStyle({ backgroundColor: '#f0fdf4' })
    })

    it('should have blue background for reviewed status', () => {
      render(<DemoFlagResolution resolution={reviewedResolution} />)
      const component = screen.getByTestId('demo-flag-resolution')
      expect(component).toHaveStyle({ backgroundColor: '#eff6ff' })
    })

    it('should have purple background for pending status', () => {
      render(<DemoFlagResolution resolution={pendingResolution} />)
      const component = screen.getByTestId('demo-flag-resolution')
      expect(component).toHaveStyle({ backgroundColor: '#faf5ff' })
    })
  })
})
