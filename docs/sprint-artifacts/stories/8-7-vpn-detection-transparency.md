# Story 8.7: VPN Detection & Transparency

Status: Blocked

## Story

As a **parent**,
I want **to know when my child is using a VPN that might bypass monitoring**,
So that **I can have a conversation about transparency**.

## Acceptance Criteria

1. **AC1: VPN Detection**
   - Given monitoring is active on a child's device
   - When VPN or proxy usage is detected
   - Then parent receives notification that VPN was detected

2. **AC2: Bilateral Transparency**
   - Given VPN is detected
   - When notification is sent
   - Then child also sees that VPN was detected (bilateral transparency)

3. **AC3: Monitoring Continuity**
   - Given VPN is active
   - When monitoring attempts to function
   - Then monitoring continues to function (VPN doesn't fully bypass)

4. **AC4: Informational Tone**
   - Given VPN detection notification
   - When displayed to parent and child
   - Then notification is informational, not accusatory

5. **AC5: Detection Limitations**
   - Given network-based detection
   - When using network characteristics (not deep packet inspection)
   - Then some privacy-focused VPNs may not be detected (acknowledged limitation)

## Blocked By

**Epic 9+: Device Monitoring Implementation**

This story requires:

- Active device agent sending network data (Epic 9-17)
- Screenshot capture infrastructure (Epic 10, 15)
- Notification infrastructure to parents (Epic 41)

## Dev Notes

### Technical Approach (Future)

VPN detection via network characteristics:

- DNS query patterns
- Connection timing analysis
- Known VPN IP ranges
- Traffic fingerprinting (without DPI)

### Key Requirements

- **FR146:** VPN detection transparency
- **NFR85:** Adversarial testing

### References

- [Source: docs/epics/epic-list.md - Story 8.7]
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
