# Story 27.5.1: Monthly Health Check-In Prompts

Status: done

## Story

As **the system**,
I want **to prompt periodic relationship health check-ins**,
So that **families can reflect on how monitoring is affecting their relationship**.

## Acceptance Criteria

1. **AC1: 30-day eligibility**
   - Given family has been using fledgely for 30+ days
   - When monthly check-in is due
   - Then check-in prompts are generated

2. **AC2: Parent check-in prompt**
   - Given check-in is due
   - When parent receives notification
   - Then prompt asks: "How are conversations about monitoring going?"

3. **AC3: Child check-in prompt**
   - Given check-in is due
   - When child receives notification
   - Then prompt is age-appropriate: "How do you feel about the monitoring?"

4. **AC4: Private responses**
   - Given parent and child respond to check-ins
   - When responses are stored
   - Then parent doesn't see child's response and vice versa

5. **AC5: Configurable frequency**
   - Given family settings
   - When check-in schedule is configured
   - Then frequency options include: weekly, monthly, quarterly

6. **AC6: Reminder system**
   - Given check-in not completed
   - When 3 days have passed since prompt
   - Then reminder notification is sent

## Tasks / Subtasks

- [x] Task 1: Create check-in data model (AC: #1, #4, #5)
  - [x] 1.1 Add `HealthCheckIn` schema to shared contracts
  - [x] 1.2 Add `CheckInSettings` schema for frequency configuration
  - [x] 1.3 Add `CheckInSchedule` for tracking due dates
  - [x] 1.4 Create Firestore collection structure for check-ins

- [x] Task 2: Create check-in scheduling service (AC: #1, #6)
  - [x] 2.1 Create `healthCheckInService.ts` in functions
  - [x] 2.2 Implement 30-day eligibility check
  - [x] 2.3 Calculate next check-in due date based on frequency
  - [x] 2.4 Track check-in status (pending, completed, skipped)

- [x] Task 3: Create scheduled function for check-in generation (AC: #1, #2, #3)
  - [x] 3.1 Create `generateHealthCheckIns` scheduled function (daily)
  - [x] 3.2 Query eligible families based on 30-day threshold
  - [x] 3.3 Generate separate check-ins for parents and children
  - [x] 3.4 Create notification records for each recipient

- [x] Task 4: Create reminder scheduled function (AC: #6)
  - [x] 4.1 Create `sendCheckInReminders` scheduled function
  - [x] 4.2 Query pending check-ins older than 3 days
  - [x] 4.3 Generate reminder notifications
  - [x] 4.4 Limit to one reminder per check-in period

- [x] Task 5: Create check-in settings UI (AC: #5)
  - [x] 5.1 Add check-in settings to family settings page
  - [x] 5.2 Frequency selector (weekly, monthly, quarterly)
  - [x] 5.3 Enable/disable check-ins toggle
  - [x] 5.4 Save settings to Firestore

## Dev Notes

### Data Model

```typescript
// Check-in frequency options
export const checkInFrequencySchema = z.enum(['weekly', 'monthly', 'quarterly'])
export type CheckInFrequency = z.infer<typeof checkInFrequencySchema>

// Check-in status
export const checkInStatusSchema = z.enum(['pending', 'completed', 'skipped', 'expired'])
export type CheckInStatus = z.infer<typeof checkInStatusSchema>

// Individual check-in record
export const healthCheckInSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  recipientUid: z.string(),
  recipientType: z.enum(['guardian', 'child']),
  periodStart: z.number(), // epoch ms - start of check-in period
  periodEnd: z.number(), // epoch ms - end of check-in period
  status: checkInStatusSchema,
  promptSentAt: z.number(),
  reminderSentAt: z.number().nullable(),
  respondedAt: z.number().nullable(),
  response: z
    .object({
      rating: z.enum(['positive', 'neutral', 'concerned']).nullable(),
      followUp: z.string().nullable(),
      additionalNotes: z.string().nullable(),
    })
    .nullable(),
  createdAt: z.number(),
})
export type HealthCheckIn = z.infer<typeof healthCheckInSchema>

// Family check-in settings
export const checkInSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  frequency: checkInFrequencySchema.default('monthly'),
  lastCheckInPeriodStart: z.number().nullable(),
  nextCheckInDue: z.number().nullable(),
  updatedAt: z.number(),
})
export type CheckInSettings = z.infer<typeof checkInSettingsSchema>
```

### Firestore Collections

```
/families/{familyId}/settings/healthCheckIn - CheckInSettings
/healthCheckIns/{checkInId} - HealthCheckIn documents
```

### Privacy Requirements

- Parent and child responses stored separately
- No cross-visibility between responses
- Aggregation only (for Story 27.5.4)

### Prompt Text

**Parent prompt:**
"How are conversations about monitoring going? Take a moment to reflect on how things have been going with [child name]."

**Child prompt (age < 13):**
"How do you feel about mom and dad looking at your phone and computer? We want to know how you're doing!"

**Child prompt (age 13+):**
"How do you feel about the monitoring arrangement? Your honest feedback helps."

### Scheduling Logic

```typescript
function getNextCheckInDue(frequency: CheckInFrequency, lastPeriodStart: number | null): number {
  const now = Date.now()
  const intervals = {
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    quarterly: 90 * 24 * 60 * 60 * 1000,
  }

  if (!lastPeriodStart) {
    // First check-in is due immediately if family is 30+ days old
    return now
  }

  return lastPeriodStart + intervals[frequency]
}
```

### NFR Compliance

- **NFR42:** Child-appropriate prompts
- **NFR65:** 6th-grade reading level for child prompts
- **Privacy:** Responses are private between parties

### Project Structure

```
apps/functions/src/
├── services/health/
│   ├── healthCheckInService.ts      # NEW - Check-in logic
│   └── index.ts                      # NEW - Exports
├── scheduled/
│   ├── generateHealthCheckIns.ts    # NEW - Daily check-in generation
│   └── sendCheckInReminders.ts      # NEW - Reminder generation

apps/web/src/
├── app/dashboard/settings/
│   └── health-check-ins/
│       └── page.tsx                  # NEW - Settings UI

packages/shared/src/
├── contracts/
│   └── index.ts                      # UPDATE - Add check-in types
```

### References

- [Source: docs/epics/epic-list.md#story-2751] - Story requirements
- [Source: apps/functions/src/services/notifications/] - Notification patterns

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/functions/src/services/health/healthCheckInService.ts`
- `apps/functions/src/services/health/index.ts`
- `apps/functions/src/scheduled/generateHealthCheckIns.ts`
- `apps/functions/src/scheduled/sendCheckInReminders.ts`
- `apps/web/src/app/dashboard/settings/health-check-ins/page.tsx`

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Add check-in schemas
- `packages/shared/src/index.ts` - Export check-in types
- `apps/functions/src/index.ts` - Export scheduled functions
