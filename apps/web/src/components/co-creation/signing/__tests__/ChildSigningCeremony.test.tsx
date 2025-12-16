import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChildSigningCeremony } from '../ChildSigningCeremony'
import type { SessionTerm } from '@fledgely/contracts'

// Mock canvas for SignaturePad
const mockContext = {
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 3,
  strokeStyle: '',
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
}

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockImageData')
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    value: () => ({
      left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200, x: 0, y: 0, toJSON: () => ({})
    }),
    writable: true
  })
})

// Sample terms for testing
const sampleTerms: SessionTerm[] = [
  {
    id: 'term-1',
    type: 'screen_time',
    status: 'accepted',
    title: 'Screen Time',
    content: 'I will have 2 hours of screen time each day',
    addedBy: 'parent',
    addedAt: '2025-12-16T10:00:00.000Z',
    category: 'screen_time',
    priority: 'high',
  },
  {
    id: 'term-2',
    type: 'bedtime',
    status: 'accepted',
    title: 'Bedtime',
    content: 'I will go to bed by 9pm on school nights',
    addedBy: 'child',
    addedAt: '2025-12-16T10:00:00.000Z',
    category: 'safety',
    priority: 'medium',
  },
]

describe('ChildSigningCeremony', () => {
  const defaultProps = {
    agreementId: '123e4567-e89b-12d3-a456-426614174000',
    childName: 'Alex',
    terms: sampleTerms,
    onComplete: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Ceremony Introduction (Task 3.2)', () => {
    it('displays child-friendly introduction message', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // Should have welcoming, encouraging text
      expect(screen.getByText(/time to sign/i)).toBeInTheDocument()
    })

    it('addresses child by name', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/Alex/i)).toBeInTheDocument()
    })

    it('uses 6th-grade reading level language (NFR65)', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // Should not contain complex words
      const container = screen.getByTestId('signing-ceremony')
      const text = container.textContent || ''

      // Check for absence of complex vocabulary
      expect(text.toLowerCase()).not.toContain('subsequently')
      expect(text.toLowerCase()).not.toContain('furthermore')
      expect(text.toLowerCase()).not.toContain('pursuant')
    })
  })

  describe('Key Commitments Display (Task 3.3)', () => {
    it('shows agreement summary before signing', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // Should display key terms - may appear multiple times
      const screenTimeElements = screen.getAllByText(/screen time/i)
      expect(screenTimeElements.length).toBeGreaterThanOrEqual(1)

      const bedtimeElements = screen.getAllByText(/bedtime/i)
      expect(bedtimeElements.length).toBeGreaterThanOrEqual(1)
    })

    it('displays commitments in simple language', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // Should show term content
      expect(screen.getByText(/2 hours/i)).toBeInTheDocument()
    })
  })

  describe('Consent Checkbox (Task 3.4)', () => {
    it('renders consent checkbox', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('has child-friendly consent label', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/I understand and agree/i)).toBeInTheDocument()
    })

    it('checkbox is unchecked by default', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('can be checked by clicking', async () => {
      const user = userEvent.setup()
      render(<ChildSigningCeremony {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      expect(checkbox).toBeChecked()
    })
  })

  describe('SignaturePad Integration (Task 3.5)', () => {
    it('renders SignaturePad component', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // SignaturePad should be present
      expect(screen.getByTestId('signature-pad')).toBeInTheDocument()
    })

    it('passes child name to SignaturePad', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // Placeholder should contain child name
      const input = screen.getByRole('textbox')
      expect(input.getAttribute('placeholder')).toContain('Alex')
    })
  })

  describe('Submit Button (Task 3.6)', () => {
    it('renders submit button', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByRole('button', { name: /sign the agreement/i })).toBeInTheDocument()
    })

    it('submit button is disabled when checkbox unchecked', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /sign the agreement/i })
      expect(submitButton).toBeDisabled()
    })

    it('submit button is disabled when signature is empty', async () => {
      const user = userEvent.setup()
      render(<ChildSigningCeremony {...defaultProps} />)

      // Check the checkbox but don't provide signature
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const submitButton = screen.getByRole('button', { name: /sign the agreement/i })
      expect(submitButton).toBeDisabled()
    })

    it('submit button is enabled when checkbox checked and signature provided', async () => {
      const user = userEvent.setup()
      render(<ChildSigningCeremony {...defaultProps} />)

      // Check the checkbox
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      // Provide signature
      const input = screen.getByRole('textbox')
      await user.type(input, 'Alex Smith')

      const submitButton = screen.getByRole('button', { name: /sign the agreement/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('calls onComplete when submitted', async () => {
      const user = userEvent.setup()
      render(<ChildSigningCeremony {...defaultProps} />)

      // Check checkbox and provide signature
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Alex Smith')

      const submitButton = screen.getByRole('button', { name: /sign the agreement/i })
      await user.click(submitButton)

      expect(defaultProps.onComplete).toHaveBeenCalled()
    })
  })

  describe('Back Navigation', () => {
    it('renders back button', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('calls onBack when back button clicked', async () => {
      const user = userEvent.setup()
      render(<ChildSigningCeremony {...defaultProps} />)

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(defaultProps.onBack).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // Should have a main heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('form elements have labels', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // Checkbox should have associated label
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAccessibleName()
    })

    it('has 44x44px minimum touch targets (NFR49)', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /sign the agreement/i })
      expect(submitButton.className).toContain('min-h-[44px]')
    })
  })

  describe('Loading State', () => {
    it('shows loading state when submitting', async () => {
      const user = userEvent.setup()
      const onComplete = vi.fn(() => new Promise(() => {})) // Never resolves
      render(<ChildSigningCeremony {...defaultProps} onComplete={onComplete} />)

      // Check checkbox and provide signature
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Alex Smith')

      const submitButton = screen.getByRole('button', { name: /sign the agreement/i })
      await user.click(submitButton)

      // Button should show loading state
      expect(submitButton).toBeDisabled()
    })
  })
})
