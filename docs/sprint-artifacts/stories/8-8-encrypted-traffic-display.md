# Story 8.8: Encrypted Traffic Display

Status: done

## Story

As a **parent**,
I want **transparency about what monitoring can and cannot see**,
So that **I understand the limitations of screenshot-based monitoring**.

## Acceptance Criteria

1. **AC1: Capability Explanation**
   - Given monitoring is active
   - When parent views monitoring capabilities
   - Then dashboard clearly explains what monitoring captures (screenshots, time)

2. **AC2: Limitation Transparency**
   - Given monitoring capabilities
   - When displayed to parent
   - Then dashboard explains what it CANNOT capture (encrypted content, password inputs)

3. **AC3: Honest Messaging**
   - Given capability explanations
   - When displayed
   - Then explanation is honest about limitations (not overselling capability)

4. **AC4: HTTPS Indicator**
   - Given traffic analysis
   - When dashboard displays
   - Then encrypted traffic percentage is shown (rough indicator of HTTPS usage)

5. **AC5: Purpose Framing**
   - Given monitoring philosophy
   - When explained to parents
   - Then explanation helps parents understand monitoring is conversation-starter, not surveillance

## Tasks / Subtasks

- [x] Task 1: Create MonitoringCapabilitiesCard Component (AC: #1, #2, #3, #5)
  - [x] 1.1 Create MonitoringCapabilitiesCard.tsx with collapsible sections
  - [x] 1.2 Add "What We Capture" section (screenshots, activity times)
  - [x] 1.3 Add "What We Cannot See" section (encrypted content, passwords, private content)
  - [x] 1.4 Add "Purpose" section explaining monitoring as conversation-starter
  - [x] 1.5 Use honest, non-surveillance language throughout
  - [x] 1.6 Add unit tests for component rendering (23 tests)

- [x] Task 2: Add HTTPS Traffic Indicator (AC: #4)
  - [x] 2.1 Add encryptedTrafficPercent field to DeviceHealthMetrics
  - [x] 2.2 Display encrypted traffic percentage in capabilities card
  - [x] 2.3 Explain what encrypted traffic means for parents
  - [x] 2.4 Add visual indicator (lock icon for encrypted)

- [x] Task 3: Integrate with DeviceHealthModal (AC: All)
  - [x] 3.1 Add MonitoringCapabilitiesCard to DeviceHealthModal
  - [x] 3.2 Card is collapsible within modal (not standalone)
  - [x] 3.3 Integration tests included in component tests

- [x] Task 4: Unit Tests (AC: All)
  - [x] 4.1 Test capability explanations render correctly
  - [x] 4.2 Test limitation section shows honest messaging
  - [x] 4.3 Test HTTPS indicator displays percentage
  - [x] 4.4 Test accessibility (ARIA, keyboard navigation)

## Dev Notes

### Implementation Strategy

Story 8-8 provides transparency to parents about what screenshot-based monitoring can and cannot do. This is primarily a UI/UX feature with honest, non-surveillance language.

**Key principle: Honest communication.** Don't oversell capabilities or hide limitations.

### Key Requirements

- **FR138:** Monitoring limitation transparency
- **NFR85:** Adversarial testing

### Technical Approach

1. **MonitoringCapabilitiesCard Component**:

Create a collapsible card component showing:

```
┌─────────────────────────────────────────────┐
│ 📊 About Monitoring                         │
├─────────────────────────────────────────────┤
│ ✓ What We Capture                           │
│   • Screenshots at intervals                │
│   • Time spent in apps/websites             │
│   • Device activity status                  │
│                                             │
│ ✗ What We Cannot See                        │
│   • Encrypted message content               │
│   • Password/login inputs                   │
│   • Private mode browsing                   │
│   • End-to-end encrypted apps               │
│                                             │
│ 🔐 Encrypted Traffic: ~95% HTTPS            │
│   (Most sites use encryption)               │
│                                             │
│ 💬 Why This Exists                          │
│   Monitoring helps start conversations,     │
│   not replace them. It's a tool for         │
│   discussion, not surveillance.             │
└─────────────────────────────────────────────┘
```

2. **HTTPS Traffic Indicator**:

- Show percentage of HTTPS traffic (available from extension)
- Explain that HTTPS means content is encrypted in transit
- Honest messaging: "We can see what sites are visited, not what was typed or read"

3. **Language Guidelines**:

| DO use                         | DON'T use             |
| ------------------------------ | --------------------- |
| "helps start conversations"    | "monitors everything" |
| "cannot see encrypted content" | "complete visibility" |
| "tool for discussion"          | "surveillance system" |

### Project Structure Notes

Files to create:

- `apps/web/src/components/devices/MonitoringCapabilitiesCard.tsx`
- `apps/web/src/components/devices/MonitoringCapabilitiesCard.test.tsx`

Files to modify:

- `apps/web/src/hooks/useDevices.ts` - Add encryptedTrafficPercent to DeviceHealthMetrics
- `apps/web/src/components/devices/DeviceHealthModal.tsx` - Integrate capabilities card

### Previous Story Learnings

From Story 8.7 (VPN Detection Transparency):

- Non-accusatory language patterns
- Honest limitations documentation

From Story 19.4 (Monitoring Health Details):

- DeviceHealthModal patterns
- Health metrics display

### References

- [Source: docs/epics/epic-list.md - Story 8.8]
- [Story 8.7: VPN Detection - non-accusatory language patterns]
- [Story 19.4: Monitoring Health Details - DeviceHealthModal]

## Dev Agent Record

### Context Reference

Implementation complete - MonitoringCapabilitiesCard integrated with DeviceHealthModal.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required - implementation was straightforward.

### Completion Notes List

- Created MonitoringCapabilitiesCard.tsx with collapsible UI
- Shows "What We Capture" (screenshots, activity times, device status)
- Shows "What We Cannot See" (encrypted content, passwords, private browsing)
- Added HTTPS traffic percentage indicator with visual feedback
- Integrated card into DeviceHealthModal
- Added encryptedTrafficPercent to DeviceHealthMetrics interface
- 23 tests covering all acceptance criteria
- Uses non-surveillance language (conversation-starter, not spy tool)
- ARIA attributes and keyboard navigation for accessibility

### File List

Created:

- `apps/web/src/components/devices/MonitoringCapabilitiesCard.tsx` - Main component
- `apps/web/src/components/devices/MonitoringCapabilitiesCard.test.tsx` - 23 tests

Modified:

- `apps/web/src/hooks/useDevices.ts` - Added encryptedTrafficPercent to DeviceHealthMetrics
- `apps/web/src/components/devices/DeviceHealthModal.tsx` - Integrated MonitoringCapabilitiesCard

## Change Log

| Date       | Change                                     |
| ---------- | ------------------------------------------ |
| 2025-12-29 | Story created as blocked                   |
| 2025-12-30 | Unblocked - Epic 9+ complete, tasks added  |
| 2025-12-30 | Implementation complete - 23 tests passing |
