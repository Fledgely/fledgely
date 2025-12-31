# Story 28-5: Description Generation Failures

## Status: Done

## Story

As **the system**,
I want **to handle description generation failures gracefully**,
So that **parents still have access to screenshots**.

## Acceptance Criteria

- [ ] AC1: Fallback text shown: "Description unavailable" when generation fails
- [ ] AC2: Screenshot still accessible (image visible for sighted users)
- [ ] AC3: Retry option available: "Generate description" button
- [ ] AC4: Manual description request queued for processing
- [ ] AC5: Failure logged for monitoring
- [ ] AC6: Never blocks screenshot display waiting for description

## Technical Tasks

1. **Update FlagDetailModal for failed state**
   - Show "Description unavailable" when status is 'failed'
   - Add "Retry" button to trigger regeneration
   - Ensure screenshot remains visible regardless of description status

2. **Update ChildScreenshotCard for failed state**
   - Show fallback alt-text when description failed
   - Add retry button for screen reader users

3. **Update ChildScreenshotDetail for failed state**
   - Show "Description unavailable" message
   - Add "Generate description" button

4. **Create retry description service**
   - API endpoint to trigger description regeneration
   - Queue job for Cloud Tasks processing

5. **Update tests**
   - Test failed state display
   - Test retry button functionality
   - Test accessibility for failed state

## Implementation Notes

- The accessibilityDescription.status can be 'pending', 'processing', 'completed', or 'failed'
- Failed state should show error message and retry option
- Retry triggers the same screenshotDescriptionService.generateScreenshotDescription
- This builds on Story 28-1 (generation) and Story 28-4 (display)

## Files Modified

- apps/web/src/components/flags/FlagDetailModal.tsx
- apps/web/src/components/flags/FlagDetailModal.test.tsx
- apps/web/src/components/child/ChildScreenshotCard.tsx
- apps/web/src/components/child/ChildScreenshotCard.test.tsx
- apps/web/src/components/child/ChildScreenshotDetail.tsx
- apps/web/src/components/child/ChildScreenshotDetail.test.tsx
