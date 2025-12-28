# Sprint Change Proposal

**Date:** 2025-12-28
**Requested By:** Cns
**Status:** ✅ APPROVED

---

## 1. Issue Summary

### Problem Statement

The current epic structure begins feature development immediately without validating that the build/deploy infrastructure works. This creates risk that significant development effort could occur before discovering fundamental toolchain issues.

Additionally, there are no explicit "show+tell" demonstration milestones, making progress invisible to stakeholders until features are fully complete.

### Context

- No code exists yet - project is at Phase 3 (Solutioning) complete
- Android build validation doesn't occur until Epic 14 (~40 stories into project)
- Chrome extension build validation doesn't occur until Epic 9 (~25 stories in)
- No demo checkpoints defined across epics

### Evidence

User requirement: "make sure tests, vm, android builds all happen very early, and we've got show+tells in every epic/sprint so we can see the actual progress"

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact | Description |
|------|--------|-------------|
| Epic 1 | ADD | Insert 3 Sprint 0 infrastructure stories (1.0.1-1.0.3) |
| Epic 8.5 | ADD | Insert 2 build verification stories (8.5.7-8.5.8) |
| All Epics | UPDATE | Add demo criteria to each epic goal |
| Epic Summary | ADD | New "Demonstration Milestones" section |

### Story Impact

**New Stories Added:**

| Story ID | Title | Epic |
|----------|-------|------|
| 1.0.1 | Project Scaffolding & CI Pipeline | Epic 1 |
| 1.0.2 | Deployable Web Shell | Epic 1 |
| 1.0.3 | Firebase Project Setup | Epic 1 |
| 8.5.7 | Android APK Build Verification | Epic 8.5 |
| 8.5.8 | Chrome Extension Build Verification | Epic 8.5 |

**Total New Stories:** 5

### Artifact Conflicts

| Artifact | Conflict | Resolution |
|----------|----------|------------|
| PRD | None | No changes needed |
| Architecture | None | No changes needed |
| UX Design | None | No changes needed |
| Sprint Status | Minor | Add new stories to backlog |

### Technical Impact

- CI/CD pipeline established in Sprint 0 (before features)
- Build verification for all platforms by end of Phase 1
- Demo checkpoints create natural integration testing points

---

## 3. Recommended Approach

### Selected Path: Direct Adjustment

Add infrastructure and demo validation without modifying existing features.

### Rationale

1. **Low Risk:** Purely additive changes - no existing plans modified
2. **Low Effort:** 5 new stories + documentation updates
3. **High Value:** Catches toolchain issues before wasting dev effort
4. **No Timeline Impact:** Sprint 0 work happens regardless; this makes it explicit

### Trade-offs Considered

| Alternative | Why Not Selected |
|-------------|------------------|
| Defer build validation to each platform epic | Risk of discovering issues late |
| Add full platform stubs in Phase 1 | Over-engineering; just need build proof |
| Skip demo milestones | Stakeholder visibility is the goal |

---

## 4. Detailed Change Proposals

### 4.1 Epic 1: Add Sprint 0 Stories

**Location:** `docs/epics/epic-list.md` - Epic 1 section

**Insert before Story 1.1:**

```markdown
#### Story 1.0.1: Project Scaffolding & CI Pipeline

**Goal:** Establish working development environment and continuous integration

**Acceptance Criteria:**
- [ ] Nx monorepo initialized from Next.js + Firebase starter template
- [ ] GitHub Actions workflow configured for lint, type-check, test
- [ ] Firebase Emulator Suite configured for local development
- [ ] `yarn build` passes successfully
- [ ] CI pipeline shows green on main branch

**Technical Notes:**
- Use ADR-009 (Nx Monorepo) configuration
- Follow ADR-014 (CI/CD Pipeline) patterns
- No Nx Cloud initially - add when needed

**FR Coverage:** Infrastructure (no specific FR)
**NFR Coverage:** NFR50 (linting), NFR51 (IaC)

---

#### Story 1.0.2: Deployable Web Shell

**Goal:** Prove web deployment pipeline works before building features

**Acceptance Criteria:**
- [ ] Placeholder Next.js app deployed to Firebase Hosting
- [ ] Preview deployments configured for pull requests
- [ ] Staging URL accessible and shows "Fledgely - Coming Soon" page
- [ ] Deployment completes in < 5 minutes

**Technical Notes:**
- Use `firebase init hosting` with Next.js support
- Configure GitHub Actions deploy workflow
- Use Workload Identity Federation (no static keys)

**FR Coverage:** Infrastructure (no specific FR)
**NFR Coverage:** NFR77 (automated rollback capability)

---

#### Story 1.0.3: Firebase Project Setup

**Goal:** Validate Firebase services work together locally and in cloud

**Acceptance Criteria:**
- [ ] Firestore, Auth, Storage, Functions initialized
- [ ] Baseline security rules deployed (deny all by default)
- [ ] Firebase Emulator Suite runs all services
- [ ] Test: Create user, write document, verify in emulator UI
- [ ] Cloud project mirrors emulator configuration

**Technical Notes:**
- Follow SA1 (Security Rules as Code) from architecture
- Security rules in `packages/firebase-rules/`
- Use emulator for all local development

**FR Coverage:** Infrastructure (no specific FR)
**NFR Coverage:** NFR13 (Security Rules), NFR51 (IaC)
```

---

### 4.2 Epic 8.5: Add Build Verification Stories

**Location:** `docs/epics/epic-list.md` - Epic 8.5 section

**Insert after Story 8.5.6:**

```markdown
#### Story 8.5.7: Android APK Build Verification

**Goal:** Prove Android build toolchain works before Epic 14

**Acceptance Criteria:**
- [ ] Android project structure created in `fledgely-android` repo
- [ ] Gradle configured with Firebase SDK dependencies (stubs)
- [ ] Debug APK builds successfully
- [ ] APK installs on Android 10+ device/emulator
- [ ] App launches and displays "Fledgely Agent - Connecting..." placeholder

**Technical Notes:**
- Separate repository per ADR-006 (Hybrid Repository Architecture)
- Minimal app - just proves toolchain works
- Target API 29+ (Android 10+) per NFR37

**FR Coverage:** Infrastructure validation
**NFR Coverage:** NFR37 (Android 10+ support)

**Demo:** Install APK on test device; show app launches

---

#### Story 8.5.8: Chrome Extension Build Verification

**Goal:** Prove Chrome extension build works before Epic 9

**Acceptance Criteria:**
- [ ] Extension manifest (MV3) created in `apps/extension/`
- [ ] Extension builds with `yarn build:extension`
- [ ] Extension loads in Chrome developer mode
- [ ] Browser action icon visible in toolbar
- [ ] Popup shows "Fledgely - Not Connected" placeholder

**Technical Notes:**
- Use Manifest V3 per Chrome MV3 5-minute limit constraint
- Minimal extension - just proves build works
- Part of main monorepo (TypeScript)

**FR Coverage:** Infrastructure validation
**NFR Coverage:** NFR36 (ChromeOS 100+ support)

**Demo:** Load extension in Chrome; show icon and popup
```

---

### 4.3 Epic Summary: Add Demonstration Milestones

**Location:** `docs/epics/epic-summary.md`

**Add new section before "Focus Group Changes Applied":**

```markdown
## Demonstration Milestones

Each phase ends with a "Show+Tell" milestone - a working demonstration of user value.

| Phase | Epic | Demo Milestone | Demonstrates |
|-------|------|----------------|--------------|
| Phase 1 | 8.5 | **Build Pipeline** | Web deploys, extension loads, APK installs |
| Phase 2 | 19 | **Screenshot Capture** | Parent sees child's screenshot in dashboard |
| Phase 3 | 28 | **AI Flag Review** | Parent reviews AI-flagged content with child annotation |
| Phase 4 | 38 | **Trust Progression** | Child earns reduced monitoring through behavior |
| Phase 5 | 45 | **Multi-Platform** | Family with iOS, Android, Fire TV all visible |
| Phase 6 | 52 | **Self-Hosted** | Complete self-hosted deployment working |

### Epic-Level Demo Checkpoints

Each epic goal should include explicit demo criteria:
- What can be shown to stakeholders when this epic is complete?
- What user value is demonstrable?

### Story-Level Progress Markers

Every 3-4 stories within an epic should produce something demonstrable:
- Intermediate demos catch integration issues early
- Progress is visible, not just "in progress"

---

```

---

### 4.4 Sprint Status: Add New Stories

**Location:** `docs/sprint-artifacts/sprint-status.yaml`

**Add to Epic 1 stories:**

```yaml
  story-1-0-1:
    title: "Project Scaffolding & CI Pipeline"
    status: backlog
  story-1-0-2:
    title: "Deployable Web Shell"
    status: backlog
  story-1-0-3:
    title: "Firebase Project Setup"
    status: backlog
```

**Add to Epic 8.5 stories:**

```yaml
  story-8-5-7:
    title: "Android APK Build Verification"
    status: backlog
  story-8-5-8:
    title: "Chrome Extension Build Verification"
    status: backlog
```

---

## 5. Implementation Handoff

### Change Scope Classification: MODERATE

Requires backlog updates and documentation changes, but no architectural modifications.

### Handoff Responsibilities

| Role | Responsibility |
|------|----------------|
| **Scrum Master** | Update sprint-status.yaml with new stories |
| **Dev Team** | Implement Sprint 0 stories first (1.0.1-1.0.3) |
| **Product Owner** | Verify demo milestones align with stakeholder expectations |

### Implementation Sequence

1. **Immediate:** Update `docs/epics/epic-list.md` with new stories
2. **Immediate:** Update `docs/epics/epic-summary.md` with demo milestones
3. **Immediate:** Update `docs/sprint-artifacts/sprint-status.yaml`
4. **Sprint 0:** Implement stories 1.0.1 → 1.0.2 → 1.0.3
5. **End of Phase 1:** Implement stories 8.5.7, 8.5.8

### Success Criteria

- [ ] All 5 new stories added to epic-list.md
- [ ] Demo milestones section added to epic-summary.md
- [ ] Sprint status updated with new stories
- [ ] Story 1.0.1 complete: CI pipeline green
- [ ] Story 1.0.2 complete: Web deploys to staging
- [ ] Story 1.0.3 complete: Firebase emulator runs
- [ ] Story 8.5.7 complete: Android APK installs
- [ ] Story 8.5.8 complete: Chrome extension loads

---

## Approval

**Approved by:** Cns
**Date:** 2025-12-28
**Conditions:** None

---

*Generated by Correct Course workflow*
