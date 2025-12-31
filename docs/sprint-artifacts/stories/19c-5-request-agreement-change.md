# Story 19C.5: Request Agreement Change

Status: done

## Story

As a **child**,
I want **to request a change to our agreement**,
So that **I can renegotiate terms that feel unfair**.

## Acceptance Criteria

1. **Given** child is viewing their agreement **When** tapping "Request a Change" **Then** simple form opens for child to describe requested change

2. **Given** form is open **Then** form includes: what to change, why (optional)

3. **Given** child submits request **Then** request sent to parent as notification

4. **Given** request is submitted **Then** child sees "Request sent - talk to [Parent] about it"

5. **Given** request is logged **Then** request logged in family activity (transparency)

6. **Given** child submits request **Then** this empowers child voice in the consent relationship

## Tasks / Subtasks

- [x] Task 1: Create ChangeRequestForm component (AC: #1, #2)
  - [x] 1.1 Create form component using sky blue theme (#0ea5e9) matching child dashboard
  - [x] 1.2 Add "What would you like to change?" text input field
  - [x] 1.3 Add "Why?" optional text input field
  - [x] 1.4 Add submit button with child-friendly text
  - [x] 1.5 Use React.CSSProperties inline styles (NOT Tailwind)
  - [x] 1.6 Add data-testid attributes for all testable elements

- [x] Task 2: Create ChangeRequestModal component (AC: #1, #4)
  - [x] 2.1 Create modal wrapper that opens when "Request a Change" is clicked
  - [x] 2.2 Display ChangeRequestForm inside modal
  - [x] 2.3 Handle form submission and close modal
  - [x] 2.4 Show confirmation message after submission

- [x] Task 3: Implement request submission service (AC: #3, #5)
  - [x] 3.1 Create agreementChangeService.ts with submitChangeRequest function
  - [x] 3.2 Store request in Firestore `agreementChangeRequests` collection
  - [x] 3.3 Include: childId, familyId, agreementId, whatToChange, why, createdAt
  - [x] 3.4 Log request in family activity for transparency

- [x] Task 4: Create useChangeRequest hook (AC: #3)
  - [x] 4.1 Create hook to handle form submission state
  - [x] 4.2 Handle loading, success, and error states
  - [x] 4.3 Trigger parent notification on success

- [x] Task 5: Display confirmation message (AC: #4)
  - [x] 5.1 Show child-friendly success message after submission
  - [x] 5.2 Display "Request sent - talk to [Parent Name] about it"
  - [x] 5.3 Use encouraging, empowering language

- [x] Task 6: Integrate with ChildAgreementView (AC: #1)
  - [x] 6.1 Connect existing onRequestChange callback to open modal
  - [x] 6.2 Pass necessary agreement data to modal
  - [x] 6.3 Handle successful submission feedback

- [x] Task 7: Add component tests
  - [x] 7.1 Test form validation and submission
  - [x] 7.2 Test modal open/close behavior
  - [x] 7.3 Test confirmation message display
  - [x] 7.4 Test service layer (mock Firestore)
  - [x] 7.5 Test integration with ChildAgreementView

## Dev Notes

### Technical Implementation

**Firestore Collection Structure:**

```typescript
// Collection: agreementChangeRequests
interface AgreementChangeRequest {
  id: string
  familyId: string
  childId: string
  agreementId: string
  whatToChange: string
  why: string | null // Optional
  status: 'pending' | 'acknowledged' | 'resolved'
  createdAt: Timestamp
  parentNotified: boolean
}
```

**Form Component Pattern:**

```typescript
interface ChangeRequestFormProps {
  agreementId: string
  childId: string
  familyId: string
  parentName: string // For confirmation message
  onSubmit: (request: ChangeRequestData) => Promise<void>
  onCancel: () => void
}
```

**Parent Notification:**

- Use existing push notification infrastructure from Story 19A.4
- Create notification document in `notifications` collection
- Type: 'agreement_change_request'
- Include link to view request in parent dashboard

### Project Structure Notes

**Files to create:**

- `apps/web/src/components/child/ChangeRequestForm.tsx` - Form component
- `apps/web/src/components/child/ChangeRequestForm.test.tsx` - Form tests
- `apps/web/src/components/child/ChangeRequestModal.tsx` - Modal wrapper
- `apps/web/src/components/child/ChangeRequestModal.test.tsx` - Modal tests
- `apps/web/src/services/agreementChangeService.ts` - Firestore service
- `apps/web/src/services/agreementChangeService.test.ts` - Service tests
- `apps/web/src/hooks/useChangeRequest.ts` - Form submission hook
- `apps/web/src/hooks/useChangeRequest.test.ts` - Hook tests

**Files to modify:**

- `apps/web/src/components/child/ChildAgreementView.tsx` - Add modal integration

**Existing patterns to follow:**

- `ChildAgreementView.tsx` - Component structure with inline styles
- `AgreementStatus.tsx` - Simple component pattern with data-testid
- `usePushNotifications.ts` - Notification pattern
- `familyService.ts` - Firestore service pattern

### Previous Story Intelligence

From Story 19C.1 (Child Agreement View):

- ChildAgreementView already has `onRequestChange` callback placeholder
- Button text is "Want to change something? Ask your parent"
- Sky blue theme (#0ea5e9 primary, #f0f9ff background)

From Story 19C.4 (Agreement Status):

- React.CSSProperties inline styles pattern
- data-testid on all elements
- Child-friendly, neutral language

### References

- [Source: apps/web/src/components/child/ChildAgreementView.tsx:474-484]
- [Source: apps/web/src/hooks/usePushNotifications.ts]
- [Source: docs/epics/epic-list.md#Story 19C.5]
- [Source: docs/architecture/implementation-patterns-consistency-rules.md]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- All 7 tasks completed with 89 passing tests
- Form component with validation and child-friendly labels
- Modal with overlay, success state, and parent name display
- Service layer with Firestore integration and family activity logging
- Hook for managing submission state
- Container component integrating all pieces
- AC #1-6 all satisfied

### File List

**Created:**

- `apps/web/src/components/child/ChangeRequestForm.tsx` - Form component (19 tests)
- `apps/web/src/components/child/ChangeRequestForm.test.tsx`
- `apps/web/src/components/child/ChangeRequestModal.tsx` - Modal wrapper (15 tests)
- `apps/web/src/components/child/ChangeRequestModal.test.tsx`
- `apps/web/src/components/child/ChildAgreementContainer.tsx` - Integration container (20 tests)
- `apps/web/src/components/child/ChildAgreementContainer.test.tsx`
- `apps/web/src/services/agreementChangeService.ts` - Firestore service (11 tests)
- `apps/web/src/services/agreementChangeService.test.ts`
- `apps/web/src/hooks/useChangeRequest.ts` - Submission hook (24 tests)
- `apps/web/src/hooks/useChangeRequest.test.ts`

## Change Log

| Date       | Change                                                 |
| ---------- | ------------------------------------------------------ |
| 2025-12-31 | Story created and marked ready-for-dev                 |
| 2025-12-31 | Implementation complete, 89 tests passing, marked done |
