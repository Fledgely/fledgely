# Story 6.3: Agreement Activation

Status: complete

## Story

As a **family**,
I want **the agreement to become active immediately upon all signatures**,
So that **we can begin our new digital arrangement right away**.

## Acceptance Criteria

1. **Given** all required parties have signed (child + parent(s)) **When** final signature is submitted **Then** agreement status changes to "active" in Firestore
2. **Given** agreement is being activated **When** status is set to active **Then** agreement version number is assigned (v1.0)
3. **Given** agreement is being activated **When** status is set to active **Then** activation timestamp is recorded
4. **Given** agreement is activated **When** all parties are notified **Then** both/all parties receive confirmation notification
5. **Given** agreement is activated **When** dashboard loads **Then** dashboard updates to show active agreement summary
6. **Given** agreement is activated **When** monitoring rules are evaluated **Then** agreement becomes the governing document for all monitoring
7. **Given** family has previous agreements **When** new agreement is activated **Then** previous agreements (if any) are archived, not deleted

## Tasks / Subtasks

- [ ] Task 1: Extend Agreement Schema for Activation (AC: 1, 2, 3)
  - [ ] 1.1: Add `agreementStatusSchema` enum: 'draft' | 'pending_signatures' | 'active' | 'archived' | 'superseded'
  - [ ] 1.2: Add `version` field to agreement schema (string: "1.0", "1.1", etc.)
  - [ ] 1.3: Add `activatedAt` timestamp field (already exists in signatureService)
  - [ ] 1.4: Add `archivedAt` optional timestamp field for superseded agreements
  - [ ] 1.5: Create helper function `isAgreementActive(status)`
  - [ ] 1.6: Write schema validation tests

- [ ] Task 2: Create Agreement Activation Service (AC: 1, 2, 3, 7)
  - [ ] 2.1: Create `activateAgreement(familyId, agreementId)` function
  - [ ] 2.2: Validate all required signatures are present before activation
  - [ ] 2.3: Assign version number (check existing agreements to increment)
  - [ ] 2.4: Set `status` to 'active' and record `activatedAt` timestamp
  - [ ] 2.5: Archive previous active agreement if exists (set to 'superseded')
  - [ ] 2.6: Create audit log entry for activation
  - [ ] 2.7: Write service tests

- [ ] Task 3: Integrate Activation into Signing Flow (AC: 1)
  - [ ] 3.1: Modify `recordChildSignature` to trigger activation when complete
  - [ ] 3.2: Activation already sets `activatedAt` - verify it works correctly
  - [ ] 3.3: Add version assignment to activation logic
  - [ ] 3.4: Handle shared custody activation (waits for all parents + child)
  - [ ] 3.5: Write integration tests for full signing → activation flow

- [ ] Task 4: Create Activation Notification System (AC: 4)
  - [ ] 4.1: Create `notifyAgreementActivation(familyId, agreementId)` function
  - [ ] 4.2: Send notification to parent(s) with agreement summary
  - [ ] 4.3: Store notification in user's notification queue (for future notifications feature)
  - [ ] 4.4: Create audit log entries for notifications sent
  - [ ] 4.5: Write notification service tests

- [ ] Task 5: Create Active Agreement Dashboard Components (AC: 5)
  - [ ] 5.1: Create `ActiveAgreementCard.tsx` component
  - [ ] 5.2: Display agreement version, activation date, parties who signed
  - [ ] 5.3: Show key agreement terms summary (rules count, monitoring settings)
  - [ ] 5.4: Add "View Full Agreement" button linking to agreement detail page
  - [ ] 5.5: Add "Request Change" button for future agreement modification flow
  - [ ] 5.6: Make component accessible (NFR42) with proper ARIA labels
  - [ ] 5.7: Write component tests

- [ ] Task 6: Create Agreement Detail Page (AC: 5, 6)
  - [ ] 6.1: Create `/dashboard/agreement/[agreementId]/page.tsx` route
  - [ ] 6.2: Display full agreement with all terms and commitments
  - [ ] 6.3: Show signature section with all parties' signatures and timestamps
  - [ ] 6.4: Show agreement history (versioning, archive dates)
  - [ ] 6.5: Add download/share options for signed agreement
  - [ ] 6.6: Make accessible for both parent and child views
  - [ ] 6.7: Write page integration tests

- [ ] Task 7: Implement Agreement Archive System (AC: 7)
  - [ ] 7.1: Create `archiveAgreement(familyId, agreementId, reason)` function
  - [ ] 7.2: Set agreement status to 'superseded' or 'archived'
  - [ ] 7.3: Record archive timestamp and reason
  - [ ] 7.4: Maintain read access to archived agreements (history)
  - [ ] 7.5: Update `getActiveAgreement` to filter out archived
  - [ ] 7.6: Create `getAgreementHistory(familyId)` for viewing past agreements
  - [ ] 7.7: Write archive service tests

- [ ] Task 8: Update Dashboard Integration (AC: 5, 6)
  - [ ] 8.1: Modify family dashboard to show ActiveAgreementCard
  - [ ] 8.2: Add "No active agreement" state with link to create
  - [ ] 8.3: Show pending signature banner if agreement awaiting signatures
  - [ ] 8.4: Add agreement history section showing archived agreements
  - [ ] 8.5: Write dashboard integration tests

- [ ] Task 9: Accessibility and Polish (AC: 1-7)
  - [ ] 9.1: Ensure all touch targets are 44x44px minimum (NFR49)
  - [ ] 9.2: Add ARIA labels for all agreement status elements (NFR42)
  - [ ] 9.3: Verify screen reader announcements for status changes (NFR47)
  - [ ] 9.4: Test keyboard navigation through agreement views (NFR43)
  - [ ] 9.5: Verify color contrast for all text (NFR45)
  - [ ] 9.6: Write accessibility tests

## Dev Notes

### Previous Story Intelligence (Story 6.2)

**Story 6.2** created Parent Digital Signature with:
```typescript
// apps/web/src/services/signatureService.ts
// - recordParentSignature already sets activatedAt when complete
// - recordChildSignature already creates 'agreement_activated' audit log
// - Transaction-based updates for atomicity

// Key code path for activation (already exists):
if (newStatus === 'complete') {
  transaction.update(docRef, {
    'signatures.child': signature,
    signingStatus: 'complete',
    activatedAt: serverTimestamp(), // Already setting this!
  })

  // Audit log for activation
  batch.set(activationRef, {
    action: 'agreement_activated',
    // ...
  })
}
```

**Key insight:** Basic activation already happens - Story 6.3 adds:
- Version numbering
- Agreement status separate from signing status
- Previous agreement archiving
- Dashboard integration
- Notification system

### Existing Infrastructure to Leverage

```typescript
// packages/contracts/src/signature.schema.ts
// - signingStatusSchema already has 'complete' status
// - getNextSigningStatus() handles status transitions
// - isSigningComplete() checks for completion

// apps/web/src/hooks/useSigningOrder.ts
// - Already tracks signing status
// - Has isComplete boolean

// apps/web/src/components/co-creation/signing/SigningCelebration.tsx
// - Celebration component exists from Story 6.1
// - Story 6.4 will enhance this for family celebration
```

### Schema Extensions Required

```typescript
// packages/contracts/src/agreement.schema.ts - EXTEND

/**
 * Agreement lifecycle status (separate from signing status)
 */
export const agreementStatusSchema = z.enum([
  'draft',              // Agreement being created/edited
  'pending_signatures', // All edits done, awaiting signatures
  'active',            // Fully signed and governing
  'archived',          // Manually archived by family
  'superseded',        // Replaced by newer agreement version
])

export type AgreementStatus = z.infer<typeof agreementStatusSchema>

/**
 * Extended agreement schema with activation fields
 */
export const agreementSchema = z.object({
  // ... existing fields ...

  /** Agreement lifecycle status */
  status: agreementStatusSchema,

  /** Version number (e.g., "1.0", "1.1", "2.0") */
  version: z.string().regex(/^\d+\.\d+$/, 'Version must be X.Y format'),

  /** When agreement was activated (all signatures complete) */
  activatedAt: z.string().datetime().optional(),

  /** When agreement was archived or superseded */
  archivedAt: z.string().datetime().optional(),

  /** Reason for archiving (if archived or superseded) */
  archiveReason: z.enum(['new_version', 'manual_archive', 'expired']).optional(),

  /** Reference to agreement that superseded this one */
  supersededBy: z.string().uuid().optional(),
})

/**
 * Version number assignment logic
 */
export function getNextVersionNumber(existingVersions: string[]): string {
  if (existingVersions.length === 0) return '1.0'

  const latestVersion = existingVersions
    .sort((a, b) => {
      const [aMajor, aMinor] = a.split('.').map(Number)
      const [bMajor, bMinor] = b.split('.').map(Number)
      return bMajor - aMajor || bMinor - aMinor
    })[0]

  const [major, minor] = latestVersion.split('.').map(Number)
  return `${major}.${minor + 1}` // Increment minor version
}
```

### Firestore Structure Updates

```
/families/{familyId}/agreements/{agreementId}
  - ... existing fields ...
  - status: 'draft' | 'pending_signatures' | 'active' | 'archived' | 'superseded'
  - version: "1.0" | "1.1" | etc.
  - activatedAt: Timestamp (set when all sign) - ALREADY EXISTS
  - archivedAt: Timestamp (optional)
  - archiveReason: string (optional)
  - supersededBy: agreementId (optional)

Query patterns:
- Get active agreement: where('status', '==', 'active')
- Get all agreements: orderBy('createdAt', 'desc')
- Get agreement history: where('status', 'in', ['active', 'archived', 'superseded'])
```

### Dashboard Component Pattern

```typescript
// apps/web/src/components/dashboard/ActiveAgreementCard.tsx

interface ActiveAgreementCardProps {
  agreement: Agreement
  onViewDetails: (id: string) => void
  onRequestChange: (id: string) => void
}

export function ActiveAgreementCard({
  agreement,
  onViewDetails,
  onRequestChange,
}: ActiveAgreementCardProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">Family Agreement</h3>
          <p className="text-sm text-gray-500">
            Version {agreement.version} • Active since {formatDate(agreement.activatedAt)}
          </p>
        </div>
        <Badge variant="success">Active</Badge>
      </div>

      {/* Agreement summary */}
      <div className="mt-4 space-y-2">
        <p className="text-sm">{agreement.terms.length} rules agreed upon</p>
        <p className="text-sm">Signed by all parties</p>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Button onClick={() => onViewDetails(agreement.id)} className="min-h-[44px]">
          View Agreement
        </Button>
        <Button variant="outline" onClick={() => onRequestChange(agreement.id)} className="min-h-[44px]">
          Request Change
        </Button>
      </div>
    </Card>
  )
}
```

### Notification Pattern

```typescript
// apps/web/src/services/notificationService.ts

interface ActivationNotification {
  type: 'agreement_activated'
  familyId: string
  agreementId: string
  agreementVersion: string
  activatedAt: string
  signedBy: string[]
}

/**
 * Queue notification for agreement activation
 * Note: Actual delivery mechanism (email, push, etc.) is Epic 41
 * This story just records the notification event
 */
export async function notifyAgreementActivation(
  familyId: string,
  agreementId: string,
  agreementData: Agreement,
  recipientUserIds: string[]
): Promise<void> {
  const batch = writeBatch(db)

  for (const userId of recipientUserIds) {
    const notifRef = doc(collection(db, 'users', userId, 'notifications'))
    batch.set(notifRef, {
      type: 'agreement_activated',
      familyId,
      agreementId,
      agreementVersion: agreementData.version,
      message: 'Your family agreement is now active!',
      createdAt: serverTimestamp(),
      read: false,
    })
  }

  await batch.commit()
}
```

### Key FRs for Story 6.3

- **FR21:** Agreement becomes active only when both parties sign
- **FR26:** Device becomes inoperable under fledgely management without child consent (relies on active agreement check)

### NFR Compliance Checklist

- [ ] NFR42: All agreement status elements screen reader accessible
- [ ] NFR43: Full keyboard navigation through agreement views
- [ ] NFR45: Color contrast 4.5:1 for all text
- [ ] NFR47: Screen reader announcements for activation status
- [ ] NFR49: All touch targets 44x44px minimum

### Testing Standards

**Unit tests for:**
- Agreement status schema validation
- Version number generation
- isAgreementActive helper
- Archive reason validation

**Component tests for:**
- ActiveAgreementCard display states
- Agreement detail page sections
- Dashboard integration with agreement card

**Integration tests for:**
- Full signing → activation flow
- Version number assignment
- Previous agreement archiving
- Dashboard updates on activation

**Accessibility tests for:**
- Screen reader announcement of activation
- Keyboard navigation through agreement details
- Color contrast compliance

### Git Commit Pattern

```
feat(Story 6.3): Agreement Activation - complete implementation
```

### Dependencies

- Story 6.1 signature infrastructure: DONE
- Story 6.2 parent signing and shared custody: DONE
- signatureService with activation logic: DONE (needs extension)
- No external package dependencies

### References

- [Source: docs/epics/epic-list.md#Story-6.3] - Original acceptance criteria
- [Source: packages/contracts/src/signature.schema.ts] - Signature schemas and status helpers
- [Source: apps/web/src/services/signatureService.ts] - Existing signature service with activation logic
- [Source: docs/project_context.md] - Implementation patterns (Zod types, direct Firebase SDK)
- [Source: docs/sprint-artifacts/stories/6-2-parent-digital-signature.md] - Previous story patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

<!-- Debug log references will be added during implementation -->

### Completion Notes List

<!-- Notes will be added during implementation -->

### File List

<!-- Created/modified files will be listed after implementation -->
