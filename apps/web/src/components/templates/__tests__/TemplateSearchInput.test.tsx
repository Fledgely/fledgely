import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateSearchInput } from '../TemplateSearchInput'

describe('TemplateSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders input with placeholder', () => {
      render(<TemplateSearchInput value="" onChange={() => {}} />)

      expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      render(
        <TemplateSearchInput
          value=""
          onChange={() => {}}
          placeholder="Find templates..."
        />
      )

      expect(screen.getByPlaceholderText('Find templates...')).toBeInTheDocument()
    })

    it('renders search icon container', () => {
      render(<TemplateSearchInput value="" onChange={() => {}} />)

      // Search icon container has aria-hidden
      const searchIconContainer = document.querySelector('[aria-hidden="true"]')
      expect(searchIconContainer).toBeInTheDocument()
    })

    it('renders value in input', () => {
      render(<TemplateSearchInput value="test query" onChange={() => {}} />)

      expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
    })
  })

  describe('clear button', () => {
    it('shows clear button when there is text', () => {
      render(<TemplateSearchInput value="test" onChange={() => {}} />)

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
    })

    it('hides clear button when input is empty', () => {
      render(<TemplateSearchInput value="" onChange={() => {}} />)

      expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
    })

    it('clears input when clear button is clicked', () => {
      const handleChange = vi.fn()

      render(<TemplateSearchInput value="test" onChange={handleChange} />)

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }))

      expect(handleChange).toHaveBeenCalledWith('')
    })
  })

  describe('debouncing', () => {
    it('debounces onChange calls', () => {
      const handleChange = vi.fn()

      render(
        <TemplateSearchInput
          value=""
          onChange={handleChange}
          debounceMs={300}
        />
      )

      const input = screen.getByRole('searchbox')
      fireEvent.change(input, { target: { value: 'test' } })

      // Should not have called onChange yet
      expect(handleChange).not.toHaveBeenCalled()

      // Fast-forward past debounce time
      vi.advanceTimersByTime(300)

      expect(handleChange).toHaveBeenCalledWith('test')
    })

    it('resets debounce timer on subsequent inputs', () => {
      const handleChange = vi.fn()

      render(
        <TemplateSearchInput
          value=""
          onChange={handleChange}
          debounceMs={300}
        />
      )

      const input = screen.getByRole('searchbox')

      // Type first character
      fireEvent.change(input, { target: { value: 't' } })
      vi.advanceTimersByTime(200)

      // Type second character before debounce completes
      fireEvent.change(input, { target: { value: 'te' } })
      vi.advanceTimersByTime(200)

      // Should not have called onChange yet
      expect(handleChange).not.toHaveBeenCalled()

      // Complete the debounce
      vi.advanceTimersByTime(100)

      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange).toHaveBeenCalledWith('te')
    })

    it('uses custom debounce time', () => {
      const handleChange = vi.fn()

      render(
        <TemplateSearchInput
          value=""
          onChange={handleChange}
          debounceMs={500}
        />
      )

      const input = screen.getByRole('searchbox')
      fireEvent.change(input, { target: { value: 'test' } })

      // At 300ms (default), should not have fired
      vi.advanceTimersByTime(300)
      expect(handleChange).not.toHaveBeenCalled()

      // At 500ms, should fire
      vi.advanceTimersByTime(200)
      expect(handleChange).toHaveBeenCalledWith('test')
    })
  })

  describe('syncing with value prop', () => {
    it('updates local value when prop changes', () => {
      const { rerender } = render(
        <TemplateSearchInput value="initial" onChange={() => {}} />
      )

      expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

      rerender(<TemplateSearchInput value="updated" onChange={() => {}} />)

      expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has type="search" on input', () => {
      render(<TemplateSearchInput value="" onChange={() => {}} />)

      expect(screen.getByRole('searchbox')).toHaveAttribute('type', 'search')
    })

    it('has aria-label on input', () => {
      render(<TemplateSearchInput value="" onChange={() => {}} />)

      expect(screen.getByRole('searchbox')).toHaveAttribute(
        'aria-label',
        'Search templates by name or description'
      )
    })

    it('has aria-label on clear button', () => {
      render(<TemplateSearchInput value="test" onChange={() => {}} />)

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Clear search')
    })

    it('has minimum touch target height', () => {
      render(<TemplateSearchInput value="" onChange={() => {}} />)

      const input = screen.getByRole('searchbox')
      expect(input.className).toContain('min-h-[44px]')
    })
  })

  describe('cleanup', () => {
    it('cleans up timeout on unmount', () => {
      const handleChange = vi.fn()

      const { unmount } = render(
        <TemplateSearchInput
          value=""
          onChange={handleChange}
          debounceMs={300}
        />
      )

      const input = screen.getByRole('searchbox')
      fireEvent.change(input, { target: { value: 'test' } })

      // Unmount before debounce completes
      unmount()

      // Complete the debounce time
      vi.advanceTimersByTime(300)

      // Should not have called onChange because component unmounted
      expect(handleChange).not.toHaveBeenCalled()
    })
  })
})
