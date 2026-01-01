/**
 * ChildEnrolledDevicesCard Component Tests - Story 32.2
 *
 * Tests for child-facing enrolled devices display.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildEnrolledDevicesCard, type ParentInfo } from './ChildEnrolledDevicesCard'
import type { ParentEnrolledDevice } from '@fledgely/shared'

describe('ChildEnrolledDevicesCard - Story 32.2', () => {
  const mockParents: ParentInfo[] = [
    { uid: 'parent-1', displayName: 'Mom' },
    { uid: 'parent-2', displayName: 'Dad' },
  ]

  const mockDevices: ParentEnrolledDevice[] = [
    {
      deviceId: 'device-1',
      parentUid: 'parent-1',
      deviceName: "Mom's iPhone",
      deviceType: 'phone',
      enrolledAt: Date.now(),
      active: true,
    },
    {
      deviceId: 'device-2',
      parentUid: 'parent-2',
      deviceName: "Dad's iPad",
      deviceType: 'tablet',
      enrolledAt: Date.now(),
      active: true,
    },
  ]

  describe('Rendering', () => {
    it('renders nothing when offline schedule is disabled', () => {
      const { container } = render(
        <ChildEnrolledDevicesCard enrolledDevices={mockDevices} offlineScheduleEnabled={false} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders card when offline schedule is enabled', () => {
      render(
        <ChildEnrolledDevicesCard enrolledDevices={mockDevices} offlineScheduleEnabled={true} />
      )
      expect(screen.getByTestId('child-enrolled-devices-card')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      render(
        <ChildEnrolledDevicesCard
          enrolledDevices={[]}
          offlineScheduleEnabled={true}
          loading={true}
        />
      )
      expect(screen.getByTestId('enrolled-devices-loading')).toBeInTheDocument()
    })
  })

  describe('Enrolled devices display (AC2, AC3)', () => {
    it('displays enrolled device names', () => {
      render(
        <ChildEnrolledDevicesCard enrolledDevices={mockDevices} offlineScheduleEnabled={true} />
      )
      expect(screen.getByText(/Mom's iPhone/)).toBeInTheDocument()
      expect(screen.getByText(/Dad's iPad/)).toBeInTheDocument()
    })

    it('shows device type labels', () => {
      render(
        <ChildEnrolledDevicesCard enrolledDevices={mockDevices} offlineScheduleEnabled={true} />
      )
      expect(screen.getByText(/Phone/)).toBeInTheDocument()
      expect(screen.getByText(/Tablet/)).toBeInTheDocument()
    })

    it('shows checkmark for each enrolled device', () => {
      render(
        <ChildEnrolledDevicesCard enrolledDevices={mockDevices} offlineScheduleEnabled={true} />
      )
      const checkmarks = screen.getAllByTestId('enrolled-checkmark')
      expect(checkmarks).toHaveLength(2)
    })

    it('displays enrolled devices list', () => {
      render(
        <ChildEnrolledDevicesCard enrolledDevices={mockDevices} offlineScheduleEnabled={true} />
      )
      expect(screen.getByTestId('enrolled-devices-list')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('shows message when no devices enrolled', () => {
      render(<ChildEnrolledDevicesCard enrolledDevices={[]} offlineScheduleEnabled={true} />)
      expect(screen.getByTestId('no-enrolled-devices')).toBeInTheDocument()
      expect(screen.getByText('No parent devices enrolled yet')).toBeInTheDocument()
    })
  })

  describe('Inactive devices filtering', () => {
    it('filters out inactive devices', () => {
      const mixedDevices: ParentEnrolledDevice[] = [
        {
          deviceId: 'device-1',
          parentUid: 'parent-1',
          deviceName: 'Active Phone',
          deviceType: 'phone',
          enrolledAt: Date.now(),
          active: true,
        },
        {
          deviceId: 'device-2',
          parentUid: 'parent-1',
          deviceName: 'Inactive Phone',
          deviceType: 'phone',
          enrolledAt: Date.now(),
          active: false,
        },
      ]

      render(
        <ChildEnrolledDevicesCard enrolledDevices={mixedDevices} offlineScheduleEnabled={true} />
      )

      expect(screen.getByText(/Active Phone/)).toBeInTheDocument()
      expect(screen.queryByText(/Inactive Phone/)).not.toBeInTheDocument()
    })
  })

  describe('Messaging', () => {
    it('displays encouraging message about parents following offline time', () => {
      render(
        <ChildEnrolledDevicesCard enrolledDevices={mockDevices} offlineScheduleEnabled={true} />
      )
      expect(screen.getByTestId('enrolled-message')).toBeInTheDocument()
      expect(screen.getByText(/parent devices are enrolled/)).toBeInTheDocument()
    })

    it('shows family together message when ALL parents have enrolled', () => {
      render(
        <ChildEnrolledDevicesCard
          enrolledDevices={mockDevices}
          offlineScheduleEnabled={true}
          familyParents={mockParents}
        />
      )
      expect(screen.getByTestId('family-together-message')).toBeInTheDocument()
      expect(screen.getByText(/All parents/)).toBeInTheDocument()
    })

    it('does not show family together message when familyParents not provided', () => {
      render(
        <ChildEnrolledDevicesCard enrolledDevices={mockDevices} offlineScheduleEnabled={true} />
      )
      expect(screen.queryByTestId('family-together-message')).not.toBeInTheDocument()
    })

    it('does not show family together message when no devices enrolled', () => {
      render(
        <ChildEnrolledDevicesCard
          enrolledDevices={[]}
          offlineScheduleEnabled={true}
          familyParents={mockParents}
        />
      )
      expect(screen.queryByTestId('family-together-message')).not.toBeInTheDocument()
    })
  })

  describe('Different device types', () => {
    it('displays correct icons for different device types', () => {
      const allTypesDevices: ParentEnrolledDevice[] = [
        {
          deviceId: 'device-1',
          parentUid: 'parent-1',
          deviceName: 'My Phone',
          deviceType: 'phone',
          enrolledAt: Date.now(),
          active: true,
        },
        {
          deviceId: 'device-2',
          parentUid: 'parent-1',
          deviceName: 'My Tablet',
          deviceType: 'tablet',
          enrolledAt: Date.now(),
          active: true,
        },
        {
          deviceId: 'device-3',
          parentUid: 'parent-1',
          deviceName: 'My Laptop',
          deviceType: 'laptop',
          enrolledAt: Date.now(),
          active: true,
        },
      ]

      render(
        <ChildEnrolledDevicesCard enrolledDevices={allTypesDevices} offlineScheduleEnabled={true} />
      )

      const deviceItems = screen.getAllByTestId('enrolled-device-item')
      expect(deviceItems).toHaveLength(3)
    })
  })

  describe('Non-enrolled parents (AC5)', () => {
    it('shows non-enrolled parent names when only some parents enrolled', () => {
      const oneDeviceOnly: ParentEnrolledDevice[] = [
        {
          deviceId: 'device-1',
          parentUid: 'parent-1',
          deviceName: "Mom's iPhone",
          deviceType: 'phone',
          enrolledAt: Date.now(),
          active: true,
        },
      ]

      render(
        <ChildEnrolledDevicesCard
          enrolledDevices={oneDeviceOnly}
          offlineScheduleEnabled={true}
          familyParents={mockParents}
        />
      )

      expect(screen.getByTestId('not-enrolled-parents')).toBeInTheDocument()
      expect(screen.getByText(/Dad/)).toBeInTheDocument()
      expect(screen.getByText(/has not enrolled yet/)).toBeInTheDocument()
    })

    it('does not show not-enrolled message when all parents enrolled', () => {
      render(
        <ChildEnrolledDevicesCard
          enrolledDevices={mockDevices}
          offlineScheduleEnabled={true}
          familyParents={mockParents}
        />
      )

      expect(screen.queryByTestId('not-enrolled-parents')).not.toBeInTheDocument()
    })

    it('handles plural parents who have not enrolled', () => {
      const threeParents: ParentInfo[] = [
        { uid: 'parent-1', displayName: 'Mom' },
        { uid: 'parent-2', displayName: 'Dad' },
        { uid: 'parent-3', displayName: 'Grandma' },
      ]
      const oneDeviceOnly: ParentEnrolledDevice[] = [
        {
          deviceId: 'device-1',
          parentUid: 'parent-1',
          deviceName: "Mom's iPhone",
          deviceType: 'phone',
          enrolledAt: Date.now(),
          active: true,
        },
      ]

      render(
        <ChildEnrolledDevicesCard
          enrolledDevices={oneDeviceOnly}
          offlineScheduleEnabled={true}
          familyParents={threeParents}
        />
      )

      expect(screen.getByText(/have not enrolled yet/)).toBeInTheDocument()
    })
  })
})
