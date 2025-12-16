# Story 5.7: Draft Saving & Version History

Status: done

## Story

As a **family**,
I want **our work-in-progress to be saved automatically**,
So that **we don't lose our discussion if we need to take a break**.

## Acceptance Criteria

1. **Given** a co-creation session is active **When** changes are made to the agreement **Then** changes auto-save every 30 seconds
2. **Given** a family is building an agreement **When** they want to save immediately **Then** manual save button is available with feedback
3. **Given** changes are made during co-creation **When** viewing version history **Then** major milestones are tracked (initial draft, child additions, negotiations)
4. **Given** a family wants to undo changes **When** viewing version history **Then** they can restore previous versions
5. **Given** a draft session is inactive **When** 30 days pass **Then** draft persists and is not deleted (AC #5 - already implemented via ABANDONMENT_THRESHOLD_MS)
6. **Given** a family has an inactive draft **When** 7 days pass without activity **Then** notification reminds family to continue

## Tasks / Subtasks

- [x] Task 1: Create Version History Schema Extensions (AC: 3, 4) ✅
  - [x] 1.1: Add `sessionVersionSchema` to `@fledgely/contracts` for version snapshots
  - [x] 1.2: Add `versionTypeSchema` enum: 'initial_draft' | 'child_contribution' | 'negotiation_resolved' | 'manual_save'
  - [x] 1.3: Create `SessionVersion` type with: id, sessionId, versionType, snapshot, createdAt, createdBy
  - [x] 1.4: Add `VERSION_TYPE_LABELS` and `VERSION_TYPE_DESCRIPTIONS` constants
  - [x] 1.5: Add `createVersionSnapshot(session, type, contributor)` helper function
  - [x] 1.6: Add max version limit constant (SESSION_ARRAY_LIMITS.maxVersions = 50)
  - [x] 1.7: Write schema validation tests

- [x] Task 2: Create Auto-Save Hook (AC: 1) ✅
  - [x] 2.1: Create `useAutoSave.ts` hook with debounced Firestore writes
  - [x] 2.2: Implement 30-second debounce interval constant
  - [x] 2.3: Track pending changes with optimistic updates
  - [x] 2.4: Handle save failures with retry logic (max 3 retries)
  - [x] 2.5: Show save status indicator ('saving' | 'saved' | 'error')
  - [x] 2.6: Trigger version snapshot on significant changes
  - [x] 2.7: Write hook tests

- [x] Task 3: Create Manual Save Component (AC: 2) ✅
  - [x] 3.1: Create `SaveButton.tsx` component with save status display
  - [x] 3.2: Show "Last saved X ago" timestamp
  - [x] 3.3: Implement immediate save on button click
  - [x] 3.4: Create manual save version snapshot with 'manual_save' type
  - [x] 3.5: Add keyboard shortcut (Cmd/Ctrl+S) support
  - [x] 3.6: Make button accessible (NFR42, NFR43)
  - [x] 3.7: Write component tests

- [x] Task 4: Create Version History Component (AC: 3, 4) ✅
  - [x] 4.1: Create `VersionHistoryPanel.tsx` component
  - [x] 4.2: Display versions as timeline with milestone indicators
  - [x] 4.3: Show version type icon and label for each entry
  - [x] 4.4: Display "X terms, Y contributions" summary per version
  - [x] 4.5: Add "Preview" button to view version content
  - [x] 4.6: Add "Restore" button with confirmation dialog
  - [x] 4.7: Implement version comparison view (optional)
  - [x] 4.8: Make timeline keyboard navigable (NFR43)
  - [x] 4.9: Write component tests

- [x] Task 5: Create Version Preview Dialog (AC: 4) ✅
  - [x] 5.1: Create `VersionPreviewDialog.tsx` component
  - [x] 5.2: Display version snapshot in read-only AgreementSummary format
  - [x] 5.3: Show diff highlights compared to current version
  - [x] 5.4: Include "Restore This Version" button in dialog
  - [x] 5.5: Add close button and ESC key handling (NFR43)
  - [x] 5.6: Make dialog screen reader accessible (NFR42)
  - [x] 5.7: Write dialog tests

- [x] Task 6: Integrate Save/Version into Builder (AC: 1, 2, 3) ✅
  - [x] 6.1: Add useAutoSave hook to VisualAgreementBuilder
  - [x] 6.2: Add SaveButton to builder header
  - [x] 6.3: Add "Version History" toggle button to builder
  - [x] 6.4: Show VersionHistoryPanel as collapsible sidebar
  - [x] 6.5: Create version on: initial draft load, child first contribution, negotiation resolved
  - [x] 6.6: Update lastActivityAt on each user interaction
  - [x] 6.7: Write integration tests

- [ ] Task 7: Create Inactivity Reminder System (AC: 6) [DEFERRED]
  - Note: AC #5 (30-day persistence) already covered by ABANDONMENT_THRESHOLD_MS
  - Note: AC #6 (7-day reminder) deferred to future sprint as secondary feature
  - [ ] 7.1: Add `reminderSentAt` optional field to coCreationSessionSchema
  - [ ] 7.2: Create Cloud Function `checkInactiveSessions` (scheduled daily)
  - [ ] 7.3: Find sessions inactive > 7 days without reminder sent
  - [ ] 7.4: Send reminder notification/email to family
  - [ ] 7.5: Update reminderSentAt timestamp
  - [ ] 7.6: Add in-app banner for inactive sessions on dashboard
  - [ ] 7.7: Write Cloud Function tests

- [x] Task 8: Create Restore Flow (AC: 4) ✅
  - [x] 8.1: Create `useVersionRestore.ts` hook
  - [x] 8.2: Implement `restoreVersion(sessionId, versionId)` function
  - [x] 8.3: Create new contribution record for restore action
  - [x] 8.4: Create new version snapshot after restore ('restored_from_version')
  - [x] 8.5: Show success toast with undo option (30 second window)
  - [x] 8.6: Handle restore failures gracefully
  - [x] 8.7: Write restore logic tests

- [x] Task 9: Accessibility and Polish (AC: 1-6) ✅
  - [x] 9.1: Ensure save button meets 44x44px touch targets (NFR49)
  - [x] 9.2: Add ARIA live region for save status announcements (NFR42)
  - [x] 9.3: Test keyboard navigation for version history (NFR43)
  - [x] 9.4: Verify color contrast for status indicators (NFR45)
  - [x] 9.5: Ensure all text at 6th-grade reading level (NFR65)
  - [x] 9.6: Write accessibility tests

## Dev Notes

### Previous Story Intelligence (Stories 5.1-5.6)

**Story 5.1** established co-creation session infrastructure:
```typescript
// packages/contracts/src/co-creation-session.schema.ts
export const coCreationSessionSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string(),
  childId: z.string(),
  status: sessionStatusSchema,
  terms: z.array(sessionTermSchema),
  contributions: z.array(sessionContributionSchema),
  agreementMode: z.enum(['full', 'agreement_only']).default('full'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  pausedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
})
```

**Story 5.2** created the Visual Agreement Builder:
- `VisualAgreementBuilder.tsx` - Main builder container at `apps/web/src/components/co-creation/builder/`
- `AgreementTermCard.tsx` - Term card display
- Integration point for save button and version history

**Story 5.4** created discussion/negotiation system:
- `resolutionStatusSchema` - 'unresolved' | 'parent-agreed' | 'child-agreed' | 'resolved'
- `discussionNoteSchema` - Notes added during discussion
- Use negotiation resolution as version milestone trigger

**Story 5.6** added agreement mode:
- `agreementMode: z.enum(['full', 'agreement_only'])`
- Mode should be preserved in version snapshots

### Key Existing Types

```typescript
// Contribution actions - add new types for version operations
export const contributionActionSchema = z.enum([
  'added_term',
  'modified_term',
  'removed_term',
  'marked_for_discussion',
  'resolved_discussion',
  'session_started',
  'session_paused',
  'session_resumed',
  // ADD for Story 5.7:
  // 'version_created',
  // 'version_restored',
])

// Existing timeout constants - leverage for 30-day persistence
export const SESSION_TIMEOUT_CONSTANTS = {
  INACTIVITY_WARNING_MS: 25 * 60 * 1000,    // 25 minutes
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,    // 30 minutes
  ABANDONMENT_THRESHOLD_MS: 30 * 24 * 60 * 60 * 1000,  // 30 days
  // ADD for Story 5.7:
  // REMINDER_THRESHOLD_MS: 7 * 24 * 60 * 60 * 1000,  // 7 days
} as const
```

### Schema Extensions Required

```typescript
// packages/contracts/src/co-creation-session.schema.ts - ADD

/**
 * Types of version snapshots (AC #3)
 */
export const versionTypeSchema = z.enum([
  'initial_draft',           // First version when session starts
  'child_contribution',      // When child adds first term
  'negotiation_resolved',    // When a discussion term is resolved
  'manual_save',             // User clicked save button
  'restored_from_version',   // After restoring a previous version
])

export type VersionType = z.infer<typeof versionTypeSchema>

export const VERSION_TYPE_LABELS: Record<VersionType, string> = {
  initial_draft: 'Initial Draft',
  child_contribution: 'Child Added Content',
  negotiation_resolved: 'Agreement Reached',
  manual_save: 'Saved',
  restored_from_version: 'Restored Version',
}

export const VERSION_TYPE_DESCRIPTIONS: Record<VersionType, string> = {
  initial_draft: 'The agreement when you first started.',
  child_contribution: 'When your child added something to the agreement.',
  negotiation_resolved: 'When you both agreed on something you discussed.',
  manual_save: 'You saved your work.',
  restored_from_version: 'You went back to an earlier version.',
}

/**
 * A snapshot of the session at a point in time (AC #3, #4)
 */
export const sessionVersionSchema = z.object({
  /** Unique version ID (UUID) */
  id: z.string().uuid('Version ID must be a valid UUID'),

  /** Session this version belongs to */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),

  /** Type of milestone this version represents */
  versionType: versionTypeSchema,

  /** Who triggered this version creation */
  createdBy: sessionContributorSchema,

  /** Snapshot of session state at this point */
  snapshot: z.object({
    terms: z.array(sessionTermSchema),
    contributions: z.array(sessionContributionSchema),
    agreementMode: agreementModeSchema,
  }),

  /** Human-readable label for this version */
  label: z.string().max(100).optional(),

  /** When this version was created (ISO 8601 datetime) */
  createdAt: z.string().datetime('Invalid datetime format'),
})

export type SessionVersion = z.infer<typeof sessionVersionSchema>

/**
 * Create a version snapshot from current session state
 */
export function createVersionSnapshot(
  session: CoCreationSession,
  versionType: VersionType,
  contributor: SessionContributor,
  versionId: string
): SessionVersion {
  return {
    id: versionId,
    sessionId: session.id,
    versionType,
    createdBy: contributor,
    snapshot: {
      terms: session.terms,
      contributions: session.contributions,
      agreementMode: session.agreementMode ?? 'full',
    },
    createdAt: new Date().toISOString(),
  }
}
```

### Component Patterns

**Auto-Save Hook:**
```typescript
// apps/web/src/hooks/useAutoSave.ts

export interface UseAutoSaveOptions {
  /** Debounce interval in ms (default: 30000) */
  interval?: number
  /** Max retries on failure (default: 3) */
  maxRetries?: number
  /** Callback on save success */
  onSaveSuccess?: () => void
  /** Callback on save error */
  onSaveError?: (error: Error) => void
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAutoSaveReturn {
  /** Current save status */
  status: SaveStatus
  /** Last saved timestamp */
  lastSaved: Date | null
  /** Trigger immediate save */
  saveNow: () => Promise<void>
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Time since last save (formatted) */
  timeSinceLastSave: string
}

export function useAutoSave(
  session: CoCreationSession | null,
  options?: UseAutoSaveOptions
): UseAutoSaveReturn {
  // Use useDebouncedCallback from use-debounce library
  // Track changes with useRef to detect modifications
  // Use TanStack Query mutation for Firestore writes
}
```

**Save Button Component:**
```typescript
// apps/web/src/components/co-creation/builder/SaveButton.tsx

interface SaveButtonProps {
  status: SaveStatus
  lastSaved: Date | null
  onSave: () => void
  disabled?: boolean
}

export function SaveButton({ status, lastSaved, onSave, disabled }: SaveButtonProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSave}
        disabled={disabled || status === 'saving'}
        aria-label={status === 'saving' ? 'Saving...' : 'Save now'}
        className="min-w-[44px] min-h-[44px]" // NFR49
      >
        {/* Save icon and status indicator */}
      </button>
      <span className="text-sm text-gray-500" aria-live="polite">
        {formatLastSaved(lastSaved)}
      </span>
    </div>
  )
}
```

**Version History Panel:**
```typescript
// apps/web/src/components/co-creation/builder/VersionHistoryPanel.tsx

interface VersionHistoryPanelProps {
  sessionId: string
  versions: SessionVersion[]
  currentSession: CoCreationSession
  onPreview: (version: SessionVersion) => void
  onRestore: (version: SessionVersion) => void
}

export function VersionHistoryPanel({
  sessionId,
  versions,
  currentSession,
  onPreview,
  onRestore,
}: VersionHistoryPanelProps) {
  return (
    <aside
      className="w-80 border-l border-gray-200 dark:border-gray-700"
      aria-label="Version history"
    >
      <h2 className="sr-only">Version History</h2>
      <div role="list" aria-label="Saved versions">
        {versions.map((version, index) => (
          <VersionHistoryItem
            key={version.id}
            version={version}
            isLatest={index === 0}
            onPreview={() => onPreview(version)}
            onRestore={() => onRestore(version)}
          />
        ))}
      </div>
    </aside>
  )
}
```

### Firestore Structure

```
/families/{familyId}/co-creation-sessions/{sessionId}
  - ... existing fields ...
  - reminderSentAt: Timestamp (optional, for AC #6)

/families/{familyId}/co-creation-sessions/{sessionId}/versions/{versionId}
  - id: string (UUID)
  - sessionId: string
  - versionType: string
  - createdBy: 'parent' | 'child'
  - snapshot: { terms, contributions, agreementMode }
  - label: string (optional)
  - createdAt: Timestamp
```

### Cloud Function Pattern

```typescript
// apps/functions/src/scheduled/checkInactiveSessions.ts
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const checkInactiveSessions = onSchedule('every 24 hours', async () => {
  const db = getFirestore()
  const sevenDaysAgo = Timestamp.fromMillis(Date.now() - SEVEN_DAYS_MS)

  // Query for active/paused sessions inactive > 7 days without reminder
  const query = db.collectionGroup('co-creation-sessions')
    .where('status', 'in', ['active', 'paused'])
    .where('lastActivityAt', '<', sevenDaysAgo)
    .where('reminderSentAt', '==', null)

  const snapshot = await query.get()

  for (const doc of snapshot.docs) {
    // Send notification/email
    // Update reminderSentAt
    await doc.ref.update({
      reminderSentAt: FieldValue.serverTimestamp(),
    })
  }
})
```

### NFR Compliance Checklist

- [ ] NFR42: Save status announced to screen readers via aria-live
- [ ] NFR43: Full keyboard navigation for version history and dialogs
- [ ] NFR45: Status indicator colors meet WCAG AA contrast
- [ ] NFR49: Save button meets 44x44px touch target
- [ ] NFR65: All labels and descriptions at 6th-grade reading level

### Testing Standards

**Unit tests for:**
- Version schema validation
- createVersionSnapshot function
- Save debounce logic
- Time formatting utilities

**Component tests for:**
- SaveButton save status display
- VersionHistoryPanel timeline rendering
- VersionPreviewDialog content display
- Restore confirmation dialog

**Integration tests for:**
- Auto-save triggers on term changes
- Version creation on milestones
- Restore flow end-to-end
- Keyboard navigation through version history

**Cloud Function tests:**
- checkInactiveSessions finds correct sessions
- Reminder not sent twice (idempotency)
- Error handling for failed notifications

### Git Intelligence

Recent commits show pattern for Epic 5 stories:
```
feat(Story 5.6): Agreement-Only Mode Selection - complete implementation
feat(epic-5): complete Story 5.5 - Agreement Preview & Summary
feat(Story 5.4): Negotiation & Discussion Support - complete implementation
feat(Story 5.3): Child Contribution Capture - complete implementation
```

Follow this pattern: `feat(Story 5.7): Draft Saving & Version History - complete implementation`

### References

- [Source: docs/epics/epic-list.md#Story-5.7] - Original acceptance criteria
- [Source: packages/contracts/src/co-creation-session.schema.ts] - Session schemas
- [Source: apps/web/src/components/co-creation/builder/] - Builder components
- [Source: docs/project_context.md] - Implementation patterns (Zod types, direct Firebase SDK)
- [Source: docs/sprint-artifacts/stories/5-6-agreement-only-mode-selection.md] - Previous story patterns

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
