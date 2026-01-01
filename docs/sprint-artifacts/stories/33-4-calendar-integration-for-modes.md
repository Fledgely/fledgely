# Story 33.4: Calendar Integration for Modes

Status: done

Epic: 33 - Focus Mode & Work Mode
Priority: Medium

## Story

As **a child**,
I want **focus mode to integrate with my calendar**,
So that **it activates automatically during homework time**.

## Acceptance Criteria

1. **AC1: Google Calendar Connection**
   - Given child wants to connect their calendar
   - When setting up calendar integration
   - Then Google Calendar OAuth flow supported
   - And calendar events are read-only (no modifications)
   - And connection status visible to child and parent
   - And child can disconnect calendar at any time

2. **AC2: Calendar Event Detection**
   - Given child has connected calendar
   - When calendar event contains "Study", "Homework", "Focus", "Work" keywords
   - Then event is detected as focus-mode-eligible
   - And detection uses case-insensitive matching
   - And parent can configure additional keywords
   - And school calendar events detected if integrated

3. **AC3: Automatic Focus Mode Activation**
   - Given focus-eligible event is detected
   - When event start time arrives
   - Then focus mode auto-activates
   - And notification sent: "Focus mode starting for 'Math Homework'"
   - And focus mode duration matches calendar event duration
   - And focus mode auto-deactivates at event end time

4. **AC4: Manual Override**
   - Given focus mode is active due to calendar event
   - When child wants to exit early
   - Then child can manually stop focus mode
   - And early exit is logged (not punitive)
   - And parent sees: "Emma ended focus mode early (15 min early)"
   - And respects child autonomy

5. **AC5: Parent Visibility**
   - Given calendar-triggered focus sessions occur
   - When parent views focus mode activity
   - Then parent sees calendar-triggered vs manual sessions
   - And parent sees: "Focus mode triggered by 'Math Homework'"
   - And session statistics distinguish trigger types
   - And parent cannot modify child's calendar (privacy)

6. **AC6: Opt-In Configuration**
   - Given calendar integration is available
   - When setting up integration
   - Then auto-activation is opt-in (not default)
   - And child must consent to calendar access
   - And parent can enable/disable auto-activation
   - And sync frequency is configurable (15min/30min/hourly)

## Technical Notes

### Architecture Patterns

- Follows OAuth pattern from existing Google Auth integration (Story 1-1)
- Extends focus mode infrastructure from Stories 33-1 and 33-2
- Uses Firestore structure: `families/{familyId}/calendarIntegration/{childId}`
- Chrome extension checks for calendar-triggered focus mode

### Data Model

```typescript
// CalendarIntegration config stored per child
interface CalendarIntegrationConfig {
  childId: string
  familyId: string
  isEnabled: boolean
  provider: 'google' // Future: 'apple', 'outlook'
  accessToken: string | null // Encrypted
  refreshToken: string | null // Encrypted
  connectedAt: number | null
  syncFrequencyMinutes: 15 | 30 | 60
  autoActivateFocusMode: boolean
  focusTriggerKeywords: string[]
  lastSyncAt: number | null
  updatedAt: number
}

// Calendar event as detected
interface CalendarEvent {
  id: string
  title: string
  startTime: number
  endTime: number
  isFocusEligible: boolean
  matchedKeywords: string[]
}

// Focus session extended for calendar trigger
interface FocusModeSession {
  // ... existing fields
  triggeredBy: 'manual' | 'calendar'
  calendarEventId?: string
  calendarEventTitle?: string
}
```

### Key Files to Modify/Create

- `packages/shared/src/contracts/calendarIntegration.ts` - Calendar integration schemas
- `apps/web/src/hooks/useCalendarIntegration.ts` - Calendar integration hook
- `apps/web/src/components/child/CalendarConnectionCard.tsx` - Child calendar UI
- `apps/web/src/components/parent/CalendarIntegrationSettings.tsx` - Parent settings
- `apps/functions/src/http/calendar/index.ts` - OAuth callback + sync endpoint
- `apps/functions/src/scheduled/calendar-sync.ts` - Scheduled event sync
- `apps/extension/src/focus-mode.ts` - Update to check calendar triggers

### Google Calendar API Requirements

- Scopes needed: `https://www.googleapis.com/auth/calendar.readonly`
- OAuth 2.0 web application flow
- Store refresh tokens securely (Cloud Secret Manager or encrypted Firestore)
- Rate limits: 100 requests per 100 seconds per user
- Use Push Notifications (Webhooks) for real-time event updates (optional enhancement)

### Existing Patterns to Follow

- Google OAuth pattern from `apps/web/src/lib/firebase.ts` (auth provider)
- Focus mode hooks pattern from `useFocusMode.ts` and `useFocusModeConfig.ts`
- Cloud function patterns from `apps/functions/src/http/work/index.ts`
- Firestore real-time subscriptions with `onSnapshot`
- Component testing patterns from focus mode tests

### Security Considerations

- Never store raw OAuth tokens in client-accessible locations
- Use Cloud Functions as OAuth callback handler
- Encrypt tokens at rest in Firestore
- Child must explicitly consent to calendar access
- Parent cannot read child's actual calendar events (only focus sessions)

## Dependencies

- Story 33-1: Child-Initiated Focus Mode (base infrastructure)
- Story 33-2: Focus Mode App Configuration (app configuration pattern)
- Story 1-1: Google Sign-In Button Flow (OAuth pattern reference)

## Tasks / Subtasks

- [x] Task 1: Create calendar integration data model (AC: #1, #6)
  - [x] 1.1 Add CalendarIntegrationConfig schema to @fledgely/shared
  - [x] 1.2 Add CalendarEvent schema
  - [x] 1.3 Add focus trigger keywords default list
  - [x] 1.4 Extend FocusModeSession with calendar trigger fields
  - [x] 1.5 Add unit tests for schemas (31 tests)

- [x] Task 2: Create calendar integration hook (AC: #1, #2, #6)
  - [x] 2.1 Create `useCalendarIntegration` hook
  - [x] 2.2 Implement connection status tracking
  - [x] 2.3 Implement keyword matching logic
  - [x] 2.4 Add real-time Firestore sync
  - [x] 2.5 Add unit tests for hook (18 tests)

- [x] Task 3: Create OAuth callback cloud function (AC: #1)
  - [x] 3.1 Create `/api/calendar/oauth/callback` endpoint
  - [x] 3.2 Implement Google OAuth token exchange
  - [x] 3.3 Securely store tokens in Firestore (encrypted)
  - [x] 3.4 Return connection status to client
  - [x] 3.5 Add unit tests for OAuth handler (27 tests)

- [x] Task 4: Create calendar sync cloud function (AC: #2, #3)
  - [x] 4.1 Create `syncCalendarEvents` scheduled function
  - [x] 4.2 Fetch upcoming events from Google Calendar API
  - [x] 4.3 Detect focus-eligible events by keywords
  - [x] 4.4 Store detected events in Firestore
  - [x] 4.5 Add unit tests for sync logic (6 tests)

- [x] Task 5: Implement auto-activation logic (AC: #3, #4)
  - [x] 5.1 Create calendar trigger check in focus mode hook
  - [x] 5.2 Implement automatic start at event time
  - [x] 5.3 Implement automatic stop at event end
  - [x] 5.4 Support manual override (early exit)
  - [x] 5.5 Add unit tests for activation logic (11 tests)

- [x] Task 6: Create child calendar connection UI (AC: #1, #4)
  - [x] 6.1 Create `CalendarConnectionCard` component
  - [x] 6.2 Add "Connect Google Calendar" button with OAuth flow
  - [x] 6.3 Show connection status and connected account
  - [x] 6.4 Add disconnect button
  - [x] 6.5 Add component tests (19 tests)

- [x] Task 7: Create parent settings UI (AC: #5, #6)
  - [x] 7.1 Create `CalendarIntegrationSettings` component
  - [x] 7.2 Show calendar-triggered focus sessions
  - [x] 7.3 Add keyword configuration
  - [x] 7.4 Add auto-activation toggle
  - [x] 7.5 Add component tests (20 tests)

- [x] Task 8: Update Chrome extension (AC: #3)
  - [x] 8.1 Update focus-mode.ts to check calendar triggers
  - [x] 8.2 Handle calendar-triggered focus mode state
  - [x] 8.3 Show calendar event title in focus indicator

## Dev Notes

### Project Structure Notes

- Calendar integration follows established hook + component patterns
- OAuth tokens handled exclusively by Cloud Functions for security
- Extension receives focus mode state including trigger type via existing sync

### Google Cloud Setup Required

- Enable Google Calendar API in GCP Console
- Create OAuth 2.0 Client ID (Web application type)
- Add authorized redirect URI: `https://[project].cloudfunctions.net/api/calendar/oauth/callback`
- Store client ID and secret in Cloud Secret Manager

### Testing Standards

- Unit tests for all Zod schemas
- Hook tests with mocked Google Calendar API responses
- Component tests with React Testing Library
- Integration tests for OAuth flow (optional - manual testing acceptable)
- Test keyword matching with various event titles

### References

- [Source: docs/epics/epic-list.md#story-334-calendar-integration-for-modes]
- [Source: apps/web/src/hooks/useFocusMode.ts] - Focus mode hook pattern
- [Source: apps/web/src/lib/firebase.ts] - Google OAuth reference
- [Source: apps/functions/src/http/work/index.ts] - Cloud function pattern
- [Google Calendar API Docs](https://developers.google.com/calendar/api/v3/reference)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

### File List

**Created:**

- `packages/shared/src/contracts/calendarIntegration.test.ts` - Calendar integration schema tests (31 tests)
- `apps/functions/src/utils/encryption.ts` - Shared encryption utilities for token storage
- `apps/functions/src/http/calendar/index.ts` - OAuth handlers for Google Calendar
- `apps/functions/src/http/calendar/index.test.ts` - OAuth handler tests (27 tests)
- `apps/functions/src/scheduled/syncCalendarEvents.ts` - Calendar sync scheduled function
- `apps/functions/src/scheduled/syncCalendarEvents.test.ts` - Sync function tests (6 tests)
- `apps/web/src/hooks/useCalendarIntegration.ts` - Calendar integration hook
- `apps/web/src/hooks/useCalendarIntegration.test.ts` - Hook tests (18 tests)
- `apps/web/src/hooks/useFocusModeWithCalendar.ts` - Auto-activation logic hook
- `apps/web/src/hooks/useFocusModeWithCalendar.test.ts` - Auto-activation tests (11 tests)
- `apps/web/src/components/child/CalendarConnectionCard.tsx` - Child calendar UI component
- `apps/web/src/components/child/CalendarConnectionCard.test.tsx` - Child UI tests (19 tests)
- `apps/web/src/components/parent/CalendarIntegrationSettings.tsx` - Parent settings component
- `apps/web/src/components/parent/CalendarIntegrationSettings.test.tsx` - Parent UI tests (20 tests)
- `apps/extension/src/focus-mode.test.ts` - Extension focus mode tests (25 tests)

**Modified:**

- `packages/shared/src/contracts/index.ts` - Added calendar integration schemas
- `packages/shared/src/index.ts` - Exported calendar integration types
- `apps/functions/src/index.ts` - Exported calendar HTTP handlers
- `apps/functions/src/scheduled/index.ts` - Exported syncCalendarEvents function
- `apps/functions/package.json` - Added googleapis dependency
- `apps/extension/src/focus-mode.ts` - Added calendar trigger support
- `apps/extension/src/content-scripts/focus-mode-block.ts` - Added calendar event title display
