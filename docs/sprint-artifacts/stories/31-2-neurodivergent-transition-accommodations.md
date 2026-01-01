# Story 31.2: Neurodivergent Transition Accommodations

Status: In Progress

## Story

As **a neurodivergent child**,
I want **extra transition time and gentle warnings**,
So that **time limits don't cause distress**.

## Acceptance Criteria

1. **AC1: Early 30-minute warning** ✓
   - Given child has neurodivergent accommodation enabled (FR109)
   - When approaching time limit
   - Then additional warning at 30 minutes: "Start wrapping up soon"

2. **AC2: Extended grace period** ✓
   - Given child has accommodation enabled
   - When time limit is reached
   - Then extended 5-minute grace period before enforcement

3. **AC3: Calming visual design** ✓
   - Given warnings are displayed
   - When accommodation is enabled
   - Then visual countdown uses calming colors (not red/alarming)

4. **AC4: Optional audio warnings** ✓
   - Given accommodation is enabled
   - When configuring settings
   - Then audio warnings can be disabled

5. **AC5: Gradual transition mode** (Deferred to Story 31-4)
   - Given limit is reached with accommodation
   - When enforcing limit
   - Then "Transition mode" dims screen gradually instead of hard cutoff

6. **AC6: Per-child accommodation settings** ✓ (Backend only, UI pending)
   - Given parent is configuring limits
   - When setting accommodations
   - Then accommodation settings stored per-child in agreement

## Tasks / Subtasks

- [x] Task 1: Add accommodation schema to contracts (AC: #6)
  - [x] 1.1 Create neurodivergentAccommodationsSchema
  - [x] 1.2 Add accommodations field to childTimeLimitsSchema
  - [x] 1.3 Write schema tests

- [x] Task 2: Update warning system for accommodations (AC: #1, #3, #4)
  - [x] 2.1 Add 30-minute early warning support
  - [x] 2.2 Use calming colors in badge (blue/green instead of red/orange)
  - [x] 2.3 Add silent mode for notifications
  - [x] 2.4 Update warning messages for accommodated mode

- [x] Task 3: Implement grace period (AC: #2)
  - [x] 3.1 Add grace period tracking to warning state
  - [x] 3.2 Delay enforcement by configured grace minutes
  - [x] 3.3 Show "grace period" status in badge

- [ ] Task 4: Add accommodation configuration UI (AC: #6)
  - [ ] 4.1 Add accommodation toggle to time-limits settings page
  - [ ] 4.2 Add grace period configuration (1-10 minutes)
  - [ ] 4.3 Add audio toggle preference

- [x] Task 5: Build and test
  - [x] 5.1 Write tests for accommodation logic
  - [x] 5.2 Verify extension build passes
  - [x] 5.3 Verify web build passes

## Dev Notes

### Accommodation Schema

```typescript
export const neurodivergentAccommodationsSchema = z.object({
  /** Whether accommodations are enabled for this child */
  enabled: z.boolean().default(false),
  /** Extra warning at 30 minutes before limit */
  earlyWarningEnabled: z.boolean().default(true),
  /** Minutes for early warning (default 30) */
  earlyWarningMinutes: z.number().int().min(15).max(60).default(30),
  /** Grace period minutes after limit reached (1-10) */
  gracePeriodMinutes: z.number().int().min(1).max(10).default(5),
  /** Use calming colors instead of alarming red/orange */
  calmingColorsEnabled: z.boolean().default(true),
  /** Disable audio notifications */
  silentModeEnabled: z.boolean().default(false),
  /** Enable gradual screen dimming instead of hard cutoff */
  gradualTransitionEnabled: z.boolean().default(true),
})
```

### Color Palette for Calming Mode

- **Normal time**: Soft teal (#14b8a6) instead of green
- **30 min warning**: Soft blue (#3b82f6)
- **15 min warning**: Lavender (#a78bfa)
- **5 min warning**: Soft purple (#8b5cf6)
- **1 min warning**: Muted coral (#f97316 → #fb923c)
- **Grace period**: Soft amber (#fbbf24)

### Deferred: Gradual Screen Dimming (AC5)

AC5 (gradual screen dimming) requires Chrome extension content script injection to dim the page. This is complex and will be addressed in Story 31-4 (Chromebook Enforcement).

### References

- [Source: docs/epics/epic-list.md#story-312] - Story requirements
- [Source: FR109] - Neurodivergent accommodation requirement
- [Source: Story 31.1] - Countdown warning system foundation

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Backend implementation complete: schema, warning system, cloud function
- Task 4 (UI configuration) remains pending
- AC5 (gradual dimming) deferred to Story 31-4
- Code review fixes applied: grace period reuse prevention, silent mode logic, accurate grace time display

### File List

- packages/shared/src/contracts/index.ts - Added neurodivergentAccommodationsSchema
- packages/shared/src/contracts/timeLimits.test.ts - Added accommodation tests
- apps/extension/src/time-limit-warnings.ts - Updated with accommodation support
- apps/functions/src/http/timeLimits/getConfig.ts - Returns accommodations
