# Story 51.5: Abuse Reporting

## Status: done

## Story

As **anyone**,
I want **to report suspected abuse of fledgely**,
So that **misuse can be investigated (FR156)**.

## Acceptance Criteria

1. **AC1: Public Access**
   - Given someone suspects fledgely misuse
   - When visiting the abuse report page
   - Then report form is accessible without login

2. **AC2: Report Categories**
   - Given user is on abuse report form
   - When selecting report type
   - Then can report: surveillance of adults, non-family use, harassment
   - And clear descriptions of each category

3. **AC3: Anonymous Option**
   - Given user is submitting a report
   - When choosing reporter details
   - Then anonymous reporting option available
   - And can optionally provide contact for follow-up

4. **AC4: Report Acknowledgment**
   - Given report is submitted
   - When submission completes
   - Then confirmation message displayed
   - And reference number provided (if contact given)

5. **AC5: 72-Hour Review**
   - Given abuse report is submitted
   - When triaged by support
   - Then reports reviewed within 72 hours
   - And initial triage decision made

6. **AC6: Follow-Up Option**
   - Given reporter provided contact info
   - When investigation progresses
   - Then reporter can receive follow-up updates
   - And notified of outcome when appropriate

7. **AC7: Secure Logging**
   - Given abuse report is submitted
   - When stored in system
   - Then reports logged securely (NFR42)
   - And protected from unauthorized access

8. **AC8: Investigation Process**
   - Given abuse is reported
   - When investigation begins
   - Then documented investigation process followed
   - And actions taken are recorded

## Tasks / Subtasks

### Task 1: Create Abuse Report Data Model

**Files:**

- `packages/shared/src/contracts/abuseReport.ts` (new)

**Implementation:**

1.1 Define AbuseReportSchema with Zod:

```typescript
export const AbuseReportType = {
  SURVEILLANCE_OF_ADULTS: 'surveillance_of_adults',
  NON_FAMILY_USE: 'non_family_use',
  HARASSMENT: 'harassment',
  OTHER: 'other',
} as const

export const AbuseReportStatus = {
  SUBMITTED: 'submitted',
  TRIAGING: 'triaging',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const

export const AbuseReportSchema = z.object({
  reportId: z.string(),
  type: z.enum([...Object.values(AbuseReportType)]),
  description: z.string().min(10).max(5000),
  evidenceUrls: z.array(z.string().url()).optional(),

  // Reporter info (optional for anonymous)
  isAnonymous: z.boolean(),
  reporterEmail: z.string().email().optional(),
  reporterName: z.string().optional(),
  wantsFollowUp: z.boolean().default(false),

  // Status tracking
  status: z.enum([...Object.values(AbuseReportStatus)]),
  submittedAt: z.number(),
  triagedAt: z.number().nullable(),
  triagedBy: z.string().nullable(),
  resolvedAt: z.number().nullable(),
  resolution: z.string().nullable(),

  // Reference number for reporter
  referenceNumber: z.string().optional(),
})
```

1.2 Add exports to shared index

### Task 2: Create Abuse Report HTTP Endpoint

**Files:**

- `apps/functions/src/http/abuseReport.ts` (new)

**Implementation:**

2.1 Create public POST endpoint for abuse reports:

- No authentication required (AC1)
- Validate report data with Zod
- Generate reference number for non-anonymous reports
- Store report in `abuseReports` collection
- Send confirmation email if contact provided

  2.2 Create internal GET endpoint for admin:

- Requires admin authentication
- Returns reports for triage dashboard

  2.3 Pattern: reference submitSafetyContact.ts for public form handling

### Task 3: Create Abuse Report Page

**Files:**

- `apps/web/src/app/report-abuse/page.tsx` (new)

**Implementation:**

3.1 Create public page (no auth required):

- Clean, professional form layout
- Report type selector with descriptions
- Description text area (min 10 chars, max 5000)
- Optional evidence URL fields
- Anonymous toggle
- Email field (shown if not anonymous)
- "Want follow-up" checkbox

  3.2 Form validation:

- Client-side validation before submit
- Clear error messages
- Required fields marked

  3.3 Submission handling:

- Show loading state
- Display confirmation with reference number
- Handle errors gracefully

### Task 4: Create Admin Abuse Report Dashboard

**Files:**

- `apps/web/src/app/admin/abuse-reports/page.tsx` (new)
- `apps/web/src/components/admin/AbuseReportCard.tsx` (new)

**Implementation:**

4.1 Create admin page (requires admin role):

- List all abuse reports
- Filter by status, type
- Sort by date
- Show 72-hour SLA indicator

  4.2 Create AbuseReportCard component:

- Show report summary
- Quick status update buttons
- Resolution notes field
- Timeline of actions

  4.3 Pattern: reference SafetyTicketCard.tsx for admin dashboard patterns

### Task 5: Create Email Templates

**Files:**

- `apps/functions/src/lib/email/templates/abuseReportConfirmationEmail.ts` (new)
- `apps/functions/src/lib/email/templates/abuseReportUpdateEmail.ts` (new)

**Implementation:**

5.1 Create confirmation email:

- Sent to reporter if email provided
- Includes reference number
- Explains 72-hour review timeline
- How to check status

  5.2 Create update email:

- Sent when status changes
- Explains next steps
- Professional tone

### Task 6: Add Firestore Indexes

**Files:**

- `firestore.indexes.json` (modify)

**Implementation:**

6.1 Add composite indexes:

```json
{
  "collectionGroup": "abuseReports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "submittedAt", "order": "ASCENDING" }
  ]
}
```

### Task 7: Export Functions

**Files:**

- `apps/functions/src/index.ts` (modify)

**Implementation:**

7.1 Export abuse report HTTP handlers

## Dev Notes

### Existing Infrastructure

**Safety Contact Submission (apps/functions/src/callable/submitSafetyContact.ts):**

- Pattern for public form submission
- Reference number generation
- Secure storage

**Admin Safety Dashboard (apps/web/src/app/admin/safety/page.tsx):**

- Admin authentication patterns
- Ticket list and detail views
- Status update flows

### Security Considerations

- No authentication required for report submission (AC1)
- Rate limiting on submission endpoint
- Sanitize all input to prevent XSS
- Store reports in separate collection with restricted admin access
- Log all admin actions on reports
- Encrypt reporter email if provided

### 72-Hour SLA

The 72-hour review requirement means:

- Visual indicator in admin dashboard when approaching deadline
- Possible scheduled function to alert admins of pending reports
- Metrics tracking for SLA compliance

### Report Types Explained

1. **Surveillance of Adults**: Using fledgely to monitor adults without consent
2. **Non-Family Use**: Organization/school using family-only tool inappropriately
3. **Harassment**: Using fledgely features to harass family members
4. **Other**: Catch-all for unlisted abuse types

### References

- [Source: docs/epics/epic-list.md#Story-51.5 - Abuse Reporting]
- [Pattern: apps/functions/src/callable/submitSafetyContact.ts - Public form handling]
- [Pattern: apps/web/src/app/admin/safety/page.tsx - Admin dashboard]

---

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
