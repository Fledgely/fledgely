# Story 20.3: Confidence Score Assignment

Status: done

## Story

As **the classification system**,
I want **confidence scores for each classification**,
So that **low-confidence results can be handled appropriately**.

## Acceptance Criteria

1. **AC1: Confidence score (0-100%) assigned to classification**
   - Given screenshot is classified
   - When AI returns result
   - Then confidence score (0-100%) assigned to classification
   - Note: Already implemented in Story 20-1/20-2 - verify and document

2. **AC2: Scores above 85% considered high confidence**
   - Given classification has confidence >= 85%
   - When evaluating confidence level
   - Then classification is labeled "high confidence"
   - And no special handling required

3. **AC3: Scores 60-85% considered medium confidence**
   - Given classification has confidence 60-84%
   - When evaluating confidence level
   - Then classification is labeled "medium confidence"
   - And parent can see confidence indicator

4. **AC4: Scores below 60% flagged for potential review**
   - Given classification has confidence < 60%
   - When evaluating confidence level
   - Then classification is labeled "low confidence"
   - And `needsReview` flag is set to true
   - And classification appears in review queue (future Epic 24)

5. **AC5: Confidence score visible to parent on screenshot detail**
   - Given parent views screenshot detail page
   - When classification is complete
   - Then confidence score displayed with visual indicator
   - And confidence level label shown (high/medium/low)
   - And tooltip explains what confidence means

6. **AC6: Low-confidence classifications don't trigger automated actions**
   - Given classification has low confidence (< 60%) or isLowConfidence=true
   - When system evaluates for automated actions (future: alerts, flags)
   - Then automated actions are skipped
   - And parent can still manually review
   - And gating logic is in place for future features

## Tasks / Subtasks

- [x] Task 1: Define confidence level constants and thresholds (AC: #2, #3, #4)
  - [x] 1.1 Add `CONFIDENCE_THRESHOLDS` to `@fledgely/shared/constants` with HIGH=85, MEDIUM=60
  - [x] 1.2 Add `ConfidenceLevel` type: 'high' | 'medium' | 'low' | 'uncertain'
  - [x] 1.3 Create `getConfidenceLevelFromScore()` function with proper thresholds
  - [x] 1.4 Write unit tests for threshold boundary cases (59, 60, 84, 85)

- [x] Task 2: Add needsReview flag to classification result (AC: #4, #6)
  - [x] 2.1 Add `needsReview` boolean to `classificationResultSchema` in contracts
  - [x] 2.2 Update `geminiClient.ts` to set `needsReview: true` when confidence < 60
  - [x] 2.3 Update `classifyScreenshot.ts` to include needsReview in stored result
  - [x] 2.4 Write unit tests for needsReview assignment logic

- [x] Task 3: Create confidence display component for web UI (AC: #5)
  - [x] 3.1 Create `ConfidenceBadge` component in `apps/web/src/components/`
  - [x] 3.2 Display confidence percentage with colored indicator (green/yellow/red)
  - [x] 3.3 Show confidence level label (High/Medium/Low)
  - [x] 3.4 Add tooltip explaining what confidence means
  - [x] 3.5 Component exported directly (not via UI index - matches project pattern)

- [x] Task 4: Update categories.ts with proper threshold constants (AC: #2, #3, #4)
  - [x] 4.1 Import `CONFIDENCE_THRESHOLDS` from shared and use in `getConfidenceLevel()`
  - [x] 4.2 Update `formatConfidence()` to use shared thresholds
  - [x] 4.3 Ensure backward compatibility with existing isLowConfidence parameter
  - [x] 4.4 Add color classes for confidence levels via `getConfidenceLevelColorClasses()`
  - [x] 4.5 Update tests to verify threshold usage

- [x] Task 5: Create automation gating utility (AC: #6)
  - [x] 5.1 Create `shouldTriggerAutomation()` helper in shared constants
  - [x] 5.2 Return false if confidence < 60 OR isLowConfidence=true
  - [x] 5.3 Add JSDoc explaining this is for future automated actions (alerts, flags)
  - [x] 5.4 Write unit tests for gating logic
  - [x] 5.5 Export from @fledgely/shared index

- [x] Task 6: Verify existing implementation and add integration tests (AC: #1-6)
  - [x] 6.1 Verify Story 20-1/20-2 confidence implementation matches AC1
  - [x] 6.2 Write tests for classification → confidence level → needsReview flow
  - [x] 6.3 Test ConfidenceBadge renders correctly for all confidence levels
  - [x] 6.4 Update story status to done

## Dev Notes

### Previous Story Intelligence (Stories 20-1, 20-2)

Stories 20-1 and 20-2 already implemented:

- `confidence` field (0-100) in `classificationResultSchema`
- `isLowConfidence` boolean flag for LOW_CONFIDENCE_THRESHOLD (30) fallback
- `getConfidenceLevel()` in `categories.ts` with hardcoded thresholds (80, 50)
- `formatConfidence()` for display formatting
- Gemini client sets isLowConfidence when confidence < 30

**What Story 20-3 adds:**

- Standardized threshold constants (85 for high, 60 for medium)
- `needsReview` flag for low-confidence classifications
- `ConfidenceBadge` UI component for screenshot detail page
- `shouldTriggerAutomation()` gating utility for future features
- Proper type definitions for confidence levels

### Threshold Discrepancy

Current `categories.ts` uses different thresholds (80, 50) than the AC requirements (85, 60). Story 20-3 will standardize on the AC requirements:

- HIGH: >= 85% (was 80%)
- MEDIUM: 60-84% (was 50-79%)
- LOW: < 60% (was < 50%)

### Confidence Level Constants (to implement)

```typescript
// packages/shared/src/constants/confidence.ts
export const CONFIDENCE_THRESHOLDS = {
  /** Confidence >= HIGH is considered reliable */
  HIGH: 85,
  /** Confidence >= MEDIUM but < HIGH requires attention */
  MEDIUM: 60,
  /** Confidence < MEDIUM triggers review flag */
} as const

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain'

export function getConfidenceLevelFromScore(
  confidence: number,
  isLowConfidence?: boolean
): ConfidenceLevel {
  if (isLowConfidence) return 'uncertain'
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high'
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium'
  return 'low'
}
```

### needsReview Flag

The `needsReview` flag gates future automation features:

- When true: Screenshot appears in manual review queue (Epic 24)
- When true: No automated alerts or flags trigger
- Set when: confidence < 60% OR isLowConfidence=true

### ConfidenceBadge Component

```tsx
// apps/web/src/components/ui/ConfidenceBadge.tsx
interface ConfidenceBadgeProps {
  confidence: number
  isLowConfidence?: boolean
  showLabel?: boolean
  showTooltip?: boolean
}
```

Color scheme:

- HIGH (>= 85%): Green
- MEDIUM (60-84%): Yellow/Amber
- LOW (< 60%): Red
- UNCERTAIN (isLowConfidence): Gray with warning icon

### Implementation Files

**New Files:**

```
packages/shared/src/constants/confidence.ts        # Threshold constants and utilities
packages/shared/src/constants/confidence.test.ts  # Threshold tests (33 tests)
apps/web/src/components/ConfidenceBadge.tsx       # Display component
apps/web/src/components/ConfidenceBadge.test.tsx  # Component tests (28 tests)
apps/web/src/lib/categories.ts                    # Category display utilities
apps/web/src/lib/categories.test.ts               # Category utility tests
```

**Modified Files:**

```
packages/shared/src/contracts/index.ts            # Add needsReview field
packages/shared/src/index.ts                      # Export confidence constants
apps/functions/src/services/classification/geminiClient.ts  # Set needsReview
apps/functions/src/services/classification/geminiClient.test.ts  # needsReview tests
apps/functions/src/services/classification/classifyScreenshot.ts  # Store needsReview
```

### Testing Requirements

1. **Unit Tests** (co-located `*.test.ts`):
   - confidence.ts - Test threshold constants and getConfidenceLevelFromScore
   - geminiClient.ts - Test needsReview assignment
   - shouldTriggerAutomation - Test gating logic
   - ConfidenceBadge - Test rendering for all levels

2. **Integration Tests**:
   - Full flow: classify → confidence → needsReview → display

### Project Structure Notes

- Confidence constants in `@fledgely/shared/constants/` following `category-definitions.ts` pattern
- ConfidenceBadge follows shadcn/ui Badge pattern
- All types derived from Zod schemas per project rules

### References

- [Source: packages/shared/src/contracts/index.ts#classificationResultSchema] - Existing confidence field
- [Source: apps/web/src/lib/categories.ts#getConfidenceLevel] - Current threshold implementation
- [Source: apps/functions/src/services/classification/geminiClient.ts] - Low-confidence fallback
- [Source: docs/epics/epic-list.md#Story 20.3] - Story requirements
- [Source: docs/sprint-artifacts/stories/20-2-basic-category-taxonomy.md] - Previous story

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Implemented confidence thresholds (HIGH=85, MEDIUM=60) in shared constants
- Added needsReview flag to classification schema and Gemini client
- Created ConfidenceBadge React component with tooltip
- Updated categories.ts to use shared thresholds
- shouldTriggerAutomation placed in shared for reusability
- All 33 confidence tests + 26 ConfidenceBadge tests passing

### File List

**New Files:**

- `packages/shared/src/constants/confidence.ts` - Confidence thresholds and utilities
- `packages/shared/src/constants/confidence.test.ts` - Unit tests (33 tests)
- `apps/web/src/components/ConfidenceBadge.tsx` - UI component
- `apps/web/src/components/ConfidenceBadge.test.tsx` - Component tests (26 tests)
- `apps/web/src/lib/categories.ts` - Category display utilities with confidence support
- `apps/web/src/lib/categories.test.ts` - Category utility tests

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added needsReview field to classificationResultSchema
- `packages/shared/src/index.ts` - Export confidence utilities
- `apps/functions/src/services/classification/geminiClient.ts` - Set needsReview in response
- `apps/functions/src/services/classification/geminiClient.test.ts` - needsReview tests
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Store needsReview
