# Story 5.3: Child Contribution Capture

Status: complete

## Story

As a **child**,
I want **to suggest my own terms and modifications**,
So that **the agreement reflects my voice, not just my parent's rules**.

## Acceptance Criteria

1. **AC1: Simplified Child Input Form**
   - Given a co-creation session is active
   - When child wants to add a term
   - Then child can propose new terms using simplified input form
   - And form uses child-friendly language and larger UI elements

2. **AC2: Term Reactions**
   - Given parent terms are displayed
   - When child views a parent term
   - Then child can mark terms they agree with, question, or want to discuss
   - And reactions are visually indicated on the term card

3. **AC3: Visually Distinct Child Suggestions**
   - Given child has added terms
   - When viewing the agreement builder
   - Then child suggestions are visually distinct (different color/icon)
   - And child contributions are clearly attributed

4. **AC4: Voice Input & Emoji Reactions**
   - Given child is using the agreement builder
   - When typing is difficult for the child
   - Then child can use voice input for term text (Web Speech API)
   - And child can use emoji reactions for quick feedback

5. **AC5: Contribution Attribution**
   - Given child makes contributions
   - When contributions are saved
   - Then all child contributions are attributed to them in agreement history
   - And attribution is persisted to the session document

6. **AC6: Parent Cannot Delete Child Contributions**
   - Given child has added a term
   - When parent attempts to delete it
   - Then system prevents deletion with explanation
   - And parent can only negotiate changes (mark for discussion)

## Tasks / Subtasks

- [x] Task 1: Create Child Reaction System (AC: #2, #4)
  - [x] 1.1 Define reaction types (agree, question, discuss, emoji)
  - [x] 1.2 Add reactions field to agreementTermSchema
  - [x] 1.3 Create TermReactionBar component with reaction buttons
  - [x] 1.4 Add emoji picker for expressive reactions
  - [x] 1.5 Update AgreementTermCard to display reactions

- [x] Task 2: Create Simplified Child Input (AC: #1, #3)
  - [x] 2.1 Create ChildTermInput component (larger touch targets, simpler form)
  - [x] 2.2 Use child-friendly placeholder text and labels
  - [x] 2.3 Apply distinct child styling (pink theme)
  - [x] 2.4 Integrate with AddTermModal or create child-specific modal

- [x] Task 3: Implement Voice Input (AC: #4)
  - [x] 3.1 Create useVoiceInput hook (Web Speech API)
  - [x] 3.2 Add voice button to child input form
  - [x] 3.3 Show visual feedback during listening
  - [x] 3.4 Handle browser compatibility gracefully

- [x] Task 4: Update Contribution Attribution (AC: #5)
  - [x] 4.1 Ensure all child contributions have party='child'
  - [x] 4.2 Add contribution type tracking in session
  - [x] 4.3 Update contribution history display

- [x] Task 5: Implement Deletion Protection (AC: #6)
  - [x] 5.1 Add canDelete check based on term party
  - [x] 5.2 Show explanation modal when parent tries to delete child term
  - [x] 5.3 Offer "Mark for Discussion" as alternative action
  - [x] 5.4 Add child deletion protection to VisualAgreementBuilder

- [x] Task 6: Unit Tests (AC: All)
  - [x] 6.1 Test reaction system rendering and interactions
  - [x] 6.2 Test child input form accessibility
  - [x] 6.3 Test voice input hook behavior
  - [x] 6.4 Test deletion protection logic
  - [x] 6.5 Test contribution attribution

## Dev Notes

### Technical Requirements

- **Voice Input:** Web Speech API (SpeechRecognition)
- **Emoji Picker:** Use native emoji selector or simple preset array
- **Reactions:** Store on term, display counts/icons

### Previous Story Intelligence

From Story 5.2 completion:

- AgreementTermCard component can be extended with reactions
- AddTermModal exists for term creation
- VisualAgreementBuilder handles term management
- Party attribution already in place (parent/child)

### Reaction Types

| Reaction | Icon | Description                        |
| -------- | ---- | ---------------------------------- |
| agree    | ✓    | Child agrees with this term        |
| question | ?    | Child has questions about this     |
| discuss  | 💬   | Child wants to discuss this term   |
| emoji    | 🙂   | Expressive reaction (configurable) |

### Child UI Styling

- Larger touch targets (minimum 48px for children)
- Pink/coral color scheme for child elements
- Simple iconography with text labels
- Large readable fonts

### File Structure

```
apps/web/src/components/agreements/
├── TermReactionBar.tsx           # NEW - Reaction buttons
├── ChildTermInput.tsx            # NEW - Simplified child form
├── DeletionProtectionModal.tsx   # NEW - Explains why can't delete
├── EmojiPicker.tsx               # NEW - Simple emoji selector
└── __tests__/
    ├── TermReactionBar.test.tsx
    └── ChildTermInput.test.tsx

apps/web/src/hooks/
├── useVoiceInput.ts              # NEW - Web Speech API hook
└── __tests__/
    └── useVoiceInput.test.ts
```

### Dependencies

- Story 5.2 components (AgreementTermCard, VisualAgreementBuilder)
- Web Speech API (browser native, no library needed)

### NFR References

- NFR42: WCAG 2.1 AA compliance (larger targets for children)
- NFR65: 6th-grade reading level for instructions

## Change Log

| Date       | Change        |
| ---------- | ------------- |
| 2025-12-29 | Story created |
