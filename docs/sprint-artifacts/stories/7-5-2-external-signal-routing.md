# Story 7.5.2: External Signal Routing

## Status: done

## Story

As a **child who triggers a safety signal**,
I want **my signal to go to trained external resources, not my parents**,
So that **I get help even if my parents are the source of danger**.

## Acceptance Criteria

1. **AC1: Signal routes to external crisis partnership**
   - Given a child triggers the safety signal (from Story 7.5.1)
   - When the signal is processed
   - Then the signal is routed to external crisis partnership (NOT fledgely support)
   - And routing uses secure webhook/API to partner endpoint

2. **AC2: Signal includes appropriate metadata**
   - Given a signal is being routed
   - When the routing payload is constructed
   - Then signal includes: child's age, signal timestamp, family structure (shared custody flag)
   - And signal includes: platform, trigger method, deviceId
   - And signal includes a unique signal reference ID

3. **AC3: Signal excludes sensitive data**
   - Given a signal is being routed
   - When the routing payload is constructed
   - Then signal does NOT include: screenshots, activity data, or parent contact info
   - And signal does NOT include: parent names, emails, or phone numbers
   - And signal does NOT include: any browsing history or monitoring data

4. **AC4: Signal is encrypted**
   - Given a signal is being transmitted
   - When the signal is sent to external partner
   - Then signal is encrypted in transit (TLS 1.3)
   - And signal payload is encrypted at rest in partner handoff queue
   - And encryption keys are separate from family data keys

5. **AC5: No family notification for 48 hours**
   - Given a signal has been routed
   - When any system event would normally trigger family notification
   - Then no notification goes to ANY family member for minimum 48 hours
   - And signal activity is excluded from family audit trail

6. **AC6: Jurisdiction-appropriate routing**
   - Given signal routing includes jurisdiction information
   - When partner receives signal
   - Then family's jurisdiction (state/country from profile) is included
   - And partner can route to jurisdiction-appropriate resources

## Technical Tasks

### Task 1: Create CrisisPartner Data Model (AC: #1, #6)

Create Zod schemas and types for crisis partner configuration.

**Files:**

- `packages/shared/src/contracts/crisisPartner.ts` (new)
- `packages/shared/src/contracts/crisisPartner.test.ts` (new)

**Types:**

```typescript
interface CrisisPartner {
  id: string
  name: string
  webhookUrl: string // Encrypted in storage
  apiKeyHash: string // Hashed API key
  active: boolean
  jurisdictions: string[] // List of supported jurisdictions (e.g., ['US', 'US-CA', 'UK'])
  priority: number // For jurisdiction fallback ordering
  capabilities: PartnerCapability[]
  createdAt: Date
  updatedAt: Date
}

type PartnerCapability =
  | 'crisis_counseling'
  | 'mandatory_reporting'
  | 'safe_adult_notification'
  | 'law_enforcement_coordination'

interface SignalRoutingPayload {
  signalId: string
  childAge: number // Age at time of signal
  signalTimestamp: Date
  familyStructure: 'single_parent' | 'two_parent' | 'shared_custody' | 'caregiver'
  jurisdiction: string // e.g., 'US-CA' or 'UK'
  platform: 'web' | 'chrome_extension' | 'android'
  triggerMethod: 'logo_tap' | 'keyboard_shortcut' | 'swipe_pattern'
  deviceId: string | null
  // EXPLICITLY NO: parentInfo, screenshots, activityData, browsingHistory
}

interface SignalRoutingResult {
  signalId: string
  partnerId: string
  routedAt: Date
  acknowledged: boolean
  acknowledgedAt: Date | null
  partnerReferenceId: string | null // Partner's ticket/case ID
}
```

**Tests:** 20+ tests for schema validation, factory functions

### Task 2: SignalRoutingService (AC: #1, #2, #3, #4, #6)

Create service for routing signals to external crisis partners.

**Files:**

- `packages/shared/src/services/signalRoutingService.ts` (new)
- `packages/shared/src/services/signalRoutingService.test.ts` (new)

**Functions:**

```typescript
// Route a safety signal to appropriate crisis partner
function routeSignalToPartner(
  signal: SafetySignal,
  childProfile: { birthDate: Date; familyStructure: FamilyStructure },
  familyJurisdiction: string
): Promise<SignalRoutingResult>

// Build routing payload (ensuring no sensitive data leaks)
function buildRoutingPayload(
  signal: SafetySignal,
  childAge: number,
  familyStructure: FamilyStructure,
  jurisdiction: string
): SignalRoutingPayload

// Select best partner for jurisdiction
function selectPartnerForJurisdiction(
  jurisdiction: string,
  partners: CrisisPartner[]
): CrisisPartner | null

// Send encrypted payload to partner webhook
function sendToPartnerWebhook(
  partner: CrisisPartner,
  payload: SignalRoutingPayload
): Promise<{ success: boolean; partnerRefId: string | null }>

// Update signal status after routing
function markSignalRouted(signalId: string, routingResult: SignalRoutingResult): Promise<void>

// Get routing history for signal (admin only)
function getRoutingHistory(signalId: string): Promise<SignalRoutingResult[]>
```

**Tests:** 30+ tests covering routing logic, payload validation, partner selection

### Task 3: Create Routing Trigger (Firestore onCreate) (AC: #1, #4)

Create Cloud Function that triggers on signal creation.

**Files:**

- `apps/functions/src/triggers/onSafetySignalCreated.ts` (new)
- `apps/functions/src/triggers/onSafetySignalCreated.test.ts` (new)

**Implementation:**

```typescript
// Firestore trigger: /safetySignals/{signalId}
export const onSafetySignalCreated = onDocumentCreated(
  'safetySignals/{signalId}',
  async (event) => {
    const signal = event.data?.data() as SafetySignal

    // 1. Get child profile (for age calculation)
    // 2. Get family jurisdiction
    // 3. Build routing payload (NO sensitive data)
    // 4. Select partner
    // 5. Send to partner webhook
    // 6. Update signal status to 'sent'
    // 7. Log to admin audit (NOT family audit)
  }
)
```

**Tests:** 15+ tests for trigger behavior, error handling

### Task 4: Partner Webhook Integration (AC: #1, #4)

Create HTTP client for sending signals to partners with proper encryption.

**Files:**

- `apps/functions/src/services/crisisPartnerClient.ts` (new)
- `apps/functions/src/services/crisisPartnerClient.test.ts` (new)

**Implementation:**

```typescript
interface CrisisPartnerClient {
  // Send signal with retry logic
  sendSignal(partner: CrisisPartner, payload: SignalRoutingPayload): Promise<WebhookResponse>

  // Verify partner webhook is reachable (admin health check)
  checkPartnerHealth(partner: CrisisPartner): Promise<HealthCheckResult>

  // Handle partner acknowledgment callback
  handlePartnerCallback(
    signalId: string,
    partnerRefId: string,
    acknowledgmentData: unknown
  ): Promise<void>
}
```

**Features:**

- TLS 1.3 required for all connections
- Request signing with partner API key
- Payload encryption before transmission
- Retry with exponential backoff (3 attempts)
- Timeout: 30 seconds
- NO logging of payload contents

**Tests:** 20+ tests for HTTP client, error handling, encryption

### Task 5: Signal Payload Encryption (AC: #4)

Create encryption layer for signal payloads.

**Files:**

- `apps/functions/src/services/signalEncryptionService.ts` (new)
- `apps/functions/src/services/signalEncryptionService.test.ts` (new)

**Implementation:**

```typescript
// Encrypt payload for transit to partner
function encryptPayloadForPartner(
  payload: SignalRoutingPayload,
  partnerPublicKey: string
): EncryptedPayload

// Decrypt partner response (if any)
function decryptPartnerResponse(encryptedResponse: string, ourPrivateKey: string): unknown

// Generate key pair for fledgely<>partner communication
function generatePartnerKeyPair(): { publicKey: string; privateKey: string }
```

**Security Requirements:**

- Use AES-256-GCM for symmetric encryption
- Use RSA-OAEP for key exchange
- Partner public keys stored encrypted in Firestore
- Private keys in Secret Manager (not code)
- No plaintext logging of encrypted content

**Tests:** 15+ tests for encryption/decryption, key management

### Task 6: Family Notification Blackout Integration (AC: #5)

Integrate with the 48-hour blackout system (prepare for Story 7.5.7).

**Files:**

- `packages/shared/src/services/signalBlackoutService.ts` (new)
- `packages/shared/src/services/signalBlackoutService.test.ts` (new)

**Implementation:**

```typescript
// Check if a signal is in blackout period
function isSignalInBlackout(signalId: string): boolean

// Start blackout period for signal
function startBlackoutPeriod(signalId: string, durationHours: number = 48): BlackoutRecord

// Extend blackout period (partner request)
function extendBlackoutPeriod(
  signalId: string,
  additionalHours: number,
  partnerAuthorization: string
): BlackoutRecord

// Get blackout status
function getBlackoutStatus(signalId: string): BlackoutStatus

interface BlackoutRecord {
  signalId: string
  startedAt: Date
  expiresAt: Date
  extendedBy: string | null // Partner ID if extended
  active: boolean
}
```

**Tests:** 15+ tests for blackout logic

### Task 7: Admin Partner Management (AC: #1, #6)

Create admin functions for managing crisis partners.

**Files:**

- `apps/functions/src/http/admin/crisisPartners.ts` (new)
- `apps/functions/src/http/admin/crisisPartners.test.ts` (new)

**Endpoints:**

```typescript
// Admin-only endpoints (require admin auth + MFA)

// List all crisis partners
GET /admin/crisis-partners

// Add new crisis partner
POST /admin/crisis-partners

// Update partner configuration
PUT /admin/crisis-partners/:partnerId

// Deactivate partner (never delete)
POST /admin/crisis-partners/:partnerId/deactivate

// Test partner webhook
POST /admin/crisis-partners/:partnerId/test

// View routing statistics
GET /admin/crisis-partners/:partnerId/stats
```

**Tests:** 15+ tests for admin endpoints

### Task 8: Firestore Security Rules Update (AC: #4)

Extend security rules for routing data.

**Files:**

- `packages/firebase-rules/firestore.rules` (modify)

**Rules:**

```
// Crisis partners - Admin only
match /crisisPartners/{partnerId} {
  allow read: if isAdmin();
  allow write: if isAdmin() && request.auth.token.mfa == true;
}

// Signal routing results - Admin only
match /signalRoutingResults/{resultId} {
  allow read: if false; // Cloud Functions only via Admin SDK
  allow write: if false;
}

// Signal blackout records - System only
match /signalBlackouts/{blackoutId} {
  allow read: if false;
  allow write: if false;
}
```

### Task 9: Integration Tests (AC: All)

Create integration tests for complete routing flow.

**Files:**

- `apps/functions/src/triggers/__tests__/signalRouting.integration.test.ts` (new)

**Test Scenarios:**

1. Signal creation triggers routing function
2. Correct partner selected for jurisdiction
3. Payload contains ONLY allowed fields
4. Payload does NOT contain screenshots/activity/parent info
5. Partner webhook receives encrypted payload
6. Signal status updated to 'sent' on success
7. Blackout period started on successful routing
8. Retry on partner failure
9. Fallback partner used if primary unavailable
10. Admin audit logged (NOT family audit)
11. Different jurisdictions route correctly

**Tests:** 20+ integration tests

## Dev Notes

### Critical Safety Requirements

**NEVER include in routing payload:**

- Parent names, emails, phone numbers
- Screenshots or activity data
- Browsing history
- Location data
- Sibling information
- Family financial information

**ALWAYS include in routing payload:**

- Child age (not birthdate)
- Signal timestamp
- Family structure (shared custody flag)
- Jurisdiction
- Platform and trigger method
- Signal reference ID

### Previous Story Learnings (Story 7.5.1)

From Story 7.5.1 implementation:

- SafetySignal data model in `packages/shared/src/contracts/safetySignal.ts`
- SafetySignalService in `packages/shared/src/services/safetySignalService.ts`
- Signals stored in isolated `safetySignals` collection
- Security rules block all family access
- Status transitions: queued → pending → sent → delivered → acknowledged
- 214 tests covering signal creation and queuing

**Key patterns to follow:**

- Use existing `createSafetySignal` function from safetySignalService
- Use existing status update functions
- Follow same TDD approach with Vitest
- Use existing Zod schema patterns

### Architecture Patterns

**From Epic 0.5 (Safe Account Escape):**

- Isolated collections for sensitive data
- Admin-only access via Security Rules
- Sealed audit trails
- 72-hour notification stealth pattern

**From Crisis Allowlist (Epic 7):**

- Crisis resources are NEVER captured
- Zero data path for sensitive information
- Fledgely gets out of the way; professionals handle crisis

### External Integration Notes

**Webhook Requirements:**

- Partners must provide HTTPS endpoint (TLS 1.3)
- Partners must accept JSON payloads
- Partners should acknowledge receipt within 30 seconds
- Partners may provide callback endpoint for status updates

**Partner Onboarding (Admin Process):**

1. Partner provides webhook URL + public key
2. Admin generates shared API key
3. Admin tests webhook connectivity
4. Partner added to jurisdiction routing table

### Testing Standards

- TDD approach: Write tests first
- Minimum 150 tests across all tasks
- Unit tests for each service function
- Integration tests for complete routing flow
- Mock external webhook calls in tests
- Test encryption/decryption round-trips
- Adversarial tests for data leakage prevention

### Dependencies

- **Story 7.5.1:** Hidden Safety Signal Access - signals to route (DONE)
- **Story 7.5.6:** Signal Encryption & Isolation - enhanced encryption
- **Story 7.5.7:** 48-Hour Family Notification Blackout - blackout implementation

### References

- [Source: docs/epics/epic-list.md#Story-7.5.2 - External Signal Routing]
- [Source: docs/sprint-artifacts/stories/7-5-1-hidden-safety-signal-access.md - Signal infrastructure]
- [Source: docs/architecture/project-context-analysis.md - Crisis invisibility patterns]
- [Source: docs/sprint-artifacts/stories/0-5-7-72-hour-notification-stealth.md - Notification blackout patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 9 tasks completed with 329 total tests (exceeds 150 minimum requirement)
- Task 1: CrisisPartner Data Model - 81 tests (crisisPartner.ts)
- Task 2: SignalRoutingService - 39 tests (signalRoutingService.ts)
- Task 3: Routing Trigger Function - 25 tests (onSafetySignalCreated.ts)
- Task 4: Partner Webhook Integration - 38 tests (crisisPartnerClient.ts)
- Task 5: Signal Payload Encryption - 31 tests (signalEncryptionService.ts)
- Task 6: Blackout Integration - 33 tests (signalBlackoutService.ts)
- Task 7: Admin Partner Management - 34 tests (partnerAdminService.ts)
- Task 8: Security Rules Update - 24 tests (crisisPartnerIsolation.rules.test.ts)
- Task 9: Integration Tests - 24 tests (signalRouting.integration.test.ts)
- TDD approach followed throughout - tests written before implementation
- All acceptance criteria verified with comprehensive test coverage

### File List

**New Files (shared package):**

- packages/shared/src/contracts/crisisPartner.ts
- packages/shared/src/contracts/crisisPartner.test.ts
- packages/shared/src/services/signalRoutingService.ts
- packages/shared/src/services/signalRoutingService.test.ts
- packages/shared/src/services/signalBlackoutService.ts
- packages/shared/src/services/signalBlackoutService.test.ts
- packages/shared/src/services/**tests**/integration/signalRouting.integration.test.ts

**New Files (functions package):**

- apps/functions/src/triggers/onSafetySignalCreated.ts
- apps/functions/src/triggers/onSafetySignalCreated.test.ts
- apps/functions/src/services/crisisPartnerClient.ts
- apps/functions/src/services/crisisPartnerClient.test.ts
- apps/functions/src/services/signalEncryptionService.ts
- apps/functions/src/services/signalEncryptionService.test.ts
- apps/functions/src/services/partnerAdminService.ts
- apps/functions/src/services/partnerAdminService.test.ts

**New Files (firebase-rules package):**

- packages/firebase-rules/**tests**/crisisPartnerIsolation.rules.test.ts

**Modified Files:**

- packages/shared/src/index.ts (exports added)
- packages/firebase-rules/firestore.rules (security rules added)
