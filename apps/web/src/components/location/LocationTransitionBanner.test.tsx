/**
 * LocationTransitionBanner Component Tests - Story 40.4
 *
 * Tests for location transition banner display.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LocationTransitionBanner } from './LocationTransitionBanner'

describe('LocationTransitionBanner', () => {
  describe('when not in transition and at a zone', () => {
    it('renders nothing', () => {
      const { container } = render(
        <LocationTransitionBanner
          currentZoneName="Home"
          inTransition={false}
          gracePeriodMinutes={0}
          rulesApplied={false}
          targetZoneName={null}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('when transitioning to a zone', () => {
    it('shows transition message with zone name', () => {
      render(
        <LocationTransitionBanner
          currentZoneName={null}
          inTransition={true}
          gracePeriodMinutes={5}
          rulesApplied={false}
          targetZoneName="School"
        />
      )

      expect(screen.getByText('Moving to School')).toBeInTheDocument()
    })

    it('shows singular minute for 1 minute remaining', () => {
      render(
        <LocationTransitionBanner
          currentZoneName={null}
          inTransition={true}
          gracePeriodMinutes={1}
          rulesApplied={false}
          targetZoneName="School"
        />
      )

      expect(screen.getByText(/1 minute/)).toBeInTheDocument()
    })

    it('shows plural minutes for multiple minutes', () => {
      render(
        <LocationTransitionBanner
          currentZoneName={null}
          inTransition={true}
          gracePeriodMinutes={3}
          rulesApplied={false}
          targetZoneName="School"
        />
      )

      expect(screen.getByText(/3 minutes/)).toBeInTheDocument()
    })

    it('uses alert role for accessibility', () => {
      render(
        <LocationTransitionBanner
          currentZoneName={null}
          inTransition={true}
          gracePeriodMinutes={5}
          rulesApplied={false}
          targetZoneName="School"
        />
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('when rules have been applied', () => {
    it('shows applied message with zone name', () => {
      render(
        <LocationTransitionBanner
          currentZoneName="School"
          inTransition={false}
          gracePeriodMinutes={0}
          rulesApplied={true}
          targetZoneName={null}
        />
      )

      expect(screen.getByText('At School')).toBeInTheDocument()
      expect(screen.getByText(/rules have been updated/i)).toBeInTheDocument()
    })

    it('shows checkmark icon', () => {
      render(
        <LocationTransitionBanner
          currentZoneName="School"
          inTransition={false}
          gracePeriodMinutes={0}
          rulesApplied={true}
          targetZoneName={null}
        />
      )

      expect(screen.getByText('✅')).toBeInTheDocument()
    })
  })

  describe('when location is unknown', () => {
    it('shows unknown location message', () => {
      render(
        <LocationTransitionBanner
          currentZoneName={null}
          inTransition={false}
          gracePeriodMinutes={0}
          rulesApplied={false}
          targetZoneName={null}
        />
      )

      expect(screen.getByText('Location Unknown')).toBeInTheDocument()
      expect(screen.getByText(/can't tell where you are/i)).toBeInTheDocument()
    })

    it('mentions using normal rules', () => {
      render(
        <LocationTransitionBanner
          currentZoneName={null}
          inTransition={false}
          gracePeriodMinutes={0}
          rulesApplied={false}
          targetZoneName={null}
        />
      )

      expect(screen.getByText(/normal rules/i)).toBeInTheDocument()
    })
  })
})
