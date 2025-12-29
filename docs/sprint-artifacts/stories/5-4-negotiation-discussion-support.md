# Story 5.4: Negotiation & Discussion Support

Status: done

## Story

As a **family**,
I want **the system to facilitate discussion about disagreements**,
So that **we can reach consensus on difficult terms**.

## Acceptance Criteria

1. **AC1: Needs Discussion Marking**
   - Given parent and child have different views on an agreement term
   - When a term is marked as "needs discussion"
   - Then system provides discussion prompts ("Why is this important to you?")
   - And both parties can see the term is flagged for discussion

2. **AC2: Compromise Suggestions**
   - Given a term is under discussion
   - When viewing the term
   - Then system suggests compromise options where applicable
   - And suggestions are age-appropriate and practical

3. **AC3: Discussion Notes**
   - Given a term needs discussion
   - When parent or child adds a note
   - Then notes are saved with attribution and timestamp
   - And both parties can read each other's perspectives

4. **AC4: Discussion Resolution**
   - Given a term has been discussed
   - When family reaches agreement
   - Then term can be marked as "resolved"
   - And resolution is recorded in the agreement history

5. **AC5: Discussion Progress Indicator**
   - Given multiple terms need discussion
   - When viewing the agreement builder
   - Then progress indicator shows resolved vs. pending discussions
   - And family can see remaining work at a glance

6. **AC6: Child-Friendly Discussion Prompts**
   - Given the child is viewing discussion prompts
   - When system displays prompts
   - Then prompts use 6th-grade reading level language (NFR65)
   - And prompts encourage honest expression, not manipulation

## Tasks / Subtasks

- [x] Task 1: Add Discussion Status to Terms (AC: #1)
  - [x] 1.1 Add discussionStatus field to agreementTermSchema (none, needs_discussion, resolved)
  - [x] 1.2 Add discussionNotes array field to agreementTermSchema
  - [x] 1.3 Create DiscussionNote type (id, party, content, createdAt)
  - [x] 1.4 Created agreementTermWithDiscussionSchema extending base term

- [x] Task 2: Create Discussion Prompt System (AC: #1, #6)
  - [x] 2.1 Define age-appropriate discussion prompts array
  - [x] 2.2 Create DiscussionPromptCard component
  - [x] 2.3 Display prompts when term is marked for discussion
  - [x] 2.4 Ensure prompts meet NFR65 (6th-grade reading level)

- [x] Task 3: Implement Compromise Suggestions (AC: #2)
  - [x] 3.1 Create CompromiseSuggestion type and suggestions by category
  - [x] 3.2 Create CompromiseSuggestionCard component
  - [x] 3.3 Expandable suggestion details with descriptions
  - [x] 3.4 Allow selecting a suggested compromise to apply

- [x] Task 4: Create Discussion Notes Interface (AC: #3)
  - [x] 4.1 Create DiscussionNotesPanel component
  - [x] 4.2 Add note input form with 500 character limit
  - [x] 4.3 Display notes chronologically with party attribution
  - [x] 4.4 Pink styling for child notes, blue for parent

- [x] Task 5: Implement Discussion Resolution (AC: #4)
  - [x] 5.1 Add "Mark as Resolved" button to DiscussionNotesPanel
  - [x] 5.2 Created discussionResolutionSchema for tracking resolution
  - [x] 5.3 Resolution changes discussionStatus to "resolved"
  - [x] 5.4 Show celebration message when resolved

- [x] Task 6: Create Discussion Progress Indicator (AC: #5)
  - [x] 6.1 Create DiscussionProgressBar component
  - [x] 6.2 Calculate pending vs resolved discussion counts
  - [x] 6.3 Visual progress bar with percentage
  - [x] 6.4 Show encouraging messages based on progress

- [x] Task 7: Unit Tests (AC: All)
  - [x] 7.1 DiscussionPromptCard tests (16 tests)
  - [x] 7.2 CompromiseSuggestionCard tests (18 tests)
  - [x] 7.3 DiscussionNotesPanel tests (25 tests)
  - [x] 7.4 DiscussionProgressBar tests (20 tests)

## Dev Notes

### Technical Requirements

- **Zod Schemas:** Extend agreementTermSchema with discussionStatus and discussionNotes
- **State Management:** Discussion state stored in terms array
- **UI Components:** Follow existing patterns from Story 5.3 (pink for child, blue for parent)

### Previous Story Intelligence

From Story 5.3 completion:

- TermReactionBar handles reactions (agree, question, discuss)
- DeletionProtectionModal pattern for explanatory modals
- VisualAgreementBuilder manages terms with reactions
- "Discuss" reaction type exists - connect to new discussion system

Key learning: When child marks term with "discuss" reaction, this should trigger the discussion flow.

### Discussion Prompts (6th-Grade Level)

| Category   | Prompt                                                    |
| ---------- | --------------------------------------------------------- |
| Time       | "How much screen time feels fair to you? Why?"            |
| Apps       | "What apps are most important to you? Why?"               |
| Monitoring | "How do you feel about having this rule?"                 |
| Rewards    | "What reward would make you excited to follow the rules?" |
| General    | "Tell me more about what you think."                      |

### Compromise Suggestion Examples

| Original                     | Compromise Options                                                 |
| ---------------------------- | ------------------------------------------------------------------ |
| "No games on weekdays"       | "Games for 30 min after homework", "Games on Friday only"          |
| "Phone in kitchen at 8pm"    | "Phone in kitchen at 9pm", "Phone in room but no games after 8pm"  |
| "Parent checks all messages" | "Weekly check-ins together", "Trust trial - no checks for 2 weeks" |

### File Structure

```
apps/web/src/components/agreements/
├── DiscussionPromptCard.tsx      # NEW - Shows discussion prompts
├── CompromiseSuggestionCard.tsx  # NEW - Suggests compromises
├── DiscussionNotesPanel.tsx      # NEW - Notes interface
├── DiscussionProgressBar.tsx     # NEW - Progress indicator
└── __tests__/
    ├── DiscussionPromptCard.test.tsx
    ├── CompromiseSuggestionCard.test.tsx
    ├── DiscussionNotesPanel.test.tsx
    └── DiscussionProgressBar.test.tsx
```

### Schema Updates

```typescript
// Add to packages/shared/src/contracts/index.ts

export const discussionStatusSchema = z.enum(['none', 'needs_discussion', 'resolved'])
export type DiscussionStatus = z.infer<typeof discussionStatusSchema>

export const discussionNoteSchema = z.object({
  id: z.string(),
  party: contributionPartySchema,
  content: z.string().max(500),
  createdAt: z.date(),
})
export type DiscussionNote = z.infer<typeof discussionNoteSchema>

// Update agreementTermSchema to include:
// discussionStatus: discussionStatusSchema.default('none')
// discussionNotes: z.array(discussionNoteSchema).default([])
```

### Integration with Story 5.3

When a child clicks the "discuss" reaction (💬):

1. Term's discussionStatus changes to "needs_discussion"
2. DiscussionPromptCard appears
3. DiscussionNotesPanel becomes available
4. CompromiseSuggestionCard shows relevant options

### Dependencies

- Story 5.3 components (TermReactionBar with "discuss" reaction)
- Story 5.2 components (VisualAgreementBuilder, AgreementTermCard)
- Zod schemas from @fledgely/shared/contracts

### NFR References

- NFR65: 6th-grade reading level for all prompts and suggestions
- NFR42: WCAG 2.1 AA compliance for new components
- NFR60: Discussion data included in 100 term limit consideration

## Change Log

| Date       | Change        |
| ---------- | ------------- |
| 2025-12-29 | Story created |
