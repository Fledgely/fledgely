/**
 * Tests for ChildSigningCeremony component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC1, AC2, AC3, AC4, AC5, AC6, AC7
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChildSigningCeremony } from '../ChildSigningCeremony'
import type { AgreementTerm, AgreementSigning } from '@fledgely/shared/contracts'

const createTerm = (overrides: Partial<AgreementTerm> = {}): AgreementTerm => ({
  id: 'term-1',
  text: 'No phones at dinner',
  category: 'time',
  party: 'parent',
  order: 0,
  explanation: 'Family time is important',
  createdAt: new Date('2024-01-15T10:00:00'),
  updatedAt: new Date('2024-01-15T10:00:00'),
  ...overrides,
})

const createSigningState = (overrides: Partial<AgreementSigning> = {}): AgreementSigning => ({
  id: 'signing-1',
  sessionId: 'session-1',
  familyId: 'family-1',
  childId: 'child-1',
  status: 'pending',
  childSignature: null,
  parentSignatures: [],
  requiresBothParents: false,
  startedAt: new Date('2024-01-15T10:00:00'),
  completedAt: null,
  agreementVersion: 'v1.0',
  ...overrides,
})

const mockTerms: AgreementTerm[] = [
  createTerm({ id: 'term-1', text: 'No phones at dinner' }),
  createTerm({ id: 'term-2', text: 'Homework before games' }),
  createTerm({ id: 'term-3', text: 'Screen time limit: 2 hours' }),
]

describe('ChildSigningCeremony', () => {
  const defaultProps = {
    childName: 'Alex',
    agreementTitle: 'Our Family Rules',
    keyTerms: mockTerms,
    signingState: createSigningState(),
    onSign: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the signing ceremony', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('child-signing-ceremony')).toBeInTheDocument()
    })

    it('should display child name in greeting', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/Ready to Sign, Alex\?/)).toBeInTheDocument()
    })

    it('should display agreement title', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/Our Family Rules/)).toBeInTheDocument()
    })

    it('should have main landmark', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByRole('main', { name: /signing ceremony/i })).toBeInTheDocument()
    })
  })

  describe('commitments step (AC1)', () => {
    it('should show commitments step initially', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('commitments-step')).toBeInTheDocument()
    })

    it('should display key terms', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByText('No phones at dinner')).toBeInTheDocument()
      expect(screen.getByText('Homework before games')).toBeInTheDocument()
    })

    it('should have proceed button', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('proceed-to-signature-button')).toBeInTheDocument()
    })

    it('should transition to signature step when proceeding', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('signature-step')).toBeInTheDocument()
    })
  })

  describe('signature step (AC2)', () => {
    it('should show signature method tabs', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('typed-signature-tab')).toBeInTheDocument()
      expect(screen.getByTestId('drawn-signature-tab')).toBeInTheDocument()
    })

    it('should default to typed signature', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('typed-signature-tab')).toHaveAttribute('aria-selected', 'true')
    })

    it('should switch to drawn signature when tab clicked', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      fireEvent.click(screen.getByTestId('drawn-signature-tab'))

      expect(screen.getByTestId('drawn-signature-tab')).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('drawn-signature')).toBeInTheDocument()
    })

    it('should show typed signature component', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('typed-signature')).toBeInTheDocument()
    })
  })

  describe('consent checkbox (AC3)', () => {
    it('should show consent checkbox in signature step', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('consent-checkbox')).toBeInTheDocument()
    })

    it('should require consent before submit', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      // Type name but don't check consent
      fireEvent.change(screen.getByTestId('typed-signature-input'), {
        target: { value: 'Alex' },
      })

      expect(screen.getByTestId('submit-signature-button')).toBeDisabled()
    })
  })

  describe('signature submission (AC5)', () => {
    it('should enable submit when signature and consent provided', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      // Type name and check consent
      fireEvent.change(screen.getByTestId('typed-signature-input'), {
        target: { value: 'Alex' },
      })
      fireEvent.click(screen.getByTestId('consent-checkbox-input'))

      expect(screen.getByTestId('submit-signature-button')).not.toBeDisabled()
    })

    it('should call onSign with typed signature data', () => {
      const onSign = vi.fn()
      render(<ChildSigningCeremony {...defaultProps} onSign={onSign} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      fireEvent.change(screen.getByTestId('typed-signature-input'), {
        target: { value: 'Alex' },
      })
      fireEvent.click(screen.getByTestId('consent-checkbox-input'))
      fireEvent.click(screen.getByTestId('submit-signature-button'))

      expect(onSign).toHaveBeenCalledWith({
        method: 'typed',
        name: 'Alex',
        imageData: null,
        acknowledged: true,
      })
    })

    it('should show confirmation after submission', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      fireEvent.change(screen.getByTestId('typed-signature-input'), {
        target: { value: 'Alex' },
      })
      fireEvent.click(screen.getByTestId('consent-checkbox-input'))
      fireEvent.click(screen.getByTestId('submit-signature-button'))

      expect(screen.getByTestId('signature-confirmation')).toBeInTheDocument()
    })
  })

  describe('parent-first prevention (AC7)', () => {
    it('should show warning if parent signed first', () => {
      const signingState = createSigningState({
        parentSignatures: [
          {
            id: 'sig-1',
            party: 'parent',
            method: 'typed',
            name: 'Mom',
            imageData: null,
            signerId: 'parent-1',
            signerName: 'Mom',
            signedAt: new Date(),
            acknowledged: true,
          },
        ],
      })
      render(<ChildSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByTestId('parent-signed-first-warning')).toBeInTheDocument()
    })

    it('should display explanation about child-first signing', () => {
      const signingState = createSigningState({
        parentSignatures: [
          {
            id: 'sig-1',
            party: 'parent',
            method: 'typed',
            name: 'Mom',
            imageData: null,
            signerId: 'parent-1',
            signerName: 'Mom',
            signedAt: new Date(),
            acknowledged: true,
          },
        ],
      })
      render(<ChildSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByText(/children sign first/i)).toBeInTheDocument()
    })
  })

  describe('already signed', () => {
    it('should show confirmation if child already signed', () => {
      const signingState = createSigningState({
        childSignature: {
          id: 'sig-1',
          party: 'child',
          method: 'typed',
          name: 'Alex',
          imageData: null,
          signerId: 'child-1',
          signerName: 'Alex',
          signedAt: new Date(),
          acknowledged: true,
        },
      })
      render(<ChildSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByTestId('signature-confirmation')).toBeInTheDocument()
    })
  })

  describe('progress indicator', () => {
    it('should show progress steps', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByText('Review')).toBeInTheDocument()
      expect(screen.getByText('Sign')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('should highlight current step', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      // First step number should have current indicator styling
      const stepOne = screen.getByLabelText(/Step 1: Review \(current\)/)
      expect(stepOne).toHaveClass('bg-indigo-600')
    })

    it('should provide accessible step labels', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByLabelText(/Step 1: Review \(current\)/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Step 2: Sign/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Step 3: Done/)).toBeInTheDocument()
    })
  })

  describe('submitting state', () => {
    it('should show loading text when submitting', () => {
      render(<ChildSigningCeremony {...defaultProps} isSubmitting />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('submit-signature-button')).toHaveTextContent('Signing...')
    })

    it('should disable inputs when submitting', () => {
      render(<ChildSigningCeremony {...defaultProps} isSubmitting />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('typed-signature-input')).toBeDisabled()
      expect(screen.getByTestId('consent-checkbox-input')).toBeDisabled()
    })
  })

  describe('accessibility (AC4)', () => {
    it('should have keyboard-accessible signature method tabs', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      const typedTab = screen.getByTestId('typed-signature-tab')
      expect(typedTab).toHaveAttribute('role', 'tab')
    })

    it('should have 44px minimum touch targets on buttons', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('proceed-to-signature-button')).toHaveClass('min-h-[44px]')
    })

    // Story 6.7 - Signature Accessibility tests
    it('should have step announcement live region', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      const announcement = screen.getByTestId('step-announcement')
      expect(announcement).toHaveAttribute('aria-live', 'polite')
      expect(announcement).toHaveAttribute('aria-atomic', 'true')
    })

    it('should announce step changes', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      const announcement = screen.getByTestId('step-announcement')
      expect(announcement).toHaveTextContent('Step 1 of 3')

      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(announcement).toHaveTextContent('Step 2 of 3')
    })

    it('should have focusable headings with tabIndex=-1', () => {
      render(<ChildSigningCeremony {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveAttribute('tabIndex', '-1')
    })

    it('should have validation message with role alert', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      const validationMessage = screen.getByTestId('validation-message')
      expect(validationMessage).toHaveAttribute('role', 'alert')
    })

    it('should connect validation error to submit button via aria-describedby', () => {
      render(<ChildSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      const submitButton = screen.getByTestId('submit-signature-button')
      expect(submitButton).toHaveAttribute('aria-describedby', 'signature-validation-error')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ChildSigningCeremony {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('child-signing-ceremony')).toHaveClass('custom-class')
    })
  })
})
