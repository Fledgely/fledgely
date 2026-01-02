# Story 7.5.7: 48-Hour Family Notification Blackout

## Status: ready-for-dev

## Story

As a **child who signaled for help**,
I want **my family not to know I asked for help for at least 48 hours**,
So that **I have time to get safe or for professionals to intervene**.

## Acceptance Criteria

1. **AC1: No family notifications during blackout**
   - Given a safety signal has been triggered
   - When 48 hours have not yet passed
   - Then NO notification of any kind goes to any family member
   - And all notification channels are blocked (push, email, in-app)
   - And signal-related events are suppressed from notification queue

2. **AC2: Family audit trail shows no unusual entries**
   - Given a blackout is active
   - When any family member accesses audit trail
   - Then no unusual entries appear during blackout period
   - And no gaps appear in audit trail (filled with synthetic/normal entries)
   - And no indication of suppressed activity exists

3. **AC3: Normal activity continues during blackout**
   - Given a blackout is active
   - When child uses device normally
   - Then child's normal activity continues to appear in monitoring
   - And no monitoring gaps occur
   - And activity appears continuous to parents

4. **AC4: External partner can extend blackout**
   - Given a 48-hour blackout is active
   - When external partner (crisis line) determines more time is needed
   - Then partner can extend blackout window
   - And extension is logged in admin audit (not family audit)
   - And extension can be 24-hour increments

5. **AC5: Privacy gaps applied after blackout**
   - Given a blackout period has ended
   - When standard privacy gaps (Epic 7.8) are applied
   - Then the signal period is masked in family-visible data
   - And monitoring data during signal is privacy-gapped
   - And no evidence of safety signal remains visible

6. **AC6: Countdown not visible to child**
   - Given a blackout is active
   - When child views any app interface
   - Then no countdown or timer is visible
   - And child sees normal interface (prevents anxiety)
   - And child receives only confirmation resources (Story 7.5.3)

## Technical Tasks

### Task 1: Signal Blackout Service (AC: #1, #4)

Create service to manage 48-hour notification blackout.

**Files:**

- `packages/shared/src/services/signalBlackoutService.ts` (new)
- `packages/shared/src/services/signalBlackoutService.test.ts` (new)

**Types and Functions:**

```typescript
// Blackout status for a signal
interface SignalBlackout {
  id: string
  signalId: string
  childId: string // Anonymized, same as isolated signal
  startedAt: Date
  expiresAt: Date // Initially 48 hours from startedAt
  extendedBy: string | null // Partner ID if extended
  extendedAt: Date | null
  extensions: BlackoutExtension[]
  status: 'active' | 'expired' | 'released'
}

interface BlackoutExtension {
  extendedBy: string // Partner ID
  extendedAt: Date
  additionalHours: number
  reason: string
}

// Collection at ROOT level (not under family)
const SIGNAL_BLACKOUTS_COLLECTION = 'signalBlackouts'

// Create 48-hour blackout for signal
function createBlackout(signalId: string, childId: string): Promise<SignalBlackout>

// Check if blackout is active for signal
function isBlackoutActive(signalId: string): Promise<boolean>

// Extend blackout (partner only, 24-hour increments)
function extendBlackout(
  signalId: string,
  partnerId: string,
  additionalHours: 24 | 48 | 72,
  reason: string
): Promise<SignalBlackout>

// Get time remaining in blackout
function getBlackoutTimeRemaining(signalId: string): Promise<number> // milliseconds

// Release blackout early (partner only, for safety plan completion)
function releaseBlackoutEarly(signalId: string, partnerId: string, reason: string): Promise<void>

// Get blackout status
function getBlackoutStatus(signalId: string): Promise<SignalBlackout | null>
```

**Security Requirements:**

- Blackout collection at ROOT level (not under family)
- Only partners can extend/release blackouts
- All operations logged to admin audit
- Family members cannot access blackout data

**Tests:** 30+ tests for blackout creation, extension, status checks

### Task 2: Notification Suppression Service (AC: #1, #2)

Create service to suppress notifications during blackout.

**Files:**

- `packages/shared/src/services/notificationSuppressionService.ts` (new)
- `packages/shared/src/services/notificationSuppressionService.test.ts` (new)

**Types and Functions:**

```typescript
// Suppression rule for notifications
interface NotificationSuppression {
  id: string
  childId: string // Anonymized
  signalId: string
  suppressionType: 'all' | 'signal_related' | 'audit_entries'
  startedAt: Date
  expiresAt: Date
  active: boolean
}

// Check if notifications should be suppressed for child
function shouldSuppressNotification(childId: string, notificationType: string): Promise<boolean>

// Create suppression rule (called when blackout starts)
function createSuppression(
  signalId: string,
  childId: string,
  expiresAt: Date
): Promise<NotificationSuppression>

// Filter notifications through suppression (called before sending)
function filterNotification(notification: Notification, recipientIds: string[]): Promise<string[]> // Returns filtered recipient list

// Suppress audit entry from family view
function suppressAuditEntry(auditEntry: AuditEntry, familyId: string): Promise<AuditEntry | null> // Returns null if should be suppressed

// Extend suppression (when blackout extended)
function extendSuppression(signalId: string, newExpiresAt: Date): Promise<void>
```

**Security Requirements:**

- Suppression rules stored in isolated collection
- Family cannot access suppression data
- All suppressions logged to admin audit

**Tests:** 25+ tests for suppression logic, filtering, extension

### Task 3: Synthetic Activity Gap Filler (AC: #2, #3)

Create service to fill monitoring gaps with synthetic normal entries.

**Files:**

- `packages/shared/src/services/activityGapFillerService.ts` (new)
- `packages/shared/src/services/activityGapFillerService.test.ts` (new)

**Types and Functions:**

```typescript
// Gap period that needs filling
interface ActivityGap {
  id: string
  childId: string
  startTime: Date
  endTime: Date
  reason: 'signal_blackout' | 'privacy_gap'
  filled: boolean
}

// Synthetic activity entry
interface SyntheticActivity {
  id: string
  gapId: string
  timestamp: Date
  type: 'normal_browsing' | 'normal_app_use' | 'idle'
  metadata: Record<string, unknown>
  synthetic: true // Always marked for internal tracking
}

// Fill gap with synthetic normal activity
function fillActivityGap(childId: string, startTime: Date, endTime: Date): Promise<void>

// Generate synthetic activity entries based on child's normal patterns
function generateSyntheticActivity(childId: string, timestamp: Date): Promise<SyntheticActivity>

// Check if activity is synthetic (for internal use)
function isActivitySynthetic(activityId: string): Promise<boolean>

// Get child's normal activity patterns for synthesis
function getActivityPatterns(childId: string): Promise<ActivityPattern>
```

**Important Notes:**

- Synthetic entries match child's historical activity patterns
- Entries are marked `synthetic: true` but this field is NOT visible to family
- Only admin with authorization can see synthetic flag
- Gap filling happens automatically when blackout starts

**Tests:** 25+ tests for gap detection, synthetic generation, pattern matching

### Task 4: Privacy Gap Application (AC: #5)

Integrate with Epic 7.8 privacy gaps after blackout ends.

**Files:**

- `packages/shared/src/services/privacyGapService.ts` (modify or create)
- `packages/shared/src/services/privacyGapService.test.ts` (modify or create)

**Types and Functions:**

```typescript
// Privacy gap for signal period
interface SignalPrivacyGap {
  id: string
  childId: string
  signalId: string
  startTime: Date
  endTime: Date
  applied: boolean
  appliedAt: Date | null
}

// Apply privacy gap after blackout ends
function applyPostBlackoutPrivacyGap(signalId: string): Promise<void>

// Mask monitoring data during signal period
function maskSignalPeriodData(childId: string, startTime: Date, endTime: Date): Promise<void>

// Check if time period is privacy-gapped
function isPrivacyGapped(childId: string, timestamp: Date): Promise<boolean>

// Get privacy gap status for signal
function getSignalPrivacyGapStatus(signalId: string): Promise<SignalPrivacyGap | null>
```

**Requirements:**

- Privacy gaps applied automatically when blackout expires
- Signal period data is masked/anonymized
- Family sees "normal activity" during gapped period
- No evidence of safety signal remains

**Tests:** 20+ tests for privacy gap application, data masking

### Task 5: Child Interface Concealment (AC: #6)

Ensure child sees no countdown or indication of blackout.

**Files:**

- `packages/shared/src/services/childSignalDisplayService.ts` (modify)
- `packages/shared/src/services/childSignalDisplayService.test.ts` (modify)

**Functions:**

```typescript
// Get child's view of signal status (no countdown)
function getChildSignalView(childId: string, signalId: string): Promise<ChildSignalView>

interface ChildSignalView {
  // Shows only that signal was received
  signalReceived: boolean
  // Shows only confirmation message (Story 7.5.3)
  confirmationMessage: string
  // Shows resources
  resources: Resource[]
  // NO countdown, NO timer, NO blackout indication
  // countdown: NEVER included
  // blackoutActive: NEVER included
  // timeRemaining: NEVER included
}

// Filter any blackout-related data from child view
function filterBlackoutFromChildView(data: any): any
```

**UI Requirements:**

- Child sees only "Help is on the way" confirmation
- No countdown visible anywhere
- Resources continue to be available
- Normal app interface shown

**Tests:** 15+ tests for view filtering, concealment verification

### Task 6: Integration with Signal Flow (AC: #1-6)

Integrate blackout with existing signal creation flow.

**Files:**

- `packages/shared/src/services/safetySignalService.ts` (modify)
- `packages/shared/src/services/safetySignalService.test.ts` (modify)

**Modifications:**

```typescript
// After signal creation, add blackout:
async function createIsolatedSafetySignal(
  childId: string,
  platform: SignalPlatform,
  triggerMethod: TriggerMethod,
  jurisdiction: string,
  isOffline: boolean = false,
  deviceId: string | null = null
): Promise<IsolatedSafetySignalResult> {
  // Existing isolation and encryption...

  // 7.5.7: Create 48-hour blackout
  const blackout = await createBlackout(signal.id, childId)

  // 7.5.7: Create notification suppression
  await createSuppression(signal.id, childId, blackout.expiresAt)

  // 7.5.7: Start gap filling for activity
  await fillActivityGap(childId, new Date(), blackout.expiresAt)

  // Continue with existing flow...
  return result
}

// Schedule privacy gap application for after blackout
async function schedulePrivacyGapApplication(signalId: string): Promise<void>
```

**Tests:** 20+ tests for integration, flow verification

## Dev Notes

### Critical Safety Requirements

1. **48-Hour Minimum Blackout** - The blackout period is a MINIMUM, not maximum. External partners can always extend it.

2. **No Family Visibility** - During blackout, family members must see absolutely nothing related to the signal. Activity appears completely normal.

3. **Child Anxiety Prevention** - Never show countdown to child. The child should feel safe that help is coming, not stressed about a timer.

4. **Synthetic Activity Quality** - Synthetic activity must be indistinguishable from real activity. Base it on child's actual historical patterns.

### Previous Story Patterns to Follow

From **Story 7.5.6** (Signal Encryption & Isolation):

- Isolated collections at ROOT level
- `signalEncryptionService.ts` - encryption patterns
- `isolatedSignalStorageService.ts` - isolation patterns
- `signalAccessAuthorizationService.ts` - authorization for admin access
- `signalRetentionService.ts` - retention tracking

From **Story 7.5.3** (Signal Confirmation & Resources):

- `childSignalDisplayService.ts` - child-facing confirmation UI
- Resources display patterns
- "Help is on the way" messaging

From **Story 7.5.2** (External Signal Routing):

- Partner communication patterns
- Partner ID validation
- External partner webhook patterns

### Architecture Compliance

**Collections:** (ROOT level, NOT under families/)

- `signalBlackouts` - Blackout periods
- `notificationSuppressions` - Suppression rules
- `activityGaps` - Gap tracking (synthetic marker hidden from family)
- `signalPrivacyGaps` - Privacy gap records

**Security Rules:**

- Family cannot access blackout/suppression collections
- Only partners can extend/release blackouts
- Admin access requires authorization
- Synthetic flag never visible to family

### Testing Requirements

- TDD approach required
- Test blackout timing edge cases
- Test suppression filtering
- Test synthetic activity patterns
- Test privacy gap application timing
- Test child view concealment
- Adversarial tests for family access attempts

### Project Structure Notes

Following established patterns:

- Services in `packages/shared/src/services/`
- Tests use vitest with mocked Firebase
- Integration with existing `safetySignalService.ts`
- Cloud Functions for scheduled tasks (gap filling, privacy gaps)

### References

- [Source: docs/epics/epic-list.md#Story-7.5.7 - 48-Hour Family Notification Blackout]
- [Source: docs/sprint-artifacts/stories/7-5-6-signal-encryption-isolation.md - Isolation patterns]
- [Source: docs/sprint-artifacts/stories/7-5-3-signal-confirmation-resources.md - Child confirmation UI]
- [Source: docs/sprint-artifacts/stories/7-5-2-external-signal-routing.md - Partner patterns]
- [Source: packages/shared/src/services/safetySignalService.ts - Signal creation flow]
- [Source: packages/shared/src/services/isolatedSignalStorageService.ts - Isolation patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
