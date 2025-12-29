# Story 8.5: Negative Capability - No Advertising Use

Status: Done

## Story

As a **family**,
I want **a guarantee that my data will never be used for advertising**,
So that **my children's activity doesn't become ad targeting data**.

## Acceptance Criteria

1. **AC1: No Advertising Identifiers**
   - Given fledgely's data collection
   - When data storage is audited
   - Then no advertising identifiers are collected or stored (IDFA, GAID, etc.)

2. **AC2: No User Profiling for Ads**
   - Given user activity data
   - When data use is reviewed
   - Then no user profiles are built for advertising purposes
   - And no behavioral targeting data is collected

3. **AC3: No Ad Network Integration**
   - Given client applications
   - When dependencies and data flows are audited
   - Then no data is shared with ad networks
   - And no advertising SDKs are present

4. **AC4: Revenue Model Independence**
   - Given business model
   - When revenue sources are documented
   - Then no revenue model depends on advertising
   - And architecture prevents future advertising integration without major refactor

## Tasks / Subtasks

- [x] Task 1: Verify No Ad Identifiers (AC: #1)
  - [x] 1.1 Audit data schemas for IDFA/GAID fields
  - [x] 1.2 Verify no advertising ID collection in clients

- [x] Task 2: Verify No Ad SDKs (AC: #2, #3)
  - [x] 2.1 Audit dependencies for ad networks
  - [x] 2.2 Document in ADR-018

- [x] Task 3: Document Revenue Model (AC: #4)
  - [x] 3.1 Document subscription-only revenue model
  - [x] 3.2 Confirm architecture prevents ad integration

## Dev Notes

### Implementation Strategy

Story 8.5 is covered by ADR-018 (created in Story 8.4). This story validates the specific advertising-related aspects.

### Key Requirements

- **FR132:** No advertising use of data
- **NFR13:** Privacy by design

### Verification Results

**Advertising Identifier Audit:**

- Firestore schemas: No IDFA, GAID, or device advertising ID fields
- Client code: No advertising identifier collection
- Cloud Functions: No ad ID processing

**Advertising SDK Audit (from Story 8.4):**

- apps/web: No ad SDKs
- apps/functions: No ad SDKs
- apps/extension: No ad SDKs
- packages/\*: No ad SDKs

**Revenue Model:**

- Subscription via Stripe (Epic 50)
- No advertising revenue planned
- Architecture has no ad integration points

### References

- [ADR-018: Negative Capabilities - Data Privacy Commitments]
- [Story 8.4: No Third-Party Sharing]

## Dev Agent Record

### Context Reference

ADR-018 in docs/architecture/project-context-analysis.md

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Verified no advertising identifiers in data schemas
- Confirmed no ad SDKs in any package (from Story 8.4 audit)
- Revenue model is subscription-only (Stripe)
- ADR-018 constraint #2 explicitly prohibits advertising integration

### File List

- No new files - covered by ADR-018 from Story 8.4

## Senior Developer Review (AI)

**Review Date:** 2025-12-29
**Outcome:** Approve
**Action Items:** None - covered by ADR-018

### Notes

- Advertising negative capability verified via dependency audit
- No data schema changes needed (no ad identifiers exist)
- Subscription revenue model documented in Epic 50 backlog

## Change Log

| Date       | Change                      |
| ---------- | --------------------------- |
| 2025-12-29 | Story created and completed |
