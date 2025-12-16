/**
 * CrisisSearchInterstitial Component Tests
 *
 * Story 7.6: Crisis Search Redirection - Task 3
 *
 * Tests for the crisis search interstitial overlay component.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CrisisSearchInterstitial } from '../CrisisSearchInterstitial'
import type { CrisisSearchMatch } from '@fledgely/contracts'

describe('CrisisSearchInterstitial', () => {
  const defaultMatch: CrisisSearchMatch = {
    query: 'how to kill myself',
    category: 'suicide',
    confidence: 'high',
    matchedPattern: 'how to kill myself',
  }

  const defaultResources = ['988lifeline.org', 'crisistextline.org']

  describe('Rendering (AC: 2, 5)', () => {
    it('renders the interstitial with help message', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(
        screen.getByText(/we noticed you might be looking for some help/i)
      ).toBeInTheDocument()
    })

    it('displays suggested crisis resources', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Check for resources - "988" appears multiple times (name, phone, text)
      const elements = screen.queryAllByText(/988/i)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('shows continue to search button (AC: 3)', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /continue to search/i })).toBeInTheDocument()
    })

    it('shows view resources button', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(
        screen.getByRole('link', { name: /view more resources/i }) ||
          screen.getByRole('button', { name: /view more resources/i })
      ).toBeInTheDocument()
    })
  })

  describe('Interactions (AC: 3)', () => {
    it('calls onContinue when continue button is clicked', () => {
      const onContinue = vi.fn()
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={onContinue}
          onResourceClick={vi.fn()}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /continue to search/i }))
      expect(onContinue).toHaveBeenCalledTimes(1)
    })

    it('calls onResourceClick when a resource is clicked', () => {
      const onResourceClick = vi.fn()
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={onResourceClick}
        />
      )

      // Find and click a resource link
      const resourceLinks = screen.getAllByRole('link')
      if (resourceLinks.length > 0) {
        fireEvent.click(resourceLinks[0])
        expect(onResourceClick).toHaveBeenCalled()
      }
    })
  })

  describe('Age-appropriate content (AC: 6)', () => {
    it('uses non-alarming language', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Should NOT contain alarming words
      const pageContent = document.body.textContent || ''
      expect(pageContent.toLowerCase()).not.toContain('suicide prevention')
      expect(pageContent.toLowerCase()).not.toContain('you are at risk')
    })

    it('includes privacy reassurance', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // "private" appears in the description text
      const elements = screen.queryAllByText(/private/i)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('displays 24/7 availability message', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Use queryAllByText since "24/7" appears multiple times (in description and resources)
      const elements = screen.queryAllByText(/24\/7/i)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  describe('Category-specific content', () => {
    it('shows appropriate message for suicide category', () => {
      render(
        <CrisisSearchInterstitial
          match={{ ...defaultMatch, category: 'suicide' }}
          suggestedResources={['988lifeline.org']}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Should show the help message
      expect(
        screen.getByText(/we noticed you might be looking for some help/i)
      ).toBeInTheDocument()
    })

    it('shows appropriate message for abuse category', () => {
      render(
        <CrisisSearchInterstitial
          match={{
            query: 'my parent hits me',
            category: 'abuse',
            confidence: 'high',
            matchedPattern: 'my parent hits me',
          }}
          suggestedResources={['rainn.org', 'childhelp.org']}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(
        screen.getByText(/we noticed you might be looking for some help/i)
      ).toBeInTheDocument()
    })

    it('shows appropriate message for self-harm category', () => {
      render(
        <CrisisSearchInterstitial
          match={{
            query: 'cutting',
            category: 'self_harm',
            confidence: 'medium',
            matchedPattern: 'cutting',
          }}
          suggestedResources={['crisistextline.org']}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(
        screen.getByText(/we noticed you might be looking for some help/i)
      ).toBeInTheDocument()
    })
  })

  describe('Overlay behavior (AC: 5)', () => {
    it('renders as a modal overlay', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Should have role="dialog" for modal
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has proper aria attributes for accessibility', () => {
      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })
  })

  describe('Zero-data-path compliance (AC: 4)', () => {
    it('does NOT call console.log', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('does NOT make any fetch calls on render', () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      render(
        <CrisisSearchInterstitial
          match={defaultMatch}
          suggestedResources={defaultResources}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    })
  })
})
