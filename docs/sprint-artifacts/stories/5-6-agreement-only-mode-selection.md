# Story 5.6: Agreement-Only Mode Selection

Status: done

## Story

As a **parent**,
I want **to choose agreement-only mode without device monitoring**,
So that **we can establish digital expectations without surveillance**.

## Acceptance Criteria

1. **AC1: Mode Selection Interface**
   - Given a family is creating an agreement
   - When parent views the co-creation options
   - Then they see clear choice between "Agreement Only" and "Agreement + Monitoring"
   - And mode differences are clearly explained

2. **AC2: Monitoring Terms Removal**
   - Given parent selects "Agreement Only" mode
   - When viewing the agreement builder
   - Then monitoring-related terms are removed from available options
   - And monitoring category is hidden from term categories

3. **AC3: Agreement Focus Areas**
   - Given "Agreement Only" mode is selected
   - When building the agreement
   - Then agreement focuses on: screen time commitments, app expectations, family rules
   - And templates are filtered to exclude monitoring-specific content

4. **AC4: No Device Enrollment**
   - Given "Agreement Only" mode is active
   - When completing the agreement
   - Then no device enrollment is required or suggested
   - And enrollment CTAs are hidden in agreement flow

5. **AC5: Upgrade Path**
   - Given a family has an "Agreement Only" agreement
   - When they decide to add monitoring later
   - Then they can upgrade without re-creating the entire agreement
   - And existing terms are preserved during upgrade

6. **AC6: Mode Explanation**
   - Given user is choosing a mode
   - When viewing the selection screen
   - Then clear explanation shows what's included vs. excluded in each mode
   - And child-friendly language explains the difference (NFR65)

## Tasks / Subtasks

- [x] Task 1: Create Agreement Mode Schema (AC: #1)
  - [x] 1.1 Add agreementModeSchema to contracts (agreement_only, full_monitoring)
  - [x] 1.2 Add mode field to coCreationSessionSchema
  - [x] 1.3 Create AGREEMENT_MODE_CATEGORIES constant

- [x] Task 2: Create Mode Selection Component (AC: #1, #6)
  - [x] 2.1 Create AgreementModeSelector component with two cards
  - [x] 2.2 Display clear mode comparison (what's included/excluded)
  - [x] 2.3 Use child-friendly language for explanations (NFR65)
  - [x] 2.4 Add visual distinction (icons, colors) for each mode

- [x] Task 3: Filter Monitoring Terms (AC: #2, #3)
  - [x] 3.1 Create useFilteredTermCategories hook
  - [x] 3.2 Hide 'monitoring' category when agreement_only mode
  - [x] 3.3 Filter template terms based on mode
  - [x] 3.4 useFilteredTermCategories integrates with builder

- [x] Task 4: Template Filtering (AC: #3)
  - [x] 4.1 Filter by monitoringLevel in useFilteredTemplates
  - [x] 4.2 Create useFilteredTemplates hook
  - [x] 4.3 Hide high monitoring templates in agreement_only mode
  - [x] 4.4 Return filtered count for UI

- [x] Task 5: Hide Device Enrollment (AC: #4)
  - [x] 5.1 Create useAgreementMode context hook
  - [x] 5.2 shouldShowEnrollment flag based on mode
  - [x] 5.3 shouldShowMonitoringTerms flag based on mode

- [x] Task 6: Create Upgrade Path (AC: #5)
  - [x] 6.1 Create UpgradeToMonitoringModal component
  - [x] 6.2 Modal shows existing terms preserved
  - [x] 6.3 Confirmation checkbox required
  - [x] 6.4 canUpgradeToMonitoring in useAgreementMode

- [x] Task 7: Unit Tests (AC: All)
  - [x] 7.1 Test AgreementModeSelector component (26 tests)
  - [x] 7.2 Test useFilteredTermCategories hook (18 tests)
  - [x] 7.3 Test useFilteredTemplates hook (18 tests)
  - [x] 7.4 Test UpgradeToMonitoringModal component (27 tests)
  - [x] 7.5 Test useAgreementMode hook (21 tests)

## Dev Notes

### Technical Requirements

- **Zod Schemas:** Add mode to coCreationSessionSchema
- **State Management:** Mode selection persisted in session
- **UI Components:** Follow existing card patterns from Epic 4

### Previous Story Intelligence

From Story 5.5 completion:

- AgreementPreview renders complete agreement with all terms
- Term categories include: 'time', 'apps', 'monitoring', 'rewards', 'general'
- 'monitoring' category needs conditional filtering
- Preview scroll tracking and confirmation flow already works

From Story 5.2:

- VisualAgreementBuilder manages term display
- termCategorySchema defines available categories
- Category colors/icons already defined

Key learning: Mode should be set at session initiation (5.1) and persist throughout co-creation.

### Mode Definitions

| Mode            | Description                               | Includes                                           |
| --------------- | ----------------------------------------- | -------------------------------------------------- |
| Agreement Only  | Digital expectations without surveillance | Screen time, App rules, Family agreements, Rewards |
| Full Monitoring | Complete protection with device tracking  | All above + Screenshots, Activity tracking, Alerts |

### Schema Updates

```typescript
// Add to packages/shared/src/contracts/index.ts

export const agreementModeSchema = z.enum(['agreement_only', 'full_monitoring'])
export type AgreementMode = z.infer<typeof agreementModeSchema>

// Update coCreationSessionSchema to include:
// mode: agreementModeSchema.default('full_monitoring')
```

### Mode Selection UI

```tsx
// Two-card layout with clear visual distinction
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <ModeCard
    mode="agreement_only"
    icon={<DocumentIcon />}
    title="Agreement Only"
    description="Set screen time rules and family expectations together"
    features={['Screen time limits', 'App rules', 'Family agreements']}
    excluded={['Device monitoring', 'Screenshots', 'Activity tracking']}
  />
  <ModeCard
    mode="full_monitoring"
    icon={<ShieldIcon />}
    title="Agreement + Monitoring"
    description="Full protection with device tracking and alerts"
    features={['All agreement features', 'Device enrollment', 'Screenshots', 'Activity alerts']}
  />
</div>
```

### File Structure

```
apps/web/src/components/agreements/
├── AgreementModeSelector.tsx     # NEW - Mode selection cards
├── UpgradeToMonitoringModal.tsx  # NEW - Upgrade confirmation
├── __tests__/
│   ├── AgreementModeSelector.test.tsx
│   └── UpgradeToMonitoringModal.test.tsx
apps/web/src/hooks/
├── useFilteredTermCategories.ts  # NEW - Category filtering by mode
├── useFilteredTemplates.ts       # NEW - Template filtering by mode
├── useAgreementMode.ts           # NEW - Mode context hook
└── __tests__/
    ├── useFilteredTermCategories.test.ts
    ├── useFilteredTemplates.test.ts
    └── useAgreementMode.test.ts
```

### Upgrade Flow

1. User views existing "Agreement Only" agreement
2. Clicks "Add Monitoring" button
3. Modal explains what monitoring adds
4. On confirmation:
   - Session mode changes to 'full_monitoring'
   - Monitoring terms become available
   - User can add monitoring-specific terms
   - Original terms are preserved

### Dependencies

- Story 5.1 components (CoCreationSessionContext)
- Story 5.2 components (VisualAgreementBuilder, termCategorySchema)
- Story 4.3 components (Template selection)
- Zod schemas from @fledgely/shared/contracts

### NFR References

- NFR65: 6th-grade reading level for mode explanations
- NFR42: WCAG 2.1 AA compliance for mode selection UI
- NFR60: Mode filtering doesn't affect 100 term limit

### Accessibility Requirements

- Mode selection must have 44px+ touch targets
- Clear focus states on mode cards
- ARIA labels for mode selection ("Select agreement mode")
- Screen reader announces selected mode

## Change Log

| Date       | Change        |
| ---------- | ------------- |
| 2025-12-29 | Story created |
