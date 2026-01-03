# Story 40.6: Location Feature Abuse Prevention

## Status: done

## Story

As **the system**,
I want **to detect potential location feature abuse**,
So that **location isn't weaponized in custody disputes**.

## Acceptance Criteria

1. **AC1: Asymmetric Location Check Detection**
   - Given location features active in shared custody family
   - When monitoring parent behavior patterns
   - Then alert if one parent checks location 10x more than other
   - And comparison uses rolling 7-day window
   - And threshold is NOT user-configurable (prevents gaming)

2. **AC2: Frequent Rule Change Detection**
   - Given custody exchange schedule exists
   - When monitoring location rule changes
   - Then alert if frequent location rule changes occur before custody exchanges
   - And "frequent" = 3+ rule changes within 24 hours before exchange
   - And pattern tracked across multiple exchanges

3. **AC3: Cross-Custody Time Restriction Detection**
   - Given location rules can restrict child behavior
   - When analyzing rule application timing
   - Then alert if location used to restrict child during other parent's time
   - And detect rules that target specific custody periods
   - And flag restrictive rules active only during non-custodial periods

4. **AC4: Bilateral Parent Alerts**
   - Given any abuse pattern detected
   - When alert is triggered
   - Then alerts sent to BOTH parents (transparency)
   - And alert includes pattern type and summary statistics
   - And alert does NOT blame either parent directly
   - And child is NOT notified (prevent triangulation)

5. **AC5: Conflict Resolution Resources**
   - Given abuse alert is sent
   - When parents view the alert
   - Then resources provided for conflict resolution
   - And resources include: family mediation links, co-parenting guides
   - And resources are neutral and non-judgmental

6. **AC6: Auto-Disable Capability**
   - Given repeated abuse patterns detected
   - When threshold reached (3+ alerts in 30 days)
   - Then system CAN auto-disable location features
   - And both parents notified of auto-disable
   - And parents can re-enable with mutual consent (follows Story 40.1 pattern)
   - And admin audit trail logs auto-disable reason

## Tasks / Subtasks

### Task 1: Create Location Abuse Detection Schema (AC: #1, #2, #3, #4) [x]

Define Zod schemas for abuse detection and alerts.

**Files:**

- `packages/shared/src/contracts/locationAbuse.ts` (new)
- `packages/shared/src/contracts/locationAbuse.test.ts` (new)

**Implementation:**

- Create `locationAbusePatternSchema`:
  - `id: string`
  - `familyId: string`
  - `patternType: 'asymmetric_checks' | 'frequent_rule_changes' | 'cross_custody_restriction'`
  - `detectedAt: Date`
  - `windowStart: Date`
  - `windowEnd: Date`
  - `metadata: Record<string, unknown>` (pattern-specific data)
- Create `locationAbuseAlertSchema`:
  - `id: string`
  - `familyId: string`
  - `patternId: string`
  - `patternType: string` (same enum as above)
  - `notifiedGuardianUids: string[]`
  - `sentAt: Date`
  - `acknowledged: boolean`
  - `resourcesViewed: boolean`
- Create `LOCATION_ABUSE_THRESHOLDS` constants:
  - `ASYMMETRIC_CHECK_RATIO: 10` (10x difference)
  - `ASYMMETRIC_CHECK_WINDOW_DAYS: 7`
  - `FREQUENT_CHANGES_COUNT: 3`
  - `FREQUENT_CHANGES_WINDOW_HOURS: 24`
  - `AUTO_DISABLE_ALERT_COUNT: 3`
  - `AUTO_DISABLE_WINDOW_DAYS: 30`
- Create `LOCATION_ABUSE_RESOURCES` constant with resolution links
- Export from `packages/shared/src/contracts/index.ts`
- Export from `packages/shared/src/index.ts`

**Tests:** ~20 tests for schema validation

### Task 2: Create Location Access Tracking Function (AC: #1) [x]

Track parent location check counts for asymmetric detection.

**Files:**

- `apps/functions/src/callable/trackLocationAccess.ts` (new)
- `apps/functions/src/callable/trackLocationAccess.test.ts` (new)

**Implementation:**

- `trackLocationAccess` callable function:
  - Record each location check with timestamp
  - Store in `families/{familyId}/locationAccessLog/{logId}`
  - Fields: uid, childId, timestamp, accessType
- `getLocationAccessCounts` helper:
  - Query access log for rolling 7-day window
  - Group by guardian uid
  - Return counts per guardian
- Rate limit: max 1 log per minute per guardian (prevent log spam)

**Tests:** ~12 tests for tracking logic

### Task 3: Create Asymmetric Check Detection (AC: #1, #4) [x]

Scheduled function to detect asymmetric location checking.

**Files:**

- `apps/functions/src/scheduled/detectLocationAbuse.ts` (new)
- `apps/functions/src/scheduled/detectLocationAbuse.test.ts` (new)

**Implementation:**

- `detectAsymmetricChecks` scheduled function (runs daily):
  - Query all families with location features enabled
  - For each family, get guardian access counts (7-day window)
  - If ratio > 10x, create abuse pattern record
  - Call alert function if pattern detected
- Helper `calculateAsymmetryRatio`:
  - Handle edge cases (0 checks, single parent)
  - Return { ratio: number, higherUid: string, lowerUid: string }
- Store detected patterns in `families/{familyId}/locationAbusePatterns/{patternId}`

**Tests:** ~15 tests for detection logic

### Task 4: Create Frequent Rule Change Detection (AC: #2, #4) [x]

Detect frequent location rule changes before custody exchanges.

**Files:**

- `apps/functions/src/scheduled/detectLocationAbuse.ts` (modify)
- `apps/functions/src/scheduled/detectLocationAbuse.test.ts` (modify)

**Implementation:**

- `detectFrequentRuleChanges` function:
  - Query custody exchange schedule (from family settings)
  - For each upcoming exchange, check rule changes in prior 24 hours
  - If 3+ changes, create abuse pattern record
- Track rule changes via Firestore trigger on locationRules collection
- Store change count in rolling window
- Pattern metadata includes: changeCount, changeTypes, timeToExchange

**Tests:** ~12 tests for rule change detection

### Task 5: Create Cross-Custody Restriction Detection (AC: #3, #4) [x]

Detect location rules that target other parent's custody time.

**Files:**

- `apps/functions/src/scheduled/detectLocationAbuse.ts` (modify)
- `apps/functions/src/scheduled/detectLocationAbuse.test.ts` (modify)

**Implementation:**

- `detectCrossCustodyRestriction` function:
  - Analyze location rules with time-based conditions
  - Compare rule active periods against custody schedule
  - Flag if restrictive rules (blocking categories) active only during non-custodial periods
- Integration with custody schedule data (from family settings)
- Pattern metadata includes: ruleIds, custodyPeriods, restrictionTypes

**Tests:** ~12 tests for cross-custody detection

### Task 6: Create Location Abuse Alert Function (AC: #4, #5) [x]

Send bilateral alerts when abuse patterns detected.

**Files:**

- `apps/functions/src/callable/sendLocationAbuseAlert.ts` (new)
- `apps/functions/src/callable/sendLocationAbuseAlert.test.ts` (new)

**Implementation:**

- `sendLocationAbuseAlert` callable function:
  - Get all guardians in family
  - Send notification to ALL guardians (both parents)
  - Include pattern type and neutral summary
  - Include conflict resolution resources
  - Never mention which parent triggered pattern
  - Never notify child (prevent triangulation)
- Store alert in `families/{familyId}/locationAbuseAlerts/{alertId}`
- Link to resources via LOCATION_ABUSE_RESOURCES constant

**Tests:** ~12 tests for alert function

### Task 7: Create Auto-Disable Function (AC: #6) [x]

Auto-disable location features if repeated abuse detected.

**Files:**

- `apps/functions/src/scheduled/autoDisableLocationForAbuse.ts` (new)
- `apps/functions/src/scheduled/autoDisableLocationForAbuse.test.ts` (new)

**Implementation:**

- `autoDisableLocationForAbuse` scheduled function (runs daily):
  - Query families with 3+ abuse alerts in 30 days
  - For each, disable location features
  - Use same disable mechanism from Story 40.1
  - Notify both parents of auto-disable
  - Log to admin audit trail with reason
- Include re-enable instructions (mutual consent required)
- Pattern: Follow Story 40.1 `disableLocationFeatures` pattern

**Tests:** ~10 tests for auto-disable logic

### Task 8: Create Location Abuse Dashboard Component (AC: #4, #5) [x]

Parent view for abuse alerts and resources.

**Files:**

- `apps/web/src/components/parent/LocationAbuseAlert.tsx` (new)
- `apps/web/src/components/parent/__tests__/LocationAbuseAlert.test.tsx` (new)

**Implementation:**

- Display active abuse alerts for family
- Show pattern summary (neutral language)
- Include conflict resolution resource links
- Mark alerts as acknowledged
- Track resource link clicks
- 44x44px touch targets (NFR49)
- 4.5:1 contrast ratio (NFR45)

**Tests:** ~15 tests for component states

### Task 9: Create Location Abuse Resources Component (AC: #5) [x]

Display conflict resolution resources.

**Files:**

- `apps/web/src/components/parent/LocationAbuseResources.tsx` (new)
- `apps/web/src/components/parent/__tests__/LocationAbuseResources.test.tsx` (new)

**Implementation:**

- Display curated list of resources:
  - Family mediation services
  - Co-parenting communication guides
  - Custody conflict resolution tips
- Non-judgmental, neutral tone
- External links open in new tab
- Track which resources viewed
- Accessible design (WCAG 2.1 AA)

**Tests:** ~10 tests for resource display

### Task 10: Create useLocationAbuseAlerts Hook (AC: #4, #5) [x]

React hook for managing abuse alerts.

**Files:**

- `apps/web/src/hooks/useLocationAbuseAlerts.ts` (new)
- `apps/web/src/hooks/useLocationAbuseAlerts.test.ts` (new)

**Implementation:**

- Subscribe to `families/{familyId}/locationAbuseAlerts`
- Provide `acknowledgeAlert(alertId)` function
- Provide `markResourceViewed(alertId)` function
- Track loading/error states
- Return active alerts and counts

**Tests:** ~8 tests for hook interface

### Task 11: Update Component and Function Exports (AC: All) [x]

Export new components and update indexes.

**Files:**

- `apps/web/src/components/parent/index.ts` (modify or create)
- `apps/functions/src/index.ts` (modify)
- `apps/functions/src/scheduled/index.ts` (modify)
- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/index.ts` (modify)

**Implementation:**

- Export LocationAbuseAlert component
- Export LocationAbuseResources component
- Export trackLocationAccess callable
- Export sendLocationAbuseAlert callable
- Export detectLocationAbuse scheduled
- Export autoDisableLocationForAbuse scheduled
- Export location abuse schemas

**Tests:** No additional tests (export verification)

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **React Styles:** Inline styles using React.CSSProperties

### Architecture Compliance

**From Architecture Document:**

- Single-Source Bidirectional Transparency (both parents see same alerts)
- Firebase Security Rules as primary boundary
- Non-configurable thresholds (prevent gaming)

**Key Patterns to Follow:**

- Abuse detection pattern from Story 3A.5 (screenshot viewing rate)
- Location settings pattern from Story 40.1
- Alert notification pattern from Story 3A.5
- Admin audit pattern from Story 0.5.8

### Existing Infrastructure to Leverage

**From Story 3A.5 (Screenshot Viewing Rate Alert):**

- `viewingRateAlertSchema` - Similar alert structure
- `sendViewingRateAlert` callable - Alert notification pattern
- Admin audit logging for rate alerts

**From Story 40.1 (Location Opt-In):**

- `locationSettingsSchema` - Location feature status
- `disableLocationFeatures` callable - Disable mechanism
- `requestLocationOptIn` callable - Re-enable pattern

**From Story 40.4 (Location Transitions):**

- `locationTransitionSchema` - Transition tracking
- Location access patterns

**From Story 40.2 (Location Zones):**

- `locationRuleSchema` - Rule structure for change detection

### Data Model

```typescript
// New: families/{familyId}/locationAccessLog/{logId}
interface LocationAccessLog {
  id: string
  uid: string // Guardian who checked
  childId: string
  accessType: 'status_check' | 'history_view' | 'zone_view'
  timestamp: Timestamp
}

// New: families/{familyId}/locationAbusePatterns/{patternId}
interface LocationAbusePattern {
  id: string
  familyId: string
  patternType: 'asymmetric_checks' | 'frequent_rule_changes' | 'cross_custody_restriction'
  detectedAt: Timestamp
  windowStart: Timestamp
  windowEnd: Timestamp
  metadata: Record<string, unknown>
  alertSent: boolean
}

// New: families/{familyId}/locationAbuseAlerts/{alertId}
interface LocationAbuseAlert {
  id: string
  familyId: string
  patternId: string
  patternType: string
  notifiedGuardianUids: string[]
  sentAt: Timestamp
  acknowledged: boolean
  resourcesViewed: boolean
}
```

### File Structure

```
packages/shared/src/contracts/
├── locationAbuse.ts                      # NEW - Abuse schemas
├── locationAbuse.test.ts                 # NEW
└── index.ts                              # MODIFY - exports

apps/functions/src/callable/
├── trackLocationAccess.ts                # NEW - Access tracking
├── trackLocationAccess.test.ts           # NEW
├── sendLocationAbuseAlert.ts             # NEW - Alert sending
└── sendLocationAbuseAlert.test.ts        # NEW

apps/functions/src/scheduled/
├── detectLocationAbuse.ts                # NEW - Pattern detection
├── detectLocationAbuse.test.ts           # NEW
├── autoDisableLocationForAbuse.ts        # NEW - Auto-disable
└── autoDisableLocationForAbuse.test.ts   # NEW

apps/web/src/components/parent/
├── LocationAbuseAlert.tsx                # NEW - Alert display
├── __tests__/LocationAbuseAlert.test.tsx # NEW
├── LocationAbuseResources.tsx            # NEW - Resources
├── __tests__/LocationAbuseResources.test.tsx # NEW
└── index.ts                              # MODIFY - exports

apps/web/src/hooks/
├── useLocationAbuseAlerts.ts             # NEW - Alerts hook
└── useLocationAbuseAlerts.test.ts        # NEW
```

### Testing Requirements

- Unit test all Zod schemas
- Unit test scheduled functions with mocked Firestore
- Unit test callable functions with mocked auth
- Component tests for UI with accessibility verification
- Test asymmetric detection edge cases (0 checks, single parent)
- Test rule change detection timing
- Test cross-custody restriction detection
- Test bilateral alert delivery
- Test auto-disable threshold

### NFR References

- NFR42: Location data handling (privacy requirements)
- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR52: Non-configurable safety thresholds

### Conflict Resolution Resources

```typescript
const LOCATION_ABUSE_RESOURCES = {
  title: 'Resources for Co-Parenting Challenges',
  intro:
    "We've noticed some patterns that might indicate tension around location features. Here are some resources that may help:",
  resources: [
    {
      name: 'Family Mediation Services',
      url: 'https://www.mediate.com/family/',
      description: 'Find a family mediator near you',
    },
    {
      name: 'Co-Parenting Communication Guide',
      url: 'https://www.helpguide.org/articles/parenting-family/co-parenting-tips-for-divorced-parents.htm',
      description: 'Tips for effective co-parenting communication',
    },
    {
      name: 'Parallel Parenting Strategies',
      url: 'https://www.verywellfamily.com/parallel-parenting-when-you-cant-co-parent-1102453',
      description: 'When traditional co-parenting is difficult',
    },
  ],
} as const
```

### References

- [Source: docs/epics/epic-list.md#Story-40.6]
- [Source: Story 3A.5 for abuse detection patterns]
- [Source: Story 40.1 for location disable patterns]
- [Source: Story 40.4 for location access patterns]

## Dev Agent Record

### Context Reference

- Epic: 40 (Advanced Shared Custody & Location Features)
- Story Key: 40-6-location-feature-abuse-prevention
- Dependencies: Story 40.1 (Location Opt-In) - COMPLETE
- Dependencies: Story 40.2 (Location Rules) - COMPLETE
- Dependencies: Story 40.4 (Location Transitions) - COMPLETE
- Dependencies: Story 40.5 (Location Privacy) - COMPLETE
- Related: Story 3A.5 (Screenshot Viewing Rate Alert) - COMPLETE

### Agent Model Used

- claude-opus-4-5-20251101

### Debug Log References

- None

### Completion Notes List

### File List

**New Files:**

- `packages/shared/src/contracts/locationAbuse.ts` - Abuse detection schemas and constants
- `packages/shared/src/contracts/locationAbuse.test.ts` - Schema tests (75 tests)
- `apps/functions/src/callable/trackLocationAccess.ts` - Location access tracking function
- `apps/functions/src/callable/trackLocationAccess.test.ts` - Tracking function tests (16 tests)
- `apps/functions/src/callable/sendLocationAbuseAlert.ts` - Bilateral alert function
- `apps/functions/src/callable/sendLocationAbuseAlert.test.ts` - Alert function tests (11 tests)
- `apps/functions/src/scheduled/detectLocationAbuse.ts` - Abuse pattern detection scheduler
- `apps/functions/src/scheduled/detectLocationAbuse.test.ts` - Detection tests (11 tests)
- `apps/functions/src/scheduled/autoDisableLocationForAbuse.ts` - Auto-disable scheduler
- `apps/functions/src/scheduled/autoDisableLocationForAbuse.test.ts` - Auto-disable tests (8 tests)
- `apps/web/src/components/parent/LocationAbuseAlert.tsx` - Alert display component
- `apps/web/src/components/parent/__tests__/LocationAbuseAlert.test.tsx` - Component tests (23 tests)
- `apps/web/src/components/parent/LocationAbuseResources.tsx` - Resources display component
- `apps/web/src/components/parent/__tests__/LocationAbuseResources.test.tsx` - Component tests (24 tests)
- `apps/web/src/hooks/useLocationAbuseAlerts.ts` - Alerts management hook
- `apps/web/src/hooks/useLocationAbuseAlerts.test.ts` - Hook tests (5 tests)

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added locationAbuse exports
- `packages/shared/src/index.ts` - Added Location Abuse Prevention exports
- `apps/functions/src/index.ts` - Added 6 new function exports
- `apps/web/src/components/parent/index.ts` - Added component exports

## Change Log

| Date       | Change                                      |
| ---------- | ------------------------------------------- |
| 2026-01-03 | Story created (ready-for-dev)               |
| 2026-01-03 | Implementation complete (173 tests passing) |
| 2026-01-03 | Code review passed, lint fixes applied      |
