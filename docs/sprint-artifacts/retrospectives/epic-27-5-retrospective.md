# Epic 27.5 Retrospective: Family Health Check-Ins

**Date:** 2025-12-31
**Epic:** 27.5 - Family Health Check-Ins (Family Therapist)
**Team:** Bob (SM), Alice (PO), Charlie (Dev), Dana (QA), Elena (Junior Dev)

## Epic Summary

Epic 27.5 delivered a comprehensive family health check-in system designed to help families monitor and improve their relationship health around digital monitoring. The epic implements periodic check-ins for both parents and children, friction tracking from flag resolutions, aggregated indicators with bilateral transparency, repair resources for families experiencing challenges, and resolution markers to celebrate progress. This epic embodies the Family Therapist perspective, focusing on relationship repair and non-judgmental awareness.

## Stories Completed

| Story  | Title                           | Status | Key Deliverables                                                  |
| ------ | ------------------------------- | ------ | ----------------------------------------------------------------- |
| 27.5.1 | Monthly Health Check-In Prompts | Done   | Scheduled check-ins, 30-day eligibility, configurable frequency   |
| 27.5.2 | Check-In Response Interface     | Done   | Emoji rating scale, follow-up questions, child-friendly UI        |
| 27.5.3 | Flag-Triggered Friction Markers | Done   | Friction tracking on flag resolution, category aggregation        |
| 27.5.4 | Friction Indicators Dashboard   | Done   | Bilateral transparency, trend calculations, conversation starters |
| 27.5.5 | Repair Resources Surfacing      | Done   | Categorized resources, external links, non-intrusive display      |
| 27.5.6 | Resolution Markers              | Done   | Resolution types, celebration messages, history display           |
| 27.5.7 | Child-Safe Check-In Language    | Done   | Age-based prompts, 6th-grade reading level (NFR65)                |

## What Went Well

### 1. Bilateral Transparency Architecture

- Same `FrictionIndicatorsDashboard` component used for both parent and child views (AC5 compliance)
- Cached indicators in Firestore enable children to access aggregated data without Firebase Auth
- No private check-in content is revealed - only aggregates (AC4 compliance)
- Both parties see identical health indicators, fostering trust

### 2. Age-Appropriate Design (NFR65 Compliance)

- Three-tier age-based prompts: under 10, 10-12, and 13+
- Simple vocabulary: "Good!", "Okay", "Hard" for children
- Encouraging messages based on rating selection
- Visual aids (emojis) reinforce meaning throughout

### 3. Robust Data Model Foundation

- Zod schemas in `@fledgely/shared` as single source of truth
- Clear separation: check-ins, friction markers, resolutions
- Aggregate calculations cleanly separated from raw data
- Same patterns established in Epic 27 (audit service) carried forward

### 4. Non-Intrusive Resource Surfacing

- Resources shown only when friction indicators warrant concern
- Collapsible, dismissible panels respect user autonomy
- Links to trusted external sources (Common Sense Media, KidsHealth, AAP)
- No forced interventions - resources are offered, not imposed

### 5. Child Authentication Patterns

- Children access data via Firestore cache (no Firebase Auth required)
- Dedicated HTTP endpoints for child resolution creation
- Session-based authentication via `useChildAuth` context
- Consistent patterns from Epic 19B/19C reused

### 6. Celebration of Progress

- Resolution markers include celebration messages
- "Great job working through this together!" positive reinforcement
- Resolution history visible to both parties
- In-progress resolutions tracked separately from completed ones

## What Could Be Improved

### 1. Missing Shared Package Exports

- Build failed initially because Resolution types weren't exported from `packages/shared/src/index.ts`
- **Action:** Always verify shared exports after adding new schemas

### 2. Unused Import in useChildResolutions

- Lint error caught unused `doc` and `getDoc` imports
- **Action:** Run lint before commits to catch unused imports early

### 3. Sprint Status Tracking

- Stories 27-5-2 through 27-5-7 showed as "backlog" in sprint-status.yaml despite being done
- **Action:** Update sprint-status.yaml immediately after each story completion

### 4. FCM Push Notifications Pending

- Check-in prompts and reminders currently log notifications but don't send FCM push
- **Action:** Implement FCM integration when notification infrastructure is prioritized (same as Epic 27)

## Patterns to Carry Forward

### Age-Based Prompt Variants

```typescript
export function getCheckInPromptText(
  recipientType: CheckInRecipientType,
  childName?: string,
  childAge?: number
): { title: string; message: string; helpText?: string } {
  // Under 10: Very simple language
  if (childAge && childAge < 10) {
    return {
      title: 'How are things going? 💭',
      message: 'How do you feel about mom and dad looking at your phone and computer?',
      helpText: 'Pick the face that shows how you feel. Your answer is just for you!',
    }
  }
  // 10-12: Simple but slightly more mature
  // 13+: More mature but still friendly
}
```

### Child Firestore Cache Pattern

```typescript
// Cache aggregated indicators for child access
await db.collection('families').doc(familyId).collection('cache').doc('frictionIndicators').set({
  healthLevel,
  trend,
  conversationStarters,
  cachedAt: Date.now(),
})

// Children read from cache (no Firebase Auth needed)
const cacheRef = collection(db, 'families', familyId, 'cache')
const indicatorsDoc = await getDocs(query(cacheRef, where('cachedAt', '>', 0)))
```

### Resolution Marker Types

```typescript
export const resolutionMarkerTypeSchema = z.enum([
  'talked_through', // General resolution
  'parent_apologized', // Parent took responsibility
  'child_understood', // Child gained understanding
  'in_progress', // Still working on it
])
```

### Bilateral Transparency Component Pattern

```typescript
// Same component for both parent and child
<FrictionIndicatorsDashboard
  healthLevel={indicators?.healthLevel}
  trend={indicators?.trend}
  conversationStarters={indicators?.conversationStarters}
  frictionCategories={indicators?.frictionCategories}
  isLoading={indicatorsLoading}
  isChild={false} // or true for child view
  resolutions={resolutions}
  onCreateResolution={onCreateResolution}
  showResolutions={true}
/>
```

## Metrics

| Metric                | Value      |
| --------------------- | ---------- |
| Stories Completed     | 7/7 (100%) |
| New Services Created  | 4          |
| HTTP Endpoints Added  | 5          |
| Scheduled Functions   | 2          |
| Shared Types Added    | 10+        |
| UI Components Created | 7          |

## Architecture Highlights

### New Service Layer

```
apps/functions/src/
├── services/health/
│   ├── healthCheckInService.ts      # Check-in scheduling, prompts
│   ├── frictionAggregationService.ts # Category-based friction tracking
│   ├── frictionIndicatorsService.ts  # Health/trend calculations
│   └── resolutionService.ts          # Resolution CRUD
├── scheduled/
│   ├── generateHealthCheckIns.ts     # Daily check-in generation
│   └── sendCheckInReminders.ts       # 3-day reminder system
├── http/health/
│   ├── getFrictionSummaryEndpoint
│   ├── getFrictionIndicatorsEndpoint
│   ├── createResolutionEndpoint
│   ├── createChildResolutionEndpoint
│   └── getResolutionsEndpoint
```

### UI Components

```
apps/web/src/
├── app/
│   ├── dashboard/
│   │   ├── check-in/[checkInId]/page.tsx   # Parent check-in response
│   │   └── settings/health-check-ins/      # Settings page
│   └── child/
│       └── check-in/[checkInId]/page.tsx   # Child check-in response
├── components/health/
│   ├── CheckInPromptBanner.tsx
│   ├── EmojiRatingScale.tsx
│   ├── FrictionIndicatorsDashboard.tsx
│   ├── RepairResourcesPanel.tsx
│   ├── ResolutionMarkerModal.tsx
│   └── ResolutionHistory.tsx
├── hooks/
│   ├── usePendingCheckIns.ts
│   ├── useChildPendingCheckIns.ts
│   ├── useFrictionIndicators.ts
│   ├── useChildFrictionIndicators.ts
│   ├── useResolutions.ts
│   └── useChildResolutions.ts
```

## NFR Compliance

| NFR     | Requirement               | Implementation                                                    |
| ------- | ------------------------- | ----------------------------------------------------------------- |
| NFR42   | Child-appropriate prompts | Age-based prompt variants, friendly language                      |
| NFR65   | 6th-grade reading level   | Simple vocabulary, short sentences, emojis                        |
| Privacy | Private responses         | Parent/child responses stored separately, only aggregates visible |
| FR27.5  | Bilateral transparency    | Same dashboard view for both parties                              |

## Previous Retrospective Action Items Follow-Up

From Epic 27 Retrospective:

| Action Item              | Status         | Notes                                    |
| ------------------------ | -------------- | ---------------------------------------- |
| Add dashboard navigation | ⏳ In Progress | Not addressed in this epic               |
| Implement FCM push       | ⏳ In Progress | Check-in reminders ready but FCM pending |
| Add PDF export           | ⏳ In Progress | Not addressed in this epic               |
| Sync sprint status       | ✅ Done        | Updated sprint-status.yaml immediately   |

## Action Items for Next Epic

1. **Implement FCM push notifications** - Check-in prompts and reminders are ready but need actual FCM sending
2. **Dashboard navigation links** - Add "Family Health" link to dashboard sidebar
3. **PDF export for health reports** - Generate formatted PDF of friction indicators and check-in history
4. **Therapist directory integration** - RepairResourcesPanel has placeholder for therapist directory
5. **Always export new shared types** - Verify exports after adding schemas to avoid build failures

## Team Notes

Epic 27.5 establishes family health check-ins as a proactive mechanism for monitoring relationship health. The system embodies the Family Therapist perspective by:

- **Non-judgmental awareness**: Friction indicators inform without blame
- **Bilateral transparency**: Same view for parent and child builds trust
- **Repair-focused**: Resources and resolution markers celebrate progress
- **Age-appropriate**: Language adapts to child's developmental level
- **Privacy-preserving**: Individual responses stay private, only aggregates shared

The check-in system runs on configurable schedules (weekly, monthly, quarterly) with a 30-day eligibility threshold for new families. Reminders are sent after 3 days of non-response. The friction indicators aggregate both check-in ratings and flag-triggered friction markers to provide a holistic view of family health.

Resolution markers allow both parties to celebrate when they work through challenges together. This positive reinforcement loop encourages continued communication and relationship repair.

---

_Retrospective completed: 2025-12-31_
