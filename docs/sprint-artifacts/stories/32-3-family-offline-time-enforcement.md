# Story 32.3: Family Offline Time Enforcement

Status: done

## Story

As **the system**,
I want **to enforce offline time across enrolled devices**,
So that **the family actually disconnects**.

## Acceptance Criteria

1. **AC1: Family Offline Time Screen**
   - Given family offline time begins
   - When enforcement activates on enrolled child devices
   - Then all enrolled devices show "Family Offline Time" screen
   - And screen uses family-friendly, calming design

2. **AC2: Child Device App Blocking**
   - Given offline time is active
   - When child uses browser on enrolled device
   - Then non-essential sites blocked on child devices
   - And "Family Offline Time" overlay shown

3. **AC3: Parent Device Reminder (Optional)**
   - Given parent has enrolled devices
   - When offline time begins
   - Then parent devices show reminder notification
   - And enforcement is optional for parents (reminder only)

4. **AC4: Emergency Always Allowed**
   - Given offline time is active
   - When user needs emergency access
   - Then emergency/crisis domains always allowed
   - And crisis resources remain accessible

5. **AC5: 5-Minute Warning Before Start**
   - Given offline time is scheduled to start
   - When 5 minutes remain before start
   - Then warning notification shown: "Family time starts in 5 minutes"
   - And countdown displayed in extension badge

6. **AC6: Countdown Display**
   - Given warning period is active
   - When user views extension
   - Then countdown shows minutes until offline time starts
   - And badge shows "5m", "4m", etc.

## Tasks / Subtasks

- [x] Task 1: Create offline schedule enforcement service (AC: #1, #2, #5, #6)
  - [x] 1.1 Create `offline-schedule-enforcement.ts` in extension
  - [x] 1.2 Implement schedule checking (isWithinOfflineWindow)
  - [x] 1.3 Implement 5-minute warning detection
  - [x] 1.4 Add countdown badge updates
  - [x] 1.5 Write unit tests (36 tests)

- [x] Task 2: Create Family Offline Time overlay (AC: #1, #2)
  - [x] 2.1 Create `family-offline-block.ts` content script
  - [x] 2.2 Design calming overlay with family message
  - [x] 2.3 Add break activity suggestions
  - [x] 2.4 Integrate with existing blocking infrastructure
  - [x] 2.5 Tests included in Task 1

- [x] Task 3: Implement parent device handling (AC: #3)
  - [x] 3.1 Add parent device detection logic
  - [x] 3.2 Create parent reminder notification
  - [x] 3.3 Skip enforcement for parent devices (reminder only)
  - [x] 3.4 Tests included in Task 1

- [x] Task 4: Ensure emergency access (AC: #4)
  - [x] 4.1 Integrate with existing crisis-allowlist.ts
  - [x] 4.2 Ensure crisis domains bypass offline blocking
  - [x] 4.3 Tests included in Task 1 (shouldBlockForOffline tests)

- [x] Task 5: Integrate with background script (AC: #1-6)
  - [x] 5.1 Add schedule sync from Firestore
  - [x] 5.2 Setup periodic schedule check alarm
  - [x] 5.3 Connect warning and enforcement flows
  - [x] 5.4 Integration via checkOfflineSchedule() function

## Dev Notes

### Architecture Pattern

Offline schedule enforcement is SEPARATE from daily time limit enforcement:

- **Time limits** (Story 31.x): Based on cumulative usage minutes
- **Offline schedule** (Story 32.x): Based on clock time windows

```typescript
// apps/extension/src/offline-schedule-enforcement.ts

import { familyOfflineScheduleSchema, type FamilyOfflineSchedule } from '@fledgely/shared'

const STORAGE_KEY_OFFLINE_SCHEDULE = 'offlineSchedule'
const STORAGE_KEY_PARENT_ENROLLMENT = 'parentDeviceEnrollment'
const ALARM_OFFLINE_CHECK = 'offline-schedule-check'

export interface OfflineScheduleState {
  schedule: FamilyOfflineSchedule | null
  isInOfflineWindow: boolean
  isWarningActive: boolean
  minutesUntilStart: number | null
  nextWindowStart: number | null // epoch ms
}

/**
 * Check if current time is within an offline window
 */
export function isWithinOfflineWindow(schedule: FamilyOfflineSchedule): boolean {
  if (!schedule.enabled) return false

  const now = new Date()
  const currentDay = now.getDay() // 0=Sunday
  const isWeekend = currentDay === 0 || currentDay === 6

  const window = isWeekend ? schedule.weekendWindow : schedule.weekdayWindow
  if (!window) return false

  const [startHour, startMin] = window.startTime.split(':').map(Number)
  const [endHour, endMin] = window.endTime.split(':').map(Number)

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  // Handle overnight windows (e.g., 21:00-07:00)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Calculate minutes until offline window starts
 */
export function getMinutesUntilStart(schedule: FamilyOfflineSchedule): number | null {
  if (!schedule.enabled) return null

  const now = new Date()
  const currentDay = now.getDay()
  const isWeekend = currentDay === 0 || currentDay === 6

  const window = isWeekend ? schedule.weekendWindow : schedule.weekdayWindow
  if (!window) return null

  const [startHour, startMin] = window.startTime.split(':').map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startHour * 60 + startMin

  if (currentMinutes >= startMinutes) {
    // Already past start time today, calculate for next window
    return null
  }

  return startMinutes - currentMinutes
}
```

### Family Offline Time Overlay

Different from time-limit-block.ts - uses family-focused messaging:

```typescript
// apps/extension/src/content-scripts/family-offline-block.ts

/**
 * Family Offline Time overlay - distinct from time limit block
 *
 * Key differences:
 * - Family-focused messaging: "It's family offline time!"
 * - Emphasis on togetherness, not limits
 * - Countdown to end of offline period
 * - No "request more time" - this is scheduled family time
 */

function createFamilyOfflineOverlay(): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.id = 'fledgely-family-offline'

  overlay.innerHTML = `
    <style>
      #fledgely-family-offline {
        position: fixed !important;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        z-index: 2147483647 !important;
        display: flex; align-items: center; justify-content: center;
        font-family: system-ui, sans-serif;
        color: white; text-align: center;
      }
      /* ... family-friendly styles */
    </style>

    <div class="container">
      <div class="icon">👨‍👩‍👧‍👦</div>
      <h1>It's Family Offline Time!</h1>
      <p>Time to connect with your family - screens off, together time on!</p>

      <div class="activities">
        <h3>Family activity ideas:</h3>
        <ul>
          <li>🎲 Play a board game together</li>
          <li>🍽️ Help with dinner</li>
          <li>📖 Read together</li>
          <li>🚶 Take a family walk</li>
          <li>💬 Share stories from your day</li>
        </ul>
      </div>

      <div class="countdown">
        Family time ends in <span id="countdown-time">--:--</span>
      </div>
    </div>
  `

  return overlay
}
```

### Parent Device Handling

Parents get reminders, not enforcement:

```typescript
// In offline-schedule-enforcement.ts

export async function isParentDevice(): Promise<boolean> {
  // Check if current device is enrolled as parent device
  const result = await chrome.storage.local.get('enrolledDeviceInfo')
  return result.enrolledDeviceInfo?.isParentDevice === true
}

export async function handleOfflineStart(): Promise<void> {
  const isParent = await isParentDevice()

  if (isParent) {
    // Parents get notification only, no blocking
    await showParentReminder()
  } else {
    // Children get full enforcement
    await startOfflineEnforcement()
  }
}

async function showParentReminder(): Promise<void> {
  await chrome.notifications.create('family-offline-reminder', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
    title: 'Family Offline Time',
    message: "It's family offline time! Lead by example 📱➡️✨",
    priority: 1,
  })
}
```

### Emergency Access Integration

Leverage existing crisis allowlist:

```typescript
import { CRISIS_ALLOWLIST } from './crisis-allowlist'

export function shouldBlockForOffline(url: string): boolean {
  try {
    const domain = new URL(url).hostname

    // Never block crisis resources
    if (CRISIS_ALLOWLIST.includes(domain)) {
      return false
    }

    // Block all other sites during offline time
    return true
  } catch {
    return false
  }
}
```

### Testing Approach

```typescript
describe('offline-schedule-enforcement', () => {
  describe('isWithinOfflineWindow', () => {
    it('returns true during scheduled window', () => {
      /* ... */
    })
    it('returns false outside scheduled window', () => {
      /* ... */
    })
    it('handles overnight windows correctly', () => {
      /* ... */
    })
    it('uses weekday vs weekend windows correctly', () => {
      /* ... */
    })
    it('returns false when schedule disabled', () => {
      /* ... */
    })
  })

  describe('getMinutesUntilStart', () => {
    it('calculates correct minutes before window', () => {
      /* ... */
    })
    it('returns null when already in window', () => {
      /* ... */
    })
  })

  describe('parent device handling', () => {
    it('shows reminder for parent devices', () => {
      /* ... */
    })
    it('enforces blocking for child devices', () => {
      /* ... */
    })
  })
})
```

### NFR Compliance

- **NFR42**: WCAG 2.1 AA - accessible overlay with proper ARIA
- **NFR26**: Extension performance - efficient schedule checks

### References

- [Source: docs/epics/epic-list.md#story-323] - Story requirements
- [Source: Story 32-1] - Family Offline Schedule Configuration (schema)
- [Source: Story 32-2] - Parent Device Enrollment
- [Source: apps/extension/src/crisis-allowlist.ts] - Emergency domains
- [Source: apps/extension/src/time-limit-warnings.ts] - Warning patterns

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Implemented full offline schedule enforcement system
- Created family-friendly blocking overlay with activity suggestions
- Added parent device handling (reminders only, no enforcement)
- Integrated with crisis-allowlist for emergency access bypass
- Added background.ts integration for alarm handling and message passing
- Added notification permission checking for optional permissions
- 36 unit tests passing

### File List

- apps/extension/src/offline-schedule-enforcement.ts (created)
- apps/extension/src/offline-schedule-enforcement.test.ts (created)
- apps/extension/src/content-scripts/family-offline-block.ts (created)
- apps/extension/src/background.ts (modified - added offline schedule integration)
