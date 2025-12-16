import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentSigningCeremony } from '../ParentSigningCeremony'

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

describe('ParentSigningCeremony', () => {
  const defaultProps = {
    agreementId: 'agreement-123',
    parentName: 'John Smith',
    childCommitments: [
      'I will limit screen time to 2 hours on school days',
      'I will do my homework before playing games',
    ],
    parentCommitments: [
      'I will respect your privacy within these guidelines',
      'I will discuss any concerns before making changes',
    ],
    onComplete: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering (AC: 1, 2)', () => {
    it('displays parent signing ceremony screen', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByRole('heading', { name: /sign.*family agreement/i })).toBeInTheDocument()
    })

    it('shows child commitments for transparency (AC: 2)', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByRole('heading', { name: /child will agree/i })).toBeInTheDocument()
      expect(screen.getByText(/limit screen time/i)).toBeInTheDocument()
      expect(screen.getByText(/homework before playing/i)).toBeInTheDocument()
    })

    it('shows parent commitments separately (AC: 4)', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/your.*commitment/i)).toBeInTheDocument()
      expect(screen.getByText(/respect your privacy/i)).toBeInTheDocument()
      expect(screen.getByText(/discuss any concerns/i)).toBeInTheDocument()
    })
  })

  describe('Signature Input (AC: 3)', () => {
    it('integrates SignaturePad component', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('signature-pad')).toBeInTheDocument()
    })

    it('allows typing name as signature', async () => {
      const user = userEvent.setup()
      render(<ParentSigningCeremony {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /signature/i })
      await user.type(input, 'John Smith')

      expect(input).toHaveValue('John Smith')
    })

    it('allows switching to drawn signature mode', async () => {
      const user = userEvent.setup()
      render(<ParentSigningCeremony {...defaultProps} />)

      const drawButton = screen.getByRole('button', { name: /draw/i })
      await user.click(drawButton)

      expect(screen.getByRole('img', { name: /signature canvas/i })).toBeInTheDocument()
    })
  })

  describe('Consent Checkbox (AC: 4)', () => {
    it('displays commitment acknowledgment checkbox', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(screen.getByText(/I commit to this agreement/i)).toBeInTheDocument()
    })

    it('checkbox starts unchecked', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('can toggle checkbox', async () => {
      const user = userEvent.setup()
      render(<ParentSigningCeremony {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      expect(checkbox).toBeChecked()
    })
  })

  describe('Submit Button State', () => {
    it('submit button is disabled initially', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /sign.*agreement/i })
      expect(submitButton).toBeDisabled()
    })

    it('submit button is disabled with only checkbox checked', async () => {
      const user = userEvent.setup()
      render(<ParentSigningCeremony {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const submitButton = screen.getByRole('button', { name: /sign.*agreement/i })
      expect(submitButton).toBeDisabled()
    })

    it('submit button is disabled with only signature provided', async () => {
      const user = userEvent.setup()
      render(<ParentSigningCeremony {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /signature/i })
      await user.type(input, 'John Smith')

      const submitButton = screen.getByRole('button', { name: /sign.*agreement/i })
      expect(submitButton).toBeDisabled()
    })

    it('submit button is enabled when checkbox checked AND signature provided', async () => {
      const user = userEvent.setup()
      render(<ParentSigningCeremony {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const input = screen.getByRole('textbox', { name: /signature/i })
      await user.type(input, 'John Smith')

      const submitButton = screen.getByRole('button', { name: /sign.*agreement/i })
      expect(submitButton).toBeEnabled()
    })
  })

  describe('Form Submission (AC: 5)', () => {
    it('calls onComplete with signature data when submitted', async () => {
      const user = userEvent.setup()
      const onComplete = vi.fn()
      render(<ParentSigningCeremony {...defaultProps} onComplete={onComplete} />)

      // Check checkbox
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      // Type signature
      const input = screen.getByRole('textbox', { name: /signature/i })
      await user.type(input, 'John Smith')

      // Submit
      const submitButton = screen.getByRole('button', { name: /sign.*agreement/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            agreementId: 'agreement-123',
            signature: expect.objectContaining({
              type: 'typed',
              value: 'John Smith',
              signedBy: 'parent',
            }),
            consentCheckboxChecked: true,
            commitmentsReviewed: true,
          })
        )
      })
    })
  })

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup()
      const onBack = vi.fn()
      render(<ParentSigningCeremony {...defaultProps} onBack={onBack} />)

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(onBack).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(<ParentSigningCeremony {...defaultProps} isLoading={true} />)

      const submitButton = screen.getByRole('button', { name: /signing/i })
      expect(submitButton).toBeDisabled()
    })

    it('disables form inputs when loading', () => {
      render(<ParentSigningCeremony {...defaultProps} isLoading={true} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })
  })

  describe('Accessibility (NFR42, NFR49)', () => {
    it('all buttons have 44px minimum height', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/min-h-\[44px\]/)
      })
    })

    it('checkbox has accessible label', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAccessibleName()
    })

    it('form has proper structure for screen readers', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      // Should have headings for sections
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })
  })
})
