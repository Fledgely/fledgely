# Story 8.5.4: Sample Flag & Alert Examples

Status: done

## Story

As a **parent exploring fledgely**,
I want **to see example flags and how alerts work**,
So that **I understand what "concerning content" triggers look like**.

## Acceptance Criteria

1. **AC1: Sample Flagged Items**
   - Given parent is viewing the demo child profile
   - When they explore flagged content section
   - Then sample flagged items demonstrate various concern types

2. **AC2: Flag Details Display**
   - Given a flagged item is selected
   - When viewing the flag detail
   - Then each flag shows: screenshot, AI reasoning, confidence level

3. **AC3: Child Annotation Examples**
   - Given flagged items are displayed
   - When viewing annotations
   - Then sample flags include child annotation examples ("I was researching for school")

4. **AC4: Notification Preview**
   - Given parent is exploring alerts
   - When viewing notification section
   - Then notification preview shows what alerts look like

5. **AC5: Resolution Flow Demonstration**
   - Given sample flags exist
   - When viewing flag actions
   - Then flags demonstrate resolution flow (parent reviewed, resolved)

6. **AC6: Conversation Starter Framing**
   - Given flag content is displayed
   - When viewing flag language
   - Then tone demonstrates "conversation starter, not accusation" framing

## Tasks / Subtasks

- [x] Task 1: Create Demo Flag Data Model (AC: #1, #2, #6)
  - [x] 1.1 Define `DemoFlag` interface with concernType, reasoning, confidence
  - [x] 1.2 Define `DemoFlagConcernType` type (research, communication, content, time, unknown)
  - [x] 1.3 Create `DEMO_FLAGS` constant with 4-6 sample flags of different types
  - [x] 1.4 Add helper functions for flag filtering and stats
  - [x] 1.5 Create unit tests for data model

- [x] Task 2: Create DemoFlagCard Component (AC: #2, #6)
  - [x] 2.1 Create `DemoFlagCard.tsx` in `apps/web/src/components/dashboard/demo/`
  - [x] 2.2 Display flag screenshot thumbnail, title, timestamp
  - [x] 2.3 Show AI reasoning with conversation-starter framing
  - [x] 2.4 Display confidence level badge
  - [x] 2.5 Add demo styling (lavender theme, dashed borders)
  - [x] 2.6 Create unit tests

- [x] Task 3: Create DemoChildAnnotation Component (AC: #3)
  - [x] 3.1 Create `DemoChildAnnotation.tsx` component
  - [x] 3.2 Display child's annotation with child-friendly styling
  - [x] 3.3 Show annotation timestamp
  - [x] 3.4 Add demo badge indicator
  - [x] 3.5 Create unit tests

- [x] Task 4: Create DemoFlagResolution Component (AC: #5)
  - [x] 4.1 Create `DemoFlagResolution.tsx` component
  - [x] 4.2 Show resolution status (reviewed, resolved, pending)
  - [x] 4.3 Display resolution action (talked with child, dismissed, false positive)
  - [x] 4.4 Show resolution timestamp
  - [x] 4.5 Create unit tests

- [x] Task 5: Create DemoNotificationPreview Component (AC: #4)
  - [x] 5.1 Create `DemoNotificationPreview.tsx` component
  - [x] 5.2 Show sample push notification appearance
  - [x] 5.3 Display notification content preview
  - [x] 5.4 Add demo indicator
  - [x] 5.5 Create unit tests

- [x] Task 6: Create DemoFlagReviewPanel Component (AC: #1, #2, #5)
  - [x] 6.1 Create `DemoFlagReviewPanel.tsx` combining flag cards
  - [x] 6.2 Add flag list with filtering (all, pending, resolved)
  - [x] 6.3 Show flag count summary
  - [x] 6.4 Create expandable flag detail view
  - [x] 6.5 Create unit tests

- [x] Task 7: Integrate into Demo Experience (AC: #1)
  - [x] 7.1 Add flag review section to DemoChildCard as expandable panel
  - [x] 7.2 Create integration tests
  - [x] 7.3 Update barrel exports

## Dev Notes

### Implementation Strategy

Story 8-5-4 extends demo mode by showing sample flagged content with resolution flows. This is critical for parents to understand how "concerning content" detection works without being alarmed or accusatory.

**Key insight**: Parents are often worried about surveillance tone. Showing flags as "conversation starters" rather than accusations builds trust in the approach.

### Data Model Design

```typescript
type DemoFlagConcernType = 'research' | 'communication' | 'content' | 'time' | 'unknown'

interface DemoFlagAnnotation {
  text: string
  timestamp: number
  fromChild: boolean
}

interface DemoFlagResolution {
  status: 'pending' | 'reviewed' | 'resolved'
  action?: 'talked' | 'dismissed' | 'false_positive'
  resolvedAt?: number
  note?: string
}

interface DemoFlag {
  id: string
  screenshotId: string // Links to DemoScreenshot
  concernType: DemoFlagConcernType
  confidence: number
  aiReasoning: string // Conversation-starter framing
  annotation?: DemoFlagAnnotation
  resolution: DemoFlagResolution
  createdAt: number
}
```

### Sample Flag Data (AC6 - Conversation Starter Framing)

All AI reasoning should use supportive, non-accusatory language:

1. **Health Research Flag**
   - ConcernType: `research`
   - Reasoning: "Alex searched for health-related topics. This might be a great opportunity to check in and see if they have questions about their health or wellness."
   - Annotation: "I was researching for my science project about the human body."
   - Resolution: Resolved - "talked"

2. **Chat Messages Flag**
   - ConcernType: `communication`
   - Reasoning: "We noticed messaging app activity. This could be a good time to discuss online communication and who Alex chats with."
   - Annotation: "I was talking to my friend about our homework."
   - Resolution: Reviewed - pending action

3. **Gaming Time Flag**
   - ConcernType: `time`
   - Reasoning: "Screen time exceeded the daily limit. Consider discussing how to balance gaming with other activities."
   - Annotation: None
   - Resolution: Pending

4. **Unknown Content Flag**
   - ConcernType: `unknown`
   - Reasoning: "We couldn't classify this content with high confidence. You might want to take a look and discuss with Alex."
   - Annotation: "It was just a game website."
   - Resolution: Resolved - "false_positive"

### Notification Preview Content

Sample notification should show:

- App icon/badge
- Notification title: "Fledgely - New Flag for Alex"
- Preview text: "A new item has been flagged for your review"
- Timestamp
- Demo indicator badge

### Existing Patterns to Follow

From Stories 8-5-1, 8-5-2, and 8-5-3:

- `apps/web/src/data/demoData.ts` - Add flag types and data
- Demo styling: lavender background (#faf5ff), dashed borders (#c4b5fd)
- Demo badges with theater mask emoji
- Expandable sections with toggle buttons
- CSS-based visualizations (no external dependencies)

### Project Structure Notes

Files to create:

- `apps/web/src/components/dashboard/demo/DemoFlagCard.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagCard.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoChildAnnotation.tsx`
- `apps/web/src/components/dashboard/demo/DemoChildAnnotation.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagResolution.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagResolution.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoNotificationPreview.tsx`
- `apps/web/src/components/dashboard/demo/DemoNotificationPreview.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagReviewPanel.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagReviewPanel.test.tsx`

Files to modify:

- `apps/web/src/data/demoData.ts` - Add flag types and data
- `apps/web/src/data/demoData.test.ts` - Add flag tests
- `apps/web/src/components/dashboard/demo/index.ts` - Add exports
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Add flag review integration
- `apps/web/src/components/dashboard/DemoChildCard.test.tsx` - Add integration tests

### Testing Strategy

- Unit tests for data model and helper functions
- Unit tests for each component
- Tests for flag filtering (all, pending, resolved)
- Tests for resolution status transitions
- Integration tests for full panel
- Verify conversation-starter language in flag text

### Dependencies

- No external dependencies (no notification library needed)
- Uses CSS for visualization
- Builds on demo infrastructure from Stories 8-5-1 through 8-5-3
- Links to existing `DemoScreenshot` data where applicable

### Integration with Previous Stories

The flag data should reference existing `DEMO_SCREENSHOTS` where screenshots are already flagged:

- `demo-screenshot-9` (Chat Messages) - already flagged
- `demo-screenshot-10` (Health Information Search) - already flagged

New flags can reference these screenshots or create new flag-only entries.

### References

- [Source: docs/epics/epic-list.md - Story 8.5.4 acceptance criteria]
- [Source: Story 8-5-1 - Demo data foundation]
- [Source: Story 8-5-2 - Demo component patterns]
- [Source: Story 8-5-3 - Demo panel integration patterns]

## Dev Agent Record

### Context Reference

Story created for Epic 8.5: Demo Mode - Early Win Preview.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required.

### Completion Notes List

1. **Data Model**: Implemented `DemoFlagConcernType`, `DemoFlagAnnotation`, `DemoFlagResolution`, and `DemoFlag` types with 4 sample flags covering research, communication, time, and unknown concern types.
2. **Helper Functions**: Created `getDemoFlags()`, `getDemoFlagsByStatus()`, `getPendingDemoFlags()`, `getResolvedDemoFlags()`, `getDemoFlagStats()`, `getDemoFlagById()`, `getDemoFlagsWithAnnotations()`, and `getScreenshotForFlag()` functions.
3. **DemoFlagCard**: Card component displaying flag with AI reasoning, confidence badge, concern type badge, resolution status, and optional screenshot thumbnail.
4. **DemoChildAnnotation**: Standalone annotation component with curly quotes, child-friendly styling, and relative timestamp.
5. **DemoFlagResolution**: Resolution status component with pending/reviewed/resolved states, action icons, and notes.
6. **DemoNotificationPreview**: iOS-style push notification preview showing flag, screentime, and activity notification types.
7. **DemoFlagReviewPanel**: Combined panel with filter tabs (all/pending/reviewed/resolved), stats summary, expandable flag cards, and notification preview.
8. **Integration**: Added expandable flag review toggle to DemoChildCard with 12 integration tests.
9. **Test Coverage**: 349 total demo tests pass including 40+ new flag-related tests.

### File List

Created:

- `apps/web/src/components/dashboard/demo/DemoFlagCard.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagCard.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoChildAnnotation.tsx`
- `apps/web/src/components/dashboard/demo/DemoChildAnnotation.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagResolution.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagResolution.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoNotificationPreview.tsx`
- `apps/web/src/components/dashboard/demo/DemoNotificationPreview.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagReviewPanel.tsx`
- `apps/web/src/components/dashboard/demo/DemoFlagReviewPanel.test.tsx`

Modified:

- `apps/web/src/data/demoData.ts` - Added flag types and data
- `apps/web/src/data/demoData.test.ts` - Added flag tests
- `apps/web/src/components/dashboard/demo/index.ts` - Added exports
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Added flag review integration
- `apps/web/src/components/dashboard/DemoChildCard.test.tsx` - Added integration tests
- `docs/sprint-artifacts/stories/8-5-4-sample-flag-alert-examples.md` - Story updated to done

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev |
| 2025-12-31 | All tasks completed, story marked done |
