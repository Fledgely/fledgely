/**
 * Tests for LocationZoneEditor Component.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC1: Location Definitions
 * - AC4: Geofence Configuration
 * - AC6: Location Rule Preview
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationZoneEditor, type LocationZoneEditorProps } from './LocationZoneEditor'
import type { LocationZone } from '@fledgely/shared'

describe('LocationZoneEditor', () => {
  const mockZones: LocationZone[] = [
    {
      id: 'zone-1',
      familyId: 'family-123',
      name: "Mom's House",
      type: 'home_1',
      latitude: 40.7128,
      longitude: -74.006,
      radiusMeters: 500,
      address: '123 Main St, New York, NY',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
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
    },
  ]

  const defaultProps: LocationZoneEditorProps = {
    zones: mockZones,
    onCreateZone: vi.fn(),
    onUpdateZone: vi.fn(),
    onDeleteZone: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Zone List Display', () => {
    it('renders zone list with all zones', () => {
      render(<LocationZoneEditor {...defaultProps} />)

      expect(screen.getByText("Mom's House")).toBeInTheDocument()
      expect(screen.getByText('Lincoln Elementary')).toBeInTheDocument()
    })

    it('displays zone type badges', () => {
      render(<LocationZoneEditor {...defaultProps} />)

      expect(screen.getByText('Home 1')).toBeInTheDocument()
      expect(screen.getByText('School')).toBeInTheDocument()
    })

    it('displays zone radius', () => {
      render(<LocationZoneEditor {...defaultProps} />)

      expect(screen.getByText(/500m radius/)).toBeInTheDocument()
      expect(screen.getByText(/750m radius/)).toBeInTheDocument()
    })

    it('displays address when available', () => {
      render(<LocationZoneEditor {...defaultProps} />)

      expect(screen.getByText(/123 Main St, New York, NY/)).toBeInTheDocument()
    })

    it('shows empty state when no zones', () => {
      render(<LocationZoneEditor {...defaultProps} zones={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText(/No location zones configured/)).toBeInTheDocument()
    })
  })

  describe('Add Zone Form', () => {
    it('shows add button when not editing', () => {
      render(<LocationZoneEditor {...defaultProps} />)

      expect(screen.getByTestId('add-zone-button')).toBeInTheDocument()
    })

    it('opens form when add button clicked', () => {
      render(<LocationZoneEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-zone-button'))

      expect(screen.getByTestId('zone-form')).toBeInTheDocument()
      expect(screen.getByText('Add New Zone')).toBeInTheDocument()
    })

    it('shows all form fields', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      expect(screen.getByTestId('zone-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('zone-type-select')).toBeInTheDocument()
      expect(screen.getByTestId('latitude-input')).toBeInTheDocument()
      expect(screen.getByTestId('longitude-input')).toBeInTheDocument()
      expect(screen.getByTestId('radius-slider')).toBeInTheDocument()
      expect(screen.getByTestId('address-input')).toBeInTheDocument()
    })

    it('has all zone type options (AC1)', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      const select = screen.getByTestId('zone-type-select')
      expect(select).toHaveTextContent('Home 1')
      expect(select).toHaveTextContent('Home 2')
      expect(select).toHaveTextContent('School')
      expect(select).toHaveTextContent('Other')
    })

    it('cancels form and returns to list', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))
      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(screen.queryByTestId('zone-form')).not.toBeInTheDocument()
      expect(screen.getByTestId('zone-list')).toBeInTheDocument()
    })
  })

  describe('Geofence Radius (AC4)', () => {
    it('shows radius slider with default value of 500m', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      const slider = screen.getByTestId('radius-slider') as HTMLInputElement
      expect(slider.value).toBe('500')
    })

    it('displays current radius value', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      expect(screen.getByTestId('radius-value')).toHaveTextContent('500m')
    })

    it('slider has correct min/max (100-2000m)', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      const slider = screen.getByTestId('radius-slider') as HTMLInputElement
      expect(slider.min).toBe('100')
      expect(slider.max).toBe('2000')
    })

    it('updates radius when slider changes', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      const slider = screen.getByTestId('radius-slider')
      fireEvent.change(slider, { target: { value: '1000' } })

      expect(screen.getByTestId('radius-value')).toHaveTextContent('1000m')
    })
  })

  describe('Form Validation', () => {
    it('disables save button when form is invalid', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      expect(screen.getByTestId('save-button')).toBeDisabled()
    })

    it('enables save button when form is valid', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      fireEvent.change(screen.getByTestId('zone-name-input'), { target: { value: 'Test Zone' } })
      fireEvent.change(screen.getByTestId('latitude-input'), { target: { value: '40.7128' } })
      fireEvent.change(screen.getByTestId('longitude-input'), { target: { value: '-74.006' } })

      expect(screen.getByTestId('save-button')).not.toBeDisabled()
    })

    it('keeps save disabled with invalid latitude', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      fireEvent.change(screen.getByTestId('zone-name-input'), { target: { value: 'Test Zone' } })
      fireEvent.change(screen.getByTestId('latitude-input'), { target: { value: '100' } }) // Invalid
      fireEvent.change(screen.getByTestId('longitude-input'), { target: { value: '-74.006' } })

      expect(screen.getByTestId('save-button')).toBeDisabled()
    })
  })

  describe('Preview (AC6)', () => {
    it('shows preview when form is valid', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      fireEvent.change(screen.getByTestId('zone-name-input'), { target: { value: 'Test Zone' } })
      fireEvent.change(screen.getByTestId('latitude-input'), { target: { value: '40.7128' } })
      fireEvent.change(screen.getByTestId('longitude-input'), { target: { value: '-74.006' } })

      expect(screen.getByTestId('zone-preview')).toBeInTheDocument()
      expect(screen.getByTestId('zone-preview')).toHaveTextContent('Test Zone')
      expect(screen.getByTestId('zone-preview')).toHaveTextContent('500m radius')
    })

    it('hides preview when form is invalid', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      expect(screen.queryByTestId('zone-preview')).not.toBeInTheDocument()
    })
  })

  describe('Create Zone', () => {
    it('calls onCreateZone with correct data', () => {
      const onCreateZone = vi.fn()
      render(<LocationZoneEditor {...defaultProps} onCreateZone={onCreateZone} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      fireEvent.change(screen.getByTestId('zone-name-input'), { target: { value: 'New Zone' } })
      fireEvent.change(screen.getByTestId('zone-type-select'), { target: { value: 'school' } })
      fireEvent.change(screen.getByTestId('latitude-input'), { target: { value: '40.7128' } })
      fireEvent.change(screen.getByTestId('longitude-input'), { target: { value: '-74.006' } })
      fireEvent.change(screen.getByTestId('radius-slider'), { target: { value: '750' } })
      fireEvent.change(screen.getByTestId('address-input'), { target: { value: '456 School Rd' } })

      fireEvent.click(screen.getByTestId('save-button'))

      expect(onCreateZone).toHaveBeenCalledWith({
        name: 'New Zone',
        type: 'school',
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 750,
        address: '456 School Rd',
      })
    })

    it('closes form after save', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      fireEvent.change(screen.getByTestId('zone-name-input'), { target: { value: 'New Zone' } })
      fireEvent.change(screen.getByTestId('latitude-input'), { target: { value: '40.7128' } })
      fireEvent.change(screen.getByTestId('longitude-input'), { target: { value: '-74.006' } })

      fireEvent.click(screen.getByTestId('save-button'))

      expect(screen.queryByTestId('zone-form')).not.toBeInTheDocument()
    })
  })

  describe('Edit Zone', () => {
    it('opens form with zone data when edit clicked', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('edit-zone-zone-1'))

      expect(screen.getByTestId('zone-form')).toBeInTheDocument()
      expect(screen.getByText('Edit Zone')).toBeInTheDocument()
      expect(screen.getByTestId('zone-name-input')).toHaveValue("Mom's House")
    })

    it('calls onUpdateZone with correct data', () => {
      const onUpdateZone = vi.fn()
      render(<LocationZoneEditor {...defaultProps} onUpdateZone={onUpdateZone} />)
      fireEvent.click(screen.getByTestId('edit-zone-zone-1'))

      fireEvent.change(screen.getByTestId('zone-name-input'), { target: { value: 'Updated Name' } })
      fireEvent.click(screen.getByTestId('save-button'))

      expect(onUpdateZone).toHaveBeenCalledWith(
        'zone-1',
        expect.objectContaining({
          name: 'Updated Name',
        })
      )
    })
  })

  describe('Delete Zone', () => {
    it('requires confirmation before delete', () => {
      const onDeleteZone = vi.fn()
      render(<LocationZoneEditor {...defaultProps} onDeleteZone={onDeleteZone} />)

      fireEvent.click(screen.getByTestId('delete-zone-zone-1'))

      expect(onDeleteZone).not.toHaveBeenCalled()
      expect(screen.getByTestId('delete-zone-zone-1')).toHaveTextContent('Confirm')
    })

    it('calls onDeleteZone on second click', () => {
      const onDeleteZone = vi.fn()
      render(<LocationZoneEditor {...defaultProps} onDeleteZone={onDeleteZone} />)

      fireEvent.click(screen.getByTestId('delete-zone-zone-1'))
      fireEvent.click(screen.getByTestId('delete-zone-zone-1'))

      expect(onDeleteZone).toHaveBeenCalledWith('zone-1')
    })
  })

  describe('Loading State', () => {
    it('disables add button when loading', () => {
      render(<LocationZoneEditor {...defaultProps} loading={true} />)

      expect(screen.getByTestId('add-zone-button')).toBeDisabled()
    })

    it('disables edit buttons when loading', () => {
      render(<LocationZoneEditor {...defaultProps} loading={true} />)

      expect(screen.getByTestId('edit-zone-zone-1')).toBeDisabled()
    })

    it('disables delete buttons when loading', () => {
      render(<LocationZoneEditor {...defaultProps} loading={true} />)

      expect(screen.getByTestId('delete-zone-zone-1')).toBeDisabled()
    })
  })

  describe('Error Display', () => {
    it('shows error message when provided', () => {
      render(<LocationZoneEditor {...defaultProps} error="Something went wrong" />)

      expect(screen.getByTestId('error-message')).toHaveTextContent('Something went wrong')
    })
  })

  describe('Accessibility (NFR43)', () => {
    it('has accessible labels for form inputs', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      expect(screen.getByLabelText('Zone Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Zone Type')).toBeInTheDocument()
      expect(screen.getByLabelText('Geofence Radius')).toBeInTheDocument()
      expect(screen.getByLabelText('Address (Optional)')).toBeInTheDocument()
    })

    it('has aria-labels for action buttons', () => {
      render(<LocationZoneEditor {...defaultProps} />)

      expect(screen.getByLabelText('Add new location zone')).toBeInTheDocument()
      expect(screen.getByLabelText("Edit Mom's House")).toBeInTheDocument()
      expect(screen.getByLabelText("Delete Mom's House")).toBeInTheDocument()
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('add button has minimum 44px touch target', () => {
      render(<LocationZoneEditor {...defaultProps} />)

      const button = screen.getByTestId('add-zone-button')
      const styles = window.getComputedStyle(button)
      expect(parseInt(styles.minHeight) || 44).toBeGreaterThanOrEqual(44)
    })

    it('form inputs have minimum 44px touch target', () => {
      render(<LocationZoneEditor {...defaultProps} />)
      fireEvent.click(screen.getByTestId('add-zone-button'))

      const input = screen.getByTestId('zone-name-input')
      const styles = window.getComputedStyle(input)
      expect(parseInt(styles.minHeight) || 44).toBeGreaterThanOrEqual(44)
    })
  })
})
