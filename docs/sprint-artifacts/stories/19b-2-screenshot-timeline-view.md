# Story 19B.2: Screenshot Timeline View

Status: done

## Story

As a **child**,
I want **to see my screenshots on a timeline**,
So that **I understand when captures happened during my day**.

## Acceptance Criteria

1. **AC1: Time-of-Day Sections**
   - Given child is viewing their screenshots
   - When viewing timeline
   - Then screenshots shown grouped by time of day
   - And sections include: Morning (6am-12pm), Afternoon (12pm-6pm), Evening (6pm-12am), Night (12am-6am)
   - And each section has a friendly label and icon

2. **AC2: Day Grouping with Counts**
   - Given child is viewing timeline
   - When scrolling through screenshots
   - Then screenshots grouped by date
   - And each day header shows capture count for that day
   - And today's screenshots highlighted at top with "Today" label

3. **AC3: No Captures Gaps**
   - Given child is viewing timeline
   - When there are time periods with no captures
   - Then gaps show "No pictures during this time" message (not suspicious absence)
   - And gaps are visually distinct but not alarming

4. **AC4: Date Navigation**
   - Given child is viewing timeline
   - When tapping calendar picker button
   - Then child can jump to specific date
   - And calendar shows dates with captures highlighted
   - And selecting a date scrolls to that day's screenshots

5. **AC5: View Toggle**
   - Given child is on gallery or timeline view
   - When tapping view toggle button
   - Then child can switch between gallery (grid) and timeline views
   - And current view preference is preserved during session

6. **AC6: Child-Friendly Language**
   - Given child is viewing any screen
   - When text is displayed
   - Then all text is at 6th-grade reading level (NFR65)
   - And language is friendly, not surveillance-like

## Tasks / Subtasks

- [x] Task 1: Add Time-of-Day Grouping Logic (AC: #1)
  - [x] 1.1 Create `getTimeOfDay()` utility function
  - [x] 1.2 Create `groupByTimeOfDay()` function for screenshot grouping
  - [x] 1.3 Create time-of-day section header component
  - [x] 1.4 Add friendly icons for each time period (sun, cloud, moon, stars)
  - [x] 1.5 Create unit tests for time grouping logic

- [x] Task 2: Enhance Day Headers with Counts (AC: #2)
  - [x] 2.1 Update `ChildScreenshotGallery` day headers to show capture count
  - [x] 2.2 Add "Today" highlighting with distinct styling
  - [x] 2.3 Update day grouping to nest time-of-day sections within days
  - [x] 2.4 Create unit tests for day count display

- [x] Task 3: Add No-Captures Gap Indicators (AC: #3)
  - [x] 3.1 Create `TimelineGap` component for empty time periods
  - [x] 3.2 Implement gap detection logic between screenshots
  - [x] 3.3 Style gaps with friendly, non-alarming appearance
  - [x] 3.4 Add child-friendly "No pictures during this time" message
  - [x] 3.5 Create unit tests for gap component

- [x] Task 4: Add Date Navigation via Calendar Picker (AC: #4)
  - [x] 4.1 Create `DatePickerModal` component with calendar view
  - [x] 4.2 Highlight dates that have screenshots
  - [x] 4.3 Add calendar button to gallery header
  - [x] 4.4 Implement scroll-to-date functionality
  - [x] 4.5 Create unit tests for date picker

- [x] Task 5: Add View Toggle (AC: #5)
  - [x] 5.1 Create `ViewToggle` component (grid/timeline icons)
  - [x] 5.2 Add toggle button to gallery header
  - [x] 5.3 Store view preference in session state
  - [x] 5.4 Conditionally render time-of-day sections based on view mode
  - [x] 5.5 Create unit tests for view toggle

## Dev Notes

### Architecture Compliance

This story enhances the existing `ChildScreenshotGallery` component from Story 19B-1. Key patterns to follow:

1. **Inline Styles**: Use `React.CSSProperties` objects, not Tailwind classes
2. **Data-TestID**: Add `data-testid` attributes for all testable elements
3. **Child-Friendly Language**: All text at 6th-grade reading level
4. **Sky Blue Theme**: Continue using sky-500 (#0ea5e9) color palette

### Existing Code to Leverage

**From Story 19B-1 implementation:**

```typescript
// apps/web/src/components/child/ChildScreenshotGallery.tsx
// Already has: groupByDay(), day headers, responsive grid
// Extend with: time-of-day sections, gap indicators, view toggle
```

**Demo gallery time grouping pattern:**

```typescript
// apps/web/src/components/dashboard/demo/DemoScreenshotGallery.tsx
// Already has: groupByDay() pattern
// Extend with: groupByTimeOfDay() nested grouping
```

### Time-of-Day Section Design

```typescript
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

interface TimeOfDayConfig {
  key: TimeOfDay
  label: string // Child-friendly label
  icon: string // Emoji icon
  startHour: number // Hour to start (0-23)
  endHour: number // Hour to end (exclusive)
}

const TIME_OF_DAY_CONFIG: TimeOfDayConfig[] = [
  { key: 'morning', label: 'Morning', icon: '🌅', startHour: 6, endHour: 12 },
  { key: 'afternoon', label: 'Afternoon', icon: '☀️', startHour: 12, endHour: 18 },
  { key: 'evening', label: 'Evening', icon: '🌆', startHour: 18, endHour: 24 },
  { key: 'night', label: 'Night', icon: '🌙', startHour: 0, endHour: 6 },
]

function getTimeOfDay(timestamp: number): TimeOfDay {
  const hour = new Date(timestamp).getHours()
  // Return matching time period
}
```

### Gap Detection Logic

```typescript
// Detect gaps longer than X hours between screenshots
const GAP_THRESHOLD_HOURS = 2

function detectGaps(screenshots: ChildScreenshot[]): GapInfo[] {
  const gaps: GapInfo[] = []
  for (let i = 1; i < screenshots.length; i++) {
    const prevTime = screenshots[i - 1].timestamp
    const currTime = screenshots[i].timestamp
    const diffHours = (prevTime - currTime) / (1000 * 60 * 60)

    if (diffHours > GAP_THRESHOLD_HOURS) {
      gaps.push({
        startTime: currTime,
        endTime: prevTime,
        message: 'No pictures during this time',
      })
    }
  }
  return gaps
}
```

### Calendar Picker Design

Use a simple calendar component:

- Month navigation (prev/next arrows)
- Days grid with current month
- Highlight days that have screenshots (use count from Firestore)
- Click day to scroll to that date in timeline
- Stay within 7-day window per AC2 from 19B-1

### View Toggle States

```typescript
type ViewMode = 'grid' | 'timeline'

// Grid view: Current gallery layout (3 cols desktop, 2 mobile)
// Timeline view: Time-of-day sections with vertical flow
```

### Child-Friendly Language Guide

Per NFR65 (6th-grade reading level):

- "Morning pictures" instead of "Screenshots captured AM"
- "No pictures during this time" instead of "No activity detected"
- "Pick a date" instead of "Select date from calendar"
- Keep sentences short (10-15 words max)

### Color Scheme

Continue sky blue theme from 19B-1:

```typescript
const childTheme = {
  primary: '#0ea5e9', // sky-500
  primaryLight: '#e0f2fe', // sky-100
  primaryDark: '#0369a1', // sky-700
  background: '#f0f9ff', // sky-50
  border: '#7dd3fc', // sky-300
  gap: '#f1f5f9', // slate-100 (for gap indicators)
  gapText: '#64748b', // slate-500 (for gap message)
}
```

### Project Structure Notes

**Files to modify:**

- `apps/web/src/components/child/ChildScreenshotGallery.tsx` - Add time sections, view toggle
- `apps/web/src/components/child/ChildScreenshotGallery.test.tsx` - Add tests

**Files to create:**

- `apps/web/src/components/child/TimelineGap.tsx` - Gap indicator component
- `apps/web/src/components/child/TimelineGap.test.tsx` - Gap tests
- `apps/web/src/components/child/DatePickerModal.tsx` - Calendar picker
- `apps/web/src/components/child/DatePickerModal.test.tsx` - Picker tests
- `apps/web/src/components/child/ViewToggle.tsx` - Grid/timeline toggle
- `apps/web/src/components/child/ViewToggle.test.tsx` - Toggle tests

### Previous Story Intelligence

From Story 19B-1 implementation:

1. **Pattern Used**: Inline styles with React.CSSProperties (no Tailwind)
2. **Test Pattern**: Vitest with @testing-library/react, mock IntersectionObserver
3. **Firestore Query**: Uses `where('timestamp', '>=', sevenDaysAgo)` filter
4. **State Management**: useState hooks in parent component, props drilling
5. **Accessibility**: role="button", tabIndex="0", aria-label on interactive elements
6. **Security Review Notes**:
   - Added 7-day filter (was missing initially)
   - SECURITY TODOs for family code validation improvements

### Dependencies

**No new packages needed** - reuse existing date-fns patterns or native Date APIs.

### Edge Cases

1. **No screenshots in a time period**: Show friendly gap message
2. **All screenshots in one time period**: Show only that section
3. **Empty day selected**: Show "No pictures on this day" message
4. **Very few screenshots**: Timeline might look sparse - that's OK
5. **Night screenshots (12am-6am)**: Group at end of previous day or start of next?
   - Decision: Show at start of calendar day for simplicity

### Accessibility Requirements

- All images have alt text (from title/url)
- Calendar picker supports keyboard navigation
- View toggle announces current mode to screen readers
- Focus management when switching views
- Touch targets minimum 44x44px (NFR49)

### References

- [Source: docs/epics/epic-list.md#Story-19B.2 - Screenshot Timeline View]
- [Pattern: apps/web/src/components/child/ChildScreenshotGallery.tsx]
- [Pattern: apps/web/src/components/dashboard/demo/DemoScreenshotGallery.tsx]
- [Previous: docs/sprint-artifacts/stories/19b-1-child-screenshot-gallery.md]
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

1. Created `timelineUtils.ts` with all time-of-day grouping and gap detection logic
2. Created `TimeOfDaySection.tsx` component with friendly icons (🌅 Morning, ☀️ Afternoon, 🌆 Evening, 🌙 Night)
3. Created `TimelineGap.tsx` component with child-friendly "No pictures during this time" message and 💤 icon
4. Created `DatePickerModal.tsx` calendar picker with month navigation and date highlighting
5. Created `ViewToggle.tsx` component for grid/timeline switching using radiogroup accessibility pattern
6. Updated `ChildScreenshotGallery.tsx` with:
   - Day headers showing screenshot counts ("X pictures")
   - "Today" and "Yesterday" labels for recent days
   - Time-of-day sections in timeline view
   - Gap indicators between time sections
   - View toggle (grid/timeline)
   - Calendar picker button
7. All components use inline styles (React.CSSProperties) per project pattern
8. All components have data-testid attributes for testability
9. All text uses child-friendly language at 6th-grade reading level (NFR65)
10. All 129 tests pass (31 timelineUtils + 11 TimeOfDaySection + 7 TimelineGap + 10 ViewToggle + 15 DatePickerModal + 28 ChildScreenshotGallery + additional existing tests)
11. Code review fixes applied:
    - AC5: View preference now persisted in sessionStorage (was using non-persistent useState)
    - Removed duplicate getDateKey function from DatePickerModal (now imports from timelineUtils)
    - Removed unused getTimeOfDayColors function (dead code)
    - Added keyboard focus styling to ViewToggle buttons
    - Added focus trap to DatePickerModal for accessibility
    - Added defensive check to getTimeOfDayConfig

### File List

**Created:**

- `apps/web/src/components/child/timelineUtils.ts` - Time-of-day grouping and gap detection utilities
- `apps/web/src/components/child/timelineUtils.test.ts` - 31 tests for utilities
- `apps/web/src/components/child/TimeOfDaySection.tsx` - Time-of-day section component
- `apps/web/src/components/child/TimeOfDaySection.test.tsx` - 15 tests
- `apps/web/src/components/child/TimelineGap.tsx` - Gap indicator component
- `apps/web/src/components/child/TimelineGap.test.tsx` - 7 tests
- `apps/web/src/components/child/ViewToggle.tsx` - View toggle component
- `apps/web/src/components/child/ViewToggle.test.tsx` - 10 tests
- `apps/web/src/components/child/DatePickerModal.tsx` - Calendar picker modal
- `apps/web/src/components/child/DatePickerModal.test.tsx` - 15 tests

**Modified:**

- `apps/web/src/components/child/ChildScreenshotGallery.tsx` - Major update with timeline features
- `apps/web/src/components/child/ChildScreenshotGallery.test.tsx` - Added 19B-2 tests

## Change Log

| Date       | Change                                                     |
| ---------- | ---------------------------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev                     |
| 2025-12-31 | Story implementation completed, all tasks done, tests pass |
| 2025-12-31 | Code review completed - 6 issues found and fixed           |
