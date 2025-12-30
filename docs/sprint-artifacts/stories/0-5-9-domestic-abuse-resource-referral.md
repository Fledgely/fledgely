# Story 0.5.9: Domestic Abuse Resource Referral

Status: done

## Story

As a **victim completing an escape process**,
I want **to receive relevant domestic abuse resources automatically**,
So that **I have immediate access to safety planning help**.

## Acceptance Criteria

1. **AC1: Automatic resource email on escape completion**
   - Given a victim's escape process is complete (account severed)
   - When severParentAccess executes successfully
   - Then they receive an automatic email with domestic abuse resources within 5 minutes
   - And the email is triggered immediately after severing (not queued)

2. **AC2: Comprehensive resource content**
   - Given the resource email is generated
   - When the content is assembled
   - Then resources include national hotlines:
     - National Domestic Violence Hotline: 1-800-799-7233
     - Crisis Text Line: Text HOME to 741741
     - National Child Abuse Hotline: 1-800-422-4453
   - And resources include safety planning guide links
   - And resources include legal aid information
   - And content is culturally sensitive and trauma-informed

3. **AC3: Safe email destination**
   - Given the victim submitted a safety contact form
   - When the resource email is sent
   - Then the email is sent to the SAFE contact email (safeContactInfo.email from ticket)
   - And NOT sent to the account email (which abuser may monitor)
   - And if no safe email provided, resource email is NOT sent (logged for admin review)

4. **AC4: Discreet subject line**
   - Given the email is being composed
   - When the subject line is set
   - Then the subject does NOT mention "fledgely"
   - And the subject does NOT mention "escape", "abuse", "safety"
   - And the subject is neutral (e.g., "Important Resources" or "Helpful Information")

5. **AC5: Error disclaimer**
   - Given the email body is being assembled
   - When the content is finalized
   - Then the email includes text: "If this email was sent in error, you can safely ignore it."
   - And no identifying information about fledgely is included

6. **AC6: Admin audit logging**
   - Given a resource email is sent (or fails)
   - When the operation completes
   - Then the action is logged to adminAuditLogs only (NOT family audit)
   - And the log includes: ticketId, recipient (hashed), send status, timestamp
   - And failure logs include error details for troubleshooting

7. **AC7: No notification to abuser**
   - Given a resource email is being sent
   - When the email is delivered
   - Then NO notification is sent to any family member about this email
   - And the email does not appear in any family-visible logs
   - And the send operation is not visible in any family audit trail

## Tasks / Subtasks

- [x] Task 1: Create resource email template (AC: #2, #4, #5)
  - [x] 1.1 Create `apps/functions/src/templates/safetyResourceEmail.ts`
  - [x] 1.2 Define HTML template with hotlines, safety resources, and legal aid links
  - [x] 1.3 Define plain text fallback template
  - [x] 1.4 Ensure subject line does not mention fledgely or escape
  - [x] 1.5 Include error disclaimer text
  - [x] 1.6 Ensure no branding or fledgely references in email body

- [x] Task 2: Create resource email service function (AC: #1, #3, #6)
  - [x] 2.1 Create `apps/functions/src/lib/safety/sendSafetyResourceEmail.ts`
  - [x] 2.2 Accept ticketId to retrieve safe contact email
  - [x] 2.3 Validate safe contact email exists (skip if missing)
  - [x] 2.4 Call Resend API with neutral sender (NOT fledgely domain if possible)
  - [x] 2.5 Log success/failure to adminAuditLogs
  - [x] 2.6 Return send status for caller

- [x] Task 3: Integrate with severParentAccess (AC: #1, #7)
  - [x] 3.1 Modify `apps/functions/src/callable/admin/severParentAccess.ts`
  - [x] 3.2 Call sendSafetyResourceEmail after successful severing
  - [x] 3.3 Resource email should happen AFTER stealth window and audit sealing
  - [x] 3.4 Handle email send failure gracefully (log, don't fail the sever operation)
  - [x] 3.5 Ensure no notification to family members about email

- [x] Task 4: Add admin audit action types (AC: #6)
  - [x] 4.1 Add 'send_safety_resource_email' action to AdminAuditAction type
  - [x] 4.2 Add 'safety_resource_email' to AdminAuditResourceType
  - [x] 4.3 Update adminAudit.ts with new types

- [x] Task 5: Add schemas and types (AC: #2)
  - [x] 5.1 Add SafetyResourceEmailParams interface
  - [x] 5.2 Add sendSafetyResourceEmail function signature
  - [x] 5.3 Define resource links as configurable constants

- [x] Task 6: Add unit tests (AC: #1-7)
  - [x] 6.1 Test email template generates correct HTML
  - [x] 6.2 Test email template generates correct plain text
  - [x] 6.3 Test subject line has no sensitive words
  - [x] 6.4 Test email includes all required hotlines
  - [x] 6.5 Test email includes error disclaimer
  - [x] 6.6 Test safe email lookup from ticket
  - [x] 6.7 Test email not sent when safe email missing
  - [x] 6.8 Test admin audit logging on success
  - [x] 6.9 Test admin audit logging on failure
  - [x] 6.10 Test integration with severParentAccess
  - [x] 6.11 Minimum 15 tests required (56 tests achieved)

## Dev Notes

### Implementation Strategy

This story completes the escape process by providing victims with immediate access to safety resources. The key insight is that this email must be:

1. **Sent to the SAFE contact address** - The victim specifically provided this as a safe way to reach them, separate from their monitored account email
2. **Completely unbranded** - No fledgely references, no escape terminology, neutral subject line
3. **Comprehensive** - All major national resources included
4. **Immediate** - Sent as part of the sever operation, not queued

**Integration Order in severParentAccess:**

1. Verify safety ticket and identity
2. Execute severing (remove from family)
3. Log to admin audit
4. Activate stealth window (Story 0.5.7)
5. Seal audit entries (Story 0.5.8)
6. **Send safety resource email (Story 0.5.9)** - NEW

### Resource Content

**National Hotlines (US):**

- National Domestic Violence Hotline: 1-800-799-7233 (SAFE)
- Crisis Text Line: Text HOME to 741741
- National Child Abuse Hotline: 1-800-422-4453
- National Sexual Assault Hotline: 1-800-656-4673

**Safety Planning Resources:**

- https://www.thehotline.org/plan-for-safety/
- https://www.loveisrespect.org/personal-safety/safety-planning/
- https://ncadv.org/personalized-safety-plan

**Legal Aid:**

- https://www.lawhelp.org/
- https://www.lsc.gov/what-legal-aid/find-legal-aid

### Email Template Design

**Subject:** "Important Resources"

**Body (Plain Text):**

```
Important Resources

If you need support, these resources are available 24/7:

IMMEDIATE HELP
- National Hotline: 1-800-799-7233
- Text HOME to 741741 for Crisis Text Line
- National Child Abuse Hotline: 1-800-422-4453

SAFETY PLANNING
- thehotline.org/plan-for-safety
- loveisrespect.org/personal-safety/safety-planning

LEGAL HELP
- lawhelp.org - Find free legal aid
- lsc.gov/what-legal-aid/find-legal-aid

If this email was sent in error, you can safely ignore it.
```

**CRITICAL:** No fledgely branding, no logos, no "from fledgely" sender if avoidable.

### Email Sender Considerations

The current email service uses `noreply@fledgely.com`. For this safety email, consider:

1. **Option A:** Use a neutral sender like `resources@support.io` (requires separate domain/config)
2. **Option B:** Use `noreply@fledgely.com` but ensure body has no fledgely references
3. **Option C:** Use a generic sender name like "Support Resources" with fledgely domain

For MVP, Option B is acceptable since the email body is neutral. The sender domain alone is unlikely to be monitored.

### Security Considerations

1. **No notification leakage**: Email send status is ONLY in adminAuditLogs
2. **Safe email verification**: Validate email exists before sending
3. **No PII in logs**: Hash recipient email in audit logs
4. **Graceful failure**: If email fails, log but don't fail the sever operation

### Dependencies

**Story Dependencies:**

- Story 0.5.1: Secure Safety Contact Channel (provides safeContactInfo.email)
- Story 0.5.3: Support Agent Escape Dashboard (safety ticket data model)
- Story 0.5.4: Parent Access Severing (integration point)
- Story 0.5.7: 72-Hour Notification Stealth (sealing happens before this)
- Story 0.5.8: Audit Trail Sealing (sealing happens before this)

**Existing Code to Leverage:**

- `apps/functions/src/services/emailService.ts` - Resend integration pattern
- `apps/functions/src/templates/invitationEmail.ts` - Email template pattern
- `apps/functions/src/utils/adminAudit.ts` - Admin audit logging
- `apps/functions/src/callable/admin/severParentAccess.ts` - Integration point

### Testing Requirements

**Unit Tests (minimum 15):**

1. Template generates HTML with all hotlines
2. Template generates plain text with all hotlines
3. Template subject line is neutral
4. Template includes error disclaimer
5. Template has no fledgely branding
6. Service retrieves safe email from ticket
7. Service handles missing safe email
8. Service calls Resend API correctly
9. Service logs success to admin audit
10. Service logs failure to admin audit
11. Service returns correct status
12. Integration: severParentAccess calls resource email
13. Integration: email failure doesn't fail sever
14. Integration: email happens after sealing
15. No notification to family members

### Project Structure Notes

**Files to Create:**

- `apps/functions/src/templates/safetyResourceEmail.ts` - Email template
- `apps/functions/src/templates/safetyResourceEmail.test.ts` - Template tests
- `apps/functions/src/lib/safety/sendSafetyResourceEmail.ts` - Send service
- `apps/functions/src/lib/safety/sendSafetyResourceEmail.test.ts` - Service tests

**Files to Modify:**

- `apps/functions/src/utils/adminAudit.ts` - Add action types
- `apps/functions/src/callable/admin/severParentAccess.ts` - Add integration

### Previous Story Learnings (from Story 0.5.8)

1. **Test Pattern**: Use specification-based testing with vi.mock for Firestore
2. **Integration Order**: Stealth window first, sealing second, resource email third
3. **Admin Audit Only**: No family-visible logging for escape actions
4. **Graceful Degradation**: Non-critical operations shouldn't fail the main operation

### References

- [Source: docs/epics/epic-list.md#Story-0.5.9 - Domestic Abuse Resource Referral acceptance criteria]
- [Source: Story 0.5.4 - Parent Access Severing patterns]
- [Source: Story 0.5.1 - Safety Contact Channel (safeContactInfo.email)]
- [Source: apps/functions/src/services/emailService.ts - Resend integration patterns]
- [Source: apps/functions/src/templates/invitationEmail.ts - Email template patterns]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

1. Created safety resource email template with NO fledgely branding - subject line is neutral "Important Resources"
2. Implemented sendSafetyResourceEmail service that retrieves safe contact email from ticket
3. Integrated with severParentAccess to send email AFTER stealth window and audit sealing
4. Email failures are handled gracefully - logged but don't fail the sever operation
5. Recipient email is hashed in audit logs (no PII stored)
6. 56 total tests (37 template + 19 service) - exceeds minimum 15 required
7. Uses lazy initialization pattern for Firestore to support test mocking
8. Supports empty/whitespace-only email as "missing" (skips send)

### File List

**Files Created:**

- `apps/functions/src/templates/safetyResourceEmail.ts` - Email template with hotlines, safety planning, and legal resources
- `apps/functions/src/templates/safetyResourceEmail.test.ts` - 37 tests for template
- `apps/functions/src/lib/safety/sendSafetyResourceEmail.ts` - Service function to send email
- `apps/functions/src/lib/safety/sendSafetyResourceEmail.test.ts` - 19 tests for service

**Files Modified:**

- `apps/functions/src/utils/adminAudit.ts` - Added 'send_safety_resource_email' action and 'safety_resource_email' resource type
- `apps/functions/src/callable/admin/severParentAccess.ts` - Integrated sendSafetyResourceEmail after sealing
