import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConcernFilterChips } from '../ConcernFilterChips'
import { TEMPLATE_CONCERNS, TEMPLATE_CONCERN_LABELS } from '@fledgely/contracts'

describe('ConcernFilterChips', () => {
  describe('rendering', () => {
    it('renders all concern chips', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={() => {}}
        />
      )

      for (const concern of TEMPLATE_CONCERNS) {
        expect(screen.getByRole('checkbox', { name: TEMPLATE_CONCERN_LABELS[concern] })).toBeInTheDocument()
      }
    })

    it('renders filter label', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={() => {}}
        />
      )

      expect(screen.getByText('Filter by topic')).toBeInTheDocument()
    })

    it('shows "Clear all" button when concerns are selected', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={['gaming']}
          onConcernsChange={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })

    it('hides "Clear all" button when no concerns are selected', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={() => {}}
        />
      )

      expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
    })
  })

  describe('selection state', () => {
    it('shows chip as checked when selected', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={['gaming', 'social_media']}
          onConcernsChange={() => {}}
        />
      )

      expect(screen.getByRole('checkbox', { name: 'Gaming' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('checkbox', { name: 'Social Media' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('checkbox', { name: 'Screen Time' })).toHaveAttribute('aria-checked', 'false')
    })

    it('displays check icon for selected chips', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={['gaming']}
          onConcernsChange={() => {}}
        />
      )

      const gamingChip = screen.getByRole('checkbox', { name: 'Gaming' })
      // Check icon is an svg inside the chip
      const svg = gamingChip.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('adds concern when clicking unselected chip', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={handleChange}
        />
      )

      await user.click(screen.getByRole('checkbox', { name: 'Gaming' }))

      expect(handleChange).toHaveBeenCalledWith(['gaming'])
    })

    it('removes concern when clicking selected chip', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(
        <ConcernFilterChips
          selectedConcerns={['gaming', 'social_media']}
          onConcernsChange={handleChange}
        />
      )

      await user.click(screen.getByRole('checkbox', { name: 'Gaming' }))

      expect(handleChange).toHaveBeenCalledWith(['social_media'])
    })

    it('clears all concerns when clicking "Clear all"', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(
        <ConcernFilterChips
          selectedConcerns={['gaming', 'social_media', 'homework']}
          onConcernsChange={handleChange}
        />
      )

      await user.click(screen.getByRole('button', { name: /clear all/i }))

      expect(handleChange).toHaveBeenCalledWith([])
    })

    it('toggles concern with Enter key', () => {
      const handleChange = vi.fn()

      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={handleChange}
        />
      )

      const chip = screen.getByRole('checkbox', { name: 'Gaming' })
      fireEvent.keyDown(chip, { key: 'Enter' })

      expect(handleChange).toHaveBeenCalledWith(['gaming'])
    })

    it('toggles concern with Space key', () => {
      const handleChange = vi.fn()

      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={handleChange}
        />
      )

      const chip = screen.getByRole('checkbox', { name: 'Gaming' })
      fireEvent.keyDown(chip, { key: ' ' })

      expect(handleChange).toHaveBeenCalledWith(['gaming'])
    })

    it('does not toggle for other keys', () => {
      const handleChange = vi.fn()

      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={handleChange}
        />
      )

      const chip = screen.getByRole('checkbox', { name: 'Gaming' })
      fireEvent.keyDown(chip, { key: 'a' })

      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has group role with aria-labelledby', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={() => {}}
        />
      )

      const group = screen.getByRole('group')
      expect(group).toHaveAttribute('aria-labelledby', 'concern-filter-label')
    })

    it('has checkbox role on chips', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={() => {}}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBe(TEMPLATE_CONCERNS.length)
    })

    it('has aria-checked attribute on chips', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={['gaming']}
          onConcernsChange={() => {}}
        />
      )

      const gamingChip = screen.getByRole('checkbox', { name: 'Gaming' })
      expect(gamingChip).toHaveAttribute('aria-checked', 'true')
    })

    it('has screen reader announcement for selection changes', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={['gaming', 'social_media']}
          onConcernsChange={() => {}}
        />
      )

      // There should be a live region with selection summary
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveTextContent('2 topics selected')
    })

    it('announces when no topics are selected', () => {
      render(
        <ConcernFilterChips
          selectedConcerns={[]}
          onConcernsChange={() => {}}
        />
      )

      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toHaveTextContent('No topics selected')
    })
  })
})
