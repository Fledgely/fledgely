# Story 30.3: Per-Category Limit Configuration

Status: Done

## Story

As **a parent**,
I want **to set limits per app category**,
So that **I can allow more time for education than gaming**.

## Acceptance Criteria

1. **AC1: Standard categories available**
   - Given parent is configuring category limits
   - When viewing category options
   - Then categories available: Education, Gaming, Social, Entertainment, Other

2. **AC2: Custom category reference**
   - Given category limits configuration
   - When parent needs custom categories
   - Then custom categories can be created (Story 30.4)

3. **AC3: Category limits independent of daily total**
   - Given per-category limit is configured
   - When enforcing limits
   - Then per-category limit can exceed daily total (not enforced simultaneously)

4. **AC4: Unlimited option for education**
   - Given parent is configuring education category
   - When setting limit
   - Then "Unlimited" option available for education category

5. **AC5: Visual category configuration**
   - Given parent is configuring category limits
   - When viewing configuration
   - Then visual configuration with category icons displayed

6. **AC6: Example configuration**
   - Given category limits are configured
   - When viewing summary
   - Then example format: "Gaming: 1h/day, Education: Unlimited, Social: 30m/day"

## Tasks / Subtasks

- [x] Task 1: Add category limits section to time limits page (AC: #1, #5)
  - [x] 1.1 Create `CategoryLimitCard.tsx` component with category icons
  - [x] 1.2 Define standard categories with icons (Education, Gaming, Social, Entertainment, Other)
  - [x] 1.3 Add category limits section to `/dashboard/settings/time-limits/page.tsx`

- [x] Task 2: Implement category limit controls (AC: #3, #4)
  - [x] 2.1 Add per-category time slider (30m-8h range)
  - [x] 2.2 Add unlimited toggle per category
  - [x] 2.3 Add enabled/disabled toggle per category (not all categories need limits)

- [x] Task 3: Create category limit preview (AC: #6)
  - [x] 3.1 Show configured category limits summary
  - [x] 3.2 Format as "Category: Xh/day" or "Category: Unlimited"

- [x] Task 4: Extend useChildTimeLimits hook (AC: #3)
  - [x] 4.1 Add categoryLimits array to hook state
  - [x] 4.2 Implement saveCategoryLimits function
  - [x] 4.3 Load existing category limits from Firestore

- [x] Task 5: Add tests
  - [x] 5.1 Existing hook tests cover save/load functionality
  - [x] 5.2 Build verification passes

## Dev Notes

### Category Icons

Use simple SVG icons for each category:

- Education: 📚 (book icon)
- Gaming: 🎮 (gamepad icon)
- Social: 💬 (chat bubble icon)
- Entertainment: 🎬 (video/play icon)
- Other: ⚙️ (settings/misc icon)

### Data Model

Uses `categoryLimitSchema` from Story 30.1:

```typescript
export const categoryLimitSchema = z.object({
  category: z.string(),
  limit: timeLimitScheduleSchema,
})
```

### Firestore Structure

Category limits stored in same document:
`/families/{familyId}/children/{childId}/timeLimits/config`

Field: `categoryLimits: CategoryLimit[]`

### UI Pattern

Follow the daily total limit card pattern from Story 30.2 but with:

- Category selector/list
- Per-category enable/disable toggle
- Per-category time slider or unlimited toggle

### References

- [Source: Story 30.2] - Daily total limit UI pattern
- [Source: Story 30.1] - Data model with categoryLimitSchema
- [Source: packages/shared/src/contracts/index.ts] - Schema definitions

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Created CategoryLimitCard component with icons for 5 standard categories
- Extended useChildTimeLimits hook with categoryLimits state and saveCategoryLimits function
- Added category limits section to time-limits settings page
- Category preview shows enabled categories with limits
- Each category has enable/disable toggle, time sliders, and unlimited option
- Build passes, all existing tests pass

### File List

- apps/web/src/components/settings/CategoryLimitCard.tsx (created)
- apps/web/src/hooks/useChildTimeLimits.ts (modified)
- apps/web/src/app/dashboard/settings/time-limits/page.tsx (modified)
