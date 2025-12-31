/**
 * ChildAgreementView Tests - Story 19C.1
 *
 * Task 6: Add component tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildAgreementView } from './ChildAgreementView'
import type { ChildAgreement } from '../../hooks/useChildAgreement'

describe('ChildAgreementView', () => {
  const mockAgreement: ChildAgreement = {
    id: 'agreement-1',
    familyId: 'family-1',
    childId: 'child-1',
    version: 'v1.0',
    terms: [
      {
        id: 'term-1',
        text: 'Screenshots are taken every 5 minutes',
        category: 'monitoring',
        party: 'parent',
        explanation: null,
        isDefault: true,
      },
      {
        id: 'term-2',
        text: 'I will ask before downloading new apps',
        category: 'apps',
        party: 'child',
        explanation: null,
        isDefault: false,
      },
      {
        id: 'term-3',
        text: 'Screen time is limited to 2 hours on weekdays',
        category: 'time',
        party: 'parent',
        explanation: null,
        isDefault: true,
      },
    ],
    activatedAt: new Date('2024-01-15'),
    signatures: [
      {
        party: 'parent',
        name: 'Mom',
        signedAt: new Date('2024-01-15T09:00:00'),
      },
      {
        party: 'child',
        name: 'Alex',
        signedAt: new Date('2024-01-15T10:00:00'),
      },
    ],
    monitoring: {
      screenshotsEnabled: true,
      captureFrequency: 'Every 5 minutes',
      retentionPeriod: '30 days',
    },
  }

  it('should render with correct test id', () => {
    render(<ChildAgreementView agreement={mockAgreement} />)
    expect(screen.getByTestId('child-agreement-view')).toBeInTheDocument()
  })

  it('should display agreement title (AC5)', () => {
    render(<ChildAgreementView agreement={mockAgreement} />)
    expect(screen.getByTestId('agreement-title')).toHaveTextContent('Our Family Agreement')
  })

  it('should display transparency message (AC5)', () => {
    render(<ChildAgreementView agreement={mockAgreement} />)
    expect(screen.getByTestId('transparency-message')).toHaveTextContent(
      'This is what we agreed to together'
    )
  })

  describe('Loading State', () => {
    it('should display loading state when loading', () => {
      render(<ChildAgreementView agreement={null} loading={true} />)
      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      expect(screen.getByText('Loading your agreement...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error state when error occurs', () => {
      render(<ChildAgreementView agreement={null} error="Something went wrong" />)
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no agreement exists', () => {
      render(<ChildAgreementView agreement={null} />)
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No Agreement Yet')).toBeInTheDocument()
    })
  })

  describe('Monitoring Summary (AC2)', () => {
    it('should display monitoring summary card', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('monitoring-summary')).toBeInTheDocument()
    })

    it('should display screenshots enabled status', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('screenshots-row')).toBeInTheDocument()
      expect(screen.getByText('Yes ✓')).toBeInTheDocument()
    })

    it('should display capture frequency in child-friendly format', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('frequency-row')).toBeInTheDocument()
      // Child-friendly format: "every 5 minutes" (lowercase, from formatMonitoringForChild)
      expect(screen.getByText('every 5 minutes')).toBeInTheDocument()
    })

    it('should display retention period in child-friendly format', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('retention-row')).toBeInTheDocument()
      // Child-friendly format from formatMonitoringForChild
      expect(screen.getByText('Pictures are kept for 30 days, then deleted')).toBeInTheDocument()
    })
  })

  describe('Signatures Display (AC3)', () => {
    it('should display signatures card', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('signatures-card')).toBeInTheDocument()
    })

    it('should display parent signature with name and date', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('signature-parent-0')).toBeInTheDocument()
      expect(screen.getByText('Mom')).toBeInTheDocument()
    })

    it('should display child signature with name and date', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('signature-child-1')).toBeInTheDocument()
      expect(screen.getByText('Alex')).toBeInTheDocument()
    })

    it('should display checkmarks for all signatures', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      const checkmarks = screen.getAllByText('✓')
      expect(checkmarks.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Terms Display (AC1, AC4)', () => {
    it('should display terms grouped by category', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('terms-category-monitoring')).toBeInTheDocument()
      expect(screen.getByTestId('terms-category-apps')).toBeInTheDocument()
      expect(screen.getByTestId('terms-category-time')).toBeInTheDocument()
    })

    it('should display individual terms with translated text', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('term-term-1')).toBeInTheDocument()
      // Text is translated by translateToChildFriendly: "Screenshots are taken" → "Pictures of your screen are saved"
      expect(
        screen.getByText('Pictures of your screen are saved every 5 minutes')
      ).toBeInTheDocument()
    })

    it('should display party badges for terms', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      // Multiple parent terms exist, so use getAllBy
      const parentBadges = screen.getAllByText('Parent')
      expect(parentBadges.length).toBeGreaterThan(0)
    })

    it('should use childName prop for child terms', () => {
      render(<ChildAgreementView agreement={mockAgreement} childName="Alex" />)
      // Alex appears in both signatures and terms
      const alexElements = screen.getAllByText('Alex')
      expect(alexElements.length).toBeGreaterThan(0)
    })

    it('should display agreement in read-only mode (no edit buttons)', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  describe('Agreement Version', () => {
    it('should display agreement version', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('agreement-version')).toHaveTextContent('v1.0')
    })

    it('should display activation date', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.getByTestId('agreement-version')).toHaveTextContent('Jan 15, 2024')
    })
  })

  describe('Request Change Button (AC6)', () => {
    it('should display request change button when handler provided', () => {
      const onRequestChange = vi.fn()
      render(<ChildAgreementView agreement={mockAgreement} onRequestChange={onRequestChange} />)
      expect(screen.getByTestId('request-change-button')).toBeInTheDocument()
    })

    it('should not display request change button when no handler provided', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      expect(screen.queryByTestId('request-change-button')).not.toBeInTheDocument()
    })

    it('should call onRequestChange when button is clicked', () => {
      const onRequestChange = vi.fn()
      render(<ChildAgreementView agreement={mockAgreement} onRequestChange={onRequestChange} />)

      fireEvent.click(screen.getByTestId('request-change-button'))

      expect(onRequestChange).toHaveBeenCalledTimes(1)
    })

    it('should display friendly request change text', () => {
      const onRequestChange = vi.fn()
      render(<ChildAgreementView agreement={mockAgreement} onRequestChange={onRequestChange} />)
      expect(screen.getByTestId('request-change-button')).toHaveTextContent(
        'Want to change something?'
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<ChildAgreementView agreement={mockAgreement} />)
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Our Family Agreement')

      const h2s = screen.getAllByRole('heading', { level: 2 })
      expect(h2s.length).toBeGreaterThan(0)
    })
  })
})
