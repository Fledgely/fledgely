# Story 7.5.6: Signal Encryption & Isolation

## Status: in-progress

## Story

As a **child**,
I want **my safety signals to be completely inaccessible to my family account**,
So that **no one in my family can ever see that I asked for help**.

## Acceptance Criteria

1. **AC1: Signal stored in isolated collection**
   - Given a child triggers a safety signal
   - When signal is stored
   - Then signal is stored in isolated collection (not under family document)
   - And signal document path does not contain familyId
   - And signal cannot be accessed via family document traversal

2. **AC2: Signal uses separate encryption key**
   - Given a safety signal is created
   - When signal data is encrypted
   - Then signal uses separate encryption key (not family key)
   - And encryption key is stored in isolated key management collection
   - And family encryption key cannot decrypt signal data

3. **AC3: No Firestore Security Rule allows family read access**
   - Given Firestore Security Rules are deployed
   - When any family member attempts to read signal data
   - Then security rules deny access completely
   - And no path traversal allows family access
   - And security rules are tested with adversarial test suite

4. **AC4: Signal excluded from family audit trail**
   - Given a safety signal exists
   - When any family member accesses audit trail
   - Then signal does not appear in ANY family-visible audit entries
   - And no hint of signal activity exists in family data
   - And signal access is logged in separate admin audit

5. **AC5: Admin access requires authorization**
   - Given admin needs to access signal data
   - When admin attempts to access isolated signal
   - Then access requires legal/compliance authorization
   - And all admin access is logged
   - And authorization is validated per-request

6. **AC6: Legal retention requirements**
   - Given signals are retained for legal compliance
   - When retention period is configured
   - Then signals are retained per child protection legal requirements
   - And retention period follows jurisdiction-specific rules
   - And deletion only occurs after legal hold review

## Technical Tasks

### Task 1: Signal Encryption Key Management (AC: #2, #5)

Create isolated encryption key management for safety signals.

**Files:**

- `packages/shared/src/services/signalEncryptionService.ts` (new)
- `packages/shared/src/services/signalEncryptionService.test.ts` (new)

**Types and Functions:**

```typescript
// Signal encryption key metadata (NOT the key itself)
interface SignalEncryptionKey {
  id: string
  signalId: string
  algorithm: 'AES-256-GCM'
  createdAt: Date
  // Key is stored in Cloud KMS or equivalent, NOT in Firestore
  keyReference: string // Reference to Cloud KMS key
}

// Generate encryption key for signal (separate from family key)
function generateSignalEncryptionKey(signalId: string): Promise<SignalEncryptionKey>

// Encrypt signal data with isolated key
function encryptSignalData(
  signalId: string,
  data: Record<string, unknown>
): Promise<{ encryptedData: string; keyId: string }>

// Decrypt signal data (admin only, requires authorization)
function decryptSignalData(
  signalId: string,
  encryptedData: string,
  authorizationId: string
): Promise<Record<string, unknown> | null>

// Verify encryption key is isolated from family
function verifyKeyIsolation(keyId: string, familyId: string): Promise<boolean>
```

**Security Requirements:**

- Encryption keys stored in isolated collection (NOT under family)
- Key references point to Cloud KMS, not plaintext keys
- Family encryption key CANNOT decrypt signal data
- All key operations logged to admin audit

**Tests:** 30+ tests for key generation, encryption, isolation verification

### Task 2: Isolated Signal Storage (AC: #1, #4)

Create isolated storage for safety signals outside family document hierarchy.

**Files:**

- `packages/shared/src/services/isolatedSignalStorageService.ts` (new)
- `packages/shared/src/services/isolatedSignalStorageService.test.ts` (new)

**Types and Functions:**

```typescript
// Isolated signal storage - NO family document reference
interface IsolatedSignal {
  id: string
  // CRITICAL: childId is anonymized/hashed for isolation
  anonymizedChildId: string
  encryptedPayload: string
  encryptionKeyId: string
  createdAt: Date
  jurisdiction: string
  // NO familyId, NO parentIds, NO sibling references
}

// Collection path is NOT under families/
const ISOLATED_SIGNALS_COLLECTION = 'isolatedSafetySignals'

// Store signal in isolated collection
function storeIsolatedSignal(
  signalId: string,
  childId: string,
  encryptedPayload: string,
  encryptionKeyId: string,
  jurisdiction: string
): Promise<IsolatedSignal>

// Get isolated signal (admin only)
function getIsolatedSignal(
  signalId: string,
  authorizationId: string
): Promise<IsolatedSignal | null>

// Anonymize child ID for storage
function anonymizeChildId(childId: string): string

// Verify signal is not in family hierarchy
function verifyIsolatedStorage(signalId: string): Promise<boolean>
```

**Storage Requirements:**

- Collection `isolatedSafetySignals` is at ROOT level (not under families/)
- No familyId field in document
- childId is anonymized/hashed
- All access requires authorization check

**Tests:** 25+ tests for isolation, anonymization, storage verification

### Task 3: Firestore Security Rules for Signal Isolation (AC: #3)

Create and test Firestore Security Rules that enforce complete isolation.

**Files:**

- `packages/firebase-rules/firestore.rules` (modify)
- `packages/firebase-rules/src/isolatedSignals.test.ts` (new)

**Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ISOLATED SIGNALS: Complete family isolation
    match /isolatedSafetySignals/{signalId} {
      // NO READ for any user except admin with specific claim
      allow read: if request.auth != null
                  && request.auth.token.signalAccessAuthorization != null;

      // WRITE only via Cloud Functions (not client)
      allow write: if false;

      // CRITICAL: No path allows family access
    }

    // SIGNAL ENCRYPTION KEYS: Isolated management
    match /signalEncryptionKeys/{keyId} {
      // NO READ for any user except admin with specific claim
      allow read: if request.auth != null
                  && request.auth.token.keyManagementAuthorization != null;

      // WRITE only via Cloud Functions
      allow write: if false;
    }

    // Existing family rules cannot access these collections
    // Path traversal is impossible since collections are at root level
  }
}
```

**Tests:** 25+ adversarial tests for security rules:

- Family member cannot read isolated signals
- Path traversal attacks blocked
- Unauthorized admin access blocked
- Only Cloud Functions can write
- Authorization claims validated

### Task 4: Admin Authorization Service (AC: #5)

Create authorization service for admin signal access.

**Files:**

- `packages/shared/src/services/signalAccessAuthorizationService.ts` (new)
- `packages/shared/src/services/signalAccessAuthorizationService.test.ts` (new)

**Types and Functions:**

```typescript
// Authorization types for signal access
type AuthorizationType = 'legal_request' | 'compliance_review' | 'law_enforcement'

interface SignalAccessAuthorization {
  id: string
  adminUserId: string
  signalId: string
  authorizationType: AuthorizationType
  reason: string
  approvedBy: string
  approvedAt: Date
  expiresAt: Date
  used: boolean
  usedAt: Date | null
}

// Request authorization for signal access
function requestSignalAccessAuthorization(
  adminUserId: string,
  signalId: string,
  authorizationType: AuthorizationType,
  reason: string
): Promise<SignalAccessAuthorization>

// Approve authorization (requires separate approver)
function approveAuthorization(
  authorizationId: string,
  approverId: string
): Promise<SignalAccessAuthorization>

// Validate authorization for access
function validateAuthorization(authorizationId: string, signalId: string): Promise<boolean>

// Mark authorization as used
function markAuthorizationUsed(authorizationId: string): Promise<void>

// Log all authorization operations to admin audit
function logAuthorizationOperation(
  operation: 'requested' | 'approved' | 'denied' | 'used',
  authorizationId: string,
  actorId: string
): Promise<void>
```

**Security Requirements:**

- Authorization requires separate approver (not self-approve)
- All operations logged to admin audit
- Authorizations expire after configurable period
- Each authorization can only be used once

**Tests:** 25+ tests for authorization flow, expiry, logging

### Task 5: Signal Retention Service (AC: #6)

Create service for legal retention requirements.

**Files:**

- `packages/shared/src/services/signalRetentionService.ts` (new)
- `packages/shared/src/services/signalRetentionService.test.ts` (new)

**Types and Functions:**

```typescript
// Jurisdiction-specific retention requirements
interface RetentionPolicy {
  jurisdiction: string
  minimumRetentionDays: number
  maximumRetentionDays: number | null // null = indefinite
  legalBasis: string
}

// Retention status for a signal
interface SignalRetentionStatus {
  signalId: string
  jurisdiction: string
  retentionStartDate: Date
  minimumRetainUntil: Date
  legalHold: boolean
  legalHoldReason: string | null
}

// Default retention policies by jurisdiction
const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    jurisdiction: 'US',
    minimumRetentionDays: 365 * 7,
    maximumRetentionDays: null,
    legalBasis: 'Child Abuse Prevention Act',
  },
  {
    jurisdiction: 'UK',
    minimumRetentionDays: 365 * 6,
    maximumRetentionDays: null,
    legalBasis: 'Children Act 1989',
  },
  // Additional jurisdictions...
]

// Get retention policy for jurisdiction
function getRetentionPolicy(jurisdiction: string): RetentionPolicy

// Check if signal can be deleted
function canDeleteSignal(signalId: string): Promise<{ canDelete: boolean; reason: string }>

// Place legal hold on signal
function placeLegalHold(signalId: string, reason: string): Promise<void>

// Remove legal hold (requires authorization)
function removeLegalHold(signalId: string, authorizationId: string): Promise<void>

// Get retention status
function getRetentionStatus(signalId: string): Promise<SignalRetentionStatus>
```

**Legal Requirements:**

- Minimum retention per jurisdiction-specific child protection laws
- Legal holds prevent deletion regardless of retention period
- All retention operations logged
- Deletion requires authorization after retention period

**Tests:** 20+ tests for retention policies, legal holds, deletion checks

### Task 6: Integrate with Existing Signal Flow (AC: #1, #2, #4)

Modify existing safetySignalService to use isolated storage and encryption.

**Files:**

- `packages/shared/src/services/safetySignalService.ts` (modify)
- `packages/shared/src/services/safetySignalService.test.ts` (modify)

**Modifications:**

```typescript
// Existing triggerSafetySignal function modifications:
async function triggerSafetySignal(
  childId: string,
  platform: SignalPlatform,
  triggerMethod: SignalTriggerMethod,
  deviceId?: string
): Promise<SafetySignal> {
  // 1. Generate isolated encryption key
  const encryptionKey = await generateSignalEncryptionKey(signalId)

  // 2. Encrypt signal payload with isolated key
  const { encryptedData, keyId } = await encryptSignalData(signalId, {
    childId,
    platform,
    triggerMethod,
    deviceId,
    timestamp: new Date(),
  })

  // 3. Store in ISOLATED collection (not family hierarchy)
  const isolatedSignal = await storeIsolatedSignal(
    signalId,
    childId,
    encryptedData,
    keyId,
    jurisdiction
  )

  // 4. Do NOT create any family-visible audit entries
  // (existing audit logging is removed for safety signals)

  // 5. Continue with external routing (Story 7.5.2)
  await routeSignalToPartner(signal, childProfile, jurisdiction)

  return signal
}
```

**Tests:** 15+ tests for integration with existing flow

## Dev Notes

### Critical Safety Requirements

1. **Complete Family Isolation** - Safety signals must be 100% invisible to family accounts. This is non-negotiable.

2. **Encryption Key Separation** - Signal encryption keys MUST be separate from family keys. If a parent has access to family encryption, they still cannot decrypt signals.

3. **No Path Traversal** - Firestore collections must be at ROOT level, not under family documents. This prevents any path-based access.

4. **Authorization Required** - Every admin access requires documented authorization with separate approver.

### Previous Story Patterns to Follow

From **Story 7.5.2** (External Signal Routing):

- TLS 1.3 encryption in transit
- SignalRoutingPayload structure
- Partner webhook patterns

From **Story 7.5.4** (Safe Adult Designation):

- `safeAdultEncryptionService.ts` - encryption key separation pattern
- Family-invisible storage patterns
- Encryption key ID references (not actual keys)

From **Story 7.5.5** (Mandatory Reporter Pathway):

- `signalSealingService.ts` - isolated collections pattern
- `SEALED_SIGNALS_COLLECTION = 'sealedSignals'` at root level
- `removeFromFamilyCollections()` - cleaning family-visible references
- Legal request authorization patterns

### Architecture Compliance

**Collections:** (ROOT level, NOT under families/)

- `isolatedSafetySignals` - Encrypted signal data
- `signalEncryptionKeys` - Key metadata (references to Cloud KMS)
- `signalAccessAuthorizations` - Admin access authorizations
- `signalRetentionStatus` - Retention tracking

**Security Rules:**

- NO family member read access - period
- NO path traversal possible
- Cloud Functions only for writes
- Admin access requires authorization claim

### Testing Requirements

- TDD approach required
- Adversarial security rule tests
- Encryption isolation tests
- Path traversal attack tests
- Authorization flow tests
- Retention policy tests

### Project Structure Notes

Following established patterns:

- Services in `packages/shared/src/services/`
- Security rules in `packages/firebase-rules/`
- Cloud Functions for protected operations
- All tests use vitest with mocked Firebase

### References

- [Source: docs/archive/epics.md#Story-7.5.6 - Signal Encryption & Isolation]
- [Source: docs/sprint-artifacts/stories/7-5-2-external-signal-routing.md - Encryption patterns]
- [Source: docs/sprint-artifacts/stories/7-5-4-safe-adult-designation.md - Key isolation patterns]
- [Source: docs/sprint-artifacts/stories/7-5-5-mandatory-reporter-pathway.md - Sealing and isolation patterns]
- [Source: packages/shared/src/services/signalSealingService.ts - Isolated collection patterns]
- [Source: packages/shared/src/services/safeAdultEncryptionService.ts - Encryption key patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
