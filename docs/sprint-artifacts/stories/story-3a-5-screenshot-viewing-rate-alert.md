# Story 3A.5: Screenshot Viewing Rate Alert

Status: dev-complete

## Story

As a **co-parent**,
I want **to be alerted if my co-parent views screenshots excessively**,
So that **I'm aware of potential monitoring weaponization during custody disputes**.

## Acceptance Criteria

1. **Given** a shared custody family with screenshots captured **When** one parent views more than 50 screenshots within one hour **Then** other parent receives alert notification
2. **Given** a screenshot viewing rate alert is triggered **When** the alert is delivered **Then** alert shows count and timeframe but NOT which screenshots were viewed
3. **Given** a screenshot viewing rate alert is triggered **When** the alert is displayed **Then** alert is informational only (no action required from recipient)
4. **Given** a screenshot viewing rate alert is triggered **When** the excessive viewing continues **Then** viewing is NOT blocked (we're not preventing, just informing)
5. **Given** any guardian views screenshots **When** the viewing is logged **Then** viewing rate is logged in audit trail with timestamps
6. **Given** the system configuration **When** rate limit is checked **Then** rate threshold (50/hour) is NOT user-configurable (prevents gaming)
7. **Given** a screenshot viewing rate alert is triggered **When** the alert is delivered **Then** child is NOT notified of excessive viewing (prevent triangulation)

## Tasks / Subtasks

- [x] Task 1: Create screenshot viewing rate alert schema (AC: 1, 2, 6)
  - [x] 1.1: Add `SCREENSHOT_VIEWING_RATE_LIMITS` constant to contracts (50 screenshots per hour)
  - [x] 1.2: Create `ScreenshotViewingRateAlert` type with `triggeredBy`, `alertedTo`, `count`, `windowStart`, `windowEnd`
  - [x] 1.3: Add `screenshotViewingRateAlertSchema` Zod schema
  - [x] 1.4: Export new types from contracts/index.ts
  - [x] 1.5: Write schema tests (65+ tests added)

- [x] Task 2: Extend logDataView to track screenshot-specific views (AC: 5)
  - [x] 2.1: `resourceId` already present in logDataView - used for screenshots
  - [x] 2.2: Existing logDataView handles screenshot views with dataType: 'screenshot'
  - [x] 2.3: Individual screenshot views logged separately by existing implementation
  - [x] 2.4: Existing tests cover screenshot view logging

- [x] Task 3 & 4 (Combined): Create screenshot viewing rate detection trigger (AC: 1, 6)
  - [x] 4.1: Create `onScreenshotViewLogged` Firestore trigger on `viewAuditLog` create
  - [x] 4.2: Filter to only `dataType === 'screenshot'` entries
  - [x] 4.3: Check if 50+ screenshots viewed in last hour by same guardian
  - [x] 4.4: If threshold exceeded and no recent alert (1 hour cooldown): create alert
  - [x] 4.5: Write unit tests (17 tests added)

- [x] Task 5: Implement co-parent alert notification (AC: 2, 3, 7) - Implemented in trigger
  - [x] 5.1: Notification payload inline in trigger (type: 'screenshot_rate_alert')
  - [x] 5.2: On rate alert creation: identifies OTHER guardians (not the one who triggered)
  - [x] 5.3: Creates notification for other guardian(s) only (NOT the triggering parent)
  - [x] 5.4: Notification shows: "Your co-parent viewed {count} screenshots in the past hour"
  - [x] 5.5: Notification explicitly does NOT include child in recipients
  - [x] 5.6: Notification is informational only (actionRequired: false)
  - [x] 5.7: Store notification in global notifications collection
  - [x] 5.8: Tests in onScreenshotViewLogged.test.ts (17 tests cover all AC)

- [x] Task 6: Add Firestore Security Rules for rate alerts (AC: 3, 4)
  - [x] 6.1: Created security rules for `children/{childId}/screenshotRateAlerts/{alertId}`
  - [x] 6.2: Guardians can read rate alerts for their children (symmetry)
  - [x] 6.3: Alerts created only by Cloud Functions (allow create: if false)
  - [x] 6.4: Alerts are immutable (no updates/deletes)
  - [x] 6.5: Rules documented in firestore.rules with AC references

- [x] Task 7: Add Firestore indexes for rate alert queries (AC: 1)
  - [x] 7.1: Added compound index for `viewAuditLog`: `viewedBy` + `dataType` + `viewedAt`
  - [x] 7.2: Added index for `screenshotRateAlerts`: `triggeredBy` + `createdAt`

- [x] Task 8: Create rate alert query utilities (AC: 3) - In contracts
  - [x] 8.1: `checkScreenshotViewingRate` function implemented
  - [x] 8.2: `isWithinAlertCooldown` function implemented
  - [x] 8.3: `formatScreenshotRateAlertMessage` function implemented
  - [x] 8.4: Tests in data-symmetry.schema.test.ts (65+ tests)

## Dev Notes

### Architecture Patterns

**PR5: Adversarial Family Protections - Full Scope**
- Screenshot viewing rate alert is an anti-weaponization mechanism
- Detects potential monitoring abuse during custody disputes
- Informs co-parent without blocking access (transparency over control)
[Source: docs/archive/architecture.md#Architectural-Risk-Preventions]

**ADR-001: Child-Centric with Guardian Links**
- Rate alerts stored under child document (children/{childId}/screenshotRateAlerts/)
- Alerts reference guardian IDs but belong to child's data
- Both parents can view alerts (symmetry)
[Source: docs/archive/architecture.md#ADR-001]

**S5: Adversarial Protections - Full Scope**
- All adversarial family protections in scope: custody immutability, cooling periods, anti-weaponization
- Excessive viewing detection is core anti-weaponization feature
[Source: docs/archive/architecture.md#S5]

**EF4: Transparency Over Snitching**
- Alert is informational, not accusatory
- Same data shown to both parties (symmetry)
- Family decides how to address
[Source: docs/archive/architecture.md#Ethical-Framework]

### Existing Implementation Context

The codebase already has:
1. **Data view audit logging** (Story 3A.1) - `apps/functions/src/callable/logDataView.ts`
   - `logDataView` Cloud Function for recording views
   - `viewAuditLog` subcollection for audit entries
   - `dataViewTypeSchema` includes `'screenshot'` type
   - Rate limiting already in place (500 entries/hour)
2. **Data symmetry schema** - `packages/contracts/src/data-symmetry.schema.ts`
   - `DataViewAuditEntry` type with `viewedBy`, `dataType`, `resourceId`
   - `symmetryViolationTypeSchema` includes `'excessive_viewing'` (defined but not implemented)
3. **Guardian verification pattern** - Used in `logDataView`, `cancelCoolingPeriod`, etc.
4. **App Check enforcement pattern** - All callable functions enforce App Check
5. **Firestore trigger pattern** - See `processEmailQueue.ts`, `processLegalPetitionNotifications.ts`

### Key Difference from Rate Limiting in logDataView

| Aspect | Story 3A.1 Rate Limit | Story 3A.5 Rate Alert |
|--------|----------------------|----------------------|
| Purpose | Prevent abuse/DoS | Detect weaponization |
| Threshold | 500 entries/hour | 50 screenshots/hour |
| Response | Block further logging | Alert co-parent |
| Configurable | No | No |
| Scope | All data view types | Screenshots only |

### Data Model

**screenshotRateAlerts subcollection:**
```typescript
children/{childId}/screenshotRateAlerts/{alertId}
{
  id: string,           // Firestore doc ID
  childId: string,      // Child whose screenshots were viewed
  triggeredBy: string,  // Guardian who triggered the alert (UID)
  alertedTo: string[],  // Guardian(s) who received the alert (UIDs)
  screenshotCount: number, // Number of screenshots viewed (>= 50)
  windowStart: Timestamp,  // Start of 1-hour window
  windowEnd: Timestamp,    // End of 1-hour window (when alert triggered)
  createdAt: Timestamp,    // When alert was created
  // NOTE: Does NOT include screenshotIds (privacy protection)
}
```

### Alert Flow

```
Parent A views screenshots
    ↓
Each view logged to viewAuditLog (dataType: 'screenshot')
    ↓
Firestore trigger: onScreenshotViewLogged fires
    ↓
Query: count screenshots by Parent A in last hour
    ↓
If count >= 50 AND no alert in last hour:
    ↓
Create screenshotRateAlert document
    ↓
Create notification for Parent B (NOT child)
    ↓
Parent B sees informational alert
```

### Testing Standards

- All schemas must have comprehensive Zod validation tests (target: 25+ tests)
- Cloud Functions require unit tests with mocked Firestore
- Test edge cases: exactly 50 views, 49 views (no alert), rapid succession, cooldown period
- Test guardian isolation (alert goes to OTHER parent only)
- Test child exclusion (child NEVER notified)
- Firestore trigger tests must verify correct filtering

### Key Files to Modify

**Modified files:**
- `packages/contracts/src/data-symmetry.schema.ts` - Add rate alert types (extend existing)
- `packages/contracts/src/data-symmetry.schema.test.ts` - Add rate alert tests
- `packages/contracts/src/index.ts` - Export new types
- `packages/firebase-rules/firestore.rules` - Add screenshotRateAlerts rules
- `packages/firebase-rules/firestore.indexes.json` - Add compound indexes
- `apps/functions/src/index.ts` - Export new functions

**New files:**
- `apps/functions/src/triggers/onScreenshotViewLogged.ts` - Firestore trigger for rate detection
- `apps/functions/src/triggers/onScreenshotViewLogged.test.ts` - Trigger tests

### Why NOT User-Configurable Threshold

AC6 specifies the threshold (50/hour) is NOT user-configurable. Rationale:
1. **Gaming prevention**: If configurable, abusive parent could set to 1000 to avoid alerts
2. **Weaponization prevention**: Low threshold could be weaponized (set to 1 to generate constant alerts)
3. **Simplicity**: One clear standard for all families
4. **Consistency**: Same behavior for all shared custody situations

### Why NOT Block Viewing

AC4 specifies viewing is NOT blocked. Rationale:
1. **Rights preservation**: Both parents have equal right to view child's data
2. **Transparency over control**: Alert informs, doesn't restrict
3. **Anti-weaponization**: Blocking could be weaponized (one parent could "lock out" other)
4. **Family autonomy**: Family decides appropriate response to alert

### Why Child NOT Notified

AC7 specifies child is NOT notified. Rationale:
1. **Prevent triangulation**: Child shouldn't be drawn into parental monitoring disputes
2. **Adult concern**: Excessive viewing is a co-parent issue, not child's responsibility
3. **Reduce anxiety**: Child doesn't need to know about parental viewing patterns
4. **Focus on transparency**: Parents are informed; child's wellbeing protected from conflict

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Extends existing Story 3A.1 implementation (data-symmetry.schema.ts)
- Uses existing viewAuditLog subcollection structure
- Same rate limiting patterns apply (but different threshold and response)

### References

- [Source: docs/epics/epic-list.md#Story-3A.5] - Original acceptance criteria
- [Source: docs/archive/architecture.md#PR5] - Adversarial family protections
- [Source: docs/archive/architecture.md#EF4] - Transparency over snitching
- [Source: packages/contracts/src/data-symmetry.schema.ts] - Existing symmetry schema
- [Source: apps/functions/src/callable/logDataView.ts] - Data view logging function
- [Source: docs/sprint-artifacts/stories/story-3a-1-data-symmetry-enforcement.md] - Story 3A.1 patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

