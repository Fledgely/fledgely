# Story 19A.3: Caregiver Quick View

Status: done

## Story

As a **caregiver (grandparent)**,
I want **an even simpler view than parents get**,
So that **I can help without being overwhelmed**.

## Acceptance Criteria

1. **AC1: Simplified status display**
   - Given caregiver logs in during their access window
   - When caregiver view loads
   - Then simplified single-screen status shown
   - And status shows: "Your grandchildren are doing well" or "Check in with [child]"

2. **AC2: No complex device details**
   - Given caregiver view is displayed
   - When viewing child status
   - Then only summary information shown (no device lists, no detailed metrics)
   - And no screenshot access or activity history

3. **AC3: Large touch targets**
   - Given caregiver view is displayed
   - When any interactive element is rendered
   - Then all buttons/links meet NFR49: 44x44px minimum touch target
   - And fonts are large and readable for older adults

4. **AC4: Call parent button**
   - Given caregiver view shows status
   - When help may be needed (any child has issues)
   - Then clear "Call [parent name]" button is prominently displayed
   - And button triggers device phone action (tel: link)

5. **AC5: View access logging**
   - Given caregiver accesses the view
   - When any data is displayed
   - Then access logged per FR19D-X (caregiver access audit)
   - And log includes: caregiver ID, timestamp, what was viewed

6. **AC6: Accessibility**
   - Given caregiver view is displayed
   - When using keyboard or screen reader
   - Then all elements are keyboard accessible
   - And ARIA labels announce status clearly
   - And high color contrast (4.5:1 minimum)

## Tasks / Subtasks

- [x] Task 1: Create CaregiverQuickView page component (AC: #1, #2, #3, #6)
  - [x] 1.1 Create `apps/web/src/app/caregiver/page.tsx` route
  - [x] 1.2 Create `apps/web/src/components/caregiver/CaregiverQuickView.tsx` component
  - [x] 1.3 Implement simplified single-screen layout with large fonts
  - [x] 1.4 Display overall status message ("All good" or "Check in with...")
  - [x] 1.5 Ensure 44x44px minimum touch targets on all interactive elements
  - [x] 1.6 Add ARIA labels and keyboard accessibility

- [x] Task 2: Create useCaregiverStatus hook (AC: #1, #2)
  - [x] 2.1 Create `apps/web/src/hooks/useCaregiverStatus.ts`
  - [x] 2.2 Filter children visible to caregiver (stub: use all children for now)
  - [x] 2.3 Aggregate status for visible children using existing useFamilyStatus logic
  - [x] 2.4 Return simplified status: overall status, children needing attention, parent contact info
  - [x] 2.5 Add loading and error states

- [x] Task 3: Create CaregiverChildCard component (AC: #1, #2, #3)
  - [x] 3.1 Create `apps/web/src/components/caregiver/CaregiverChildCard.tsx`
  - [x] 3.2 Display child name, avatar, simple status ("Doing well" / "Needs attention")
  - [x] 3.3 Large touch-friendly design (minimum 64px height)
  - [x] 3.4 No expand/collapse, no device details

- [x] Task 4: Implement Call Parent button (AC: #4)
  - [x] 4.1 Create `apps/web/src/components/caregiver/CallParentButton.tsx`
  - [x] 4.2 Display parent name and phone number
  - [x] 4.3 Use `tel:` link for mobile phone action
  - [x] 4.4 Large prominent button style (48px+ height)
  - [x] 4.5 Show button when any child needs attention or always visible

- [x] Task 5: Implement caregiver access logging (AC: #5)
  - [x] 5.1 Create `apps/web/src/hooks/useCaregiverAccessLog.ts` hook
  - [x] 5.2 Log view access on component mount
  - [x] 5.3 Call Firebase function to record: caregiverId, timestamp, childrenViewed
  - [x] 5.4 Note: Full audit infrastructure in Epic 19D; stub logging for now

- [x] Task 6: Add unit tests (AC: #1-6)
  - [x] 6.1 Test CaregiverQuickView renders with correct status message
  - [x] 6.2 Test simplified display (no device details shown)
  - [x] 6.3 Test touch targets meet 44x44px minimum
  - [x] 6.4 Test Call Parent button with tel: link
  - [x] 6.5 Test accessibility (ARIA labels, keyboard navigation)
  - [x] 6.6 Test loading and error states
  - [x] 6.7 Minimum 15 tests required (41 tests implemented)

## Dev Notes

### Implementation Strategy

This story creates a simplified caregiver view that leverages existing family status infrastructure from Stories 19A-1 and 19A-2 while presenting a much simpler interface optimized for older adults (grandparents).

**Key Differences from Parent View:**

- Single-screen, no expansion or drilling down
- Larger fonts and touch targets (48px+ buttons, 18px+ text)
- Plain language ("Doing well" vs "All Good", "Needs attention" vs "Action Required")
- No device details, metrics, or technical information
- Prominent help contact (Call Parent button)

### Dependencies

**CRITICAL: Epic 19D Dependency**

- Story 19D.1 (Caregiver Invitation & Onboarding) - Required for caregiver authentication
- Story 19D.3 (Caregiver Access Audit Logging) - Required for FR19D-X compliance
- Story 19D.4 (Caregiver Access Window Enforcement) - Required for access window logic

**For MVP Implementation:**

- Stub caregiver authentication (assume current user is caregiver)
- Stub access window (always allow access for now)
- Implement basic console logging until Epic 19D.3 provides audit infrastructure
- Add TODO comments for Epic 19D integration points

### Existing Code to Leverage

**From Stories 19A-1 and 19A-2:**

- `apps/web/src/hooks/useFamilyStatus.ts` - Status calculation logic, THRESHOLDS
- `apps/web/src/hooks/useChildStatus.ts` - Per-child status aggregation
- `apps/web/src/hooks/useChildren.ts` - Child data with name, photoURL
- `apps/web/src/components/dashboard/statusConstants.ts` - Shared status colors/labels
- `apps/web/src/components/dashboard/ChildStatusRow.tsx` - Avatar component pattern

**From Project Architecture:**

- Next.js App Router for `/caregiver` route
- React hooks pattern with loading/error states
- Inline styles with React.CSSProperties (no Tailwind classes in dashboard components)
- Vitest for testing with mocked hooks

### Component Architecture

```typescript
// CaregiverQuickView.tsx
export function CaregiverQuickView() {
  const { status, childrenNeedingAttention, parentContact, loading, error } = useCaregiverStatus()

  // Log access on mount
  useCaregiverAccessLog('view')

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div style={containerStyles}>
      <Header>Family Status</Header>
      <StatusMessage status={status}>
        {status === 'good'
          ? "Your grandchildren are doing well"
          : `Check in with ${childrenNeedingAttention.join(', ')}`
        }
      </StatusMessage>
      <ChildCardList children={children} />
      <CallParentButton contact={parentContact} />
    </div>
  )
}
```

```typescript
// useCaregiverStatus.ts
interface CaregiverStatus {
  overallStatus: FamilyStatus // 'good' | 'attention' | 'action'
  statusMessage: string
  children: CaregiverChildSummary[]
  childrenNeedingAttention: string[]
  parentContact: { name: string; phone: string } | null
  loading: boolean
  error: string | null
}

export function useCaregiverStatus(familyId: string | null): CaregiverStatus {
  // Leverage existing useChildStatus for status data
  // Filter/simplify for caregiver view
}
```

### Caregiver-Friendly Language

| Parent View           | Caregiver View |
| --------------------- | -------------- |
| "All Good"            | "Doing well"   |
| "Needs Attention"     | "Check in"     |
| "Action Required"     | "Needs help"   |
| "2/3 devices active"  | (hidden)       |
| "Last seen 5 min ago" | (hidden)       |

### Styling Requirements (NFR49 Compliance)

```typescript
const caregiverStyles: React.CSSProperties = {
  // Large, readable fonts
  fontSize: '18px',
  lineHeight: 1.5,

  // High contrast
  color: '#1f2937',
  backgroundColor: '#ffffff',
}

const buttonStyles: React.CSSProperties = {
  minWidth: '48px',
  minHeight: '48px',
  padding: '16px 24px',
  fontSize: '18px',
  fontWeight: 600,
  borderRadius: '8px',
  cursor: 'pointer',
}

const callButtonStyles: React.CSSProperties = {
  ...buttonStyles,
  minHeight: '56px',
  backgroundColor: '#22c55e',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
}
```

### Access Logging (Stub Implementation)

```typescript
// useCaregiverAccessLog.ts
export function useCaregiverAccessLog(action: 'view' | 'call_parent') {
  useEffect(() => {
    // TODO: Replace with Firebase function call when Epic 19D.3 is complete
    console.log(`[Caregiver Access] ${action} at ${new Date().toISOString()}`)

    // Future: await logCaregiverAccess({ action, timestamp: new Date() })
  }, [action])
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/app/caregiver/page.tsx` - Route handler
- `apps/web/src/components/caregiver/CaregiverQuickView.tsx` - Main component
- `apps/web/src/components/caregiver/CaregiverChildCard.tsx` - Child status card
- `apps/web/src/components/caregiver/CallParentButton.tsx` - Call parent action
- `apps/web/src/components/caregiver/index.ts` - Barrel exports
- `apps/web/src/hooks/useCaregiverStatus.ts` - Status hook
- `apps/web/src/hooks/useCaregiverAccessLog.ts` - Access logging hook
- `apps/web/src/components/caregiver/CaregiverQuickView.test.tsx` - Component tests
- `apps/web/src/hooks/useCaregiverStatus.test.ts` - Hook tests

**Files to potentially reference:**

- `apps/web/src/hooks/useFamilyStatus.ts` - Status calculation patterns
- `apps/web/src/hooks/useChildStatus.ts` - Child aggregation patterns
- `apps/web/src/components/dashboard/ChildStatusRow.tsx` - Avatar pattern

### Testing Requirements

**Unit Tests (minimum 15):**

1. CaregiverQuickView renders loading state
2. CaregiverQuickView renders error state
3. CaregiverQuickView shows "doing well" message when all children good
4. CaregiverQuickView shows "check in with X" when children need attention
5. CaregiverQuickView does NOT show device details
6. CaregiverChildCard displays child name and avatar
7. CaregiverChildCard shows simplified status
8. CallParentButton renders with parent name
9. CallParentButton has correct tel: href
10. CallParentButton meets 44x44px touch target
11. All interactive elements have ARIA labels
12. Keyboard navigation works (Tab, Enter)
13. useCaregiverStatus returns correct status for all-good scenario
14. useCaregiverStatus returns correct status for needs-attention scenario
15. useCaregiverAccessLog logs on mount

### Edge Cases

1. **No children assigned to caregiver:** Show "No children to monitor"
2. **Parent has no phone number:** Hide Call Parent button, show message to contact parent
3. **All children have issues:** List all names in "Check in with X, Y, Z"
4. **Loading state:** Show large loading spinner, no skeleton
5. **Error state:** Simple error message with retry button
6. **Outside access window:** (Future) "Access not currently active - come back [time]"

### Accessibility Requirements

- All text minimum 18px font size
- Touch targets minimum 44x44px (preferably 48px+)
- Color contrast 4.5:1 minimum
- ARIA labels on all interactive elements
- Role announcements for status changes
- Keyboard accessible (Tab navigation, Enter/Space activation)
- Focus indicators visible (2px solid, high contrast)

### Previous Story Intelligence

**From Story 19A-2:**

- Avatar component with initials fallback and onError handler
- StatusDot component for consistent status indicators
- Status colors extracted to shared statusConstants.ts
- formatLastSeen utility from useDevices
- Pattern: role="button", tabIndex={0}, aria-expanded for expandable elements
- Pattern: inline styles with React.CSSProperties

**Code Review Fixes Applied in 19A-2:**

- Extract shared constants to avoid duplication
- Use unused props (activeDeviceCount was unused until fixed)
- Remove outline:'none' to preserve focus-visible styles
- Add image onError handler for broken images

### References

- [Source: docs/epics/epic-list.md#Story-19A.3 - Caregiver Quick View requirements]
- [Source: docs/epics/epic-list.md#Epic-19D - Basic Caregiver Status View infrastructure]
- [Source: docs/prd/non-functional-requirements.md#NFR49 - 44x44px touch targets]
- [Source: docs/ux-design-specification/7-ux-consistency-patterns.md - Caregiver View patterns]
- [Pattern: apps/web/src/components/dashboard/ChildStatusRow.tsx - Avatar, status styling]
- [Pattern: apps/web/src/hooks/useChildStatus.ts - Status aggregation patterns]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented and tested
- 41 unit tests passing (exceeds minimum requirement of 15)
- Build passes with only expected console warnings (stub logging)
- Uses existing useChildStatus hook for status aggregation
- Caregiver-friendly language: "Doing well", "Check in", "Needs help"
- NFR49 compliance: 48px+ buttons, 64px+ child cards, 18px+ fonts
- Access logging stubbed with console.log until Epic 19D.3 provides infrastructure
- Call Parent button uses tel: link for mobile phone action
- Full accessibility: ARIA labels, keyboard navigation, role announcements

### File List

**New Files Created:**

- `apps/web/src/app/caregiver/page.tsx` - Caregiver route page
- `apps/web/src/components/caregiver/CaregiverQuickView.tsx` - Main view component
- `apps/web/src/components/caregiver/CaregiverChildCard.tsx` - Child status card
- `apps/web/src/components/caregiver/CallParentButton.tsx` - Call parent action
- `apps/web/src/components/caregiver/index.ts` - Barrel exports
- `apps/web/src/hooks/useCaregiverStatus.ts` - Status aggregation hook
- `apps/web/src/hooks/useCaregiverAccessLog.ts` - Access logging hook
- `apps/web/src/components/caregiver/CaregiverQuickView.test.tsx` - Component tests (18 tests)
- `apps/web/src/hooks/useCaregiverStatus.test.ts` - Hook tests (16 tests)
- `apps/web/src/hooks/useCaregiverAccessLog.test.ts` - Logging hook tests (7 tests)

**Modified Files:**

- `docs/sprint-artifacts/sprint-status.yaml` - Updated story status to in-progress
