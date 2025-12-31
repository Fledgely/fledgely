# Story 21.2: Distress Detection Suppression (FR21A)

Status: done

## Story

As **the classification system**,
I want **to detect potential distress and SUPPRESS alerts**,
So that **crisis moments get help, not parent confrontation**.

## Acceptance Criteria

1. **AC1: Parent alert SUPPRESSED for distress indicators**
   - Given AI detects potential distress indicators
   - When classification includes self-harm, crisis resources, distress signals
   - Then parent alert is SUPPRESSED (not sent)
   - And classification continues normally for record

2. **AC2: Flag created but held in sensitive review queue**
   - Given distress concern is detected
   - When flag is created
   - Then flag status set to "sensitive_hold" instead of "pending"
   - And flag not visible to parents initially
   - And flag stored with suppressionReason

3. **AC3: Crisis URL detection prevents flag creation (INV-001)**
   - Given screenshot URL is being analyzed
   - When URL matches crisis allowlist (CRISIS_RESOURCES domains)
   - Then NO concern flag is created at all
   - And NO parent notification is sent
   - And screenshot classification proceeds but with crisisProtected: true

4. **AC4: Child sees "Need help?" resource link prominently** _(DEFERRED - Frontend Story)_
   - Given distress content is detected
   - When child views their activity
   - Then "Need help?" resource link is more prominent
   - And resources match detected concern category
   - **Note:** Backend stores `crisisProtected` and `concernFlags.category` for frontend use. UI implementation deferred to a dedicated frontend story.

5. **AC5: Suppression logged for internal audit only**
   - Given alert is suppressed
   - When suppression occurs
   - Then suppression logged to audit collection
   - And audit log NOT visible to parents
   - And log includes: screenshotId, concernCategory, suppressionReason, timestamp

6. **AC6: 48-hour delay before parent visibility (if at all)**
   - Given flag is in sensitive_hold status
   - When 48 hours have elapsed
   - Then flag MAY be released to parent (based on policy)
   - And release decision considers severity and context
   - And high-severity self-harm flags may remain suppressed indefinitely

## Tasks / Subtasks

- [x] Task 1: Add suppression status and types to shared schemas (AC: #2, #5)
  - [x] 1.1 Add `FLAG_STATUS_VALUES` constant with 'pending', 'sensitive_hold', 'reviewed', 'dismissed', 'released'
  - [x] 1.2 Add `flagStatusSchema` Zod enum
  - [x] 1.3 Add `DistressSuppressionLog` interface for audit
  - [x] 1.4 Add `suppressionReasonSchema` with values: 'self_harm_detected', 'crisis_url_visited', 'distress_signals'
  - [x] 1.5 Update `classificationResultSchema` to include optional `crisisProtected: boolean`
  - [x] 1.6 Write unit tests for new schemas

- [x] Task 2: Create crisis URL detection utility (AC: #3)
  - [x] 2.1 Create `isCrisisUrl(url: string): boolean` in functions
  - [x] 2.2 Import `CRISIS_RESOURCES` from @fledgely/shared
  - [x] 2.3 Check URL domain against all protected domains
  - [x] 2.4 Handle subdomain matching (\*.domain.org patterns)
  - [x] 2.5 Handle aliases from crisis resource definitions
  - [x] 2.6 Write comprehensive tests with various URL formats

- [x] Task 3: Implement distress detection in classifyScreenshot (AC: #1, #2, #3)
  - [x] 3.1 Add `isDistressRelated(concerns: ConcernFlag[])` helper
  - [x] 3.2 Check if any concern is 'Self-Harm Indicators' category
  - [x] 3.3 Check if screenshot URL matches crisis allowlist
  - [x] 3.4 If crisis URL: set `crisisProtected: true`, skip concern flag storage
  - [x] 3.5 If distress concern: set flag status to 'sensitive_hold'
  - [x] 3.6 Add `suppressionReason` to flag when suppressed
  - [x] 3.7 Write integration tests for suppression flows

- [x] Task 4: Create suppression audit logging (AC: #5)
  - [x] 4.1 Create `logSuppressionEvent()` function
  - [x] 4.2 Create `/suppressionAudit/{logId}` Firestore collection
  - [x] 4.3 Log includes: screenshotId, childId, concernCategory, suppressionReason, timestamp
  - [x] 4.4 Ensure audit collection has strict security rules (admin-only read)
  - [x] 4.5 Add Firestore index for audit queries
  - [x] 4.6 Write tests for audit logging

- [x] Task 5: Add 48-hour release mechanism (AC: #6)
  - [x] 5.1 Add `releasableAfter` timestamp field to sensitive_hold flags
  - [x] 5.2 Create scheduled function `processSensitiveHoldFlags()`
  - [x] 5.3 Function runs daily, checks flags older than 48 hours
  - [x] 5.4 High-severity self-harm flags remain suppressed (policy decision)
  - [x] 5.5 Medium/low severity may be released based on config
  - [x] 5.6 Released flags change status from 'sensitive_hold' to 'pending'
  - [x] 5.7 Write tests for release logic

- [x] Task 6: Update Firestore rules and indexes (AC: #2, #5)
  - [x] 6.1 Add `/suppressionAudit` collection with admin-only read
  - [x] 6.2 Add index for flags by status + timestamp
  - [x] 6.3 Add index for flags by releasableAfter timestamp
  - [x] 6.4 Verify parents cannot read sensitive_hold flags

## Dev Notes

### Previous Story Intelligence (Story 21-1)

Story 21-1 established the concern detection foundation:

- `concernFlagSchema` with category, severity, confidence, reasoning, detectedAt
- `detectConcerns()` method in GeminiClient
- `buildConcernDetectionPrompt()` for AI concern detection
- Concern flags stored in `classification.concernFlags[]` array
- Categories include `Self-Harm Indicators` which is the primary distress indicator

**Pattern from 21-1:**

```typescript
// Current flow in classifyScreenshot.ts
const concernResult = await geminiClient.detectConcerns(...)
const concernFlags: ConcernFlag[] = concernResult.concerns.map(...)

// Need to add BEFORE storing:
// 1. Check if URL is crisis resource
// 2. Check if any concern is distress-related
// 3. Apply suppression logic
```

### Crisis URL Detection Pattern

Use existing `getAllProtectedDomains()` from `@fledgely/shared`:

```typescript
import { getAllProtectedDomains } from '@fledgely/shared'

export function isCrisisUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const protectedDomains = getAllProtectedDomains()

    // Check exact match
    if (protectedDomains.has(hostname)) return true

    // Check parent domains (for subdomains)
    const parts = hostname.split('.')
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.')
      if (protectedDomains.has(parent)) return true
    }

    return false
  } catch {
    return false
  }
}
```

### Suppression Flow Design

```typescript
// In classifyScreenshot.ts
async function classifyScreenshot(job: ClassificationJob) {
  const { url } = job

  // Step 1: Check if crisis URL - no flags at all
  if (url && isCrisisUrl(url)) {
    result.crisisProtected = true
    // Skip all concern flag processing
    return { success: true, result, crisisProtected: true }
  }

  // Step 2: Normal classification
  const concernResult = await geminiClient.detectConcerns(...)

  // Step 3: Check for distress concerns
  const hasDistressContent = concernResult.concerns.some(
    c => c.category === 'Self-Harm Indicators'
  )

  // Step 4: Apply suppression if distress detected
  if (hasDistressContent) {
    // Set flag status to sensitive_hold
    const suppressedFlags = concernFlags.map(f =>
      f.category === 'Self-Harm Indicators'
        ? { ...f, status: 'sensitive_hold', suppressionReason: 'self_harm_detected', releasableAfter: Date.now() + 48 * 60 * 60 * 1000 }
        : f
    )

    // Log suppression for audit
    await logSuppressionEvent({
      screenshotId,
      childId,
      concernCategory: 'Self-Harm Indicators',
      suppressionReason: 'self_harm_detected',
      timestamp: Date.now(),
    })

    // Store with suppressed flags
    result.concernFlags = suppressedFlags
  }
}
```

### Audit Collection Schema

```typescript
interface DistressSuppressionLog {
  id: string
  screenshotId: string
  childId: string
  familyId: string
  concernCategory: ConcernCategory
  severity: ConcernSeverity
  suppressionReason: 'self_harm_detected' | 'crisis_url_visited' | 'distress_signals'
  timestamp: number
  releasableAfter?: number // When flag may be released to parent
  released?: boolean // Whether flag was eventually released
  releasedAt?: number
}
```

### Firestore Security Rules Addition

```javascript
// Add to firestore.rules
match /suppressionAudit/{logId} {
  // Only admin/service accounts can read
  allow read: if false; // Parents cannot see this
  allow write: if request.auth != null && request.auth.token.admin == true;
}
```

### Testing Requirements

1. **Unit Tests:**
   - `isCrisisUrl()` with various URL formats
   - Suppression reason schema validation
   - Flag status transitions

2. **Integration Tests:**
   - Crisis URL detection skips flag creation entirely
   - Self-harm concern creates sensitive_hold flag
   - Suppression audit log created correctly
   - 48-hour release scheduler logic

### Project Structure Notes

- `isCrisisUrl()` utility: `apps/functions/src/services/classification/crisisUrlDetector.ts`
- Suppression logging: `apps/functions/src/services/classification/suppressionAudit.ts`
- Scheduled release: `apps/functions/src/scheduled/processSensitiveHoldFlags.ts`
- Existing crisis data: `packages/shared/src/constants/crisis-urls.ts`

### References

- [Source: docs/epics/epic-list.md#Story 21.2] - Story requirements
- [Source: packages/shared/src/constants/crisis-urls.ts] - Crisis allowlist
- [Source: apps/functions/src/services/classification/classifyScreenshot.ts] - Current classification flow
- [Source: docs/sprint-artifacts/stories/21-1-concerning-content-categories.md] - Previous story patterns
- [Source: apps/functions/src/lib/notifications/stealthFilter.ts] - Similar suppression patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 tasks completed with comprehensive unit tests
- 1770+ tests passing across shared and functions packages
- Firestore security rules and indexes updated
- AC4 (Child "Need help?" resource link) deferred to frontend story - backend provides `crisisProtected` and `concernFlags.category` for UI consumption

### File List

- packages/shared/src/contracts/index.ts - Added suppression schemas
- packages/shared/src/contracts/classification.test.ts - Added 21 tests for suppression schemas
- packages/shared/src/index.ts - Exported suppression types
- apps/functions/src/services/classification/crisisUrlDetector.ts - Crisis URL detection
- apps/functions/src/services/classification/crisisUrlDetector.test.ts - 36 tests
- apps/functions/src/services/classification/suppressionAudit.ts - Audit logging
- apps/functions/src/services/classification/suppressionAudit.test.ts - 5 tests
- apps/functions/src/services/classification/classifyScreenshot.ts - Distress detection integration
- apps/functions/src/scheduled/processSensitiveHoldFlags.ts - 48-hour release scheduler
- apps/functions/src/scheduled/processSensitiveHoldFlags.test.ts - 25 tests
- apps/functions/src/scheduled/index.ts - Export scheduled function
- apps/functions/src/utils/adminAudit.ts - Added audit actions and resource types
- packages/firebase-rules/firestore.rules - Added suppressionAudit collection rules
- firestore.indexes.json - Added 3 indexes for suppressionAudit queries
