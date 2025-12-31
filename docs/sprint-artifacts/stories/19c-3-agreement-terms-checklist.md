# Story 19C.3: Agreement Terms Checklist

Status: done

## Story

As a **child**,
I want **a simple checklist of what the agreement covers**,
So that **I can quickly understand the key points**.

## Acceptance Criteria

1. **Given** child views agreement summary **When** checklist loads **Then** key terms shown as checkboxes/icons

2. **Given** checklist displays **Then** includes: "Screenshots: Yes/No", "Apps tracked: Yes/No"

3. **Given** checklist displays **Then** shows frequency: "How often: Every 5 minutes"

4. **Given** checklist displays **Then** shows duration: "How long kept: 30 days"

5. **Given** checklist item **When** child taps/clicks **Then** item expands to show more detail

6. **Given** checklist design **Then** visual design is friendly, not intimidating (child-appropriate)

## Tasks / Subtasks

- [x] Task 1: Create AgreementChecklist component (AC: #1, #6)
  - [x] 1.1 Create component using sky blue theme (#0ea5e9) matching child dashboard
  - [x] 1.2 Display key terms as visual checklist items with icons/checkboxes
  - [x] 1.3 Use friendly, non-intimidating visual design
  - [x] 1.4 Use React.CSSProperties inline styles (NOT Tailwind)
  - [x] 1.5 Add data-testid attributes for all testable elements

- [x] Task 2: Display monitoring status items (AC: #2)
  - [x] 2.1 Show "Screenshots: Yes/No" with appropriate icon
  - [x] 2.2 Show "Apps tracked: Yes/No" with appropriate icon
  - [x] 2.3 Use child-friendly language from Story 19C.2 translation utilities

- [x] Task 3: Display frequency and duration (AC: #3, #4)
  - [x] 3.1 Show "How often: Every X minutes" using translateToChildFriendly
  - [x] 3.2 Show "How long kept: X days" using formatMonitoringForChild
  - [x] 3.3 Use TermExplanation tooltips for additional context

- [x] Task 4: Implement expandable details (AC: #5)
  - [x] 4.1 Make each checklist item expandable on tap/click
  - [x] 4.2 Show more detail when expanded (child-friendly explanation)
  - [x] 4.3 Add smooth expand/collapse animation
  - [x] 4.4 Support keyboard navigation for accessibility

- [x] Task 5: Integrate with ChildAgreementView (AC: #1)
  - [x] 5.1 Add AgreementChecklist as section within ChildAgreementView
  - [x] 5.2 Pass agreement monitoring data to checklist component
  - [x] 5.3 Ensure consistency with existing monitoring summary

- [x] Task 6: Add component tests
  - [x] 6.1 Test checklist displays all required items
  - [x] 6.2 Test expand/collapse functionality
  - [x] 6.3 Test child-friendly language is applied
  - [x] 6.4 Test accessibility (keyboard navigation, ARIA)
  - [x] 6.5 Test visual indicators match Yes/No states

## Dev Notes

### Technical Implementation

**Reuse existing translation utilities from Story 19C.2:**

```typescript
import {
  translateToChildFriendly,
  formatMonitoringForChild,
  getTermExplanation,
} from '../../utils/childFriendlyLanguage'
import { TermExplanation } from './TermExplanation'
```

**Checklist item structure:**

```typescript
interface ChecklistItem {
  id: string
  label: string // e.g., "Screenshots"
  value: boolean | string // e.g., true or "Every 5 minutes"
  icon: string // e.g., "📸" or "✓"
  explanation: string // Expanded detail text
  expanded?: boolean // Current expansion state
}
```

**Style pattern (matching Epic 19B/19C):**

```typescript
const styles: Record<string, React.CSSProperties> = {
  checklistContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #e0f2fe',
    cursor: 'pointer',
  },
  checkIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#22c55e', // Green for yes
    marginRight: '12px',
  },
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/components/child/AgreementChecklist.tsx` - Checklist component
- `apps/web/src/components/child/AgreementChecklist.test.tsx` - Component tests

**Files to modify:**

- `apps/web/src/components/child/ChildAgreementView.tsx` - Add checklist section

**Existing patterns to follow:**

- `TermExplanation.tsx` - Tooltip pattern with hover/tap
- `ChildAgreementView.tsx` - Sky blue theme, inline styles
- `childFriendlyLanguage.ts` - Translation utilities

### Previous Story Intelligence

From Story 19C.1 (Child Agreement View):

- ChildAgreementView already has monitoring summary card
- Uses `agreement.monitoring.screenshotsEnabled`, `captureFrequency`, `retentionPeriod`
- Sky blue theme (#0ea5e9 primary, #f0f9ff background)
- Inline React.CSSProperties styles, NOT Tailwind

From Story 19C.2 (Age-Appropriate Language Translation):

- `translateToChildFriendly()` for technical term translation
- `formatMonitoringForChild()` for monitoring settings
- `getTermExplanation()` for tooltip explanations
- `TermExplanation` component for hover/tap tooltips
- All translations at 6th-grade reading level (NFR65)

### References

- [Source: apps/web/src/components/child/ChildAgreementView.tsx]
- [Source: apps/web/src/utils/childFriendlyLanguage.ts]
- [Source: apps/web/src/components/child/TermExplanation.tsx]
- [Source: docs/epics/epic-list.md#Story 19C.3]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created AgreementChecklist component with expandable items
- Each checklist item shows: label, value, visual indicator (✓/✗), and expand/collapse arrow
- Expandable details use getTermExplanation() for child-friendly explanations
- Visual indicators: green for enabled, gray for disabled, sky blue for info items
- Full keyboard accessibility (Enter/Space to toggle, ARIA attributes)
- Smooth CSS animation on expand/collapse
- Integrated into ChildAgreementView after header section
- All 25 component tests + 2 integration tests passing

### File List

- `apps/web/src/components/child/AgreementChecklist.tsx` - Created: Expandable checklist component
- `apps/web/src/components/child/AgreementChecklist.test.tsx` - Created: 25 component tests
- `apps/web/src/components/child/ChildAgreementView.tsx` - Modified: Added AgreementChecklist integration
- `apps/web/src/components/child/ChildAgreementView.test.tsx` - Modified: Added 2 integration tests

## Change Log

| Date       | Change                                  |
| ---------- | --------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev  |
| 2025-12-31 | Implementation complete, all tests pass |
