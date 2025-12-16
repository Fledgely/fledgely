# Story 3.6: Legal Parent Petition for Access

**Status:** ready-for-dev

---

## Story

As a **legal parent who was not invited by the account creator**,
I want **to petition for access by submitting court documentation**,
So that **I can access monitoring of my child even if my co-parent won't invite me**.

---

## Acceptance Criteria

### AC1: Petition Access via Safety Channel
**Given** a legal parent discovers their child is being monitored via fledgely
**When** they access the Safety Resources link (established in Epic 0.5)
**Then** they see an option to "Request Legal Parent Access" alongside abuse escape options
**And** the option is clearly separate from escape/abuse reporting
**And** option text is at 6th-grade reading level (NFR65)

### AC2: Legal Documentation Upload
**Given** a legal parent initiates an access petition
**When** they fill out the petition form
**Then** they can provide their information (name, email, phone)
**And** they can specify which child they are claiming parental rights for
**And** they can upload legal documentation (custody order, birth certificate, court decree)
**And** upload uses existing SafetyDocumentUpload infrastructure (from Story 0.5.2)
**And** form accepts same document formats (PDF, images, DOC/DOCX)
**And** maximum 5 documents, 25MB each (same as Story 0.5.2)

### AC3: Petition Submission and Tracking
**Given** a legal parent submits their petition
**When** submission is processed
**Then** petition is stored in isolated `legalPetitions` collection (not family-accessible)
**And** petitioner receives confirmation with a petition reference number
**And** petitioner can check status via the reference number
**And** status updates are sent to the safe contact email/phone provided
**And** no notification is sent to the existing family (until verified and added)

### AC4: Support Review Queue
**Given** a legal petition has been submitted
**When** support team accesses the safety/petition dashboard
**Then** they see the petition in a dedicated "Legal Parent Petitions" queue
**And** they can view all submitted documentation
**And** they can mark petition as: reviewing, pending-more-info, verified, denied
**And** they can request additional documentation from petitioner
**And** they can add internal notes about verification process

### AC5: Verified Parent Addition
**Given** support has verified the legal parent's documentation
**When** support approves the petition
**Then** support can add the verified parent as a co-parent to the family
**And** this bypasses the normal invitation flow (no invitation token needed)
**And** the new parent receives notification that access has been granted
**And** the existing parent is notified that a court-ordered parent was added
**And** notification to existing parent includes: "A parent with court documentation has been granted access"
**And** new parent has equal access per Story 3.4 requirements

### AC6: Existing Parent Notification
**Given** a legal parent has been added via petition
**When** the existing parent next accesses the app
**Then** they see a notification about the court-ordered access addition
**And** notification explains this was a legal process, not an invitation
**And** notification provides link to family settings showing all guardians
**And** existing parent cannot revoke the court-ordered parent (requires another court order)

### AC7: Denial Handling
**Given** support denies a petition (insufficient documentation)
**When** denial is processed
**Then** petitioner receives notification explaining the denial
**And** notification includes what documentation would be required
**And** petitioner can submit a new petition with additional documentation
**And** denied petitions are retained for compliance/audit purposes

### AC8: Petition Processing SLA
**Given** a petition is submitted
**When** processing begins
**Then** petition is processed within 5 business days
**And** petitioner is notified of status updates at each stage
**And** if processing will exceed 5 days, petitioner is notified of delay

### AC9: Security and Audit
**Given** any action on a legal petition
**When** the action is performed
**Then** action is logged to admin audit (not family audit)
**And** log includes: action type, performer ID, timestamp, petition ID
**And** logs are retained per compliance requirements
**And** petitioner cannot see internal notes or support discussions

### AC10: Accessibility
**Given** a user with assistive technology
**When** using the petition form
**Then** all form fields have proper labels
**And** status updates are announced via aria-live
**And** all buttons meet 44x44px minimum (NFR49)
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** keyboard navigation works for all features (NFR43)

---

## Tasks / Subtasks

### Task 1: Create Legal Petition Schemas (packages/contracts/src/legal-petition.schema.ts)
- [ ] 1.1 Define Zod schema for legal petition with fields: id, petitionerName, petitionerEmail, petitionerPhone, childName, childDOB, claimedRelationship, message, documents[], status, createdAt, updatedAt
- [ ] 1.2 Define petition status enum: 'submitted' | 'reviewing' | 'pending-more-info' | 'verified' | 'denied'
- [ ] 1.3 Define petition document reference schema (reuse SafetyDocument pattern)
- [ ] 1.4 Add reference number generator (format: LP-YYYYMMDD-XXXXX)
- [ ] 1.5 Export schemas and types from contracts index
- [ ] 1.6 Write schema validation tests

### Task 2: Create Firestore Collection and Security Rules (packages/firebase-rules/)
- [ ] 2.1 Add `legalPetitions` collection to Firestore rules
- [ ] 2.2 Security: write-only for any authenticated user (create)
- [ ] 2.3 Security: read for safety-team role only
- [ ] 2.4 Security: update for safety-team role only
- [ ] 2.5 **CRITICAL**: Collection NOT accessible via family-scoped queries
- [ ] 2.6 Add indexes for petition queue sorting (status, createdAt)
- [ ] 2.7 Write security rules tests

### Task 3: Create Petition Submission Cloud Function (apps/functions/src/callable/)
- [ ] 3.1 Create `submitLegalPetition` callable function
- [ ] 3.2 Validate input against Zod schema
- [ ] 3.3 Generate unique petition reference number
- [ ] 3.4 Store petition in `legalPetitions` collection
- [ ] 3.5 **CRITICAL**: Do NOT notify any family members
- [ ] 3.6 **CRITICAL**: Do NOT log to family audit trail
- [ ] 3.7 Log to admin audit only
- [ ] 3.8 Return reference number to petitioner
- [ ] 3.9 Write function tests

### Task 4: Create Petition Status Check Function (apps/functions/src/callable/)
- [ ] 4.1 Create `checkPetitionStatus` callable function
- [ ] 4.2 Accept reference number and petitioner email for verification
- [ ] 4.3 Return current status and any messages from support
- [ ] 4.4 Do NOT reveal internal notes or support discussions
- [ ] 4.5 Write function tests

### Task 5: Create Court-Ordered Parent Addition Function (apps/functions/src/callable/)
- [ ] 5.1 Create `addCourtOrderedParent` callable function (support-team only)
- [ ] 5.2 Accept petition ID, family ID, new parent's auth UID
- [ ] 5.3 Verify caller has safety-team role
- [ ] 5.4 Add new parent to family's guardians array
- [ ] 5.5 Mark parent as `addedVia: 'court-order'` (to prevent revocation)
- [ ] 5.6 Send notification to new parent (access granted)
- [ ] 5.7 Send notification to existing guardians (court-ordered access added)
- [ ] 5.8 Update petition status to 'verified'
- [ ] 5.9 Log to admin audit
- [ ] 5.10 Write function tests including adversarial (non-support cannot call)

### Task 6: Create Legal Petition Form Component (apps/web/src/components/safety/)
- [ ] 6.1 Create `LegalPetitionForm.tsx` component
- [ ] 6.2 Integrate with SafetyDocumentUpload component for document upload
- [ ] 6.3 Form fields: name, email, phone, child name, child DOB, relationship claim, message
- [ ] 6.4 Clear success message with reference number
- [ ] 6.5 44x44px touch targets (NFR49)
- [ ] 6.6 Accessible labels and aria-live announcements
- [ ] 6.7 6th-grade reading level text (NFR65)
- [ ] 6.8 Write component tests

### Task 7: Create Petition Status Checker Component (apps/web/src/components/safety/)
- [ ] 7.1 Create `PetitionStatusChecker.tsx` component
- [ ] 7.2 Input fields: reference number, email (for verification)
- [ ] 7.3 Display current status and any support messages
- [ ] 7.4 Handle petition not found gracefully
- [ ] 7.5 Write component tests

### Task 8: Update SafetyContactForm with Petition Option (apps/web/src/components/safety/)
- [ ] 8.1 Add "Legal Parent Access Request" option to SafetyContactForm
- [ ] 8.2 Use tabs or accordion to separate: Escape Help | Legal Parent Access | Check Status
- [ ] 8.3 Ensure visual separation between escape and legal petition
- [ ] 8.4 Maintain subtle, non-alarming visual style
- [ ] 8.5 Write integration tests

### Task 9: Support Dashboard - Petition Queue (apps/web/src/app/(admin)/support/)
- [ ] 9.1 Create `petitions/page.tsx` - petition review queue
- [ ] 9.2 List petitions with filters: all, submitted, reviewing, pending-more-info, verified, denied
- [ ] 9.3 Sort by createdAt (oldest first for SLA compliance)
- [ ] 9.4 Show petition count by status
- [ ] 9.5 Link to individual petition detail view

### Task 10: Support Dashboard - Petition Detail View (apps/web/src/app/(admin)/support/)
- [ ] 10.1 Create `petitions/[petitionId]/page.tsx` - petition detail
- [ ] 10.2 Display all petition information and documents
- [ ] 10.3 Action buttons: Update Status, Request More Info, Approve, Deny
- [ ] 10.4 Internal notes section (support-only, not visible to petitioner)
- [ ] 10.5 If approving: show family search to link petition to existing family
- [ ] 10.6 If approving: trigger addCourtOrderedParent function
- [ ] 10.7 Write integration tests

### Task 11: Guardian Model Update (packages/contracts/src/guardian.schema.ts)
- [ ] 11.1 Add `addedVia` field to guardian schema: 'invitation' | 'court-order' | 'creator'
- [ ] 11.2 Add business rule: guardians with `addedVia: 'court-order'` cannot be revoked by other guardians
- [ ] 11.3 Update existing guardian schema tests
- [ ] 11.4 Update guardian-related components to show court-order badge if applicable

### Task 12: Notification Updates (apps/functions/src/notifications/)
- [ ] 12.1 Create notification template: LEGAL_PARENT_ACCESS_GRANTED (to new parent)
- [ ] 12.2 Create notification template: COURT_ORDERED_PARENT_ADDED (to existing guardians)
- [ ] 12.3 Create notification template: PETITION_STATUS_UPDATE (to petitioner)
- [ ] 12.4 Ensure notifications go to safe contact info only (not family-visible channels)
- [ ] 12.5 Write notification tests

### Task 13: Comprehensive Tests
- [ ] 13.1 Unit tests for all new schemas
- [ ] 13.2 Integration tests for all Cloud Functions
- [ ] 13.3 Adversarial: family members cannot read legalPetitions collection
- [ ] 13.4 Adversarial: non-support users cannot call support-only functions
- [ ] 13.5 Adversarial: court-ordered parent cannot be revoked via normal flow
- [ ] 13.6 E2E: Full petition flow from submission to approval
- [ ] 13.7 E2E: Petition denial flow
- [ ] 13.8 Accessibility tests for all new components

---

## Dev Notes

### Critical Requirements

This story implements a legal pathway for parents who have been excluded from family monitoring by an uncooperative co-parent. This is a **sensitive feature** that must:

1. **Protect legitimate claims** - Parents with valid court orders must be able to access monitoring
2. **Prevent abuse** - The system must verify documentation before granting access
3. **Maintain safety** - Petitions should not trigger family notifications until verified
4. **Support domestic abuse survivors** - A coercive controller may use this feature; support team must be trained to identify potential abuse

**CRITICAL PATTERNS:**

1. **Isolated Storage** - Petitions stored in `legalPetitions` collection, never in family-accessible paths
2. **No Family Notifications** - Until petition is verified and parent is added
3. **Support-Only Actions** - Verification and approval require safety-team role
4. **Court-Order Protection** - Parents added via court order cannot be removed without another court order
5. **Audit Trail** - All actions logged to admin audit (not family audit)

### Architecture Patterns

**Firestore Data Model:**
```
/legalPetitions/{petitionId}
  - referenceNumber: string        # LP-20251215-A7F3B
  - petitionerName: string
  - petitionerEmail: string
  - petitionerPhone?: string
  - childName: string
  - childDOB: Date
  - claimedRelationship: 'parent' | 'legal-guardian'
  - message: string
  - documents: SafetyDocument[]    # Reuse from Story 0.5.2
  - status: 'submitted' | 'reviewing' | 'pending-more-info' | 'verified' | 'denied'
  - targetFamilyId?: string        # Set by support when family identified
  - submittedAt: Timestamp
  - updatedAt: Timestamp
  - statusHistory: StatusEntry[]
  - internalNotes: string[]        # Support-only, never exposed to petitioner
  - assignedTo?: string            # Support agent userId
```

**Guardian Schema Extension:**
```typescript
// packages/contracts/src/guardian.schema.ts
export const guardianSchema = z.object({
  userId: z.string(),
  role: z.enum(['primary', 'secondary']),
  permissions: guardianPermissionsSchema,
  addedAt: z.date(),
  addedBy: z.string(),  // Who added this guardian
  addedVia: z.enum(['creator', 'invitation', 'court-order']).default('invitation'),
  // ... existing fields
})
```

**Security Rules (CRITICAL):**
```javascript
// /legalPetitions/{petitionId}
match /legalPetitions/{petitionId} {
  // Anyone authenticated can create a petition
  allow create: if request.auth != null;

  // Only safety team can read
  allow read: if request.auth != null &&
    exists(/databases/$(database)/documents/adminRoles/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/adminRoles/$(request.auth.uid)).data.roles.hasAny(['safety-team', 'admin']);

  // Only safety team can update
  allow update: if request.auth != null &&
    exists(/databases/$(database)/documents/adminRoles/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/adminRoles/$(request.auth.uid)).data.roles.hasAny(['safety-team', 'admin']);

  // Never delete - compliance requirement
  allow delete: if false;
}
```

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR42 | Mobile-first responsive | TailwindCSS responsive classes |
| NFR43 | Keyboard accessible | Focus management, tab navigation |
| NFR45 | 4.5:1 contrast ratio | Use existing design system |
| NFR49 | 44x44px touch targets | min-h-[44px] min-w-[44px] classes |
| NFR65 | 6th-grade reading level | Simple language throughout |

### Project Structure Notes

**Files to Create:**
- `packages/contracts/src/legal-petition.schema.ts` - Petition schemas
- `packages/contracts/src/legal-petition.schema.test.ts` - Schema tests
- `apps/functions/src/callable/submitLegalPetition.ts` - Submit function
- `apps/functions/src/callable/checkPetitionStatus.ts` - Status check function
- `apps/functions/src/callable/addCourtOrderedParent.ts` - Add parent function
- `apps/functions/src/callable/updatePetitionStatus.ts` - Update status (support)
- `apps/web/src/components/safety/LegalPetitionForm.tsx` - Petition form
- `apps/web/src/components/safety/PetitionStatusChecker.tsx` - Status checker
- `apps/web/src/app/(admin)/support/petitions/page.tsx` - Petition queue
- `apps/web/src/app/(admin)/support/petitions/[petitionId]/page.tsx` - Petition detail

**Files to Modify:**
- `packages/contracts/src/guardian.schema.ts` - Add addedVia field
- `packages/contracts/src/index.ts` - Export new schemas
- `packages/firebase-rules/firestore.rules` - Add legalPetitions rules
- `apps/web/src/components/safety/SafetyContactForm.tsx` - Add petition option
- `apps/functions/src/index.ts` - Export new functions

### Previous Story Intelligence

**From Story 0.5.1-0.5.2 (Safety Channel):**
- `safetyRequests` collection pattern for isolated storage
- `SafetyDocumentUpload` component for document uploads
- Security rules pattern for safety-team-only access
- Admin audit logging pattern

**From Story 3.1-3.5 (Invitation Flow):**
- Guardian permissions and role system
- Family membership management
- Equal access verification (Story 3.4)
- revokeInvitation pattern (to understand what court-ordered parents should NOT allow)

**Key Files to Reference:**
- `packages/contracts/src/safety-request.schema.ts` - Safety request pattern
- `packages/contracts/src/safety-document.schema.ts` - Document upload pattern
- `packages/contracts/src/guardian.schema.ts` - Guardian structure
- `apps/web/src/components/safety/SafetyContactForm.tsx` - Safety form pattern
- `apps/web/src/components/safety/SafetyDocumentUpload.tsx` - Document upload
- `packages/firebase-rules/firestore.rules` - Security rules pattern

### Git Intelligence (Recent Commits)

```
2c9b871 feat(story-3.5): implement invitation management for co-parents
3926003 chore(sprint): mark Story 3.4 as done
7af2493 feat(story-3.4): implement equal access verification for co-parents
db2eafc chore(sprint): mark Story 3.3 as done
de3cc9d feat(story-3.3): implement co-parent invitation acceptance
```

Recent patterns: Co-parent invitation flow, guardian permissions, dashboard integration, safety channel.

### Dependencies

**Already Installed (no new dependencies needed):**
- All packages from Epic 0.5 safety stories
- All packages from Epic 3 invitation stories
- Firebase SDK, Zod, React Hook Form, Radix UI components
- shadcn/ui components

### Security Considerations

1. **Petition Isolation** - Petitions stored separately from family data
2. **Support-Only Verification** - Only safety-team can verify and approve
3. **No Family Notifications** - Until parent is verified and added
4. **Court-Order Protection** - Court-ordered parents cannot be removed via app
5. **Audit Trail** - All actions logged to admin audit
6. **Abuse Prevention** - Support team training to identify potential misuse

### Abuse Prevention Notes

This feature could potentially be misused by coercive controllers. Support team should be trained to:
1. Verify documentation thoroughly
2. Cross-reference with any existing safety requests from the family
3. Consider reaching out to existing guardians before approval (if safe)
4. Flag petitions that seem suspicious
5. Escalate to legal review if uncertain

---

## References

- [Source: docs/epics/epic-list.md#story-36-legal-parent-petition-for-access] - Story requirements
- [Source: docs/sprint-artifacts/stories/0-5-1-secure-safety-contact-channel.md] - Safety channel pattern
- [Source: docs/sprint-artifacts/stories/0-5-2-safety-request-documentation-upload.md] - Document upload pattern
- [Source: docs/sprint-artifacts/stories/3-4-equal-access-verification.md] - Equal access requirements
- [Source: docs/project_context.md] - Architecture patterns
- [Source: packages/contracts/src/guardian.schema.ts] - Guardian schema

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List
