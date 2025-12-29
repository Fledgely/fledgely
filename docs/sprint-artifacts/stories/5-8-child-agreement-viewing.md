# Story 5.8: Child Agreement Viewing

Status: done

## Story

As a **child**,
I want **to view my active agreement at any time**,
So that **I always know what I agreed to and can reference the rules**.

## Acceptance Criteria

1. **AC1: Full Agreement Display**
   - Given a child has an active agreement
   - When they access their agreement view
   - Then they see the full agreement in child-friendly format
   - And all text is at 6th-grade reading level (NFR65)

2. **AC2: Category Organization**
   - Given an agreement has multiple terms
   - When viewing the agreement
   - Then terms are organized by category with visual icons
   - And categories have clear, friendly labels

3. **AC3: Contribution Highlighting**
   - Given the child contributed terms to the agreement
   - When viewing their agreement
   - Then their own contributions are highlighted
   - And they can see which terms they suggested

4. **AC4: Read-Only View**
   - Given a child is viewing their agreement
   - When they interact with the view
   - Then the view is read-only
   - And changes require a new co-creation session

5. **AC5: Question Support**
   - Given a child has questions about their agreement
   - When they view a term
   - Then they see "I have a question about this" button
   - And clicking sends a message to their parent

6. **AC6: Current Status Display**
   - Given the agreement tracks usage (screen time, etc.)
   - When the child views their agreement
   - Then current status shows (how much used today, etc.)
   - And status updates reflect real-time data

## Tasks / Subtasks

- [x] Task 1: Create Agreement View Component (AC: #1, #4)
  - [x] 1.1 Create ChildAgreementView component shell
  - [x] 1.2 Display agreement title and date signed
  - [x] 1.3 Show full list of terms in readable format
  - [x] 1.4 Ensure read-only (no edit actions)
  - [x] 1.5 Add 6th-grade reading level text

- [x] Task 2: Category Organization (AC: #2)
  - [x] 2.1 Create CategorySection component (integrated into ChildAgreementView)
  - [x] 2.2 Add category icons (screen_time, bedtime, homework, etc.)
  - [x] 2.3 Group terms by category
  - [x] 2.4 Add friendly category labels (e.g., "Screen Time Rules")

- [x] Task 3: Contribution Highlighting (AC: #3)
  - [x] 3.1 Create ContributorBadge component (integrated into TermCard)
  - [x] 3.2 Highlight child-contributed terms with special styling
  - [x] 3.3 Add "My idea" label to child contributions
  - [x] 3.4 Visual distinction between contributor parties

- [x] Task 4: Question Button (AC: #5)
  - [x] 4.1 Create AskQuestionButton component
  - [x] 4.2 Show button on each term
  - [x] 4.3 Handle loading and sent states
  - [x] 4.4 Parent notification callback via prop

- [x] Task 5: Status Display (AC: #6)
  - [x] 5.1 Create StatusSummary component
  - [x] 5.2 Show usage statistics (screen time used/limit)
  - [x] 5.3 Display today's progress indicators with color coding
  - [x] 5.4 Add refresh capability

- [x] Task 6: Unit Tests (AC: All)
  - [x] 6.1 Test ChildAgreementView component (21 tests)
  - [x] 6.2 Test AskQuestionButton component (14 tests)
  - [x] 6.3 Test StatusSummary component (25 tests)

## Dev Notes

### Implementation Summary

#### Components Created

1. **ChildAgreementView.tsx** - Main agreement view
   - Read-only view with category-grouped terms
   - Child-friendly formatting with emojis and clear labels
   - Integration with StatusSummary and AskQuestionButton
   - "My idea" badge for child contributions
   - Empty state handling

2. **AskQuestionButton.tsx** - Question button component
   - Loading, success, and disabled states
   - Child-friendly styling with rounded design
   - 44px+ touch targets for accessibility

3. **StatusSummary.tsx** - Screen time status
   - Progress bar with color coding (green/yellow/orange/red)
   - Time formatting (minutes/hours)
   - Friendly status messages
   - Refresh capability

### Technical Requirements

- **Child-Friendly UI:** Large text, clear icons, simple language
- **Read-Only:** No mutation actions exposed to child view
- **Accessibility:** WCAG 2.1 AA, 44px+ touch targets
- **Reading Level:** NFR65 - 6th grade maximum

### Category Icons

- time: 📺 (Screen Time)
- apps: 🎮 (Apps & Games)
- monitoring: 📋 (Rules)
- rewards: 🌟 (Rewards)
- general: 💡 (Other)

### Component Structure

```
ChildAgreementView
├── Header (title, signed date, greeting)
├── StatusSummary (usage today) - optional
├── CategorySection (grouped terms)
│   ├── TermCard
│   │   ├── ContributorBadge ("My idea")
│   │   ├── TermText + Explanation
│   │   └── AskQuestionButton
│   └── ...more TermCards
└── Footer (help text)
```

### NFR References

- NFR42: WCAG 2.1 AA compliance (met)
- NFR65: 6th-grade reading level for all child-facing text (met)
- NFR47: Screen reader announcements (met with ARIA)

### Accessibility Features

- 44px+ minimum touch targets on all buttons
- Screen reader support with ARIA labels
- Progress bar with proper aria-valuenow/min/max
- Region role with labels for screen readers
- Color + icon status indicators (not color alone)

## Test Results

- 60 new tests added (1380 total passing)
- All lint checks pass (warnings only)
- Build succeeds

## File List

- apps/web/src/components/agreements/ChildAgreementView.tsx (new)
- apps/web/src/components/agreements/AskQuestionButton.tsx (new)
- apps/web/src/components/agreements/StatusSummary.tsx (new)
- apps/web/src/components/agreements/**tests**/ChildAgreementView.test.tsx (new)
- apps/web/src/components/agreements/**tests**/AskQuestionButton.test.tsx (new)
- apps/web/src/components/agreements/**tests**/StatusSummary.test.tsx (new)

## Change Log

| Date       | Change                          |
| ---------- | ------------------------------- |
| 2025-12-29 | Story created                   |
| 2025-12-29 | Implementation complete (AC1-6) |
