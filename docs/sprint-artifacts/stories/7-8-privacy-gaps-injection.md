# Story 7.8: Privacy Gaps Injection

Status: complete

## Story

As a **child who visits crisis resources**,
I want **normal screenshot gaps to exist for all users**,
So that **my crisis-related gaps don't reveal that I sought help**.

## Acceptance Criteria

1. **Given** monitoring is active for any child **When** screenshots are captured over time **Then** random plausible gaps are injected in ALL screenshot streams (not just crisis visitors)
2. **Given** privacy gaps feature is active **When** gaps are scheduled **Then** gaps occur at irregular intervals (5-15 minute windows, 2-4 times daily)
3. **Given** a privacy gap occurs **When** viewing the screenshot timeline **Then** gaps appear as normal monitoring pauses (no special marker)
4. **Given** privacy gaps are configured **When** multiple children are monitored **Then** gap pattern is randomized per-child to prevent detection
5. **Given** privacy gaps are active **When** a crisis-related gap occurs **Then** crisis-related gaps blend seamlessly with injected gaps
6. **Given** screenshot timeline is viewed by parent **When** gaps are present **Then** parents cannot distinguish real crisis visits from random gaps
7. **Given** a new child profile is created **When** monitoring starts **Then** this feature is enabled by default (opt-out only for specific circumstances)

## Tasks / Subtasks

- [x] Task 1: Create Privacy Gaps Schema (AC: 1, 2, 7)
  - [x] 1.1: Create `packages/contracts/src/privacyGaps.schema.ts`
  - [x] 1.2: Define `privacyGapConfigSchema` with fields: enabled, minGapDurationMs, maxGapDurationMs, minDailyGaps, maxDailyGaps
  - [x] 1.3: Define `privacyGapScheduleSchema` for scheduled gap windows
  - [x] 1.4: Define `privacyGapEventSchema` for gap occurrence tracking (no PII - just childId, timestamp, durationMs)
  - [x] 1.5: Add privacy gaps config to child profile schema
  - [x] 1.6: Export from `@fledgely/contracts`
  - [x] 1.7: Write schema validation tests

- [x] Task 2: Create Privacy Gap Scheduler Service (AC: 1, 2, 4)
  - [x] 2.1: Create `packages/shared/src/services/privacyGapScheduler.ts`
  - [x] 2.2: Implement `generateDailyGapSchedule(childId: string, date: Date): GapSchedule[]` using cryptographic randomness
  - [x] 2.3: Ensure per-child randomization using childId as seed component
  - [x] 2.4: Gap duration: random 5-15 minutes per gap
  - [x] 2.5: Gap count: random 2-4 gaps per day
  - [x] 2.6: Gap timing: distributed across waking hours (7am-10pm) with minimum 2-hour spacing
  - [x] 2.7: Write comprehensive unit tests

- [x] Task 3: Implement Gap Detection Logic (AC: 3, 5, 6)
  - [x] 3.1: Create `packages/shared/src/services/privacyGapDetector.ts`
  - [x] 3.2: Implement `isWithinScheduledGap(childId: string, timestamp: Date): boolean`
  - [x] 3.3: Implement `shouldSuppressCapture(childId: string, timestamp: Date, isCrisisUrl: boolean): boolean`
  - [x] 3.4: Crisis URLs always suppress (from Story 7.2), but gap timing makes them indistinguishable
  - [x] 3.5: NO differentiation between crisis gaps and privacy gaps in returned data
  - [x] 3.6: Write unit tests for gap detection

- [x] Task 4: Integrate with Crisis Protection Guard (AC: 5)
  - [x] 4.1: Update `packages/shared/src/services/crisisProtection.ts` to integrate privacy gaps
  - [x] 4.2: Add `PrivacyGapSuppression` as a suppression reason alongside `CrisisUrlSuppression`
  - [x] 4.3: Ensure suppression reason is NOT logged or exposed to parents
  - [x] 4.4: Update `shouldBlock*` methods to check privacy gaps
  - [x] 4.5: Write integration tests

- [x] Task 5: Create Gap Schedule Storage (AC: 1, 4)
  - [x] 5.1: Create Firebase function for daily schedule generation
  - [x] 5.2: Store schedules in Firestore: `privacy-gap-schedules/{childId}/{date}` (ephemeral - delete after 24h)
  - [x] 5.3: Schedule generation runs at midnight for each child's timezone
  - [x] 5.4: Use secure random number generation (crypto.getRandomValues)
  - [x] 5.5: Write scheduled function tests

- [x] Task 6: Create Privacy Gaps Configuration UI (AC: 7)
  - [x] 6.1: Add privacy gaps toggle to child profile settings
  - [x] 6.2: Default: enabled for all new children
  - [x] 6.3: Opt-out requires explicit confirmation explaining purpose
  - [x] 6.4: UI shows explanatory text: "Random monitoring pauses protect your child's privacy during sensitive browsing"
  - [x] 6.5: Write component tests

- [x] Task 7: Update Screenshot Timeline Display (AC: 3, 6)
  - [x] 7.1: Update timeline to show gaps as "Monitoring paused" with no special indicator
  - [x] 7.2: Gap appearance identical whether from privacy gap or crisis visit
  - [x] 7.3: NO way for parent to query gap reason
  - [x] 7.4: Write component tests

- [x] Task 8: Platform Adapter Updates (AC: 1)
  - [x] 8.1: Update web adapter to check privacy gap schedule before capture
  - [x] 8.2: Document Chrome extension integration (Epic 11)
  - [x] 8.3: Document Android adapter integration (Epic 15)
  - [x] 8.4: Document iOS integration (Epic 43)
  - [x] 8.5: Write adapter tests

- [x] Task 9: Integration Testing (AC: 1-7)
  - [x] 9.1: Create `packages/shared/src/services/__tests__/privacyGaps.integration.test.ts`
  - [x] 9.2: Test daily schedule generation produces valid gaps
  - [x] 9.3: Test per-child randomization (different children get different schedules)
  - [x] 9.4: Test crisis gap blending (crisis visits during privacy gaps are indistinguishable)
  - [x] 9.5: Test default enabled on new profiles
  - [x] 9.6: Verify zero-data-path (gap reasons never logged or exposed)

## Dev Notes

### Epic 7 Context: Crisis Allowlist Foundation

This story implements **PRIVACY GAPS INJECTION** (FR-SA2) from the Survivor Advocate requirements. The goal is to prevent **negative inference attacks** - where a suspicious parent could identify crisis resource usage by noticing gaps in the screenshot timeline.

**Critical Security Requirement:**
The gap suppression reason (privacy gap vs crisis URL) must NEVER be exposed to parents. From the parent's perspective, all gaps should appear identical and unexplained.

### Previous Story Foundation (Stories 7.1-7.7)

Built upon existing infrastructure:
- `@fledgely/shared` package with crisis URL data
- Crisis protection guard from Story 7.2
- Zero-data-path infrastructure
- Allowlist sync service from Story 7.7

### Key Design Decisions

**1. Per-Child Randomization:**
```typescript
// Use childId + date as seed for deterministic but unpredictable schedules
function generateDailyGapSchedule(childId: string, date: Date): GapSchedule[] {
  // Combine childId with date for daily seed
  const seed = hashCombine(childId, date.toISOString().slice(0, 10))
  const rng = createSeededRandom(seed)

  const gapCount = randomInt(rng, 2, 4) // 2-4 gaps per day
  const gaps: GapSchedule[] = []

  // Distribute gaps across waking hours with minimum spacing
  // ...
}
```

**2. Gap Configuration Defaults:**
```typescript
const DEFAULT_PRIVACY_GAP_CONFIG: PrivacyGapConfig = {
  enabled: true, // ENABLED BY DEFAULT
  minGapDurationMs: 5 * 60 * 1000,   // 5 minutes minimum
  maxGapDurationMs: 15 * 60 * 1000,  // 15 minutes maximum
  minDailyGaps: 2,
  maxDailyGaps: 4,
  wakingHoursStart: 7,  // 7am
  wakingHoursEnd: 22,   // 10pm
  minGapSpacingMs: 2 * 60 * 60 * 1000, // 2 hours between gaps
}
```

**3. Suppression Decision Flow:**
```typescript
function shouldSuppressCapture(childId: string, timestamp: Date, url: string): SuppressCapture {
  // 1. Check crisis URL first (always suppress)
  if (isCrisisUrl(url)) {
    return { suppress: true } // NO reason exposed
  }

  // 2. Check privacy gap schedule
  if (isWithinScheduledGap(childId, timestamp)) {
    return { suppress: true } // NO reason exposed
  }

  return { suppress: false }
}
```

### Zero-Data-Path Compliance

Per INV-001 and Story 7.2 requirements:
- Gap reasons are NEVER logged
- Gap schedules are ephemeral (deleted after 24h)
- No way to query whether a gap was "crisis" or "privacy"
- Parent-facing UI shows identical "Monitoring paused" for all gaps

### Firestore Structure

```typescript
// Gap schedules (ephemeral - auto-delete after 24h)
// privacy-gap-schedules/{childId}/{YYYY-MM-DD}
{
  childId: string,
  date: string, // YYYY-MM-DD
  gaps: [
    { startTime: string, endTime: string, durationMs: number },
    // ...
  ],
  generatedAt: Timestamp,
  expiresAt: Timestamp, // 24h from generation
}

// Child profile config addition
// children/{childId}
{
  // existing fields...
  privacyGapsConfig: {
    enabled: boolean, // default: true
    customConfig?: PrivacyGapConfig, // optional override
  }
}
```

### Architecture Compliance

Per `project_context.md`:
- **Rule 1:** Types from Zod - create schemas in `@fledgely/contracts`
- **Rule 2:** Firebase SDK direct - store schedules in Firestore
- **Rule 3:** Crisis allowlist check FIRST - then privacy gap check
- **Rule 5:** Functions delegate to services

### File Structure

```
packages/contracts/src/
├── privacyGaps.schema.ts           # Gap configuration schemas
└── privacyGaps.schema.test.ts

packages/shared/src/services/
├── privacyGapScheduler.ts          # Daily schedule generation
├── privacyGapDetector.ts           # Gap detection logic
└── __tests__/
    ├── privacyGapScheduler.test.ts
    ├── privacyGapDetector.test.ts
    └── privacyGaps.integration.test.ts

apps/functions/src/scheduled/
├── privacyGapScheduleGenerator.ts  # Daily schedule generation
└── privacyGapScheduleGenerator.test.ts

apps/web/src/components/settings/
├── PrivacyGapsToggle.tsx           # Config UI component
└── __tests__/PrivacyGapsToggle.test.tsx

apps/web/src/components/timeline/
├── ScreenshotTimeline.tsx          # Updated to show gaps uniformly
└── __tests__/ScreenshotTimeline.test.tsx
```

### Testing Standards

Per `project_context.md`:
- Unit tests: `*.test.ts` (co-located)
- Integration tests: `*.integration.test.ts`
- Test with Firebase emulators
- NEVER mock security rules

**Critical Tests:**
1. Per-child randomization produces different schedules
2. Gap timing within configured bounds
3. Crisis gaps indistinguishable from privacy gaps
4. Default enabled on new profiles
5. Zero-data-path compliance (no gap reason exposure)

### Security Considerations

1. **Cryptographic Randomness:** Use `crypto.getRandomValues()` for unpredictable gap timing
2. **No Pattern Analysis:** Gap schedules vary daily and per-child
3. **No Logging:** Gap reasons never logged to any system
4. **Ephemeral Schedules:** Auto-delete after 24h to prevent historical analysis

### Git Commit Pattern

```
feat(story-7.8): Privacy Gaps Injection - prevent negative inference attacks
```

### Dependencies

- **Requires:** Story 7.2 (Crisis Visit Zero-Data-Path) - DONE
- **Requires:** Story 7.7 (Allowlist Distribution & Sync) - DONE
- **Enables:** Epic 7.5 (Child Safety Signal) - uses privacy gaps after 48h blackout
- **Enables:** Epic 11 (Chromebook Extension) - integrates gap checking
- **Enables:** Epic 15 (Android Agent) - integrates gap checking

### References

- [Source: docs/epics/epic-list.md#Story-7.8] - Original acceptance criteria
- [Source: docs/epics/epic-list.md#FR-SA2] - Survivor Advocate requirement
- [Source: docs/project_context.md] - Types from Zod, Firebase direct rules
- [Source: docs/sprint-artifacts/stories/7-2-crisis-visit-zero-data-path.md] - Crisis protection infrastructure
- [Source: docs/epics/epic-list.md#Story-7.5.7] - 48-hour blackout uses privacy gaps

## Dev Agent Record

### Context Reference

Story 7.8 - Privacy Gaps Injection (FR-SA2)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - all tests passed on implementation

### Completion Notes List

1. **Task 1-5**: Completed in previous session - schemas, scheduler, detector, integration, and Firebase function
2. **Task 6**: Created PrivacyGapsToggle component with confirmation dialog for opt-out (29 tests)
3. **Task 7**: Created ScreenshotTimeline component with zero-data-path gap display (21 tests)
4. **Task 8**: Created webCaptureAdapter with platform integration docs (14 tests)
5. **Task 9**: Integration tests already complete from Task 4.5 (15 tests)

**Zero-Data-Path Compliance Verified:**
- `CaptureSuppressResult` contains only `suppress: boolean` - no reason field
- `CaptureDecision` contains only `shouldCapture: boolean` - no reason field
- `GapEntry` type has no `reason` field - cannot expose gap type
- UI shows identical "Monitoring paused" for all gaps
- Gap reasons never logged or exposed in any interface

### File List

**Contracts (Task 1):**
- `packages/contracts/src/privacyGaps.schema.ts`
- `packages/contracts/src/privacyGaps.schema.test.ts`

**Shared Services (Tasks 2-4, 9):**
- `packages/shared/src/services/privacyGapScheduler.ts`
- `packages/shared/src/services/__tests__/privacyGapScheduler.test.ts`
- `packages/shared/src/services/privacyGapDetector.ts`
- `packages/shared/src/services/__tests__/privacyGapDetector.test.ts`
- `packages/shared/src/services/__tests__/privacyGaps.integration.test.ts`

**Firebase Functions (Task 5):**
- `apps/functions/src/scheduled/privacyGapScheduleGenerator.ts`
- `apps/functions/src/scheduled/privacyGapScheduleGenerator.test.ts`

**Web Components (Tasks 6-7):**
- `apps/web/src/components/settings/PrivacyGapsToggle.tsx`
- `apps/web/src/components/settings/__tests__/PrivacyGapsToggle.test.tsx`
- `apps/web/src/components/settings/index.ts`
- `apps/web/src/components/timeline/ScreenshotTimeline.tsx`
- `apps/web/src/components/timeline/__tests__/ScreenshotTimeline.test.tsx`
- `apps/web/src/components/timeline/index.ts`

**Platform Adapters (Task 8):**
- `packages/shared/src/adapters/webCaptureAdapter.ts`
- `packages/shared/src/adapters/__tests__/webCaptureAdapter.test.ts`

**Updated Exports:**
- `packages/shared/src/index.ts`
- `packages/contracts/src/index.ts`
