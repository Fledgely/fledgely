# Story 5.4: Negotiation & Discussion Support

Status: ready-for-dev

## Story

As a **family**,
I want **the system to facilitate discussion about disagreements**,
So that **we can reach consensus on difficult terms**.

## Acceptance Criteria

1. **Given** parent and child have different views on an agreement term **When** a term is marked as "needs discussion" **Then** system provides discussion prompts ("Why is this important to you?")
2. **Given** a term is in discussion status **When** viewing the term **Then** both parties can add notes/comments to the term
3. **Given** a term has a common disagreement pattern **When** viewing discussion options **Then** compromise suggestions appear for common disagreements (e.g., "Try 30 minutes less?")
4. **Given** both parties have discussed a term **When** attempting to resolve **Then** term can be marked "resolved" only when both parties agree
5. **Given** terms are in discussion status **When** viewing final review **Then** unresolved terms are highlighted in final review
6. **Given** unresolved terms exist **When** attempting to proceed to signing **Then** agreement cannot proceed to signing with unresolved terms

## Tasks / Subtasks

- [ ] Task 1: Create Discussion Term Schema Extension (AC: 1, 2, 4)
  - [ ] 1.1: Extend `sessionTermSchema` with `discussionNotes` array in `@fledgely/contracts`
  - [ ] 1.2: Add `discussionNote` schema with contributor, text, timestamp
  - [ ] 1.3: Add `resolutionStatus` field: 'unresolved' | 'parent-agreed' | 'child-agreed' | 'resolved'
  - [ ] 1.4: Add `compromiseAccepted` field for tracking accepted suggestions
  - [ ] 1.5: Write schema validation tests

- [ ] Task 2: Create Discussion Prompt Component (AC: 1)
  - [ ] 2.1: Create `DiscussionPrompt.tsx` with child-friendly prompts
  - [ ] 2.2: Define prompts per term type (screen_time, bedtime, monitoring, etc.)
  - [ ] 2.3: Display prompts when term status is "discussion"
  - [ ] 2.4: Support screen reader announcements (NFR42)
  - [ ] 2.5: Ensure 6th-grade reading level (NFR65)
  - [ ] 2.6: Write component tests

- [ ] Task 3: Create Term Notes Component (AC: 2)
  - [ ] 3.1: Create `TermNotesPanel.tsx` for viewing/adding notes
  - [ ] 3.2: Display notes from both parent and child with attribution
  - [ ] 3.3: Create `AddNoteForm.tsx` with contributor-aware input
  - [ ] 3.4: Record contributions when notes added via `recordContribution`
  - [ ] 3.5: Limit note length (500 chars) with character counter
  - [ ] 3.6: Ensure keyboard accessibility (NFR43)
  - [ ] 3.7: Write component tests

- [ ] Task 4: Create Compromise Suggestion Engine (AC: 3)
  - [ ] 4.1: Create `CompromiseSuggestions.tsx` component
  - [ ] 4.2: Define suggestion rules per term type:
        - screen_time: "Try 30 minutes less" / "Try 15 minutes more"
        - bedtime: "Try 15 minutes earlier" / "Try 15 minutes later"
        - monitoring: "Try a trial period of 2 weeks"
  - [ ] 4.3: Show suggestions only for common disagreement patterns
  - [ ] 4.4: Allow accepting a suggestion (updates term value)
  - [ ] 4.5: Record contribution when suggestion accepted
  - [ ] 4.6: Write suggestion logic tests

- [ ] Task 5: Create Resolution Flow (AC: 4)
  - [ ] 5.1: Create `ResolutionControls.tsx` for marking agreement
  - [ ] 5.2: Show current resolution status (parent agreed / child agreed / both)
  - [ ] 5.3: Create "I agree to this" button for each party
  - [ ] 5.4: Auto-mark "resolved" when both parties agree
  - [ ] 5.5: Show visual confirmation when resolved (checkmark, color change)
  - [ ] 5.6: Prevent resolution button spam (debounce)
  - [ ] 5.7: Write resolution flow tests

- [ ] Task 6: Create Discussion Card UI (AC: 1-4)
  - [ ] 6.1: Create `DiscussionTermCard.tsx` variant of AgreementTermCard
  - [ ] 6.2: Expand to show discussion panel on click/focus
  - [ ] 6.3: Integrate DiscussionPrompt, TermNotesPanel, CompromiseSuggestions
  - [ ] 6.4: Show resolution status badge
  - [ ] 6.5: Apply discussion-specific styling (highlighted border, icon)
  - [ ] 6.6: Ensure mobile-friendly layout (stacked on small screens)
  - [ ] 6.7: Write component tests

- [ ] Task 7: Update Visual Agreement Builder for Discussions (AC: 5)
  - [ ] 7.1: Update `VisualAgreementBuilder.tsx` to use DiscussionTermCard for discussion terms
  - [ ] 7.2: Add "Needs Discussion" section header for unresolved terms
  - [ ] 7.3: Sort discussion terms to top of list
  - [ ] 7.4: Add discussion count indicator (X unresolved)
  - [ ] 7.5: Write integration tests

- [ ] Task 8: Create Signing Gate Logic (AC: 6)
  - [ ] 8.1: Create `useCanProceedToSigning` hook
  - [ ] 8.2: Check all terms with status="discussion" are resolved
  - [ ] 8.3: Return: `canProceed`, `unresolvedCount`, `unresolvedTerms[]`
  - [ ] 8.4: Update session page to disable "Continue to Signing" when blocked
  - [ ] 8.5: Show clear message: "Resolve X terms before signing"
  - [ ] 8.6: Write hook and gating tests

- [ ] Task 9: Accessibility and Polish (AC: 1-6)
  - [ ] 9.1: Ensure keyboard navigation throughout discussion flow (NFR43)
  - [ ] 9.2: Add ARIA labels for all discussion elements (NFR42)
  - [ ] 9.3: Screen reader announcements for status changes
  - [ ] 9.4: Ensure 44x44px touch targets (NFR49)
  - [ ] 9.5: Verify color contrast for discussion highlights (NFR45)
  - [ ] 9.6: Write accessibility tests

## Dev Notes

### Previous Story Intelligence (Stories 5.1, 5.2, 5.3)

**Story 5.1** established co-creation session infrastructure:
```typescript
// packages/contracts/src/co-creation-session.schema.ts
export const sessionTermStatusSchema = z.enum([
  'accepted', 'discussion', 'removed'
])

export const sessionContributorSchema = z.enum(['parent', 'child'])
```

**Story 5.2** created the Visual Agreement Builder:
- `AgreementTermCard.tsx` - Base card component to extend
- `VisualAgreementBuilder.tsx` - Container to update for discussions
- `termUtils.ts` - Category colors and icons
- Drag-and-drop with @dnd-kit

**Story 5.3** added child contribution features:
- `ContributorToggle.tsx` - Switch between parent/child mode
- `ChildFeedbackButton.tsx` - Pattern for multi-option popups
- `EmojiReaction.tsx` - Controlled component pattern
- Escape key handling and click-outside patterns

### Architecture Patterns

**Component Structure:**
```
apps/web/src/components/co-creation/
├── builder/
│   ├── VisualAgreementBuilder.tsx  (UPDATE: Add discussion support)
│   ├── AgreementTermCard.tsx       (REFERENCE: Base card)
│   └── termUtils.ts                (REFERENCE: Colors/icons)
├── discussion/
│   ├── DiscussionTermCard.tsx      (NEW: Discussion variant)
│   ├── DiscussionPrompt.tsx        (NEW: Prompts component)
│   ├── TermNotesPanel.tsx          (NEW: Notes display/input)
│   ├── CompromiseSuggestions.tsx   (NEW: Suggestion engine)
│   ├── ResolutionControls.tsx      (NEW: Agreement buttons)
│   ├── discussionUtils.ts          (NEW: Suggestion rules)
│   └── __tests__/
└── index.ts                        (UPDATE: Export new components)
```

### Schema Extensions

```typescript
// packages/contracts/src/co-creation-session.schema.ts - ADD

export const discussionNoteSchema = z.object({
  id: z.string().uuid(),
  contributor: sessionContributorSchema,
  text: z.string().min(1).max(500),
  createdAt: z.string().datetime(),
})

export const resolutionStatusSchema = z.enum([
  'unresolved',
  'parent-agreed',
  'child-agreed',
  'resolved',
])

// Update sessionTermSchema to include:
// discussionNotes: z.array(discussionNoteSchema).default([])
// resolutionStatus: resolutionStatusSchema.default('unresolved')
// compromiseAccepted: z.string().optional() // ID of accepted suggestion
```

### Discussion Prompts (NFR65: 6th-grade reading level)

| Term Type    | Prompt for Child | Prompt for Parent |
|--------------|------------------|-------------------|
| screen_time  | "Why is this screen time important to you?" | "What concerns do you have about screen time?" |
| bedtime      | "Why do you want to stay up later?" | "Why is this bedtime important for your family?" |
| monitoring   | "How does this make you feel?" | "Why is this level of monitoring needed?" |
| rule         | "What would help you follow this rule?" | "What problem does this rule solve?" |
| consequence  | "Does this feel fair to you?" | "How does this help learning?" |
| reward       | "What would make this reward exciting?" | "What behavior does this encourage?" |

### Compromise Suggestion Rules

```typescript
// apps/web/src/components/co-creation/discussion/discussionUtils.ts

interface CompromiseSuggestion {
  id: string
  text: string
  adjustment: Record<string, unknown>
}

export const COMPROMISE_RULES: Record<TermType, CompromiseSuggestion[]> = {
  screen_time: [
    { id: 'st-less-30', text: 'Try 30 minutes less', adjustment: { minutes: -30 } },
    { id: 'st-more-15', text: 'Try 15 minutes more', adjustment: { minutes: +15 } },
    { id: 'st-weekday-split', text: 'Less on school days, more on weekends', adjustment: { weekdaySplit: true } },
  ],
  bedtime: [
    { id: 'bt-earlier-15', text: 'Try 15 minutes earlier', adjustment: { minutes: -15 } },
    { id: 'bt-later-15', text: 'Try 15 minutes later', adjustment: { minutes: +15 } },
    { id: 'bt-weekend-flex', text: 'Later bedtime on weekends', adjustment: { weekendFlex: true } },
  ],
  monitoring: [
    { id: 'mon-trial', text: 'Try a 2-week trial at lower level', adjustment: { trial: '2weeks' } },
    { id: 'mon-gradual', text: 'Gradually reduce over time', adjustment: { gradual: true } },
  ],
  rule: [],
  consequence: [],
  reward: [],
}
```

### Resolution State Machine

```
unresolved
    ├── parent clicks "I agree" → parent-agreed
    └── child clicks "I agree" → child-agreed

parent-agreed
    └── child clicks "I agree" → resolved

child-agreed
    └── parent clicks "I agree" → resolved

resolved
    └── (final state - term exits discussion)
```

### NFR Compliance Checklist

- [x] NFR42: All discussion UI screen reader accessible
- [x] NFR43: Full keyboard navigation for notes, suggestions, resolution
- [x] NFR45: Discussion highlight colors meet WCAG AA contrast
- [x] NFR49: All buttons/inputs meet 44x44px touch target
- [x] NFR60: 100 terms max still enforced
- [x] NFR65: All prompts at 6th-grade reading level

### Testing Standards

Unit tests for:
- Schema validation (discussion notes, resolution status)
- Suggestion rule logic
- Resolution state transitions

Component tests for:
- DiscussionPrompt rendering per term type
- TermNotesPanel add/display notes
- CompromiseSuggestions display and accept
- ResolutionControls state handling
- DiscussionTermCard expanded state

Integration tests for:
- Full discussion flow from marking → notes → suggestion → resolve
- Signing gate blocking with unresolved terms
- Visual Agreement Builder discussion section

### References

- [Source: docs/epics/epic-list.md#Story-5.4] - Original acceptance criteria
- [Source: docs/sprint-artifacts/stories/5-2-visual-agreement-builder.md] - Builder patterns
- [Source: docs/sprint-artifacts/stories/5-3-child-contribution-capture.md] - Interaction patterns
- [Source: packages/contracts/src/co-creation-session.schema.ts] - Session schemas
- [Source: docs/project_context.md] - Implementation patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

<!-- Debug log references will be added during implementation -->

### Completion Notes List

Ultimate context engine analysis completed - comprehensive developer guide created

### File List

<!-- Created/modified files will be listed after implementation -->
