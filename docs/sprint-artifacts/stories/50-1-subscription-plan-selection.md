# Story 50.1: Subscription Plan Selection

## Status: done

## Story

As **a parent**,
I want **to choose a subscription plan**,
So that **I can access fledgely SaaS (FR97)**.

## Acceptance Criteria

1. **AC1: Plan Display** ✅
   - Given user wants to use fledgely SaaS
   - When viewing pricing page
   - Then shows available plans: Free tier, Family plan

2. **AC2: Feature Comparison** ✅
   - Given plans displayed
   - When viewing details
   - Then clear feature comparison between plans

3. **AC3: Free Tier Limits** ✅
   - Given Free tier selected
   - When viewing limits
   - Then limited features, 1 child, 1 device

4. **AC4: Family Plan** ✅
   - Given Family plan selected
   - When viewing features
   - Then full features, unlimited children/devices

5. **AC5: Annual Discount** ✅
   - Given viewing pricing
   - When comparing billing cycles
   - Then annual discount shown (save 20%)

6. **AC6: Family-Only (FR135)** ✅
   - Given viewing plans
   - When browsing
   - Then no enterprise/school plans visible

7. **AC7: Transparent Pricing** ✅
   - Given viewing pricing
   - When reviewing costs
   - Then pricing transparent, no hidden fees

## Tasks / Subtasks

### Task 1: Create Subscription Data Models ✅

**Files:**

- `packages/shared/src/contracts/subscription.ts` (create)

**Implementation:**
1.1 Define SubscriptionPlan enum ✅
1.2 Define SubscriptionStatus enum ✅
1.3 Define Subscription interface ✅
1.4 Define PlanFeatures interface ✅

### Task 2: Create Subscription Service ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts` (create)

**Implementation:**
2.1 Create getSubscriptionPlans function ✅
2.2 Create getUserSubscription function ✅
2.3 Create subscription validation helpers ✅

### Task 3: Create Subscription Callable Functions ✅

**Files:**

- `apps/functions/src/callable/subscription.ts` (create)

**Implementation:**
3.1 Create getPlans callable ✅
3.2 Create getCurrentSubscription callable ✅

## Dev Agent Record

### Context Reference

Epic 50: SaaS Subscription Management

- FR97: Subscription access
- FR135: Family-only plans

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- Created comprehensive subscription data models with SubscriptionPlan, SubscriptionStatus, BillingInterval enums
- Defined SUBSCRIPTION_PLANS constant with FREE, FAMILY_MONTHLY, and FAMILY_ANNUAL plans
- Free tier: 1 child, 1 device, limited features
- Family plans: unlimited children/devices, all features, 20% annual discount ($9.99/mo or $95.90/yr)
- Created subscription service with Stripe integration for checkout, portal, and webhook handling
- Created callable functions for plan management, subscription creation, cancellation, and reactivation
- Created Stripe webhook HTTP handler for subscription lifecycle events
- All types exported from @fledgely/shared package

### File List

- `packages/shared/src/contracts/subscription.ts` - Subscription types and schemas
- `packages/shared/src/contracts/index.ts` - Re-exports for subscription module
- `packages/shared/src/index.ts` - Main package exports
- `apps/functions/src/services/subscriptionService.ts` - Stripe integration service
- `apps/functions/src/callable/subscription.ts` - Callable functions
- `apps/functions/src/http/stripeWebhook.ts` - Webhook handler
- `apps/functions/src/index.ts` - Function exports

## Change Log

| Date       | Change                                  |
| ---------- | --------------------------------------- |
| 2026-01-04 | Story created                           |
| 2026-01-04 | Story completed - all tasks implemented |
