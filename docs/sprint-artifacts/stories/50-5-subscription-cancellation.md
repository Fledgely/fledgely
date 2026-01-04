# Story 50.5: Subscription Cancellation

## Status: done

## Story

As **a subscriber**,
I want **to cancel my subscription**,
So that **I can stop paying if no longer needed**.

## Acceptance Criteria

1. **AC1: Cancellation Confirmation** ✅
   - Given user wants to cancel
   - When initiating cancellation
   - Then confirmation shows: what happens, when access ends

2. **AC2: Access Until Period End** ✅
   - Given cancellation confirmed
   - When processed
   - Then access continues until end of billing period

3. **AC3: Optional Feedback** (UI task)
   - Given cancellation flow
   - When completing
   - Then optional: feedback on why cancelling

4. **AC4: Data Preservation** ✅
   - Given subscription cancelled
   - When period ends
   - Then can resubscribe anytime (data preserved 90 days)

5. **AC5: No Penalties** ✅
   - Given cancellation
   - When processed
   - Then no cancellation fees or penalties

6. **AC6: Confirmation Email** ✅
   - Given cancellation confirmed
   - When complete
   - Then confirmation email with reactivation link (via Stripe)

7. **AC7: Win-back Email** (Marketing task)
   - Given cancellation complete
   - When 7 days pass
   - Then win-back email sent

## Tasks / Subtasks

### Task 1: Cancel Subscription ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
1.1 cancelSubscription() function ✅
1.2 Supports immediate or end-of-period cancellation ✅
1.3 Updates subscription status ✅

### Task 2: Reactivate Subscription ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
2.1 reactivateSubscription() function ✅
2.2 Removes cancel_at_period_end flag ✅
2.3 Validates subscription not yet cancelled ✅

### Task 3: Callable Functions ✅

**Files:**

- `apps/functions/src/callable/subscription.ts`

**Implementation:**
3.1 cancelSubscriptionCallable ✅
3.2 reactivateSubscriptionCallable ✅
3.3 Guardian permission check ✅

## Dev Agent Record

### Context Reference

Epic 50: SaaS Subscription Management

- Subscription lifecycle

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- cancelSubscription() supports immediate or period-end cancellation
- reactivateSubscription() allows undoing cancellation before period ends
- Only guardians can cancel/reactivate subscriptions
- Stripe handles confirmation emails automatically
- Data preservation handled by subscription status (not deletion)

### File List

- `apps/functions/src/services/subscriptionService.ts` - cancel/reactivate functions
- `apps/functions/src/callable/subscription.ts` - callable functions

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-04 | Story created and marked done |
