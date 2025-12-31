# Story 28-6: Accessibility Settings

## Status: Done

## Story

As **a parent with visual impairment**,
I want **to configure accessibility preferences**,
So that **the app works best for my needs**.

## Acceptance Criteria

- [x] AC1: "Always show descriptions" toggle available
- [x] AC2: "High contrast mode" option for low-vision users
- [x] AC3: "Larger text" option (respects system settings)
- [x] AC4: "Audio descriptions" option for spoken playback
- [x] AC5: Settings sync across devices
- [x] AC6: Settings detectable from OS accessibility preferences

## Technical Tasks

1. **Create AccessibilitySettings type in shared**
   - Define schema for accessibility preferences
   - Add to user profile or create separate settings doc

2. **Create AccessibilitySettings component**
   - Toggle for "Always show descriptions"
   - Toggle for "High contrast mode"
   - Toggle for "Larger text"
   - Toggle for "Audio descriptions"

3. **Add to user settings page**
   - Accessibility section in settings
   - Settings persist to Firestore

4. **Apply settings to components**
   - Auto-expand descriptions when "Always show descriptions" enabled
   - High contrast styles when enabled
   - Font size scaling when "Larger text" enabled

5. **Detect OS accessibility preferences**
   - Use prefers-reduced-motion, prefers-contrast media queries
   - Auto-enable relevant settings

6. **Update tests**
   - Test settings toggle functionality
   - Test settings persistence
   - Test settings application

## Implementation Notes

- Store settings in user document or separate accessibility_settings collection
- Use React Context to provide settings across app
- Media queries for OS preference detection already partially implemented
- Audio descriptions can be deferred to a later story if complex

## Files Modified

- packages/shared/src/contracts/index.ts (accessibility settings schema)
- apps/web/src/contexts/AccessibilityContext.tsx (new)
- apps/web/src/components/settings/AccessibilitySettings.tsx (new)
- apps/web/src/components/settings/AccessibilitySettings.test.tsx (new)
