/**
 * ExternalShareGuard Component Tests - Story 36.6 Task 4
 *
 * Tests for preventing external sharing of trust scores.
 * AC5: Trust score not shared outside family
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExternalShareGuard } from './ExternalShareGuard'

describe('ExternalShareGuard - Story 36.6 Task 4', () => {
  describe('AC5: Trust score not shared outside family', () => {
    it('should render the guard container', () => {
      render(
        <ExternalShareGuard>
          <div>Trust score content</div>
        </ExternalShareGuard>
      )

      expect(screen.getByTestId('external-share-guard')).toBeInTheDocument()
    })

    it('should NOT show share button', () => {
      render(
        <ExternalShareGuard>
          <div>Trust score content</div>
        </ExternalShareGuard>
      )

      expect(screen.queryByTestId('share-button')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    })

    it('should NOT show export button', () => {
      render(
        <ExternalShareGuard>
          <div>Trust score content</div>
        </ExternalShareGuard>
      )

      expect(screen.queryByTestId('export-button')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
    })

    it('should NOT show copy link functionality', () => {
      render(
        <ExternalShareGuard>
          <div>Trust score content</div>
        </ExternalShareGuard>
      )

      expect(screen.queryByRole('button', { name: /copy.*link/i })).not.toBeInTheDocument()
    })

    it('should NOT show social media share options', () => {
      render(
        <ExternalShareGuard>
          <div>Trust score content</div>
        </ExternalShareGuard>
      )

      expect(screen.queryByTestId('social-share')).not.toBeInTheDocument()
    })
  })

  describe('Privacy notice', () => {
    it('should display privacy notice', () => {
      render(
        <ExternalShareGuard showNotice>
          <div>Trust score content</div>
        </ExternalShareGuard>
      )

      expect(screen.getByTestId('privacy-notice')).toBeInTheDocument()
    })

    it('should explain privacy policy', () => {
      render(
        <ExternalShareGuard showNotice>
          <div>Trust score content</div>
        </ExternalShareGuard>
      )

      const notice = screen.getByTestId('privacy-notice')
      expect(notice.textContent).toMatch(/family|private|not.*share/i)
    })

    it('should not show notice by default', () => {
      render(
        <ExternalShareGuard>
          <div>Trust score content</div>
        </ExternalShareGuard>
      )

      expect(screen.queryByTestId('privacy-notice')).not.toBeInTheDocument()
    })
  })

  describe('Content rendering', () => {
    it('should render children content', () => {
      render(
        <ExternalShareGuard>
          <div data-testid="protected-content">Trust Score: 85</div>
        </ExternalShareGuard>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render multiple children', () => {
      render(
        <ExternalShareGuard>
          <div data-testid="content-1">Score</div>
          <div data-testid="content-2">Details</div>
        </ExternalShareGuard>
      )

      expect(screen.getByTestId('content-1')).toBeInTheDocument()
      expect(screen.getByTestId('content-2')).toBeInTheDocument()
    })
  })

  describe('No external functionality', () => {
    it('should not expose print functionality', () => {
      render(
        <ExternalShareGuard>
          <div>Content</div>
        </ExternalShareGuard>
      )

      expect(screen.queryByRole('button', { name: /print/i })).not.toBeInTheDocument()
    })

    it('should not expose download functionality', () => {
      render(
        <ExternalShareGuard>
          <div>Content</div>
        </ExternalShareGuard>
      )

      expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have appropriate aria attributes', () => {
      render(
        <ExternalShareGuard showNotice>
          <div>Content</div>
        </ExternalShareGuard>
      )

      expect(screen.getByTestId('privacy-notice')).toHaveAttribute('role', 'note')
    })
  })
})
