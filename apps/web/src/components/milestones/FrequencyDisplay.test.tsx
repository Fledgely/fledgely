/**
 * FrequencyDisplay Component Tests - Story 37.2 Task 4
 *
 * Tests for current frequency display.
 * AC6: Parent dashboard reflects current frequency setting
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FrequencyDisplay } from './FrequencyDisplay'

describe('FrequencyDisplay - Story 37.2 Task 4', () => {
  describe('AC6: Current frequency display', () => {
    it('should display current frequency in minutes', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('current-frequency')).toHaveTextContent('15')
    })

    it('should display hourly frequency correctly', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={60}
          milestoneLevel="ready-for-independence"
          viewerType="parent"
          childName="Alex"
        />
      )

      const frequency = screen.getByTestId('current-frequency')
      expect(frequency.textContent?.toLowerCase()).toMatch(/hour|60/)
    })
  })

  describe('Milestone connection', () => {
    it('should show growing milestone connection', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-connection')).toHaveTextContent(/growing/i)
    })

    it('should show maturing milestone connection', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={30}
          milestoneLevel="maturing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-connection')).toHaveTextContent(/maturing/i)
    })

    it('should show ready-for-independence milestone connection', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={60}
          milestoneLevel="ready-for-independence"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-connection')).toHaveTextContent(/ready.*independence/i)
    })

    it('should show no milestone when none achieved', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={5}
          milestoneLevel={null}
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-connection')).toHaveTextContent(/default|standard/i)
    })
  })

  describe('Parent dashboard integration', () => {
    it('should show child name in parent view', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-display')).toHaveTextContent('Alex')
    })

    it('should show appropriate label for parent', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-label')).toBeInTheDocument()
    })
  })

  describe('Child-friendly explanation', () => {
    it('should have child-friendly view', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-display')).toBeInTheDocument()
    })

    it('should explain frequency in child view', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-explanation')).toBeInTheDocument()
    })

    it('should use developmental language', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="child"
          childName="Alex"
        />
      )

      const explanation = screen.getByTestId('frequency-explanation')
      expect(explanation.textContent?.toLowerCase()).toMatch(/recogniz|growth|growing|privacy/)
    })
  })

  describe('Visual indicator', () => {
    it('should have visual frequency indicator', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-indicator')).toBeInTheDocument()
    })

    it('should show reduction compared to default', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      const indicator = screen.getByTestId('frequency-indicator')
      expect(indicator.textContent).toMatch(/3x|less|fewer/i)
    })
  })

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      const display = screen.getByTestId('frequency-display')
      expect(display).toHaveAttribute('aria-label')
    })
  })
})
