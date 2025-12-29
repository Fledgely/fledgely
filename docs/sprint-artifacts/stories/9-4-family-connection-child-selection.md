# Story 9.4: Family Connection & Child Selection

Status: Done

## Story

As a **parent**,
I want **to connect this Chromebook to a specific child in my family**,
So that **monitoring data goes to the correct child profile**.

## Acceptance Criteria

1. **AC1: Family Children List**
   - Given parent is authenticated in the extension
   - When they select which child uses this device
   - Then extension displays list of children in family

2. **AC2: Child Selection**
   - Given extension shows list of children
   - When parent selects the child who uses this Chromebook
   - Then extension confirms connection ("Connected to [Child Name]'s profile")

3. **AC3: Device-Child Association**
   - Given child is selected
   - When connection is confirmed
   - Then device-child association is stored in Firestore

4. **AC4: Reassignment Support**
   - Given device is connected to a child
   - When parent wants to change assignment
   - Then device can be reassigned to different child later

5. **AC5: Agreement Requirement**
   - Given child is selected
   - When checking connection requirements
   - Then connection requires active agreement for selected child

## Tasks / Subtasks

- [x] Task 1: Child Selection UI (AC: #1, #2)
  - [x] 1.1 Create child selection dropdown/list in popup
  - [x] 1.2 Display child names and avatars
  - [x] 1.3 Show connection confirmation

- [x] Task 2: State Management (AC: #2, #4)
  - [x] 2.1 Store selected child in extension state
  - [x] 2.2 Support changing child selection
  - [x] 2.3 Update badge state when connected

- [x] Task 3: Mock Family Data (AC: #1, #5)
  - [x] 3.1 Create mock family/children data for development
  - [x] 3.2 Simulate agreement status check
  - [x] 3.3 Note: Real Firestore integration in Epic 12

## Dev Notes

### Implementation Strategy

For MVP, use mock family data stored in extension. Real Firestore integration
will come with Epic 12 (Chromebook Device Enrollment) which handles device
registration and API communication.

### Key Requirements

- **NFR70:** Chrome MV3 compliance

### Technical Details

This story focuses on UI and local state management. The extension will:

1. Display a list of children (mock data for now)
2. Allow parent to select which child uses this device
3. Store selection in chrome.storage.local
4. Update badge to show "monitoring active" state

Real API integration (fetching family from Firestore, device registration)
will be implemented in Epic 12 when device enrollment is built.

### References

- [Source: docs/epics/epic-list.md - Story 9.4]
- [Story 9.3: Extension Authentication]
- [Epic 12: Chromebook Device Enrollment]

## Dev Agent Record

### Context Reference

Story 9.3 completed - extension has auth flow

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **Three-State Popup UI** - Not authenticated, authenticated no child, authenticated connected
2. **Child Selection List** - Visual child selector with avatars, names, ages
3. **Agreement Enforcement** - Children without active agreement cannot be connected
4. **State Persistence** - connectedChild stored in chrome.storage.local
5. **Badge Updates** - Green badge when connected, amber when authenticated only
6. **Change Child Support** - "Change Child" button allows reassignment

### File List

- `apps/extension/popup.html` - Three-state popup with child selection UI
- `apps/extension/src/popup.ts` - Child selection logic and state management
- `apps/extension/src/background.ts` - CHILD_CONNECTED/DISCONNECTED handlers

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ Three-state UI correctly handles all scenarios
2. ✅ Child selection is accessible with ARIA roles
3. ✅ Agreement enforcement prevents connecting to children without agreements
4. ✅ State persists correctly across popup opens
5. ⚠️ Mock data used - real Firestore integration planned for Epic 12

**Verdict:** APPROVED - UI and state management complete. Ready for real API integration.
