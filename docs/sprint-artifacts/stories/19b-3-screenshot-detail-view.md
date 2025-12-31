# Story 19B.3: Screenshot Detail View

Status: done

## Story

As a **child**,
I want **to see details about each screenshot**,
So that **I understand the context of what was captured**.

## Acceptance Criteria

1. **AC1: Full-Size Screenshot Display**
   - Given child taps on a screenshot
   - When detail view opens
   - Then full-size screenshot displayed
   - And image is centered with proper aspect ratio

2. **AC2: Metadata Display**
   - Given child is viewing screenshot detail
   - When modal is displayed
   - Then exact timestamp shown (date and time)
   - And device name displayed
   - And app name or URL domain shown

3. **AC3: Transparency Label**
   - Given child is viewing screenshot detail
   - When modal is displayed
   - Then "This is what your parent can see" label shown prominently
   - And label uses child-friendly language

4. **AC4: Navigation Arrows**
   - Given child is viewing screenshot detail
   - When prev/next screenshots exist
   - Then navigation arrows displayed
   - And arrows disabled when at first/last screenshot
   - And keyboard navigation supported (arrows, Escape)

5. **AC5: Pinch-to-Zoom on Mobile**
   - Given child is viewing screenshot detail on mobile
   - When using pinch gesture on image
   - Then image zooms in/out smoothly
   - And zoom level bounded (e.g., 1x to 4x)
   - And can pan when zoomed in
   - And double-tap resets zoom

6. **AC6: Swipe to Dismiss on Mobile**
   - Given child is viewing screenshot detail on mobile
   - When swiping down on image
   - Then modal dismisses with animation
   - And velocity-based detection (quick swipe vs slow drag)
   - And visual feedback during swipe gesture

## Tasks / Subtasks

- [x] Task 1: Add Pinch-to-Zoom Support (AC: #5)
  - [x] 1.1 Add touch event handlers for pinch detection
  - [x] 1.2 Implement zoom state management (scale, origin)
  - [x] 1.3 Add pan support when zoomed in
  - [x] 1.4 Implement double-tap to reset zoom
  - [x] 1.5 Add zoom boundaries (1x min, 4x max)
  - [x] 1.6 Add unit tests for zoom functionality

- [x] Task 2: Add Swipe-to-Dismiss Gesture (AC: #6)
  - [x] 2.1 Add touch event handlers for vertical swipe
  - [x] 2.2 Implement drag state with visual feedback
  - [x] 2.3 Add velocity detection for quick dismiss
  - [x] 2.4 Add dismiss animation with spring physics
  - [x] 2.5 Handle edge cases (zoom vs swipe conflicts)
  - [x] 2.6 Add unit tests for swipe functionality

- [x] Task 3: Enhance Existing Modal (AC: #1-4)
  - [x] 3.1 Verify all existing AC still work
  - [x] 3.2 Add animation on modal open/close
  - [x] 3.3 Add zoom button controls for non-touch users

## Dev Notes

### Architecture Compliance

This story enhances the existing `ChildScreenshotDetail` component from Story 19B-1. Key patterns:

1. **Inline Styles**: Use `React.CSSProperties` objects, not Tailwind classes
2. **Data-TestID**: Add `data-testid` attributes for all testable elements
3. **Child-Friendly Language**: All text at 6th-grade reading level
4. **Sky Blue Theme**: Continue using sky-500 (#0ea5e9) color palette

### Existing Implementation

The `ChildScreenshotDetail` component already implements AC1-4:

```typescript
// apps/web/src/components/child/ChildScreenshotDetail.tsx
// Already has:
// - Full-size screenshot display with placeholder fallback
// - Metadata: timestamp, device, URL/domain
// - Transparency label: "This is what your parent can see. No secrets!"
// - Prev/next navigation with keyboard support
// - Close on overlay click, Escape key
// - Proper accessibility (role="dialog", aria-modal)
```

### Touch Gesture Implementation

For pinch-to-zoom and swipe gestures, use native touch events:

```typescript
// Touch event handlers approach
interface TouchState {
  scale: number
  translateX: number
  translateY: number
  lastDistance: number | null
  isDragging: boolean
  startY: number
  currentY: number
  velocity: number
}

// Pinch detection
function getDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch1.clientX - touch2.clientX
  const dy = touch1.clientY - touch2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// Velocity calculation for swipe detection
function calculateVelocity(startY: number, endY: number, duration: number): number {
  return (endY - startY) / duration
}
```

### Swipe Threshold Configuration

```typescript
const SWIPE_THRESHOLD = 100 // pixels
const VELOCITY_THRESHOLD = 0.5 // pixels per ms
const MAX_ZOOM = 4
const MIN_ZOOM = 1
const DOUBLE_TAP_DELAY = 300 // ms
```

### Testing Approach

Touch events in tests:

```typescript
// Create touch events for testing
function createTouchEvent(type: string, touches: Partial<Touch>[]) {
  return new TouchEvent(type, {
    touches: touches.map(
      (t) =>
        ({
          identifier: 0,
          target: document.body,
          clientX: t.clientX || 0,
          clientY: t.clientY || 0,
          ...t,
        }) as Touch
    ),
  })
}
```

### Color Scheme

Continue sky blue theme from 19B-1:

```typescript
const childTheme = {
  primary: '#0ea5e9', // sky-500
  primaryLight: '#e0f2fe', // sky-100
  primaryDark: '#0369a1', // sky-700
  background: '#f0f9ff', // sky-50
  overlay: 'rgba(0, 0, 0, 0.9)',
  modal: '#0c4a6e', // sky-900
}
```

### Project Structure Notes

**Files to modify:**

- `apps/web/src/components/child/ChildScreenshotDetail.tsx` - Add touch gestures
- `apps/web/src/components/child/ChildScreenshotDetail.test.tsx` - Add gesture tests

**No new files needed** - all changes are enhancements to existing component.

### Previous Story Intelligence

From Story 19B-1 and 19B-2 implementation:

1. **Pattern Used**: Inline styles with React.CSSProperties (no Tailwind)
2. **Test Pattern**: Vitest with @testing-library/react
3. **State Management**: useState hooks for local state
4. **Accessibility**: role="dialog", aria-modal="true", focus trap
5. **Keyboard Nav**: Already supports Escape and arrow keys

### Edge Cases

1. **Touch vs Mouse**: Detect touch capability, disable swipe for mouse
2. **Zoom during swipe**: Prevent swipe dismiss while zoomed in
3. **Multi-touch conflicts**: Handle pinch vs pan vs swipe priority
4. **No image**: Disable zoom on placeholder
5. **Small images**: Don't allow zoom beyond native resolution
6. **Momentum scrolling**: Stop momentum on touch start

### Accessibility Requirements

- Zoom controls also available as buttons for non-touch users
- Focus trap maintained during gestures
- Screen reader announcements for zoom state
- Touch targets minimum 44x44px (NFR49)

### References

- [Source: docs/epics/epic-list.md#Story-19B.3 - Screenshot Detail View]
- [Pattern: apps/web/src/components/child/ChildScreenshotDetail.tsx]
- [Previous: docs/sprint-artifacts/stories/19b-2-screenshot-timeline-view.md]
- [Architecture: docs/project_context.md - inline styles, no Tailwind]

---

## Dev Agent Record

### Context Reference

Story created as part of Epic 19B: Child Dashboard - My Screenshots

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required.

### Completion Notes List

1. Added pinch-to-zoom support with touch event handlers (handleTouchStart, handleTouchMove, handleTouchEnd)
2. Implemented TouchState interface for managing zoom/pan/swipe state
3. Added zoom controls (zoom in, zoom out, reset) for non-touch users with button controls
4. Implemented swipe-to-dismiss gesture with velocity-based detection
5. Added visual feedback during swipe (opacity changes, translateY transform)
6. Added dismiss animation (200ms fade out with translateY)
7. Zoom levels bounded between 1x and 4x
8. Pan support when zoomed in (translateX/translateY)
9. Double-tap to reset zoom
10. Zoom buttons have accessible labels (aria-label)
11. All 27 tests pass (16 original + 11 new for zoom/gesture features)
12. Fixed TypeScript type issue with React.Touch vs Touch using TouchPoint interface
13. Code review fixes applied:
    - Removed unused `imageRef` (dead code)
    - Removed unused `styles.image` (dead code)
    - Removed unused `PAN_DEADZONE` config (dead code)
    - Added keyboard zoom support (+/- keys to zoom, 0 to reset)
    - Added focus styling to zoom buttons (className and CSS)
    - Fixed pan calculation to track movement properly when zoomed

### File List

**Modified:**

- `apps/web/src/components/child/ChildScreenshotDetail.tsx` - Added touch gestures, zoom controls
- `apps/web/src/components/child/ChildScreenshotDetail.test.tsx` - Added zoom/gesture tests

## Change Log

| Date       | Change                                                            |
| ---------- | ----------------------------------------------------------------- |
| 2025-12-31 | Story created and marked drafted                                  |
| 2025-12-31 | Implementation complete - touch gestures and zoom controls added  |
| 2025-12-31 | Code review completed - 6 issues fixed (dead code, accessibility) |
