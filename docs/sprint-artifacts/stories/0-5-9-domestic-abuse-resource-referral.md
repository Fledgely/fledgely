# Story 0.5.9: Domestic Abuse Resource Referral

**Status:** Done

---

## Story

As a **victim completing an escape process**,
I want **to receive relevant domestic abuse resources automatically**,
So that **I have immediate access to safety planning help**.

---

## Acceptance Criteria

### AC1: Automatic Resource Email on Escape Completion
**Given** a victim's escape process is complete
**When** their account is severed via `severParentAccess`
**Then** they receive an automatic email with domestic abuse resources within 5 minutes
**And** the email is triggered asynchronously (does not block severing completion)
**And** email delivery failure does NOT prevent escape completion
**And** email delivery status is logged to sealed admin audit only

### AC2: Comprehensive Resource Content
**Given** a resource referral email is being composed
**When** the email content is generated
**Then** it includes national hotlines (National DV Hotline: 1-800-799-7233, Crisis Text Line: text HOME to 741741)
**And** it includes the RAINN hotline (1-800-656-4673) for sexual assault resources
**And** it includes safety planning guide links (thehotline.org/plan-for-safety)
**And** it includes legal aid information (lawhelp.org)
**And** it includes online resources (thehotline.org, loveisrespect.org)
**And** resources are formatted clearly with descriptive text

### AC3: Safe Contact Address Usage
**Given** a victim provided a safe contact address in their safety request
**When** the resource email is sent
**Then** the email is sent ONLY to the safe contact address (not account email)
**And** if no safe contact address was provided, email is sent to account email with extra safety warnings
**And** the email subject line does NOT mention "fledgely", "escape", or "abuse"
**And** a neutral subject like "Resources you requested" is used

### AC4: Discreet Email Content
**Given** a resource referral email is being sent
**When** the email is composed
**Then** the email includes "If this was sent in error, you can ignore it" disclaimer
**And** the sender name/address is generic (not obviously "fledgely safety team")
**And** the email body does NOT include family names, child names, or account details
**And** the email does NOT reference the specific escape actions taken

### AC5: Retry and Failure Handling
**Given** an email send attempt fails
**When** the system retries delivery
**Then** up to 3 retry attempts are made with exponential backoff (1min, 5min, 15min)
**And** final failure is logged to sealed admin audit with error details
**And** final failure does NOT generate any user-visible error
**And** safety team can see failed deliveries in safety request details

### AC6: Resource Referral on Self-Removal
**Given** a parent uses the self-removal escape path (Story 2.8)
**When** they complete self-removal with safety confirmation
**Then** they see confirmation page with domestic abuse resources inline
**And** optionally they can request the same resources be emailed
**And** the inline resources match email content
**And** no email is sent without explicit request to protect privacy

### AC7: Integration with Existing Escape Functions
**Given** any escape action (severParentAccess, unenrollDevice, disableLocationFeatures) completes
**When** it is part of a safety request workflow
**Then** resource referral eligibility is checked based on safety request metadata
**And** only ONE resource email is sent per safety request (not per action)
**And** the email is sent after ALL requested escape actions complete
**And** partial completion (some actions done) does NOT trigger email

### AC8: Resource Content Configuration
**Given** the need to update resource links over time
**When** resources are configured
**Then** resource content is stored in a configuration collection (not hardcoded)
**And** resources can be updated by admin without code deployment
**And** resource content includes last-verified date
**And** stale resources (>90 days unverified) trigger internal alert

---

## Tasks / Subtasks

### Task 1: Create Resource Configuration Data Model (AC: #2, #8)
- [x] 1.1 Create `escapeResources` Firestore collection schema
- [x] 1.2 Define resource entry structure: name, type, value, description, verifiedAt
- [x] 1.3 Create seed data with initial resources (hotlines, websites, guides)
- [x] 1.4 Create utility to fetch active resources with caching
- [x] 1.5 Create admin function to update resources (admin role required)

### Task 2: Create Email Template and Sender (AC: #1, #2, #3, #4)
- [x] 2.1 Create `sendResourceReferralEmail` utility function in `apps/functions/src/utils/emailService.ts`
- [x] 2.2 Implement email template with all required resources
- [x] 2.3 Use neutral sender name and subject line
- [x] 2.4 Include "sent in error" disclaimer in footer
- [x] 2.5 Use safe contact address when available, fall back to account email
- [x] 2.6 Add extra safety warnings when using account email

### Task 3: Create Resource Referral Trigger Function (AC: #1, #5, #7)
- [x] 3.1 Create `triggerResourceReferral` callable function
- [x] 3.2 Validate caller has safety-team role
- [x] 3.3 Accept safetyRequestId and verify request exists
- [x] 3.4 Check if referral already sent for this request (idempotency)
- [x] 3.5 Queue email for async delivery
- [x] 3.6 Log referral initiation to sealed admin audit

### Task 4: Create Email Delivery Worker (AC: #1, #5)
- [x] 4.1 Create Firestore-triggered function for email queue processing
- [x] 4.2 Implement exponential backoff retry (1min, 5min, 15min)
- [x] 4.3 Update delivery status in queue document
- [x] 4.4 Log final success/failure to sealed admin audit
- [x] 4.5 Integrate with Firebase Auth to get safe contact or account email

### Task 5: Integrate with severParentAccess (AC: #7)
- [x] 5.1 Add optional `triggerResourceReferral` parameter to severParentAccess
- [x] 5.2 If triggered, mark safety request for referral eligibility
- [x] 5.3 Check if all requested escape actions complete before triggering
- [x] 5.4 Create `checkEscapeCompletion` utility to verify all actions done

### Task 6: Create Self-Removal Resource Display (AC: #6)
- [x] 6.1 Create `getResourceReferralContent` callable function
- [x] 6.2 Return formatted resources for inline display (no auth required for viewing)
- [x] 6.3 Create optional `requestResourceEmail` callable for self-removal path
- [x] 6.4 Validate user context (recently self-removed) before sending email

### Task 7: Create Resource Staleness Alert (AC: #8)
- [x] 7.1 Create scheduled function to check resource verification dates
- [x] 7.2 Alert admin if any resource >90 days since last verification
- [x] 7.3 Log staleness check results to admin audit

### Task 8: Write Tests (All AC)
- [x] 8.1 Unit tests for email template generation
- [x] 8.2 Unit tests for safe contact address selection logic
- [x] 8.3 Integration tests for resource referral trigger
- [x] 8.4 Integration tests for email delivery worker
- [x] 8.5 Test retry logic with exponential backoff
- [x] 8.6 Test idempotency (same request doesn't send multiple emails)
- [x] 8.7 Security tests: referral requires safety-team role
- [x] 8.8 Test resource configuration CRUD operations
- [x] 8.9 Test staleness detection

---

## Dev Notes

### Critical Safety Requirements
This feature provides life-critical resources to abuse victims immediately after escape. Implementation errors could:
1. **Expose victim** - Email to wrong address, subject reveals escape
2. **Delay resources** - Email not sent within 5-minute window
3. **Break escape** - Email failure blocks escape completion
4. **Miss victims** - Resource not sent due to integration gaps
5. **Stale resources** - Hotlines changed, victims get disconnected

Key invariants:
1. **NEVER** send to account email without extra safety warnings
2. **NEVER** block escape completion on email failure
3. **NEVER** include identifying information in email
4. **NEVER** use subject lines that reveal purpose
5. **ALWAYS** use safe contact address when provided
6. **ALWAYS** send exactly ONE email per safety request
7. **ALWAYS** log delivery status to sealed audit

### Architecture Patterns

**Resource Configuration Schema:**
```typescript
// /escapeResources/{resourceId}
interface EscapeResource {
  id: string
  name: string
  type: 'hotline' | 'text-line' | 'website' | 'guide' | 'legal-aid'
  value: string                    // Phone number, URL, or text code
  description: string              // What this resource provides
  displayOrder: number             // Order in email/display
  isActive: boolean                // Can be deactivated without deletion
  verifiedAt: Timestamp            // Last time someone verified link/number works
  verifiedBy: string               // Admin who verified
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Email Queue Schema:**
```typescript
// /emailQueue/{queueId}
interface EmailQueueItem {
  id: string
  type: 'resource-referral'
  recipient: string                // Email address
  safetyRequestId: string
  status: 'pending' | 'processing' | 'sent' | 'failed'
  attempts: number
  lastAttemptAt?: Timestamp
  nextAttemptAt?: Timestamp
  sentAt?: Timestamp
  error?: string
  createdAt: Timestamp
}
```

**Resource Referral State Schema:**
```typescript
// Field in safetyRequests/{requestId}
interface SafetyRequestResourceReferral {
  referralTriggered: boolean       // Has referral been initiated
  referralTriggeredAt?: Timestamp
  referralTriggeredBy?: string     // Safety agent who triggered
  referralSentAt?: Timestamp
  referralStatus: 'pending' | 'sent' | 'failed'
  referralEmailId?: string         // Reference to emailQueue document
}
```

**Email Template Pattern:**
```typescript
function generateResourceEmail(
  resources: EscapeResource[],
  usingSafeContact: boolean
): { subject: string; html: string; text: string } {
  const subject = 'Resources you requested'

  // Group resources by type
  const hotlines = resources.filter(r => r.type === 'hotline')
  const textLines = resources.filter(r => r.type === 'text-line')
  const websites = resources.filter(r => r.type === 'website')
  const guides = resources.filter(r => r.type === 'guide')

  // Build email content (HTML and plain text versions)
  // Include disclaimer at bottom
  // If NOT using safe contact, add safety warnings at top

  return { subject, html, text }
}
```

**Integration Pattern:**
```typescript
// In severParentAccess completion
if (input.triggerResourceReferral) {
  // Check if all escape actions for this safety request are complete
  const escapeComplete = await checkEscapeCompletion(requestId)

  if (escapeComplete) {
    // Queue resource email asynchronously
    await queueResourceReferralEmail(requestId)
    // Do NOT await email delivery - escape must complete regardless
  }
}
```

### Naming Conventions
- Function: `triggerResourceReferral`, `sendResourceReferralEmail`, `checkEscapeCompletion` (camelCase)
- Collection: `escapeResources`, `emailQueue` (camelCase)
- Schema field: `referralTriggered`, `safetyRequestId` (camelCase)

### Project Structure Notes

**Files to Create:**
```
apps/functions/src/utils/emailService.ts                    # Email utilities
apps/functions/src/utils/emailService.test.ts               # Tests
apps/functions/src/utils/resourceService.ts                 # Resource utilities
apps/functions/src/utils/resourceService.test.ts            # Tests
apps/functions/src/callable/triggerResourceReferral.ts      # Main trigger function
apps/functions/src/callable/triggerResourceReferral.test.ts # Tests
apps/functions/src/callable/getResourceReferralContent.ts   # Content fetch for UI
apps/functions/src/callable/getResourceReferralContent.test.ts # Tests
apps/functions/src/callable/requestResourceEmail.ts         # Self-removal email request
apps/functions/src/callable/requestResourceEmail.test.ts    # Tests
apps/functions/src/triggers/processEmailQueue.ts            # Firestore trigger
apps/functions/src/triggers/processEmailQueue.test.ts       # Tests
apps/functions/src/scheduled/checkResourceStaleness.ts      # Daily staleness check
apps/functions/src/scheduled/checkResourceStaleness.test.ts # Tests
```

**Files to Modify:**
```
apps/functions/src/index.ts                                 # Export new functions
apps/functions/src/callable/severParentAccess.ts            # Add referral integration
```

**Seed Data to Create:**
```
apps/functions/seed/escapeResources.json                    # Initial resource data
```

### Previous Story Intelligence (Story 0.5.8)

**Patterns Established:**
- Sealed admin audit logging with SHA-256 integrity hash
- Safety-team role required for escape operations
- Zod schema validation with minimum reason length
- No family audit trail entries for escape actions
- Batch chunking for Firestore 500-operation limit
- Compliance access logging for sensitive data

**Code to Reuse:**
- `generateIntegrityHash()` from auditTrail.ts
- Sealed audit logging pattern from existing escape functions
- Error handling with errorId generation

### Email Considerations

**Firebase Extensions vs Custom:**
- Consider Firebase Extensions "Trigger Email" for simplicity
- Custom implementation gives more control over retry logic
- Decision: Custom implementation for sealed audit integration

**Email Provider Options:**
- SendGrid (recommended for transactional email)
- Firebase Auth email (limited but simpler)
- Decision: Use environment-configured SMTP or SendGrid API

**Safe Contact vs Account Email Logic:**
```typescript
async function getRecipientEmail(safetyRequestId: string): Promise<{
  email: string
  isSafeContact: boolean
}> {
  const request = await getSafetyRequest(safetyRequestId)

  if (request.safeContactEmail) {
    return { email: request.safeContactEmail, isSafeContact: true }
  }

  // Fall back to account email with warning
  const user = await auth.getUser(request.victimUserId)
  return { email: user.email!, isSafeContact: false }
}
```

### Resource Content (Initial Seed Data)

```json
[
  {
    "name": "National Domestic Violence Hotline",
    "type": "hotline",
    "value": "1-800-799-7233",
    "description": "24/7 confidential support for domestic violence victims. Advocates available in 200+ languages.",
    "displayOrder": 1
  },
  {
    "name": "Crisis Text Line",
    "type": "text-line",
    "value": "Text HOME to 741741",
    "description": "Free 24/7 crisis text support. Trained counselors available immediately.",
    "displayOrder": 2
  },
  {
    "name": "RAINN National Sexual Assault Hotline",
    "type": "hotline",
    "value": "1-800-656-4673",
    "description": "24/7 support for sexual assault survivors. Free and confidential.",
    "displayOrder": 3
  },
  {
    "name": "The Hotline - Safety Planning",
    "type": "website",
    "value": "https://www.thehotline.org/plan-for-safety/",
    "description": "Step-by-step safety planning guides for leaving an abusive situation.",
    "displayOrder": 4
  },
  {
    "name": "LawHelp.org",
    "type": "legal-aid",
    "value": "https://www.lawhelp.org/",
    "description": "Find free legal aid in your area. Search by state and issue type.",
    "displayOrder": 5
  },
  {
    "name": "Love Is Respect",
    "type": "website",
    "value": "https://www.loveisrespect.org/",
    "description": "Resources specifically for young people experiencing dating abuse.",
    "displayOrder": 6
  }
]
```

### Testing Standards

**Required Tests:**
1. Email template generates correct content (unit)
2. Safe contact address selected when available (unit)
3. Account email with warnings when no safe contact (unit)
4. Referral requires safety-team role (integration - security)
5. Idempotency - same request doesn't send multiple emails (integration)
6. Retry logic with exponential backoff (integration)
7. Email failure doesn't block escape (integration)
8. Resource configuration CRUD (integration)
9. Staleness detection triggers alert (integration)

**Adversarial Tests:**
1. Non-safety-team cannot trigger referral
2. Email to wrong address fails validation
3. Subject line does not contain sensitive words
4. Email body does not contain family/child names
5. Retry doesn't exceed 3 attempts

---

### References

- [Source: docs/epics/epic-list.md#Story-0.5.9] - Original story requirements
- [Source: docs/sprint-artifacts/stories/0-5-8-audit-trail-sealing.md] - Previous story patterns
- [Source: apps/functions/src/callable/severParentAccess.ts] - Escape action integration point
- [Source: docs/project_context.md] - Cloud Functions template patterns

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/0-5-9-domestic-abuse-resource-referral.md
- Previous stories: 0.5.1, 0.5.2, 0.5.3, 0.5.4, 0.5.5, 0.5.6, 0.5.7, 0.5.8

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- All 374 tests pass (24 test files)
- Test run: 2025-12-15 17:53

### Completion Notes List
- This is Story 9 of 9 in Epic 0.5 (Safe Account Escape) - THE FINAL STORY
- Focuses on post-escape resource delivery
- Introduces email queue pattern for async processing
- Introduces configurable resource content
- Creates integration point with existing escape functions
- Emphasizes privacy and safety in all email communications
- ✅ Resource configuration data model implemented with caching
- ✅ Email template with HTML and plain text versions, safety warnings
- ✅ Neutral subject line "Resources you requested" - no sensitive words
- ✅ Safe contact address prioritized over account email
- ✅ Exponential backoff retry (1min, 5min, 15min) with max 3 attempts
- ✅ Idempotency check prevents duplicate emails per safety request
- ✅ Integration with severParentAccess via triggerResourceReferral parameter
- ✅ checkEscapeCompletion utility verifies all actions complete before email
- ✅ Self-removal path: getResourceReferralContent (public) + requestResourceEmail (auth)
- ✅ Staleness check scheduled function with console warning for monitoring
- ✅ All audit entries sealed for compliance-only access

### File List
**Created:**
- `apps/functions/src/utils/emailService.ts`
- `apps/functions/src/utils/emailService.test.ts`
- `apps/functions/src/utils/resourceService.ts`
- `apps/functions/src/utils/resourceService.test.ts`
- `apps/functions/src/callable/triggerResourceReferral.ts`
- `apps/functions/src/callable/triggerResourceReferral.test.ts`
- `apps/functions/src/callable/getResourceReferralContent.ts`
- `apps/functions/src/callable/getResourceReferralContent.test.ts`
- `apps/functions/src/callable/requestResourceEmail.ts`
- `apps/functions/src/callable/requestResourceEmail.test.ts`
- `apps/functions/src/triggers/processEmailQueue.ts`
- `apps/functions/src/triggers/processEmailQueue.test.ts`
- `apps/functions/src/scheduled/checkResourceStaleness.ts`
- `apps/functions/src/scheduled/checkResourceStaleness.test.ts`
- `apps/functions/seed/escapeResources.json`

**Modified:**
- `apps/functions/src/index.ts`
- `apps/functions/src/callable/severParentAccess.ts`

---

## Change Log

- 2025-12-15: Implemented Story 0.5.9 - Domestic Abuse Resource Referral
  - Created resource configuration with 6 default resources (National DV Hotline, Crisis Text Line, RAINN, Safety Planning, LawHelp, Love Is Respect)
  - Created email service with HTML/plain text templates and safety warnings
  - Created triggerResourceReferral callable function with safety-team role requirement
  - Created email queue processing with Firestore triggers and retry logic
  - Created getResourceReferralContent for self-removal inline display (public)
  - Created requestResourceEmail for self-removal email requests with rate limiting
  - Created checkResourceStaleness scheduled function (daily, 90-day threshold)
  - Integrated triggerResourceReferral parameter into severParentAccess
  - Added checkEscapeCompletion and getRecipientEmailForReferral utilities
  - Created seed data file with initial resources
  - All 374 tests passing
- 2025-12-15: Code review fixes applied
  - Added URL sanitization (sanitizeUrl) to prevent javascript: injection in email links
  - Enhanced error logging in catch blocks to include error type and message
  - Added 8 comprehensive tests for triggerResourceReferral integration in severParentAccess
  - All 382 tests passing
