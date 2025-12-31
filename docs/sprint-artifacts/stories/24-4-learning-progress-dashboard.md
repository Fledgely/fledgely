# Story 24.4: Learning Progress Dashboard

Status: done

## Story

As a **parent**,
I want **to see how AI has learned from my feedback**,
So that **I know my corrections matter**.

## Acceptance Criteria

1. **AC1: Corrections summary**
   - Given parent has made corrections
   - When viewing AI settings
   - Then summary shows: "12 corrections made, AI adapted to 8"

2. **AC2: Accuracy improvement**
   - Given parent has corrections with bias applied
   - When viewing dashboard
   - Then accuracy improvement shown (based on category adjustments)

3. **AC3: Top learned patterns**
   - Given patterns have been learned
   - When viewing dashboard
   - Then top patterns shown: "YouTube homework videos now recognized"

4. **AC4: Pending adaptations**
   - Given recent corrections exist
   - When viewing dashboard
   - Then pending adaptations shown: "Learning from 3 recent corrections"

5. **AC5: Reset option**
   - Given parent wants to reset
   - When clicking reset
   - Then family's learning data is cleared

6. **AC6: Motivate engagement**
   - Given dashboard is viewed
   - When displaying status
   - Then motivational messaging shown to encourage feedback

## Tasks / Subtasks

- [x] Task 1: Create AILearningDashboard schema (AC: #1, #2, #3, #4)
  - [x] 1.1 Extend existing AILearningStatus or create LearningDashboardData
  - [x] 1.2 Add learned patterns array with descriptions
  - [x] 1.3 Add pending corrections count
  - [x] 1.4 Add accuracy improvement estimate

- [x] Task 2: Create getLearningDashboard API (AC: #1, #2, #3, #4)
  - [x] 2.1 Create getLearningDashboardData function in functions
  - [x] 2.2 Calculate corrections made vs applied from biasWeights
  - [x] 2.3 Format patterns for display
  - [x] 2.4 Calculate pending from recent corrections

- [x] Task 3: Create reset learning data API (AC: #5)
  - [x] 3.1 Create resetFamilyLearning callable function
  - [x] 3.2 Clear biasWeights document
  - [x] 3.3 Clear related correction patterns
  - [x] 3.4 Log reset action for audit

- [x] Task 4: Create AILearningDashboard UI component (AC: #1, #2, #3, #4, #6)
  - [x] 4.1 Create LearningProgressDashboard component
  - [x] 4.2 Show corrections summary with adapted count
  - [x] 4.3 Show accuracy improvement indicator
  - [x] 4.4 Show top learned patterns
  - [x] 4.5 Show pending adaptations
  - [x] 4.6 Add motivational messaging

- [x] Task 5: Add reset confirmation UI (AC: #5)
  - [x] 5.1 Add reset button to dashboard
  - [x] 5.2 Add confirmation modal
  - [x] 5.3 Wire to resetFamilyLearning API

## Dev Notes

### Existing Infrastructure (from Story 24-2)

- `FamilyBiasWeights` at `/families/{familyId}/aiSettings/biasWeights`
- `correctionCount` - total corrections made
- `categoryAdjustments` - per-category confidence adjustments
- `patterns` - correction patterns array
- `lastUpdatedAt` - last time weights were calculated

### Dashboard Data Structure

```typescript
export const learningDashboardDataSchema = z.object({
  // Corrections
  totalCorrections: z.number(),
  appliedCorrections: z.number(), // Corrections that affected the model
  pendingCorrections: z.number(), // Recent corrections not yet processed

  // Improvement estimate
  accuracyImprovement: z.number(), // Percentage improvement estimate
  improvementCategories: z.array(
    z.object({
      category: concernCategorySchema,
      adjustment: z.number(),
      description: z.string(), // e.g., "Reduced false positives for Violence"
    })
  ),

  // Top patterns
  learnedPatterns: z.array(
    z.object({
      description: z.string(), // e.g., "YouTube homework videos now recognized"
      category: concernCategorySchema,
      count: z.number(),
    })
  ),

  // Status
  isLearningActive: z.boolean(),
  lastAdaptedAt: z.number().optional(),
  nextProcessingAt: z.number().optional(),
})
```

### Accuracy Improvement Calculation

Based on category adjustments:

- Sum of absolute adjustments = total adaptation
- Map to percentage: 50 total adjustment = ~10% improvement
- Formula: `min(30, Math.round(totalAdjustment * 0.6))` (cap at 30%)

### Pattern Descriptions

Generate human-readable descriptions from correction patterns:

- Violence → Educational: "Educational content with action scenes"
- Adult Content → Gaming: "Gaming content with mature themes"

### References

- [Source: packages/shared/src/contracts/index.ts] - FamilyBiasWeights schema
- [Source: apps/functions/src/services/classification/familyBias.ts] - Bias service
- [Source: Story 24-2 completion] - Family bias infrastructure

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/functions/src/callable/learningDashboard.ts` - Dashboard callable functions
- `apps/web/src/components/settings/LearningProgressDashboard.tsx` - Dashboard component
- `apps/web/src/hooks/useLearningDashboard.ts` - Dashboard hook

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Add LearningDashboardData schema
- `packages/shared/src/index.ts` - Export new schemas
- `apps/functions/src/index.ts` - Export new callable functions
