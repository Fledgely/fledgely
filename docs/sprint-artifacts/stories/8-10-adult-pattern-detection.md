# Story 8.10: Adult Pattern Detection

Status: Blocked

## Story

As **the system**,
I want **to detect when an enrolled "child" exhibits adult usage patterns**,
So that **we can prevent misuse of child monitoring for adult surveillance**.

## Acceptance Criteria

1. **AC1: Pattern Analysis**
   - Given a new child profile is enrolled with device monitoring
   - When the first 7 days of usage data is analyzed
   - Then system flags profiles showing adult patterns (work apps, financial sites, adult schedules)

2. **AC2: Verification Prompt**
   - Given flagged profiles
   - When adult patterns detected
   - Then gentle verification prompt sent to parent

3. **AC3: Parent Confirmation Flow**
   - Given verification prompt
   - When parent responds
   - Then if parent confirms adult, monitoring is automatically disabled

4. **AC4: Pattern Explanation Option**
   - Given verification prompt
   - When parent can explain pattern
   - Then if parent explains pattern (teen internship, etc.), flag is cleared

5. **AC5: Metadata-Only Detection**
   - Given detection mechanism
   - When analyzing usage
   - Then detection does NOT access content, only usage metadata (times, app categories)

6. **AC6: Misuse Prevention**
   - Given adult detection
   - When patterns match adult usage
   - Then this prevents "monitoring spouse as child" misuse

## Blocked By

**Epic 9+: Device Monitoring Implementation**

This story requires:

- Active device agent collecting usage metadata (Epic 9-17)
- 7 days of usage data (Epic 10, 15 screenshot capture)
- App classification infrastructure (Epic 20)
- Notification infrastructure to parents (Epic 41)

## Dev Notes

### Technical Approach (Future)

Adult pattern detection signals:

- Work apps (Slack, Teams, LinkedIn, financial apps)
- Usage time patterns (9-5 workday, late night consistent)
- Financial site visits (banking, trading, tax sites)
- Professional email patterns

Detection is behavioral, not content-based.

### Key Requirements

- **FR134:** Adult pattern detection as security foundation
- **NFR85:** Adversarial testing

### Anti-Abuse Design

This feature specifically prevents:

- Domestic abuse via spouse monitoring
- Stalking via fake "child" profiles
- Elder abuse via monitoring adults as children

### References

- [Source: docs/epics/epic-list.md - Story 8.10]
- [Depends on: Epic 9-17 device monitoring, Epic 20 AI classification]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Story blocked pending device monitoring implementation
- Anti-abuse design documented

## Change Log

| Date       | Change                   |
| ---------- | ------------------------ |
| 2025-12-29 | Story created as blocked |
