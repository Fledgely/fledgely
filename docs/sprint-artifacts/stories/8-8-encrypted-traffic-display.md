# Story 8.8: Encrypted Traffic Display

Status: Blocked

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

## Blocked By

**Epic 9+: Device Monitoring Implementation**

This story requires:

- Active device agent analyzing traffic patterns (Epic 9-17)
- Traffic metadata collection infrastructure
- Dashboard display of device metrics (Epic 19)

## Dev Notes

### Technical Approach (Future)

Traffic analysis without content inspection:

- HTTPS vs HTTP ratio
- Total traffic volume
- Time-of-day patterns
- App-level traffic attribution

### Key Requirements

- **FR138:** Monitoring limitation transparency
- **NFR85:** Adversarial testing

### References

- [Source: docs/epics/epic-list.md - Story 8.8]
- [Depends on: Epic 9-17 device monitoring]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Story blocked pending device monitoring implementation
- Technical approach documented for future implementation

## Change Log

| Date       | Change                   |
| ---------- | ------------------------ |
| 2025-12-29 | Story created as blocked |
