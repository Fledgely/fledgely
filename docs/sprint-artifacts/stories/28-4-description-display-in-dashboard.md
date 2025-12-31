# Story 28-4: Description Display in Dashboard

## Status: Done

## Story

As **a parent**,
I want **to see AI-generated descriptions alongside screenshots**,
So that **I have text context even when image is unclear**.

## Acceptance Criteria

- [x] AC1: Description shown below/beside screenshot
- [x] AC2: Collapsible for sighted users who prefer images
- [x] AC3: Expanded by default when screen reader detected
- [x] AC4: Description helps when screenshot is blurry or low-resolution
- [x] AC5: "AI Generated" label indicates source
- [x] AC6: Useful for all parents, not just visually impaired

## Technical Tasks

1. **Fetch accessibilityDescription from screenshot document**
   - Update FlagDetailModal to fetch screenshot doc with description
   - Add ScreenshotDescription type to props

2. **Update FlagDetailModal to display description**
   - Add collapsible description panel below screenshot
   - Show "AI Generated" label with icon
   - Use description as alt-text for screenshot image

3. **Implement screen reader detection**
   - Check for reduced motion/prefers-reduced-motion
   - Expand description by default for accessibility users
   - Use semantic HTML for proper reading order

4. **Style description panel**
   - Match existing panel styles
   - Collapsible with expand/collapse toggle
   - Accessible button with aria-expanded

5. **Update tests**
   - Test description display
   - Test collapsible behavior
   - Test screen reader accessibility

## Implementation Notes

- The accessibilityDescription is stored on the screenshot document in Firestore
- Use the existing ScreenshotDescription type from @fledgely/shared
- This builds on Story 28-1 (generation) and Story 28-3 (screen reader integration)

## Files Modified

- apps/web/src/components/flags/FlagDetailModal.tsx
- apps/web/src/components/flags/FlagDetailModal.test.tsx
