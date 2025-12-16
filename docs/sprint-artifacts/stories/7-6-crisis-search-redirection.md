# Story 7.6: Crisis Search Redirection

Status: done

## Story

As a **child searching for crisis help**,
I want **searches for help to guide me to protected resources**,
So that **I find real help, not dangerous alternatives**.

## Acceptance Criteria

1. **Given** a child's device has monitoring active **When** child searches terms indicating crisis (suicide, abuse, self-harm keywords) **Then** system recognizes crisis-related search intent
2. **Given** crisis search intent is detected **When** search results would load **Then** gentle redirect suggests allowlisted resources ("These resources can help")
3. **Given** redirect is displayed **When** child views the interstitial **Then** redirect is optional, not forced (child can continue to search results)
4. **Given** a redirect is shown **When** any action is taken **Then** redirect action itself is NOT logged to parents
5. **Given** crisis intent is detected **When** redirect is shown **Then** redirect appears before search results load (interstitial)
6. **Given** a child views the redirect **When** reading the content **Then** redirect is age-appropriate and non-alarming in tone

## Tasks / Subtasks

- [x] Task 1: Create Crisis Search Keywords Module (AC: 1)
  - [x] 1.1: Create `packages/shared/src/constants/crisis-search/keywords.ts`
  - [x] 1.2: Define `CRISIS_SEARCH_KEYWORDS` array with categories: suicide, self-harm, abuse, help
  - [x] 1.3: Define `CRISIS_SEARCH_PHRASES` for multi-word patterns (e.g., "how to kill myself", "want to die")
  - [x] 1.4: Implement `isCrisisSearchQuery(query: string): CrisisSearchMatch | null`
  - [x] 1.5: Return match type, category, and confidence (exact match vs partial)
  - [x] 1.6: Write comprehensive unit tests for keyword detection

- [x] Task 2: Create Crisis Search Detection Schema (AC: 1)
  - [x] 2.1: Create `packages/contracts/src/crisisSearch.schema.ts`
  - [x] 2.2: Define `crisisSearchCategorySchema` (suicide, self-harm, abuse, help, other)
  - [x] 2.3: Define `crisisSearchMatchSchema` with fields: query, category, confidence, matchedPattern
  - [x] 2.4: Define `crisisRedirectActionSchema` (shown, dismissed, resource_clicked, continued)
  - [x] 2.5: Export from `@fledgely/contracts`
  - [x] 2.6: Write schema validation tests

- [x] Task 3: Create Crisis Redirect Interstitial Component (AC: 2, 3, 5, 6)
  - [x] 3.1: Create `apps/web/src/components/crisis/CrisisSearchInterstitial.tsx`
  - [x] 3.2: Implement modal/overlay that appears before search results
  - [x] 3.3: Display age-appropriate message: "We noticed you might be looking for help..."
  - [x] 3.4: Show categorized crisis resources from allowlist matching the search category
  - [x] 3.5: Add "View these resources" primary button (links to protected resources)
  - [x] 3.6: Add "Continue to search" secondary button (dismisses interstitial)
  - [x] 3.7: Ensure text is at 6th-grade reading level per NFR65
  - [x] 3.8: Write component tests with React Testing Library

- [x] Task 4: Implement Client-Side Search Interception (AC: 1, 5)
  - [x] 4.1: Create `apps/web/src/hooks/useCrisisSearchDetection.ts`
  - [x] 4.2: Hook monitors form submissions and URL navigation for search patterns
  - [x] 4.3: Detect search queries in common search engines (google.com, bing.com, duckduckgo.com)
  - [x] 4.4: Check query against crisis keywords BEFORE navigation completes
  - [x] 4.5: Return `{ shouldIntercept: boolean, match: CrisisSearchMatch | null }`
  - [x] 4.6: Write hook tests

- [x] Task 5: Integrate Interstitial with Crisis Protection Service (AC: 4)
  - [x] 5.1: Update `apps/web/src/services/crisisProtectionService.ts`
  - [x] 5.2: Add `checkSearchQuery(query: string): CrisisSearchResult`
  - [x] 5.3: Ensure NO logging occurs for search detection (zero-data-path)
  - [x] 5.4: Add state management for interstitial display
  - [x] 5.5: Write integration tests verifying no logging

- [x] Task 6: Create Crisis Resources Suggestions Component (AC: 2, 6)
  - [x] 6.1: Create `apps/web/src/components/crisis/CrisisResourceSuggestions.tsx`
  - [x] 6.2: Display resources filtered by detected category
  - [x] 6.3: Show resource name, description, and contact method
  - [x] 6.4: Add quick-access buttons (call, text, chat) where applicable
  - [x] 6.5: Ensure all links open in new tab with noopener
  - [x] 6.6: Write component tests

- [x] Task 7: Accessibility Compliance (AC: 6)
  - [x] 7.1: Ensure interstitial is keyboard navigable
  - [x] 7.2: Add proper ARIA labels and roles
  - [x] 7.3: Ensure focus trap in modal
  - [x] 7.4: Test with screen reader announcements
  - [x] 7.5: Verify 4.5:1 color contrast per NFR45
  - [x] 7.6: Write accessibility tests

- [x] Task 8: Extension Integration (AC: 1-6)
  - [x] 8.1: Export crisis search detection from `@fledgely/shared`
  - [x] 8.2: Document integration pattern for Chrome extension (future story)
  - [x] 8.3: Ensure detection works with extension content script context
  - [x] 8.4: No action required for Android/iOS (handled by platform-specific stories)

- [x] Task 9: Integration Testing (AC: 1-6)
  - [x] 9.1: Create `apps/web/src/components/crisis/__tests__/CrisisSearchIntegration.test.tsx`
  - [x] 9.2: Test search detection for various crisis keywords
  - [x] 9.3: Test interstitial display and dismissal flow
  - [x] 9.4: Test resource suggestions based on category
  - [x] 9.5: Verify no data is logged during any step
  - [x] 9.6: Test performance (detection should add <5ms overhead)

## Dev Notes

### Epic 7 Context: Crisis Allowlist Foundation

This story implements **CRISIS SEARCH REDIRECTION** to gently guide children who search for crisis-related terms toward protected resources. The key insight is that a child searching "how to kill myself" is likely in crisis and should be shown help resources immediately, before potentially harmful search results load.

**Critical Safety Requirements:**
1. Detection must be sensitive (false positives are acceptable - better to show resources unnecessarily)
2. Interstitial must be non-alarming (child may be shoulder-surfed)
3. ZERO DATA PATH - no logging of search queries to parents
4. Optional - child must be able to dismiss and continue to search results

### Previous Story Foundation (Stories 7.1-7.5)

Story 7.1-7.5 established the crisis allowlist infrastructure:
- `@fledgely/shared` package with crisis URL data and matching
- `isCrisisUrl()` and `isCrisisUrlFuzzy()` for URL protection
- Crisis protection service in `apps/web/src/services/crisisProtectionService.ts`
- Admin views for allowlist management

**This story adds:**
- Crisis search keyword detection
- Interstitial UI component for gentle redirection
- Integration with existing crisis protection service

### Crisis Search Keywords Strategy

Keywords should be organized by category for targeted resource suggestions:

```typescript
// packages/shared/src/constants/crisis-search/keywords.ts

export const CRISIS_SEARCH_CATEGORIES = {
  suicide: {
    keywords: ['suicide', 'kill myself', 'end my life', 'want to die', 'suicidal'],
    phrases: ['how to kill myself', 'ways to end my life', 'painless death'],
    resources: ['988lifeline.org', 'suicidepreventionlifeline.org']
  },
  self_harm: {
    keywords: ['self harm', 'cutting', 'hurt myself', 'self injury'],
    phrases: ['how to cut', 'ways to hurt myself'],
    resources: ['crisistextline.org', 'selfinjury.com']
  },
  abuse: {
    keywords: ['abuse', 'being abused', 'abusive parent', 'domestic violence'],
    phrases: ['my parent hits me', 'being molested', 'sexual abuse'],
    resources: ['rainn.org', 'childhelp.org', 'thehotline.org']
  },
  help: {
    keywords: ['need help', 'crisis', 'emergency', 'in danger'],
    phrases: ['i need help', 'someone help me', 'im in danger'],
    resources: ['988lifeline.org', 'crisistextline.org']
  }
}
```

### Search Detection Algorithm

```typescript
export function isCrisisSearchQuery(query: string): CrisisSearchMatch | null {
  const normalized = query.toLowerCase().trim()

  // 1. Check exact phrase matches (highest confidence)
  for (const [category, data] of Object.entries(CRISIS_SEARCH_CATEGORIES)) {
    for (const phrase of data.phrases) {
      if (normalized.includes(phrase)) {
        return {
          query,
          category: category as CrisisSearchCategory,
          confidence: 'high',
          matchedPattern: phrase
        }
      }
    }
  }

  // 2. Check keyword matches (medium confidence)
  for (const [category, data] of Object.entries(CRISIS_SEARCH_CATEGORIES)) {
    for (const keyword of data.keywords) {
      if (normalized.includes(keyword)) {
        return {
          query,
          category: category as CrisisSearchCategory,
          confidence: 'medium',
          matchedPattern: keyword
        }
      }
    }
  }

  return null
}
```

### Interstitial UI Design

The interstitial must be:
1. **Non-alarming** - A child being watched shouldn't be put in danger
2. **Age-appropriate** - 6th-grade reading level (NFR65)
3. **Optional** - Clear path to continue to search results
4. **Helpful** - Direct links to crisis resources

Example copy:
```
"We noticed you might be looking for some help.

These resources are available 24/7 and are completely private -
no one in your family can see that you visited them.

[988 Suicide & Crisis Lifeline - Call or Text 988]
[Crisis Text Line - Text HOME to 741741]
[RAINN - 1-800-656-4673]

[View More Resources]  [Continue to Search]
"
```

### Zero-Data-Path Implementation

**CRITICAL:** This feature must not create ANY trace that could reveal a child searched for crisis terms.

```typescript
// In crisisProtectionService.ts
export function checkSearchQuery(query: string): CrisisSearchResult {
  const match = isCrisisSearchQuery(query)

  // NO LOGGING - this is a zero-data-path feature
  // No analytics, no parent notification, no family audit trail

  return {
    shouldShowInterstitial: match !== null,
    match,
    suggestedResources: match ? getResourcesForCategory(match.category) : []
  }
}
```

### Search Engine Detection

Common search URLs to intercept:
- `google.com/search?q=...`
- `bing.com/search?q=...`
- `duckduckgo.com/?q=...`
- `search.yahoo.com/search?p=...`
- `ecosia.org/search?q=...`

The hook should extract the query parameter and check before navigation:

```typescript
export function useCrisisSearchDetection() {
  const checkUrl = useCallback((url: string) => {
    const searchQuery = extractSearchQuery(url)
    if (searchQuery) {
      return checkSearchQuery(searchQuery)
    }
    return { shouldShowInterstitial: false, match: null, suggestedResources: [] }
  }, [])

  return { checkUrl }
}
```

### Extension Integration Notes

For Chrome extension (Epic 11), the detection will run in content scripts:
- Hook into `beforeNavigate` events
- Use same `isCrisisSearchQuery()` from `@fledgely/shared`
- Display interstitial as injected overlay
- This story prepares the shared detection logic; extension UI is a future story

### Project Context Alignment

Per `project_context.md`:
- **Rule 1:** Types from Zod - create schemas in `@fledgely/contracts`
- **Rule 3:** Crisis allowlist check FIRST - search detection extends this
- **Rule 4:** State ownership - interstitial state is UI-only (Zustand or component state)

Per `NFR65`: Child-facing text at 6th-grade reading level
Per `NFR43`: Keyboard navigable
Per `NFR45`: 4.5:1 color contrast

### Testing Standards

Per `project_context.md`:
- Unit tests: `*.test.ts` (co-located)
- Integration tests: `*.integration.test.tsx`
- Zero-data-path tests are CRITICAL - adversarial tests must verify no logging

```typescript
describe('CrisisSearchInterstitial', () => {
  it('shows interstitial for suicide-related search', () => {
    const { getByText } = render(
      <CrisisSearchInterstitial query="how to kill myself" onDismiss={vi.fn()} />
    )
    expect(getByText(/We noticed you might be looking for some help/)).toBeInTheDocument()
  })

  it('allows dismissal to continue to search', () => {
    const onDismiss = vi.fn()
    const { getByText } = render(
      <CrisisSearchInterstitial query="suicide" onDismiss={onDismiss} />
    )
    fireEvent.click(getByText('Continue to Search'))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('NEVER logs search query', () => {
    const consoleSpy = vi.spyOn(console, 'log')
    const fetchSpy = vi.spyOn(global, 'fetch')

    checkSearchQuery('how to kill myself')

    expect(consoleSpy).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
```

### Git Commit Pattern

```
feat(story-7.6): Crisis Search Redirection - gentle guidance to protected resources
```

### Dependencies

- **Requires:** Story 7.1 (Crisis Allowlist Data Structure) - DONE
- **Requires:** Story 7.2 (Crisis Visit Zero-Data-Path) - DONE
- **Requires:** Story 7.3 (Child Allowlist Visibility) - DONE (provides resource display patterns)
- **Enables:** Story 11.4 (Chromebook Crisis Protection) - will use search detection

### References

- [Source: docs/epics/epic-list.md#Story-7.6] - Original acceptance criteria
- [Source: docs/project_context.md] - Types from Zod, Firebase direct rules
- [Source: packages/shared/src/constants/crisis-urls/index.ts] - Existing crisis URL infrastructure
- [Source: docs/sprint-artifacts/stories/7-5-fuzzy-domain-matching.md] - Previous story patterns
- [Source: apps/web/src/services/crisisProtectionService.ts] - Existing crisis service

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

<!-- Debug log references will be added during implementation -->

### Completion Notes List

<!-- Completion notes will be added during implementation -->

### File List

**Created:**
- `packages/shared/src/constants/crisis-search/keywords.ts` - Crisis search keywords and detection (imports types from Zod)
- `packages/shared/src/constants/crisis-search/index.ts` - Crisis search module exports
- `apps/web/src/components/crisis/index.ts` - Crisis components module exports
- `packages/shared/src/constants/crisis-search/__tests__/keywords.test.ts` - Keywords tests (35 tests)
- `packages/contracts/src/crisisSearch.schema.ts` - Zod schemas for crisis search types
- `packages/contracts/src/crisisSearch.schema.test.ts` - Schema validation tests (15 tests)
- `apps/web/src/components/crisis/CrisisSearchInterstitial.tsx` - Interstitial modal component
- `apps/web/src/components/crisis/__tests__/CrisisSearchInterstitial.test.tsx` - Component tests (16 tests)
- `apps/web/src/components/crisis/__tests__/CrisisSearchInterstitial.accessibility.test.tsx` - A11y tests (25 tests)
- `apps/web/src/components/crisis/CrisisResourceSuggestions.tsx` - Resource suggestions component
- `apps/web/src/components/crisis/__tests__/CrisisResourceSuggestions.test.tsx` - Component tests (30 tests)
- `apps/web/src/hooks/useCrisisSearchDetection.ts` - Hook for URL-based detection
- `apps/web/src/hooks/__tests__/useCrisisSearchDetection.test.ts` - Hook tests (26 tests)
- `apps/web/src/components/crisis/__tests__/CrisisSearchIntegration.test.tsx` - Integration tests (51 tests)

**Modified:**
- `packages/shared/src/index.ts` - Added crisis search exports and extension documentation
- `packages/contracts/src/index.ts` - Added crisis search schema exports
- `apps/web/src/services/crisisProtectionService.ts` - Added `checkSearchQuery` function
- `apps/web/src/services/crisisProtectionService.test.ts` - Added checkSearchQuery tests (20+ tests)
