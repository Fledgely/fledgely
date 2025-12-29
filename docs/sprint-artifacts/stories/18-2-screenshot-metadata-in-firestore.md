# Story 18.2: Screenshot Metadata in Firestore

Status: done

## Story

As **the system**,
I want **screenshot metadata stored in Firestore**,
So that **dashboard can query screenshots efficiently**.

## Acceptance Criteria

1. **AC1: Firestore Document Creation**
   - Given screenshot upload completes
   - When storage write succeeds
   - Then Firestore document created: `/children/{childId}/screenshots/{screenshotId}`
   - And screenshotId uses timestamp for uniqueness and natural ordering

2. **AC2: Metadata Content**
   - Given Firestore document is created
   - When document is saved
   - Then document includes: storagePath, timestamp, deviceId, url, title
   - And document includes: uploadedAt, familyId, sizeBytes
   - And document includes: retentionExpiresAt (calculated from uploadedAt + retention period)
   - And document does NOT include actual image data (storage reference only)

3. **AC3: Query Indexes**
   - Given Firestore documents exist
   - When dashboard queries screenshots
   - Then Firestore indexes support: by date (timestamp DESC), by device, by child
   - And compound index: childId + timestamp DESC for efficient pagination

4. **AC4: Atomic Operation**
   - Given storage upload succeeds
   - When metadata write fails
   - Then storage upload is rolled back (deleted)
   - And error is returned to client
   - And partial state is avoided

5. **AC5: Default Retention**
   - Given no retention policy is configured
   - When screenshot is uploaded
   - Then default retention of 30 days is applied
   - And retentionExpiresAt = uploadedAt + 30 days

## Tasks / Subtasks

- [x] Task 1: Define Screenshot Metadata Schema (AC: #2, #5)
  - [x] 1.1 Add screenshot metadata schema to `packages/shared/src/contracts/index.ts`
  - [x] 1.2 Define ScreenshotMetadata interface with all required fields
  - [x] 1.3 Add default retention period constant (30 days)
  - [x] 1.4 Export schema for use in functions and web via `packages/shared/src/index.ts`

- [x] Task 2: Update Upload Endpoint for Firestore (AC: #1, #2, #4)
  - [x] 2.1 Add Firestore document creation after storage upload in `screenshots.ts`
  - [x] 2.2 Generate screenshotId from timestamp (e.g., `${timestamp}_${randomId}`)
  - [x] 2.3 Calculate retentionExpiresAt from uploadedAt + DEFAULT_RETENTION_DAYS
  - [x] 2.4 Implement two-phase commit with rollback on metadata failure
  - [x] 2.5 Return screenshotId in response alongside storagePath

- [x] Task 3: Add Firestore Indexes (AC: #3)
  - [x] 3.1 Update `firestore.indexes.json` with required indexes
  - [x] 3.2 Add composite index: screenshots (timestamp DESC)
  - [x] 3.3 Add composite index: screenshots (deviceId, timestamp DESC)
  - [x] 3.4 Add index: screenshots (retentionExpiresAt ASC) for cleanup

- [x] Task 4: Add Firestore Security Rules (AC: #1)
  - [x] 4.1 Rules already exist for `/children/{childId}/screenshots/{screenshotId}`
  - [x] 4.2 Create only from Cloud Functions (allow create: if false)
  - [x] 4.3 Read for authenticated family guardians (isScreenshotChildGuardian)
  - [x] 4.4 Delete only by guardians (for retention policy)

- [x] Task 5: Unit Tests (AC: #1-5)
  - [x] 5.1 Test metadata schema validation
  - [x] 5.2 Test retention calculation (30 days default)
  - [x] 5.3 Test screenshotId generation uniqueness
  - [x] 5.4 Test document structure matches schema

## Dev Notes

### Implementation Strategy

This story extends Story 18.1 to add Firestore metadata storage alongside Firebase Storage uploads. The key challenge is maintaining atomicity - if Firestore write fails, we must clean up the Storage blob.

**Updated Flow:**

1. Extension uploads screenshot → HTTP endpoint
2. HTTP endpoint validates → uploads to Storage
3. **NEW:** After Storage success → create Firestore document
4. If Firestore fails → delete Storage blob → return error
5. Return success with storagePath AND screenshotId

### Key Requirements

- **FR28:** Firebase storage for screenshots (extended with metadata)
- **FR29:** Auto-deletion support (retention expiry timestamp)
- **NFR19:** Screenshot storage security
- **NFR20:** Storage performance (< 2s upload for 500KB image)

### Technical Details

#### Firestore Document Structure

```typescript
// /children/{childId}/screenshots/{screenshotId}
interface ScreenshotMetadata {
  // Identity
  screenshotId: string // Unique ID (timestamp-based)
  childId: string // Reference to child
  familyId: string // Reference to family (for index queries)
  deviceId: string // Source device

  // Content reference (NOT actual image)
  storagePath: string // Firebase Storage path
  sizeBytes: number // File size for quota tracking

  // Capture context
  timestamp: Timestamp // When screenshot was captured
  url: string // Page URL at capture time
  title: string // Page title at capture time

  // Lifecycle
  uploadedAt: Timestamp // When uploaded to storage
  queuedAt: Timestamp // When added to queue on device
  retentionExpiresAt: Timestamp // When to auto-delete (uploadedAt + retention)

  // Future: Classification (Story 20+)
  // classificationStatus?: 'pending' | 'classified' | 'failed'
  // categories?: string[]
  // flagged?: boolean
}
```

#### Screenshot ID Generation

```typescript
// Use timestamp + random suffix for ordering and uniqueness
function generateScreenshotId(timestamp: number): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${randomSuffix}`
}
```

#### Retention Calculation

```typescript
const DEFAULT_RETENTION_DAYS = 30

function calculateRetentionExpiry(uploadedAt: Date): Date {
  const expiry = new Date(uploadedAt)
  expiry.setDate(expiry.getDate() + DEFAULT_RETENTION_DAYS)
  return expiry
}
```

#### Firestore Indexes (firestore.indexes.json)

```json
{
  "indexes": [
    {
      "collectionGroup": "screenshots",
      "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "timestamp", "order": "DESCENDING" }]
    },
    {
      "collectionGroup": "screenshots",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "deviceId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "screenshots",
      "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "retentionExpiresAt", "order": "ASCENDING" }]
    }
  ],
  "fieldOverrides": []
}
```

#### Updated Upload Response

```typescript
interface UploadResponse {
  success: boolean
  storagePath?: string
  screenshotId?: string // NEW: For tracking/querying
  error?: string
}
```

#### Rollback on Failure

```typescript
// In screenshots.ts upload handler
try {
  // 1. Upload to Storage (existing)
  await file.save(imageBuffer, { ... })

  // 2. Create Firestore document (NEW)
  const screenshotId = generateScreenshotId(uploadData.timestamp)
  const screenshotRef = db
    .collection('children')
    .doc(uploadData.childId)
    .collection('screenshots')
    .doc(screenshotId)

  await screenshotRef.set({
    screenshotId,
    childId: uploadData.childId,
    familyId: uploadData.familyId,
    deviceId: uploadData.deviceId,
    storagePath,
    sizeBytes: imageBuffer.length,
    timestamp: Timestamp.fromMillis(uploadData.timestamp),
    url: uploadData.url,
    title: uploadData.title,
    uploadedAt: Timestamp.now(),
    queuedAt: Timestamp.fromMillis(uploadData.queuedAt),
    retentionExpiresAt: calculateRetentionExpiry(new Date()),
  })

  // 3. Return success
  res.status(200).json({ success: true, storagePath, screenshotId })

} catch (error) {
  // Rollback: delete storage blob if it exists
  try {
    await file.delete({ ignoreNotFound: true })
  } catch (deleteError) {
    logger.error('Failed to rollback storage blob', { deleteError })
  }

  res.status(500).json({ success: false, error: 'Failed to upload screenshot' })
}
```

### Project Structure Notes

**Files to Create:**

- `packages/contracts/src/screenshots.ts` - Screenshot metadata schema
- `packages/firebase-rules/firestore.indexes.json` - Firestore indexes

**Files to Modify:**

- `apps/functions/src/http/sync/screenshots.ts` - Add Firestore document creation
- `apps/functions/src/http/sync/screenshots.test.ts` - Add tests for metadata
- `packages/firebase-rules/firestore.rules` - Add screenshot subcollection rules
- `packages/contracts/src/index.ts` - Export screenshot schema

### References

- [Source: docs/epics/epic-list.md#Story-18.2]
- [Pattern: apps/functions/src/http/sync/screenshots.ts - Story 18.1 implementation]
- [Architecture: docs/architecture/implementation-patterns-consistency-rules.md]
- [Architecture: docs/architecture/project-structure-boundaries.md]

### Previous Story Intelligence

From Story 18.1 (Firebase Storage Upload Endpoint):

- Storage path convention: `screenshots/{childId}/{YYYY-MM-DD}/{timestamp}.jpg`
- Device-based authentication via deviceId + familyId lookup
- Storage metadata already includes: deviceId, timestamp, url, title, childId, uploadedAt, queuedAt
- Server-side rate limiting: 15 uploads/min per device
- Tests in `screenshots.test.ts` use imports from source file

**Key Learnings:**

- Use Firestore Timestamp type for date fields, not ISO strings
- Export schemas/functions for testing to avoid duplication
- Cloud Functions use Admin SDK (bypasses security rules for writes)
- Security rules provide defense-in-depth for reads

### Git Intelligence

Recent commits show pattern:

- HTTP endpoints in `apps/functions/src/http/`
- Zod schemas in `packages/contracts/src/`
- Firestore rules in `packages/firebase-rules/firestore.rules`
- Test files co-located with source files

### Security Considerations

1. **No Image Data in Firestore**: Only store storagePath reference, never actual image bytes
2. **Family Isolation**: Screenshot metadata only readable by family guardians
3. **Retention Enforcement**: retentionExpiresAt enables scheduled cleanup (Story 18.4)
4. **Audit Trail**: Document creation is atomic, ensuring no orphaned storage blobs
5. **No PII in Indexes**: Don't index URL or title fields

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

1. Screenshot metadata schema added to `@fledgely/shared` package instead of separate contracts package to maintain single source of truth
2. Used epoch milliseconds (number) instead of Firestore Timestamp type for better Zod validation and serialization
3. Two-phase commit pattern: Storage upload → Firestore metadata → rollback on failure
4. Security rules for screenshots subcollection already existed from Story 8.1
5. Added 51 unit tests covering schema validation, ID generation, and retention calculation

### Change Log

| File                                             | Change Type | Description                                                                                                    |
| ------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------- |
| packages/shared/src/contracts/index.ts           | Modified    | Added screenshotMetadataSchema, generateScreenshotId(), calculateRetentionExpiry(), createScreenshotMetadata() |
| packages/shared/src/index.ts                     | Modified    | Exported screenshot metadata functions and types                                                               |
| apps/functions/src/http/sync/screenshots.ts      | Modified    | Added Firestore document creation with two-phase commit and rollback                                           |
| apps/functions/src/http/sync/screenshots.test.ts | Modified    | Added Story 18.2 tests for metadata schema, ID generation, retention calculation                               |
| firestore.indexes.json                           | Modified    | Added screenshot indexes for timestamp, deviceId+timestamp, retentionExpiresAt                                 |
| docs/sprint-artifacts/sprint-status.yaml         | Modified    | Updated story 18-2 status                                                                                      |

### File List

- packages/shared/src/contracts/index.ts
- packages/shared/src/index.ts
- apps/functions/src/http/sync/screenshots.ts
- apps/functions/src/http/sync/screenshots.test.ts
- firestore.indexes.json
- packages/firebase-rules/firestore.rules (verified, no changes needed)
