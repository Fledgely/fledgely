# Story 38-6: Pre-18 Data Export Option

## Story

As **a parent**,
I want **option to export data before automatic deletion**,
So that **I can preserve memories if desired**.

## Status: done

## Acceptance Criteria

- [x] AC1: Parent notified "Data will be deleted in 30 days" when child approaching 18
- [x] AC2: Export option available (download all data)
- [x] AC3: Export includes: sanitized activity summaries (no screenshots)
- [x] AC4: Child must consent to any export
- [x] AC5: No export of concerning flags or sensitive content
- [x] AC6: Export watermarked with date and purpose

## Technical Tasks

### Task 1: Pre18DataExport Data Model

Create Zod schemas and types for pre-18 data export.

**Files:**

- `packages/shared/src/contracts/pre18DataExport.ts` (new)
- `packages/shared/src/contracts/pre18DataExport.test.ts` (new)

**Types:**

```typescript
interface Pre18ExportRequest {
  id: string
  childId: string
  familyId: string
  requestedBy: string // parentId
  requestedAt: Date
  status:
    | 'pending_consent'
    | 'consent_granted'
    | 'consent_denied'
    | 'processing'
    | 'completed'
    | 'expired'
  childConsentedAt: Date | null
  exportCompletedAt: Date | null
  exportUrl: string | null
  expiresAt: Date // Export URL expiration
}

interface Pre18ExportContent {
  id: string
  exportRequestId: string
  childId: string
  familyId: string
  // Sanitized data - no screenshots
  activitySummaries: SanitizedActivitySummary[]
  screenTimeSummaries: ScreenTimeSummary[]
  agreementHistory: AgreementSummary[]
  // Excluded: screenshots, flags, sensitive content
  createdAt: Date
  watermark: ExportWatermark
}

interface SanitizedActivitySummary {
  date: Date
  totalScreenTime: number // minutes
  topCategories: string[]
  // No specific URLs or screenshots
}

interface ExportWatermark {
  exportDate: Date
  purpose: string // "Pre-18 Data Export"
  requestedBy: string
  childConsent: boolean
  watermarkId: string
}

// Configuration
const EXPORT_REQUEST_VALID_DAYS = 30
const EXPORT_URL_VALID_HOURS = 24
```

**Acceptance Criteria:** AC2, AC3, AC6

---

### Task 2: Pre18ExportConsentService

Create service for managing child consent to data export.

**Files:**

- `packages/shared/src/services/pre18ExportConsentService.ts` (new)
- `packages/shared/src/services/pre18ExportConsentService.test.ts` (new)

**Functions:**

```typescript
// Consent management
function requestExportConsent(childId: string, parentId: string): ExportConsentRequest
function getConsentRequest(childId: string): ExportConsentRequest | null
function grantExportConsent(childId: string): ExportConsentRequest
function denyExportConsent(childId: string): ExportConsentRequest

// Consent status
function hasChildConsented(childId: string): boolean
function isConsentPending(childId: string): boolean
function getConsentRequestsForChild(childId: string): ExportConsentRequest[]

// Expiration
function isConsentExpired(request: ExportConsentRequest): boolean
function cleanupExpiredConsents(): number
```

**Acceptance Criteria:** AC4

---

### Task 3: Pre18DataExportService

Create service for generating sanitized data exports.

**Files:**

- `packages/shared/src/services/pre18DataExportService.ts` (new)
- `packages/shared/src/services/pre18DataExportService.test.ts` (new)

**Functions:**

```typescript
// Export generation
function createExportRequest(childId: string, parentId: string): Pre18ExportRequest
function generateExport(exportRequestId: string): Pre18ExportContent
function getExportStatus(exportRequestId: string): Pre18ExportRequest | null

// Sanitization (AC3, AC5)
function sanitizeActivityLogs(childId: string): SanitizedActivitySummary[]
function sanitizeScreenTime(childId: string): ScreenTimeSummary[]
function sanitizeAgreements(childId: string): AgreementSummary[]
function filterConcerningContent(content: any[]): any[] // Removes flags, sensitive content

// Watermarking (AC6)
function addExportWatermark(content: Pre18ExportContent, parentId: string): Pre18ExportContent
function validateWatermark(watermark: ExportWatermark): boolean

// Export retrieval
function getExportUrl(exportRequestId: string): string | null
function isExportAvailable(exportRequestId: string): boolean
```

**Acceptance Criteria:** AC2, AC3, AC5, AC6

---

### Task 4: Pre18ExportNotificationService

Create service for sending pre-18 export notifications to parents.

**Files:**

- `packages/shared/src/services/pre18ExportNotificationService.ts` (new)
- `packages/shared/src/services/pre18ExportNotificationService.test.ts` (new)

**Functions:**

```typescript
// Parent notifications (AC1)
function sendPre18ExportAvailableNotification(
  parentId: string,
  childId: string,
  daysUntil18: number
): Notification
function sendExportConsentRequestNotification(childId: string): Notification
function sendExportReadyNotification(parentId: string, exportUrl: string): Notification

// Child notifications
function sendConsentRequestToChild(childId: string, parentId: string): Notification
function sendExportCompletedToChild(childId: string): Notification

// Notification messages
function getPre18ExportMessage(daysUntil18: number): string
function getConsentRequestMessage(): string
```

**Acceptance Criteria:** AC1

---

### Task 5: Pre18ExportEligibilityCheck

Create function to check if export is available for child approaching 18.

**Files:**

- `packages/shared/src/services/pre18ExportEligibilityService.ts` (new)
- `packages/shared/src/services/pre18ExportEligibilityService.test.ts` (new)

**Functions:**

```typescript
// Eligibility
function isEligibleForPre18Export(childId: string): boolean
function getExportEligibilityWindow(childId: string): { start: Date; end: Date } | null
function getChildrenEligibleForExport(): ChildEligibility[]

// Integration with age-18 deletion
function getDaysUntilDataDeletion(childId: string): number
function isInExportWindow(childId: string): boolean // Within 30 days of 18
```

**Acceptance Criteria:** AC1, AC2

---

### Task 6: Pre18ExportRequestUI Component

Create React component for parent to request data export.

**Files:**

- `apps/web/src/components/export/Pre18ExportRequest.tsx` (new)
- `apps/web/src/components/export/Pre18ExportRequest.test.tsx` (new)

**Component:**

- Shows export option when child is within 30 days of turning 18
- Explains what will be included (sanitized summaries)
- Explains what will NOT be included (screenshots, flags)
- Request export button that triggers consent request to child
- Shows pending/completed status

**Acceptance Criteria:** AC2, AC3

---

### Task 7: Pre18ExportConsentUI Component

Create React component for child to grant/deny export consent.

**Files:**

- `apps/web/src/components/export/Pre18ExportConsent.tsx` (new)
- `apps/web/src/components/export/Pre18ExportConsent.test.tsx` (new)

**Component:**

- Shows consent request from parent
- Explains what will be exported (sanitized summaries only)
- Grant consent / Deny consent buttons
- Emphasizes child's right to deny
- Shows confirmation after decision

**Acceptance Criteria:** AC4

---

### Task 8: Integration Tests

Create integration tests for the complete pre-18 export flow.

**Files:**

- `packages/shared/src/services/__tests__/integration/pre18DataExport.integration.test.ts` (new)

**Test scenarios:**

- Complete export flow: request → consent → generate → download
- Consent denial flow
- Sanitization verification (no screenshots, no flags)
- Watermark verification
- Export expiration handling
- Multiple export requests

**Acceptance Criteria:** All ACs

---

### Task 9: Export Index Updates

Update package exports.

**Files:**

- `apps/web/src/components/export/index.ts` (new)
- `packages/shared/src/index.ts` (update)

**Exports:**

- All Pre18 data export types, schemas, and services
- Export UI components

**Acceptance Criteria:** All ACs

## Dependencies

- Story 38-5: Age 18 Automatic Deletion (birthdateService, age-18 deletion logic)
- Existing screen time tracking services
- Existing agreement services

## Notes

- Export does NOT include screenshots (privacy protection)
- Export does NOT include concerning flags (child protection)
- Child consent is REQUIRED - parent cannot export without it
- Export URLs expire after 24 hours
- Watermark includes date, purpose, and consent status
