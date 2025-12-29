/**
 * Tests for useQuickStartWizard hook.
 *
 * Story 4.4: Quick Start Wizard
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useQuickStartWizard, WIZARD_STEPS } from '../useQuickStartWizard'

describe('useQuickStartWizard', () => {
  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      expect(result.current.currentStep).toBe(0)
      expect(result.current.state.childAge).toBeNull()
      expect(result.current.state.ageGroup).toBeNull()
      expect(result.current.state.selectedTemplate).toBeNull()
      expect(result.current.state.monitoringLevel).toBe('medium')
    })

    it('should initialize with provided child age', () => {
      const { result } = renderHook(() => useQuickStartWizard(10))

      expect(result.current.state.childAge).toBe(10)
      expect(result.current.state.ageGroup).toBe('8-10')
    })

    it('should auto-select age group for young children', () => {
      const { result } = renderHook(() => useQuickStartWizard(6))

      expect(result.current.state.ageGroup).toBe('5-7')
    })

    it('should auto-select age group for preteens', () => {
      const { result } = renderHook(() => useQuickStartWizard(12))

      expect(result.current.state.ageGroup).toBe('11-13')
    })

    it('should auto-select age group for teens', () => {
      const { result } = renderHook(() => useQuickStartWizard(15))

      expect(result.current.state.ageGroup).toBe('14-16')
    })
  })

  describe('navigation', () => {
    it('should go to next step', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      // Select age group first to allow progression
      act(() => {
        result.current.setAgeGroup('8-10')
      })

      act(() => {
        result.current.goToNextStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('should go to previous step', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.setAgeGroup('8-10')
      })

      act(() => {
        result.current.goToNextStep()
      })

      act(() => {
        result.current.goToPreviousStep()
      })

      expect(result.current.currentStep).toBe(0)
    })

    it('should not go past last step', () => {
      const { result } = renderHook(() => useQuickStartWizard(10))

      // Navigate to last step
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.goToNextStep()
        })
      }

      expect(result.current.currentStep).toBe(WIZARD_STEPS.length - 1)
    })

    it('should not go before first step', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.goToPreviousStep()
      })

      expect(result.current.currentStep).toBe(0)
    })

    it('should go to specific step', () => {
      const { result } = renderHook(() => useQuickStartWizard(10))

      act(() => {
        result.current.goToStep(3)
      })

      expect(result.current.currentStep).toBe(3)
    })

    it('should not go to invalid step index', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.goToStep(-1)
      })
      expect(result.current.currentStep).toBe(0)

      act(() => {
        result.current.goToStep(100)
      })
      expect(result.current.currentStep).toBe(0)
    })
  })

  describe('canProceed', () => {
    it('should not allow proceeding without age group selection', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      expect(result.current.canProceed).toBe(false)
    })

    it('should allow proceeding after age group selection', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.setAgeGroup('8-10')
      })

      expect(result.current.canProceed).toBe(true)
    })

    it('should allow proceeding on non-age steps', () => {
      const { result } = renderHook(() => useQuickStartWizard(10))

      // Move to screen time step
      act(() => {
        result.current.goToNextStep()
      })

      expect(result.current.canProceed).toBe(true)
    })
  })

  describe('setAgeGroup', () => {
    it('should set age group and load template', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.setAgeGroup('11-13')
      })

      expect(result.current.state.ageGroup).toBe('11-13')
      expect(result.current.state.selectedTemplate).not.toBeNull()
      expect(result.current.state.selectedTemplate?.ageGroup).toBe('11-13')
    })

    it('should apply template defaults', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.setAgeGroup('5-7')
      })

      // Template defaults should be applied
      expect(result.current.state.screenTimeLimits).toBeDefined()
      expect(result.current.state.monitoringLevel).toBeDefined()
    })
  })

  describe('setScreenTimeLimits', () => {
    it('should update screen time limits', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.setScreenTimeLimits({ weekday: 90, weekend: 150 })
      })

      expect(result.current.state.screenTimeLimits.weekday).toBe(90)
      expect(result.current.state.screenTimeLimits.weekend).toBe(150)
    })
  })

  describe('setBedtimeCutoff', () => {
    it('should update bedtime cutoff', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.setBedtimeCutoff({ weekday: '21:00', weekend: '22:30' })
      })

      expect(result.current.state.bedtimeCutoff?.weekday).toBe('21:00')
      expect(result.current.state.bedtimeCutoff?.weekend).toBe('22:30')
    })

    it('should allow null bedtime cutoff', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.setBedtimeCutoff({ weekday: '21:00', weekend: '22:30' })
      })

      act(() => {
        result.current.setBedtimeCutoff(null)
      })

      expect(result.current.state.bedtimeCutoff).toBeNull()
    })
  })

  describe('setMonitoringLevel', () => {
    it('should update monitoring level', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      act(() => {
        result.current.setMonitoringLevel('high')
      })

      expect(result.current.state.monitoringLevel).toBe('high')

      act(() => {
        result.current.setMonitoringLevel('low')
      })

      expect(result.current.state.monitoringLevel).toBe('low')
    })
  })

  describe('timeRemaining', () => {
    it('should calculate time remaining from current step', () => {
      const { result } = renderHook(() => useQuickStartWizard())

      // At step 0, should have all time remaining
      const totalTime = WIZARD_STEPS.reduce((sum, step) => sum + step.estimatedMinutes, 0)
      expect(result.current.timeRemaining).toBe(totalTime)
    })

    it('should decrease time remaining as steps progress', () => {
      const { result } = renderHook(() => useQuickStartWizard(10))

      const initialTime = result.current.timeRemaining

      act(() => {
        result.current.goToNextStep()
      })

      expect(result.current.timeRemaining).toBeLessThan(initialTime)
    })
  })

  describe('WIZARD_STEPS constant', () => {
    it('should have 5 steps', () => {
      expect(WIZARD_STEPS).toHaveLength(5)
    })

    it('should have correct step IDs', () => {
      const stepIds = WIZARD_STEPS.map((s) => s.id)
      expect(stepIds).toEqual(['age', 'screenTime', 'bedtime', 'monitoring', 'preview'])
    })

    it('should have estimated times for each step', () => {
      WIZARD_STEPS.forEach((step) => {
        expect(step.estimatedMinutes).toBeGreaterThan(0)
      })
    })
  })
})
