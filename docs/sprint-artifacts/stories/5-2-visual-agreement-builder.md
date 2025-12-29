# Story 5.2: Visual Agreement Builder

Status: complete

## Story

As a **parent and child together**,
I want **to build our agreement using a visual interface**,
So that **my child can understand and participate meaningfully**.

## Acceptance Criteria

1. **AC1: Visual Cards/Blocks Interface**
   - Given a co-creation session is active
   - When parent and child use the agreement builder
   - Then interface uses visual cards/blocks for each agreement term
   - And each term is displayed as a distinct, interactive card

2. **AC2: Drag-and-Drop Reordering**
   - Given terms are displayed as cards
   - When a user drags a card
   - Then cards can be reordered for prioritization
   - And the new order is persisted to the session

3. **AC3: Child-Friendly Explanations**
   - Given a term card is displayed
   - When user views or hovers on a term
   - Then child-friendly explanation tooltip appears (6th-grade reading level)
   - And explanation helps child understand the term

4. **AC4: Party Attribution Visual**
   - Given terms have been added by different parties
   - When viewing the agreement builder
   - Then visual indicators show which terms are parent-suggested vs child-suggested
   - And the attribution is clear and accessible

5. **AC5: Category Color Coding**
   - Given terms belong to different categories
   - When viewing the agreement builder
   - Then color coding distinguishes term categories (time, apps, monitoring, rewards)
   - And colors are accessible (not color-alone)

6. **AC6: Schema Validation**
   - Given terms are being added or modified
   - When changes are made
   - Then builder validates against agreementSchema from @fledgely/contracts
   - And maximum 100 conditions enforced with friendly message (NFR60)

## Tasks / Subtasks

- [x] Task 1: Create Agreement Term Schema (AC: #6)
  - [x] 1.1 Define agreementTermSchema in @fledgely/shared/contracts
  - [x] 1.2 Include fields: id, text, category, party, order, explanation
  - [x] 1.3 Define term category enum (time, apps, monitoring, rewards, general)
  - [x] 1.4 Add 100 term limit validation

- [x] Task 2: Create Term Card Component (AC: #1, #3, #4, #5)
  - [x] 2.1 Create AgreementTermCard component
  - [x] 2.2 Implement category color coding with accessible labels
  - [x] 2.3 Add party attribution badge (parent/child icon)
  - [x] 2.4 Add tooltip with child-friendly explanation
  - [x] 2.5 Ensure 44px touch targets and focus indicators

- [x] Task 3: Implement Drag-and-Drop (AC: #2)
  - [x] 3.1 Integrate @dnd-kit for accessible drag-and-drop
  - [x] 3.2 Create DraggableTermCard wrapper
  - [x] 3.3 Create DroppableTermList container
  - [x] 3.4 Persist order changes to session
  - [x] 3.5 Add keyboard navigation for reordering

- [x] Task 4: Create Agreement Builder Component (AC: #1, #6)
  - [x] 4.1 Create VisualAgreementBuilder main component
  - [x] 4.2 Display terms from session as cards
  - [x] 4.3 Add "Add Term" button with party selection
  - [x] 4.4 Show term count with 100 limit warning
  - [x] 4.5 Integrate with useCoCreationSession hook

- [x] Task 5: Add Term Editor (AC: #1, #3)
  - [x] 5.1 Create AddTermModal for new terms
  - [x] 5.2 Allow selecting term category
  - [x] 5.3 Auto-generate child-friendly explanation (or allow custom)
  - [x] 5.4 Validate term text length and format

- [x] Task 6: Unit Tests (AC: All)
  - [x] 6.1 Test term card rendering with various categories
  - [x] 6.2 Test drag-and-drop reordering
  - [x] 6.3 Test party attribution display
  - [x] 6.4 Test 100 term limit enforcement
  - [x] 6.5 Test accessibility of all components

## Dev Notes

### Technical Requirements

- **Drag-and-Drop:** @dnd-kit/core for accessible reordering
- **Icons:** Use existing lucide-react or create simple SVG icons
- **Colors:** Follow accessible color palette from project

### Previous Story Intelligence

From Story 5.1 completion:

- CoCreationSession hook available for term management
- useSessionTimeout for activity tracking
- Session contribution tracking in place
- Radix UI Dialog patterns for modals

### Category Colors (Accessible)

| Category   | Background | Border     | Icon  |
| ---------- | ---------- | ---------- | ----- |
| time       | blue-50    | blue-200   | Clock |
| apps       | purple-50  | purple-200 | App   |
| monitoring | yellow-50  | yellow-200 | Eye   |
| rewards    | green-50   | green-200  | Star  |
| general    | gray-50    | gray-200   | File  |

### File Structure

```
apps/web/src/components/agreements/
├── VisualAgreementBuilder.tsx    # NEW - Main builder component
├── AgreementTermCard.tsx         # NEW - Individual term card
├── DraggableTermCard.tsx         # NEW - Drag wrapper
├── DroppableTermList.tsx         # NEW - Drop container
├── AddTermModal.tsx              # NEW - Add/edit term modal
└── __tests__/
    ├── VisualAgreementBuilder.test.tsx
    └── AgreementTermCard.test.tsx
```

### Dependencies

- @dnd-kit/core - Accessible drag-and-drop
- @dnd-kit/sortable - Sortable list utilities
- @dnd-kit/utilities - CSS utilities
- Story 5.1 components and hooks

### NFR References

- NFR42: WCAG 2.1 AA compliance
- NFR60: Maximum 100 conditions per agreement
- NFR65: 6th-grade reading level for explanations

## Dev Agent Record

### Context Reference

- Epic: 5 (Basic Agreement Co-Creation)
- Sprint: 2 (Feature Development)
- Story Key: 5-2-visual-agreement-builder
- Depends On: Story 5.1 (Co-Creation Session Initiation)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Added agreementTermSchema and termCategorySchema to contracts
- Added MAX_AGREEMENT_TERMS constant (100) per NFR60
- Created AgreementTermCard component with category color coding and party badges
- Created DraggableTermCard wrapper using @dnd-kit/sortable
- Created DroppableTermList container with keyboard navigation
- Created VisualAgreementBuilder main component with term limit validation
- Created AddTermModal with auto-generate explanation feature
- Integrated VisualAgreementBuilder into CoCreationSession component
- Applied accessibility patterns (44px targets, focus rings, ARIA attributes)
- 785 tests passing including 62 new tests for Story 5.2

### File List

- `packages/shared/src/contracts/index.ts` - Added agreement term schemas
- `apps/web/package.json` - Added @dnd-kit dependencies
- `apps/web/src/components/agreements/AgreementTermCard.tsx` - Term card component
- `apps/web/src/components/agreements/DraggableTermCard.tsx` - Drag wrapper
- `apps/web/src/components/agreements/DroppableTermList.tsx` - Drop container
- `apps/web/src/components/agreements/VisualAgreementBuilder.tsx` - Main builder
- `apps/web/src/components/agreements/AddTermModal.tsx` - Add/edit modal
- `apps/web/src/components/agreements/CoCreationSession.tsx` - Updated integration
- `apps/web/src/components/agreements/__tests__/*.test.tsx` - Component tests

## Change Log

| Date       | Change                                  |
| ---------- | --------------------------------------- |
| 2025-12-28 | Story created                           |
| 2025-12-29 | Story completed - All 6 ACs implemented |
