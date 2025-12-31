# Story 27.5.3: Flag-Triggered Friction Markers

Status: done

## Story

As a **parent**,
I want **to mark when a flag caused a difficult conversation**,
So that **the system can track friction points**.

## Acceptance Criteria

1. **AC1: Friction marker option**
   - Given parent has reviewed a flag
   - When marking resolution
   - Then option available: "This caused a difficult conversation"

2. **AC2: Store friction marker**
   - Given parent marks a difficult conversation
   - When resolution is saved
   - Then marker stored with flag (no details required)

3. **AC3: Aggregate friction data**
   - Given friction flags exist
   - When analyzing health data
   - Then friction flags aggregated for health analysis

4. **AC4: Pattern visibility**
   - Given multiple friction flags
   - When viewing patterns
   - Then pattern visible: "3 gaming flags led to difficult conversations"

5. **AC5: Identify friction content types**
   - Given friction markers collected
   - When viewing analytics
   - Then helps identify which content types cause family friction

6. **AC6: Non-judgmental data**
   - Given friction tracking
   - When displaying data
   - Then no judgment - just data for family awareness

## Tasks / Subtasks

- [x] Task 1: Update flag resolution to include friction marker (AC: #1, #2)
  - [x] 1.1 Add `causedDifficultConversation` boolean field to flag schema
  - [x] 1.2 Update flag resolution endpoint to accept friction marker
  - [x] 1.3 Update flag resolution UI with checkbox option

- [x] Task 2: Create friction aggregation service (AC: #3, #4, #5)
  - [x] 2.1 Create service to aggregate friction data by content category
  - [x] 2.2 Calculate friction patterns per category
  - [x] 2.3 Create endpoint to retrieve friction summary

- [ ] Task 3: Create friction patterns display (AC: #4, #6)
  - [ ] 3.1 Add friction summary to family health dashboard (deferred to 27.5.4)
  - [ ] 3.2 Display category-based friction patterns (deferred to 27.5.4)
  - [ ] 3.3 Use neutral, non-judgmental language (deferred to 27.5.4)

## Dev Notes

### Schema Updates

Add to FlagDocument:

```typescript
causedDifficultConversation?: boolean
frictionMarkedAt?: number
frictionMarkedBy?: string
```

### Friction Aggregation

Track by:

- Content category (gaming, social, etc.)
- Time period (weekly, monthly)
- Flag severity

### Pattern Display

Example patterns:

- "3 of 5 gaming-related flags led to difficult conversations"
- "Social media flags rarely cause friction (1 of 10)"

### References

- [Source: docs/epics/epic-list.md#story-2753] - Story requirements
- [Source: Story 22.3] - Flag resolution workflow

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Friction marker checkbox added to flag resolution modal (AC1, AC2)
- FrictionAggregationService aggregates flags by category with friction percentages (AC3, AC4, AC5)
- Neutral, non-judgmental pattern text via getFrictionPatternText() (AC6)
- HTTP endpoint getFrictionSummaryEndpoint exposes aggregated data
- Task 3 (dashboard display) deferred to Story 27.5.4 which focuses on friction indicators

### File List

**New Files:**

- `apps/functions/src/services/health/frictionAggregationService.ts` - Friction data aggregation service

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added friction marker fields to FlagDocument schema
- `apps/web/src/components/flags/FlagActionModal.tsx` - Added friction marker checkbox UI
- `apps/web/src/services/flagService.ts` - Updated to handle friction marker in flag actions
- `apps/functions/src/services/health/index.ts` - Added exports for friction aggregation
- `apps/functions/src/http/health/index.ts` - Added getFrictionSummaryEndpoint
- `apps/functions/src/index.ts` - Added getFrictionSummaryEndpoint export
