# Story 51.2: Data Deletion Request

## Status: done

## Story

As a **parent**,
I want **to request deletion of all data**,
So that **I can exercise right to be forgotten (FR153, GDPR Article 17)**.

## Acceptance Criteria

1. **AC1: Deletion Request UI**
   - Given parent is in account settings
   - When viewing data management section
   - Then can initiate data deletion request with clear warnings

2. **AC2: Typed Confirmation**
   - Given parent initiates deletion
   - When confirmation modal appears
   - Then parent must type "DELETE MY DATA" exactly to confirm

3. **AC3: Deletion Warning**
   - Given confirmation modal is shown
   - When parent views the modal
   - Then displays: "This will delete ALL family data permanently"

4. **AC4: Cooling Off Period**
   - Given deletion request is confirmed
   - When request is submitted
   - Then 14-day cooling off period begins before actual deletion

5. **AC5: Cancellation During Cooling Off**
   - Given deletion is in cooling off period
   - When parent cancels
   - Then deletion is cancelled and data is preserved

6. **AC6: Automatic Deletion After Cooling Off**
   - Given 14-day cooling off period has passed
   - When scheduled job runs
   - Then all family data is permanently deleted (NFR18: within 30 days)

7. **AC7: Deletion Confirmation Email**
   - Given deletion is complete
   - When processing finishes
   - Then confirmation email sent to parent

8. **AC8: One Active Request**
   - Given deletion is pending
   - When parent tries to request another
   - Then show existing request status with cancel option

## Tasks / Subtasks

### Task 1: Create Data Deletion Types and Contracts (AC: #4, #6)

**Files:**

- `packages/shared/src/contracts/dataDeletion.ts` (new)

**Implementation:**

1.1 Define DataDeletionRequest schema:

```typescript
export const DataDeletionStatus = {
  PENDING: 'pending',
  COOLING_OFF: 'cooling_off',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const

export const DataDeletionRequestSchema = z.object({
  deletionId: z.string(),
  familyId: z.string(),
  requestedBy: z.string(), // uid
  requestedByEmail: z.string().email(),
  requestedAt: z.number(), // timestamp
  status: z.enum(['pending', 'cooling_off', 'processing', 'completed', 'cancelled', 'failed']),
  coolingOffEndsAt: z.number(), // 14 days from request
  scheduledDeletionAt: z.number(), // same as coolingOffEndsAt
  processedAt: z.number().nullable(),
  cancelledAt: z.number().nullable(),
  cancelledBy: z.string().nullable(),
  completedAt: z.number().nullable(),
  errorMessage: z.string().nullable(),
})
```

1.2 Define configuration constants:

```typescript
export const DATA_DELETION_CONFIG = {
  COOLING_OFF_DAYS: 14,
  COOLING_OFF_MS: 14 * 24 * 60 * 60 * 1000, // 14 days
  MAX_PROCESSING_DAYS: 30, // NFR18 compliance
  CONFIRMATION_PHRASE: 'DELETE MY DATA',
} as const
```

1.3 Define RequestDataDeletionInput and Response schemas:

```typescript
export const RequestDataDeletionInputSchema = z.object({
  familyId: z.string().min(1),
  confirmationPhrase: z.string(),
})

export const RequestDataDeletionResponseSchema = z.object({
  success: z.boolean(),
  deletionId: z.string().optional(),
  status: z.enum(['pending', 'cooling_off', 'already_pending', 'invalid_confirmation', 'failed']),
  message: z.string(),
  coolingOffEndsAt: z.number().optional(),
})

export const CancelDataDeletionInputSchema = z.object({
  familyId: z.string().min(1),
  deletionId: z.string().min(1),
})
```

1.4 Add exports to shared index

### Task 2: Create Data Deletion Service (AC: #4, #5, #6)

**Files:**

- `apps/functions/src/services/gdpr/dataDeletionService.ts` (new)
- `apps/functions/src/services/gdpr/index.ts` (modify)

**Implementation:**

2.1 Create `createDeletionRequest()` function:

- Create DataDeletionRequest document in `dataDeletions/{deletionId}`
- Set status to 'cooling_off'
- Calculate coolingOffEndsAt (14 days from now)
- Return deletionId

  2.2 Create `findActiveDeletion()` function:

- Query `dataDeletions` where familyId matches and status in ['pending', 'cooling_off', 'processing']
- Return active request or null

  2.3 Create `cancelDeletionRequest()` function:

- Verify deletion exists and is in 'cooling_off' status
- Update status to 'cancelled'
- Set cancelledAt, cancelledBy

  2.4 Create `getDeletionRequest()` function:

- Fetch by deletionId
- Return full request document

  2.5 Create `updateDeletionRequest()` function:

- Partial update helper for status changes

  2.6 Create `executeFamilyDeletion()` function:

- Delete all family data:
  - `families/{familyId}` document
  - `families/{familyId}/children/*`
  - `families/{familyId}/devices/*`
  - `families/{familyId}/agreements/*`
  - `families/{familyId}/screenshots/*` (metadata)
  - `families/{familyId}/flags/*`
  - `families/{familyId}/auditEvents/*`
  - `families/{familyId}/settings/*`
- Delete Cloud Storage:
  - `screenshots/{familyId}/**`
  - `exports/{familyId}/**`
- Use batch operations for Firestore efficiency
- Pattern: reference age18DeletionService.ts for deletion order

  2.7 Pattern: Use lazy Firestore initialization (see dataExportService.ts)

### Task 3: Create Deletion Request Callable (AC: #1, #2, #3, #8)

**Files:**

- `apps/functions/src/callable/requestDataDeletion.ts` (new)
- `apps/functions/src/callable/requestDataDeletion.test.ts` (new)

**Implementation:**

3.1 Create `requestDataDeletion` callable function:

- Verify caller is guardian of family
- Validate confirmationPhrase === 'DELETE MY DATA' (exact match, case-sensitive)
- Check for existing active deletion request
- If exists, return existing request info with cancel option
- Otherwise, create new deletion request with 14-day cooling off
- Return deletionId, coolingOffEndsAt

  3.2 Create `cancelDataDeletion` callable function:

- Verify caller is guardian of family
- Verify deletion exists and belongs to family
- Verify status is 'cooling_off' (cannot cancel once processing)
- Cancel the deletion request
- Return success

  3.3 Create `getDataDeletionStatus` callable function:

- Verify caller is guardian
- Return current deletion status for family

  3.4 Add tests:

- Test guardian authorization
- Test confirmation phrase validation (exact match required)
- Test duplicate prevention
- Test cancellation during cooling off
- Test rejection of cancellation after cooling off ends

### Task 4: Create Deletion Processing Scheduled Function (AC: #6)

**Files:**

- `apps/functions/src/scheduled/executeDataDeletions.ts` (new)

**Implementation:**

4.1 Create scheduled function (runs every hour):

- Query deletions where status='cooling_off' AND coolingOffEndsAt < now
- For each:
  - Update status to 'processing'
  - Call dataDeletionService.executeFamilyDeletion()
  - On success: update status to 'completed', set completedAt
  - On failure: update status to 'failed', set errorMessage
  - Send completion email

    4.2 Include error handling and retry logic:

- Log each step for audit trail
- Continue processing other families if one fails

  4.3 Pattern: reference executeWithdrawals.ts for scheduled processing

### Task 5: Create Deletion Confirmation Email (AC: #7)

**Files:**

- `apps/functions/src/lib/email/templates/dataDeletionCompleteEmail.ts` (new)
- `apps/functions/src/lib/email/templates/dataDeletionRequestedEmail.ts` (new)

**Implementation:**

5.1 Create `sendDeletionRequestedEmail()` template:

- Subject: "Your Fledgely data deletion request has been received"
- Body: Confirmation of request, cooling off end date, how to cancel
- Include cancellation link/instructions

  5.2 Create `sendDeletionCompleteEmail()` template:

- Subject: "Your Fledgely data has been deleted"
- Body: Confirmation that all data has been permanently deleted
- GDPR Article 17 compliance acknowledgment

  5.3 Pattern: reference dataExportReadyEmail.ts

### Task 6: Add Firestore Indexes for Deletion Queries

**Files:**

- `firestore.indexes.json` (modify)

**Implementation:**

6.1 Add composite indexes:

```json
{
  "collectionGroup": "dataDeletions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "familyId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "dataDeletions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "coolingOffEndsAt", "order": "ASCENDING" }
  ]
}
```

### Task 7: Create Deletion Request UI Component (AC: #1, #2, #3, #5, #8)

**Files:**

- `apps/web/src/components/settings/DataDeletionCard.tsx` (new)
- `apps/web/src/components/settings/DataDeletionCard.test.tsx` (new)
- `apps/web/src/components/settings/DeleteConfirmationModal.tsx` (new)

**Implementation:**

7.1 Create DataDeletionCard component:

- "Delete All Data" button (red, warning styling)
- Shows current status if deletion pending
- "Cancel Deletion" button during cooling off
- Countdown to deletion if in cooling off
- Pattern: reference DataExportCard.tsx

  7.2 Create DeleteConfirmationModal component:

- Warning header: "This will delete ALL family data permanently"
- Text input requiring exact "DELETE MY DATA"
- Case-sensitive validation
- Enable button only when phrase matches exactly
- Clear list of what will be deleted
- Pattern: reference DissolveFamilyModal.tsx for typed confirmation

  7.3 States to display:

- No active request: Show "Delete All Data" button
- Cooling off: Show countdown, cancel button
- Processing: Show "Deletion in progress" message
- Completed: Show "Data deleted" confirmation

### Task 8: Create useDataDeletion Hook (AC: #1, #5, #8)

**Files:**

- `apps/web/src/hooks/useDataDeletion.ts` (new)
- `apps/web/src/hooks/useDataDeletion.test.ts` (new)

**Implementation:**

8.1 Create hook:

- Query current deletion status for family
- Provide requestDeletion(confirmationPhrase) function
- Provide cancelDeletion() function
- Calculate time remaining in cooling off
- Auto-poll when status is 'cooling_off'
- Return: status, deletionRequest, requestDeletion, cancelDeletion, isLoading, error, timeRemaining

### Task 9: Integrate into Settings Page (AC: #1)

**Files:**

- `apps/web/src/app/settings/page.tsx` (modify)

**Implementation:**

9.1 Add DataDeletionCard to "Data & Privacy" section
9.2 Position below DataExportCard
9.3 Add appropriate spacing and section divider
9.4 Test integration with export card

## Dev Notes

### Existing Infrastructure

**Data Export Service (apps/functions/src/services/gdpr/dataExportService.ts):**

- Patterns for collecting family data
- Field sanitization approach
- Cloud Storage operations

**Age 18 Deletion Service (packages/shared/src/services/age18DeletionService.ts):**

- Deletion record patterns
- Status tracking
- Batch deletion approaches

**Data Deletion Queue Service (packages/shared/src/services/dataDeletionQueueService.ts):**

- Queue-based deletion patterns
- Scheduled processing
- Cancellation handling

**Dissolve Family Modal (apps/web/src/components/DissolveFamilyModal.tsx):**

- Typed confirmation pattern ("type family name")
- Case-sensitive validation
- Warning UI patterns

### Firestore Collections to Delete

```
families/{familyId}                    → Family profile
families/{familyId}/children/          → All children
families/{familyId}/devices/           → All devices
families/{familyId}/agreements/        → All agreements
families/{familyId}/screenshots/       → Screenshot metadata
families/{familyId}/flags/             → All flags
families/{familyId}/auditEvents/       → Audit log
families/{familyId}/settings/          → Family settings
```

### Cloud Storage Paths to Delete

- Screenshots: `screenshots/{familyId}/**`
- Exports: `exports/{familyId}/**`

### Deletion Order (Critical)

Must delete in correct order to avoid orphaned data:

1. Screenshots (Cloud Storage) - largest, most time-consuming
2. Exports (Cloud Storage)
3. Subcollections (Firestore) - flags, agreements, devices, children, etc.
4. Family document (Firestore) - last, to maintain audit trail until end

### Security Considerations

- Only guardians can request deletion
- Confirmation phrase prevents accidental deletion
- 14-day cooling off allows recovery from mistakes
- Cancellation only allowed during cooling off
- Once processing starts, deletion is irreversible
- Email notifications at each stage for transparency

### Compliance Considerations

- NFR18: Complete deletion within 30 days of request
- GDPR Article 17: Right to be forgotten
- Audit trail maintained in deletion record (not in family data)
- Confirmation email serves as deletion certificate

### Testing Strategy

- Unit tests for service functions
- Integration tests for full deletion flow
- Security rules tests for authorization
- UI tests for confirmation modal interaction
- Edge cases: cancellation timing, concurrent requests

### References

- [Source: docs/epics/epic-list.md#Story-51.2 - Data Deletion Request]
- [Pattern: apps/functions/src/services/gdpr/dataExportService.ts - GDPR service patterns]
- [Pattern: packages/shared/src/services/age18DeletionService.ts - Deletion patterns]
- [Pattern: apps/web/src/components/DissolveFamilyModal.tsx - Typed confirmation]
- [Pattern: apps/functions/src/scheduled/executeWithdrawals.ts - Scheduled processing]
- [GDPR Article 17: Right to erasure]
- [NFR18: 30-day deletion compliance]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
