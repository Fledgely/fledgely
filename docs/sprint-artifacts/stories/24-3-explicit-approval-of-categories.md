# Story 24.3: Explicit Approval of Categories

Status: done

## Story

As a **parent**,
I want **to approve categories for specific apps**,
So that **AI knows what I consider appropriate**.

## Acceptance Criteria

1. **AC1: View app usage patterns**
   - Given parent views dashboard
   - When viewing app usage
   - Then parent can see which apps/sites the child uses

2. **AC2: Set app category preference**
   - Given parent views app usage patterns
   - When parent sets app category preference
   - Then parent can mark: "YouTube Kids = Educational (approved)"

3. **AC3: Approval reduces flag sensitivity**
   - Given parent approves app/category combination
   - When content from that app is classified
   - Then flag sensitivity is reduced for that app/category

4. **AC4: Disapproval increases flag sensitivity**
   - Given parent disapproves app/category combination
   - When content from that app is classified
   - Then flag sensitivity is increased for that app/category

5. **AC5: Per-family, per-child storage**
   - Given preferences are set
   - When stored
   - Then preferences stored per-family, per-child

6. **AC6: Override default thresholds**
   - Given preferences exist
   - When classification runs
   - Then preferences override default model thresholds

7. **AC7: Child-specific preferences**
   - Given parent sets preferences for child
   - When preferences apply
   - Then child-specific: "Gaming OK for Emma, flag for Jake"

## Tasks / Subtasks

- [x] Task 1: Create app category approval schema (AC: #2, #5, #7)
  - [x] 1.1 Add AppCategoryApproval document schema to shared contracts
  - [x] 1.2 Store: appIdentifier, category, approvalStatus (approved/disapproved/neutral), childId, familyId
  - [x] 1.3 Store under /children/{childId}/appApprovals/{approvalId}

- [x] Task 2: Create API service for app approvals (AC: #2, #5)
  - [x] 2.1 Create setAppCategoryApproval function
  - [x] 2.2 Create getAppApprovals function for a child
  - [x] 2.3 Create removeAppApproval function

- [x] Task 3: Integrate approvals with classification (AC: #3, #4, #6)
  - [x] 3.1 Load child's app approvals before classification
  - [x] 3.2 If approved: reduce confidence for flagging that category
  - [x] 3.3 If disapproved: increase confidence (lower threshold)
  - [x] 3.4 Integrate with existing familyBias from Story 24.2

- [x] Task 4: Create app approval UI components (AC: #1, #2, #7)
  - [x] 4.1 Create AppApprovalModal component
  - [x] 4.2 Show app name, current category, approval options
  - [x] 4.3 Allow per-child approval selection
  - [x] 4.4 Integrate into screenshot detail view or settings

- [x] Task 5: Add Firestore security rules (AC: #5)
  - [x] 5.1 Add rules for /children/{childId}/appApprovals/{approvalId}
  - [x] 5.2 Only guardians of the child can read/write approvals

## Dev Notes

### Previous Story Intelligence (Story 24-2)

Story 24-2 implemented family-specific model tuning:

- FamilyBiasWeights stored at /families/{familyId}/aiSettings/biasWeights
- Category adjustments applied during classification (-50 to +20 range)
- familyBias.ts service provides getFamilyBiasWeights and applyFamilyBiasToConcerns
- Minimum 5 corrections threshold before bias activates

**Key Files from Story 24-2:**

- `apps/functions/src/services/classification/familyBias.ts` - Family bias application
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Classification integration
- `packages/shared/src/contracts/index.ts` - FamilyBiasWeights schema

### App Category Approval Schema

```typescript
// Store at /children/{childId}/appApprovals/{approvalId}
export const appApprovalStatusSchema = z.enum(['approved', 'disapproved', 'neutral'])
export type AppApprovalStatus = z.infer<typeof appApprovalStatusSchema>

export const appCategoryApprovalSchema = z.object({
  id: z.string(),
  childId: z.string(),
  familyId: z.string(),
  // App identifier - could be domain, package name, or app name
  appIdentifier: z.string(), // e.g., "youtube.com", "com.spotify.music", "TikTok"
  appDisplayName: z.string(), // Human readable name
  // Which category the approval applies to
  category: concernCategorySchema, // e.g., "Violence", "Adult Content"
  // Approval status
  status: appApprovalStatusSchema,
  // Audit trail
  setByUid: z.string(), // Guardian who set this
  createdAt: z.number(),
  updatedAt: z.number(),
  // Optional notes
  notes: z.string().optional(),
})
export type AppCategoryApproval = z.infer<typeof appCategoryApprovalSchema>
```

### Approval Effect on Classification

When processing a screenshot:

1. Extract app identifier from screenshot metadata (URL domain or app name)
2. Load child's app approvals for that app
3. For each concern category being evaluated:
   - If `approved` for this app+category: reduce confidence by APPROVAL_ADJUSTMENT (e.g., -20)
   - If `disapproved` for this app+category: increase confidence by DISAPPROVAL_ADJUSTMENT (e.g., +15)
4. Apply in addition to existing family bias from Story 24-2

```typescript
const APPROVAL_ADJUSTMENTS = {
  approved: -20, // Reduce flagging sensitivity
  disapproved: +15, // Increase flagging sensitivity
  neutral: 0, // No adjustment
} as const

function applyAppApprovals(
  concerns: ConcernFlag[],
  appApprovals: AppCategoryApproval[],
  appIdentifier: string
): ConcernFlag[] {
  return concerns.map((concern) => {
    const approval = appApprovals.find(
      (a) => a.appIdentifier === appIdentifier && a.category === concern.category
    )

    if (!approval || approval.status === 'neutral') {
      return concern
    }

    const adjustment = APPROVAL_ADJUSTMENTS[approval.status]
    return {
      ...concern,
      confidence: Math.max(0, Math.min(100, concern.confidence + adjustment)),
    }
  })
}
```

### UI Integration Options

**Option A: Screenshot Detail Integration**

- When viewing a flagged screenshot, show "Approve [App] for [Category]" option
- Quick action to mark app/category as approved
- Similar placement to "Correct Classification" from Story 24-1

**Option B: Settings Page Integration**

- Add "App Preferences" section to dashboard/settings
- Show list of apps with activity
- Allow bulk approval/disapproval per category

**Option C: Both approaches**

- Quick approval on screenshot detail (reactive)
- Full management in settings (proactive)

### App Identifier Extraction

Screenshots have metadata including:

- URL for browser content → extract domain (youtube.com)
- App name for native apps → use as identifier

```typescript
function extractAppIdentifier(screenshotMetadata: ScreenshotMetadata): string {
  if (screenshotMetadata.url) {
    return new URL(screenshotMetadata.url).hostname
  }
  if (screenshotMetadata.appName) {
    return screenshotMetadata.appName.toLowerCase().replace(/\s+/g, '_')
  }
  return 'unknown'
}
```

### Firestore Security Rules

```javascript
// In /children/{childId}/appApprovals/{approvalId}
match /appApprovals/{approvalId} {
  function isChildGuardian() {
    let child = get(/databases/$(database)/documents/children/$(childId));
    return request.auth != null &&
      request.auth.uid in child.data.guardianUids;
  }

  allow read: if isChildGuardian();
  allow create, update: if isChildGuardian();
  allow delete: if isChildGuardian();
}
```

### Integration with familyBias.ts

Extend the existing classification pipeline:

```typescript
// In classifyScreenshot.ts
async function classifyScreenshotWithApprovals(
  screenshot: ScreenshotMetadata,
  familyId: string,
  childId: string
): Promise<ClassificationResult> {
  // Existing classification
  const concernResult = await analyzeForConcerns(screenshot)

  // Story 24.2: Family bias adjustments
  const biasAdjustedConcerns = await applyFamilyBiasToConcerns(familyId, concernResult.concerns)

  // Story 24.3: App approval adjustments (NEW)
  const appIdentifier = extractAppIdentifier(screenshot)
  const appApprovals = await getChildAppApprovals(childId)
  const approvalAdjustedConcerns = applyAppApprovals(
    biasAdjustedConcerns,
    appApprovals,
    appIdentifier
  )

  return {
    ...concernResult,
    concerns: approvalAdjustedConcerns,
  }
}
```

### References

- [Source: docs/epics/epic-list.md#Story 24.3] - Story requirements
- [Source: apps/functions/src/services/classification/familyBias.ts] - Existing bias service
- [Source: packages/shared/src/contracts/index.ts] - ConcernCategory schema
- [Source: Story 24-2 completion notes] - Family bias implementation patterns

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/functions/src/services/classification/appApprovals.ts` - App approval service
- `apps/web/src/services/appApprovalService.ts` - Web service for approvals
- `apps/web/src/components/settings/AppApprovalModal.tsx` - Approval UI component
- `apps/web/src/hooks/useChildAppApprovals.ts` - App approvals hook

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Add AppCategoryApproval schema
- `packages/shared/src/index.ts` - Export new schemas
- `packages/firebase-rules/firestore.rules` - Add appApprovals subcollection rules
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Integrate app approvals
- `apps/functions/src/services/classification/index.ts` - Export appApprovals module
