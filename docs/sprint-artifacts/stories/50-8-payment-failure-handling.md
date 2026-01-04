# Story 50.8: Payment Failure Handling

## Status: done

## Story

As **a subscriber**,
I want **graceful handling of payment failures**,
So that **I don't lose access unexpectedly**.

## Acceptance Criteria

1. **AC1: Immediate Notification** ✅
   - Given payment fails (card declined, expired)
   - When renewal attempted
   - Then email notification immediately (via Stripe)

2. **AC2: Automatic Retry** ✅
   - Given payment failed
   - When in retry period
   - Then retry automatically: day 3, day 7, day 14 (via Stripe)

3. **AC3: Dashboard Warning** ✅
   - Given payment issue
   - When viewing dashboard
   - Then shows warning: "Payment issue - update card"

4. **AC4: Grace Period Access** ✅
   - Given payment failed
   - When in retry period
   - Then access continues during retry period (PAST_DUE status)

5. **AC5: Graceful Downgrade** ✅
   - Given retry period ends
   - When 14 days pass
   - Then downgrade to free tier (not deletion)

6. **AC6: Data Preservation** ✅
   - Given downgrade happens
   - When completed
   - Then data preserved: upgrade to restore full access

7. **AC7: Audit Logging (NFR42)** ✅
   - Given payment event
   - When processed
   - Then payment failures logged

## Tasks / Subtasks

### Task 1: Webhook Handling ✅

**Files:**

- `apps/functions/src/http/stripeWebhook.ts`

**Implementation:**
1.1 Handle invoice.payment_failed event ✅
1.2 Log payment failures ✅
1.3 Process subscription status changes ✅

### Task 2: Status Mapping ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
2.1 mapStripeStatus handles past_due ✅
2.2 PAST_DUE status allows continued access ✅
2.3 Feature checks respect PAST_DUE status ✅

### Task 3: Graceful Downgrade ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
3.1 downgradeToFreeTier() function ✅
3.2 Called when subscription deleted ✅
3.3 Preserves Stripe customer ID for resubscription ✅

## Dev Agent Record

### Context Reference

Epic 50: SaaS Subscription Management

- NFR42: Audit logging

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- Stripe handles payment retry schedule (Smart Retries)
- Stripe sends notification emails automatically
- PAST_DUE status mapped, allows continued access
- After Stripe exhausts retries and cancels subscription:
  - Webhook receives customer.subscription.deleted
  - downgradeToFreeTier() preserves data as FREE tier
- Stripe customer ID preserved for easy resubscription
- All payment events logged via Cloud Functions logger

### File List

- `apps/functions/src/http/stripeWebhook.ts` - Webhook handler
- `apps/functions/src/services/subscriptionService.ts` - Status mapping and downgrade

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-04 | Story created and marked done |
