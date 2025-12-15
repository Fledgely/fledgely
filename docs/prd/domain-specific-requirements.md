# Domain-Specific Requirements

## Child Digital Safety - Regulatory Overview

Fledgely operates in a highly regulated space intersecting child privacy (COPPA, GDPR), age-appropriate design (UK AADC), and monitoring software ethics (stalkerware differentiation). The self-hosted model elegantly sidesteps many regulatory concerns by keeping data under family control.

## Regulatory Compliance Matrix

| Regulation | Applicability | Fledgely Approach |
|------------|---------------|-------------------|
| **COPPA 2025 (US)** | Children under 13 | Parents authenticate and setup; self-hosted = no data collection by fledgely |
| **GDPR (EU)** | EU users | E2EE; data minimization; right to deletion; parental consent |
| **UK AADC** | UK users (primary market) | Transparency-first design exceeds requirements; high privacy defaults |
| **State privacy laws** | California, etc. | Covered by GDPR-level compliance |

## Age Range & Consent Framework

| Aspect | Approach |
|--------|----------|
| **Target age range** | 3-18 years |
| **Legal consent** | Parent provides for all children |
| **Philosophical consent** | Child participates regardless of age (product philosophy) |
| **Reverse mode** | Age 16 with parental override capability |
| **Data at 18** | Immediately deleted; clean transition to adulthood |

## Stalkerware Differentiation

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

## Data Handling Requirements

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

## AI & Data Training

| Aspect | Approach |
|--------|----------|
| **Personalized model** | Per-family, trained on their feedback |
| **Global model** | Fed by anonymized behavioral telemetry |
| **What's shared** | Behavioral traits, parental responses - never child identity |
| **Self-hosted** | Optional participation; can download global model improvements |

## Cross-Border & Data Residency

| Aspect | Approach |
|--------|----------|
| **Data hosting** | US-based infrastructure |
| **Transport security** | All traffic over HTTPS |
| **Jurisdiction awareness** | App defaults based on user jurisdiction (e.g., UK AADC defaults for UK users) |
| **Multi-jurisdiction families** | Parents with responsibility can customize; defaults are starting point |

## UK AADC Alignment

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

## Abuse Prevention & Safety Architecture

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

## Regulatory Risk & Contingency Planning

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

## Special Scenario Handling

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

## Regulatory Defense Framework

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
