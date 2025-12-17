# Story 7.5.2: External Signal Routing

**Epic**: 7.5 - Child Safety Signal (Survivor Advocate)
**Status**: Done
**Priority**: Critical (Child Safety)

---

## User Story

As a **child who triggers a safety signal**,
I want **my signal to go to trained external resources, not my parents**,
So that **I get help even if my parents are the source of danger**.

---

## Acceptance Criteria

### AC1: Signal Routed to External Crisis Partnership
**Given** a child triggers the safety signal
**When** signal is processed by the server
**Then** signal is routed to external crisis partnership (NOT fledgely support)
**And** fledgely acts only as a pass-through, not a responder

### AC2: Signal Contains Safe Minimal Payload
**Given** a signal is prepared for external routing
**When** building the signal payload
**Then** signal includes: child's age, signal timestamp, family structure (shared custody flag)
**And** signal does NOT include: screenshots, activity data, or parent contact info
**And** signal includes jurisdiction for appropriate resource routing

### AC3: Signal Encrypted in Transit and at Rest
**Given** a signal is being transmitted to external partner
**When** the signal is sent and stored
**Then** signal is encrypted in transit (TLS 1.3)
**And** signal payload is encrypted at rest using partner's public key
**And** fledgely cannot decrypt the signal content after encryption

### AC4: 48-Hour Family Notification Blackout Enforced
**Given** a child triggers a safety signal
**When** signal is processed
**Then** no notification goes to ANY family member for minimum 48 hours
**And** no audit trail entry is created that family can see
**And** no behavioral change is visible in the app for family members

### AC5: Jurisdiction-Appropriate Routing
**Given** a safety signal with jurisdiction information
**When** routing to external resources
**Then** signal is routed to jurisdiction-appropriate crisis resource when possible
**And** fallback to national crisis resource if jurisdiction-specific unavailable
**And** routing decision is logged for compliance (not visible to family)

### AC6: Offline Signals Routed on Connectivity
**Given** a signal was queued while offline (from Story 7.5.1)
**When** device regains connectivity
**Then** queued signals are processed through external routing
**And** routing uses same encryption and privacy guarantees
**And** original timestamp is preserved for partner context

---

## Technical Tasks

### Task 1: Create External Signal Payload Schema
- [x] Define `ExternalSignalPayload` Zod schema in @fledgely/contracts
- [x] Include: age, timestamp, jurisdiction, custody structure flag
- [x] Explicitly exclude: parentId, familyId, screenshots, activityData
- [x] Add payload validation that rejects disallowed fields
- [x] Create `SignalRoutingConfig` schema for partner configuration

### Task 2: Create Signal Routing Service
- [x] Create `SignalRoutingService` in `apps/web/src/services/`
- [x] Implement jurisdiction detection from child's profile/device
- [x] Create partner routing table with jurisdiction mappings
- [x] Implement fallback routing for unknown jurisdictions
- [x] Add logging for compliance (stored in isolated collection)

### Task 3: Create External Partner API Adapter
- [x] Define `CrisisPartnerAdapter` interface
- [x] Create mock adapter for development/testing
- [x] Implement webhook-style notification to partner endpoint
- [x] Add partner acknowledgment handling
- [x] Create partner registry with public keys for encryption

### Task 4: Implement Signal Encryption for External Delivery
- [x] Create `ExternalSignalEncryption` service
- [x] Implement hybrid encryption (RSA + AES-GCM)
- [x] Partner public key management (stored in Firestore)
- [x] Ensure fledgely cannot decrypt after encryption
- [x] Add encryption key rotation support

### Task 5: Create Cloud Function for Signal Processing
- [x] Create `processSignal` Cloud Function triggered on safety-signal write
- [x] Extract minimal payload from queued signal
- [x] Encrypt payload with partner's public key
- [x] Call partner webhook with encrypted payload
- [x] Update signal status (without leaking to family)

### Task 6: Implement 48-Hour Blackout Enforcement
- [x] Create `NotificationBlackoutService`
- [x] Intercept all family notifications during blackout period
- [x] Suppress audit trail entries for blackout duration
- [x] Ensure no UI behavioral changes during blackout
- [x] Store blackout status in isolated collection (not family-accessible)

### Task 7: Update SafetySignalQueueService for Routing
- [x] Update `SignalApiService.sendSignal` to use routing service
- [x] Pass jurisdiction to routing service
- [x] Handle routing failures with appropriate retry strategy
- [x] Ensure status updates don't leak to family

### Task 8: Write Comprehensive Test Suite
- [x] Unit tests for payload schema validation (forbidden fields rejected)
- [x] Unit tests for jurisdiction routing logic
- [x] Unit tests for partner encryption
- [x] Integration tests for full signal → route → partner flow
- [x] Adversarial tests for payload leakage prevention
- [x] Blackout enforcement tests

---

## Dev Notes

### Critical Safety Requirements

**INV-002: Safety signals NEVER visible to family**
This story extends INV-002 to external routing:
- External payload must contain minimal information
- No family identifiers that could allow parent to trace back
- Partner receives only what's needed to help child

**PAYLOAD MINIMIZATION**
The external payload should contain ONLY:
```typescript
interface ExternalSignalPayload {
  // Child context (anonymized)
  childAge: number;               // Age in years
  hasSharedCustody: boolean;      // Custody structure hint

  // Signal metadata
  signalTimestamp: string;        // ISO timestamp
  signalId: string;               // For deduplication

  // Routing info
  jurisdiction: string;           // State/country code
  devicePlatform: SignalDeviceType;

  // NO: parentId, familyId, childName, email, phone, screenshots, activityData
}
```

### Architecture References

From Story 7.5.1 implementation:
- **SafetySignalQueueService**: `apps/web/src/services/SafetySignalQueueService.ts`
- **Safety signal schemas**: `packages/contracts/src/safetySignal.schema.ts`
- **Firestore rules**: `packages/firebase-rules/firestore.rules`

### Partner Integration Design

**Phase 1 (MVP - This Story):**
- Single partner endpoint (webhook URL in environment config)
- Partner provides public key for payload encryption
- Acknowledgment via HTTP response
- No real-time status updates

**Phase 2 (Future Stories):**
- Multiple partners with jurisdiction routing
- Bidirectional status updates
- Partner-initiated callbacks for follow-up

### Cloud Function Structure

```typescript
// functions/src/safetySignal/processSignal.ts
export const processSignal = functions.firestore
  .document('safety-signals/{signalId}')
  .onCreate(async (snapshot, context) => {
    const signal = snapshot.data();

    // 1. Build minimal external payload
    const payload = buildExternalPayload(signal);

    // 2. Get partner config for jurisdiction
    const partner = await getPartnerForJurisdiction(signal.jurisdiction);

    // 3. Encrypt payload with partner's public key
    const encrypted = await encryptForPartner(payload, partner.publicKey);

    // 4. Send to partner webhook
    const response = await sendToPartner(partner.webhookUrl, encrypted);

    // 5. Update signal status (isolated from family)
    await updateSignalStatus(signalId, response.acknowledged ? 'received' : 'sent');

    // 6. Initiate 48-hour blackout
    await initiateBlackout(signal.childId, 48 * 60 * 60 * 1000);
  });
```

### Blackout Implementation

The 48-hour blackout must:
1. Store blackout status in `/signal-blackouts/{childId}` (isolated)
2. All notification services check blackout before sending
3. Audit trail service skips entries during blackout
4. No observable behavioral change in family dashboard

### Encryption Design

**Hybrid Encryption (RSA-OAEP + AES-GCM):**
1. Generate random AES-256 key per signal
2. Encrypt payload with AES-GCM
3. Encrypt AES key with partner's RSA public key
4. Send: encrypted key + encrypted payload + IV
5. Partner decrypts AES key with private RSA, then payload

This ensures:
- Forward secrecy (each signal has unique key)
- Fledgely cannot decrypt (no access to partner's private key)
- Standard crypto primitives available in Cloud Functions

### Testing Strategy

**Unit Tests:**
- Payload schema rejects forbidden fields
- Jurisdiction routing selects correct partner
- Encryption produces valid ciphertext
- Blackout service correctly suppresses

**Integration Tests:**
- Full flow: signal trigger → queue → process → route
- Offline → online signal routing
- Multiple signals in quick succession

**Adversarial Tests:**
- Attempt to add screenshots to payload
- Attempt to include parent contact info
- Attempt to read blackout status from family account
- Attempt to trace signal from audit trail

---

## Dependencies

### Required (Before Implementation)
- Story 7.5.1 (Hidden Safety Signal Access) - DONE
- SafetySignalQueueService with API integration point - DONE
- Firestore security rules for safety-signals - DONE

### Provides (For Later Stories)
- Story 7.5.3 (Signal Confirmation) - needs routing status
- Story 7.5.4 (Safe Adult Designation) - extends routing with safe adult
- Story 7.5.5 (Mandatory Reporter Pathway) - partner receives signal
- Story 7.5.7 (48-Hour Blackout) - blackout service implemented here

---

## Accessibility Requirements

- N/A for this story (backend routing, no UI)
- All logging uses accessible formats for compliance review
- Partner API documentation includes accessibility considerations

---

## Out of Scope

- Signal confirmation UI (Story 7.5.3)
- Safe adult designation (Story 7.5.4)
- Mandatory reporter pathway (Story 7.5.5)
- Full encryption key rotation system (Story 7.5.6)
- Configurable blackout duration (Story 7.5.7)
- Real-time partner status updates

---

## Definition of Done

- [x] All acceptance criteria verified
- [x] Unit tests passing (294 tests total)
- [x] Integration tests passing
- [x] Adversarial tests passing (45 payload minimization tests)
- [x] No TypeScript errors
- [x] Code reviewed
- [x] Documentation updated
- [x] Mock partner integration tested end-to-end
