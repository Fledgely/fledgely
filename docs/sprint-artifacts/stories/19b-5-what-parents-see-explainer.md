# Story 19B.5: "What Parents See" Explainer

Status: done

## Story

As a **child**,
I want **a clear explanation of what my parents can access**,
So that **there are no surprises about monitoring**.

## Acceptance Criteria

1. **AC1: Explainer Access**
   - Given child views their dashboard
   - When tapping "What can my parents see?"
   - Then explainer modal/page opens
   - And uses child-friendly entry point

2. **AC2: What Parents CAN See**
   - Given child views explainer
   - When content loads
   - Then list shows what parents can view:
     - Screenshots (pictures of your screen)
     - When screenshots were taken (timestamps)
     - Which apps/websites you used
     - Which device you were using
   - And each item has simple explanation

3. **AC3: What Parents CANNOT See**
   - Given child views explainer
   - When content loads
   - Then list shows what parents cannot see:
     - Content of private messages
     - Passwords you type
     - What you're thinking
   - And reassures child about privacy boundaries

4. **AC4: Age-Appropriate Language**
   - Given child views explainer
   - When any text is displayed
   - Then language is at 6th-grade reading level (NFR65)
   - And uses relatable examples
   - And avoids technical jargon

5. **AC5: Link to Family Agreement**
   - Given child views explainer
   - When agreement link is displayed
   - Then link navigates to family agreement view
   - And child can understand the connection

6. **AC6: "Talk to Your Parents" Prompt**
   - Given child views explainer
   - When child has concerns
   - Then "Talk to your parents" prompt is visible
   - And encourages open family communication
   - And provides conversation starter suggestions

## Tasks / Subtasks

- [x] Task 1: Create Explainer Component (AC: #1, #4)
  - [x] 1.1 Create `WhatParentsSeeExplainer.tsx` component
  - [x] 1.2 Create modal/dialog layout with sky blue theme
  - [x] 1.3 Add close button and title
  - [x] 1.4 Ensure child-friendly language throughout
  - [x] 1.5 Add unit tests for component

- [x] Task 2: Add "What Parents CAN See" Section (AC: #2)
  - [x] 2.1 Create list of visible items with icons
  - [x] 2.2 Add simple explanations for each item
  - [x] 2.3 Use friendly icons/emojis for each category
  - [x] 2.4 Add unit tests for section

- [x] Task 3: Add "What Parents CANNOT See" Section (AC: #3)
  - [x] 3.1 Create list of private items
  - [x] 3.2 Add reassuring explanations
  - [x] 3.3 Use different visual treatment (e.g., muted or locked icons)
  - [x] 3.4 Add unit tests for section

- [x] Task 4: Add Agreement Link (AC: #5)
  - [x] 4.1 Create link to family agreement view
  - [x] 4.2 Style link with child-friendly appearance
  - [x] 4.3 Add navigation handling

- [x] Task 5: Add "Talk to Parents" Prompt (AC: #6)
  - [x] 5.1 Create encouragement section
  - [x] 5.2 Add conversation starter suggestions
  - [x] 5.3 Style section to be inviting, not scary

- [x] Task 6: Integration (AC: #1)
  - [x] 6.1 Connect to ChildActivitySummary help link (component provides onClose prop)
  - [x] 6.2 Add to child dashboard navigation if needed (optional prop onViewAgreement)
  - [x] 6.3 Verify modal opens/closes correctly

## Dev Notes

### Architecture Compliance

This story creates a new explainer component for the child dashboard. Key patterns:

1. **Inline Styles**: Use `React.CSSProperties` objects, not Tailwind classes
2. **Data-TestID**: Add `data-testid` attributes for all testable elements
3. **Child-Friendly Language**: All text at 6th-grade reading level (NFR65)
4. **Sky Blue Theme**: Use sky-500 (#0ea5e9) color palette

### Component Structure

```typescript
interface WhatParentsSeeExplainerProps {
  isOpen: boolean
  onClose: () => void
  onViewAgreement?: () => void
}

// Sections
interface ExplainerItem {
  icon: string
  title: string
  description: string
}

const PARENTS_CAN_SEE: ExplainerItem[] = [
  { icon: '📸', title: 'Screenshots', description: 'Pictures of what was on your screen' },
  { icon: '⏰', title: 'When', description: 'The time each picture was taken' },
  { icon: '🌐', title: 'Websites & Apps', description: 'Which sites and apps you visited' },
  { icon: '💻', title: 'Device', description: 'Which computer or tablet you used' },
]

const PARENTS_CANNOT_SEE: ExplainerItem[] = [
  { icon: '💬', title: 'Message Content', description: 'What your private messages say' },
  { icon: '🔑', title: 'Passwords', description: 'Any passwords you type in' },
  { icon: '💭', title: 'Your Thoughts', description: 'What you're thinking or feeling' },
]
```

### Child-Friendly Copy Examples

**Title**: "What Your Parents Can See"

**Introduction**:
"When you agreed to use this device, you and your parents made a deal. Here's what they can see as part of that deal."

**CAN See Section**: "Your parents CAN see..."

**CANNOT See Section**: "Your parents CANNOT see..."

**Talk to Parents**:
"Have questions or concerns? Talk to your parents! You could say:

- 'I noticed you can see my screenshots. Can we talk about that?'
- 'I want to understand our agreement better.'
- 'Is there a way to have more privacy for [specific thing]?'"

**Agreement Link**:
"Want to see your full agreement? [View My Agreement]"

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
  success: '#22c55e', // green-500 (for "can see")
  muted: '#94a3b8', // slate-400 (for "cannot see")
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/components/child/WhatParentsSeeExplainer.tsx` - Main component
- `apps/web/src/components/child/WhatParentsSeeExplainer.test.tsx` - Tests

### Previous Story Intelligence

From Story 19B-1, 19B-2, 19B-3, 19B-4 implementation:

1. **Pattern Used**: Inline styles with React.CSSProperties (no Tailwind)
2. **Test Pattern**: Vitest with @testing-library/react
3. **Modal Pattern**: See `ChildScreenshotDetail.tsx` for modal implementation
4. **Accessibility**: role="dialog", aria-modal="true", focus trap

### Integration Points

1. **ChildActivitySummary**: The `onHelpClick` prop should open this explainer
2. **Child Dashboard**: May need to add as standalone accessible item
3. **Future**: Could link to Epic 19C agreement view

### Edge Cases

1. **No agreement yet**: Show message that agreement is being set up
2. **Modal keyboard nav**: Escape to close, focus trap
3. **Screen reader**: All text accessible, icons have labels
4. **Scrolling**: Content may need scroll if long

### Accessibility Requirements

- All elements have proper ARIA labels
- Modal has role="dialog" and aria-modal="true"
- Focus trap within modal
- Color contrast meets WCAG AA
- Touch targets minimum 44x44px (NFR49)

### References

- [Source: docs/epics/epic-list.md#Story-19B.5 - "What Parents See" Explainer]
- [Pattern: apps/web/src/components/child/ChildScreenshotDetail.tsx - modal pattern]
- [Pattern: apps/web/src/components/child/ChildActivitySummary.tsx - onHelpClick]
- [Previous: docs/sprint-artifacts/stories/19b-4-activity-summary-for-child.md]
- [Architecture: docs/project_context.md - inline styles, no Tailwind]

---

## Dev Agent Record

### Context Reference

Story created as part of Epic 19B: Child Dashboard - My Screenshots

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required.

### Completion Notes List

1. Created modal component with sky blue theme following existing child dashboard patterns
2. Implemented "CAN see" section with 4 items: Screenshots, When, Websites & Apps, Device
3. Implemented "CANNOT see" section with 3 items: Message Content, Passwords, Your Thoughts
4. Used child-friendly language at 6th-grade reading level throughout
5. Added "Have Questions?" section with conversation starter suggestions
6. Optional `onViewAgreement` prop for agreement link integration
7. Focus trap and keyboard accessibility (Escape to close)
8. Overlay click to close, body scroll prevention
9. 35 unit tests covering all ACs and edge cases

### File List

- `apps/web/src/components/child/WhatParentsSeeExplainer.tsx` - Main explainer modal component
- `apps/web/src/components/child/WhatParentsSeeExplainer.test.tsx` - 35 unit tests

## Change Log

| Date       | Change                                    |
| ---------- | ----------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev    |
| 2025-12-31 | Implementation complete, all ACs verified |
| 2025-12-31 | Code review passed, status → done         |
