# Story 35-3: Agreement Renewal Flow

## Story

As **a parent**,
I want **to easily renew our agreement**,
So that **monitoring can continue smoothly**.

## Status: done

## Acceptance Criteria

- [x] AC1: Option: "Renew as-is" or "Renew with changes" when initiating renewal
- [x] AC2: "Renew as-is" extends expiry with same terms
- [x] AC3: "Renew with changes" enters modification flow (Epic 34)
- [x] AC4: Child must consent to renewal (even as-is)
- [x] AC5: Both signatures required for renewal
- [x] AC6: New expiry date set upon renewal completion

## Technical Tasks

### Task 1: Renewal Flow Types and Constants

Create TypeScript types and constants for renewal flow in shared package.

**Files:**

- `packages/shared/src/contracts/agreementRenewal.ts` (new)
- `packages/shared/src/contracts/agreementRenewal.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Implementation:**

```typescript
// Renewal mode options
export const renewalModeSchema = z.enum(['renew-as-is', 'renew-with-changes'])

// Renewal status schema
export const renewalStatusSchema = z.enum([
  'pending',
  'parent-initiated',
  'child-consenting',
  'completed',
  'cancelled',
])

// Renewal request schema
export const renewalRequestSchema = z.object({
  agreementId: z.string(),
  mode: renewalModeSchema,
  initiatedBy: z.enum(['parent', 'system']),
  initiatedAt: z.date(),
  newExpiryDate: z.date().optional(),
})
```

**Acceptance Criteria:** AC1, AC2, AC3

### Task 2: Renewal Service

Create service for managing renewal flow logic.

**Files:**

- `apps/web/src/services/agreementRenewalService.ts` (new)
- `apps/web/src/services/agreementRenewalService.test.ts` (new)

**Functions:**

- `initiateRenewal(agreementId, mode)` - Start renewal process
- `calculateNewExpiryDate(currentExpiry, duration)` - Calculate new expiry
- `canRenewAsIs(agreement)` - Check if agreement eligible for as-is renewal
- `getRenewalStatus(agreementId)` - Get current renewal status
- `completeRenewal(agreementId)` - Finalize renewal with new expiry

**Acceptance Criteria:** AC1, AC2, AC6

### Task 3: useAgreementRenewal Hook

Create hook for managing renewal state and actions.

**Files:**

- `apps/web/src/hooks/useAgreementRenewal.ts` (new)
- `apps/web/src/hooks/useAgreementRenewal.test.ts` (new)

**Interface:**

```typescript
interface UseAgreementRenewalResult {
  renewalStatus: RenewalStatus | null
  isRenewing: boolean
  renewalMode: RenewalMode | null
  initiateRenewal: (mode: RenewalMode) => void
  cancelRenewal: () => void
  completeRenewal: () => void
  parentSignature: SignatureInfo | null
  childConsent: ConsentInfo | null
  canComplete: boolean
}
```

**Acceptance Criteria:** AC4, AC5

### Task 4: RenewalModeSelector Component

Create component for selecting renewal mode.

**Files:**

- `apps/web/src/components/agreements/RenewalModeSelector.tsx` (new)
- `apps/web/src/components/agreements/RenewalModeSelector.test.tsx` (new)

**Props:**

```typescript
interface RenewalModeSelectorProps {
  agreementId: string
  onModeSelected: (mode: RenewalMode) => void
  onCancel: () => void
}
```

**Features:**

- "Renew as-is" option with description
- "Renew with changes" option with description
- Clear visual distinction between options
- Cancel option
- Highlights current terms for "as-is" option

**Acceptance Criteria:** AC1, AC2, AC3

### Task 5: RenewalConsentFlow Component

Create component for dual-consent renewal process.

**Files:**

- `apps/web/src/components/agreements/RenewalConsentFlow.tsx` (new)
- `apps/web/src/components/agreements/RenewalConsentFlow.test.tsx` (new)

**Props:**

```typescript
interface RenewalConsentFlowProps {
  agreementId: string
  renewalMode: RenewalMode
  onComplete: () => void
  onCancel: () => void
}
```

**Features:**

- Step indicator (1. Parent confirms, 2. Child consents, 3. Complete)
- Parent signature capture
- Child consent capture
- Progress tracking
- Completion confirmation with new expiry date

**Acceptance Criteria:** AC4, AC5, AC6

### Task 6: Integration Tests

Create integration tests for complete renewal flow.

**Files:**

- `apps/web/src/components/agreements/RenewalFlow.integration.test.tsx` (new)

**Test Scenarios:**

- Full "renew as-is" flow: initiate → parent signs → child consents → complete
- "Renew with changes" redirects to modification flow (Epic 34)
- Expiry date correctly extended upon completion
- Both signatures required for completion
- Cancellation at any point

**Acceptance Criteria:** All ACs

## Dev Notes

### Previous Story Intelligence (35-2)

Story 35-2 established the renewal reminder system:

- **Reminder Service**: `apps/web/src/services/renewalReminderService.ts`
- **Reminder Hook**: `apps/web/src/hooks/useRenewalReminders.ts`
- **Renewal Banner**: `apps/web/src/components/agreements/RenewalReminderBanner.tsx`
- **Reminder types**: '30-day', '7-day', '1-day' with urgency levels

The "Renew Now" button from the reminder components should trigger this renewal flow.

### Previous Story Intelligence (35-1)

Story 35-1 established the expiry configuration:

- **Expiry Types**: `packages/shared/src/contracts/agreementExpiry.ts`
  - `ExpiryDuration`: '3-months' | '6-months' | '1-year' | 'no-expiry'
  - `calculateExpiryDate(duration, startDate)` - Reuse for renewal
  - `isExpiringSoon(expiryDate, thresholdDays)` - Check expiry status

### Integration with Epic 34

Epic 34 established the agreement modification flow:

- **Change Flow**: Parent proposes changes → Child reviews → Both sign
- "Renew with changes" (AC3) should redirect to this existing flow
- Reuse signature components from Epic 34

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Zod Schemas**: All types use Zod for validation
- **Vitest + React Testing Library**: Testing stack
- **Shared Package First**: Types and constants in `packages/shared`
- **Service Layer**: Business logic in `services/`
- **Custom Hooks**: State management in `hooks/`

### Renewal Flow Logic

```
Renewal initiated (from reminder "Renew Now" or direct action)
  ├── "Renew as-is" selected
  │   ├── Parent signature captured
  │   ├── Child consent captured
  │   └── New expiry date calculated and set
  │       └── Agreement extended with same terms
  └── "Renew with changes" selected
      └── Redirect to Epic 34 modification flow
          └── After modifications, new expiry set on completion
```

### UI/UX Patterns

- **Mode Selection**: Card-based selection with clear descriptions
- **Consent Flow**: Step-by-step wizard with progress indicator
- **Signature Capture**: Reuse existing signature components
- **Confirmation**: Clear display of new expiry date

### File Structure

```
packages/shared/src/contracts/
  agreementRenewal.ts           # Types and constants
  agreementRenewal.test.ts      # Unit tests

apps/web/src/
  services/
    agreementRenewalService.ts      # Service logic
    agreementRenewalService.test.ts
  hooks/
    useAgreementRenewal.ts          # State hook
    useAgreementRenewal.test.ts
  components/agreements/
    RenewalModeSelector.tsx         # Mode selection component
    RenewalModeSelector.test.tsx
    RenewalConsentFlow.tsx          # Consent flow component
    RenewalConsentFlow.test.tsx
    RenewalFlow.integration.test.tsx
```

### References

- [Source: packages/shared/src/contracts/agreementExpiry.ts] - Expiry types and utilities
- [Source: apps/web/src/services/renewalReminderService.ts] - Reminder integration
- [Source: apps/web/src/components/agreements/RenewalReminderBanner.tsx] - "Renew Now" trigger
- [Source: docs/epics/epic-list.md#Story 35.3] - Original requirements

## Dev Agent Record

### Context Reference

Story 35-1 (129 tests) and Story 35-2 (140 tests) completed. Expiry and reminder infrastructure ready.

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- **126 tests total**: 39 shared + 25 service + 17 hook + 13 selector + 17 consent + 15 integration
- TDD approach followed throughout
- All ESLint issues resolved
- Dual-consent flow: Parent signs first, then child consents
- Mode options: renew-as-is (extends expiry) and renew-with-changes (modification flow)
- Expiry calculation from current date or current expiry (whichever is later)

### File List

**New Files:**

- `packages/shared/src/contracts/agreementRenewal.ts`
- `packages/shared/src/contracts/agreementRenewal.test.ts`
- `apps/web/src/services/agreementRenewalService.ts`
- `apps/web/src/services/agreementRenewalService.test.ts`
- `apps/web/src/hooks/useAgreementRenewal.ts`
- `apps/web/src/hooks/useAgreementRenewal.test.ts`
- `apps/web/src/components/agreements/RenewalModeSelector.tsx`
- `apps/web/src/components/agreements/RenewalModeSelector.test.tsx`
- `apps/web/src/components/agreements/RenewalConsentFlow.tsx`
- `apps/web/src/components/agreements/RenewalConsentFlow.test.tsx`
- `apps/web/src/components/agreements/RenewalFlow.integration.test.tsx`

**Updated Files:**

- `packages/shared/src/contracts/index.ts`
- `packages/shared/src/index.ts`
