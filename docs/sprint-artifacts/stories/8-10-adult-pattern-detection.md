# Story 8.10: Adult Pattern Detection

Status: done

## Story

As **the system**,
I want **to detect when an enrolled "child" exhibits adult usage patterns**,
So that **we can prevent misuse of child monitoring for adult surveillance**.

## Acceptance Criteria

1. **AC1: Pattern Analysis**
   - Given a new child profile is enrolled with device monitoring
   - When the first 7 days of usage data is analyzed
   - Then system flags profiles showing adult patterns (work apps, financial sites, adult schedules)

2. **AC2: Verification Prompt**
   - Given flagged profiles
   - When adult patterns detected
   - Then gentle verification prompt sent to parent

3. **AC3: Parent Confirmation Flow**
   - Given verification prompt
   - When parent responds
   - Then if parent confirms adult, monitoring is automatically disabled

4. **AC4: Pattern Explanation Option**
   - Given verification prompt
   - When parent can explain pattern
   - Then if parent explains pattern (teen internship, etc.), flag is cleared

5. **AC5: Metadata-Only Detection**
   - Given detection mechanism
   - When analyzing usage
   - Then detection does NOT access content, only usage metadata (times, app categories)

6. **AC6: Misuse Prevention**
   - Given adult detection
   - When patterns match adult usage
   - Then this prevents "monitoring spouse as child" misuse

## Tasks / Subtasks

### Task 1: Add Adult Pattern Detection Schemas ✅

**Files:**

- `packages/shared/src/contracts/adultPatternDetection.ts`

**Implementation:**
1.1 Add adult pattern signal schemas (work apps, financial sites, schedules) ✅
1.2 Add AdultPatternAnalysis result schema ✅
1.3 Add AdultPatternFlag document schema for storing detection results ✅
1.4 Add parent response schemas (confirm adult, explain pattern) ✅
1.5 Export all types ✅

### Task 2: Create Adult Pattern Analysis Service ✅

**Files:**

- `apps/functions/src/services/adultPattern/adultPatternAnalyzer.ts`
- `apps/functions/src/services/adultPattern/patternSignals.ts`
- `apps/functions/src/services/adultPattern/index.ts`

**Implementation:**
2.1 Create pattern signal detection (work apps, financial URLs, adult schedules) ✅
2.2 Create analyzeChildUsagePattern() function that: ✅ - Queries 7 days of screenshot metadata (URLs, timestamps only) - Does NOT access screenshot content (AC5) - Calculates pattern scores for each signal type - Returns AdultPatternAnalysis with confidence score
2.3 Create createAdultPatternFlag() to store detection results ✅
2.4 Create shouldTriggerAnalysis() to check if child has 7+ days of data ✅

### Task 3: Create Verification Prompt and Response Endpoints ✅

**Files:**

- `apps/functions/src/http/adultPattern/index.ts`

**Implementation:**
3.1 Create GET /getAdultPatternFlags - returns pending flags for guardian's children ✅
3.2 Create POST /respondToAdultPattern with request body: ✅ - flagId: string - response: 'confirm_adult' | 'explain_pattern' - explanation?: string (for explain_pattern)
3.3 If response is 'confirm_adult': ✅ - Disable monitoring for the child - Delete all screenshots (privacy) - Mark flag as resolved
3.4 If response is 'explain_pattern': ✅ - Store explanation - Clear flag - Do NOT trigger analysis again for 90 days

### Task 4: Create Scheduled Analysis Job ✅

**Files:**

- `apps/functions/src/scheduled/analyzeAdultPatterns.ts`

**Implementation:**
4.1 Create scheduled function running daily at 3 AM UTC ✅
4.2 Query all children with: ✅ - First screenshot older than 7 days - No adult pattern flag in last 90 days - Monitoring still enabled
4.3 Run analyzeChildUsagePattern() for each eligible child ✅
4.4 Create AdultPatternFlag documents for high-confidence detections ✅
4.5 Send notification to guardian(s) when flag created ✅

### Task 5: Add Unit Tests ✅

**Files:**

- `packages/shared/src/contracts/adultPatternDetection.test.ts`
- `apps/functions/src/services/adultPattern/patternSignals.test.ts`

**Implementation:**
5.1 Test pattern signal detection (work apps, financial URLs, schedules) ✅
5.2 Test analyzeChildUsagePattern() with mock metadata ✅
5.3 Test confidence score calculation ✅
5.4 Test respondToAdultPattern endpoint (both responses) - schema validation ✅
5.5 Test monitoring disable flow - schema validation ✅
5.6 Test 90-day cooldown logic ✅
5.7 Minimum 15 tests - 61 tests total ✅

## Dev Notes

### Adult Pattern Signals (AC5: Metadata-Only)

Detection uses ONLY metadata, never screenshot content:

**Work App URL Patterns:**

- linkedin.com, slack.com, teams.microsoft.com
- zoom.us, webex.com, meet.google.com (business accounts)
- salesforce.com, hubspot.com, jira.atlassian.com
- quickbooks.com, xero.com, freshbooks.com

**Financial Site URL Patterns:**

- Personal banking domains (bankofamerica.com, chase.com, etc.)
- Investment platforms (fidelity.com, schwab.com, vanguard.com)
- Tax preparation (turbotax.com, hrblock.com)
- Trading platforms (robinhood.com, etrade.com, ameritrade.com)

**Adult Schedule Patterns:**

- Consistent 9-5 weekday activity
- Late night usage (11 PM - 2 AM consistently)
- Business hour patterns with meeting breaks

### Confidence Scoring

```typescript
// Each signal contributes to overall confidence
const signals = {
  workApps: 0.3, // 30% weight
  financialSites: 0.35, // 35% weight (strongest signal)
  adultSchedule: 0.25, // 25% weight
  communicationPatterns: 0.1, // 10% weight
}

// Threshold for flagging
const ADULT_PATTERN_THRESHOLD = 0.65 // 65% confidence
```

### Key Requirements

- **FR134:** Adult pattern detection as security foundation
- **NFR85:** Adversarial testing

### Anti-Abuse Design

This feature specifically prevents:

- Domestic abuse via spouse monitoring
- Stalking via fake "child" profiles
- Elder abuse via monitoring adults as children

### Privacy Design

- Detection NEVER accesses screenshot content
- Only uses: URLs, timestamps, app categories
- No PII is logged during detection
- Explanations are stored but not shared

### Required Firestore Indexes

The following composite indexes are required:

```
Collection: families/{familyId}/adultPatternFlags
Fields: childId ASC, status ASC, suppressAnalysisUntil ASC

Collection Group: adultPatternFlags
Fields: status ASC, createdAt ASC
```

### Code Review Fixes Applied

1. **Batch deletion bug** - Fixed: After calling `batch.commit()`, now creates new batch
2. **False positive domains** - Removed Discord, GitHub, GitLab from WORK_APP_DOMAINS
3. **Magic string** - Added `MONITORING_DISABLED_REASON_ADULT_PATTERN` constant

### References

- [Source: docs/epics/epic-list.md - Story 8.10]
- [Epic 9-13: Chromebook device monitoring - DONE]
- [Epic 20: AI classification - DONE]
- [Epic 41: Notifications - DONE]

## Dev Agent Record

### Context Reference

Epic 8: Data Isolation & Security Foundation

- FR134: Adult pattern detection as security foundation
- NFR85: Adversarial testing
- Dependencies on Epic 9+ now COMPLETE for Chromebook platform

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- Story updated from blocked to in-progress to review
- Dependencies verified complete (Epic 9-13, 20, 41)
- All 5 tasks implemented successfully
- Task 1: Added adult pattern detection schemas with domain lists, signal types, analysis result, flag document, and response schemas
- Task 2: Created adult pattern analysis service with signal detectors for work apps, financial sites, adult schedules, and communication patterns
- Task 3: Created HTTP endpoints GET /getAdultPatternFlags and POST /respondToAdultPattern
- Task 4: Created daily scheduled job analyzeAdultPatternsScheduled (3 AM UTC)
- Task 5: Added 61 unit tests (39 contract tests + 22 pattern signal tests)
- TypeScript compilation clean
- AC5 (Metadata-Only Detection) - verified: only uses URLs and timestamps, never screenshot content

### File List

- `packages/shared/src/contracts/adultPatternDetection.ts` - New adult pattern schemas
- `packages/shared/src/contracts/index.ts` - Export adult pattern schemas
- `packages/shared/src/index.ts` - Export adult pattern from main shared
- `packages/shared/src/contracts/adultPatternDetection.test.ts` - 39 contract tests
- `apps/functions/src/services/adultPattern/patternSignals.ts` - Signal detection functions
- `apps/functions/src/services/adultPattern/adultPatternAnalyzer.ts` - Main analyzer
- `apps/functions/src/services/adultPattern/index.ts` - Service exports
- `apps/functions/src/services/adultPattern/patternSignals.test.ts` - 22 signal tests
- `apps/functions/src/http/adultPattern/index.ts` - HTTP endpoints
- `apps/functions/src/scheduled/analyzeAdultPatterns.ts` - Daily job
- `apps/functions/src/index.ts` - Export endpoints and scheduled job
- `docs/sprint-artifacts/stories/8-10-adult-pattern-detection.md` - This story

## Change Log

| Date       | Change                                   |
| ---------- | ---------------------------------------- |
| 2025-12-29 | Story created as blocked                 |
| 2026-01-04 | Unblocked, added implementation tasks    |
| 2026-01-04 | Implementation complete, moved to review |
| 2026-01-04 | Code review complete, issues fixed, done |
