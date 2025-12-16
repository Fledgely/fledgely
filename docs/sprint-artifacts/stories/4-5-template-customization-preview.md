# Story 4.5: Template Customization Preview

Status: ready-for-dev

## Story

As a **parent**,
I want **to customize a template before co-creating with my child**,
So that **I can prepare my suggested changes without starting from scratch**.

## Acceptance Criteria

1. **Given** a parent has selected a template **When** they choose to customize before co-creation **Then** they can modify any template field (screen time, rules, monitoring)
2. **Given** customization is in progress **When** parent views the editor **Then** changes are highlighted compared to original template
3. **Given** the customization editor is open **When** parent needs additional rules **Then** they can add custom rules not in template
4. **Given** the customization editor is open **When** parent doesn't want certain rules **Then** they can remove template rules they don't want
5. **Given** a parent has made customizations **When** they save or navigate away **Then** customized template is saved as "draft" for this child
6. **Given** a draft exists **When** parent returns to the customization editor **Then** draft persists until co-creation begins
7. **Given** a parent has made customizations **When** they want to start over **Then** parent can revert to original template at any time

## Tasks / Subtasks

- [ ] Task 1: Create Template Customization Editor component (AC: 1, 2)
  - [ ] 1.1: Create `TemplateCustomizationEditor.tsx` main container component
  - [ ] 1.2: Create `CustomizationHeader.tsx` with template name and revert button
  - [ ] 1.3: Create field editor sections (screen time, rules, monitoring)
  - [ ] 1.4: Implement diff highlighting to show changes vs original template
  - [ ] 1.5: Add visual indicators for modified, added, and removed items
  - [ ] 1.6: Write tests for editor container (15+ tests)

- [ ] Task 2: Implement Screen Time Customization (AC: 1, 2)
  - [ ] 2.1: Create `ScreenTimeEditor.tsx` with slider/preset options
  - [ ] 2.2: Show original value vs current value comparison
  - [ ] 2.3: Display impact preview ("X hours per week total")
  - [ ] 2.4: Support weekday/weekend differentiation
  - [ ] 2.5: Write tests for screen time editor (10+ tests)

- [ ] Task 3: Implement Rules Customization (AC: 1, 3, 4)
  - [ ] 3.1: Create `RulesEditor.tsx` for rule management
  - [ ] 3.2: Display template rules with enable/disable toggles
  - [ ] 3.3: Implement "Add Custom Rule" functionality with form
  - [ ] 3.4: Implement "Remove Rule" with confirmation
  - [ ] 3.5: Show diff indicators (original, modified, added, removed)
  - [ ] 3.6: Write tests for rules editor (15+ tests)

- [ ] Task 4: Implement Monitoring Level Customization (AC: 1, 2)
  - [ ] 4.1: Create `MonitoringEditor.tsx` with level selector
  - [ ] 4.2: Show original vs selected level comparison
  - [ ] 4.3: Display privacy explanation for each level
  - [ ] 4.4: Add tooltip explaining what each level means
  - [ ] 4.5: Write tests for monitoring editor (8+ tests)

- [ ] Task 5: Implement Draft Persistence (AC: 5, 6)
  - [ ] 5.1: Create `useTemplateDraft` hook for draft state management
  - [ ] 5.2: Persist draft to sessionStorage with child ID key
  - [ ] 5.3: Auto-save on field changes (debounced)
  - [ ] 5.4: Load existing draft when editor opens
  - [ ] 5.5: Clear draft when co-creation begins
  - [ ] 5.6: Write tests for draft persistence (10+ tests)

- [ ] Task 6: Implement Revert Functionality (AC: 7)
  - [ ] 6.1: Add "Revert to Original" button with confirmation dialog
  - [ ] 6.2: Show diff summary before revert ("You will lose X changes")
  - [ ] 6.3: Restore all original template values on confirm
  - [ ] 6.4: Clear modified/added/removed tracking on revert
  - [ ] 6.5: Write tests for revert functionality (8+ tests)

- [ ] Task 7: Integration with Template Preview (AC: 1-7)
  - [ ] 7.1: Add "Customize" button to TemplatePreviewDialog
  - [ ] 7.2: Connect customization editor to existing template selection flow
  - [ ] 7.3: Pass customized draft to Epic 5 co-creation flow
  - [ ] 7.4: Update TemplateCard to show "Draft" badge when draft exists
  - [ ] 7.5: Write integration tests (10+ tests)

- [ ] Task 8: Accessibility and Polish (AC: 1-7)
  - [ ] 8.1: Ensure keyboard navigation works for all editors
  - [ ] 8.2: Add ARIA labels for diff indicators
  - [ ] 8.3: Implement focus management when adding/removing rules
  - [ ] 8.4: Ensure touch targets meet 44x44px minimum (NFR49)
  - [ ] 8.5: Ensure color contrast 4.5:1 for diff highlighting (NFR45)
  - [ ] 8.6: Write accessibility tests (10+ tests)

## Dev Notes

### Previous Story Intelligence (Story 4.4)

**Story 4.4** created the Quick Start Wizard:
- **QuickStartWizardProvider.tsx** - React Context for UI state with sessionStorage persistence
- **WizardDraft type** - Structure for passing customizations to Epic 5
- **Decision step patterns** - ScreenTimeDecisionStep, BedtimeCutoffStep, MonitoringLevelStep
- **169 passing tests** across all wizard components

**Pattern to Follow:**
```typescript
// Use React Context for UI-only state (per project_context.md Rule 4)
// Persist to sessionStorage for page refresh handling
const STORAGE_KEY = 'template-draft-{childId}'
```

### Architecture Patterns

**Component Structure:**
```
apps/web/src/components/templates/
├── customization/
│   ├── TemplateCustomizationEditor.tsx    (Main container)
│   ├── CustomizationHeader.tsx            (Title + revert button)
│   ├── ScreenTimeEditor.tsx               (Screen time customization)
│   ├── RulesEditor.tsx                    (Rules add/remove/toggle)
│   ├── MonitoringEditor.tsx               (Monitoring level)
│   ├── DiffIndicator.tsx                  (Visual diff markers)
│   ├── CustomRuleForm.tsx                 (Add custom rule modal)
│   └── __tests__/
│       ├── TemplateCustomizationEditor.test.tsx
│       ├── ScreenTimeEditor.test.tsx
│       ├── RulesEditor.test.tsx
│       ├── MonitoringEditor.test.tsx
│       └── TemplateCustomization.integration.test.tsx
├── hooks/
│   └── useTemplateDraft.ts                (Draft state + persistence)
└── [existing files]
```

**Draft State Structure:**
```typescript
interface TemplateDraft {
  templateId: string
  childId: string
  originalTemplate: AgreementTemplate  // For comparison
  customizations: {
    screenTimeMinutes: number | null    // null = use original
    weekendScreenTimeMinutes: number | null
    bedtimeCutoff: string | null
    monitoringLevel: MonitoringLevel | null
    rules: {
      enabled: string[]    // IDs of enabled template rules
      disabled: string[]   // IDs of disabled template rules
      custom: CustomRule[] // User-added rules
    }
  }
  modifiedAt: string
  createdAt: string
}

interface CustomRule {
  id: string  // Generated UUID
  title: string
  description: string
  category: 'time' | 'apps' | 'monitoring' | 'other'
}
```

**Diff Highlighting Patterns:**
```typescript
// Visual indicators for changes
const DIFF_STYLES = {
  original: 'bg-transparent',           // Unchanged from template
  modified: 'bg-amber-50 border-amber-200', // Value changed
  added: 'bg-green-50 border-green-200',    // Custom addition
  removed: 'bg-red-50 border-red-200 line-through', // Disabled/removed
}
```

### Existing Components to Reuse

From Story 4.4 Quick Start Wizard:
- **Slider/preset pattern** from ScreenTimeDecisionStep
- **Time picker pattern** from BedtimeCutoffStep
- **Level selector pattern** from MonitoringLevelStep
- **sessionStorage persistence** pattern from QuickStartWizardProvider

From Story 4.3:
- **TemplatePreviewDialog** - Add "Customize" button
- **Template selection state** via useTemplateSelection hook

### Testing Standards

Per project_context.md:
- Unit tests co-located with components (*.test.tsx)
- Use Vitest + React Testing Library
- Mock sessionStorage in tests
- Test accessibility with ARIA queries

**Test Coverage Targets:**
- ScreenTimeEditor: 10+ tests
- RulesEditor: 15+ tests
- MonitoringEditor: 8+ tests
- Draft persistence: 10+ tests
- Revert functionality: 8+ tests
- Integration: 10+ tests
- Accessibility: 10+ tests
- **Total: 75+ tests**

### Key Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @fledgely/contracts | workspace | Template types, AgreementTemplate |
| react-hook-form | ^7.x | Form handling for custom rules |
| uuid | ^9.x | Generate IDs for custom rules |
| shadcn/ui | latest | Slider, Dialog, Switch, Button |

### NFR Compliance Checklist

- [ ] NFR29: Editor loads within 1 second
- [ ] NFR42: All editor elements screen reader accessible
- [ ] NFR43: All elements keyboard navigable
- [ ] NFR45: Color contrast 4.5:1 for diff highlighting
- [ ] NFR46: Visible keyboard focus indicators
- [ ] NFR49: Touch targets 44x44px minimum
- [ ] NFR59: Draft auto-saves without user action

### References

- [Source: docs/epics/epic-list.md#Story-4.5] - Original acceptance criteria
- [Source: docs/sprint-artifacts/stories/4-4-quick-start-wizard.md] - Wizard patterns
- [Source: apps/web/src/components/templates/TemplatePreviewDialog.tsx] - Preview integration
- [Source: apps/web/src/components/quick-start/QuickStartWizardProvider.tsx] - Context pattern
- [Source: docs/project_context.md] - Implementation patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

Ultimate context engine analysis completed - comprehensive developer guide created

### File List

