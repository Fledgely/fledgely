# Story 7.5.3: Signal Confirmation & Resources

## Status: done

## Story

As a **child who triggered a safety signal**,
I want **confirmation that my signal was received and immediate resources**,
So that **I know help is coming and have something to do while I wait**.

## Acceptance Criteria

1. **AC1: Discrete confirmation display**
   - Given a child has triggered a safety signal
   - When signal is sent (or queued if offline)
   - Then child sees discrete confirmation ("Someone will reach out")
   - And confirmation does not draw attention to casual observer
   - And confirmation is styled to look like normal app feedback

2. **AC2: Crisis resources with direct links**
   - Given confirmation is displayed
   - When child views the confirmation
   - Then crisis resources with direct links/numbers are shown
   - And resources are clickable/tappable to call or open
   - And resources include national crisis lines (988, etc.)
   - And resources are jurisdiction-appropriate when possible

3. **AC3: Dismissible confirmation**
   - Given confirmation is displayed
   - When child interacts to dismiss
   - Then confirmation disappears immediately
   - And no trace of confirmation persists in UI
   - And confirmation auto-dismisses after 30 seconds if not interacted

4. **AC4: Crisis chat option**
   - Given confirmation is displayed
   - When child views the confirmation
   - Then an option for crisis chat appears (if available)
   - And chat opens in new tab/window to external resource
   - And chat link is clearly labeled as "Chat with someone now"

5. **AC5: Emergency 911 message**
   - Given confirmation is displayed
   - When child views the confirmation
   - Then "If in immediate danger, call 911" message is prominently shown
   - And 911 message is at top of resources list
   - And 911 is tappable/clickable to initiate call on mobile

6. **AC6: Child-appropriate language**
   - Given confirmation is displayed
   - When child reads the content
   - Then all text is at 6th-grade reading level or below
   - And language is reassuring, not clinical
   - And no scary/alarming terminology is used

## Technical Tasks

### Task 1: Create SignalConfirmation Data Model (AC: #1, #2, #4, #6)

Create Zod schemas and types for confirmation and resources.

**Files:**

- `packages/shared/src/contracts/signalConfirmation.ts` (new)
- `packages/shared/src/contracts/signalConfirmation.test.ts` (new)

**Types:**

```typescript
interface CrisisResource {
  id: string
  name: string // e.g., "Crisis Text Line"
  description: string // Child-friendly description
  type: 'phone' | 'text' | 'chat' | 'website'
  value: string // Phone number, URL, or SMS shortcode
  priority: number // Display order (lower = higher priority)
  jurisdictions: string[] // Empty = universal
  available24x7: boolean
  chatAvailable: boolean
}

interface SignalConfirmation {
  signalId: string
  displayedAt: Date
  dismissedAt: Date | null
  resources: CrisisResource[]
  emergencyMessageShown: boolean
  autoDismissAfterMs: number // Default 30000
}

interface ConfirmationContent {
  headerText: string // "Someone will reach out"
  bodyText: string // Reassuring message
  emergencyText: string // "If in immediate danger, call 911"
  chatPromptText: string // "Chat with someone now"
  dismissButtonText: string // "Got it" or "OK"
}
```

**Tests:** 25+ tests for schema validation, factory functions, child-appropriate content validation

### Task 2: CrisisResourceService (AC: #2, #4)

Create service for managing and retrieving crisis resources.

**Files:**

- `packages/shared/src/services/crisisResourceService.ts` (new)
- `packages/shared/src/services/crisisResourceService.test.ts` (new)

**Functions:**

```typescript
// Get resources for jurisdiction (with universal fallback)
function getResourcesForJurisdiction(jurisdiction: string): CrisisResource[]

// Get all universal resources (always available)
function getUniversalResources(): CrisisResource[]

// Get chat-enabled resources
function getChatResources(): CrisisResource[]

// Check if chat is available for jurisdiction
function isChatAvailable(jurisdiction: string): boolean

// Get emergency number for jurisdiction (911 for US, etc.)
function getEmergencyNumber(jurisdiction: string): string

// Validate resource is still active (for external URLs)
function validateResourceActive(resourceId: string): Promise<boolean>
```

**Built-in Resources:**

- 988 Suicide & Crisis Lifeline (US)
- Crisis Text Line (text HOME to 741741)
- Childhelp National Child Abuse Hotline (1-800-422-4453)
- National Domestic Violence Hotline (1-800-799-7233)
- International equivalents for UK, CA, AU

**Tests:** 30+ tests covering resource retrieval, jurisdiction filtering, validation

### Task 3: ConfirmationContentService (AC: #1, #5, #6)

Create service for child-appropriate confirmation content.

**Files:**

- `packages/shared/src/services/confirmationContentService.ts` (new)
- `packages/shared/src/services/confirmationContentService.test.ts` (new)

**Functions:**

```typescript
// Get confirmation content (child-appropriate)
function getConfirmationContent(jurisdiction: string): ConfirmationContent

// Validate text is at appropriate reading level
function validateReadingLevel(text: string, maxGradeLevel: number): boolean

// Get age-adjusted content (younger = simpler)
function getAgeAdjustedContent(age: number, jurisdiction: string): ConfirmationContent

// Get offline confirmation content (queued message)
function getOfflineConfirmationContent(): ConfirmationContent
```

**Content Requirements:**

- Header: "Someone will reach out" (not "Signal received" or technical language)
- Body: "You did the right thing by asking for help. Someone who can help will contact you soon."
- Emergency: "If you are in danger right now, call 911"
- Dismiss: "Got it" or "OK"

**Tests:** 25+ tests for content generation, reading level validation, age adjustment

### Task 4: SignalConfirmationUI Component (AC: #1, #3)

Create React component for confirmation display.

**Files:**

- `apps/web/src/components/safety/SignalConfirmation.tsx` (new)
- `apps/web/src/components/safety/SignalConfirmation.test.tsx` (new)

**Component:**

```typescript
interface SignalConfirmationProps {
  signalId: string
  jurisdiction: string
  childAge: number
  isOffline: boolean
  onDismiss: () => void
  autoDismissMs?: number // Default 30000
}

function SignalConfirmation({
  signalId,
  jurisdiction,
  childAge,
  isOffline,
  onDismiss,
  autoDismissMs = 30000,
}: SignalConfirmationProps): JSX.Element
```

**Features:**

- Styled as subtle modal/toast (not alarming)
- Background overlay is semi-transparent, not dark
- Auto-dismiss after 30 seconds with visual countdown
- Keyboard accessible (Escape to dismiss)
- Screen reader announces confirmation
- No animation that draws attention

**Tests:** 20+ tests for rendering, auto-dismiss, accessibility

### Task 5: CrisisResourceList Component (AC: #2, #4, #5)

Create React component for displaying crisis resources.

**Files:**

- `apps/web/src/components/safety/CrisisResourceList.tsx` (new)
- `apps/web/src/components/safety/CrisisResourceList.test.tsx` (new)

**Component:**

```typescript
interface CrisisResourceListProps {
  resources: CrisisResource[]
  emergencyNumber: string
  showChatOption: boolean
  onResourceClick: (resource: CrisisResource) => void
}

function CrisisResourceList({
  resources,
  emergencyNumber,
  showChatOption,
  onResourceClick,
}: CrisisResourceListProps): JSX.Element
```

**Features:**

- Emergency (911) always at top with prominent styling
- Resources sorted by priority
- Phone numbers are tel: links (tappable on mobile)
- Text resources show SMS instructions
- Chat resources open in new tab
- Icons indicate resource type

**Tests:** 20+ tests for rendering, link handling, accessibility

### Task 6: Integration with SafetySignalTrigger (AC: #1)

Integrate confirmation display with signal triggering flow.

**Files:**

- `apps/web/src/hooks/useSafetySignal.ts` (modify)
- `apps/web/src/hooks/useSafetySignal.test.ts` (modify)
- `packages/extension/src/content/SafetySignalHandler.ts` (modify if exists)

**Integration Points:**

```typescript
// After signal is triggered (existing hook)
const { triggerSignal, isConfirmationVisible, dismissConfirmation } = useSafetySignal()

// Signal trigger now shows confirmation
async function triggerSignal() {
  const signal = await createAndSendSignal()
  setConfirmationVisible(true)
  setConfirmationSignalId(signal.id)
  // Auto-dismiss timer starts
}
```

**Tests:** 15+ tests for integration, state management

### Task 7: Offline Confirmation Handling (AC: #1)

Handle confirmation when signal is queued offline.

**Files:**

- `packages/shared/src/services/offlineConfirmationService.ts` (new)
- `packages/shared/src/services/offlineConfirmationService.test.ts` (new)

**Functions:**

```typescript
// Get offline-specific confirmation content
function getOfflineConfirmation(): ConfirmationContent

// Check if should show resources despite offline status
function shouldShowResourcesOffline(): boolean

// Get cached resources for offline use
function getCachedResources(): CrisisResource[]

// Store resources for offline access
function cacheResourcesForOffline(resources: CrisisResource[]): Promise<void>
```

**Offline Message:**

- "Your message is saved and will be sent when you're back online"
- Still shows crisis resources (cached)
- Still shows 911 message

**Tests:** 15+ tests for offline handling, caching

### Task 8: Confirmation Analytics (Admin Only) (AC: #3)

Track confirmation interactions for safety monitoring.

**Files:**

- `packages/shared/src/services/confirmationAnalyticsService.ts` (new)
- `packages/shared/src/services/confirmationAnalyticsService.test.ts` (new)

**Events:**

```typescript
interface ConfirmationAnalyticsEvent {
  signalId: string
  eventType: 'displayed' | 'dismissed' | 'auto_dismissed' | 'resource_clicked'
  resourceId?: string
  timestamp: Date
  durationMs?: number // How long confirmation was visible
}
```

**Security:**

- Events stored in admin-only collection
- NO family access to analytics
- Used only for improving resources and UX

**Tests:** 15+ tests for event tracking, security isolation

## Dev Notes

### Critical Safety Requirements

**UI MUST:**

- Look like normal app feedback (not scary)
- Be dismissible immediately
- Not persist after dismissal
- Include 911 message prominently
- Use child-friendly language only

**UI MUST NOT:**

- Draw attention from observers
- Use clinical/scary terminology
- Require multiple clicks to dismiss
- Show any parent/family information
- Log anything to family-visible audit trail

### Previous Story Learnings (Story 7.5.2)

From Story 7.5.2 implementation:

- CrisisPartner types in `packages/shared/src/contracts/crisisPartner.ts`
- Signal routing in `packages/shared/src/services/signalRoutingService.ts`
- Blackout service in `packages/shared/src/services/signalBlackoutService.ts`
- 329 tests with comprehensive TDD approach

**Key patterns to follow:**

- Use existing SafetySignal types from safetySignal.ts
- Follow Zod schema patterns from crisisPartner.ts
- Use same test structure (describe blocks, beforeEach, mocks)
- Keep all safety-related data isolated from family access

### Architecture Patterns

**From Epic 0.5 (Safe Account Escape):**

- Domestic abuse resource referral patterns (Story 0.5.9)
- Stealth notification patterns (Story 0.5.7)

**From Story 7.5.1 (Hidden Safety Signal):**

- SafetySignal contract at `packages/shared/src/contracts/safetySignal.ts`
- SafetySignalService at `packages/shared/src/services/safetySignalService.ts`
- Status transitions: queued → pending → sent → delivered → acknowledged

### File Structure Requirements

```
packages/shared/src/
├── contracts/
│   ├── signalConfirmation.ts      # New: Confirmation schemas
│   └── signalConfirmation.test.ts
├── services/
│   ├── crisisResourceService.ts    # New: Resource management
│   ├── crisisResourceService.test.ts
│   ├── confirmationContentService.ts    # New: Child-friendly content
│   ├── confirmationContentService.test.ts
│   ├── offlineConfirmationService.ts    # New: Offline handling
│   ├── offlineConfirmationService.test.ts
│   ├── confirmationAnalyticsService.ts  # New: Admin analytics
│   └── confirmationAnalyticsService.test.ts

apps/web/src/components/safety/
├── SignalConfirmation.tsx          # New: Confirmation modal
├── SignalConfirmation.test.tsx
├── CrisisResourceList.tsx          # New: Resource display
└── CrisisResourceList.test.tsx
```

### Testing Standards

- TDD approach: Write tests first
- Minimum 165 tests across all tasks
- Unit tests for each service function
- Component tests with React Testing Library
- Accessibility tests for all UI components
- Test reading level validation
- Test offline scenarios
- Test auto-dismiss behavior

### Crisis Resource Data

**US Resources (Priority Order):**

1. 911 (Emergency) - phone
2. 988 Suicide & Crisis Lifeline - phone/chat
3. Crisis Text Line (HOME to 741741) - text
4. Childhelp (1-800-422-4453) - phone
5. National DV Hotline (1-800-799-7233) - phone/chat

**International:**

- UK: 999 (Emergency), Childline (0800 1111)
- Canada: 911 (Emergency), Kids Help Phone (1-800-668-6868)
- Australia: 000 (Emergency), Kids Helpline (1800 55 1800)

### Dependencies

- **Story 7.5.1:** SafetySignal types and service (DONE)
- **Story 7.5.2:** Signal routing and status updates (DONE)
- **Story 7.5.7:** 48-hour blackout (integration point)

### References

- [Source: docs/epics/epic-list.md#Story-7.5.3 - Signal Confirmation & Resources]
- [Source: docs/sprint-artifacts/stories/7-5-1-hidden-safety-signal-access.md - Signal infrastructure]
- [Source: docs/sprint-artifacts/stories/7-5-2-external-signal-routing.md - Routing patterns]
- [Source: docs/sprint-artifacts/stories/0-5-9-domestic-abuse-resource-referral.md - Resource referral patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List
