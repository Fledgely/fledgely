# Story 27.4: Asymmetric Viewing Pattern Detection

Status: done

## Story

As **the system**,
I want **to detect unbalanced viewing patterns between parents**,
So that **potential monitoring weaponization can be identified**.

## Acceptance Criteria

1. **AC1: Pattern calculation**
   - Given family has multiple guardians
   - When analyzing viewing patterns weekly
   - Then calculate views-per-guardian ratio

2. **AC2: Asymmetric pattern detection**
   - Given viewing patterns are analyzed
   - When one parent views 10x more than others
   - Then flag pattern as asymmetric (FR27B)

3. **AC3: Alert to under-viewing parent**
   - Given asymmetric pattern detected
   - When threshold exceeded
   - Then alert sent to under-viewing parent
   - And message: "Your co-parent has been checking more frequently"

4. **AC4: Non-accusatory messaging**
   - Given alerts are generated
   - When sending to guardians
   - Then messaging is non-accusatory (just information sharing)

5. **AC5: Exclude setup period**
   - Given family was recently created
   - When analyzing patterns
   - Then exclude first 2 weeks from analysis (setup period)

6. **AC6: Weekly analysis scheduling**
   - Given scheduled function runs weekly
   - When processing all families
   - Then analyze patterns for eligible families only

## Tasks / Subtasks

- [x] Task 1: Create pattern analysis service (AC: #1, #2, #5)
  - [x] 1.1 Create `patternAnalysisService.ts` with viewing pattern calculations
  - [x] 1.2 Implement guardian view counting for time period
  - [x] 1.3 Calculate asymmetry ratio between guardians
  - [x] 1.4 Check for setup period exclusion (family created < 2 weeks ago)
  - [x] 1.5 Return pattern analysis results with asymmetry flags

- [x] Task 2: Create scheduled analysis function (AC: #1, #6)
  - [x] 2.1 Create `analyzeViewingPatterns` scheduled function (weekly)
  - [x] 2.2 Query eligible families (multiple guardians, past setup period)
  - [x] 2.3 Run pattern analysis for each family
  - [x] 2.4 Store analysis results in Firestore

- [x] Task 3: Create alert notification service (AC: #3, #4)
  - [x] 3.1 Create `patternAlertService.ts` for generating alerts
  - [x] 3.2 Compose non-accusatory alert messages
  - [x] 3.3 Send notification to under-viewing guardian
  - [x] 3.4 Log alert generation in audit trail

- [x] Task 4: Create pattern alert notification UI (AC: #3, #4)
  - [x] 4.1 Add asymmetry alert to parent dashboard
  - [x] 4.2 Display non-judgmental information message
  - [x] 4.3 Link to audit log for transparency

- [x] Task 5: Create pattern analysis data model (AC: #1, #2)
  - [x] 5.1 Add `PatternAnalysis` type to shared types
  - [x] 5.2 Create Firestore collection for pattern history
  - [x] 5.3 Add indexes for pattern queries

## Dev Notes

### Asymmetry Detection Algorithm

```typescript
interface ViewingPatternAnalysis {
  familyId: string
  period: { start: number; end: number }
  guardianViews: Array<{
    guardianUid: string
    viewCount: number
  }>
  asymmetryRatio: number // highest / lowest ratio
  isAsymmetric: boolean // ratio >= 10
  analysisTimestamp: number
}

async function analyzeViewingPatterns(
  familyId: string,
  periodDays: number = 7
): Promise<ViewingPatternAnalysis>
```

### Setup Period Check

```typescript
function isInSetupPeriod(familyCreatedAt: number): boolean {
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
  return Date.now() - familyCreatedAt < TWO_WEEKS_MS
}
```

### Non-Accusatory Messaging

Messages should be informational, not judgmental:

- "Your co-parent has been checking in more frequently this week"
- "You might want to stay connected - [Co-parent name] has viewed [X] screenshots"
- Avoid: "Your co-parent is monitoring too much" or similar

### Alert Throttling

- Only send one alert per family per week
- Don't send if under-viewing parent's view count is actually normal (> 3 views)
- Store last alert timestamp to prevent spam

### Project Structure

```
apps/functions/src/
├── services/patterns/
│   ├── patternAnalysisService.ts  # NEW - Pattern calculations
│   └── patternAlertService.ts     # NEW - Alert generation
├── scheduled/
│   └── analyzeViewingPatterns.ts  # NEW - Weekly scheduled analysis

apps/web/src/
├── components/dashboard/
│   └── AsymmetryAlertBanner.tsx   # NEW - Alert display
```

### References

- [Source: docs/epics/epic-list.md#story-274] - Story requirements
- [Source: apps/functions/src/services/audit/] - Audit data source
- [FR27B] - Asymmetric viewing pattern detection requirement

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/functions/src/services/patterns/patternAnalysisService.ts` - Pattern analysis logic
- `apps/functions/src/services/patterns/patternAlertService.ts` - Alert generation
- `apps/functions/src/scheduled/analyzeViewingPatterns.ts` - Weekly scheduled function
- `apps/web/src/components/dashboard/AsymmetryAlertBanner.tsx` - Alert UI

**Modified Files:**

- `apps/functions/src/index.ts` - Export scheduled function
- `packages/shared/src/types/audit.ts` - Add pattern analysis types
