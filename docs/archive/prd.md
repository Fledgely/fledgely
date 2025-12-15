---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
inputDocuments:
  - docs/analysis/research/fledgely-comprehensive-research-2025-12-08.md
  - docs/analysis/research/research_20251208_ai_content_classification_child_safety.md
  - docs/analysis/research/research_20251208_child_digital_safety_regulations.md
  - docs/analysis/research/research_20251208_open_source_parental_control.md
  - docs/analysis/research/research_20251208_parental_control_market_landscape.md
  - docs/analysis/research/research_20251208_privacy_preserving_child_monitoring.md
  - docs/analysis/brainstorming-session-2025-12-08.md
documentCounts:
  briefs: 0
  research: 6
  brainstorming: 1
  projectDocs: 0
workflowType: 'prd'
lastStep: 11
project_name: 'fledgely'
user_name: 'Cns'
date: '2025-12-08'
---

# Product Requirements Document - fledgely

**Author:** Cns
**Date:** 2025-12-08

## Executive Summary

### TLDR

**Problem:** 76% of children give parental control apps 1-star ratings. Current solutions impose static restrictions that damage family trust.

**Solution:** Fledgely is an open-source family digital agreement tool where children actively consent to their own protection. AI-powered content classification distinguishes homework from leisure. Cross-platform visibility across Chromebook, Android, iOS, Fire TV, Nintendo Switch, and Xbox.

**Why Now:** $1.7B market growing to $5.5B by 2032. No open-source competitor exists. COPPA 2025 amendments (effective June 2025) mandate privacy-first approaches that align with our architecture.

**Moat:** Only unified view across all family devices. Platform vendors are structurally prevented from replicating cross-platform visibility.

---

### Vision

Fledgely is an open-source family digital agreement tool built on a radical premise: **supervision through consent, not control**. It's a safety tool, not a policing tool.

**Safe freedom, not a cage.**

Current parental control solutions are universally despised by children - 76% give them 1-star ratings. They impose static rules that restrict freedom without understanding context. Fledgely takes a different approach: dynamic freedom governed by AI-managed family agreements.

**The Core Promise:** Freedom and safety without sitting next to them the entire time.

**When safety and consent conflict, safety wins - but the child is always informed.**

**Success Metric:** Children excited to be protected by it.
- **Measured by:** Child-initiated app store rating >3.5 stars (vs industry average 1.2 stars)
- **Measured by:** Voluntary re-consent rate >80% at 6-month family agreement renewal
- **Measured by:** <5% uninstall rate initiated by children

### Why Consent-Based Design Works

Smart children will always find ways to circumvent imposed controls. Consent-based design is more sustainable than restriction - you can't bypass an agreement you helped create.

For younger children, consent is about participation and family discussion, not legal capacity. We encourage families to have age-appropriate conversations about online safety before setup - the process itself is a trust-building exercise.

**Compliance Note:** Legal consent (COPPA, GDPR) is provided by parents for children under applicable age thresholds. Child participation in the family digital agreement is a product philosophy requirement, not a legal substitute for parental consent.

### What Makes This Special

1. **Dynamic Freedom, Not Static Rules** - Instead of rigid "no YouTube after 7pm" restrictions, fledgely enables family agreements that adapt to context. The AI understands whether a child is doing homework research or browsing for entertainment. AI classification improves over time through family feedback loops - families can review and correct classifications to train their personalized model.

2. **AI-Powered Real-Time Content Analysis** - Screenshots are analyzed by AI to make contextual decisions about content appropriateness, moving beyond simple URL blocking to genuine understanding. Fast real-time classification runs on-device; optional deeper analysis uses cloud processing. Screenshot retention is configurable (default 7 days) and automatically deleted after the retention period. AI classification will produce false positives, especially early on. We accept this trade-off - safety margins matter more than perfect accuracy. Over time, family feedback loops and model improvements will reduce false positives while maintaining safety coverage. When AI flags content, parents receive context, not accusations. Flags are framed as "conversation starters" not evidence of wrongdoing. Children can add context to any flagged item before parents see it.

3. **Consent-Based Design** - Children see the same data parents see. Monitoring is transparent, not surveillance. **Fledgely requires joint parent-child setup as part of the family digital agreement. The device becomes inoperable under fledgely management without the child's active consent and participation.** The child is a participant in their own safety, not a subject of control. Consent is non-negotiable. If a child refuses to participate in the family digital agreement, the device becomes inoperable under fledgely management. We will not compromise this principle for adoption metrics.

4. **Open Source & Privacy-First** - Local-first architecture with E2EE. Self-hostable for families who want complete data sovereignty. No hidden data collection - the code is auditable. Open source builds community and trust; managed SaaS service provides the easy button for families who want it to "just work."

5. **Cross-Platform Aggregate Control** - Single view across Chromebook, Android, iOS, Fire TV, Nintendo Switch, and Xbox. Time and safety managed holistically, not per-device.

### The Path to Independence

Fledgely isn't eternal surveillance - it's training wheels with a clear graduation path.

**Earned Autonomy Milestones** - Restrictions automatically relax as children demonstrate responsible usage over time. Consistent healthy patterns unlock more freedom. The system teaches self-regulation and then trusts children to practice it.

**Parent Compliance** - During family offline time, ALL devices go dark - parents included. Fledgely monitors parent compliance too. Fair is fair. This models the behavior we expect from children and builds trust through shared accountability.

**Reverse Mode at 16** - The power dynamic shifts. Teen becomes the account owner; parents become invited guests who can view data only if the teen chooses to share. Legal guardians retain emergency override capability, but the default is teen autonomy. The goal is proven independence, not eternal monitoring.

### Privacy Architecture

Data is stored locally on each device. Family sync uses E2EE - only family devices can decrypt shared data.

For AI analysis: fast classification runs entirely on-device; optional deeper analysis sends encrypted screenshots to cloud processing where they are analyzed and immediately discarded (not stored). Cloud processing is opt-in and can be disabled for fully local-only operation.

Self-hosted deployments own the entire encryption pipeline - no data ever leaves infrastructure you control.

*Note: This reflects current technology constraints. As on-device AI capabilities improve, we will shift more processing locally.*

### Safety Exceptions

While transparency is core to fledgely, one critical exception exists: **crisis and safety-seeking resources are never logged or visible to parents.** Domestic abuse hotlines, suicide prevention resources, and similar safety-seeking behavior are permanently allowlisted and invisible to monitoring.

Children can see the allowlist upfront - they know exactly which resources are protected. These sites simply don't appear in any activity logs or reports. A child researching how to get help should never fear that research being seen.

### Competitive Moat

Apple Screen Time only sees Apple devices. Google Family Link only sees Android. Fledgely provides the **only unified view across all family devices** - Chromebook, Android, iOS, Fire TV, Nintendo Switch, and Xbox. No single platform vendor can replicate this cross-platform visibility.

## Project Classification

| Attribute | Value |
|-----------|-------|
| **Technical Type** | Multi-platform Consumer App |
| **Domain** | Child Digital Safety |
| **Complexity** | Medium-High |
| **Project Context** | Greenfield - new project |

**Complexity Drivers:**
- Child data privacy regulations (COPPA 2025, GDPR, UK AADC)
- Hybrid AI/ML system (on-device + optional cloud classification) with family feedback loops
- Cross-platform synchronization with E2EE
- Real-time screenshot analysis with configurable retention
- Multiple deployment models (self-hosted + SaaS)
- Platform dependency risk - architecture includes fallback approaches (router-level, DNS-based) for when OS-level integration is restricted

## Success Criteria

### User Success

**For the Child:**
- Feels protected, not policed
- Understands why limits exist (participated in creating them)
- Can see their own data and time remaining
- Trusts that crisis resources are private

**For the Parent:**
- Doesn't have to worry about screens they can't see
- Can reliably count screen time across all devices
- Receives conversation starters, not accusations
- Confidence that homework time is protected

**Root Goals:**
- Parent: Peace of mind without constant vigilance
- Child: Autonomy within safe boundaries
- Family: Shared accountability builds trust

### Business Success

| Milestone | Timeframe | Metric |
|-----------|-----------|--------|
| **Personal validation** | 3 months | Own family using daily |
| **Community traction** | 12 months | GitHub stars, early adopters |
| **Concept proven** | 18 months | Multiple families, documented outcomes |

### Technical Success

- Homework time is fail-safe protected (kids never locked out of schoolwork)
- Async AI processing acceptable (real-time not mandatory for all classifications)
- MVP platforms: Chromebook + Fire TV + Netflix + Nintendo Switch
- Self-hosting = deploy to own Google Cloud account (Terraform/Pulumi one-click)

### Measurable Outcomes

| Metric | Target | Root Goal |
|--------|--------|-----------|
| Child app rating | >3.5 stars | Children feel respected |
| Re-consent rate | >80% at 6-month renewal | Agreement feels fair |
| Child uninstall rate | <5% | Trust maintained |
| Aggregate time accuracy | ±5 minutes/day | Parents can rely on data |
| AI false positive rate | <20% after 30 days | Classification earns trust |
| Offline functionality | 72 hours minimum | Real-world resilience |

## Product Scope

### MVP Platform Coverage

| Platform | Implementation | Failure Resilience |
|----------|----------------|-------------------|
| **Chromebook** | Chrome extension + Android app | Sideload path independent of any store; Android app detects extension tampering |
| **Fire TV** | Sideloaded Android app | ADB fallback; DRM content logs titles only |
| **Netflix** | Via Fire TV + API | Title-based classification when screenshots blocked |
| **Nintendo Switch** | Home Assistant integration | Existing `ha-nintendoparentalcontrols`; accept eventual consistency |

### MVP Core Features

| Feature | Description | Failure Mitigation |
|---------|-------------|-------------------|
| **Screenshot capture** | Configurable intervals, 7-day retention | On-device continues if cloud unavailable |
| **AI classification** | Homework/leisure/games/concerning | On-device sufficient alone; cloud is enhancement |
| **Family digital agreement** | AI-readable document, per-child | Age-appropriate language; visual for young kids |
| **Time tracking** | Aggregate across platforms | Display data freshness; accept eventual consistency |
| **Internet history** | URLs alongside screenshots | Local storage; E2EE sync |
| **Home Assistant** | Dashboard, automation triggers | Local device continues if HA offline |
| **Offline OTP** | TOTP-based unlock | Rate limiting; backup codes at setup |
| **School calendar** | Term/holiday mode switching | Manual fallback; parent override |
| **Mood journal** | Child wellbeing tracking | E2EE; child controls sharing |
| **AI conversation guidance** | Parent discussion starters | Human-reviewed templates; not fully generative |

### MVP Architecture

- E2EE family sync with recovery key at setup
- Hybrid AI: on-device fast + optional cloud deeper
- Multi-child, multi-parent family model (no shared logins)
- Self-hosted: one-click deploy to user's Google Cloud
- QR code device enrollment; existing device approves new

### Reliability Requirements

#### Store Independence
- Chrome extension and Android app must have sideload paths
- Never depend solely on Chrome Web Store or Play Store approval
- Android app manages Chrome extension installation

#### AI Resilience
- On-device model must be sufficient for real-time decisions alone
- Cloud AI is enhancement, not dependency
- Accept 2-3 second latency for on-device classification
- Conservative defaults: allow and flag rather than block and miss

#### Platform Graceful Degradation
- DRM content (Netflix, etc.): log app usage + titles when screenshots blocked
- Nintendo Switch: accept eventual consistency via HA integration
- Sync delays displayed to user ("last synced X minutes ago")

#### Offline Robustness
- 72-hour minimum offline operation with cached rules
- TOTP with 30-second windows; time sync on reconnect
- 3 OTP attempts then increasing cooldown (prevent brute force)
- Backup codes generated at family setup

#### Data Recovery
- E2EE recovery key generated at setup, stored securely by parent
- Conflict resolution: last-write-wins with audit trail
- New device enrollment via QR code approved by existing device

### Critical Failure Chains & Mitigations

| Failure Chain | Risk | Mitigation |
|---------------|------|------------|
| Extension removed → App rejected → No Chromebook monitoring | High | Always maintain sideload path independent of stores |
| Cloud AI down → On-device too slow → Decisions fail | Medium | On-device model must be sufficient alone |
| HA offline → Switch unmonitored → Aggregate time wrong | Low | Accept eventual consistency; display data freshness |
| Child refuses consent → Parent frustrated | Expected | This is by design; provide family discussion resources |

### Growth Features (Post-MVP)

- iOS/Android phone support
- Xbox integration
- Chore reward integration (via Home Assistant)
- Educational content recommendations
- Device health notifications
- Progressive "digital license" (earned autonomy)
- Reverse mode transition at 16

### Risk Contingencies

| Risk | Contingency |
|------|-------------|
| Nintendo Switch API changes | Monitor upstream HA integration; contribute fixes |
| AI accuracy below 80% at launch | Conservative defaults + family training; over-flag rather than under-flag |
| Children refuse consent | Non-negotiable boundary; negotiate scope not principle |
| Self-hosting too complex | One-click deploy; accept technical audience initially |
| Chrome Web Store rejects extension | Sideload via Android app; never depend on store |

## User Journeys

### Journey 1: The Martinez Family - Setting Up Trust Together

**Characters:** Carlos (father, 42), Sofia (mother, 40), Mateo (son, 12), Isabella (daughter, 8)

Carlos and Sofia are exhausted from the daily battle over screen time. Mateo has figured out how to bypass the Samsung parental controls on his tablet, and Isabella has discovered that Netflix on the Fire TV has no limits. Every evening ends in arguments about "just five more minutes" that neither parent can verify.

One Saturday morning, Carlos discovers fledgely through a Home Assistant forum. That afternoon, the family sits down together - not for another lecture, but for something different. Sofia explains that this isn't about control; it's about making a family agreement that everyone helps create.

**The Family Agreement Setup:**
Mateo is skeptical at first - he's seen parental control apps before. But when he realizes he can see exactly the same dashboard his parents see, something shifts. "So I can check my own time?" Carlos nods. They discuss together: homework time is protected, gaming time is earned, and crisis resources are private (Sofia explains what this means gently to both kids).

Isabella doesn't fully understand all the technical details, but she's excited to pick her avatar and feels important being included. The family creates their first agreement together - weekdays have homework priority, weekends are more flexible, and Friday night is "family offline time" where even Mom and Dad's phones go dark.

**The First Week:**
Mateo tests the system immediately, trying to watch YouTube during homework time. The AI flags it but doesn't block - instead, it asks him to classify: "Is this for homework?" He tries lying once, gets caught when the classification is reviewed, and realizes the system isn't about catching him - it's about the agreement they all made. He stops trying to cheat because cheating feels different when you helped write the rules.

**Three Months Later:**
The evening arguments have stopped. Mateo proudly shows his friends his "screen time stats" like a fitness tracker. Isabella asks to add more reading time to her agreement. Carlos and Sofia haven't opened the detailed dashboard in weeks - the weekly summary emails show healthy patterns, and that's enough.

**Six Months - Renewal:**
When the family agreement renewal notification arrives, Mateo negotiates for an extra hour on weekends in exchange for maintaining his homework completion streak. The negotiation itself is a lesson in responsibility and compromise.

---

### Journey 2: Grandma Takes Over - Delegated Access

**Characters:** Elena (grandmother, 68), Mateo (grandson, 12)

Sofia's mother Elena is watching Mateo and Isabella for the weekend while Carlos and Sofia attend a wedding. Elena isn't tech-savvy - she still calls Sofia for help with her iPhone - but she wants to be a good grandma without "ruining the rules."

**Friday Evening - The Handoff:**
Before leaving, Sofia opens the fledgely parent app and shows Elena the "Caregiver Access" feature. She generates a temporary PIN for Elena with specific permissions: Elena can see time remaining, extend time by 30 minutes (once per day), and unlock the "grandma override" for special treats. She cannot change the family agreement or see detailed activity logs.

**Saturday - The Test:**
Mateo finishes his homework early and asks Elena for extra game time. Elena opens the simple caregiver view on her phone - large, clear buttons show: "Mateo: 45 min gaming time remaining." She taps "Extend 30 min" and the system confirms. No need to call Sofia.

Later, Mateo tries "Grandma, can I watch this show?" but the AI has flagged it as age-inappropriate. Elena sees a gentle notification: "This content was flagged. Would you like to review?" She decides to wait for Sofia rather than override - the system supported her in making that choice without making her feel incompetent.

---

### Journey 3: Mateo's Crisis - The Invisible Allowlist

**Characters:** Mateo (12), school counselor situation in background

Mateo has been acting withdrawn for two weeks. He's been dealing with bullying at school that he hasn't told his parents about. Late one night, he searches "how to deal with bullying" and finds resources. Some searches lead to concerning content about self-harm.

**The Search:**
Mateo types into his Chromebook: "I feel like no one understands." The AI classifies this as a potential crisis search. Instead of logging it or alerting his parents, the system quietly redirects him to kid-friendly mental health resources. A gentle message appears: "It sounds like you're going through something hard. Here are some people who can help - and this is just between us."

He clicks through to a youth crisis text line. The conversation happens. He doesn't tell his parents yet, but he talks to someone. The next day, he feels slightly better.

**What Parents Don't See:**
In the weekly summary, Carlos and Sofia see normal activity. There's no record of the crisis searches, no flags, nothing to indicate what Mateo went through. This is by design.

**What Mateo Knows:**
During the family setup, Sofia had shown both kids the "always private" list. Mateo remembered: crisis lines, mental health resources, abuse hotlines - these never appear in any logs. He trusted that promise, and it helped him seek help.

---

### Journey 4: Carlos Sets Up Self-Hosting - Technical Parent

**Characters:** Carlos (father, 42, software engineer)

Carlos doesn't trust cloud services with his family's data. He already runs Home Assistant on a Raspberry Pi for smart home automation, and he wants fledgely to be part of that ecosystem.

**The Setup:**
Carlos clones the fledgely repository on a Saturday morning. The documentation points him to a Terraform module for Google Cloud deployment. He creates a new Google Cloud project for his family ("martinez-family-fledgely"), runs `terraform apply`, and watches the serverless infrastructure spin up in his own account.

The setup wizard walks him through:
1. Creating the family encryption keys (recovery key saved to his password manager)
2. Connecting to his Home Assistant instance (OAuth flow)
3. Inviting Sofia as a co-parent (she accepts from her phone)

**The Integration Magic:**
Carlos creates a Home Assistant automation: when fledgely reports "family offline time started," all smart speakers play a 5-minute warning sound, then the TV turns off automatically. Another automation: when Mateo's homework time starts, his desk lamp turns on.

---

### Journey 5: Lucia's First Day - Non-Technical Parent

**Characters:** Lucia (mother, 35, marketing manager), Diego (son, 9)

Lucia heard about fledgely from her neighbor and wants the benefits without the technical complexity. She doesn't know what "self-hosting" means and doesn't want to.

**The SaaS Onboarding:**
Lucia downloads the fledgely app from the Play Store. The setup takes 10 minutes:
1. Create account (email + password)
2. Add Diego as a child (name, age, profile photo)
3. Diego's device enrollment: she opens the Chromebook, scans a QR code from her phone, and Diego taps "I agree to the family agreement" on his screen
4. Default agreement suggested based on Diego's age - she reviews and accepts with minor tweaks

**The "It Just Works" Experience:**
Lucia doesn't configure Home Assistant. She doesn't write automation rules. She checks the app once a day, sees the traffic-light summary (green = all good), and moves on with her life.

---

### Journey 6: Mateo Turns 16 - The Transition to Autonomy

**Characters:** Mateo (now 16), Carlos, Sofia

Four years have passed. Mateo has demonstrated consistent responsible usage. His "earned autonomy" milestones have gradually relaxed restrictions.

**The Notification:**
On Mateo's 16th birthday, both he and his parents receive a notification: "Mateo is now eligible for Reverse Mode. This transfers account ownership to Mateo, with parents as invited viewers."

**The Family Conversation:**
Mateo chooses to keep sharing his time summary with his parents - he's proud of his habits. He stops sharing the detailed activity log. His parents accept this.

**The New Dynamic:**
Mateo now manages his own screen time, his own agreements, his own limits. He's internalized the self-regulation skills fledgely helped him develop.

---

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---------|--------------------------|
| **Martinez Family Setup** | Family onboarding, shared dashboards, AI classification, family agreement, weekly summaries, family offline mode |
| **Grandma Delegated Access** | Caregiver PINs, trust tiers, simple caregiver UI, time extension workflow, audit logging |
| **Mateo's Crisis** | Crisis allowlist, AI crisis detection, gentle redirects, privacy preservation, child-visible allowlist |
| **Carlos Self-Hosting** | Terraform deployment, E2EE key management, Home Assistant integration, open APIs |
| **Lucia SaaS** | App store distribution, QR enrollment, default agreements, minimal dashboard, subscription billing |
| **Mateo at 16** | Earned autonomy, reverse mode, ownership transfer, selective sharing, graduation path |

---

## Edge Cases & Special Scenarios

### Divorced Parents - Shared Custody

**Approach:** Unified agreement (primary), location-based rules (fallback)

Both parents must agree on a single family agreement. If parents cannot agree, system offers location-based rules as compromise. Safety settings (crisis allowlist, age restrictions) always require both parents regardless of approach.

### Neurodivergent Children

**Accommodations:**
- Extended countdown warnings (30 min → 15 min → 5 min → 2 min)
- Flexible "focus mode" for hyperfocus patterns
- Custom activity categories per child
- AI pattern learning per individual child
- Transition support features

### Shared Device, Multiple Children

**Approach:** Device profiles per child
- Multi-profile single device support
- Child profile switching with PIN
- Per-profile content filtering and time tracking
- Individual time allocations on shared device

### Blended Families

**Permission Levels:**
- Primary Parent: Full control
- Co-Parent: Full control, agreement changes require primary approval
- Trusted Adult: Caregiver-level plus full activity view

### Working Teens

**Work Mode Features:**
- Specific apps unrestricted during configured hours
- Schedule import from calendar
- Location-aware work mode activation
- Work app allowlist (games still restricted)

### Technical Bypass Attempts

**Philosophy:** Transparency defeats manipulation
- VPN/proxy detection with transparent logging
- Unclassifiable traffic visible to child and parent
- Bypass framed as agreement violation, not crime
- Can't win arms race; design for conversation

---

## Journey Failure Modes & Recovery

### Setup & Onboarding Failures

| Failure | Recovery |
|---------|----------|
| Child refuses consent | Pre-setup family discussion guide; device inoperable is by design |
| Parents disagree on rules | Co-parent agreement required first; mediation prompts |
| QR enrollment fails | Manual code entry fallback; longer expiration |

### Classification & AI Failures

| Failure | Recovery |
|---------|----------|
| AI misclassifies homework | Quick correction mechanism; family feedback loop; apology messaging |
| Crisis resource not on allowlist | AI detection adds dynamically; conservative approach to privacy |

### Delegated Access Failures

| Failure | Recovery |
|---------|----------|
| Caregiver loses PIN | PIN recovery via parent; backup contact |
| Child manipulates caregiver | Override confirmation prompt; differs-from-usual warning |
| PIN shared with child | PIN only works from registered caregiver device |

### Critical Recovery Principles

1. **Never lock out homework** - Educational access preserved in every failure mode
2. **Graceful degradation** - Partial function beats total failure
3. **Trust repair** - Acknowledge failures; apologize when system is wrong
4. **Human escalation** - Every automated failure has human override path
5. **Transparency** - Tell users when something went wrong and why

---

## Adversarial User Considerations

### Design Principles

1. **Transparency defeats manipulation** - Child sees same data as parent
2. **Bypass visibility > bypass prevention** - Log what you can't block
3. **Consent makes bypass feel like betrayal** - Can't outsmart an agreement you created
4. **Legitimate privacy is not adversarial** - Respect real privacy needs
5. **Technical arms race is unwinnable** - Design for conversation, not control

### Adversary Response Matrix

| Adversary Type | System Response |
|----------------|-----------------|
| Technical bypass (VPN, etc.) | Detect and log transparently; unclassifiable traffic visible to all |
| Social engineering | Same data visible to all parties; manipulation claims verifiable |
| Loophole exploitation | AI pattern detection; anomalies surfaced for family discussion |
| Legitimate privacy seeking | Generous allowlist; health, identity, crisis resources protected |
| Hostile non-compliance | Device inoperable without consent; this is by design |
| Accidental violations | Pattern vs accident distinction; mercy for mistakes |

---

## Accessibility Requirements

**WCAG 2.2 Target:** Level AA (Level AAA aspirational for child-facing features)

### By Category

| Category | Requirements |
|----------|--------------|
| **Visual** | Screen reader support, AI screenshot descriptions, manual QR alternative, large display mode, high contrast theme, color-blind safe (shape + color) |
| **Motor** | No timed interactions, single-tap alternatives, logical focus order, voice control support, skip navigation |
| **Hearing** | Visual/haptic notification alternatives, distinct vibration patterns, caption analysis in AI, text-based support |
| **Cognitive** | Simple language mode, dyslexia-friendly fonts, natural language time display, extended warnings, calm mode, visual agreements |

### Additional Accessible Journeys

| User Type | Key Accommodation |
|-----------|-------------------|
| Blind Parent | AI-generated screenshot descriptions |
| Switch User | No timeouts, scannable interface |
| Deaf Parent | Visual alerts, caption-aware AI |
| Autistic Child | Extended warnings, advance rule change notice |
| Dyslexic Child | Simple language, icon-primary UI |
| Intellectual Disability | Picture-based agreement, visual-only feedback |

### Key Principles

- Multi-modal everything (visual + audio + haptic)
- Never use color alone to convey information
- Adaptive consent process for cognitive level
- Predictability reduces distress
- Simple is accessible

## Domain-Specific Requirements

### Child Digital Safety - Regulatory Overview

Fledgely operates in a highly regulated space intersecting child privacy (COPPA, GDPR), age-appropriate design (UK AADC), and monitoring software ethics (stalkerware differentiation). The self-hosted model elegantly sidesteps many regulatory concerns by keeping data under family control.

### Regulatory Compliance Matrix

| Regulation | Applicability | Fledgely Approach |
|------------|---------------|-------------------|
| **COPPA 2025 (US)** | Children under 13 | Parents authenticate and setup; self-hosted = no data collection by fledgely |
| **GDPR (EU)** | EU users | E2EE; data minimization; right to deletion; parental consent |
| **UK AADC** | UK users (primary market) | Transparency-first design exceeds requirements; high privacy defaults |
| **State privacy laws** | California, etc. | Covered by GDPR-level compliance |

### Age Range & Consent Framework

| Aspect | Approach |
|--------|----------|
| **Target age range** | 3-18 years |
| **Legal consent** | Parent provides for all children |
| **Philosophical consent** | Child participates regardless of age (product philosophy) |
| **Reverse mode** | Age 16 with parental override capability |
| **Data at 18** | Immediately deleted; clean transition to adulthood |

### Stalkerware Differentiation

Fledgely must clearly differentiate from stalkerware used for covert surveillance and abuse.

| Stalkerware Characteristic | Fledgely Approach |
|----------------------------|-------------------|
| Hidden/discrete operation | Visible presence; child sees monitoring clearly |
| Victim unaware | Child sees same data as parent |
| No consent mechanism | Active child participation required |
| Used against adults | Designed for minors; adult detection not in scope |
| Facilitates abuse | Law enforcement cooperation; account termination for abuse |

**Abuse Response:**
- Self-hosted: Support local authorities as required
- SaaS: Respond to authorities, terminate accounts, preserve and hand over evidence

### Data Handling Requirements

| Data Type | Retention | Access | Deletion |
|-----------|-----------|--------|----------|
| **Screenshots** | 7 days configurable | Family members with E2EE | Auto-delete after retention period |
| **Activity logs** | Configurable | Family dashboard | On request or account closure |
| **AI classifications** | With associated screenshot | Family dashboard | With screenshot deletion |
| **Family agreement** | Active while enrolled | Family members | On account closure |

**Key Policies:**
- No easy export of screenshots (prevents evidence gathering for inappropriate purposes)
- Data follows parental responsibility (court determines access)
- Immediate deletion when child turns 18 or leaves family
- Right to be forgotten honored

### AI & Data Training

| Aspect | Approach |
|--------|----------|
| **Personalized model** | Per-family, trained on their feedback |
| **Global model** | Fed by anonymized behavioral telemetry |
| **What's shared** | Behavioral traits, parental responses - never child identity |
| **Self-hosted** | Optional participation; can download global model improvements |

### Cross-Border & Data Residency

| Aspect | Approach |
|--------|----------|
| **Data hosting** | US-based infrastructure |
| **Transport security** | All traffic over HTTPS |
| **Jurisdiction awareness** | App defaults based on user jurisdiction (e.g., UK AADC defaults for UK users) |
| **Multi-jurisdiction families** | Parents with responsibility can customize; defaults are starting point |

### UK AADC Alignment

| AADC Standard | Fledgely Compliance |
|---------------|---------------------|
| Best interests of child | Core philosophy: safety through consent |
| Age-appropriate application | Age-specific defaults; visual agreements for young children |
| Transparency | Child sees same data as parent - exceeds requirement |
| Detrimental use of data | No selling/sharing; family use only |
| Default settings | High privacy; conservative AI by default |
| Data minimization | Collect only what's needed; configurable retention |
| Parental controls | This IS the parental control - transparent to child |
| Profiling | Classification for safety, not advertising |
| Nudge techniques | No dark patterns; no manipulation |

### Abuse Prevention & Safety Architecture

**Design Principles:**
1. Transparency is protection - Child seeing everything limits covert abuse
2. Crisis resources are sacred - Never compromise invisibility of help-seeking
3. Periodic re-consent creates exit points - 6-month renewals are safety windows
4. No institutional access - Family tool, not surveillance infrastructure
5. Strong authentication - Account compromise enables predation

**Abuse Scenario Mitigations:**

| Abuse Type | Mitigation |
|------------|------------|
| **Controlling parent** | Crisis resources invisible; child empowerment through visibility |
| **Adult enrolled as "child"** | Maximum visibility; periodic re-consent; AI adult-pattern detection |
| **Divorced parent surveillance** | Co-parent verification; custody declaration at setup |
| **Employer monitoring** | Terms prohibition; personal email verification; MDM detection |
| **Predator with parent access** | MFA required; login alerts to all family; access audit log |
| **Sibling harassment** | Strict sibling data isolation; private flag option |
| **School overreach** | No institutional accounts; family-only architecture |
| **Self-harm facilitation** | Redirect to help resources; opt-in "tell my parent" option |

**Security Requirements:**
- MFA required for parent accounts
- Login alerts sent to all family members
- "Who viewed what when" audit visible to all family
- New device/location notifications
- Child notified when parent accesses detailed data

### Regulatory Risk & Contingency Planning

**Scenario Decisions:**

| Scenario | Decision | Implementation |
|----------|----------|----------------|
| **EU AI Act** | Human-in-loop positioning | AI is "recommendation only"; parent makes all decisions |
| **App Store Ban** | Differentiation campaign | Proactively demonstrate consent mechanisms |
| **Screenshot Ban** | Child-initiated sharing | Child chooses to share screenshots with parent |
| **AI Discrimination** | Family override primacy | Parent correction always wins; AI learns from family |

**Regulatory Preparedness:**

| Risk | Status | Action |
|------|--------|--------|
| COPPA age extension | ✅ Ready | Already compliant |
| EU AI Act high-risk | ⚠️ Partial | Document human-in-loop design |
| App store ban | ⚠️ Partial | Prepare differentiation documentation |
| AADC enforcement | ✅ Ready | Formal compliance documentation |
| Screenshot jurisdiction ban | ⚠️ Planned | Build child-initiated sharing mode |
| AI bias claims | ⚠️ Partial | Family-first training |
| Data breach | ⚠️ Planned | Incident response plan needed |

### Special Scenario Handling

**Core Principle:** Anyone with parental responsibility can be a parent (includes state, foster carers, legal guardians).

| Scenario | Approach |
|----------|----------|
| **Child in care** | Anyone with parental responsibility can be parent |
| **Gillick competence** | Parental discretion; parents judge readiness |
| **Trans child/deadnaming** | No real name requirement; any display name acceptable |
| **Multiple families** | Anyone with parental responsibility can be parent |
| **Child influencer** | Same rules apply; these children need protection too |
| **Court supervision** | Not for this purpose; family tool only |
| **Homeschooled** | Encourage routine and schedules |
| **Assistive technology** | No behavior change; treat same as any user |

### Regulatory Defense Framework

**Position Documentation for Regulatory Inquiry:**

| Challenge | Defense Position |
|-----------|------------------|
| **Self-hosted COPPA** | Fledgely collects app telemetry, not child data. Child data stays on family infrastructure. |
| **Child transparency** | Children see data they created. Comprehension validated through user testing. |
| **Crisis invisibility** | Strict allowlist excluded from logging. Visual indicator shows when not tracked. |
| **E2EE claims** | Cloud vendor provides keys. Fledgely architecturally cut out. |
| **Parental consent scope** | Tool facilitates parenting, not enforcement. Family tool, not police. |
| **AI as recommendation** | Will get things wrong. Commit to owning mistakes transparently and iterating. |
| **Consent legitimacy** | Responsible supervision with child autonomy. Transparency is differentiator. |
| **Anonymized telemetry** | Accepted as personal data. Covered by parental consent. |

**Proactive Compliance Actions:**
- Document architectural separation from child data
- User test transparency with children
- Implement visual "not tracking" indicator
- Document key management architecture
- Clear consent flow with scope explanation
- Public changelog for AI improvements

## Innovation Focus

### Core Innovation Areas

Fledgely introduces five distinct innovations to the parental control market:

#### 1. Consent-Based Monitoring Model

**The Innovation:** Device becomes inoperable under fledgely management without child's active consent and participation. Child sees same data as parent.

**Why It's New:** Every competitor imposes control. Fledgely requires buy-in. Smart children can circumvent imposed controls - they can't circumvent an agreement they helped create.

**Market Validation:** 76% of children rate parental control apps 1 star. The "imposed control" model is failing.

**Risk & Mitigation:** Critics argue child consent is coerced. Defense: It's part of a wider picture of consent formed in the family with the family digital agreement. The alternative is 100% parent supervision which may be more overbearing than the software.

#### 2. Bidirectional Transparency

**The Innovation:** Child sees exact same data as parent (except blocked content history). Parent compliance during "family offline time." Accountability flows both ways.

**Why It's New:** Every competitor creates information asymmetry (parent sees all, child sees nothing). Fledgely democratizes the data.

**Market Validation:** Zero competitors offer this. Creates trust through transparency.

**Risk & Mitigation:** Critics argue children can't handle the data. Defense: Children can comprehend data they created - we will validate through user testing.

#### 3. Cross-Platform Aggregate View

**The Innovation:** Single dashboard showing screen time across Chromebook, Fire TV, Nintendo Switch, iOS, Android, Xbox. Time limits apply across all devices, not per-device.

**Why It's Defensible:** Apple only sees Apple devices. Google only sees Android. No platform vendor can replicate cross-platform visibility - they're structurally prevented by competitive dynamics.

**Market Validation:** Every parent with multiple device types is underserved. Current "solution" is multiple apps that don't talk to each other.

**Risk & Mitigation:** If genuine competition emerges from Google/Apple, position for acquisition or manage existing user base into graceful decline.

#### 4. Crisis Resource Invisibility

**The Innovation:** Domestic abuse hotlines, suicide prevention, mental health resources are permanently allowlisted and invisible to parents. Children know the allowlist upfront. Visual indicator shows when user is not being tracked.

**Why It's New:** No competitor protects help-seeking behavior. Most explicitly log "concerning searches" - creating exactly the barrier that prevents children from seeking help.

**Market Validation:** Child safety experts consistently recommend this approach. Current tools fail this test.

**Risk & Mitigation:** Concerns about encouraging self-harm. Defense: Child is encouraged to talk to parents about what they're looking at, with guidance on how to talk to parents about it. Crisis material never encourages self-harm - it redirects to professional help.

#### 5. Open Source Parental Control

**The Innovation:** Fully auditable codebase. Self-hostable to own Google Cloud account. No data ever touches fledgely infrastructure in self-hosted mode.

**Why It's New:** Zero open-source competitors in this space. Every alternative requires trusting a company with your family's data.

**Market Validation:** Privacy-conscious technical parents are completely underserved.

**Risk & Mitigation:** Critics argue 99% won't audit. Defense: Yes, but they benefit from the 1% that do. Open source builds trust even for those who never read the code.

---

### Innovation Diffusion Analysis

#### Adoption Curve

| Adopter Stage | Profile | Trigger | Messaging |
|---------------|---------|---------|-----------|
| **Innovators** (2.5%) | Self-hosting tech parents, Home Assistant users, privacy advocates | GitHub stars, Hacker News, open source communities | "Finally, parental controls you can audit" |
| **Early Adopters** (13.5%) | Tech-literate parents frustrated by existing options, families with consent values | Word of mouth from innovators, tech parent blogs | "Screen time without the screaming matches" |
| **Early Majority** (34%) | Mainstream parents struggling with multi-device chaos | Simplified SaaS, app store reviews, school recommendations | "One dashboard for all your family's screens" |
| **Late Majority** (34%) | Risk-averse parents needing social proof | Mass market awareness, "everyone's using it" | "Join 100,000 families who chose trust over control" |
| **Laggards** (16%) | Tech-resistant, prefer analog solutions | Not primary target | Minimal investment |

#### Chasm Crossing Strategy

**The Chasm:** Between Early Adopters (consent-conscious tech parents) and Early Majority (busy parents who just want it to work).

**Bowling Pin Strategy:**
1. **Pin 1:** Self-hosting Home Assistant users → Establish credibility
2. **Pin 2:** Tech parent communities (Hacker News, Reddit r/parenting) → Build advocacy
3. **Pin 3:** Privacy-conscious mainstream parents → Bridge to majority
4. **Pin 4:** Multi-device struggling parents → Mass market entry

**Whole Product Requirements for Early Majority:**
- 10-minute setup (achieved via SaaS)
- Mobile-first parent dashboard
- "Green light = all good" simplicity
- Responsive support
- School calendar integration

---

### Technology Horizon & Future-Proofing

#### Near-Term (0-2 years)

| Trend | Impact | Fledgely Response |
|-------|--------|-------------------|
| **On-device AI maturation** | Less cloud dependency needed | Architecture already supports; accelerate on-device roadmap |
| **Chrome Manifest V3** | Extension capability restrictions | Monitor impact; maintain Android app as primary |
| **Platform parental control improvements** | Competitive pressure | Emphasize cross-platform gap they can't close |

#### Medium-Term (2-5 years)

| Trend | Impact | Fledgely Response |
|-------|--------|-------------------|
| **AI agents for children** | New supervision challenge | Agent activity monitoring; "what did the AI help with?" |
| **VR/AR mainstream adoption** | New device category | Extend platform model; spatial computing monitoring |
| **EU Digital Services Act effects** | Platform interoperability mandates | May enable deeper integration; prepare APIs |
| **Wearables for children** | Health + activity data convergence | Consider wellness integration if demand emerges |

#### Long-Term (5-10 years)

| Trend | Impact | Fledgely Response |
|-------|--------|-------------------|
| **Brain-computer interfaces** | Fundamental privacy questions | Philosophy applies; consent + transparency scale |
| **Ambient computing** | "Screen time" becomes obsolete | Evolve to "digital engagement time" metric |
| **AI tutors/companions** | Children spend more time with AI | Supervision extends to AI relationship health |
| **Post-screen interfaces** | Unknown form factors | Principles (consent, transparency) are platform-agnostic |

#### Future-Proofing Principles

1. **Philosophy over technology** - Consent and transparency principles apply regardless of interface
2. **API-first architecture** - New platforms integrate via standard APIs
3. **On-device preference** - Reduce cloud dependency as local AI improves
4. **Community-driven expansion** - Open source community will identify new platforms before we do
5. **Graceful degradation** - New platforms start with limited features, expand over time

---

### Adjacent Innovation Opportunities

#### Fledge Compact (Priority 1 - Free Onramp)

**Product:** Standalone family digital agreement builder - no monitoring required.

**Value Proposition:** Demonstrates consent philosophy before commitment to monitoring. Families create, sign, and review digital agreements together.

**Business Model:**
- Free core service (onramp to fledgely)
- Premium templates and mediation resources
- Natural upsell: "Want to implement this agreement? Try fledgely"

**Why It Works:** Many families want structure without surveillance. Validates philosophy at zero cost.

#### Fledge Focus (Priority 2 - Self-Regulation)

**Product:** Consent-based screen time management for neurodivergent users (teens/adults with ADHD).

**Value Proposition:** Self-installed, self-configured, optional accountability partner. Same transparency model, no "parent" required.

**Market:** 10M+ adults diagnosed ADHD in US alone. Underserved by existing tools designed for children.

**Technical Path:** Same codebase, different positioning and onboarding.

#### Fledge Care (Priority 3 - Elder Care)

**Product:** Consent-based digital safety for seniors.

**Value Proposition:** Detects phishing, scam calls, unusual financial activity. Senior sees same data as adult children. Respects autonomy while providing safety net.

**Why It Works:** Same "supervision through consent" philosophy. Avoids infantilizing elders. Growing demand as population ages.

#### Fledge Insights (Priority 4 - Therapy Integration)

**Product:** API for family therapists to access shared family data with permission.

**Value Proposition:** Neutral ground for screen time discussions. Objective data replaces "he said/she said." Guided conversation frameworks for sessions.

**Technical Path:** API-first implementation. Low development cost.

#### Fledge Research (Priority 5 - Academic Partnerships)

**Product:** Opt-in anonymized behavioral data for child development research.

**Value Proposition:** Real behavioral data (not self-reported). Families contribute to science and receive research insights.

**Alignment:** Open source ethos; community contribution to knowledge.

---

### Innovation Defense Framework

#### Contrarian Challenge Responses

| Challenge | Defense |
|-----------|---------|
| **"Consent is theater - children can't say no"** | It's part of a wider picture of consent formed in the family digital agreement. Participation is meaningful even if not legally binding. |
| **"Transparency creates anxiety"** | Alternative is 100% parent supervision which may be more overbearing than software can be. Transparency builds trust. |
| **"Big tech will copy you"** | If genuine competition emerges, position for acquisition. Cross-platform gap is structural - they're prevented by competitive dynamics. |
| **"Crisis invisibility enables harm"** | Child is encouraged to talk to parents with guidance on how. Crisis material redirects to help, never encourages harm. |
| **"Open source means no one audits"** | 99% won't audit, but benefit from the 1% that do. Trust scales from auditable code. |
| **"Children don't want this"** | Children excited for the autonomy this gives within the constraints of the same family digital agreement they helped create. |

#### Competitive Response Playbook

| Competitor Move | Fledgely Response |
|-----------------|-------------------|
| Apple/Google improve native controls | Emphasize cross-platform gap; publish comparison |
| Competitor copies consent model | Welcome validation; emphasize open source trust |
| Price war from funded competitor | Open source can't be undercut; community sustains |
| Acquisition attempt | Evaluate based on philosophy preservation |
| Platform blocks extension/app | Sideload paths always maintained; never depend on stores |

---

### Innovation Metrics

| Metric | Target | Measures |
|--------|--------|----------|
| **Child consent rate** | >95% complete setup | Consent model validity |
| **Re-consent at renewal** | >80% | Agreement fairness |
| **Child app rating** | >3.5 stars | Children value product |
| **Self-host adoption** | >20% of users | Privacy positioning resonates |
| **Cross-platform coverage** | >2 device types per family | Aggregate value delivered |
| **Crisis resource usage** | Privacy preserved (unmeasured) | Safety net working |
| **GitHub stars** | Top 3 in category | Community validation |

## Multi-Platform Consumer App - Technical Requirements

### Platform Implementation Strategy

| Platform | Technology | Rationale |
|----------|------------|-----------|
| **Chrome Extension** | Manifest V3 (TypeScript) | Future-proof; avoid migration pain |
| **Android (phones/tablets)** | Native Kotlin | Best platform integration; performance |
| **Fire TV** | Native Kotlin (shared codebase with Android) | Reuse Android components |
| **iOS** | Native Swift | Platform-specific quality; no cross-platform compromise |
| **Nintendo Switch** | Direct API integration | Code adapted from ha-nintendoparentalcontrols |

### Firebase-Centric Architecture

**Philosophy:** Fledgely is an orchestration layer over Firebase services. Firebase handles the heavy lifting.

| Capability | Firebase Service | Fledgely Role |
|------------|------------------|---------------|
| **Authentication** | Firebase Auth (Google Sign-In) | UI wrapper; family account linking |
| **Real-time sync** | Firestore + WebSocket listeners | Data model design; conflict resolution rules |
| **Screenshot storage** | Cloud Storage for Firebase | Encryption wrapper; retention enforcement |
| **AI classification** | Cloud Functions + Vertex AI | Model deployment; on-device fallback |
| **Push notifications** | Firebase Cloud Messaging | Alert templates; family routing logic |
| **Analytics** | Firebase Analytics | Privacy-safe event design |
| **Crash reporting** | Firebase Crashlytics | Platform-specific integration |

**Self-Hosted Variant:** Same architecture, deployed to user's own Google Cloud project via Terraform. Firebase project created in their account.

### Authentication Architecture

**Philosophy:** Fledgely delegates ALL authentication to Google Accounts. No passwords, MFA, or auth logic in fledgely itself.

| Security Layer | Who Provides | Fledgely Role |
|----------------|--------------|---------------|
| **Password/credential** | Google | None - delegated |
| **MFA** | Google | Encourage parent to enable; detect if enabled |
| **Session management** | Firebase Auth | Token refresh only |
| **Account recovery** | Google | None - delegated |

**Parent MFA Encouragement:**
- During setup: "For your family's security, we recommend enabling 2-Step Verification on your Google Account"
- Link directly to Google's MFA setup page
- Optionally detect MFA status via Google API and show security score
- Surface in audit log: "Action from MFA-protected account" vs "Action from account without MFA"

### Device Permissions Matrix

| Permission | Android | Chrome Extension | iOS | Justification |
|------------|---------|------------------|-----|---------------|
| **Screenshot capture** | MediaProjection API | tabs.captureVisibleTab | N/A (not possible) | Core functionality |
| **Accessibility service** | AccessibilityService | N/A | N/A | App detection; foreground monitoring |
| **Usage stats** | UsageStatsManager | N/A | Screen Time API | Time tracking |
| **Notifications** | POST_NOTIFICATIONS | notifications | UNUserNotificationCenter | Alerts to parents/children |
| **Background execution** | FOREGROUND_SERVICE | service_worker | Background App Refresh | Continuous monitoring |
| **Network state** | ACCESS_NETWORK_STATE | N/A | Network framework | Online/offline detection |

### Offline Architecture

| Component | Offline Behavior | Sync Strategy |
|-----------|------------------|---------------|
| **Time tracking** | Local accumulation | Merge on reconnect; conflict = sum |
| **Screenshots** | Local queue (encrypted) | Upload when online; respect retention |
| **Classification** | On-device model only | Cloud enhancement when available |
| **Family agreement** | Cached locally | Pull on reconnect; version check |
| **OTP unlock** | TOTP works offline | Time sync check on reconnect |

**Offline Duration:** 72-hour minimum with full functionality; configurable buffer extends to 7+ days.

### Platform Constraints & Mitigations

**Chrome Extension (Manifest V3):**
- Service Worker 5-minute timeout → Alarms API scheduling; chunked uploads
- No persistent WebSocket → Fetch-based polling from Alarms
- 10MB storage cap → Request unlimitedStorage; frequent Firebase sync
- Risk: Further `captureVisibleTab` restrictions → Android app is primary, extension is enhancement

**Android 14+:**
- MediaProjection consent per session → Clear UX; minimize app restarts
- Foreground Service type declaration required → Use `mediaProjection` + `dataSync`
- Partial screen sharing option → Detect and warn about limited monitoring
- Risk: Accessibility Service restrictions → Document legitimate use; UsageStats fallback

**iOS (Accept Limitations):**
- No screenshot capture possible → Metadata/title classification only
- Screen Time API is the ceiling → Position as "Screen Time enhancement"
- 30-second background refresh → Efficient sync with checkpointing
- Strategy: iOS adds aggregate value; deep monitoring from other platforms

**Fire TV:**
- DRM content blocks screenshots → Log app + title; metadata classification
- No Google Play Services → Firebase workarounds or Amazon alternatives
- Aggressive background killing → Foreground service; Fire OS optimizations

**Cross-Platform Capability Matrix:**

| Capability | Chrome | Android | iOS | Fire TV | Switch |
|------------|--------|---------|-----|---------|--------|
| Screenshots | ⚠️ V3 | ✅ | ❌ | ⚠️ DRM | ❌ |
| Real-time | ⚠️ 5min | ✅ | ❌ | ✅ | ❌ |
| Sideload | ✅ | ✅ | ❌ | ✅ | N/A |

### Failure Mode Architecture

**Service Failure Handling:**
- Firebase Auth down: 24-hour cached token window; queue login attempts
- Firestore down: Local-first with write queue; conflict resolution on reconnect
- Cloud Functions down: On-device classification continues; alert queue backlog
- FCM down: In-app polling fallback; email backup channel

**Permission Revocation Response:**
- Any permission change triggers immediate parent alert
- Degraded mode continues with available permissions
- Clear UI showing what's working vs. limited
- Philosophy: Log and notify, don't punish - conversation starter

**Critical Failure Mitigations:**
- Extension ↔ Android app heartbeat detects silent Chrome failures
- Aggressive local purge before storage full (prioritize recent)
- TOTP grace window + NTP sync prevents clock drift lockouts
- Recovery codes + secondary parent prevents MFA lockout

**Failure Philosophy:**
1. Fail open for homework (never lock out education)
2. Fail visible (clear UI for every failure state)
3. Fail graceful (degraded > broken)
4. Fail honest (tell users what's wrong)
5. Fail recoverable (documented recovery paths)

### Security Threat Mitigations

**STRIDE Analysis Completed:**
- Spoofing: Google Auth delegation; encourage MFA; device attestation
- Tampering: Client-side signing; server validation; immutable audit
- Repudiation: Complete audit trail visible to all family members
- Information Disclosure: Client-side E2EE; crisis URLs never logged
- Denial of Service: Per-family rate limits; graceful degradation
- Elevation of Privilege: Role boundaries in security rules; scoped tokens

**Priority Threats:**
- P1: Screenshot data breach → E2EE design
- P1: Crisis resource leak → Never-log architecture
- P1: Cross-family data leak → Security rule testing
- P2: Log tampering → Signature validation
- P3: Device enrollment abuse → Approval workflow

**Security Testing Requirements:**
- Firestore security rules tested every PR
- Penetration testing annually + major releases
- Dependency scanning weekly
- Role boundary testing every PR

### Data Flow Architecture

**Screenshot Lifecycle:**
- 12-stage flow from capture → parent view
- Plaintext exposure: Device memory only (stages 1-2, 11-12) + optional Cloud AI (stage 7)
- E2EE: Encrypted at rest (stages 3-6), encrypted in transit (stages 5, 9-10)
- Firebase sees: Encrypted blobs only; cannot decrypt content

**Encryption Implementation:**
- Algorithm: AES-256-GCM with random IV per screenshot
- Key storage: Platform secure enclave (Keystore/Keychain)
- Key distribution: QR code + encrypted channel during device enrollment
- Recovery: Key shown once at setup; parent responsible for secure storage

**Crisis Allowlist:**
- Source: Public GitHub Pages (`fledgely.github.io/crisis-allowlist/`)
- Distribution: Daily sync to local device cache
- Audit trail: Git history; public PRs for additions
- Check point: BEFORE any capture (URL checked against local cache)
- Result: Zero data path - no capture, no log, no record
- Visual: Child sees 🔒 indicator when on protected site

**Data Retention:**
- Screenshots: 7 days default (configurable)
- Automatic deletion via scheduled Cloud Function
- Manual parent deletion logged in audit
- Child graduation (18): All data immediately deleted

### Integration Architecture

**Direct Cloud Integration:**
- All cloud services integrated directly into fledgely
- Nintendo Parental Controls: Code adapted from `ha-nintendoparentalcontrols`
- No required intermediaries for core functionality

**Home Assistant:**
- Optional enhancement for smart home automations only
- Zero core functionality depends on HA
- Fledgely provides HA custom component for integration

**Integration Health Monitoring:**
- Firebase: Token refresh, write latency, function errors
- Nintendo: Data freshness (<24h), auth token validity
- FCM: Delivery rate (>95% target)

## Project Scoping & Phased Development

### MVP Philosophy

**Approach:** Ultra-lean personal validation with full roadmap planned.

Fledgely prioritizes validating the core consent-based model with a single family (the developer's own) before expanding. The full vision is planned and documented, but execution is sequenced to maximize learning while minimizing wasted effort.

**Key Principles:**
- Chromebook-first (sequencing, not scope reduction)
- Self-hosted to own Google Cloud first (sequencing, not scope reduction)
- E2EE deferred until post-SaaS demand emerges
- Full commitment to quality - no shortcuts, no technical debt

### Milestone Overview

Development is organized into 18 milestones across 4 validation gates:

| Gate | Milestones | Purpose |
|------|------------|---------|
| **Personal** | M1-M6 | Validate with own family |
| **Early Adopter** | M7-M9 | Validate with 5-10 trusted families |
| **Community** | M10-M13 | Open source launch |
| **SaaS** | M14-M17 | Business model validation |
| **Future** | M18 | E2EE (demand-driven) |

---

### M1: Foundation (10 phases)

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

### M2: Core Services (10 phases) - Simplified (E2EE Deferred)

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

### M3: Notifications (8 phases)

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

### M4: Chrome Extension (10 phases)

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

### M5: Parent Dashboard (8 phases)

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

### M6: AI Pipeline (10 phases)

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

### 🚪 PERSONAL GATE (After M6)

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

### M7: Agreements (6 phases)

| Phase | Description |
|-------|-------------|
| 7.1 | Agreement data model |
| 7.2 | Agreement creation UI |
| 7.3 | Digital signature capture |
| 7.4 | Agreement display (child view) |
| 7.5 | Agreement history |
| 7.6 | Renewal reminders |

---

### M8: Fire TV Agent (8 phases)

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

### M9: Family Management (6 phases)

| Phase | Description |
|-------|-------------|
| 9.1 | Multi-child support |
| 9.2 | Child profile management |
| 9.3 | Device assignment |
| 9.4 | Co-parent invitation |
| 9.5 | Caregiver access (temporary) |
| 9.6 | Family settings |

---

### 🚪 EARLY ADOPTER GATE (After M9)

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

### M10: iOS App (12 phases)

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

### M11: Public Infrastructure (8 phases)

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

### M12: Self-Hosted Deployment (8 phases)

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

### M13: Community & Documentation (10 phases)

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

### 🚪 COMMUNITY GATE (After M13)

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

### M14: Advanced Features (10 phases)

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

### M15: SaaS Platform (12 phases)

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

### 🚪 SAAS GATE (After M15)

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

### M16: Scale & Performance (8 phases)

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

### M17: Platform Expansion (14 phases)

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

### M18: E2EE (Future - Demand-Driven)

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

### Dependency Mapping

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

### Risk-Based Prioritization

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

### Validation Metrics

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

### Feature Completion Criteria

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

### Static Website Requirements

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

## Functional Requirements

This section defines the complete capability contract for fledgely. UX designers will ONLY design what's listed here. Architects will ONLY support what's listed here. If a capability is missing, it will NOT exist in the final product.

**Total: 160 Functional Requirements**

---

### Family & Account Management

- **FR1:** Parent can create a family account using Google Sign-In
- **FR2:** Parent can invite a co-parent to share family management responsibilities
- **FR3:** Parent can add children to the family with name, age, and profile photo
- **FR4:** Parent can invite a temporary caregiver with time-limited access
- **FR5:** Parent can revoke caregiver access at any time
- **FR6:** Child can view their own profile information
- **FR7:** Parent can assign devices to specific children
- **FR8:** Parent can remove a child from the family (with data deletion)
- **FR9:** System transfers account ownership to child at age 16 (Reverse Mode)
- **FR10:** Child (in Reverse Mode) can choose which data to share with parents
- **FR106:** System provides age-appropriate default agreement templates
- **FR107:** Co-parents must both approve agreement changes in shared custody scenarios
- **FR108:** Parent can designate a "Trusted Adult" with view-only access (no control)

---

### Device Enrollment & Management

- **FR11:** Parent can enroll a new device by scanning a QR code
- **FR12:** Existing family device can approve new device enrollment
- **FR13:** Parent can view all enrolled devices and their status
- **FR14:** Parent can remove a device from monitoring
- **FR15:** System detects when monitoring is disabled or tampered with
- **FR16:** Parent receives alert when device monitoring status changes
- **FR17:** Child can see which of their devices are being monitored

---

### Family Digital Agreement

- **FR18:** Parent and child can create a family digital agreement together
- **FR19:** Child can provide digital signature to accept the agreement
- **FR20:** Parent can provide digital signature to accept the agreement
- **FR21:** Agreement becomes active only when both parties sign
- **FR22:** Child can view the active agreement at any time
- **FR23:** Parent can propose changes to an existing agreement
- **FR24:** System sends renewal reminders at configurable intervals
- **FR25:** Agreement changes require both parties to re-sign
- **FR26:** Device becomes inoperable under fledgely management without child consent
- **FR121:** Child can formally request agreement changes (parent must respond)
- **FR147:** If child refuses agreement renewal, monitoring pauses (device not inoperable, but unmonitored)
- **FR148:** Expired agreements trigger grace period with notifications before monitoring pauses
- **FR161:** System supports "agreement-only" mode where families can create and manage digital agreements without enabling device monitoring

---

### Screenshot Capture & Storage

- **FR27:** System captures screenshots at configurable intervals on monitored devices
- **FR28:** Screenshots are stored in Firebase with security rule protection
- **FR29:** System automatically deletes screenshots after retention period (default 7 days)
- **FR30:** Parent can configure screenshot retention period per family
- **FR31:** Parent can manually delete specific screenshots
- **FR32:** System logs all screenshot access in audit trail
- **FR33:** Child can view their own screenshots
- **FR34:** Screenshots from crisis-allowlisted sites are never captured

---

### AI Content Classification

- **FR35:** System classifies screenshots into categories (homework, leisure, games, concerning)
- **FR36:** System flags screenshots that may require parent attention
- **FR37:** Parent can view AI classification reasoning for any screenshot
- **FR38:** Parent can correct AI classification (feedback loop)
- **FR39:** Family corrections improve future classifications
- **FR40:** Child can add context to flagged screenshots before parent sees them
- **FR41:** System provides confidence score with each classification
- **FR149:** System reduces alert frequency when false positive rate exceeds threshold (prevents flood)
- **FR150:** When AI service unavailable, system continues capture with classification queued

---

### Notifications & Alerts

- **FR42:** Parent receives push notification when concerning content is flagged
- **FR43:** Parent can configure notification preferences (immediate, digest, off)
- **FR44:** Child receives age-appropriate notifications about their activity
- **FR45:** Parent receives alert when child's monitoring is interrupted
- **FR46:** System provides weekly summary email to parents
- **FR47:** Caregiver receives only permitted notifications based on trust level
- **FR113:** All family members receive login alerts when any account is accessed
- **FR160:** Parent receives alert when account is accessed from new location

---

### Parent Dashboard

- **FR48:** Parent can view screenshot list filtered by child, device, date, or classification
- **FR49:** Parent can view individual screenshot with AI classification
- **FR50:** Parent can view aggregate screen time across all family devices
- **FR51:** Parent can see "last synced" timestamp for each device
- **FR52:** Child can view the same dashboard data as parent (bidirectional transparency)
- **FR53:** Parent can access audit log showing who viewed what and when
- **FR54:** Dashboard displays data freshness indicators

---

### Time Tracking & Limits

- **FR55:** System tracks screen time across all monitored devices per child
- **FR56:** Parent can set time limits (daily, per-device, per-app-category)
- **FR57:** Child can see remaining time allowance
- **FR58:** System provides countdown warnings before time expires
- **FR59:** System enforces "family offline time" where all devices (including parents') go dark
- **FR60:** Parent compliance with family offline time is tracked and visible
- **FR109:** Parent can configure extended countdown warnings for neurodivergent children
- **FR110:** Child can enable "focus mode" that pauses time tracking during deep work
- **FR115:** Parent can configure "work mode" schedules for working teens
- **FR116:** Work mode allows specific apps unrestricted during configured hours

---

### Crisis Resource Protection

- **FR61:** System maintains a public crisis allowlist (domestic abuse, suicide prevention, etc.)
- **FR62:** Visits to crisis-allowlisted resources are never logged or captured
- **FR63:** Child can view the complete crisis allowlist
- **FR64:** Visual indicator shows child when they are on a protected resource
- **FR65:** System redirects concerning searches to appropriate crisis resources
- **FR66:** Crisis allowlist updates are distributed via versioned GitHub Releases

---

### Earned Autonomy & Independence

- **FR67:** System tracks child's responsible usage patterns over time
- **FR68:** Restrictions automatically relax based on demonstrated responsibility
- **FR69:** Parent can view child's "earned autonomy" progress
- **FR70:** Child can see their progress toward more freedom
- **FR71:** At age 16, system offers transition to Reverse Mode
- **FR72:** At age 18, all child data is immediately deleted

---

### Delegated Access (Caregivers)

- **FR73:** Parent can create temporary caregiver PIN with specific permissions
- **FR74:** Caregiver can view child's remaining screen time
- **FR75:** Caregiver can extend time by configured amount (once per day)
- **FR76:** Caregiver can view flagged content with parent approval
- **FR77:** Caregiver actions are logged in audit trail
- **FR78:** Caregiver PIN only works from registered caregiver device
- **FR122:** Caregiver can send "contact parent" request through the app
- **FR123:** Trusted adult authenticates via invitation link from parent

---

### Platform-Specific Capabilities

- **FR79:** Chrome extension captures screenshots on Chromebook
- **FR80:** Chrome extension checks crisis allowlist before capture
- **FR81:** Fire TV agent captures non-DRM content screenshots
- **FR82:** Fire TV agent logs app and title for DRM-protected content
- **FR83:** iOS app integrates with Screen Time API for usage data
- **FR84:** iOS app displays time limits and remaining time
- **FR85:** Nintendo Switch data is retrieved via direct API integration
- **FR86:** Home Assistant integration is available as optional enhancement
- **FR117:** Windows agent monitors screen activity on Windows devices
- **FR118:** macOS agent monitors screen activity on Mac devices
- **FR119:** Xbox integration retrieves activity data from Xbox accounts

---

### Offline Operation

- **FR87:** Devices continue monitoring when offline (cached rules)
- **FR88:** Offline screenshots queue for upload when connectivity returns
- **FR89:** Time tracking continues offline with sync on reconnect
- **FR90:** OTP unlock works offline using TOTP
- **FR91:** System displays "offline since" timestamp to users

---

### Self-Hosting

- **FR92:** Technical users can deploy fledgely to their own Google Cloud account
- **FR93:** One-click Terraform deployment creates all required infrastructure
- **FR94:** Self-hosted deployment uses family's own Firebase project
- **FR95:** Self-hosted users can configure custom domain
- **FR96:** Upgrade path documentation guides self-hosted users through updates
- **FR124:** System performs automated backups of family data
- **FR125:** Parent can restore family data from backup (self-hosted)

---

### SaaS Features

- **FR97:** Users can subscribe to managed SaaS service
- **FR98:** Users can select subscription tier based on family size
- **FR99:** Users can manage billing through self-service portal
- **FR100:** System provides trial period for new SaaS users

---

### Accessibility

- **FR101:** All user interfaces support screen readers
- **FR102:** System provides AI-generated screenshot descriptions for blind parents
- **FR103:** All notifications have visual, audio, and haptic alternatives
- **FR104:** Time displays use natural language ("2 hours left" not "120 minutes")
- **FR105:** Agreements support visual/picture-based format for cognitive accessibility
- **FR142:** Parent can create custom activity categories per child
- **FR143:** Parent can enable transition warnings (activity ending soon) with configurable lead times
- **FR152:** Child can respond to agreement and notifications via pre-set response options (non-verbal support)

---

### Security & Data Isolation

- **FR131:** System enforces strict data isolation between families (no cross-family data access)
- **FR132:** Child accounts cannot modify family settings or parent configurations
- **FR112:** System detects VPN/proxy usage and logs transparently to all family members
- **FR114:** System applies jurisdiction-appropriate privacy defaults (e.g., UK AADC)
- **FR146:** System displays unclassifiable/encrypted traffic to all family members
- **FR159:** Siblings cannot view each other's detailed activity data (only aggregate family)

---

### Shared Custody & Family Structures

- **FR139:** Parent can configure location-based rule variations (e.g., different limits at each home)
- **FR140:** Safety-critical settings (crisis allowlist, age restrictions) require both parents to approve changes
- **FR141:** Parent declares custody arrangement during family setup
- **FR144:** System can import work schedule from connected calendar
- **FR145:** Work mode can activate automatically based on device location (opt-in)
- **FR151:** Either parent can initiate family dissolution, requiring data handling decision

---

### Data Rights & Account Lifecycle

- **FR120:** Parent can export all family data in portable format (GDPR compliance)
- **FR154:** System notifies affected families within 72 hours of any data breach (GDPR requirement)
- **FR158:** Parent can close family account with complete data deletion

---

### Analytics & Improvement

- **FR153:** System collects anonymized usage analytics to improve product (with consent)

---

### Negative Capabilities (System Must NOT)

- **FR126:** System does not share family data with third parties except as required by law
- **FR127:** System does not use child data for advertising or marketing purposes
- **FR128:** System does not train global AI models on identifiable child data (anonymized behavioral data only with consent)
- **FR129:** System does not block access to educational resources regardless of time limits
- **FR130:** System does not automatically punish detected bypass attempts (logs for conversation only)
- **FR133:** System displays visible indicator on monitored devices at all times
- **FR134:** System detects and flags when enrolled "child" exhibits adult usage patterns
- **FR135:** System Terms of Service prohibit non-family monitoring use
- **FR136:** System does not support institutional or organizational accounts
- **FR137:** System does not provide bulk screenshot export functionality
- **FR138:** System does not integrate with law enforcement systems
- **FR155:** System does not use dark patterns or manipulative design to influence child behavior
- **FR156:** System provides mechanism to report suspected abuse to support team
- **FR157:** System can terminate accounts found to be misusing the platform

---

## Non-Functional Requirements

### Performance

- **NFR1:** Dashboard pages load within 2 seconds on standard broadband connections
- **NFR2:** Screenshot capture completes within 500ms without visible lag to child
- **NFR3:** AI classification completes within 30 seconds of screenshot upload
- **NFR4:** AI classification accuracy exceeds 95% for clear content categories
- **NFR5:** Agreement state syncs across all family devices within 60 seconds
- **NFR6:** System supports 10 concurrent family members viewing dashboard simultaneously
- **NFR7:** Time tracking updates display within 5 seconds of activity change

---

### Security

- **NFR8:** All data encrypted at rest using Google Cloud default encryption (AES-256)
- **NFR9:** All data encrypted in transit using TLS 1.3
- **NFR10:** Authentication delegated entirely to Google Accounts via Firebase Auth
- **NFR11:** User sessions expire after 30 days of inactivity
- **NFR12:** API endpoints validate all input against defined schemas
- **NFR13:** Firebase Security Rules enforce family-level data isolation
- **NFR14:** Cloud Functions execute with minimum required IAM permissions
- **NFR15:** Service account keys never stored in client applications
- **NFR16:** All third-party dependencies scanned for vulnerabilities in CI/CD pipeline
- **NFR80:** System verifies agent authenticity through signed binaries and Firebase App Check before accepting data from any device
- **NFR81:** Agreement configurations validated server-side; client-side state is display-only and not trusted for enforcement
- **NFR82:** Every screenshot view logged with viewer identity, timestamp, and IP address, visible in family audit log
- **NFR83:** API endpoints enforce rate limits: 100 requests/minute per user, 10 screenshot uploads/minute per device, 1000 requests/hour per family
- **NFR84:** System detects and alerts on suspicious permission patterns: rapid role changes, self-elevation attempts, permission grants during unusual hours
- **NFR85:** All security-relevant settings default to most restrictive option; users must explicitly opt into less secure configurations

---

### Privacy & Compliance

- **NFR17:** System collects only data necessary for stated functionality (data minimization)
- **NFR18:** Users can request complete data deletion within 30 days (GDPR compliance)
- **NFR19:** Screenshot retention configurable from 1-7 days, default 7 days
- **NFR20:** Automated deletion enforced at retention window expiry with no recovery option
- **NFR64:** System obtains parental self-attestation of authority before enabling monitoring of any child account, with attestation recorded and auditable
- **NFR65:** All child-facing content written at 6th-grade reading level or below, verified through readability scoring
- **NFR66:** Data export includes JSON format alongside human-readable formats for GDPR data portability compliance
- **NFR67:** Data collected for safety monitoring not repurposed for analytics, marketing, or other secondary uses without explicit consent
- **NFR68:** Families can disable AI-powered screenshot classification while retaining manual review capability
- **NFR69:** System never sells, shares, or monetizes family data; immutable default with no opt-in mechanism

---

### Scalability

- **NFR21:** Architecture supports 10x user growth without re-architecture
- **NFR22:** Storage scales automatically with family count (Cloud Storage)
- **NFR23:** Database scales automatically with query load (Firestore)
- **NFR24:** Cloud Functions scale to zero when idle, scale up automatically under load

---

### Reliability & Availability

- **NFR25:** Target 99.5% uptime for core services (dashboard, agreements, notifications)
- **NFR26:** Screenshot processing tolerates 4-hour delays without data loss
- **NFR27:** System recovers automatically from transient cloud service failures
- **NFR28:** Crisis allowlist cached locally; functions without cloud connectivity
- **NFR55:** System maintains core safety functions (crisis allowlist, existing agreements) even when cloud services unavailable
- **NFR56:** System recovers from component failures within 15 minutes for non-critical services, 5 minutes for safety-critical (crisis allowlist updates)
- **NFR57:** Screenshots include cryptographic hash verification to detect tampering or corruption
- **NFR58:** Audit logs append-only and tamper-evident for dispute resolution
- **NFR77:** All deployments support automated rollback to previous version within 5 minutes if health checks fail
- **NFR79:** Maximum acceptable data loss: <1 hour for agreement state, <24 hours for screenshots (RPO)

---

### Accessibility

- **NFR42:** All interfaces comply with WCAG 2.1 AA standards
- **NFR43:** Dashboard fully navigable via keyboard alone
- **NFR44:** All images include alt text; screenshots include AI-generated descriptions
- **NFR45:** Color contrast ratios meet 4.5:1 minimum for text
- **NFR46:** Focus indicators visible on all interactive elements
- **NFR47:** Screen reader announcements for all state changes
- **NFR48:** Plain language used throughout; no jargon without explanation
- **NFR49:** Touch targets minimum 44x44 pixels on mobile interfaces

---

### Compatibility

- **NFR29:** Dashboard responsive from 320px to 4K displays
- **NFR30:** Dashboard supports Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **NFR31:** Dashboard functions on mobile browsers (iOS Safari, Chrome Mobile)
- **NFR32:** Progressive enhancement: core functions work without JavaScript for initial load
- **NFR36:** Chromebook agent supports ChromeOS 100+ as Chrome extension
- **NFR37:** Android agent supports Android 10+ (API 29+)
- **NFR38:** Fire TV agent supports Fire OS 7+ (Fire TV Stick 4K and newer)
- **NFR39:** iOS agent supports iOS 15+ with MDM profile
- **NFR40:** Nintendo Switch integration via Nintendo Parental Controls API
- **NFR41:** Windows/macOS agents support Windows 10+ and macOS 12+
- **NFR70:** Chromebook extension consumes <5% CPU during idle monitoring and <50MB memory
- **NFR71:** All Fire TV agent UI fully navigable using D-pad remote with no dead-ends
- **NFR72:** Switch agent integrates with (not bypasses) Nintendo's native parental controls API
- **NFR73:** Android agent uses <2% battery per hour during active monitoring using WorkManager/foreground service best practices
- **NFR74:** iOS agent complies with App Store Review Guidelines section 5.4 (VPN/parental controls) including MDM profile requirements
- **NFR75:** Windows agent supports system tray minimization, startup registration, and silent operation without UAC prompts during normal use
- **NFR76:** macOS agent gracefully handles Screen Recording, Accessibility, and Full Disk Access permissions with clear user guidance when denied

---

### Maintainability

- **NFR50:** Codebase follows consistent style enforced by automated linting
- **NFR51:** Infrastructure defined as code (Terraform) for reproducible deployments
- **NFR52:** All services emit structured logs in JSON format
- **NFR53:** Alerting configured for error rate spikes and service degradation
- **NFR54:** Database backups automated daily with 30-day retention

---

### Operational

- **NFR86:** Self-hosted instance includes configurable monthly cost alert threshold (default $20) with automatic screenshot processing pause at 150% of threshold
- **NFR87:** Screenshot storage uses efficient compression (WebP/AVIF) targeting <100KB average per screenshot while maintaining classification accuracy
- **NFR88:** AI classification supports configurable daily processing limit (default 100/day per device) with graceful queue management when exceeded
- **NFR89:** Dashboard uses incremental sync and lazy loading; full page refresh transfers <500KB after initial load
- **NFR90:** Dashboard displays current period's resource consumption (storage used, AI calls, function invocations) alongside cost estimates
- **NFR91:** System automatically classifies incidents as P1 (safety-critical), P2 (core function), P3 (degraded), P4 (cosmetic)

---

### User Journey Support

- **NFR59:** New families can create first draft agreement within 10 minutes of starting onboarding
- **NFR60:** System supports agreements with up to 100 conditions without performance degradation
- **NFR62:** Delegated access revocation takes effect within 5 minutes across all active sessions
- **NFR63:** Trust score calculations deterministic and reproducible, with variance <1% across recalculations
