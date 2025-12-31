# Story 21.1: Concerning Content Categories

Status: done

## Story

As **the classification system**,
I want **to identify content that may need parent attention**,
So that **families can address concerns together**.

## Acceptance Criteria

1. **AC1: Screenshot flagged with concern category**
   - Given screenshot is being analyzed
   - When AI detects potentially concerning content
   - Then content flagged with concern category

2. **AC2: Categories include required concerning labels**
   - Given concern categories are defined
   - When flagging content
   - Then categories include: Violence, Adult Content, Bullying, Self-Harm Indicators, Explicit Language, Unknown Contacts
   - And each category has clear definition for consistency

3. **AC3: Flags separate from basic categories (coexist)**
   - Given screenshot has basic category (e.g., "Gaming")
   - When concerning content detected
   - Then concern flag added independently
   - And basic category remains unchanged
   - And both are stored on screenshot document

4. **AC4: Concern severity assigned**
   - Given concerning content is detected
   - When creating flag
   - Then severity assigned: Low, Medium, High
   - And severity based on content intensity and potential harm

5. **AC5: Flag includes AI reasoning**
   - Given concern flag is created
   - When storing flag data
   - Then AI reasoning (why flagged) is included
   - And reasoning helps parent understand concern

## Tasks / Subtasks

- [x] Task 1: Define concern category schema in @fledgely/shared (AC: #2, #4)
  - [x] 1.1 Create `CONCERN_CATEGORY_VALUES` constant array
  - [x] 1.2 Create `concernCategorySchema` Zod enum
  - [x] 1.3 Create `concernSeveritySchema` with 'low' | 'medium' | 'high'
  - [x] 1.4 Create `concernFlagSchema` with category, severity, reasoning, timestamp
  - [x] 1.5 Write unit tests for new schemas

- [x] Task 2: Create concern category definitions (AC: #2)
  - [x] 2.1 Create `concern-category-definitions.ts` in shared/constants
  - [x] 2.2 Define Violence: physical harm, fighting, weapons imagery
  - [x] 2.3 Define Adult Content: sexually explicit, nudity, age-inappropriate
  - [x] 2.4 Define Bullying: harassment, mean messages, social exclusion
  - [x] 2.5 Define Self-Harm Indicators: self-injury, crisis content, suicidal ideation
  - [x] 2.6 Define Explicit Language: profanity, slurs, hate speech
  - [x] 2.7 Define Unknown Contacts: unfamiliar adults, stranger interactions
  - [x] 2.8 Add CONCERN_TAXONOMY_VERSION for tracking changes

- [x] Task 3: Update classification prompt for concern detection (AC: #1, #2, #3, #5)
  - [x] 3.1 Create `buildConcernDetectionPrompt()` in classificationPrompt.ts
  - [x] 3.2 Prompt instructs to detect concerns SEPARATELY from basic categories
  - [x] 3.3 Include concern category definitions in prompt
  - [x] 3.4 Request severity assessment with reasoning
  - [x] 3.5 Write unit tests for concern detection prompt

- [x] Task 4: Update Gemini client for concern detection (AC: #1, #3, #4, #5)
  - [x] 4.1 Add `ConcernDetectionResponse` interface
  - [x] 4.2 Add `detectConcerns()` method to GeminiClient
  - [x] 4.3 Parse concern categories with severity from response
  - [x] 4.4 Keep separate from basic classification response
  - [x] 4.5 Write unit tests for concern parsing

- [x] Task 5: Update classifyScreenshot to include concern detection (AC: #1, #3)
  - [x] 5.1 Call concern detection after basic classification
  - [x] 5.2 Store concern flags in separate field on screenshot document
  - [x] 5.3 Basic classification remains unchanged (AC3)
  - [x] 5.4 Write integration tests for combined flow

- [x] Task 6: Add concern field to screenshot schema (AC: #3, #4, #5)
  - [x] 6.1 Add `concernFlags` array field to screenshot document type
  - [x] 6.2 Add Firestore indexes for concern queries
  - [x] 6.3 Ensure backward compatibility with existing documents
  - [x] 6.4 Export new types from @fledgely/shared

## Dev Notes

### Previous Story Intelligence (Epic 20)

Epic 20 established the classification foundation:

- `classificationResultSchema` with primaryCategory, confidence, secondaryCategories
- `GeminiClient.classifyImage()` for basic classification
- `buildClassificationPrompt()` for category detection
- `CATEGORY_VALUES` and `categorySchema` for basic categories
- Pattern: schemas in `@fledgely/shared/contracts`, constants in `@fledgely/shared/constants`

**What Story 21-1 adds:**

- SEPARATE concern detection (not replacing basic classification)
- Concern categories with severity levels
- AI reasoning for each concern flag
- Concern flags stored alongside basic classification

### Concern Category Definitions

| Category             | Description                       | Severity Indicators                                                     |
| -------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| Violence             | Physical harm, fighting, weapons  | Low: fantasy/game violence, Medium: real fighting, High: weapons/injury |
| Adult Content        | Sexual, nudity, age-inappropriate | Low: suggestive, Medium: partial nudity, High: explicit                 |
| Bullying             | Harassment, mean messages         | Low: teasing, Medium: targeted insults, High: threats                   |
| Self-Harm Indicators | Self-injury, crisis content       | Low: sad content, Medium: ideation mentions, High: active crisis        |
| Explicit Language    | Profanity, slurs                  | Low: mild profanity, Medium: strong profanity, High: hate speech        |
| Unknown Contacts     | Unfamiliar adults, strangers      | Low: public forum, Medium: direct contact, High: requesting info        |

### Schema Design

```typescript
// packages/shared/src/contracts/index.ts

export const CONCERN_CATEGORY_VALUES = [
  'Violence',
  'Adult Content',
  'Bullying',
  'Self-Harm Indicators',
  'Explicit Language',
  'Unknown Contacts',
] as const

export const concernCategorySchema = z.enum(CONCERN_CATEGORY_VALUES)
export type ConcernCategory = z.infer<typeof concernCategorySchema>

export const concernSeveritySchema = z.enum(['low', 'medium', 'high'])
export type ConcernSeverity = z.infer<typeof concernSeveritySchema>

export const concernFlagSchema = z.object({
  category: concernCategorySchema,
  severity: concernSeveritySchema,
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  detectedAt: z.number(), // epoch ms
})
export type ConcernFlag = z.infer<typeof concernFlagSchema>
```

### Gemini Response Format

```typescript
interface ConcernDetectionResponse {
  hasConcerns: boolean
  concerns: Array<{
    category: ConcernCategory
    severity: 'low' | 'medium' | 'high'
    confidence: number
    reasoning: string
  }>
}
```

### Implementation Pattern

```typescript
// In classifyScreenshot.ts
const basicResult = await geminiClient.classifyImage(imageBase64, mimeType, url, title)
const concernResult = await geminiClient.detectConcerns(imageBase64, mimeType, url, title)

// Store both independently
await screenshotRef.update({
  classification: basicResult,
  concernFlags: concernResult.concerns, // New field
})
```

### Implementation Files

**New Files:**

```
packages/shared/src/constants/concern-category-definitions.ts
packages/shared/src/constants/concern-category-definitions.test.ts
```

**Modified Files:**

```
packages/shared/src/contracts/index.ts                         # Add concern schemas
packages/shared/src/index.ts                                   # Export concern types
apps/functions/src/services/classification/classificationPrompt.ts  # Add concern prompt
apps/functions/src/services/classification/geminiClient.ts     # Add detectConcerns()
apps/functions/src/services/classification/classifyScreenshot.ts  # Integrate concern detection
firestore.indexes.json                                         # Add concern indexes
```

### Testing Requirements

1. **Unit Tests** (co-located `*.test.ts`):
   - concernCategorySchema validation
   - concernSeveritySchema validation
   - concernFlagSchema validation
   - buildConcernDetectionPrompt output
   - GeminiClient.detectConcerns parsing
   - Concern parsing with various severities

2. **Integration Tests**:
   - Full flow: classify → detect concerns → store both
   - Backward compatibility with existing screenshots

### Project Structure Notes

- Follow Epic 20 patterns for schema placement
- Concern detection is ADDITIVE (doesn't break existing classification)
- Keep Gemini calls separate for clarity and testability
- All types derived from Zod schemas

### References

- [Source: packages/shared/src/contracts/index.ts#classificationResultSchema] - Existing schema
- [Source: apps/functions/src/services/classification/geminiClient.ts] - Existing client
- [Source: apps/functions/src/services/classification/classificationPrompt.ts] - Prompt pattern
- [Source: packages/shared/src/constants/category-definitions.ts] - Category definitions pattern
- [Source: docs/epics/epic-list.md#Story 21.1] - Story requirements

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

All 6 tasks completed successfully:

- Task 1: Concern category schemas added to @fledgely/shared/contracts
- Task 2: Concern category definitions with severity guidance created
- Task 3: `buildConcernDetectionPrompt()` added to classificationPrompt.ts with full test coverage
- Task 4: `detectConcerns()` method added to GeminiClient with parsing and validation
- Task 5: classifyScreenshot updated to call concern detection after basic classification
- Task 6: `concernFlags` field added to ClassificationResult schema

Test summary: 519 shared tests + 1164 functions tests = 1683 tests passing

### File List

**New Files:**

- `packages/shared/src/constants/concern-category-definitions.ts`
- `packages/shared/src/constants/concern-category-definitions.test.ts`

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added concern schemas (CONCERN_CATEGORY_VALUES, concernCategorySchema, concernSeveritySchema, concernFlagSchema, concernFlags in classificationResultSchema, concernRawResponse/concernParsedResult in classificationDebugSchema)
- `packages/shared/src/index.ts` - Exported concern types and definitions including MIN_CONCERN_CONFIDENCE
- `packages/shared/src/contracts/classification.test.ts` - Added concern schema tests
- `apps/functions/src/services/classification/classificationPrompt.ts` - Added buildConcernDetectionPrompt()
- `apps/functions/src/services/classification/classificationPrompt.test.ts` - Added concern prompt tests
- `apps/functions/src/services/classification/geminiClient.ts` - Added DetectedConcern, GeminiConcernDetectionResponse, detectConcerns(), uses MIN_CONCERN_CONFIDENCE from shared
- `apps/functions/src/services/classification/geminiClient.test.ts` - Added detectConcerns tests
- `apps/functions/src/services/classification/classifyScreenshot.ts` - Integrated concern detection with debug storage
- `apps/functions/src/services/classification/classifyScreenshot.test.ts` - Added integration tests for combined classification and concern detection flow
- `apps/functions/src/services/classification/storeDebug.ts` - Added concern debug data storage (concernRawResponse, concernParsedResult)
- `apps/functions/src/triggers/onDeviceStatusChange.test.ts` - Removed unused import (linting cleanup)
- `firestore.indexes.json` - Added indexes for concernFlags and concernTaxonomyVersion queries
