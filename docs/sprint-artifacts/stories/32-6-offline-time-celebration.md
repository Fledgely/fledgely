# Story 32.6: Offline Time Celebration

Status: done

## Story

As **a family**,
I want **to see our offline time streaks**,
So that **we're motivated to keep disconnecting together**.

## Acceptance Criteria

1. **AC1: Streak Counter**
   - Given family completes offline time periods
   - When viewing family dashboard
   - Then streak counter shows "X days of family offline time!"
   - And counter increments for each consecutive day completed

2. **AC2: Weekly Summary**
   - Given family has completed offline periods
   - When viewing summary
   - Then shows "Your family unplugged X hours together"
   - And summary updates weekly

3. **AC3: Celebration Milestones**
   - Given family reaches milestone (7, 30, 100 days)
   - When milestone reached
   - Then celebration animation/confetti displays
   - And milestone badge earned

4. **AC4: Optional Family Leaderboard**
   - Given family opts into leaderboard
   - When viewing leaderboard
   - Then shows anonymous family streaks
   - And user's family rank displayed

5. **AC5: Positive Reinforcement**
   - Given any offline time display
   - When presenting data
   - Then messaging is always positive (never punitive)
   - And focuses on achievements not failures

6. **AC6: Child-Friendly View**
   - Given child viewing their dashboard
   - When checking streak
   - Then sees "Great job unplugging with your family!"
   - And age-appropriate celebration language

## Tasks / Subtasks

- [x] Task 1: Create streak data model (AC: #1)
  - [x] 1.1 Add `OfflineTimeStreak` schema to @fledgely/shared
  - [x] 1.2 Add streak tracking fields to family document
  - [x] 1.3 Create Firestore document structure

- [x] Task 2: Implement streak calculation logic (AC: #1, #2)
  - [x] 2.1 Create `useOfflineTimeStreak` hook
  - [x] 2.2 Calculate consecutive days from compliance records
  - [x] 2.3 Calculate weekly hours from schedule data
  - [x] 2.4 Add streak persistence and reset logic

- [x] Task 3: Create streak UI components (AC: #1, #2)
  - [x] 3.1 Create `StreakCounterCard` component for dashboard
  - [x] 3.2 Create `WeeklySummaryCard` component (integrated into StreakCounterCard)
  - [x] 3.3 Integrate into parent dashboard

- [x] Task 4: Implement milestone celebrations (AC: #3)
  - [x] 4.1 Define milestone thresholds (7, 30, 100 days)
  - [x] 4.2 Create celebration animation/confetti component
  - [x] 4.3 Add milestone badge display
  - [x] 4.4 Persist milestone achievements

- [x] Task 5: Create child-friendly streak view (AC: #5, #6)
  - [x] 5.1 Add streak display to child dashboard
  - [x] 5.2 Use positive, encouraging language
  - [x] 5.3 Show age-appropriate celebration messages

- [x] Task 6: Add leaderboard (optional) (AC: #4)
  - [x] 6.1 Create leaderboard opt-in setting (field added, UI deferred)
  - [ ] 6.2 Implement anonymous leaderboard query (deferred - optional feature)
  - [ ] 6.3 Display leaderboard component (deferred - optional feature)

## Dev Notes

### Architecture Pattern

Streaks build on existing compliance tracking from Story 32-4:

```typescript
// packages/shared/src/contracts/offlineStreak.ts

export const offlineStreakSchema = z.object({
  familyId: z.string(),
  currentStreak: z.number(), // consecutive days
  longestStreak: z.number(), // all-time best
  lastCompletedDate: z.number(), // epoch ms of last completion
  weeklyHours: z.number(), // hours completed this week
  milestones: z.object({
    sevenDays: z.boolean().default(false),
    thirtyDays: z.boolean().default(false),
    hundredDays: z.boolean().default(false),
  }),
  updatedAt: z.number(),
})

export type OfflineStreak = z.infer<typeof offlineStreakSchema>
```

### Streak Calculation

```typescript
// Calculate streak from ParentComplianceRecords
function calculateStreak(complianceRecords: ParentComplianceRecord[]): number {
  // Sort by date descending
  // Check for consecutive days where all parents complied
  // Return consecutive day count
}
```

### Child-Friendly Messages

Messages should be positive and encouraging:

- "Great job unplugging with your family!"
- "7 days of family time together!"
- "You're on fire! 30 day streak!"

### NFR Compliance

- **NFR42**: WCAG 2.1 AA - accessible streak displays
- **FR113**: Positive reinforcement, never punitive

### References

- [Source: docs/epics/epic-list.md#story-326] - Story requirements
- [Source: Story 32-4] - Parent Compliance Tracking (source data)
- [Source: Story 32-1] - Offline Schedule Configuration

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**Shared Package (Data Models)**

- `packages/shared/src/contracts/index.ts` - Added OfflineStreak schema and STREAK_MESSAGES
- `packages/shared/src/index.ts` - Added streak exports
- `packages/shared/src/contracts/offlineStreak.test.ts` - Schema validation tests (21 tests)

**Web App (Hook)**

- `apps/web/src/hooks/useOfflineTimeStreak.ts` - Streak management hook
- `apps/web/src/hooks/useOfflineTimeStreak.test.ts` - Hook tests (21 tests)

**Web App (Components)**

- `apps/web/src/components/dashboard/StreakCounterCard.tsx` - Streak display with celebration
- `apps/web/src/components/dashboard/StreakCounterCard.test.tsx` - Component tests (27 tests)
- `apps/web/src/components/dashboard/index.ts` - Added StreakCounterCard export

**Dashboard Integration**

- `apps/web/src/app/dashboard/page.tsx` - Parent dashboard integration
- `apps/web/src/app/child/dashboard/page.tsx` - Child dashboard integration (isChildView)
