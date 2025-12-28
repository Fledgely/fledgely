# Sprint Change Proposal: Infrastructure & Demonstration Gap

**Date:** 2025-12-28
**Triggered By:** Process review identifying lack of demonstrable progress
**Scope:** Major - Requires new epic and workflow changes

---

## Section 1: Issue Summary

### Problem Statement
Development has completed 7+ epics (60+ stories, 4900+ tests) without producing any running, demonstrable software. All progress exists only as code and passing tests - no deployed environment, no demo videos, no proof the software actually works.

### Evidence
| Metric | Count | Demonstrable? |
|--------|-------|---------------|
| Epics Completed | 7+ (0.5 through 7.5) | No |
| Stories Done | 60+ | No |
| Tests Passing | 4900+ | CI only |
| Firebase Functions | 50+ | Never deployed |
| UI Components | 100+ | Never demonstrated |

### Root Cause
- No deployment infrastructure was established before feature development
- Definition of Done lacked demonstration requirements
- Epic completion had no video/demo artifact requirement

---

## Section 2: Impact Analysis

### Epic Impact
- **Current Epic (7.5):** Can complete, but meaningless without demonstration capability
- **Future Epics (8+):** Should not proceed until infrastructure exists
- **New Epic Required:** Epic 0 - Sprint Infrastructure (BLOCKER)

### Artifact Conflicts
- **PRD:** No changes needed (deployment was implicit assumption)
- **Architecture:** Add deployment configuration documentation
- **Stories:** Add "How to verify" section requirement
- **Epic Template:** Add demo video requirement

### Technical Impact
- Firebase project needed for staging
- CI/CD pipeline needed for deployment
- Android Studio Desktop AVD setup for ChromeOS testing
- Chrome extension developer workflow documentation

---

## Section 3: Recommended Approach

**Selected Path:** Direct Adjustment (Option 1)

### Rationale
- No rollback needed - existing code is fine
- No MVP scope reduction needed - just need execution infrastructure
- Adding infrastructure epic is straightforward
- Low risk, medium effort

### Trade-offs Considered
- Could continue without demos → Rejected (defeats purpose of development)
- Could reduce MVP scope → Not needed, infrastructure is the gap
- Could hire DevOps → Overkill, Firebase deployment is straightforward

---

## Section 4: Detailed Change Proposals

### Change 1: Add Epic 0 - Sprint Infrastructure (BLOCKER)

```yaml
epic-0: in-progress  # BLOCKER - before all other work

stories:
  0-1-local-development-environment:
    - Firebase emulator suite (Auth, Firestore, Functions, Storage)
    - `yarn dev` starts everything for local development
    - README "Getting Started" documentation
    - Acceptance: New developer runs full app locally in <15 minutes

  0-2-firebase-staging-deployment:
    - Firebase project: fledgely-staging
    - Web app deployed to Firebase Hosting
    - All 50+ Cloud Functions deployed
    - Firestore security rules applied
    - Acceptance: https://fledgely-staging.web.app loads and works

  0-3-ci-cd-pipeline:
    - GitHub Actions: Deploy to staging on main branch merge
    - Smoke tests after deployment
    - Notification on deploy success/failure
    - Acceptance: Merge to main → deployed in <10 minutes

  0-4-chromeos-chrome-extension-dev-environment:
    - Chrome browser with Developer Mode for extension testing
    - Android Studio Desktop AVD for Android-on-ChromeOS testing
    - Documented workflows for both
    - Acceptance: Can load extension, test in Desktop AVD

  0-5-android-emulator-environment:
    - Android Studio AVD setup (API 29, 31, 34)
    - ADB debugging configuration
    - MediaProjection permission testing documented
    - Acceptance: Can run and debug Android app in emulator

  0-6-retrospective-demo-artifacts:
    - Demo videos for all completed Epic 0.5-7.5 features
    - Videos saved to /docs/demos/
    - Each epic has proof of working software
    - Acceptance: All 7 completed epics have demo videos

  0-7-show-and-tell-process:
    - Definition of Done updated with demonstration criteria
    - Epic completion requires demo video
    - Process documented and enforced
    - Acceptance: Templates updated, process in place
```

### Change 2: Update Definition of Done

**File:** Update story templates and CLAUDE.md

**OLD:**
```markdown
A story is "done" when:
- [ ] Code complete and reviewed
- [ ] All tests passing
- [ ] No new lint/type errors
```

**NEW:**
```markdown
A story is "done" when:
- [ ] Code complete and reviewed
- [ ] All tests passing
- [ ] No new lint/type errors
- [ ] Feature deployed to staging environment
- [ ] Feature verified working in running application
- [ ] "How to verify" documented in story file
```

### Change 3: Epic Demo Video Requirement

**File:** Update epic retrospective template

**ADD:**
```markdown
## Demo Video Required

When an epic is marked "done":
- [ ] Demo video produced showing all epic features working
- [ ] Video saved to `/docs/demos/epic-X.mp4` (or linked)
- [ ] Video demonstrates real user flows, not just "it compiles"

### Video Guidelines:
- Show the actual UI/app running
- Walk through key user journeys from the epic
- Keep it concise (2-5 minutes typical)
- No need for polish - proof of working software is the goal
```

---

## Section 5: Implementation Handoff

### Scope Classification: **MAJOR**

This is a fundamental process change requiring immediate attention before any further feature development.

### Priority Order

1. **Story 0.2 (Firebase Staging Deployment)** - Get something running FIRST
2. **Story 0.1 (Local Dev Environment)** - Enable local development
3. **Story 0.3 (CI/CD Pipeline)** - Automate deployments
4. **Story 0.6 (Retrospective Demo Artifacts)** - Prove completed work
5. **Stories 0.4, 0.5 (Device Environments)** - Before Epic 9+
6. **Story 0.7 (Process Updates)** - Prevent recurrence

### Handoff

| Role | Responsibility |
|------|----------------|
| Dev | Execute Stories 0.1-0.6 |
| SM | Update templates and process (Story 0.7) |
| All | No feature work until Epic 0 complete |

### Success Criteria

- [ ] https://fledgely-staging.web.app loads and is functional
- [ ] Demo videos exist for Epic 0.5, 1, 2, 3, 3A, 4, 5, 6, 7, 7.5
- [ ] `yarn dev` runs full local environment
- [ ] Merging to main triggers automatic deployment
- [ ] Definition of Done updated in all templates

---

## Approval

**Status:** Pending user approval

To approve this Sprint Change Proposal and begin implementation:
- [ ] User confirms Epic 0 as blocker priority
- [ ] User confirms process changes are acceptable
- [ ] Implementation begins immediately after approval
