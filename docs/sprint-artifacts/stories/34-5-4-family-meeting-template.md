# Story 34.5.4: Family Meeting Template

## Status: done

## Story

As **a family experiencing disagreement**,
I want **a structured template for discussing monitoring**,
So that **we can have productive conversations**.

## Acceptance Criteria

1. **AC1: Template Access** - ✅ ALREADY IMPLEMENTED in Story 34-5-2
   - Template includes conversation starters, ground rules, reflection questions
   - Parent section: "What concerns drive your current rules?"
   - Child section: "What feels unfair and why?"
   - Joint section: "What compromises might work?"

2. **AC2: Printable Template** - ✅ ALREADY IMPLEMENTED in Story 34-5-2
   - Print button exists in MediationResourcesModal
   - Uses `window.print()` for browser print functionality

3. **AC3: Shareable Template** - NEW
   - Given user views meeting template
   - When clicking "Share" button
   - Then template can be:
     - Copied as formatted text to clipboard
     - Downloaded as PDF (optional enhancement)
   - And confirmation shown on successful share action

4. **AC4: Meeting Reminder (Optional)** - NEW
   - Given user views meeting template
   - When clicking "Schedule Meeting Reminder"
   - Then user can select date/time
   - And reminder is stored in family's reminders
   - And notification sent at scheduled time
   - Note: This is explicitly marked as optional in epic

## Tasks / Subtasks

### Task 1: Add Share/Copy to Clipboard Functionality (AC: #3) [x]

Add ability to copy template content as formatted text.

**Files:**

- `apps/web/src/components/escalation/MediationResourcesModal.tsx` (modify)
- `apps/web/src/components/escalation/MediationResourcesModal.test.tsx` (modify)

**Implementation:**

- Add "Copy to Clipboard" button next to Print button
- Format template sections as readable text
- Use Clipboard API to copy content
- Show success toast/message on copy

**Tests:** 8+ tests for share functionality

### Task 2: Create Meeting Reminder Schema (AC: #4) [x]

Create Zod schema for family meeting reminders.

**Files:**

- `packages/shared/src/contracts/familyMeetingReminder.ts` (new)
- `packages/shared/src/contracts/familyMeetingReminder.test.ts` (new)

**Schema Fields:**

```typescript
{
  id: string
  familyId: string
  scheduledAt: Date
  createdAt: Date
  createdBy: string // childId or parentId
  templateId: string // which template was viewed
  ageTier: AgeTier
  status: 'pending' | 'sent' | 'acknowledged' | 'cancelled'
  notificationSentAt: Date | null
}
```

**Tests:** 12+ tests for schema validation

### Task 3: Create Meeting Reminder Service (AC: #4) [x]

Service for scheduling and managing meeting reminders.

**Files:**

- `packages/shared/src/services/familyMeetingReminderService.ts` (new)
- `packages/shared/src/services/familyMeetingReminderService.test.ts` (new)

**Functions:**

- `scheduleMeetingReminder(familyId, scheduledAt, templateId, ageTier)` - Create reminder
- `cancelMeetingReminder(reminderId)` - Cancel scheduled reminder
- `getPendingReminders(familyId)` - Get family's pending reminders
- `acknowledgeReminder(reminderId)` - Mark reminder as acknowledged

**Tests:** 15+ tests with Firebase mocks

### Task 4: Create useMeetingReminder Hook (AC: #4) [x]

React hook for managing meeting reminder state.

**Files:**

- `apps/web/src/hooks/useMeetingReminder.ts` (new)
- `apps/web/src/hooks/useMeetingReminder.test.ts` (new)

**Hook Interface:**

```typescript
interface UseMeetingReminderReturn {
  pendingReminder: FamilyMeetingReminder | null
  loading: boolean
  error: Error | null
  scheduleReminder: (scheduledAt: Date) => Promise<void>
  cancelReminder: () => Promise<void>
  isScheduling: boolean
}
```

**Tests:** 12+ tests with TDD approach

### Task 5: Add Schedule Reminder UI to Modal (AC: #4) [x]

Add UI for scheduling meeting reminders in MediationResourcesModal.

**Files:**

- `apps/web/src/components/escalation/MediationResourcesModal.tsx` (modify)
- `apps/web/src/components/escalation/MediationResourcesModal.test.tsx` (modify)
- `apps/web/src/components/escalation/ScheduleReminderModal.tsx` (new)
- `apps/web/src/components/escalation/ScheduleReminderModal.test.tsx` (new)

**Implementation:**

- Add "Schedule Family Meeting" button in template view
- Open date/time picker modal
- Show pending reminder status if one exists
- Allow cancelling existing reminder

**Tests:** 20+ tests for UI integration

### Task 6: Add Firestore Security Rules (AC: #4) [x]

Add security rules for familyMeetingReminders collection.

**Files:**

- `packages/firebase-rules/firestore.rules` (modify)
- `packages/firebase-rules/__tests__/familyMeetingReminderRules.test.ts` (new)

**Rules:**

- Read: Family members only (via familyId claim)
- Create: Family members can create for their family
- Update: Creator or family guardian can update
- Delete: Creator or family guardian can cancel

**Tests:** 12+ adversarial security rule tests

## Dev Notes

### Existing Implementation Context

Story 34-5-2 already implemented the core functionality:

- `MediationResourcesModal` - Full modal with tabs for tips and template
- `mediationResourceService.ts` - Template and tips data by age tier
- `getFamilyMeetingTemplate(ageTier)` - Returns age-appropriate template
- Print functionality via `window.print()`

This story adds:

1. Share/copy functionality for templates
2. Optional meeting reminder scheduling

### Architecture Patterns

From Story 34-5-2:

- Modal pattern with tabs
- Age-tier based content
- Service layer for data
- Hook pattern for state management

### Messaging Tone

All reminder messaging should be:

- Supportive: "Ready to have a family conversation?"
- Non-demanding: "When would be a good time?"
- Encouraging: "Great conversations start with preparation"

### Previous Story Patterns to Follow

From **Story 34-5-2** (Mediation Resource Prompt):

- `MediationResourcesModal` - Modal patterns
- `mediationResourceService.ts` - Service structure
- Age-appropriate content adaptation

From **Story 34-5-3** (Agreement Review Request):

- Firestore security rules pattern
- Service with Firebase operations
- Hook with loading/error states

### Optional Feature Note

Per epic description, meeting reminder is explicitly **optional**:

> "optional: schedule meeting reminder in app"

Implementation should be complete but understanding this is an enhancement, not core functionality.

### Project Structure Notes

- Services in `packages/shared/src/services/`
- Contracts in `packages/shared/src/contracts/`
- Hooks in `apps/web/src/hooks/`
- Components in `apps/web/src/components/escalation/`
- Security rules in `packages/firebase-rules/`

### References

- [Source: docs/epics/epic-list.md#Story 34.5.4]
- [Source: packages/shared/src/services/mediationResourceService.ts]
- [Source: apps/web/src/components/escalation/MediationResourcesModal.tsx]
- [Source: docs/sprint-artifacts/stories/34-5-3-agreement-review-request.md]

## Dev Agent Record

### Context Reference

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Modified:**

- `apps/web/src/components/escalation/MediationResourcesModal.tsx` - Added copy-to-clipboard, schedule button, hook integration
- `apps/web/src/components/escalation/MediationResourcesModal.test.tsx` - Added 8 copy tests, 5 schedule integration tests
- `packages/firebase-rules/firestore.rules` - Added familyMeetingReminders collection rules

**New:**

- `apps/web/src/components/escalation/ScheduleReminderModal.tsx` - Schedule reminder modal with date/time picker
- `apps/web/src/components/escalation/ScheduleReminderModal.test.tsx` - 21 tests for schedule modal
- `apps/web/src/hooks/useMeetingReminder.ts` - React hook for meeting reminder state
- `apps/web/src/hooks/useMeetingReminder.test.ts` - 15 tests for hook
- `packages/shared/src/contracts/familyMeetingReminder.ts` - Zod schema for reminders
- `packages/shared/src/contracts/familyMeetingReminder.test.ts` - 23 schema validation tests
- `packages/shared/src/services/familyMeetingReminderService.ts` - Firebase service for reminders
- `packages/shared/src/services/familyMeetingReminderService.test.ts` - 23 service tests with Firebase mocks
- `packages/firebase-rules/__tests__/familyMeetingReminderRules.test.ts` - 15 adversarial security rules tests

**Test Summary:** 121 tests (39 modal + 21 schedule modal + 15 hook + 23 schema + 23 service)
