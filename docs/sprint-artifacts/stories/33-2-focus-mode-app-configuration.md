# Story 33.2: Focus Mode App Configuration

Status: in-progress
Epic: 33 - Focus Mode & Work Mode
Priority: High

## Story

As **a parent**,
I want **to configure which apps are allowed during focus mode**,
So that **my child has appropriate tools for concentration**.

## Acceptance Criteria

1. **AC1: Default Allow List**
   - Given focus mode is being configured
   - When parent views focus mode settings
   - Then default allow list includes: Google Docs, educational sites, productivity
   - And defaults can be reviewed and modified

2. **AC2: Default Block List**
   - Given focus mode is being configured
   - When parent views focus mode settings
   - Then default block list includes: social media, games, streaming
   - And defaults can be reviewed and modified

3. **AC3: Custom App Configuration**
   - Given parent is configuring focus mode
   - When adding custom apps
   - Then custom apps can be added to allow or block list
   - And apps can be removed from either list
   - And changes take effect immediately

4. **AC4: Child Suggestions**
   - Given child wants to use an app during focus mode
   - When child requests: "Can I use Spotify during focus?"
   - Then request is sent to parent
   - And parent can approve or deny
   - And approved apps are added to allow list

5. **AC5: Configuration Storage**
   - Given configuration is updated
   - When parent saves changes
   - Then configuration is stored in Firestore per child
   - And Chrome extension syncs updated configuration
   - And child sees updated app list

## Technical Notes

- Extend focus mode data model from Story 33-1
- Store custom allow/block lists per child in Firestore
- Add suggestion/request schema for child requests
- Chrome extension syncs configuration and updates blocking
- Parent UI for managing focus mode settings

## Dependencies

- Story 33-1: Child-Initiated Focus Mode (provides base infrastructure)

## Tasks / Subtasks

- [ ] Task 1: Extend focus mode data model (AC: #1, #2, #5)
  - [ ] 1.1 Add FocusModeConfig schema to @fledgely/shared
  - [ ] 1.2 Add AppSuggestion schema for child requests
  - [ ] 1.3 Update FOCUS_MODE_DEFAULT_CATEGORIES with customization support

- [ ] Task 2: Create focus mode configuration hook (AC: #1, #2, #3, #5)
  - [ ] 2.1 Create `useFocusModeConfig` hook for parent
  - [ ] 2.2 Implement add/remove app from allow/block list
  - [ ] 2.3 Add real-time sync with Firestore

- [ ] Task 3: Create parent configuration UI (AC: #1, #2, #3)
  - [ ] 3.1 Create `FocusModeSettings` component
  - [ ] 3.2 Create `AppListEditor` component for managing apps
  - [ ] 3.3 Add category-based app selection

- [ ] Task 4: Implement child suggestion feature (AC: #4)
  - [ ] 4.1 Create `AppSuggestionButton` for child UI
  - [ ] 4.2 Create `useFocusModeSuggestions` hook
  - [ ] 4.3 Create parent notification for suggestions
  - [ ] 4.4 Add approve/deny actions

- [ ] Task 5: Extension configuration sync (AC: #5)
  - [ ] 5.1 Add config sync to focus-mode.ts
  - [ ] 5.2 Update blocking logic to use custom config
  - [ ] 5.3 Add config update message handler

## Dev Agent Record

### File List

(Files to be created during implementation)

### Change Log

- 2025-12-31: Story 33-2 created
