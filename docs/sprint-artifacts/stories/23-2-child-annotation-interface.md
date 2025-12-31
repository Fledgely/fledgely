# Story 23.2: Child Annotation Interface

Status: done

## Story

As a **child**,
I want **an easy way to explain flagged content**,
So that **I can provide context quickly**.

## Acceptance Criteria

1. **AC1: Screenshot with flag category display**
   - Given child opens annotation screen
   - When viewing the flagged screenshot
   - Then screenshot displayed with flag category shown
   - And display is child-friendly (non-scary language)

2. **AC2: Pre-set response options (NFR152)**
   - Given child is on annotation screen
   - When viewing response options
   - Then pre-set options available:
     - "School project"
     - "Friend was showing me"
     - "Didn't mean to see this"
     - "Other"
   - And options are large, touch-friendly buttons

3. **AC3: Free-text explanation field**
   - Given child selects "Other" or wants to add details
   - When typing explanation
   - Then free-text field available for custom explanation
   - And field has character limit guidance
   - And field is optional (not required)

4. **AC4: Submit annotation**
   - Given child has selected option and/or typed explanation
   - When clicking "Submit"
   - Then annotation is saved to flag document
   - And flag status updated to reflect annotation
   - And child sees confirmation message
   - And child is returned to dashboard

5. **AC5: Skip option**
   - Given child is on annotation screen
   - When choosing not to explain
   - Then "Skip" option available
   - And skipping marks flag as "skipped annotation"
   - And child is returned to dashboard
   - And timer continues (parent will see "Child skipped")

6. **AC6: Timer visibility on annotation screen**
   - Given child is on annotation screen
   - When viewing the page
   - Then remaining time countdown visible
   - And timer matches Story 23-1 annotation window

## Tasks / Subtasks

- [x] Task 1: Extend FlagDocument schema for annotation (AC: #4, #5)
  - [x] 1.1 Add `childAnnotation?: string` field (selected option or "skipped")
  - [x] 1.2 Add `childExplanation?: string` field (free-text)
  - [x] 1.3 Add `annotatedAt?: number` field (when annotation submitted)
  - [x] 1.4 Update shared types in `packages/shared/src/contracts/index.ts`
  - [x] 1.5 Export new types from `packages/shared/src/index.ts`

- [x] Task 2: Create annotation submission service (AC: #4, #5)
  - [x] 2.1 Create `apps/web/src/services/annotationService.ts`
  - [x] 2.2 Add `submitAnnotation(flagId, childId, annotation, explanation?)` function
  - [x] 2.3 Add `skipAnnotation(flagId, childId)` function
  - [x] 2.4 Update flag document with annotation data
  - [x] 2.5 Update `childNotificationStatus` to appropriate value
  - [x] 2.6 Write service tests (23 tests)

- [x] Task 3: Create annotation page route (AC: #1, #6)
  - [x] 3.1 Create `apps/web/src/app/child/annotate/[flagId]/page.tsx`
  - [x] 3.2 Wrap with ChildAuthGuard for authentication
  - [x] 3.3 Fetch flag document by flagId
  - [x] 3.4 Verify flag belongs to authenticated child
  - [x] 3.5 Display timer from annotation deadline

- [x] Task 4: Create ChildAnnotationView component (AC: #1, #2, #3)
  - [x] 4.1 Create `apps/web/src/components/child/ChildAnnotationView.tsx`
  - [x] 4.2 Display screenshot (or placeholder if not accessible)
  - [x] 4.3 Show flag category with child-friendly language
  - [x] 4.4 Create pre-set option buttons (large, touch-friendly)
  - [x] 4.5 Add free-text explanation field
  - [x] 4.6 Maintain amber color scheme from Story 23-1
  - [x] 4.7 Write component tests (22 tests passing)

- [x] Task 5: Create AnnotationSubmitButton component (AC: #4, #5)
  - [x] 5.1 Create submit and skip button components (integrated in ChildAnnotationView)
  - [x] 5.2 Handle loading states during submission
  - [x] 5.3 Show success confirmation animation/message
  - [x] 5.4 Navigate back to dashboard on completion

- [x] Task 6: Update dashboard handleAddContext (AC: #4)
  - [x] 6.1 Replace placeholder alert with router.push navigation
  - [x] 6.2 Navigate to `/child/annotate/${flagId}`

## Dev Notes

### Previous Story Intelligence (Story 23-1)

Story 23-1 established child notification infrastructure:

- `childNotificationStatus` tracks notification state
- `annotationDeadline` stores 30-minute window expiry
- `ChildFlagNotificationBanner` component with amber color scheme
- `useChildPendingFlags` hook for real-time flag subscription
- `childFlagNotificationService.ts` with timer utilities

**Key Files from Story 23-1:**

- `apps/web/src/services/childFlagNotificationService.ts` - Timer utilities (getRemainingTime, formatRemainingTime)
- `apps/web/src/components/child/ChildFlagNotificationBanner.tsx` - UI patterns (amber theme, gentle messaging)
- `apps/web/src/hooks/useChildPendingFlags.ts` - Flag subscription pattern
- `packages/shared/src/contracts/index.ts` - FlagDocument with child notification fields
- `apps/web/src/app/child/dashboard/page.tsx` - Dashboard with handleAddContext placeholder

### Existing Infrastructure

**Flag Document Schema (from 23-1):**

```typescript
// Current fields
childNotifiedAt?: number       // When child was notified
annotationDeadline?: number    // When annotation window expires
childNotificationStatus?: 'pending' | 'notified' | 'skipped'

// NEW fields to add for 23-2
childAnnotation?: string       // Selected option: "school_project" | "friend_showing" | "accident" | "other" | "skipped"
childExplanation?: string      // Free-text explanation (optional)
annotatedAt?: number           // When annotation was submitted
```

**Flag Service Patterns (from Epic 22):**

- `apps/web/src/services/flagService.ts` - Firestore operations pattern
- Uses collection queries and document updates
- Real-time subscriptions with onSnapshot

### Pre-set Annotation Options (NFR152)

```typescript
export const ANNOTATION_OPTIONS = [
  { value: 'school_project', label: 'School project', icon: '📚' },
  { value: 'friend_showing', label: 'Friend was showing me', icon: '👥' },
  { value: 'accident', label: "Didn't mean to see this", icon: '😅' },
  { value: 'other', label: 'Other', icon: '💬' },
] as const

export type AnnotationOption = (typeof ANNOTATION_OPTIONS)[number]['value']
```

### Child-Friendly Category Language

Map flag categories to child-friendly descriptions:

```typescript
const CHILD_FRIENDLY_CATEGORIES: Record<string, string> = {
  Violence: 'Something that looked like violence',
  SexualContent: 'Something that might not be for kids',
  Drugs: 'Something about substances',
  Bullying: 'Something that seemed unkind',
  SelfHarm: 'Something concerning about feelings', // Note: Should not appear (distress suppressed)
  Default: 'Something that was flagged',
}
```

### Component Structure

```
apps/web/src/
├── app/
│   └── child/
│       └── annotate/
│           └── [flagId]/
│               └── page.tsx (NEW)
├── components/
│   └── child/
│       ├── ChildAnnotationView.tsx (NEW)
│       ├── ChildAnnotationView.test.tsx (NEW)
│       ├── AnnotationOptionButton.tsx (NEW)
│       └── index.ts (UPDATE)
├── services/
│   ├── annotationService.ts (NEW)
│   └── annotationService.test.ts (NEW)
packages/shared/src/
├── contracts/
│   └── index.ts (UPDATE - add annotation fields)
└── index.ts (UPDATE - export annotation types)
```

### Firestore Updates

```typescript
// When submitting annotation
await flagRef.update({
  childAnnotation: selectedOption, // 'school_project' | 'friend_showing' | etc.
  childExplanation: explanationText, // Optional free-text
  annotatedAt: Date.now(),
  childNotificationStatus: 'annotated', // NEW status value
})

// When skipping annotation
await flagRef.update({
  childAnnotation: 'skipped',
  annotatedAt: Date.now(),
  childNotificationStatus: 'skipped',
})
```

### Navigation Flow

1. Child sees ChildFlagNotificationBanner on dashboard
2. Clicks "Add your side" button → `handleAddContext(flagId)`
3. Router navigates to `/child/annotate/${flagId}`
4. Child selects option, optionally adds text
5. Submits → redirects back to `/child/dashboard`
6. Banner no longer shows (flag status updated)

### Styling Guidelines

Continue amber color scheme from Story 23-1:

- Background: `#fef3c7` (amber-100)
- Border: `#fcd34d` (amber-300)
- Text: `#92400e` (amber-800)
- Button: `#f59e0b` (amber-500)
- Use large touch targets (min 44px)
- Child-friendly icons with each option

### Testing Requirements

1. **Unit Tests:**
   - ChildAnnotationView renders all pre-set options
   - Selected option highlighted correctly
   - Free-text field appears when "Other" selected
   - Timer displays correct remaining time
   - Submit updates flag document correctly
   - Skip updates flag with "skipped" status

2. **Integration Tests:**
   - Navigation from dashboard to annotation page
   - Flag document updates reflected in real-time
   - Redirect back to dashboard after submission
   - Authorization: child can only annotate their own flags

### Security Considerations

- Verify child ID matches flag's `childId` before allowing annotation
- Use ChildAuthGuard on annotation page
- Validate annotation option is from allowed values
- Limit explanation text length (e.g., 500 characters)

### References

- [Source: docs/epics/epic-list.md#Story 23.2] - Story requirements
- [Source: docs/epics/epic-list.md#NFR152] - Pre-set response options requirement
- [Source: packages/shared/src/contracts/index.ts] - FlagDocument schema
- [Source: apps/web/src/components/child/ChildFlagNotificationBanner.tsx] - UI patterns
- [Source: apps/web/src/services/childFlagNotificationService.ts] - Timer utilities
- [Source: apps/web/src/app/child/dashboard/page.tsx#handleAddContext] - Placeholder to update

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/web/src/app/child/annotate/[flagId]/page.tsx` - Annotation page route with ChildAuthGuard
- `apps/web/src/components/child/ChildAnnotationView.tsx` - Annotation interface component
- `apps/web/src/components/child/ChildAnnotationView.test.tsx` - Component tests (22 tests)
- `apps/web/src/services/annotationService.ts` - Annotation submission service
- `apps/web/src/services/annotationService.test.ts` - Service tests (23 tests)

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added ANNOTATION_OPTIONS, annotationOptionSchema, MAX_ANNOTATION_EXPLANATION_LENGTH, extended FlagDocument
- `packages/shared/src/index.ts` - Exported new annotation types
- `apps/web/src/app/child/dashboard/page.tsx` - Updated handleAddContext to navigate to annotation page
