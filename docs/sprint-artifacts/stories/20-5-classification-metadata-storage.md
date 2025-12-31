# Story 20.5: Classification Metadata Storage

Status: done

## Story

As **the system**,
I want **classification results stored efficiently**,
So that **dashboard can filter and query by category**.

## Acceptance Criteria

1. **AC1: Metadata added to Firestore screenshot document**
   - Given classification completes
   - When storing results
   - Then metadata added to Firestore screenshot document
   - And fields: primaryCategory, secondaryCategories[], confidence, classifiedAt
   - Note: Already implemented in Stories 20-1 through 20-4

2. **AC2: Firestore indexes support filter by category, sort by confidence**
   - Given screenshots exist with classifications
   - When querying by category
   - Then results can be filtered by primaryCategory
   - And results can be sorted by confidence descending
   - And queries are efficient via composite indexes

3. **AC3: Classification version tracked (for model updates)**
   - Given classification is stored
   - When model or taxonomy changes
   - Then modelVersion (Gemini model ID) is stored
   - And taxonomyVersion (category version) is stored
   - And these enable re-classification when model improves

4. **AC4: Raw AI response stored for debugging (separate collection)**
   - Given classification completes
   - When Gemini returns response
   - Then raw JSON response stored in classificationDebug collection
   - And linked to screenshot via screenshotId
   - And includes request context (URL, title if provided)
   - And auto-expires after 30 days (retention policy)

5. **AC5: Classification can be re-run if model improves**
   - Given model or taxonomy version changes
   - When admin triggers re-classification
   - Then screenshots can be queried by modelVersion/taxonomyVersion
   - And re-classification replaces existing classification
   - And old debug data retained for comparison

## Tasks / Subtasks

- [x] Task 1: Verify existing metadata storage (AC: #1, #3)
  - [x] 1.1 Verify classificationResultSchema includes all required fields
  - [x] 1.2 Confirm classifyScreenshot stores all fields correctly
  - [x] 1.3 Write verification tests for existing storage

- [x] Task 2: Add Firestore indexes for category/confidence queries (AC: #2)
  - [x] 2.1 Add composite index: primaryCategory + confidence DESC
  - [x] 2.2 Add composite index: classification.needsReview + timestamp DESC
  - [x] 2.3 Test index queries work efficiently

- [x] Task 3: Implement classification debug storage (AC: #4)
  - [x] 3.1 Create classificationDebugSchema in @fledgely/shared contracts
  - [x] 3.2 Create storeClassificationDebug function in classification service
  - [x] 3.3 Update geminiClient to return raw response for debugging
  - [x] 3.4 Integrate debug storage into classifyScreenshot flow
  - [x] 3.5 Add 30-day TTL field for auto-cleanup
  - [x] 3.6 Write unit tests for debug storage

- [x] Task 4: Implement re-classification capability (AC: #5)
  - [x] 4.1 Create reclassifyScreenshot function (marks for re-processing)
  - [x] 4.2 Add query helper: findScreenshotsByVersion
  - [x] 4.3 Reset classification status to 'pending' while preserving old data
  - [x] 4.4 Write tests for re-classification flow

- [x] Task 5: Integration tests and documentation (AC: #1-5)
  - [x] 5.1 Write integration test for full storage flow
  - [x] 5.2 Test index queries with mock data
  - [x] 5.3 Update story status to done

## Dev Notes

### Previous Story Intelligence (Stories 20-1 through 20-4)

Stories 20-1 through 20-4 established:

- `classificationResultSchema` with all core fields:
  - `status`: 'pending' | 'processing' | 'completed' | 'failed'
  - `primaryCategory`: Category enum
  - `secondaryCategories`: Array of {category, confidence}
  - `confidence`: 0-100 score
  - `classifiedAt`: Unix timestamp
  - `modelVersion`: Gemini model ID (e.g., 'gemini-1.5-flash')
  - `taxonomyVersion`: Category version string (e.g., '1.0.0')
  - `isLowConfidence`: Boolean for "Other" fallback
  - `needsReview`: Boolean for low confidence review queue
  - `retryCount`: Number of classification attempts

**What Story 20-5 adds:**

- Additional Firestore indexes for efficient querying
- Debug collection for raw AI responses
- Re-classification capability for model updates

### Existing Indexes (firestore.indexes.json)

Already implemented:

```json
// Filter by classification status + timestamp
{ "classification.status": "ASCENDING", "timestamp": "DESCENDING" }
// Filter by primaryCategory + timestamp
{ "classification.primaryCategory": "ASCENDING", "timestamp": "DESCENDING" }
```

**New indexes needed:**

```json
// Filter by needsReview (for review queue)
{ "classification.needsReview": "ASCENDING", "timestamp": "DESCENDING" }
// Filter by confidence (for quality monitoring)
{ "classification.confidence": "DESCENDING", "timestamp": "DESCENDING" }
// Filter by modelVersion (for re-classification)
{ "classification.modelVersion": "ASCENDING", "timestamp": "DESCENDING" }
```

### Classification Debug Schema

```typescript
// packages/shared/src/contracts/index.ts
export const classificationDebugSchema = z.object({
  screenshotId: z.string(),
  childId: z.string(),
  timestamp: z.number(), // Unix timestamp

  // Request context
  requestContext: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    imageSize: z.number().optional(), // bytes
  }),

  // Raw Gemini response
  rawResponse: z.string(), // JSON stringified
  parsedResult: z.object({
    primaryCategory: categorySchema,
    confidence: z.number(),
    secondaryCategories: z.array(secondaryCategorySchema).optional(),
    reasoning: z.string().optional(),
  }),

  // Metadata
  modelVersion: z.string(),
  taxonomyVersion: z.string(),
  processingTimeMs: z.number().optional(),

  // Auto-expiry (30 days)
  expiresAt: z.number(), // Unix timestamp
})
export type ClassificationDebug = z.infer<typeof classificationDebugSchema>
```

### Re-classification Flow

```typescript
// apps/functions/src/services/classification/reclassifyScreenshot.ts
export async function markForReclassification(
  childId: string,
  screenshotId: string
): Promise<void> {
  const screenshotRef = db
    .collection('children')
    .doc(childId)
    .collection('screenshots')
    .doc(screenshotId)

  await screenshotRef.update({
    'classification.status': 'pending',
    'classification.previousResult': admin.firestore.FieldValue.delete(), // or preserve?
    'classification.markedForReclassAt': Date.now(),
  })
}

export async function findScreenshotsByModelVersion(
  modelVersion: string,
  limit = 100
): Promise<QuerySnapshot> {
  return db
    .collectionGroup('screenshots')
    .where('classification.modelVersion', '==', modelVersion)
    .where('classification.status', '==', 'completed')
    .limit(limit)
    .get()
}
```

### Implementation Files

**Modified Files:**

```
firestore.indexes.json                               # Add new indexes
packages/shared/src/contracts/index.ts              # Add classificationDebugSchema
packages/shared/src/contracts/classification.test.ts # Tests for new schema
apps/functions/src/services/classification/geminiClient.ts  # Return raw response
apps/functions/src/services/classification/classifyScreenshot.ts  # Store debug
```

**New Files:**

```
apps/functions/src/services/classification/storeDebug.ts      # Debug storage
apps/functions/src/services/classification/storeDebug.test.ts # Tests
apps/functions/src/services/classification/reclassify.ts      # Re-classification
apps/functions/src/services/classification/reclassify.test.ts # Tests
```

### Testing Requirements

1. **Unit Tests** (co-located `*.test.ts`):
   - classificationDebugSchema validation
   - storeClassificationDebug success/failure
   - markForReclassification state transitions
   - findScreenshotsByModelVersion queries

2. **Integration Tests**:
   - Full flow: classify → store debug → query by version
   - Re-classification overwrites existing classification

### Project Structure Notes

- Debug collection at `/classificationDebug/{debugId}` - separate from screenshots
- Use Firestore TTL for auto-expiry (expiresAt field)
- Follow existing service pattern in `classification/` directory
- All types derived from Zod schemas per project rules

### References

- [Source: packages/shared/src/contracts/index.ts#classificationResultSchema] - Existing schema
- [Source: apps/functions/src/services/classification/classifyScreenshot.ts] - Current storage
- [Source: firestore.indexes.json] - Existing indexes
- [Source: docs/epics/epic-list.md#Story 20.5] - Story requirements
- [Source: docs/sprint-artifacts/stories/20-4-multi-label-classification.md] - Previous story

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Task 1: Verified existing schema has all required fields (primaryCategory, secondaryCategories, confidence, classifiedAt, modelVersion, taxonomyVersion). Added 3 Story 20.5 verification tests to classification.test.ts.
- Task 2: Added 5 new Firestore indexes for efficient querying: primaryCategory+confidence, needsReview+timestamp, modelVersion+timestamp, and classificationDebug collection indexes.
- Task 3: Created classificationDebugSchema with 30-day TTL, storeDebug.ts service with storeClassificationDebug and getDebugForScreenshot functions, updated geminiClient to return rawResponse, integrated debug storage into classifyScreenshot flow.
- Task 4: Created reclassify.ts with markForReclassification, findScreenshotsByModelVersion, findScreenshotsByTaxonomyVersion, and batchMarkForReclassification functions.
- Task 5: All tests pass (1125 functions tests, 464 shared tests), lint passes with only pre-existing warnings.

### File List

**New Files:**

- `apps/functions/src/services/classification/storeDebug.ts` - Debug storage service
- `apps/functions/src/services/classification/storeDebug.test.ts` - Debug storage tests (6 tests)
- `apps/functions/src/services/classification/reclassify.ts` - Re-classification utilities
- `apps/functions/src/services/classification/reclassify.test.ts` - Re-classification tests (11 tests)

**Modified Files:**

- `firestore.indexes.json` - Added 5 new indexes for classification queries
- `packages/shared/src/contracts/index.ts` - Added classificationDebugSchema and DEBUG_RETENTION_MS
- `packages/shared/src/contracts/classification.test.ts` - Added 9 tests for debug schema and metadata storage
- `packages/shared/src/index.ts` - Export new types and constants
- `apps/functions/src/services/classification/geminiClient.ts` - Added rawResponse to GeminiClassificationResponse
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Integrated debug storage
