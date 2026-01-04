# Story 51.1: Data Export Request

## Status: in-code-review

## Story

As a **parent**,
I want **to export all my family's data**,
So that **I have data portability (FR120, GDPR Article 20)**.

## Acceptance Criteria

1. **AC1: Export Request UI**
   - Given parent is in account settings
   - When viewing data management section
   - Then can request full data export with clear button

2. **AC2: Export Content Completeness (NFR66)**
   - Given export is requested
   - When export is generated
   - Then export includes: profiles, agreements, screenshots, flags, activity, audit logs, devices, settings

3. **AC3: Export Format**
   - Given export is generated
   - When parent downloads
   - Then format is: JSON for structured data, ZIP archive containing images

4. **AC4: Async Processing**
   - Given export is requested
   - When request is submitted
   - Then export prepared within 48 hours via background job

5. **AC5: Email Notification**
   - Given export is ready
   - When processing completes
   - Then download link emailed to parent

6. **AC6: Link Expiry**
   - Given download link is sent
   - When 7 days pass
   - Then link expires (security requirement)

7. **AC7: One Active Export**
   - Given export is in progress
   - When parent requests another export
   - Then show "export in progress" message with estimated completion

## Tasks / Subtasks

### Task 1: Create Data Export Types and Contracts (AC: #2, #3)

**Files:**

- `packages/shared/src/contracts/dataExport.ts` (new)

**Implementation:**

1.1 Define DataExportRequest schema:

```typescript
export const DataExportRequestSchema = z.object({
  exportId: z.string(),
  familyId: z.string(),
  requestedBy: z.string(), // uid
  requestedAt: z.number(), // timestamp
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'expired']),
  completedAt: z.number().nullable(),
  downloadUrl: z.string().nullable(),
  expiresAt: z.number().nullable(),
  fileSize: z.number().nullable(),
  errorMessage: z.string().nullable(),
})
```

1.2 Define ExportManifest for ZIP contents:

```typescript
export const ExportManifestSchema = z.object({
  exportId: z.string(),
  exportedAt: z.number(),
  familyId: z.string(),
  requestedBy: z.string(),
  contents: z.object({
    profiles: z.number(),
    children: z.number(),
    devices: z.number(),
    screenshots: z.number(),
    flags: z.number(),
    agreements: z.number(),
    auditEvents: z.number(),
    settings: z.boolean(),
  }),
})
```

1.3 Add exports to shared index

### Task 2: Create Data Export Service (AC: #2, #3, #4)

**Files:**

- `apps/functions/src/services/gdpr/dataExportService.ts` (new)
- `apps/functions/src/services/gdpr/index.ts` (new)

**Implementation:**

2.1 Create `collectFamilyData()` function that gathers:

- Family document
- All children in family
- All devices in family
- All screenshots (metadata only, images separate)
- All flags
- All agreements
- All audit events
- Settings and preferences

  2.2 Create `generateExportArchive()` function:

- Create manifest.json with export metadata
- Create data.json with structured data (profiles, agreements, flags, activity)
- Download all screenshots from Cloud Storage
- Create ZIP archive using archiver package
- Upload ZIP to Cloud Storage `exports/{familyId}/{exportId}.zip`

  2.3 Create `initiateExport()` function:

- Create DataExportRequest document in `dataExports/{exportId}`
- Publish to Pub/Sub topic for async processing
- Return exportId to caller

  2.4 Pattern: Use lazy Firestore initialization (see auditExportService.ts:16-22)

### Task 3: Create Export Request Callable (AC: #1, #7)

**Files:**

- `apps/functions/src/callable/requestDataExport.ts` (new)
- `apps/functions/src/callable/requestDataExport.test.ts` (new)

**Implementation:**

3.1 Create `requestDataExport` callable function:

- Verify caller is guardian of family
- Check for existing pending/processing export
- If exists and < 48h old, return "export in progress"
- Otherwise, create new export request
- Return exportId and estimated completion

  3.2 Add tests:

- Test guardian authorization
- Test duplicate prevention
- Test successful request creation

### Task 4: Create Export Processing Trigger (AC: #4)

**Files:**

- `apps/functions/src/triggers/onDataExportCreated.ts` (new)

**Implementation:**

4.1 Create Firestore trigger on `dataExports/{exportId}` creation:

- Update status to 'processing'
- Call dataExportService.generateExportArchive()
- On success: update status to 'completed', set downloadUrl, expiresAt
- On failure: update status to 'failed', set errorMessage

  4.2 Alternative: Use scheduled function to poll for pending exports

- More reliable for long-running tasks
- Pattern: see scheduled/executeWithdrawals.ts

### Task 5: Create Export Download Endpoint (AC: #5, #6)

**Files:**

- `apps/functions/src/http/gdpr/downloadExport.ts` (new)
- `apps/functions/src/http/gdpr/index.ts` (new)

**Implementation:**

5.1 Create HTTP endpoint `/gdpr/export/{exportId}/download`:

- Verify export exists and belongs to caller's family
- Verify export status is 'completed'
- Verify not expired (expiresAt > now)
- Generate signed URL for Cloud Storage download
- Return redirect or signed URL

  5.2 Add to HTTP exports index

### Task 6: Create Export Notification Email (AC: #5)

**Files:**

- `apps/functions/src/lib/email/templates/dataExportReadyEmail.ts` (new)

**Implementation:**

6.1 Create email template:

- Subject: "Your Fledgely data export is ready"
- Body: Download link, expiry warning (7 days), file size
- Pattern: see templates/invitationEmail.ts

  6.2 Create `sendExportReadyEmail()` function

### Task 7: Create Export Cleanup Scheduled Function (AC: #6)

**Files:**

- `apps/functions/src/scheduled/cleanupExpiredExports.ts` (new)

**Implementation:**

7.1 Create scheduled function (runs daily):

- Query exports where status='completed' AND expiresAt < now
- Update status to 'expired'
- Delete ZIP file from Cloud Storage
- Keep metadata for audit purposes

### Task 8: Create Export Request UI Component (AC: #1, #7)

**Files:**

- `apps/web/src/components/settings/DataExportCard.tsx` (new)
- `apps/web/src/components/settings/DataExportCard.test.tsx` (new)

**Implementation:**

8.1 Create DataExportCard component:

- "Export My Data" button
- Loading state during request
- "Export in Progress" state with estimated completion
- "Download Available" state with download link
- Error state with retry option

  8.2 Use hook for export status polling

### Task 9: Create useDataExport Hook (AC: #1, #7)

**Files:**

- `apps/web/src/hooks/useDataExport.ts` (new)
- `apps/web/src/hooks/useDataExport.test.ts` (new)

**Implementation:**

9.1 Create hook:

- Query current export status for family
- Provide requestExport() function
- Auto-poll when status is 'pending' or 'processing'
- Return: status, exportRequest, requestExport, isLoading, error

### Task 10: Integrate into Settings Page (AC: #1)

**Files:**

- `apps/web/src/app/settings/page.tsx` (modify)

**Implementation:**

10.1 Add "Data & Privacy" section
10.2 Add DataExportCard component
10.3 Test integration

## Dev Notes

### Existing Infrastructure

**Audit Export Pattern (apps/functions/src/services/audit/auditExportService.ts):**

- CSV/text export generation with watermarking
- Lazy Firestore initialization
- Query patterns for filtering

**Email Service (apps/functions/src/lib/email/):**

- emailService.ts for sending
- templates/ folder for email templates

**Cloud Storage (apps/functions/src/lib/storage/):**

- Storage quota and management patterns
- Screenshot storage at `screenshots/{familyId}/{childId}/`

### Firestore Collections to Export

```
families/{familyId}                    → Family profile
families/{familyId}/children/          → All children
families/{familyId}/devices/           → All devices
families/{familyId}/agreements/        → All agreements
families/{familyId}/screenshots/       → Screenshot metadata
families/{familyId}/flags/             → All flags
families/{familyId}/auditEvents/       → Audit log (or root auditEvents with familyId filter)
families/{familyId}/settings/          → Family settings
```

### Cloud Storage Paths

- Screenshots: `screenshots/{familyId}/{childId}/{screenshotId}.jpg`
- Exports: `exports/{familyId}/{exportId}.zip`

### Package Dependencies

Add to `apps/functions/package.json`:

```json
"archiver": "^6.0.0"
```

### Security Considerations

- Only guardians can request export
- Signed URLs for download (not direct storage URLs)
- Export links expire after 7 days
- One active export per family (prevent abuse)
- Watermark in manifest.json for traceability

### Performance Considerations

- Background processing via Pub/Sub or scheduled function
- Batch Firestore reads (not individual doc reads)
- Stream screenshots directly to ZIP (don't load all in memory)
- Consider chunking for families with many screenshots

### References

- [Source: docs/epics/epic-list.md#Story-51.1 - Data Export Request]
- [Pattern: apps/functions/src/services/audit/auditExportService.ts - Export generation]
- [Pattern: apps/functions/src/templates/invitationEmail.ts - Email templates]
- [Pattern: apps/functions/src/scheduled/executeWithdrawals.ts - Scheduled processing]
- [GDPR Article 20: Right to data portability]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
