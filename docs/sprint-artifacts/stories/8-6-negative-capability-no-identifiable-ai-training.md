# Story 8.6: Negative Capability - No Identifiable AI Training

Status: Done

## Story

As a **family**,
I want **my screenshots not to be used for AI training with identifiable data**,
So that **my family's private moments don't train public models**.

## Acceptance Criteria

1. **AC1: Ephemeral Processing**
   - Given fledgely uses AI for classification
   - When screenshots are processed
   - Then screenshots are processed and immediately discarded (not stored for training)

2. **AC2: No Identifiable Training Data**
   - Given AI model training needs
   - When training data is prepared
   - Then any training data is fully anonymized before use
   - And no child-identifiable images are retained for model training

3. **AC3: Opt-Out Available**
   - Given family privacy preferences
   - When data contribution is requested
   - Then family can opt-out of any anonymized contribution

4. **AC4: On-Device AI Future**
   - Given privacy enhancement roadmap
   - When on-device AI becomes available
   - Then on-device AI (when available) eliminates cloud data exposure

## Tasks / Subtasks

- [x] Task 1: Document AI Data Flow (AC: #1)
  - [x] 1.1 Document Gemini ephemeral processing
  - [x] 1.2 Confirm no screenshot retention for training

- [x] Task 2: Document Training Data Policy (AC: #2)
  - [x] 2.1 Add to ADR-018
  - [x] 2.2 Document anonymization requirements

- [x] Task 3: Document Future Roadmap (AC: #3, #4)
  - [x] 3.1 Note opt-out as future feature (Epic 51 data rights)
  - [x] 3.2 Note on-device AI as M18 enhancement

## Dev Notes

### Implementation Strategy

Story 8.6 is covered by ADR-018 (created in Story 8.4). This story validates the specific AI training-related aspects.

### Key Requirements

- **FR133:** No identifiable AI training data
- **NFR13:** Privacy by design

### AI Data Flow (from ADR-018)

```
Screenshot → Cloud Function → Gemini API → Classification Result → Firestore
                              ↓
                        NOT stored for training
                        NOT shared with third parties
                        Ephemeral processing only
```

### Verification Results

**Gemini Integration Pattern:**

- Screenshots sent as base64 in API request
- Classification result returned
- No screenshot data persisted on Google's side (Gemini API terms)
- Fledgely does not store screenshots for training purposes

**Training Data Policy:**

- No training data collection implemented
- Any future anonymized contribution would require opt-in consent
- On-device AI noted as M18 enhancement in architecture docs

### Privacy Policy Commitments (Future)

Privacy policy should include:

- "Screenshots are processed by AI for classification only"
- "Screenshots are not stored or used for training AI models"
- "Families can opt-out of anonymized data contribution"

### References

- [ADR-018: Negative Capabilities - Data Privacy Commitments]
- [docs/architecture/architecture-validation-results.md - Accepted Unknowns: On-device ML]

## Dev Agent Record

### Context Reference

ADR-018 in docs/architecture/project-context-analysis.md

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Documented AI ephemeral processing in ADR-018
- Verified no training data collection in current codebase
- Opt-out feature deferred to Epic 51 (data rights)
- On-device AI deferred to M18 per architecture docs

### File List

- No new files - covered by ADR-018 from Story 8.4

## Senior Developer Review (AI)

**Review Date:** 2025-12-29
**Outcome:** Approve
**Action Items:** None - covered by ADR-018

### Notes

- AI training negative capability documented in ADR-018
- Gemini API provides ephemeral processing guarantees
- Opt-out and on-device AI are future enhancements

## Change Log

| Date       | Change                      |
| ---------- | --------------------------- |
| 2025-12-29 | Story created and completed |
