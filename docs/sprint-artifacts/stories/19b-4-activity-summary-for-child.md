# Story 19B.4: Activity Summary for Child

Status: done

## Story

As a **child**,
I want **a summary of my monitored activity**,
So that **I don't have to look at every screenshot**.

## Acceptance Criteria

1. **AC1: Total Screenshots Display**
   - Given child views their dashboard home
   - When activity summary loads
   - Then summary shows total screenshots today
   - And summary shows total screenshots this week

2. **AC2: Most Captured Apps**
   - Given child views activity summary
   - When data is available
   - Then summary shows top 3 most captured apps/websites
   - And apps displayed with friendly icons or domains

3. **AC3: Capture Times Distribution**
   - Given child views activity summary
   - When data is available
   - Then summary shows capture distribution by time of day
   - And uses Morning/Afternoon/Evening labels
   - And displayed as visual chart or percentages

4. **AC4: Child-Friendly Language**
   - Given child views activity summary
   - When any text is displayed
   - Then language is friendly, not surveillance-like
   - And uses phrases like "Your day in review"
   - And all text at 6th-grade reading level (NFR65)

5. **AC5: Real-Time Updates**
   - Given child is viewing activity summary
   - When new screenshots are captured
   - Then summary updates in real-time
   - And no manual refresh needed

6. **AC6: Help Link**
   - Given child views activity summary
   - When "Why am I seeing this?" link is displayed
   - Then clicking link explains the agreement
   - And links to child's agreement view

## Tasks / Subtasks

- [x] Task 1: Create Activity Summary Component (AC: #1, #4)
  - [x] 1.1 Create `ChildActivitySummary.tsx` component
  - [x] 1.2 Create summary card layout with sky blue theme
  - [x] 1.3 Add today's screenshot count with friendly label
  - [x] 1.4 Add this week's screenshot count with friendly label
  - [x] 1.5 Add unit tests for summary component

- [x] Task 2: Add Most Captured Apps Section (AC: #2)
  - [x] 2.1 Create app/website aggregation logic
  - [x] 2.2 Display top 3 apps with domains or icons
  - [x] 2.3 Handle case with less than 3 apps
  - [x] 2.4 Add unit tests for app aggregation

- [x] Task 3: Add Time Distribution Chart (AC: #3)
  - [x] 3.1 Create time distribution calculation utility
  - [x] 3.2 Display visual chart (bar chart or pie)
  - [x] 3.3 Use morning/afternoon/evening labels with icons
  - [x] 3.4 Add unit tests for distribution calculation

- [x] Task 4: Add Real-Time Updates (AC: #5)
  - [x] 4.1 Implement Firestore onSnapshot listener (via useChildScreenshots hook)
  - [x] 4.2 Update summary counts on new screenshots (via useMemo recalculation)
  - [x] 4.3 Handle subscription cleanup on unmount (via hook)
  - [x] 4.4 Add visual indicator when updating (loading spinner)

- [x] Task 5: Add Help Link (AC: #6)
  - [x] 5.1 Add "Why am I seeing this?" link
  - [x] 5.2 Link to agreement explainer or modal (via onHelpClick prop)
  - [x] 5.3 Style link with child-friendly appearance

## Dev Notes

### Architecture Compliance

This story creates a new component for the child dashboard. Key patterns:

1. **Inline Styles**: Use `React.CSSProperties` objects, not Tailwind classes
2. **Data-TestID**: Add `data-testid` attributes for all testable elements
3. **Child-Friendly Language**: All text at 6th-grade reading level (NFR65)
4. **Sky Blue Theme**: Use sky-500 (#0ea5e9) color palette
5. **Firebase SDK Direct**: Use Firestore onSnapshot for real-time updates

### Data Structure

Leverage existing screenshot data from `useChildScreenshots` hook:

```typescript
interface ChildScreenshot {
  id: string
  imageUrl: string
  timestamp: number
  url: string
  title: string
  deviceId: string
}

// Aggregation utilities needed
interface ActivitySummary {
  todayCount: number
  weekCount: number
  topApps: { domain: string; count: number }[]
  timeDistribution: {
    morning: number // 6am-12pm
    afternoon: number // 12pm-6pm
    evening: number // 6pm-12am
    night: number // 12am-6am
  }
}
```

### Time Distribution Calculation

Reuse `getTimeOfDay` from `timelineUtils.ts`:

```typescript
import { getTimeOfDay, TIME_OF_DAY_CONFIG } from './timelineUtils'

function calculateTimeDistribution(screenshots: ChildScreenshot[]): TimeDistribution {
  const distribution = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const screenshot of screenshots) {
    const timeOfDay = getTimeOfDay(screenshot.timestamp)
    distribution[timeOfDay]++
  }
  return distribution
}
```

### App Aggregation

Extract domains from URLs:

```typescript
function aggregateTopApps(screenshots: ChildScreenshot[]): AppCount[] {
  const appCounts = new Map<string, number>()

  for (const screenshot of screenshots) {
    const domain = extractDomain(screenshot.url)
    appCounts.set(domain, (appCounts.get(domain) || 0) + 1)
  }

  return Array.from(appCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
}
```

### Real-Time Updates

Use Firestore onSnapshot in the hook:

```typescript
// Already implemented in useChildScreenshots
// Just ensure the component re-renders on data changes
```

### Child-Friendly Copy

- "Your Day in Review" - main heading
- "Screenshots today" instead of "Captures recorded"
- "Most visited sites" instead of "Activity hot spots"
- "When you were online" instead of "Session times"
- "Why am I seeing this?" with link to agreement

### Color Scheme

Continue sky blue theme:

```typescript
const childTheme = {
  primary: '#0ea5e9', // sky-500
  primaryLight: '#e0f2fe', // sky-100
  primaryDark: '#0369a1', // sky-700
  background: '#f0f9ff', // sky-50
  cardBg: '#ffffff',
  textPrimary: '#0c4a6e', // sky-900
  textSecondary: '#0369a1', // sky-700
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/components/child/ChildActivitySummary.tsx` - Main component
- `apps/web/src/components/child/ChildActivitySummary.test.tsx` - Tests
- `apps/web/src/components/child/activityUtils.ts` - Aggregation utilities
- `apps/web/src/components/child/activityUtils.test.ts` - Utility tests

### Previous Story Intelligence

From Story 19B-1, 19B-2, 19B-3 implementation:

1. **Pattern Used**: Inline styles with React.CSSProperties (no Tailwind)
2. **Test Pattern**: Vitest with @testing-library/react
3. **Hook Reuse**: `useChildScreenshots` already provides screenshot data
4. **Utility Reuse**: `timelineUtils.ts` has `getTimeOfDay` function
5. **Component Reuse**: Can use `ChildScreenshotCard` styling as reference

### Edge Cases

1. **No screenshots**: Show friendly "No activity yet" message
2. **Only 1-2 apps**: Show what's available, no need for 3
3. **All same time period**: Still show distribution (100% in one)
4. **Loading state**: Show skeleton while data loads
5. **Error state**: Show friendly error message

### Accessibility Requirements

- All elements have proper ARIA labels
- Color contrast meets WCAG AA
- Focus states visible on interactive elements
- Screen reader announcements for data updates
- Touch targets minimum 44x44px (NFR49)

### References

- [Source: docs/epics/epic-list.md#Story-19B.4 - Activity Summary for Child]
- [Pattern: apps/web/src/components/child/ChildScreenshotGallery.tsx]
- [Pattern: apps/web/src/components/child/timelineUtils.ts]
- [Previous: docs/sprint-artifacts/stories/19b-3-screenshot-detail-view.md]
- [Architecture: docs/project_context.md - Firebase SDK Direct rule]

---

## Dev Agent Record

### Context Reference

Story created as part of Epic 19B: Child Dashboard - My Screenshots

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required.

### Completion Notes List

1. Created `ChildActivitySummary.tsx` component with inline styles (React.CSSProperties)
2. Created `activityUtils.ts` with aggregation functions:
   - `calculateActivitySummary()` - main entry point
   - `countTodayScreenshots()` / `countWeekScreenshots()` - count helpers
   - `aggregateTopApps()` - domain extraction and sorting
   - `calculateTimeDistribution()` - reuses `getTimeOfDay` from timelineUtils
   - `getPercentage()` - percentage calculation helper
3. Created comprehensive tests: 31 utility tests + 29 component tests = 60 total
4. Used sky blue theme consistent with other child components
5. Child-friendly language: "Your Day in Review", "Screenshots today", "Most Visited Sites", "When You Were Online"
6. Time distribution displayed as horizontal bar chart with emoji icons
7. Real-time updates via existing `useChildScreenshots` hook (already has onSnapshot)
8. Help link implemented with `onHelpClick` prop for parent integration
9. Code review fixes applied:
   - Added focus styling for help link button
   - Removed redundant keyboard handler (buttons handle Enter/Space natively)
   - Removed unused `ActivitySummary` type annotation

### File List

**Created:**

- `apps/web/src/components/child/ChildActivitySummary.tsx` - Main component
- `apps/web/src/components/child/ChildActivitySummary.test.tsx` - Component tests
- `apps/web/src/components/child/activityUtils.ts` - Aggregation utilities
- `apps/web/src/components/child/activityUtils.test.ts` - Utility tests

## Change Log

| Date       | Change                                                            |
| ---------- | ----------------------------------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev                            |
| 2025-12-31 | Implementation complete - all tasks done                          |
| 2025-12-31 | Code review completed - 3 issues fixed (focus styling, dead code) |
