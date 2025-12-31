# Story 20.7: App/URL Context Enhancement

Status: done

## Story

As **the classification system**,
I want **to use app name and URL as classification hints**,
So that **accuracy improves beyond image-only analysis**.

## Acceptance Criteria

1. **AC1: App name and URL used as context signals**
   - Given screenshot includes app/URL metadata
   - When AI classifies content
   - Then app name and URL used as context signals

2. **AC2: YouTube URL biases toward Entertainment/Educational**
   - Given screenshot has YouTube URL
   - When AI classifies content
   - Then classification biased toward Entertainment/Educational based on content type

3. **AC3: Google Docs URL biases toward Homework**
   - Given screenshot has Google Docs URL
   - When AI classifies content
   - Then classification biased toward Homework category

4. **AC4: Known gaming apps bias toward Gaming category**
   - Given screenshot from known gaming app
   - When AI classifies content
   - Then classification biased toward Gaming category

5. **AC5: Context hints improve confidence scores**
   - Given URL/app context is provided
   - When classification occurs
   - Then context used to improve confidence in appropriate category

6. **AC6: Image content remains primary factor**
   - Given URL/app context is provided
   - When AI classifies content
   - Then image content still primary classification factor
   - And context is supplementary signal

## Tasks / Subtasks

- [x] Task 1: Implement context hint system (AC: #1, #5, #6)
  - [x] 1.1 Add url and title parameters to buildClassificationPrompt
  - [x] 1.2 Format context hints section in prompt
  - [x] 1.3 Ensure context is supplementary to image analysis

- [x] Task 2: Add edge case guidance for URLs (AC: #2, #3, #4)
  - [x] 2.1 Add YouTube guidance (Educational/Entertainment/Homework)
  - [x] 2.2 Add Discord guidance (Communication/Social Media)
  - [x] 2.3 Add Wikipedia guidance (Homework/Educational)
  - [x] 2.4 Add Coding/School art project guidance

- [x] Task 3: Write tests for context hint functionality (AC: #1-6)
  - [x] 3.1 Test base prompt without context
  - [x] 3.2 Test URL-only context
  - [x] 3.3 Test title-only context
  - [x] 3.4 Test combined URL and title context
  - [x] 3.5 Test edge case guidance presence

## Dev Notes

### Implementation Details

This story was **implemented as part of Stories 20-1, 20-2, and 20-4**. The functionality is fully complete.

**Key Implementation:**

1. **`buildClassificationPrompt(url?, title?)`** in `classificationPrompt.ts`:
   - Accepts optional URL and title parameters
   - Adds "Context hints" section when either is provided
   - Keeps image content as primary factor (context only supplements)

2. **Edge Case Guidance** in the prompt:
   - YouTube: Educational if learning, Entertainment if casual, Homework if assignment
   - Discord: Communication if DM, Social Media if browsing servers
   - Wikipedia: Homework if school project, Educational if general
   - Coding: Educational if learning, Creative if building
   - School art: Homework if assignment, Creative if personal

3. **Integration Point:**
   - `classifyScreenshot.ts` passes URL and title to `buildClassificationPrompt()`
   - Context stored in debug records via `storeClassificationDebug`

### Test Coverage

All tests in `classificationPrompt.test.ts`:

- `buildClassificationPrompt` suite (5 tests):
  - Returns base prompt when no context
  - Includes URL when provided
  - Includes title when provided
  - Includes both when both provided
  - Always includes base prompt

- Edge case guidance tests verify:
  - YouTube, Discord, Wikipedia guidance present

### References

- [Source: apps/functions/src/services/classification/classificationPrompt.ts#buildClassificationPrompt] - Context hint implementation
- [Source: apps/functions/src/services/classification/classificationPrompt.test.ts] - Test coverage
- [Source: docs/epics/epic-list.md#Story 20.7] - Story requirements

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- Story 20-7 functionality was implemented incrementally across Stories 20-1, 20-2, and 20-4
- buildClassificationPrompt accepts url and title parameters, adds context hints section
- Edge case guidance covers YouTube, Discord, Wikipedia, Coding, and School art projects
- All tests pass - 5 tests specifically cover context hint functionality
- Image content remains primary factor as specified in prompt ("use these to help with classification")
