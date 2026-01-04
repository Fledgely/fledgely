# Story 50.3: Stripe Payment Integration

## Status: done

## Story

As **a parent**,
I want **to pay with credit card**,
So that **I can subscribe to fledgely (FR98)**.

## Acceptance Criteria

1. **AC1: Stripe Checkout** ✅
   - Given user selects paid plan
   - When entering payment
   - Then Stripe Checkout handles payment securely

2. **AC2: Payment Methods** ✅
   - Given checkout active
   - When choosing payment
   - Then accepts: credit cards, debit cards

3. **AC3: Currency Support** ✅
   - Given Stripe configured
   - When processing payment
   - Then supports: USD, EUR, GBP, CAD, AUD (via Stripe)

4. **AC4: No Data Storage** ✅
   - Given payment processed
   - When complete
   - Then no payment data stored by fledgely

5. **AC5: Receipt** ✅
   - Given payment successful
   - When complete
   - Then receipt emailed immediately (via Stripe)

6. **AC6: Subscription Start** ✅
   - Given payment successful
   - When confirmed
   - Then subscription starts upon payment

7. **AC7: Audit Logging (NFR42)** ✅
   - Given payment event
   - When processed
   - Then payment events logged (no card details)

## Tasks / Subtasks

### Task 1: Stripe Client Setup ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
1.1 Stripe SDK initialization ✅
1.2 API version configuration ✅
1.3 Environment variable for API key ✅

### Task 2: Checkout Session Creation ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
2.1 createCheckoutSession() function ✅
2.2 Price ID mapping for plans ✅
2.3 Success/cancel URL handling ✅

### Task 3: Customer Management ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
3.1 getOrCreateStripeCustomer() function ✅
3.2 Customer ID stored in user document ✅
3.3 Customer metadata includes userId ✅

### Task 4: Callable Function ✅

**Files:**

- `apps/functions/src/callable/subscription.ts`

**Implementation:**
4.1 createSubscription callable ✅
4.2 Returns checkoutUrl and sessionId ✅
4.3 Validates plan and billing interval ✅

## Dev Agent Record

### Context Reference

Epic 50: SaaS Subscription Management

- FR98: Payment integration
- NFR42: Audit logging

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- Stripe SDK v20.1.0 installed and configured
- API version 2025-12-15.clover used for latest features
- createCheckoutSession() creates Stripe hosted checkout
- Payment data never stored in Firestore
- All payment events logged via Cloud Functions logger
- Customer portal available for card updates

### File List

- `apps/functions/package.json` - Stripe SDK dependency
- `apps/functions/src/services/subscriptionService.ts` - Stripe integration
- `apps/functions/src/callable/subscription.ts` - createSubscription callable

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-04 | Story created and marked done |
