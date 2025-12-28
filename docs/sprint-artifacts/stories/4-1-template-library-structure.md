# Story 4.1: Template Library Structure

Status: done

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

- [x] Task 1: Create Agreement Template Schema (AC: #1, #2, #3)
  - [x] 1.1 Define agreementTemplateSchema in contracts/index.ts
  - [x] 1.2 Add ageGroupSchema enum (5-7, 8-10, 11-13, 14-16)
  - [x] 1.3 Add templateVariationSchema enum (strict, balanced, permissive)
  - [x] 1.4 Add templateCategorySchema enum (gaming, social_media, homework, general)
  - [x] 1.5 Include fields: id, name, description, ageGroup, variation, categories, screenTimeLimits, monitoringLevel, keyRules, createdAt
  - [x] 1.6 Create unit tests for schema validation (31 tests)

- [x] Task 2: Create Template Data Service (AC: #1, #2, #4, #6)
  - [x] 2.1 Create apps/web/src/services/templateService.ts
  - [x] 2.2 Implement getTemplates() function to fetch all templates
  - [x] 2.3 Implement getTemplatesByAgeGroup(ageGroup) function
  - [x] 2.4 Implement filterTemplates(categories) function
  - [x] 2.5 Implement searchTemplates(query) function
  - [x] 2.6 Add unit tests for service functions (27 tests)

- [x] Task 3: Seed Initial Template Data (AC: #1, #2, #3)
  - [x] 3.1 Create template data file with 11 initial templates
  - [x] 3.2 Create 2-3 variations per age group (5-7, 8-10, 11-13, 14-16)
  - [x] 3.3 Define age-appropriate defaults for each template
  - [x] 3.4 Include key rules and monitoring levels
  - [x] 3.5 Store templates as static JSON (apps/web/src/data/templates.ts)

- [x] Task 4: Create TemplateCard Component (AC: #3, #5)
  - [x] 4.1 Create apps/web/src/components/templates/TemplateCard.tsx
  - [x] 4.2 Display template name, description, age group badge
  - [x] 4.3 Show screen time summary (e.g., "1h 30m/day weekdays, 2h/day weekends")
  - [x] 4.4 Show monitoring level indicator (high, medium, low)
  - [x] 4.5 Show key rules count (e.g., "3 core rules")
  - [x] 4.6 Ensure keyboard navigable with visible focus
  - [x] 4.7 Ensure 44px minimum touch targets (min-h-[180px])
  - [x] 4.8 Create component tests (30 tests)

- [x] Task 5: Create TemplateLibrary Component (AC: #1, #2, #4, #5, #6)
  - [x] 5.1 Create apps/web/src/components/templates/TemplateLibrary.tsx
  - [x] 5.2 Add age group tabs/filter for organization
  - [x] 5.3 Add category filter chips (gaming, social media, homework)
  - [x] 5.4 Add search input with debounced search (300ms)
  - [x] 5.5 Show loading state with spinner
  - [x] 5.6 Implement responsive grid layout for template cards
  - [x] 5.7 Ensure keyboard navigation between cards and filters
  - [x] 5.8 Create component tests (30 tests)

- [x] Task 6: Create Template Library Page (AC: All)
  - [x] 6.1 Create apps/web/src/app/templates/page.tsx
  - [x] 6.2 Integrate TemplateLibrary component
  - [x] 6.3 Add header with back navigation to dashboard
  - [x] 6.4 Add selection confirmation footer
  - [x] 6.5 Protected route (requires authentication)

- [x] Task 7: Add Firestore Security Rules (AC: #1)
  - [x] 7.1 Add /agreementTemplates collection rules
  - [x] 7.2 Allow read for authenticated users
  - [x] 7.3 Deny write (templates are system-managed)

- [x] Task 8: Create Unit Tests (AC: All)
  - [x] 8.1 Test agreementTemplateSchema validation (31 tests in shared package)
  - [x] 8.2 Test templateService functions (27 tests)
  - [x] 8.3 Test TemplateCard accessibility (keyboard, focus) - 30 tests
  - [x] 8.4 Test TemplateLibrary filtering and search - 30 tests
  - [x] 8.5 Test loading and empty states

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

claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

- Implemented complete template library with 11 age-appropriate templates
- Added TanStack Query provider for server state management
- All components follow accessibility requirements (44px touch targets, keyboard navigation, focus indicators)
- Templates use static JSON for MVP (ready for Firestore migration)
- 304 total tests passing (297 web + 7 firebase-rules)

### File List

**New Files Created:**

- packages/shared/src/contracts/agreementTemplate.test.ts (31 tests)
- apps/web/src/data/templates.ts (11 templates with labels)
- apps/web/src/services/templateService.ts
- apps/web/src/services/templateService.test.ts (27 tests)
- apps/web/src/hooks/useTemplates.ts
- apps/web/src/providers/QueryProvider.tsx
- apps/web/src/components/templates/TemplateCard.tsx
- apps/web/src/components/templates/TemplateCard.test.tsx (30 tests)
- apps/web/src/components/templates/TemplateLibrary.tsx
- apps/web/src/components/templates/TemplateLibrary.test.tsx (30 tests)
- apps/web/src/components/templates/index.ts
- apps/web/src/app/templates/page.tsx
- packages/firebase-rules/**tests**/agreementTemplates.rules.test.ts (7 tests)

**Modified Files:**

- packages/shared/src/contracts/index.ts (added template schemas)
- apps/web/package.json (added @tanstack/react-query)
- apps/web/src/app/layout.tsx (added QueryProvider)
- packages/firebase-rules/firestore.rules (added agreementTemplates rules)

## Change Log

| Date       | Change                                           |
| ---------- | ------------------------------------------------ |
| 2025-12-28 | Story created (ready-for-dev)                    |
| 2025-12-28 | Story completed - all tasks done, 304 tests pass |
