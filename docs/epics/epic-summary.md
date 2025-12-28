# Epic Summary

| Phase | Epics | Focus |
|-------|-------|-------|
| Phase 1 | **0.5** + 1-8 + **3A** + **7.5** + **8.5** | **Safe Escape** + Core Foundation + **Shared Custody** + **Child Safety Signal** + **Demo Mode** |
| Phase 2 | 9-19 + **19A-D** | Chromebook & Android + **Quick Status, Child Dashboard, Basic Caregiver** |
| Phase 3 | 20-28 + **27.5** | Dashboard & AI + **Family Health Check-Ins** (Epics 25-26 moved to 19B-C) |
| Phase 4 | 29-38 + **34.5** | Time & Agreements + **Child Voice Escalation** |
| Phase 5 | 39-45 | Extended Family & Platforms (Epic 40 moved to 3A) |
| Phase 6 | 46-52 | Operations & Self-Hosting |

**Total: 52 base epics + 10 sub-epics (0.5, 3A, 7.5, 8.5, 19A-D, 27.5, 34.5) = 62 epics covering all 161 Functional Requirements + safety extensions**

---

## Demonstration Milestones

Each phase ends with a **Show+Tell** milestone - a working demonstration of user value.

| Phase | Demo Epic | Demo Milestone | What We Show |
|-------|-----------|----------------|--------------|
| Phase 1 | Epic 8.5 | **Build Pipeline Works** | CI green, web deploys, extension loads, APK installs |
| Phase 2 | Epic 19 | **Screenshot Capture** | Parent sees child's screenshot in dashboard |
| Phase 3 | Epic 28 | **AI Flag Review** | Parent reviews AI-flagged content with child annotation |
| Phase 4 | Epic 38 | **Trust Progression** | Child earns reduced monitoring through demonstrated trust |
| Phase 5 | Epic 45 | **Multi-Platform Family** | Family with iOS, Android, Fire TV all visible in one dashboard |
| Phase 6 | Epic 52 | **Self-Hosted Complete** | Full self-hosted deployment working on user's GCP |

### Sprint 0 Infrastructure Validation

Before feature development begins, these must pass:

| Story | Validates | Success Criteria |
|-------|-----------|------------------|
| 1.0.1 | Build Pipeline | `yarn build` passes, CI green |
| 1.0.2 | Web Deployment | Staging URL accessible |
| 1.0.3 | Firebase Setup | Emulator runs all services |
| 8.5.7 | Android Build | APK installs and launches |
| 8.5.8 | Extension Build | Extension loads in Chrome |

### Epic-Level Demo Checkpoints

Each epic goal includes demo criteria - what can be shown to stakeholders when complete.

---

## Focus Group Changes Applied:
- ✅ **Epic 3A** - Shared custody safeguards moved to Phase 1 (protections before features)
- ✅ **Epic 19A** - Quick status view added (green/yellow/red for parents & caregivers)
- ✅ **Epic 19B** - Child screenshot view moved from Epic 25 (bilateral transparency from day one)
- ✅ **Epic 19C** - Child agreement view moved from Epic 26 (child sees terms immediately)
- ✅ **Epic 19D** - Basic caregiver status view split from Epic 39 (Grandpa Joe can help sooner)

## Pre-mortem Analysis Additions:
- ✅ **FR7A, FR7B** - Emergency allowlist updates + fuzzy matching (prevents Crisis Bypass)
- ✅ **FR18B** - Forensic watermarking on screenshots (prevents Screenshot Scandal)
- ✅ **FR21A** - Distress classifier SUPPRESSES alerts (prevents Crisis Bypass)
- ✅ **FR27A** - Audit logging before dashboard live (prevents Screenshot Scandal)
- ✅ **FR27B** - Asymmetric viewing detection (prevents Custody Weapon)
- ✅ **FR37A** - Automatic autonomy reduction at 95% trust (prevents Graduation Never Came)
- ✅ **FR38A** - Required graduation conversation at 100% trust (prevents Graduation Never Came)

## War Room (Cross-Functional) Changes Applied:
- ✅ **Epic 3A** - Removed FR139, FR145 (location-based features) - requires device location data not available until Phase 2
- ✅ **Phase 2 Parallel Tracks** - Chromebook (9-12) and Android (14-17) can develop simultaneously
- ✅ **Epic 8.5** - Demo Mode added for early user value before agreement ceremony

## Red Team vs Blue Team Changes Applied:
- ✅ **FR134** - Moved to Epic 8 as security foundation (Ghost Child defense)
- ✅ **FR3A-X** - Screenshot viewing rate alert >50/hour (Angry Divorce defense)
- ✅ **FR19D-X** - Basic caregiver views logged from day one (Caregiver Backdoor defense)
- ✅ **NFR-CR** - Cross-platform crisis allowlist integration tests (Parallel Track defense)

## Family Therapist Changes Applied:
- ✅ **Epic 27.5** - Family Health Check-Ins with repair mechanisms (addresses missing repair concern)

## Domestic Abuse Survivor Changes Applied:
- ✅ **Epic 0.5** - Safe Account Escape path with 72-hour stealth window
- ✅ **Epic 7.5** - Child Safety Signal to external resources (not parents)
- ✅ **FR-SA1** (Epic 3) - Legal parent petition for access via court order
- ✅ **FR-SA2** (Epic 7) - Privacy gaps to mask crisis resource usage patterns
- ✅ **FR-SA3** (Epic 11, 16) - Decoy mode during crisis browsing
- ✅ **FR-SA4** (Epic 2) - Unilateral self-removal for victim escape
- ✅ **Fleeing Mode** (Epic 40, 41) - Instant location feature disable with 72-hour stealth

## Child Rights Advocate Changes Applied:
- ✅ **Epic 37** - Reframed from "Earned Autonomy" to "Developmental Rights Recognition" (language matters)
- ✅ **Epic 34.5** - Child Voice Escalation after 3 rejected requests (mediation resources)
- ✅ **FR-CR4** (Epic 38) - Annual proportionality check prompt

---

<!-- Story details will be added in Step 3 -->
