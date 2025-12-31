# Story 20.2: Basic Category Taxonomy

Status: done

## Story

As **the classification system**,
I want **a defined set of content categories**,
so that **screenshots are consistently labeled**.

## Acceptance Criteria

1. **AC1: Screenshot assigned to one primary category**
   - Given screenshot is being classified
   - When AI analyzes content
   - Then screenshot assigned to exactly one primary category

2. **AC2: Categories include required labels**
   - Given the category taxonomy
   - When defining categories
   - Then categories include: Homework, Educational, Social Media, Gaming, Entertainment, Communication, Creative, Shopping, News, Other

3. **AC3: Categories are family-friendly labels**
   - Given category names are displayed to parents
   - When choosing terminology
   - Then labels are descriptive and non-judgmental
   - And no category implies wrongdoing or punishment

4. **AC4: Category definitions documented for consistency**
   - Given categories need consistent application
   - When documenting taxonomy
   - Then each category has clear definition with examples
   - And edge cases documented (e.g., YouTube homework video = Educational or Entertainment?)

5. **AC5: Taxonomy is extensible for future categories**
   - Given future needs may require new categories
   - When designing taxonomy structure
   - Then new categories can be added without breaking existing data
   - And schema supports versioning for taxonomy changes

6. **AC6: "Other" used when confidence is low**
   - Given AI cannot confidently classify content
   - When confidence is below threshold for all categories
   - Then screenshot is assigned to "Other" category
   - And low confidence is recorded for parent visibility

## Tasks / Subtasks

- [x] Task 1: Create category definitions documentation (AC: #3, #4)
  - [x] 1.1 Create `packages/shared/src/constants/category-definitions.ts` with detailed category info
  - [x] 1.2 Define each category with name, description, examples, and edge case guidance
  - [x] 1.3 Add JSDoc documentation explaining family-friendly naming rationale
  - [x] 1.4 Export category definitions for use in prompt and UI

- [x] Task 2: Update classification prompt with definitions (AC: #4)
  - [x] 2.1 Update `classificationPrompt.ts` to include detailed category definitions
  - [x] 2.2 Add edge case guidance to prompt for consistent AI classification
  - [x] 2.3 Ensure prompt instructs AI to use "Other" for low-confidence cases

- [x] Task 3: Implement taxonomy extensibility (AC: #5)
  - [x] 3.1 Add `TAXONOMY_VERSION` constant for tracking schema versions
  - [x] 3.2 Add `categoryDefinitionSchema` with required fields for each category
  - [x] 3.3 Document process for adding new categories without breaking changes
  - [x] 3.4 Add `taxonomyVersion` to classification result for migration support

- [x] Task 4: Implement "Other" category fallback logic (AC: #6)
  - [x] 4.1 Add `LOW_CONFIDENCE_THRESHOLD` constant (default: 30)
  - [x] 4.2 Update `geminiClient.ts` to assign "Other" when all category confidence < threshold
  - [x] 4.3 Add `isLowConfidence` boolean flag to classification result
  - [x] 4.4 Write unit tests for low-confidence fallback behavior

- [x] Task 5: Create web UI category display utilities (AC: #3)
  - [x] 5.1 Create `apps/web/src/lib/categories.ts` with category display helpers
  - [x] 5.2 Export `getCategoryDescription()`, `getCategoryExamples()` functions
  - [x] 5.3 Add category color/icon mapping for UI consistency
  - [x] 5.4 Export `formatCategoryForDisplay()` function

- [x] Task 6: Write comprehensive tests (AC: #1-6)
  - [x] 6.1 Test each category is recognized correctly with sample prompts
  - [x] 6.2 Test "Other" assignment for ambiguous/low-confidence content
  - [x] 6.3 Test taxonomy extensibility (add mock category, verify schema accepts it)
  - [x] 6.4 Test category definitions export and schema validation

## Dev Notes

### Previous Story Intelligence (Story 20-1)

Story 20-1 already implemented:

- `CATEGORY_VALUES` array with all 10 categories in `@fledgely/shared`
- `categorySchema` Zod enum for validation
- `classificationResultSchema` with `primaryCategory` field
- Basic classification prompt in `classificationPrompt.ts`
- Gemini client that returns `primaryCategory` and `confidence`

**What Story 20-2 adds:**

- Detailed category definitions with examples and edge cases
- Taxonomy versioning for extensibility
- Low-confidence "Other" fallback mechanism
- Web UI display utilities
- Comprehensive documentation

### Category Definitions (to implement)

| Category      | Description                                       | Examples                                    | Edge Cases                          |
| ------------- | ------------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| Homework      | Academic assignments and school-related work      | Math problems, essay writing, school portal | Khan Academy studying = Educational |
| Educational   | Learning content not tied to specific assignments | Wikipedia, documentaries, Duolingo          | YouTube tutorial = depends on topic |
| Social Media  | Social networking and content sharing platforms   | Instagram, TikTok, Reddit, Discord          | Reddit research = Educational?      |
| Gaming        | Video games and game-related content              | Roblox, Minecraft, Steam, Twitch streams    | Game coding tutorial = Creative     |
| Entertainment | Passive entertainment consumption                 | Netflix, YouTube videos, music streaming    | Educational YouTube = Educational   |
| Communication | Direct messaging and video calls                  | Gmail, Messages, Zoom, FaceTime             | Discord DM = Communication          |
| Creative      | Content creation and artistic tools               | Drawing apps, music creation, video editing | School art project = Homework       |
| Shopping      | E-commerce and product browsing                   | Amazon, eBay, online stores                 | Research for school = Educational   |
| News          | Current events and journalism                     | CNN, BBC, news apps                         | Opinion blogs = Entertainment       |
| Other         | Content that doesn't fit above or low confidence  | Unknown apps, ambiguous screens             | Default fallback                    |

### Implementation Files

**New Files:**

```
packages/shared/src/constants/category-definitions.ts  # Category metadata
apps/web/src/lib/categories.ts                         # UI display utilities
```

**Modified Files:**

```
packages/shared/src/contracts/index.ts                  # Add taxonomy version, isLowConfidence
packages/shared/src/index.ts                            # Export category definitions
apps/functions/src/services/classification/classificationPrompt.ts  # Enhanced definitions
apps/functions/src/services/classification/geminiClient.ts           # Low-confidence fallback
```

### Project Structure Notes

- Category definitions in `@fledgely/shared` for reuse across web and functions
- Web UI utilities in `apps/web/src/lib/` following existing pattern
- Follows existing naming conventions (camelCase functions, PascalCase types)
- Tests co-located with source files (`*.test.ts`)

### References

- [Source: packages/shared/src/contracts/index.ts#CATEGORY_VALUES] - Existing category values
- [Source: apps/functions/src/services/classification/classificationPrompt.ts] - Current prompt
- [Source: docs/epics/epic-list.md#Story 20.2] - Story requirements
- [Source: docs/sprint-artifacts/stories/20-1-classification-service-architecture.md] - Previous story

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Senior Developer Review (AI)

**Review Date:** 2025-12-30
**Reviewer:** Adversarial Code Review Workflow

**Issues Found and Fixed:**

1. ✅ **MEDIUM** classificationPrompt.test.ts missing Story 20.2 header and LOW_CONFIDENCE_THRESHOLD tests → ADDED
2. ✅ **MEDIUM** category-definitions.test.ts missing format validation tests → ADDED tests for example limiting and format pattern
3. ✅ **LOW** classificationPrompt.test.ts header only mentioned Story 20.1 → UPDATED to include Story 20.2

**Tests Added:**

- classificationPrompt.test.ts: 3 new tests (low confidence threshold, edge case guidance, examples)
- category-definitions.test.ts: 2 new tests (example limiting, format validation)

**Build Status:** ✅ Passing
**Test Status:** ✅ 82 shared tests, 12 classification prompt tests

### Completion Notes List

- Implemented comprehensive category definitions with TAXONOMY_VERSION for extensibility
- Added LOW_CONFIDENCE_THRESHOLD (30%) for "Other" category fallback
- Enhanced classification prompt with detailed definitions and edge case guidance
- Created web UI utilities with color/icon mapping for all 10 categories
- Added isLowConfidence and taxonomyVersion fields to classification result schema
- Updated geminiClient.ts with low-confidence fallback logic
- All tests pass: 403 shared tests, 1085 functions tests, 42 web tests

### File List

**New Files Created:**

- `packages/shared/src/constants/category-definitions.ts` - Category definitions with TAXONOMY_VERSION, LOW_CONFIDENCE_THRESHOLD
- `packages/shared/src/constants/category-definitions.test.ts` - 80 tests for category definitions
- `apps/web/src/lib/categories.ts` - Web UI category display utilities
- `apps/web/src/lib/categories.test.ts` - 24 tests for web category utilities

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added isLowConfidence, taxonomyVersion to classificationResultSchema
- `packages/shared/src/index.ts` - Added category definitions exports
- `apps/functions/src/services/classification/classificationPrompt.ts` - Enhanced with detailed definitions
- `apps/functions/src/services/classification/geminiClient.ts` - Added low-confidence fallback logic
- `apps/functions/src/services/classification/geminiClient.test.ts` - Added low-confidence tests
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Store isLowConfidence/taxonomyVersion
