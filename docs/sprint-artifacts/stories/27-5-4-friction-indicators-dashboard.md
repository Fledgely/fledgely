# Story 27.5.4: Friction Indicators Dashboard

Status: done

## Story

As **both parent and child**,
I want **to see aggregated friction indicators**,
So that **we both understand how monitoring is affecting us**.

## Acceptance Criteria

1. **AC1: Aggregated indicators shown**
   - Given check-ins and friction markers exist
   - When viewing family health section
   - Then aggregated indicators shown (not specific responses)

2. **AC2: Relationship health indicator**
   - Given aggregated data calculated
   - When viewing dashboard
   - Then indicators: "Relationship health: Mostly positive" / "Some concerns"

3. **AC3: Trend line display**
   - Given historical data available
   - When viewing dashboard
   - Then trend line: "Improving" / "Stable" / "Needs attention"

4. **AC4: Privacy protection**
   - Given check-in responses exist
   - When viewing dashboard
   - Then no private check-in content revealed

5. **AC5: Bilateral transparency**
   - Given parent and child both access dashboard
   - When viewing indicators
   - Then both parties see same aggregate view

6. **AC6: Conversation starter**
   - Given friction detected
   - When viewing dashboard
   - Then conversation starter shown: "You both indicated some challenges this month"

## Tasks / Subtasks

- [x] Task 1: Create friction indicators service (AC: #1, #2, #3)
  - [x] 1.1 Create service to calculate relationship health from check-ins and friction markers
  - [x] 1.2 Calculate trend based on historical data
  - [x] 1.3 Generate conversation starters based on indicators

- [x] Task 2: Create friction indicators endpoint (AC: #1, #4)
  - [x] 2.1 Add HTTP endpoint to get friction indicators for family
  - [x] 2.2 Ensure no private data is leaked (only aggregates)

- [x] Task 3: Create parent friction dashboard component (AC: #1, #2, #3, #5, #6)
  - [x] 3.1 Create FrictionIndicatorsDashboard component
  - [x] 3.2 Display relationship health indicator
  - [x] 3.3 Display trend line
  - [x] 3.4 Display conversation starters when applicable

- [x] Task 4: Create child friction dashboard component (AC: #5)
  - [x] 4.1 Use same FrictionIndicatorsDashboard component for children (bilateral transparency)
  - [x] 4.2 Create useChildFrictionIndicators hook using Firestore cache

## Dev Notes

### Relationship Health Calculation

Based on:

- Check-in ratings (positive/neutral/concerned)
- Friction marker counts from flag resolution
- Recent vs historical patterns

Health levels:

- "Mostly positive": >70% positive indicators
- "Stable": 50-70% positive
- "Some concerns": <50% positive

### Trend Calculation

Compare current period to previous period:

- "Improving": current > previous by 10%+
- "Stable": within 10% of previous
- "Needs attention": current < previous by 10%+

### Conversation Starters

Example prompts:

- "You both indicated some challenges this month"
- "Things seem to be going well! Keep up the communication"
- "This might be a good time to talk about how monitoring is working"

### References

- [Source: docs/epics/epic-list.md#story-2754] - Story requirements
- [Source: Story 27.5.1] - Check-in system
- [Source: Story 27.5.3] - Friction markers

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- FrictionIndicatorsService calculates relationship health from check-ins and friction markers (AC1, AC2)
- Trend calculated by comparing current period to previous period (AC3)
- Conversation starters generated based on health level and trend (AC6)
- HTTP endpoint caches indicators for child access via Firestore (AC4, AC5)
- Same FrictionIndicatorsDashboard component used for both parent and child (bilateral transparency)
- Children use useChildFrictionIndicators hook reading from cached Firestore document

### File List

**New Files:**

- `apps/functions/src/services/health/frictionIndicatorsService.ts` - Friction indicators calculation service
- `apps/web/src/hooks/useFrictionIndicators.ts` - Parent hook for fetching indicators
- `apps/web/src/hooks/useChildFrictionIndicators.ts` - Child hook for fetching cached indicators
- `apps/web/src/components/health/FrictionIndicatorsDashboard.tsx` - Dashboard component

**Modified Files:**

- `apps/functions/src/services/health/index.ts` - Added friction indicators exports
- `apps/functions/src/http/health/index.ts` - Added getFrictionIndicatorsEndpoint
- `apps/functions/src/index.ts` - Added getFrictionIndicatorsEndpoint export
- `apps/web/src/components/health/index.ts` - Added FrictionIndicatorsDashboard export
- `apps/web/src/app/dashboard/page.tsx` - Added friction indicators to parent dashboard
- `apps/web/src/app/child/dashboard/page.tsx` - Added friction indicators to child dashboard
