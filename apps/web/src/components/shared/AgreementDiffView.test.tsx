/**
 * AgreementDiffView Component Tests - Story 34.1
 *
 * Tests for diff visualization of agreement changes.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgreementDiffView } from './AgreementDiffView'
import type { ProposalChange } from '@fledgely/shared'

describe('AgreementDiffView - Story 34.1', () => {
  const singleChange: ProposalChange = {
    sectionId: 'time-limits',
    sectionName: 'Time Limits',
    fieldPath: 'timeLimits.weekday.gaming',
    oldValue: 60,
    newValue: 90,
    changeType: 'modify',
  }

  describe('change display', () => {
    it('should display section name', () => {
      render(<AgreementDiffView changes={[singleChange]} />)

      expect(screen.getByText('Time Limits')).toBeInTheDocument()
    })

    it('should display field path in readable format', () => {
      render(<AgreementDiffView changes={[singleChange]} />)

      expect(screen.getByText(/weekday.*gaming/i)).toBeInTheDocument()
    })

    it('should display old value', () => {
      render(<AgreementDiffView changes={[singleChange]} />)

      expect(screen.getByText('60')).toBeInTheDocument()
    })

    it('should display new value', () => {
      render(<AgreementDiffView changes={[singleChange]} />)

      expect(screen.getByText('90')).toBeInTheDocument()
    })
  })

  describe('color coding', () => {
    it('should show removal in red', () => {
      const removeChange: ProposalChange = {
        ...singleChange,
        newValue: null,
        changeType: 'remove',
      }
      render(<AgreementDiffView changes={[removeChange]} />)

      const oldValueElement = screen.getByTestId('old-value-0')
      expect(oldValueElement).toHaveStyle({ color: 'rgb(220, 38, 38)' })
    })

    it('should show addition in green', () => {
      const addChange: ProposalChange = {
        ...singleChange,
        oldValue: null,
        changeType: 'add',
      }
      render(<AgreementDiffView changes={[addChange]} />)

      const newValueElement = screen.getByTestId('new-value-0')
      expect(newValueElement).toHaveStyle({ color: 'rgb(22, 163, 74)' })
    })

    it('should show modification with both colors', () => {
      render(<AgreementDiffView changes={[singleChange]} />)

      const oldValueElement = screen.getByTestId('old-value-0')
      const newValueElement = screen.getByTestId('new-value-0')

      expect(oldValueElement).toHaveStyle({ color: 'rgb(220, 38, 38)' })
      expect(newValueElement).toHaveStyle({ color: 'rgb(22, 163, 74)' })
    })
  })

  describe('multiple changes', () => {
    it('should display all changes', () => {
      const changes: ProposalChange[] = [
        singleChange,
        {
          sectionId: 'app-restrictions',
          sectionName: 'App Restrictions',
          fieldPath: 'apps.blocked',
          oldValue: ['TikTok'],
          newValue: ['TikTok', 'Instagram'],
          changeType: 'modify',
        },
      ]

      render(<AgreementDiffView changes={changes} />)

      expect(screen.getByText('Time Limits')).toBeInTheDocument()
      expect(screen.getByText('App Restrictions')).toBeInTheDocument()
    })

    it('should group changes by section', () => {
      const changes: ProposalChange[] = [
        singleChange,
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekend.gaming',
          oldValue: 120,
          newValue: 180,
          changeType: 'modify',
        },
      ]

      render(<AgreementDiffView changes={changes} />)

      // Should only show "Time Limits" once as a heading
      const headings = screen.getAllByText('Time Limits')
      expect(headings).toHaveLength(1)
    })
  })

  describe('complex values', () => {
    it('should display arrays properly', () => {
      const arrayChange: ProposalChange = {
        sectionId: 'apps',
        sectionName: 'Apps',
        fieldPath: 'blocked',
        oldValue: ['TikTok'],
        newValue: ['TikTok', 'Instagram'],
        changeType: 'modify',
      }

      render(<AgreementDiffView changes={[arrayChange]} />)

      // Both old and new values contain "TikTok"
      const tikTokElements = screen.getAllByText(/TikTok/)
      expect(tikTokElements.length).toBeGreaterThan(0)
      expect(screen.getByText(/Instagram/)).toBeInTheDocument()
    })

    it('should display objects properly', () => {
      const objectChange: ProposalChange = {
        sectionId: 'time-limits',
        sectionName: 'Time Limits',
        fieldPath: 'weekday',
        oldValue: { gaming: 60, social: 30 },
        newValue: { gaming: 90, social: 45 },
        changeType: 'modify',
      }

      render(<AgreementDiffView changes={[objectChange]} />)

      expect(screen.getByText(/gaming.*60/)).toBeInTheDocument()
      expect(screen.getByText(/gaming.*90/)).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show message when no changes', () => {
      render(<AgreementDiffView changes={[]} />)

      expect(screen.getByText(/no changes/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible change descriptions', () => {
      render(<AgreementDiffView changes={[singleChange]} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })
})
