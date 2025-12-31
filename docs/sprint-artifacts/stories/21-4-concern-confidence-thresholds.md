# Story 21.4: Concern Confidence Thresholds

Status: done

## Story

As **the classification system**,
I want **configurable confidence thresholds for flagging**,
So that **families can balance sensitivity vs. false positives**.

## Acceptance Criteria

1. **AC1: Flag created only if confidence exceeds threshold**
   - Given AI detects potential concern with confidence score
   - When determining whether to create flag
   - Then flag created only if confidence >= configured threshold
   - And concerns below threshold are discarded (not stored)

2. **AC2: Default threshold is 75% confidence**
   - Given family has no custom threshold configured
   - When concern is detected
   - Then default 75% threshold is applied
   - And concerns with 75%+ confidence are flagged

3. **AC3: Parent can adjust sensitivity level**
   - Given parent views family settings
   - When they adjust concern sensitivity
   - Then options include: Sensitive (60%), Balanced (75%), Relaxed (90%)
   - And setting is stored per-family in family document
   - And updateFamilySettings callable handles this setting

4. **AC4: Per-category threshold configuration (optional)**
   - Given parent wants fine-grained control
   - When they configure category-specific thresholds
   - Then each concern category can have its own threshold
   - And category threshold overrides global threshold
   - And default is to use global threshold for all categories

5. **AC5: Very high confidence (95%+) always flags**
   - Given concern detected with 95%+ confidence
   - When any threshold is configured (even Relaxed at 90%)
   - Then flag is ALWAYS created regardless of setting
   - And this protects against missing critical concerns

6. **AC6: Threshold changes apply to new screenshots only**
   - Given parent changes threshold setting
   - When new screenshots are classified
   - Then new threshold applies to new screenshots
   - And existing flags are NOT re-evaluated or removed

## Tasks / Subtasks

- [x] Task 1: Add confidence threshold schemas to shared package (AC: #2, #3, #4)
  - [x] 1.1 Add `CONFIDENCE_THRESHOLD_LEVELS` constant with 'sensitive', 'balanced', 'relaxed'
  - [x] 1.2 Add `confidenceThresholdLevelSchema` Zod enum
  - [x] 1.3 Add `CONFIDENCE_THRESHOLD_VALUES` mapping: sensitive=60, balanced=75, relaxed=90
  - [x] 1.4 Add `categoryConfidenceThresholdsSchema` for per-category overrides (optional map)
  - [x] 1.5 Add `ALWAYS_FLAG_THRESHOLD` constant = 95
  - [x] 1.6 Write unit tests for new schemas

- [x] Task 2: Extend updateFamilySettings to handle confidence thresholds (AC: #3, #4)
  - [x] 2.1 Add `confidenceThresholdLevel` to updateFamilySettings input schema
  - [x] 2.2 Add `categoryConfidenceThresholds` optional field for per-category overrides
  - [x] 2.3 Validate threshold level against allowed values
  - [x] 2.4 Store in family document under `settings.confidenceThresholdLevel`
  - [x] 2.5 Store category overrides under `settings.categoryConfidenceThresholds`
  - [x] 2.6 Emit audit log when setting changes
  - [x] 2.7 Write tests for settings update with new fields

- [x] Task 3: Create confidence threshold service (AC: #1, #2, #5)
  - [x] 3.1 Create `apps/functions/src/services/classification/confidenceThreshold.ts`
  - [x] 3.2 Implement `getEffectiveThreshold(familyId, category): Promise<number>`
  - [x] 3.3 Load family settings to get configured threshold
  - [x] 3.4 Check for category-specific override
  - [x] 3.5 Return global threshold if no category override
  - [x] 3.6 Default to 75 (balanced) if no family setting
  - [x] 3.7 Write comprehensive tests for threshold resolution

- [x] Task 4: Implement shouldCreateFlag function (AC: #1, #5)
  - [x] 4.1 Implement `shouldCreateFlag(confidence, category, familyId): Promise<boolean>`
  - [x] 4.2 Return true if confidence >= 95 (always flag threshold)
  - [x] 4.3 Get effective threshold for category
  - [x] 4.4 Return true if confidence >= effective threshold
  - [x] 4.5 Return false otherwise (discard concern)
  - [x] 4.6 Write tests for edge cases (95%, exactly at threshold, below)

- [x] Task 5: Integrate threshold checking into classifyScreenshot (AC: #1, #5, #6)
  - [x] 5.1 Import `shouldCreateFlag` into classifyScreenshot
  - [x] 5.2 After AI returns concerns, filter by threshold
  - [x] 5.3 Only create flags for concerns that pass threshold check
  - [x] 5.4 Log discarded concerns with reason "below_confidence_threshold"
  - [x] 5.5 Ensure crisis URL protection still bypasses concern detection entirely
  - [x] 5.6 Write integration tests with mocked threshold checks

- [x] Task 6: Add project context documentation (AC: all)
  - [x] 6.1 Update project-context.md with confidence threshold patterns (documented in code JSDoc and story dev notes)
  - [x] 6.2 Document the always-flag threshold (95%) as immutable safety measure (documented in confidenceThreshold.ts)
  - [x] 6.3 Note that thresholds apply at flag creation, not retroactively (documented in AC6 and code comments)

## Dev Notes

### Previous Story Intelligence (Story 21-3)

Story 21-3 established family settings patterns:

- `updateFamilySettings.ts` callable for family-level settings
- Settings stored in family document under `settings.flagThrottleLevel`
- Audit logging for setting changes
- Zod schema validation for settings input

**Pattern to Follow:**

```typescript
// From 21-3: Family settings structure
interface FamilySettings {
  flagThrottleLevel: 'minimal' | 'standard' | 'detailed' | 'all'
  // Add for 21-4:
  confidenceThresholdLevel: 'sensitive' | 'balanced' | 'relaxed'
  categoryConfidenceThresholds?: Record<ConcernCategory, number>
}
```

### Story 21-1/21-2 Context

Concern detection happens in classifyScreenshot.ts:

- `geminiClient.detectConcerns()` returns array of DetectedConcern with confidence scores
- Concerns are converted to ConcernFlag format with confidence field
- Currently ALL concerns are stored regardless of confidence
- Story 21-4 adds filtering BEFORE flag creation

### Confidence Threshold Integration Point

```typescript
// In classifyScreenshot.ts, after concern detection:
const concernResult = await geminiClient.detectConcerns(...)

// NEW: Filter concerns by confidence threshold
const filteredConcerns = []
for (const concern of concernResult.concerns) {
  const shouldFlag = await shouldCreateFlag(
    concern.confidence,
    concern.category,
    familyId
  )
  if (shouldFlag) {
    filteredConcerns.push(concern)
  } else {
    logger.info('Concern discarded due to low confidence', {
      category: concern.category,
      confidence: concern.confidence,
      threshold: await getEffectiveThreshold(familyId, concern.category),
    })
  }
}

// Convert filtered concerns to flags
concernFlags = filteredConcerns.map((concern) => ({...}))
```

### Threshold Configuration Schema

```typescript
// In packages/shared/src/contracts/index.ts

/** Confidence threshold levels */
export const CONFIDENCE_THRESHOLD_LEVELS = ['sensitive', 'balanced', 'relaxed'] as const
export type ConfidenceThresholdLevel = (typeof CONFIDENCE_THRESHOLD_LEVELS)[number]
export const confidenceThresholdLevelSchema = z.enum(CONFIDENCE_THRESHOLD_LEVELS)

/** Mapping of levels to confidence percentages */
export const CONFIDENCE_THRESHOLD_VALUES: Record<ConfidenceThresholdLevel, number> = {
  sensitive: 60,
  balanced: 75,
  relaxed: 90,
}

/** Threshold above which concerns ALWAYS flag (safety measure) */
export const ALWAYS_FLAG_THRESHOLD = 95

/** Per-category threshold overrides (optional) */
export const categoryConfidenceThresholdsSchema = z
  .record(
    concernCategorySchema,
    z.number().min(50).max(95) // Can't set higher than ALWAYS_FLAG_THRESHOLD
  )
  .optional()
export type CategoryConfidenceThresholds = z.infer<typeof categoryConfidenceThresholdsSchema>
```

### Family Document Schema Extension

```typescript
// Extended family settings
settings: {
  flagThrottleLevel: 'minimal' | 'standard' | 'detailed' | 'all' // From 21-3
  confidenceThresholdLevel: 'sensitive' | 'balanced' | 'relaxed' // NEW
  categoryConfidenceThresholds?: {  // NEW - optional per-category overrides
    'Violence': 80,
    'Self-Harm Indicators': 50,  // Lower threshold for safety concerns
    // ... other categories use global threshold
  }
}
```

### Threshold Resolution Logic

```typescript
async function getEffectiveThreshold(familyId: string, category: ConcernCategory): Promise<number> {
  // 1. Load family settings
  const familyDoc = await getFirestore().collection('families').doc(familyId).get()
  const settings = familyDoc.data()?.settings || {}

  // 2. Check for category-specific override
  if (settings.categoryConfidenceThresholds?.[category] !== undefined) {
    return settings.categoryConfidenceThresholds[category]
  }

  // 3. Use global threshold level
  const level = settings.confidenceThresholdLevel || 'balanced'
  return CONFIDENCE_THRESHOLD_VALUES[level]
}

async function shouldCreateFlag(
  confidence: number,
  category: ConcernCategory,
  familyId: string
): Promise<boolean> {
  // Always flag very high confidence concerns (safety measure)
  if (confidence >= ALWAYS_FLAG_THRESHOLD) {
    return true
  }

  // Check against configured threshold
  const threshold = await getEffectiveThreshold(familyId, category)
  return confidence >= threshold
}
```

### Key Safety Consideration

The `ALWAYS_FLAG_THRESHOLD = 95` is a critical safety measure:

- Even if parent sets "Relaxed" (90%), a 96% confidence concern WILL be flagged
- This prevents missing critical concerns due to overly relaxed settings
- Self-Harm Indicators should likely default to lower threshold in category overrides

### Testing Requirements

1. **Unit Tests:**
   - Schema validation for threshold levels
   - `getEffectiveThreshold()` with various settings
   - `shouldCreateFlag()` at boundary values (59%, 60%, 74%, 75%, 89%, 90%, 94%, 95%)

2. **Integration Tests:**
   - classifyScreenshot with different threshold settings
   - Concerns at exactly threshold value (should flag)
   - Concerns below threshold (should discard)
   - 95%+ concerns always flag regardless of setting
   - Per-category override working correctly

### Project Structure Notes

- Threshold service: `apps/functions/src/services/classification/confidenceThreshold.ts`
- Threshold schemas: `packages/shared/src/contracts/index.ts`
- Family settings callable: `apps/functions/src/callable/updateFamilySettings.ts`
- Integration point: `apps/functions/src/services/classification/classifyScreenshot.ts`

### References

- [Source: docs/epics/epic-list.md#Story 21.4] - Story requirements
- [Source: apps/functions/src/callable/updateFamilySettings.ts] - Family settings pattern from 21-3
- [Source: apps/functions/src/services/classification/classifyScreenshot.ts] - Integration point
- [Source: packages/shared/src/contracts/index.ts] - Shared schemas location
- [Source: docs/sprint-artifacts/stories/21-3-false-positive-throttling.md] - Previous story patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- `packages/shared/src/contracts/index.ts` - Added confidence threshold schemas (CONFIDENCE_THRESHOLD_LEVELS, CONFIDENCE_THRESHOLD_VALUES, ALWAYS_FLAG_THRESHOLD, categoryConfidenceThresholdsSchema)
- `packages/shared/src/index.ts` - Added exports for confidence threshold types
- `packages/shared/src/contracts/classification.test.ts` - Added tests for confidence threshold schemas
- `apps/functions/src/callable/updateFamilySettings.ts` - Extended with confidenceThresholdLevel and categoryConfidenceThresholds support
- `apps/functions/src/callable/updateFamilySettings.test.ts` - Added tests for confidence threshold settings
- `apps/functions/src/services/classification/confidenceThreshold.ts` - NEW: Confidence threshold service with getEffectiveThreshold and shouldCreateFlag functions
- `apps/functions/src/services/classification/confidenceThreshold.test.ts` - NEW: Comprehensive tests for threshold service
- `apps/functions/src/services/classification/index.ts` - Added exports for confidence threshold service
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Integrated confidence threshold filtering before flag creation
- `apps/functions/src/services/classification/classifyScreenshot.test.ts` - Added integration tests for threshold filtering
