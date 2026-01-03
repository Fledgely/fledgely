# Story 40.1: Location-Based Rule Opt-In

## Status: done

## Story

As a **family**,
I want **to opt into location-based rules**,
So that **rules can vary based on where my child is**.

## Acceptance Criteria

1. **AC1: Explicit Dual-Guardian Opt-In**
   - Given family wants location-aware rules (FR139)
   - When enabling location features
   - Then explicit opt-in required from BOTH parents (dual consent)
   - And uses two-parent approval pattern from Story 3A.2

2. **AC2: Clear Privacy Explanation**
   - Given parent is reviewing location opt-in
   - When viewing opt-in dialog
   - Then clear explanation: "Rules can change based on child's location"
   - And location data usage explained (what is collected, how it's used)
   - And privacy implications clearly stated

3. **AC3: Child Notification**
   - Given location features are being enabled
   - When opt-in is approved
   - Then child notified of location features in child-friendly language
   - And uses 6th-grade reading level (NFR65)
   - And child understands what location data is used for

4. **AC4: Default Disabled**
   - Given new family setup
   - When family account is created
   - Then location features disabled by default
   - And must actively enable (no auto-opt-in)

5. **AC5: Instant Disable by Any Guardian**
   - Given location features are enabled
   - When any single guardian wants to disable
   - Then can be disabled immediately by ANY guardian (no dual-consent required for disable)
   - And no notification delay (instant revocation)

6. **AC6: Fleeing Mode Integration**
   - Given location features are active
   - When any family member activates "Safe Escape" mode
   - Then location features disabled immediately
   - And NO notification to other family members for 72 hours
   - And respects survivor advocacy requirements

## Tasks / Subtasks

### Task 1: Create Location Feature Settings Schema (AC: #1, #4) [x]

Define Zod schemas for location feature settings.

**Files:**

- `packages/shared/src/contracts/locationSettings.ts` (new)
- `packages/shared/src/contracts/locationSettings.test.ts` (new)

**Implementation:**

- Create `locationSettingsSchema` with fields:
  - `enabled: boolean` (default: false)
  - `enabledAt: Timestamp | null`
  - `enabledByUids: string[]` (both guardians must be listed)
  - `disabledAt: Timestamp | null`
  - `disabledByUid: string | null`
  - `childNotifiedAt: Timestamp | null`
- Create `locationOptInRequestSchema` for pending opt-in requests:
  - `id: string`
  - `familyId: string`
  - `requestedByUid: string`
  - `status: 'pending' | 'approved' | 'declined' | 'expired'`
  - `approvedByUid: string | null`
  - `createdAt: Timestamp`
  - `expiresAt: Timestamp` (72 hours)
  - `resolvedAt: Timestamp | null`
- Export from `packages/shared/src/contracts/index.ts`

**Tests:** ~15 tests for schema validation

### Task 2: Create Location Opt-In Cloud Function (AC: #1, #2, #3) [x]

Server-side function to handle location feature opt-in requests.

**Files:**

- `apps/functions/src/callable/requestLocationOptIn.ts` (new)
- `apps/functions/src/callable/requestLocationOptIn.test.ts` (new)

**Implementation:**

- Validate caller is a guardian
- Create opt-in request document in `families/{familyId}/locationOptInRequests/{id}`
- Send notification to other guardian(s) for approval
- Return request ID for tracking

**Tests:** ~12 tests for function validation and request creation

### Task 3: Create Location Opt-In Approval Function (AC: #1) [x]

Handle second guardian's approval of location opt-in.

**Files:**

- `apps/functions/src/callable/approveLocationOptIn.ts` (new)
- `apps/functions/src/callable/approveLocationOptIn.test.ts` (new)

**Implementation:**

- Validate caller is a different guardian than requester
- Update request status to 'approved'
- Enable location settings on family document
- Create child notification (Task 5)
- Audit log the opt-in event

**Tests:** ~10 tests for approval flow

### Task 4: Create Location Disable Function (AC: #5, #6) [x]

Single-guardian instant disable for location features.

**Files:**

- `apps/functions/src/callable/disableLocationFeatures.ts` (new)
- `apps/functions/src/callable/disableLocationFeatures.test.ts` (new)

**Implementation:**

- Validate caller is a guardian
- Immediately disable location settings (no dual-consent needed)
- Record `disabledByUid` and `disabledAt`
- If triggered by fleeing mode: suppress notifications for 72 hours
- Audit log the disable event

**Tests:** ~10 tests for disable scenarios

### Task 5: Create Location Opt-In UI Component (AC: #1, #2, #4) [x]

Parent-facing UI for opting into location features.

**Files:**

- `apps/web/src/components/settings/LocationOptInCard.tsx` (new)
- `apps/web/src/components/settings/LocationOptInCard.test.tsx` (new)

**Implementation:**

- Card showing location feature status (enabled/disabled/pending)
- "Enable Location Features" button (when disabled)
- Privacy explanation modal before confirmation
- Clear copy explaining what location data is collected
- Pending approval indicator when awaiting second guardian
- Uses inline styles per project pattern

**Tests:** ~12 tests for UI states and accessibility

### Task 6: Create Privacy Explanation Modal (AC: #2) [x]

Detailed privacy explanation before opt-in.

**Files:**

- `apps/web/src/components/settings/LocationPrivacyModal.tsx` (new)
- `apps/web/src/components/settings/LocationPrivacyModal.test.tsx` (new)

**Implementation:**

- Clear explanation of location data collection:
  - What is collected (device GPS, WiFi for geofencing)
  - How it's used (rule variations based on location)
  - How long it's stored (same retention as other data)
  - Who can see it (guardians only, never shared)
- "I understand" checkbox required before proceeding
- Links to full privacy policy
- 44x44px touch targets (NFR49)
- 4.5:1 contrast ratio (NFR45)

**Tests:** ~8 tests for modal and accessibility

### Task 7: Create Child Location Notification (AC: #3) [x]

Child-friendly notification when location features are enabled.

**Files:**

- `apps/web/src/components/child/LocationFeaturesNotification.tsx` (new)
- `apps/web/src/components/child/LocationFeaturesNotification.test.tsx` (new)

**Implementation:**

- Child-friendly message: "Your family turned on location features. This means your rules might change based on where you are (like at school or at home)."
- Uses 6th-grade reading level (NFR65)
- Explains in simple terms
- Dismissible after reading
- Created via cloud function notification (reuse pattern from Story 39.7)

**Tests:** ~8 tests for notification rendering

### Task 8: Create useLocationSettings Hook (AC: #1, #4, #5) [x]

React hook for managing location settings state.

**Files:**

- `apps/web/src/hooks/useLocationSettings.ts` (new)
- `apps/web/src/hooks/useLocationSettings.test.ts` (new)

**Implementation:**

- Subscribe to `families/{familyId}` location settings
- Provide `requestOptIn()` function
- Provide `approveOptIn(requestId)` function
- Provide `disableLocation()` function
- Track loading/error states
- Return current location settings status

**Tests:** ~12 tests for hook functionality

### Task 9: Update Component Exports (AC: All) [x]

Export new components.

**Files:**

- `apps/web/src/components/settings/index.ts` (modify)
- `apps/web/src/components/child/index.ts` (modify)
- `packages/shared/src/contracts/index.ts` (modify)
- `apps/functions/src/index.ts` (modify)

**Implementation:**

- Export LocationOptInCard
- Export LocationPrivacyModal
- Export LocationFeaturesNotification
- Export location schemas
- Export location cloud functions

**Tests:** No additional tests (export verification)

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Architecture Compliance

**From Architecture Document:**

- Firebase Security Rules as primary boundary
- Multi-Signature Agreement Operations pattern for dual-consent
- Single-Source Bidirectional Transparency (parents and child see same data)

**Key Patterns to Follow:**

- Two-parent approval pattern from Story 3A.2 (`safetySettingChangeSchema`)
- Child notification pattern from Story 39.7 (`CaregiverRemovedNotification`)
- Cloud function pattern from recent stories (httpsCallable)

### Existing Infrastructure to Leverage

**From Story 3A.2 (Safety Settings Two-Parent Approval):**

- `safetySettingChangeSchema` - Pattern for dual-consent requests
- Two-guardian approval workflow

**From Story 39.7 (Caregiver Removal):**

- `removeCaregiverWithNotification` - Cloud function with child notification pattern
- `ChildNotificationList` - Display notifications to children

**From Epic 0.5 (Safe Account Escape):**

- Fleeing mode patterns
- 72-hour notification suppression

### Location Settings Data Model

```typescript
// families/{familyId} - add to family document
interface FamilyLocationSettings {
  locationFeaturesEnabled: boolean // default: false
  locationEnabledAt: Timestamp | null
  locationEnabledByUids: string[] // both guardians
  locationDisabledAt: Timestamp | null
  locationDisabledByUid: string | null
  childNotifiedAt: Timestamp | null
}

// families/{familyId}/locationOptInRequests/{requestId}
interface LocationOptInRequest {
  id: string
  familyId: string
  requestedByUid: string
  status: 'pending' | 'approved' | 'declined' | 'expired'
  approvedByUid: string | null
  createdAt: Timestamp
  expiresAt: Timestamp // 72 hours from creation
  resolvedAt: Timestamp | null
}
```

### File Structure

```
packages/shared/src/contracts/
├── locationSettings.ts                  # NEW - Zod schemas
├── locationSettings.test.ts             # NEW - Schema tests
└── index.ts                             # MODIFY - exports

apps/functions/src/callable/
├── requestLocationOptIn.ts              # NEW - Request function
├── requestLocationOptIn.test.ts         # NEW
├── approveLocationOptIn.ts              # NEW - Approval function
├── approveLocationOptIn.test.ts         # NEW
├── disableLocationFeatures.ts           # NEW - Disable function
└── disableLocationFeatures.test.ts      # NEW

apps/web/src/components/settings/
├── LocationOptInCard.tsx                # NEW - Main UI
├── LocationOptInCard.test.tsx           # NEW
├── LocationPrivacyModal.tsx             # NEW - Privacy explanation
├── LocationPrivacyModal.test.tsx        # NEW
└── index.ts                             # MODIFY - exports

apps/web/src/components/child/
├── LocationFeaturesNotification.tsx     # NEW - Child notification
├── LocationFeaturesNotification.test.tsx # NEW
└── index.ts                             # MODIFY - exports

apps/web/src/hooks/
├── useLocationSettings.ts               # NEW - Hook
└── useLocationSettings.test.ts          # NEW
```

### Testing Requirements

- Unit test all Zod schemas
- Unit test cloud functions with mocked Firestore
- Component tests for UI with accessibility verification
- Test dual-consent flow (request → approve → enabled)
- Test single-guardian disable flow
- Test child notification creation and display
- Test fleeing mode integration (72-hour suppression)

### NFR References

- NFR42: Location data handling (privacy requirements)
- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR65: Text at 6th-grade reading level for child views

### References

- [Source: docs/epics/epic-list.md#Story-40.1]
- [Source: docs/epics/epic-list.md#Epic-40]
- [Source: Story 3A.2 for two-parent approval patterns]
- [Source: Story 39.7 for child notification patterns]
- [Source: packages/shared/src/contracts/safetySettingChange.test.ts]

## Dev Agent Record

### Context Reference

- Epic: 40 (Advanced Shared Custody & Location Features)
- Story Key: 40-1-location-based-rule-opt-in
- Dependencies: Story 3A.2 (Two-Parent Approval) - COMPLETE
- Dependencies: Story 39.7 (Child Notifications) - COMPLETE

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A

### Completion Notes List

- Implemented dual-guardian consent flow (first guardian requests, second approves)
- Single-guardian instant disable for safety (no dual-consent needed)
- Fleeing mode integration with 72-hour notification suppression
- Child-friendly notifications using 6th-grade reading level (NFR65)
- 44x44px minimum touch targets (NFR49) and 4.5:1 contrast (NFR45)
- All 140 tests passing (26 shared + 37 functions + 77 web)

### File List

- packages/shared/src/contracts/locationSettings.ts (new)
- packages/shared/src/contracts/locationSettings.test.ts (new)
- packages/shared/src/contracts/index.ts (modified)
- apps/functions/src/callable/requestLocationOptIn.ts (new)
- apps/functions/src/callable/requestLocationOptIn.test.ts (new)
- apps/functions/src/callable/approveLocationOptIn.ts (new)
- apps/functions/src/callable/approveLocationOptIn.test.ts (new)
- apps/functions/src/callable/disableLocationFeatures.ts (new)
- apps/functions/src/callable/disableLocationFeatures.test.ts (new)
- apps/functions/src/index.ts (modified)
- apps/web/src/components/settings/LocationOptInCard.tsx (new)
- apps/web/src/components/settings/LocationOptInCard.test.tsx (new)
- apps/web/src/components/settings/LocationPrivacyModal.tsx (new)
- apps/web/src/components/settings/LocationPrivacyModal.test.tsx (new)
- apps/web/src/components/settings/index.ts (modified)
- apps/web/src/components/child/LocationFeaturesNotification.tsx (new)
- apps/web/src/components/child/LocationFeaturesNotification.test.tsx (new)
- apps/web/src/components/child/index.ts (modified)
- apps/web/src/hooks/useLocationSettings.ts (new)
- apps/web/src/hooks/useLocationSettings.test.ts (new)

## Change Log

| Date       | Change                                                |
| ---------- | ----------------------------------------------------- |
| 2026-01-03 | Story created (ready-for-dev)                         |
| 2026-01-03 | Story completed - all 9 tasks done, 140 tests passing |
