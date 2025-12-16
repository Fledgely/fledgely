/**
 * QuickStartWizardProvider Tests
 *
 * Story 4.4: Quick Start Wizard - Task 1.4
 * State management for wizard using React Context (per project_context.md Rule 4)
 *
 * Tests:
 * - Context provider and consumer
 * - State initialization
 * - State updates
 * - Session storage persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, renderHook, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  QuickStartWizardProvider,
  useQuickStartWizard,
  STEP_TIME_ESTIMATES,
} from '../QuickStartWizardProvider'

// Test component that uses the hook
function TestConsumer() {
  const state = useQuickStartWizard()
  return (
    <div>
      <span data-testid="current-step">{state.currentStep}</span>
      <span data-testid="child-age">{state.childAge || 'none'}</span>
      <span data-testid="template-id">{state.selectedTemplateId || 'none'}</span>
      <span data-testid="screen-time">{state.decisions.screenTimeMinutes}</span>
      <span data-testid="bedtime">{state.decisions.bedtimeCutoff}</span>
      <span data-testid="monitoring">{state.decisions.monitoringLevel}</span>
      <button onClick={() => state.setStep(1)}>Set Step 1</button>
      <button onClick={() => state.setChildAge('8-10')}>Set Age 8-10</button>
      <button onClick={() => state.setTemplate('template-123')}>Set Template</button>
      <button onClick={() => state.setDecision('screenTimeMinutes', 90)}>
        Set Screen Time
      </button>
      <button onClick={() => state.setDecision('bedtimeCutoff', '21:00')}>
        Set Bedtime
      </button>
      <button onClick={() => state.setDecision('monitoringLevel', 'light')}>
        Set Monitoring
      </button>
      <button onClick={() => state.nextStep()}>Next</button>
      <button onClick={() => state.prevStep()}>Back</button>
      <button onClick={() => state.reset()}>Reset</button>
    </div>
  )
}

describe('QuickStartWizardProvider', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe('provider setup', () => {
    it('provides context to children', () => {
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      expect(screen.getByTestId('current-step')).toHaveTextContent('0')
    })

    it('throws error when hook is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestConsumer />)
      }).toThrow(/must be used within a QuickStartWizardProvider/i)

      consoleSpy.mockRestore()
    })
  })

  describe('initial state', () => {
    it('initializes with step 0', () => {
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      expect(screen.getByTestId('current-step')).toHaveTextContent('0')
    })

    it('initializes with null childAge', () => {
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      expect(screen.getByTestId('child-age')).toHaveTextContent('none')
    })

    it('initializes with null selectedTemplateId', () => {
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      expect(screen.getByTestId('template-id')).toHaveTextContent('none')
    })

    it('initializes with default screen time (60 minutes)', () => {
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      expect(screen.getByTestId('screen-time')).toHaveTextContent('60')
    })

    it('initializes with default bedtime (20:00)', () => {
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      expect(screen.getByTestId('bedtime')).toHaveTextContent('20:00')
    })

    it('initializes with default monitoring level (moderate)', () => {
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      expect(screen.getByTestId('monitoring')).toHaveTextContent('moderate')
    })
  })

  describe('state updates', () => {
    it('updates current step', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Set Step 1'))

      expect(screen.getByTestId('current-step')).toHaveTextContent('1')
    })

    it('updates child age', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Set Age 8-10'))

      expect(screen.getByTestId('child-age')).toHaveTextContent('8-10')
    })

    it('updates selected template ID', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Set Template'))

      expect(screen.getByTestId('template-id')).toHaveTextContent('template-123')
    })

    it('updates screen time decision', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Set Screen Time'))

      expect(screen.getByTestId('screen-time')).toHaveTextContent('90')
    })

    it('updates bedtime decision', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Set Bedtime'))

      expect(screen.getByTestId('bedtime')).toHaveTextContent('21:00')
    })

    it('updates monitoring level decision', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Set Monitoring'))

      expect(screen.getByTestId('monitoring')).toHaveTextContent('light')
    })
  })

  describe('step navigation', () => {
    it('nextStep increments current step', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Next'))

      expect(screen.getByTestId('current-step')).toHaveTextContent('1')
    })

    it('prevStep decrements current step', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Back'))

      expect(screen.getByTestId('current-step')).toHaveTextContent('0')
    })

    it('prevStep does not go below 0', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Back'))

      expect(screen.getByTestId('current-step')).toHaveTextContent('0')
    })
  })

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      // Make some changes
      await user.click(screen.getByText('Set Step 1'))
      await user.click(screen.getByText('Set Age 8-10'))
      await user.click(screen.getByText('Set Template'))
      await user.click(screen.getByText('Set Screen Time'))

      // Reset
      await user.click(screen.getByText('Reset'))

      expect(screen.getByTestId('current-step')).toHaveTextContent('0')
      expect(screen.getByTestId('child-age')).toHaveTextContent('none')
      expect(screen.getByTestId('template-id')).toHaveTextContent('none')
      expect(screen.getByTestId('screen-time')).toHaveTextContent('60')
    })
  })

  describe('session storage persistence', () => {
    it('persists state to session storage', async () => {
      const user = userEvent.setup()
      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Set Age 8-10'))

      // Check session storage
      await waitFor(() => {
        const stored = sessionStorage.getItem('quick-start-wizard')
        expect(stored).toBeTruthy()
        const parsed = JSON.parse(stored!)
        expect(parsed.childAge).toBe('8-10')
      })
    })

    it('restores state from session storage on mount', async () => {
      // Pre-populate session storage
      const initialState = {
        currentStep: 2,
        childAge: '11-13',
        selectedTemplateId: 'pre-set-template',
        decisions: {
          screenTimeMinutes: 120,
          bedtimeCutoff: '22:00',
          monitoringLevel: 'light',
          selectedRules: [],
        },
        startedAt: new Date().toISOString(),
      }
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(initialState))

      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('2')
        expect(screen.getByTestId('child-age')).toHaveTextContent('11-13')
        expect(screen.getByTestId('template-id')).toHaveTextContent('pre-set-template')
        expect(screen.getByTestId('screen-time')).toHaveTextContent('120')
      })
    })

    it('clears session storage on reset', async () => {
      const user = userEvent.setup()

      // Pre-populate
      sessionStorage.setItem(
        'quick-start-wizard',
        JSON.stringify({
          currentStep: 1,
          childAge: '5-7',
          selectedTemplateId: null,
          decisions: {
            screenTimeMinutes: 60,
            bedtimeCutoff: '20:00',
            monitoringLevel: 'moderate',
            selectedRules: [],
          },
          startedAt: null,
        })
      )

      render(
        <QuickStartWizardProvider>
          <TestConsumer />
        </QuickStartWizardProvider>
      )

      await user.click(screen.getByText('Reset'))

      await waitFor(() => {
        const stored = sessionStorage.getItem('quick-start-wizard')
        if (stored) {
          const parsed = JSON.parse(stored)
          expect(parsed.currentStep).toBe(0)
          expect(parsed.childAge).toBeNull()
        }
      })
    })
  })

  describe('time estimate constants', () => {
    it('exports step time estimates', () => {
      expect(STEP_TIME_ESTIMATES).toBeDefined()
      expect(STEP_TIME_ESTIMATES.ageSelection).toBeDefined()
      expect(STEP_TIME_ESTIMATES.screenTime).toBeDefined()
      expect(STEP_TIME_ESTIMATES.bedtimeCutoff).toBeDefined()
      expect(STEP_TIME_ESTIMATES.monitoringLevel).toBeDefined()
      expect(STEP_TIME_ESTIMATES.preview).toBeDefined()
    })

    it('total time estimate is under 10 minutes (600 seconds)', () => {
      const totalSeconds = Object.values(STEP_TIME_ESTIMATES).reduce(
        (sum, seconds) => sum + seconds,
        0
      )
      expect(totalSeconds).toBeLessThanOrEqual(600)
    })
  })
})
