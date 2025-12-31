# Story 24.2: Family-Specific Model Tuning

Status: done

## Story

As **the AI system**,
I want **to learn from family corrections**,
So that **classifications improve for this specific family**.

## Acceptance Criteria

1. **AC1: Correction added to feedback corpus**
   - Given parent makes classification correction
   - When correction is stored
   - Then correction added to family's feedback corpus

2. **AC2: Family model adjustment applied**
   - Given family has corrections
   - When processing new screenshots
   - Then family model adjustment applied (bias toward corrected patterns)

3. **AC3: Adjustment isolated to family**
   - Given family model has adjustments
   - When another family's content is processed
   - Then adjustment is isolated to this family (not affecting others)

4. **AC4: Minimum corrections threshold**
   - Given family has fewer than 5 corrections
   - When processing new content
   - Then default model behavior is used
   - When family has 5+ corrections
   - Then model adjustments are applied

5. **AC5: Adaptation timing**
   - Given corrections are made
   - When time passes
   - Then adaptation happens within 24 hours of corrections

6. **AC6: AI learning indicator**
   - Given family has made corrections
   - When parent views settings
   - Then "AI learning" indicator shown in settings

## Tasks / Subtasks

- [x] Task 1: Create family feedback corpus schema (AC: #1) ✓
  - [x] 1.1 Add FamilyFeedback document schema to shared contracts ✓
  - [x] 1.2 Store corrections with: originalCategory, correctedCategory, timestamp, flagId ✓
  - [x] 1.3 Store feedback under /families/{familyId}/feedback/{feedbackId} ✓

- [x] Task 2: Create Cloud Function for feedback aggregation (AC: #1, #5) ✓
  - [x] 2.1 Create onFlagCorrected trigger in functions ✓
  - [x] 2.2 When flag is corrected, add entry to family feedback collection ✓
  - [x] 2.3 Track correction count per family ✓

- [x] Task 3: Create family bias weights schema (AC: #2, #3, #4) ✓
  - [x] 3.1 Add FamilyBiasWeights document schema ✓
  - [x] 3.2 Store per-category confidence adjustments ✓
  - [x] 3.3 Store correctionCount to track threshold ✓

- [x] Task 4: Apply bias weights in classification (AC: #2, #3, #4) ✓
  - [x] 4.1 Load family bias weights before classification ✓
  - [x] 4.2 If correctionCount >= 5, apply confidence adjustments ✓
  - [x] 4.3 Adjust threshold based on family-specific patterns ✓

- [x] Task 5: Create scheduled function for adaptation (AC: #5) ✓
  - [x] 5.1 Create scheduled function to process new corrections ✓
  - [x] 5.2 Calculate category-specific confidence adjustments ✓
  - [x] 5.3 Update FamilyBiasWeights document ✓

- [x] Task 6: Add AI learning indicator to settings (AC: #6) ✓
  - [x] 6.1 Create useFamilyAILearning hook ✓
  - [x] 6.2 Display learning status in settings page (dashboard) ✓
  - [x] 6.3 Show correction count and adaptation status ✓

## Dev Notes

### Previous Story Intelligence (Story 24-1)

Story 24-1 implemented parent classification correction:

- Parents can correct AI misclassifications via FlagCorrectionModal
- Corrections stored in flag document (correctedCategory, correctionParentId, correctedAt)
- Audit trail tracks correction history

**Key Files from Story 24-1:**

- `apps/web/src/services/flagService.ts` - correctFlagCategory function
- `apps/web/src/components/flags/FlagCorrectionModal.tsx` - Correction UI
- `packages/shared/src/contracts/index.ts` - FlagDocument correction fields

### Family Feedback Corpus Schema

```typescript
// Store at /families/{familyId}/feedback/{feedbackId}
export const familyFeedbackSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  flagId: z.string(),
  childId: z.string(),
  originalCategory: concernCategorySchema,
  correctedCategory: concernCategorySchema,
  correctedBy: z.string(), // Parent UID
  correctedAt: z.number(), // epoch ms
  processed: z.boolean().default(false), // Whether included in bias calculation
  processedAt: z.number().optional(),
})
export type FamilyFeedback = z.infer<typeof familyFeedbackSchema>
```

### Family Bias Weights Schema

```typescript
// Store at /families/{familyId}/aiSettings
export const familyBiasWeightsSchema = z.object({
  familyId: z.string(),
  correctionCount: z.number().default(0),
  lastUpdatedAt: z.number(),
  // Per-category adjustments: positive = increase sensitivity, negative = decrease
  categoryAdjustments: z.record(concernCategorySchema, z.number().min(-50).max(50)).optional(),
  // Individual pattern overrides
  patterns: z
    .array(
      z.object({
        originalCategory: concernCategorySchema,
        correctedCategory: concernCategorySchema,
        count: z.number(),
        adjustment: z.number(),
      })
    )
    .optional(),
})
export type FamilyBiasWeights = z.infer<typeof familyBiasWeightsSchema>
```

### Bias Application Algorithm

When processing a screenshot for family:

1. Load FamilyBiasWeights for the family
2. If correctionCount < 5, use default thresholds
3. If correctionCount >= 5:
   - Check for pattern matches (e.g., Violence → Educational)
   - Apply categoryAdjustments to confidence thresholds
   - Adjust flagging decision based on family history

```typescript
function applyFamilyBias(
  classification: ClassificationResult,
  biasWeights: FamilyBiasWeights | null
): ClassificationResult {
  // No bias if insufficient corrections
  if (!biasWeights || biasWeights.correctionCount < 5) {
    return classification
  }

  // Check for specific pattern matches
  const pattern = biasWeights.patterns?.find((p) => p.originalCategory === classification.category)

  if (pattern) {
    // Reduce confidence if family frequently corrects this category
    classification.confidence -= pattern.adjustment
  }

  // Apply category-specific adjustments
  const adjustment = biasWeights.categoryAdjustments?.[classification.category]
  if (adjustment) {
    classification.confidence += adjustment
  }

  return classification
}
```

### Scheduled Function for Adaptation

Run every 6 hours to process unprocessed corrections:

```typescript
// apps/functions/src/scheduled/processAIFeedback.ts
export const processAIFeedback = onSchedule(
  { schedule: 'every 6 hours', region: 'us-central1' },
  async () => {
    // 1. Find unprocessed feedback entries
    // 2. Group by family
    // 3. Calculate new bias weights per family
    // 4. Update FamilyBiasWeights documents
    // 5. Mark feedback entries as processed
  }
)
```

### References

- [Source: docs/epics/epic-list.md#Story 24.2] - Story requirements
- [Source: apps/web/src/services/flagService.ts] - Correction function
- [Source: apps/functions/src/services/classification] - Classification service

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

**Implementation Complete (2025-12-31):**

1. **Core Schemas Added**: FamilyFeedback, CorrectionPattern, FamilyBiasWeights, AILearningStatus schemas added to shared contracts with proper Zod validation

2. **onFlagCorrected Trigger**: Firestore trigger that:
   - Detects when a flag document receives a correctedCategory
   - Validates the correction is new (not previously corrected)
   - SECURITY: Verifies correctionParentId is a guardian of the family
   - Creates FamilyFeedback entry in /families/{familyId}/feedback/{feedbackId}
   - Increments correction count in family's biasWeights document
   - Implements retryable error handling for transient failures

3. **processAIFeedback Scheduled Function**: Runs every 6 hours to:
   - Find unprocessed feedback entries via collectionGroup query
   - Group by family and calculate category-specific adjustments
   - Apply pattern-based negative adjustments for corrected categories
   - Update FamilyBiasWeights documents with merged adjustments
   - Mark feedback entries as processed
   - Includes Zod validation for all Firestore reads
   - All adjustments clamped to -50/+20 bounds

4. **Family Bias Service**: familyBias.ts provides:
   - getFamilyBiasWeights with 5-minute cache
   - applyFamilyBiasToConcerns for adjusting confidence scores
   - Only applies if correctionCount >= MINIMUM_CORRECTIONS_THRESHOLD (5)

5. **Classification Integration**: classifyScreenshot.ts updated to:
   - Load family bias weights before classification
   - Apply bias adjustments to concern confidence scores
   - Adjustments isolated to specific family (AC3)

6. **AI Learning Indicator UI**:
   - useFamilyAILearning hook subscribes to biasWeights document
   - AILearningIndicator component shows progress/active status
   - Integrated into dashboard page

7. **Firestore Security Rules**: Added rules for:
   - /families/{familyId}/aiSettings/{settingId} - read-only for guardians
   - /families/{familyId}/feedback/{feedbackId} - read-only for guardians
   - Both subcollections only writable by Cloud Functions (admin SDK)

**Code Review Issues Fixed:**

- Added guardian authorization check in onFlagCorrected trigger
- Added Zod validation for all Firestore reads
- Added proper bounds checking in mergeAdjustments (-50 to +20)
- Added retryable error handling for transient infrastructure errors

### File List

**New Files:**

- `apps/functions/src/triggers/onFlagCorrected.ts` - Correction trigger
- `apps/functions/src/scheduled/processAIFeedback.ts` - Scheduled adaptation
- `apps/functions/src/services/classification/familyBias.ts` - Family bias service
- `apps/web/src/hooks/useFamilyAILearning.ts` - AI learning status hook
- `apps/web/src/components/settings/AILearningIndicator.tsx` - Learning indicator

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added FamilyFeedback, FamilyBiasWeights, AILearningStatus schemas
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Apply family bias
- `apps/functions/src/services/classification/index.ts` - Export familyBias module
- `apps/functions/src/scheduled/index.ts` - Export processAIFeedback
- `apps/functions/src/index.ts` - Export onFlagCorrected trigger and processAIFeedback
- `apps/web/src/app/dashboard/page.tsx` - Add AI learning indicator
