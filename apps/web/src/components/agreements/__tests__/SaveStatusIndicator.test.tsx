/**
 * Tests for SaveStatusIndicator component.
 *
 * Story 5.7: Draft Saving & Version History - AC1
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SaveStatusIndicator } from '../SaveStatusIndicator'

describe('SaveStatusIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('saved status', () => {
    it('should display saved status with checkmark', () => {
      render(<SaveStatusIndicator status="saved" lastSavedAt={null} />)

      expect(screen.getByText('All changes saved')).toBeInTheDocument()
      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('should display last saved time when available', () => {
      const lastSaved = new Date('2024-01-15T11:55:00')
      render(<SaveStatusIndicator status="saved" lastSavedAt={lastSaved} />)

      expect(screen.getByTestId('last-saved-time')).toHaveTextContent('5 minutes ago')
    })

    it('should display "just now" for recent saves', () => {
      const lastSaved = new Date('2024-01-15T11:59:30')
      render(<SaveStatusIndicator status="saved" lastSavedAt={lastSaved} />)

      expect(screen.getByTestId('last-saved-time')).toHaveTextContent('just now')
    })

    it('should display hours ago correctly', () => {
      const lastSaved = new Date('2024-01-15T09:00:00')
      render(<SaveStatusIndicator status="saved" lastSavedAt={lastSaved} />)

      expect(screen.getByTestId('last-saved-time')).toHaveTextContent('3 hours ago')
    })

    it('should display days ago correctly', () => {
      const lastSaved = new Date('2024-01-13T12:00:00')
      render(<SaveStatusIndicator status="saved" lastSavedAt={lastSaved} />)

      expect(screen.getByTestId('last-saved-time')).toHaveTextContent('2 days ago')
    })
  })

  describe('saving status', () => {
    it('should display saving status', () => {
      render(<SaveStatusIndicator status="saving" lastSavedAt={null} />)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByText('↻')).toBeInTheDocument()
    })

    it('should not show last saved time while saving', () => {
      const lastSaved = new Date('2024-01-15T11:55:00')
      render(<SaveStatusIndicator status="saving" lastSavedAt={lastSaved} />)

      expect(screen.queryByTestId('last-saved-time')).not.toBeInTheDocument()
    })
  })

  describe('unsaved status', () => {
    it('should display unsaved changes status', () => {
      render(<SaveStatusIndicator status="unsaved" lastSavedAt={null} />)

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      expect(screen.getByText('●')).toBeInTheDocument()
    })
  })

  describe('error status', () => {
    it('should display error status with warning', () => {
      render(<SaveStatusIndicator status="error" lastSavedAt={null} />)

      expect(screen.getByText('Save failed - retrying')).toBeInTheDocument()
      expect(screen.getByText('⚠')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have status role', () => {
      render(<SaveStatusIndicator status="saved" lastSavedAt={null} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have polite aria-live for saved status', () => {
      render(<SaveStatusIndicator status="saved" lastSavedAt={null} />)

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })

    it('should have assertive aria-live for error status', () => {
      render(<SaveStatusIndicator status="error" lastSavedAt={null} />)

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive')
    })

    it('should have test ID', () => {
      render(<SaveStatusIndicator status="saved" lastSavedAt={null} />)

      expect(screen.getByTestId('save-status-indicator')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<SaveStatusIndicator status="saved" lastSavedAt={null} className="custom-class" />)

      expect(screen.getByTestId('save-status-indicator')).toHaveClass('custom-class')
    })
  })

  describe('singular/plural time display', () => {
    it('should use singular for 1 minute', () => {
      const lastSaved = new Date('2024-01-15T11:59:00')
      render(<SaveStatusIndicator status="saved" lastSavedAt={lastSaved} />)

      expect(screen.getByTestId('last-saved-time')).toHaveTextContent('1 minute ago')
    })

    it('should use singular for 1 hour', () => {
      const lastSaved = new Date('2024-01-15T11:00:00')
      render(<SaveStatusIndicator status="saved" lastSavedAt={lastSaved} />)

      expect(screen.getByTestId('last-saved-time')).toHaveTextContent('1 hour ago')
    })

    it('should use singular for 1 day', () => {
      const lastSaved = new Date('2024-01-14T12:00:00')
      render(<SaveStatusIndicator status="saved" lastSavedAt={lastSaved} />)

      expect(screen.getByTestId('last-saved-time')).toHaveTextContent('1 day ago')
    })
  })
})
