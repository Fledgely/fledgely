import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, render, screen } from '@testing-library/react'
import { useStepAnnouncer } from '../useStepAnnouncer'

describe('useStepAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('announceStep', () => {
    it('formats step announcement correctly', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceStep(1, 3, 'Review your commitments')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.announcement).toBe('Step 1 of 3: Review your commitments')
    })

    it('sets polite level for step announcements', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceStep(2, 3, 'Add your signature')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.level).toBe('polite')
    })
  })

  describe('announceMessage', () => {
    it('sets custom message', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceMessage('Signature mode changed to type your name')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.announcement).toBe('Signature mode changed to type your name')
    })

    it('allows custom level', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceMessage('Important update', 'assertive')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.level).toBe('assertive')
    })
  })

  describe('announceCompletion', () => {
    it('sets completion message with polite level', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceCompletion('Agreement signed successfully!')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.announcement).toBe('Agreement signed successfully!')
      expect(result.current.level).toBe('polite')
    })
  })

  describe('announceError', () => {
    it('sets error message with assertive level', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceError('Failed to save signature')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.announcement).toBe('Failed to save signature')
      expect(result.current.level).toBe('assertive')
    })
  })

  describe('clearAnnouncement', () => {
    it('clears the current announcement', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceMessage('Test message')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.announcement).toBe('Test message')

      act(() => {
        result.current.clearAnnouncement()
      })

      expect(result.current.announcement).toBe('')
    })
  })

  describe('auto-clear', () => {
    it('clears announcement after specified time', async () => {
      const { result } = renderHook(() => useStepAnnouncer({ clearAfterMs: 1000 }))

      await act(async () => {
        result.current.announceMessage('Temporary message')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.announcement).toBe('Temporary message')

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.announcement).toBe('')
    })

    it('does not auto-clear when clearAfterMs is 0', async () => {
      const { result } = renderHook(() => useStepAnnouncer({ clearAfterMs: 0 }))

      await act(async () => {
        result.current.announceMessage('Persistent message')
        vi.advanceTimersByTime(100)
      })

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.announcement).toBe('Persistent message')
    })
  })

  describe('AnnouncerRegion component', () => {
    it('renders polite aria-live region', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceMessage('Polite message', 'polite')
        vi.advanceTimersByTime(100)
      })

      const { container } = render(<result.current.AnnouncerRegion />)

      const politeRegion = container.querySelector('[aria-live="polite"]')
      expect(politeRegion).toBeInTheDocument()
      expect(politeRegion).toHaveTextContent('Polite message')
    })

    it('renders assertive aria-live region for errors', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      await act(async () => {
        result.current.announceError('Error message')
        vi.advanceTimersByTime(100)
      })

      const { container } = render(<result.current.AnnouncerRegion />)

      const assertiveRegion = container.querySelector('[aria-live="assertive"]')
      expect(assertiveRegion).toBeInTheDocument()
      expect(assertiveRegion).toHaveTextContent('Error message')
    })

    it('has sr-only class for screen reader only visibility', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      const { container } = render(<result.current.AnnouncerRegion />)

      const regions = container.querySelectorAll('.sr-only')
      expect(regions.length).toBeGreaterThanOrEqual(2)
    })

    it('uses role="status" for polite region', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      const { container } = render(<result.current.AnnouncerRegion />)

      const statusRegion = container.querySelector('[role="status"]')
      expect(statusRegion).toBeInTheDocument()
    })

    it('uses role="alert" for assertive region', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      const { container } = render(<result.current.AnnouncerRegion />)

      const alertRegion = container.querySelector('[role="alert"]')
      expect(alertRegion).toBeInTheDocument()
    })
  })

  describe('re-announcement', () => {
    it('forces re-announcement by briefly clearing', async () => {
      const { result } = renderHook(() => useStepAnnouncer())

      // First announcement
      await act(async () => {
        result.current.announceStep(1, 3, 'First step')
        vi.advanceTimersByTime(100)
      })

      expect(result.current.announcement).toBe('Step 1 of 3: First step')

      // Same step again (re-announce)
      await act(async () => {
        result.current.announceStep(1, 3, 'First step')
      })

      // Should briefly clear
      expect(result.current.announcement).toBe('')

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Then restore
      expect(result.current.announcement).toBe('Step 1 of 3: First step')
    })
  })
})
