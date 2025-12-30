# Story 6.6: Consent Withdrawal Handling

Status: done

## Story

As a **child**,
I want **to understand what happens if I withdraw consent**,
So that **I know this is a real choice with real consequences**.

## Acceptance Criteria

1. **AC1: Withdrawal Option Visibility**
   - Given a child with an active agreement
   - When they view their agreement or device settings
   - Then they see a clear "Withdraw Consent" option
   - And the option explains this is their right

2. **AC2: Consequence Explanation**
   - Given a child views withdrawal options
   - When they see the withdrawal interface
   - Then system explains consequences clearly (device monitoring stops)
   - And system explains device status (becomes unmonitored, not inoperable)
   - And language is age-appropriate and non-threatening

3. **AC3: Confirmation Step**
   - Given a child initiates withdrawal
   - When they click withdraw consent
   - Then withdrawal requires confirmation step (not one-click)
   - And confirmation shows cooling period (24 hours)
   - And child must actively confirm they understand

4. **AC4: Parent Notification**
   - Given a child initiates consent withdrawal
   - When withdrawal request is submitted
   - Then parent is immediately notified of withdrawal request
   - And notification includes child's name and device affected
   - And parent is guided to discuss with child

5. **AC5: 24-Hour Cooling Period**
   - Given a withdrawal request is submitted
   - When cooling period begins
   - Then 24-hour countdown starts
   - And monitoring continues during cooling period
   - And both child and parents see countdown
   - And withdrawal can be cancelled during this time

6. **AC6: Family Discussion Opportunity**
   - Given withdrawal is in cooling period
   - When parents view the pending withdrawal
   - Then they can see why monitoring matters
   - And they're encouraged to discuss with child
   - And child can cancel withdrawal if they change their mind

7. **AC7: Withdrawal Execution**
   - Given cooling period has elapsed
   - When withdrawal takes effect
   - Then all monitoring stops on child's devices
   - And agreement status changes to 'withdrawn'
   - And audit trail records the withdrawal
   - And child sees confirmation that monitoring has stopped

8. **AC8: Device State After Withdrawal**
   - Given consent has been withdrawn
   - When child uses their devices
   - Then devices remain functional (not bricked)
   - And devices show "Consent Withdrawn" status
   - And no screenshots are captured
   - And no activity is logged

## Tasks / Subtasks

- [x] Task 1: Create consent withdrawal UI in extension popup (AC: #1, #2, #3)
  - [x] 1.1 Add "Withdraw Consent" section to popup.html for enrolled state
  - [x] 1.2 Create consequence explanation view with age-appropriate language
  - [x] 1.3 Add confirmation modal with cooling period explanation
  - [x] 1.4 Implement withdrawal request submission to Cloud Function

- [x] Task 2: Create withdrawal request Cloud Function (AC: #4, #5)
  - [x] 2.1 Create `apps/functions/src/http/consent/initiateWithdrawal.ts`
  - [x] 2.2 Validate child has active agreement
  - [x] 2.3 Create withdrawal request document with 24-hour expiry
  - [x] 2.4 Trigger parent notification via FCM/email
  - [x] 2.5 Return withdrawal request ID and countdown

- [x] Task 3: Create withdrawal status tracking (AC: #5, #6)
  - [x] 3.1 Add `withdrawalRequests` collection to Firestore
  - [x] 3.2 Document schema: `{ childId, familyId, requestedAt, expiresAt, status: 'pending' | 'cancelled' | 'executed' }`
  - [x] 3.3 Add Firestore security rules for withdrawal documents
  - [x] 3.4 Add parent view of pending withdrawal in dashboard

- [x] Task 4: Implement cancellation flow (AC: #6)
  - [x] 4.1 Create `apps/functions/src/http/consent/cancelWithdrawal.ts`
  - [x] 4.2 Allow child to cancel withdrawal during cooling period
  - [x] 4.3 Update withdrawal status to 'cancelled'
  - [x] 4.4 Notify parents that withdrawal was cancelled

- [x] Task 5: Implement withdrawal execution (AC: #7, #8)
  - [x] 5.1 Create scheduled function to check expired cooling periods
  - [x] 5.2 Execute withdrawal: update agreement status to 'withdrawn'
  - [x] 5.3 Clear consent cache on all child's devices
  - [x] 5.4 Log withdrawal to audit trail
  - [x] 5.5 Send final notification to parents and child

- [x] Task 6: Update extension for withdrawn state (AC: #8)
  - [x] 6.1 Add 'withdrawn' state handling to background.ts
  - [x] 6.2 Stop all monitoring when consent is withdrawn
  - [x] 6.3 Update popup UI to show "Consent Withdrawn" view
  - [x] 6.4 Ensure device remains functional (only monitoring disabled)

- [x] Task 7: Dashboard parent notification view (AC: #4, #6)
  - [x] 7.1 Create `WithdrawalPendingAlert` component
  - [x] 7.2 Show countdown timer on dashboard
  - [x] 7.3 Add family discussion resources link
  - [x] 7.4 Show which devices will be affected

- [x] Task 8: Unit Tests (AC: All)
  - [x] 8.1 Test withdrawal initiation validates active agreement
  - [x] 8.2 Test parent notification is sent immediately
  - [x] 8.3 Test cooling period prevents immediate execution
  - [x] 8.4 Test cancellation works during cooling period
  - [x] 8.5 Test withdrawal executes after 24 hours
  - [x] 8.6 Test monitoring stops on all child devices
  - [x] 8.7 Test device remains functional after withdrawal
  - [x] 8.8 Test audit trail records withdrawal event

## Dev Notes

### Implementation Strategy

This story allows children to withdraw their consent from the family monitoring agreement. This is a core child rights feature that ensures consent is meaningful and revocable. The 24-hour cooling period allows families to discuss before withdrawal takes effect.

### Key Requirements

- **FR26:** Device monitoring depends on child consent (this is the withdrawal mechanism)
- **Child Rights:** Consent must be revocable to be meaningful
- **Family Focus:** Cooling period encourages discussion, not punishment
- **NFR42:** WCAG 2.1 AA compliance for all UI components

### Technical Approach

1. **Withdrawal Request Document:**

```typescript
// Firestore: /withdrawalRequests/{requestId}
interface WithdrawalRequest {
  childId: string
  familyId: string
  agreementId: string
  deviceId: string // Device that initiated withdrawal
  requestedAt: Timestamp
  expiresAt: Timestamp // 24 hours from requestedAt
  status: 'pending' | 'cancelled' | 'executed'
  cancelledAt?: Timestamp
  executedAt?: Timestamp
  cancelReason?: string // If child provides reason for cancelling
}
```

2. **Extension Integration:**

```typescript
// In popup.ts - Add withdrawal section for enrolled state
function showWithdrawConsentSection() {
  // Only show if consent is granted
  if (state.consentStatus !== 'granted') return

  // Check if withdrawal already pending
  const pendingWithdrawal = await checkPendingWithdrawal()
  if (pendingWithdrawal) {
    showWithdrawalPendingView(pendingWithdrawal)
  } else {
    showWithdrawConsentButton()
  }
}
```

3. **Cloud Function Endpoints:**

```typescript
// initiateWithdrawal - POST
// Input: { childId, familyId, deviceId }
// Output: { requestId, expiresAt, message }

// cancelWithdrawal - POST
// Input: { requestId, childId }
// Output: { success, message }

// Scheduled function: processExpiredWithdrawals
// Runs every 5 minutes to check for expired cooling periods
```

4. **Consent-Gate Integration:**

The existing `consent-gate.ts` module already handles the 'withdrawn' status. When withdrawal executes:

- Agreement status changes to 'withdrawn'
- `checkConsentStatus` returns `consentStatus: 'withdrawn'`
- `shouldEnableMonitoring` returns false
- Extension stops monitoring automatically

### Previous Story Intelligence

**From Story 6.5 (Device Consent Gate) - COMPLETED:**

- `consent-gate.ts` already handles 'withdrawn' status
- `consentStatus` enum includes 'withdrawn' value
- `getConsentMessage()` returns "Agreement has been revoked - monitoring paused"
- Extension popup already has state machine for consent states
- Background.ts stops monitoring when consent is not granted
- Dashboard shows consent status badges on devices

**Files to Leverage:**

- `apps/extension/src/consent-gate.ts` - Already handles withdrawn state
- `apps/extension/src/background.ts` - Consent check integration exists
- `apps/extension/src/popup.ts` - State machine for consent states
- `apps/extension/popup.html` - UI sections for consent states
- `apps/functions/src/http/consent/checkStatus.ts` - Consent check endpoint

### Existing Code Patterns

From Story 6.5:

- Consent status checking via Cloud Function (not direct Firestore)
- Cache invalidation pattern in consent-gate.ts
- Health sync pattern for device status updates
- Parent notification via dashboard badge

### Project Structure Notes

**Files to Create:**

- `apps/extension/src/withdrawal.ts` - Withdrawal UI logic
- `apps/functions/src/http/consent/initiateWithdrawal.ts` - Start withdrawal
- `apps/functions/src/http/consent/cancelWithdrawal.ts` - Cancel withdrawal
- `apps/functions/src/scheduled/processWithdrawals.ts` - Execute withdrawals
- `apps/web/src/components/agreements/WithdrawalPendingAlert.tsx` - Dashboard alert

**Files to Modify:**

- `apps/extension/popup.html` - Add withdrawal UI sections
- `apps/extension/src/popup.ts` - Add withdrawal state handling
- `apps/extension/src/background.ts` - Handle withdrawal state
- `apps/functions/src/index.ts` - Export new functions
- `packages/firebase-rules/firestore.rules` - Add withdrawalRequests rules

### Security Considerations

1. **Child-Only Initiation**: Only the child can initiate withdrawal (verified via device assignment)
2. **No Parent Override**: Parents cannot cancel the withdrawal on behalf of the child
3. **Audit Trail**: All withdrawal actions are logged
4. **24-Hour Minimum**: Cooling period cannot be shortened or bypassed

### User Experience Considerations

1. **Non-Threatening Language**: Avoid making withdrawal feel like punishment
2. **Encourage Discussion**: Frame cooling period as opportunity, not barrier
3. **Clear Consequences**: Child must understand what stops working
4. **Reversible Until Execution**: Clear that they can cancel during cooling period

### References

- [Source: docs/epics/epic-list.md#Story-6.6]
- [Pattern: apps/extension/src/consent-gate.ts - Consent status types]
- [Pattern: apps/extension/src/popup.ts - State machine]
- [Pattern: apps/functions/src/http/consent/checkStatus.ts - Cloud Function pattern]
- [Source: Story 6.5 - Device Consent Gate, consent handling patterns]
- [Source: Story 6.3 - Agreement Activation, ActiveAgreement schema]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Created:**

- `apps/extension/src/withdrawal.ts` - Withdrawal API service functions
- `apps/functions/src/http/consent/initiateWithdrawal.ts` - Initiate withdrawal Cloud Function
- `apps/functions/src/http/consent/cancelWithdrawal.ts` - Cancel withdrawal Cloud Function
- `apps/functions/src/http/consent/checkWithdrawalStatus.ts` - Check withdrawal status Cloud Function
- `apps/functions/src/scheduled/executeWithdrawals.ts` - Scheduled function for expired withdrawals
- `apps/web/src/hooks/usePendingWithdrawals.ts` - Hook for real-time pending withdrawals
- `apps/web/src/components/dashboard/WithdrawalPendingAlert.tsx` - Dashboard alert component

**Tests Created:**

- `apps/functions/src/http/consent/initiateWithdrawal.test.ts` - 10 tests
- `apps/functions/src/http/consent/cancelWithdrawal.test.ts` - 10 tests
- `apps/functions/src/http/consent/checkWithdrawalStatus.test.ts` - 7 tests
- `apps/web/src/hooks/usePendingWithdrawals.test.ts` - 12 tests
- `apps/web/src/components/dashboard/WithdrawalPendingAlert.test.tsx` - 10 tests

**Modified:**

- `apps/extension/popup.html` - Added withdrawal UI sections (modal, states)
- `apps/extension/src/popup.ts` - Added withdrawal state handling and event listeners
- `apps/functions/src/http/consent/index.ts` - Export new withdrawal functions
- `apps/functions/src/scheduled/index.ts` - Export executeExpiredWithdrawals
- `apps/functions/src/index.ts` - Export all withdrawal endpoints
- `apps/web/src/app/dashboard/page.tsx` - Added WithdrawalPendingAlert component
- `apps/web/src/components/dashboard/index.ts` - Export WithdrawalPendingAlert
- `packages/firebase-rules/firestore.rules` - Added withdrawalRequests security rules
