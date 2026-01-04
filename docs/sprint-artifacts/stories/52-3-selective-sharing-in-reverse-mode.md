# Story 52.3: Selective Sharing in Reverse Mode

## Status: done

## Story

As **a teen in reverse mode**,
I want **to choose what to share with parents**,
So that **I maintain my preferred level of connection**.

## Acceptance Criteria

1. **AC1: Daily Screen Time Summary Sharing**
   - Given reverse mode is active
   - When configuring sharing
   - Then can share: daily screen time summary only
   - And parents see aggregated time, not details

2. **AC2: Category-Based Sharing**
   - Given reverse mode is active
   - When configuring sharing
   - Then can share: specific categories only (e.g., social, gaming)
   - And unsharred categories appear as "private"

3. **AC3: Time Limit Status Sharing**
   - Given reverse mode is active
   - When child approaches or reaches time limit
   - Then can choose to share time limit status
   - And parents see "approaching limit" or "limit reached" only

4. **AC4: Nothing Shared Option**
   - Given reverse mode is active
   - When all sharing is disabled
   - Then parents see "No data shared" message
   - And child's dashboard shows sharing status

5. **AC5: Granular Controls**
   - Given reverse mode is active
   - When adjusting sharing
   - Then granular controls: what, when, how much
   - And preview of what parents will see

6. **AC6: Real-Time Parent View Update**
   - Given teen changes sharing settings
   - When settings are saved
   - Then parents see only what teen chooses
   - And update is immediate

7. **AC7: Settings Persistence**
   - Given teen has configured sharing
   - When returning to settings
   - Then previous selections are preserved
   - And teen can change settings anytime

## Tasks / Subtasks

### Task 1: Extend Sharing Preferences Schema

**Files:**

- `packages/shared/src/contracts/reverseMode.ts` (modify)

**Implementation:**
1.1 Add screenTimeDetail: 'none' | 'summary' | 'full' field
1.2 Add categorySharingPreferences: Record<Category, boolean>
1.3 Add timeLimitStatusSharing: boolean field
1.4 Add shareSchedule: optional time-based sharing

### Task 2: Create Sharing Preview Service

**Files:**

- `packages/shared/src/services/sharingPreviewService.ts` (new)
- `packages/shared/src/services/sharingPreviewService.test.ts` (new)

**Implementation:**
2.1 calculateParentVisibility(childData, sharingPrefs) - returns what parents see
2.2 generateSharingPreview(prefs) - returns preview text
2.3 Unit tests for visibility calculation

### Task 3: Update Callable Functions

**Files:**

- `apps/functions/src/callable/reverseMode.ts` (modify)

**Implementation:**
3.1 Update updateReverseModeSharing to handle new fields
3.2 Add getParentVisibleData(childId) - returns filtered data for parents
3.3 Add validation for granular sharing options

### Task 4: Enhanced Sharing UI

**Files:**

- `apps/web/src/components/reverse-mode/SharingPreferencesPanel.tsx` (new)
- `apps/web/src/components/reverse-mode/SharingPreviewCard.tsx` (new)
- `apps/web/src/app/dashboard/settings/reverse-mode/page.tsx` (modify)

**Implementation:**
4.1 Create SharingPreferencesPanel with granular controls
4.2 Create SharingPreviewCard showing "what parents see"
4.3 Add category-based toggles
4.4 Add time limit sharing toggle
4.5 Integrate into settings page

### Task 5: Update Parent Dashboard

**Files:**

- `apps/web/src/components/parent/ReverseModeDataView.tsx` (new)

**Implementation:**
5.1 Component to display shared data respecting reverse mode
5.2 Show "No data shared" or "Private" where appropriate
5.3 Indicate data is teen-controlled

## Dev Notes

### Building on Story 52-2

This story extends the basic sharing toggles from 52-2 with:

- More granular screen time sharing (summary vs full)
- Category-based app sharing
- Time limit status sharing
- Real-time preview of what parents see

### Existing Types to Extend

```typescript
// Current from 52-2
interface ReverseModeShareingPreferences {
  screenTime: boolean
  flags: boolean
  screenshots: boolean
  location: boolean
}

// Extended for 52-3
interface ReverseModeShareingPreferences {
  screenTime: 'none' | 'summary' | 'full'
  screenTimeCategories?: string[] // which categories to show
  flags: boolean
  flagCategories?: string[] // which flag categories to show
  screenshots: boolean
  location: boolean
  timeLimitStatus: boolean
}
```

### Parent Dashboard Impact

When reverse mode is active and selective sharing is configured:

1. Screen time shows summary or "Private" based on setting
2. App list filtered to shared categories only
3. Time limit status shown only if enabled
4. Flags filtered to shared categories

## Dev Agent Record

### Context Reference

Epic 52: Reverse Mode & Trusted Adults (Age 16 Transition)
Story 52-3 builds on 52-2's reverse mode foundation

- FR10: Child (in Reverse Mode) can choose which data to share with parents

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None required.

### Completion Notes List

- Implemented sharingPreviewService with calculateParentVisibility and generateSharingPreview functions
- Extended reverseMode.ts callable functions with getParentVisibleDataCallable and getSharingPreviewCallable
- Updated updateReverseModeSharing to handle granular preferences (screenTimeDetail, timeLimitStatus, sharedCategories)
- Created SharingPreferencesPanel component with full granular controls
- Created SharingPreviewCard component showing what parents will see
- Created ReverseModeDataView component for parent dashboard
- All 49 sharingPreviewService tests passing
- All 62 reverseModeService tests passing

### File List

- packages/shared/src/contracts/reverseMode.ts (modified - added screenTimeDetail, timeLimitStatus, sharedCategories fields)
- packages/shared/src/services/sharingPreviewService.ts (new)
- packages/shared/src/services/sharingPreviewService.test.ts (new - 49 tests)
- packages/shared/src/index.ts (modified - exports for sharingPreviewService)
- apps/functions/src/callable/reverseMode.ts (modified - granular sharing, getParentVisibleData, getSharingPreview)
- apps/web/src/components/reverse-mode/SharingPreferencesPanel.tsx (new)
- apps/web/src/components/reverse-mode/SharingPreviewCard.tsx (new)
- apps/web/src/components/reverse-mode/index.ts (new)
- apps/web/src/components/parent/ReverseModeDataView.tsx (new)
- apps/web/src/components/parent/index.ts (modified)
- apps/web/src/app/dashboard/settings/reverse-mode/page.tsx (modified - uses new components)
