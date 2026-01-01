# Story 35-5: Post-Grace Period Handling

## Story

As **the system**,
I want **to handle agreements not renewed after grace period**,
So that **monitoring doesn't continue without consent**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Monitoring pauses (no new screenshots captured) after grace period ends
- [x] AC2: Existing data preserved (not deleted)
- [x] AC3: Time limits no longer enforced
- [x] AC4: Both parties notified: "Monitoring paused - renew to resume"
- [x] AC5: Can renew at any time to resume
- [x] AC6: No punitive device restrictions

## Completion Notes

**Total Tests: 81**

- Shared package: 31 tests (agreementPostGrace.test.ts)
- Service: 13 tests (postGracePeriodService.test.ts)
- Hook: 8 tests (usePostGracePeriod.test.ts)
- Component: 12 tests (PostGracePeriodBanner.test.tsx)
- Integration: 17 tests (PostGracePeriod.integration.test.tsx)

**Key Implementation:**

- Post-grace status transitions: active → grace-period → monitoring-paused
- Behavior flags: PAUSE_SCREENSHOTS, PRESERVE_DATA, DISABLE_TIME_LIMITS, ALLOW_RENEWAL, NO_DEVICE_RESTRICTIONS
- Utility functions for checking monitoring status, time limit enforcement, and renewal availability
- Non-punitive messaging for both parent and child roles

## Technical Tasks

### Task 1: Post-Grace Period Types and Constants

Create TypeScript types and constants for post-grace period handling in shared package.

**Files:**

- `packages/shared/src/contracts/agreementPostGrace.ts` (new)
- `packages/shared/src/contracts/agreementPostGrace.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Implementation:**

```typescript
// Post-grace period status
export const postGracePeriodStatusSchema = z.enum([
  'active', // Normal operation
  'grace-period', // Within 14-day grace
  'monitoring-paused', // After grace period ends
])

// Post-grace behavior settings
export const POST_GRACE_BEHAVIOR = {
  PAUSE_SCREENSHOTS: true,
  PRESERVE_DATA: true,
  DISABLE_TIME_LIMITS: true,
  ALLOW_RENEWAL: true,
  NO_DEVICE_RESTRICTIONS: true,
}

// Utility functions
export function isMonitoringPaused(agreement: AgreementForPostGrace): boolean
export function getPostGraceStatus(agreement: AgreementForPostGrace): PostGraceStatus
export function canResumeMonitoring(agreement: AgreementForPostGrace): boolean
```

**Acceptance Criteria:** AC1, AC2, AC3

### Task 2: Post-Grace Period Service

Create service for managing post-grace period logic.

**Files:**

- `apps/web/src/services/postGracePeriodService.ts` (new)
- `apps/web/src/services/postGracePeriodService.test.ts` (new)

**Functions:**

- `checkMonitoringStatus(agreement)` - Check if monitoring is active/paused
- `getTimeLimitEnforcementStatus(agreement)` - Check if time limits are enforced
- `getPostGraceNotification(agreement, role)` - Get appropriate notification
- `canRenewAgreement(agreement)` - Check if renewal is allowed (always true)
- `resumeMonitoring(agreement)` - Resume monitoring after renewal

**Acceptance Criteria:** AC1, AC3, AC5, AC6

### Task 3: usePostGracePeriod Hook

Create hook for managing post-grace period state.

**Files:**

- `apps/web/src/hooks/usePostGracePeriod.ts` (new)
- `apps/web/src/hooks/usePostGracePeriod.test.ts` (new)

**Interface:**

```typescript
interface UsePostGracePeriodResult {
  isMonitoringPaused: boolean
  areTimeLimitsEnforced: boolean
  canRenew: boolean
  notification: string | null
  renewAgreement: () => void
}
```

**Acceptance Criteria:** AC1, AC3, AC4, AC5

### Task 4: PostGracePeriodBanner Component

Create banner component for post-grace period notifications.

**Files:**

- `apps/web/src/components/agreements/PostGracePeriodBanner.tsx` (new)
- `apps/web/src/components/agreements/PostGracePeriodBanner.test.tsx` (new)

**Props:**

```typescript
interface PostGracePeriodBannerProps {
  userRole: 'parent' | 'child'
  onRenew?: () => void
}
```

**Features:**

- Clear messaging: "Monitoring paused - renew to resume"
- Renew button for parent
- Reassuring message about data preservation
- No alarming or punitive messaging

**Acceptance Criteria:** AC4, AC5, AC6

### Task 5: Monitoring Pause Service

Create service for handling monitoring pause/resume logic.

**Files:**

- `apps/web/src/services/monitoringPauseService.ts` (new)
- `apps/web/src/services/monitoringPauseService.test.ts` (new)

**Functions:**

- `shouldCaptureScreenshots(agreement)` - Check if screenshots should be captured
- `shouldEnforceTimeLimits(agreement)` - Check if time limits should be enforced
- `getMonitoringPauseReason(agreement)` - Get reason for pause
- `getResumeRequirements(agreement)` - Get what's needed to resume

**Acceptance Criteria:** AC1, AC3, AC6

### Task 6: Integration Tests

Create integration tests for complete post-grace period flow.

**Files:**

- `apps/web/src/components/agreements/PostGracePeriod.integration.test.tsx` (new)

**Test Scenarios:**

- Monitoring pauses after grace period ends
- Existing data is not deleted
- Time limits stop being enforced
- Parent sees renewal option
- Child sees appropriate message
- Renewal resumes monitoring at any time
- No device lockout or restrictions

**Acceptance Criteria:** All ACs

## Dev Notes

### Previous Story Intelligence (35-4)

Story 35-4 established grace period handling:

- **Grace Period Types**: `packages/shared/src/contracts/agreementGracePeriod.ts`
- **Grace Period Service**: `apps/web/src/services/gracePeriodService.ts`
- **Grace Period Hook**: `apps/web/src/hooks/useGracePeriod.ts`
- **Grace Period Banner**: `apps/web/src/components/agreements/GracePeriodBanner.tsx`
- `isInGracePeriod(agreement)` - Check if in grace period
- `hasGracePeriodExpired(agreement)` - Check if grace period has ended

Story 35-5 builds on this by handling what happens AFTER the grace period ends.

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Zod Schemas**: All types use Zod for validation
- **Vitest + React Testing Library**: Testing stack
- **Shared Package First**: Types and constants in `packages/shared`
- **Service Layer**: Business logic in `services/`
- **Custom Hooks**: State management in `hooks/`

### Post-Grace Period Flow Logic

```
Grace period ends (14 days after expiry)
  ├── Monitoring pauses (AC1)
  │   ├── No new screenshots captured
  │   └── Extension stops recording activity
  ├── Existing data preserved (AC2)
  │   ├── Screenshots remain accessible
  │   └── History is retained
  ├── Time limits disabled (AC3)
  │   ├── No countdown warnings
  │   └── No blocking of content
  ├── Notifications sent (AC4)
  │   ├── Parent: "Monitoring paused - renew to resume"
  │   └── Child: "Agreement needs renewal to continue"
  └── Renewal available (AC5)
      └── Can renew at any time to resume monitoring
```

### Key Behavior: No Punishment

- **No device lockout**: Devices continue to work normally
- **No data deletion**: All historical data is preserved
- **No forced actions**: User can use device freely
- **Reassuring messaging**: Emphasize what's preserved, not what's lost

### UI/UX Patterns

- **Calm Tone**: Not alarming or urgent
- **Clear Status**: Explain what's happening
- **Easy Action**: One-click renewal when ready
- **Data Reassurance**: Confirm data is safe

### Message Examples

- Parent: "Monitoring is currently paused. Your data is safe. Renew your agreement when you're ready to resume."
- Child: "Your agreement has expired. Talk to your parent about renewing it. Your device works normally."

### File Structure

```
packages/shared/src/contracts/
  agreementPostGrace.ts           # Types and constants
  agreementPostGrace.test.ts      # Unit tests

apps/web/src/
  services/
    postGracePeriodService.ts         # Status service
    postGracePeriodService.test.ts
    monitoringPauseService.ts         # Pause logic
    monitoringPauseService.test.ts
  hooks/
    usePostGracePeriod.ts             # State hook
    usePostGracePeriod.test.ts
  components/agreements/
    PostGracePeriodBanner.tsx         # Banner component
    PostGracePeriodBanner.test.tsx
    PostGracePeriod.integration.test.tsx
```

### References

- [Source: packages/shared/src/contracts/agreementGracePeriod.ts] - Grace period types
- [Source: apps/web/src/services/gracePeriodService.ts] - Grace period service
- [Source: docs/epics/epic-list.md#Story 35.5] - Original requirements
