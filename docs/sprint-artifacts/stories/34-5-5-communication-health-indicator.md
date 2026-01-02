# Story 34.5.5: Communication Health Indicator

## Status: done

## Story

As **a parent**,
I want **to see communication health with my child**,
So that **I can proactively address brewing frustration**.

## Acceptance Criteria

1. **AC1: Health Indicator Display**
   - Given agreement has change request history
   - When parent views agreement dashboard
   - Then indicator shows: "Communication health: Healthy / Needs attention"

2. **AC2: Needs Attention Logic**
   - Given multiple rejections without counter-proposals
   - When indicator is calculated
   - Then status shows "Needs attention"

3. **AC3: Actionable Suggestion**
   - Given child has made requests this month
   - When indicator is displayed
   - Then suggestion shows: "Your child has made X requests this month - consider discussing"
   - And tone is neutral awareness (no blame)

4. **AC4: Parent Pattern Awareness**
   - Given communication patterns exist
   - When parent views indicator
   - Then helps parents notice patterns before escalation

5. **AC5: Child Transparency**
   - Given child views their dashboard
   - When child has communication history
   - Then child sees same indicator (bilateral transparency)

## Tasks / Subtasks

### Task 1: Create CommunicationHealthIndicator Component (AC: #1, #3, #4) [x]

Create reusable component that displays communication health status.

**Files:**

- `apps/web/src/components/health/CommunicationHealthIndicator.tsx` (new)
- `apps/web/src/components/health/CommunicationHealthIndicator.test.tsx` (new)
- `apps/web/src/components/health/index.ts` (modify - add export)

**Implementation:**

- Create component that accepts metrics from useCommunicationMetrics hook
- Display health status badge: "Healthy" (green) or "Needs attention" (amber)
- Map trend values: 'improving'/'stable' → "Healthy", 'needs-attention' → "Needs attention"
- Show suggestion text with request count when applicable
- Use neutral, non-blaming language per UX guidelines
- Support both parent and child view modes via `isChild` prop
- Include loading and empty states

**Tests:** 26 tests for component states, rendering, and edge cases/security

### Task 2: Enhance useCommunicationMetrics Hook (AC: #2, #3) [x]

Note: The existing hook from Story 34-5-1 already has all required fields. AC2 needs-attention logic is already implemented via trend calculation.

**Files:**

- `apps/web/src/hooks/useCommunicationMetrics.ts` (already complete)

**Implementation:**

- Existing hook already calculates trend: 'improving' | 'stable' | 'needs-attention'
- Existing hook tracks totalProposals for suggestion text
- No additional modifications needed

### Task 3: Integrate into Parent Dashboard (AC: #1, #4) [x]

Add indicator to parent dashboard near family status.

**Files:**

- `apps/web/src/app/dashboard/page.tsx` (modify)

**Implementation:**

- Import and use CommunicationHealthIndicator component
- Position below FamilyStatusCard for prominence
- Pass metrics from useCommunicationMetrics hook per child
- Show for each child with communication history

**Tests:** Covered by existing dashboard tests + component tests

### Task 4: Integrate into Child Dashboard (AC: #5) [x]

Add indicator to child dashboard for transparency.

**Files:**

- `apps/web/src/app/child/dashboard/page.tsx` (modify)

**Implementation:**

- Import and use CommunicationHealthIndicator with `isChild={true}`
- Position in appropriate section for child visibility
- Use child-friendly language variant
- Show same data as parent sees (bilateral transparency)

**Tests:** Covered by existing dashboard tests + component tests

### Task 5: Add Component Styling and Accessibility (AC: #1, #4) [x]

Ensure component meets accessibility and design standards.

**Files:**

- `apps/web/src/components/health/CommunicationHealthIndicator.tsx` (included in Task 1)

**Implementation:**

- Added appropriate ARIA labels for screen readers
- Used high-contrast color scheme (green/amber badges)
- Included role="status" for dynamic updates
- Added aria-label for screen reader announcements

**Tests:** 2 accessibility tests + 7 edge case/security tests included in component tests

## Dev Notes

### Existing Implementation Context

Story 34-5-1 already implemented the core infrastructure:

- `useCommunicationMetrics.ts` hook with trend calculation
- `CommunicationMetrics` interface with trend: 'improving' | 'stable' | 'needs-attention'
- `rejectionPatternService.ts` for pattern tracking

This story adds:

1. UI component to visualize the metrics
2. Integration into both dashboards
3. Enhanced metrics for suggestion text

### Architecture Patterns

From Story 34-5-1:

- Hook pattern for data fetching
- Service layer for business logic
- Component receives data via props

### Messaging Tone

All indicator messaging should be:

- Neutral: Facts, not accusations
- Supportive: "Consider discussing" not "You're ignoring"
- Empowering: Both parent and child see the same info

### Previous Story Patterns to Follow

From **Story 34-5-1** (Communication Metrics):

- `useCommunicationMetrics.ts` - Hook structure
- CommunicationMetrics interface

From **Story 27.5.4** (Friction Indicators):

- `FrictionIndicatorsDashboard.tsx` - Similar indicator pattern
- Health status visualization patterns

### Dashboard Integration Points

**Parent Dashboard** (`apps/web/src/app/dashboard/page.tsx`):

- After FamilyStatusCard (line ~489)
- Use useCommunicationMetrics per child

**Child Dashboard** (`apps/web/src/app/child/dashboard/page.tsx`):

- After FrictionIndicatorsDashboard (line ~478)
- Single child context from childSession

### Component Interface

```typescript
interface CommunicationHealthIndicatorProps {
  /** Child ID for metrics lookup */
  childId: string
  /** Family ID for context */
  familyId: string
  /** Child's name for display */
  childName: string
  /** Whether this is child's view (affects language) */
  isChild?: boolean
}
```

### References

- [Source: docs/epics/epic-list.md#Story 34.5.5]
- [Source: apps/web/src/hooks/useCommunicationMetrics.ts]
- [Source: apps/web/src/app/dashboard/page.tsx]
- [Source: apps/web/src/app/child/dashboard/page.tsx]

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20250114

### Debug Log References

### Completion Notes List

- Created CommunicationHealthIndicator component with full test coverage
- Integrated into parent dashboard showing indicator per child
- Integrated into child dashboard with bilateral transparency
- Used existing useCommunicationMetrics hook - no modifications needed
- Applied code review fixes: React.memo, prop validation, sanitizeChildName, 7 security/edge case tests
- All 26 tests pass

### File List

**Modified:**

- `apps/web/src/app/dashboard/page.tsx` - Added CommunicationHealthIndicator import and integration
- `apps/web/src/app/child/dashboard/page.tsx` - Added CommunicationHealthIndicator with isChild=true
- `apps/web/src/components/health/index.ts` - Added CommunicationHealthIndicator export

**New:**

- `apps/web/src/components/health/CommunicationHealthIndicator.tsx` - Communication health indicator component
- `apps/web/src/components/health/CommunicationHealthIndicator.test.tsx` - 26 tests for component

**Test Summary:** 26 tests pass
