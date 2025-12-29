/**
 * Tests for AgreementPreview component.
 *
 * Story 5.5: Agreement Preview & Summary - AC1, AC4, AC5, AC6
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AgreementPreview } from '../AgreementPreview'
import type { AgreementTerm } from '@fledgely/shared/contracts'

// Mock child components
vi.mock('../AgreementSummary', () => ({
  AgreementSummary: ({ childName }: { childName: string }) => (
    <div data-testid="mock-agreement-summary">Summary for {childName}</div>
  ),
}))

vi.mock('../ImpactEstimation', () => ({
  ImpactEstimation: ({ childName }: { childName: string }) => (
    <div data-testid="mock-impact-estimation">Impact for {childName}</div>
  ),
}))

vi.mock('../TemplateDiffView', () => ({
  TemplateDiffView: () => <div data-testid="mock-template-diff">Template Diff</div>,
}))

// Mock useScrollProgress hook
const mockProgress = { progress: 0, isComplete: false }
vi.mock('../../../hooks/useScrollProgress', () => ({
  useScrollProgress: () => ({
    containerRef: { current: null },
    ...mockProgress,
    reset: vi.fn(),
  }),
}))

describe('AgreementPreview', () => {
  const mockTerms: AgreementTerm[] = [
    {
      id: 'term-1',
      text: 'No devices after 8pm',
      category: 'time',
      party: 'parent',
      order: 0,
      explanation: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'term-2',
      text: 'Complete homework before games',
      category: 'apps',
      party: 'child',
      order: 1,
      explanation: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'term-3',
      text: 'Weekly check-in meetings',
      category: 'monitoring',
      party: 'parent',
      order: 2,
      explanation: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  const defaultProps = {
    terms: mockTerms,
    childName: 'Alex',
  }

  beforeEach(() => {
    mockProgress.progress = 0
    mockProgress.isComplete = false
  })

  describe('rendering', () => {
    it('should render the preview container', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByTestId('agreement-preview')).toBeInTheDocument()
    })

    it('should display the header', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText('Review Your Agreement')).toBeInTheDocument()
    })

    it('should display child name in description', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText(/Alex and you/)).toBeInTheDocument()
    })

    it('should display total terms count', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('Total Rules')).toBeInTheDocument()
    })

    it('should display parent terms count', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText('2 from Parent')).toBeInTheDocument()
    })

    it('should display child terms count', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText(/1 from Alex/)).toBeInTheDocument()
    })
  })

  describe('child components', () => {
    it('should render AgreementSummary', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByTestId('mock-agreement-summary')).toBeInTheDocument()
    })

    it('should render ImpactEstimation', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByTestId('mock-impact-estimation')).toBeInTheDocument()
    })
  })

  describe('terms display', () => {
    it('should group terms by category', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Apps & Games')).toBeInTheDocument()
      expect(screen.getByText('Rules')).toBeInTheDocument()
    })

    it('should display all term texts', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText('No devices after 8pm')).toBeInTheDocument()
      expect(screen.getByText('Complete homework before games')).toBeInTheDocument()
      expect(screen.getByText('Weekly check-in meetings')).toBeInTheDocument()
    })

    it('should show party attribution badges', () => {
      render(<AgreementPreview {...defaultProps} />)

      const parentBadges = screen.getAllByText('Parent')
      expect(parentBadges.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Alex')).toBeInTheDocument()
    })
  })

  describe('scroll progress', () => {
    it('should display progress bar', () => {
      render(<AgreementPreview {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('should show progress percentage', () => {
      mockProgress.progress = 50
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should show scroll instruction when not complete', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText('↓ Keep scrolling to read everything')).toBeInTheDocument()
    })

    it('should show completion message when scrolled', () => {
      mockProgress.isComplete = true
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByText('✓ You have read the entire agreement')).toBeInTheDocument()
    })
  })

  describe('confirmation checkbox', () => {
    it('should render confirmation checkbox', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByTestId('confirm-checkbox')).toBeInTheDocument()
    })

    it('should disable checkbox when scroll not complete', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByTestId('confirm-checkbox')).toBeDisabled()
    })

    it('should enable checkbox when scroll is complete', () => {
      mockProgress.isComplete = true
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByTestId('confirm-checkbox')).not.toBeDisabled()
    })

    it('should allow checking when enabled', () => {
      mockProgress.isComplete = true
      render(<AgreementPreview {...defaultProps} />)

      const checkbox = screen.getByTestId('confirm-checkbox')
      fireEvent.click(checkbox)

      expect(checkbox).toBeChecked()
    })

    it('should show scroll requirement message when disabled', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(
        screen.getByText(/Please scroll through the entire agreement first/)
      ).toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('should render edit button when onEdit provided', () => {
      const onEdit = vi.fn()
      render(<AgreementPreview {...defaultProps} onEdit={onEdit} />)

      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
    })

    it('should not render edit button when onEdit not provided', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument()
    })

    it('should call onEdit when edit button clicked', () => {
      const onEdit = vi.fn()
      render(<AgreementPreview {...defaultProps} onEdit={onEdit} />)

      fireEvent.click(screen.getByTestId('edit-button'))
      expect(onEdit).toHaveBeenCalled()
    })

    it('should render download PDF button when onDownloadPdf provided', () => {
      const onDownloadPdf = vi.fn()
      render(<AgreementPreview {...defaultProps} onDownloadPdf={onDownloadPdf} />)

      expect(screen.getByTestId('download-pdf-button')).toBeInTheDocument()
    })

    it('should call onDownloadPdf when download button clicked', () => {
      const onDownloadPdf = vi.fn()
      render(<AgreementPreview {...defaultProps} onDownloadPdf={onDownloadPdf} />)

      fireEvent.click(screen.getByTestId('download-pdf-button'))
      expect(onDownloadPdf).toHaveBeenCalled()
    })

    it('should show loading state when PDF is generating', () => {
      const onDownloadPdf = vi.fn()
      render(<AgreementPreview {...defaultProps} onDownloadPdf={onDownloadPdf} isPdfLoading />)

      expect(screen.getByText('Generating PDF...')).toBeInTheDocument()
    })

    it('should disable download button when loading', () => {
      const onDownloadPdf = vi.fn()
      render(<AgreementPreview {...defaultProps} onDownloadPdf={onDownloadPdf} isPdfLoading />)

      expect(screen.getByTestId('download-pdf-button')).toBeDisabled()
    })

    it('should render confirm button when onConfirm provided', () => {
      const onConfirm = vi.fn()
      render(<AgreementPreview {...defaultProps} onConfirm={onConfirm} />)

      expect(screen.getByTestId('confirm-button')).toBeInTheDocument()
    })

    it('should disable confirm button when not checked', () => {
      const onConfirm = vi.fn()
      mockProgress.isComplete = true
      render(<AgreementPreview {...defaultProps} onConfirm={onConfirm} />)

      expect(screen.getByTestId('confirm-button')).toBeDisabled()
    })

    it('should enable confirm button when checked and scrolled', () => {
      const onConfirm = vi.fn()
      mockProgress.isComplete = true
      render(<AgreementPreview {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('confirm-checkbox'))

      expect(screen.getByTestId('confirm-button')).not.toBeDisabled()
    })

    it('should call onConfirm when confirm button clicked', () => {
      const onConfirm = vi.fn()
      mockProgress.isComplete = true
      render(<AgreementPreview {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('confirm-checkbox'))
      fireEvent.click(screen.getByTestId('confirm-button'))

      expect(onConfirm).toHaveBeenCalled()
    })
  })

  describe('template diff', () => {
    const templateTerms: AgreementTerm[] = [
      {
        id: 'template-1',
        text: 'Original rule',
        category: 'time',
        party: 'parent',
        order: 0,
        explanation: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it('should show diff toggle when template terms provided', () => {
      render(<AgreementPreview {...defaultProps} templateTerms={templateTerms} />)

      expect(screen.getByTestId('toggle-diff')).toBeInTheDocument()
    })

    it('should not show diff toggle when no template terms', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.queryByTestId('toggle-diff')).not.toBeInTheDocument()
    })

    it('should toggle diff view when button clicked', () => {
      render(<AgreementPreview {...defaultProps} templateTerms={templateTerms} />)

      // Initially hidden
      expect(screen.queryByTestId('mock-template-diff')).not.toBeInTheDocument()

      // Click to show
      fireEvent.click(screen.getByTestId('toggle-diff'))
      expect(screen.getByTestId('mock-template-diff')).toBeInTheDocument()

      // Click to hide
      fireEvent.click(screen.getByTestId('toggle-diff'))
      expect(screen.queryByTestId('mock-template-diff')).not.toBeInTheDocument()
    })

    it('should update toggle button text', () => {
      render(<AgreementPreview {...defaultProps} templateTerms={templateTerms} />)

      expect(screen.getByText('Show changes from template')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('toggle-diff'))

      expect(screen.getByText('Hide changes from template')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have scroll container with testid', () => {
      render(<AgreementPreview {...defaultProps} />)

      expect(screen.getByTestId('agreement-scroll-container')).toBeInTheDocument()
    })

    it('should have labeled progress bar', () => {
      render(<AgreementPreview {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label', 'Reading progress')
    })

    it('should have proper value attributes on progress bar', () => {
      mockProgress.progress = 75
      render(<AgreementPreview {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('should meet minimum touch target size for buttons', () => {
      const onEdit = vi.fn()
      const onConfirm = vi.fn()
      const onDownloadPdf = vi.fn()

      render(
        <AgreementPreview
          {...defaultProps}
          onEdit={onEdit}
          onConfirm={onConfirm}
          onDownloadPdf={onDownloadPdf}
        />
      )

      const buttons = [
        screen.getByTestId('edit-button'),
        screen.getByTestId('confirm-button'),
        screen.getByTestId('download-pdf-button'),
      ]

      buttons.forEach((button) => {
        expect(button).toHaveClass('min-h-[48px]')
      })
    })
  })

  describe('term explanations', () => {
    it('should show term explanation when present', () => {
      const termsWithExplanation: AgreementTerm[] = [
        {
          id: 'term-1',
          text: 'No devices after 8pm',
          explanation: 'This helps ensure good sleep',
          category: 'time',
          party: 'parent',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      render(<AgreementPreview {...defaultProps} terms={termsWithExplanation} />)

      expect(screen.getByText('This helps ensure good sleep')).toBeInTheDocument()
    })
  })
})
