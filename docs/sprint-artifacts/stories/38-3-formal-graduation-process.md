# Story 38-3: Formal Graduation Process

## Story

As **a family**,
I want **a formal process to graduate from monitoring**,
So that **the transition is celebrated and documented**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Both parties must confirm graduation decision (dual-consent)
- [x] AC2: Graduation date can be immediate or scheduled for future
- [x] AC3: Celebration message displayed: "Congratulations on graduating from monitoring!"
- [x] AC4: Monitoring stops on graduation date (no new screenshots captured)
- [x] AC5: Existing data enters deletion queue with configurable retention
- [x] AC6: Child account transitions to alumni status
- [x] AC7: Graduation certificate/record generated for family

## Technical Tasks

### Task 1: GraduationProcess Data Model

Create Zod schemas and types for the formal graduation process.

**Files:**

- `packages/shared/src/contracts/graduationProcess.ts` (new)
- `packages/shared/src/contracts/graduationProcess.test.ts` (new)

**Types:**

```typescript
type GraduationType = 'immediate' | 'scheduled'
type AccountStatus = 'active' | 'alumni' | 'deleted'

interface GraduationDecision {
  conversationId: string
  familyId: string
  childId: string
  graduationType: GraduationType
  scheduledDate: Date | null // null for immediate
  childConfirmation: ConfirmationRecord | null
  parentConfirmations: ConfirmationRecord[]
  status: 'pending' | 'confirmed' | 'processing' | 'completed'
  createdAt: Date
  confirmedAt: Date | null
  completedAt: Date | null
}

interface ConfirmationRecord {
  userId: string
  role: 'child' | 'parent'
  confirmedAt: Date
  selectedGraduationType: GraduationType
  scheduledDatePreference: Date | null
}

interface GraduationCertificate {
  id: string
  childId: string
  familyId: string
  childName: string
  graduationDate: Date
  monthsAtPerfectTrust: number
  totalMonitoringDuration: number // months
  generatedAt: Date
}

interface AlumniRecord {
  childId: string
  familyId: string
  graduatedAt: Date
  certificateId: string
  previousAccountData: {
    monitoringStartDate: Date
    totalMonitoringMonths: number
    finalTrustScore: number
  }
}

interface DeletionQueueEntry {
  id: string
  childId: string
  familyId: string
  dataType: 'screenshots' | 'flags' | 'activity_logs' | 'trust_history' | 'all'
  scheduledDeletionDate: Date
  retentionDays: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt: Date | null
}

// Configuration
const GRADUATION_RETENTION_DAYS = 30 // Data retained for 30 days after graduation
const MIN_SCHEDULE_DAYS = 1 // Must schedule at least 1 day ahead
const MAX_SCHEDULE_DAYS = 90 // Cannot schedule more than 90 days ahead
```

**Acceptance Criteria:** AC1, AC2, AC5, AC6

### Task 2: GraduationProcessService

Create service for managing the formal graduation process.

**Files:**

- `packages/shared/src/services/graduationProcessService.ts` (new)
- `packages/shared/src/services/graduationProcessService.test.ts` (new)

**Functions:**

```typescript
// Initiate graduation decision (after conversation completed with 'graduated' outcome)
function initiateGraduationDecision(
  conversationId: string,
  childId: string,
  familyId: string,
  parentIds: string[]
): GraduationDecision

// Record confirmation from child or parent
function recordGraduationConfirmation(
  decisionId: string,
  userId: string,
  role: 'child' | 'parent',
  graduationType: GraduationType,
  scheduledDate: Date | null
): GraduationDecision

// Check if all parties have confirmed
function hasAllConfirmations(decision: GraduationDecision): boolean

// Resolve graduation type (when preferences differ)
function resolveGraduationType(decision: GraduationDecision): {
  type: GraduationType
  date: Date
}

// Execute graduation (stops monitoring, queues deletion)
function executeGraduation(decisionId: string): GraduationResult

// Get graduation status
function getGraduationStatus(decisionId: string): GraduationDecision | null

// Check if child is graduated
function isChildGraduated(childId: string): boolean

// Get pending graduations for family
function getPendingGraduations(familyId: string): GraduationDecision[]
```

**Acceptance Criteria:** AC1, AC2, AC4

### Task 3: CelebrationMessageService

Create service for graduation celebration messaging.

**Files:**

- `packages/shared/src/services/graduationCelebrationService.ts` (new)
- `packages/shared/src/services/graduationCelebrationService.test.ts` (new)

**Functions:**

```typescript
// Get main celebration message
function getCelebrationMessage(viewerType: ViewerType, childName: string): string
// Child: "Congratulations! You've graduated from monitoring!"
// Parent: "Congratulations! [ChildName] has graduated from monitoring!"

// Get achievement summary
function getAchievementSummary(monthsAtPerfectTrust: number, totalMonitoringMonths: number): string
// "12 months at 100% trust, 24 months total monitoring journey"

// Get transition message
function getTransitionMessage(viewerType: ViewerType): string
// Child: "Your account is now in alumni status. No monitoring data is collected."
// Parent: "Your child's account has transitioned to alumni status."

// Get next steps message
function getNextStepsMessage(viewerType: ViewerType): string
// Child: "Digital wellness resources are available if you want them."
// Parent: "Resources for supporting your independent teen are available."

// Get certificate congratulations
function getCertificateCongratulations(
  childName: string,
  graduationDate: Date,
  monthsCompleted: number
): CertificateContent
```

**Acceptance Criteria:** AC3

### Task 4: AlumniTransitionService

Create service for transitioning child to alumni status.

**Files:**

- `packages/shared/src/services/alumniTransitionService.ts` (new)
- `packages/shared/src/services/alumniTransitionService.test.ts` (new)

**Functions:**

```typescript
// Transition child to alumni status
function transitionToAlumni(
  childId: string,
  graduationData: {
    monitoringStartDate: Date
    totalMonitoringMonths: number
    finalTrustScore: number
    certificateId: string
    graduationDate: Date
  }
): AlumniRecord

// Get alumni record for child
function getAlumniRecord(childId: string): AlumniRecord | null

// Check if child is alumni
function isAlumni(childId: string): boolean

// Get alumni status display info
function getAlumniStatusInfo(record: AlumniRecord): {
  graduatedAt: string
  duration: string
  hasResources: boolean
}

// Update alumni preferences (optional resource notifications)
function updateAlumniPreferences(childId: string, preferences: AlumniPreferences): void
```

**Acceptance Criteria:** AC6

### Task 5: DataDeletionQueueService

Create service for queuing data deletion after graduation.

**Files:**

- `packages/shared/src/services/dataDeletionQueueService.ts` (new)
- `packages/shared/src/services/dataDeletionQueueService.test.ts` (new)

**Functions:**

```typescript
// Queue child data for deletion
function queueDataForDeletion(
  childId: string,
  familyId: string,
  retentionDays: number
): DeletionQueueEntry[]

// Get deletion queue status
function getDeletionQueueStatus(childId: string): DeletionQueueEntry[]

// Get data types pending deletion
function getPendingDeletionTypes(childId: string): {
  type: DataType
  scheduledDate: Date
  status: DeletionStatus
}[]

// Calculate deletion dates
function calculateDeletionDate(graduationDate: Date, retentionDays: number): Date

// Get deletion confirmation message
function getDeletionConfirmationMessage(dataTypes: DataType[], deletionDate: Date): string
// "All screenshots, flags, and activity logs will be permanently deleted on [date]"

// Process deletion queue (scheduled function)
function processReadyDeletions(): ProcessingResult

// Cancel pending deletion (if child rejoins)
function cancelPendingDeletion(childId: string): void
```

**Acceptance Criteria:** AC5

### Task 6: GraduationCertificateService

Create service for generating graduation certificates.

**Files:**

- `packages/shared/src/services/graduationCertificateService.ts` (new)
- `packages/shared/src/services/graduationCertificateService.test.ts` (new)

**Functions:**

```typescript
// Generate graduation certificate
function generateCertificate(
  childId: string,
  familyId: string,
  childName: string,
  graduationData: {
    graduationDate: Date
    monthsAtPerfectTrust: number
    totalMonitoringDuration: number
  }
): GraduationCertificate

// Get certificate by ID
function getCertificate(certificateId: string): GraduationCertificate | null

// Get certificate display data
function getCertificateDisplayData(certificate: GraduationCertificate): {
  title: string
  childName: string
  dateFormatted: string
  achievementText: string
  journeyText: string
}

// Get certificate for child
function getCertificateForChild(childId: string): GraduationCertificate | null

// Validate certificate authenticity
function validateCertificate(certificateId: string): boolean
```

**Acceptance Criteria:** AC7

### Task 7: GraduationConfirmationFlow Component

Create UI component for graduation confirmation.

**Files:**

- `apps/web/src/components/graduation/GraduationConfirmationFlow.tsx` (new)
- `apps/web/src/components/graduation/GraduationConfirmationFlow.test.tsx` (new)

**Props:**

```typescript
interface GraduationConfirmationFlowProps {
  decision: GraduationDecision
  viewerType: ViewerType
  childName: string
  hasConfirmed: boolean
  onConfirm: (type: GraduationType, scheduledDate: Date | null) => void
  onCancel?: () => void
}
```

**Features:**

- Dual-consent confirmation UI
- Immediate vs scheduled graduation selection
- Date picker for scheduled graduation
- Status of who has/hasn't confirmed
- Clear explanation of what graduation means
- Cancel option (before full confirmation)

**Acceptance Criteria:** AC1, AC2

### Task 8: GraduationCelebration Component

Create UI component for graduation celebration.

**Files:**

- `apps/web/src/components/graduation/GraduationCelebration.tsx` (new)
- `apps/web/src/components/graduation/GraduationCelebration.test.tsx` (new)

**Props:**

```typescript
interface GraduationCelebrationProps {
  childName: string
  viewerType: ViewerType
  certificate: GraduationCertificate
  deletionInfo: {
    scheduledDate: Date
    dataTypes: DataType[]
  }
  onViewCertificate: () => void
  onViewResources?: () => void
}
```

**Features:**

- Celebratory visual design (confetti, success colors)
- Main congratulations message
- Achievement summary display
- Certificate preview/download
- Deletion timeline information
- Links to post-graduation resources

**Acceptance Criteria:** AC3, AC7

### Task 9: AlumniStatusBadge Component

Create UI component showing alumni status.

**Files:**

- `apps/web/src/components/graduation/AlumniStatusBadge.tsx` (new)
- `apps/web/src/components/graduation/AlumniStatusBadge.test.tsx` (new)

**Props:**

```typescript
interface AlumniStatusBadgeProps {
  alumniRecord: AlumniRecord
  viewerType: ViewerType
  showDetails?: boolean
}
```

**Features:**

- Visual badge indicating alumni status
- Optional details panel (graduated date, monitoring duration)
- Different styling for child vs parent view
- Link to view certificate
- Clear "no monitoring" indicator

**Acceptance Criteria:** AC6

### Task 10: Integration Tests

Create integration tests for the complete graduation process.

**Files:**

- `apps/web/src/components/graduation/graduationProcess.integration.test.tsx` (new)

**Test Scenarios:**

- Complete flow: conversation → decision → confirmation → celebration
- Immediate graduation executes instantly
- Scheduled graduation waits for date
- Both parties must confirm (dual-consent)
- Celebration displays correctly for both viewers
- Data deletion queued with correct retention
- Alumni status applied after graduation
- Certificate generated and accessible
- Monitoring stops after graduation
- Cannot graduate without completed conversation

**Acceptance Criteria:** All ACs

## Dev Notes

### Dependency on Stories 38-1 and 38-2

This story builds on the graduation conversation system:

| Previous Story | Component                     | Usage in 38-3                         |
| -------------- | ----------------------------- | ------------------------------------- |
| 38-1           | `GraduationEligibilityStatus` | Eligibility tracking for certificate  |
| 38-2           | `GraduationConversation`      | Conversation outcome triggers process |
| 38-2           | `completeConversation()`      | Outcome='graduated' starts process    |

### FR71 Requirement

From Epic 38:

> "Family decides to graduate child"

This requires **dual-consent** - both child and parent(s) must confirm the graduation decision.

### Graduation Type Resolution

When parties select different graduation types:

- If any selects 'scheduled', use scheduled (most conservative)
- Scheduled date uses latest preferred date (ensures both agree on timing)

### Data Deletion Safety

Data enters a **deletion queue** with configurable retention:

- Default: 30 days after graduation
- Allows time for family to change mind
- Alumni can request earlier deletion
- Cannot be undone after deletion executes

### Monitoring Stop Mechanism

When graduation executes:

1. Child's `accountStatus` changes to 'alumni'
2. Device agents check status and stop capturing
3. No new screenshots, flags, or activity logs
4. Existing data preserved until deletion date

### Alumni Status Benefits

Alumni accounts have:

- Access to digital wellness resources (optional)
- View of their graduation certificate
- No monitoring capabilities
- Option to rejoin voluntarily (rare)

### Celebration Tone

Consistent with Epic 37 developmental framing:

- Emphasis on achievement and growth
- Celebratory, not transactional
- Family accomplishment, not just child's

### References

- [Source: packages/shared/src/contracts/graduationConversation.ts] - Conversation types
- [Source: packages/shared/src/services/graduationConversationService.ts] - Conversation management
- [Source: docs/epics/epic-list.md#Epic-38] - Epic requirements
- [Source: docs/sprint-artifacts/stories/38-2-graduation-conversation-trigger.md] - Story 38-2
