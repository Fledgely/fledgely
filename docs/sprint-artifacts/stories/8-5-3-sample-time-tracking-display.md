# Story 8.5.3: Sample Time Tracking Display

Status: done

## Story

As a **parent exploring fledgely**,
I want **to see sample time tracking data**,
So that **I understand how screen time is measured and displayed**.

## Acceptance Criteria

1. **AC1: Daily/Weekly Screen Time Breakdown**
   - Given parent is viewing the demo child profile
   - When they access time tracking features
   - Then sample data shows daily/weekly screen time breakdown

2. **AC2: Activity Type Categorization**
   - Given time tracking data is displayed
   - When viewing the breakdown
   - Then time is categorized by activity type (educational, entertainment, social)

3. **AC3: Time Limit Indicators**
   - Given time tracking is visible
   - When viewing limits
   - Then sample data shows time limit indicators (over/under limit examples)

4. **AC4: Graphs and Visualizations**
   - Given sample time data exists
   - When parent views time tracking
   - Then graphs and visualizations use demo data

5. **AC5: Realistic Patterns**
   - Given demo data is generated
   - When viewing time ranges
   - Then time ranges show realistic patterns (school days vs weekends)

6. **AC6: Interactive Filters**
   - Given parent is viewing time tracking
   - When they interact with controls
   - Then parent can interact with filters and date ranges

## Tasks / Subtasks

- [x] Task 1: Create Demo Time Tracking Data Model (AC: #1, #2, #5)
  - [x] 1.1 Define `DemoTimeEntry` interface with category, duration, date
  - [x] 1.2 Define `DemoTimeLimit` interface with category limits
  - [x] 1.3 Create `DEMO_TIME_DATA` constant with realistic 7-day sample
  - [x] 1.4 Add helper functions for aggregating by day/category
  - [x] 1.5 Create unit tests for data model

- [x] Task 2: Create DemoTimeChart Component (AC: #4)
  - [x] 2.1 Create `DemoTimeChart.tsx` in `apps/web/src/components/dashboard/demo/`
  - [x] 2.2 Implement bar chart for daily screen time
  - [x] 2.3 Show category breakdown with color coding
  - [x] 2.4 Add demo styling (lavender theme, dashed borders)
  - [x] 2.5 Create unit tests

- [x] Task 3: Create DemoTimeSummary Component (AC: #1, #2, #3)
  - [x] 3.1 Create `DemoTimeSummary.tsx` in `apps/web/src/components/dashboard/demo/`
  - [x] 3.2 Display daily total vs limit
  - [x] 3.3 Show category breakdown (educational, entertainment, social, other)
  - [x] 3.4 Display limit status indicators (under/over limit)
  - [x] 3.5 Include demo badge
  - [x] 3.6 Create unit tests

- [x] Task 4: Create DemoTimeTrackingPanel Component (AC: #5, #6)
  - [x] 4.1 Create `DemoTimeTrackingPanel.tsx` combining chart and summary
  - [x] 4.2 Add date range selector (Today, This Week)
  - [x] 4.3 Add category filter tabs
  - [x] 4.4 Generate school day vs weekend patterns in sample data
  - [x] 4.5 Create unit tests

- [x] Task 5: Integrate into Demo Experience (AC: #1)
  - [x] 5.1 Add time tracking section to DemoChildCard or as expandable panel
  - [x] 5.2 Create integration tests
  - [x] 5.3 Update barrel exports

## Dev Notes

### Implementation Strategy

Story 8-5-3 extends the demo mode by adding sample time tracking visualization. This gives parents a preview of how screen time monitoring would work before they add real children.

**Key insight**: Time tracking is a key differentiator for parents considering monitoring tools. Showing a realistic preview helps them understand the value before committing.

### Data Model Design

```typescript
interface DemoTimeEntry {
  id: string
  date: string // YYYY-MM-DD
  category: 'educational' | 'entertainment' | 'social' | 'other'
  duration: number // minutes
  appName: string
}

interface DemoTimeLimit {
  category: string
  dailyLimit: number // minutes
}

interface DemoTimeSummary {
  date: string
  totalMinutes: number
  byCategory: Record<string, number>
  limitStatus: 'under' | 'at' | 'over'
}
```

### Realistic Pattern Generation

Sample data should reflect realistic usage:

- **School days (Mon-Fri)**: More educational, less entertainment
- **Weekends**: More entertainment, gaming
- **Daily variation**: 1-4 hours total screen time
- **Some limit violations**: 1-2 "over limit" days to show alerts

### Visualization Approach

Use simple CSS-based charts rather than adding charting dependencies:

- Horizontal bar charts for daily totals
- Stacked bars for category breakdown
- Color-coded progress bars for limits

### Integration with Story 8-5-1

The time tracking panel should integrate with the DemoChildCard, potentially as:

- An expandable section below the screenshot gallery
- A tabbed view alongside screenshots
- A separate panel that can be toggled

### Testing Strategy

- Unit tests for data aggregation functions
- Unit tests for component rendering
- Tests for date range filtering
- Tests for category filtering
- Integration tests for full panel

### Existing Patterns to Follow

From Stories 8-5-1 and 8-5-2:

- `apps/web/src/data/demoData.ts` - Add time tracking data
- Demo styling: lavender background (#faf5ff), dashed borders (#c4b5fd)
- Demo badges with theater mask emoji
- Expandable sections with toggle buttons

### Project Structure Notes

Files to create:

- `apps/web/src/components/dashboard/demo/DemoTimeChart.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeChart.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeSummary.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeSummary.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeTrackingPanel.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeTrackingPanel.test.tsx`

Files to modify:

- `apps/web/src/data/demoData.ts` - Add time tracking types and data
- `apps/web/src/data/demoData.test.ts` - Add time tracking tests
- `apps/web/src/components/dashboard/demo/index.ts` - Add exports

### Dependencies

- No external dependencies (no charting libraries needed)
- Uses CSS for visualization
- Builds on demo infrastructure from Story 8-5-1

### References

- [Source: docs/epics/epic-list.md - Story 8.5.3 acceptance criteria]
- [Source: Story 8-5-1 - Demo data foundation]
- [Source: Story 8-5-2 - Demo component patterns]

## Dev Agent Record

### Context Reference

Story created for Epic 8.5: Demo Mode - Early Win Preview.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required.

### Completion Notes List

1. **Data Model**: Implemented `DemoTimeCategory`, `DemoTimeEntry`, `DemoTimeLimit`, and `DemoDailySummary` types with 27 sample entries spanning 7 days of realistic usage patterns.
2. **Helper Functions**: Created `getDemoTimeLimit()`, `getDemoTimeSummaryByDay()`, `getDemoWeeklyTimeByCategory()`, `getDemoWeeklyTotalTime()`, and `formatDuration()` functions.
3. **DemoTimeChart**: CSS-based horizontal bar chart with stacked category breakdown and color coding.
4. **DemoTimeSummary**: Summary card showing total time, category breakdown, and limit status indicators.
5. **DemoTimeTrackingPanel**: Combined panel with Today/Week tabs, pattern insights, and integrated chart+summary.
6. **Integration**: Added expandable time tracking toggle to DemoChildCard with 11 integration tests.
7. **Test Coverage**: 69 tests for time tracking components plus 11 integration tests (80 total demo tests pass).

### File List

Created:

- `apps/web/src/components/dashboard/demo/DemoTimeChart.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeChart.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeSummary.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeSummary.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeTrackingPanel.tsx`
- `apps/web/src/components/dashboard/demo/DemoTimeTrackingPanel.test.tsx`

Modified:

- `apps/web/src/data/demoData.ts` - Added time tracking types and data
- `apps/web/src/data/demoData.test.ts` - Added time tracking tests
- `apps/web/src/components/dashboard/demo/index.ts` - Added exports
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Added time tracking integration
- `apps/web/src/components/dashboard/DemoChildCard.test.tsx` - Added integration tests
- `docs/sprint-artifacts/sprint-status.yaml` - Updated story status

## Change Log

| Date       | Change                                            |
| ---------- | ------------------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev            |
| 2025-12-31 | Tasks 1-4 completed (data model and components)   |
| 2025-12-31 | Task 5 completed (integration into DemoChildCard) |
