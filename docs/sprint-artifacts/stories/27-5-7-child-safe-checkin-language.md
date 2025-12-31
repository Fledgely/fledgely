# Story 27.5.7: Child-Safe Check-In Language

Status: done

## Story

As a **child**,
I want **check-in prompts written for my age**,
So that **I can understand and respond meaningfully**.

## Acceptance Criteria

1. **AC1: 6th-grade reading level**
   - Given child receives check-in prompt
   - When viewing check-in screen
   - Then language meets 6th-grade reading level (NFR65)

2. **AC2: Simple vocabulary**
   - Given child is responding to check-in
   - When reading prompt text
   - Then vocabulary is simple and age-appropriate

3. **AC3: Clear options**
   - Given child views check-in response options
   - When choosing their response
   - Then options are clearly labeled with friendly descriptions

4. **AC4: Encouraging tone**
   - Given child is completing check-in
   - When reading instructions
   - Then tone is encouraging and non-threatening

5. **AC5: Visual aids**
   - Given child views check-in UI
   - When interacting with the interface
   - Then visual aids (emojis/icons) help convey meaning

## Tasks / Subtasks

- [x] Task 1: Audit existing check-in prompts (AC: #1, #2)
  - [x] 1.1 Review all check-in prompt text
  - [x] 1.2 Identify complex vocabulary or long sentences
  - [x] 1.3 Document readability improvements needed

- [x] Task 2: Rewrite prompts for children (AC: #1, #2, #4)
  - [x] 2.1 Create child-specific prompt variants
  - [x] 2.2 Simplify vocabulary to 6th-grade level
  - [x] 2.3 Use encouraging, friendly tone

- [x] Task 3: Enhance response options (AC: #3, #5)
  - [x] 3.1 Add emojis/icons to response options
  - [x] 3.2 Simplify option labels for children
  - [x] 3.3 Add helpful descriptions

- [x] Task 4: Update check-in UI for children (AC: #5)
  - [x] 4.1 Review child check-in page
  - [x] 4.2 Add visual aids and friendlier styling
  - [x] 4.3 Ensure mobile-friendly layout

## Dev Notes

### Reading Level Guidelines (NFR65)

- Maximum 6th-grade reading level (Flesch-Kincaid)
- Short sentences (under 15 words preferred)
- Common words (avoid jargon)
- Active voice
- Concrete examples over abstract concepts

### Current vs Child-Friendly Language Examples

| Current                         | Child-Friendly               |
| ------------------------------- | ---------------------------- |
| "Rate your recent interactions" | "How are things going?"      |
| "Submit your response"          | "All done!"                  |
| "Additional notes (optional)"   | "Want to add anything else?" |

### Visual Aids

Use emojis to reinforce meaning:

- Positive: 😊
- Neutral: 😐
- Concerned: 😟

### References

- [Source: docs/epics/epic-list.md#story-2757] - Story requirements
- [Source: NFR65] - 6th-grade reading level requirement
- [Source: Story 27.5.1] - Base check-in prompts

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Added age-based prompt variants in healthCheckInService (under 10, 10-12, 13+)
- Added helpText field to prompts for additional context
- Enhanced EmojiRatingScale with childDescription for each option
- Added encouraging messages to follow-up questions (positive, neutral, concerned)
- All prompts use simple vocabulary targeting 6th-grade reading level
- Emojis/icons reinforce meaning throughout the UI

### File List

**New Files:**

- `docs/sprint-artifacts/stories/27-5-7-child-safe-checkin-language.md` - Story file

**Modified Files:**

- `apps/functions/src/services/health/healthCheckInService.ts` - Age-based prompt variants
- `apps/web/src/components/health/EmojiRatingScale.tsx` - Child descriptions
- `apps/web/src/app/child/check-in/[checkInId]/page.tsx` - Encouraging messages
