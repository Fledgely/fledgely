# Story 7.5.5: Mandatory Reporter Pathway

## Status: done

## Story

As **the system**,
I want **to support mandatory reporter referral when abuse indicators are present**,
So that **children in serious danger get appropriate intervention**.

## Acceptance Criteria

1. **AC1: Jurisdiction information for mandatory reporting**
   - Given a child safety signal is received by external partner
   - When trained professional assesses indicators of serious abuse
   - Then fledgely provides partner with family jurisdiction info (state/country)
   - And jurisdiction is derived from family profile address
   - And jurisdiction is included in routing payload (from Story 7.5.2)

2. **AC2: Fledgely does NOT make mandatory reports**
   - Given abuse indicators are identified
   - When any system process runs
   - Then fledgely does NOT make mandatory reports directly
   - And reporting responsibility remains with crisis partner
   - And fledgely's role is data provider only

3. **AC3: Family notification suppression**
   - Given a mandatory reporting pathway is activated
   - When partner begins assessment
   - Then no notification goes to family about mandatory report
   - And existing 48-hour blackout from Story 7.5.2 applies
   - And partner can request extended blackout if needed

4. **AC4: Audit trail sealing**
   - Given a signal involves potential mandatory reporting
   - When family member accesses account
   - Then audit trail of signal is sealed from family account access
   - And no evidence of signal exists in family-visible data
   - And sealing follows patterns from Story 0.5.8

5. **AC5: Law enforcement cooperation protocol**
   - Given law enforcement requests signal information
   - When request comes through documented legal process
   - Then fledgely cooperates with properly documented requests
   - And cooperation requires valid subpoena/warrant
   - And response is handled through legal team, not automated

6. **AC6: Partner capability registration**
   - Given a crisis partner handles mandatory reporting
   - When partner is configured in system
   - Then partner has 'mandatory_reporting' capability flag
   - And partner has documented jurisdiction coverage
   - And partner can indicate if case escalated to mandatory report

## Technical Tasks

### Task 1: Extend CrisisPartner Model for Mandatory Reporting (AC: #1, #6)

Extend existing CrisisPartner from Story 7.5.2 with mandatory reporting capabilities.

**Files:**

- `packages/shared/src/contracts/crisisPartner.ts` (modify)
- `packages/shared/src/contracts/crisisPartner.test.ts` (modify)

**Additions:**

```typescript
// Extend PartnerCapability - already includes 'mandatory_reporting'

// Add mandatory reporting metadata
interface MandatoryReportingCapability {
  partnerId: string
  supportedJurisdictions: JurisdictionCoverage[]
  reportingProtocol: 'partner_direct' | 'partner_coordinated'
  requiresExtendedBlackout: boolean
  averageResponseTimeHours: number | null
}

interface JurisdictionCoverage {
  jurisdictionCode: string // e.g., 'US-CA', 'US-TX', 'UK', 'AU-NSW'
  mandatoryReporterCategory: string[] // e.g., ['healthcare', 'social_work', 'counseling']
  reportingAgency: string // e.g., 'CPS', 'DCFS', 'Child First'
  reportingHotline: string | null // For partner reference only
}

// Signal escalation tracking
interface SignalEscalation {
  signalId: string
  partnerId: string
  escalationType: 'assessment' | 'mandatory_report' | 'law_enforcement_referral'
  escalatedAt: Date
  jurisdiction: string
  sealed: boolean
  sealedAt: Date | null
  // NEVER includes: outcome, report details, family contact
}
```

**Tests:** 25+ tests for new schemas, jurisdiction validation

### Task 2: JurisdictionService for Reporting Requirements (AC: #1, #6)

Create service to determine jurisdiction and mandatory reporting requirements.

**Files:**

- `packages/shared/src/services/jurisdictionService.ts` (new)
- `packages/shared/src/services/jurisdictionService.test.ts` (new)

**Functions:**

```typescript
// Get jurisdiction from family address
function getFamilyJurisdiction(familyId: string): Promise<string>

// Validate jurisdiction code format
function isValidJurisdictionCode(code: string): boolean

// Get jurisdiction from address components
function deriveJurisdictionFromAddress(
  country: string,
  stateProvince: string | null,
  postalCode: string | null
): string

// Check if jurisdiction requires mandatory reporting
function jurisdictionHasMandatoryReporting(jurisdiction: string): boolean

// Get partner coverage for jurisdiction
function getPartnersForJurisdiction(
  jurisdiction: string,
  capability: 'mandatory_reporting'
): Promise<CrisisPartner[]>
```

**Tests:** 30+ tests for jurisdiction parsing, coverage lookup

### Task 3: Signal Sealing Service (AC: #4)

Create service to seal signal data from family access, following patterns from Story 0.5.8.

**Files:**

- `packages/shared/src/services/signalSealingService.ts` (new)
- `packages/shared/src/services/signalSealingService.test.ts` (new)

**Functions:**

```typescript
// Seal a signal from family access
function sealSignalFromFamily(signalId: string): Promise<void>

// Check if signal is sealed
function isSignalSealed(signalId: string): Promise<boolean>

// Get sealed signals for legal request (admin only)
function getSealedSignalForLegalRequest(
  signalId: string,
  legalRequestId: string
): Promise<SealedSignalData | null>

// Verify no family visibility exists
function verifySignalIsolation(signalId: string, familyId: string): Promise<boolean>

// Remove signal from all family-visible collections
function removeFromFamilyCollections(signalId: string, familyId: string): Promise<void>
```

**Tests:** 25+ tests for sealing, isolation verification

### Task 4: Partner Escalation Tracking (AC: #3, #6)

Create service to track when partners escalate signals.

**Files:**

- `packages/shared/src/services/partnerEscalationService.ts` (new)
- `packages/shared/src/services/partnerEscalationService.test.ts` (new)

**Functions:**

```typescript
// Record partner escalation (called via partner webhook callback)
function recordEscalation(
  signalId: string,
  partnerId: string,
  escalationType: SignalEscalation['escalationType']
): Promise<SignalEscalation>

// Extend blackout period for escalated signal
function extendBlackoutPeriod(signalId: string, extensionHours: number): Promise<void>

// Get escalation status (admin only, not family accessible)
function getEscalationStatus(signalId: string): Promise<SignalEscalation | null>

// Mark escalation sealed
function sealEscalation(escalationId: string): Promise<void>
```

**Tests:** 20+ tests for escalation tracking, blackout extension

### Task 5: Legal Request Handler (AC: #5)

Create handler for law enforcement data requests.

**Files:**

- `packages/shared/src/services/legalRequestService.ts` (new)
- `packages/shared/src/services/legalRequestService.test.ts` (new)

**Functions:**

```typescript
// Legal request types
type LegalRequestType = 'subpoena' | 'warrant' | 'court_order' | 'emergency_disclosure'

interface LegalRequest {
  id: string
  requestType: LegalRequestType
  requestingAgency: string
  jurisdiction: string
  documentReference: string // Reference to physical document
  receivedAt: Date
  signalIds: string[] // Signals requested
  status: 'pending_legal_review' | 'approved' | 'denied' | 'fulfilled'
  fulfilledAt: Date | null
  fulfilledBy: string | null // Admin user ID
}

// Log a legal request (admin only)
function logLegalRequest(
  request: Omit<LegalRequest, 'id' | 'status' | 'fulfilledAt' | 'fulfilledBy'>
): Promise<LegalRequest>

// Fulfill a legal request (admin only, requires approval)
function fulfillLegalRequest(
  requestId: string,
  approvedBy: string
): Promise<{ success: boolean; signalData: SealedSignalData[] | null }>

// Verify legal request validity
function validateLegalRequest(request: LegalRequest): boolean
```

**Tests:** 20+ tests for legal request handling

### Task 6: Extend Routing Payload with Jurisdiction (AC: #1)

Modify Story 7.5.2's routing to include enhanced jurisdiction info.

**Files:**

- `packages/shared/src/services/signalRoutingService.ts` (modify)
- `packages/shared/src/services/signalRoutingService.test.ts` (modify)

**Additions:**

```typescript
// Extended routing payload with jurisdiction details
interface EnhancedSignalRoutingPayload extends SignalRoutingPayload {
  jurisdictionDetails: {
    code: string // e.g., 'US-CA'
    country: string // e.g., 'US'
    stateProvince: string | null // e.g., 'CA'
    hasMandatoryReporting: boolean
    mandatoryReporterCategories: string[]
  }
  // Capability hints for partner
  requestedCapabilities: PartnerCapability[]
}

// Build enhanced payload with jurisdiction
function buildEnhancedRoutingPayload(
  signal: SafetySignal,
  childProfile: ChildProfile,
  familyJurisdiction: string
): EnhancedSignalRoutingPayload
```

**Tests:** 15+ tests for enhanced payload

## Dev Notes

### Critical Safety Requirements

1. **Fledgely NEVER makes mandatory reports** - This is fundamental to the architecture. Fledgely provides data to crisis partners who have the training and legal obligation to make reports.

2. **Audit trail sealing is absolute** - Once sealed, family members can never see evidence of the signal. This protects children from retaliation.

3. **Legal requests require human review** - No automated system should fulfill law enforcement requests. Always requires legal team approval.

### Previous Story Patterns to Follow

From **Story 7.5.2** (External Signal Routing):

- SignalRoutingPayload structure
- Partner webhook patterns
- Encryption standards (TLS 1.3, separate keys)
- 48-hour blackout implementation

From **Story 7.5.4** (Safe Adult Designation):

- Data isolation patterns
- Encryption key separation
- Family-invisible storage

From **Story 0.5.8** (Audit Trail Sealing):

- Sealing mechanics
- Admin-only access patterns
- Legal compliance storage

### Architecture Compliance

**Collections:** (isolated, not under family document)

- `signalEscalations` - Tracks partner escalations
- `legalRequests` - Logs law enforcement requests
- `sealedSignals` - References to sealed signal data

**Security Rules:**

- Family members: NO access to escalation/legal collections
- Admin only: Can access with proper authentication
- Audit everything: All access logged

### Testing Requirements

- TDD approach required
- Mock crisis partner callbacks
- Test jurisdiction edge cases (international, multi-state)
- Test sealing completeness (no leaky references)
- Test blackout extension scenarios

### Project Structure Notes

Following established patterns:

- Services in `packages/shared/src/services/`
- Contracts in `packages/shared/src/contracts/`
- Cloud Functions for partner webhook callbacks
- Admin dashboard components in separate epic

### References

- [Source: docs/archive/epics.md#Story-7.5.5 - Mandatory Reporter Pathway]
- [Source: docs/sprint-artifacts/stories/7-5-2-external-signal-routing.md - Routing patterns]
- [Source: docs/sprint-artifacts/stories/7-5-4-safe-adult-designation.md - Isolation patterns]
- [Source: docs/sprint-artifacts/stories/0-5-8-audit-trail-sealing.md - Sealing patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All 6 tasks implemented following TDD approach
- 4267 total tests passing (113 test files)
- New tests: 90+ in crisisPartner, 31 in jurisdictionService, 26 in signalSealingService, 22 in partnerEscalationService, 30 in legalRequestService, 10 in signalRoutingService
- All ACs verified through implementation
- Critical safety requirements enforced: Fledgely NEVER makes mandatory reports, audit trail sealing is absolute, legal requests require human review

### File List

**Modified:**

- `packages/shared/src/contracts/crisisPartner.ts` - Extended with 7.5.5 schemas (escalation, legal request, jurisdiction)
- `packages/shared/src/contracts/crisisPartner.test.ts` - Added 90+ tests for new contracts
- `packages/shared/src/services/signalRoutingService.ts` - Added buildEnhancedRoutingPayload
- `packages/shared/src/services/signalRoutingService.test.ts` - Added 10 enhanced payload tests

**New:**

- `packages/shared/src/services/jurisdictionService.ts` - Jurisdiction determination and mandatory reporting
- `packages/shared/src/services/jurisdictionService.test.ts` - 31 tests
- `packages/shared/src/services/signalSealingService.ts` - Signal sealing from family access
- `packages/shared/src/services/signalSealingService.test.ts` - 26 tests
- `packages/shared/src/services/partnerEscalationService.ts` - Partner escalation tracking
- `packages/shared/src/services/partnerEscalationService.test.ts` - 22 tests
- `packages/shared/src/services/legalRequestService.ts` - Law enforcement request handling
- `packages/shared/src/services/legalRequestService.test.ts` - 30 tests
