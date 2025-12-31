# Story 28.3: Screen Reader Integration

Status: ready-for-dev

## Story

As **a blind parent using a screen reader**,
I want **descriptions properly formatted for screen readers**,
So that **I can navigate content efficiently**.

## Acceptance Criteria

1. **AC1: Alt-text for screenshot images**
   - Given parent uses screen reader (VoiceOver, NVDA, JAWS)
   - When viewing screenshot in dashboard
   - Then description set as alt-text for screenshot image
   - And falls back to generic alt-text if description unavailable

2. **AC2: Expandable text description**
   - Given description is available
   - When viewing screenshot
   - Then description also available as expandable text
   - And text is visually hidden but screen-reader accessible

3. **AC3: Semantic HTML structure**
   - Given screenshot gallery/detail views
   - When rendering components
   - Then semantic HTML ensures proper reading order
   - And uses appropriate landmarks (region, article, button)

4. **AC4: Read full description button**
   - Given screenshot with description
   - When interacting via screen reader
   - Then "Read full description" button for detailed version
   - And button announces description when activated

5. **AC5: Keyboard navigation**
   - Given screenshot gallery/detail views
   - When navigating with keyboard
   - Then keyboard navigation fully supported
   - And focus management is proper
   - And skip links available where appropriate

6. **AC6: Screen reader testing**
   - Given implementation complete
   - When tested with screen readers
   - Then tested with VoiceOver (iOS/macOS)
   - And tested with NVDA (Windows) considerations documented

## Tasks / Subtasks

- [ ] Task 1: Update ChildScreenshot type (AC: #1, #2)
  - [ ] 1.1 Add accessibilityDescription field to ChildScreenshot interface
  - [ ] 1.2 Update convertToChildScreenshot to include description from Firestore
  - [ ] 1.3 Add tests for description field conversion

- [ ] Task 2: Enhance ChildScreenshotCard accessibility (AC: #1, #3, #5)
  - [ ] 2.1 Use accessibility description as alt-text for screenshot image
  - [ ] 2.2 Add fallback alt-text when description unavailable
  - [ ] 2.3 Add proper ARIA attributes for button role
  - [ ] 2.4 Ensure keyboard navigation works correctly
  - [ ] 2.5 Add tests for accessibility enhancements

- [ ] Task 3: Add "Read full description" button (AC: #4)
  - [ ] 3.1 Create ScreenshotDescriptionButton component
  - [ ] 3.2 Add visually hidden but screen-reader accessible description
  - [ ] 3.3 Add button that announces description when activated
  - [ ] 3.4 Add tests for description button

- [ ] Task 4: Enhance ChildScreenshotDetail accessibility (AC: #2, #3, #5)
  - [ ] 4.1 Add expandable description section
  - [ ] 4.2 Use semantic HTML landmarks
  - [ ] 4.3 Add proper focus management on open/close
  - [ ] 4.4 Add skip link to description
  - [ ] 4.5 Add tests for detail view accessibility

- [ ] Task 5: Screen reader testing documentation (AC: #6)
  - [ ] 5.1 Document VoiceOver testing results
  - [ ] 5.2 Document NVDA testing considerations
  - [ ] 5.3 Add manual test checklist in dev notes

## Dev Notes

### Previous Story Intelligence (28-1, 28-2)

**From Story 28-1 implementation:**

- `accessibilityDescription` field stored in Firestore on screenshot document
- Type: `ScreenshotDescription` from `@fledgely/shared/contracts`
- Fields: status, description, wordCount, generatedAt, modelVersion, error, retryCount

**From Story 28-2 implementation:**

- Descriptions follow WCAG accessibility best practices
- Quality fields: imageQuality, confidenceScore, isSensitiveContent
- Factual descriptions prioritized over interpretation

**Existing components to modify:**

- `apps/web/src/hooks/useChildScreenshots.ts` - Add accessibilityDescription to ChildScreenshot
- `apps/web/src/components/child/ChildScreenshotCard.tsx` - Enhanced alt-text, keyboard nav
- `apps/web/src/components/child/ChildScreenshotDetail.tsx` - Expandable description, focus management

### Architecture Pattern

```typescript
// ChildScreenshot type extension
export interface ChildScreenshot {
  id: string
  imageUrl: string
  timestamp: number
  url: string
  title: string
  deviceId: string
  // NEW: Accessibility description from Story 28-1
  accessibilityDescription?: {
    status: 'pending' | 'processing' | 'completed' | 'failed'
    description?: string
    wordCount?: number
  }
}
```

### Semantic HTML Structure

```tsx
// ChildScreenshotCard - Semantic button with proper alt-text
<article>
  <button
    role="button"
    aria-label={accessibilityDescription?.description || `Screenshot from ${time}: ${title}`}
  >
    <img
      src={imageUrl}
      alt={accessibilityDescription?.description || `Screenshot: ${title}`}
      loading="lazy"
    />
    <div aria-hidden="true">{/* Visual metadata */}</div>
  </button>
  {/* Screen reader only: Read full description button */}
  <button className="sr-only" onClick={handleReadDescription}>
    Read full description
  </button>
</article>

// ChildScreenshotDetail - Semantic dialog with landmarks
<dialog aria-modal="true" aria-labelledby="detail-title">
  <header>
    <h2 id="detail-title">{title}</h2>
    <button aria-label="Close viewer">✕</button>
  </header>
  <main>
    <img alt={accessibilityDescription?.description || `Screenshot: ${title}`} />
  </main>
  <section aria-labelledby="description-heading">
    <h3 id="description-heading" className="sr-only">Description</h3>
    <p>{accessibilityDescription?.description}</p>
  </section>
  <footer>
    {/* Metadata */}
  </footer>
</dialog>
```

### Screen Reader Friendly CSS

```css
/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focusable when tabbed to */
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### Testing Approach

```typescript
// Test alt-text with accessibility description
it('uses accessibility description as alt-text when available', () => {
  const screenshot = {
    ...mockScreenshot,
    accessibilityDescription: {
      status: 'completed',
      description: 'YouTube video showing Minecraft gameplay',
    },
  }
  render(<ChildScreenshotCard screenshot={screenshot} onClick={vi.fn()} />)
  expect(screen.getByRole('img')).toHaveAttribute(
    'alt',
    'YouTube video showing Minecraft gameplay'
  )
})

// Test fallback alt-text
it('uses fallback alt-text when description unavailable', () => {
  render(<ChildScreenshotCard screenshot={mockScreenshot} onClick={vi.fn()} />)
  expect(screen.getByRole('img')).toHaveAttribute(
    'alt',
    expect.stringContaining('Screenshot:')
  )
})

// Test keyboard navigation
it('supports keyboard activation', () => {
  const onClick = vi.fn()
  render(<ChildScreenshotCard screenshot={mockScreenshot} onClick={onClick} />)
  const button = screen.getByRole('button')
  button.focus()
  fireEvent.keyDown(button, { key: 'Enter' })
  expect(onClick).toHaveBeenCalled()
})
```

### Manual Screen Reader Test Checklist

**VoiceOver (macOS/iOS):**

- [ ] Screenshot card announces description when focused
- [ ] "Read full description" button works
- [ ] Gallery navigation works with VO+arrows
- [ ] Detail modal focus traps correctly
- [ ] Close button announces properly
- [ ] Navigation buttons (prev/next) work

**NVDA (Windows) Considerations:**

- [ ] Browse mode vs Focus mode works correctly
- [ ] Landmarks detected (dialog, article, button)
- [ ] Alt-text read correctly on images
- [ ] Keyboard shortcuts don't conflict

### NFR Compliance

- **NFR44:** Accessibility best practices - WCAG 2.1 AA compliance
- **NFR47:** 60-second timeout - N/A (frontend only)

### References

- [Source: docs/epics/epic-list.md#story-283] - Story 28.3 requirements
- [Source: apps/web/src/hooks/useChildScreenshots.ts] - Current hook implementation
- [Source: apps/web/src/components/child/ChildScreenshotCard.tsx] - Current card component
- [Source: apps/web/src/components/child/ChildScreenshotDetail.tsx] - Current detail component
- [Source: packages/shared/src/contracts/index.ts] - ScreenshotDescription schema
- [Source: Story 28-1] - AI description generation
- [Source: Story 28-2] - Description quality standards
