# Story 6.5: Device Consent Gate

Status: done

## Story

As a **child**,
I want **devices to require my active consent before monitoring begins**,
So that **I know monitoring is something I agreed to, not something done to me**.

## Acceptance Criteria

1. **AC1: Agreement Check Before Monitoring**
   - Given a device is enrolled for monitoring (Epic 9-12 complete)
   - When the device attempts to begin monitoring
   - Then device checks for active, signed agreement with child consent
   - And check happens on extension startup and periodically

2. **AC2: No Agreement = No Monitoring**
   - Given no valid agreement exists for the child
   - When device is enrolled but agreement missing
   - Then monitoring does NOT start
   - And no screenshots are captured
   - And no activity is logged

3. **AC3: Waiting For Agreement UI**
   - Given device is enrolled without valid agreement
   - When extension popup is viewed
   - Then device displays "Waiting for family agreement" message
   - And UI shows friendly explanation of next steps
   - And child can see why monitoring hasn't started

4. **AC4: Parent Notification**
   - Given device is pending consent
   - When parent views dashboard
   - Then parent sees device is pending consent
   - And parent is guided to complete agreement signing

5. **AC5: Device Remains Functional**
   - Given device is enrolled without valid agreement
   - When child uses the device
   - Then device remains fully functional for basic use (not bricked)
   - And only monitoring features are disabled

6. **AC6: Automatic Monitoring Start**
   - Given device is in "waiting for agreement" state
   - When valid agreement becomes active
   - Then monitoring begins automatically
   - And no manual re-enrollment required
   - And state transition is logged

7. **AC7: Non-Negotiable Consent Requirement**
   - Given consent gate is implemented
   - When system processes any enrollment
   - Then child cannot be excluded from consent requirement
   - And no bypass mechanism exists for parents

## Tasks / Subtasks

- [x] Task 1: Create hasActiveAgreement check in extension (AC: #1, #2)
  - [x] 1.1 Create `apps/extension/src/consent-gate.ts` module
  - [x] 1.2 Add `checkConsentStatus(childId, familyId)` function
  - [x] 1.3 Query via Cloud Function for active agreement: `activeAgreements.where('childId', '==', childId).where('status', '==', 'active')`
  - [x] 1.4 Return `{ hasConsent: boolean, agreementId?: string, message?: string }`

- [x] Task 2: Integrate consent check into background monitoring (AC: #1, #2, #6)
  - [x] 2.1 Modify `apps/extension/src/background.ts` to call consent check before starting capture
  - [x] 2.2 Add consent check on extension startup (service worker activate)
  - [x] 2.3 Add periodic consent check (every 15 minutes via chrome.alarms)
  - [x] 2.4 Stop monitoring if consent revoked, resume if consent granted

- [x] Task 3: Create ConsentPendingView in popup (AC: #3, #5)
  - [x] 3.1 Add "consent-pending" state to popup.ts state machine
  - [x] 3.2 Create HTML section for consent pending view
  - [x] 3.3 Display: "Waiting for family agreement" message
  - [x] 3.4 Display: Explanation text about what needs to happen
  - [x] 3.5 Show device is functional, only monitoring paused

- [x] Task 4: Update device status for consent pending (AC: #4)
  - [x] 4.1 Add `consentStatus: 'pending' | 'granted' | 'withdrawn'` to device document
  - [x] 4.2 Update `syncDeviceHealth` to include consent status
  - [x] 4.3 Update dashboard DevicesList to show consent pending devices
  - [x] 4.4 Add "Needs Agreement" badge in DevicesList

- [x] Task 5: Create consent state transition handling (AC: #6)
  - [x] 5.1 Create `checkAndUpdateConsentStatus()` handler in background.ts
  - [x] 5.2 Start monitoring automatically when consent transitions to granted
  - [x] 5.3 Log state transition in device health sync
  - [x] 5.4 Update popup UI to show monitoring active

- [x] Task 6: Add Firestore Security Rules for consent check (AC: #7)
  - [x] 6.1 Add security rules for activeAgreements collection (guardians can read, writes via Admin SDK only)
  - [x] 6.2 Ensure no parent-only bypass in security rules (consent check happens via Cloud Function)
  - [x] 6.3 Consent status changes via extension sync which goes through Cloud Function

- [x] Task 7: Unit Tests (AC: All)
  - [x] 7.1 Test consent check returns false when no agreement exists
  - [x] 7.2 Test consent check returns true when active agreement exists
  - [x] 7.3 Test monitoring does not start without consent
  - [x] 7.4 Test monitoring starts automatically when consent granted
  - [x] 7.5 Test popup shows consent pending state
  - [x] 7.6 Test device status includes consent status
  - [x] 7.7 33 tests total (23 extension + 10 Cloud Function)

## Dev Notes

### Implementation Strategy

This story gates device monitoring behind a valid, active agreement. The extension must check for an active agreement before capturing any screenshots. The check integrates with the ActiveAgreement schema from Story 6.3.

### Key Requirements

- **FR26:** Device becomes inoperable without child consent (consent gate implementation)
- **NFR42:** WCAG 2.1 AA compliance (popup UI)
- Extension must gracefully handle missing/expired agreements

### Technical Approach

1. **Consent Check Function**:

```typescript
// apps/extension/src/consent-gate.ts

import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'

interface ConsentStatus {
  hasConsent: boolean
  agreementId: string | null
  agreementVersion: string | null
  message: string
}

export async function checkConsentStatus(
  childId: string,
  familyId: string
): Promise<ConsentStatus> {
  const db = getFirestore()

  const agreementQuery = query(
    collection(db, 'activeAgreements'),
    where('childId', '==', childId),
    where('familyId', '==', familyId),
    where('status', '==', 'active')
  )

  const snapshot = await getDocs(agreementQuery)

  if (snapshot.empty) {
    return {
      hasConsent: false,
      agreementId: null,
      agreementVersion: null,
      message:
        'No active family agreement found. Device monitoring will begin once your family completes and signs an agreement.',
    }
  }

  const agreement = snapshot.docs[0].data()
  return {
    hasConsent: true,
    agreementId: snapshot.docs[0].id,
    agreementVersion: agreement.version,
    message: `Agreement ${agreement.version} active`,
  }
}
```

2. **Background Integration**:

```typescript
// In background.ts - modify monitoring start

import { checkConsentStatus } from './consent-gate'

// In startMonitoringLoop or similar
async function maybeStartMonitoring() {
  const { childId, familyId } = state

  const consentStatus = await checkConsentStatus(childId, familyId)

  if (!consentStatus.hasConsent) {
    console.log('[Fledgely] Monitoring blocked - awaiting agreement consent')
    state.consentStatus = 'pending'

    // Update device status to reflect pending consent
    await syncDeviceHealth({
      consentStatus: 'pending',
      monitoringActive: false,
    })

    return // Don't start monitoring
  }

  // Consent granted - proceed with monitoring
  state.consentStatus = 'granted'
  state.activeAgreementId = consentStatus.agreementId

  console.log('[Fledgely] Consent granted - starting monitoring')
  startScreenshotCapture()
}
```

3. **Popup State Machine Update**:

```typescript
// Current states: not_enrolled, pending_enrollment, enrolled
// Add: consent_pending (after enrolled but before monitoring)

type ExtensionState =
  | 'not_enrolled'
  | 'pending_enrollment'
  | 'consent_pending' // NEW - enrolled but no agreement
  | 'enrolled_active' // Renamed from 'enrolled' - monitoring active
```

4. **Device Status Enhancement**:

```typescript
// Device document updates
interface DeviceStatus {
  // ... existing fields
  consentStatus: 'pending' | 'granted' | 'withdrawn'
  activeAgreementId: string | null
  activeAgreementVersion: string | null
}
```

### Previous Story Intelligence

**From Story 6.3 (Agreement Activation):**

- ActiveAgreement schema with `status: 'active' | 'archived'`
- `findActiveAgreementForChild(childId, agreements)` helper exists
- Firestore path: `/activeAgreements/{agreementId}`
- Helper functions in `packages/shared/src/contracts/index.ts`

**From Story 9.6 (Extension Background Service):**

- Background service worker pattern established
- State management with `ExtensionState` interface
- Health sync pattern via `syncDeviceHealth()`

**From Story 12.4 (Device Registration):**

- Device registration flow complete
- Device documents in Firestore at `/devices/{deviceId}`
- Device status: 'active' | 'offline' | 'unenrolled'

**From Story 19.5 (Monitoring Disabled Alert):**

- `syncDeviceHealth` function pattern
- Device status change triggers established

### Existing Code Patterns

- Extension already has `hasActiveAgreement: boolean` in mock children (popup.ts:35)
- This should be replaced with real Firestore check
- Background.ts has `state` object tracking device/family/child IDs
- syncDeviceHealth endpoint accepts device metrics

### Project Structure Notes

**Files to Create:**

- `apps/extension/src/consent-gate.ts` - Consent check logic
- `apps/extension/src/consent-gate.test.ts` - Unit tests

**Files to Modify:**

- `apps/extension/src/background.ts` - Integrate consent check
- `apps/extension/src/popup.ts` - Add consent pending state
- `apps/extension/src/popup.html` - Add consent pending UI section
- `apps/web/src/components/devices/DevicesList.tsx` - Show consent pending status
- `firestore.rules` - Add consent enforcement rules

### Security Considerations

1. **No Bypass**: Security rules must prevent devices from being marked active without agreement
2. **Child Protection**: This is a non-negotiable child protection feature
3. **Audit Trail**: Log all consent status transitions

### References

- [Source: docs/epics/epic-list.md#Story-6.5]
- [Pattern: apps/extension/src/background.ts - Background service pattern]
- [Pattern: packages/shared/src/contracts/index.ts - ActiveAgreement schema]
- [Pattern: apps/extension/src/popup.ts - Popup state machine]
- [Source: Story 6.3 - Agreement Activation, ActiveAgreement schema]
- [Source: Story 12.4 - Device Registration, device status patterns]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Created consent-gate module with caching (15min TTL) for consent status checks
- Integrated consent check into background.ts via CHILD_CONNECTED handler and periodic alarm
- Created ConsentPendingView in popup.html/popup.ts with child info display
- Added consent status sync via health metrics endpoint
- Added "Needs Agreement" badge in DevicesList.tsx
- Added Firestore security rules for activeAgreements collection
- 33 unit tests passing (23 extension + 10 Cloud Function)

### File List

#### Created Files

- `apps/extension/src/consent-gate.ts` - Consent status checking with caching
- `apps/extension/src/consent-gate.test.ts` - 23 unit tests for consent gate
- `apps/functions/src/http/consent/checkStatus.ts` - Cloud Function for consent check
- `apps/functions/src/http/consent/checkStatus.test.ts` - 10 unit tests for Cloud Function
- `apps/functions/src/http/consent/index.ts` - Module exports

#### Modified Files

- `apps/extension/src/background.ts` - Added consent check integration, alarm, message handlers
- `apps/extension/src/popup.ts` - Added consent pending state handling
- `apps/extension/popup.html` - Added consent pending view UI section
- `apps/extension/src/health-metrics.ts` - Added consent status to health sync
- `apps/functions/src/http/sync/health.ts` - Accept consent status in health sync
- `apps/functions/src/index.ts` - Export checkConsentStatus function
- `apps/web/src/hooks/useDevices.ts` - Added DeviceConsentStatus type and fields
- `apps/web/src/components/devices/DevicesList.tsx` - Added consent badge
- `packages/firebase-rules/firestore.rules` - Added activeAgreements security rules
