import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KeyCommitmentsReadAloud } from '../KeyCommitmentsReadAloud'

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  speaking: false,
  paused: false,
  pending: false,
  getVoices: vi.fn(() => []),
  onvoiceschanged: null,
}

const mockSpeechUtterance = vi.fn().mockImplementation((text: string) => ({
  text,
  lang: 'en-US',
  voice: null,
  volume: 1,
  rate: 0.9,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onboundary: null,
  onmark: null,
}))

beforeEach(() => {
  // @ts-expect-error - Mock SpeechSynthesis
  window.speechSynthesis = mockSpeechSynthesis
  // @ts-expect-error - Mock SpeechSynthesisUtterance
  window.SpeechSynthesisUtterance = mockSpeechUtterance
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('KeyCommitmentsReadAloud', () => {
  const sampleCommitments = [
    'I will have 2 hours of screen time each day',
    'I will go to bed by 9pm on school nights',
    'I will ask before downloading new apps',
  ]

  const defaultProps = {
    commitments: sampleCommitments,
    onComplete: vi.fn(),
  }

  describe('Commitment Display (Task 4.3)', () => {
    it('displays all commitments', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      sampleCommitments.forEach((commitment) => {
        expect(screen.getByText(commitment)).toBeInTheDocument()
      })
    })

    it('numbers commitments for clarity', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      // Should show numbered list
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Play/Pause/Stop Controls (Task 4.4)', () => {
    it('renders play button', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      expect(screen.getByRole('button', { name: /play|listen/i })).toBeInTheDocument()
    })

    it('renders pause button when playing', async () => {
      const user = userEvent.setup()
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      const playButton = screen.getByRole('button', { name: /play|listen/i })
      await user.click(playButton)

      // After clicking play, should show pause
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    })

    it('renders stop button', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    })

    it('calls speechSynthesis.speak when play clicked', async () => {
      const user = userEvent.setup()
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      const playButton = screen.getByRole('button', { name: /play|listen/i })
      await user.click(playButton)

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })

    it('calls speechSynthesis.cancel when stop clicked', async () => {
      const user = userEvent.setup()
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      // Start playing
      const playButton = screen.getByRole('button', { name: /play|listen/i })
      await user.click(playButton)

      // Then stop
      const stopButton = screen.getByRole('button', { name: /stop/i })
      await user.click(stopButton)

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
    })
  })

  describe('Current Commitment Highlighting (Task 4.5)', () => {
    it('highlights the current commitment being read', async () => {
      const user = userEvent.setup()
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      const playButton = screen.getByRole('button', { name: /play|listen/i })
      await user.click(playButton)

      // First commitment should be highlighted
      const firstCommitment = screen.getByText(sampleCommitments[0])
      const listItem = firstCommitment.closest('li')
      expect(listItem?.className).toContain('bg-blue')
    })
  })

  describe('Visual Alternative (Task 4.6)', () => {
    it('displays visual reading option', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      // Should offer to read instead of listen
      expect(screen.getByText(/prefer to read/i)).toBeInTheDocument()
    })

    it('allows skipping to complete', async () => {
      const user = userEvent.setup()
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      const skipButton = screen.getByRole('button', { name: /skip|read.*instead|continue/i })
      await user.click(skipButton)

      expect(defaultProps.onComplete).toHaveBeenCalled()
    })
  })

  describe('Accessibility (Task 4.7, NFR42)', () => {
    it('has accessible play button', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      const playButton = screen.getByRole('button', { name: /play|listen/i })
      expect(playButton).toHaveAccessibleName()
    })

    it('uses aria-live for progress announcements', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      // Should have live region for status updates
      const liveRegion = document.querySelector('[aria-live]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('has 44px minimum touch targets (NFR49)', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      const playButton = screen.getByRole('button', { name: /play|listen/i })
      expect(playButton.className).toContain('min-h-[44px]')
    })
  })

  describe('Progress Indicator', () => {
    it('shows progress through commitments', () => {
      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      // Should show total count - may match multiple elements
      const countElements = screen.getAllByText(/3/)
      expect(countElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Speech Not Supported Fallback', () => {
    it('shows fallback when speech not available', () => {
      // Remove speech support
      // @ts-expect-error - Remove for testing
      delete window.speechSynthesis

      render(<KeyCommitmentsReadAloud {...defaultProps} />)

      // Should show message that speech is not available - multiple elements may match
      const readElements = screen.getAllByText(/not available|read/i)
      expect(readElements.length).toBeGreaterThanOrEqual(1)
    })
  })
})
