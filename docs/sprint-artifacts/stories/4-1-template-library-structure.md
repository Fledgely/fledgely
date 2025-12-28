# Story 4.1: Template Library Structure

Status: ready-for-dev

## Story

As a **parent**,
I want **to browse a library of pre-built agreement templates organized by child age**,
So that **I can quickly find an appropriate starting point for our family agreement**.

## Acceptance Criteria

1. **AC1: Age Group Organization**
   - Given a parent is creating or editing an agreement for a child
   - When they access the template library
   - Then templates are organized by age groups (5-7, 8-10, 11-13, 14-16)
   - And each age group is clearly labeled and navigable

2. **AC2: Template Variations**
   - Given a parent views an age group
   - When templates are displayed
   - Then each age group shows 2-3 template variations (strict, balanced, permissive)
   - And variations are labeled with their monitoring philosophy

3. **AC3: Template Preview Summary**
   - Given a parent browses templates
   - When viewing a template card
   - Then the card displays preview summary (screen time limits, monitoring level, key rules)
   - And key information is scannable at a glance

4. **AC4: Search and Filter**
   - Given a parent needs specific templates
   - When they use search/filter functionality
   - Then they can filter templates by specific concerns (gaming, social media, homework)
   - And search returns relevant templates within 500ms

5. **AC5: Keyboard Navigation**
   - Given a parent using keyboard navigation
   - When browsing the template library
   - Then all template cards are keyboard navigable (NFR43)
   - And focus indicators are visible (NFR46)
   - And touch targets are 44px minimum (NFR49)

6. **AC6: Performance**
   - Given a parent accesses the template library
   - When templates load
   - Then templates load within 1 second (NFR29)
   - And the UI remains responsive during loading

## Tasks / Subtasks

- [ ] Task 1: Create Agreement Template Schema (AC: #1, #2, #3)
  - [ ] 1.1 Define agreementTemplateSchema in contracts/index.ts
  - [ ] 1.2 Add ageGroupSchema enum (5-7, 8-10, 11-13, 14-16)
  - [ ] 1.3 Add templateVariationSchema enum (strict, balanced, permissive)
  - [ ] 1.4 Add templateCategorySchema enum (gaming, social_media, homework, general)
  - [ ] 1.5 Include fields: id, name, description, ageGroup, variation, categories, screenTimeLimits, monitoringLevel, keyRules, createdAt
  - [ ] 1.6 Create unit tests for schema validation

- [ ] Task 2: Create Template Data Service (AC: #1, #2, #4, #6)
  - [ ] 2.1 Create apps/web/src/services/templateService.ts
  - [ ] 2.2 Implement getTemplates() function to fetch all templates
  - [ ] 2.3 Implement getTemplatesByAgeGroup(ageGroup) function
  - [ ] 2.4 Implement filterTemplates(categories) function
  - [ ] 2.5 Implement searchTemplates(query) function
  - [ ] 2.6 Add unit tests for service functions

- [ ] Task 3: Seed Initial Template Data (AC: #1, #2, #3)
  - [ ] 3.1 Create template data file with 8-12 initial templates
  - [ ] 3.2 Create 2-3 variations per age group (5-7, 8-10, 11-13, 14-16)
  - [ ] 3.3 Define age-appropriate defaults for each template
  - [ ] 3.4 Include key rules and monitoring levels
  - [ ] 3.5 Store templates in Firestore /agreementTemplates collection OR as static JSON

- [ ] Task 4: Create TemplateCard Component (AC: #3, #5)
  - [ ] 4.1 Create apps/web/src/components/templates/TemplateCard.tsx
  - [ ] 4.2 Display template name, description, age group badge
  - [ ] 4.3 Show screen time summary (e.g., "2 hrs/day weekdays, 3 hrs/day weekends")
  - [ ] 4.4 Show monitoring level indicator (high, medium, low)
  - [ ] 4.5 Show key rules count (e.g., "5 core rules")
  - [ ] 4.6 Ensure keyboard navigable with visible focus
  - [ ] 4.7 Ensure 44px minimum touch targets
  - [ ] 4.8 Create component tests

- [ ] Task 5: Create TemplateLibrary Component (AC: #1, #2, #4, #5, #6)
  - [ ] 5.1 Create apps/web/src/components/templates/TemplateLibrary.tsx
  - [ ] 5.2 Add age group tabs/filter for organization
  - [ ] 5.3 Add category filter chips (gaming, social media, homework)
  - [ ] 5.4 Add search input with debounced search
  - [ ] 5.5 Show loading state with skeleton cards
  - [ ] 5.6 Implement responsive grid layout for template cards
  - [ ] 5.7 Ensure keyboard navigation between cards and filters
  - [ ] 5.8 Create component tests

- [ ] Task 6: Create Template Library Page (AC: All)
  - [ ] 6.1 Create apps/web/src/app/templates/page.tsx
  - [ ] 6.2 Integrate TemplateLibrary component
  - [ ] 6.3 Add page metadata for SEO
  - [ ] 6.4 Add breadcrumb navigation
  - [ ] 6.5 Add link from dashboard or family settings

- [ ] Task 7: Add Firestore Security Rules (AC: #1)
  - [ ] 7.1 Add /agreementTemplates collection rules (if using Firestore)
  - [ ] 7.2 Allow public read for templates (no auth required to browse)
  - [ ] 7.3 Allow admin-only write (templates are system-managed)

- [ ] Task 8: Create Unit Tests (AC: All)
  - [ ] 8.1 Test agreementTemplateSchema validation
  - [ ] 8.2 Test templateService functions
  - [ ] 8.3 Test TemplateCard accessibility (keyboard, focus)
  - [ ] 8.4 Test TemplateLibrary filtering and search
  - [ ] 8.5 Test loading and empty states

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas OR static JSON for MVP
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **UI Framework:** shadcn/ui + Radix + Tailwind (per project_context.md)

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - agreementTemplateSchema must be Zod-based
- "Firebase SDK Direct" - use `collection()`, `getDocs()`, `query()` directly
- "Functions Delegate to Services" - service layer for template fetching logic
- "State Ownership" - TanStack Query for server data fetching

### Template Data Model

```typescript
// packages/shared/src/contracts/index.ts
export const ageGroupSchema = z.enum(['5-7', '8-10', '11-13', '14-16'])
export type AgeGroup = z.infer<typeof ageGroupSchema>

export const templateVariationSchema = z.enum(['strict', 'balanced', 'permissive'])
export type TemplateVariation = z.infer<typeof templateVariationSchema>

export const templateCategorySchema = z.enum(['gaming', 'social_media', 'homework', 'general'])
export type TemplateCategory = z.infer<typeof templateCategorySchema>

export const agreementTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  ageGroup: ageGroupSchema,
  variation: templateVariationSchema,
  categories: z.array(templateCategorySchema),
  screenTimeLimits: z.object({
    weekday: z.number().min(0).max(480), // minutes
    weekend: z.number().min(0).max(480), // minutes
  }),
  monitoringLevel: z.enum(['high', 'medium', 'low']),
  keyRules: z.array(z.string()).min(1).max(10),
  createdAt: z.date(),
})
export type AgreementTemplate = z.infer<typeof agreementTemplateSchema>
```

### Firestore Collection Structure (Optional)

If using Firestore for templates:

```
/agreementTemplates/{templateId}
  - id: string
  - name: string
  - description: string
  - ageGroup: '5-7' | '8-10' | '11-13' | '14-16'
  - variation: 'strict' | 'balanced' | 'permissive'
  - categories: string[]
  - screenTimeLimits: { weekday: number, weekend: number }
  - monitoringLevel: 'high' | 'medium' | 'low'
  - keyRules: string[]
  - createdAt: Timestamp
```

### Static JSON Alternative (MVP)

For MVP simplicity, templates can be stored as static JSON:

```typescript
// apps/web/src/data/templates.ts
export const AGREEMENT_TEMPLATES: AgreementTemplate[] = [
  {
    id: 'strict-5-7',
    name: 'Supervised Explorer',
    description: 'High supervision for young children just starting with devices',
    ageGroup: '5-7',
    variation: 'strict',
    categories: ['general'],
    screenTimeLimits: { weekday: 60, weekend: 90 },
    monitoringLevel: 'high',
    keyRules: ['Device only in common areas', 'Parent approves all apps', 'No social media'],
    createdAt: new Date('2024-01-01'),
  },
  // ... more templates
]
```

### UI Component Pattern

Follow existing component patterns from Story 3.5 (InvitationStatusCard):

```typescript
// apps/web/src/components/templates/TemplateCard.tsx
interface TemplateCardProps {
  template: AgreementTemplate
  onSelect?: (template: AgreementTemplate) => void
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={() => onSelect?.(template)}
      className="w-full p-4 border rounded-lg hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
    >
      {/* Card content */}
    </button>
  )
}
```

### TanStack Query Pattern

```typescript
// apps/web/src/hooks/useTemplates.ts
import { useQuery } from '@tanstack/react-query'
import { getTemplates, filterTemplates } from '@/services/templateService'

export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => (filters ? filterTemplates(filters) : getTemplates()),
    staleTime: 5 * 60 * 1000, // Templates rarely change
  })
}
```

### Previous Story Intelligence

From Epic 3/3A completion:

- Component pattern: Props interface → export function → styled with Tailwind
- Testing pattern: vi.mock for Firebase, render with testing-library
- Accessibility pattern: All buttons 44px min, focus rings, keyboard handlers
- Service pattern: Async functions with type-safe returns

**Key Patterns to Reuse:**

- TemplateCard follows InvitationStatusCard pattern
- TemplateLibrary follows similar grid layout as dashboard
- Filtering follows similar pattern to future story 4.4 (Quick Start Wizard)

### Library/Framework Requirements

| Dependency            | Version | Purpose                          |
| --------------------- | ------- | -------------------------------- |
| @tanstack/react-query | ^5.x    | Server state management          |
| firebase              | ^10.x   | Firebase SDK (already installed) |
| zod                   | ^3.x    | Schema validation                |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add template schemas

apps/web/src/
├── data/
│   └── templates.ts            # NEW - Static template data (or Firestore)
├── services/
│   ├── templateService.ts      # NEW - Template fetching service
│   └── templateService.test.ts # NEW - Unit tests
├── hooks/
│   └── useTemplates.ts         # NEW - TanStack Query hook
├── components/
│   └── templates/
│       ├── TemplateCard.tsx        # NEW - Template card component
│       ├── TemplateCard.test.tsx   # NEW - Component tests
│       ├── TemplateLibrary.tsx     # NEW - Library component
│       └── TemplateLibrary.test.tsx # NEW - Component tests
├── app/
│   └── templates/
│       └── page.tsx            # NEW - Template library page

packages/firebase-rules/
└── firestore.rules            # UPDATE - Add agreementTemplates rules (if using Firestore)
```

### Testing Requirements

- Unit test agreementTemplateSchema validation
- Unit test templateService functions (getTemplates, filter, search)
- Unit test TemplateCard rendering and accessibility
- Unit test TemplateLibrary filtering and state
- Component tests for keyboard navigation
- Test loading and empty states
- Test search debouncing

### NFR References

- NFR29: Templates load within 1 second
- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-4.1]
- [Source: docs/epics/epic-list.md#Epic-4]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/project_context.md#UI-Components]

## Dev Agent Record

### Context Reference

- Epic: 4 (Agreement Templates & Quick Start)
- Sprint: 2 (Feature Development)
- Story Key: 4-1-template-library-structure
- Depends On: Epic 2 (child profiles exist), Epic 3 (family structure)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2025-12-28 | Story created (ready-for-dev) |
