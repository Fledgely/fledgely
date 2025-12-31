# Story 8.5.6: Demo for Child Explanation

Status: done

## Story

As a **parent**,
I want **to use the demo to explain fledgely to my child**,
So that **my child understands what monitoring looks like before agreeing**.

## Acceptance Criteria

1. **AC1: Child-Friendly Explanations**
   - Given parent wants to show their child what fledgely does
   - When they access demo in "explain to child" mode
   - Then child-friendly explanations appear alongside sample data

2. **AC2: Bilateral Transparency Highlight**
   - Given demo is in child explanation mode
   - When displaying sample data
   - Then demo highlights bilateral transparency ("You'll see this too!")

3. **AC3: Crisis Resources Preview**
   - Given demo is showing features to child
   - When crisis-related content appears
   - Then demo shows what crisis resources look like (protected)

4. **AC4: Agreement Co-Creation Emphasis**
   - Given demo is explaining monitoring
   - When showing rules/limits
   - Then demo emphasizes agreement co-creation ("You help decide the rules")

5. **AC5: Reading Level Appropriateness**
   - Given content is displayed in child mode
   - When any text is shown
   - Then language is at 6th-grade reading level

6. **AC6: Child Device Viewing**
   - Given parent is explaining demo to child
   - When they want child to see on their own device
   - Then demo can be viewed on child's device during explanation

## Tasks / Subtasks

- [x] Task 1: Create ChildExplanationMode Toggle (AC: #1, #6)
  - [x] 1.1 Add `isChildExplanationMode` state to useDemo hook
  - [x] 1.2 Create `enterChildExplanationMode()` and `exitChildExplanationMode()` functions
  - [x] 1.3 Add "Explain to Child" button in DemoChildCard
  - [x] 1.4 Create shareable link/QR for child device viewing
  - [x] 1.5 Create unit tests

- [x] Task 2: Create ChildFriendlyOverlay Component (AC: #1, #5)
  - [x] 2.1 Create `ChildFriendlyOverlay.tsx` in demo components
  - [x] 2.2 Display child-friendly explanations next to demo content
  - [x] 2.3 Ensure all text is at 6th-grade reading level
  - [x] 2.4 Add visual callouts/highlights for key points
  - [x] 2.5 Create unit tests

- [x] Task 3: Create BilateralTransparencyCallout Component (AC: #2)
  - [x] 3.1 Create `BilateralTransparencyCallout.tsx`
  - [x] 3.2 Display "You'll see this too!" message near screenshots
  - [x] 3.3 Show child-parent equality visual (mirror metaphor)
  - [x] 3.4 Explain what child can/can't see
  - [x] 3.5 Create unit tests

- [x] Task 4: Create CrisisResourcesPreview Component (AC: #3)
  - [x] 4.1 Create `CrisisResourcesPreview.tsx`
  - [x] 4.2 Show example of protected/private browsing mode
  - [x] 4.3 Explain crisis resources are never captured
  - [x] 4.4 Reassure child about privacy for help-seeking
  - [x] 4.5 Create unit tests

- [x] Task 5: Create AgreementCoCreationHighlight Component (AC: #4)
  - [x] 5.1 Create `AgreementCoCreationHighlight.tsx`
  - [x] 5.2 Display "You help decide the rules" messaging
  - [x] 5.3 Show example of negotiable limits
  - [x] 5.4 Explain child's voice in the process
  - [x] 5.5 Create unit tests

- [x] Task 6: Update Demo Components for Child Mode (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 Add childExplanationMode prop to DemoChildCard
  - [x] 6.2 ChildFriendlyOverlay wraps content with section-specific callouts
  - [x] 6.3 Callout components conditionally shown based on section
  - [x] 6.4 Integrate callout components when in child mode
  - [x] 6.5 Create integration tests

## Dev Notes

### Implementation Strategy

Story 8-5-6 adds a "child explanation mode" to the existing demo infrastructure. This mode transforms the demo from a parent preview tool into a collaborative explanation session where parents can show children what monitoring will look like.

**Key insight**: This is NOT about creating a separate child interface - it's about adding contextual explanations and highlighting features that matter to children (privacy, fairness, agency).

### Component Architecture

**New Components:**

```
apps/web/src/components/dashboard/demo/
├── ChildFriendlyOverlay.tsx       # Wrapper adding child-friendly explanations
├── ChildFriendlyOverlay.test.tsx
├── BilateralTransparencyCallout.tsx  # "You'll see this too!"
├── BilateralTransparencyCallout.test.tsx
├── CrisisResourcesPreview.tsx     # Shows protected browsing
├── CrisisResourcesPreview.test.tsx
├── AgreementCoCreationHighlight.tsx  # "You help decide the rules"
├── AgreementCoCreationHighlight.test.tsx
└── index.ts                       # Updated exports
```

### Reading Level Guidelines (AC5: 6th Grade)

**Writing Rules:**

- Sentences: 10-15 words average
- Words: 1-2 syllables preferred
- Avoid jargon: "screenshot" → "picture of your screen"
- Active voice: "We take pictures" not "Pictures are taken"
- Direct address: "You" not "the child"

**Example Transformations:**

- "Bilateral transparency" → "You and your parent see the same things"
- "Monitoring captures screenshots" → "We save pictures of what's on the screen"
- "Crisis resources are protected" → "Help websites stay private - no one sees them"
- "Agreement co-creation" → "You help make the rules together"

### Child Mode UI/UX Patterns

**Visual Callouts:**

```typescript
interface CalloutProps {
  icon: string      // Emoji for visual appeal
  title: string     // Short, clear heading
  message: string   // Child-friendly explanation
  emphasis?: 'neutral' | 'positive' | 'reassuring'
}

// Example usage
<Callout
  icon="👀"
  title="You See This Too!"
  message="Your parent doesn't see anything secret. You both see the same pictures."
  emphasis="positive"
/>
```

**Color Scheme for Child Mode:**

- Keep lavender demo theme (#faf5ff)
- Add friendly accent colors
- Use larger text (16px base instead of 14px)
- More whitespace and padding

### State Management Updates

**useDemo hook additions:**

```typescript
interface UseDemoReturn {
  // Existing...
  showDemoProfile: boolean
  demoArchived: boolean
  // New for 8-5-6
  isChildExplanationMode: boolean
  enterChildExplanationMode: () => void
  exitChildExplanationMode: () => void
  childModeShareUrl: string | null
}
```

### Shareable Link Strategy (AC6)

**Option 1: URL Parameter (Recommended)**

- Add `?mode=child-explain` to demo URL
- No authentication required for view-only
- Parent stays logged in, child just views
- URL expires after session or 24 hours

**Option 2: QR Code**

- Generate QR linking to child explanation view
- Child scans on their device
- Same view-only, time-limited access

### Crisis Resources Preview Content

Show sample of:

1. Protected sites list (crisis hotlines, health resources)
2. "Private Mode" visual indicator
3. Explanation: "When you visit help websites, no pictures are taken"
4. Reassurance: "Getting help is always private"

**From Story 7.2 (Zero-Data-Path):**

- Link to existing allowlist concepts
- Don't duplicate allowlist functionality
- Just preview what "protected" looks like

### Existing Demo Components to Modify

From previous stories, these need childExplanationMode prop:

1. **DemoScreenshotGallery** (Story 8-5-2)
   - Add "You'll see this too!" callout
   - Explain what screenshots show

2. **DemoTimeTrackingPanel** (Story 8-5-3)
   - Add "Time tracking helps you both" callout
   - Explain limits are negotiable

3. **DemoFlagReviewPanel** (Story 8-5-4)
   - Add "Flags start a conversation" callout
   - Explain child can add context first

### Integration with DemoChildCard

Add to existing DemoChildCard (from Story 8-5-5):

```tsx
// New button in button container
;<button onClick={enterChildExplanationMode}>👨‍👧 Explain to Child</button>

// Mode indicator when active
{
  isChildExplanationMode && <ChildModeIndicator onExit={exitChildExplanationMode} />
}
```

### Project Structure Notes

Files to create:

- `apps/web/src/components/dashboard/demo/ChildFriendlyOverlay.tsx`
- `apps/web/src/components/dashboard/demo/ChildFriendlyOverlay.test.tsx`
- `apps/web/src/components/dashboard/demo/BilateralTransparencyCallout.tsx`
- `apps/web/src/components/dashboard/demo/BilateralTransparencyCallout.test.tsx`
- `apps/web/src/components/dashboard/demo/CrisisResourcesPreview.tsx`
- `apps/web/src/components/dashboard/demo/CrisisResourcesPreview.test.tsx`
- `apps/web/src/components/dashboard/demo/AgreementCoCreationHighlight.tsx`
- `apps/web/src/components/dashboard/demo/AgreementCoCreationHighlight.test.tsx`

Files to modify:

- `apps/web/src/hooks/useDemo.ts` - Add child explanation mode state
- `apps/web/src/hooks/useDemo.test.ts` - Add child mode tests
- `apps/web/src/components/dashboard/demo/DemoScreenshotGallery.tsx` - Add childExplanationMode
- `apps/web/src/components/dashboard/demo/DemoTimeTrackingPanel.tsx` - Add childExplanationMode
- `apps/web/src/components/dashboard/demo/DemoFlagReviewPanel.tsx` - Add childExplanationMode
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Add explain button
- `apps/web/src/components/dashboard/demo/index.ts` - Add exports

### Testing Strategy

- Unit tests for each new callout component
- Unit tests for 6th-grade reading level validation
- Integration tests for child mode toggle
- Tests for child device URL generation
- Visual regression tests for child mode UI

### References

- [Source: docs/epics/epic-list.md#story-856-demo-for-child-explanation]
- [Source: Story 8-5-1 through 8-5-5 - Existing demo infrastructure]
- [Source: Story 7-2-crisis-visit-zero-data-path - Crisis protection concepts]
- [Source: Epic 5 - Agreement co-creation flow]

## Dev Agent Record

### Context Reference

Story created for Epic 8.5: Demo Mode - Early Win Preview.
Builds on demo infrastructure from Stories 8-5-1 through 8-5-5.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required.

### Completion Notes List

1. Added child explanation mode state to useDemo hook (isChildExplanationMode, enterChildExplanationMode, exitChildExplanationMode)
2. Created shareable URL generator (childModeShareUrl) for child device viewing
3. Created BilateralTransparencyCallout component with "You See This Too!" messaging
4. Created CrisisResourcesPreview component showing protected help sites
5. Created AgreementCoCreationHighlight component with "You Help Decide the Rules" messaging
6. Created ChildFriendlyOverlay wrapper that displays section-specific callouts
7. Added "Explain to Child" button to DemoChildCard with toggle behavior
8. All callout text validated for 6th-grade reading level (short sentences, simple words)
9. All components use green/amber/sky color themes matching content type
10. [Code Review Fix] Integrated ChildFriendlyOverlay into DemoChildCard sections (gallery, time-tracking, flags)
11. [Code Review Fix] Added onExitChildExplanationMode prop to DemoChildCard for exit button callback
12. [Code Review Fix] Added 5 integration tests for overlay wrapping behavior

### File List

**Created:**

- `apps/web/src/components/dashboard/demo/BilateralTransparencyCallout.tsx`
- `apps/web/src/components/dashboard/demo/BilateralTransparencyCallout.test.tsx`
- `apps/web/src/components/dashboard/demo/CrisisResourcesPreview.tsx`
- `apps/web/src/components/dashboard/demo/CrisisResourcesPreview.test.tsx`
- `apps/web/src/components/dashboard/demo/AgreementCoCreationHighlight.tsx`
- `apps/web/src/components/dashboard/demo/AgreementCoCreationHighlight.test.tsx`
- `apps/web/src/components/dashboard/demo/ChildFriendlyOverlay.tsx`
- `apps/web/src/components/dashboard/demo/ChildFriendlyOverlay.test.tsx`

**Modified:**

- `apps/web/src/hooks/useDemo.ts` - Added child explanation mode state
- `apps/web/src/hooks/useDemo.test.ts` - Added 8 child mode tests
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Added explain button
- `apps/web/src/components/dashboard/DemoChildCard.test.tsx` - Added 13 integration tests (8 button, 5 overlay)
- `apps/web/src/components/dashboard/demo/index.ts` - Added component exports

## Change Log

| Date       | Change                                         |
| ---------- | ---------------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev         |
| 2025-12-31 | Story implemented and marked done              |
| 2025-12-31 | Code review: Fixed AC1 overlay integration gap |
