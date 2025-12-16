# Story 7.3: Child Allowlist Visibility

Status: complete

## Story

As a **child**,
I want **to see exactly which resources are protected**,
So that **I know where I can go safely without worry**.

## Acceptance Criteria

1. **Given** a child with a fledgely account **When** they access the protected resources section **Then** full allowlist is displayed organized by category
2. **Given** the protected resources view **When** displaying each resource **Then** each resource shows name, what it helps with, and that it's "always private"
3. **Given** the protected resources view **When** a resource has a link **Then** resources are clickable links (easy access)
4. **Given** the protected resources view **When** displaying explanation text **Then** explanation text is at 6th-grade reading level
5. **Given** a child viewing the protected resources **When** they access this view **Then** view is accessible without parent knowledge (no notification of viewing)
6. **Given** the protected resources view **When** it loads **Then** "These sites are NEVER seen by your parents" message is prominent

## Tasks / Subtasks

- [x] Task 1: Create Protected Resources Page (AC: 1, 4, 6)
  - [x] 1.1: Create `apps/web/src/app/(protected)/resources/page.tsx` route
  - [x] 1.2: Create `apps/web/src/components/safety/ProtectedResourcesList.tsx` component
  - [x] 1.3: Add prominent privacy message banner at top
  - [x] 1.4: Write explanation text at 6th-grade reading level
  - [ ] 1.5: Add route to child's navigation (deferred - no child nav exists yet)

- [x] Task 2: Implement Category Organization (AC: 1, 2)
  - [x] 2.1: Create `apps/web/src/components/safety/ResourceCategory.tsx` component
  - [x] 2.2: Group resources by `CrisisResourceCategory` from `@fledgely/shared`
  - [x] 2.3: Display category headers with child-friendly names
  - [x] 2.4: Show each resource with: name, description, "Always Private" badge
  - [x] 2.5: Write unit tests for category grouping

- [x] Task 3: Implement Clickable Resource Links (AC: 3)
  - [x] 3.1: Create `apps/web/src/components/safety/ResourceCard.tsx` component
  - [x] 3.2: Make resource domain/name clickable with `target="_blank"`
  - [x] 3.3: Add appropriate `rel="noopener noreferrer"` for security
  - [x] 3.4: Show contact methods (phone/text/chat icons)
  - [x] 3.5: Write tests for link rendering

- [x] Task 4: Ensure No Parent Notification (AC: 5)
  - [x] 4.1: Verify page route is child-accessible but not logged
  - [x] 4.2: Ensure no analytics events are triggered
  - [x] 4.3: Ensure no notification is sent to parents
  - [x] 4.4: Apply zero-data-path principles from Story 7.2
  - [x] 4.5: Write adversarial test for no notification

- [x] Task 5: Accessibility and Child-Friendly UX (AC: 4, 6)
  - [x] 5.1: Ensure WCAG 2.1 AA compliance
  - [x] 5.2: Use large, readable fonts appropriate for children
  - [x] 5.3: Add appropriate ARIA labels
  - [x] 5.4: Ensure keyboard navigation works
  - [x] 5.5: Test with screen reader (manual verification)
  - [x] 5.6: Write accessibility tests

- [x] Task 6: Integration Testing (AC: 1-6)
  - [x] 6.1: Create integration test for full page load
  - [x] 6.2: Test crisis resources are displayed (mock data in tests)
  - [x] 6.3: Test category grouping is correct
  - [x] 6.4: Test links are functional
  - [x] 6.5: Test no parent notification triggered

## Dev Notes

### Epic 7 Context: Crisis Allowlist Foundation

This story provides children visibility into which resources are protected, building trust that they can seek help safely. The view itself must also not trigger any notifications.

**Key Architectural Invariant (INV-001):** Crisis URLs NEVER captured - viewing this page must also NOT generate any parent notification or analytics.

### Story 7.1 & 7.2 Foundation (DEPENDENCIES)

Story 7.1 created the `@fledgely/shared` package with:
- `getCrisisAllowlist(): CrisisAllowlist` - Returns all 18 crisis resources
- `CrisisResourceCategory` enum for category grouping
- Each entry has: `name`, `description`, `domain`, `category`, `contactMethods`, `phoneNumber`, `textNumber`

Story 7.2 created the zero-data-path:
- `shouldBlockMonitoring(url: string): boolean` - Crisis check function
- This page viewing should similarly NOT trigger notifications

**Import from:**
```typescript
import { getCrisisAllowlist, type CrisisAllowlist, type CrisisResourceCategory } from '@fledgely/shared'
```

### Category Display Names

Map technical categories to child-friendly names:
```typescript
const categoryDisplayNames: Record<CrisisResourceCategory, string> = {
  suicide: "Feeling Hopeless or Thinking About Hurting Yourself",
  abuse: "Someone Is Hurting You",
  crisis: "Any Kind of Emergency Help",
  lgbtq: "LGBTQ+ Support",
  mental_health: "Feeling Sad, Anxious, or Overwhelmed",
  domestic_violence: "Violence at Home",
  child_abuse: "Adults Hurting You",
  eating_disorder: "Problems with Food or Eating",
  substance_abuse: "Problems with Drugs or Alcohol",
}
```

### Component Structure

```
apps/web/src/
├── app/(protected)/resources/
│   └── page.tsx                    # Route for protected resources
├── components/safety/
│   ├── ProtectedResourcesList.tsx  # Main list component
│   ├── ResourceCategory.tsx        # Category section
│   ├── ResourceCard.tsx            # Individual resource card
│   ├── PrivacyBanner.tsx           # "Never seen by parents" banner
│   └── __tests__/
│       ├── ProtectedResourcesList.test.tsx
│       ├── ResourceCategory.test.tsx
│       └── ResourceCard.test.tsx
```

### Privacy Banner Message

```typescript
// Example text at 6th-grade reading level
const privacyMessage = {
  headline: "These Sites Are Always Private",
  body: "When you visit any of these websites, your parents will never see it. " +
        "This is a promise. You can always get help without anyone knowing.",
  emphasis: "Your parents can NEVER see visits to these sites."
}
```

### Reading Level Guidelines

Per AC 4, text must be at 6th-grade reading level (Flesch-Kincaid Grade Level ≤ 6):
- Short sentences (15-20 words max)
- Common words (avoid jargon)
- Active voice
- Direct, reassuring tone

### No Notification Requirements

Per AC 5, viewing this page must NOT:
- Send any push notification to parents
- Add any entry to activity logs
- Trigger any analytics events
- Show in any parent dashboard

This aligns with INV-001 - the act of seeking information about help resources is as private as visiting the resources themselves.

### Key NFRs

- **NFR42:** WCAG 2.1 AA accessibility required
- **NFR65:** Child-appropriate language throughout

### Key FRs

- **FR61:** Crisis resources protected from monitoring
- **FR62:** Allowlist visible to children

### Project Context Integration

Per `project_context.md`:
- **Rule 3:** Crisis Allowlist Check FIRST - this page is crisis-related, treat with same privacy
- **INV-001:** Crisis URLs NEVER captured - viewing this page should also be private
- UI: shadcn/ui + Radix + Tailwind
- Testing: Vitest + Playwright

### Testing Standards

**Unit tests for:**
- Category grouping logic
- Resource card rendering
- Privacy banner display

**Integration tests for:**
- Full page load with all resources
- Link functionality

**Adversarial tests for:**
- No parent notification on view
- No analytics tracked

### Git Commit Pattern

```
feat(Story 7.3): Child Allowlist Visibility - protected resources page
```

### Dependencies

- **Requires:** Story 7.1 (Crisis Allowlist Data Structure) - DONE
- **Requires:** Story 7.2 (Crisis Visit Zero-Data-Path) - DONE
- **Enables:** Story 7.5.1 (Hidden Safety Signal Access) - documents gesture in this view

### References

- [Source: docs/epics/epic-list.md#Story-7.3] - Original acceptance criteria
- [Source: docs/project_context.md] - Crisis allowlist check rules and INV-001
- [Source: docs/sprint-artifacts/stories/7-1-crisis-allowlist-data-structure.md] - Data structure
- [Source: docs/sprint-artifacts/stories/7-2-crisis-visit-zero-data-path.md] - Zero-data-path

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

<!-- Debug log references will be added during implementation -->

### Completion Notes List

- All 6 acceptance criteria verified through 83 passing unit tests
- PrivacyBanner displays prominent "These Sites Are Always Private" message
- ResourceCategory groups resources by category with child-friendly names
- ResourceCard displays name, description, "Always Private" badge, and clickable links
- ProtectedResourcesList composes all components for full page view
- Adversarial tests verify no analytics, notifications, or logging on page view
- Accessibility tests verify WCAG 2.1 AA compliance including semantic HTML, ARIA labels, and color contrast
- Task 1.5 (add to child's navigation) deferred - no child navigation exists yet

### File List

**Created:**
- `apps/web/src/app/(protected)/resources/page.tsx` - Route for protected resources page
- `apps/web/src/components/safety/PrivacyBanner.tsx` - Privacy message banner component
- `apps/web/src/components/safety/ResourceCard.tsx` - Individual resource card component
- `apps/web/src/components/safety/ResourceCategory.tsx` - Category grouping component
- `apps/web/src/components/safety/ProtectedResourcesList.tsx` - Main list component
- `apps/web/src/components/safety/__tests__/PrivacyBanner.test.tsx` - 9 tests
- `apps/web/src/components/safety/__tests__/ResourceCard.test.tsx` - 19 tests
- `apps/web/src/components/safety/__tests__/ResourceCategory.test.tsx` - 17 tests
- `apps/web/src/components/safety/__tests__/ProtectedResourcesList.test.tsx` - 22 tests
- `apps/web/src/components/safety/__tests__/ProtectedResourcesPage.adversarial.test.tsx` - 16 tests

**Modified:**
- `apps/web/src/components/safety/index.ts` - Added exports for new components
