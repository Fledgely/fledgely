/**
 * Tests for ParentSigningCeremony component.
 *
 * Story 6.2: Parent Digital Signature - AC1, AC2, AC3, AC4, AC5, AC6, AC7
 * Story 6.3: Agreement Activation - AC1, AC4
 * Story 6.4: Signing Ceremony Celebration - Integration
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { ParentSigningCeremony } from '../ParentSigningCeremony'
import type { AgreementTerm, AgreementSigning } from '@fledgely/shared/contracts'

// Store original matchMedia
const originalMatchMedia = window.matchMedia

// Mock matchMedia for reduced motion detection in CelebrationScreen
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: originalMatchMedia,
  })
})

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

const mockParentTerms: AgreementTerm[] = [
  createTerm({ id: 'parent-1', text: 'I will respect privacy boundaries', party: 'parent' }),
  createTerm({ id: 'parent-2', text: 'I will discuss concerns before acting', party: 'parent' }),
]

const mockChildSignature = {
  id: 'sig-1',
  party: 'child' as const,
  method: 'typed' as const,
  name: 'Alex',
  imageData: null,
  signerId: 'child-1',
  signerName: 'Alex',
  signedAt: new Date('2024-01-15T11:00:00'),
  acknowledged: true,
}

describe('ParentSigningCeremony', () => {
  const defaultProps = {
    parentName: 'Mom',
    parentUid: 'parent-1',
    childName: 'Alex',
    agreementTitle: 'Our Family Rules',
    keyTerms: mockTerms,
    parentTerms: mockParentTerms,
    signingState: createSigningState({ childSignature: mockChildSignature }),
    onSign: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the signing ceremony when child has signed', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('parent-signing-ceremony')).toBeInTheDocument()
    })

    it('should display parent name in greeting', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/Review & Sign, Mom/)).toBeInTheDocument()
    })

    it('should display agreement title', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/Our Family Rules/)).toBeInTheDocument()
    })

    it('should have main landmark', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByRole('main', { name: /parent signing ceremony/i })).toBeInTheDocument()
    })
  })

  describe('waiting for child signature (AC1)', () => {
    it('should show waiting message if child has not signed', () => {
      const signingState = createSigningState({ childSignature: null })
      render(<ParentSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByTestId('waiting-for-child')).toBeInTheDocument()
    })

    it('should display child name in waiting message', () => {
      const signingState = createSigningState({ childSignature: null })
      render(<ParentSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByText(/Waiting for Alex/)).toBeInTheDocument()
    })

    it('should explain child-first signing order', () => {
      const signingState = createSigningState({ childSignature: null })
      render(<ParentSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByText(/children sign first/i)).toBeInTheDocument()
    })
  })

  describe('child signature display (AC2)', () => {
    it('should show child signature summary', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('child-signature-summary')).toBeInTheDocument()
    })

    it('should display child name in signature summary', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/Alex's Signature/)).toBeInTheDocument()
    })

    it('should show signature date', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByText(/Signed on/)).toBeInTheDocument()
    })
  })

  describe('parent commitments display (AC4)', () => {
    it('should display parent commitments section', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('parent-commitments')).toBeInTheDocument()
    })

    it('should show parent-specific terms', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByText('I will respect privacy boundaries')).toBeInTheDocument()
      expect(screen.getByText('I will discuss concerns before acting')).toBeInTheDocument()
    })

    it('should have distinct styling for parent commitments', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      const commitments = screen.getByTestId('parent-commitments')
      expect(commitments.querySelector('.bg-indigo-50')).toBeInTheDocument()
    })
  })

  describe('review step', () => {
    it('should show review step initially', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('review-step')).toBeInTheDocument()
    })

    it('should display key terms', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByText('No phones at dinner')).toBeInTheDocument()
      expect(screen.getByText('Homework before games')).toBeInTheDocument()
    })

    it('should have proceed button', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('proceed-to-signature-button')).toBeInTheDocument()
    })

    it('should transition to signature step when proceeding', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('signature-step')).toBeInTheDocument()
    })
  })

  describe('signature step (AC3)', () => {
    it('should show signature method tabs', () => {
      render(<ParentSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('typed-signature-tab')).toBeInTheDocument()
      expect(screen.getByTestId('drawn-signature-tab')).toBeInTheDocument()
    })

    it('should default to typed signature', () => {
      render(<ParentSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('typed-signature-tab')).toHaveAttribute('aria-selected', 'true')
    })

    it('should switch to drawn signature when tab clicked', () => {
      render(<ParentSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      fireEvent.click(screen.getByTestId('drawn-signature-tab'))

      expect(screen.getByTestId('drawn-signature-tab')).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('drawn-signature')).toBeInTheDocument()
    })

    it('should use parent-specific consent label', () => {
      render(<ParentSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByText(/I commit to upholding my part/)).toBeInTheDocument()
    })
  })

  describe('signature submission (AC6)', () => {
    it('should enable submit when signature and consent provided', () => {
      render(<ParentSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      fireEvent.change(screen.getByTestId('typed-signature-input'), {
        target: { value: 'Mom' },
      })
      fireEvent.click(screen.getByTestId('consent-checkbox-input'))

      expect(screen.getByTestId('submit-signature-button')).not.toBeDisabled()
    })

    it('should call onSign with typed signature data', () => {
      const onSign = vi.fn()
      render(<ParentSigningCeremony {...defaultProps} onSign={onSign} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      fireEvent.change(screen.getByTestId('typed-signature-input'), {
        target: { value: 'Mom' },
      })
      fireEvent.click(screen.getByTestId('consent-checkbox-input'))
      fireEvent.click(screen.getByTestId('submit-signature-button'))

      expect(onSign).toHaveBeenCalledWith({
        method: 'typed',
        name: 'Mom',
        imageData: null,
        acknowledged: true,
      })
    })

    it('should show drawn signature canvas when method is drawn', () => {
      render(<ParentSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))
      fireEvent.click(screen.getByTestId('drawn-signature-tab'))

      // Verify canvas is rendered (actual drawing tested in DrawnSignature.test.tsx)
      expect(screen.getByTestId('signature-canvas')).toBeInTheDocument()
      expect(screen.getByTestId('drawn-signature')).toBeInTheDocument()
    })

    it('should show confirmation after submission', () => {
      render(<ParentSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      fireEvent.change(screen.getByTestId('typed-signature-input'), {
        target: { value: 'Mom' },
      })
      fireEvent.click(screen.getByTestId('consent-checkbox-input'))
      fireEvent.click(screen.getByTestId('submit-signature-button'))

      expect(screen.getByTestId('signature-confirmation')).toBeInTheDocument()
    })
  })

  describe('shared custody support (AC5)', () => {
    it('should show waiting message when requiresBothParents and one has signed', () => {
      const signingState = createSigningState({
        childSignature: mockChildSignature,
        requiresBothParents: true,
        parentSignatures: [
          {
            id: 'sig-2',
            party: 'parent',
            method: 'typed',
            name: 'Mom',
            imageData: null,
            signerId: 'parent-1', // Same as parentUid
            signerName: 'Mom',
            signedAt: new Date(),
            acknowledged: true,
          },
        ],
      })
      render(<ParentSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByTestId('waiting-for-second-parent')).toBeInTheDocument()
    })

    it('should display other parent signature when exists', () => {
      const signingState = createSigningState({
        childSignature: mockChildSignature,
        requiresBothParents: true,
        parentSignatures: [
          {
            id: 'sig-2',
            party: 'parent',
            method: 'typed',
            name: 'Dad',
            imageData: null,
            signerId: 'parent-2', // Different from parentUid
            signerName: 'Dad',
            signedAt: new Date(),
            acknowledged: true,
          },
        ],
      })
      render(<ParentSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByTestId('other-parent-signature')).toBeInTheDocument()
      expect(screen.getByText(/Dad has already signed/)).toBeInTheDocument()
    })
  })

  describe('already signed', () => {
    it('should show confirmation if parent already signed (sole custody)', () => {
      const signingState = createSigningState({
        childSignature: mockChildSignature,
        parentSignatures: [
          {
            id: 'sig-2',
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
      render(<ParentSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByTestId('signature-confirmation')).toBeInTheDocument()
    })
  })

  describe('signing completion (AC7)', () => {
    it('should show confirmation when all signatures complete', () => {
      const signingState = createSigningState({
        childSignature: mockChildSignature,
        status: 'complete',
        parentSignatures: [
          {
            id: 'sig-2',
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
      render(<ParentSigningCeremony {...defaultProps} signingState={signingState} />)

      expect(screen.getByTestId('signature-confirmation')).toBeInTheDocument()
    })
  })

  describe('progress indicator', () => {
    it('should show progress steps', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByText('Review')).toBeInTheDocument()
      expect(screen.getByText('Sign')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('should provide accessible step labels', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByLabelText(/Step 1: Review \(current\)/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Step 2: Sign/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Step 3: Done/)).toBeInTheDocument()
    })
  })

  describe('submitting state', () => {
    it('should show loading text when submitting', () => {
      render(<ParentSigningCeremony {...defaultProps} isSubmitting />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('submit-signature-button')).toHaveTextContent('Signing...')
    })

    it('should disable inputs when submitting', () => {
      render(<ParentSigningCeremony {...defaultProps} isSubmitting />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      expect(screen.getByTestId('typed-signature-input')).toBeDisabled()
      expect(screen.getByTestId('consent-checkbox-input')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('should have keyboard-accessible signature method tabs', () => {
      render(<ParentSigningCeremony {...defaultProps} />)
      fireEvent.click(screen.getByTestId('proceed-to-signature-button'))

      const typedTab = screen.getByTestId('typed-signature-tab')
      expect(typedTab).toHaveAttribute('role', 'tab')
    })

    it('should have 44px minimum touch targets on buttons', () => {
      render(<ParentSigningCeremony {...defaultProps} />)

      expect(screen.getByTestId('proceed-to-signature-button')).toHaveClass('min-h-[44px]')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ParentSigningCeremony {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('parent-signing-ceremony')).toHaveClass('custom-class')
    })
  })

  describe('celebration screen (Story 6.3 AC4, Story 6.4)', () => {
    const completeSigningState = createSigningState({
      status: 'complete',
      childSignature: mockChildSignature,
      parentSignatures: [
        {
          id: 'sig-parent-1',
          party: 'parent',
          method: 'typed',
          name: 'Mom',
          imageData: null,
          signerId: 'parent-1',
          signerName: 'Mom',
          signedAt: new Date('2024-01-15T12:00:00'),
          acknowledged: true,
        },
      ],
    })

    it('should show celebration screen when all signed and activation data provided', () => {
      render(
        <ParentSigningCeremony
          {...defaultProps}
          signingState={completeSigningState}
          agreementVersion="v1.0"
          activatedAt={new Date('2024-01-15T12:00:00')}
          familyName="Smith"
        />
      )

      expect(screen.getByTestId('celebration-screen')).toBeInTheDocument()
    })

    it('should display agreement version in celebration screen', () => {
      render(
        <ParentSigningCeremony
          {...defaultProps}
          signingState={completeSigningState}
          agreementVersion="v2.0"
          activatedAt={new Date('2024-01-15T12:00:00')}
        />
      )

      expect(screen.getByTestId('version-info')).toHaveTextContent('Version v2.0')
    })

    it('should display activation date in celebration screen', () => {
      render(
        <ParentSigningCeremony
          {...defaultProps}
          signingState={completeSigningState}
          agreementVersion="v1.0"
          activatedAt={new Date('2024-01-15T12:00:00')}
        />
      )

      expect(screen.getByTestId('version-info')).toHaveTextContent('January 15, 2024')
    })

    it('should display family name in celebration heading', () => {
      render(
        <ParentSigningCeremony
          {...defaultProps}
          signingState={completeSigningState}
          agreementVersion="v1.0"
          activatedAt={new Date('2024-01-15T12:00:00')}
          familyName="Smith"
        />
      )

      expect(screen.getByTestId('celebration-heading')).toHaveTextContent('Smith')
    })

    it('should call onViewDashboard when view dashboard button clicked', () => {
      const onViewDashboard = vi.fn()
      render(
        <ParentSigningCeremony
          {...defaultProps}
          signingState={completeSigningState}
          agreementVersion="v1.0"
          activatedAt={new Date('2024-01-15T12:00:00')}
          onViewDashboard={onViewDashboard}
        />
      )

      fireEvent.click(screen.getByTestId('view-dashboard-button'))

      expect(onViewDashboard).toHaveBeenCalledTimes(1)
    })

    it('should show signature confirmation when complete but no activation data', () => {
      render(<ParentSigningCeremony {...defaultProps} signingState={completeSigningState} />)

      expect(screen.getByTestId('signature-confirmation')).toBeInTheDocument()
      expect(screen.queryByTestId('celebration-screen')).not.toBeInTheDocument()
    })

    it('should show partnership message in celebration', () => {
      render(
        <ParentSigningCeremony
          {...defaultProps}
          signingState={completeSigningState}
          agreementVersion="v1.0"
          activatedAt={new Date('2024-01-15T12:00:00')}
        />
      )

      expect(screen.getByTestId('partnership-message')).toHaveTextContent('together')
    })

    it('should call onSetupDevices when setup devices button clicked', () => {
      const onSetupDevices = vi.fn()
      render(
        <ParentSigningCeremony
          {...defaultProps}
          signingState={completeSigningState}
          agreementVersion="v1.0"
          activatedAt={new Date('2024-01-15T12:00:00')}
          onSetupDevices={onSetupDevices}
        />
      )

      fireEvent.click(screen.getByTestId('setup-devices-button'))

      expect(onSetupDevices).toHaveBeenCalledTimes(1)
    })

    it('should call onDownload when download button clicked', () => {
      const onDownload = vi.fn()
      render(
        <ParentSigningCeremony
          {...defaultProps}
          signingState={completeSigningState}
          agreementVersion="v1.0"
          activatedAt={new Date('2024-01-15T12:00:00')}
          onDownload={onDownload}
        />
      )

      fireEvent.click(screen.getByTestId('download-button'))

      expect(onDownload).toHaveBeenCalledTimes(1)
    })
  })
})
