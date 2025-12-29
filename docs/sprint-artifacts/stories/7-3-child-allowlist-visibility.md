# Story 7.3: Child Allowlist Visibility

Status: Done

## Story

As a **child**,
I want **to see exactly which resources are protected**,
So that **I know where I can go safely without worry**.

## Acceptance Criteria

1. **AC1: Organized Display**
   - Given a child with a fledgely account
   - When they access the protected resources section
   - Then full allowlist is displayed organized by category

2. **AC2: Resource Information**
   - Given a child viewing the allowlist
   - When they look at a resource
   - Then each resource shows name, what it helps with, and that it's "always private"

3. **AC3: Clickable Links**
   - Given a child viewing the allowlist
   - When they want to visit a resource
   - Then resources are clickable links (easy access)
   - And links open in new tab for safety

4. **AC4: Reading Level**
   - Given all text in the view
   - When displayed to child
   - Then explanation text is at 6th-grade reading level (NFR65)

5. **AC5: Private Access**
   - Given a child wants to view the allowlist
   - When they access it
   - Then view is accessible without parent knowledge
   - And no notification is generated for parents

6. **AC6: Privacy Message**
   - Given a child viewing the allowlist
   - When the view loads
   - Then "These sites are NEVER seen by your parents" message is prominent
   - And message is reassuring and clear

7. **AC7: Accessibility**
   - Given users with assistive technology
   - When viewing the allowlist
   - Then component meets WCAG 2.1 AA standards
   - And keyboard navigation is fully supported

## Tasks / Subtasks

- [x] Task 1: Create CrisisResourceCard Component (AC: #2, #3)
  - [x] 1.1 Create component showing resource name
  - [x] 1.2 Add description (what it helps with)
  - [x] 1.3 Add "Always Private" badge
  - [x] 1.4 Add phone and text options when available
  - [x] 1.5 Add clickable link opening in new tab
  - [x] 1.6 Add proper ARIA labels

- [x] Task 2: Create CrisisAllowlistView Component (AC: #1, #6)
  - [x] 2.1 Create main container with privacy message header
  - [x] 2.2 Group resources by category
  - [x] 2.3 Add category headers with icons
  - [x] 2.4 Display CrisisResourceCard for each resource
  - [x] 2.5 Add "Never seen by parents" reassuring message

- [x] Task 3: Category Organization (AC: #1)
  - [x] 3.1 Create category display order (most critical first)
  - [x] 3.2 Add friendly category names for children
  - [x] 3.3 Add category icons/emojis
  - [x] 3.4 Add category descriptions

- [x] Task 4: Accessibility Implementation (AC: #7)
  - [x] 4.1 Add ARIA landmarks for categories
  - [x] 4.2 Ensure keyboard navigation through all resources
  - [x] 4.3 Add skip-to-content link
  - [x] 4.4 Ensure 44px+ touch targets
  - [x] 4.5 Add screen reader announcements

- [x] Task 5: Unit Tests (AC: All)
  - [x] 5.1 Test CrisisResourceCard rendering
  - [x] 5.2 Test CrisisAllowlistView category grouping
  - [x] 5.3 Test link opens in new tab
  - [x] 5.4 Test privacy message is visible
  - [x] 5.5 Test keyboard navigation
  - [x] 5.6 Test accessibility attributes

## Dev Notes

### Implementation Strategy

Story 7.3 creates a child-facing view of the crisis allowlist. This is a read-only view that shows all protected resources organized by category. The view must be accessible without generating any parent notifications (AC5).

### Key Requirements

- **FR63:** Child can view the complete crisis allowlist
- **NFR42:** WCAG 2.1 AA compliance
- **NFR65:** 6th-grade reading level for child-facing content
- **NFR49:** 44px+ touch targets

### Technical Approach

1. **CrisisResourceCard Component**:

```typescript
interface CrisisResourceCardProps {
  resource: CrisisResource
  className?: string
}

function CrisisResourceCard({ resource, className }: CrisisResourceCardProps) {
  return (
    <article className={className} aria-labelledby={`resource-${resource.id}`}>
      <h3 id={`resource-${resource.id}`}>{resource.name}</h3>
      <p>{resource.description}</p>
      <span className="badge">Always Private</span>
      {resource.phone && <a href={`tel:${resource.phone}`}>Call: {resource.phone}</a>}
      {resource.text && <span>{resource.text}</span>}
      <a href={`https://${resource.domain}`} target="_blank" rel="noopener noreferrer">
        Visit Website
      </a>
    </article>
  )
}
```

2. **Category Display Order** (most critical first):
   - suicide_prevention → "Feeling Really Low"
   - crisis_general → "Need to Talk to Someone"
   - domestic_violence → "Home Isn't Safe"
   - child_abuse → "Being Hurt by Adults"
   - sexual_assault → "Someone Hurt Me"
   - lgbtq_support → "LGBTQ+ Support"
   - eating_disorder → "Food & Body Stuff"
   - mental_health → "Mental Health Support"
   - substance_abuse → "Drugs & Alcohol Help"

3. **Privacy Message** (prominent, reassuring):
   "These websites are ALWAYS private. Your parents will NEVER see that you visited them."

### Category Friendly Names

| Category           | Child-Friendly Name     | Icon |
| ------------------ | ----------------------- | ---- |
| suicide_prevention | Feeling Really Low      | 💙   |
| crisis_general     | Need to Talk to Someone | 💬   |
| domestic_violence  | Home Isn't Safe         | 🏠   |
| child_abuse        | Being Hurt by Adults    | 🛡️   |
| sexual_assault     | Someone Hurt Me         | 💜   |
| lgbtq_support      | LGBTQ+ Support          | 🌈   |
| eating_disorder    | Food & Body Stuff       | 💚   |
| mental_health      | Mental Health Support   | 🧠   |
| substance_abuse    | Drugs & Alcohol Help    | 🤝   |

### Project Structure Notes

- Component: `apps/web/src/components/crisis/CrisisResourceCard.tsx`
- Component: `apps/web/src/components/crisis/CrisisAllowlistView.tsx`
- Constants: Import from `@fledgely/shared`
- Tests: Adjacent `__tests__/` folder

### Previous Story Learnings (Story 7.1)

- Crisis allowlist is available from `@fledgely/shared`
- Use `CRISIS_ALLOWLIST.resources` and `getResourcesByCategory()`
- All descriptions already at 6th-grade reading level

### References

- [Source: docs/epics/epic-list.md - Story 7.3]
- [Source: docs/prd/functional-requirements.md - FR63]
- [Source: docs/prd/non-functional-requirements.md - NFR42, NFR65, NFR49]
- [Source: Story 7.1 - Crisis allowlist data structure]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created CrisisResourceCard component displaying resource name, description, "Always Private" badge, phone/text options, and website link
- Created CrisisAllowlistView component with prominent privacy banner, category grouping, and child-friendly category names
- Category order prioritizes most critical resources (suicide prevention first)
- Child-friendly category names at 6th-grade reading level (e.g., "Feeling Really Low" instead of "suicide_prevention")
- Category icons/emojis for visual recognition
- Accessibility: skip-to-content link, ARIA landmarks, keyboard navigation, 44px+ touch targets
- All links open in new tab with noopener noreferrer for security
- Privacy banner uses green color scheme with lock icon for reassurance
- 44 tests covering all ACs (20 for CrisisResourceCard, 24 for CrisisAllowlistView)

### File List

- `apps/web/src/components/crisis/CrisisResourceCard.tsx` - NEW: Resource card component
- `apps/web/src/components/crisis/CrisisAllowlistView.tsx` - NEW: Main allowlist view
- `apps/web/src/components/crisis/index.ts` - NEW: Component exports
- `apps/web/src/components/crisis/__tests__/CrisisResourceCard.test.tsx` - NEW: 20 tests
- `apps/web/src/components/crisis/__tests__/CrisisAllowlistView.test.tsx` - NEW: 25 tests

## Senior Developer Review (AI)

**Review Date:** 2025-12-29
**Outcome:** Approve (after fixes)
**Action Items:** 8 issues found and fixed

### Action Items

- [x] [AI-Review][CRITICAL] URL injection vulnerability - Add domain validation - FIXED
- [x] [AI-Review][CRITICAL] Phone number validation - Add sanitization - FIXED
- [x] [AI-Review][HIGH] Color contrast for WCAG 2.1 AA - Darken green/gray colors - FIXED
- [x] [AI-Review][HIGH] Empty state fallback - Add hardcoded emergency numbers - FIXED
- [x] [AI-Review][HIGH] Missing security tests - Add injection prevention tests - FIXED (9 new tests)

## Change Log

| Date       | Change                                                       |
| ---------- | ------------------------------------------------------------ |
| 2025-12-29 | Story created                                                |
| 2025-12-29 | Story implementation completed                               |
| 2025-12-29 | Code review: security fixes (URL/phone validation, contrast) |
