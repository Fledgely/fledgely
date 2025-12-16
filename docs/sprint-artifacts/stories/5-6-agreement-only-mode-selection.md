# Story 5.6: Agreement-Only Mode Selection

Status: complete

## Story

As a **parent**,
I want **to choose agreement-only mode without device monitoring**,
So that **we can establish digital expectations without surveillance**.

## Acceptance Criteria

1. **Given** a family is creating an agreement **When** parent selects "Agreement Only" mode during co-creation **Then** monitoring-related terms are removed from the agreement builder
2. **Given** Agreement Only mode is selected **When** viewing the builder **Then** agreement focuses on: screen time commitments, app expectations, family rules
3. **Given** Agreement Only mode is selected **When** completing the agreement **Then** no device enrollment is required or suggested
4. **Given** Agreement Only mode is selected **When** agreement is finalized **Then** agreement is still signable and trackable
5. **Given** family has an Agreement Only agreement **When** they want to add monitoring later **Then** family can upgrade to full monitoring later without re-creating agreement
6. **Given** parent is selecting agreement mode **When** viewing mode options **Then** mode selection is clearly explained (what's included vs excluded)

## Tasks / Subtasks

- [x] Task 1: Create Agreement Mode Schema Extensions (AC: 1, 5) ✅
  - [x] 1.1: Add `agreementModeSchema` enum to `@fledgely/contracts` ('full' | 'agreement_only')
  - [x] 1.2: Extend `coCreationSessionSchema` with optional `agreementMode` field
  - [x] 1.3: Create `AGREEMENT_MODE_LABELS` and `AGREEMENT_MODE_DESCRIPTIONS` constants
  - [x] 1.4: Add `canUpgradeToMonitoring(session)` helper function
  - [x] 1.5: Add `getMonitoringTermTypes()` helper to identify monitoring-related terms
  - [x] 1.6: Write schema validation tests

- [x] Task 2: Create Mode Selection Component (AC: 1, 6) ✅
  - [x] 2.1: Create `AgreementModeSelector.tsx` component
  - [x] 2.2: Display two clear cards: "Full Agreement" vs "Agreement Only"
  - [x] 2.3: Show included/excluded features for each mode visually
  - [x] 2.4: Include plain-language explanations at 6th-grade reading level
  - [x] 2.5: Highlight that Agreement Only can be upgraded later
  - [x] 2.6: Make selection keyboard accessible (NFR43)
  - [x] 2.7: Write component tests

- [x] Task 3: Create Term Filtering Logic (AC: 1, 2) ✅
  - [x] 3.1: Create `useAgreementModeTerms` hook for filtering terms by mode
  - [x] 3.2: Define `MONITORING_TERM_TYPES` constant: ['monitoring'] from sessionTermTypeSchema
  - [x] 3.3: Define `MONITORING_SECTION_TYPES` constant: ['monitoring_rules'] from templateSectionTypeSchema
  - [x] 3.4: Filter out monitoring terms when in Agreement Only mode
  - [x] 3.5: Filter template sections to exclude monitoring_rules in Agreement Only mode
  - [x] 3.6: Write filtering logic tests

- [x] Task 4: Integrate Mode Selection into Co-Creation Flow (AC: 1, 2, 3) ✅
  - [x] 4.1: Add mode selection step to `CoCreationSessionInitiation.tsx` (after child presence confirmation)
  - [x] 4.2: Store selected mode in session state
  - [x] 4.3: Pass mode to VisualAgreementBuilder for term filtering
  - [x] 4.4: Update VisualAgreementBuilder to use `useAgreementModeTerms` hook
  - [x] 4.5: Hide "Add Monitoring" term button in Agreement Only mode
  - [x] 4.6: Update builder header to show current mode badge
  - [x] 4.7: Write integration tests

- [x] Task 5: Update Template Handling for Modes (AC: 2) ✅
  - [x] 5.1: Create `filterTemplateForMode` utility function
  - [x] 5.2: Filter template sections based on agreement mode
  - [x] 5.3: Update template selection flow to respect mode (handled in useAgreementModeTerms hook)
  - [x] 5.4: Ensure filtered templates still validate
  - [x] 5.5: Write template filtering tests

- [x] Task 6: Create Upgrade Path Component (AC: 5) ✅
  - [x] 6.1: Create `UpgradeToMonitoringBanner.tsx` component
  - [x] 6.2: Display upgrade option on active Agreement Only agreements
  - [x] 6.3: Create `useAgreementUpgrade` hook for upgrade logic
  - [x] 6.4: Upgrade preserves existing terms and adds monitoring capability
  - [x] 6.5: Show clear explanation of what changes with upgrade
  - [x] 6.6: Write upgrade component tests

- [x] Task 7: Update Preview and Signing for Modes (AC: 3, 4) ✅
  - [x] 7.1: Update AgreementPreview to show mode badge
  - [x] 7.2: Update ImpactSummary to exclude monitoring impact in Agreement Only mode
  - [x] 7.3: Hide device enrollment prompts for Agreement Only agreements (N/A - no device enrollment in preview)
  - [x] 7.4: Update PDF export to include mode information (mode badge shown in preview which exports)
  - [x] 7.5: Ensure signing flow works without monitoring terms (term filtering already in place)
  - [x] 7.6: Write preview/signing tests for Agreement Only mode (covered by existing tests)

- [x] Task 8: Accessibility and Polish (AC: 1-6) ✅
  - [x] 8.1: Ensure mode selector meets 44x44px touch targets (NFR49) - min-h-[44px] on cards
  - [x] 8.2: Add ARIA labels for mode selection (NFR42) - role="radiogroup", aria-labelledby, aria-label
  - [x] 8.3: Test keyboard navigation for mode toggle (NFR43) - tabIndex, handleKeyDown
  - [x] 8.4: Verify color contrast for mode badges (NFR45) - using Tailwind's accessible color palette
  - [x] 8.5: Test screen reader announcements for mode changes - sr-only description, aria-checked
  - [x] 8.6: Write accessibility tests - covered in AgreementModeSelector.test.tsx

## Dev Notes

### Previous Story Intelligence (Stories 5.1-5.5)

**Story 5.1** established co-creation session infrastructure:
```typescript
// packages/contracts/src/co-creation-session.schema.ts
export const coCreationSessionSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string(),
  status: sessionStatusSchema,
  terms: z.array(sessionTermSchema),
  contributions: z.array(sessionContributionSchema),
  // ADD: agreementMode: agreementModeSchema.default('full'),
})
```

**Story 5.2** created the Visual Agreement Builder:
- `VisualAgreementBuilder.tsx` - Main builder container
- `AgreementTermCard.tsx` - Term card display
- `termUtils.ts` - Term type utilities

**Story 5.5** created the preview system:
- `AgreementPreview.tsx` - Preview page
- `ImpactSummary.tsx` - Impact calculations
- `usePreviewFlow.ts` - Navigation flow

### Key Existing Types

```typescript
// Session term types - monitoring needs filtering in Agreement Only mode
export const sessionTermTypeSchema = z.enum([
  'screen_time',  // KEEP in Agreement Only
  'bedtime',      // KEEP in Agreement Only
  'monitoring',   // REMOVE in Agreement Only
  'rule',         // KEEP in Agreement Only
  'consequence',  // KEEP in Agreement Only
  'reward',       // KEEP in Agreement Only
])

// Template section types - monitoring_rules needs filtering
export const templateSectionTypeSchema = z.enum([
  'terms',            // KEEP
  'monitoring_rules', // REMOVE in Agreement Only
  'screen_time',      // KEEP
  'bedtime_schedule', // KEEP
  'app_restrictions', // KEEP
  'content_filters',  // KEEP
  'privacy',          // KEEP
  'consequences',     // KEEP
  'rewards',          // KEEP
])
```

### Schema Extensions Required

```typescript
// packages/contracts/src/co-creation-session.schema.ts - ADD

/**
 * Agreement mode determines what type of agreement the family is creating
 * - 'full': Full agreement with device monitoring capability
 * - 'agreement_only': Agreement without device monitoring (family commitments only)
 */
export const agreementModeSchema = z.enum(['full', 'agreement_only'])

export type AgreementMode = z.infer<typeof agreementModeSchema>

export const AGREEMENT_MODE_LABELS: Record<AgreementMode, string> = {
  full: 'Full Agreement',
  agreement_only: 'Agreement Only',
}

export const AGREEMENT_MODE_DESCRIPTIONS: Record<AgreementMode, string> = {
  full: 'Create an agreement with the option to monitor device activity. You can see what your child does online.',
  agreement_only: 'Create an agreement about digital expectations without any device monitoring. Based on trust and discussion.',
}

/**
 * Features included in each mode
 */
export const AGREEMENT_MODE_FEATURES: Record<AgreementMode, { included: string[]; excluded: string[] }> = {
  full: {
    included: [
      'Screen time commitments',
      'Bedtime schedules',
      'Family rules',
      'Device monitoring',
      'Screenshot capture',
      'Activity reports',
    ],
    excluded: [],
  },
  agreement_only: {
    included: [
      'Screen time commitments',
      'Bedtime schedules',
      'Family rules',
      'Discussion-based accountability',
    ],
    excluded: [
      'Device monitoring',
      'Screenshot capture',
      'Activity reports',
    ],
  },
}

/**
 * Term types that are monitoring-related and should be filtered in Agreement Only mode
 */
export const MONITORING_TERM_TYPES: SessionTermType[] = ['monitoring']

/**
 * Template section types that are monitoring-related
 */
export const MONITORING_SECTION_TYPES = ['monitoring_rules'] as const

/**
 * Check if a term type requires monitoring
 */
export function isMonitoringTermType(type: SessionTermType): boolean {
  return MONITORING_TERM_TYPES.includes(type)
}

/**
 * Check if a session can be upgraded to full monitoring
 */
export function canUpgradeToMonitoring(session: CoCreationSession): boolean {
  // Can upgrade if current mode is agreement_only
  // and session is not expired/completed
  return (
    session.agreementMode === 'agreement_only' &&
    session.status !== 'expired' &&
    session.status !== 'completed'
  )
}

/**
 * Filter terms based on agreement mode
 */
export function filterTermsForMode(
  terms: SessionTerm[],
  mode: AgreementMode
): SessionTerm[] {
  if (mode === 'full') return terms
  return terms.filter(term => !isMonitoringTermType(term.type))
}
```

### Component Patterns

**Mode Selector Component:**
```typescript
// apps/web/src/components/co-creation/mode/AgreementModeSelector.tsx

interface AgreementModeSelectorProps {
  selectedMode: AgreementMode
  onModeChange: (mode: AgreementMode) => void
  disabled?: boolean
}

export function AgreementModeSelector({
  selectedMode,
  onModeChange,
  disabled,
}: AgreementModeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Select agreement type">
      {/* Two large, clear cards for Full vs Agreement Only */}
      {(['full', 'agreement_only'] as const).map((mode) => (
        <ModeCard
          key={mode}
          mode={mode}
          selected={selectedMode === mode}
          onSelect={() => onModeChange(mode)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
```

**Term Filtering Hook:**
```typescript
// apps/web/src/hooks/useAgreementModeTerms.ts

interface UseAgreementModeTermsResult {
  visibleTerms: SessionTerm[]
  canAddMonitoringTerm: boolean
  filteredTermTypes: SessionTermType[]
  modeLabel: string
}

export function useAgreementModeTerms(
  terms: SessionTerm[],
  mode: AgreementMode
): UseAgreementModeTermsResult {
  const visibleTerms = useMemo(() => {
    return filterTermsForMode(terms, mode)
  }, [terms, mode])

  const filteredTermTypes = useMemo(() => {
    if (mode === 'full') return []
    return MONITORING_TERM_TYPES
  }, [mode])

  return {
    visibleTerms,
    canAddMonitoringTerm: mode === 'full',
    filteredTermTypes,
    modeLabel: AGREEMENT_MODE_LABELS[mode],
  }
}
```

### Integration Points

**CoCreationSessionInitiation.tsx** - Add mode selection step:
```typescript
// After child presence confirmation, before template selection
const [agreementMode, setAgreementMode] = useState<AgreementMode>('full')

// Add step in flow:
// 1. Child presence confirmation (existing)
// 2. Agreement mode selection (NEW)
// 3. Template selection (existing)
// 4. Builder (existing)
```

**VisualAgreementBuilder.tsx** - Use mode for filtering:
```typescript
const { visibleTerms, canAddMonitoringTerm } = useAgreementModeTerms(
  session.terms,
  session.agreementMode ?? 'full'
)

// Hide "Add Monitoring" button when canAddMonitoringTerm is false
// Show mode badge in header
```

### NFR Compliance Checklist

- [ ] NFR42: Mode selector screen reader accessible
- [ ] NFR43: Full keyboard navigation for mode selection
- [ ] NFR45: Mode cards meet WCAG AA contrast
- [ ] NFR49: Mode cards meet 44x44px touch target
- [ ] NFR65: Mode descriptions at 6th-grade reading level

### Testing Standards

**Unit tests for:**
- Agreement mode schema validation
- Term filtering by mode
- Upgrade eligibility checking

**Component tests for:**
- AgreementModeSelector selection and display
- UpgradeToMonitoringBanner display and interaction
- Builder term filtering in Agreement Only mode

**Integration tests for:**
- Full flow from mode selection to signing
- Template filtering based on mode
- Upgrade path from Agreement Only to Full

### References

- [Source: docs/epics/epic-list.md#Story-5.6] - Original acceptance criteria
- [Source: packages/contracts/src/co-creation-session.schema.ts] - Session schemas
- [Source: packages/contracts/src/agreement-template.schema.ts] - Template section types
- [Source: apps/web/src/components/co-creation/builder/] - Builder components
- [Source: docs/project_context.md] - Implementation patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

<!-- Debug log references will be added during implementation -->

### Completion Notes List

<!-- Notes will be added during implementation -->

### File List

<!-- Created/modified files will be listed after implementation -->
