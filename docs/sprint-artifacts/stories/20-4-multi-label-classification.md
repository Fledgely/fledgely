# Story 20.4: Multi-Label Classification

Status: done

## Story

As **the classification system**,
I want **to assign multiple relevant categories when appropriate**,
So that **mixed-content screenshots are accurately described**.

## Acceptance Criteria

1. **AC1: Primary category assigned (highest confidence)**
   - Given screenshot contains multiple content types
   - When AI analyzes content
   - Then primary category assigned based on highest confidence

2. **AC2: Secondary categories assigned if confidence > 50%**
   - Given screenshot has multiple relevant categories
   - When AI returns classification
   - Then secondary categories assigned if confidence > 50%
   - And secondary categories sorted by confidence (descending)

3. **AC3: Maximum 3 categories per screenshot**
   - Given screenshot analysis returns many categories
   - When storing classification
   - Then maximum 3 categories stored (1 primary + up to 2 secondary)
   - And additional categories beyond 3 are discarded

4. **AC4: Parent sees primary category in gallery view**
   - Given parent views screenshot gallery
   - When displaying category badges
   - Then primary category shown prominently
   - And secondary categories not shown (to avoid clutter)

5. **AC5: All categories visible in detail view**
   - Given parent views screenshot detail page
   - When classification is complete
   - Then primary category displayed prominently
   - And secondary categories shown with lower visual priority
   - And confidence scores shown for all categories

6. **AC6: Example mixed-content handling**
   - Given YouTube homework video screenshot
   - When AI classifies content
   - Then example: Educational (primary), Entertainment (secondary)
   - And both categories reflect actual content

## Tasks / Subtasks

- [x] Task 1: Update classification schema for multi-label support (AC: #1, #2, #3)
  - [x] 1.1 Add `secondaryCategories` array to `classificationResultSchema`
  - [x] 1.2 Create `secondaryCategorySchema` with category and confidence
  - [x] 1.3 Add `SECONDARY_CONFIDENCE_THRESHOLD = 50` constant (as CONFIDENCE_THRESHOLDS.SECONDARY)
  - [x] 1.4 Add `MAX_CATEGORIES = 3` constant
  - [x] 1.5 Write unit tests for new schema fields

- [x] Task 2: Update Gemini prompt for multi-category response (AC: #1, #2, #6)
  - [x] 2.1 Update `classificationPrompt.ts` to request multiple categories
  - [x] 2.2 Modify prompt to return `primaryCategory` and `secondaryCategories[]`
  - [x] 2.3 Request confidence scores for each category
  - [x] 2.4 Include example of mixed-content classification in prompt

- [x] Task 3: Update geminiClient to parse multi-label response (AC: #1, #2, #3)
  - [x] 3.1 Update `GeminiClassificationResponse` interface with secondaryCategories
  - [x] 3.2 Parse secondary categories from API response
  - [x] 3.3 Filter secondary categories by 50% confidence threshold
  - [x] 3.4 Limit to maximum 2 secondary categories (total 3 max)
  - [x] 3.5 Sort secondary categories by confidence descending
  - [x] 3.6 Write unit tests for multi-label parsing

- [x] Task 4: Update classification storage (AC: #3)
  - [x] 4.1 Update `classifyScreenshot.ts` to store secondaryCategories
  - [x] 4.2 Ensure backward compatibility with existing documents
  - [x] 4.3 Write integration test for full multi-label flow

- [x] Task 5: Create CategoryBadgeList component for multi-category display (AC: #4, #5)
  - [x] 5.1 Create `CategoryBadgeList` component for displaying multiple categories
  - [x] 5.2 Add `variant` prop for 'gallery' (primary only) and 'detail' (all categories)
  - [x] 5.3 Show confidence for secondary categories in detail view
  - [x] 5.4 Use existing category color classes from categories.ts
  - [x] 5.5 Write component tests

- [x] Task 6: Update existing components to support multi-label (AC: #4, #5)
  - [x] 6.1 Export CategoryBadgeList from components (direct import pattern)
  - [x] 6.2 Verify backward compatibility with existing single-category data
  - [x] 6.3 Update story status to done

## Dev Notes

### Previous Story Intelligence (Stories 20-1, 20-2, 20-3)

Stories 20-1 through 20-3 established:

- `classificationResultSchema` with `primaryCategory`, `confidence`, `isLowConfidence`, `taxonomyVersion`, `needsReview`
- `GeminiClassificationResponse` interface in geminiClient.ts
- `buildClassificationPrompt()` in classificationPrompt.ts
- Category definitions and display utilities in categories.ts
- CONFIDENCE_THRESHOLDS (HIGH=85, MEDIUM=60)
- LOW_CONFIDENCE_THRESHOLD (30) for "Other" fallback

**What Story 20-4 adds:**

- `secondaryCategories` array field in classification result
- Multi-category prompt for Gemini
- Secondary category parsing with 50% threshold
- Maximum 3 categories constraint
- CategoryBadgeList component for displaying multiple categories

### Schema Extension

```typescript
// packages/shared/src/contracts/index.ts
export const secondaryCategorySchema = z.object({
  category: categorySchema,
  confidence: z.number().min(0).max(100),
})
export type SecondaryCategory = z.infer<typeof secondaryCategorySchema>

// Add to classificationResultSchema:
secondaryCategories: z.array(secondaryCategorySchema).max(2).optional(),
```

### Constants

```typescript
// packages/shared/src/constants/confidence.ts
/** Minimum confidence for secondary category inclusion */
export const SECONDARY_CONFIDENCE_THRESHOLD = 50

/** Maximum categories per classification (1 primary + 2 secondary) */
export const MAX_CATEGORIES = 3
```

### Gemini Response Format

```typescript
// Updated response from Gemini:
interface GeminiMultiLabelResponse {
  primaryCategory: Category
  primaryConfidence: number
  secondaryCategories: Array<{
    category: Category
    confidence: number
  }>
  reasoning: string
}
```

### CategoryBadgeList Component

```tsx
// apps/web/src/components/CategoryBadgeList.tsx
interface CategoryBadgeListProps {
  primaryCategory: Category
  primaryConfidence: number
  secondaryCategories?: SecondaryCategory[]
  variant: 'gallery' | 'detail'
}
```

### Implementation Files

**New Files:**

```
apps/web/src/components/CategoryBadgeList.tsx     # Multi-category display
apps/web/src/components/CategoryBadgeList.test.tsx
```

**Modified Files:**

```
packages/shared/src/contracts/index.ts            # Add secondaryCategories field
packages/shared/src/constants/confidence.ts       # Add SECONDARY_CONFIDENCE_THRESHOLD
packages/shared/src/index.ts                      # Export new types/constants
apps/functions/src/services/classification/classificationPrompt.ts  # Multi-category prompt
apps/functions/src/services/classification/geminiClient.ts  # Parse secondary categories
apps/functions/src/services/classification/geminiClient.test.ts  # Tests
apps/functions/src/services/classification/classifyScreenshot.ts  # Store secondary categories
```

### Testing Requirements

1. **Unit Tests** (co-located `*.test.ts`):
   - Schema validation for secondaryCategories array
   - Confidence threshold filtering (50%)
   - Maximum categories limit (3)
   - Gemini response parsing for multi-label
   - CategoryBadgeList rendering for both variants

2. **Integration Tests**:
   - Full flow: classify → multi-label → storage → display

### Project Structure Notes

- Secondary category schema in contracts following existing pattern
- Constants in confidence.ts with existing threshold constants
- Component in apps/web/src/components/ following project pattern
- All types derived from Zod schemas

### References

- [Source: packages/shared/src/contracts/index.ts#classificationResultSchema] - Current schema
- [Source: apps/functions/src/services/classification/geminiClient.ts] - Current parsing
- [Source: apps/functions/src/services/classification/classificationPrompt.ts] - Current prompt
- [Source: docs/epics/epic-list.md#Story 20.4] - Story requirements
- [Source: docs/sprint-artifacts/stories/20-3-confidence-score-assignment.md] - Previous story

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All 6 tasks completed with unit tests
- Schema extended with secondaryCategorySchema and secondaryCategories field
- CONFIDENCE_THRESHOLDS.SECONDARY = 50 constant added
- MAX_CATEGORIES = 3 constant added
- Gemini prompt updated with multi-label examples and rules
- geminiClient.ts now parses secondary categories with filtering/sorting
- classifyScreenshot.ts stores secondary categories (only if non-empty)
- CategoryBadgeList component created with gallery/detail variants
- All tests passing (3650 tests)
- Lint passing (warnings only for pre-existing console statements)

### File List

**New Files:**

- apps/web/src/components/CategoryBadgeList.tsx
- apps/web/src/components/CategoryBadgeList.test.tsx

**Modified Files:**

- packages/shared/src/constants/confidence.ts - Added SECONDARY threshold, MAX_CATEGORIES
- packages/shared/src/constants/confidence.test.ts - Tests for new constants
- packages/shared/src/contracts/index.ts - Added secondaryCategorySchema
- packages/shared/src/contracts/classification.test.ts - Tests for secondaryCategories
- packages/shared/src/index.ts - Exports for new types/constants
- apps/functions/src/services/classification/classificationPrompt.ts - Multi-label prompt
- apps/functions/src/services/classification/classificationPrompt.test.ts - Multi-label prompt tests
- apps/functions/src/services/classification/geminiClient.ts - parseSecondaryCategories()
- apps/functions/src/services/classification/geminiClient.test.ts - Multi-label tests
- apps/functions/src/services/classification/classifyScreenshot.ts - Store secondary categories
