# Story 21.5: Flag Creation and Storage

Status: done

## Story

As **the system**,
I want **flags stored with full context in a dedicated collection**,
So that **parents can review with complete information and flags are efficiently queryable**.

## Acceptance Criteria

1. **AC1: Flag document created in dedicated collection**
   - Given concerning content is detected and passes threshold check
   - When flag is created
   - Then flag document created in `/children/{childId}/flags/{flagId}`
   - And flag ID uses predictable format: `{screenshotId}_{category}_{timestamp}`

2. **AC2: Flag includes complete context**
   - Given flag is created
   - When document is stored
   - Then flag includes: screenshotRef (path to screenshot document)
   - And flag includes: category, severity, confidence, reasoning
   - And flag includes: timestamp (createdAt), status (pending/reviewed/dismissed)
   - And flag includes: familyId for security rules

3. **AC3: Flag linked to screenshot**
   - Given flag is created for a screenshot
   - When both documents exist
   - Then screenshot document references flag IDs in `flagIds` array
   - And flag document references screenshot via `screenshotRef`
   - And relationship supports multiple flags per screenshot (one per category)

4. **AC4: Flags are queryable**
   - Given flags exist in collection
   - When parent views flag queue
   - Then flags queryable by: status (pending, reviewed, dismissed)
   - And flags queryable by: severity (low, medium, high)
   - And flags queryable by: date range (createdAt)
   - And flags queryable by: childId (via collection path)

5. **AC5: Flag creation triggers throttled alert**
   - Given flag is created
   - When shouldAlertForFlag returns true (not throttled)
   - Then alert is triggered for parent notification
   - And throttle state is recorded via existing recordFlagAlert
   - And throttled flags are still stored but marked `throttled: true`

6. **AC6: Suppression status preserved on flags**
   - Given concern has suppression status from Story 21-2
   - When flag is created
   - Then suppressionReason and releasableAfter are included if present
   - And status reflects suppression state (sensitive_hold vs pending)

## Tasks / Subtasks

- [x] Task 1: Create Flag data model and schemas (AC: #2, #3)
  - [x] 1.1 Add `Flag` interface to shared package with all required fields
  - [x] 1.2 Add `FlagStatus` type: 'pending' | 'reviewed' | 'dismissed'
  - [x] 1.3 Add `flagSchema` Zod schema for validation
  - [x] 1.4 Add `FLAG_STATUSES` constant array
  - [x] 1.5 Write unit tests for new schemas

- [x] Task 2: Create flag storage service (AC: #1, #2, #3)
  - [x] 2.1 Create `apps/functions/src/services/classification/flagStorage.ts`
  - [x] 2.2 Implement `createFlag(params: CreateFlagParams): Promise<Flag>` function
  - [x] 2.3 Generate flag ID: `{screenshotId}_{category}_{timestamp}`
  - [x] 2.4 Write flag document to `/children/{childId}/flags/{flagId}`
  - [x] 2.5 Update screenshot document with flagIds array (append, don't overwrite)
  - [x] 2.6 Return created flag for further processing
  - [x] 2.7 Write comprehensive tests with mocked Firestore

- [x] Task 3: Integrate flag storage into classifyScreenshot (AC: #1, #5, #6)
  - [x] 3.1 Import `createFlag` into classifyScreenshot.ts
  - [x] 3.2 After throttle processing, call createFlag for each concern
  - [x] 3.3 Pass suppression status (suppressionReason, releasableAfter) if present
  - [x] 3.4 Pass throttle status (throttled, throttledAt) from existing logic
  - [x] 3.5 Collect created flag IDs and update screenshot document
  - [x] 3.6 Maintain backward compatibility: still store concernFlags on screenshot for quick access
  - [x] 3.7 Write integration tests verifying flag creation

- [x] Task 4: Add Firestore indexes for flag queries (AC: #4)
  - [x] 4.1 Add compound index: (status, createdAt) for pending flags sorted by date
  - [x] 4.2 Add compound index: (severity, createdAt) for severity-based queries
  - [x] 4.3 Add index in `firestore.indexes.json`
  - [x] 4.4 Document index requirements in story

- [x] Task 5: Add flag query helper functions (AC: #4)
  - [x] 5.1 Implement `getFlagsForChild(childId, filters): Promise<Flag[]>`
  - [x] 5.2 Support filter by status, severity, dateRange
  - [x] 5.3 Implement pagination support (limit, startAfter)
  - [x] 5.4 Write tests for query functions

## Dev Notes

### Previous Story Intelligence (Story 21-4)

Story 21-4 established the concern filtering pipeline:

- Concerns are filtered by confidence threshold before flag creation
- `getEffectiveThreshold()` returns family-configured threshold
- `ALWAYS_FLAG_THRESHOLD = 95` ensures high-confidence concerns always flag
- Filtering happens in classifyScreenshot.ts loop

**Key Integration Point:**

```typescript
// In classifyScreenshot.ts (current after 21-4):
const filteredConcerns: DetectedConcern[] = []
for (const concern of concernResult.concerns) {
  const threshold = await getEffectiveThreshold(familyId, concern.category)
  const shouldFlag = concern.confidence >= ALWAYS_FLAG_THRESHOLD || concern.confidence >= threshold
  if (shouldFlag) {
    filteredConcerns.push(concern)
  }
}

// After throttle processing, concernFlags are stored on screenshot
// Story 21-5: ALSO create separate flag documents
```

### Story 21-2/21-3 Context

**Suppression (21-2):**

- Self-harm concerns get `status: 'sensitive_hold'` and `suppressionReason: 'self_harm_detected'`
- `releasableAfter` timestamp indicates when flag can be shown to parent
- These fields MUST be preserved when creating flag documents

**Throttling (21-3):**

- `shouldAlertForFlag()` determines if parent gets notified
- `recordFlagAlert()` / `recordThrottledFlag()` track state
- `throttled: true` and `throttledAt` fields indicate throttle status

### Current Data Flow (to be modified)

```typescript
// Current flow in classifyScreenshot.ts:
1. detectConcerns() → DetectedConcern[]
2. Filter by threshold → filteredConcerns[]
3. Convert to ConcernFlag[] → concernFlags
4. Apply suppression → suppressedConcernFlags (if distress)
5. Apply throttling → throttledFlags (ThrottledConcernFlag[])
6. Store in screenshot.classification.concernFlags ← Currently stops here

// Story 21-5 adds:
7. For each throttledFlag:
   - createFlag(childId, screenshotId, flag) → Flag document in /children/{childId}/flags/
   - Collect flagIds
8. Update screenshot.flagIds with created flag IDs
```

### Flag Document Schema

```typescript
// New interface in packages/shared/src/contracts/index.ts
export interface Flag {
  id: string // Format: {screenshotId}_{category}_{timestamp}
  childId: string // For reference
  familyId: string // For security rules
  screenshotRef: string // Path: children/{childId}/screenshots/{screenshotId}
  category: ConcernCategory // Violence, Cyberbullying, etc.
  severity: ConcernSeverity // low, medium, high, critical
  confidence: number // 0-100
  reasoning: string // AI explanation
  createdAt: number // Timestamp when flag created
  status: FlagStatus // pending, reviewed, dismissed

  // From suppression (optional)
  suppressionReason?: 'self_harm_detected'
  releasableAfter?: number // Timestamp when suppression lifts

  // From throttling
  throttled: boolean // Whether parent notification was throttled
  throttledAt?: number // When throttling was applied
}

export type FlagStatus = 'pending' | 'reviewed' | 'dismissed'
export const FLAG_STATUSES = ['pending', 'reviewed', 'dismissed'] as const
```

### Firestore Collection Structure

```
/children/{childId}/flags/{flagId}
  - id: string
  - childId: string
  - familyId: string
  - screenshotRef: string
  - category: string
  - severity: string
  - confidence: number
  - reasoning: string
  - createdAt: number
  - status: string
  - suppressionReason?: string
  - releasableAfter?: number
  - throttled: boolean
  - throttledAt?: number
```

### Screenshot Document Update

```typescript
// Add to screenshot document:
{
  classification: {
    // ... existing fields
    concernFlags: ThrottledConcernFlag[] // Keep for quick access
  },
  flagIds: string[]  // NEW: Array of flag document IDs for cross-reference
}
```

### Security Rules Consideration

Flags are in `/children/{childId}/flags/` subcollection:

- Same security rules as screenshots apply
- Parent of family can read/write
- Child can read (same as screenshot viewing equality from 19b-6)
- Requires `familyId` field for rule validation

### Firestore Index Requirements

```json
// firestore.indexes.json additions:
{
  "collectionGroup": "flags",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "flags",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "severity", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### Testing Requirements

1. **Unit Tests:**
   - Flag schema validation
   - createFlag generates correct ID format
   - createFlag writes to correct collection path
   - createFlag updates screenshot flagIds

2. **Integration Tests:**
   - classifyScreenshot creates flag documents
   - Suppression fields preserved on flags
   - Throttle status preserved on flags
   - Multiple flags per screenshot work correctly
   - Query functions return correct results

### Project Structure Notes

- Flag schema: `packages/shared/src/contracts/index.ts`
- Flag storage service: `apps/functions/src/services/classification/flagStorage.ts`
- Integration point: `apps/functions/src/services/classification/classifyScreenshot.ts`
- Indexes: `apps/functions/firestore.indexes.json`

### Backward Compatibility

- Keep storing `concernFlags` on screenshot document for quick access
- Epic 22 (Flag Review Dashboard) will query the flags collection directly
- Existing code reading `classification.concernFlags` continues to work

### References

- [Source: docs/epics/epic-list.md#Story 21.5] - Story requirements
- [Source: apps/functions/src/services/classification/classifyScreenshot.ts] - Integration point
- [Source: docs/sprint-artifacts/stories/21-4-concern-confidence-thresholds.md] - Previous story patterns
- [Source: docs/sprint-artifacts/stories/21-3-false-positive-throttling.md] - Throttling patterns
- [Source: docs/sprint-artifacts/stories/21-2-distress-detection-suppression-fr21a.md] - Suppression patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- `packages/shared/src/contracts/index.ts` - Added FlagDocument schema, CreateFlagParams interface
- `packages/shared/src/index.ts` - Added exports for Flag document types
- `packages/shared/src/contracts/classification.test.ts` - Added tests for flagDocumentSchema
- `apps/functions/src/services/classification/flagStorage.ts` - NEW: Flag storage service with createFlag, createFlagsFromConcerns, getFlagsForChild, getFlagById
- `apps/functions/src/services/classification/flagStorage.test.ts` - NEW: Comprehensive tests for flag storage service
- `apps/functions/src/services/classification/index.ts` - Added exports for flag storage functions
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Integrated flag document creation after throttle processing
- `firestore.indexes.json` - Added compound indexes for flags collection (status+createdAt, severity+createdAt)
