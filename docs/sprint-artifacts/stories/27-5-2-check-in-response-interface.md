# Story 27.5.2: Check-In Response Interface

Status: done

## Story

As a **parent or child**,
I want **an easy way to respond to health check-ins**,
So that **I can share how I'm feeling without pressure**.

## Acceptance Criteria

1. **AC1: Simple emoji rating scale**
   - Given user receives check-in prompt
   - When opening check-in screen
   - Then simple emoji scale shown: positive, neutral, concerned

2. **AC2: Rating-based follow-up questions**
   - Given user selects a rating
   - When viewing follow-up
   - Then "Things are going well" path asks: "What's working?"
   - And "Things are hard" path asks: "What's been difficult?"

3. **AC3: Optional free-text notes**
   - Given user completes rating and follow-up
   - When viewing response form
   - Then optional free-text field available for additional thoughts

4. **AC4: Skip option**
   - Given user doesn't want to respond
   - When viewing check-in
   - Then "Skip this month" option available

5. **AC5: Quick completion time**
   - Given user responds to check-in
   - When completing the flow
   - Then takes under 2 minutes to complete

## Tasks / Subtasks

- [x] Task 1: Create check-in response page (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 Create `/dashboard/check-in/[checkInId]/page.tsx`
  - [x] 1.2 Display emoji rating scale with visual feedback
  - [x] 1.3 Show follow-up question based on rating selection
  - [x] 1.4 Add optional notes textarea
  - [x] 1.5 Add skip button with confirmation

- [x] Task 2: Create child-friendly check-in page (AC: #1, #2, #3, #4)
  - [x] 2.1 Create `/child/check-in/[checkInId]/page.tsx`
  - [x] 2.2 Use larger emojis and simpler language
  - [x] 2.3 Add age-appropriate follow-up prompts
  - [x] 2.4 Privacy reassurance message

- [x] Task 3: Integrate with pending check-ins list (AC: #1)
  - [x] 3.1 Add check-in prompt banner to dashboard
  - [x] 3.2 Add check-in prompt to child dashboard
  - [x] 3.3 Link to response page from prompt

## Dev Notes

### Emoji Rating Scale

Visual scale with three options:

- 😊 Positive - "Things are going well"
- 😐 Neutral - "It's okay"
- 😟 Concerned - "Things have been hard"

### Follow-Up Questions

**Positive path:**

- "What's working well with the monitoring arrangement?"
- Optional: "Any suggestions for improvement?"

**Neutral path:**

- "Is there anything that could be better?"
- Optional: "Any concerns you'd like to share?"

**Concerned path:**

- "What's been difficult about the monitoring?"
- "Would you like to talk about it with your family?"

### Child-Friendly Language (NFR65)

For children under 13:

- Larger touch targets (60x60px minimum for emojis)
- Simple vocabulary: "good", "okay", "hard"
- Reassurance: "Your answers are private"

### UI Components

```
apps/web/src/
├── app/
│   ├── dashboard/check-in/
│   │   └── [checkInId]/
│   │       └── page.tsx          # Guardian response page
│   └── child/check-in/
│       └── [checkInId]/
│           └── page.tsx          # Child response page
├── components/health/
│   ├── CheckInPromptBanner.tsx   # Dashboard banner
│   └── EmojiRatingScale.tsx      # Reusable rating component
```

### References

- [Source: docs/epics/epic-list.md#story-2752] - Story requirements
- [Source: Story 27.5.1] - Check-in data model and service

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/web/src/app/dashboard/check-in/[checkInId]/page.tsx` - Guardian check-in response page
- `apps/web/src/app/child/check-in/[checkInId]/page.tsx` - Child check-in response page
- `apps/web/src/components/health/CheckInPromptBanner.tsx` - Dashboard check-in banner
- `apps/web/src/components/health/EmojiRatingScale.tsx` - Reusable emoji rating component
- `apps/web/src/components/health/index.ts` - Health components barrel export
- `apps/web/src/hooks/usePendingCheckIns.ts` - Hook for guardian pending check-ins
- `apps/web/src/hooks/useChildPendingCheckIns.ts` - Hook for child pending check-ins

**Modified Files:**

- `apps/web/src/app/dashboard/page.tsx` - Add check-in banner
- `apps/web/src/app/child/dashboard/page.tsx` - Add check-in banner
