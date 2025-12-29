# Story 11.3: Protected Site Visual Indicator

Status: Done

## Story

As a **child on a crisis resource**,
I want **to see a visual indicator that this site is protected**,
So that **I know monitoring is paused and I can browse safely**.

## Acceptance Criteria

1. **AC1: Visual Indicator Display**
   - Given child navigates to a crisis-protected URL
   - When page loads
   - Then extension shows a subtle visual indicator (icon badge)

2. **AC2: Reassuring Message**
   - Given indicator is displayed
   - When child sees it
   - Then indicator confirms "This site is private - not monitored"

3. **AC3: Calming Design**
   - Given indicator is displayed
   - When child views it
   - Then indicator is calming, not alarming (no red, no warnings)

4. **AC4: Navigation Aware**
   - Given indicator is displayed
   - When child navigates away from protected site
   - Then indicator disappears

5. **AC5: Optional Setting**
   - Given child has privacy preferences
   - When accessing settings
   - Then indicator is optional (can be disabled in child settings)

6. **AC6: No Logging**
   - Given indicator is displayed
   - When indicator state changes
   - Then indicator itself is not logged or reported (no privacy leak)

## Tasks / Subtasks

- [x] Task 1: Badge-Based Indicator (AC: #1, #3, #4)
  - [x] 1.1 Create setProtectedBadge function (purple/blue shield icon)
  - [x] 1.2 Create clearProtectedBadge function
  - [x] 1.3 Hook badge updates to tab navigation events

- [x] Task 2: Tab Navigation Monitoring (AC: #4)
  - [x] 2.1 Add chrome.tabs.onUpdated listener
  - [x] 2.2 Check URL against allowlist on navigation
  - [x] 2.3 Update badge state based on protection status

- [x] Task 3: Reassuring Title (AC: #2)
  - [x] 3.1 Update action title when on protected site
  - [x] 3.2 Show "Fledgely - Private Site" tooltip on hover

- [x] Task 4: Optional Setting (AC: #5, #6)
  - [x] 4.1 Add showProtectedIndicator to ExtensionState
  - [x] 4.2 Default to true (show indicator by default)
  - [x] 4.3 Add UPDATE_PROTECTED_INDICATOR message handler
  - [x] 4.4 Ensure no logging when indicator state changes

## Dev Notes

### Implementation Strategy

Use the extension badge to show a calming indicator when on a protected site.
The badge will show a purple "✓" to indicate protection is active.
This is more subtle than an overlay and doesn't interfere with page content.

### Key Requirements

- **FR64:** No capture of crisis sites
- **FR80:** Child-visible protection indicator
- **NFR28:** Crisis protection UX

### Technical Details

Badge design:

```typescript
// Protected site badge
const PROTECTED_BADGE_TEXT = '✓' // Checkmark
const PROTECTED_BADGE_COLOR = '#8b5cf6' // Purple (calming)

// Action title when protected
const PROTECTED_TITLE = 'Fledgely - Private Site (not monitored)'
```

Navigation monitoring:

```typescript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isProtected = isUrlProtected(tab.url)
    if (isProtected) {
      setProtectedBadge(tabId)
    } else {
      clearProtectedBadge(tabId)
    }
  }
})
```

No logging requirement:

- Badge state changes are NOT logged via event-logger
- No capture_skipped_protected event includes badge info
- Only the capture skip is logged, not the indicator display

### References

- [Source: docs/epics/epic-list.md - Story 11.3]
- [Story 11.1: Pre-Capture Allowlist Check]
- [Chrome Action Badge API](https://developer.chrome.com/docs/extensions/reference/api/action)

## Dev Agent Record

### Context Reference

Story 11.2 completed - cached allowlist with sync in place

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **PROTECTED_BADGE_TEXT** - Purple checkmark "✓" (calming design)
2. **PROTECTED_BADGE_COLOR** - #8b5cf6 (purple, not alarming)
3. **PROTECTED_TITLE** - "Fledgely - Private Site (not monitored)"
4. **setProtectedBadge()** - Sets tab-specific badge and title
5. **clearProtectedBadge()** - Restores normal badge state for tab
6. **updateProtectedBadge()** - Checks URL and updates badge accordingly
7. **chrome.tabs.onUpdated Listener** - Updates badge on page load complete
8. **chrome.tabs.onActivated Listener** - Updates badge on tab switch
9. **showProtectedIndicator Setting** - Added to ExtensionState (default: true)
10. **UPDATE_PROTECTED_INDICATOR Handler** - Message handler to toggle setting
11. **No Logging** - All badge operations explicitly don't log (AC6 compliance)
12. **Tab-Specific Badges** - Badge state is per-tab, not global

### File List

- `apps/extension/src/background.ts` - Badge functions, tab listeners, message handler

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ Purple checkmark badge on protected sites (calming design)
2. ✅ Tab-specific badges (per-tab state)
3. ✅ Badge updates on navigation and tab switch
4. ✅ Title shows "Private Site (not monitored)" for reassurance
5. ✅ Optional setting with default true
6. ✅ UPDATE_PROTECTED_INDICATOR message handler
7. ✅ NO logging of badge state changes (privacy compliance)
8. ✅ Silently fails on badge errors (non-critical feature)

**Verdict:** APPROVED - Protected site visual indicator with calming design and privacy compliance.
