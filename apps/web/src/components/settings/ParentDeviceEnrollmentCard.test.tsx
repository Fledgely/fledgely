/**
 * ParentDeviceEnrollmentCard Component Tests - Story 32.2
 *
 * Tests for parent device enrollment UI component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ParentDeviceEnrollmentCard } from './ParentDeviceEnrollmentCard'

// Mock the hooks
const mockEnrollDevice = vi.fn().mockResolvedValue(undefined)
const mockRemoveDevice = vi.fn().mockResolvedValue(undefined)

vi.mock('../../hooks/useParentDeviceEnrollment', () => ({
  useParentDeviceEnrollment: vi.fn(() => ({
    myDevices: [],
    otherParentDevices: [],
    loading: false,
    saving: false,
    error: null,
    enrollDevice: mockEnrollDevice,
    removeDevice: mockRemoveDevice,
  })),
}))

vi.mock('../../contexts/FamilyContext', () => ({
  useFamily: vi.fn(() => ({
    familyId: 'family-123',
    family: {
      guardians: [{ uid: 'parent-1' }, { uid: 'parent-2' }],
    },
  })),
}))

import { useParentDeviceEnrollment } from '../../hooks/useParentDeviceEnrollment'

describe('ParentDeviceEnrollmentCard - Story 32.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders nothing when offline schedule is disabled', () => {
      const { container } = render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={false} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders enrollment card when offline schedule is enabled', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('parent-device-enrollment-card')).toBeInTheDocument()
    })

    it('displays encouraging description (AC6)', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      const description = screen.getByTestId('enrollment-description')
      expect(description).toBeInTheDocument()
      expect(description.textContent).toContain('Lead by example')
    })

    it('shows loading state', () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [],
        otherParentDevices: [],
        loading: true,
        saving: false,
        error: null,
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('enrollment-loading')).toBeInTheDocument()
    })

    it('displays error message when present', () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [],
        otherParentDevices: [],
        loading: false,
        saving: false,
        error: 'Something went wrong',
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('enrollment-error')).toHaveTextContent('Something went wrong')
    })
  })

  describe('Add device form (AC1)', () => {
    it('renders device name input', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('device-name-input')).toBeInTheDocument()
    })

    it('renders device type selector', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('device-type-select')).toBeInTheDocument()
    })

    it('renders enroll button', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('enroll-button')).toBeInTheDocument()
    })

    it('disables enroll button when device name is empty', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      const button = screen.getByTestId('enroll-button')
      expect(button).toBeDisabled()
    })

    it('enables enroll button when device name is entered', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      const input = screen.getByTestId('device-name-input')
      fireEvent.change(input, { target: { value: 'My iPhone' } })

      const button = screen.getByTestId('enroll-button')
      expect(button).not.toBeDisabled()
    })

    it('calls enrollDevice with correct params on submit', async () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)

      const input = screen.getByTestId('device-name-input')
      const select = screen.getByTestId('device-type-select')
      const button = screen.getByTestId('enroll-button')

      fireEvent.change(input, { target: { value: 'My iPad' } })
      fireEvent.change(select, { target: { value: 'tablet' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockEnrollDevice).toHaveBeenCalledWith({
          deviceName: 'My iPad',
          deviceType: 'tablet',
        })
      })
    })

    it('clears form after successful enrollment', async () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)

      const input = screen.getByTestId('device-name-input')
      fireEvent.change(input, { target: { value: 'My Phone' } })
      fireEvent.click(screen.getByTestId('enroll-button'))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('shows all device type options', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      const select = screen.getByTestId('device-type-select')

      expect(select).toContainHTML('Phone')
      expect(select).toContainHTML('Tablet')
      expect(select).toContainHTML('Laptop')
      expect(select).toContainHTML('Desktop')
      expect(select).toContainHTML('Other')
    })
  })

  describe('My devices list (AC3)', () => {
    it('shows empty state when no devices enrolled', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('no-my-devices')).toBeInTheDocument()
      expect(screen.getByText('You have not enrolled any devices yet')).toBeInTheDocument()
    })

    it('displays enrolled devices', () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [
          {
            deviceId: 'device-1',
            parentUid: 'parent-1',
            deviceName: "Mom's iPhone",
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        otherParentDevices: [],
        loading: false,
        saving: false,
        error: null,
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('my-devices-list')).toBeInTheDocument()
      expect(screen.getByText("Mom's iPhone")).toBeInTheDocument()
    })

    it('shows remove button for each device', () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [
          {
            deviceId: 'device-1',
            parentUid: 'parent-1',
            deviceName: 'My Phone',
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        otherParentDevices: [],
        loading: false,
        saving: false,
        error: null,
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('remove-device-1')).toBeInTheDocument()
    })

    it('calls removeDevice when remove button clicked', async () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [
          {
            deviceId: 'device-1',
            parentUid: 'parent-1',
            deviceName: 'My Phone',
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        otherParentDevices: [],
        loading: false,
        saving: false,
        error: null,
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      fireEvent.click(screen.getByTestId('remove-device-1'))

      await waitFor(() => {
        expect(mockRemoveDevice).toHaveBeenCalledWith('device-1')
      })
    })
  })

  describe('Other parents devices (AC5)', () => {
    it('shows message when no other parents enrolled', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('no-other-devices')).toBeInTheDocument()
    })

    it('displays other parent devices with enrolled badge', () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [],
        otherParentDevices: [
          {
            deviceId: 'device-2',
            parentUid: 'parent-2',
            deviceName: "Dad's iPad",
            deviceType: 'tablet',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        loading: false,
        saving: false,
        error: null,
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('other-devices-list')).toBeInTheDocument()
      expect(screen.getByText("Dad's iPad")).toBeInTheDocument()
      expect(screen.getByText('✓ Enrolled')).toBeInTheDocument()
    })

    it('does not show remove button for other parent devices', () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [],
        otherParentDevices: [
          {
            deviceId: 'device-2',
            parentUid: 'parent-2',
            deviceName: "Dad's iPad",
            deviceType: 'tablet',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        loading: false,
        saving: false,
        error: null,
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.queryByTestId('remove-device-2')).not.toBeInTheDocument()
    })
  })

  describe('Saving state', () => {
    it('shows saving text on button during save', () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [],
        otherParentDevices: [],
        loading: false,
        saving: true,
        error: null,
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      const input = screen.getByTestId('device-name-input')
      fireEvent.change(input, { target: { value: 'My Phone' } })

      expect(screen.getByTestId('enroll-button')).toHaveTextContent('Enrolling...')
    })

    it('disables enroll button during save', () => {
      vi.mocked(useParentDeviceEnrollment).mockReturnValue({
        myDevices: [],
        otherParentDevices: [],
        loading: false,
        saving: true,
        error: null,
        enrollment: null,
        enrollDevice: mockEnrollDevice,
        removeDevice: mockRemoveDevice,
      })

      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      const input = screen.getByTestId('device-name-input')
      fireEvent.change(input, { target: { value: 'My Phone' } })

      expect(screen.getByTestId('enroll-button')).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has aria-label on device name input', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('device-name-input')).toHaveAttribute('aria-label', 'Device name')
    })

    it('has aria-label on device type select', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('device-type-select')).toHaveAttribute('aria-label', 'Device type')
    })

    it('has aria-label on enroll button', () => {
      render(<ParentDeviceEnrollmentCard offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('enroll-button')).toHaveAttribute('aria-label', 'Enroll device')
    })
  })
})
