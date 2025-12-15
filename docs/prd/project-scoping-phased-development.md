# Project Scoping & Phased Development

## MVP Philosophy

**Approach:** Ultra-lean personal validation with full roadmap planned.

Fledgely prioritizes validating the core consent-based model with a single family (the developer's own) before expanding. The full vision is planned and documented, but execution is sequenced to maximize learning while minimizing wasted effort.

**Key Principles:**
- Chromebook-first (sequencing, not scope reduction)
- Self-hosted to own Google Cloud first (sequencing, not scope reduction)
- E2EE deferred until post-SaaS demand emerges
- Full commitment to quality - no shortcuts, no technical debt

## Milestone Overview

Development is organized into 18 milestones across 4 validation gates:

| Gate | Milestones | Purpose |
|------|------------|---------|
| **Personal** | M1-M6 | Validate with own family |
| **Early Adopter** | M7-M9 | Validate with 5-10 trusted families |
| **Community** | M10-M13 | Open source launch |
| **SaaS** | M14-M17 | Business model validation |
| **Future** | M18 | E2EE (demand-driven) |

---

## M1: Foundation (10 phases)

| Phase | Description |
|-------|-------------|
| 1.1 | Firebase project setup (dev environment) |
| 1.2 | Monorepo structure (Turborepo/Nx) |
| 1.3 | TypeScript configuration |
| 1.4 | ESLint/Prettier setup |
| 1.5 | Firebase Auth integration |
| 1.6 | Firestore initial schema |
| 1.7 | CI scaffold (GitHub Actions) |
| 1.8 | VM provisioning for CI runners |
| 1.9 | MV3 screenshot capture spike (PROVE IT EARLY) |
| 1.10 | Firebase Security Rules spike (CRITICAL - security boundary) |

**Exit Criterion:** Can authenticate, store data, CI runs, MV3 spike proven viable.

---

## M2: Core Services (10 phases) - Simplified (E2EE Deferred)

| Phase | Description |
|-------|-------------|
| 2.1 | Firebase Storage architecture |
| 2.2 | Firestore schema design |
| 2.3 | Screenshot metadata structure |
| 2.4 | Retention/TTL deletion logic (7-day default) |
| 2.5 | Firebase Security Rules (CRITICAL - security review required) |
| 2.6 | Storage access patterns |
| 2.7 | Backup strategy |
| 2.8 | Data export capability |
| 2.9 | Core services testing |
| 2.10 | Security rules audit |

**Exit Criterion:** Screenshots stored in Firebase, protected by security rules, auto-deleted after retention period.

**Note:** E2EE deferred to M18. Trust model: Firebase security rules + Google encryption at rest.

---

## M3: Notifications (8 phases)

| Phase | Description |
|-------|-------------|
| 3.1 | FCM project setup |
| 3.2 | Token registration flow |
| 3.3 | Device token management |
| 3.4 | Alert template design |
| 3.5 | Parent notification routing |
| 3.6 | Child notification (age-appropriate) |
| 3.7 | Notification preferences |
| 3.8 | FCM testing & reliability |

**Exit Criterion:** When AI flags content, parent's phone buzzes within 5 minutes.

---

## M4: Chrome Extension (10 phases)

| Phase | Description |
|-------|-------------|
| 4.1 | Manifest V3 structure |
| 4.2 | Service worker setup |
| 4.3 | Screenshot capture (captureVisibleTab) |
| 4.4 | Capture scheduling (Alarms API) |
| 4.5 | Firebase Storage upload |
| 4.6 | Auth integration (Chrome identity API) |
| 4.7 | Options page |
| 4.8 | Crisis allowlist check (pre-capture) |
| 4.9 | Chromebook testing |
| 4.10 | Extension packaging |

**Exit Criterion:** Install on Chromebook → screenshots appear in Firebase → viewable in dashboard.

---

## M5: Parent Dashboard (8 phases)

| Phase | Description |
|-------|-------------|
| 5.1 | Next.js/React setup |
| 5.2 | Firebase Auth integration |
| 5.3 | Screenshot list view |
| 5.4 | Screenshot detail view |
| 5.5 | AI classification display |
| 5.6 | Basic filtering (date, device) |
| 5.7 | Responsive layout |
| 5.8 | Dashboard testing |

**Exit Criterion:** Parent can log in, see today's screenshots, understand AI flags.

---

## M6: AI Pipeline (10 phases)

| Phase | Description |
|-------|-------------|
| 6.1 | Gemini Vision API integration |
| 6.2 | Cloud Function trigger on upload |
| 6.3 | Classification prompt engineering |
| 6.4 | Category taxonomy (homework/leisure/games/concerning) |
| 6.5 | Gemini accuracy baseline testing (PROVE IT EARLY) |
| 6.6 | Confidence threshold tuning |
| 6.7 | Result storage in Firestore |
| 6.8 | Alert trigger logic |
| 6.9 | False positive feedback mechanism |
| 6.10 | AI pipeline testing |

**Exit Criterion:** AI correctly identifies obviously concerning content, <10% false positive rate.

---

## 🚪 PERSONAL GATE (After M6)

**Purpose:** Validate fledgely works for YOUR family.

**Entry Criteria:**
- [ ] Chrome extension captures on Chromebook
- [ ] Screenshots stored in Firebase (protected by security rules)
- [ ] Dashboard shows screenshots
- [ ] AI classification working
- [ ] Alerts delivered to parent
- [ ] Your child has used monitored device for 1+ week

**Go Decision:** All criteria met, family happy, you trust it.

**Critical Stop:** If you don't trust it, don't proceed.

---

## M7: Agreements (6 phases)

| Phase | Description |
|-------|-------------|
| 7.1 | Agreement data model |
| 7.2 | Agreement creation UI |
| 7.3 | Digital signature capture |
| 7.4 | Agreement display (child view) |
| 7.5 | Agreement history |
| 7.6 | Renewal reminders |

---

## M8: Fire TV Agent (8 phases)

| Phase | Description |
|-------|-------------|
| 8.0 | Fire TV Auth research gate (PROVE IT EARLY) |
| 8.1 | Android TV app structure |
| 8.2 | Fire TV-specific adaptations |
| 8.3 | Screenshot capture (non-DRM) |
| 8.4 | DRM content handling (metadata only) |
| 8.5 | Google Auth on Fire TV |
| 8.6 | D-pad navigation |
| 8.7 | Background service |
| 8.8 | Fire TV testing |

---

## M9: Family Management (6 phases)

| Phase | Description |
|-------|-------------|
| 9.1 | Multi-child support |
| 9.2 | Child profile management |
| 9.3 | Device assignment |
| 9.4 | Co-parent invitation |
| 9.5 | Caregiver access (temporary) |
| 9.6 | Family settings |

---

## 🚪 EARLY ADOPTER GATE (After M9)

**Purpose:** Validate with 5-10 trusted families.

**Entry Criteria:**
- [ ] Fire TV working
- [ ] Agreement system functional
- [ ] Multi-child families supported
- [ ] 5-10 families actively using for 2+ weeks
- [ ] Basic documentation exists

**Go Decision:** 80%+ families would recommend, support burden manageable.

**Critical Stop:** If no child in 10 families shows positive engagement, pause and rethink consent model.

---

## M10: iOS App (12 phases)

| Phase | Description |
|-------|-------------|
| 10.1 | SwiftUI app structure |
| 10.2 | Firebase iOS SDK integration |
| 10.3 | Screen Time API integration |
| 10.4 | Usage data collection |
| 10.5 | Push notifications |
| 10.6 | Background refresh |
| 10.7 | Child view |
| 10.8 | Parent view |
| 10.9 | App Store guidelines review |
| 10.10 | App Store assets |
| 10.11 | TestFlight beta |
| 10.12 | App Store submission |

---

## M11: Public Infrastructure (8 phases)

| Phase | Description |
|-------|-------------|
| 11.1 | Production Firebase project |
| 11.2 | Staging environment |
| 11.3 | Monitoring dashboards |
| 11.4 | Alerting setup |
| 11.5 | Rate limiting |
| 11.6 | Backup automation |
| 11.7 | Incident response plan |
| 11.8 | Security audit |

---

## M12: Self-Hosted Deployment (8 phases)

| Phase | Description |
|-------|-------------|
| 12.1 | Terraform modules |
| 12.2 | One-click deployment script |
| 12.3 | Configuration wizard |
| 12.4 | Custom domain support |
| 12.5 | Upgrade path documentation |
| 12.6 | Backup/restore for self-hosted |
| 12.7 | Self-host testing |
| 12.8 | Self-host documentation |

---

## M13: Community & Documentation (10 phases)

| Phase | Description |
|-------|-------------|
| 13.1 | Static website (Firebase Hosting on fledgely.app) |
| 13.2 | User documentation |
| 13.3 | API documentation |
| 13.4 | Contributing guide |
| 13.5 | Crisis allowlist (GitHub Releases - YAML with SHA256) |
| 13.6 | Community Discord/forum |
| 13.7 | GitHub repo polish |
| 13.8 | Launch blog post |
| 13.9 | Accessibility audit |
| 13.10 | i18n foundation |

---

## 🚪 COMMUNITY GATE (After M13)

**Purpose:** Validate open-source sustainability.

**Entry Criteria:**
- [ ] Self-hosted deployment working
- [ ] iOS app approved
- [ ] Public documentation complete
- [ ] 50+ GitHub stars
- [ ] 25+ families self-hosting
- [ ] Zero security incidents

**Go Decision:** Sustainable community, no security issues, iOS approved.

**Critical Stop:** Any data breach = full project pause until resolved.

---

## M14: Advanced Features (10 phases)

| Phase | Description |
|-------|-------------|
| 14.1 | Nintendo Switch integration (direct API) |
| 14.2 | Home Assistant component (optional) |
| 14.3 | Earned autonomy milestones |
| 14.4 | Reverse mode (16+) |
| 14.5 | School calendar integration |
| 14.6 | Mood journal |
| 14.7 | AI conversation starters |
| 14.8 | Advanced analytics |
| 14.9 | Chore/reward integration |
| 14.10 | Notification digest |

---

## M15: SaaS Platform (12 phases)

| Phase | Description |
|-------|-------------|
| 15.1 | Stripe integration |
| 15.2 | Subscription tiers |
| 15.3 | Billing portal |
| 15.4 | Usage metering |
| 15.5 | Trial experience |
| 15.6 | Upgrade/downgrade flows |
| 15.7 | Invoice generation |
| 15.8 | Payment failure handling |
| 15.9 | Legal (Terms, Privacy) |
| 15.10 | Support system |
| 15.11 | SaaS onboarding optimization |
| 15.12 | Churn analysis |

---

## 🚪 SAAS GATE (After M15)

**Purpose:** Validate business model.

**Entry Criteria:**
- [ ] Billing system working
- [ ] 10+ paying customers
- [ ] Support processes defined
- [ ] Legal reviewed
- [ ] Break-even path identified

**Go Decision:** Paying customers, sustainable economics, legal clarity.

**Critical Stop:** If no one pays, stay open-source only.

---

## M16: Scale & Performance (8 phases)

| Phase | Description |
|-------|-------------|
| 16.1 | Load testing |
| 16.2 | Performance optimization |
| 16.3 | CDN integration |
| 16.4 | Database indexing |
| 16.5 | Function optimization |
| 16.6 | Cost optimization |
| 16.7 | Auto-scaling configuration |
| 16.8 | Capacity planning |

---

## M17: Platform Expansion (14 phases)

| Phase | Description |
|-------|-------------|
| 17.1 | Xbox integration research |
| 17.2 | Xbox API integration |
| 17.3 | Xbox testing |
| 17.4 | Android phone/tablet optimization |
| 17.5 | Android sideload distribution |
| 17.6 | Play Store submission |
| 17.7 | Windows agent research |
| 17.8 | Windows agent development |
| 17.9 | Windows agent testing |
| 17.10 | macOS agent research |
| 17.11 | macOS agent development |
| 17.12 | macOS agent testing |
| 17.13 | Cross-platform dashboard enhancements |
| 17.14 | Platform parity audit |

---

## M18: E2EE (Future - Demand-Driven)

**Trigger Criteria:**
- Customer explicitly requests E2EE
- Competitor offers E2EE as differentiator
- Regulatory requirement emerges
- Security incident makes it necessary

| Phase | Description |
|-------|-------------|
| 18.1 | E2EE architecture design |
| 18.2 | Key generation service |
| 18.3 | Key exchange protocol |
| 18.4 | Client encryption libraries (all platforms) |
| 18.5 | Migration strategy for existing data |
| 18.6 | Opt-in mechanism per family |
| 18.7 | Key recovery/escrow options |
| 18.8 | Security audit |
| 18.9 | Gradual rollout |
| 18.10 | Legacy data handling |
| 18.11 | Documentation update |
| 18.12 | E2EE GA release |

---

## Dependency Mapping

**Critical Path (Simplified - No E2EE Bottleneck):**

```
M1 Foundation
    │
    ▼
M2 Firebase Storage + Security Rules (CRITICAL)
    │
    ├───────────────────────┬────────────────────┐
    ▼                       ▼                    ▼
M4 Chrome Ext          M3 Notifications     M5 Dashboard
    │                       │                    │
    └───────────┬───────────┘                    │
                ▼                                │
            M6 AI Pipeline ◄─────────────────────┘
```

**Parallel Work Streams:**

| Stream | Focus | Phases |
|--------|-------|--------|
| **A: Infrastructure** | Backend & DevOps | M1 → M2 → M11 → M12 |
| **B: Chrome** | Primary client | M1.9 → M4 |
| **C: Dashboard** | Parent experience | M1.5 → M5 (can start early) |
| **D: AI** | Classification | M2.3 → M6 |
| **E: Mobile/TV** | Secondary platforms | M4 → M8 → M10 |

**Key Unlock:** Dashboard can start during M2 (not blocked by E2EE).

---

## Risk-Based Prioritization

**"Prove It Early" Items:**

| Risk | Phase | Why Critical | Spike Strategy |
|------|-------|--------------|----------------|
| Firebase Security Rules | M1.10, M2.5 | Now the security boundary | Early audit, test every PR |
| MV3 Screenshot Capture | M1.9 | Chrome may restrict | Minimal POC in Foundation |
| Gemini Accuracy | M6.5 | False positives break trust | Test with real corpus |
| Fire TV OAuth | M8.0 | TV input UX may be terrible | Research gate before build |
| iOS App Store | M10.9 | Apple may reject | Research guidelines early |

**Risk Heatmap:**

```
M1  Foundation     ██░░░░░░░░  LOW (known tech)
M2  Core Services  ████░░░░░░  MEDIUM (security rules critical)
M3  Notifications  ████░░░░░░  MEDIUM (FCM reliability)
M4  Chrome Ext     ██████░░░░  HIGH (MV3 unknowns)
M5  Dashboard      ██░░░░░░░░  LOW (standard web)
M6  AI Pipeline    ██████░░░░  HIGH (accuracy critical)
M7  Agreements     ██░░░░░░░░  LOW (CRUD features)
M8  Fire TV        ████░░░░░░  MEDIUM (TV input UX)
M9  Family Mgmt    ██░░░░░░░░  LOW (standard patterns)
M10 iOS            ██████░░░░  HIGH (App Store risk)
M11 Public Infra   ████░░░░░░  MEDIUM (scale unknowns)
M12 Self-Host      ████░░░░░░  MEDIUM (complexity)
M13 Community      ██░░░░░░░░  LOW (docs/marketing)
M14 Advanced       ████░░░░░░  MEDIUM (integration count)
M15 SaaS           ████████░░  HIGH (billing complexity)
M16 Scale          ██████░░░░  HIGH (unknown load)
M17 Expansion      ██████░░░░  HIGH (new platforms)
M18 E2EE           ████████░░  HIGH (deferred complexity)
```

---

## Validation Metrics

**Personal Gate Metrics:**
- Screenshots captured (total)
- Capture success rate (%)
- Alert delivery time (p50, p95)
- Family sentiment (qualitative)
- Days of continuous use

**Early Adopter Metrics:**
- Families onboarded
- Onboarding completion rate (%)
- Time to first screenshot
- AI false positive rate (%)
- Child engagement score (qualitative)
- Support requests per family
- NPS score

**Community Metrics:**
- GitHub stars
- Forks
- External PRs/issues
- Self-host completions
- Documentation page views
- Discord activity

**SaaS Metrics:**
- MRR
- Paying customers
- Churn rate
- Support hours per customer
- CAC / LTV
- Break-even timeline

---

## Feature Completion Criteria

Each milestone has a clear "done" definition:

| Milestone | Exit Criterion |
|-----------|----------------|
| M1 | Auth works, CI runs, spikes proven |
| M2 | Screenshots stored securely, auto-deleted |
| M3 | Alerts delivered within 5 minutes |
| M4 | Chromebook screenshots flow to dashboard |
| M5 | Parent can view and understand screenshots |
| M6 | AI flags concerning content accurately |
| M7 | Agreements created and signed |
| M8 | Fire TV shows in family dashboard |
| M9 | Multi-child families fully supported |
| M10 | iOS app approved and functional |
| M11 | Production ready for public traffic |
| M12 | Self-host works for technical users |
| M13 | Open source community forming |
| M14 | Advanced features enhance experience |
| M15 | Customers paying, support sustainable |
| M16 | Platform handles growth |
| M17 | All planned platforms supported |
| M18 | E2EE available for families who want it |

---

## Static Website Requirements

**Hosting:** Firebase Hosting (fledgely.app)

**Purpose:**
- Attractive landing page explaining fledgely
- Documentation for all user types
- Self-hosting guides
- Blog/updates
- Community links

**Content Structure:**
```
fledgely.app/
├── / (landing page)
├── /features
├── /docs
│   ├── /getting-started
│   ├── /self-hosting
│   ├── /api
│   └── /contributing
├── /blog
├── /pricing (SaaS tiers)
└── /community
```

**Why Firebase Hosting:**
- Consolidates tooling (already using Firebase)
- Free SSL
- Global CDN
- Easy deployment from CI
