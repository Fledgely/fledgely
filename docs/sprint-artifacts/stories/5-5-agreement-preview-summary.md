# Story 5.5: Agreement Preview & Summary

Status: complete

## Story

As a **parent and child**,
I want **to review the complete agreement before signing**,
So that **we both understand exactly what we're agreeing to**.

## Acceptance Criteria

1. **Given** all agreement terms are resolved **When** family views the preview **Then** agreement displays in final format with all terms listed
2. **Given** viewing the preview **When** reviewing contributions **Then** each party's contributions are shown with attribution (who added/modified each term)
3. **Given** viewing the preview **When** reviewing summary **Then** plain-language summary explains key commitments for each party
4. **Given** viewing the preview **When** reviewing impact **Then** estimated daily/weekly impact is shown (e.g., "2 hours screen time per day")
5. **Given** preview is displayed **When** user scrolls **Then** both parties must scroll through entire agreement (anti-TLDR measure)
6. **Given** preview is complete **When** user requests export **Then** preview generates shareable format (PDF download option)

## Tasks / Subtasks

- [x] Task 1: Create Agreement Preview Schema Extensions (AC: 1, 2) ✅
  - [x] 1.1: Create `agreementPreviewSchema` in `@fledgely/contracts` with summary fields
  - [x] 1.2: Add `contributionSummary` type tracking who contributed what
  - [x] 1.3: Add `impactEstimate` schema for daily/weekly calculations
  - [x] 1.4: Create `generateAgreementPreview(session: CoCreationSession)` helper function
  - [x] 1.5: Write schema validation tests

- [x] Task 2: Create Agreement Summary Component (AC: 1, 3) ✅
  - [x] 2.1: Create `AgreementSummary.tsx` displaying all terms in final format
  - [x] 2.2: Group terms by category with visual section headers
  - [x] 2.3: Create plain-language commitment summaries for each party
  - [x] 2.4: Use child-friendly language at 6th-grade reading level (NFR65)
  - [x] 2.5: Support screen reader navigation (NFR42)
  - [x] 2.6: Write component tests

- [x] Task 3: Create Contribution Attribution Component (AC: 2) ✅
  - [x] 3.1: Create `ContributionAttribution.tsx` showing who added/modified terms
  - [x] 3.2: Display contributor badges (parent/child) for each term
  - [x] 3.3: Show contribution timeline highlights
  - [x] 3.4: Calculate contribution percentage per party
  - [x] 3.5: Style attribution for visual clarity
  - [x] 3.6: Write component tests

- [x] Task 4: Create Impact Calculator (AC: 4) ✅
  - [x] 4.1: Create `useImpactEstimate` hook for calculating daily/weekly impact
  - [x] 4.2: Calculate screen time totals (e.g., "2 hours per day")
  - [x] 4.3: Calculate bedtime schedule impact
  - [x] 4.4: Calculate monitoring level implications
  - [x] 4.5: Create `ImpactSummary.tsx` component to display estimates
  - [x] 4.6: Ensure estimates are child-understandable
  - [x] 4.7: Write impact calculation tests

- [x] Task 5: Create Scroll Tracking (Anti-TLDR) Component (AC: 5) ✅
  - [x] 5.1: Create `useScrollCompletion` hook to track scroll progress
  - [x] 5.2: Track scroll position for both parent and child
  - [x] 5.3: Show visual progress indicator (percentage scrolled)
  - [x] 5.4: Block "Continue to Sign" until both parties have scrolled
  - [x] 5.5: Create `ScrollProgress.tsx` component with progress bar
  - [x] 5.6: Store scroll completion in session state
  - [x] 5.7: Write scroll tracking tests

- [x] Task 6: Create PDF Export Feature (AC: 6) ✅
  - [x] 6.1: Create `useAgreementExport` hook for PDF generation
  - [x] 6.2: Design print-friendly agreement layout
  - [x] 6.3: Include all terms, attributions, and signatures placeholder
  - [x] 6.4: Add Fledgely branding and generation timestamp
  - [x] 6.5: Create `ExportButton.tsx` with download functionality
  - [x] 6.6: Support both web download and print dialog
  - [x] 6.7: Write export tests

- [x] Task 7: Create Agreement Preview Page (AC: 1-6) ✅
  - [x] 7.1: Create `AgreementPreview.tsx` page component
  - [x] 7.2: Integrate AgreementSummary, ContributionAttribution, ImpactSummary
  - [x] 7.3: Add ScrollProgress tracking
  - [x] 7.4: Add "Continue to Signing" button (gated by scroll completion)
  - [x] 7.5: Add "Export PDF" button
  - [x] 7.6: Ensure mobile-responsive layout
  - [x] 7.7: Write page integration tests

- [x] Task 8: Integrate with Co-Creation Session Flow (AC: 1-6) ✅
  - [x] 8.1: Add "Review Agreement" step to session flow after all terms resolved
  - [x] 8.2: Update session status to include 'preview' phase
  - [x] 8.3: Gate preview access using `useCanProceedToSigning` from Story 5.4
  - [x] 8.4: Navigate to preview from VisualAgreementBuilder when ready
  - [x] 8.5: Navigate to signing from preview when scroll complete
  - [x] 8.6: Write flow integration tests

- [x] Task 9: Accessibility and Polish (AC: 1-6) ✅
  - [x] 9.1: Ensure keyboard navigation throughout preview (NFR43)
  - [x] 9.2: Add ARIA labels for all preview elements (NFR42)
  - [x] 9.3: Screen reader announcements for scroll progress
  - [x] 9.4: Ensure 44x44px touch targets (NFR49)
  - [x] 9.5: Verify color contrast for all text (NFR45)
  - [x] 9.6: Write accessibility tests

## Dev Notes

### Previous Story Intelligence (Stories 5.1-5.4)

**Story 5.1** established co-creation session infrastructure:
```typescript
// packages/contracts/src/co-creation-session.schema.ts
export const coCreationSessionSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string(),
  status: sessionStatusSchema, // 'initializing' | 'active' | 'paused' | 'completed' | 'expired'
  terms: z.array(sessionTermSchema),
  contributions: z.array(sessionContributionSchema),
  // ... other fields
})
```

**Story 5.2** created the Visual Agreement Builder:
- `AgreementTermCard.tsx` - Term card display pattern
- `VisualAgreementBuilder.tsx` - Container component
- `termUtils.ts` - Category colors, icons, and labels

**Story 5.3** added child contribution features:
- `ContributorToggle.tsx` - Switch between parent/child mode
- `useChildContribution.ts` - Hook for contribution tracking
- Escape key handling and click-outside patterns

**Story 5.4** created discussion/negotiation support:
- `DiscussionTermCard.tsx` - Expandable discussion card
- `ResolutionControls.tsx` - Agreement state machine
- `useCanProceedToSigning.tsx` - **CRITICAL: Reuse this hook to gate preview access**
- `SigningGate` component for conditional rendering
- `getUnresolvedDiscussionTerms()` helper function

### Architecture Patterns

**Component Structure:**
```
apps/web/src/components/co-creation/
├── builder/              (From Story 5.2)
├── discussion/           (From Story 5.4)
├── preview/              (NEW for Story 5.5)
│   ├── AgreementPreview.tsx     (NEW: Main preview page)
│   ├── AgreementSummary.tsx     (NEW: Terms display)
│   ├── ContributionAttribution.tsx (NEW: Who added what)
│   ├── ImpactSummary.tsx        (NEW: Daily/weekly impact)
│   ├── ScrollProgress.tsx       (NEW: Anti-TLDR tracker)
│   ├── ExportButton.tsx         (NEW: PDF download)
│   ├── previewUtils.ts          (NEW: Impact calculations)
│   └── __tests__/
└── index.ts             (UPDATE: Export preview components)
```

**Hooks:**
```
apps/web/src/hooks/
├── useCanProceedToSigning.tsx   (REUSE from Story 5.4)
├── useScrollCompletion.tsx      (NEW: Track scroll progress)
├── useImpactEstimate.tsx        (NEW: Calculate impact)
├── useAgreementExport.tsx       (NEW: PDF generation)
└── __tests__/
```

### Schema Extensions

```typescript
// packages/contracts/src/co-creation-session.schema.ts - ADD

export const contributionSummarySchema = z.object({
  termId: z.string().uuid(),
  addedBy: sessionContributorSchema,
  modifiedBy: z.array(sessionContributorSchema).optional(),
  termTitle: z.string(),
  category: sessionTermTypeSchema,
})

export const impactEstimateSchema = z.object({
  screenTime: z.object({
    daily: z.number(), // minutes
    weekly: z.number(),
    description: z.string(), // "2 hours per day"
  }).optional(),
  bedtime: z.object({
    weekday: z.string(), // "9:00 PM"
    weekend: z.string().optional(),
  }).optional(),
  monitoring: z.object({
    level: z.enum(['minimal', 'moderate', 'active']),
    description: z.string(),
  }).optional(),
})

export const agreementPreviewSchema = z.object({
  sessionId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  terms: z.array(sessionTermSchema),
  contributions: z.array(contributionSummarySchema),
  impact: impactEstimateSchema,
  parentScrollComplete: z.boolean().default(false),
  childScrollComplete: z.boolean().default(false),
})
```

### Impact Calculation Rules

```typescript
// apps/web/src/components/co-creation/preview/previewUtils.ts

export function calculateScreenTimeImpact(terms: SessionTerm[]): ImpactEstimate['screenTime'] {
  const screenTimeTerms = terms.filter(t => t.type === 'screen_time' && t.status === 'accepted')

  // Sum up daily limits from screen time terms
  let dailyMinutes = 0
  for (const term of screenTimeTerms) {
    if (term.content.dailyLimit) {
      dailyMinutes += term.content.dailyLimit
    }
  }

  return {
    daily: dailyMinutes,
    weekly: dailyMinutes * 7,
    description: formatDuration(dailyMinutes) + ' per day',
  }
}

export function calculateBedtimeImpact(terms: SessionTerm[]): ImpactEstimate['bedtime'] {
  const bedtimeTerms = terms.filter(t => t.type === 'bedtime' && t.status === 'accepted')
  // Extract bedtime values
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} min`
}
```

### Scroll Tracking Pattern

```typescript
// apps/web/src/hooks/useScrollCompletion.tsx

interface ScrollCompletionResult {
  scrollPercentage: number
  isComplete: boolean
  markComplete: () => void
}

export function useScrollCompletion(
  containerRef: RefObject<HTMLElement>,
  threshold: number = 90 // 90% scroll = complete
): ScrollCompletionResult {
  // Track scroll position
  // Return completion state
}
```

### PDF Export Approach

For PDF generation, use one of these approaches:
1. **react-pdf** - Full control, generates PDFs client-side
2. **html2canvas + jsPDF** - Screenshot-based approach
3. **CSS @media print** - Browser print dialog (simplest)

Recommended: Start with CSS print styles + browser print dialog for MVP, can enhance later.

### NFR Compliance Checklist

- [ ] NFR42: All preview UI screen reader accessible
- [ ] NFR43: Full keyboard navigation for all preview elements
- [ ] NFR45: All text meets WCAG AA contrast ratios
- [ ] NFR49: All buttons/inputs meet 44x44px touch target
- [ ] NFR60: Preview handles up to 100 terms gracefully
- [ ] NFR65: All summaries at 6th-grade reading level

### Testing Standards

**Unit tests for:**
- Impact calculation functions
- Scroll completion logic
- Contribution summary generation

**Component tests for:**
- AgreementSummary rendering all terms
- ContributionAttribution display
- ImpactSummary formatting
- ScrollProgress tracking
- ExportButton functionality

**Integration tests for:**
- Full preview flow from builder to preview
- Scroll tracking gating signing access
- PDF export generation

### References

- [Source: docs/epics/epic-list.md#Story-5.5] - Original acceptance criteria
- [Source: docs/sprint-artifacts/stories/5-4-negotiation-discussion-support.md] - useCanProceedToSigning hook
- [Source: docs/sprint-artifacts/stories/5-2-visual-agreement-builder.md] - Builder patterns
- [Source: packages/contracts/src/co-creation-session.schema.ts] - Session schemas
- [Source: docs/project_context.md] - Implementation patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

<!-- Debug log references will be added during implementation -->

### Completion Notes List

Ultimate context engine analysis completed - comprehensive developer guide created

### File List

<!-- Created/modified files will be listed after implementation -->
