# Story 28.2: Description Quality Standards

Status: done

## Story

As **a blind parent**,
I want **descriptions that are accurate and useful**,
So that **I can understand what my child was doing**.

## Acceptance Criteria

1. **AC1: Accessibility best practices compliance (NFR44)**
   - Given description is generated
   - When reviewing for accessibility
   - Then description follows WCAG accessibility best practices
   - And uses clear, non-jargon language suitable for screen readers
   - And avoids visual-only references ("as shown in red")

2. **AC2: Factual content prioritization**
   - Given description is generated
   - When analyzing content
   - Then factual description prioritized over interpretation
   - And objective observations used instead of subjective judgments
   - And speculation minimized

3. **AC3: Sensitive content handling**
   - Given screenshot contains sensitive content
   - When generating description
   - Then sensitive content described appropriately without graphic detail
   - And concerning content flagged objectively for parent awareness
   - And age-appropriate language used

4. **AC4: OCR text extraction**
   - Given visible text exists in screenshot
   - When extracting text via OCR
   - Then readable text extracted and included in description
   - And text quoted accurately with context
   - And partial/unclear text indicated

5. **AC5: App and context identification**
   - Given recognizable apps/websites visible
   - When identifying context
   - Then app names correctly identified
   - And website domains included when visible
   - And activity context described (watching, browsing, chatting)

6. **AC6: Unclear image fallback**
   - Given image is blurry, dark, or unclear
   - When unable to generate meaningful description
   - Then "Unable to describe" fallback returned with reason
   - And partial description provided when possible
   - And quality issue logged for monitoring

## Tasks / Subtasks

- [x] Task 1: Enhance prompt with quality guidelines (AC: #1, #2, #3)
  - [x] 1.1 Add accessibility best practices guidance to prompt
  - [x] 1.2 Add factual-over-interpretation instructions
  - [x] 1.3 Add sensitive content handling rules
  - [x] 1.4 Add examples of good vs bad descriptions

- [x] Task 2: Improve OCR and text extraction (AC: #4)
  - [x] 2.1 Enhance prompt for better text extraction
  - [x] 2.2 Add instructions for quoting visible text accurately
  - [x] 2.3 Handle partial/unclear text gracefully

- [x] Task 3: Improve app/context identification (AC: #5)
  - [x] 3.1 Add common app recognition guidance to prompt
  - [x] 3.2 Include domain extraction from URLs
  - [x] 3.3 Add activity context patterns (watching, playing, etc.)

- [x] Task 4: Implement unclear image fallback (AC: #6)
  - [x] 4.1 Add quality assessment to response parsing
  - [x] 4.2 Implement "Unable to describe" fallback logic
  - [x] 4.3 Create partial description support
  - [x] 4.4 Add quality metrics to GeminiDescriptionResponse (imageQuality, confidenceScore, isSensitiveContent)

- [x] Task 5: Add quality validation tests (AC: #1-6)
  - [x] 5.1 Test accessibility compliance in descriptions
  - [x] 5.2 Test sensitive content handling
  - [x] 5.3 Test OCR extraction accuracy
  - [x] 5.4 Test fallback behavior

## Dev Notes

### Previous Story Intelligence (28-1)

**From Story 28-1 implementation:**

- Description generation service created in `apps/functions/src/services/accessibility/`
- Prompt built in `apps/functions/src/services/classification/descriptionPrompt.ts`
- GeminiClient extended with `generateDescription` method
- Schema defined as `ScreenshotDescription` in shared contracts
- Uses same retry/timeout patterns as classification

**Files to modify:**

- `apps/functions/src/services/classification/descriptionPrompt.ts` - Enhance prompt with quality guidelines
- `apps/functions/src/services/classification/geminiClient.ts` - Add quality assessment parsing
- `packages/shared/src/contracts/index.ts` - Add quality fields to schema (if needed)

### Architecture Pattern

Extend the existing description prompt with quality-focused enhancements:

```typescript
// descriptionPrompt.ts - Add quality guidelines
const qualityGuidelines = `
**Quality Standards:**
- Use factual, objective language (avoid "seems like", "probably")
- Describe sensitive content objectively without graphic detail
- Quote visible text in double quotes with context
- If image is unclear, state "Unable to fully describe due to [reason]"
- Avoid visual-only references (don't say "the red button")
`
```

### Quality Assessment Schema Extension

Add to `GeminiDescriptionResponse`:

```typescript
export interface GeminiDescriptionResponse {
  description: string
  wordCount: number
  appsIdentified: string[]
  hasText: boolean
  textExcerpt: string | null
  // NEW: Quality assessment fields
  imageQuality: 'clear' | 'partial' | 'unclear'
  confidenceScore: number // 0-100
  isSensitiveContent: boolean
  rawResponse: string
}
```

### Prompt Enhancement Strategy

1. **Accessibility Best Practices (NFR44)**:
   - Use person-first language
   - Avoid color-only references
   - Describe actions, not just objects
   - Use clear sentence structure for TTS

2. **Factual Over Interpretation**:
   - "Shows a chat message" vs "Appears to be arguing"
   - "Video game interface" vs "Violent game"
   - Let parent decide significance

3. **Sensitive Content Handling**:
   - Describe objectively: "Shows adult content warning"
   - Don't reproduce graphic content
   - Flag for parent awareness without judgment

4. **OCR Quality**:
   - Quote visible text in context
   - Mark unclear text: "Text reads 'Hel...' (partially visible)"
   - Include menu items, headings, messages

5. **Fallback Behavior**:
   - Return partial description when possible
   - Clear reason for inability to describe
   - Quality score for monitoring

### Testing Approach

```typescript
// Test accessibility compliance
it('avoids visual-only references', async () => {
  const response = await generateDescription(testImage)
  expect(response.description).not.toMatch(/red|blue|green|yellow/i)
  // Unless describing actual content meaning
})

// Test sensitive content handling
it('describes sensitive content objectively', async () => {
  const response = await generateDescription(sensitiveImage)
  expect(response.isSensitiveContent).toBe(true)
  expect(response.description).not.toContain('graphic')
})

// Test fallback
it('handles unclear images gracefully', async () => {
  const response = await generateDescription(blurryImage)
  expect(response.imageQuality).toBe('unclear')
  expect(response.description).toContain('Unable to')
})
```

### NFR Compliance

- **NFR44:** Accessibility best practices - prompt includes WCAG guidelines
- **NFR47:** 60-second timeout - inherited from Story 28-1

### References

- [Source: docs/epics/epic-list.md#epic-28] - Story 28.2 requirements
- [Source: apps/functions/src/services/classification/descriptionPrompt.ts] - Current prompt implementation
- [Source: apps/functions/src/services/classification/geminiClient.ts] - GeminiClient with generateDescription
- [Source: apps/functions/src/services/accessibility/screenshotDescriptionService.ts] - Description service
- [Source: NFR44] - Accessibility best practices
- [Source: Story 28-1] - Previous story implementation

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented and tested
- 21 new quality tests added (36 total in descriptionPrompt.test.ts)
- Enhanced prompt with WCAG-compliant accessibility guidelines
- Added quality assessment fields (imageQuality, confidenceScore, isSensitiveContent)
- Added QUALITY_GUIDELINES and QUALITY_EXAMPLES constants for prompt consistency
- All 1408 tests pass (67 test files)

### File List

**Modified Files:**

- `apps/functions/src/services/classification/descriptionPrompt.ts` - Add QUALITY_GUIDELINES, QUALITY_EXAMPLES, enhanced prompt with quality standards
- `apps/functions/src/services/classification/descriptionPrompt.test.ts` - Add 21 quality-related tests
- `apps/functions/src/services/classification/geminiClient.ts` - Add ImageQuality type, update GeminiDescriptionResponse with quality fields, add parseImageQuality/parseConfidenceScore methods
- `apps/functions/src/services/accessibility/screenshotDescriptionService.test.ts` - Update mocks with quality fields
