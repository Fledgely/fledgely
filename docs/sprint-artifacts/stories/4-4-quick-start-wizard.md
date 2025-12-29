# Story 4.4: Quick Start Wizard

Status: done

## Story

As a **parent new to fledgely**,
I want **a guided quick start that helps me create my first agreement in under 10 minutes**,
So that **I don't feel overwhelmed and can start protecting my child quickly**.

## Acceptance Criteria

1. **AC1: Child Age Detection**
   - Given a parent has added their first child (Epic 2) and needs to create an agreement
   - When they start the quick start wizard
   - Then wizard asks child's age and pre-selects appropriate template
   - And age selection shows friendly age group labels (Ages 5-7, 8-10, 11-13, 14-16)

2. **AC2: Key Decision Steps**
   - Given a parent is in the quick start wizard
   - When they proceed through the steps
   - Then wizard presents 3-5 key decisions (screen time, bedtime cutoff, monitoring level)
   - And defaults are pre-populated from selected template (parent can adjust or accept)
   - And each decision uses clear, simple language (6th-grade reading level)

3. **AC3: Progress Indicator**
   - Given a parent is using the quick start wizard
   - When they navigate through steps
   - Then wizard uses progress indicator showing current step and total steps
   - And estimated time remaining is displayed ("About 3 minutes left")
   - And progress is visually clear with step names

4. **AC4: 10-Minute Completion**
   - Given a parent uses the wizard with default selections
   - When they complete the wizard
   - Then wizard can be completed in under 10 minutes with defaults (NFR59)
   - And wizard ends with agreement preview before proceeding to co-creation (Epic 5)

5. **AC5: Keyboard Navigation**
   - Given a parent uses keyboard navigation
   - When navigating the wizard
   - Then all controls are keyboard accessible (NFR43)
   - And touch targets are 44px minimum (NFR49)
   - And focus indicators are visible (NFR46)

6. **AC6: Screen Reader Accessibility**
   - Given a parent uses assistive technology
   - When using the wizard
   - Then step changes are announced to screen readers
   - And form fields have proper labels
   - And error messages are accessible

## Tasks / Subtasks

- [x] Task 1: Create QuickStartWizard Component (AC: #1, #3, #4, #5, #6)
  - [x] 1.1 Create apps/web/src/components/wizard/QuickStartWizard.tsx
  - [x] 1.2 Implement multi-step wizard container with step navigation
  - [x] 1.3 Add progress indicator with step names and completion percentage
  - [x] 1.4 Add estimated time remaining display ("About X minutes left")
  - [x] 1.5 Implement keyboard navigation between steps
  - [x] 1.6 Add accessible step change announcements via aria-live
  - [x] 1.7 Create component tests (18 tests)

- [x] Task 2: Create AgeSelectionStep Component (AC: #1)
  - [x] 2.1 Create apps/web/src/components/wizard/steps/AgeSelectionStep.tsx
  - [x] 2.2 Display child's current age (if from child profile) or allow selection
  - [x] 2.3 Show age group cards with friendly labels (Ages 5-7, etc.)
  - [x] 2.4 Pre-select recommended template based on age group
  - [x] 2.5 Show template preview summary for selected age
  - [x] 2.6 Create component tests (13 tests)

- [x] Task 3: Create ScreenTimeStep Component (AC: #2)
  - [x] 3.1 Create apps/web/src/components/wizard/steps/ScreenTimeStep.tsx
  - [x] 3.2 Display pre-populated screen time limits from template
  - [x] 3.3 Add slider or input controls for weekday/weekend limits
  - [x] 3.4 Show time in friendly format (1h 30m, not 90 minutes)
  - [x] 3.5 Include helper text explaining the recommendation
  - [x] 3.6 Create component tests (17 tests)

- [x] Task 4: Create BedtimeCutoffStep Component (AC: #2)
  - [x] 4.1 Create apps/web/src/components/wizard/steps/BedtimeCutoffStep.tsx
  - [x] 4.2 Display pre-populated bedtime from template
  - [x] 4.3 Add time picker for weekday/weekend bedtimes
  - [x] 4.4 Include "No bedtime limit" option for older teens
  - [x] 4.5 Show explanation of bedtime enforcement
  - [x] 4.6 Create component tests (17 tests)

- [x] Task 5: Create MonitoringLevelStep Component (AC: #2)
  - [x] 5.1 Create apps/web/src/components/wizard/steps/MonitoringLevelStep.tsx
  - [x] 5.2 Display monitoring level options (High, Medium, Low)
  - [x] 5.3 Pre-select based on template's monitoringLevel
  - [x] 5.4 Show clear explanation of what each level means
  - [x] 5.5 Use visual cards with icons for each level
  - [x] 5.6 Create component tests (19 tests)

- [x] Task 6: Create AgreementPreviewStep Component (AC: #4)
  - [x] 6.1 Create apps/web/src/components/wizard/steps/AgreementPreviewStep.tsx
  - [x] 6.2 Display summary of all selections made
  - [x] 6.3 Show template name and customizations applied
  - [x] 6.4 Add "Edit" links to go back to specific steps
  - [x] 6.5 Add "Start Co-Creation" button (prepares for Epic 5)
  - [x] 6.6 Create component tests (26 tests)

- [x] Task 7: Create useQuickStartWizard Hook (AC: #1, #2, #3, #4)
  - [x] 7.1 Create apps/web/src/hooks/useQuickStartWizard.ts
  - [x] 7.2 Track current step index and total steps
  - [x] 7.3 Store wizard state (age, screenTime, bedtime, monitoringLevel)
  - [x] 7.4 Calculate estimated time remaining based on steps left
  - [x] 7.5 Provide navigation functions (next, prev, goToStep)
  - [x] 7.6 Integrate with AGREEMENT_TEMPLATES for template data
  - [x] 7.7 Create hook tests (25 tests)

- [x] Task 8: Integration and Page Setup (AC: All)
  - [x] 8.1 Created barrel export index.ts for wizard components
  - [x] 8.2 Connect wizard to child data (pass childAge for age detection)
  - [x] 8.3 Wizard result passed to onComplete callback for Epic 5
  - [x] 8.4 Navigation via parent component
  - [x] 8.5 ProgressIndicator component created (14 tests)
  - [x] 8.6 Create integration tests

## Dev Notes

### Technical Requirements

- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **UI Framework:** React + Tailwind CSS (per project_context.md)
- **State Management:** React hooks (useQuickStartWizard)
- **Accessibility:** WCAG 2.1 AA, keyboard navigation, screen reader support

### Wizard Step Structure

```typescript
// apps/web/src/components/wizard/QuickStartWizard.tsx
interface WizardStep {
  id: string
  name: string
  component: React.ComponentType<WizardStepProps>
  estimatedMinutes: number
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'age', name: 'Child Age', component: AgeSelectionStep, estimatedMinutes: 1 },
  { id: 'screenTime', name: 'Screen Time', component: ScreenTimeStep, estimatedMinutes: 2 },
  { id: 'bedtime', name: 'Bedtime', component: BedtimeCutoffStep, estimatedMinutes: 1 },
  { id: 'monitoring', name: 'Monitoring', component: MonitoringLevelStep, estimatedMinutes: 2 },
  { id: 'preview', name: 'Review', component: AgreementPreviewStep, estimatedMinutes: 2 },
]
```

### Wizard State Hook Pattern

```typescript
// apps/web/src/hooks/useQuickStartWizard.ts
interface QuickStartState {
  childAge: number | null
  ageGroup: AgeGroup | null
  selectedTemplateId: string | null
  screenTimeLimits: { weekday: number; weekend: number }
  bedtimeCutoff: { weekday: string; weekend: string } | null
  monitoringLevel: MonitoringLevel
}

export function useQuickStartWizard(initialTemplateId?: string) {
  const [currentStep, setCurrentStep] = useState(0)
  const [state, setState] = useState<QuickStartState>({...})

  const estimatedTimeRemaining = useMemo(() => {
    const remainingSteps = WIZARD_STEPS.slice(currentStep)
    return remainingSteps.reduce((sum, step) => sum + step.estimatedMinutes, 0)
  }, [currentStep])

  // ... navigation and state updates
}
```

### Previous Story Intelligence

From Story 4.1, 4.2, 4.3 completion:

- TemplateCard, TemplateLibrary, TemplatePreviewModal components exist
- useTemplateSelection and useTemplateComparison hooks exist
- AGE_GROUP_LABELS, MONITORING_LEVEL_LABELS mappings available in data/templates.ts
- 11 templates with age-appropriate content for all age groups
- Radix Dialog pattern established for modals
- 391 total tests passing

**Key Patterns to Reuse:**

- formatMinutes() function from TemplatePreviewModal for time display
- AGE_GROUP_LABELS for friendly age group names
- MONITORING_LEVEL_LABELS for monitoring descriptions
- 44px min touch targets on all buttons
- Tailwind focus:ring-2 focus:ring-primary pattern for focus states

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - use existing AgreementTemplate type, extend as needed
- Components in `components/wizard/` folder
- Steps in `components/wizard/steps/` subfolder
- Tests co-located with components

### Library/Framework Requirements

| Dependency  | Version | Purpose                          |
| ----------- | ------- | -------------------------------- |
| react       | ^18.x   | UI framework (already installed) |
| tailwindcss | ^3.x    | Styling (already installed)      |

### File Structure Requirements

```
apps/web/src/
├── hooks/
│   └── useQuickStartWizard.ts        # NEW - Wizard state management
├── components/
│   └── wizard/
│       ├── QuickStartWizard.tsx      # NEW - Main wizard container
│       ├── QuickStartWizard.test.tsx # NEW - Wizard tests
│       ├── ProgressIndicator.tsx     # NEW - Step progress component
│       ├── steps/
│       │   ├── AgeSelectionStep.tsx      # NEW
│       │   ├── ScreenTimeStep.tsx        # NEW
│       │   ├── BedtimeCutoffStep.tsx     # NEW
│       │   ├── MonitoringLevelStep.tsx   # NEW
│       │   └── AgreementPreviewStep.tsx  # NEW
│       └── index.ts                  # NEW - Barrel export
├── app/
│   └── wizard/
│       └── page.tsx                  # NEW - Wizard page (optional)
```

### Testing Requirements

- Unit test wizard step navigation
- Unit test progress indicator calculations
- Unit test each step component rendering
- Unit test state management hook
- Unit test keyboard navigation
- Unit test screen reader announcements
- Component tests for accessibility

### NFR References

- NFR43: Keyboard navigable
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Focus indicators visible
- NFR49: 44x44px minimum touch target
- NFR59: 10-minute first draft completion
- NFR65: 6th-grade reading level

### References

- [Source: docs/epics/epic-list.md#Story-4.4]
- [Source: docs/epics/epic-list.md#Epic-4]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/sprint-artifacts/stories/4-1-template-library-structure.md]
- [Source: docs/sprint-artifacts/stories/4-2-age-appropriate-template-content.md]
- [Source: docs/sprint-artifacts/stories/4-3-template-preview-selection.md]

## Dev Agent Record

### Context Reference

- Epic: 4 (Agreement Templates & Quick Start)
- Sprint: 2 (Feature Development)
- Story Key: 4-4-quick-start-wizard
- Depends On: Story 4.1, 4.2, 4.3 (Template Library, Age Content, Preview/Selection)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

1. Created complete Quick Start Wizard with 5-step flow (Age, Screen Time, Bedtime, Monitoring, Review)
2. Implemented ProgressIndicator with step names and time remaining display
3. All step components use template defaults and allow customization
4. BedtimeCutoffStep includes "No bedtime limit" option for teens (14-16)
5. AgreementPreviewStep displays all selections with Edit links for each step
6. useQuickStartWizard hook manages state, navigation, and template integration
7. 149 wizard-specific tests passing (from 535 total)
8. All components meet WCAG 2.1 AA requirements (44px touch targets, keyboard nav, aria-labels)
9. Fixed test compatibility: converted jest.fn() to vi.fn() for Vitest
10. Fixed template data access: templates have screenTimeLimits/monitoringLevel directly, not in .defaults

### File List

#### New Files Created

- apps/web/src/hooks/useQuickStartWizard.ts (242 lines)
- apps/web/src/hooks/**tests**/useQuickStartWizard.test.ts (25 tests)
- apps/web/src/components/wizard/QuickStartWizard.tsx (149 lines)
- apps/web/src/components/wizard/**tests**/QuickStartWizard.test.tsx (18 tests)
- apps/web/src/components/wizard/ProgressIndicator.tsx (~115 lines)
- apps/web/src/components/wizard/**tests**/ProgressIndicator.test.tsx (14 tests)
- apps/web/src/components/wizard/steps/AgeSelectionStep.tsx (124 lines)
- apps/web/src/components/wizard/steps/**tests**/AgeSelectionStep.test.tsx (13 tests)
- apps/web/src/components/wizard/steps/ScreenTimeStep.tsx (~130 lines)
- apps/web/src/components/wizard/steps/**tests**/ScreenTimeStep.test.tsx (17 tests)
- apps/web/src/components/wizard/steps/BedtimeCutoffStep.tsx (~155 lines)
- apps/web/src/components/wizard/steps/**tests**/BedtimeCutoffStep.test.tsx (17 tests)
- apps/web/src/components/wizard/steps/MonitoringLevelStep.tsx (203 lines)
- apps/web/src/components/wizard/steps/**tests**/MonitoringLevelStep.test.tsx (19 tests)
- apps/web/src/components/wizard/steps/AgreementPreviewStep.tsx (~170 lines)
- apps/web/src/components/wizard/steps/**tests**/AgreementPreviewStep.test.tsx (26 tests)
- apps/web/src/components/wizard/index.ts (15 lines)
- apps/web/src/utils/formatTime.ts (40 lines) - Code review fix: extracted shared utility

#### Files Modified

None (all new component additions)

### Code Review Fixes Applied

1. Added aria-live region for screen reader step change announcements (AC6)
2. Fixed BedtimeCutoffStep state sync issue (derived from prop)
3. Added 44px touch target wrapper on ScreenTimeStep sliders (NFR49)
4. Extracted formatMinutes/formatTime24to12 to shared utils/formatTime.ts

## Change Log

| Date       | Change                              |
| ---------- | ----------------------------------- |
| 2025-12-28 | Story created (ready-for-dev)       |
| 2025-12-28 | Dev complete: 535 tests passing     |
| 2025-12-28 | Code review complete, fixes applied |
| 2025-12-28 | Status: done                        |
