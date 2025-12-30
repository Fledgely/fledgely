# Story 3.6: Legal Parent Petition for Access

Status: done

## Story

As a **legal parent who was not invited by the account creator**,
I want **to petition for access by submitting court documentation**,
So that **I can access monitoring of my child even if my co-parent won't invite me**.

## Acceptance Criteria

1. **AC1: Petition submission via safety contact channel**
   - Given a legal parent discovers their child is monitored via fledgely
   - When they access the safety contact form (from login screen or settings)
   - Then they see an option to submit a "Legal Parent Access Petition"
   - And they can describe their situation and provide safe contact info
   - And the petition is created in the safetyTickets collection with type='legal_parent_petition'

2. **AC2: Legal documentation upload**
   - Given a user is submitting a legal parent petition
   - When they complete the form
   - Then they can upload legal documents (custody order, birth certificate, court papers)
   - And documents are stored securely in Firebase Storage (same as Story 0.5.2)
   - And document metadata is linked to the safety ticket
   - And accepted formats: PDF, JPEG, PNG (max 10MB per file, max 5 files)

3. **AC3: Support agent petition review**
   - Given a support agent views a legal parent petition in the safety dashboard
   - When they review the ticket
   - Then they see the petitioner's message and safe contact info
   - Then they see uploaded documentation with secure viewing
   - And they can mark documents as "verified" or "needs more info"
   - And they have an action to "Grant Access" or "Deny Petition"

4. **AC4: Grant access - add as co-parent**
   - Given a support agent verifies legal documentation
   - When they execute "Grant Access" action
   - Then the petitioner is added as a guardian to the family
   - And they have equal access per Story 3.4 (data symmetry)
   - And the petitioner is sent a notification to their safe contact email
   - And an invitation link is NOT required (direct add)

5. **AC5: Existing parent notification**
   - Given a legal parent is granted access via petition
   - When the access is granted
   - Then the existing parent(s) receive notification of court-ordered access addition
   - And notification includes: "Legal parent added by court order"
   - And notification does NOT include petitioner contact info
   - And this is logged in family auditLogs (visible to all guardians)

6. **AC6: Petition denial handling**
   - Given a support agent cannot verify legal status
   - When they deny the petition
   - Then the petitioner is notified via safe contact email
   - And denial reason is documented (internal only)
   - And petitioner can submit a new petition with additional documentation

7. **AC7: Processing SLA tracking**
   - Given a legal parent petition is submitted
   - When support views the ticket
   - Then they see SLA countdown (5 business days)
   - And overdue tickets are flagged in the dashboard
   - And SLA status is logged for metrics

8. **AC8: Admin audit logging**
   - Given any petition action is taken
   - When the action completes
   - Then it is logged to adminAuditLogs (NOT visible to family)
   - And log includes: ticketId, action, agentId, timestamp, outcome

## Tasks / Subtasks

- [ ] Task 1: Add petition type to safety contact form (AC: #1, #2)
  - [ ] 1.1 Add 'legal_parent_petition' to SafetyTicketType
  - [ ] 1.2 Update SafetyContactForm with petition option
  - [ ] 1.3 Add petition-specific fields (child name, relationship claim)
  - [ ] 1.4 Integrate document upload component (reuse from Story 0.5.2)
  - [ ] 1.5 Create petition in safetyTickets with type='legal_parent_petition'

- [ ] Task 2: Update safety dashboard for petition review (AC: #3)
  - [ ] 2.1 Filter/sort petitions in ticket list
  - [ ] 2.2 Add petition detail view with document viewer
  - [ ] 2.3 Add document verification checkboxes
  - [ ] 2.4 Add "Grant Access" and "Deny Petition" action buttons

- [ ] Task 3: Implement grant access functionality (AC: #4, #5)
  - [ ] 3.1 Create grantLegalParentAccess callable function
  - [ ] 3.2 Look up family by child name/identifier
  - [ ] 3.3 Add petitioner as guardian to family
  - [ ] 3.4 Send notification to petitioner (safe contact email)
  - [ ] 3.5 Send notification to existing guardian(s)
  - [ ] 3.6 Log action to family auditLogs (visible)

- [ ] Task 4: Implement petition denial (AC: #6)
  - [ ] 4.1 Create denyLegalParentPetition callable function
  - [ ] 4.2 Update ticket status to 'denied'
  - [ ] 4.3 Send denial notification to petitioner (safe email)
  - [ ] 4.4 Store denial reason (internal metadata)

- [ ] Task 5: Add SLA tracking (AC: #7)
  - [ ] 5.1 Calculate business days from submission
  - [ ] 5.2 Add SLA countdown display in dashboard
  - [ ] 5.3 Add overdue flag/highlighting
  - [ ] 5.4 Add SLA field to ticket schema

- [ ] Task 6: Add admin audit types (AC: #8)
  - [ ] 6.1 Add 'grant_legal_parent_access' action type
  - [ ] 6.2 Add 'deny_legal_parent_petition' action type
  - [ ] 6.3 Add 'legal_parent_petition' resource type

- [ ] Task 7: Add unit tests (AC: #1-8)
  - [ ] 7.1 Test petition creation with documents
  - [ ] 7.2 Test grant access flow
  - [ ] 7.3 Test denial flow
  - [ ] 7.4 Test notifications sent correctly
  - [ ] 7.5 Test SLA calculations
  - [ ] 7.6 Test admin audit logging
  - [ ] 7.7 Minimum 20 tests required

## Dev Notes

### Implementation Strategy

This story builds on Epic 0.5 infrastructure:

- Uses safetyTickets collection (Story 0.5.1)
- Uses document upload (Story 0.5.2)
- Uses safety dashboard (Story 0.5.3)
- Uses admin audit logging (Stories 0.5.3-0.5.9)

The key new functionality is:

1. New ticket type for legal parent petitions
2. Grant access action that adds guardian without invitation
3. Notification to existing parent about court-ordered addition

### Family Lookup Challenge

The petitioner may not know the family ID. Options:

1. Ask for child's name + approximate birth date
2. Ask for existing parent's email (if known)
3. Support agent manually searches families

For MVP, we'll have the agent search for the family and select it before granting access.

### Security Considerations

1. **Petitioner gets NO family data until verified** - they submit blind petition
2. **Existing parent notification is mandatory** - no silent additions
3. **All actions logged** - both admin audit and family audit
4. **Documents stored securely** - same path as abuse documentation

### Existing Code to Leverage

- `apps/functions/src/callable/submitSafetyContact.ts` - Petition submission
- `apps/functions/src/callable/uploadSafetyDocument.ts` - Document upload
- `apps/web/src/components/safety/SafetyContactForm.tsx` - Form UI
- `apps/web/src/components/admin/SafetyTicketDetail.tsx` - Review UI
- `apps/functions/src/utils/adminAudit.ts` - Audit logging

### Dependencies

- Story 0.5.1: Safety contact channel (petition entry point)
- Story 0.5.2: Document upload (legal docs)
- Story 0.5.3: Safety dashboard (agent review)
- Story 3.4: Equal access verification (new guardian gets same access)

### Testing Requirements

**Unit Tests (minimum 20):**

1. Petition form renders with legal parent option
2. Petition creates ticket with correct type
3. Documents upload and link to ticket
4. Dashboard shows petitions separately
5. Document verification checkboxes work
6. Grant access adds guardian to family
7. Grant access sends petitioner notification
8. Grant access sends existing parent notification
9. Grant access logs to family auditLogs
10. Grant access logs to adminAuditLogs
11. Denial updates ticket status
12. Denial sends notification
13. Denial stores internal reason
14. SLA calculated correctly (business days)
15. SLA countdown displays
16. Overdue tickets flagged
17. Equal access verified for new guardian
18. Cannot grant to already-member
19. Cannot grant without family selection
20. All actions require safety team role

---

## Dev Agent Record

### Context Reference

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

### File List
