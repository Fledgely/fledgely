/**
 * FlagCard Component Tests - Story 22.1
 *
 * Tests for the FlagCard component.
 * Covers acceptance criteria:
 * - AC2: Each flag shows: thumbnail, category, severity badge, child name, timestamp
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlagCard } from './FlagCard'
import type { FlagDocument } from '@fledgely/shared'

// Mock flag document for testing
const createMockFlag = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
  id: 'flag-123',
  screenshotId: 'screenshot-456',
  childId: 'child-789',
  familyId: 'family-abc',
  category: 'Violence',
  severity: 'high',
  confidence: 85,
  reasoning: 'Detected violent content in this screenshot',
  status: 'pending',
  createdAt: Date.now() - 3600000, // 1 hour ago
  ...overrides,
})

describe('FlagCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC2: Flag card displays correct information', () => {
    it('should display thumbnail placeholder', () => {
      const flag = createMockFlag()
      render(<FlagCard flag={flag} childName="Test Child" />)

      const thumbnail = screen.getByTestId('flag-thumbnail')
      expect(thumbnail).toBeInTheDocument()
    })

    it('should display child name', () => {
      const flag = createMockFlag()
      render(<FlagCard flag={flag} childName="Emma" />)

      expect(screen.getByTestId('flag-child-name')).toHaveTextContent('Emma')
    })

    it('should display category badge', () => {
      const flag = createMockFlag({ category: 'Violence' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      const categoryBadge = screen.getByTestId('flag-category-badge')
      expect(categoryBadge).toHaveTextContent('Violence')
    })

    it('should display severity badge for high severity', () => {
      const flag = createMockFlag({ severity: 'high' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      const severityBadge = screen.getByTestId('flag-severity-badge')
      expect(severityBadge).toHaveTextContent('High')
    })

    it('should display severity badge for medium severity', () => {
      const flag = createMockFlag({ severity: 'medium' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      const severityBadge = screen.getByTestId('flag-severity-badge')
      expect(severityBadge).toHaveTextContent('Medium')
    })

    it('should display severity badge for low severity', () => {
      const flag = createMockFlag({ severity: 'low' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      const severityBadge = screen.getByTestId('flag-severity-badge')
      expect(severityBadge).toHaveTextContent('Low')
    })

    it('should display relative timestamp', () => {
      const flag = createMockFlag({ createdAt: Date.now() - 7200000 }) // 2 hours ago
      render(<FlagCard flag={flag} childName="Test Child" />)

      const timestamp = screen.getByTestId('flag-timestamp')
      expect(timestamp).toHaveTextContent('2 hours ago')
    })

    it('should display "Just now" for recent flags', () => {
      const flag = createMockFlag({ createdAt: Date.now() - 5000 }) // 5 seconds ago
      render(<FlagCard flag={flag} childName="Test Child" />)

      const timestamp = screen.getByTestId('flag-timestamp')
      expect(timestamp).toHaveTextContent('Just now')
    })

    it('should display AI reasoning', () => {
      const flag = createMockFlag({ reasoning: 'This contains violent imagery' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      const reasoning = screen.getByTestId('flag-reasoning')
      expect(reasoning).toHaveTextContent('This contains violent imagery')
    })

    it('should display confidence percentage', () => {
      const flag = createMockFlag({ confidence: 92 })
      render(<FlagCard flag={flag} childName="Test Child" />)

      const confidence = screen.getByTestId('flag-confidence')
      expect(confidence).toHaveTextContent('92% confidence')
    })
  })

  describe('Category display', () => {
    it('should display Adult Content category correctly', () => {
      const flag = createMockFlag({ category: 'Adult Content' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      expect(screen.getByTestId('flag-category-badge')).toHaveTextContent('Adult Content')
    })

    it('should display Bullying category correctly', () => {
      const flag = createMockFlag({ category: 'Bullying' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      expect(screen.getByTestId('flag-category-badge')).toHaveTextContent('Bullying')
    })

    it('should display Self-Harm Indicators category correctly', () => {
      const flag = createMockFlag({ category: 'Self-Harm Indicators' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      expect(screen.getByTestId('flag-category-badge')).toHaveTextContent('Self-Harm')
    })

    it('should display Explicit Language category correctly', () => {
      const flag = createMockFlag({ category: 'Explicit Language' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      expect(screen.getByTestId('flag-category-badge')).toHaveTextContent('Explicit Language')
    })

    it('should display Unknown Contacts category correctly', () => {
      const flag = createMockFlag({ category: 'Unknown Contacts' })
      render(<FlagCard flag={flag} childName="Test Child" />)

      expect(screen.getByTestId('flag-category-badge')).toHaveTextContent('Unknown Contacts')
    })
  })

  describe('Click handling', () => {
    it('should call onClick when card is clicked', () => {
      const handleClick = vi.fn()
      const flag = createMockFlag()
      render(<FlagCard flag={flag} childName="Test Child" onClick={handleClick} />)

      const card = screen.getByTestId(`flag-card-${flag.id}`)
      fireEvent.click(card)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should call onClick when Enter key is pressed', () => {
      const handleClick = vi.fn()
      const flag = createMockFlag()
      render(<FlagCard flag={flag} childName="Test Child" onClick={handleClick} />)

      const card = screen.getByTestId(`flag-card-${flag.id}`)
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should call onClick when Space key is pressed', () => {
      const handleClick = vi.fn()
      const flag = createMockFlag()
      render(<FlagCard flag={flag} childName="Test Child" onClick={handleClick} />)

      const card = screen.getByTestId(`flag-card-${flag.id}`)
      fireEvent.keyDown(card, { key: ' ' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Selection state', () => {
    it('should not have selected styling by default', () => {
      const flag = createMockFlag()
      render(<FlagCard flag={flag} childName="Test Child" />)

      const card = screen.getByTestId(`flag-card-${flag.id}`)
      expect(card).not.toHaveStyle({ borderColor: '#8b5cf6' })
    })

    it('should have selected styling when selected', () => {
      const flag = createMockFlag()
      render(<FlagCard flag={flag} childName="Test Child" selected={true} />)

      const card = screen.getByTestId(`flag-card-${flag.id}`)
      expect(card).toHaveStyle({ borderColor: '#8b5cf6' })
    })
  })

  describe('Throttled badge', () => {
    it('should not show throttled badge when not throttled', () => {
      const flag = createMockFlag({ throttled: undefined })
      render(<FlagCard flag={flag} childName="Test Child" />)

      expect(screen.queryByTestId('flag-throttled-badge')).not.toBeInTheDocument()
    })

    it('should show throttled badge when throttled', () => {
      const flag = createMockFlag({ throttled: true })
      render(<FlagCard flag={flag} childName="Test Child" />)

      expect(screen.getByTestId('flag-throttled-badge')).toHaveTextContent('Throttled')
    })
  })

  describe('Accessibility', () => {
    it('should have proper role and tabIndex for keyboard navigation', () => {
      const flag = createMockFlag()
      render(<FlagCard flag={flag} childName="Test Child" />)

      const card = screen.getByTestId(`flag-card-${flag.id}`)
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('should have descriptive aria-label', () => {
      const flag = createMockFlag({ category: 'Violence', severity: 'high' })
      render(<FlagCard flag={flag} childName="Emma" />)

      const card = screen.getByTestId(`flag-card-${flag.id}`)
      expect(card).toHaveAttribute('aria-label', 'Flag for Emma: Violence, high severity')
    })
  })
})
