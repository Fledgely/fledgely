# Story 4.2: Age-Appropriate Template Content

Status: ready-for-dev

## Story

As a **parent**,
I want **templates to have age-appropriate language and rules**,
So that **the agreement makes sense to my child and fits their developmental stage**.

## Acceptance Criteria

1. **Given** a parent selects a template for a specific age group **When** template content is displayed **Then** language complexity matches the child's age (6th-grade max per NFR65)
2. **Given** template content is displayed **When** viewing any template **Then** screen time defaults are age-appropriate (younger = less, older = more)
3. **Given** template content is displayed **When** viewing any template **Then** monitoring intensity defaults decrease with age (younger = more comprehensive)
4. **Given** template content is displayed **When** viewing any template **Then** rule explanations use examples relevant to that age group
5. **Given** a parent views templates for ages 14-16 **When** template content displays **Then** templates include earned autonomy milestones (per Reverse Mode path from Epic 52)
6. **Given** a parent views templates for ages 5-7 **When** template content displays **Then** templates emphasize visual elements and simple yes/no rules

## Tasks / Subtasks

- [ ] Task 1: Enhance ages 5-7 templates with visual elements emphasis (AC: 6)
  - [ ] 1.1: Add visual icon indicators to template sections (emoji or icon hints in descriptions)
  - [ ] 1.2: Simplify language to simple yes/no rules where possible
  - [ ] 1.3: Add `visualElements` field to TemplateSection schema for rendering hints
  - [ ] 1.4: Create age-5-7 specific examples (playground games, bedtime stories, favorite shows)
  - [ ] 1.5: Add Flesch-Kincaid readability validation tests for ages 5-7 content
  - [ ] 1.6: Write tests for visual element rendering (15+ tests)

- [ ] Task 2: Enhance ages 14-16 templates with earned autonomy milestones (AC: 5)
  - [ ] 2.1: Add `autonomyMilestones` schema field to AgreementTemplate
  - [ ] 2.2: Define milestone structure: { description, criteria, unlocks }
  - [ ] 2.3: Add 3-5 progressive milestones per 14-16 template (trust score thresholds, time periods)
  - [ ] 2.4: Reference Epic 52 Reverse Mode concepts (age 16 transition, trusted adults)
  - [ ] 2.5: Add milestones section UI in TemplatePreviewDialog
  - [ ] 2.6: Write schema and UI tests for milestones (20+ tests)

- [ ] Task 3: Create readability validation utilities (AC: 1)
  - [ ] 3.1: Create `readabilityUtils.ts` in packages/contracts/src/utils/
  - [ ] 3.2: Implement Flesch-Kincaid grade level calculator
  - [ ] 3.3: Implement simple word ratio checker (% of common simple words)
  - [ ] 3.4: Create `validateTemplateReadability()` function per age group
  - [ ] 3.5: Add readability validation to template test suite
  - [ ] 3.6: Ensure all content passes NFR65 (6th-grade max for all, simpler for younger)
  - [ ] 3.7: Write comprehensive readability tests (25+ tests)

- [ ] Task 4: Validate and enhance screen time defaults by age (AC: 2)
  - [ ] 4.1: Audit existing templates for age-appropriate screen time values
  - [ ] 4.2: Add `screenTimeRange` metadata field: { minMinutes, maxMinutes, unit }
  - [ ] 4.3: Create `getRecommendedScreenTime(ageGroup)` helper function
  - [ ] 4.4: Ensure progression: 5-7 (30-60min) → 8-10 (1-2hr) → 11-13 (2-3hr) → 14-16 (3-4hr)
  - [ ] 4.5: Add warnings if custom values exceed recommendations
  - [ ] 4.6: Write validation tests for screen time ranges (15+ tests)

- [ ] Task 5: Validate and enhance monitoring intensity by age (AC: 3)
  - [ ] 5.1: Audit existing templates for age-appropriate monitoring levels
  - [ ] 5.2: Create `MonitoringIntensityScale` type: 'comprehensive' | 'high' | 'moderate' | 'light'
  - [ ] 5.3: Create mapping: 5-7 → comprehensive, 8-10 → high/moderate, 11-13 → moderate, 14-16 → light/moderate
  - [ ] 5.4: Add `recommendedMonitoringLevel(ageGroup)` helper function
  - [ ] 5.5: Add visual indicator of monitoring intensity in TemplateCard
  - [ ] 5.6: Write tests for monitoring level mapping (10+ tests)

- [ ] Task 6: Add age-relevant examples to rule explanations (AC: 4)
  - [ ] 6.1: Create `AgeRelevantExamples` type with age-specific example banks
  - [ ] 6.2: Ages 5-7: Playground games, bedtime, favorite cartoon, sharing toys
  - [ ] 6.3: Ages 8-10: Homework apps, Minecraft, Roblox, YouTube Kids channels
  - [ ] 6.4: Ages 11-13: Social gaming, group chats, streaming, homework research
  - [ ] 6.5: Ages 14-16: Social media presence, online reputation, college prep, job hunting
  - [ ] 6.6: Update template sections to use age-appropriate example references
  - [ ] 6.7: Write tests verifying examples match age groups (12+ tests)

- [ ] Task 7: Create template content validation test suite (AC: 1, 2, 3, 4, 5, 6)
  - [ ] 7.1: Create `template-content-validation.test.ts` in packages/contracts
  - [ ] 7.2: Test all 12 templates pass NFR65 readability requirements
  - [ ] 7.3: Test screen time values within age-appropriate ranges
  - [ ] 7.4: Test monitoring levels decrease appropriately with age
  - [ ] 7.5: Test ages 14-16 templates have autonomy milestones
  - [ ] 7.6: Test ages 5-7 templates have visual elements and simple rules
  - [ ] 7.7: Comprehensive validation suite (40+ tests total)

## Dev Notes

### Previous Story Intelligence (Story 4.1)

Story 4.1 created the complete template infrastructure:
- **Schema**: `packages/contracts/src/agreement-template.schema.ts` - AgreementTemplate, TemplateSection, TemplateSummary types
- **Data**: `packages/contracts/src/data/templates/` - 12 templates (4 age groups × 3 variations)
- **UI**: `apps/web/src/components/templates/` - TemplateLibrary, TemplateCard, TemplatePreviewDialog
- **Tests**: 391 tests across schema (164), data (66), functions (31), UI (130)

Story 4.2 **enhances** existing templates rather than creating new ones.

### Architecture Patterns

**Schema Extension Pattern:**
```typescript
// Add new fields to existing schema (EXTEND, don't replace)
const templateSectionSchema = z.object({
  // ... existing fields ...
  visualElements: z.object({
    icon: z.string().optional(),
    isYesNoRule: z.boolean().default(false),
    colorHint: z.string().optional(),
  }).optional(),
})

const agreementTemplateSchema = z.object({
  // ... existing fields ...
  autonomyMilestones: z.array(autonomyMilestoneSchema).optional(),
})
```

**Existing Files to MODIFY (not create new):**
- `packages/contracts/src/agreement-template.schema.ts` - Add new schema fields
- `packages/contracts/src/data/templates/ages-*.ts` - Enhance content with new fields
- `apps/web/src/components/templates/TemplatePreviewDialog.tsx` - Add milestones UI
- `apps/web/src/components/templates/TemplateCard.tsx` - Add monitoring indicator

**New Files to CREATE:**
- `packages/contracts/src/utils/readabilityUtils.ts` - Readability validation
- `packages/contracts/src/utils/readabilityUtils.test.ts` - Readability tests
- `packages/contracts/src/data/templates/template-content-validation.test.ts` - Content validation

### Key Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| zod | ^3.x | Schema validation (EXTEND existing) |
| vitest | ^1.x | Testing framework |

### Content Guidelines by Age Group

| Age Group | Language Level | Screen Time | Monitoring | Examples |
|-----------|---------------|-------------|------------|----------|
| 5-7 | Simple, visual, yes/no | 30-60 min | Comprehensive | Playground, cartoons, bedtime |
| 8-10 | 4th grade | 1-2 hrs | Moderate-High | Minecraft, Roblox, YouTube Kids |
| 11-13 | 6th grade | 2-3 hrs | Moderate | Group chats, streaming, homework |
| 14-16 | 6th grade | 3-4 hrs | Light-Moderate | Social media, reputation, college |

### Autonomy Milestones Structure (Ages 14-16)

```typescript
const autonomyMilestoneSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  criteria: z.object({
    trustScoreThreshold: z.number().min(0).max(100).optional(),
    timeWithoutIncident: z.string().optional(), // e.g., "3 months"
    parentApproval: z.boolean().default(true),
  }),
  unlocks: z.array(z.string()), // What freedoms this milestone grants
  order: z.number(), // Progression order
})

// Example milestone for ages 14-16:
{
  id: 'milestone-1',
  title: 'Trust Level 1: Extended Screen Time',
  description: 'Earn extra screen time through responsible use',
  criteria: {
    trustScoreThreshold: 70,
    timeWithoutIncident: '1 month',
    parentApproval: true,
  },
  unlocks: ['Extra 30 minutes on weekends', 'Choose own bedtime on weekends'],
  order: 1,
}
```

### Reverse Mode References (Epic 52)

Story 4.2's autonomy milestones align with Epic 52's "Reverse Mode & Trusted Adults":
- **Story 52-1**: Age 16 transition notification → Milestones prepare teen for this
- **Story 52-2**: Reverse mode activation → Progressive autonomy builds toward this
- **Story 52-4**: Trusted adult designation → Milestone can include trusted adult access
[Source: docs/epics/epic-list.md#Epic-52]

### Visual Elements for Ages 5-7

```typescript
const visualElementSchema = z.object({
  icon: z.string().optional(), // Emoji or icon name: '✅', '❌', '⏰', '🎮'
  isYesNoRule: z.boolean().default(false), // Renders as simple yes/no toggle
  colorHint: z.enum(['green', 'yellow', 'red', 'blue']).optional(),
})

// Example section with visual elements:
{
  id: 'screen-time-5-7',
  type: 'screen_time',
  title: '⏰ Screen Time',
  defaultValue: '✅ Yes: 30 minutes after homework\n❌ No: Before breakfast',
  visualElements: {
    icon: '⏰',
    isYesNoRule: true,
    colorHint: 'blue',
  },
}
```

### NFR Compliance Checklist

- [ ] NFR65: All template content at 6th-grade reading level (younger = simpler)
- [ ] NFR42: Templates support screen reader accessibility (visual elements have text alternatives)
- [ ] NFR48: Template content is culturally neutral

### Testing Standards

- Readability tests use Flesch-Kincaid formula
- All 12 templates must pass age-appropriate readability validation
- Autonomy milestones tested for progression logic
- Visual elements tested for rendering in all age groups

### References

- [Source: docs/epics/epic-list.md#Story-4.2] - Original acceptance criteria
- [Source: docs/epics/epic-list.md#Epic-52] - Reverse Mode & Trusted Adults
- [Source: docs/project_context.md] - Implementation patterns
- [Source: packages/contracts/src/agreement-template.schema.ts] - Existing schema
- [Source: docs/sprint-artifacts/stories/4-1-template-library-structure.md] - Previous story

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

Ultimate context engine analysis completed - comprehensive developer guide created

### File List

