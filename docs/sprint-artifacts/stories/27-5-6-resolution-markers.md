# Story 27.5.6: Resolution Markers

Status: done

## Story

As a **parent or child**,
I want **to mark when we've resolved an issue**,
So that **our progress is tracked**.

## Acceptance Criteria

1. **AC1: Resolution markers available**
   - Given friction was indicated
   - When resolution occurs
   - Then markers available: "We talked it through", "Parent apologized", "Child understood", "Still working on it"

2. **AC2: Either party can add**
   - Given friction exists
   - When parent or child wants to mark resolution
   - Then either party can add resolution marker

3. **AC3: Both can see resolution**
   - Given resolution was marked
   - When viewing indicators
   - Then both parties can see that resolution was marked

4. **AC4: Improves trend**
   - Given resolution was marked
   - When calculating friction indicators
   - Then resolution improves friction indicator trend

5. **AC5: Celebrates repair**
   - Given resolution was marked
   - When displaying result
   - Then celebrate: "Great job working through this together!"

6. **AC6: Resolution history**
   - Given resolutions exist
   - When viewing family health section
   - Then resolution history visible

## Tasks / Subtasks

- [x] Task 1: Create resolution schema (AC: #1, #6)
  - [x] 1.1 Add Resolution document schema to shared
  - [x] 1.2 Define resolution marker types

- [x] Task 2: Create resolution service (AC: #2, #4)
  - [x] 2.1 Create addResolution function
  - [x] 2.2 Create getResolutions function
  - [x] 2.3 Factor resolutions into friction indicators

- [x] Task 3: Create resolution marker UI (AC: #1, #5)
  - [x] 3.1 Create ResolutionMarkerModal component
  - [x] 3.2 Add celebration animation/message

- [x] Task 4: Add resolution history display (AC: #3, #6)
  - [x] 4.1 Create ResolutionHistory component
  - [x] 4.2 Add to friction indicators dashboard

## Dev Notes

### Resolution Marker Types

- "We talked it through" - General resolution
- "Parent apologized" - Parent took responsibility
- "Child understood" - Child gained understanding
- "Still working on it" - In progress (not fully resolved)

### Data Model

```typescript
interface Resolution {
  id: string
  familyId: string
  createdBy: string
  createdByType: 'parent' | 'child'
  markerType: 'talked_through' | 'parent_apologized' | 'child_understood' | 'in_progress'
  note?: string
  createdAt: number
}
```

### Impact on Indicators

Resolutions (except 'in_progress') count as positive data points
when calculating friction trend.

### References

- [Source: docs/epics/epic-list.md#story-2756] - Story requirements
- [Source: Story 27.5.4] - Friction indicators

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Implemented Resolution schema in shared contracts with four marker types
- Created resolutionService with CRUD operations and period-based queries
- Added HTTP endpoints for both parent and child resolution creation
- Created ResolutionMarkerModal with celebration message on success
- Created ResolutionHistory component with timeline display
- Integrated into FrictionIndicatorsDashboard for both parent and child views
- Resolutions (except in_progress) count as positive data points for friction indicators

### File List

**New Files:**

- `packages/shared/src/contracts/index.ts` - Resolution schema additions
- `apps/functions/src/services/health/resolutionService.ts` - Resolution service
- `apps/web/src/hooks/useResolutions.ts` - Parent resolution hook
- `apps/web/src/hooks/useChildResolutions.ts` - Child resolution hook
- `apps/web/src/components/health/ResolutionMarkerModal.tsx` - Resolution modal
- `apps/web/src/components/health/ResolutionHistory.tsx` - Resolution history

**Modified Files:**

- `packages/shared/src/index.ts` - Resolution exports
- `apps/functions/src/services/health/index.ts` - Resolution service exports
- `apps/functions/src/http/health/index.ts` - Resolution HTTP endpoints
- `apps/functions/src/index.ts` - Resolution endpoint exports
- `apps/web/src/components/health/FrictionIndicatorsDashboard.tsx` - Resolution integration
- `apps/web/src/app/dashboard/page.tsx` - Parent dashboard resolution integration
- `apps/web/src/app/child/dashboard/page.tsx` - Child dashboard resolution integration
