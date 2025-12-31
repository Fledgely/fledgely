# Story 20.6: Classification Accuracy Monitoring

Status: deferred

## Story

As **the development team**,
I want **to monitor classification accuracy over time**,
So that **we can ensure 95% accuracy (NFR4)**.

## Acceptance Criteria

1. **AC1: Sample classifications flagged for human review**
   - Given classifications are being performed
   - When monitoring accuracy
   - Then sample of classifications flagged for human review

2. **AC2: Accuracy calculated from reviewed samples**
   - Given classifications have been reviewed
   - When calculating accuracy
   - Then accuracy = correct / total reviewed

3. **AC3: Accuracy dashboard visible to ops team**
   - Given accuracy metrics exist
   - When ops team views dashboard
   - Then accuracy metrics displayed over time

4. **AC4: Alert triggered if accuracy drops below 90%**
   - Given accuracy is being tracked
   - When accuracy drops below 90%
   - Then alert triggered to ops team

5. **AC5: Accuracy tracked per category**
   - Given classifications exist for multiple categories
   - When viewing accuracy
   - Then accuracy shown per category to identify weak areas

6. **AC6: Feedback loop for model improvement**
   - Given incorrect classifications are identified
   - When feedback is collected
   - Then data available for model improvement

## Deferral Notes

This story requires ops infrastructure that is out of scope for the basic classification epic:

- Human review workflow for sampling classifications
- Accuracy calculation and storage
- Dashboard (likely admin web UI or external tool like Retool)
- Alerting infrastructure (PagerDuty, Slack, etc.)
- Feedback collection and aggregation

**Recommendation:** Implement in a future "Ops & Monitoring" epic after basic classification is stable and generating production data.

## Dev Notes

### Dependencies

- Story 20-5 (Classification Metadata Storage) provides the data foundation
- `classificationDebug` collection can be used for review sampling
- `needsReview` flag can be used to prioritize low-confidence classifications

### Suggested Implementation Approach

1. **Sampling**: Use Cloud Scheduler to periodically sample N random completed classifications
2. **Review UI**: Admin page where ops can mark classifications as correct/incorrect
3. **Accuracy Storage**: Firestore collection for accuracy metrics
4. **Dashboard**: Firebase Extensions or external dashboard tool
5. **Alerting**: Cloud Monitoring with Slack/PagerDuty integration

### References

- [Source: docs/epics/epic-list.md#Story 20.6] - Story requirements
- [Source: docs/sprint-artifacts/stories/20-5-classification-metadata-storage.md] - Data foundation

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story deferred - requires ops infrastructure out of scope for MVP classification. Foundation laid by Story 20-5 with debug storage and needsReview flag.
