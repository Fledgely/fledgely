import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgeGroupTabs } from '../AgeGroupTabs'
import type { AgeGroup } from '@fledgely/contracts'

const mockTemplateCounts: Record<AgeGroup, number> = {
  '5-7': 3,
  '8-10': 3,
  '11-13': 3,
  '14-16': 3,
}

describe('AgeGroupTabs', () => {
  describe('rendering', () => {
    it('renders all age group tabs', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={() => {}}
        />
      )

      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /5-7/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /8-10/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /11-13/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /14-16/i })).toBeInTheDocument()
    })

    it('renders template counts when provided', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={() => {}}
          templateCounts={mockTemplateCounts}
        />
      )

      // Total count for "All" tab
      expect(screen.getByLabelText('12 templates')).toBeInTheDocument()
      // Individual counts
      expect(screen.getAllByLabelText('3 templates')).toHaveLength(4)
    })

    it('does not render counts when not provided', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={() => {}}
        />
      )

      expect(screen.queryByLabelText(/templates$/)).not.toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('shows "All" tab as selected when selectedAgeGroup is null', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={() => {}}
        />
      )

      const allTab = screen.getByRole('tab', { name: /all/i })
      expect(allTab).toHaveAttribute('aria-selected', 'true')
    })

    it('shows correct tab as selected', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup="8-10"
          onAgeGroupChange={() => {}}
        />
      )

      const selectedTab = screen.getByRole('tab', { name: /8-10/i })
      expect(selectedTab).toHaveAttribute('aria-selected', 'true')

      const allTab = screen.getByRole('tab', { name: /all/i })
      expect(allTab).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('interactions', () => {
    it('calls onAgeGroupChange with null when clicking "All" tab', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(
        <AgeGroupTabs
          selectedAgeGroup="8-10"
          onAgeGroupChange={handleChange}
        />
      )

      await user.click(screen.getByRole('tab', { name: /all/i }))

      expect(handleChange).toHaveBeenCalledWith(null)
    })

    it('calls onAgeGroupChange with age group when clicking tab', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={handleChange}
        />
      )

      await user.click(screen.getByRole('tab', { name: /11-13/i }))

      expect(handleChange).toHaveBeenCalledWith('11-13')
    })
  })

  describe('keyboard navigation', () => {
    it('has correct tabIndex for selected and unselected tabs', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup="8-10"
          onAgeGroupChange={() => {}}
        />
      )

      const selectedTab = screen.getByRole('tab', { name: /8-10/i })
      expect(selectedTab).toHaveAttribute('tabindex', '0')

      const unselectedTab = screen.getByRole('tab', { name: /all/i })
      expect(unselectedTab).toHaveAttribute('tabindex', '-1')
    })

    it('navigates right with ArrowRight key', () => {
      const handleChange = vi.fn()
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={handleChange}
        />
      )

      const allTab = screen.getByRole('tab', { name: /all/i })
      allTab.focus()
      fireEvent.keyDown(allTab, { key: 'ArrowRight' })

      // Should have clicked the next tab (5-7)
      expect(handleChange).toHaveBeenCalledWith('5-7')
    })

    it('navigates left with ArrowLeft key', () => {
      const handleChange = vi.fn()
      render(
        <AgeGroupTabs
          selectedAgeGroup="8-10"
          onAgeGroupChange={handleChange}
        />
      )

      const tab = screen.getByRole('tab', { name: /8-10/i })
      tab.focus()
      fireEvent.keyDown(tab, { key: 'ArrowLeft' })

      // Should have clicked the previous tab (5-7)
      expect(handleChange).toHaveBeenCalledWith('5-7')
    })

    it('navigates to first tab with Home key', () => {
      const handleChange = vi.fn()
      render(
        <AgeGroupTabs
          selectedAgeGroup="14-16"
          onAgeGroupChange={handleChange}
        />
      )

      const tab = screen.getByRole('tab', { name: /14-16/i })
      tab.focus()
      fireEvent.keyDown(tab, { key: 'Home' })

      // Should have clicked the first tab (All)
      expect(handleChange).toHaveBeenCalledWith(null)
    })

    it('navigates to last tab with End key', () => {
      const handleChange = vi.fn()
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={handleChange}
        />
      )

      const tab = screen.getByRole('tab', { name: /all/i })
      tab.focus()
      fireEvent.keyDown(tab, { key: 'End' })

      // Should have clicked the last tab (14-16)
      expect(handleChange).toHaveBeenCalledWith('14-16')
    })

    it('wraps around from last to first with ArrowRight', () => {
      const handleChange = vi.fn()
      render(
        <AgeGroupTabs
          selectedAgeGroup="14-16"
          onAgeGroupChange={handleChange}
        />
      )

      const tab = screen.getByRole('tab', { name: /14-16/i })
      tab.focus()
      fireEvent.keyDown(tab, { key: 'ArrowRight' })

      // Should have clicked the first tab (All)
      expect(handleChange).toHaveBeenCalledWith(null)
    })

    it('wraps around from first to last with ArrowLeft', () => {
      const handleChange = vi.fn()
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={handleChange}
        />
      )

      const tab = screen.getByRole('tab', { name: /all/i })
      tab.focus()
      fireEvent.keyDown(tab, { key: 'ArrowLeft' })

      // Should have clicked the last tab (14-16)
      expect(handleChange).toHaveBeenCalledWith('14-16')
    })
  })

  describe('accessibility', () => {
    it('has tablist role', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={() => {}}
        />
      )

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('has aria-label on tablist', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={() => {}}
        />
      )

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label')
    })

    it('has correct aria-controls on tabs', () => {
      render(
        <AgeGroupTabs
          selectedAgeGroup={null}
          onAgeGroupChange={() => {}}
        />
      )

      const allTab = screen.getByRole('tab', { name: /all/i })
      expect(allTab).toHaveAttribute('aria-controls', 'tabpanel-all')
    })
  })
})
