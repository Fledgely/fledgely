# Story 8.5.2: Sample Screenshot Gallery

Status: done

## Story

As a **parent exploring fledgely**,
I want **to see realistic sample screenshots showing different classifications**,
So that **I understand what AI-categorized activity looks like**.

## Acceptance Criteria

1. **AC1: Category Variety Display**
   - Given parent is viewing the demo child profile
   - When they browse the screenshot gallery
   - Then sample screenshots show various categories: homework, gaming, social, video, concerning

2. **AC2: AI Classification Display**
   - Given screenshots are displayed in the gallery
   - When viewing any screenshot
   - Then each screenshot shows AI classification and confidence score

3. **AC3: Flagging Demonstration**
   - Given the screenshot gallery is populated
   - When viewing the demo data
   - Then screenshots demonstrate flagging behavior (some flagged, some not)

4. **AC4: Timeline View**
   - Given sample screenshots exist
   - When viewing the gallery
   - Then sample data spans multiple days to show timeline view

5. **AC5: Safe Content Only**
   - Given screenshot images need to be displayed
   - When generating demo thumbnails
   - Then screenshots are stock/generated images (not real children)

6. **AC6: Filter and Search**
   - Given parent is viewing the gallery
   - When they interact with the gallery
   - Then gallery demonstrates filter/search functionality

## Tasks / Subtasks

- [x] Task 1: Extend Demo Screenshot Data Model (AC: #2, #3)
  - [x] 1.1 Add `classification` field with category and confidence to DemoScreenshot type
  - [x] 1.2 Add `flagged` boolean and optional `flagReason` fields
  - [x] 1.3 Update DEMO_SCREENSHOTS to include classification data
  - [x] 1.4 Add 1-2 flagged screenshots with sample concern types
  - [x] 1.5 Create unit tests for extended data model

- [x] Task 2: Create DemoScreenshotCard Component (AC: #1, #2, #3, #5)
  - [x] 2.1 Create `DemoScreenshotCard.tsx` in `apps/web/src/components/dashboard/demo/`
  - [x] 2.2 Display thumbnail with category-colored badge
  - [x] 2.3 Show AI classification label and confidence percentage
  - [x] 2.4 Display flag indicator (orange outline/badge) for flagged items
  - [x] 2.5 Show timestamp in relative format
  - [x] 2.6 Include "Demo Data" watermark
  - [x] 2.7 Create unit tests for DemoScreenshotCard

- [x] Task 3: Create DemoScreenshotGallery Component (AC: #1, #4, #6)
  - [x] 3.1 Create `DemoScreenshotGallery.tsx` in `apps/web/src/components/dashboard/demo/`
  - [x] 3.2 Render grid of DemoScreenshotCard components
  - [x] 3.3 Group screenshots by day for timeline view
  - [x] 3.4 Show day headers with date labels
  - [x] 3.5 Apply demo styling (dashed border, lavender background)
  - [x] 3.6 Create unit tests for DemoScreenshotGallery

- [x] Task 4: Add Filter and Search UI (AC: #6)
  - [x] 4.1 Create category filter chips (All, Homework, Gaming, Social, Video, Creative, Flagged)
  - [x] 4.2 Add search input with placeholder text
  - [x] 4.3 Implement client-side filtering by category
  - [x] 4.4 Implement search by title/url
  - [x] 4.5 Show filter result count
  - [x] 4.6 Create unit tests for filtering

- [x] Task 5: Integrate Gallery into Demo Experience (AC: #1)
  - [x] 5.1 Add "Explore Demo" button to DemoChildCard
  - [x] 5.2 Create expandable/collapsible gallery section
  - [x] 5.3 Update DemoChildCard to optionally show gallery
  - [x] 5.4 Create integration tests

## Dev Notes

### Implementation Strategy

Story 8-5-2 builds on the demo data foundation from Story 8-5-1. The goal is to create a visual gallery that shows parents what AI-categorized screenshots look like, including classification labels, confidence scores, and flagging behavior.

**Key insight from Story 8-5-1**: We already have `DEMO_SCREENSHOTS` with 8 entries spanning 4 days. This story extends that data with classification metadata and builds the UI to display it.

### Architecture Pattern

Use the same component organization established in Story 8-5-1:

- Demo-specific components go in `apps/web/src/components/dashboard/demo/`
- Follow existing styling patterns (dashed borders, lavender backgrounds)
- All demo content clearly marked as sample data

### Data Model Extensions

Extend `DemoScreenshot` interface:

```typescript
interface DemoScreenshot {
  // Existing fields from 8-5-1
  id: string
  title: string
  url: string
  category: DemoScreenshotCategory
  timestamp: number
  thumbnailDataUri: string

  // NEW for 8-5-2
  classification: {
    label: string // Human-readable category name
    confidence: number // 0.0 to 1.0
  }
  flagged?: boolean
  flagReason?: string // e.g., "Potential concerning content detected"
}
```

### Classification Display

Show confidence as percentage with visual indicator:

- 90%+ = "Very confident" (green)
- 70-89% = "Confident" (blue)
- 50-69% = "Uncertain" (yellow)

### Flagged Screenshots

Include 1-2 flagged items in demo data:

- One with "concerning" category showing how flags appear
- Demonstrate that flags are conversation starters, not accusations
- Show flag reason in non-accusatory language

### Filter Implementation

Client-side filtering only (no backend):

- Category filter: Show only selected category
- "Flagged" filter: Show only flagged items
- Search: Filter by title or URL substring
- Combine filters with AND logic

### Visual Hierarchy

```
┌────────────────────────────────────────────────────────────────┐
│ 📸 Demo Screenshot Gallery                    🎭 Sample Data   │
├────────────────────────────────────────────────────────────────┤
│ [All] [Homework] [Gaming] [Social] [Video] [🚩 Flagged]        │
│ 🔍 [Search screenshots...]                                      │
├────────────────────────────────────────────────────────────────┤
│ ── Today ──                                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│ │ 🟢 Math  │ │ 🟣 Game  │ │ 🚩 Flag  │                         │
│ │ Homework │ │ Gaming   │ │ Concern  │                         │
│ │ 92%      │ │ 88%      │ │ 76%      │                         │
│ └──────────┘ └──────────┘ └──────────┘                         │
│                                                                 │
│ ── Yesterday ──                                                 │
│ ┌──────────┐ ┌──────────┐                                      │
│ │ 🔵 Social│ │ 🟠 Video │                                      │
│ │ Messages │ │ YouTube  │                                      │
│ │ 85%      │ │ 94%      │                                      │
│ └──────────┘ └──────────┘                                      │
└────────────────────────────────────────────────────────────────┘
```

### Testing Strategy

- Unit tests for data model extensions
- Unit tests for DemoScreenshotCard rendering
- Unit tests for DemoScreenshotGallery timeline grouping
- Unit tests for filter/search functionality
- Integration test for gallery in demo flow

### Existing Patterns to Follow

From Story 8-5-1:

- `apps/web/src/data/demoData.ts` - Extend existing data
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Styling patterns
- Lavender/purple color scheme for demo content
- Dashed borders for demo distinction

From dashboard components:

- `apps/web/src/components/dashboard/ChildStatusRow.tsx` - Badge patterns
- Use existing color schemes from statusConstants

### Project Structure Notes

Files to create:

- `apps/web/src/components/dashboard/demo/DemoScreenshotCard.tsx`
- `apps/web/src/components/dashboard/demo/DemoScreenshotCard.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoScreenshotGallery.tsx`
- `apps/web/src/components/dashboard/demo/DemoScreenshotGallery.test.tsx`
- `apps/web/src/components/dashboard/demo/index.ts` - Barrel export

Files to modify:

- `apps/web/src/data/demoData.ts` - Extend DemoScreenshot type
- `apps/web/src/data/demoData.test.ts` - Add classification tests
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Add gallery trigger

### Dependencies

- No external dependencies required
- Uses existing demo data from Story 8-5-1
- Leverages existing component patterns

### References

- [Source: docs/epics/epic-list.md - Story 8.5.2 acceptance criteria]
- [Source: apps/web/src/data/demoData.ts - Existing demo data foundation]
- [Source: apps/web/src/components/dashboard/DemoChildCard.tsx - Demo styling patterns]
- [Source: Story 8-5-1 completion notes - Foundation for this story]

## Dev Agent Record

### Context Reference

Story created via create-story workflow from Epic 8.5: Demo Mode - Early Win Preview.
Builds directly on Story 8-5-1's demo data foundation.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required.

### Completion Notes List

- Extended DemoScreenshot interface with classification and flagging fields
- Created DemoScreenshotCard component with category badges, confidence display, flag indicators
- Created DemoScreenshotGallery component with timeline view, filter chips, and search
- Integrated gallery into DemoChildCard with expandable/collapsible toggle
- 10 demo screenshots with varied categories, confidence levels, and 2 flagged items
- 101 tests covering all acceptance criteria

### File List

**New Files:**

- `apps/web/src/components/dashboard/demo/DemoScreenshotCard.tsx` - Screenshot card component
- `apps/web/src/components/dashboard/demo/DemoScreenshotCard.test.tsx` - 17 tests
- `apps/web/src/components/dashboard/demo/DemoScreenshotGallery.tsx` - Gallery with filtering
- `apps/web/src/components/dashboard/demo/DemoScreenshotGallery.test.tsx` - 19 tests
- `apps/web/src/components/dashboard/demo/index.ts` - Barrel export

**Modified Files:**

- `apps/web/src/data/demoData.ts` - Extended with classification, flagging, filtering
- `apps/web/src/data/demoData.test.ts` - 35 tests total (19 new for 8.5.2)
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Added gallery integration
- `apps/web/src/components/dashboard/DemoChildCard.test.tsx` - 30 tests (10 new for gallery)

## Change Log

| Date       | Change                                                      |
| ---------- | ----------------------------------------------------------- |
| 2025-12-30 | Story created and marked ready-for-dev                      |
| 2025-12-31 | Implementation complete - all tasks done, 101 tests passing |
