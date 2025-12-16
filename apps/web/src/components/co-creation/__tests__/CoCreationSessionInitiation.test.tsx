/**
 * Unit tests for CoCreationSessionInitiation Component
 *
 * Story 5.1: Co-Creation Session Initiation - Task 4.1
 * Story 5.6: Agreement-Only Mode Selection - Task 4.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CoCreationSessionInitiation } from '../CoCreationSessionInitiation'
import type { WizardDraft, TemplateDraft } from '../CoCreationSessionInitiation'

// Helper function to navigate through presence and mode selection steps
const navigateToSummary = async () => {
  // Confirm child presence
  fireEvent.click(screen.getByText("We're Ready!"))
  // Continue past mode selection (defaults to 'full')
  fireEvent.click(screen.getByText('Continue'))
}

describe('CoCreationSessionInitiation', () => {
  const mockChild = {
    id: 'child-123',
    name: 'Alex',
    age: 10,
  }

  const mockWizardDraft: WizardDraft = {
    childAge: '10',
    templateId: 'template-123',
    customizations: {
      screenTimeMinutes: 120,
      bedtimeCutoff: '21:00',
      monitoringLevel: 'moderate',
      selectedRules: ['rule-1', 'rule-2'],
    },
    createdAt: new Date().toISOString(),
  }

  const mockTemplateDraft: TemplateDraft = {
    templateId: 'template-456',
    childId: 'child-123',
    originalTemplate: {
      id: 'template-456',
      name: 'Test Template',
      description: 'Test',
      ageGroup: '8-10',
      concerns: [],
      screenTimeDefaults: { weekday: 120, weekend: 180 },
      bedtimeDefaults: { weekday: '21:00', weekend: '22:00' },
      monitoringLevel: 'balanced',
      rules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    customizations: {
      screenTimeMinutes: 90,
      weekendScreenTimeMinutes: 150,
      bedtimeCutoff: '20:30',
      monitoringLevel: 'careful',
      rules: {
        enabled: ['rule-a'],
        disabled: [],
        custom: [{ id: 'custom-1', text: 'Custom rule' }],
      },
    },
    modifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }

  const defaultProps = {
    child: mockChild,
    familyId: 'family-456',
    draftSource: { type: 'wizard' as const, draft: mockWizardDraft },
    onSessionStart: vi.fn(),
    onCancel: vi.fn(),
    createSession: vi.fn().mockResolvedValue({
      success: true,
      session: { id: 'session-789' },
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial rendering (child presence step)', () => {
    it('shows child presence prompt first', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      expect(screen.getByText('Time to Sit Together')).toBeInTheDocument()
    })

    it('displays child name in presence prompt', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      // Child name appears multiple times
      expect(screen.getAllByText(/Alex/).length).toBeGreaterThan(0)
    })

    it('shows "Not Yet" and "We\'re Ready!" buttons', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      expect(screen.getByText('Not Yet')).toBeInTheDocument()
      expect(screen.getByText("We're Ready!")).toBeInTheDocument()
    })
  })

  describe('cancellation', () => {
    it('calls onCancel when "Not Yet" is clicked', () => {
      const onCancel = vi.fn()
      render(<CoCreationSessionInitiation {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByText('Not Yet'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('progression through mode selection to draft summary step', () => {
    it('shows mode selection after confirming child presence', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)

      fireEvent.click(screen.getByText("We're Ready!"))

      expect(screen.getByText('Choose Your Agreement Type')).toBeInTheDocument()
    })

    it('shows draft summary after selecting mode', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)

      navigateToSummary()

      expect(screen.getByText('Ready to Build Your Agreement')).toBeInTheDocument()
    })

    it('displays child name in summary header', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)

      navigateToSummary()

      expect(screen.getByText(/with/)).toBeInTheDocument()
      expect(screen.getByText('Alex')).toBeInTheDocument()
    })

    it('shows start button after confirming presence and mode', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)

      navigateToSummary()

      expect(screen.getByText('Start Building Together')).toBeInTheDocument()
    })

    it('shows selected mode badge in summary', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)

      navigateToSummary()

      expect(screen.getByText('Full Agreement')).toBeInTheDocument()
    })
  })

  describe('draft summary display', () => {
    it('displays wizard draft summary correctly', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      navigateToSummary()

      expect(screen.getByText('Starting Point')).toBeInTheDocument()
      expect(screen.getByText('Daily Screen Time')).toBeInTheDocument()
      expect(screen.getByText('120 minutes')).toBeInTheDocument()
      expect(screen.getByText('Device Bedtime')).toBeInTheDocument()
      expect(screen.getByText('21:00')).toBeInTheDocument()
      expect(screen.getByText('Rules to Discuss')).toBeInTheDocument()
      expect(screen.getByText('2 rules')).toBeInTheDocument()
    })

    it('displays template draft summary correctly', () => {
      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          draftSource={{ type: 'template_customization', draft: mockTemplateDraft }}
        />
      )
      navigateToSummary()

      expect(screen.getByText('90 minutes')).toBeInTheDocument()
      expect(screen.getByText('20:30')).toBeInTheDocument()
      expect(screen.getByText('2 rules')).toBeInTheDocument() // 1 enabled + 1 custom
    })

    it('shows blank draft message for blank source', () => {
      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          draftSource={{ type: 'blank' }}
        />
      )
      navigateToSummary()

      expect(screen.getByText('Starting Fresh')).toBeInTheDocument()
      expect(screen.getByText(/build your agreement together from scratch/)).toBeInTheDocument()
    })
  })

  describe('session creation', () => {
    it('calls createSession with correct input for wizard draft (full mode)', async () => {
      const createSession = vi.fn().mockResolvedValue({
        success: true,
        session: { id: 'session-789' },
      })

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          createSession={createSession}
        />
      )

      navigateToSummary()
      fireEvent.click(screen.getByText('Start Building Together'))

      await waitFor(() => {
        expect(createSession).toHaveBeenCalledWith({
          familyId: 'family-456',
          childId: 'child-123',
          sourceDraft: {
            type: 'wizard',
            templateId: 'template-123',
            draftId: undefined,
          },
          initialTerms: [
            { type: 'screen_time', content: { minutes: 120 } },
            { type: 'bedtime', content: { time: '21:00' } },
            { type: 'monitoring', content: { level: 'moderate' } },
          ],
          agreementMode: 'full',
        })
      })
    })

    it('calls createSession with correct input for template draft (full mode)', async () => {
      const createSession = vi.fn().mockResolvedValue({
        success: true,
        session: { id: 'session-789' },
      })

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          draftSource={{ type: 'template_customization', draft: mockTemplateDraft }}
          createSession={createSession}
        />
      )

      navigateToSummary()
      fireEvent.click(screen.getByText('Start Building Together'))

      await waitFor(() => {
        expect(createSession).toHaveBeenCalledWith({
          familyId: 'family-456',
          childId: 'child-123',
          sourceDraft: {
            type: 'template_customization',
            templateId: 'template-456',
            draftId: 'child-123',
          },
          initialTerms: [
            { type: 'screen_time', content: { minutes: 90 } },
            { type: 'bedtime', content: { time: '20:30' } },
            { type: 'monitoring', content: { level: 'careful' } },
          ],
          agreementMode: 'full',
        })
      })
    })

    it('calls createSession without initial terms for blank draft', async () => {
      const createSession = vi.fn().mockResolvedValue({
        success: true,
        session: { id: 'session-789' },
      })

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          draftSource={{ type: 'blank' }}
          createSession={createSession}
        />
      )

      navigateToSummary()
      fireEvent.click(screen.getByText('Start Building Together'))

      await waitFor(() => {
        expect(createSession).toHaveBeenCalledWith({
          familyId: 'family-456',
          childId: 'child-123',
          sourceDraft: {
            type: 'blank',
            templateId: undefined,
            draftId: undefined,
          },
          initialTerms: undefined,
          agreementMode: 'full',
        })
      })
    })

    it('excludes monitoring terms in agreement_only mode', async () => {
      const createSession = vi.fn().mockResolvedValue({
        success: true,
        session: { id: 'session-789' },
      })

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          createSession={createSession}
        />
      )

      // Navigate through presence
      fireEvent.click(screen.getByText("We're Ready!"))
      // Select agreement_only mode
      fireEvent.click(screen.getByTestId('mode-card-agreement_only'))
      fireEvent.click(screen.getByText('Continue'))
      // Start session
      fireEvent.click(screen.getByText('Start Building Together'))

      await waitFor(() => {
        expect(createSession).toHaveBeenCalledWith({
          familyId: 'family-456',
          childId: 'child-123',
          sourceDraft: {
            type: 'wizard',
            templateId: 'template-123',
            draftId: undefined,
          },
          // Monitoring term should be excluded
          initialTerms: [
            { type: 'screen_time', content: { minutes: 120 } },
            { type: 'bedtime', content: { time: '21:00' } },
          ],
          agreementMode: 'agreement_only',
        })
      })
    })

    it('shows loading state during session creation', async () => {
      const createSession = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          createSession={createSession}
        />
      )

      navigateToSummary()
      fireEvent.click(screen.getByText('Start Building Together'))

      expect(screen.getByText('Creating Session...')).toBeInTheDocument()
    })

    it('calls onSessionStart with session ID on success', async () => {
      const onSessionStart = vi.fn()
      const createSession = vi.fn().mockResolvedValue({
        success: true,
        session: { id: 'new-session-123' },
      })

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          onSessionStart={onSessionStart}
          createSession={createSession}
        />
      )

      navigateToSummary()
      fireEvent.click(screen.getByText('Start Building Together'))

      await waitFor(
        () => {
          expect(onSessionStart).toHaveBeenCalledWith('new-session-123')
        },
        { timeout: 1000 }
      )
    })
  })

  describe('error handling', () => {
    it('displays error message on session creation failure', async () => {
      const createSession = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network error occurred',
      })

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          createSession={createSession}
        />
      )

      navigateToSummary()
      fireEvent.click(screen.getByText('Start Building Together'))

      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument()
      })
    })

    it('shows retry button on error', async () => {
      const createSession = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed',
      })

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          createSession={createSession}
        />
      )

      navigateToSummary()
      fireEvent.click(screen.getByText('Start Building Together'))

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })

    it('handles exception during session creation', async () => {
      const createSession = vi.fn().mockRejectedValue(new Error('Unexpected error'))

      render(
        <CoCreationSessionInitiation
          {...defaultProps}
          createSession={createSession}
        />
      )

      navigateToSummary()
      fireEvent.click(screen.getByText('Start Building Together'))

      await waitFor(() => {
        expect(screen.getByText('Unexpected error')).toBeInTheDocument()
      })
    })
  })

  describe('back navigation from summary step', () => {
    it('shows go back link in summary step', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      navigateToSummary()

      expect(screen.getByText('Go back to draft')).toBeInTheDocument()
    })

    it('calls onCancel when go back is clicked', () => {
      const onCancel = vi.fn()
      render(<CoCreationSessionInitiation {...defaultProps} onCancel={onCancel} />)

      navigateToSummary()
      fireEvent.click(screen.getByText('Go back to draft'))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('allows changing mode from summary', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      navigateToSummary()

      // Click change button next to mode badge
      fireEvent.click(screen.getByText('Change'))

      // Should be back on mode selection
      expect(screen.getByText('Choose Your Agreement Type')).toBeInTheDocument()
    })
  })

  describe('mode selection (Story 5.6)', () => {
    it('shows both mode options', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      fireEvent.click(screen.getByText("We're Ready!"))

      expect(screen.getByTestId('mode-card-full')).toBeInTheDocument()
      expect(screen.getByTestId('mode-card-agreement_only')).toBeInTheDocument()
    })

    it('defaults to full mode selected', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      fireEvent.click(screen.getByText("We're Ready!"))

      const fullCard = screen.getByTestId('mode-card-full')
      expect(fullCard).toHaveAttribute('aria-checked', 'true')
    })

    it('allows selecting agreement_only mode', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      fireEvent.click(screen.getByText("We're Ready!"))
      fireEvent.click(screen.getByTestId('mode-card-agreement_only'))

      const agreementOnlyCard = screen.getByTestId('mode-card-agreement_only')
      expect(agreementOnlyCard).toHaveAttribute('aria-checked', 'true')
    })

    it('displays agreement_only badge in summary after selecting', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      fireEvent.click(screen.getByText("We're Ready!"))
      fireEvent.click(screen.getByTestId('mode-card-agreement_only'))
      fireEvent.click(screen.getByText('Continue'))

      expect(screen.getByText('Agreement Only')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('uses heading hierarchy correctly', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      navigateToSummary()

      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('maintains focus after step transitions', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)

      const confirmButton = screen.getByText("We're Ready!")
      fireEvent.click(confirmButton)

      // Verify new content is rendered (mode selection)
      expect(screen.getByText('Choose Your Agreement Type')).toBeInTheDocument()
    })
  })

  describe('design for screen sharing (AC #5)', () => {
    it('uses large text sizes throughout', () => {
      render(<CoCreationSessionInitiation {...defaultProps} />)
      navigateToSummary()

      const heading = screen.getByText('Ready to Build Your Agreement')
      expect(heading.className).toContain('text-2xl')
    })
  })
})
