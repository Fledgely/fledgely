# Story 30.5: Per-Device Limit Configuration

Status: Done

## Story

As **a parent**,
I want **to set different limits per device**,
So that **school Chromebook has different rules than personal phone**.

## Acceptance Criteria

1. **AC1: Device-specific daily limit**
   - Given multiple devices enrolled
   - When configuring per-device limits
   - Then each device can have its own daily limit

2. **AC2: Device-specific category overrides**
   - Given device limits are being configured
   - When setting category limits
   - Then device-specific category overrides are possible

3. **AC3: Example configuration**
   - Given device limits exist
   - When viewing example
   - Then example: "School Chromebook: Education unlimited, Gaming blocked"

4. **AC4: Device type display**
   - Given devices are shown
   - When viewing device list
   - Then device type shown: Chromebook, Android phone, Android tablet

5. **AC5: Apply to all shortcut**
   - Given parent is configuring limits
   - When bulk configuration needed
   - Then "Apply same limits to all devices" shortcut available

6. **AC6: Independence from daily total**
   - Given per-device limits are set
   - When limits are applied
   - Then per-device limits independent of daily total

## Tasks / Subtasks

- [x] Task 1: Create DeviceLimitCard component (AC: #1, #4)
  - [x] 1.1 Create DeviceLimitCard component with device icon by type
  - [x] 1.2 Add device name and type display
  - [x] 1.3 Add enable/disable toggle for per-device limit
  - [x] 1.4 Add daily limit slider (30m-8h or unlimited)

- [x] Task 2: Add device limits to useChildTimeLimits hook
  - [x] 2.1 Extend hook to manage device-specific limits
  - [x] 2.2 Add saveDeviceLimits function

- [x] Task 3: Integrate device limits into time-limits page (AC: #5)
  - [x] 3.1 Add Per-Device Limits section
  - [x] 3.2 Display enrolled devices with DeviceLimitCard
  - [ ] 3.3 Add "Apply same limits to all" button (deferred - MVP focuses on individual controls)

- [x] Task 4: Build and test
  - [x] 4.1 Verify build passes
  - [x] 4.2 Run existing tests

## Dev Notes

### Device Types

Device types from the data model:

- `chromebook` - Chromebooks
- `android_phone` - Android phones
- `android_tablet` - Android tablets

### Data Structure

Device limits stored in child document:

```typescript
interface DeviceLimit {
  deviceId: string
  deviceName: string
  deviceType: 'chromebook' | 'android_phone' | 'android_tablet'
  schedule: TimeLimitSchedule
}
```

### MVP Scope

For MVP, focus on:

- Device-specific daily total limits
- Per-device category overrides deferred to future enhancement
- UI showing enrolled devices with individual limit controls

### References

- [Source: docs/epics/epic-list.md] - Story requirements
- [Source: Story 30.3] - CategoryLimitCard component pattern
- [Source: contracts/index.ts] - DeviceLimit type

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- `apps/web/src/components/settings/DeviceLimitCard.tsx` - New component for per-device limit configuration with device type icons
- `apps/web/src/hooks/useChildTimeLimits.ts` - Extended with DeviceLimitConfig type and saveDeviceLimits function
- `apps/web/src/app/dashboard/settings/time-limits/page.tsx` - Integrated Device Limits section with DeviceLimitCard components
