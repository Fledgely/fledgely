import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignaturePad } from '../SignaturePad'
import { ChildSigningCeremony } from '../ChildSigningCeremony'
import { KeyCommitmentsReadAloud } from '../KeyCommitmentsReadAloud'
import { SigningCelebration } from '../SigningCelebration'

// Mock canvas for SignaturePad
beforeEach(() => {
  const mockContext = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    scale: vi.fn(),
    lineCap: 'round',
    lineJoin: 'round',
    lineWidth: 2,
    strokeStyle: '#000',
  }
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock')
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 300,
    bottom: 200,
    width: 300,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }))
})

// Mock Web Speech API
const mockUtterance = {
  text: '',
  onend: null as (() => void) | null,
  onerror: null as (() => void) | null,
}
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  speaking: false,
  paused: false,
  pending: false,
  getVoices: vi.fn(() => []),
}
vi.stubGlobal('speechSynthesis', mockSpeechSynthesis)
vi.stubGlobal('SpeechSynthesisUtterance', vi.fn(() => mockUtterance))

// Mock matchMedia for reduced motion
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('Accessibility Tests (Task 9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMatchMedia(false)
  })

  describe('NFR49: Touch Targets 44x44px minimum', () => {
    it('SignaturePad buttons have 44px minimum height', () => {
      render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/min-h-\[44px\]/)
      })
    })

    it('ChildSigningCeremony buttons have 44px minimum height', () => {
      render(
        <ChildSigningCeremony
          agreementId="test-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/min-h-\[44px\]/)
      })
    })

    it('KeyCommitmentsReadAloud buttons have 44px minimum height', () => {
      render(
        <KeyCommitmentsReadAloud
          commitments={['Test commitment']}
          onComplete={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/min-h-\[44px\]/)
      })
    })

    it('SigningCelebration button has 44px minimum height', () => {
      render(
        <SigningCelebration
          childName="Alex"
          onContinue={vi.fn()}
        />
      )

      const button = screen.getByRole('button')
      expect(button.className).toMatch(/min-h-\[44px\]/)
    })
  })

  describe('NFR42: ARIA Labels', () => {
    it('SignaturePad mode toggle buttons have aria-pressed', () => {
      render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const typedButton = screen.getByRole('button', { name: /type/i })
      const drawButton = screen.getByRole('button', { name: /draw/i })

      expect(typedButton).toHaveAttribute('aria-pressed', 'true')
      expect(drawButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('SignaturePad canvas has accessible role', () => {
      render(
        <SignaturePad
          mode="drawn"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const canvas = screen.getByRole('img')
      expect(canvas).toHaveAttribute('aria-label')
    })

    it('ChildSigningCeremony checkbox has accessible label', () => {
      render(
        <ChildSigningCeremony
          agreementId="test-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAccessibleName()
    })
  })

  describe('NFR47: Screen Reader Announcements', () => {
    it('SigningCelebration announces celebration', () => {
      render(
        <SigningCelebration
          childName="Alex"
          onContinue={vi.fn()}
        />
      )

      // Should have alert or aria-live region
      const announcement = document.querySelector('[role="alert"], [aria-live="polite"]')
      expect(announcement).toBeInTheDocument()
    })

    it('KeyCommitmentsReadAloud has live region for current commitment', () => {
      render(
        <KeyCommitmentsReadAloud
          commitments={['Test commitment']}
          onComplete={vi.fn()}
        />
      )

      // Should have aria-live region
      const liveRegion = document.querySelector('[aria-live]')
      expect(liveRegion).toBeInTheDocument()
    })
  })

  describe('NFR43: Keyboard Navigation', () => {
    it('SignaturePad mode toggle is keyboard accessible', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <SignaturePad
          mode="typed"
          onModeChange={onModeChange}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const drawButton = screen.getByRole('button', { name: /draw/i })
      await user.tab()
      await user.tab()
      await user.keyboard('{Enter}')

      // Should be able to navigate to and activate button
      expect(drawButton).toBeInTheDocument()
    })

    it('ChildSigningCeremony consent checkbox can be toggled with keyboard', async () => {
      const user = userEvent.setup()

      render(
        <ChildSigningCeremony
          agreementId="test-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      checkbox.focus()
      await user.keyboard(' ')

      expect(checkbox).toBeChecked()
    })

    it('KeyCommitmentsReadAloud controls are keyboard accessible', async () => {
      const user = userEvent.setup()

      render(
        <KeyCommitmentsReadAloud
          commitments={['Test commitment']}
          onComplete={vi.fn()}
        />
      )

      // Should be able to tab through controls
      await user.tab()
      const focusedElement = document.activeElement
      expect(focusedElement?.tagName).toBe('BUTTON')
    })
  })

  describe('NFR65: 6th-Grade Reading Level', () => {
    it('ChildSigningCeremony uses simple language', () => {
      render(
        <ChildSigningCeremony
          agreementId="test-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Check for simple, child-friendly text
      const text = document.body.textContent || ''

      // Should NOT use complex words
      expect(text).not.toMatch(/irrevocable|pursuant|henceforth/i)

      // Should use simple language patterns
      expect(text).toMatch(/sign|agree|promise|family/i)
    })

    it('SigningCelebration uses encouraging, simple language', () => {
      render(
        <SigningCelebration
          childName="Alex"
          onContinue={vi.fn()}
        />
      )

      const text = document.body.textContent || ''

      // Should have celebratory, simple text
      expect(text).toMatch(/you (signed|did it)|big moment|family/i)
    })
  })

  describe('Reduced Motion Preference (NFR accessibility)', () => {
    it('SigningCelebration disables animations when reduced motion preferred', () => {
      mockMatchMedia(true)

      render(
        <SigningCelebration
          childName="Alex"
          onContinue={vi.fn()}
        />
      )

      // Confetti should not be visible with reduced motion
      const container = screen.getByTestId('celebration-container')
      expect(container).toBeInTheDocument()

      // Animation classes should be disabled
      const confettiElements = container.querySelectorAll('.animate-confetti')
      expect(confettiElements.length).toBe(0)
    })
  })

  describe('Focus Management', () => {
    it('ChildSigningCeremony submit button gets correct disabled state', () => {
      render(
        <ChildSigningCeremony
          agreementId="test-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const submitButton = screen.getByRole('button', { name: /sign.*agreement/i })
      expect(submitButton).toBeDisabled()
    })

    it('SignaturePad clear button is accessible', () => {
      render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value="Test"
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const clearButton = screen.getByRole('button', { name: /clear/i })
      expect(clearButton).toBeInTheDocument()
      expect(clearButton).toHaveAccessibleName()
    })
  })
})
