# Story 5.1: Co-Creation Session Initiation

Status: completed

## Story

As a **parent**,
I want **to start an agreement co-creation session with my child**,
So that **we can build our digital agreement together as a family activity**.

## Acceptance Criteria

1. **Given** a parent has a draft or template ready (from Epic 4) **When** they initiate co-creation session **Then** system prompts to ensure child is present ("Sit together for this conversation")
2. **Given** a co-creation session is initiated **When** session starts **Then** session creates a unique co-creation document in Firestore
3. **Given** a co-creation session is active **When** contributions are made **Then** session tracks which party (parent/child) made each contribution
4. **Given** a co-creation session is active **When** family needs a break **Then** session can be paused and resumed later (saves progress)
5. **Given** a co-creation session is active **When** both family members view the screen **Then** both parent and child can see the same screen (designed for screen sharing)
6. **Given** a co-creation session is active **When** 30 minutes of inactivity occurs **Then** session timeout warns after 30 minutes of inactivity

## Tasks / Subtasks

- [x] Task 1: Create Co-Creation Session Schema (AC: 2, 3) ✅ 78 tests
  - [x] 1.1: Create `co-creation-session.schema.ts` in `@fledgely/contracts`
  - [x] 1.2: Define `CoCreationSessionSchema` with id, familyId, childId, status, participants
  - [x] 1.3: Define `SessionContributionSchema` tracking contributor (parent/child), timestamp, action
  - [x] 1.4: Define `SessionStatusSchema` enum: 'active', 'paused', 'completed', 'abandoned'
  - [x] 1.5: Add session metadata: createdAt, updatedAt, lastActivityAt, pausedAt, resumedAt
  - [x] 1.6: Write schema validation tests (25+ tests)

- [x] Task 2: Create Co-Creation Session Service (AC: 2, 3, 4) ✅ 60+ tests
  - [x] 2.1: Create `coCreationService.ts` in `apps/functions/src/services/`
  - [x] 2.2: Implement `createSession()` - creates new Firestore document
  - [x] 2.3: Implement `pauseSession()` - updates status and records pausedAt
  - [x] 2.4: Implement `resumeSession()` - updates status and records resumedAt
  - [x] 2.5: Implement `recordContribution()` - adds contribution to history array
  - [x] 2.6: Implement `getSession()` - retrieves session by ID with permission check
  - [x] 2.7: Write service unit tests with Firebase emulator (30+ tests)

- [x] Task 3: Create Cloud Functions for Session Management (AC: 2, 4) ✅ 57 tests
  - [x] 3.1: Create `createCoCreationSession` callable function
  - [x] 3.2: Create `pauseCoCreationSession` callable function
  - [x] 3.3: Create `resumeCoCreationSession` callable function
  - [x] 3.4: Create `recordSessionContribution` callable function
  - [x] 3.5: Add permission checks (guardian of child)
  - [x] 3.6: Write Cloud Function tests (20+ tests)

- [x] Task 4: Create Session Initiation UI Component (AC: 1, 5) ✅ 71 tests
  - [x] 4.1: Create `CoCreationSessionInitiation.tsx` main component
  - [x] 4.2: Create `ChildPresencePrompt.tsx` with "Sit together" message
  - [x] 4.3: Create `SessionStartButton.tsx` with loading state
  - [x] 4.4: Display selected template/draft summary before starting
  - [x] 4.5: Handle Epic 4 draft handoff (WizardDraft or TemplateDraft)
  - [x] 4.6: Design for screen sharing (large text, clear visual hierarchy)
  - [x] 4.7: Write component tests (25+ tests)

- [x] Task 5: Create Session State Management Hook (AC: 3, 4, 6) ✅ 51 tests
  - [x] 5.1: Create `useCoCreationSession` hook in `apps/web/src/hooks/`
  - [x] 5.2: Create coCreationSessionService.ts wrapping Firebase callable functions
  - [x] 5.3: Implement session mutation hooks (pause, resume, contribute)
  - [x] 5.4: Track lastActivityAt for timeout warning with debounced server updates
  - [x] 5.5: Implement 30-minute inactivity timeout warning state
  - [x] 5.6: Write hook tests (30 tests) + service tests (21 tests)

- [x] Task 6: Create Session Timeout Warning Component (AC: 6) ✅ 35 tests
  - [x] 6.1: Create `SessionTimeoutWarning.tsx` dialog component
  - [x] 6.2: Display countdown timer with urgency levels (normal/warning/critical)
  - [x] 6.3: Provide "Continue Session" and "Save & Exit" options
  - [x] 6.4: Activity tracking implemented in useCoCreationSession hook (Task 5)
  - [x] 6.5: Write timeout warning tests (35 tests)

- [x] Task 7: Integration with Epic 4 Drafts (AC: 1) ✅ 35 tests
  - [x] 7.1: Create useDraftLoader hook with WizardDraft support
  - [x] 7.2: Create useDraftLoader hook with TemplateDraft support
  - [x] 7.3: Parse URL params (draftType, draftId) and sessionStorage
  - [x] 7.4: transformDraftToTerms function for draft-to-terms conversion
  - [x] 7.5: Write integration tests (35 tests)

- [x] Task 8: Create Co-Creation Page Route (AC: 1-6) ✅ 21 tests
  - [x] 8.1: Create `/agreements/create/[childId]/page.tsx` Next.js route
  - [x] 8.2: Implement route protection (authenticated parent only)
  - [x] 8.3: Load child profile for session context
  - [x] 8.4: Integrate useDraftLoader and useCoCreationSession hooks
  - [x] 8.5: Handle session timeout warning with save & exit
  - [x] 8.6: Write page-level tests (21 tests)

- [x] Task 9: Accessibility and Polish (AC: 1-6) ✅ 38 tests
  - [x] 9.1: Ensure keyboard navigation throughout session initiation
  - [x] 9.2: Add ARIA labels for session status indicators
  - [x] 9.3: Implement focus management on state changes
  - [x] 9.4: Add screen reader announcements for session events
  - [x] 9.5: Ensure touch targets meet 44x44px minimum (NFR49)
  - [x] 9.6: Write accessibility tests (38 tests)

## Dev Notes

### Previous Story Intelligence (Story 4.4, 4.5)

**Story 4.4** (Quick Start Wizard) created the WizardDraft interface for Epic 5 handoff:
```typescript
// apps/web/src/components/quick-start/QuickStartWizardProvider.tsx:76-87
export interface WizardDraft {
  childAge: string
  templateId: string
  customizations: {
    screenTimeMinutes: number
    bedtimeCutoff: string
    monitoringLevel: string
    selectedRules: string[]
  }
  createdAt: string
}
```

**Story 4.5** (Template Customization) created the TemplateDraft interface:
```typescript
// apps/web/src/components/templates/customization/useTemplateDraft.ts
interface TemplateDraft {
  templateId: string
  childId: string
  originalTemplate: AgreementTemplate  // For comparison
  customizations: {
    screenTimeMinutes: number | null    // null = use original
    weekendScreenTimeMinutes: number | null
    bedtimeCutoff: string | null
    monitoringLevel: MonitoringLevel | null
    rules: {
      enabled: string[]    // IDs of enabled template rules
      disabled: string[]   // IDs of disabled template rules
      custom: CustomRule[] // User-added rules
    }
  }
  modifiedAt: string
  createdAt: string
}
```

**Pattern to Follow:** Both use sessionStorage with JSON persistence. The co-creation session should consume either format and transform to session terms.

### Architecture Patterns

**Component Structure:**
```
apps/web/src/
├── app/
│   └── agreements/
│       └── create/
│           └── [childId]/
│               ├── page.tsx           (Route handler)
│               └── layout.tsx         (Session provider wrapper)
├── components/
│   └── co-creation/
│       ├── CoCreationSessionInitiation.tsx   (Main initiation component)
│       ├── ChildPresencePrompt.tsx           (Sit together prompt)
│       ├── SessionStartButton.tsx            (Start button with states)
│       ├── SessionTimeoutWarning.tsx         (Timeout dialog)
│       ├── CoCreationSessionProvider.tsx     (Context provider)
│       ├── index.ts                          (Barrel exports)
│       └── __tests__/
│           ├── CoCreationSessionInitiation.test.tsx
│           ├── ChildPresencePrompt.test.tsx
│           ├── SessionTimeoutWarning.test.tsx
│           └── CoCreation.integration.test.tsx
└── hooks/
    └── useCoCreationSession.ts               (Session state hook)

apps/functions/src/
├── callable/
│   ├── createCoCreationSession.ts
│   ├── pauseCoCreationSession.ts
│   └── resumeCoCreationSession.ts
├── services/
│   └── coCreationService.ts                  (Business logic)
└── __tests__/
    └── coCreation/

packages/contracts/src/
└── co-creation-session.schema.ts             (Zod schemas)
```

**Session Schema Structure:**
```typescript
// packages/contracts/src/co-creation-session.schema.ts
import { z } from 'zod'

export const sessionStatusSchema = z.enum([
  'initializing',  // Session created, waiting for child presence confirmation
  'active',        // Both parties engaged, building agreement
  'paused',        // Family taking a break, can resume
  'completed',     // Agreement finished, ready for signing (Epic 6)
  'abandoned',     // Session abandoned (30 days without activity)
])

export type SessionStatus = z.infer<typeof sessionStatusSchema>

export const sessionContributorSchema = z.enum(['parent', 'child'])

export type SessionContributor = z.infer<typeof sessionContributorSchema>

export const sessionContributionSchema = z.object({
  id: z.string().uuid(),
  contributor: sessionContributorSchema,
  action: z.enum(['added_term', 'modified_term', 'removed_term', 'marked_for_discussion', 'resolved_discussion']),
  termId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
})

export type SessionContribution = z.infer<typeof sessionContributionSchema>

export const coCreationSessionSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().min(1),
  childId: z.string().min(1),
  initiatedBy: z.string().min(1),  // Parent UID who started
  status: sessionStatusSchema,

  // Source draft (either from wizard or customization)
  sourceDraft: z.object({
    type: z.enum(['wizard', 'template_customization', 'blank']),
    templateId: z.string().optional(),
    draftId: z.string().optional(),
  }),

  // Agreement terms being built (grows during session)
  terms: z.array(z.object({
    id: z.string().uuid(),
    type: z.enum(['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward']),
    content: z.record(z.unknown()),
    addedBy: sessionContributorSchema,
    status: z.enum(['accepted', 'discussion', 'removed']),
  })),

  // Contribution history for transparency
  contributions: z.array(sessionContributionSchema),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  pausedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
})

export type CoCreationSession = z.infer<typeof coCreationSessionSchema>
```

**Firestore Document Structure:**
```
/families/{familyId}/co-creation-sessions/{sessionId}
{
  id: "uuid",
  familyId: "familyId",
  childId: "childId",
  initiatedBy: "parentUid",
  status: "active",
  sourceDraft: { type: "wizard", templateId: "xxx" },
  terms: [...],
  contributions: [...],
  createdAt: timestamp,
  updatedAt: timestamp,
  lastActivityAt: timestamp
}
```

### State Management Pattern

Following project_context.md Rule 4:
- **Server data (session):** TanStack Query
- **Forms:** react-hook-form
- **UI-only (timeout timer):** Zustand or local state

```typescript
// apps/web/src/hooks/useCoCreationSession.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFunctions, httpsCallable } from 'firebase/functions'

export function useCoCreationSession(sessionId: string | null) {
  const queryClient = useQueryClient()
  const functions = getFunctions()

  // Fetch session data
  const session = useQuery({
    queryKey: ['co-creation-session', sessionId],
    queryFn: async () => {
      const getSession = httpsCallable(functions, 'getCoCreationSession')
      const result = await getSession({ sessionId })
      return result.data as CoCreationSession
    },
    enabled: !!sessionId,
  })

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const create = httpsCallable(functions, 'createCoCreationSession')
      return create(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-creation-session'] })
    },
  })

  // ... pause, resume, contribute mutations

  return { session, createSession, pauseSession, resumeSession, recordContribution }
}
```

### Screen Sharing Design Considerations

Per AC #5, UI must work for screen sharing where both parent and child view together:

1. **Large, readable typography** - minimum 16px body, 24px+ headings
2. **High contrast colors** - meet WCAG AAA (7:1) for main content
3. **Clear visual hierarchy** - parent vs child contributions distinct
4. **Minimal scrolling** - single-screen views where possible
5. **Touch-friendly targets** - 44x44px minimum per NFR49
6. **No simultaneous editing** - turn-based contributions to avoid confusion

### Timeout Warning Implementation

```typescript
// Session timeout constants
const INACTIVITY_WARNING_MS = 25 * 60 * 1000  // 25 minutes
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000  // 30 minutes

// Activity tracking in hook
useEffect(() => {
  const updateActivity = debounce(() => {
    recordActivity()  // Updates lastActivityAt in Firestore
  }, 5000)

  window.addEventListener('mousemove', updateActivity)
  window.addEventListener('keydown', updateActivity)

  return () => {
    window.removeEventListener('mousemove', updateActivity)
    window.removeEventListener('keydown', updateActivity)
  }
}, [])
```

### NFR Compliance Requirements

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR42 | Screen reader accessible | ARIA labels on all session elements |
| NFR43 | Keyboard navigable | Tab order logical, focus visible |
| NFR45 | 4.5:1 contrast | All text meets WCAG AA contrast |
| NFR46 | Visible focus indicators | 2px solid outline on :focus-visible |
| NFR49 | 44x44px touch targets | min-h-[44px] min-w-[44px] on buttons |
| NFR60 | 100 conditions max | Validate term count in schema |
| NFR65 | 6th-grade reading level | All UI text at appropriate level |

### Testing Standards

Per project_context.md:
- Unit tests co-located with components (*.test.tsx)
- Use Vitest + React Testing Library
- Integration tests use Firebase Emulators
- Test accessibility with ARIA queries

**Test Coverage Targets:**
- Schema validation: 25+ tests
- Service functions: 30+ tests
- Cloud Functions: 20+ tests
- Session initiation UI: 25+ tests
- Session hook: 20+ tests
- Timeout warning: 15+ tests
- Draft integration: 15+ tests
- Page tests: 10+ tests
- Accessibility: 15+ tests
- **Total: 175+ tests**

### Key Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @fledgely/contracts | workspace | Session schemas |
| @tanstack/react-query | ^5.x | Server state management |
| firebase/functions | ^10.x | Callable function invocation |
| uuid | ^9.x | Generate session/contribution IDs |
| shadcn/ui | latest | Dialog, Button, Alert |
| lodash-es | ^4.x | debounce for activity tracking |

### Security Considerations

1. **Permission checks** - Only guardians of the child can create/access session
2. **Family isolation** - Sessions stored under /families/{familyId}/ path
3. **Audit trail** - All contributions logged with contributor ID
4. **No cross-family access** - Security rules enforce family boundary

### References

- [Source: docs/epics/epic-list.md#Epic-5] - Epic 5 context and all stories
- [Source: docs/epics/epic-list.md#Story-5.1] - Original acceptance criteria
- [Source: docs/sprint-artifacts/stories/4-4-quick-start-wizard.md] - WizardDraft interface
- [Source: docs/sprint-artifacts/stories/4-5-template-customization-preview.md] - TemplateDraft interface
- [Source: apps/web/src/components/quick-start/QuickStartWizardProvider.tsx:76-87] - Draft type definition
- [Source: docs/project_context.md] - Implementation patterns
- [Source: packages/contracts/src/agreement-template.schema.ts] - Template schema patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- All 9 tasks completed with comprehensive test coverage
- Total tests: 400+ (exceeds 175+ target)
- All acceptance criteria met (AC #1-6)
- Accessibility features verified (NFR43-49)

### File List

**Contracts (Task 1)**
- packages/contracts/src/co-creation-session.schema.ts
- packages/contracts/src/__tests__/co-creation-session.schema.test.ts

**Functions (Tasks 2-3)**
- apps/functions/src/services/coCreationService.ts
- apps/functions/src/services/__tests__/coCreationService.test.ts
- apps/functions/src/co-creation/index.ts
- apps/functions/src/co-creation/__tests__/coCreationCallable.test.ts

**Web App (Tasks 4-9)**
- apps/web/src/services/coCreationSessionService.ts
- apps/web/src/services/__tests__/coCreationSessionService.test.ts
- apps/web/src/hooks/useCoCreationSession.ts
- apps/web/src/hooks/useCoCreationSession.test.ts
- apps/web/src/components/co-creation/index.ts
- apps/web/src/components/co-creation/CoCreationSessionInitiation.tsx
- apps/web/src/components/co-creation/ChildPresencePrompt.tsx
- apps/web/src/components/co-creation/SessionStartButton.tsx
- apps/web/src/components/co-creation/SessionTimeoutWarning.tsx
- apps/web/src/components/co-creation/useDraftLoader.ts
- apps/web/src/components/co-creation/__tests__/CoCreationSessionInitiation.test.tsx
- apps/web/src/components/co-creation/__tests__/ChildPresencePrompt.test.tsx
- apps/web/src/components/co-creation/__tests__/SessionStartButton.test.tsx
- apps/web/src/components/co-creation/__tests__/SessionTimeoutWarning.test.tsx
- apps/web/src/components/co-creation/__tests__/useDraftLoader.test.ts
- apps/web/src/components/co-creation/__tests__/accessibility.test.tsx
- apps/web/src/app/agreements/create/[childId]/page.tsx
- apps/web/src/app/agreements/create/[childId]/page.test.tsx

