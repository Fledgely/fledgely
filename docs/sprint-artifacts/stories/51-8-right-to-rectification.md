# Story 51.8: Right to Rectification

## Status: done

## Implementation Notes

All acceptance criteria implemented:

- AC1: Profile data correction with editable fields
- AC2: Historical data protection (only notes allowed)
- AC3: Contextual notes via addRecordNote callable
- AC4: Full audit trail for all changes
- AC5: Child correction request workflow with parent review
- AC6: AI content dispute process with 30-day timeline
- AC7: GDPR-compliant 30-day processing deadline

## Story

As **a parent**,
I want **to correct inaccurate data**,
So that **my family's information is accurate (GDPR Article 16)**.

## Acceptance Criteria

1. **AC1: Profile Data Correction**
   - Given data needs correction
   - When editing profile or settings
   - Then can update names, birth dates, profile info
   - And changes saved immediately

2. **AC2: Historical Data Protection**
   - Given historical records exist
   - When attempting to edit
   - Then historical data (screenshots, flags) cannot be altered
   - And integrity preserved

3. **AC3: Contextual Notes**
   - Given existing records need clarification
   - When adding context
   - Then can add context/notes to existing records
   - And notes associated with record

4. **AC4: Audit Trail**
   - Given profile data is changed
   - When change is saved
   - Then changes logged for audit trail
   - And who/what/when recorded

5. **AC5: Child Correction Request**
   - Given child needs data corrected
   - When child initiates request
   - Then child can request corrections via parent
   - And parent reviews and approves

6. **AC6: AI Content Dispute**
   - Given AI-generated content exists
   - When content is disputed
   - Then dispute process for AI-generated content available
   - And review within 30 days

7. **AC7: Processing Timeline**
   - Given correction is requested
   - When processed
   - Then corrections processed within 30 days
   - And confirmation sent

## Tasks / Subtasks

### Task 1: Create Rectification Data Types

**Files:**

- `packages/shared/src/contracts/rectification.ts` (new)

**Implementation:**
1.1 Define correction request types
1.2 Define audit log schema
1.3 Define dispute request schema

### Task 2: Create Profile Update Callable

**Files:**

- `apps/functions/src/callable/updateUserProfile.ts` (new)

**Implementation:**
2.1 Handle name, birthdate, profile updates
2.2 Log changes to audit trail
2.3 Validate allowed fields

### Task 3: Create Record Note Callable

**Files:**

- `apps/functions/src/callable/addRecordNote.ts` (new)

**Implementation:**
3.1 Add notes to screenshots/flags
3.2 Associate with record
3.3 Log to audit trail

### Task 4: Create Correction Request Callable

**Files:**

- `apps/functions/src/callable/submitCorrectionRequest.ts` (new)

**Implementation:**
4.1 Child-initiated correction requests
4.2 Parent review workflow
4.3 30-day processing timeline

### Task 5: Create AI Dispute Callable

**Files:**

- `apps/functions/src/callable/disputeAIContent.ts` (new)

**Implementation:**
5.1 Submit dispute for AI descriptions
5.2 Admin review queue
5.3 Resolution tracking

### Task 6: Create Rectification UI Components

**Files:**

- `apps/web/src/app/settings/profile/page.tsx` (new/modify)
- `apps/web/src/hooks/useRectification.ts` (new)

**Implementation:**
6.1 Profile edit form with audit display
6.2 Record notes interface
6.3 Correction request submission

### Task 7: Export Functions

**Files:**

- `apps/functions/src/index.ts` (modify)
- `packages/shared/src/index.ts` (modify)

## Dev Notes

### Allowed Editable Fields

- Display name
- Profile photo
- Date of birth
- Contact preferences
- Custom profile fields

### Non-Editable Historical Data

- Screenshots (only add notes)
- Flags (only add notes)
- Check-in responses
- Agreement signatures
- Audit logs

### GDPR Article 16 Requirements

1. Right to rectification without undue delay
2. Maximum 30 days to process
3. Must inform third parties of rectification
4. Provide confirmation of rectification

## Dev Agent Record

### File List

- packages/shared/src/contracts/rectification.ts
- apps/functions/src/callable/updateUserProfile.ts
- apps/functions/src/callable/addRecordNote.ts
- apps/functions/src/callable/submitCorrectionRequest.ts
- apps/functions/src/callable/disputeAIContent.ts
- apps/web/src/hooks/useRectification.ts
- apps/web/src/app/settings/profile/page.tsx
