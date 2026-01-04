# Story 51.7: Privacy Dashboard

## Status: done

## Story

As **a parent**,
I want **a privacy dashboard**,
So that **I understand how my family's data is used**.

## Acceptance Criteria

1. **AC1: Data Collection Visibility**
   - Given parent accesses privacy settings
   - When viewing privacy dashboard
   - Then shows what data is collected
   - And categories clearly explained

2. **AC2: Data Storage Location**
   - Given parent views data storage info
   - When checking storage details
   - Then shows where data is stored (GCP regions)
   - And storage security explained

3. **AC3: Access Control Visibility**
   - Given parent wants to understand access
   - When viewing access information
   - Then shows who has access (family members, support)
   - And access levels explained

4. **AC4: Data Retention Display**
   - Given parent checks retention info
   - When viewing retention periods
   - Then shows data retention periods per data type
   - And deletion schedule visible

5. **AC5: Legal Document Links**
   - Given parent needs policy information
   - When viewing privacy dashboard
   - Then links to privacy policy
   - And links to Terms of Service

6. **AC6: Privacy Controls**
   - Given parent wants to manage preferences
   - When adjusting privacy settings
   - Then controls for marketing emails available
   - And analytics opt-out available

7. **AC7: Session History**
   - Given parent wants security visibility
   - When viewing session info
   - Then last login visible
   - And session history accessible

## Tasks / Subtasks

### Task 1: Create Privacy Dashboard Data Types

**Files:**

- `packages/shared/src/contracts/privacyDashboard.ts` (new)

**Implementation:**
1.1 Define data category types
1.2 Define retention period types
1.3 Define session history types
1.4 Define privacy preferences schema

### Task 2: Create Privacy Info Callable

**Files:**

- `apps/functions/src/callable/getPrivacyInfo.ts` (new)

**Implementation:**
2.1 Return data collection categories
2.2 Return storage regions
2.3 Return family access summary
2.4 Return retention periods

### Task 3: Create Session History Callable

**Files:**

- `apps/functions/src/callable/getSessionHistory.ts` (new)

**Implementation:**
3.1 Return recent login sessions
3.2 Include device/location info

### Task 4: Create Privacy Preferences Callables

**Files:**

- `apps/functions/src/callable/updatePrivacyPreferences.ts` (new)

**Implementation:**
4.1 Toggle marketing emails
4.2 Toggle analytics

### Task 5: Create Privacy Dashboard Page

**Files:**

- `apps/web/src/app/privacy/page.tsx` (new)
- `apps/web/src/hooks/usePrivacyDashboard.ts` (new)

**Implementation:**
5.1 Display data categories
5.2 Show storage info
5.3 Show access summary
5.4 Show retention periods
5.5 Privacy controls section
5.6 Session history section

### Task 6: Export Functions

**Files:**

- `apps/functions/src/index.ts` (modify)
- `packages/shared/src/index.ts` (modify)

## Dev Notes

### Data Categories to Display

1. **Account Data**: Email, name, profile photo
2. **Family Data**: Children profiles, agreements
3. **Screenshots**: Captured screen images
4. **Location Data**: Device location history
5. **Usage Data**: App usage patterns
6. **Device Data**: Device information

### Retention Periods

- Screenshots: Configurable (7-365 days)
- Location data: Configurable
- Usage data: 90 days rolling
- Account data: Until deletion requested
- Agreements: 7 years (legal requirement)

### GCP Regions

- Primary: us-central1
- Data residency options available

## Dev Agent Record

### File List

- packages/shared/src/contracts/privacyDashboard.ts
- apps/functions/src/callable/getPrivacyInfo.ts
- apps/functions/src/callable/getSessionHistory.ts
- apps/functions/src/callable/updatePrivacyPreferences.ts
- apps/web/src/app/privacy/page.tsx
- apps/web/src/hooks/usePrivacyDashboard.ts
