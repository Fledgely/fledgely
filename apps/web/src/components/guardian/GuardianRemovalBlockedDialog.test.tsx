import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuardianRemovalBlockedDialog } from './GuardianRemovalBlockedDialog'
import {
  GUARDIAN_REMOVAL_PREVENTION_MESSAGES,
  createBlockedResult,
} from '@fledgely/contracts'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ShieldAlert: () => <span data-testid="shield-alert-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  Scale: () => <span data-testid="scale-icon" />,
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
}))

describe('GuardianRemovalBlockedDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders when open', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(screen.getByText('Cannot Remove Co-Parent')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} open={false} />)

      expect(screen.queryByText('Cannot Remove Co-Parent')).not.toBeInTheDocument()
    })

    it('displays shield alert icon', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(screen.getByTestId('shield-alert-icon')).toBeInTheDocument()
    })

    it('displays the blocked message', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked)
      ).toBeInTheDocument()
    })

    it('displays shared custody explanation', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.sharedCustodyExplanation)
      ).toBeInTheDocument()
    })

    it('displays dissolution option', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText)
      ).toBeInTheDocument()
      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionOption)
      ).toBeInTheDocument()
    })

    it('displays legal petition option', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionLinkText)
      ).toBeInTheDocument()
      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionInfo)
      ).toBeInTheDocument()
    })

    it('displays court order note', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.courtOrderRequired)
      ).toBeInTheDocument()
    })

    it('displays "I Understand" button', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'I Understand' })).toBeInTheDocument()
    })
  })

  describe('blocked result handling', () => {
    it('shows guardian removal title by default', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(screen.getByText('Cannot Remove Co-Parent')).toBeInTheDocument()
    })

    it('shows role change title when blocked for role_downgrade', () => {
      const blockedResult = createBlockedResult('role_downgrade')
      render(<GuardianRemovalBlockedDialog {...defaultProps} blockedResult={blockedResult} />)

      expect(screen.getByText('Cannot Change Co-Parent Role')).toBeInTheDocument()
    })

    it('shows permission change title when blocked for permission_downgrade', () => {
      const blockedResult = createBlockedResult('permission_downgrade')
      render(<GuardianRemovalBlockedDialog {...defaultProps} blockedResult={blockedResult} />)

      expect(screen.getByText('Cannot Change Co-Parent Permissions')).toBeInTheDocument()
    })

    it('uses custom message from blocked result', () => {
      const customMessage = 'Custom blocked message for testing'
      const blockedResult = createBlockedResult('guardian_removal', customMessage)
      render(<GuardianRemovalBlockedDialog {...defaultProps} blockedResult={blockedResult} />)

      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it('shows role blocked message for role_downgrade', () => {
      const blockedResult = createBlockedResult('role_downgrade')
      render(<GuardianRemovalBlockedDialog {...defaultProps} blockedResult={blockedResult} />)

      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.roleChangeBlocked)
      ).toBeInTheDocument()
    })

    it('shows permission blocked message for permission_downgrade', () => {
      const blockedResult = createBlockedResult('permission_downgrade')
      render(<GuardianRemovalBlockedDialog {...defaultProps} blockedResult={blockedResult} />)

      expect(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.permissionChangeBlocked)
      ).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onOpenChange when "I Understand" is clicked', () => {
      const onOpenChange = vi.fn()
      render(<GuardianRemovalBlockedDialog {...defaultProps} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'I Understand' }))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onDissolutionClick when dissolution option is clicked', () => {
      const onDissolutionClick = vi.fn()
      const onOpenChange = vi.fn()
      render(
        <GuardianRemovalBlockedDialog
          {...defaultProps}
          onOpenChange={onOpenChange}
          onDissolutionClick={onDissolutionClick}
        />
      )

      fireEvent.click(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText)
      )

      expect(onDissolutionClick).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onLegalPetitionClick when legal petition option is clicked', () => {
      const onLegalPetitionClick = vi.fn()
      const onOpenChange = vi.fn()
      render(
        <GuardianRemovalBlockedDialog
          {...defaultProps}
          onOpenChange={onOpenChange}
          onLegalPetitionClick={onLegalPetitionClick}
        />
      )

      fireEvent.click(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionLinkText)
      )

      expect(onLegalPetitionClick).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('closes dialog and calls callback when dissolution is clicked', () => {
      const onDissolutionClick = vi.fn()
      const onOpenChange = vi.fn()
      render(
        <GuardianRemovalBlockedDialog
          {...defaultProps}
          onOpenChange={onOpenChange}
          onDissolutionClick={onDissolutionClick}
        />
      )

      fireEvent.click(
        screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText)
      )

      // Both callbacks should be called
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(onDissolutionClick).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has accessible title', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 2, name: /Cannot Remove Co-Parent/i })).toBeInTheDocument()
    })

    it('has accessible description for screen readers', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(
        screen.getByText('This action is not allowed in shared custody families.')
      ).toHaveClass('sr-only')
    })

    it('dissolution button has aria-describedby', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      const dissolutionButton = screen.getByText(
        GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText
      ).closest('button')

      expect(dissolutionButton).toHaveAttribute('aria-describedby', 'dissolution-description')
    })

    it('legal petition button has aria-describedby', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      const legalPetitionButton = screen.getByText(
        GUARDIAN_REMOVAL_PREVENTION_MESSAGES.legalPetitionLinkText
      ).closest('button')

      expect(legalPetitionButton).toHaveAttribute('aria-describedby', 'legal-petition-description')
    })

    it('option buttons meet minimum touch target size', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      const dissolutionButton = screen.getByText(
        GUARDIAN_REMOVAL_PREVENTION_MESSAGES.dissolutionLinkText
      ).closest('button')

      // Button should have padding (p-4) making it larger than 44x44px
      expect(dissolutionButton).toHaveClass('p-4')
    })

    it('"I Understand" button meets minimum touch target size', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      const understandButton = screen.getByRole('button', { name: 'I Understand' })

      expect(understandButton).toHaveClass('min-h-[44px]')
      expect(understandButton).toHaveClass('min-w-[100px]')
    })

    it('has aria-live region for polite announcements', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      const liveRegion = screen.getByText(
        GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked
      ).closest('[aria-live]')

      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('content quality', () => {
    it('messages are at 6th-grade reading level (contain simple words)', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      // Simple heuristic: key messages should be understandable
      const message = screen.getByText(GUARDIAN_REMOVAL_PREVENTION_MESSAGES.removalBlocked)
      expect(message.textContent).toContain('cannot remove')
      expect(message.textContent).toContain('co-parent')
    })

    it('explains why protection exists', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(screen.getByText('Why is this protected?')).toBeInTheDocument()
    })

    it('presents clear options to user', () => {
      render(<GuardianRemovalBlockedDialog {...defaultProps} />)

      expect(screen.getByText('Your options:')).toBeInTheDocument()
    })
  })
})
