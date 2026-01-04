# Story 52.5: Trusted Adult Access

## Status: done

## Story

As **a trusted adult**,
I want **to see what the teen shares with me**,
So that **I can provide support**.

## Acceptance Criteria

1. **AC1: View Shared Data Dashboard**
   - Given trusted adult is approved and active
   - When accessing Fledgely
   - Then sees dashboard limited to what teen shares
   - And clearly labeled: "Shared by [Teen Name]"

2. **AC2: Read-Only Access**
   - Given trusted adult is viewing dashboard
   - When interacting with the interface
   - Then cannot modify settings or controls
   - And all actions are view-only

3. **AC3: Respect Reverse Mode Settings**
   - Given reverse mode is active for teen
   - When trusted adult views data
   - Then only sees data matching teen's sharing preferences
   - And sees empty state if teen shares nothing

4. **AC4: Notification Support**
   - Given trusted adult has active access
   - When teen enables notifications for trusted adult
   - Then trusted adult can receive notifications about shared data
   - And notification preferences are teen-controlled

5. **AC5: Access Logging (NFR42)**
   - Given trusted adult accesses any data
   - When viewing screens, flags, or activity
   - Then all access is logged for audit
   - And teen can see when trusted adult last accessed data

6. **AC6: Teen Revocation Visibility**
   - Given teen can revoke access anytime
   - When trusted adult's access is revoked
   - Then trusted adult sees clear message: "Access has been revoked"
   - And no data is accessible after revocation

## Tasks / Subtasks

### Task 1: Create Trusted Adult Dashboard Layout

**Files:**

- `apps/web/src/app/trusted-adult/layout.tsx` (new)
- `apps/web/src/app/trusted-adult/page.tsx` (new)

**Implementation:**
1.1 Create trusted adult layout with header showing "Shared by [Teen Name]"
1.2 Create main dashboard page with navigation
1.3 Show access status (active, pending, revoked)
1.4 Display last access timestamp for transparency

### Task 2: Create Shared Data View Components

**Files:**

- `apps/web/src/components/trusted-adult-view/SharedDataDashboard.tsx` (new)
- `apps/web/src/components/trusted-adult-view/SharedScreenTimeCard.tsx` (new)
- `apps/web/src/components/trusted-adult-view/SharedFlagsCard.tsx` (new)
- `apps/web/src/components/trusted-adult-view/index.ts` (new)

**Implementation:**
2.1 Create SharedDataDashboard showing only teen-allowed data
2.2 Create SharedScreenTimeCard respecting sharing preferences
2.3 Create SharedFlagsCard respecting flag sharing settings
2.4 Show empty state when teen shares nothing

### Task 3: Create Access Validation Service

**Files:**

- `packages/shared/src/services/trustedAdultAccessService.ts` (new)
- `packages/shared/src/services/trustedAdultAccessService.test.ts` (new)

**Implementation:**
3.1 Implement validateTrustedAdultAccess(userId, childId) - check active status
3.2 Implement getSharedDataForTrustedAdult(trustedAdultId, childId) - apply filters
3.3 Implement getTrustedAdultAccessibleData(childId, sharingPreferences)
3.4 Write unit tests for all validation logic

### Task 4: Create Callable Functions for Trusted Adult Access

**Files:**

- `apps/functions/src/callable/trustedAdultAccess.ts` (new)
- `apps/functions/src/index.ts` (modify)

**Implementation:**
4.1 Implement getSharedDataForTrustedAdult - returns filtered data
4.2 Implement getTrustedAdultChildren - list children trusted adult can view
4.3 Implement logTrustedAdultAccess - audit logging
4.4 Add reverse mode filter integration

### Task 5: Create Trusted Adult Access Hook

**Files:**

- `apps/web/src/hooks/useTrustedAdultAccess.ts` (new)
- `apps/web/src/contexts/TrustedAdultContext.tsx` (new)

**Implementation:**
5.1 Create useTrustedAdultAccess hook for data fetching
5.2 Create TrustedAdultContext for state management
5.3 Integrate with reverse mode sharing preferences
5.4 Handle access revocation gracefully

### Task 6: Create Revoked Access UI

**Files:**

- `apps/web/src/app/trusted-adult/revoked/page.tsx` (new)

**Implementation:**
6.1 Show clear message when access is revoked
6.2 Explain what happened without revealing teen's reason
6.3 Provide contact information if appropriate
6.4 Prevent access to any data views

## Dev Notes

### Trusted Adult Access Model

Trusted adults have:

- View-only access to teen-shared data
- No ability to modify any settings
- Access controlled entirely by teen
- All access logged for transparency

### Integration with Reverse Mode

When viewing data:

1. Check trusted adult status (must be ACTIVE)
2. Check reverse mode settings for child
3. Apply sharing preferences to filter data
4. Return only allowed data categories

### Data Filtering Logic

```typescript
function filterDataForTrustedAdult(
  childId: string,
  sharingPreferences: ReverseModeShareingPreferences
) {
  const data: SharedData = {}

  if (sharingPreferences.screenTime) {
    data.screenTime = getScreenTimeData(childId, sharingPreferences.screenTimeDetail)
  }

  if (sharingPreferences.flags) {
    data.flags = getFlagsData(childId)
  }

  // Screenshots only if explicitly enabled
  if (sharingPreferences.screenshots) {
    data.screenshots = getScreenshotsData(childId)
  }

  return data
}
```

### Security Considerations

- Always verify trusted adult status before returning data
- Log all data access for audit trail
- Immediately block access on revocation
- Use trusted adult ID from auth token, never from request

## Dev Agent Record

### Context Reference

Epic 52: Reverse Mode & Trusted Adults (Age 16 Transition)
Story 52-5 implements trusted adult view functionality

- Builds on Story 52-4 (Trusted Adult Designation)
- Integrates with Story 52-2 (Reverse Mode Activation)
- Integrates with Story 52-3 (Selective Sharing)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- packages/shared/src/services/trustedAdultAccessService.ts (new)
- packages/shared/src/services/trustedAdultAccessService.test.ts (new)
- packages/shared/src/index.ts (modified - exports)
- apps/functions/src/callable/trustedAdultAccess.ts (new)
- apps/functions/src/index.ts (modified - exports)
- apps/web/src/components/trusted-adult-view/SharedDataDashboard.tsx (new)
- apps/web/src/components/trusted-adult-view/SharedScreenTimeCard.tsx (new)
- apps/web/src/components/trusted-adult-view/SharedFlagsCard.tsx (new)
- apps/web/src/components/trusted-adult-view/index.ts (new)
- apps/web/src/hooks/useTrustedAdultAccess.ts (new)
- apps/web/src/contexts/TrustedAdultContext.tsx (new)
- apps/web/src/app/trusted-adult/layout.tsx (new)
- apps/web/src/app/trusted-adult/page.tsx (new)
- apps/web/src/app/trusted-adult/revoked/page.tsx (new)
