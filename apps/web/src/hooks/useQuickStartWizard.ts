/**
 * Quick Start Wizard State Hook.
 *
 * Story 4.4: Quick Start Wizard - AC1, AC2, AC3, AC4
 *
 * Manages wizard state including current step, selections,
 * and estimated time remaining.
 */

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { AgreementTemplate } from '@fledgely/shared/contracts'
import { AGREEMENT_TEMPLATES } from '../data/templates'

export type AgeGroup = '5-7' | '8-10' | '11-13' | '14-16'
export type MonitoringLevel = 'high' | 'medium' | 'low'

export interface WizardStep {
  id: string
  name: string
  estimatedMinutes: number
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'age', name: 'Child Age', estimatedMinutes: 1 },
  { id: 'screenTime', name: 'Screen Time', estimatedMinutes: 2 },
  { id: 'bedtime', name: 'Bedtime', estimatedMinutes: 1 },
  { id: 'monitoring', name: 'Monitoring', estimatedMinutes: 2 },
  { id: 'preview', name: 'Review', estimatedMinutes: 2 },
]

export interface ScreenTimeLimits {
  weekday: number
  weekend: number
}

export interface BedtimeCutoff {
  weekday: string
  weekend: string
}

export interface QuickStartState {
  childAge: number | null
  ageGroup: AgeGroup | null
  selectedTemplate: AgreementTemplate | null
  screenTimeLimits: ScreenTimeLimits
  bedtimeCutoff: BedtimeCutoff | null
  monitoringLevel: MonitoringLevel
}

const DEFAULT_STATE: QuickStartState = {
  childAge: null,
  ageGroup: null,
  selectedTemplate: null,
  screenTimeLimits: { weekday: 60, weekend: 120 },
  bedtimeCutoff: null,
  monitoringLevel: 'medium',
}

/**
 * Get age group from child age.
 */
export function getAgeGroupFromAge(age: number): AgeGroup {
  if (age >= 5 && age <= 7) return '5-7'
  if (age >= 8 && age <= 10) return '8-10'
  if (age >= 11 && age <= 13) return '11-13'
  return '14-16'
}

/**
 * Find template for age group.
 */
function findTemplateForAgeGroup(ageGroup: AgeGroup): AgreementTemplate | null {
  if (!AGREEMENT_TEMPLATES || AGREEMENT_TEMPLATES.length === 0) {
    return null
  }
  const template = AGREEMENT_TEMPLATES.find(
    (t) => t.ageGroup === ageGroup && t.variation === 'balanced'
  )
  return template || AGREEMENT_TEMPLATES.find((t) => t.ageGroup === ageGroup) || null
}

/**
 * Hook for managing Quick Start Wizard state.
 */
export function useQuickStartWizard(childAge?: number) {
  const [currentStep, setCurrentStep] = useState(0)
  const [state, setState] = useState<QuickStartState>(() => {
    if (childAge !== undefined) {
      const ageGroup = getAgeGroupFromAge(childAge)
      const template = findTemplateForAgeGroup(ageGroup)

      if (template) {
        return {
          childAge,
          ageGroup,
          selectedTemplate: template,
          screenTimeLimits: template.screenTimeLimits
            ? { ...template.screenTimeLimits }
            : DEFAULT_STATE.screenTimeLimits,
          bedtimeCutoff: null,
          monitoringLevel: template.monitoringLevel || DEFAULT_STATE.monitoringLevel,
        }
      }

      return {
        ...DEFAULT_STATE,
        childAge,
        ageGroup,
      }
    }
    return DEFAULT_STATE
  })

  // Effect to handle childAge changes after initial render
  useEffect(() => {
    if (childAge !== undefined && state.childAge !== childAge) {
      const ageGroup = getAgeGroupFromAge(childAge)
      const template = findTemplateForAgeGroup(ageGroup)

      if (template) {
        setState({
          childAge,
          ageGroup,
          selectedTemplate: template,
          screenTimeLimits: template.screenTimeLimits
            ? { ...template.screenTimeLimits }
            : DEFAULT_STATE.screenTimeLimits,
          bedtimeCutoff: null,
          monitoringLevel: template.monitoringLevel || DEFAULT_STATE.monitoringLevel,
        })
      } else {
        setState((prev) => ({
          ...prev,
          childAge,
          ageGroup,
        }))
      }
    }
  }, [childAge, state.childAge])

  const totalSteps = WIZARD_STEPS.length

  const timeRemaining = useMemo(() => {
    const remainingSteps = WIZARD_STEPS.slice(currentStep)
    return remainingSteps.reduce((sum, step) => sum + step.estimatedMinutes, 0)
  }, [currentStep])

  const canProceed = useMemo(() => {
    // For step 0 (age selection), require age group to be selected
    if (currentStep === 0) {
      return state.ageGroup !== null
    }
    // Other steps can always proceed
    return true
  }, [currentStep, state.ageGroup])

  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < totalSteps) {
        setCurrentStep(stepIndex)
      }
    },
    [totalSteps]
  )

  const goToNextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep, totalSteps])

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const setAgeGroup = useCallback((ageGroup: AgeGroup) => {
    const template = findTemplateForAgeGroup(ageGroup)

    if (template) {
      setState((prev) => ({
        ...prev,
        ageGroup,
        selectedTemplate: template,
        screenTimeLimits: template.screenTimeLimits
          ? { ...template.screenTimeLimits }
          : prev.screenTimeLimits,
        monitoringLevel: template.monitoringLevel || prev.monitoringLevel,
      }))
    } else {
      setState((prev) => ({
        ...prev,
        ageGroup,
      }))
    }
  }, [])

  const setScreenTimeLimits = useCallback((limits: ScreenTimeLimits) => {
    setState((prev) => ({
      ...prev,
      screenTimeLimits: limits,
    }))
  }, [])

  const setBedtimeCutoff = useCallback((bedtime: BedtimeCutoff | null) => {
    setState((prev) => ({
      ...prev,
      bedtimeCutoff: bedtime,
    }))
  }, [])

  const setMonitoringLevel = useCallback((level: MonitoringLevel) => {
    setState((prev) => ({
      ...prev,
      monitoringLevel: level,
    }))
  }, [])

  return {
    // Step navigation
    currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,

    // Progress
    timeRemaining,
    canProceed,

    // State
    state,

    // State setters
    setAgeGroup,
    setScreenTimeLimits,
    setBedtimeCutoff,
    setMonitoringLevel,
  }
}
