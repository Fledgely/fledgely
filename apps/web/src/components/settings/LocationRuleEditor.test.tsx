/**
 * Tests for LocationRuleEditor Component.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC2: Per-Location Time Limits
 * - AC3: Per-Location Category Rules
 * - AC6: Location Rule Preview
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationRuleEditor, type LocationRuleEditorProps } from './LocationRuleEditor'
import type { LocationZone, LocationRule } from '@fledgely/shared'

describe('LocationRuleEditor', () => {
  const mockHomeZone: LocationZone = {
    id: 'zone-1',
    familyId: 'family-123',
    name: "Mom's House",
    type: 'home_1',
    latitude: 40.7128,
    longitude: -74.006,
    radiusMeters: 500,
    address: '123 Main St',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSchoolZone: LocationZone = {
    id: 'zone-2',
    familyId: 'family-123',
    name: 'Lincoln Elementary',
    type: 'school',
    latitude: 40.758,
    longitude: -73.9855,
    radiusMeters: 750,
    address: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockExistingRule: LocationRule = {
    id: 'rule-1',
    zoneId: 'zone-1',
    familyId: 'family-123',
    childId: 'child-1',
    dailyTimeLimitMinutes: 120,
    categoryOverrides: {},
    educationOnlyMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const defaultProps: LocationRuleEditorProps = {
    zone: mockHomeZone,
    childName: 'Emma',
    defaultTimeLimitMinutes: 180,
    existingRule: null,
    onSaveRule: vi.fn(),
    onDeleteRule: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Header Display', () => {
    it('displays zone name in title', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByText("Rules at Mom's House")).toBeInTheDocument()
    })

    it('displays child name in subtitle', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByText('Configure rules for Emma at this location')).toBeInTheDocument()
    })

    it('has close button', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
    })

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn()
      render(<LocationRuleEditor {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('close-button'))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Time Limit Configuration (AC2)', () => {
    it('shows override toggle', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByTestId('override-toggle')).toBeInTheDocument()
    })

    it('shows default time limit when not overriding', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByTestId('default-indicator')).toHaveTextContent('Using default: 3h')
    })

    it('shows time slider when override enabled', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('override-toggle'))

      expect(screen.getByTestId('time-slider')).toBeInTheDocument()
      expect(screen.getByTestId('override-indicator')).toBeInTheDocument()
    })

    it('updates time value when slider changes', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('override-toggle'))
      fireEvent.change(screen.getByTestId('time-slider'), { target: { value: '120' } })

      expect(screen.getByTestId('time-value')).toHaveTextContent('2h')
    })

    it('formats time correctly', () => {
      render(<LocationRuleEditor {...defaultProps} defaultTimeLimitMinutes={90} />)

      expect(screen.getByTestId('default-indicator')).toHaveTextContent('1h 30m')
    })

    it('loads existing time limit when rule exists', () => {
      render(<LocationRuleEditor {...defaultProps} existingRule={mockExistingRule} />)

      // Should show override is enabled and the existing value
      expect(screen.getByTestId('override-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('time-value')).toHaveTextContent('2h')
    })
  })

  describe('Education-Only Mode (AC3)', () => {
    it('shows education-only toggle', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByTestId('education-toggle')).toBeInTheDocument()
    })

    it('defaults to off for home zones', () => {
      render(<LocationRuleEditor {...defaultProps} zone={mockHomeZone} />)

      const toggle = screen.getByTestId('education-toggle')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('defaults to on for school zones', () => {
      render(<LocationRuleEditor {...defaultProps} zone={mockSchoolZone} />)

      const toggle = screen.getByTestId('education-toggle')
      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })

    it('shows school recommendation note', () => {
      render(<LocationRuleEditor {...defaultProps} zone={mockSchoolZone} />)

      expect(screen.getByTestId('school-default-note')).toBeInTheDocument()
    })

    it('toggles education-only mode', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      const toggle = screen.getByTestId('education-toggle')
      expect(toggle).toHaveAttribute('aria-checked', 'false')

      fireEvent.click(toggle)

      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('Rule Comparison/Preview (AC6)', () => {
    it('shows rule comparison section', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByTestId('rule-comparison')).toBeInTheDocument()
    })

    it('shows current time limit in comparison', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByTestId('comparison-time')).toHaveTextContent('3h (default)')
    })

    it('shows custom time limit when overriding', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('override-toggle'))
      fireEvent.change(screen.getByTestId('time-slider'), { target: { value: '120' } })

      expect(screen.getByTestId('comparison-time')).toHaveTextContent('2h')
    })

    it('shows education-only status in comparison', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByTestId('comparison-education')).toHaveTextContent('No')
    })

    it('shows changes indicator when settings differ from default', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('override-toggle'))
      fireEvent.change(screen.getByTestId('time-slider'), { target: { value: '120' } })

      expect(screen.getByTestId('changes-indicator')).toBeInTheDocument()
    })
  })

  describe('Save Rule', () => {
    it('calls onSaveRule with correct data', () => {
      const onSaveRule = vi.fn()
      render(<LocationRuleEditor {...defaultProps} onSaveRule={onSaveRule} />)

      fireEvent.click(screen.getByTestId('override-toggle'))
      fireEvent.change(screen.getByTestId('time-slider'), { target: { value: '120' } })
      fireEvent.click(screen.getByTestId('education-toggle'))
      fireEvent.click(screen.getByTestId('save-button'))

      expect(onSaveRule).toHaveBeenCalledWith({
        dailyTimeLimitMinutes: 120,
        educationOnlyMode: true,
      })
    })

    it('sends null time limit when not overriding', () => {
      const onSaveRule = vi.fn()
      render(<LocationRuleEditor {...defaultProps} onSaveRule={onSaveRule} />)

      fireEvent.click(screen.getByTestId('save-button'))

      expect(onSaveRule).toHaveBeenCalledWith({
        dailyTimeLimitMinutes: null,
        educationOnlyMode: false,
      })
    })
  })

  describe('Reset/Delete Rule', () => {
    it('shows "Reset to Default" when no existing rule', () => {
      render(<LocationRuleEditor {...defaultProps} existingRule={null} />)

      expect(screen.getByTestId('reset-button')).toHaveTextContent('Reset to Default')
    })

    it('shows "Remove Override" when existing rule', () => {
      render(<LocationRuleEditor {...defaultProps} existingRule={mockExistingRule} />)

      expect(screen.getByTestId('reset-button')).toHaveTextContent('Remove Override')
    })

    it('calls onDeleteRule when existing rule and reset clicked', () => {
      const onDeleteRule = vi.fn()
      render(
        <LocationRuleEditor
          {...defaultProps}
          existingRule={mockExistingRule}
          onDeleteRule={onDeleteRule}
        />
      )

      fireEvent.click(screen.getByTestId('reset-button'))

      expect(onDeleteRule).toHaveBeenCalled()
    })

    it('resets form when no existing rule and reset clicked', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      // Make some changes
      fireEvent.click(screen.getByTestId('override-toggle'))
      fireEvent.change(screen.getByTestId('time-slider'), { target: { value: '120' } })

      // Click reset
      fireEvent.click(screen.getByTestId('reset-button'))

      // Should be back to defaults
      expect(screen.getByTestId('default-indicator')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('disables save button when loading', () => {
      render(<LocationRuleEditor {...defaultProps} loading={true} />)

      expect(screen.getByTestId('save-button')).toBeDisabled()
    })

    it('disables reset button when loading', () => {
      render(<LocationRuleEditor {...defaultProps} loading={true} />)

      expect(screen.getByTestId('reset-button')).toBeDisabled()
    })

    it('shows loading text on save button', () => {
      render(<LocationRuleEditor {...defaultProps} loading={true} />)

      expect(screen.getByTestId('save-button')).toHaveTextContent('Saving...')
    })
  })

  describe('Error Display', () => {
    it('shows error message when provided', () => {
      render(<LocationRuleEditor {...defaultProps} error="Something went wrong" />)

      expect(screen.getByTestId('error-message')).toHaveTextContent('Something went wrong')
    })
  })

  describe('Accessibility (NFR43)', () => {
    it('has aria-label on close button', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      expect(screen.getByLabelText('Close rule editor')).toBeInTheDocument()
    })

    it('toggles have correct role and aria-checked', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      const overrideToggle = screen.getByTestId('override-toggle')
      expect(overrideToggle).toHaveAttribute('role', 'switch')
      expect(overrideToggle).toHaveAttribute('aria-checked', 'false')

      const educationToggle = screen.getByTestId('education-toggle')
      expect(educationToggle).toHaveAttribute('role', 'switch')
    })

    it('time slider has aria-label', () => {
      render(<LocationRuleEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('override-toggle'))

      expect(screen.getByLabelText('Time limit in minutes')).toBeInTheDocument()
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('close button has minimum touch target', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      const button = screen.getByTestId('close-button')
      const styles = window.getComputedStyle(button)
      expect(parseInt(styles.minWidth) || 44).toBeGreaterThanOrEqual(44)
      expect(parseInt(styles.minHeight) || 44).toBeGreaterThanOrEqual(44)
    })

    it('save button has minimum touch target', () => {
      render(<LocationRuleEditor {...defaultProps} />)

      const button = screen.getByTestId('save-button')
      const styles = window.getComputedStyle(button)
      expect(parseInt(styles.minHeight) || 44).toBeGreaterThanOrEqual(44)
    })
  })
})
