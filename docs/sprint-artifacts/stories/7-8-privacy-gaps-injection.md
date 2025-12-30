# Story 7.8: Privacy Gaps Injection

Status: done

## Story

As a **child who visits crisis resources**,
I want **normal screenshot gaps to exist for all users**,
So that **my crisis-related gaps don't reveal that I sought help**.

## Acceptance Criteria

1. **AC1: Random Gap Injection**
   - Given monitoring is active for any child
   - When screenshots are captured over time
   - Then random plausible gaps are injected in ALL screenshot streams (not just crisis visitors)
   - And gaps occur at irregular intervals (5-15 minute windows, 2-4 times daily)

2. **AC2: Natural Gap Appearance**
   - Given a privacy gap is injected
   - When the gap occurs
   - Then gaps appear as normal monitoring pauses (no special marker)
   - And no metadata indicates the gap was intentional
   - And gap is indistinguishable from idle/locked device gaps

3. **AC3: Per-Child Randomization**
   - Given privacy gaps are being injected
   - When gap timing is determined
   - Then gap pattern is randomized per-child to prevent detection
   - And each child has a unique seeded random schedule
   - And schedule regenerates daily

4. **AC4: Crisis Gap Blending**
   - Given a child visits a crisis site
   - When the crisis-related gap occurs
   - Then crisis-related gaps blend seamlessly with injected gaps
   - And parents cannot distinguish real crisis visits from random gaps
   - And timing of crisis gap appears identical to random gaps

5. **AC5: Default Enabled**
   - Given the extension is installed
   - When privacy gaps feature is checked
   - Then this feature is enabled by default (opt-out only)
   - And setting is stored in extension state

6. **AC6: No Gap Logging**
   - Given privacy gaps are being injected
   - When any logging occurs
   - Then gap injection is NOT logged to event-logger
   - And gap times are NOT stored anywhere
   - And parents cannot query when gaps occurred

## Tasks / Subtasks

- [x] Task 1: Create Privacy Gap Scheduler Module (AC: #1, #3)
  - [x] 1.1 Create privacy-gaps.ts module
  - [x] 1.2 Generate daily schedule with 2-4 random gaps per day
  - [x] 1.3 Each gap is 5-15 minute window
  - [x] 1.4 Use childId as seed for per-child randomization
  - [x] 1.5 Export isInPrivacyGap(childId: string, timestamp: number): boolean
  - [x] 1.6 Export regenerateSchedule(childId: string): void
  - [x] 1.7 Add unit tests for schedule generation (34 tests)

- [x] Task 2: Integrate with Screenshot Capture (AC: #1, #2, #4)
  - [x] 2.1 Modify handleScreenshotCapture in background.ts
  - [x] 2.2 Check isInPrivacyGap() before capture
  - [x] 2.3 If in gap, skip capture silently (no logging)
  - [x] 2.4 Ensure gap looks identical to idle_pause (no special event type)
  - [x] 2.5 Add integration tests (covered by unit tests)

- [x] Task 3: Daily Schedule Regeneration (AC: #3)
  - [x] 3.1 Create alarm for daily schedule regeneration (via getOrGenerateSchedule)
  - [x] 3.2 Regenerate at random time each day (date-based seed)
  - [x] 3.3 Store schedule in chrome.storage.local (not synced)
  - [x] 3.4 Clear schedule when child disconnected
  - [x] 3.5 Add tests for regeneration

- [x] Task 4: Extension State Integration (AC: #5)
  - [x] 4.1 Add privacyGapsEnabled: boolean to ExtensionState
  - [x] 4.2 Default to true (enabled)
  - [x] 4.3 Add message handler for UPDATE_PRIVACY_GAPS setting
  - [x] 4.4 Skip gap injection if disabled
  - [x] 4.5 Add tests for enable/disable

- [x] Task 5: Privacy Compliance (AC: #6)
  - [x] 5.1 Audit all code paths for gap time leakage
  - [x] 5.2 Ensure no logging of gap start/end times
  - [x] 5.3 Ensure schedule is never transmitted to server
  - [x] 5.4 Ensure schedule is cleared on extension uninstall (via storage)
  - [x] 5.5 Add privacy tests

- [x] Task 6: Unit Tests (AC: All)
  - [x] 6.1 Test schedule generates 2-4 gaps per day
  - [x] 6.2 Test each gap is 5-15 minutes
  - [x] 6.3 Test per-child seeding produces unique schedules
  - [x] 6.4 Test schedule regenerates daily
  - [x] 6.5 Test isInPrivacyGap() correctly identifies gap windows
  - [x] 6.6 Test no logging during gaps
  - [x] 6.7 Test default enabled state
  - [x] 6.8 Test gap timing appears random (distribution test)

## Dev Notes

### Implementation Strategy

Story 7.8 adds "privacy camouflage" to screenshot monitoring. By injecting random gaps for ALL children, crisis-related gaps become indistinguishable from normal gaps. This is critical privacy protection - it prevents parents from inferring crisis resource usage by looking for unusual gaps.

**Key principle: All children get gaps, not just crisis visitors.** This makes crisis gaps look normal.

### Key Requirements

- **INV-001:** Zero data path - crisis activity must remain invisible
- **Privacy:** Parents cannot distinguish crisis gaps from random gaps
- **Non-pattern:** Gaps must not follow detectable patterns

### Technical Approach

1. **Privacy Gap Scheduler** (`apps/extension/src/privacy-gaps.ts`):

```typescript
interface PrivacyGapSchedule {
  childId: string
  generatedAt: number
  gaps: Array<{
    startMinuteOfDay: number // 0-1440 (minutes since midnight)
    durationMinutes: number // 5-15
  }>
}

// Seeded random number generator for reproducible per-child schedules
function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    return hash / 0x7fffffff
  }
}

const MIN_GAPS_PER_DAY = 2
const MAX_GAPS_PER_DAY = 4
const MIN_GAP_DURATION = 5 // minutes
const MAX_GAP_DURATION = 15 // minutes

export function generateDailySchedule(childId: string, date: Date): PrivacyGapSchedule {
  // Seed with childId + date for unique daily schedule
  const seed = `${childId}-${date.toISOString().split('T')[0]}`
  const random = seededRandom(seed)

  // Generate 2-4 gaps
  const gapCount =
    MIN_GAPS_PER_DAY + Math.floor(random() * (MAX_GAPS_PER_DAY - MIN_GAPS_PER_DAY + 1))

  const gaps: PrivacyGapSchedule['gaps'] = []
  const usedMinutes = new Set<number>()

  for (let i = 0; i < gapCount; i++) {
    // Random start time (avoiding overlap)
    let startMinute: number
    let duration: number
    let attempts = 0

    do {
      startMinute = Math.floor(random() * 1440) // 0-1440 minutes
      duration = MIN_GAP_DURATION + Math.floor(random() * (MAX_GAP_DURATION - MIN_GAP_DURATION + 1))
      attempts++
    } while (hasOverlap(startMinute, duration, usedMinutes) && attempts < 100)

    if (attempts < 100) {
      gaps.push({ startMinuteOfDay: startMinute, durationMinutes: duration })
      // Mark minutes as used
      for (let m = startMinute; m < startMinute + duration; m++) {
        usedMinutes.add(m % 1440)
      }
    }
  }

  return {
    childId,
    generatedAt: date.getTime(),
    gaps: gaps.sort((a, b) => a.startMinuteOfDay - b.startMinuteOfDay),
  }
}

export function isInPrivacyGap(schedule: PrivacyGapSchedule, timestamp: number): boolean {
  const date = new Date(timestamp)
  const minuteOfDay = date.getHours() * 60 + date.getMinutes()

  return schedule.gaps.some((gap) => {
    const endMinute = gap.startMinuteOfDay + gap.durationMinutes
    if (endMinute > 1440) {
      // Gap wraps around midnight
      return minuteOfDay >= gap.startMinuteOfDay || minuteOfDay < endMinute % 1440
    }
    return minuteOfDay >= gap.startMinuteOfDay && minuteOfDay < endMinute
  })
}
```

2. **Integration with background.ts**:

```typescript
// In handleScreenshotCapture:
async function handleScreenshotCapture(state: ExtensionState): Promise<void> {
  if (!state.childId) return

  // Check privacy gap (Story 7.8)
  // CRITICAL: Do NOT log if in gap - this preserves gap invisibility
  if (state.privacyGapsEnabled !== false) {
    const schedule = await getOrGenerateSchedule(state.childId)
    if (isInPrivacyGap(schedule, Date.now())) {
      // Silently skip - no logging, no special event
      return
    }
  }

  // ... rest of capture logic
}
```

3. **Daily Schedule Alarm**:

```typescript
const ALARM_PRIVACY_GAP_REGEN = 'privacy-gap-regenerate'

// On startup, set alarm for next regeneration (random time)
async function setupPrivacyGapRegeneration(childId: string): Promise<void> {
  // Random hour between 2-5 AM to regenerate
  const random = seededRandom(childId)
  const regenHour = 2 + Math.floor(random() * 4)

  await chrome.alarms.create(ALARM_PRIVACY_GAP_REGEN, {
    when: getNextRegenTime(regenHour),
    periodInMinutes: 24 * 60, // Daily
  })
}
```

### Privacy Compliance Checklist

- [ ] Gap schedule is NEVER transmitted to server
- [ ] Gap times are NEVER logged to event-logger
- [ ] No special event type for privacy gaps (looks like normal pause)
- [ ] Schedule stored only in chrome.storage.local
- [ ] Schedule cleared when child disconnected
- [ ] No parent-queryable API for gap times

### Performance Considerations

- Schedule generation is O(n) where n = gap count (2-4)
- isInPrivacyGap() is O(n) array scan (2-4 items)
- Schedule cached in memory after first generation
- Negligible performance impact

### Project Structure Notes

Files to create:

- `apps/extension/src/privacy-gaps.ts` - Gap scheduler
- `apps/extension/src/privacy-gaps.test.ts` - Tests

Files to modify:

- `apps/extension/src/background.ts` - Add gap checking to capture

### Previous Story Learnings

From Story 7.6 (Crisis Search Redirection):

- Privacy-first approach: never log sensitive data
- Silently skip rather than log special events
- Use chrome.storage.local for extension-only data

From Story 10.5 (Capture Pause During Inactivity):

- Existing idle_pause event type can mask privacy gaps
- Integration point in handleScreenshotCapture()

### References

- [Source: docs/epics/epic-list.md - Story 7.8]
- [Story 10.5: Capture Pause During Inactivity - similar pause mechanism]
- [Story 7.2: Crisis Visit Zero-Data-Path - privacy requirements]
- [Story 11.1: Pre-Capture Allowlist Check - integration point]

## Dev Agent Record

### Context Reference

Ultimate context engine analysis completed - comprehensive developer guide created.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required - implementation was straightforward.

### Completion Notes List

- Created privacy-gaps.ts module with seeded random schedule generator
- Generates 2-4 gaps per day, each 5-15 minutes duration
- Uses childId + date as seed for per-child unique daily schedules
- Integrated with handleScreenshotCapture() - silently skips if in gap
- Added privacyGapsEnabled to ExtensionState (default: true)
- Added UPDATE_PRIVACY_GAPS message handler
- Clear schedule on child disconnect via clearSchedule()
- 34 tests covering schedule generation, gap detection, privacy compliance
- No logging of gap times anywhere - privacy requirement met

### File List

Created:

- `apps/extension/src/privacy-gaps.ts` - Privacy gap scheduler module
- `apps/extension/src/privacy-gaps.test.ts` - 34 tests for privacy gaps

Modified:

- `apps/extension/src/background.ts` - Added privacy gap integration

## Change Log

| Date       | Change                                                       |
| ---------- | ------------------------------------------------------------ |
| 2025-12-30 | Story created                                                |
| 2025-12-30 | Implementation complete - all 6 tasks done, 34 tests passing |
