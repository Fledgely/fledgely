/**
 * Tests for DemoFlagCard Component
 *
 * Story 8.5.4: Sample Flag & Alert Examples
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DemoFlagCard } from './DemoFlagCard'
import type { DemoFlag, DemoScreenshot } from '../../../data/demoData'

// Sample test data
const mockFlag: DemoFlag = {
  id: 'test-flag-1',
  screenshotId: 'demo-screenshot-10',
  concernType: 'research',
  confidence: 0.85,
  aiReasoning:
    'Alex searched for health-related topics. This might be a great opportunity to check in and see if they have questions about their health or wellness.',
  annotation: {
    text: 'I was researching for my science project about the human body.',
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    fromChild: true,
  },
  resolution: {
    status: 'resolved',
    action: 'talked',
    resolvedAt: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
    note: 'Confirmed this was for a school project',
  },
  createdAt: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
}

const mockFlagPending: DemoFlag = {
  id: 'test-flag-2',
  screenshotId: 'demo-screenshot-11',
  concernType: 'time',
  confidence: 0.72,
  aiReasoning:
    'Screen time exceeded the daily limit. Consider discussing how to balance gaming with other activities.',
  resolution: {
    status: 'pending',
  },
  createdAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
}

const mockScreenshot: DemoScreenshot = {
  id: 'demo-screenshot-10',
  timestamp: Date.now() - 4 * 60 * 60 * 1000,
  thumbnailDataUri:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
  url: 'https://example.com/health',
  title: 'Health Information Search',
  category: 'homework',
  classification: { label: 'Educational', confidence: 0.9 },
  flagged: true,
  flagReason: 'Health-related search',
}

describe('DemoFlagCard', () => {
  describe('basic rendering', () => {
    it('should render with demo styling', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const card = screen.getByTestId('demo-flag-card')
      expect(card).toBeInTheDocument()
    })

    it('should show demo badge', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const badge = screen.getByTestId('demo-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Demo')
    })

    it('should display concern type badge', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const badge = screen.getByTestId('concern-type-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Research Topic')
    })

    it('should display resolution status badge', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const badge = screen.getByTestId('resolution-status-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Resolved')
    })

    it('should display pending status for pending flags', () => {
      render(<DemoFlagCard flag={mockFlagPending} />)
      const badge = screen.getByTestId('resolution-status-badge')
      expect(badge).toHaveTextContent('Pending Review')
    })

    it('should display timestamp', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const timestamp = screen.getByTestId('flag-timestamp')
      expect(timestamp).toBeInTheDocument()
      expect(timestamp.textContent).toBeTruthy()
    })
  })

  describe('AI reasoning (AC2, AC6)', () => {
    it('should display AI reasoning', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const reasoning = screen.getByTestId('ai-reasoning')
      expect(reasoning).toBeInTheDocument()
      expect(reasoning).toHaveTextContent(mockFlag.aiReasoning)
    })

    it('should display confidence badge', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const badge = screen.getByTestId('confidence-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('85%')
    })

    it('should show "Very confident" for high confidence', () => {
      const highConfidenceFlag = { ...mockFlag, confidence: 0.95 }
      render(<DemoFlagCard flag={highConfidenceFlag} />)
      const badge = screen.getByTestId('confidence-badge')
      expect(badge).toHaveTextContent('Very confident')
    })

    it('should show "Confident" for medium confidence', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const badge = screen.getByTestId('confidence-badge')
      expect(badge).toHaveTextContent('Confident')
    })

    it('should show "Uncertain" for low confidence', () => {
      const lowConfidenceFlag = { ...mockFlag, confidence: 0.55 }
      render(<DemoFlagCard flag={lowConfidenceFlag} />)
      const badge = screen.getByTestId('confidence-badge')
      expect(badge).toHaveTextContent('Uncertain')
    })
  })

  describe('screenshot display', () => {
    it('should display screenshot when provided', () => {
      render(<DemoFlagCard flag={mockFlag} screenshot={mockScreenshot} />)
      const screenshot = screen.getByTestId('flag-screenshot')
      expect(screenshot).toBeInTheDocument()
    })

    it('should show screenshot title', () => {
      render(<DemoFlagCard flag={mockFlag} screenshot={mockScreenshot} />)
      expect(screen.getByText('Health Information Search')).toBeInTheDocument()
    })

    it('should not display screenshot section when not provided and not found', () => {
      const flagWithoutScreenshot = { ...mockFlag, screenshotId: 'nonexistent' }
      render(<DemoFlagCard flag={flagWithoutScreenshot} />)
      expect(screen.queryByTestId('flag-screenshot')).not.toBeInTheDocument()
    })
  })

  describe('child annotation (AC3)', () => {
    it('should display child annotation when present', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const annotation = screen.getByTestId('child-annotation')
      expect(annotation).toBeInTheDocument()
    })

    it('should show annotation text', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      // Contains the annotation text (curly quotes may vary by platform)
      const annotationSection = screen.getByTestId('child-annotation')
      expect(annotationSection).toHaveTextContent(mockFlag.annotation!.text)
    })

    it('should show "Alex\'s Response" for child annotations', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      expect(screen.getByText("Alex's Response")).toBeInTheDocument()
    })

    it('should show "Note" for non-child annotations', () => {
      const flagWithParentNote = {
        ...mockFlag,
        annotation: { ...mockFlag.annotation!, fromChild: false },
      }
      render(<DemoFlagCard flag={flagWithParentNote} />)
      expect(screen.getByText('Note')).toBeInTheDocument()
    })

    it('should not display annotation when not present', () => {
      render(<DemoFlagCard flag={mockFlagPending} />)
      expect(screen.queryByTestId('child-annotation')).not.toBeInTheDocument()
    })
  })

  describe('expanded details', () => {
    it('should not show expanded details by default', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      expect(screen.queryByTestId('expanded-details')).not.toBeInTheDocument()
    })

    it('should show expanded details when expanded is true', () => {
      render(<DemoFlagCard flag={mockFlag} expanded />)
      const details = screen.getByTestId('expanded-details')
      expect(details).toBeInTheDocument()
    })

    it('should show flag ID in expanded details', () => {
      render(<DemoFlagCard flag={mockFlag} expanded />)
      expect(screen.getByText(/Flag ID:/)).toBeInTheDocument()
      expect(screen.getByText(/test-flag-1/)).toBeInTheDocument()
    })

    it('should show resolution note in expanded details', () => {
      render(<DemoFlagCard flag={mockFlag} expanded />)
      expect(screen.getByText(/Confirmed this was for a school project/)).toBeInTheDocument()
    })
  })

  describe('interactivity', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<DemoFlagCard flag={mockFlag} onClick={handleClick} />)
      const card = screen.getByTestId('demo-flag-card')
      fireEvent.click(card)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should have pointer cursor when onClick is provided', () => {
      const handleClick = vi.fn()
      render(<DemoFlagCard flag={mockFlag} onClick={handleClick} />)
      const card = screen.getByTestId('demo-flag-card')
      expect(card).toHaveStyle({ cursor: 'pointer' })
    })

    it('should have default cursor when onClick is not provided', () => {
      render(<DemoFlagCard flag={mockFlag} />)
      const card = screen.getByTestId('demo-flag-card')
      expect(card).toHaveStyle({ cursor: 'default' })
    })
  })

  describe('concern type variations', () => {
    it('should display communication concern type', () => {
      const flag = { ...mockFlag, concernType: 'communication' as const }
      render(<DemoFlagCard flag={flag} />)
      expect(screen.getByTestId('concern-type-badge')).toHaveTextContent('Communication')
    })

    it('should display content concern type', () => {
      const flag = { ...mockFlag, concernType: 'content' as const }
      render(<DemoFlagCard flag={flag} />)
      expect(screen.getByTestId('concern-type-badge')).toHaveTextContent('Content Review')
    })

    it('should display time concern type', () => {
      render(<DemoFlagCard flag={mockFlagPending} />)
      expect(screen.getByTestId('concern-type-badge')).toHaveTextContent('Screen Time')
    })

    it('should display unknown concern type', () => {
      const flag = { ...mockFlag, concernType: 'unknown' as const }
      render(<DemoFlagCard flag={flag} />)
      expect(screen.getByTestId('concern-type-badge')).toHaveTextContent('Needs Review')
    })
  })

  describe('resolution status variations', () => {
    it('should display reviewed status', () => {
      const flag = { ...mockFlag, resolution: { status: 'reviewed' as const } }
      render(<DemoFlagCard flag={flag} />)
      expect(screen.getByTestId('resolution-status-badge')).toHaveTextContent('Reviewed')
    })
  })
})
