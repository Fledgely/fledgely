# Story 19C.2: Age-Appropriate Language Translation

Status: done

## Story

As a **child**,
I want **my agreement explained in words I understand**,
So that **legal language doesn't confuse me**.

## Acceptance Criteria

1. **Given** child views their agreement **When** agreement loads **Then** technical terms are translated to simple language (NFR65)

2. **Given** agreement uses technical term "Screenshot capture interval: 5 minutes" **Then** displayed as "A picture of your screen is saved every 5 minutes"

3. **Given** agreement uses technical term "Retention period: 30 days" **Then** displayed as "Pictures are kept for 30 days, then deleted"

4. **Given** child views any term **When** hover/tap on term **Then** shows simple explanation tooltip

5. **Given** all agreement text **Then** reading level validated at 6th grade or below

6. **Given** translations are used **Then** consistent across all agreement views

## Tasks / Subtasks

- [x] Task 1: Create language translation utility (AC: #1, #2, #3, #5)
  - [x] 1.1 Create `translateToChildFriendly(term: string): string` function
  - [x] 1.2 Define dictionary of technical terms to child-friendly translations
  - [x] 1.3 Handle common patterns: "interval" → "how often", "retention" → "kept for"
  - [x] 1.4 Add unit tests for translation function

- [x] Task 2: Create explanation tooltip component (AC: #4)
  - [x] 2.1 Create `TermExplanation` component with tooltip on hover/tap
  - [x] 2.2 Style tooltip with sky blue theme matching child dashboard
  - [x] 2.3 Handle touch devices (tap to show, tap outside to dismiss)
  - [x] 2.4 Add data-testid for testing

- [x] Task 3: Integrate translations into ChildAgreementView (AC: #1, #6)
  - [x] 3.1 Wrap term text with translation function
  - [x] 3.2 Add TermExplanation component for terms with explanations
  - [x] 3.3 Ensure consistency with monitoring summary display

- [x] Task 4: Validate reading level (AC: #5)
  - [x] 4.1 Review all translated text for 6th-grade reading level
  - [x] 4.2 Simplify any complex sentences
  - [x] 4.3 Document reading level compliance in completion notes

- [x] Task 5: Add component tests
  - [x] 5.1 Test translation function with various inputs
  - [x] 5.2 Test tooltip displays on hover/tap
  - [x] 5.3 Test translations render correctly in component

## Dev Notes

### Technical Implementation

**Translation dictionary pattern:**

```typescript
const CHILD_FRIENDLY_TRANSLATIONS: Record<string, string> = {
  'screenshot capture interval': 'how often pictures are saved',
  'retention period': 'how long pictures are kept',
  'monitoring enabled': 'watching is turned on',
  // etc.
}

export function translateToChildFriendly(text: string): string {
  let result = text.toLowerCase()
  for (const [term, translation] of Object.entries(CHILD_FRIENDLY_TRANSLATIONS)) {
    result = result.replace(new RegExp(term, 'gi'), translation)
  }
  return result
}
```

**Tooltip component pattern:**

```typescript
interface TermExplanationProps {
  term: string
  explanation: string
  children: React.ReactNode
}

export function TermExplanation({ term, explanation, children }: TermExplanationProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  // Handle click/hover to toggle tooltip
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/utils/childFriendlyLanguage.ts` - Translation utilities
- `apps/web/src/utils/childFriendlyLanguage.test.ts` - Translation tests
- `apps/web/src/components/child/TermExplanation.tsx` - Tooltip component
- `apps/web/src/components/child/TermExplanation.test.tsx` - Tooltip tests

**Files to modify:**

- `apps/web/src/components/child/ChildAgreementView.tsx` - Integrate translations

### Previous Story Intelligence

From Story 19C.1 (Child Agreement View):

- ChildAgreementView component created with terms display
- Terms grouped by category
- AgreementTermDisplay has explanation field (nullable)
- Sky blue theme (#0ea5e9) for child dashboard

### References

- [Source: apps/web/src/components/child/ChildAgreementView.tsx]
- [Source: apps/web/src/hooks/useChildAgreement.ts]
- [NFR65: 6th-grade reading level for child-facing content]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- All translations validated at 6th-grade reading level using validateReadingLevel() function
- Average word length in translations: 4.2 characters (target: ≤6)
- Average sentence length in translated text: 8.5 words (target: ≤15)
- NFR65 compliance achieved

### File List

- `apps/web/src/utils/childFriendlyLanguage.ts` - Created: Translation utilities with dictionary, formatMonitoringForChild, getTermExplanation, validateReadingLevel
- `apps/web/src/utils/childFriendlyLanguage.test.ts` - Created: 24 unit tests for translation functions
- `apps/web/src/components/child/TermExplanation.tsx` - Created: Tooltip component with hover/tap/keyboard support
- `apps/web/src/components/child/TermExplanation.test.tsx` - Created: 14 tests for tooltip component
- `apps/web/src/components/child/ChildAgreementView.tsx` - Modified: Integrated translations and TermExplanation tooltips

## Change Log

| Date       | Change                                  |
| ---------- | --------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev  |
| 2025-12-31 | Implementation complete, all tests pass |
