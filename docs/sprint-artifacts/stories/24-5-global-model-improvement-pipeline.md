# Story 24.5: Global Model Improvement Pipeline

Status: done

## Story

As **the development team**,
I want **aggregated (anonymized) feedback to improve the global model**,
So that **all families benefit from collective learning**.

## Acceptance Criteria

1. **AC1: Anonymized feedback**
   - Given corrections are made across many families
   - When aggregating feedback for model training
   - Then feedback anonymized (no family identifiers)

2. **AC2: Patterns only**
   - Given feedback is aggregated
   - When preparing for model training
   - Then only patterns shared, not actual images

3. **AC3: Review threshold**
   - Given patterns are aggregated
   - When patterns have >10 corrections across families
   - Then patterns are flagged for review

4. **AC4: Monthly retraining**
   - Given sufficient aggregated feedback exists
   - When monthly processing runs
   - Then global model retrained with aggregated feedback

5. **AC5: Opt-out capability**
   - Given family settings exist
   - When family opts out
   - Then their corrections not included in global aggregation

6. **AC6: Improvement metrics**
   - Given global model is updated
   - When metrics are tracked
   - Then improvement shown: "Global accuracy +2% this month"

## Tasks / Subtasks

- [x] Task 1: Create GlobalFeedbackAggregation schema (AC: #1, #2)
  - [x] 1.1 Create anonymized pattern aggregation schema
  - [x] 1.2 Store category correction counts without family IDs
  - [x] 1.3 Add opt-out flag to family settings

- [x] Task 2: Create aggregateGlobalFeedback scheduled function (AC: #1, #2, #3, #4)
  - [x] 2.1 Monthly aggregation job that collects patterns
  - [x] 2.2 Anonymize by stripping family/child IDs
  - [x] 2.3 Count patterns across families (not individual families)
  - [x] 2.4 Flag patterns with >10 corrections for review

- [x] Task 3: Add opt-out setting (AC: #5)
  - [x] 3.1 Add contributeToGlobalModel flag to family settings
  - [x] 3.2 Check flag during aggregation
  - [x] 3.3 Exclude opted-out families from aggregation

- [x] Task 4: Create GlobalModelMetrics storage (AC: #6)
  - [x] 4.1 Store global improvement metrics
  - [x] 4.2 Track corrections aggregated count
  - [x] 4.3 Store estimated accuracy improvement

## Dev Notes

### Data Flow

1. Daily/weekly: Corrections flow into per-family biasWeights
2. Monthly: Scheduled job aggregates across families (excluding opt-outs)
3. Aggregation produces anonymized pattern counts
4. Patterns with sufficient signal are flagged for model team review
5. Model team can use patterns for retraining decisions

### Anonymization Strategy

- Strip: familyId, childId, setByUid, createdAt, updatedAt
- Keep: category, correctedCategory, count (aggregated)
- Never aggregate: actual screenshot data, URLs, app identifiers

### Schema

```typescript
export const globalPatternAggregationSchema = z.object({
  id: z.string(),
  // Pattern being corrected
  originalCategory: concernCategorySchema,
  correctedCategory: concernCategorySchema,
  // Aggregated counts (across all participating families)
  totalCorrectionCount: z.number(),
  familyCount: z.number(), // How many families made this correction
  // Threshold status
  flaggedForReview: z.boolean(), // true if > 10 corrections
  reviewedAt: z.number().optional(),
  reviewedByUid: z.string().optional(),
  // Timestamps
  aggregatedAt: z.number(),
  periodStart: z.number(), // Month start
  periodEnd: z.number(), // Month end
})

export const globalModelMetricsSchema = z.object({
  id: z.string(),
  period: z.string(), // "2024-01" format
  totalCorrectionsAggregated: z.number(),
  participatingFamilies: z.number(),
  patternsIdentified: z.number(),
  patternsFlaggedForReview: z.number(),
  estimatedAccuracyImprovement: z.number(), // Percentage
  aggregatedAt: z.number(),
})
```

### Opt-Out Implementation

Add to Family document:

```typescript
// In family settings
aiSettings: {
  contributeToGlobalModel: boolean // Default: true
}
```

### References

- [Source: apps/functions/src/scheduled/processAIFeedback.ts] - Existing feedback processing
- [Source: packages/shared/src/contracts/index.ts] - CorrectionPattern schema
- [Source: Story 24-2 completion] - Family bias infrastructure

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/functions/src/scheduled/aggregateGlobalFeedback.ts` - Monthly aggregation job

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Add GlobalPatternAggregation, GlobalModelMetrics schemas
- `packages/shared/src/index.ts` - Export new schemas
- `apps/functions/src/scheduled/index.ts` - Export aggregation function
- `apps/functions/src/index.ts` - Export new scheduled function
