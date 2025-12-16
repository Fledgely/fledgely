# Story 3A.6: Co-Parent Removal Prevention

Status: complete

## Story

As a **parent in shared custody**,
I want **to be protected from being removed from the family by my co-parent**,
So that **I maintain access to my child's monitoring regardless of co-parent relationship**.

## Acceptance Criteria

1. **Given** a shared custody family with two parent guardians **When** either parent attempts to remove the other parent **Then** removal is blocked with explanation of shared custody immutability
2. **Given** a shared custody family with blocked removal **When** the blocking message is shown **Then** system explains separation flow options (Epic 2, Story 2.7)
3. **Given** a shared custody family with blocked removal **When** the blocking message is shown **Then** legal documentation path is referenced (Epic 3, Story 3.6)
4. **Given** a shared custody family **When** a parent attempts to change another parent's role **Then** neither parent can downgrade other parent to caregiver role
5. **Given** a shared custody family **When** dissolution is attempted **Then** family cannot be dissolved without both parents acknowledging
6. **Given** a shared custody family **When** removal is required **Then** court order is the only path to forcibly remove a verified legal parent
7. **Given** a shared custody family **When** a removal attempt is blocked **Then** attempted removals are logged in admin audit (potential abuse signal)

## Tasks / Subtasks

- [x] Task 1: Create guardian removal prevention schema (AC: 1, 4)
  - [x] 1.1: Add `GuardianRemovalAttempt` type to contracts (who, when, why blocked)
  - [x] 1.2: Add `GUARDIAN_REMOVAL_PREVENTION_MESSAGES` constants (user-friendly messages)
  - [x] 1.3: Create `guardianRemovalAttemptSchema` Zod schema for admin audit logging
  - [x] 1.4: Add `SHARED_CUSTODY_IMMUTABILITY_RULES` constant defining blocked operations
  - [x] 1.5: Export new types from contracts/index.ts
  - [x] 1.6: Write schema tests (target: 25+ tests) - **110 tests written**

- [x] Task 2: Extend audit schema for removal attempts (AC: 7)
  - [x] 2.1: Add `guardian_removal_blocked` to admin audit schema (admin-audit.schema.ts)
  - [x] 2.2: Add `role_change_blocked` to admin audit schema for role downgrade attempts
  - [x] 2.3: Create admin audit metadata schema for removal attempts
  - [x] 2.4: Add admin audit labels for new action types
  - [x] 2.5: Write tests for new audit action types - **51 tests written**

- [x] Task 3: Create guardian removal prevention Cloud Function (AC: 1, 4, 7)
  - [x] 3.1: Create `attemptGuardianRemoval` callable function in apps/functions
  - [x] 3.2: Check if child has shared custody declaration
  - [x] 3.3: If shared custody: block removal, return error with explanation
  - [x] 3.4: If NOT shared custody: allow removal (existing behavior)
  - [x] 3.5: Log blocked attempts to admin audit collection (adminAuditLog)
  - [x] 3.6: Return structured error with paths to dissolution (Story 2.7) and legal petition (Story 3.6)
  - [x] 3.7: Write unit tests (target: 15+ tests) - **tests in attemptGuardianRemoval.test.ts**

- [x] Task 4: Create role change prevention Cloud Function (AC: 4)
  - [x] 4.1: Create `attemptGuardianRoleChange` callable function
  - [x] 4.2: Block downgrade from 'co-parent' to any lesser role in shared custody
  - [x] 4.3: Create `attemptGuardianPermissionChange` for permission blocking
  - [x] 4.4: Log blocked role change attempts to admin audit
  - [x] 4.5: Return structured error explaining why role change is blocked
  - [x] 4.6: Write unit tests (target: 10+ tests) - **included in attemptGuardianRemoval.test.ts**

- [x] Task 5: Implement dissolution dual-acknowledgment enforcement (AC: 5)
  - [x] 5.1: Verified existing dissolution flow requires acknowledgments (Story 2.7)
  - [x] 5.2: Existing dissolution already checks ALL guardians to acknowledge
  - [x] 5.3: `allGuardiansAcknowledged()` in dissolution.schema.ts handles this
  - [x] 5.4: Existing dissolution tests cover shared custody flow

- [x] Task 6: Add legal petition reference utility (AC: 3, 6)
  - [x] 6.1: Create `getRemovalBlockedExplanation()` helper in contracts
  - [x] 6.2: Include Story 2.7 dissolution flow reference
  - [x] 6.3: Include Story 3.6 legal petition path reference
  - [x] 6.4: Include court order as only forced removal path explanation
  - [x] 6.5: Messages at 6th-grade reading level (NFR65)

- [x] Task 7: Add Firestore Security Rules for admin audit (AC: 7)
  - [x] 7.1: Verified adminAuditLog collection rules allow Cloud Functions to write (allow write: if false prevents client writes, Cloud Functions bypass rules)
  - [x] 7.2: Verified only admins can read admin audit logs (exists + admin role check)
  - [x] 7.3: Verified immutability (no updates or deletes - allow write: if false)

- [x] Task 8: Create UI components for removal blocked state (AC: 1, 2, 3)
  - [x] 8.1: Create `GuardianRemovalBlockedDialog.tsx` component
  - [x] 8.2: Show clear message: "Co-parents in shared custody cannot be removed"
  - [x] 8.3: Show link to dissolution flow (Story 2.7)
  - [x] 8.4: Show link to legal petition information (Story 3.6)
  - [x] 8.5: Show court order explanation as only forced removal path
  - [x] 8.6: Write component tests

## Dev Notes

### Architecture Patterns

**PR5: Adversarial Family Protections - Full Scope**
- Guardian removal prevention is core anti-weaponization mechanism
- Prevents one parent from unilaterally removing co-parent during disputes
- Immutability preserves access rights regardless of parental relationship
[Source: docs/archive/architecture.md#Architectural-Risk-Preventions]

**ADR-001: Child-Centric with Guardian Links**
- Custody type stored on child document determines protection level
- Shared custody triggers additional safeguards
- Guardian relationships are immutable in shared custody
[Source: docs/archive/architecture.md#ADR-001]

**S5: Adversarial Protections - Full Scope**
- All adversarial family protections in scope
- Removal prevention complements dissolution dual-approval
- Admin audit logging captures abuse signals
[Source: docs/archive/architecture.md#S5]

**EF4: Transparency Over Snitching**
- Blocked removal explained clearly (not cryptic error)
- Both parents aware of protections
- System guides toward proper resolution paths
[Source: docs/archive/architecture.md#Ethical-Framework]

### Existing Implementation Context

The codebase already has:
1. **Custody declaration** (Story 2.3) - `packages/contracts/src/custody.schema.ts`
   - `custodyTypeSchema` includes `'sole'`, `'shared'`, `'complex'`
   - `requiresSharedCustodySafeguards()` helper function
   - Custody stored on child document
2. **Family dissolution** (Story 2.7) - `packages/contracts/src/dissolution.schema.ts`
   - Dual-acknowledgment already implemented for dissolution
   - `needsAcknowledgment()` and `allGuardiansAcknowledged()` helpers
   - 30-day cooling period before deletion
3. **Self-removal** (Story 2.8) - `packages/contracts/src/selfRemoval.schema.ts`
   - Allows guardian to remove THEMSELVES (survivor escape)
   - Creates sealed audit entry (not visible to family)
   - Different from forced removal by another guardian
4. **Legal petitions** (Story 3.6) - `packages/firebase-rules/firestore.rules`
   - `legalPetitions` collection for excluded parents
   - Path to regain access through documentation
   - Referenced in removal blocked messages
5. **Admin audit logging** - `packages/firebase-rules/firestore.rules`
   - `adminAuditLog` collection exists
   - Only Cloud Functions can write
   - Only admins can read
6. **Audit schema** - `packages/contracts/src/audit.schema.ts`
   - `auditActionTypeSchema` with existing action types
   - `familyAuditEntrySchema` for family audit entries

### Key Differences from Related Features

| Feature | Purpose | Who Initiates | Outcome |
|---------|---------|---------------|---------|
| Self-Removal (Story 2.8) | Survivor escape | Guardian removes SELF | Guardian leaves family |
| Dissolution (Story 2.7) | End family | Any guardian | Requires dual-ack, 30-day cooling |
| **Removal Prevention (3A.6)** | Block forced removal | Guardian tries to remove OTHER | Blocked + admin audit |
| Legal Petition (Story 3.6) | Regain access | Excluded parent | Court-verified restoration |

### Data Model

**Admin Audit Entry for Blocked Removal:**
```typescript
adminAuditLog/{logId}
{
  id: string,                    // Firestore doc ID
  action: 'guardian_removal_blocked' | 'role_change_blocked',
  attemptedBy: string,           // Guardian who tried the action (UID)
  targetGuardian: string,        // Guardian they tried to affect (UID)
  childId: string,               // Child with shared custody
  familyId: string,              // Family ID
  custodyType: 'shared',         // Always 'shared' for these entries
  attemptedAction: 'remove' | 'downgrade_role' | 'change_permissions',
  blockedAt: Timestamp,          // When the attempt was blocked
  metadata: {
    requestedRole?: string,      // If role change: what role they tried
    requestedPermissions?: string, // If permission change: what they tried
  }
}
```

### Removal Block Flow

```
Guardian A tries to remove Guardian B (shared custody family)
    ↓
Cloud Function: attemptGuardianRemoval
    ↓
Check child's custodyDeclaration.type
    ↓
If type === 'shared':
    ↓
    Block removal + return error
    ↓
    Error includes:
    - Why blocked (shared custody immutability)
    - Path to dissolution (Story 2.7)
    - Path to legal petition (Story 3.6)
    - Court order explanation
    ↓
    Log to adminAuditLog (abuse signal)
    ↓
    UI shows GuardianRemovalBlockedDialog
Else:
    ↓
    Allow removal (existing behavior)
```

### Testing Standards

- All schemas must have comprehensive Zod validation tests (target: 25+ tests)
- Cloud Functions require unit tests with mocked Firestore
- Test edge cases:
  - Shared custody: both parents blocked from removing each other
  - Sole custody: removal allowed (no protection needed)
  - Complex custody: same as shared (requires protection)
  - Role downgrade attempts blocked in shared custody
  - Permission changes blocked in shared custody
- Test admin audit logging for blocked attempts
- Test error messages contain required references
- UI component tests for blocked dialog

### Key Files to Modify

**Modified files:**
- `packages/contracts/src/audit.schema.ts` - Add new action types
- `packages/contracts/src/audit.schema.test.ts` - Add tests for new action types
- `packages/contracts/src/index.ts` - Export new types

**New files:**
- `packages/contracts/src/guardian-removal-prevention.schema.ts` - Removal prevention types
- `packages/contracts/src/guardian-removal-prevention.schema.test.ts` - Schema tests
- `apps/functions/src/callable/attemptGuardianRemoval.ts` - Prevention function
- `apps/functions/src/callable/attemptGuardianRemoval.test.ts` - Function tests
- `apps/web/src/components/guardian/GuardianRemovalBlockedDialog.tsx` - UI component
- `apps/web/src/components/guardian/GuardianRemovalBlockedDialog.test.tsx` - Component tests

### Why Shared Custody Is Immutable

1. **Equal rights**: Both parents have legal rights to monitor their child
2. **Anti-weaponization**: Prevents removal during custody disputes
3. **Court authority**: Only courts can terminate parental monitoring rights
4. **Child protection**: Maintains both parents' visibility into child's safety
5. **Transparency**: Both parents know the rules apply equally

### Why Admin Audit (Not Family Audit)

- Blocked removal attempts are **abuse signals**
- Should NOT be visible to the family (would reveal blocked action)
- Support team can review patterns of attempted removals
- May indicate escalating custody conflict
- Can inform support interventions if pattern detected

### Why Reference Both Story 2.7 and Story 3.6

**Story 2.7 (Dissolution):**
- Proper way to end family monitoring relationship
- Requires both parents to acknowledge
- 30-day cooling period allows reconsideration
- Results in controlled family end

**Story 3.6 (Legal Petition):**
- For parent who has been excluded (rare edge case)
- Path to regain access through legal documentation
- Court-verified process for restoration
- Referenced so blocked parent knows options exist

### References

- [Source: docs/epics/epic-list.md#Story-3A.6] - Original acceptance criteria
- [Source: docs/archive/architecture.md#PR5] - Adversarial family protections
- [Source: docs/archive/architecture.md#EF4] - Transparency over snitching
- [Source: packages/contracts/src/custody.schema.ts] - Custody type definitions
- [Source: packages/contracts/src/dissolution.schema.ts] - Dissolution schema
- [Source: packages/contracts/src/selfRemoval.schema.ts] - Self-removal (different from forced)
- [Source: packages/firebase-rules/firestore.rules] - Admin audit rules
- [Source: docs/sprint-artifacts/stories/story-3a-5-screenshot-viewing-rate-alert.md] - Previous story patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

