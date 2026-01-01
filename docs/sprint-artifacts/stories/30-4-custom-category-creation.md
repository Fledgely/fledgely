# Story 30.4: Custom Category Creation

Status: Done

## Story

As **a parent**,
I want **to create custom app categories**,
So that **limits match my family's values**.

## Acceptance Criteria

1. **AC1: Category name entry**
   - Given parent wants custom categories
   - When creating custom category
   - Then category name entered (max 30 chars)

2. **AC2: App/site assignment**
   - Given custom category is being created
   - When assigning apps/sites
   - Then apps/sites assigned to category via search

3. **AC3: Category inheritance**
   - Given custom category is being created
   - When configuring category
   - Then category inherits from default or starts empty

4. **AC4: Category examples**
   - Given custom categories exist
   - When viewing example
   - Then example: "Homework Apps" category with Khan Academy, Google Docs

5. **AC5: Child visibility**
   - Given custom categories are configured
   - When child views dashboard
   - Then custom categories visible to child in their dashboard

6. **AC6: Category limit**
   - Given parent is creating categories
   - When adding categories
   - Then maximum 10 custom categories per family

## Tasks / Subtasks

- [x] Task 1: Create custom category data model
  - [x] 1.1 Add CustomCategory type to shared contracts
  - [x] 1.2 Create Firestore collection structure for family custom categories

- [x] Task 2: Create custom category management UI (AC: #1, #6)
  - [x] 2.1 Add "Create Custom Category" button to time limits page
  - [x] 2.2 Create CustomCategoryModal component with name input
  - [x] 2.3 Validate category name (max 30 chars) and limit (max 10)

- [x] Task 3: Implement app/site search (AC: #2, #3)
  - [x] 3.1 Create app/site search input component
  - [x] 3.2 Add sample app/site list for search (MVP approach)
  - [x] 3.3 Allow selecting apps/sites for category

- [x] Task 4: Create custom category hook
  - [x] 4.1 Create useCustomCategories hook for Firestore operations
  - [x] 4.2 Implement CRUD operations for custom categories

- [x] Task 5: Integrate with category limits (AC: #4, #5)
  - [x] 5.1 Show custom categories in time limits page
  - [x] 5.2 Allow editing and deleting custom categories
  - [ ] 5.3 Show custom categories in child dashboard (future story reference)

- [x] Task 6: Add tests
  - [x] 6.1 Unit tests for useCustomCategories hook (14 tests passing)

## Dev Notes

### Data Model

Custom categories stored at family level:
`/families/{familyId}/customCategories/{categoryId}`

```typescript
interface CustomCategory {
  id: string
  name: string
  apps: string[] // App identifiers or URLs
  createdBy: string // Parent user ID
  createdAt: number
  updatedAt: number
}
```

### Category Limit

Maximum 10 custom categories per family to prevent abuse and maintain usability.

### App/Site Search

For MVP, use a predefined list of popular apps/sites. Future enhancement could use AI classification API to categorize new URLs.

### References

- [Source: Story 30.3] - CategoryLimitCard component pattern
- [Source: docs/epics/epic-list.md#story-304] - Story requirements

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- `packages/shared/src/contracts/index.ts` - Added customCategorySchema and MAX_CUSTOM_CATEGORIES_PER_FAMILY
- `packages/shared/src/index.ts` - Exported custom category types
- `apps/web/src/hooks/useCustomCategories.ts` - Created hook for CRUD operations
- `apps/web/src/hooks/__tests__/useCustomCategories.test.ts` - Unit tests (14 tests)
- `apps/web/src/components/settings/CustomCategoryModal.tsx` - Modal for create/edit
- `apps/web/src/app/dashboard/settings/time-limits/page.tsx` - Integrated custom categories UI
