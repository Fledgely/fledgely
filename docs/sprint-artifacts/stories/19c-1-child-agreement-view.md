# Story 19C.1: Child Agreement View

Status: done

## Story

As a **child**,
I want **to see my family agreement in the app**,
so that **I can remind myself what we agreed to**.

## Acceptance Criteria

1. **Given** child logs into fledgely **When** viewing "My Agreement" section **Then** active agreement is displayed in full

2. **Given** child views agreement **Then** agreement shows: what's monitored, capture frequency, retention period

3. **Given** child views agreement **Then** agreement shows: both signatures (parent and child) with dates

4. **Given** child views agreement **Then** agreement is displayed as signed (read-only, not editable)

5. **Given** child views agreement **Then** "This is what we agreed to together" framing

6. **Given** child views agreement **Then** link to request changes (goes to parent) - connects to Story 19C.5

## Tasks / Subtasks

- [x] Task 1: Create useChildAgreement hook (AC: #1, #2)
  - [x] 1.1 Create hook that fetches active agreement for child
  - [x] 1.2 Query `/activeAgreements` where childId matches and status='active'
  - [x] 1.3 Use onSnapshot for real-time sync
  - [x] 1.4 Add unit tests for the hook

- [x] Task 2: Create ChildAgreementView component (AC: #1, #4, #5)
  - [x] 2.1 Create component with sky blue theme (#0ea5e9) matching child dashboard
  - [x] 2.2 Display agreement in read-only mode (no edit controls)
  - [x] 2.3 Add "This is what we agreed to together" header framing
  - [x] 2.4 Use React.CSSProperties inline styles (NOT Tailwind)
  - [x] 2.5 Add data-testid attributes for all testable elements

- [x] Task 3: Display agreement terms (AC: #2)
  - [x] 3.1 Group terms by category (time, apps, monitoring, rewards, general)
  - [x] 3.2 Show what's monitored (e.g., "Screenshots: Yes")
  - [x] 3.3 Show capture frequency (e.g., "Every 5 minutes")
  - [x] 3.4 Show retention period (e.g., "30 days")
  - [x] 3.5 Use child-friendly language (6th grade reading level - NFR65)

- [x] Task 4: Display signatures (AC: #3)
  - [x] 4.1 Show child signature with name and date
  - [x] 4.2 Show parent signature(s) with name(s) and date(s)
  - [x] 4.3 Display in chronological order

- [x] Task 5: Add request change link (AC: #6)
  - [x] 5.1 Add "Request a Change" button/link
  - [x] 5.2 Link navigates to change request flow (Story 19C.5)
  - [x] 5.3 Make button visually distinct but not prominent

- [x] Task 6: Add component tests
  - [x] 6.1 Test agreement display with all fields
  - [x] 6.2 Test signatures display
  - [x] 6.3 Test read-only mode (no edit buttons)
  - [x] 6.4 Test request change link
  - [x] 6.5 Test empty/no agreement state

## Dev Notes

### Technical Implementation

**Use existing activeAgreement schema:**

```typescript
// From packages/shared/src/contracts/index.ts
export const activeAgreementSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  childId: z.string(),
  version: z.string(),
  signingSessionId: z.string(),
  coCreationSessionId: z.string(),
  terms: z.array(agreementTermSchema),
  activatedAt: z.date(),
  activatedByUid: z.string(),
  status: activeAgreementStatusSchema, // 'active' | 'archived'
  archivedAt: z.date().nullable(),
  archivedByAgreementId: z.string().nullable(),
})
```

**Firestore path:** `/activeAgreements/{agreementId}`
Query: `where('childId', '==', childId).where('status', '==', 'active').limit(1)`

**Reference existing components:**

- `apps/web/src/components/agreements/AgreementPreview.tsx` - Has term display patterns
- `apps/web/src/components/agreements/AgreementSummary.tsx` - Has summary display
- `apps/web/src/components/child/*.tsx` - Sky blue theme pattern

**Style pattern from Epic 19B:**

```typescript
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#f0f9ff', // Light sky blue
    borderRadius: '12px',
    padding: '16px',
  },
  header: {
    color: '#0ea5e9', // Sky blue
    fontSize: '24px',
    fontWeight: 600,
  },
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/hooks/useChildAgreement.ts` - Hook to fetch active agreement
- `apps/web/src/hooks/useChildAgreement.test.tsx` - Hook tests
- `apps/web/src/components/child/ChildAgreementView.tsx` - Main component
- `apps/web/src/components/child/ChildAgreementView.test.tsx` - Component tests

**Existing patterns to follow:**

- `useChildScreenshots.ts` - Hook pattern with onSnapshot
- `ChildScreenshotDetail.tsx` - Sky blue theme, inline styles
- `AgreementPreview.tsx` - Term grouping by category

### Previous Story Intelligence

From Epic 19B (Child Dashboard - My Screenshots):

- Sky blue theme (#0ea5e9) for child dashboard
- Inline React.CSSProperties styles, NOT Tailwind
- data-testid on all interactive elements
- 6th-grade reading level for child-friendly language
- useChildScreenshots pattern for real-time Firebase sync

From Story 6.3 (Agreement Activation):

- activeAgreement schema with terms array
- Signature data structure with signedAt dates
- Status field for active/archived

### References

- [Source: packages/shared/src/contracts/index.ts#activeAgreementSchema]
- [Source: apps/web/src/components/agreements/AgreementPreview.tsx]
- [Source: apps/web/src/components/child/ChildScreenshotGallery.tsx]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created useChildAgreement hook with real-time Firebase listener
- Created ChildAgreementView component with sky blue theme
- Hook extracts monitoring settings from terms (screenshots, frequency, retention)
- Signatures sorted chronologically (earliest first)
- Component has loading, error, and empty states
- Request change button calls onRequestChange handler (for Story 19C.5 integration)
- All tests passing (10 hook tests + 26 component tests = 36 total)
- Created AgreementTermDisplay type for simplified term display

### File List

- `apps/web/src/hooks/useChildAgreement.ts` - Hook to fetch active agreement
- `apps/web/src/hooks/useChildAgreement.test.tsx` - Hook tests (10 tests)
- `apps/web/src/components/child/ChildAgreementView.tsx` - Main component
- `apps/web/src/components/child/ChildAgreementView.test.tsx` - Component tests (26 tests)

## Change Log

| Date       | Change                                      |
| ---------- | ------------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev      |
| 2025-12-31 | Implementation complete - all tests passing |
