# Story 28.1: AI Description Generation

Status: done

## Story

As **the system**,
I want **to generate text descriptions of screenshots using AI**,
So that **blind or visually impaired parents can understand content**.

## Acceptance Criteria

1. **AC1: AI generates natural language descriptions**
   - Given screenshot is captured and stored
   - When processing for accessibility
   - Then AI generates natural language description of screenshot content

2. **AC2: Description covers key content**
   - Given description is generated
   - When analyzing screenshot
   - Then description covers: visible apps, text content, images, context

3. **AC3: Description length requirements**
   - Given description is generated
   - When measuring length
   - Then description is 100-300 words (concise but comprehensive)

4. **AC4: Asynchronous processing**
   - Given screenshot is captured
   - When queuing for description generation
   - Then generation happens asynchronously after capture

5. **AC5: Description storage**
   - Given description is generated
   - When storing result
   - Then description stored with screenshot metadata

6. **AC6: Processing time limit**
   - Given description generation starts
   - When processing
   - Then processing completes within 60 seconds (NFR47)

## Tasks / Subtasks

- [x] Task 1: Create description schema and types (AC: #3, #5)
  - [x] 1.1 Add `ScreenshotDescription` schema to shared contracts
  - [x] 1.2 ~~Add description fields to ClassificationResult schema~~ (implemented as separate schema)
  - [x] 1.3 Define description status enum (pending, processing, completed, failed)
  - [x] 1.4 Export new types from shared package

- [x] Task 2: Create description generation prompt (AC: #1, #2, #3)
  - [x] 2.1 Create `descriptionPrompt.ts` in classification service
  - [x] 2.2 Design prompt for comprehensive yet concise descriptions
  - [x] 2.3 Include instructions for app identification, text OCR, context
  - [x] 2.4 Add word count guidance (100-300 words)

- [x] Task 3: Add description generation to GeminiClient (AC: #1, #2, #6)
  - [x] 3.1 Add `generateDescription` method to GeminiClient
  - [x] 3.2 Use same timeout pattern as classification (60 seconds)
  - [x] 3.3 Parse and validate response format
  - [x] 3.4 Return structured description result

- [x] Task 4: Create description generation service (AC: #4, #5, #6)
  - [x] 4.1 Create `screenshotDescriptionService.ts` in services/accessibility
  - [x] 4.2 Implement `generateScreenshotDescription` function
  - [x] 4.3 Use retry logic with exponential backoff (like classification)
  - [x] 4.4 Store description in screenshot document

- [x] Task 5: Integrate with classification pipeline (AC: #4)
  - [x] 5.1 Update classifyScreenshot to trigger description generation
  - [x] 5.2 Fire description generation as non-blocking async operation
  - [x] 5.3 Don't block classification on description completion
  - [x] 5.4 Log description generation status

- [x] Task 6: Create description processing tests (AC: #1, #2, #3, #6)
  - [x] 6.1 Unit tests for description prompt generation
  - [x] 6.2 Unit tests for GeminiClient.generateDescription (covered by integration tests)
  - [x] 6.3 Unit tests for screenshotDescriptionService
  - [x] 6.4 Test timeout handling and retry logic

## Dev Notes

### Architecture Pattern - Follow Existing Classification Service

The description generation should follow the exact same patterns as the existing classification service:

```
apps/functions/src/services/
├── classification/           # Existing - classification service
│   ├── classifyScreenshot.ts
│   ├── geminiClient.ts       # ADD: generateDescription method
│   ├── classificationPrompt.ts
│   └── descriptionPrompt.ts  # NEW: description prompt builder
├── accessibility/            # NEW: accessibility services
│   ├── screenshotDescriptionService.ts  # NEW: description orchestration
│   └── index.ts              # NEW: exports
```

### GeminiClient Extension

Add to existing `geminiClient.ts`:

```typescript
/**
 * Generate accessibility description for a screenshot.
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3, AC6
 */
async generateDescription(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  url?: string,
  title?: string
): Promise<GeminiDescriptionResponse> {
  const prompt = buildDescriptionPrompt(url, title)
  // Use same timeout as classification (60 seconds per NFR47)
  // Parse response for structured description
}
```

### Description Schema (Add to shared/contracts)

```typescript
/**
 * AI-generated screenshot description for accessibility.
 * Story 28.1: AI Description Generation
 */
export const screenshotDescriptionSchema = z.object({
  /** Generation status */
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  /** Natural language description of screenshot content */
  description: z.string().optional(),
  /** Word count for monitoring */
  wordCount: z.number().optional(),
  /** When generation completed */
  generatedAt: z.number().optional(),
  /** Model version used */
  modelVersion: z.string().optional(),
  /** Error message if failed */
  error: z.string().optional(),
  /** Retry count */
  retryCount: z.number().default(0),
})
export type ScreenshotDescription = z.infer<typeof screenshotDescriptionSchema>
```

### Description Prompt Design (AC1, AC2, AC3)

The prompt should instruct Gemini to:

1. Describe visible applications and their state
2. Extract and include visible text (OCR-like)
3. Describe any images or visual content
4. Provide context about the activity
5. Keep description between 100-300 words
6. Use clear, screen-reader-friendly language

Example prompt structure:

```
You are generating an accessibility description for a screenshot to help visually impaired users understand the content.

Describe what you see in 100-300 words, covering:
- Which applications or websites are visible
- Any visible text content (menus, messages, labels)
- Images or visual elements
- The overall activity or context

Use clear, descriptive language suitable for screen readers.
Prioritize factual content over interpretation.
```

### Integration with Classification Pipeline

In `classifyScreenshot.ts`, add after classification completes:

```typescript
// Story 28.1: Trigger description generation asynchronously
// Don't block classification on description
generateScreenshotDescriptionAsync(job).catch((err) => {
  logger.warn('Failed to generate description', { screenshotId, error: err })
})
```

### NFR Compliance

- **NFR47:** 60-second processing limit - use same timeout as classification
- **NFR44:** Accessibility best practices - descriptions follow WCAG guidelines

### Testing Approach

Use same mock patterns as classification tests:

- Mock Vertex AI responses
- Test prompt generation
- Test response parsing
- Test timeout handling
- Test retry logic

### References

- [Source: docs/epics/epic-list.md#epic-28] - Epic requirements
- [Source: apps/functions/src/services/classification/geminiClient.ts] - Existing AI patterns
- [Source: apps/functions/src/services/classification/classifyScreenshot.ts] - Classification pipeline
- [Source: apps/functions/src/services/classification/classificationPrompt.ts] - Prompt patterns
- [Source: FR102] - AI screenshot descriptions requirement
- [Source: NFR44] - Accessibility best practices
- [Source: NFR47] - 60-second processing limit

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented and tested
- 35 new unit tests added (15 prompt tests + 20 service tests)
- Description generation integrated with classification pipeline as async operation
- Uses existing retry/backoff patterns from classification service
- 60-second timeout enforced per NFR47

### File List

**New Files:**

- `apps/functions/src/services/accessibility/screenshotDescriptionService.ts` - Description generation service
- `apps/functions/src/services/accessibility/screenshotDescriptionService.test.ts` - Service tests (20 tests)
- `apps/functions/src/services/accessibility/index.ts` - Module exports
- `apps/functions/src/services/classification/descriptionPrompt.ts` - Prompt builder
- `apps/functions/src/services/classification/descriptionPrompt.test.ts` - Prompt tests (15 tests)

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Add ScreenshotDescription schema and DESCRIPTION_CONFIG
- `packages/shared/src/index.ts` - Export new types
- `apps/functions/src/services/classification/geminiClient.ts` - Add generateDescription method
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Trigger description generation async
- `apps/functions/src/services/classification/classifyScreenshot.test.ts` - Add accessibility mock
