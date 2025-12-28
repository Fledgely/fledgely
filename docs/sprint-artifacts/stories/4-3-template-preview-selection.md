# Story 4.3: Template Preview & Selection

Status: completed

## Story

As a **parent**,
I want **to preview a template before using it**,
So that **I can ensure it fits our family's values before showing it to my child**.

## Acceptance Criteria

1. **AC1: Full Template Preview**
   - Given a parent browses the template library
   - When they click on a template card
   - Then full template preview displays in a modal/drawer
   - And preview shows all sections: screen time, monitoring, key rules
   - And preview closes on Escape key or clicking outside

2. **AC2: Customizable Items Highlight**
   - Given a parent views a template preview
   - When reviewing template sections
   - Then preview highlights which items can be customized
   - And customizable items are visually distinct (badge/icon)

3. **AC3: Use This Template Action**
   - Given a parent reviews a template preview
   - When they click "Use This Template" button
   - Then template selection is confirmed
   - And parent is prepared for agreement co-creation flow (Epic 5)
   - And selected template is stored for the session

4. **AC4: Compare Templates**
   - Given a parent wants to compare options
   - When they select "Compare Templates" on multiple cards
   - Then side-by-side view shows 2-3 templates
   - And key differences are highlighted
   - And comparison is dismissible

5. **AC5: Screen Reader Accessibility**
   - Given a parent uses assistive technology
   - When viewing template preview
   - Then preview has proper heading structure
   - And modal traps focus appropriately
   - And screen reader announces modal content

6. **AC6: Keyboard Navigation**
   - Given a parent uses keyboard only
   - When navigating the preview
   - Then all interactive elements are focusable
   - And focus order is logical
   - And touch targets are 44px minimum (NFR49)

## Tasks / Subtasks

- [x] Task 1: Create TemplatePreviewModal Component (AC: #1, #5, #6)
  - [x] 1.1 Create apps/web/src/components/templates/TemplatePreviewModal.tsx
  - [x] 1.2 Display template name, description, age group, variation
  - [x] 1.3 Show screen time limits section with formatted times
  - [x] 1.4 Show monitoring level with explanation
  - [x] 1.5 Show all key rules with age-appropriate formatting (use TemplateRules)
  - [x] 1.6 For 5-7: Show simpleRules if available
  - [x] 1.7 For 14-16: Show autonomyMilestones if available
  - [x] 1.8 Add modal overlay with proper z-index
  - [x] 1.9 Implement focus trap within modal (via Radix Dialog)
  - [x] 1.10 Close on Escape key and overlay click
  - [x] 1.11 Ensure proper heading hierarchy (h2 for title, h3 for sections)
  - [x] 1.12 Create component tests (26 tests)

- [x] Task 2: Add Customizable Items Indicators (AC: #2)
  - [x] 2.1 Define which template fields are customizable
  - [x] 2.2 Add "Customizable" badge/icon to editable fields
  - [x] 2.3 Use distinct visual styling (pencil icon, blue badge)
  - [x] 2.4 Add aria-label for screen readers ("This field can be customized")
  - [x] 2.5 Create unit tests for customizable indicators

- [x] Task 3: Create Template Selection Logic (AC: #3)
  - [x] 3.1 Create useTemplateSelection hook for selection state
  - [x] 3.2 Add "Use This Template" button with primary styling
  - [x] 3.3 Store selected template in session/context for Epic 5
  - [x] 3.4 Show confirmation state after selection
  - [x] 3.5 Add ability to change selection before proceeding
  - [x] 3.6 Create unit tests for selection logic

- [x] Task 4: Create TemplateComparison Component (AC: #4)
  - [x] 4.1 Create apps/web/src/components/templates/TemplateComparison.tsx
  - [x] 4.2 Support 2-3 template comparison (reject if more than 3)
  - [x] 4.3 Show templates in side-by-side columns
  - [x] 4.4 Highlight differences in values (screen time, monitoring, etc.)
  - [x] 4.5 Show difference indicators for key rules
  - [x] 4.6 Add close/dismiss functionality
  - [x] 4.7 Responsive design (stack on mobile via overflow-x-auto)
  - [x] 4.8 Create component tests (26 tests)

- [x] Task 5: Add Compare Toggle to TemplateCard (AC: #4)
  - [x] 5.1 Add "Compare" checkbox/toggle to TemplateCard
  - [x] 5.2 Track selected templates for comparison (max 3)
  - [x] 5.3 Show "Compare Selected" button when 2+ selected
  - [x] 5.4 Disable additional selection when 3 are selected
  - [x] 5.5 Update TemplateLibrary to manage comparison state
  - [x] 5.6 Update existing tests for new functionality (12 new tests)

- [x] Task 6: Integrate Preview into TemplateLibrary (AC: #1, #3)
  - [x] 6.1 Update TemplateCard to open preview on click
  - [x] 6.2 Add preview modal state management to TemplateLibrary
  - [x] 6.3 Pass onSelect and onCompare callbacks to cards
  - [x] 6.4 Handle preview open/close transitions
  - [x] 6.5 Update page integration

- [x] Task 7: Unit Tests for All Components (AC: All)
  - [x] 7.1 Test TemplatePreviewModal rendering and content (26 tests)
  - [x] 7.2 Test modal accessibility (focus trap, escape key)
  - [x] 7.3 Test customizable indicators display
  - [x] 7.4 Test template selection flow
  - [x] 7.5 Test comparison mode functionality (26 tests)
  - [x] 7.6 Test keyboard navigation throughout

## Dev Notes

### Technical Requirements

- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **UI Framework:** shadcn/ui + Radix + Tailwind (per project_context.md)
- **State Management:** React hooks + TanStack Query (already installed)

### Modal Implementation Pattern

Use Radix Dialog for accessible modal:

```typescript
// apps/web/src/components/templates/TemplatePreviewModal.tsx
import * as Dialog from '@radix-ui/react-dialog'

interface TemplatePreviewModalProps {
  template: AgreementTemplate | null
  isOpen: boolean
  onClose: () => void
  onSelect: (template: AgreementTemplate) => void
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onSelect,
}: TemplatePreviewModalProps) {
  if (!template) return null

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold">
            {template.name}
          </Dialog.Title>
          {/* Content sections */}
          <button onClick={() => onSelect(template)}>Use This Template</button>
          <Dialog.Close asChild>
            <button aria-label="Close">×</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

### Comparison Layout Pattern

```typescript
// apps/web/src/components/templates/TemplateComparison.tsx
interface TemplateComparisonProps {
  templates: AgreementTemplate[]
  onClose: () => void
  onSelect: (template: AgreementTemplate) => void
}

export function TemplateComparison({ templates, onClose, onSelect }: TemplateComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <div key={template.id} className="border rounded-lg p-4">
          {/* Template details with difference highlighting */}
        </div>
      ))}
    </div>
  )
}
```

### Customizable Fields

The following template fields can be customized in Epic 5:

- screenTimeLimits.weekday
- screenTimeLimits.weekend
- monitoringLevel
- keyRules (add/remove/edit)

### Template Selection Hook Pattern

```typescript
// apps/web/src/hooks/useTemplateSelection.ts
import { create } from 'zustand'

interface TemplateSelectionState {
  selectedTemplate: AgreementTemplate | null
  selectTemplate: (template: AgreementTemplate) => void
  clearSelection: () => void
}

export const useTemplateSelection = create<TemplateSelectionState>((set) => ({
  selectedTemplate: null,
  selectTemplate: (template) => set({ selectedTemplate: template }),
  clearSelection: () => set({ selectedTemplate: null }),
}))
```

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - use existing AgreementTemplate type
- Components in `components/templates/` folder
- Tests co-located with components

### Previous Story Intelligence

From Story 4.1 & 4.2:

- TemplateCard component already exists with selection callback
- TemplateRules component can be reused for rule display
- AGE_GROUP_LABELS, VARIATION_LABELS, MONITORING_LEVEL_LABELS available
- 11 templates with age-appropriate content available

### Library/Framework Requirements

| Dependency             | Version | Purpose                                    |
| ---------------------- | ------- | ------------------------------------------ |
| @radix-ui/react-dialog | ^1.x    | Accessible modal component                 |
| zustand                | ^4.x    | Lightweight state for selection (optional) |

### File Structure Requirements

```
apps/web/src/
├── hooks/
│   └── useTemplateSelection.ts    # NEW - Template selection state
├── components/
│   └── templates/
│       ├── TemplatePreviewModal.tsx       # NEW - Preview modal
│       ├── TemplatePreviewModal.test.tsx  # NEW - Modal tests
│       ├── TemplateComparison.tsx         # NEW - Comparison view
│       ├── TemplateComparison.test.tsx    # NEW - Comparison tests
│       ├── TemplateCard.tsx               # UPDATE - Add compare toggle
│       ├── TemplateCard.test.tsx          # UPDATE - New tests
│       ├── TemplateLibrary.tsx            # UPDATE - Integration
│       └── TemplateLibrary.test.tsx       # UPDATE - New tests
│       └── index.ts                       # UPDATE - New exports
```

### Testing Requirements

- Unit test modal open/close and content display
- Unit test focus trap and keyboard handling
- Unit test customizable field indicators
- Unit test template selection state
- Unit test comparison mode (2-3 templates)
- Unit test difference highlighting
- Component tests for accessibility

### NFR References

- NFR43: Keyboard navigable
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Focus indicators visible
- NFR49: 44x44px minimum touch target
- NFR65: 6th-grade reading level (already handled in Story 4.2)

### References

- [Source: docs/epics/epic-list.md#Story-4.3]
- [Source: docs/epics/epic-list.md#Epic-4]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/sprint-artifacts/stories/4-1-template-library-structure.md]
- [Source: docs/sprint-artifacts/stories/4-2-age-appropriate-template-content.md]

## Dev Agent Record

### Context Reference

- Epic: 4 (Agreement Templates & Quick Start)
- Sprint: 2 (Feature Development)
- Story Key: 4-3-template-preview-selection
- Depends On: Story 4.1 (Template Library), Story 4.2 (Age Content)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

- Implemented TemplatePreviewModal with Radix Dialog for accessibility
- Added CustomizableBadge component with pencil icon for editable fields
- Created useTemplateSelection hook (simplified from Context to pure hooks to avoid JSX in .ts file)
- Created useTemplateComparison hook for managing 2-3 template comparison
- Implemented TemplateComparison with difference indicators (orange dots)
- Added compare toggle button to TemplateCard with 44px touch target
- Updated TemplateLibrary with preview modal and comparison mode integration
- Clicking template card now opens preview modal; "Use This Template" confirms selection
- All 154 template component tests pass (26 for TemplatePreviewModal, 26 for TemplateComparison, 48 for TemplateCard, 31 for TemplateLibrary, 23 for TemplateRules)
- Total project tests: 391 passing

### File List

**New Files:**

- apps/web/src/components/templates/TemplatePreviewModal.tsx
- apps/web/src/components/templates/TemplatePreviewModal.test.tsx
- apps/web/src/components/templates/TemplateComparison.tsx
- apps/web/src/components/templates/TemplateComparison.test.tsx
- apps/web/src/hooks/useTemplateSelection.ts

**Modified Files:**

- apps/web/src/components/templates/TemplateCard.tsx (added compare toggle)
- apps/web/src/components/templates/TemplateCard.test.tsx (12 new tests)
- apps/web/src/components/templates/TemplateLibrary.tsx (preview modal + comparison integration)
- apps/web/src/components/templates/TemplateLibrary.test.tsx (updated selection tests)
- apps/web/src/components/templates/index.ts (new exports)

## Change Log

| Date       | Change                                    |
| ---------- | ----------------------------------------- |
| 2025-12-28 | Story created (ready-for-dev)             |
| 2025-12-28 | Implementation completed - all tasks done |
