# Story 24.1: Parent Classification Correction

Status: done

## Story

As a **parent**,
I want **to correct AI misclassifications**,
So that **future similar content is classified correctly**.

## Acceptance Criteria

1. **AC1: Correct this option available**
   - Given parent is viewing a screenshot with classification
   - When parent disagrees with category
   - Then parent can select "Correct this" option

2. **AC2: Category dropdown**
   - Given parent selects "Correct this"
   - When correction UI appears
   - Then dropdown shows available categories to choose from

3. **AC3: Correction saved**
   - Given parent selects correct category
   - When submitting correction
   - Then correction saved with: original category, corrected category, parentId

4. **AC4: Acknowledgment message**
   - Given correction is submitted
   - When save completes
   - Then parent sees: "Thanks! We'll learn from this"

5. **AC5: Immediate UI update**
   - Given correction is saved
   - When returning to dashboard
   - Then corrected classification updates in dashboard immediately

## Tasks / Subtasks

- [x] Task 1: Extend FlagDocument schema for corrections (AC: #3)
  - [x] 1.1 Add `correctedCategory?: ConcernCategory` field
  - [x] 1.2 Add `correctionParentId?: string` field
  - [x] 1.3 Add `correctedAt?: number` field
  - [x] 1.4 Update shared types in `packages/shared/src/contracts/index.ts`
  - [x] 1.5 Export new types from `packages/shared/src/index.ts`

- [x] Task 2: Create correction service function (AC: #3)
  - [x] 2.1 Add `correctFlagCategory` function to `apps/web/src/services/flagService.ts`
  - [x] 2.2 Validate corrected category is different from original
  - [x] 2.3 Update flag document with correction fields
  - [x] 2.4 Add audit trail entry for correction

- [x] Task 3: Create FlagCorrectionModal component (AC: #1, #2, #4)
  - [x] 3.1 Create `apps/web/src/components/flags/FlagCorrectionModal.tsx`
  - [x] 3.2 Show dropdown with available categories
  - [x] 3.3 Pre-select current category for clarity
  - [x] 3.4 Display acknowledgment message on success
  - [x] 3.5 Handle loading and error states

- [x] Task 4: Add correction button to FlagDetailModal (AC: #1)
  - [x] 4.1 Add "Correct this" button to action area
  - [x] 4.2 Open FlagCorrectionModal when clicked
  - [x] 4.3 Update flag display after correction

- [x] Task 5: Update dashboard to show corrections (AC: #5)
  - [x] 5.1 Update FlagCard to display corrected category if present
  - [x] 5.2 Add visual indicator for corrected flags
  - [x] 5.3 Real-time subscription already handles updates

## Dev Notes

### Previous Story Intelligence (Epic 23)

Epic 23 established parent notification and flag review patterns:

- `FlagDetailModal` displays flag details with action buttons
- `FlagActionModal` handles flag actions (dismiss, discuss, escalate)
- `flagService.ts` contains flag operations with audit trail
- Real-time subscriptions via Firestore `onSnapshot`

**Key Files:**

- `apps/web/src/components/flags/FlagDetailModal.tsx` - Detail view
- `apps/web/src/components/flags/FlagActionModal.tsx` - Action patterns
- `apps/web/src/services/flagService.ts` - Flag operations
- `packages/shared/src/contracts/index.ts` - FlagDocument schema

### Existing Infrastructure

**FlagDocument already has feedback fields (Story 21.7):**

```typescript
feedbackRating?: 'helpful' | 'not_helpful' | 'false_positive'
feedbackComment?: string
feedbackAt?: number
```

**NEW fields for Story 24.1:**

```typescript
correctedCategory?: ConcernCategory  // The corrected category
correctionParentId?: string          // Parent who made correction
correctedAt?: number                 // When correction was made
```

### Concern Categories

```typescript
const CONCERN_CATEGORY_VALUES = [
  'Violence',
  'Adult Content',
  'Bullying',
  'Self-Harm Indicators',
  'Explicit Language',
  'Unknown Contacts',
] as const
```

### UI Flow

1. Parent views flag in FlagDetailModal
2. Parent clicks "Correct this" button
3. FlagCorrectionModal opens with category dropdown
4. Parent selects correct category
5. Parent clicks "Submit Correction"
6. Confirmation: "Thanks! We'll learn from this"
7. Modal closes, flag updated in real-time

### Component Structure

```
apps/web/src/
├── components/
│   └── flags/
│       ├── FlagDetailModal.tsx (UPDATE - add correction button)
│       ├── FlagCorrectionModal.tsx (NEW)
│       └── FlagCard.tsx (UPDATE - show corrected category)
├── services/
│   └── flagService.ts (UPDATE - add correctFlagCategory)
packages/shared/src/
├── contracts/
│   └── index.ts (UPDATE - add correction fields)
└── index.ts (UPDATE - export new types)
```

### Audit Trail

Add 'correct' action type to `flagActionTypeSchema`:

```typescript
export const flagActionTypeSchema = z.enum([
  'dismiss',
  'discuss',
  'escalate',
  'view',
  'discussed_together',
  'correct', // NEW
])
```

### Testing Requirements

1. **Unit Tests:**
   - FlagCorrectionModal renders category dropdown
   - Correction service validates different category
   - Audit trail entry created on correction

2. **Integration Tests:**
   - Correction flow end-to-end
   - Dashboard updates after correction
   - Real-time subscription reflects changes

### References

- [Source: docs/epics/epic-list.md#Story 24.1] - Story requirements
- [Source: apps/web/src/components/flags/FlagDetailModal.tsx] - Detail view
- [Source: apps/web/src/services/flagService.ts] - Flag operations
- [Source: packages/shared/src/contracts/index.ts] - FlagDocument schema

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/web/src/components/flags/FlagCorrectionModal.tsx` - Category correction modal

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added correction fields to FlagDocument
- `packages/shared/src/index.ts` - Export correction types
- `apps/web/src/services/flagService.ts` - Added correctFlagCategory function
- `apps/web/src/components/flags/FlagDetailModal.tsx` - Added correction button
- `apps/web/src/components/flags/FlagCard.tsx` - Show corrected category
