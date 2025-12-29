# Story 5.5: Agreement Preview & Summary

Status: done

## Story

As a **parent and child**,
I want **to review the complete agreement before signing**,
So that **we both understand exactly what we're agreeing to**.

## Acceptance Criteria

1. **AC1: Complete Agreement Display**
   - Given all agreement terms are resolved
   - When family views the preview
   - Then agreement displays in final format with all terms listed
   - And each party's contributions are shown with attribution

2. **AC2: Plain-Language Summary**
   - Given the preview is displayed
   - When viewing the summary section
   - Then plain-language summary explains key commitments for each party
   - And summary uses 6th-grade reading level (NFR65)

3. **AC3: Impact Estimation**
   - Given the preview shows the agreement
   - When viewing time-related terms
   - Then estimated daily/weekly impact is shown (e.g., "2 hours screen time per day")
   - And totals are calculated and displayed clearly

4. **AC4: Anti-TLDR Scroll Requirement**
   - Given the preview is displayed
   - When viewing the agreement
   - Then both parties must scroll through entire agreement
   - And "I've reviewed this agreement" checkbox becomes enabled after full scroll
   - And scroll progress is tracked visually

5. **AC5: PDF Download Option**
   - Given the preview is complete
   - When user clicks download
   - Then preview generates PDF format
   - And PDF includes all terms, attributions, and summary

6. **AC6: Template Difference Highlighting**
   - Given agreement was based on a template
   - When viewing the preview
   - Then preview highlights what's different from template
   - And changes are visually distinguished (added, modified, removed)

## Tasks / Subtasks

- [x] Task 1: Create Agreement Preview Component (AC: #1)
  - [x] 1.1 Create AgreementPreview container component
  - [x] 1.2 Display all terms grouped by category
  - [x] 1.3 Show party attribution badges on each term
  - [x] 1.4 Display discussion notes summary for negotiated terms

- [x] Task 2: Create Plain-Language Summary (AC: #2)
  - [x] 2.1 Create AgreementSummary component
  - [x] 2.2 Generate parent commitments summary
  - [x] 2.3 Generate child commitments summary
  - [x] 2.4 Ensure 6th-grade reading level (NFR65)

- [x] Task 3: Implement Impact Estimation (AC: #3)
  - [x] 3.1 Create ImpactEstimation component
  - [x] 3.2 Calculate daily/weekly screen time totals
  - [x] 3.3 Display time in child-friendly format
  - [x] 3.4 Show comparison to typical usage (if available)

- [x] Task 4: Implement Scroll Tracking (AC: #4)
  - [x] 4.1 Create useScrollProgress hook
  - [x] 4.2 Track scroll position percentage
  - [x] 4.3 Show visual progress indicator
  - [x] 4.4 Enable confirmation button at 100% scroll

- [x] Task 5: Create PDF Download (AC: #5)
  - [x] 5.1 Install and configure PDF generation library
  - [x] 5.2 Create PDF template with branding
  - [x] 5.3 Include all terms and attributions
  - [x] 5.4 Add download button with loading state

- [x] Task 6: Template Diff Highlighting (AC: #6)
  - [x] 6.1 Create TemplateDiff component
  - [x] 6.2 Compare current terms to original template
  - [x] 6.3 Apply visual styles for added/modified/removed
  - [x] 6.4 Add "Show changes" toggle

- [x] Task 7: Unit Tests (AC: All)
  - [x] 7.1 Test preview rendering with terms
  - [x] 7.2 Test summary generation
  - [x] 7.3 Test scroll tracking behavior
  - [x] 7.4 Test PDF download trigger
  - [x] 7.5 Test template diff highlighting

## Dev Notes

### Technical Requirements

- **PDF Generation:** Use react-pdf or html2canvas + jspdf for PDF export
- **Scroll Tracking:** Intersection Observer API for performance
- **State Management:** Preview state from parent agreement builder

### Previous Story Intelligence

From Story 5.4 completion:

- agreementTermWithDiscussionSchema includes discussionStatus and notes
- Discussion system tracks resolved/needs_discussion status
- All discussions should be resolved before preview

Key learning: Preview should show which terms were negotiated vs. accepted as-is.

### File Structure

```
apps/web/src/components/agreements/
├── AgreementPreview.tsx          # NEW - Main preview container
├── AgreementSummary.tsx          # NEW - Plain-language summary
├── ImpactEstimation.tsx          # NEW - Time impact calculations
├── TemplateDiffView.tsx          # NEW - Template comparison
├── __tests__/
│   ├── AgreementPreview.test.tsx
│   ├── AgreementSummary.test.tsx
│   ├── ImpactEstimation.test.tsx
│   └── TemplateDiffView.test.tsx
apps/web/src/hooks/
├── useScrollProgress.ts          # NEW - Scroll tracking hook
└── __tests__/
    └── useScrollProgress.test.ts
```

### Summary Generation Rules (6th-Grade Level)

| Party  | Summary Format                            |
| ------ | ----------------------------------------- |
| Parent | "I will: [list of parent commitments]"    |
| Child  | "I agree to: [list of child commitments]" |
| Shared | "Together we will: [shared commitments]"  |

### Impact Calculation

```typescript
interface ImpactSummary {
  weekdayScreenTime: number // minutes per day
  weekendScreenTime: number // minutes per day
  appsAllowed: string[] // list of allowed apps
  appsRestricted: string[] // list of restricted apps
  monitoringLevel: 'high' | 'medium' | 'low'
}
```

### Dependencies

- Story 5.4 components (discussion system)
- Story 5.2 components (VisualAgreementBuilder, AgreementTermCard)
- Zod schemas from @fledgely/shared/contracts

### NFR References

- NFR65: 6th-grade reading level for summary
- NFR42: WCAG 2.1 AA compliance for scroll tracking
- NFR60: Maximum 100 terms in preview

## Change Log

| Date       | Change        |
| ---------- | ------------- |
| 2025-12-29 | Story created |
