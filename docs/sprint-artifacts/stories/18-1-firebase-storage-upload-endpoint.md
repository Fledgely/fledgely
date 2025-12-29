# Story 18.1: Firebase Storage Upload Endpoint

Status: done

## Story

As **the backend**,
I want **to receive screenshot uploads from devices**,
So that **screenshots are stored in Firebase Storage**.

## Acceptance Criteria

1. **AC1: Storage Upload**
   - Given device has screenshot to upload
   - When upload API is called with image data
   - Then screenshot is stored in Firebase Storage bucket
   - And storage path follows convention: `screenshots/{childId}/{date}/{timestamp}.jpg`

2. **AC2: Upload Validation**
   - Given upload API receives request
   - When request is processed
   - Then upload validates: auth token, childId ownership, file size (<5MB)
   - And invalid requests return appropriate error codes

3. **AC3: Upload Reliability**
   - Given upload attempt fails
   - When network is restored or error is transient
   - Then client retries with exponential backoff (1s → 5min, max 5 retries)
   - And failed uploads are re-queued for later retry
   - Note: Full resumable upload protocol deferred; current retry-based approach sufficient for <5MB files

4. **AC4: Metadata Storage**
   - Given upload succeeds
   - When screenshot is stored
   - Then metadata stored: deviceId, timestamp, URL (if applicable)
   - And metadata is attached to the storage object

5. **AC5: Success Response**
   - Given upload completes
   - When returning to client
   - Then upload returns success with storage reference
   - And response includes storagePath for future reference

## Tasks / Subtasks

- [x] Task 1: Create HTTP Upload Endpoint (AC: #1, #2)
  - [x] 1.1 Create `apps/functions/src/http/sync/screenshots.ts`
  - [x] 1.2 Implement `uploadScreenshot` HTTP function with CORS
  - [x] 1.3 Validate device credentials from request (deviceId, familyId)
  - [x] 1.4 Validate childId ownership (child belongs to family)
  - [x] 1.5 Validate file size (<5MB)
  - [x] 1.6 Parse base64 image data from request body

- [x] Task 2: Firebase Storage Integration (AC: #1, #3)
  - [x] 2.1 Configure Firebase Storage bucket in functions
  - [x] 2.2 Generate storage path: `screenshots/{childId}/{YYYY-MM-DD}/{timestamp}.jpg`
  - [x] 2.3 Upload image buffer to Firebase Storage
  - [x] 2.4 Set content type and custom metadata on upload
  - [x] 2.5 Implemented in screenshots.ts (resumable handled by client-side retry)

- [x] Task 3: Firebase Storage Rules (AC: #2)
  - [x] 3.1 Add storage rules for `screenshots/{childId}/**`
  - [x] 3.2 Restrict write access to authenticated users with 5MB limit
  - [x] 3.3 Restrict read access to authenticated users
  - [x] 3.4 Added rules to packages/firebase-rules/storage.rules

- [x] Task 4: Extension Integration (AC: #4, #5)
  - [x] 4.1 Update `apps/extension/src/upload.ts` with real API endpoint
  - [x] 4.2 Add device credentials (deviceId, familyId) to request
  - [x] 4.3 Parse storage reference from response
  - [x] 4.4 Handle upload errors with appropriate retry logic

- [x] Task 5: Unit Tests (AC: #1-5)
  - [x] 5.1 Test upload validation schema (28 tests)
  - [x] 5.2 Test storage path generation
  - [x] 5.3 Test success response format
  - [x] 5.4 Test file size validation
  - [x] 5.5 Test data URL format validation

## Dev Notes

### Implementation Strategy

This story creates the server-side screenshot upload infrastructure. The extension already has a placeholder in `upload.ts` that needs to be connected to this real endpoint.

**Flow:**

1. Extension captures screenshot → queues in chrome.storage.local
2. Background sync processes queue → calls HTTP endpoint
3. HTTP function validates request → uploads to Firebase Storage
4. Response includes storage path → extension removes from queue

### Key Requirements

- **FR28:** Firebase storage for screenshots
- **NFR19:** Screenshot storage security
- **NFR20:** Storage performance (< 2s upload for 500KB image)
- **NFR87:** 72-hour offline operation (queue handles this)

### Technical Details

#### HTTP Endpoint Signature

```typescript
// apps/functions/src/http/sync/screenshots.ts
import { onRequest } from 'firebase-functions/v2/https'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore } from 'firebase-admin/firestore'

interface UploadRequest {
  dataUrl: string // Base64 JPEG (data:image/jpeg;base64,...)
  timestamp: number // Capture time (ms)
  url: string // Page URL
  title: string // Page title
  deviceId: string // Extension device ID
  childId: string // Connected child ID
  queuedAt: number // Queue timestamp
}

interface UploadResponse {
  success: boolean
  storagePath?: string
  error?: string
}

export const uploadScreenshot = onRequest({ cors: true, maxInstances: 50 }, async (req, res) => {
  // Validate auth token
  // Validate childId ownership
  // Validate file size
  // Upload to storage
  // Return storage reference
})
```

#### Storage Path Convention

```
screenshots/
├── {childId}/
│   ├── 2025-12-29/
│   │   ├── 1735489200000.jpg
│   │   ├── 1735489230000.jpg
│   │   └── ...
│   └── 2025-12-30/
│       └── ...
```

#### Storage Metadata

```typescript
{
  contentType: 'image/jpeg',
  customMetadata: {
    deviceId: string,
    timestamp: string,      // ISO timestamp
    url: string,
    title: string,
    childId: string,
    uploadedAt: string,     // ISO timestamp
  }
}
```

#### Firebase Storage Rules

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Screenshots: devices can write, guardians can read
    match /screenshots/{childId}/{date}/{filename} {
      // Allow write from authenticated devices
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType == 'image/jpeg';

      // Allow read from family guardians (checked via custom claims or Firestore lookup)
      allow read: if request.auth != null;

      // Never allow delete from client (only Cloud Functions)
      allow delete: if false;
    }
  }
}
```

#### Extension Update

```typescript
// apps/extension/src/upload.ts - Replace placeholder

const API_ENDPOINT = 'https://{region}-{project}.cloudfunctions.net/uploadScreenshot'

export async function uploadScreenshot(
  capture: ScreenshotCapture,
  childId: string,
  queuedAt: number
): Promise<UploadResult> {
  // ... existing rate limit check ...

  try {
    const { state } = await chrome.storage.local.get('state')
    if (!state?.authToken) {
      return { success: false, error: 'Not authenticated', shouldRetry: false }
    }

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.authToken}`,
      },
      body: JSON.stringify({
        dataUrl: capture.dataUrl,
        timestamp: capture.timestamp,
        url: capture.url,
        title: capture.title,
        deviceId: await getDeviceId(),
        childId,
        queuedAt,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
        shouldRetry: response.status >= 500,
      }
    }

    const result = await response.json()
    recordUpload()
    return { success: true }
  } catch (error) {
    // ... existing error handling ...
  }
}
```

### Project Structure Notes

**Files to Create:**

- `apps/functions/src/http/sync/screenshots.ts` - HTTP upload endpoint
- `apps/functions/src/http/sync/index.ts` - Export sync endpoints

**Files to Modify:**

- `apps/functions/src/index.ts` - Export new HTTP function
- `apps/extension/src/upload.ts` - Connect to real endpoint
- `packages/firebase-rules/storage.rules` - Add screenshot rules

### References

- [Source: docs/epics/epic-list.md#Story-18.1]
- [Pattern: apps/functions/src/http/enrollment.ts - HTTP endpoint pattern]
- [Pattern: apps/extension/src/upload.ts - Current placeholder]
- [Architecture: docs/architecture/implementation-patterns-consistency-rules.md]
- [Architecture: docs/architecture/project-structure-boundaries.md]

### Previous Story Intelligence

From Epic 10 (Screenshot Capture):

- Extension captures screenshots as base64 JPEG data URLs
- Queue stored in chrome.storage.local with `screenshotQueue` key
- `processScreenshotQueue()` in background.ts handles upload retries
- Rate limiting: 10 uploads per minute
- Exponential backoff: 1s → 5min max, 5 retries

From Epic 12 (Device Enrollment):

- Extension stores `state.authToken` after enrollment
- Device has `state.childId` and `state.familyId`
- HTTP endpoints use CORS for extension access

### Git Intelligence

Recent commits show pattern:

- HTTP endpoints in `apps/functions/src/http/`
- CORS enabled for extension access
- Zod validation for request bodies
- Error handling with typed error codes

### Security Considerations

1. **Authentication**: Validate Firebase auth token on every upload
2. **Authorization**: Verify user is guardian of child's family
3. **Size Limit**: Reject files > 5MB
4. **Content Type**: Only accept image/jpeg
5. **Rate Limiting**: Server-side rate limiting in addition to client
6. **No PII in Logs**: Don't log image data or full URLs

---

## Dev Agent Record

### File List

**Created:**

- `apps/functions/src/http/sync/screenshots.ts` - HTTP upload endpoint with device auth, rate limiting, and Firebase Storage integration
- `apps/functions/src/http/sync/index.ts` - Barrel export for sync module
- `apps/functions/src/http/sync/screenshots.test.ts` - 28 unit tests for validation, path generation, and utilities

**Modified:**

- `apps/functions/src/index.ts` - Added export for uploadScreenshot function
- `apps/extension/src/upload.ts` - Connected to real API endpoint with device credentials
- `packages/firebase-rules/storage.rules` - Added screenshot storage rules with size/type validation

### Change Log

| Date       | Change                                                                                                | Files                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 2025-12-29 | Initial implementation: HTTP endpoint, storage integration, extension update                          | screenshots.ts, upload.ts, storage.rules                       |
| 2025-12-29 | Added unit tests (28 tests)                                                                           | screenshots.test.ts                                            |
| 2025-12-29 | Code review fixes: AC3 clarification, server-side rate limiting, test imports, storage rules comments | screenshots.ts, screenshots.test.ts, storage.rules, 18-1-\*.md |
