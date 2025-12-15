# Story 0.5.8: Audit Trail Sealing

**Status:** ready-for-dev

---

## Story

As **the system**,
I want **audit trail entries related to escape actions to be sealed from abuser view**,
So that **victims' safety planning isn't revealed through activity logs**.

---

## Acceptance Criteria

### AC1: Escape Action Audit Entry Sealing
**Given** an escape action (sever parent, unenroll device, disable location, stealth activation) has been executed
**When** the audit entry is created for the action
**Then** the entry is marked with `sealed: true` flag
**And** the entry is stored in compliance-only storage (`adminAuditLog`)
**And** the entry is NOT copied to the family-visible `familyAuditLog`

### AC2: Family Audit Trail Query Filtering
**Given** the abuser (remaining family member) queries the family audit trail
**When** the query executes against `familyAuditLog`
**Then** entries with `sealed: true` are NOT included in results
**And** the query includes implicit `WHERE sealed != true` filtering
**And** no error or indication of filtered entries is returned

### AC3: Timestamp Continuity Preservation
**Given** sealed entries exist in the audit trail timeline
**When** the abuser views the family audit trail
**Then** timestamps appear continuous with no suspicious gaps
**And** the timeline shows normal activities before and after escape actions
**And** no "missing time" indicators appear in any UI

### AC4: Compliance-Only Access Control
**Given** a sealed audit entry exists
**When** a legal/compliance request is made for the entry
**Then** access requires `isComplianceTeam` OR `isLegalTeam` custom claim
**And** access request is logged to a separate `complianceAccessLog`
**And** the log includes: requester ID, entry ID, justification, timestamp

### AC5: Export and Report Sealing
**Given** sealed audit entries exist for a family
**When** any data export is requested (GDPR, support, etc.)
**Then** sealed entries are NOT included in family-visible exports
**And** sealed entries ARE included in compliance-level exports (with authorization)
**And** analytics dashboards do NOT reflect sealed activity

### AC6: Analytics Exclusion
**Given** sealed audit entries exist
**When** family analytics are calculated (activity summaries, reports)
**Then** sealed entries are excluded from all family-visible metrics
**And** no spike/drop patterns reveal the existence of sealed entries
**And** compliance-only analytics can include sealed data with authorization

### AC7: Seal Persistence
**Given** an audit entry has been sealed
**When** time passes (days, months, years)
**Then** the seal persists indefinitely
**And** the seal can ONLY be removed by court order or legal compulsion
**And** any unseal operation requires `isLegalTeam` claim + documented order
**And** unseal operations are logged with full justification chain

### AC8: Retroactive Sealing Support
**Given** escape actions were executed before this story
**When** a safety team member requests retroactive sealing
**Then** existing escape-related audit entries can be sealed
**And** the sealing operation is itself logged to compliance audit
**And** retroactive seal includes all associated entries (device commands, notifications deleted, etc.)

### AC9: Cross-Collection Seal Propagation
**Given** an escape action affects multiple collections (audit, notifications, location history)
**When** the sealing is applied
**Then** ALL related entries across collections are sealed
**And** no partial sealing leaves data leakage vectors
**And** seal propagation is atomic (all or nothing)

---

## Tasks / Subtasks

### Task 1: Create Audit Sealing Data Model (AC: #1, #7)
- [ ] 1.1 Define `SealedAuditEntry` schema extending base audit entry
- [ ] 1.2 Add `sealedAt: Timestamp` field to track when seal was applied
- [ ] 1.3 Add `sealedBy: string` field (safety agent who executed escape)
- [ ] 1.4 Add `sealReason: string` field (escape action type)
- [ ] 1.5 Add `relatedEntryIds: string[]` for cross-collection references
- [ ] 1.6 Ensure `sealed: true` field is indexed for query filtering

### Task 2: Create Family Audit Query Service (AC: #2, #3)
- [ ] 2.1 Create utility function `queryFamilyAuditLog` in `apps/functions/src/utils/auditTrail.ts`
- [ ] 2.2 Implement implicit `sealed != true` filtering in all family queries
- [ ] 2.3 Ensure query returns continuous timestamps (no gap indication)
- [ ] 2.4 Add pagination support with sealed-aware cursor logic
- [ ] 2.5 Create unit tests for filtered query behavior

### Task 3: Create Compliance Access Function (AC: #4)
- [ ] 3.1 Create callable function `getSealedAuditEntries` in `apps/functions/src/callable/`
- [ ] 3.2 Validate caller has `isComplianceTeam` OR `isLegalTeam` role
- [ ] 3.3 Accept input: familyId, dateRange, entryTypes[], justification
- [ ] 3.4 Log access to `complianceAccessLog` with full context
- [ ] 3.5 Return sealed entries with integrity hash verification
- [ ] 3.6 **CRITICAL**: Never include in response unless caller is verified compliance/legal

### Task 4: Update Export Functions (AC: #5)
- [ ] 4.1 Audit existing export functions for sealed entry inclusion
- [ ] 4.2 Add `excludeSealed: true` parameter to family-level exports
- [ ] 4.3 Create separate `complianceExport` function for authorized exports
- [ ] 4.4 Ensure GDPR export respects sealing for family members
- [ ] 4.5 Test that export files contain no sealed data for family requesters

### Task 5: Update Analytics Calculations (AC: #6)
- [ ] 5.1 Audit existing analytics queries for sealed entry handling
- [ ] 5.2 Add `WHERE sealed != true` to all family-visible aggregations
- [ ] 5.3 Ensure activity summaries exclude sealed events
- [ ] 5.4 Verify no pattern analysis can detect sealed entry existence
- [ ] 5.5 Test analytics before/after escape action to verify continuity

### Task 6: Create Unseal Function (AC: #7)
- [ ] 6.1 Create callable function `unsealAuditEntries` (legal team only)
- [ ] 6.2 Validate caller has `isLegalTeam` role (compliance alone NOT sufficient)
- [ ] 6.3 Accept input: entryIds[], courtOrderReference, legalJustification
- [ ] 6.4 Require minimum 100-char justification for compliance
- [ ] 6.5 Log unseal operation to `adminAuditLog` with full chain of custody
- [ ] 6.6 **CRITICAL**: Unseal only reveals to compliance/legal, NOT to family

### Task 7: Create Retroactive Sealing Function (AC: #8)
- [ ] 7.1 Create callable function `sealEscapeAuditEntries`
- [ ] 7.2 Validate caller has `isSafetyTeam` role
- [ ] 7.3 Accept input: safetyRequestId, familyId, entryIds[] (optional)
- [ ] 7.4 Auto-discover related entries if entryIds not provided
- [ ] 7.5 Apply seal atomically to all related entries
- [ ] 7.6 Log sealing operation to sealed admin audit

### Task 8: Implement Cross-Collection Seal Propagation (AC: #9)
- [ ] 8.1 Create utility function `propagateSealToRelatedCollections`
- [ ] 8.2 Identify all collections that may contain escape-related data
- [ ] 8.3 Collections: adminAuditLog, deviceCommands, notificationQueue, locationHistory
- [ ] 8.4 Use Firestore transactions for atomicity
- [ ] 8.5 Handle batch limits (500) with chunking
- [ ] 8.6 Verify no partial seal state possible

### Task 9: Add Firestore Indexes (AC: #2)
- [ ] 9.1 Add composite index for `familyAuditLog` with `sealed` + `timestamp`
- [ ] 9.2 Add composite index for `adminAuditLog` with `sealed` + `action` + `timestamp`
- [ ] 9.3 Update `firestore.indexes.json` with new indexes
- [ ] 9.4 Document index deployment requirements

### Task 10: Write Tests (All AC)
- [ ] 10.1 Unit tests for sealed entry schema validation
- [ ] 10.2 Integration tests for family audit query filtering
- [ ] 10.3 Test timestamp continuity after sealing
- [ ] 10.4 Test compliance access with proper authorization
- [ ] 10.5 Test compliance access denied without authorization
- [ ] 10.6 Test export exclusion of sealed entries
- [ ] 10.7 Test analytics exclusion of sealed entries
- [ ] 10.8 Test seal persistence over time
- [ ] 10.9 Test unseal with legal authorization
- [ ] 10.10 Test retroactive sealing
- [ ] 10.11 Test cross-collection propagation atomicity
- [ ] 10.12 Security tests: family member cannot access sealed entries

---

## Dev Notes

### Critical Safety Requirements
This feature protects abuse victims from having their escape planning discovered through audit logs. Implementation errors could:
1. **Reveal escape actions** - Abuser sees victim severed access, location disabled, etc.
2. **Create suspicious gaps** - Missing timestamps alert abuser to hidden activity
3. **Leak through exports** - GDPR export includes sealed entries
4. **Expose via analytics** - Activity drop reveals stealth period

Key invariants:
1. **NEVER** include sealed entries in any family-accessible query
2. **NEVER** create timestamp gaps that reveal sealing occurred
3. **NEVER** include sealed entries in family exports
4. **NEVER** reflect sealed activity in family analytics
5. **ALWAYS** log compliance access with full justification
6. **ALWAYS** require legal team for unseal operations
7. **ALWAYS** propagate seals atomically across collections

### Architecture Patterns

**Sealed Audit Entry Schema:**
```typescript
// Extended from base audit entry
interface SealedAuditEntry {
  // Base fields
  action: string
  resourceType: string
  resourceId: string
  performedBy: string
  timestamp: Timestamp

  // Sealing fields
  sealed: true                    // Required for filtering
  sealedAt: Timestamp             // When seal was applied
  sealedBy: string                // Agent who sealed (or 'system')
  sealReason: 'escape-action' | 'safety-request' | 'child-safety'
  relatedEntryIds?: string[]      // Cross-collection references
  integrityHash: string           // Tamper detection

  // Context fields
  familyId: string
  safetyRequestId?: string
  affectedUserIds?: string[]
}
```

**Compliance Access Log Schema:**
```typescript
// /complianceAccessLog/{entryId}
interface ComplianceAccessLog {
  accessedEntryId: string         // What was accessed
  accessedEntryType: 'sealed-audit' | 'sealed-notification' | 'sealed-location'
  accessedAt: Timestamp
  accessedBy: string              // Compliance/legal team member UID
  accessReason: string            // Justification (min 50 chars)
  legalReference?: string         // Court order, subpoena ref if applicable
  integrityHash: string
}
```

**Family Audit Query Pattern:**
```typescript
// ALWAYS filter out sealed entries
async function queryFamilyAuditLog(
  familyId: string,
  options: { limit?: number; startAfter?: Timestamp }
): Promise<AuditEntry[]> {
  const query = db
    .collection('familyAuditLog')
    .where('familyId', '==', familyId)
    .where('sealed', '!=', true)  // CRITICAL: Always filter
    .orderBy('sealed')             // Required for inequality
    .orderBy('timestamp', 'desc')
    .limit(options.limit || 50)

  // Handle startAfter for pagination
  if (options.startAfter) {
    query.startAfter(false, options.startAfter) // sealed=false first
  }

  const snapshot = await query.get()
  return snapshot.docs.map(doc => doc.data() as AuditEntry)
}
```

**Seal Propagation Pattern:**
```typescript
async function sealEscapeAction(
  safetyRequestId: string,
  familyId: string,
  actionType: string
): Promise<void> {
  const db = getFirestore()

  // Discover all related entries
  const relatedEntries = await discoverRelatedEntries(safetyRequestId, familyId)

  // Group by collection for batch processing
  const byCollection = groupByCollection(relatedEntries)

  // Seal atomically using transaction + batches
  await db.runTransaction(async (transaction) => {
    for (const [collection, entries] of Object.entries(byCollection)) {
      for (const entryId of entries) {
        const ref = db.collection(collection).doc(entryId)
        transaction.update(ref, {
          sealed: true,
          sealedAt: Timestamp.now(),
          sealedBy: 'system',
          sealReason: 'escape-action',
        })
      }
    }
  })
}
```

**Compliance Access Function:**
```typescript
const getSealedAuditEntriesInputSchema = z.object({
  familyId: z.string().min(1),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  entryTypes: z.array(z.string()).optional(),
  justification: z.string().min(50, 'Justification must be at least 50 characters'),
  legalReference: z.string().optional(),
})
```

### Naming Conventions
- Function: `queryFamilyAuditLog`, `getSealedAuditEntries`, `sealEscapeAuditEntries`, `unsealAuditEntries` (camelCase)
- Collection: `familyAuditLog`, `adminAuditLog`, `complianceAccessLog` (camelCase)
- Utility: `propagateSealToRelatedCollections` (camelCase)
- Schema field: `sealedAt`, `sealedBy`, `sealReason` (camelCase)

### Project Structure Notes

**Files to Create:**
```
apps/functions/src/utils/auditTrail.ts                    # Audit query utilities
apps/functions/src/utils/auditTrail.test.ts               # Utility tests
apps/functions/src/callable/getSealedAuditEntries.ts      # Compliance access function
apps/functions/src/callable/getSealedAuditEntries.test.ts # Tests
apps/functions/src/callable/sealEscapeAuditEntries.ts     # Retroactive sealing
apps/functions/src/callable/sealEscapeAuditEntries.test.ts # Tests
apps/functions/src/callable/unsealAuditEntries.ts         # Legal unseal function
apps/functions/src/callable/unsealAuditEntries.test.ts    # Tests
```

**Files to Modify:**
```
apps/functions/src/index.ts                               # Export new functions
apps/functions/firestore.indexes.json                     # Add sealed indexes
apps/functions/src/callable/severParentAccess.ts          # Ensure seal propagation
apps/functions/src/callable/unenrollDevice.ts             # Ensure seal propagation
apps/functions/src/callable/disableLocationFeatures.ts    # Ensure seal propagation
apps/functions/src/callable/activateNotificationStealth.ts # Ensure seal propagation
```

### Previous Story Intelligence (Story 0.5.7)

**Patterns Established:**
- Safety-team role REQUIRED for escape operations
- Zod schema validation with minimum reason length
- Sealed admin audit logging with SHA-256 integrity hash
- No family audit trail entries for escape actions
- Parallel validation to prevent timing attacks
- Batch chunking for Firestore 500-operation limit
- array-contains queries for race condition prevention

**Code to Reuse:**
- `generateIntegrityHash()` from notificationStealth.ts
- `chunkArray()` utility for batch operations
- Sealed audit logging pattern from activateNotificationStealth.ts
- Error handling with errorId generation

### Collections That May Contain Escape-Related Data

Based on existing escape functions:

1. **adminAuditLog** - All sealed admin operations
2. **deviceCommands** - Unenroll, disable location commands
3. **stealthQueues** - Notification stealth configurations
4. **stealthQueues/{id}/notifications** - Held notifications
5. **notificationQueue** - Deleted pending notifications
6. **families/{id}/locationHistory** - Redacted location entries
7. **users/{id}/settings/location** - Disabled location settings
8. **familyMembership** - Severed parent records

### Testing Standards

**Required Tests:**
1. Family audit query excludes sealed entries (integration)
2. Timestamp continuity after sealing (unit)
3. Compliance access with authorization (integration)
4. Compliance access denied without auth (integration - security)
5. Export excludes sealed entries (integration)
6. Analytics excludes sealed entries (integration)
7. Seal persistence verification (integration)
8. Unseal requires legal team (integration - security)
9. Retroactive sealing works correctly (integration)
10. Cross-collection propagation is atomic (integration)

**Adversarial Tests:**
1. Family member cannot query sealed entries via any API
2. Family member cannot detect sealed entry existence through gaps
3. Export for family member contains no sealed data
4. Analytics cannot reveal sealed activity patterns
5. Only legal team can unseal (not compliance, not safety, not admin)

---

### References

- [Source: docs/epics/epic-list.md#Story-0.5.8] - Original story requirements
- [Source: docs/sprint-artifacts/stories/0-5-7-72-hour-notification-stealth.md] - Previous story patterns
- [Source: apps/functions/src/callable/activateNotificationStealth.ts] - Sealed audit pattern
- [Source: apps/functions/firestore.indexes.json] - Existing indexes
- [Source: docs/project_context.md] - Cloud Functions template patterns

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/0-5-8-audit-trail-sealing.md
- Previous stories: 0.5.1, 0.5.2, 0.5.3, 0.5.4, 0.5.5, 0.5.6, 0.5.7

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- This is Story 8 of 9 in Epic 0.5 (Safe Account Escape)
- Builds on sealed audit patterns from Stories 0.5.4, 0.5.5, 0.5.6, 0.5.7
- Introduces compliance access logging
- Introduces legal team role for unseal operations
- Creates audit query utilities for consistent filtering
- Ensures cross-collection seal propagation

### File List
**To Create:**
- `apps/functions/src/utils/auditTrail.ts`
- `apps/functions/src/utils/auditTrail.test.ts`
- `apps/functions/src/callable/getSealedAuditEntries.ts`
- `apps/functions/src/callable/getSealedAuditEntries.test.ts`
- `apps/functions/src/callable/sealEscapeAuditEntries.ts`
- `apps/functions/src/callable/sealEscapeAuditEntries.test.ts`
- `apps/functions/src/callable/unsealAuditEntries.ts`
- `apps/functions/src/callable/unsealAuditEntries.test.ts`

**To Modify:**
- `apps/functions/src/index.ts`
- `apps/functions/firestore.indexes.json`
- `apps/functions/src/callable/severParentAccess.ts`
- `apps/functions/src/callable/unenrollDevice.ts`
- `apps/functions/src/callable/disableLocationFeatures.ts`
- `apps/functions/src/callable/activateNotificationStealth.ts`
