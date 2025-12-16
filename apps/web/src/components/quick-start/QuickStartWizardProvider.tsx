'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react'

/**
 * Time estimates in seconds for each wizard step
 * Used for progress indicator time remaining calculation
 *
 * Story 4.4: Quick Start Wizard - NFR59
 * Total must be under 10 minutes (600 seconds) with defaults
 */
export const STEP_TIME_ESTIMATES = {
  ageSelection: 30, // 30 seconds
  screenTime: 60, // 1 minute
  bedtimeCutoff: 45, // 45 seconds
  monitoringLevel: 60, // 1 minute
  preview: 120, // 2 minutes review
} as const // Total: ~5 minutes 15 seconds with defaults

/**
 * Wizard step names for display and accessibility
 */
export const WIZARD_STEPS = [
  'Age Selection',
  'Screen Time',
  'Bedtime Cutoff',
  'Monitoring Level',
  'Preview',
] as const

export type WizardStepName = (typeof WIZARD_STEPS)[number]

export type MonitoringLevel = 'light' | 'moderate' | 'comprehensive'

export interface WizardDecisions {
  screenTimeMinutes: number
  bedtimeCutoff: string
  monitoringLevel: MonitoringLevel
  selectedRules: string[]
}

export interface WizardState {
  currentStep: number
  childAge: string | null
  selectedTemplateId: string | null
  decisions: WizardDecisions
  startedAt: string | null
}

interface WizardActions {
  setStep: (step: number) => void
  setChildAge: (age: string) => void
  setTemplate: (templateId: string) => void
  setDecision: <K extends keyof WizardDecisions>(
    key: K,
    value: WizardDecisions[K]
  ) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
  getTimeRemaining: () => number
  getDraft: () => WizardDraft
}

/**
 * Draft object created when wizard completes
 * Used for Epic 5 handoff
 */
export interface WizardDraft {
  childAge: string
  templateId: string
  customizations: {
    screenTimeMinutes: number
    bedtimeCutoff: string
    monitoringLevel: string
    selectedRules: string[]
  }
  createdAt: string
}

type QuickStartWizardContextType = WizardState & WizardActions

const STORAGE_KEY = 'quick-start-wizard'

const initialDecisions: WizardDecisions = {
  screenTimeMinutes: 60,
  bedtimeCutoff: '20:00',
  monitoringLevel: 'moderate',
  selectedRules: [],
}

const initialState: WizardState = {
  currentStep: 0,
  childAge: null,
  selectedTemplateId: null,
  decisions: initialDecisions,
  startedAt: null,
}

const QuickStartWizardContext = createContext<QuickStartWizardContextType | null>(null)

interface QuickStartWizardProviderProps {
  children: ReactNode
}

/**
 * Provider component for Quick Start Wizard state
 *
 * Story 4.4: Quick Start Wizard - Task 1.4
 *
 * Uses React Context for UI-only state (per project_context.md Rule 4).
 * Persists to sessionStorage for page refresh handling.
 *
 * @example
 * ```tsx
 * <QuickStartWizardProvider>
 *   <QuickStartWizard />
 * </QuickStartWizardProvider>
 * ```
 */
export function QuickStartWizardProvider({ children }: QuickStartWizardProviderProps) {
  const [state, setState] = useState<WizardState>(() => {
    // Try to restore from session storage
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch {
        // Ignore parse errors, use default state
      }
    }
    return initialState
  })

  // Persist to session storage on state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state])

  const setStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const setChildAge = useCallback((age: string) => {
    setState((prev) => ({
      ...prev,
      childAge: age,
      // Start timer on first selection
      startedAt: prev.startedAt || new Date().toISOString(),
    }))
  }, [])

  const setTemplate = useCallback((templateId: string) => {
    setState((prev) => ({ ...prev, selectedTemplateId: templateId }))
  }, [])

  const setDecision = useCallback(
    <K extends keyof WizardDecisions>(key: K, value: WizardDecisions[K]) => {
      setState((prev) => ({
        ...prev,
        decisions: { ...prev.decisions, [key]: value },
      }))
    },
    []
  )

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, WIZARD_STEPS.length - 1),
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initialState))
    }
  }, [])

  const getTimeRemaining = useCallback(() => {
    const steps = Object.values(STEP_TIME_ESTIMATES)
    const remainingSteps = steps.slice(state.currentStep)
    return remainingSteps.reduce((sum, seconds) => sum + seconds, 0)
  }, [state.currentStep])

  const getDraft = useCallback((): WizardDraft => {
    return {
      childAge: state.childAge || '',
      templateId: state.selectedTemplateId || '',
      customizations: {
        screenTimeMinutes: state.decisions.screenTimeMinutes,
        bedtimeCutoff: state.decisions.bedtimeCutoff,
        monitoringLevel: state.decisions.monitoringLevel,
        selectedRules: state.decisions.selectedRules,
      },
      createdAt: new Date().toISOString(),
    }
  }, [state])

  const value = useMemo(
    () => ({
      ...state,
      setStep,
      setChildAge,
      setTemplate,
      setDecision,
      nextStep,
      prevStep,
      reset,
      getTimeRemaining,
      getDraft,
    }),
    [
      state,
      setStep,
      setChildAge,
      setTemplate,
      setDecision,
      nextStep,
      prevStep,
      reset,
      getTimeRemaining,
      getDraft,
    ]
  )

  return (
    <QuickStartWizardContext.Provider value={value}>
      {children}
    </QuickStartWizardContext.Provider>
  )
}

/**
 * Hook for accessing Quick Start Wizard state and actions
 *
 * Story 4.4: Quick Start Wizard - Task 1.4
 *
 * Must be used within a QuickStartWizardProvider.
 *
 * @example
 * ```tsx
 * const { currentStep, nextStep, childAge, setChildAge } = useQuickStartWizard()
 * ```
 */
export function useQuickStartWizard(): QuickStartWizardContextType {
  const context = useContext(QuickStartWizardContext)
  if (!context) {
    throw new Error(
      'useQuickStartWizard must be used within a QuickStartWizardProvider'
    )
  }
  return context
}
