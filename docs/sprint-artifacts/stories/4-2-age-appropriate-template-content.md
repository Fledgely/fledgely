# Story 4.2: Age-Appropriate Template Content

Status: done

## Story

As a **parent**,
I want **templates to have age-appropriate language and rules**,
So that **the agreement makes sense to my child and fits their developmental stage**.

## Acceptance Criteria

1. **AC1: Language Complexity**
   - Given a parent selects a template for a specific age group
   - When template content is displayed
   - Then language complexity matches the child's age (6th-grade max per NFR65)
   - And rule text is written in age-appropriate vocabulary

2. **AC2: Screen Time Defaults**
   - Given templates for different age groups
   - When comparing defaults
   - Then screen time defaults are age-appropriate (younger = less, older = more)
   - And weekday limits are lower than weekend limits
   - And limits follow developmental guidelines

3. **AC3: Monitoring Intensity Defaults**
   - Given templates for different age groups
   - When comparing defaults
   - Then monitoring intensity defaults decrease with age (younger = more)
   - And 5-7 age group has highest monitoring by default
   - And 14-16 age group has lowest monitoring by default

4. **AC4: Age-Relevant Examples**
   - Given a parent views template rules
   - When rule explanations are displayed
   - Then each rule includes an age-relevant example or context
   - And examples reference activities typical for that age group

5. **AC5: Autonomy Milestones (14-16)**
   - Given a parent views templates for 14-16 age group
   - When template content is displayed
   - Then templates include earned autonomy milestones
   - And milestones explain progression toward independence
   - And examples reference Reverse Mode path for mature teens

6. **AC6: Visual/Simple Rules (5-7)**
   - Given a parent views templates for 5-7 age group
   - When template content is displayed
   - Then templates emphasize simple yes/no rules
   - And rule text is very simple (3rd-grade reading level)
   - And rules are phrased positively where possible ("Do X" vs "Don't Y")

## Tasks / Subtasks

- [x] Task 1: (SIMPLIFIED) Content utilities embedded in TemplateRules component (AC: #1, #4)
  - [x] 1.1 Age-appropriate content logic in TemplateRules.tsx
  - [x] 1.2 SimpleRulesDisplay for 5-7 age group formatting
  - [x] 1.3 AutonomyMilestonesDisplay for 14-16 age group
  - [x] 1.4 StandardRulesDisplay with examples for other age groups

- [x] Task 2: Enhance Template Data for Young Children (5-7) (AC: #2, #3, #6)
  - [x] 2.1 Update 5-7 templates in apps/web/src/data/templates.ts
  - [x] 2.2 Ensure keyRules use simple 3rd-grade vocabulary
  - [x] 2.3 Phrase rules positively ("Play in living room" vs "Don't go to room")
  - [x] 2.4 Add simpleRules field with yes/no formatted rules
  - [x] 2.5 Verify screenTimeLimits are appropriate (60-90m weekday, 90-120m weekend)
  - [x] 2.6 Verify monitoringLevel is 'high' for all 5-7 templates

- [x] Task 3: Enhance Template Data for Pre-Teens (8-10) (AC: #2, #3, #4)
  - [x] 3.1 Update 8-10 templates in apps/web/src/data/templates.ts
  - [x] 3.2 Add age-relevant examples for gaming and educational content (ruleExamples)
  - [x] 3.3 Verify screenTimeLimits are appropriate (60-120m weekday, 120-180m weekend)
  - [x] 3.4 Mix of 'high' and 'medium' monitoring levels

- [x] Task 4: Enhance Template Data for Middle School (11-13) (AC: #2, #3, #4)
  - [x] 4.1 Update 11-13 templates in apps/web/src/data/templates.ts
  - [x] 4.2 Add age-relevant examples for social media and messaging (ruleExamples)
  - [x] 4.3 Verify screenTimeLimits are appropriate (90-150m weekday, 150-240m weekend)
  - [x] 4.4 Mix of 'high', 'medium', and 'low' monitoring levels

- [x] Task 5: Enhance Template Data for High School (14-16) (AC: #2, #3, #4, #5)
  - [x] 5.1 Update 14-16 templates in apps/web/src/data/templates.ts
  - [x] 5.2 Add autonomyMilestones field to schema and templates
  - [x] 5.3 Include earned autonomy examples (driving, dating, part-time work)
  - [x] 5.4 Reference Reverse Mode path for mature teens
  - [x] 5.5 Verify screenTimeLimits are appropriate (120-240m weekday, 180-360m weekend)
  - [x] 5.6 Predominantly 'medium' and 'low' monitoring levels

- [x] Task 6: Update Agreement Template Schema (AC: #5, #6)
  - [x] 6.1 Add autonomyMilestones optional field to agreementTemplateSchema
  - [x] 6.2 Add simpleRules optional field for young children format
  - [x] 6.3 Add ruleExamples optional field for age-relevant context
  - [x] 6.4 Update schema tests for new fields (18 new tests)

- [x] Task 7: Create TemplateRules Component (AC: #4, #5, #6)
  - [x] 7.1 Create apps/web/src/components/templates/TemplateRules.tsx
  - [x] 7.2 Display rules with age-appropriate formatting
  - [x] 7.3 Show examples inline when showExamples=true
  - [x] 7.4 For 5-7: Show simple yes/no visual format (SimpleRulesDisplay)
  - [x] 7.5 For 14-16: Show autonomy milestones section (AutonomyMilestonesDisplay)
  - [x] 7.6 Create component tests (30 tests)

- [x] Task 8: Enhance TemplateCard with Age Content (AC: #1, #4, #5, #6)
  - [x] 8.1 Update TemplateCard to show age-specific preview
  - [x] 8.2 For 5-7: Show "Simple Yes/No Rules" indicator
  - [x] 8.3 For 14-16: Show "Includes Autonomy Path" indicator
  - [x] 8.4 Update tests for new content (7 new tests)

- [x] Task 9: Unit Tests for Age-Appropriate Content (AC: All)
  - [x] 9.1 Schema tests for autonomyMilestones and simpleRules
  - [x] 9.2 TemplateRules tests for all age groups
  - [x] 9.3 TemplateCard tests for age-specific indicators
  - [x] 9.4 Test 5-7 templates have simple rules
  - [x] 9.5 Test 14-16 templates have autonomy milestones

## Dev Notes

### Technical Requirements

- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **UI Framework:** shadcn/ui + Radix + Tailwind (per project_context.md)
- **Reading Level:** NFR65 requires 6th-grade max; 5-7 age group should be 3rd-grade

### Age Group Content Guidelines

| Age Group | Reading Level | Screen Time Range | Monitoring  | Special Features                       |
| --------- | ------------- | ----------------- | ----------- | -------------------------------------- |
| 5-7       | 3rd grade     | 60-120m/day       | high        | Simple yes/no rules, positive framing  |
| 8-10      | 4th-5th grade | 60-180m/day       | high-medium | Gaming examples, educational focus     |
| 11-13     | 6th grade     | 90-240m/day       | high-low    | Social media, messaging context        |
| 14-16     | 6th grade     | 120-360m/day      | medium-low  | Autonomy milestones, Reverse Mode prep |

### Screen Time Guidelines (from AAP recommendations)

- **5-7:** Focus on educational, limit entertainment; parent present
- **8-10:** Balance entertainment/education; some independence
- **11-13:** Social connection via devices; need boundaries
- **14-16:** Near-adult usage; focus on responsibility not restriction

### Template Enhancement Pattern

```typescript
// packages/shared/src/contracts/index.ts - Schema additions
export const agreementTemplateSchema = z.object({
  // ... existing fields
  autonomyMilestones: z
    .array(
      z.object({
        milestone: z.string(),
        reward: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  simpleRules: z
    .array(
      z.object({
        text: z.string(),
        isAllowed: z.boolean(), // true = "You CAN", false = "Not yet"
      })
    )
    .optional(),
  ruleExamples: z.record(z.string(), z.string()).optional(), // ruleIndex -> example
})
```

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - new fields must be Zod-based
- Components in `components/templates/` folder
- Tests co-located with components

### Previous Story Intelligence

From Story 4.1:

- Template data in apps/web/src/data/templates.ts
- Schema in packages/shared/src/contracts/index.ts
- 11 templates already exist with basic content
- TemplateCard displays variation, age group, monitoring level
- Pattern established for labels in CATEGORY_LABELS, etc.

### Library/Framework Requirements

| Dependency            | Version | Purpose                        |
| --------------------- | ------- | ------------------------------ |
| zod                   | ^3.x    | Schema validation              |
| @tanstack/react-query | ^5.x    | Already installed in Story 4.1 |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add optional template fields

apps/web/src/
├── data/
│   └── templates.ts            # UPDATE - Enhance template content
├── utils/
│   └── templateContent.ts      # NEW - Age-appropriate content utilities
│   └── templateContent.test.ts # NEW - Unit tests
├── components/
│   └── templates/
│       ├── TemplateRules.tsx       # NEW - Rules display component
│       ├── TemplateRules.test.tsx  # NEW - Component tests
│       ├── TemplateCard.tsx        # UPDATE - Age-specific indicators
│       └── TemplateCard.test.tsx   # UPDATE - New indicator tests
```

### Testing Requirements

- Unit test reading level validation
- Unit test screen time progression across age groups
- Unit test monitoring level progression
- Unit test simple rules format for 5-7
- Unit test autonomy milestones for 14-16
- Component tests for TemplateRules display
- Component tests for TemplateCard age indicators

### NFR References

- NFR65: 6th-grade reading level maximum
- NFR42: WCAG 2.1 AA accessibility
- NFR43: Keyboard navigable
- NFR45: Color contrast 4.5:1 minimum

### References

- [Source: docs/epics/epic-list.md#Story-4.2]
- [Source: docs/epics/epic-list.md#Epic-4]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/architecture.md#NFR65]
- [Source: docs/sprint-artifacts/stories/4-1-template-library-structure.md]

## Dev Agent Record

### Context Reference

- Epic: 4 (Agreement Templates & Quick Start)
- Sprint: 2 (Feature Development)
- Story Key: 4-2-age-appropriate-template-content
- Depends On: Story 4.1 (Template Library Structure - complete)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

- Added Zod schemas for autonomyMilestones, simpleRules, and ruleExamples
- Updated all 11 templates with age-appropriate content
- 5-7 templates: Simple yes/no rules with positive framing, 3rd-grade vocabulary
- 8-10 templates: Gaming/education examples, ruleExamples for context
- 11-13 templates: Social media/messaging focus, ruleExamples for context
- 14-16 templates: Autonomy milestones for earned independence (driving, jobs, turn 18)
- Created TemplateRules component with age-specific rendering
- Updated TemplateCard with age-specific indicators
- 327 total tests passing (297 + 30 new TemplateRules tests)

### File List

**New Files Created:**

- apps/web/src/components/templates/TemplateRules.tsx
- apps/web/src/components/templates/TemplateRules.test.tsx (30 tests)

**Modified Files:**

- packages/shared/src/contracts/index.ts (added autonomyMilestoneSchema, simpleRuleSchema, template fields)
- packages/shared/src/contracts/agreementTemplate.test.ts (added 18 tests for new schemas)
- apps/web/src/data/templates.ts (enhanced all 11 templates with age-appropriate content)
- apps/web/src/components/templates/TemplateCard.tsx (added age-specific indicators)
- apps/web/src/components/templates/TemplateCard.test.tsx (added 7 tests)
- apps/web/src/components/templates/index.ts (exported TemplateRules)

## Change Log

| Date       | Change                                           |
| ---------- | ------------------------------------------------ |
| 2025-12-28 | Story created (ready-for-dev)                    |
| 2025-12-28 | Story completed - all tasks done, 327 tests pass |
