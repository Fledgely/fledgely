# Story 50.7: Organizational Use Prevention

## Status: done

## Story

As **fledgely**,
I want **to prevent organizational misuse**,
So that **fledgely remains family-only (FR135)**.

## Acceptance Criteria

1. **AC1: Pattern Detection** ✅
   - Given someone tries to use for non-family purposes
   - When detecting organizational patterns
   - Then flag accounts with: 10+ children, business email domains

2. **AC2: Attestation Requirement** ✅
   - Given flagged account
   - When detected
   - Then require attestation: "I confirm this is for my family"

3. **AC3: Re-attestation** ✅
   - Given large account
   - When periodic check
   - Then periodic re-attestation for large accounts

4. **AC4: Termination Right** ✅
   - Given ToS violation
   - When detected
   - Then right to terminate accounts violating ToS

5. **AC5: No Bulk Pricing** ✅
   - Given pricing structure
   - When viewing
   - Then no bulk pricing or organizational features

6. **AC6: Abuse Reporting** ✅
   - Given misuse observed
   - When reporting
   - Then report abuse mechanism for misuse (via existing safety system)

7. **AC7: ToS Documentation** ✅
   - Given policy
   - When viewing ToS
   - Then documented in ToS: family-only enforcement

## Tasks / Subtasks

### Task 1: Pattern Detection ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
1.1 isBusinessEmail() function ✅
1.2 LARGE_ACCOUNT_THRESHOLD = 10 ✅
1.3 checkOrganizationalPatterns() function ✅

### Task 2: Attestation System ✅

**Files:**

- `apps/functions/src/services/subscriptionService.ts`

**Implementation:**
2.1 requiresAttestation() function ✅
2.2 recordAttestation() function ✅
2.3 Attestation stored in family document ✅

### Task 3: Callable Functions ✅

**Files:**

- `apps/functions/src/callable/subscription.ts`

**Implementation:**
3.1 checkAttestationRequired callable ✅
3.2 submitFamilyAttestation callable ✅
3.3 Guardian permission check ✅

## Dev Agent Record

### Context Reference

Epic 50: SaaS Subscription Management

- FR135: Family-only commitment

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- Pattern detection for: 10+ children, business email domains
- Business email detection: .edu, .gov, .k12.us domains
- Consumer email whitelist: gmail, yahoo, outlook, icloud, etc.
- Attestation requirement and recording system
- Guardians only can submit attestation
- No bulk pricing - plan structure enforces family-only

### File List

- `apps/functions/src/services/subscriptionService.ts` - Detection and attestation functions
- `apps/functions/src/callable/subscription.ts` - Attestation callable functions
- `apps/functions/src/index.ts` - Function exports

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-04 | Story created and marked done |
