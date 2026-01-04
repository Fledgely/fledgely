# Story 50.4: Billing Management Portal

## Status: done

## Story

As **a subscriber**,
I want **to manage my billing**,
So that **I can update payment and view history**.

## Acceptance Criteria

1. **AC1: Current Plan Display** ✅
   - Given user has active subscription
   - When accessing billing settings
   - Then shows: current plan, next billing date, amount

2. **AC2: Update Payment** ✅
   - Given user in billing settings
   - When wanting to update card
   - Then can update payment method via Stripe portal

3. **AC3: Invoice History** ✅
   - Given user in portal
   - When viewing history
   - Then can view invoice history (via Stripe portal)

4. **AC4: Download Invoices** ✅
   - Given invoice displayed
   - When requesting download
   - Then can download invoices as PDF (via Stripe portal)

5. **AC5: Plan Switching** ✅
   - Given user subscribed
   - When wanting to change billing cycle
   - Then can switch between monthly/annual (via portal)

6. **AC6: Billing Email** ✅
   - Given Stripe customer
   - When updating info
   - Then can add billing email (via Stripe portal)

7. **AC7: Proration** ✅
   - Given plan change
   - When processed
   - Then proration handled automatically by Stripe

## Tasks / Subtasks

### Task 1: Portal Session Creation ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
1.1 createPortalSession() function ✅
1.2 Return URL configuration ✅
1.3 Customer ID lookup ✅

### Task 2: Callable Function ✅

**Files:**

- `apps/functions/src/callable/subscription.ts`

**Implementation:**
2.1 manageSubscription callable ✅
2.2 Returns portalUrl ✅
2.3 Validates user has billing account ✅

### Task 3: Subscription Data Access ✅

**Files:**

- `apps/functions/src/callable/subscription.ts`

**Implementation:**
3.1 getCurrentSubscription callable ✅
3.2 Returns subscription details ✅
3.3 Period dates and status ✅

## Dev Agent Record

### Context Reference

Epic 50: SaaS Subscription Management

- Billing management

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- Stripe Customer Portal handles all billing management
- createPortalSession() creates secure portal link
- Portal allows: card updates, invoice downloads, plan changes
- All proration handled by Stripe automatically
- Portal returns to /settings/billing after completion

### File List

- `apps/functions/src/services/subscriptionService.ts` - createPortalSession()
- `apps/functions/src/callable/subscription.ts` - manageSubscription callable

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-04 | Story created and marked done |
