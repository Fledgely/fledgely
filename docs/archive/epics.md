---
stepsCompleted: [1, 2]
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
  - docs/ux-design-specification.md
  - docs/project_context.md
---

# fledgely - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for fledgely, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Family & Account Management**
- FR1: Parent can create a family account using Google Sign-In
- FR2: Parent can invite a co-parent to share family management responsibilities
- FR3: Parent can add children to the family with name, age, and profile photo
- FR4: Parent can invite a temporary caregiver with time-limited access
- FR5: Parent can revoke caregiver access at any time
- FR6: Child can view their own profile information
- FR7: Parent can assign devices to specific children
- FR8: Parent can remove a child from the family (with data deletion)
- FR9: System transfers account ownership to child at age 16 (Reverse Mode)
- FR10: Child (in Reverse Mode) can choose which data to share with parents
- FR106: System provides age-appropriate default agreement templates
- FR107: Co-parents must both approve agreement changes in shared custody scenarios
- FR108: Parent can designate a "Trusted Adult" with view-only access (no control)

**Device Enrollment & Management**
- FR11: Parent can enroll a new device by scanning a QR code
- FR12: Existing family device can approve new device enrollment
- FR13: Parent can view all enrolled devices and their status
- FR14: Parent can remove a device from monitoring
- FR15: System detects when monitoring is disabled or tampered with
- FR16: Parent receives alert when device monitoring status changes
- FR17: Child can see which of their devices are being monitored

**Family Digital Agreement**
- FR18: Parent and child can create a family digital agreement together
- FR19: Child can provide digital signature to accept the agreement
- FR20: Parent can provide digital signature to accept the agreement
- FR21: Agreement becomes active only when both parties sign
- FR22: Child can view the active agreement at any time
- FR23: Parent can propose changes to an existing agreement
- FR24: System sends renewal reminders at configurable intervals
- FR25: Agreement changes require both parties to re-sign
- FR26: Device becomes inoperable under fledgely management without child consent
- FR121: Child can formally request agreement changes (parent must respond)
- FR147: If child refuses agreement renewal, monitoring pauses (device not inoperable, but unmonitored)
- FR148: Expired agreements trigger grace period with notifications before monitoring pauses
- FR161: System supports "agreement-only" mode where families can create and manage digital agreements without enabling device monitoring

**Screenshot Capture & Storage**
- FR27: System captures screenshots at configurable intervals on monitored devices
- FR28: Screenshots are stored in Firebase with security rule protection
- FR29: System automatically deletes screenshots after retention period (default 7 days)
- FR30: Parent can configure screenshot retention period per family
- FR31: Parent can manually delete specific screenshots
- FR32: System logs all screenshot access in audit trail
- FR33: Child can view their own screenshots
- FR34: Screenshots from crisis-allowlisted sites are never captured

**AI Content Classification**
- FR35: System classifies screenshots into categories (homework, leisure, games, concerning)
- FR36: System flags screenshots that may require parent attention
- FR37: Parent can view AI classification reasoning for any screenshot
- FR38: Parent can correct AI classification (feedback loop)
- FR39: Family corrections improve future classifications
- FR40: Child can add context to flagged screenshots before parent sees them
- FR41: System provides confidence score with each classification
- FR149: System reduces alert frequency when false positive rate exceeds threshold (prevents flood)
- FR150: When AI service unavailable, system continues capture with classification queued

**Notifications & Alerts**
- FR42: Parent receives push notification when concerning content is flagged
- FR43: Parent can configure notification preferences (immediate, digest, off)
- FR44: Child receives age-appropriate notifications about their activity
- FR45: Parent receives alert when child's monitoring is interrupted
- FR46: System provides weekly summary email to parents
- FR47: Caregiver receives only permitted notifications based on trust level
- FR113: All family members receive login alerts when any account is accessed
- FR160: Parent receives alert when account is accessed from new location

**Parent Dashboard**
- FR48: Parent can view screenshot list filtered by child, device, date, or classification
- FR49: Parent can view individual screenshot with AI classification
- FR50: Parent can view aggregate screen time across all family devices
- FR51: Parent can see "last synced" timestamp for each device
- FR52: Child can view the same dashboard data as parent (bidirectional transparency)
- FR53: Parent can access audit log showing who viewed what and when
- FR54: Dashboard displays data freshness indicators

**Time Tracking & Limits**
- FR55: System tracks screen time across all monitored devices per child
- FR56: Parent can set time limits (daily, per-device, per-app-category)
- FR57: Child can see remaining time allowance
- FR58: System provides countdown warnings before time expires
- FR59: System enforces "family offline time" where all devices (including parents') go dark
- FR60: Parent compliance with family offline time is tracked and visible
- FR109: Parent can configure extended countdown warnings for neurodivergent children
- FR110: Child can enable "focus mode" that pauses time tracking during deep work
- FR115: Parent can configure "work mode" schedules for working teens
- FR116: Work mode allows specific apps unrestricted during configured hours

**Crisis Resource Protection**
- FR61: System maintains a public crisis allowlist (domestic abuse, suicide prevention, etc.)
- FR62: Visits to crisis-allowlisted resources are never logged or captured
- FR63: Child can view the complete crisis allowlist
- FR64: Visual indicator shows child when they are on a protected resource
- FR65: System redirects concerning searches to appropriate crisis resources
- FR66: Crisis allowlist updates are distributed via versioned GitHub Releases

**Earned Autonomy & Independence**
- FR67: System tracks child's responsible usage patterns over time
- FR68: Restrictions automatically relax based on demonstrated responsibility
- FR69: Parent can view child's "earned autonomy" progress
- FR70: Child can see their progress toward more freedom
- FR71: At age 16, system offers transition to Reverse Mode
- FR72: At age 18, all child data is immediately deleted

**Delegated Access (Caregivers)**
- FR73: Parent can create temporary caregiver PIN with specific permissions
- FR74: Caregiver can view child's remaining screen time
- FR75: Caregiver can extend time by configured amount (once per day)
- FR76: Caregiver can view flagged content with parent approval
- FR77: Caregiver actions are logged in audit trail
- FR78: Caregiver PIN only works from registered caregiver device
- FR122: Caregiver can send "contact parent" request through the app
- FR123: Trusted adult authenticates via invitation link from parent

**Platform-Specific Capabilities**
- FR79: Chrome extension captures screenshots on Chromebook
- FR80: Chrome extension checks crisis allowlist before capture
- FR81: Fire TV agent captures non-DRM content screenshots
- FR82: Fire TV agent logs app and title for DRM-protected content
- FR83: iOS app integrates with Screen Time API for usage data
- FR84: iOS app displays time limits and remaining time
- FR85: Nintendo Switch data is retrieved via direct API integration
- FR86: Home Assistant integration is available as optional enhancement
- FR117: Windows agent monitors screen activity on Windows devices
- FR118: macOS agent monitors screen activity on Mac devices
- FR119: Xbox integration retrieves activity data from Xbox accounts

**Offline Operation**
- FR87: Devices continue monitoring when offline (cached rules)
- FR88: Offline screenshots queue for upload when connectivity returns
- FR89: Time tracking continues offline with sync on reconnect
- FR90: OTP unlock works offline using TOTP
- FR91: System displays "offline since" timestamp to users

**Self-Hosting**
- FR92: Technical users can deploy fledgely to their own Google Cloud account
- FR93: One-click Terraform deployment creates all required infrastructure
- FR94: Self-hosted deployment uses family's own Firebase project
- FR95: Self-hosted users can configure custom domain
- FR96: Upgrade path documentation guides self-hosted users through updates
- FR124: System performs automated backups of family data
- FR125: Parent can restore family data from backup (self-hosted)

**SaaS Features**
- FR97: Users can subscribe to managed SaaS service
- FR98: Users can select subscription tier based on family size
- FR99: Users can manage billing through self-service portal
- FR100: System provides trial period for new SaaS users

**Accessibility**
- FR101: All user interfaces support screen readers
- FR102: System provides AI-generated screenshot descriptions for blind parents
- FR103: All notifications have visual, audio, and haptic alternatives
- FR104: Time displays use natural language ("2 hours left" not "120 minutes")
- FR105: Agreements support visual/picture-based format for cognitive accessibility
- FR142: Parent can create custom activity categories per child
- FR143: Parent can enable transition warnings (activity ending soon) with configurable lead times
- FR152: Child can respond to agreement and notifications via pre-set response options (non-verbal support)

**Security & Data Isolation**
- FR131: System enforces strict data isolation between families (no cross-family data access)
- FR132: Child accounts cannot modify family settings or parent configurations
- FR112: System detects VPN/proxy usage and logs transparently to all family members
- FR114: System applies jurisdiction-appropriate privacy defaults (e.g., UK AADC)
- FR146: System displays unclassifiable/encrypted traffic to all family members
- FR159: Siblings cannot view each other's detailed activity data (only aggregate family)

**Shared Custody & Family Structures**
- FR139: Parent can configure location-based rule variations (e.g., different limits at each home)
- FR140: Safety-critical settings (crisis allowlist, age restrictions) require both parents to approve changes
- FR141: Parent declares custody arrangement during family setup
- FR144: System can import work schedule from connected calendar
- FR145: Work mode can activate automatically based on device location (opt-in)
- FR151: Either parent can initiate family dissolution, requiring data handling decision

**Data Rights & Account Lifecycle**
- FR120: Parent can export all family data in portable format (GDPR compliance)
- FR154: System notifies affected families within 72 hours of any data breach (GDPR requirement)
- FR158: Parent can close family account with complete data deletion

**Analytics & Improvement**
- FR153: System collects anonymized usage analytics to improve product (with consent)

**Negative Capabilities (System Must NOT)**
- FR126: System does not share family data with third parties except as required by law
- FR127: System does not use child data for advertising or marketing purposes
- FR128: System does not train global AI models on identifiable child data (anonymized behavioral data only with consent)
- FR129: System does not block access to educational resources regardless of time limits
- FR130: System does not automatically punish detected bypass attempts (logs for conversation only)
- FR133: System displays visible indicator on monitored devices at all times
- FR134: System detects and flags when enrolled "child" exhibits adult usage patterns
- FR135: System Terms of Service prohibit non-family monitoring use
- FR136: System does not support institutional or organizational accounts
- FR137: System does not provide bulk screenshot export functionality
- FR138: System does not integrate with law enforcement systems
- FR155: System does not use dark patterns or manipulative design to influence child behavior
- FR156: System provides mechanism to report suspected abuse to support team
- FR157: System can terminate accounts found to be misusing the platform

### Non-Functional Requirements

**Performance**
- NFR1: Dashboard pages load within 2 seconds on standard broadband connections
- NFR2: Screenshot capture completes within 500ms without visible lag to child
- NFR3: AI classification completes within 30 seconds of screenshot upload
- NFR4: AI classification accuracy exceeds 95% for clear content categories
- NFR5: Agreement state syncs across all family devices within 60 seconds
- NFR6: System supports 10 concurrent family members viewing dashboard simultaneously
- NFR7: Time tracking updates display within 5 seconds of activity change

**Security**
- NFR8: All data encrypted at rest using Google Cloud default encryption (AES-256)
- NFR9: All data encrypted in transit using TLS 1.3
- NFR10: Authentication delegated entirely to Google Accounts via Firebase Auth
- NFR11: User sessions expire after 30 days of inactivity
- NFR12: API endpoints validate all input against defined schemas
- NFR13: Firebase Security Rules enforce family-level data isolation
- NFR14: Cloud Functions execute with minimum required IAM permissions
- NFR15: Service account keys never stored in client applications
- NFR16: All third-party dependencies scanned for vulnerabilities in CI/CD pipeline
- NFR80: System verifies agent authenticity through signed binaries and Firebase App Check
- NFR81: Agreement configurations validated server-side; client-side state is display-only
- NFR82: Every screenshot view logged with viewer identity, timestamp, and IP address
- NFR83: API endpoints enforce rate limits: 100 requests/minute per user, 10 screenshot uploads/minute per device
- NFR84: System detects and alerts on suspicious permission patterns
- NFR85: All security-relevant settings default to most restrictive option

**Privacy & Compliance**
- NFR17: System collects only data necessary for stated functionality (data minimization)
- NFR18: Users can request complete data deletion within 30 days (GDPR compliance)
- NFR19: Screenshot retention configurable from 1-7 days, default 7 days
- NFR20: Automated deletion enforced at retention window expiry with no recovery option
- NFR64: System obtains parental self-attestation of authority before enabling monitoring
- NFR65: All child-facing content written at 6th-grade reading level or below
- NFR66: Data export includes JSON format alongside human-readable formats for GDPR portability
- NFR67: Data collected for safety monitoring not repurposed for analytics without explicit consent
- NFR68: Families can disable AI-powered screenshot classification while retaining manual review
- NFR69: System never sells, shares, or monetizes family data

**Scalability**
- NFR21: Architecture supports 10x user growth without re-architecture
- NFR22: Storage scales automatically with family count (Cloud Storage)
- NFR23: Database scales automatically with query load (Firestore)
- NFR24: Cloud Functions scale to zero when idle, scale up automatically under load

**Reliability & Availability**
- NFR25: Target 99.5% uptime for core services (dashboard, agreements, notifications)
- NFR26: Screenshot processing tolerates 4-hour delays without data loss
- NFR27: System recovers automatically from transient cloud service failures
- NFR28: Crisis allowlist cached locally; functions without cloud connectivity
- NFR55: System maintains core safety functions even when cloud services unavailable
- NFR56: System recovers from component failures within 15 minutes for non-critical services
- NFR57: Screenshots include cryptographic hash verification to detect tampering
- NFR58: Audit logs append-only and tamper-evident for dispute resolution
- NFR77: All deployments support automated rollback to previous version within 5 minutes
- NFR79: Maximum acceptable data loss: <1 hour for agreement state, <24 hours for screenshots

**Accessibility**
- NFR42: All interfaces comply with WCAG 2.1 AA standards
- NFR43: Dashboard fully navigable via keyboard alone
- NFR44: All images include alt text; screenshots include AI-generated descriptions
- NFR45: Color contrast ratios meet 4.5:1 minimum for text
- NFR46: Focus indicators visible on all interactive elements
- NFR47: Screen reader announcements for all state changes
- NFR48: Plain language used throughout; no jargon without explanation
- NFR49: Touch targets minimum 44x44 pixels on mobile interfaces

**Compatibility**
- NFR29: Dashboard responsive from 320px to 4K displays
- NFR30: Dashboard supports Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- NFR31: Dashboard functions on mobile browsers (iOS Safari, Chrome Mobile)
- NFR32: Progressive enhancement: core functions work without JavaScript for initial load
- NFR36: Chromebook agent supports ChromeOS 100+ as Chrome extension
- NFR37: Android agent supports Android 10+ (API 29+)
- NFR38: Fire TV agent supports Fire OS 7+ (Fire TV Stick 4K and newer)
- NFR39: iOS agent supports iOS 15+ with MDM profile
- NFR40: Nintendo Switch integration via Nintendo Parental Controls API
- NFR41: Windows/macOS agents support Windows 10+ and macOS 12+
- NFR70: Chromebook extension consumes <5% CPU during idle monitoring and <50MB memory
- NFR71: All Fire TV agent UI fully navigable using D-pad remote with no dead-ends
- NFR72: Switch agent integrates with Nintendo's native parental controls API
- NFR73: Android agent uses <2% battery per hour during active monitoring
- NFR74: iOS agent complies with App Store Review Guidelines section 5.4
- NFR75: Windows agent supports system tray minimization, startup registration, and silent operation
- NFR76: macOS agent gracefully handles Screen Recording, Accessibility, and Full Disk Access permissions

**Maintainability**
- NFR50: Codebase follows consistent style enforced by automated linting
- NFR51: Infrastructure defined as code (Terraform) for reproducible deployments
- NFR52: All services emit structured logs in JSON format
- NFR53: Alerting configured for error rate spikes and service degradation
- NFR54: Database backups automated daily with 30-day retention

**Operational**
- NFR86: Self-hosted instance includes configurable monthly cost alert threshold
- NFR87: Screenshot storage uses efficient compression (WebP/AVIF) targeting <100KB average
- NFR88: AI classification supports configurable daily processing limit (default 100/day per device)
- NFR89: Dashboard uses incremental sync and lazy loading; full page refresh transfers <500KB
- NFR90: Dashboard displays current period's resource consumption with cost estimates
- NFR91: System automatically classifies incidents as P1/P2/P3/P4

**User Journey Support**
- NFR59: New families can create first draft agreement within 10 minutes of starting onboarding
- NFR60: System supports agreements with up to 100 conditions without performance degradation
- NFR62: Delegated access revocation takes effect within 5 minutes across all active sessions
- NFR63: Trust score calculations deterministic and reproducible

### Additional Requirements

**From Architecture - Starter Template**
- Architecture specifies Nx monorepo with TypeScript packages + separate native repos (Kotlin Android, Swift iOS)
- Next.js 14+ with App Router for web dashboard
- Firebase Cloud Functions for backend
- Firestore as database with direct SDK (no abstractions)
- TanStack Query for server state + Zustand for UI-only state
- shadcn/ui + Radix + Tailwind for UI components
- Vitest + Playwright + Firebase Emulators for testing

**From Architecture - Infrastructure Requirements**
- Firebase-centric architecture with self-hosted option deploying to user's GCP project
- Google Sign-In delegation for authentication (no passwords in fledgely)
- Firebase Security Rules as primary security boundary (E2EE deferred to M18)
- Crisis allowlist check BEFORE any capture (zero data path)
- Store independence: sideload paths mandatory, never depend on app stores

**From Architecture - Data Model**
- Child-centric data model (children are root entity, not families)
- Each child has their own guardians with explicit permissions
- Support for shared custody, blended families, complex multi-partner situations
- Single Cloud Storage bucket with path-based access control
- Full agreement version history retained

**From Architecture - AI Pipeline**
- Cloud AI (Gemini) for classification, collecting training data
- Gemini generates regex patterns for on-device real-time blocking
- On-device ML model trained and deployed by end of development cycle
- Family feedback loops improve classification over time

**From Architecture - Adversarial Protections**
- Shared custody immutability (can't remove other parent)
- Separation flow with 30-day waiting period
- Safety rule 48-hour cooling period
- Anti-weaponization design (no export, no legal holds, auto-expiry)
- Child "I feel unsafe" flag with restriction freeze

**From UX - Core Experience Requirements**
- Agreement-centric dashboard (not activity-first)
- Agreement co-creation as the critical success moment
- Bilateral visibility: parents see what children see
- Earned autonomy with meaningful trust milestones
- Ceremony at thresholds (first agreement, trust level ups, graduation)
- Child view showing agreements, progress, earned freedoms, screenshot history
- 30-minute grace period for child annotation before parent sees flag
- Trust score with visible graduation path
- Dispute and explanation system for AI classifications

**From UX - Emotional Design Requirements**
- Help parents feel competent, not just in control
- Children must feel respected, not policed
- Monitoring data as conversation fuel, not surveillance evidence
- "The app's job is to make itself unnecessary" - success = graduation
- No dark patterns or manipulative design

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Parent account creation |
| FR2 | Epic 3 | Co-parent invitation |
| FR3 | Epic 2 | Child profile creation |
| FR4 | Epic 39 | Caregiver invitation |
| FR5 | Epic 39 | Caregiver revocation |
| FR6 | Epic 2 | Child profile viewing |
| FR7 | Epic 12, 17 | Device assignment |
| FR8 | Epic 2 | Child removal |
| FR9 | Epic 52 | Reverse Mode at 16 |
| FR10 | Epic 52 | Reverse Mode data sharing |
| FR11 | Epic 12, 17 | QR code enrollment |
| FR12 | Epic 12 | Device-to-device approval |
| FR13 | Epic 19 | Device status viewing |
| FR14 | Epic 19 | Device removal |
| FR15 | Epic 19 | Tamper detection |
| FR16 | Epic 19 | Monitoring status alerts |
| FR17 | Epic 19 | Child device visibility |
| FR18 | Epic 5 | Agreement co-creation |
| FR19 | Epic 6 | Child digital signature |
| FR20 | Epic 6 | Parent digital signature |
| FR21 | Epic 6 | Agreement activation |
| FR22 | Epic 5, 26 | Agreement viewing |
| FR23 | Epic 34 | Agreement change proposals |
| FR24 | Epic 35 | Renewal reminders |
| FR25 | Epic 34 | Re-signing requirement |
| FR26 | Epic 6 | Device inoperable without consent |
| FR27 | Epic 10, 15 | Screenshot capture |
| FR28 | Epic 18 | Firebase storage |
| FR29 | Epic 18 | Auto-deletion |
| FR30 | Epic 18 | Retention configuration |
| FR31 | Epic 18 | Manual deletion |
| FR32 | Epic 27 | Access audit trail |
| FR33 | Epic 19B | Child screenshot viewing (moved from Epic 25) |
| FR34 | Epic 11, 16 | Crisis site protection |
| FR35 | Epic 20 | Category classification |
| FR36 | Epic 21 | Concerning content detection |
| FR37 | Epic 22 | AI reasoning display |
| FR38 | Epic 24 | AI correction feedback |
| FR39 | Epic 24 | Family feedback loop |
| FR40 | Epic 23 | Child annotation window |
| FR41 | Epic 20 | Confidence scores |
| FR42 | Epic 41 | Parent push notifications |
| FR43 | Epic 41 | Notification preferences |
| FR44 | Epic 41 | Child notifications |
| FR45 | Epic 41 | Monitoring interruption alerts |
| FR46 | Epic 41 | Weekly summary emails |
| FR47 | Epic 41 | Caregiver notifications |
| FR48 | Epic 19 | Screenshot list filtering |
| FR49 | Epic 22 | Individual screenshot view |
| FR50 | Epic 29 | Aggregate screen time |
| FR51 | Epic 19 | Last synced timestamp |
| FR52 | Epic 19B | Bidirectional transparency (moved from Epic 25) |
| FR53 | Epic 27 | Audit log access |
| FR54 | Epic 19 | Data freshness indicators |
| FR55 | Epic 29 | Screen time tracking |
| FR56 | Epic 30 | Time limit configuration |
| FR57 | Epic 31 | Remaining time display |
| FR58 | Epic 31 | Countdown warnings |
| FR59 | Epic 32 | Family offline time |
| FR60 | Epic 32 | Parent compliance tracking |
| FR61 | Epic 7 | Crisis allowlist maintenance |
| FR62 | Epic 7 | Crisis visits not logged |
| FR63 | Epic 7 | Allowlist visibility |
| FR64 | Epic 11, 16 | Protected site indicator |
| FR65 | Epic 7 | Crisis search redirection |
| FR66 | Epic 7 | Allowlist distribution |
| FR67 | Epic 36 | Responsible usage tracking |
| FR68 | Epic 37 | Automatic restriction relaxation |
| FR69 | Epic 37 | Parent autonomy progress view |
| FR70 | Epic 37 | Child progress visibility |
| FR71 | Epic 38 | Reverse Mode offer at 16 |
| FR72 | Epic 38 | Age 18 data deletion |
| FR73 | Epic 39 | Caregiver PIN creation |
| FR74 | Epic 19D, 39 | Caregiver time viewing (basic in 19D, full in 39) |
| FR75 | Epic 39 | Caregiver time extension |
| FR76 | Epic 39 | Caregiver flag viewing |
| FR77 | Epic 39 | Caregiver action logging |
| FR78 | Epic 39 | Device-bound PIN |
| FR79 | Epic 9, 10 | Chrome extension capture |
| FR80 | Epic 11 | Chrome crisis check |
| FR81 | Epic 42 | Fire TV capture |
| FR82 | Epic 42 | Fire TV DRM logging |
| FR83 | Epic 43 | iOS Screen Time API |
| FR84 | Epic 43 | iOS time display |
| FR85 | Epic 45 | Nintendo Switch API |
| FR86 | Epic 45 | Home Assistant integration |
| FR87 | Epic 46 | Offline monitoring |
| FR88 | Epic 46 | Offline queue |
| FR89 | Epic 46 | Offline time tracking |
| FR90 | Epic 13 | OTP offline unlock |
| FR91 | Epic 46 | Offline timestamp display |
| FR92 | Epic 48 | Self-hosted GCP deployment |
| FR93 | Epic 48 | Terraform deployment |
| FR94 | Epic 48 | Own Firebase project |
| FR95 | Epic 48 | Custom domain |
| FR96 | Epic 48 | Upgrade documentation |
| FR97 | Epic 50 | SaaS subscription |
| FR98 | Epic 50 | Subscription tiers |
| FR99 | Epic 50 | Billing portal |
| FR100 | Epic 50 | Trial period |
| FR101 | Epic 1-52 | Screen reader support (all epics) |
| FR102 | Epic 28 | AI screenshot descriptions |
| FR103 | Epic 41 | Notification alternatives |
| FR104 | Epic 31 | Natural language time |
| FR105 | Epic 5 | Visual agreement format |
| FR106 | Epic 4 | Agreement templates |
| FR107 | Epic 3A | Co-parent approval (moved from Epic 40) |
| FR108 | Epic 52 | Trusted Adult designation |
| FR109 | Epic 31 | Neurodivergent countdown |
| FR110 | Epic 33 | Focus mode |
| FR112 | Epic 8 | VPN detection |
| FR113 | Epic 41 | Login alerts |
| FR114 | Epic 8 | Jurisdiction defaults |
| FR115 | Epic 33 | Work mode schedules |
| FR116 | Epic 33 | Work mode apps |
| FR117 | Epic 44 | Windows agent |
| FR118 | Epic 44 | macOS agent |
| FR119 | Epic 45 | Xbox integration |
| FR120 | Epic 51 | Data export |
| FR121 | Epic 34 | Child change requests |
| FR122 | Epic 39 | Caregiver parent contact |
| FR123 | Epic 39 | Trusted adult authentication |
| FR124 | Epic 49 | Automated backups |
| FR125 | Epic 49 | Backup restore |
| FR126 | Epic 8 | No third-party sharing |
| FR127 | Epic 8 | No advertising use |
| FR128 | Epic 8 | No identifiable AI training |
| FR129 | Epic 31 | Educational exception |
| FR130 | Epic 36 | No auto-punishment |
| FR131 | Epic 8 | Data isolation |
| FR132 | Epic 8 | Child permission limits |
| FR133 | Epic 9, 14 | Monitoring indicator |
| FR134 | Epic 8 | Adult pattern detection (moved from Epic 36 - security foundation) |
| FR135 | Epic 50 | ToS family-only clause |
| FR136 | Epic 50 | No institutional accounts |
| FR137 | Epic 18 | No bulk export |
| FR138 | Epic 8 | No law enforcement integration |
| FR139 | Epic 40 | Location-based rules (deferred - needs device location data) |
| FR140 | Epic 3A | Two-parent safety approval (moved from Epic 40) |
| FR141 | Epic 2 | Custody declaration |
| FR142 | Epic 30 | Custom categories |
| FR143 | Epic 31 | Transition warnings |
| FR144 | Epic 33 | Calendar import |
| FR145 | Epic 40 | Location-based work mode (deferred - requires device location data) |
| FR146 | Epic 8 | Encrypted traffic display |
| FR147 | Epic 35 | Refused renewal handling |
| FR148 | Epic 35 | Grace period |
| FR149 | Epic 21 | False positive throttling |
| FR150 | Epic 20 | AI unavailable fallback |
| FR151 | Epic 2 | Family dissolution |
| FR152 | Epic 41 | Pre-set responses |
| FR153 | Epic 51 | Anonymized analytics |
| FR154 | Epic 51 | Breach notification |
| FR155 | Epic 1-52 | No dark patterns (all epics) |
| FR156 | Epic 51 | Abuse reporting |
| FR157 | Epic 51 | Account termination |
| FR158 | Epic 51 | Account closure |
| FR159 | Epic 8 | Sibling data isolation |
| FR160 | Epic 41 | New location alerts |
| FR161 | Epic 5 | Agreement-only mode |

## Epic List

### Phase 1: Core Foundation (Epics 1-8)
*Essential infrastructure that enables everything else*

---

### Epic 0.5: Safe Account Escape (NEW - Survivor Advocate)
**Goal:** Provide abuse victims a safe exit path that doesn't require the abuser's cooperation or knowledge.

**User Outcome:** A victim (parent or child) can contact fledgely support with documentation and be safely extracted from a family account without alerting the abuser.

**Rationale:** *Survivor Advocate Finding - "You need an ABUSE EXIT PATH that doesn't require the abuser's cooperation."*

**Features:**
- Victim contacts fledgely support via secure channel (not logged to family)
- Support verifies identity and reviews documentation (protection order, etc.)
- Support can sever victim's access (delete their view without deleting all data)
- Victim can request child's device be remotely unenrolled
- All location features immediately disabled for escaped devices
- Abuser is NOT notified of these changes for 72 hours (escape window)
- Automatic referral to domestic abuse resources provided
- Audit trail sealed from abuser access during escape window

**FRs Covered:** None (new safety capability)
**NFRs:** NFR42

**Dependencies:** Must be available before any family features go live.

#### Story 0.5.1: Secure Safety Contact Channel

As a **victim needing to escape**,
I want **a secure way to contact fledgely support that isn't visible in my family account**,
So that **I can get help without alerting my abuser**.

**Acceptance Criteria:**

**Given** a logged-in or logged-out user accesses fledgely
**When** they navigate to the safety contact option (accessible from login screen AND buried in settings)
**Then** a secure contact form is displayed that does NOT log to family audit trail
**And** the form accepts message text and optional safe contact information
**And** submission creates a ticket in support safety queue (not general queue)
**And** no notification is sent to any family members
**And** form submission is encrypted at rest and in transit
**And** the option is visually subtle (not obvious to shoulder-surfer)

#### Story 0.5.2: Safety Request Documentation Upload

As a **victim**,
I want **to securely upload documentation (protection orders, ID, etc.)**,
So that **support can verify my situation and process my request**.

**Acceptance Criteria:**

**Given** a victim has initiated a safety contact
**When** they need to provide supporting documentation
**Then** a secure upload interface accepts PDF, images, and common document formats
**And** documents are stored encrypted in isolated storage (not accessible via family account)
**And** upload size limits accommodate typical legal documents (up to 25MB per file)
**And** upload confirmation is provided without any family notification
**And** documents are retained per legal hold requirements (configurable)
**And** victim can delete their uploaded documents at any time

#### Story 0.5.3: Support Agent Escape Dashboard

As a **support agent with safety-team permissions**,
I want **a secure dashboard to review safety requests and documentation**,
So that **I can process escape requests safely, efficiently, and with full audit**.

**Acceptance Criteria:**

**Given** a support agent with safety-team role
**When** they access the escape dashboard via MFA-protected admin portal
**Then** they see a prioritized list of pending safety requests
**And** they can view submitted documentation inline
**And** they have identity verification checklist (out-of-band phone, ID match, etc.)
**And** all agent actions are logged in admin audit (NOT family audit)
**And** they can add internal notes not visible to any family member
**And** they can escalate to legal/compliance team if needed
**And** dashboard is inaccessible without safety-team role + MFA

#### Story 0.5.4: Parent Access Severing

As a **support agent**,
I want **to sever one parent's access without affecting the other parent or child data**,
So that **victims can be extracted cleanly while preserving family integrity**.

**Acceptance Criteria:**

**Given** a support agent has verified a safety request
**When** they execute account severing for a specific parent
**Then** that parent's access to all family data is immediately revoked
**And** the other parent's access remains completely intact
**And** child profiles and data remain intact
**And** severed parent's authentication credentials are preserved (they can log in, just see nothing)
**And** no notification of any kind is sent about the severing
**And** severing action is logged in sealed admin audit only
**And** severed parent sees "No families found" message (not "You've been removed")

#### Story 0.5.5: Remote Device Unenrollment

As a **support agent**,
I want **to remotely unenroll specific devices from monitoring without notification**,
So that **escaped devices immediately stop reporting to the family**.

**Acceptance Criteria:**

**Given** a support agent is processing an escape request
**When** they request silent unenrollment of specified device(s)
**Then** online devices receive unenrollment command within 60 seconds
**And** devices stop capturing and uploading immediately upon receipt
**And** devices delete local cached screenshots and queue
**And** offline devices are queued for unenrollment on next connection
**And** no notification is sent about unenrollment to any family member
**And** device monitoring indicator changes to "not monitored"
**And** child sees "Device no longer monitored" (neutral message)

#### Story 0.5.6: Location Feature Emergency Disable

As a **support agent**,
I want **to instantly disable all location-revealing features for escaped accounts/devices**,
So that **victims cannot be tracked through fledgely after escape**.

**Acceptance Criteria:**

**Given** a support agent is processing an escape request
**When** they activate location feature disable
**Then** FR139 (location-based rules) is disabled immediately for affected accounts
**And** FR145 (location-based work mode) is disabled immediately
**And** FR160 (new location alerts) is disabled immediately
**And** any pending location-related notifications are deleted (not delivered)
**And** location data collection stops on affected devices within 60 seconds
**And** historical location data is redacted from family-visible logs
**And** no notification is sent about the disable

#### Story 0.5.7: 72-Hour Notification Stealth

As **the system**,
I want **notifications that would reveal an escape action to be suppressed for 72 hours**,
So that **victims have time to reach physical safety**.

**Acceptance Criteria:**

**Given** an escape action has been executed by support
**When** the system would normally generate a notification to the abuser
**Then** the notification is captured and held in a sealed stealth queue
**And** the notification is NOT delivered during the 72-hour window
**And** after 72 hours, escape-related notifications are permanently deleted
**And** the stealth queue is not visible to any family member or in any family audit
**And** critical safety notifications (crisis resource access, mandatory reports) are NOT suppressed
**And** system continues to function normally for non-escaped family members

#### Story 0.5.8: Audit Trail Sealing

As **the system**,
I want **audit trail entries related to escape actions to be sealed from abuser view**,
So that **victims' safety planning isn't revealed through activity logs**.

**Acceptance Criteria:**

**Given** an escape action has been executed
**When** the abuser (remaining family member) views the family audit trail
**Then** entries related to escape actions are not visible
**And** sealed entries are preserved in compliance storage for potential legal needs
**And** sealed entries are accessible only to legal/compliance with documented authorization
**And** the audit trail shows no suspicious gaps (timestamps remain continuous)
**And** sealing extends to any analytics, reports, or exports that could reveal the action
**And** seal persists indefinitely unless legally compelled to unseal

#### Story 0.5.9: Domestic Abuse Resource Referral

As a **victim completing an escape process**,
I want **to receive relevant domestic abuse resources automatically**,
So that **I have immediate access to safety planning help**.

**Acceptance Criteria:**

**Given** a victim's escape process is complete
**When** their account is severed
**Then** they receive an automatic email with domestic abuse resources within 5 minutes
**And** resources include national hotlines (National DV Hotline, Crisis Text Line, etc.)
**And** resources include safety planning guides
**And** resources include legal aid information
**And** the email is sent to the SAFE contact address they provided (not account email)
**And** the email subject line does NOT mention "fledgely" or "escape"
**And** the email includes "If this was sent in error, you can ignore it"

---

### Epic 1: Parent Account Creation & Authentication
**Goal:** Parents can create accounts using Google Sign-In and establish their identity.

**User Outcome:** Parent has a secure account with Google authentication.

**FRs Covered:** FR1, FR101 (accessibility)
**NFRs:** NFR10, NFR11, NFR42 (WCAG 2.1 AA)

#### Story 1.1: Google Sign-In Button & Flow

As a **new parent**,
I want **to sign in with my Google account**,
So that **I can create my fledgely account securely without managing another password**.

**Acceptance Criteria:**

**Given** a visitor lands on the fledgely home/login page
**When** they click the "Sign in with Google" button
**Then** Firebase Auth Google popup/redirect initiates
**And** user can select or enter their Google account
**And** upon successful Google auth, user is redirected to dashboard or onboarding
**And** the sign-in button meets 44x44px minimum touch target (NFR49)
**And** button is visible and operable without JavaScript on initial load (NFR32)
**And** loading indicator displays during authentication

#### Story 1.2: User Profile Creation on First Sign-In

As a **newly authenticated parent**,
I want **my basic profile to be created automatically from my Google account**,
So that **I can start using fledgely immediately without re-entering information**.

**Acceptance Criteria:**

**Given** a user completes Google Sign-In for the first time
**When** authentication succeeds
**Then** a user document is created in Firestore `users/{uid}`
**And** profile includes: uid, email, displayName, photoURL from Google
**And** profile includes: createdAt timestamp, lastLoginAt timestamp
**And** profile validates against userSchema from @fledgely/contracts
**And** user is directed to family creation onboarding (Epic 2)
**And** no family data exists yet (user has account but no family)

#### Story 1.3: Session Persistence & Expiry

As a **returning parent**,
I want **to stay logged in across browser sessions for up to 30 days**,
So that **I don't have to sign in repeatedly on trusted devices**.

**Acceptance Criteria:**

**Given** a parent has successfully signed in
**When** they close and reopen the browser within 30 days
**Then** they remain authenticated without re-signing in
**And** session persists across browser tabs
**And** lastLoginAt is updated on each session resume
**And** after 30 days of inactivity, session expires (NFR11)
**And** expired session redirects to sign-in page with friendly message
**And** Firebase Auth persistence is set to LOCAL (not SESSION or NONE)

#### Story 1.4: Logout Functionality

As a **logged-in parent**,
I want **to securely log out of my account**,
So that **I can protect my account on shared or public devices**.

**Acceptance Criteria:**

**Given** a parent is logged in
**When** they click the logout button (accessible from user menu)
**Then** Firebase Auth session is terminated
**And** local session storage/cookies are cleared
**And** user is redirected to the home/login page
**And** attempting to access protected routes redirects to login
**And** logout works even if network is temporarily unavailable (local clear)
**And** screen reader announces "You have been logged out"

#### Story 1.5: Authentication Error Handling

As a **parent attempting to sign in**,
I want **clear feedback when authentication fails**,
So that **I can understand and resolve the issue**.

**Acceptance Criteria:**

**Given** a parent initiates Google Sign-In
**When** authentication fails (popup closed, network error, account disabled, etc.)
**Then** a user-friendly error message displays (not raw Firebase errors)
**And** error message suggests next steps (try again, check connection, contact support)
**And** error is logged to monitoring (without PII - uid only if available)
**And** user can retry sign-in without page refresh
**And** popup-blocked scenario shows instructions to allow popups
**And** error messages are at 6th-grade reading level (NFR65)

#### Story 1.6: Accessible Authentication Flow

As a **parent using assistive technology**,
I want **the authentication flow to be fully accessible**,
So that **I can create and access my account independently**.

**Acceptance Criteria:**

**Given** a parent using screen reader, keyboard-only, or other assistive technology
**When** they navigate the authentication flow
**Then** all interactive elements are keyboard accessible (NFR43)
**And** focus order follows logical sequence (button → popup → result)
**And** sign-in button has accessible name ("Sign in with Google")
**And** loading states are announced to screen readers ("Signing in, please wait")
**And** success/failure outcomes are announced ("Sign in successful" / "Sign in failed: [reason]")
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** focus indicators are visible on all interactive elements (NFR46)

---

### Epic 2: Family Creation & Child Profiles
**Goal:** Parents can create a family unit and add children with basic profiles.

**User Outcome:** Family exists with children added; each child has their own profile.

**FRs Covered:** FR3, FR6, FR8, FR141, FR151
**NFRs:** NFR42, NFR43, NFR48 (keyboard navigable, accessible)

**Survivor Advocate Addition:**
- **FR-SA4:** Either parent can unilaterally remove THEIR OWN access immediately (no 30-day wait for victim escape) - does not affect other parent's access or child data

#### Story 2.1: Family Creation

As a **new parent with an account**,
I want **to create a family**,
So that **I can begin adding children and setting up monitoring agreements**.

**Acceptance Criteria:**

**Given** a parent has signed in but has no family
**When** they complete the family creation flow
**Then** a family document is created in Firestore `families/{familyId}`
**And** the parent is added as primary guardian with full permissions
**And** family validates against familySchema from @fledgely/contracts
**And** family has unique familyId generated
**And** family creation timestamp is recorded
**And** parent is redirected to add first child

#### Story 2.2: Add Child to Family

As a **parent**,
I want **to add a child to my family with their basic profile**,
So that **I can begin creating an agreement and potentially monitoring their devices**.

**Acceptance Criteria:**

**Given** a parent has an existing family
**When** they add a child with name, birthdate, and optional photo
**Then** a child document is created in Firestore `children/{childId}`
**And** child is linked to family via `familyId`
**And** parent is added as guardian in child's `guardians` array with full permissions
**And** child profile validates against childProfileSchema
**And** age is calculated from birthdate (for age-appropriate defaults)
**And** child can be added without creating an account for them yet
**And** system shows age-appropriate agreement template suggestions (Epic 4)

#### Story 2.3: Custody Arrangement Declaration

As a **parent setting up a family**,
I want **to declare my custody arrangement**,
So that **the system can apply appropriate safeguards for shared custody situations**.

**Acceptance Criteria:**

**Given** a parent is adding a child or editing family settings
**When** they declare custody arrangement (sole, shared, or complex)
**Then** custody type is stored in child document
**And** shared custody triggers Epic 3A safeguards requirement
**And** custody declaration can be updated later (with appropriate verification)
**And** "complex" option allows free-text explanation for blended families
**And** declaration is visible to all guardians of the child
**And** no monitoring can begin until custody is declared

#### Story 2.4: Child Profile Viewing (by Child)

As a **child**,
I want **to view my own profile information**,
So that **I can see what information fledgely has about me (bilateral transparency)**.

**Acceptance Criteria:**

**Given** a child has a fledgely account (created later via invitation)
**When** they access their profile section
**Then** they see their name, age, and profile photo
**And** they see which guardians have access to their data
**And** they see what devices are enrolled under their profile
**And** they see their active agreement summary (Epic 5)
**And** all text is at 6th-grade reading level or below (NFR65)
**And** profile is fully keyboard navigable (NFR43)

#### Story 2.5: Edit Child Profile

As a **parent**,
I want **to edit my child's profile information**,
So that **I can keep their information accurate as they grow**.

**Acceptance Criteria:**

**Given** a parent with guardian permissions for a child
**When** they edit the child's profile (name, photo, birthdate)
**Then** changes are validated against childProfileSchema
**And** changes are saved to Firestore
**And** edit is logged in family audit trail (who, what, when)
**And** other guardians can see the updated information
**And** child (if they have account) can see their updated profile
**And** birthdate changes trigger age recalculation for templates

#### Story 2.6: Remove Child from Family

As a **parent**,
I want **to remove a child from my family with data deletion**,
So that **I can manage family membership when a child no longer needs monitoring**.

**Acceptance Criteria:**

**Given** a parent with guardian permissions for a child
**When** they initiate child removal
**Then** system displays confirmation with data deletion warning
**And** requires re-authentication to confirm
**And** all child data (screenshots, activity, agreements) is permanently deleted
**And** deletion is logged in family audit (child removed, data deleted)
**And** child's account (if exists) is converted to standalone (no family)
**And** all enrolled devices are automatically unenrolled
**And** deletion is irreversible and user must acknowledge this

#### Story 2.7: Family Dissolution Initiation

As a **parent**,
I want **to initiate family dissolution**,
So that **I can properly end the family account when no longer needed**.

**Acceptance Criteria:**

**Given** a parent (any guardian) of a family
**When** they initiate family dissolution
**Then** system explains the dissolution process and data handling options
**And** all guardians are notified of dissolution request
**And** data handling decision is required (delete all, export first, retain X days)
**And** if shared custody, other parent must acknowledge (not approve, just acknowledge)
**And** 30-day cooling period begins before final deletion (unless FR-SA4 applies)
**And** during cooling period, any guardian can cancel dissolution
**And** after 30 days, family and all child data is permanently deleted

#### Story 2.8: Unilateral Self-Removal (Survivor Escape)

As a **parent in an unsafe situation**,
I want **to immediately remove my own access without waiting 30 days**,
So that **I can escape the shared account without my abuser's cooperation**.

**Acceptance Criteria:**

**Given** a parent who needs to escape a family account
**When** they select "Remove myself from this family" with safety confirmation
**Then** their access is immediately revoked (no 30-day wait)
**And** they can no longer see any family data
**And** the other parent's access remains completely intact
**And** child data remains intact
**And** their guardian entry is removed from all children
**And** no notification is sent to other family members about their departure
**And** they see confirmation with domestic abuse resources (links to Epic 0.5)
**And** this action is logged in sealed audit only (not visible to remaining family)

---

### Epic 3: Co-Parent Invitation & Family Sharing
**Goal:** Parents can invite another parent to share family management.

**User Outcome:** Two parents can co-manage the family with equal access.

**FRs Covered:** FR2
**NFRs:** NFR42

**Survivor Advocate Addition:**
- **FR-SA1:** Legal parent can petition for access via identity verification (court order upload, legal documentation) even if not invited by account creator

#### Story 3.1: Co-Parent Invitation Generation

As a **parent with a family**,
I want **to generate an invitation for my co-parent**,
So that **they can join and share family management responsibilities**.

**Acceptance Criteria:**

**Given** a parent has a family with at least one child
**When** they initiate co-parent invitation
**Then** system verifies Epic 3A safeguards are active (blocking if not)
**And** invitation is generated with unique secure token
**And** invitation includes family name and inviting parent's name
**And** invitation has configurable expiry (default 7 days)
**And** only one pending co-parent invitation can exist at a time per family
**And** invitation is stored in Firestore `invitations/{invitationId}`

#### Story 3.2: Invitation Delivery

As a **parent**,
I want **to send the co-parent invitation via email**,
So that **my co-parent receives it and can join the family**.

**Acceptance Criteria:**

**Given** a co-parent invitation has been generated
**When** parent enters co-parent's email address
**Then** invitation email is sent with secure join link
**And** email explains what fledgely is and what joining means
**And** email includes inviting parent's name but not detailed family data
**And** join link is single-use (invalidated after use or expiry)
**And** parent can also copy link to share via other channels (WhatsApp, etc.)
**And** invitation email subject is clear ("Join [Family Name] on fledgely")

#### Story 3.3: Co-Parent Invitation Acceptance

As an **invited co-parent**,
I want **to accept the invitation and join the family**,
So that **I can co-manage our children's digital activity**.

**Acceptance Criteria:**

**Given** a person has received a valid co-parent invitation link
**When** they click the link and sign in with Google (new or existing account)
**Then** they are added as guardian to ALL children in the family
**And** they have identical permissions to the inviting parent (no hierarchy)
**And** their guardian entry includes `role: "parent"` (not "caregiver")
**And** they can immediately see all family data, screenshots, agreements
**And** both parents receive confirmation notification
**And** invitation is marked as used/expired

#### Story 3.4: Equal Access Verification

As a **co-parent who just joined**,
I want **to verify I have equal access to family data**,
So that **I can trust I'm a true co-manager, not a limited user**.

**Acceptance Criteria:**

**Given** a co-parent has accepted an invitation
**When** they access the family dashboard
**Then** they see all children in the family
**And** they see all screenshots across all devices
**And** they can view all agreements
**And** they can propose agreement changes
**And** they can invite caregivers
**And** they CANNOT remove the other parent (shared custody immutability)
**And** dashboard shows "Co-managed by [other parent name]" indicator

#### Story 3.5: Invitation Management

As a **parent**,
I want **to view, resend, or revoke pending invitations**,
So that **I can manage who joins my family**.

**Acceptance Criteria:**

**Given** a parent has generated a co-parent invitation
**When** they access invitation management
**Then** they see pending invitation status (sent, expires in X days)
**And** they can resend the invitation (generates new email, same link)
**And** they can revoke the invitation (invalidates the link)
**And** they see history of past invitations (accepted, expired, revoked)
**And** revoked invitation link shows friendly "invitation no longer valid" message
**And** invitation management is accessible from family settings

#### Story 3.6: Legal Parent Petition for Access

As a **legal parent who was not invited by the account creator**,
I want **to petition for access by submitting court documentation**,
So that **I can access monitoring of my child even if my co-parent won't invite me**.

**Acceptance Criteria:**

**Given** a legal parent discovers their child is being monitored via fledgely
**When** they submit a petition through the support safety channel (Epic 0.5)
**Then** they can upload legal documentation (custody order, birth certificate, etc.)
**And** support reviews documentation to verify legal parental status
**And** if verified, support can add them as co-parent without existing parent's invitation
**And** existing parent is notified of court-ordered access addition
**And** new parent has equal access per Story 3.4
**And** this process is documented for potential disputes
**And** petition is processed within 5 business days

---

### Epic 3A: Shared Custody Safeguards (MOVED FROM PHASE 5)
**Goal:** Protect shared custody families with symmetry enforcement and anti-weaponization guardrails BEFORE co-parent features are usable.

**User Outcome:** Both parents see exactly the same data; cooling periods prevent rule weaponization.

**Rationale:** *Focus Group Finding - "Design for the worst user, not the best." Protections must exist before features that could be abused.*

**FRs Covered:** FR107, FR140
**NFRs:** NFR42

**War Room Adjustment:** FR139 (location-based rules) and FR145 (location-based work mode) deferred - requires device location data not available until platform agents are deployed. These remain in Phase 5.

**Red Team Addition:**
- **FR3A-X:** Alert when single parent views >50 screenshots/hour (prevents screenshot-bombing during custody disputes)

**Dependencies:** Epic 3 (co-parent invitation) requires Epic 3A to be complete before invitations can be sent.

#### Story 3A.1: Data Symmetry Enforcement

As a **co-parent**,
I want **to see exactly the same data as my co-parent sees**,
So that **neither parent has an information advantage in custody situations**.

**Acceptance Criteria:**

**Given** two parents are guardians of the same child
**When** either parent views screenshots, activity, or any child data
**Then** both parents see identical data with identical timestamps
**And** no data is filtered, delayed, or modified based on which parent is viewing
**And** Firestore Security Rules enforce read equality (both or neither)
**And** viewing timestamps are logged per-parent in audit trail
**And** any new data is visible to both parents simultaneously (no "first viewer" advantage)
**And** if one parent's access is revoked, data becomes inaccessible to both until resolved

#### Story 3A.2: Safety Settings Two-Parent Approval

As a **parent in shared custody**,
I want **safety-related setting changes to require both parents' approval**,
So that **one parent cannot unilaterally weaken protections**.

**Acceptance Criteria:**

**Given** a shared custody family with two parent guardians
**When** either parent attempts to change safety-related settings (monitoring intervals, retention periods, age restrictions)
**Then** the change is proposed, not immediately applied
**And** other parent receives notification of proposed change
**And** proposed change shows what will change and current vs proposed values
**And** other parent must approve within 72 hours or change expires
**And** if declined, proposing parent receives decline notification with optional message
**And** declined changes can be re-proposed after 7 days
**And** emergency safety increases (more restrictive) take effect immediately, subject to 48-hour review

#### Story 3A.3: Agreement Changes Two-Parent Approval

As a **parent in shared custody**,
I want **family agreement changes to require both parents' approval**,
So that **agreements reflect joint parenting decisions**.

**Acceptance Criteria:**

**Given** a shared custody family with an active agreement
**When** either parent proposes agreement changes
**Then** changes enter pending state requiring other parent approval
**And** child cannot sign until both parents have approved
**And** pending changes are visible to all family members
**And** other parent can approve, decline, or propose modifications
**And** modifications restart the approval process
**And** changes expire after 14 days if not approved
**And** original agreement remains active until new version is signed by all parties

#### Story 3A.4: Safety Rule 48-Hour Cooling Period

As a **child in shared custody**,
I want **safety rule changes to have a cooling period**,
So that **I'm protected from impulsive rule changes during parental conflict**.

**Acceptance Criteria:**

**Given** two parents have approved a safety rule change
**When** the change would reduce protections (less monitoring, longer screen time, etc.)
**Then** change enters 48-hour cooling period before taking effect
**And** child and both parents are notified of pending change
**And** child can see countdown to when change takes effect
**And** either parent can cancel during cooling period (returns to previous setting)
**And** protection increases (more monitoring, less screen time) take effect immediately (no cooling)
**And** cooling period cannot be bypassed, even with both parents requesting immediate effect

#### Story 3A.5: Screenshot Viewing Rate Alert

As a **co-parent**,
I want **to be alerted if my co-parent views screenshots excessively**,
So that **I'm aware of potential monitoring weaponization during custody disputes**.

**Acceptance Criteria:**

**Given** a shared custody family with screenshots captured
**When** one parent views more than 50 screenshots within one hour
**Then** other parent receives alert notification (not the child)
**And** alert shows count and timeframe but NOT which screenshots
**And** alert is informational only (no action required)
**And** alert does not block continued viewing (we're not preventing, just informing)
**And** viewing rate is logged in audit trail with timestamps
**And** rate threshold (50/hour) is not user-configurable (prevents gaming)
**And** child is NOT notified of excessive viewing (prevent triangulation)

#### Story 3A.6: Co-Parent Removal Prevention

As a **parent in shared custody**,
I want **to be protected from being removed from the family by my co-parent**,
So that **I maintain access to my child's monitoring regardless of co-parent relationship**.

**Acceptance Criteria:**

**Given** a shared custody family with two parent guardians
**When** either parent attempts to remove the other parent
**Then** removal is blocked with explanation of shared custody immutability
**And** system explains separation flow options (Epic 2, Story 2.7)
**And** legal documentation path is referenced (Epic 3, Story 3.6)
**And** neither parent can downgrade other parent to caregiver role
**And** family cannot be dissolved without both parents acknowledging
**And** court order is the only path to forcibly remove a verified legal parent
**And** attempted removals are logged in admin audit (potential abuse signal)

---

### Epic 4: Agreement Templates & Quick Start
**Goal:** System provides age-appropriate agreement templates for fast onboarding.

**User Outcome:** Parents can start from a template instead of building from scratch.

**FRs Covered:** FR106
**NFRs:** NFR59 (10-minute first draft), NFR42, NFR48

#### Story 4.1: Template Library Structure

As a **parent**,
I want **to browse a library of pre-built agreement templates organized by child age**,
So that **I can quickly find an appropriate starting point for our family agreement**.

**Acceptance Criteria:**

**Given** a parent is creating or editing an agreement for a child
**When** they access the template library
**Then** templates are organized by age groups (5-7, 8-10, 11-13, 14-16)
**And** each age group shows 2-3 template variations (strict, balanced, permissive)
**And** templates display preview summary (screen time limits, monitoring level, key rules)
**And** parent can search/filter templates by specific concerns (gaming, social media, homework)
**And** template cards are keyboard navigable (NFR43)
**And** templates load within 1 second (NFR29)

#### Story 4.2: Age-Appropriate Template Content

As a **parent**,
I want **templates to have age-appropriate language and rules**,
So that **the agreement makes sense to my child and fits their developmental stage**.

**Acceptance Criteria:**

**Given** a parent selects a template for a specific age group
**When** template content is displayed
**Then** language complexity matches the child's age (6th-grade max per NFR65)
**And** screen time defaults are age-appropriate (younger = less, older = more)
**And** monitoring intensity defaults decrease with age (younger = more)
**And** rule explanations use examples relevant to that age group
**And** templates for 14-16 include earned autonomy milestones (per Reverse Mode path)
**And** templates for 5-7 emphasize visual elements and simple yes/no rules

#### Story 4.3: Template Preview & Selection

As a **parent**,
I want **to preview a template before using it**,
So that **I can ensure it fits our family's values before showing it to my child**.

**Acceptance Criteria:**

**Given** a parent browses the template library
**When** they click on a template card
**Then** full template preview displays in a modal/drawer
**And** preview shows all sections: screen time, monitoring, apps, websites, consequences
**And** preview highlights which items can be customized
**And** "Use This Template" button starts the agreement co-creation flow (Epic 5)
**And** "Compare Templates" allows side-by-side view of 2-3 templates
**And** preview is screen reader accessible with proper heading structure

#### Story 4.4: Quick Start Wizard

As a **parent new to fledgely**,
I want **a guided quick start that helps me create my first agreement in under 10 minutes**,
So that **I don't feel overwhelmed and can start protecting my child quickly**.

**Acceptance Criteria:**

**Given** a parent has added their first child (Epic 2) and needs to create an agreement
**When** they start the quick start wizard
**Then** wizard asks child's age and pre-selects appropriate template
**And** wizard presents 3-5 key decisions (screen time, bedtime cutoff, monitoring level)
**And** defaults are pre-populated from template (parent can adjust or accept)
**And** wizard uses progress indicator showing time remaining
**And** wizard can be completed in under 10 minutes with defaults (NFR59)
**And** wizard ends with agreement preview before proceeding to co-creation (Epic 5)

#### Story 4.5: Template Customization Preview

As a **parent**,
I want **to customize a template before co-creating with my child**,
So that **I can prepare my suggested changes without starting from scratch**.

**Acceptance Criteria:**

**Given** a parent has selected a template
**When** they choose to customize before co-creation
**Then** they can modify any template field (screen time, rules, monitoring)
**And** changes are highlighted compared to original template
**And** they can add custom rules not in template
**And** they can remove template rules they don't want
**And** customized template is saved as "draft" for this child
**And** draft persists until co-creation begins
**And** parent can revert to original template at any time

#### Story 4.6: Template Accessibility

As a **parent using assistive technology**,
I want **templates to be fully accessible**,
So that **I can browse and select templates independently**.

**Acceptance Criteria:**

**Given** a parent using screen reader, keyboard-only, or other assistive technology
**When** they browse the template library
**Then** all templates have descriptive alt text and labels
**And** template cards are in proper landmark regions
**And** keyboard focus is visible and logical (NFR46)
**And** age group filters are accessible dropdowns/radios
**And** template preview modal traps focus correctly
**And** all interactive elements meet 44x44px minimum target (NFR49)
**And** color contrast meets 4.5:1 minimum throughout (NFR45)

---

### Epic 5: Basic Agreement Co-Creation
**Goal:** Parents and children can create their first family digital agreement together.

**User Outcome:** Family has a draft agreement with terms defined by both parties.

**FRs Covered:** FR18, FR22, FR105, FR161
**NFRs:** NFR60 (100 conditions), NFR42, NFR65 (6th-grade reading level)

#### Story 5.1: Co-Creation Session Initiation

As a **parent**,
I want **to start an agreement co-creation session with my child**,
So that **we can build our digital agreement together as a family activity**.

**Acceptance Criteria:**

**Given** a parent has a draft or template ready (from Epic 4)
**When** they initiate co-creation session
**Then** system prompts to ensure child is present ("Sit together for this conversation")
**And** session creates a unique co-creation document in Firestore
**And** session tracks which party (parent/child) made each contribution
**And** session can be paused and resumed later (saves progress)
**And** both parent and child can see the same screen (designed for screen sharing)
**And** session timeout warns after 30 minutes of inactivity

#### Story 5.2: Visual Agreement Builder

As a **parent and child together**,
I want **to build our agreement using a visual interface**,
So that **my child can understand and participate meaningfully**.

**Acceptance Criteria:**

**Given** a co-creation session is active
**When** parent and child use the agreement builder
**Then** interface uses visual cards/blocks for each agreement term
**And** drag-and-drop reordering is supported for prioritization
**And** each term has child-friendly explanation tooltip (6th-grade reading level)
**And** visual indicators show which terms are parent-suggested vs child-suggested
**And** color coding distinguishes term categories (time, apps, monitoring, rewards)
**And** builder validates against agreementSchema from @fledgely/contracts
**And** maximum 100 conditions enforced with friendly message (NFR60)

#### Story 5.3: Child Contribution Capture

As a **child**,
I want **to suggest my own terms and modifications**,
So that **the agreement reflects my voice, not just my parent's rules**.

**Acceptance Criteria:**

**Given** a co-creation session is active
**When** child wants to add or modify a term
**Then** child can propose new terms using simplified input form
**And** child can mark parent terms they agree with, question, or want to discuss
**And** child suggestions are visually distinct (different color/icon)
**And** child can use voice input or emoji reactions where typing is difficult
**And** all child contributions are attributed to them in the agreement history
**And** parent cannot delete child contributions (only negotiate changes)

#### Story 5.4: Negotiation & Discussion Support

As a **family**,
I want **the system to facilitate discussion about disagreements**,
So that **we can reach consensus on difficult terms**.

**Acceptance Criteria:**

**Given** parent and child have different views on an agreement term
**When** a term is marked as "needs discussion"
**Then** system provides discussion prompts ("Why is this important to you?")
**And** both parties can add notes/comments to the term
**And** compromise suggestions appear for common disagreements (e.g., "Try 30 minutes less?")
**And** term can be marked "resolved" only when both parties agree
**And** unresolved terms are highlighted in final review
**And** agreement cannot proceed to signing with unresolved terms

#### Story 5.5: Agreement Preview & Summary

As a **parent and child**,
I want **to review the complete agreement before signing**,
So that **we both understand exactly what we're agreeing to**.

**Acceptance Criteria:**

**Given** all agreement terms are resolved
**When** family views the preview
**Then** agreement displays in final format with all terms listed
**And** each party's contributions are shown with attribution
**And** plain-language summary explains key commitments for each party
**And** estimated daily/weekly impact is shown (e.g., "2 hours screen time per day")
**And** both parties must scroll through entire agreement (anti-TLDR measure)
**And** preview generates shareable format (PDF download option)
**And** preview highlights what's different from template (if used)

#### Story 5.6: Agreement-Only Mode Selection

As a **parent**,
I want **to choose agreement-only mode without device monitoring**,
So that **we can establish digital expectations without surveillance**.

**Acceptance Criteria:**

**Given** a family is creating an agreement
**When** parent selects "Agreement Only" mode during co-creation
**Then** monitoring-related terms are removed from the agreement builder
**And** agreement focuses on: screen time commitments, app expectations, family rules
**And** no device enrollment is required or suggested
**And** agreement is still signable and trackable
**And** family can upgrade to full monitoring later without re-creating agreement
**And** mode selection is clearly explained (what's included vs excluded)

#### Story 5.7: Draft Saving & Version History

As a **family**,
I want **our work-in-progress to be saved automatically**,
So that **we don't lose our discussion if we need to take a break**.

**Acceptance Criteria:**

**Given** a co-creation session is active
**When** changes are made to the agreement
**Then** changes auto-save every 30 seconds
**And** manual save button is also available
**And** version history tracks major milestones (initial draft, child additions, negotiations)
**And** family can restore previous versions if needed
**And** draft persists for 30 days if abandoned
**And** notification reminds family after 7 days of inactivity

#### Story 5.8: Child Agreement Viewing

As a **child**,
I want **to view my active agreement at any time**,
So that **I always know what I agreed to and can reference the rules**.

**Acceptance Criteria:**

**Given** a child has an active agreement
**When** they access their agreement view
**Then** they see full agreement in child-friendly format
**And** terms are organized by category with visual icons
**And** their own contributions are highlighted
**And** current status shows (how much screen time used today, etc.)
**And** view is read-only (changes require new co-creation session)
**And** view includes "I have a question about this" button (links to parent)
**And** all text is at 6th-grade reading level (NFR65)

---

### Epic 6: Agreement Signing & Activation
**Goal:** Both parent and child digitally sign the agreement, activating it.

**User Outcome:** Agreement is signed, active, and visible to both parties.

**FRs Covered:** FR19, FR20, FR21, FR26
**NFRs:** NFR42, NFR47 (screen reader announcements)

#### Story 6.1: Child Digital Signature Ceremony

As a **child**,
I want **to sign the agreement in a meaningful ceremony**,
So that **my consent feels real and respected, not just a checkbox**.

**Acceptance Criteria:**

**Given** an agreement is ready for signing (previewed and approved)
**When** child initiates their signature
**Then** system displays child-appropriate signing ceremony screen
**And** child must enter their name (typed) or draw signature (touch)
**And** child must check "I understand and agree" checkbox
**And** system reads aloud key commitments before signature (accessibility)
**And** signature timestamp is recorded in agreement document
**And** celebratory animation/feedback confirms signing ("You signed!")
**And** child cannot sign before parent (prevents coercion pressure)

#### Story 6.2: Parent Digital Signature

As a **parent**,
I want **to sign the agreement after my child**,
So that **my commitment is visible and we're both bound equally**.

**Acceptance Criteria:**

**Given** child has signed the agreement
**When** parent initiates their signature
**Then** system shows what child agreed to (transparency)
**And** parent must enter their name or draw signature
**And** parent must acknowledge their commitments (not just child's)
**And** if shared custody, BOTH parents must sign (Epic 3A dependency)
**And** signature timestamp is recorded
**And** system cannot proceed without all required signatures
**And** parent signature completes the signing ceremony

#### Story 6.3: Agreement Activation

As a **family**,
I want **the agreement to become active immediately upon all signatures**,
So that **we can begin our new digital arrangement right away**.

**Acceptance Criteria:**

**Given** all required parties have signed (child + parent(s))
**When** final signature is submitted
**Then** agreement status changes to "active" in Firestore
**And** agreement version number is assigned (v1.0)
**And** activation timestamp is recorded
**And** both/all parties receive confirmation notification
**And** dashboard updates to show active agreement summary
**And** agreement becomes the governing document for all monitoring
**And** previous agreements (if any) are archived, not deleted

#### Story 6.4: Signing Ceremony Celebration

As a **family**,
I want **a celebration moment when we complete our agreement**,
So that **this feels like a positive milestone, not a chore**.

**Acceptance Criteria:**

**Given** agreement activation is complete
**When** ceremony completion screen displays
**Then** visual celebration appears (confetti, animation, or similar)
**And** message emphasizes partnership ("You did this together!")
**And** family can share/download their signed agreement
**And** optional photo moment is suggested (screenshot memory)
**And** next steps are clearly shown (device enrollment or agreement-only path)
**And** celebration is accessible (not dependent on animations only)
**And** screen reader announces "Congratulations! Your family agreement is now active."

#### Story 6.5: Device Consent Gate

As a **child**,
I want **devices to require my active consent before monitoring begins**,
So that **I know monitoring is something I agreed to, not something done to me**.

**Acceptance Criteria:**

**Given** a device is enrolled for monitoring (Epic 9+)
**When** the device attempts to begin monitoring
**Then** device checks for active, signed agreement with child consent
**And** if no valid agreement exists, monitoring does NOT start
**And** device displays "Waiting for family agreement" message
**And** parent is notified that device is pending consent
**And** device remains functional for basic use (not bricked)
**And** monitoring begins automatically once valid agreement exists
**And** child cannot be excluded from consent requirement (non-negotiable)

#### Story 6.6: Consent Withdrawal Handling

As a **child**,
I want **to understand what happens if I withdraw consent**,
So that **I know this is a real choice with real consequences**.

**Acceptance Criteria:**

**Given** a child with an active agreement
**When** they view consent withdrawal options
**Then** system explains consequences clearly (device monitoring stops)
**And** system explains device status (becomes unmonitored, not inoperable)
**And** withdrawal requires confirmation step (not one-click)
**And** parent is immediately notified of withdrawal request
**And** 24-hour cooling period before withdrawal takes effect
**And** during cooling period, family can discuss and potentially resolve
**And** if withdrawal proceeds, all monitoring stops on child's devices

#### Story 6.7: Signature Accessibility

As a **family member using assistive technology**,
I want **the signing process to be fully accessible**,
So that **disability doesn't prevent participation in family agreements**.

**Acceptance Criteria:**

**Given** a user with visual, motor, or cognitive accessibility needs
**When** they participate in the signing ceremony
**Then** all signing steps are keyboard navigable
**And** signature can be typed (not just drawn) for motor accessibility
**And** screen reader announces each step and confirmation
**And** focus management is correct through the ceremony flow
**And** ceremony can be completed without time pressure
**And** confirmation dialogs have accessible focus trapping
**And** celebration screen is announced, not just visual

---

### Epic 7: Crisis Allowlist Foundation
**Goal:** System maintains and distributes the crisis resource allowlist with emergency update capability.

**User Outcome:** Crisis resources are protected from any monitoring, with allowlist visible to children.

**FRs Covered:** FR61, FR62, FR63, FR65, FR66
**NFRs:** NFR28 (cached locally), NFR42

**Pre-mortem Additions:**
- **FR7A:** Emergency allowlist push mechanism (< 1 hour for critical additions)
- **FR7B:** Fuzzy domain matching for crisis resources (trevorproject.org ≈ thetrevoproject.org)

**Red Team Addition:**
- **NFR-CR:** Cross-platform crisis allowlist integration tests required before any platform ships (prevents parallel track implementation drift)

**Survivor Advocate Addition:**
- **FR-SA2:** "Privacy gaps" option - inject plausible random gaps in ALL screenshot streams so crisis-related gaps don't stand out (prevents negative inference attacks)

#### Story 7.1: Crisis Allowlist Data Structure

As **the system**,
I want **a maintainable allowlist of crisis resources**,
So that **these resources can be protected across all platforms consistently**.

**Acceptance Criteria:**

**Given** fledgely needs to protect crisis resources
**When** the allowlist is structured
**Then** allowlist is stored in `@fledgely/shared/constants/crisis-urls`
**And** each entry includes: domain, category (suicide, abuse, crisis, LGBTQ+, etc.), aliases
**And** allowlist supports wildcard patterns (*.thetrevoproject.org)
**And** allowlist is versioned with timestamp for sync verification
**And** bundled copy exists for each platform (TypeScript, Android assets, iOS resources)
**And** allowlist is human-readable JSON for auditing
**And** initial list includes: National Suicide Prevention, Crisis Text Line, RAINN, Trevor Project, Childhelp, National DV Hotline, and regional equivalents

#### Story 7.2: Crisis Visit Zero-Data-Path

As a **child visiting a crisis resource**,
I want **no trace of my visit to exist anywhere in fledgely**,
So that **I can seek help without fear of being discovered**.

**Acceptance Criteria:**

**Given** a child's device has monitoring active
**When** child navigates to an allowlisted crisis URL
**Then** NO screenshot is captured during the visit
**And** NO URL is logged to activity history
**And** NO time is counted against any category
**And** NO notification is generated for parents
**And** NO analytics event is recorded
**And** check happens BEFORE any capture attempt (synchronous blocking)
**And** network timeout falls back to cached allowlist (fail-safe to protection)

#### Story 7.3: Child Allowlist Visibility

As a **child**,
I want **to see exactly which resources are protected**,
So that **I know where I can go safely without worry**.

**Acceptance Criteria:**

**Given** a child with a fledgely account
**When** they access the protected resources section
**Then** full allowlist is displayed organized by category
**And** each resource shows name, what it helps with, and that it's "always private"
**And** resources are clickable links (easy access)
**And** explanation text is at 6th-grade reading level
**And** view is accessible without parent knowledge (no notification of viewing)
**And** "These sites are NEVER seen by your parents" message is prominent

#### Story 7.4: Emergency Allowlist Push

As **the fledgely operations team**,
I want **to push allowlist updates within 1 hour for emergencies**,
So that **new crisis resources are protected immediately when identified**.

**Acceptance Criteria:**

**Given** a new crisis resource needs immediate protection
**When** operations triggers emergency push
**Then** update is pushed to API within 30 minutes
**And** online devices receive update within 1 hour
**And** offline devices receive update on next sync
**And** push includes reason for addition (audit trail)
**And** push does not require app update (dynamic fetch)
**And** emergency push path is separate from normal release cycle
**And** push success is verified via monitoring dashboard

#### Story 7.5: Fuzzy Domain Matching

As **the system**,
I want **to match crisis resources even with typos or variations**,
So that **protection isn't defeated by URL variations**.

**Acceptance Criteria:**

**Given** a child navigates to a URL
**When** allowlist check is performed
**Then** exact domain matches are protected (thetrevoproject.org)
**And** subdomain variations are protected (www.thetrevoproject.org, help.thetrevoproject.org)
**And** common typos are protected (trevorproject.org ≈ thetrevoproject.org)
**And** fuzzy matching uses Levenshtein distance ≤2 for known domains
**And** fuzzy matching does NOT create false positives on unrelated domains
**And** fuzzy matches are logged to allowlist improvement queue (not family logs)

#### Story 7.6: Crisis Search Redirection

As a **child searching for crisis help**,
I want **searches for help to guide me to protected resources**,
So that **I find real help, not dangerous alternatives**.

**Acceptance Criteria:**

**Given** a child's device has monitoring active
**When** child searches terms indicating crisis (suicide, abuse, self-harm keywords)
**Then** system recognizes crisis-related search intent
**And** gentle redirect suggests allowlisted resources ("These resources can help")
**And** redirect is optional, not forced (child can continue to search results)
**And** redirect action itself is NOT logged to parents
**And** redirect appears before search results load (interstitial)
**And** redirect is age-appropriate and non-alarming in tone

#### Story 7.7: Allowlist Distribution & Sync

As **the system**,
I want **all platforms to have synchronized allowlists**,
So that **protection is consistent regardless of device type**.

**Acceptance Criteria:**

**Given** fledgely operates on multiple platforms (web, Chrome, Android, iOS)
**When** allowlist sync occurs
**Then** each platform fetches from `GET /api/crisis-allowlist`
**And** sync uses 24-hour TTL with forced refresh on app launch
**And** if sync fails, cached version is used (never empty)
**And** version mismatch triggers immediate re-sync
**And** platform-specific bundled copies serve as ultimate fallback
**And** sync status is monitored (alerts if any platform >48h stale)

#### Story 7.8: Privacy Gaps Injection

As a **child who visits crisis resources**,
I want **normal screenshot gaps to exist for all users**,
So that **my crisis-related gaps don't reveal that I sought help**.

**Acceptance Criteria:**

**Given** monitoring is active for any child
**When** screenshots are captured over time
**Then** random plausible gaps are injected in ALL screenshot streams (not just crisis visitors)
**And** gaps occur at irregular intervals (5-15 minute windows, 2-4 times daily)
**And** gaps appear as normal monitoring pauses (no special marker)
**And** gap pattern is randomized per-child to prevent detection
**And** crisis-related gaps blend seamlessly with injected gaps
**And** parents cannot distinguish real crisis visits from random gaps
**And** this feature is enabled by default (opt-out only for specific circumstances)

#### Story 7.9: Cross-Platform Allowlist Testing

As **the development team**,
I want **automated integration tests verifying allowlist behavior on all platforms**,
So that **no platform ships with broken crisis protection**.

**Acceptance Criteria:**

**Given** any platform agent is being deployed
**When** CI/CD pipeline runs
**Then** integration tests verify allowlist is present and parseable
**And** tests verify known crisis URLs trigger zero-data-path
**And** tests verify fuzzy matching works correctly
**And** tests verify fallback to bundled allowlist on network failure
**And** tests run against Firebase Emulators (not production)
**And** deployment is BLOCKED if any allowlist test fails
**And** test results are included in deployment artifacts

---

### Epic 7.5: Child Safety Signal (NEW - Survivor Advocate)
**Goal:** Provide children a safe way to signal distress that goes to EXTERNAL resources, not to either parent.

**User Outcome:** A child who feels unsafe can trigger a confidential signal that reaches trained professionals, not the potentially abusive parent.

**Rationale:** *Survivor Advocate Finding - "If a child flags 'I feel unsafe,' does the ABUSIVE PARENT see this flag? If yes, you've just told the abuser their child reported them."*

**Features:**
- Hidden "I feel unsafe" gesture/code accessible from any fledgely screen
- Signal goes to external trained resource (crisis line partnership), NOT to either parent
- Option for mandatory reporter referral if abuse indicators present
- Child receives confirmation signal was received + resources
- NO notification to ANY family member for 48 hours minimum
- If safe adult identified by child, option to notify them instead of parents
- All safety signals encrypted and inaccessible to family account

**FRs Covered:** None (new safety capability - extends architecture's "I feel unsafe" concept)
**NFRs:** NFR42, NFR65 (child-appropriate language)

**Integration:** Extends FR156 (abuse reporting mechanism) to child-initiated signals.

#### Story 7.5.1: Hidden Safety Signal Access

As a **child in distress**,
I want **a hidden but accessible way to signal that I need help**,
So that **I can reach out even if someone is watching my screen**.

**Acceptance Criteria:**

**Given** a child is using any fledgely screen (app, dashboard, or monitored browser)
**When** they need to signal for help
**Then** a hidden gesture/code is available (e.g., tap logo 5x, swipe pattern, keyboard shortcut)
**And** gesture is documented in child's protected resources view (Epic 7.3)
**And** gesture does not trigger any visible UI change to casual observer
**And** gesture works offline (queues signal for delivery)
**And** gesture cannot be accidentally triggered (requires intentional pattern)
**And** gesture is consistent across all platforms

#### Story 7.5.2: External Signal Routing

As a **child who triggers a safety signal**,
I want **my signal to go to trained external resources, not my parents**,
So that **I get help even if my parents are the source of danger**.

**Acceptance Criteria:**

**Given** a child triggers the safety signal
**When** signal is processed
**Then** signal is routed to external crisis partnership (NOT fledgely support)
**And** signal includes: child's age, signal timestamp, family structure (shared custody flag)
**And** signal does NOT include: screenshots, activity data, or parent contact info
**And** signal is encrypted in transit and at rest
**And** no notification goes to ANY family member for minimum 48 hours
**And** routing is to jurisdiction-appropriate resource when possible

#### Story 7.5.3: Signal Confirmation & Resources

As a **child who triggered a safety signal**,
I want **confirmation that my signal was received and immediate resources**,
So that **I know help is coming and have something to do while I wait**.

**Acceptance Criteria:**

**Given** a child has triggered a safety signal
**When** signal is sent (or queued if offline)
**Then** child sees discrete confirmation ("Someone will reach out")
**And** confirmation shows crisis resources with direct links/numbers
**And** confirmation is dismissible and doesn't persist visibly
**And** if child has chat capability, immediate crisis chat option appears
**And** confirmation includes "If in immediate danger, call 911" message
**And** all confirmation UI is child-appropriate language (6th-grade level)

#### Story 7.5.4: Safe Adult Designation

As a **child**,
I want **to optionally designate a safe adult who can be notified instead of parents**,
So that **someone I trust knows I need help**.

**Acceptance Criteria:**

**Given** a child has triggered a safety signal
**When** they optionally choose to notify a safe adult
**Then** they can enter a phone number or email for the safe adult
**And** safe adult receives message: "[Child name] needs help. Please reach out."
**And** message does NOT mention fledgely or monitoring details
**And** safe adult designation is stored encrypted, inaccessible to parents
**And** child can pre-configure a safe adult before crisis (optional)
**And** if no safe adult designated, signal goes only to external resource

#### Story 7.5.5: Mandatory Reporter Pathway

As **the system**,
I want **to support mandatory reporter referral when abuse indicators are present**,
So that **children in serious danger get appropriate intervention**.

**Acceptance Criteria:**

**Given** a child safety signal is received by external partner
**When** trained professional assesses indicators of serious abuse
**Then** mandatory reporting pathway is available per partner's protocols
**And** fledgely provides partner with family jurisdiction info (state/country)
**And** fledgely does NOT make mandatory reports directly (partner responsibility)
**And** no notification goes to family about mandatory report
**And** audit trail of signal is sealed from family account access
**And** fledgely cooperates with law enforcement per documented legal process only

#### Story 7.5.6: Signal Encryption & Isolation

As a **child**,
I want **my safety signals to be completely inaccessible to my family account**,
So that **no one in my family can ever see that I asked for help**.

**Acceptance Criteria:**

**Given** a child triggers a safety signal
**When** signal is stored and transmitted
**Then** signal is stored in isolated collection (not under family document)
**And** signal uses separate encryption key (not family key)
**And** no Firestore Security Rule allows family member read access
**And** signal does not appear in ANY family audit trail
**And** admin access requires legal/compliance authorization
**And** signals are retained per child protection legal requirements

#### Story 7.5.7: 48-Hour Family Notification Blackout

As a **child who signaled for help**,
I want **my family not to know I asked for help for at least 48 hours**,
So that **I have time to get safe or for professionals to intervene**.

**Acceptance Criteria:**

**Given** a safety signal has been triggered
**When** 48 hours have not yet passed
**Then** NO notification of any kind goes to any family member
**And** family audit trail shows no unusual entries
**And** child's normal activity continues to appear in monitoring (no gap)
**And** 48-hour window can be extended by external partner if needed
**And** after 48 hours, standard privacy gaps (Epic 7.8) mask the signal period
**And** countdown is not visible to child (prevents anxiety)

---

### Epic 8: Data Isolation & Security Foundation
**Goal:** Firebase Security Rules enforce family-level data isolation and negative capabilities.

**User Outcome:** Families cannot access each other's data; roles enforce correct permissions.

**FRs Covered:** FR112, FR114, FR126, FR127, FR128, FR131, FR132, FR134, FR138, FR146, FR159
**NFRs:** NFR13, NFR14, NFR85

**Red Team Addition:**
- **FR134** (moved from Epic 36) - Adult pattern detection as security foundation, not behavioral analysis. Detects when enrolled "child" exhibits adult usage patterns within first 7 days.

#### Story 8.1: Family Data Isolation Rules

As a **family**,
I want **my family's data to be completely isolated from other families**,
So that **no one outside my family can ever access our information**.

**Acceptance Criteria:**

**Given** Firestore Security Rules are deployed
**When** any user attempts to access data
**Then** users can only read/write documents where they are listed as guardian or child
**And** family documents require `familyId` match to user's family membership
**And** cross-family queries return empty results (not errors)
**And** Security Rules are tested with adversarial test suite (NFR85)
**And** rules prevent any path traversal or ID guessing attacks
**And** rule violations are logged to security monitoring

#### Story 8.2: Sibling Data Isolation

As a **parent with multiple children**,
I want **each child's data to be isolated from their siblings**,
So that **children cannot see each other's screenshots or activity**.

**Acceptance Criteria:**

**Given** a family has multiple children
**When** a child accesses their dashboard
**Then** they see ONLY their own screenshots, activity, and agreements
**And** they cannot query or access sibling data via any path
**And** parent dashboard shows all children (with proper toggle/filter)
**And** sibling isolation is enforced at Security Rules level, not just UI
**And** shared family data (agreements, settings) remains accessible to all
**And** isolation prevents even accidental sibling data exposure

#### Story 8.3: Child Permission Boundaries

As **the system**,
I want **child accounts to have strictly limited permissions**,
So that **children can view but not modify most family settings**.

**Acceptance Criteria:**

**Given** a child is authenticated
**When** they attempt various operations
**Then** they CAN read: their profile, their screenshots, their agreements, their activity
**And** they CAN write: their annotations on flagged content, their signature
**And** they CANNOT write: family settings, other profiles, agreement terms
**And** they CANNOT delete: any data except their own annotations
**And** they CANNOT invite: other family members or caregivers
**And** permission boundaries are enforced in Security Rules (not just UI)

#### Story 8.4: Negative Capability - No Third-Party Sharing

As a **family**,
I want **a guarantee that fledgely will never share my data with third parties**,
So that **I can trust my family's information stays private**.

**Acceptance Criteria:**

**Given** fledgely's data architecture
**When** data flows are audited
**Then** no API endpoints exist that export data to third parties
**And** no data pipeline sends identifiable data outside fledgely infrastructure
**And** cloud AI (Gemini) receives only temporary, non-identifiable screenshot data
**And** no advertising SDKs are included in any client
**And** privacy policy explicitly commits to no third-party sharing
**And** architecture documentation confirms negative capability

#### Story 8.5: Negative Capability - No Advertising Use

As a **family**,
I want **a guarantee that my data will never be used for advertising**,
So that **my children's activity doesn't become ad targeting data**.

**Acceptance Criteria:**

**Given** fledgely's data architecture
**When** data use is audited
**Then** no advertising identifiers are collected or stored
**And** no user profiles are built for advertising purposes
**And** no data is shared with ad networks
**And** ToS explicitly prohibits advertising use of data
**And** no revenue model depends on advertising
**And** architecture prevents future advertising integration without major refactor

#### Story 8.6: Negative Capability - No Identifiable AI Training

As a **family**,
I want **my screenshots not to be used for AI training with identifiable data**,
So that **my family's private moments don't train public models**.

**Acceptance Criteria:**

**Given** fledgely uses AI for classification
**When** AI processing occurs
**Then** screenshots are processed and immediately discarded (not stored for training)
**And** any training data is fully anonymized before use
**And** no child-identifiable images are retained for model training
**And** family can opt-out of any anonymized contribution
**And** privacy policy clearly explains AI data handling
**And** on-device AI (when available) eliminates cloud data exposure

#### Story 8.7: VPN Detection & Transparency

As a **parent**,
I want **to know when my child is using a VPN that might bypass monitoring**,
So that **I can have a conversation about transparency**.

**Acceptance Criteria:**

**Given** monitoring is active on a child's device
**When** VPN or proxy usage is detected
**Then** parent receives notification that VPN was detected
**And** child also sees that VPN was detected (bilateral transparency)
**And** monitoring continues to function (VPN doesn't fully bypass)
**And** notification is informational, not accusatory ("VPN detected - monitoring may be limited")
**And** detection uses network characteristics (not deep packet inspection)
**And** some privacy-focused VPNs may not be detected (acknowledged limitation)

#### Story 8.8: Encrypted Traffic Display

As a **parent**,
I want **transparency about what monitoring can and cannot see**,
So that **I understand the limitations of screenshot-based monitoring**.

**Acceptance Criteria:**

**Given** monitoring is active
**When** parent views monitoring capabilities
**Then** dashboard clearly explains what monitoring captures (screenshots, time)
**And** dashboard explains what it CANNOT capture (encrypted content, password inputs)
**And** explanation is honest about limitations (not overselling capability)
**And** encrypted traffic percentage is shown (rough indicator of HTTPS usage)
**And** explanation helps parents understand monitoring is conversation-starter, not surveillance

#### Story 8.9: Jurisdiction-Based Defaults

As a **new family**,
I want **default settings appropriate for my jurisdiction**,
So that **fledgely complies with local child privacy laws from the start**.

**Acceptance Criteria:**

**Given** a family creates an account
**When** jurisdiction is detected or selected
**Then** default retention periods match jurisdiction requirements (GDPR, COPPA, AADC)
**And** consent flows match jurisdiction requirements
**And** data residency preferences are suggested based on jurisdiction
**And** jurisdiction can be manually overridden if detection is wrong
**And** jurisdiction changes trigger re-consent flow if requirements differ
**And** supported jurisdictions: US, EU/UK, Australia, Canada initially

#### Story 8.10: Adult Pattern Detection

As **the system**,
I want **to detect when an enrolled "child" exhibits adult usage patterns**,
So that **we can prevent misuse of child monitoring for adult surveillance**.

**Acceptance Criteria:**

**Given** a new child profile is enrolled with device monitoring
**When** the first 7 days of usage data is analyzed
**Then** system flags profiles showing adult patterns (work apps, financial sites, adult schedules)
**And** flagged profiles trigger gentle verification prompt to parent
**And** prompt asks: "Is [Child Name] over 18? We noticed adult usage patterns."
**And** if parent confirms adult, monitoring is automatically disabled
**And** if parent explains pattern (teen internship, etc.), flag is cleared
**And** detection does NOT access content, only usage metadata (times, app categories)
**And** this prevents "monitoring spouse as child" misuse

#### Story 8.11: No Law Enforcement Integration

As a **family**,
I want **a guarantee that fledgely has no direct law enforcement integration**,
So that **our family data isn't accessible without proper legal process**.

**Acceptance Criteria:**

**Given** fledgely's architecture
**When** law enforcement requests data
**Then** no API or backdoor exists for direct law enforcement access
**And** all requests require documented legal process (warrant, subpoena)
**And** requests go through fledgely legal team, not automated systems
**And** family is notified of legal requests unless legally prohibited
**And** architecture makes bulk surveillance technically infeasible
**And** transparency report published annually on legal requests received

---

### Epic 8.5: Demo Mode - Early Win Preview (NEW - War Room)
**Goal:** Parents can see sample monitoring data before enrolling their real child's device.

**User Outcome:** Parent understands exactly what monitoring looks like BEFORE the agreement ceremony - making the agreement concrete, not abstract.

**Rationale:** *War Room Finding - "It's like signing a gym contract before seeing the equipment." Parents need to see the product before committing to agreement ceremony.*

**Features:**
- Sample "Demo Child" profile with pre-populated screenshots
- Shows classification categories, time tracking, flag examples
- Available immediately after family creation (Epic 2)
- Clearly marked as demo data, not real monitoring
- Helps parent explain to child what fledgely does

**FRs Covered:** None (new capability)
**NFRs:** NFR42, NFR59 (supports 10-minute first agreement by providing context)

#### Story 8.5.1: Demo Child Profile Creation

As a **new parent**,
I want **to see a demo child profile with sample data immediately after creating my family**,
So that **I can understand what fledgely does before involving my real child**.

**Acceptance Criteria:**

**Given** a parent has created a family (Epic 2)
**When** they access their dashboard before adding real children
**Then** a "Demo Child" profile is automatically available
**And** demo profile is clearly labeled ("Demo - Sample Data")
**And** demo profile has age-appropriate sample screenshots pre-populated
**And** demo cannot be confused with real monitoring data (distinct styling)
**And** parent can dismiss demo when ready to add real child
**And** demo persists until explicitly dismissed or first real child added

#### Story 8.5.2: Sample Screenshot Gallery

As a **parent exploring fledgely**,
I want **to see realistic sample screenshots showing different classifications**,
So that **I understand what AI-categorized activity looks like**.

**Acceptance Criteria:**

**Given** parent is viewing the demo child profile
**When** they browse the screenshot gallery
**Then** sample screenshots show various categories: homework, gaming, social, video, concerning
**And** each screenshot shows AI classification and confidence score
**And** screenshots demonstrate flagging behavior (some flagged, some not)
**And** sample data spans multiple days to show timeline view
**And** screenshots are stock/generated images (not real children)
**And** gallery demonstrates filter/search functionality

#### Story 8.5.3: Sample Time Tracking Display

As a **parent exploring fledgely**,
I want **to see sample time tracking data**,
So that **I understand how screen time is measured and displayed**.

**Acceptance Criteria:**

**Given** parent is viewing the demo child profile
**When** they access time tracking features
**Then** sample data shows daily/weekly screen time breakdown
**And** time is categorized by activity type (educational, entertainment, social)
**And** sample data shows time limit indicators (over/under limit examples)
**And** graphs and visualizations use demo data
**And** time ranges show realistic patterns (school days vs weekends)
**And** parent can interact with filters and date ranges

#### Story 8.5.4: Sample Flag & Alert Examples

As a **parent exploring fledgely**,
I want **to see example flags and how alerts work**,
So that **I understand what "concerning content" triggers look like**.

**Acceptance Criteria:**

**Given** parent is viewing the demo child profile
**When** they explore flagged content section
**Then** sample flagged items demonstrate various concern types
**And** each flag shows: screenshot, AI reasoning, confidence level
**And** sample flags include child annotation examples ("I was researching for school")
**And** notification preview shows what alerts look like
**And** flags demonstrate resolution flow (parent reviewed, resolved)
**And** tone demonstrates "conversation starter, not accusation" framing

#### Story 8.5.5: Demo-to-Real Transition

As a **parent ready to start with their real child**,
I want **a clear path from demo mode to real setup**,
So that **I can transition smoothly when I'm ready**.

**Acceptance Criteria:**

**Given** parent has explored the demo profile
**When** they're ready to add their real child
**Then** clear "Start with Your Child" call-to-action is visible
**And** demo data is NOT migrated to real profile (clean start)
**And** parent can keep demo available during initial setup for reference
**And** demo is automatically archived (not deleted) when real child is added
**And** parent can re-access demo from help section if needed
**And** transition prompts agreement creation flow (Epic 4-6)

#### Story 8.5.6: Demo for Child Explanation

As a **parent**,
I want **to use the demo to explain fledgely to my child**,
So that **my child understands what monitoring looks like before agreeing**.

**Acceptance Criteria:**

**Given** parent wants to show their child what fledgely does
**When** they access demo in "explain to child" mode
**Then** child-friendly explanations appear alongside sample data
**And** demo highlights bilateral transparency ("You'll see this too!")
**And** demo shows what crisis resources look like (protected)
**And** demo emphasizes agreement co-creation ("You help decide the rules")
**And** language is at 6th-grade reading level
**And** demo can be viewed on child's device during explanation

**UX Benefit:** Reduces "buyer's remorse" when real monitoring starts - parent already knows what to expect.

---

### Phase 2: Chromebook & Android Platform (Epics 9-19)
*Priority platforms delivering core monitoring*

**⚡ PARALLEL TRACKS (War Room Optimization):**
Teams can work Chromebook and Android in parallel - no dependencies between them:
- **Track A:** Epics 9-12 (Chromebook) - depends on Epic 7, 8
- **Track B:** Epics 14-17 (Android) - depends on Epic 7, 8
- **Converge at:** Epic 13 (OTP), Epic 18 (Storage), Epic 19 (Dashboard)

*This parallelization can reduce Phase 2 calendar time by up to 40%.*

---

### Epic 9: Chromebook Extension Foundation
**Goal:** Chrome extension installs on Chromebook and establishes connection to family.

**User Outcome:** Extension is installed, authenticated, connected to family account, and shows monitoring indicator.

**FRs Covered:** FR79 (partial), FR133
**NFRs:** NFR36, NFR70, NFR42

#### Story 9.1: Extension Package & Manifest

As **the development team**,
I want **a properly configured Chrome extension manifest**,
So that **the extension can be installed and request necessary permissions**.

**Acceptance Criteria:**

**Given** the extension is being packaged
**When** manifest.json is configured
**Then** manifest version 3 is used (latest Chrome requirement)
**And** permissions include: tabs, activeTab, storage, alarms, identity
**And** host permissions are minimal (only fledgely API endpoints)
**And** extension name and description are family-friendly
**And** icons are provided at all required sizes
**And** extension passes Chrome Web Store validation

#### Story 9.2: Extension Installation Flow

As a **parent setting up a Chromebook**,
I want **to install the fledgely extension from Chrome Web Store**,
So that **monitoring can begin on this device**.

**Acceptance Criteria:**

**Given** parent is on a Chromebook logged into child's Chrome profile
**When** they navigate to Chrome Web Store and install fledgely
**Then** extension installs successfully with permission prompts
**And** post-install page explains next steps (sign in, connect to family)
**And** extension icon appears in Chrome toolbar
**And** installation works on managed Chromebooks (Google Admin policies permitting)
**And** installation logged to device setup audit

#### Story 9.3: Extension Authentication

As a **parent**,
I want **to sign into the extension with my fledgely account**,
So that **the extension connects to my family**.

**Acceptance Criteria:**

**Given** extension is installed
**When** parent clicks extension icon and initiates sign-in
**Then** Chrome identity API flow authenticates via Google
**And** extension receives Firebase ID token
**And** token is stored securely in chrome.storage.local
**And** extension validates token against fledgely API
**And** sign-in state persists across browser restarts
**And** failed sign-in shows clear error message

#### Story 9.4: Family Connection & Child Selection

As a **parent**,
I want **to connect this Chromebook to a specific child in my family**,
So that **monitoring data goes to the correct child profile**.

**Acceptance Criteria:**

**Given** parent is authenticated in the extension
**When** they select which child uses this device
**Then** extension displays list of children in family
**And** parent selects the child who uses this Chromebook
**And** device-child association is stored in Firestore
**And** extension confirms connection ("Connected to [Child Name]'s profile")
**And** device can be reassigned to different child later
**And** connection requires active agreement for selected child

#### Story 9.5: Monitoring Indicator Display

As a **child**,
I want **to see a clear indicator that this device is monitored**,
So that **I know fledgely is active (bilateral transparency)**.

**Acceptance Criteria:**

**Given** extension is connected and monitoring is active
**When** child uses the Chromebook
**Then** extension icon shows "active" state (colored badge)
**And** clicking icon shows "fledgely is monitoring this device"
**And** indicator cannot be hidden by child (always visible when active)
**And** indicator shows last sync time
**And** indicator links to child's dashboard (if they have account)
**And** indicator meets accessibility requirements (not color-only)

#### Story 9.6: Extension Background Service

As **the system**,
I want **a persistent background service worker**,
So that **monitoring continues reliably while the browser is open**.

**Acceptance Criteria:**

**Given** extension is installed and connected
**When** browser is running
**Then** service worker starts on browser launch
**And** service worker handles screenshot capture scheduling
**And** service worker handles sync with fledgely API
**And** service worker persists across tab opens/closes
**And** service worker respects Chrome's Manifest V3 lifecycle
**And** service worker uses alarms API for persistent scheduling

---

### Epic 10: Chromebook Screenshot Capture
**Goal:** Extension captures screenshots at configured intervals on Chromebook.

**User Outcome:** Screenshots are captured per agreement terms.

**FRs Covered:** FR27, FR79
**NFRs:** NFR2 (500ms capture), NFR42

#### Story 10.1: Screenshot Capture Mechanism

As **the extension**,
I want **to capture the visible tab content as a screenshot**,
So that **monitoring data is collected per the family agreement**.

**Acceptance Criteria:**

**Given** monitoring is active and scheduled capture time arrives
**When** capture is triggered
**Then** chrome.tabs.captureVisibleTab API captures current tab
**And** capture completes within 500ms (NFR2)
**And** captured image is JPEG format with configurable quality (default 80%)
**And** capture includes timestamp and tab URL metadata
**And** capture fails gracefully if tab is not capturable (chrome://, file://)
**And** failed captures are logged but don't crash extension

#### Story 10.2: Configurable Capture Intervals

As a **family**,
I want **screenshot capture to follow our agreed interval**,
So that **monitoring matches what we consented to**.

**Acceptance Criteria:**

**Given** family agreement specifies capture interval
**When** extension syncs agreement settings
**Then** capture interval is set per agreement (e.g., every 5 minutes)
**And** interval can range from 1 minute to 30 minutes
**And** interval changes take effect within 60 seconds of agreement update
**And** interval is consistent regardless of browsing activity
**And** interval uses chrome.alarms API for reliable scheduling
**And** missed captures (browser closed) are not retroactively captured

#### Story 10.3: Local Screenshot Queue

As **the extension**,
I want **to queue screenshots locally before upload**,
So that **capture continues even with intermittent connectivity**.

**Acceptance Criteria:**

**Given** a screenshot is captured
**When** upload is pending or network unavailable
**Then** screenshot is stored in chrome.storage.local queue
**And** queue persists across browser restarts
**And** queue has maximum size limit (500 items per NFR87)
**And** oldest items are dropped when queue is full (with warning log)
**And** queue items include capture timestamp for ordering
**And** queue is processed FIFO when connectivity returns

#### Story 10.4: Screenshot Upload to API

As **the extension**,
I want **to upload screenshots to the fledgely API**,
So that **monitoring data reaches the family dashboard**.

**Acceptance Criteria:**

**Given** screenshots are queued for upload
**When** network is available
**Then** extension uploads screenshots via authenticated API call
**And** upload includes: image data, timestamp, URL, device ID, child ID
**And** upload uses chunked/resumable upload for reliability
**And** successful upload removes item from local queue
**And** failed upload retries with exponential backoff
**And** upload respects rate limits (max 10/minute)

#### Story 10.5: Capture Pause During Inactivity

As **the family**,
I want **capture to pause when the device is inactive**,
So that **we don't waste storage on idle screens**.

**Acceptance Criteria:**

**Given** monitoring is active
**When** device is idle (no user interaction for configurable period)
**Then** screenshot capture pauses automatically
**And** inactivity threshold is configurable (default 5 minutes)
**And** capture resumes immediately on user activity
**And** pause/resume events are logged (not screenshot content)
**And** idle detection uses chrome.idle API
**And** screensaver/lock screen never captured

#### Story 10.6: Capture Event Logging

As **the system**,
I want **all capture events logged locally**,
So that **debugging and audit are possible**.

**Acceptance Criteria:**

**Given** any capture-related event occurs
**When** event is processed
**Then** event is logged to local storage with timestamp
**And** log includes: event type, success/failure, duration, queue size
**And** logs do NOT include screenshot content or URLs (privacy)
**And** logs rotate automatically (keep last 7 days)
**And** logs are accessible via extension debug panel (parent only)
**And** critical errors trigger extension icon badge warning

---

### Epic 11: Chromebook Crisis Protection
**Goal:** Extension checks crisis allowlist BEFORE capture, ensuring zero data path.

**User Outcome:** Crisis resources are NEVER captured; children see visual indicator on protected sites.

**FRs Covered:** FR34, FR64, FR80
**NFRs:** NFR28, NFR42

**Survivor Advocate Addition:**
- **FR-SA3:** Optional "decoy mode" - during crisis browsing, capture generic/innocuous placeholder images instead of gaps (prevents negative inference from missing screenshots)

#### Story 11.1: Pre-Capture Allowlist Check

As **the extension**,
I want **to check the crisis allowlist BEFORE any capture occurs**,
So that **crisis resources are NEVER captured (INV-001 invariant)**.

**Acceptance Criteria:**

**Given** a screenshot capture is scheduled
**When** capture timer fires
**Then** current URL is checked against crisis allowlist FIRST
**And** check is synchronous/blocking - capture waits for result
**And** if URL matches allowlist, capture is SKIPPED entirely
**And** no screenshot data is created, queued, or transmitted
**And** no URL or metadata about the skipped site is logged
**And** check completes in <10ms to not delay capture timing
**And** this is the ZERO DATA PATH - nothing leaves the device

#### Story 11.2: Cached Allowlist with Fail-Safe

As **the extension**,
I want **a cached crisis allowlist with fail-safe behavior**,
So that **crisis protection works even offline**.

**Acceptance Criteria:**

**Given** extension needs to check crisis allowlist
**When** checking URL against allowlist
**Then** check uses locally cached allowlist (not network call)
**And** allowlist is bundled with extension (never empty)
**And** allowlist updates sync via background fetch (24h TTL)
**And** if network unavailable, cached version is used indefinitely
**And** allowlist format supports exact URLs and domain patterns
**And** cache is stored in chrome.storage.local
**And** allowlist version is logged (not contents) for debugging

#### Story 11.3: Protected Site Visual Indicator

As a **child on a crisis resource**,
I want **to see a visual indicator that this site is protected**,
So that **I know monitoring is paused and I can browse safely**.

**Acceptance Criteria:**

**Given** child navigates to a crisis-protected URL
**When** page loads
**Then** extension shows a subtle visual indicator (icon badge or overlay)
**And** indicator confirms "This site is private - not monitored"
**And** indicator is calming, not alarming (no red, no warnings)
**And** indicator disappears when navigating away from protected site
**And** indicator is optional (can be disabled in child settings)
**And** indicator itself is not logged or reported

#### Story 11.4: Fuzzy URL Matching

As **the crisis protection system**,
I want **to use fuzzy URL matching for crisis sites**,
So that **subpages, query params, and redirects are all protected**.

**Acceptance Criteria:**

**Given** crisis allowlist contains a domain or URL pattern
**When** checking if current URL matches
**Then** matching includes all subpaths of protected domains
**And** matching ignores query parameters and fragments
**And** matching handles www/non-www variations
**And** matching handles http/https variations
**And** matching handles common URL shorteners that redirect to crisis sites
**And** matching is case-insensitive for domains
**And** false positives (over-blocking) preferred to false negatives (under-blocking)

#### Story 11.5: Decoy Mode for Crisis Browsing

As a **child in a potentially monitored situation**,
I want **decoy screenshots generated during crisis browsing**,
So that **gaps in capture timeline don't reveal I visited protected sites**.

**Acceptance Criteria:**

**Given** decoy mode is enabled in family settings
**When** screenshot is skipped due to crisis URL
**Then** a generic placeholder image is queued instead
**And** placeholder shows innocuous content (e.g., homepage, search engine)
**And** placeholder is visually distinct from real screenshots (for child transparency)
**And** placeholder metadata shows normal timing (no gap visible)
**And** decoy mode is opt-in, requires child to enable
**And** parent dashboard shows decoy indicator IF parent views (bilateral transparency)
**And** decoy mode documentation explains rationale (safety over surveillance)

#### Story 11.6: Crisis Protection Testing

As **the development team**,
I want **adversarial tests verifying crisis protection**,
So that **INV-001 (zero data path) is continuously validated**.

**Acceptance Criteria:**

**Given** crisis protection is implemented
**When** adversarial test suite runs
**Then** tests verify: no screenshot created for crisis URLs
**And** tests verify: no metadata logged for crisis URLs
**And** tests verify: no network request made for crisis URLs
**And** tests verify: cached allowlist used when offline
**And** tests verify: fuzzy matching catches variations
**And** tests verify: fail-safe prefers blocking over capturing
**And** tests run on every PR and block merge if failing
**And** test coverage includes all known crisis resource categories

---

### Epic 12: Chromebook Device Enrollment
**Goal:** Parents can enroll Chromebook via QR code scanning.

**User Outcome:** Chromebook is enrolled in family and ready for monitoring.

**FRs Covered:** FR7, FR11, FR12
**NFRs:** NFR42

#### Story 12.1: Enrollment QR Code Generation

As a **parent**,
I want **to generate a QR code for device enrollment**,
So that **I can easily add a new Chromebook to the family**.

**Acceptance Criteria:**

**Given** parent is logged into dashboard
**When** parent clicks "Add Device" and selects "Chromebook"
**Then** system generates a unique enrollment QR code
**And** QR code contains: family ID, enrollment token, expiry timestamp
**And** enrollment token expires in 15 minutes (security)
**And** QR code is displayed on screen with instructions
**And** parent can regenerate QR code if it expires
**And** only one active enrollment token per family at a time

#### Story 12.2: Extension QR Code Scanning

As a **parent setting up a Chromebook**,
I want **to scan the enrollment QR code with the extension**,
So that **the device is linked to our family account**.

**Acceptance Criteria:**

**Given** fledgely extension is installed but not enrolled
**When** parent opens extension popup
**Then** extension shows "Scan to Enroll" camera interface
**And** extension requests camera permission if not granted
**And** camera captures and decodes QR code automatically
**And** decoded data is validated (family ID, token, expiry)
**And** expired tokens show clear error with "Generate new code" instruction
**And** invalid codes show "Invalid code - please try again" error

#### Story 12.3: Device-to-Device Enrollment Approval

As a **parent with existing family device**,
I want **to approve new device enrollment from my phone/computer**,
So that **I can verify the enrollment is legitimate**.

**Acceptance Criteria:**

**Given** a new device scans enrollment QR code
**When** enrollment request is submitted
**Then** notification is sent to existing family devices
**And** parent can approve or reject from any enrolled device
**And** approval request shows: device type, location (if available), timestamp
**And** approval expires in 10 minutes if no response
**And** rejected enrollment clears the extension to try again
**And** approved enrollment proceeds to device registration

#### Story 12.4: Device Registration in Firestore

As **the system**,
I want **to register the enrolled device in Firestore**,
So that **the device is part of the family's device list**.

**Acceptance Criteria:**

**Given** enrollment is approved
**When** registration completes
**Then** device document created in `/families/{familyId}/devices`
**And** document includes: deviceId, type (chromebook), enrolledAt, enrolledBy
**And** device is associated with specific child (or unassigned initially)
**And** extension receives device credentials for API authentication
**And** extension stores credentials securely in chrome.storage.local
**And** enrollment success triggers dashboard device list refresh

#### Story 12.5: Child Assignment to Device

As a **parent**,
I want **to assign a device to a specific child**,
So that **screenshots are attributed to the correct child**.

**Acceptance Criteria:**

**Given** device is enrolled but unassigned
**When** parent views device in dashboard
**Then** parent sees "Assign to Child" dropdown
**And** dropdown shows all children in the family
**And** selecting child updates device document with `childId`
**And** assignment change is audited in activity log
**And** device can be reassigned to different child anytime
**And** unassigned devices still capture but screenshots are flagged as "unassigned"

#### Story 12.6: Enrollment State Persistence

As **the extension**,
I want **to persist enrollment state across browser restarts**,
So that **the device remains enrolled without re-scanning**.

**Acceptance Criteria:**

**Given** device is successfully enrolled
**When** browser restarts or extension updates
**Then** extension checks chrome.storage.local for enrollment state
**And** enrolled state includes: familyId, deviceId, childId, auth tokens
**And** extension validates tokens on startup (refresh if needed)
**And** invalid/expired state triggers re-enrollment prompt
**And** enrollment state survives extension updates
**And** explicit "Remove Device" action clears enrollment state

---

### Epic 13: Offline OTP Device Unlock
**Goal:** Families can unlock devices offline using TOTP emergency codes.

**User Outcome:** Emergency access works without internet - essential from first device enrollment.

**FRs Covered:** FR90
**NFRs:** NFR42

#### Story 13.1: TOTP Secret Generation at Enrollment

As **the system**,
I want **to generate a unique TOTP secret when a device is enrolled**,
So that **offline unlock codes can be computed without network access**.

**Acceptance Criteria:**

**Given** a device completes enrollment
**When** enrollment is finalized
**Then** system generates a unique TOTP secret for the device
**And** secret is cryptographically random (256-bit minimum)
**And** secret is stored encrypted in device's local storage
**And** secret is stored in Firestore device document (parent access)
**And** TOTP uses standard RFC 6238 algorithm (compatible with authenticator apps)
**And** secret is never transmitted in plain text

#### Story 13.2: Parent Emergency Code Display

As a **parent**,
I want **to view the current emergency unlock code for a device**,
So that **I can unlock a child's device when there's no internet**.

**Acceptance Criteria:**

**Given** parent is viewing device details in dashboard
**When** parent clicks "Show Emergency Code"
**Then** current 6-digit TOTP code is displayed
**And** code shows countdown timer until expiration (30 seconds standard)
**And** code auto-refreshes when new code becomes active
**And** parent must re-authenticate (password/biometric) to view code
**And** code display is logged in audit trail (parent viewed emergency code)
**And** code can be copied to clipboard with one tap

#### Story 13.3: Device Offline Code Entry

As a **child with a locked device**,
I want **to enter an emergency code when offline**,
So that **I can access my device in an emergency**.

**Acceptance Criteria:**

**Given** device monitoring shows locked/restricted state
**When** child taps "Emergency Unlock"
**Then** numeric keypad appears for 6-digit code entry
**And** code is validated locally against stored TOTP secret
**And** valid code unlocks device immediately
**And** invalid code shows error with remaining attempts
**And** unlock event is queued for sync when online
**And** entry UI works without any network connectivity

#### Story 13.4: Brute Force Protection

As **the system**,
I want **to prevent brute force attacks on emergency codes**,
So that **the unlock mechanism can't be easily bypassed**.

**Acceptance Criteria:**

**Given** emergency code entry is attempted
**When** invalid codes are entered repeatedly
**Then** 3 failed attempts triggers 5-minute lockout
**And** 6 failed attempts triggers 30-minute lockout
**And** 10 failed attempts triggers 24-hour lockout
**And** lockout persists across app restarts (stored locally)
**And** lockout timer is displayed to user
**And** successful unlock resets failure counter
**And** lockout events are queued for parent notification when online

#### Story 13.5: Emergency Unlock Audit Trail

As a **parent**,
I want **to see when emergency codes were used**,
So that **I can discuss unexpected unlocks with my child**.

**Acceptance Criteria:**

**Given** emergency unlock occurs on a device
**When** device reconnects to network
**Then** unlock event is synced to family activity log
**And** event includes: device, timestamp, code generation time
**And** event does NOT include the actual code used
**And** parent receives notification of emergency unlock
**And** notification prompts conversation ("Ask your child about the unlock")
**And** audit log distinguishes emergency unlock from normal unlock

#### Story 13.6: TOTP Secret Recovery

As a **parent**,
I want **to regenerate the emergency code secret if compromised**,
So that **security can be restored**.

**Acceptance Criteria:**

**Given** parent suspects emergency code was shared inappropriately
**When** parent clicks "Reset Emergency Codes" in device settings
**Then** new TOTP secret is generated for the device
**And** old secret is invalidated immediately
**And** device must be online to receive new secret
**And** if device is offline, old codes stop working when it connects
**And** parent is shown new setup QR code (for authenticator app backup)
**And** reset event is logged in audit trail

---

### Epic 14: Android Agent Foundation
**Goal:** Android app installs and establishes connection to family account.

**User Outcome:** Android device is connected to family account with monitoring indicator visible.

**FRs Covered:** FR7 (partial), FR133
**NFRs:** NFR37, NFR73, NFR42

#### Story 14.1: Android App Installation & Permissions

As a **parent setting up a child's Android device**,
I want **to install the fledgely app and grant necessary permissions**,
So that **monitoring can function properly**.

**Acceptance Criteria:**

**Given** fledgely app is downloaded from Play Store
**When** app is opened for first time
**Then** app explains required permissions in plain language
**And** permissions requested: overlay, accessibility, usage stats, notifications
**And** each permission shows why it's needed (child-friendly explanation)
**And** app guides user through system settings for each permission
**And** app shows checkmark for each granted permission
**And** app cannot proceed to enrollment without minimum required permissions

#### Story 14.2: Android Device Enrollment via QR

As a **parent**,
I want **to enroll the Android device using the same QR code flow**,
So that **enrollment is consistent across platforms**.

**Acceptance Criteria:**

**Given** Android app has required permissions
**When** parent selects "Enroll Device"
**Then** camera opens for QR code scanning
**And** QR code decoding uses same format as Chromebook (family ID, token, expiry)
**And** expired/invalid codes show appropriate errors
**And** successful scan triggers enrollment request
**And** enrollment follows same device-to-device approval flow
**And** enrollment reuses Epic 12 backend (no duplicate code)

#### Story 14.3: Android Device Registration

As **the system**,
I want **to register Android devices in Firestore**,
So that **they appear in the family device list**.

**Acceptance Criteria:**

**Given** Android enrollment is approved
**When** registration completes
**Then** device document created with type: "android"
**And** document includes: device model, OS version, app version
**And** device receives authentication credentials
**And** credentials stored in Android Keystore (secure hardware)
**And** device appears in parent dashboard device list
**And** registration triggers welcome notification to parent

#### Story 14.4: Persistent Monitoring Indicator

As a **child using an Android device**,
I want **to see a persistent indicator that monitoring is active**,
So that **I always know when fledgely is running (transparency)**.

**Acceptance Criteria:**

**Given** device is enrolled and monitoring is active
**When** child uses the device
**Then** persistent notification shows "fledgely is active"
**And** notification uses ongoing foreground service (can't be swiped away)
**And** notification icon is visible but not intrusive
**And** tapping notification opens fledgely app
**And** notification text matches agreement terms (e.g., "Screenshots every 5 min")
**And** notification is required by Android for foreground services (compliance)

#### Story 14.5: Child App Interface

As a **child**,
I want **to see my monitoring status in the fledgely app**,
So that **I understand what's being captured**.

**Acceptance Criteria:**

**Given** child opens fledgely app on their Android device
**When** app loads
**Then** child sees: monitoring status (active/paused)
**And** child sees: last capture timestamp
**And** child sees: capture interval from agreement
**And** child sees: link to view full agreement
**And** child sees: "Need help?" link to crisis resources
**And** interface uses calming colors, no surveillance aesthetic

#### Story 14.6: Background Service Architecture

As **the Android app**,
I want **to run reliably in the background**,
So that **monitoring continues even when app is not in foreground**.

**Acceptance Criteria:**

**Given** monitoring is active
**When** app is backgrounded or device is locked
**Then** foreground service continues running
**And** service survives app process kill (restarts automatically)
**And** service uses WorkManager for reliable scheduling
**And** battery optimization is handled (request exemption during setup)
**And** service respects Doze mode (captures resume when device active)
**And** battery impact stays under 2% daily (NFR73)

#### Story 14.7: Android Offline Queue

As **the Android app**,
I want **to queue data when offline**,
So that **monitoring continues without internet**.

**Acceptance Criteria:**

**Given** device is offline
**When** screenshots are captured
**Then** data is queued in Room database (SQLite)
**And** queue persists across app restarts
**And** queue has 1000 item limit (per NFR87)
**And** oldest items dropped when full (with local warning)
**And** queue syncs automatically when connectivity returns
**And** sync uses WorkManager with network constraint

---

### Epic 15: Android Screenshot Capture
**Goal:** Android app captures screenshots with MediaProjection API consent.

**User Outcome:** Screenshots are captured on Android per agreement terms.

**FRs Covered:** FR27 (Android)
**NFRs:** NFR2, NFR73 (<2% battery), NFR42

#### Story 15.1: MediaProjection Permission Flow

As a **parent setting up monitoring**,
I want **to grant screen capture permission with clear explanation**,
So that **I understand what this permission enables**.

**Acceptance Criteria:**

**Given** device is enrolled and agreement is active
**When** screenshot capture is first needed
**Then** system MediaProjection consent dialog appears
**And** fledgely shows pre-dialog explaining "This allows capturing screen for monitoring"
**And** consent is one-time per session (Android requirement)
**And** if denied, app explains screenshots cannot be captured
**And** parent can retry granting permission from settings
**And** permission status is synced to dashboard (parent sees if capture is enabled)

#### Story 15.2: Screenshot Capture Implementation

As **the Android app**,
I want **to capture screen content at configured intervals**,
So that **monitoring data is collected per the agreement**.

**Acceptance Criteria:**

**Given** MediaProjection permission is granted and monitoring is active
**When** capture interval timer fires
**Then** screen content is captured via MediaProjection API
**And** capture completes within 500ms (NFR2)
**And** captured image is JPEG with configurable quality (default 80%)
**And** capture includes timestamp and foreground app metadata
**And** capture skips lock screen (privacy)
**And** capture handles multi-window and split-screen modes

#### Story 15.3: Battery-Optimized Capture Scheduling

As **the Android app**,
I want **to schedule captures efficiently**,
So that **battery impact stays under 2% daily (NFR73)**.

**Acceptance Criteria:**

**Given** monitoring is active
**When** scheduling capture intervals
**Then** captures use AlarmManager for precise timing
**And** captures batch with other wake-ups when possible (JobScheduler)
**And** capture pauses during device idle (screen off, no interaction)
**And** capture resumes when device becomes active
**And** battery usage is tracked and logged for debugging
**And** if battery drops below 15%, capture interval doubles temporarily

#### Story 15.4: Capture Queue and Upload

As **the Android app**,
I want **to queue and upload captures reliably**,
So that **screenshots reach the family dashboard**.

**Acceptance Criteria:**

**Given** screenshots are captured
**When** network is available
**Then** screenshots upload via authenticated API (same as Chromebook)
**And** upload includes: image, timestamp, app name, device ID, child ID
**And** uploads use chunked/resumable protocol
**And** failed uploads retry with exponential backoff
**And** successful uploads remove items from local Room queue
**And** upload respects metered network preference (WiFi-only option)

#### Story 15.5: App-Specific Capture Rules

As a **family**,
I want **capture behavior to vary by app type**,
So that **sensitive apps have appropriate handling**.

**Acceptance Criteria:**

**Given** family agreement specifies app-specific rules
**When** capture is triggered
**Then** current foreground app is checked against rules
**And** keyboard apps are never captured (password entry protection)
**And** system settings apps can be excluded (privacy)
**And** specific apps can be excluded per agreement (e.g., journal apps)
**And** excluded app captures show "App excluded" placeholder
**And** exclusion list syncs from agreement settings

#### Story 15.6: Capture Transparency for Child

As a **child**,
I want **to see capture activity in my app**,
So that **I know exactly when screenshots were taken**.

**Acceptance Criteria:**

**Given** child opens fledgely app
**When** viewing capture history
**Then** child sees list of recent captures (last 24 hours)
**And** list shows: timestamp, app name, upload status
**And** child does NOT see actual screenshot content (privacy from self)
**And** child sees total capture count for today
**And** child sees "Next capture in X minutes" countdown
**And** transparency builds trust in the consent model

---

### Epic 16: Android Crisis Protection
**Goal:** Android app checks crisis allowlist before capture.

**User Outcome:** Crisis resources protected on Android with visual indicator.

**FRs Covered:** FR34 (Android), FR64
**NFRs:** NFR28, NFR42

**Survivor Advocate Addition:**
- **FR-SA3:** Optional "decoy mode" - during crisis browsing, capture generic/innocuous placeholder images instead of gaps (prevents negative inference from missing screenshots)

#### Story 16.1: Android Allowlist Check Before Capture

As **the Android app**,
I want **to check the crisis allowlist before capturing any screenshot**,
So that **crisis resources are NEVER captured (INV-001)**.

**Acceptance Criteria:**

**Given** screenshot capture is triggered
**When** capture timer fires
**Then** foreground app/URL is checked against crisis allowlist FIRST
**And** check is synchronous - capture waits for result
**And** if app/URL matches allowlist, capture is SKIPPED
**And** no screenshot data is created or queued
**And** no metadata about skipped app/URL is logged
**And** check uses AccessibilityService for browser URL detection
**And** this is the ZERO DATA PATH - nothing leaves the device

#### Story 16.2: Android Cached Allowlist

As **the Android app**,
I want **a cached crisis allowlist with offline capability**,
So that **crisis protection works even without internet**.

**Acceptance Criteria:**

**Given** app needs to check crisis allowlist
**When** check is performed
**Then** check uses locally cached allowlist (not network call)
**And** allowlist is bundled in APK (assets/crisis-allowlist.json)
**And** allowlist syncs via WorkManager (24h TTL)
**And** if network unavailable, cached version used indefinitely
**And** allowlist format matches Chromebook (shared @fledgely/shared constants)
**And** cache stored in encrypted SharedPreferences
**And** only allowlist version is logged (not contents)

#### Story 16.3: Crisis App Detection

As **the Android crisis protection**,
I want **to detect crisis apps in addition to URLs**,
So that **native crisis apps are also protected**.

**Acceptance Criteria:**

**Given** screenshot capture is triggered
**When** foreground app is checked
**Then** app package name is compared against crisis app list
**And** crisis apps include: crisis text line apps, hotline apps, safety apps
**And** list includes: Crisis Text Line, National Suicide Prevention, RAINN
**And** app list is part of bundled allowlist (syncs with URLs)
**And** matched apps skip capture same as URLs
**And** app detection works even if browser URL detection fails

#### Story 16.4: Android Protected Indicator

As a **child using a protected app**,
I want **to see that fledgely is paused on this app**,
So that **I know I can use it safely**.

**Acceptance Criteria:**

**Given** child opens a crisis-protected app or website
**When** app/site is detected as protected
**Then** fledgely notification updates to "Monitoring paused - private app"
**And** notification color changes to calming blue/green
**And** indicator is subtle, not drawing attention
**And** indicator reverts when leaving protected app
**And** indicator can be disabled in child settings (their choice)
**And** indicator state is never logged or reported

#### Story 16.5: Android Decoy Mode

As a **child in a monitored situation**,
I want **decoy screenshots during crisis app usage**,
So that **gaps don't reveal I used protected resources**.

**Acceptance Criteria:**

**Given** decoy mode is enabled in settings
**When** capture is skipped due to crisis protection
**Then** generic placeholder screenshot is queued instead
**And** placeholder shows home screen or neutral app
**And** placeholder is distinct for child transparency (if they view history)
**And** placeholder timing matches normal capture rhythm
**And** decoy mode is opt-in (child enables)
**And** parent dashboard shows decoy indicator (bilateral transparency)

#### Story 16.6: Cross-Platform Crisis Test Suite

As **the development team**,
I want **adversarial tests validating crisis protection on Android**,
So that **INV-001 is enforced across all platforms**.

**Acceptance Criteria:**

**Given** Android crisis protection is implemented
**When** cross-platform test suite runs
**Then** tests verify: same URLs protected on Android and Chromebook
**And** tests verify: crisis apps are blocked from capture
**And** tests verify: no metadata logged for crisis resources
**And** tests verify: offline allowlist works correctly
**And** tests verify: decoy mode produces valid placeholders
**And** tests share assertions with Chromebook tests (shared test utils)
**And** NFR-CR: Cross-platform crisis integration tests pass

---

### Epic 17: Android Device Enrollment
**Goal:** Parents can enroll Android device via QR code.

**User Outcome:** Android device enrolled and ready for monitoring.

**FRs Covered:** FR7, FR11
**NFRs:** NFR42

**Note:** This epic extends Epic 14 (Android Foundation) with additional enrollment edge cases.

#### Story 17.1: Android-Specific Enrollment Error Handling

As a **parent enrolling an Android device**,
I want **clear error messages for Android-specific issues**,
So that **I can resolve problems during setup**.

**Acceptance Criteria:**

**Given** parent is enrolling Android device
**When** enrollment encounters an error
**Then** error messages are Android-specific and actionable
**And** "Permission denied" shows which permission and how to grant
**And** "Camera not available" suggests closing other camera apps
**And** "QR code invalid" distinguishes expired vs malformed
**And** "Network error" offers retry or offline setup instructions
**And** all errors include "Contact support" fallback option

#### Story 17.2: Child Account Linking on Android

As a **parent**,
I want **to link the Android device to my child's account**,
So that **monitoring is associated with the correct child**.

**Acceptance Criteria:**

**Given** Android device is enrolled
**When** completing enrollment flow
**Then** parent selects which child this device belongs to
**And** selection shows child's name and profile photo
**And** device document is updated with `childId`
**And** child receives notification "New device added to your account"
**And** child can see device in their fledgely app device list
**And** linking can be changed later from dashboard

#### Story 17.3: Multiple Android Devices per Child

As a **family with multiple Android devices**,
I want **to enroll multiple devices for the same child**,
So that **all their devices are monitored under one profile**.

**Acceptance Criteria:**

**Given** child already has one Android device enrolled
**When** parent enrolls another Android device
**Then** both devices can be linked to the same child
**And** dashboard shows all devices grouped under child
**And** each device has unique identifier (model name or custom label)
**And** agreement applies to all devices uniformly
**And** screenshots from all devices appear in unified timeline
**And** no limit on devices per child (practical limit ~10)

#### Story 17.4: Android Enrollment Completion Notification

As a **parent**,
I want **confirmation when Android enrollment completes**,
So that **I know the device is ready for monitoring**.

**Acceptance Criteria:**

**Given** Android enrollment flow completes successfully
**When** device is registered
**Then** parent receives push notification "Device enrolled successfully"
**And** notification includes: device name, child assigned, next steps
**And** dashboard updates in real-time to show new device
**And** parent is prompted to verify first screenshot capture works
**And** onboarding checklist marks "Add device" as complete
**And** child sees welcome message in their fledgely app

---

### Epic 18: Screenshot Cloud Storage & Retention
**Goal:** Screenshots upload to Firebase Storage with configurable retention and forensic protection.

**User Outcome:** Screenshots stored securely with automatic deletion at retention expiry.

**FRs Covered:** FR28, FR29, FR30, FR31, FR137
**NFRs:** NFR19, NFR20, NFR87

**Pre-mortem Addition:**
- **FR18B:** Invisible forensic watermarking with viewer ID embedded in every screenshot served

#### Story 18.1: Firebase Storage Upload Endpoint

As **the backend**,
I want **to receive screenshot uploads from devices**,
So that **screenshots are stored in Firebase Storage**.

**Acceptance Criteria:**

**Given** device has screenshot to upload
**When** upload API is called with image data
**Then** screenshot is stored in Firebase Storage bucket
**And** storage path follows convention: `screenshots/{childId}/{date}/{timestamp}.jpg`
**And** upload validates: auth token, childId ownership, file size (<5MB)
**And** upload is resumable for large files
**And** metadata stored: deviceId, timestamp, URL (if applicable)
**And** upload returns success with storage reference

#### Story 18.2: Screenshot Metadata in Firestore

As **the system**,
I want **screenshot metadata stored in Firestore**,
So that **dashboard can query screenshots efficiently**.

**Acceptance Criteria:**

**Given** screenshot upload completes
**When** storage write succeeds
**Then** Firestore document created: `/children/{childId}/screenshots/{screenshotId}`
**And** document includes: storagePath, timestamp, deviceId, appName/URL
**And** document includes: uploadedAt, retention expiry timestamp
**And** document does NOT include actual image data (storage reference only)
**And** Firestore indexes support: by date, by device, by child
**And** metadata write is atomic with storage upload (transaction)

#### Story 18.3: Configurable Retention Policy

As a **family**,
I want **to configure how long screenshots are retained**,
So that **data isn't kept longer than we agreed**.

**Acceptance Criteria:**

**Given** family agreement specifies retention period
**When** screenshot is uploaded
**Then** expiry timestamp is calculated: uploadedAt + retention period
**And** retention options: 7 days, 30 days, 90 days (agreement-specified)
**And** retention can be changed in agreement (applies to new screenshots)
**And** existing screenshots retain their original expiry (no retroactive change)
**And** retention period is visible on dashboard screenshot view
**And** default retention is 30 days if not specified

#### Story 18.4: Automatic Screenshot Deletion

As **the system**,
I want **screenshots automatically deleted at retention expiry**,
So that **data lifecycle is enforced without manual intervention**.

**Acceptance Criteria:**

**Given** screenshot has reached retention expiry
**When** scheduled cleanup function runs (daily)
**Then** expired screenshots are deleted from Firebase Storage
**And** corresponding Firestore metadata documents are deleted
**And** deletion is logged (screenshotId, childId, age at deletion)
**And** deletion does NOT log screenshot content or URL
**And** batch deletion handles thousands of expired screenshots efficiently
**And** failed deletions are retried on next run

#### Story 18.5: Forensic Watermarking on View

As **the system**,
I want **invisible watermarks embedded when screenshots are viewed**,
So that **leaked screenshots can be traced to the viewer (FR18B)**.

**Acceptance Criteria:**

**Given** user requests to view a screenshot
**When** image is served from storage
**Then** invisible forensic watermark is embedded in image
**And** watermark encodes: viewerId, viewTimestamp, screenshotId
**And** watermark survives: screenshot, crop, minor compression
**And** watermark is invisible to human eye
**And** watermark can be decoded by forensic tool (admin only)
**And** original unwatermarked image is never served to users

#### Story 18.6: View Rate Limiting

As **the system**,
I want **to detect abnormal screenshot viewing patterns**,
So that **potential abuse is flagged (FR3A-X: Angry Divorce defense)**.

**Acceptance Criteria:**

**Given** user is viewing screenshots
**When** viewing rate exceeds threshold (50/hour)
**Then** alert is triggered for other guardians
**And** alert message: "High screenshot activity detected"
**And** alert includes: viewer name, count, time period
**And** viewing continues (not blocked) - transparency over restriction
**And** rate is calculated per viewer per child
**And** threshold is configurable per family (default 50/hour)

#### Story 18.7: Screenshot Access Audit Log

As a **guardian**,
I want **to see who viewed my child's screenshots**,
So that **I can verify appropriate access**.

**Acceptance Criteria:**

**Given** screenshot is viewed by any user
**When** view event occurs
**Then** audit record created: viewer, timestamp, screenshotId
**And** audit log visible to all guardians in family
**And** audit shows: "John viewed 5 screenshots on Dec 14"
**And** detailed view available: individual screenshot access times
**And** audit records retained for 1 year (beyond screenshot deletion)
**And** audit cannot be deleted or modified (append-only)

#### Story 18.8: Storage Quota Monitoring

As **the system**,
I want **to monitor storage usage per family**,
So that **costs are controlled and abuse is prevented**.

**Acceptance Criteria:**

**Given** family is actively capturing screenshots
**When** storage is used
**Then** family storage usage is tracked in real-time
**And** soft limit warning at 80% of quota (notification to parent)
**And** hard limit at 100% pauses new uploads (oldest deleted first if enabled)
**And** quota is configurable per plan (free: 1GB, paid: 10GB)
**And** dashboard shows current usage and quota
**And** admin can adjust quota for individual families

---

### Epic 19: Device Status & Monitoring Health
**Goal:** Parents can see device status, last sync, and monitoring health.

**User Outcome:** Dashboard shows all devices with status indicators and data freshness.

**FRs Covered:** FR13, FR14, FR15, FR16, FR17, FR48, FR51, FR54
**NFRs:** NFR1, NFR42, NFR47

**Pre-mortem Addition:**
- **FR27A:** Basic view logging must be active before dashboard goes live (moved from Epic 27)

#### Story 19.1: Device List View

As a **parent**,
I want **to see all enrolled devices in my dashboard**,
So that **I can monitor device status at a glance**.

**Acceptance Criteria:**

**Given** parent is logged into dashboard
**When** viewing devices section
**Then** all enrolled devices are listed
**And** each device shows: name/model, type (Chromebook/Android), assigned child
**And** devices are grouped by child
**And** unassigned devices appear in separate section
**And** list updates in real-time when devices sync
**And** empty state shows "Add your first device" CTA

#### Story 19.2: Device Status Indicators

As a **parent**,
I want **visual indicators showing each device's status**,
So that **I can quickly identify problems**.

**Acceptance Criteria:**

**Given** devices are listed in dashboard
**When** viewing device status
**Then** each device shows colored status indicator
**And** green = active and syncing normally
**And** yellow = not synced in last hour (warning)
**And** red = not synced in 24+ hours or monitoring disabled
**And** gray = device offline/removed
**And** status tooltip shows last sync timestamp
**And** clicking status shows detailed health breakdown

#### Story 19.3: Last Sync Timestamp Display

As a **parent**,
I want **to see when each device last synced**,
So that **I know how fresh the data is**.

**Acceptance Criteria:**

**Given** device is displayed in dashboard
**When** viewing device details
**Then** last sync shows as relative time ("2 minutes ago", "3 hours ago")
**And** hovering shows exact timestamp
**And** sync time updates automatically (no page refresh needed)
**And** "Never synced" shown for devices that haven't connected
**And** last screenshot timestamp also displayed separately
**And** warning icon if sync is significantly delayed

#### Story 19.4: Monitoring Health Details

As a **parent**,
I want **detailed monitoring health information**,
So that **I can troubleshoot issues**.

**Acceptance Criteria:**

**Given** parent clicks on device for details
**When** health panel opens
**Then** panel shows: capture success rate (last 24h)
**And** panel shows: upload queue size (pending screenshots)
**And** panel shows: battery level (if available)
**And** panel shows: network status (online/offline)
**And** panel shows: permission status (all granted or issues)
**And** panel shows: app version with update available indicator

#### Story 19.5: Monitoring Disabled Alert

As a **parent**,
I want **to be alerted when monitoring is disabled or tampered with**,
So that **I know if something changes unexpectedly (FR15, FR16)**.

**Acceptance Criteria:**

**Given** monitoring is active on a device
**When** monitoring is disabled, app uninstalled, or permissions revoked
**Then** parent receives push notification immediately
**And** notification: "Monitoring stopped on [Device Name]"
**And** dashboard shows prominent warning on affected device
**And** alert includes: what changed, when, possible reasons
**And** alert is also visible to co-parent
**And** child is NOT notified of the alert (avoids gaming)

#### Story 19.6: Device Removal Flow

As a **parent**,
I want **to remove a device from monitoring**,
So that **we can stop monitoring when appropriate (FR14)**.

**Acceptance Criteria:**

**Given** parent views device in dashboard
**When** parent clicks "Remove Device"
**Then** confirmation dialog explains consequences
**And** removal deletes device from family
**And** device-side extension/app is notified and disables itself
**And** existing screenshots are retained per retention policy
**And** removal is logged in activity audit
**And** child is notified "Device removed from fledgely"

#### Story 19.7: Child Device Visibility

As a **child**,
I want **to see which of my devices are monitored**,
So that **I always know what's being tracked (FR17)**.

**Acceptance Criteria:**

**Given** child is logged into their fledgely view
**When** viewing "My Devices" section
**Then** child sees list of their monitored devices
**And** each device shows: name, status, last capture time
**And** child sees same status indicators as parent (transparency)
**And** child cannot remove devices (parent only)
**And** child can see their own capture history per device
**And** "Need help?" link visible for crisis resources

#### Story 19.8: Dashboard View Logging (FR27A)

As **the system**,
I want **all dashboard views logged before going live**,
So that **audit trail is established from day one**.

**Acceptance Criteria:**

**Given** any user accesses the dashboard
**When** any screenshot or data is viewed
**Then** view event is logged: viewer, timestamp, what was viewed
**And** logging is implemented BEFORE dashboard is accessible
**And** logs are stored in append-only audit collection
**And** view logs are visible to all guardians
**And** logging covers: screenshots, device details, activity data
**And** no views occur without corresponding audit record

---

### Epic 19A: Quick Status View (NEW - Focus Group)
**Goal:** Simple green/yellow/red family health view for parents and caregivers who don't need the full dashboard.

**User Outcome:** At-a-glance family status: "All good" / "Needs attention" / "Action required" with one-tap to details.

**Rationale:** *Focus Group Finding - Parents want "just tell me my kid is okay" without learning a complex dashboard. Caregivers need this even more.*

**FRs Covered:** FR54 (data freshness), FR74 (caregiver time viewing - partial)
**NFRs:** NFR1, NFR42, NFR49 (44x44 touch targets)

#### Story 19A.1: Family Status Summary Card

As a **busy parent**,
I want **a simple summary showing if everything is okay**,
So that **I don't have to dig through the dashboard**.

**Acceptance Criteria:**

**Given** parent opens dashboard or mobile app
**When** home view loads
**Then** prominent status card shows overall family status
**And** green/"All Good" = all devices syncing, no alerts
**And** yellow/"Needs Attention" = minor issues (sync delay, low battery)
**And** red/"Action Required" = critical issues (monitoring stopped, tampering)
**And** card shows number of children and devices monitored
**And** last update timestamp visible
**And** tapping card reveals details breakdown

#### Story 19A.2: Per-Child Status Row

As a **parent with multiple children**,
I want **to see each child's status at a glance**,
So that **I can quickly identify which child needs attention**.

**Acceptance Criteria:**

**Given** family has multiple children
**When** viewing quick status
**Then** each child shown as a row with status indicator
**And** row shows: child name, avatar, status color
**And** row shows: last activity time, device count
**And** tapping child row expands to device details
**And** children ordered by status (red first, then yellow, then green)
**And** all children fit on one screen without scrolling (up to 6)

#### Story 19A.3: Caregiver Quick View

As a **caregiver (grandparent)**,
I want **an even simpler view than parents get**,
So that **I can help without being overwhelmed**.

**Acceptance Criteria:**

**Given** caregiver logs in during their access window
**When** caregiver view loads
**Then** simplified single-screen status shown
**And** status shows: "Your grandchildren are doing well" or "Check in with [child]"
**And** no complex device details (just summary)
**And** large touch targets (NFR49: 44x44 minimum)
**And** clear "Call [parent]" button if help needed
**And** view logged per FR19D-X (caregiver access audit)

#### Story 19A.4: Status Push Notifications

As a **parent away from the app**,
I want **push notifications only when status changes**,
So that **I'm alerted to problems without constant pings**.

**Acceptance Criteria:**

**Given** family status is being monitored
**When** status changes (green→yellow, yellow→red, etc.)
**Then** push notification sent to parent(s)
**And** notification includes: what changed, which child/device
**And** green-to-yellow sends "Advisory: [Child] device hasn't synced in 2 hours"
**And** any-to-red sends "Action needed: [specific issue]"
**And** red-to-green sends "Resolved: [Child] is back online"
**And** notification frequency is capped (max 1 per hour per child)

#### Story 19A.5: Status Widget (Mobile)

As a **parent**,
I want **a home screen widget showing family status**,
So that **I can check without opening the app**.

**Acceptance Criteria:**

**Given** fledgely mobile app is installed
**When** parent adds widget to home screen
**Then** widget shows family status color and summary
**And** widget updates automatically (every 15 minutes)
**And** widget shows: status color, child count, last sync
**And** tapping widget opens fledgely app to details
**And** widget works on iOS (WidgetKit) and Android (App Widget)
**And** widget uses minimal battery (NFR73 compliant)

---

### Epic 19B: Child Dashboard - My Screenshots (MOVED FROM EPIC 25)
**Goal:** Children can view their own screenshots and activity immediately after monitoring begins.

**User Outcome:** Child sees what monitoring captures about them - bilateral transparency from day one.

**Rationale:** *Focus Group Finding - Emma: "If you want my signature, I should see my data the same day."*

**FRs Covered:** FR33, FR52
**NFRs:** NFR42, NFR104 (natural language)

#### Story 19B.1: Child Screenshot Gallery

As a **child**,
I want **to see the screenshots captured from my devices**,
So that **I know exactly what my parents can see**.

**Acceptance Criteria:**

**Given** child logs into fledgely
**When** viewing "My Screenshots" section
**Then** gallery shows recent screenshots (last 7 days)
**And** screenshots displayed as thumbnails in chronological order
**And** child can tap to view full-size screenshot
**And** each screenshot shows: timestamp, device, app/URL
**And** gallery loads quickly (<2s for first page)
**And** infinite scroll or pagination for older screenshots

#### Story 19B.2: Screenshot Timeline View

As a **child**,
I want **to see my screenshots on a timeline**,
So that **I understand when captures happened during my day**.

**Acceptance Criteria:**

**Given** child is viewing their screenshots
**When** switching to timeline view
**Then** screenshots shown grouped by date and time of day
**And** timeline shows: morning, afternoon, evening sections
**And** gaps in timeline show "No captures" (not suspicious absence)
**And** child can jump to specific date via calendar picker
**And** today's screenshots highlighted at top
**And** timeline shows capture count per day

#### Story 19B.3: Screenshot Detail View

As a **child**,
I want **to see details about each screenshot**,
So that **I understand the context of what was captured**.

**Acceptance Criteria:**

**Given** child taps on a screenshot
**When** detail view opens
**Then** full-size screenshot displayed
**And** metadata shown: exact timestamp, device name, app or URL
**And** "This is what [Parent] can see" label (transparency)
**And** navigation arrows to prev/next screenshot
**And** pinch-to-zoom supported on mobile
**And** swipe to dismiss on mobile

#### Story 19B.4: Activity Summary for Child

As a **child**,
I want **a summary of my monitored activity**,
So that **I don't have to look at every screenshot**.

**Acceptance Criteria:**

**Given** child views their dashboard home
**When** activity summary loads
**Then** summary shows: total screenshots today, this week
**And** summary shows: most captured apps (top 3)
**And** summary shows: capture times distribution (morning/afternoon/evening)
**And** language is friendly, not surveillance-like ("Your day in review")
**And** summary updates in real-time as new captures arrive
**And** "Why am I seeing this?" help link explains the agreement

#### Story 19B.5: "What Parents See" Explainer

As a **child**,
I want **a clear explanation of what my parents can access**,
So that **there are no surprises about monitoring**.

**Acceptance Criteria:**

**Given** child views their dashboard
**When** tapping "What can my parents see?"
**Then** explainer shows exactly what parents can view
**And** list includes: screenshots, timestamps, apps/URLs, device status
**And** list excludes: what parents CANNOT see (e.g., private messages content)
**And** language is age-appropriate (NFR65: 6th-grade reading level)
**And** explainer links to the family agreement
**And** "Talk to your parents" prompt if child has concerns

#### Story 19B.6: Screenshot Viewing Equality

As a **child**,
I want **to see screenshots at the same time my parents can**,
So that **I'm never surprised by what they're viewing**.

**Acceptance Criteria:**

**Given** screenshot is uploaded from child's device
**When** screenshot becomes available
**Then** child sees it in their gallery at the same moment parent can
**And** no delay or "parent-first" viewing window
**And** child gallery uses same data source as parent dashboard
**And** real-time sync ensures simultaneous access
**And** this enforces bilateral transparency principle
**And** audit logs show child viewed their own screenshots (separate from parent views)

---

### Epic 19C: Child Dashboard - My Agreement (MOVED FROM EPIC 26)
**Goal:** Children can view their active agreement in age-appropriate language alongside their activity.

**User Outcome:** Child understands their agreement terms and sees how they're being honored.

**Rationale:** *Focus Group Finding - Child transparency should not wait until Phase 3.*

**FRs Covered:** FR22 (child view)
**NFRs:** NFR42, NFR65 (6th-grade reading)

#### Story 19C.1: Child Agreement View

As a **child**,
I want **to see my family agreement in the app**,
So that **I can remind myself what we agreed to**.

**Acceptance Criteria:**

**Given** child logs into fledgely
**When** viewing "My Agreement" section
**Then** active agreement is displayed in full
**And** agreement shows: what's monitored, capture frequency, retention period
**And** agreement shows: both signatures (parent and child) with dates
**And** agreement is displayed as signed (read-only, not editable)
**And** "This is what we agreed to together" framing
**And** link to request changes (goes to parent)

#### Story 19C.2: Age-Appropriate Language Translation

As a **child**,
I want **my agreement explained in words I understand**,
So that **legal language doesn't confuse me**.

**Acceptance Criteria:**

**Given** child views their agreement
**When** agreement loads
**Then** technical terms are translated to simple language (NFR65)
**And** "Screenshot capture interval: 5 minutes" becomes "A picture of your screen is saved every 5 minutes"
**And** "Retention period: 30 days" becomes "Pictures are kept for 30 days, then deleted"
**And** hover/tap on any term shows simple explanation
**And** reading level validated at 6th grade or below
**And** translations are consistent across all agreement views

#### Story 19C.3: Agreement Terms Checklist

As a **child**,
I want **a simple checklist of what the agreement covers**,
So that **I can quickly understand the key points**.

**Acceptance Criteria:**

**Given** child views agreement summary
**When** checklist loads
**Then** key terms shown as checkboxes/icons
**And** checklist includes: "Screenshots: Yes/No", "Apps tracked: Yes/No"
**And** checklist shows frequency: "How often: Every 5 minutes"
**And** checklist shows duration: "How long kept: 30 days"
**And** each item expandable for more detail
**And** visual design is friendly, not intimidating

#### Story 19C.4: "Am I Following the Agreement?" View

As a **child**,
I want **to see if my activity matches our agreement**,
So that **I know if I'm doing what we agreed**.

**Acceptance Criteria:**

**Given** child has active monitoring
**When** viewing agreement compliance
**Then** child sees "Agreement Status: Active"
**And** shows: "Monitoring is working as we agreed"
**And** if monitoring is paused: "Monitoring is paused - talk to your parent"
**And** if agreement expired: "Time to renew our agreement"
**And** no punitive language - neutral, informational only
**And** status updated in real-time

#### Story 19C.5: Request Agreement Change

As a **child**,
I want **to request a change to our agreement**,
So that **I can renegotiate terms that feel unfair**.

**Acceptance Criteria:**

**Given** child is viewing their agreement
**When** tapping "Request a Change"
**Then** simple form opens for child to describe requested change
**And** form includes: what to change, why (optional)
**And** request sent to parent as notification
**And** child sees "Request sent - talk to [Parent] about it"
**And** request logged in family activity (transparency)
**And** this empowers child voice in the consent relationship

---

### Epic 19D: Basic Caregiver Status View (SPLIT FROM EPIC 39)
**Goal:** Caregivers can view child's remaining screen time and basic status without full caregiver features.

**User Outcome:** Grandpa Joe can answer "is Emma allowed on the iPad right now?" without complex setup.

**Rationale:** *Focus Group Finding - Basic caregiver visibility shouldn't wait until Phase 5.*

**FRs Covered:** FR74 (caregiver time viewing)
**NFRs:** NFR42, NFR62 (5-minute revocation)

**Red Team Addition:**
- **FR19D-X:** All caregiver views logged from day one (no logging backdoor - prevents months of untracked access)

**Note:** Full caregiver features (PIN, time extension, flag viewing) remain in Epic 39.

#### Story 19D.1: Caregiver Invitation & Onboarding

As a **parent**,
I want **to invite a caregiver with limited status-only access**,
So that **grandparents can help without full dashboard access**.

**Acceptance Criteria:**

**Given** parent is in family settings
**When** parent invites a caregiver
**Then** invitation sent via email with simple setup link
**And** caregiver role is "Status Viewer" (not full caregiver)
**And** caregiver completes Google Sign-In to accept
**And** caregiver sees simple onboarding explaining their limited access
**And** parent can set which children caregiver can see
**And** invitation expires in 7 days if not accepted

#### Story 19D.2: Caregiver Status-Only View

As a **caregiver (grandparent)**,
I want **to see if the child is allowed screen time right now**,
So that **I can answer "can Emma use the iPad?"**.

**Acceptance Criteria:**

**Given** caregiver logs in during their access window
**When** caregiver view loads
**Then** simple screen shows: child name, current status
**And** status: "Screen time available" or "Screen time finished for today"
**And** if time remaining, shows: "X minutes left today"
**And** no screenshot access (status only)
**And** no device details or activity history
**And** large, clear UI suitable for older adults (NFR49)

#### Story 19D.3: Caregiver Access Audit Logging

As **the system**,
I want **all caregiver views logged from day one**,
So that **there's no backdoor for untracked access (FR19D-X)**.

**Acceptance Criteria:**

**Given** caregiver accesses their view
**When** any data is displayed
**Then** audit record created: caregiver ID, timestamp, what was viewed
**And** logs stored in append-only collection
**And** logs visible to parent in family audit trail
**And** logging implemented BEFORE caregiver access is enabled
**And** no caregiver access occurs without corresponding log
**And** parents can review "Grandpa Joe viewed Emma's status 3 times this week"

#### Story 19D.4: Caregiver Access Window Enforcement

As a **parent**,
I want **to control when caregivers can access status**,
So that **access is limited to when they're actually babysitting**.

**Acceptance Criteria:**

**Given** parent has invited a caregiver
**When** setting access permissions
**Then** parent can set access windows (e.g., Saturday 2-6pm)
**And** caregiver can only view status during active window
**And** outside window, caregiver sees "Access not currently active"
**And** parent can grant one-time access extension
**And** access windows shown to caregiver so they know when to check
**And** time zone handling is correct for caregiver's location

#### Story 19D.5: Caregiver Quick Revocation

As a **parent**,
I want **to revoke caregiver access immediately**,
So that **I can respond to concerns quickly (NFR62)**.

**Acceptance Criteria:**

**Given** parent wants to remove caregiver access
**When** parent clicks "Remove Access" in settings
**Then** caregiver access revoked within 5 minutes (NFR62)
**And** caregiver's current session terminated immediately
**And** caregiver sees "Your access has been removed"
**And** no notification to caregiver of reason (parent's choice)
**And** revocation logged in audit trail
**And** parent can re-invite same caregiver later if desired

---

### Phase 3: Dashboard & Intelligence (Epics 20-28)
*AI classification and parent/child interfaces*

---

### Epic 20: AI Classification - Basic Categories
**Goal:** AI classifies screenshots into basic categories (homework, leisure, games, etc.).

**User Outcome:** Screenshots are automatically categorized with confidence scores.

**FRs Covered:** FR35, FR41, FR150
**NFRs:** NFR3 (30-second classification), NFR4 (95% accuracy), NFR42

#### Story 20.1: Classification Service Architecture

As **the system**,
I want **a scalable AI classification service**,
So that **screenshots are categorized automatically**.

**Acceptance Criteria:**

**Given** a screenshot is uploaded
**When** storage write completes
**Then** classification job is triggered (Cloud Function or pub/sub)
**And** service calls AI model (Vertex AI or similar)
**And** classification completes within 30 seconds (NFR3)
**And** results stored in screenshot metadata document
**And** service handles burst traffic (queue-based)
**And** failed classifications retry with exponential backoff

#### Story 20.2: Basic Category Taxonomy

As **the classification system**,
I want **a defined set of content categories**,
So that **screenshots are consistently labeled**.

**Acceptance Criteria:**

**Given** screenshot is being classified
**When** AI analyzes content
**Then** screenshot assigned to one primary category
**And** categories include: Homework, Educational, Social Media, Gaming, Entertainment, Communication, Creative, Shopping, News, Other
**And** categories are family-friendly labels (not judgment-laden)
**And** category definitions documented for consistency
**And** taxonomy is extensible for future categories
**And** "Other" used when confidence is low for all categories

#### Story 20.3: Confidence Score Assignment

As **the classification system**,
I want **confidence scores for each classification**,
So that **low-confidence results can be handled appropriately**.

**Acceptance Criteria:**

**Given** screenshot is classified
**When** AI returns result
**Then** confidence score (0-100%) assigned to classification
**And** scores above 85% considered high confidence
**And** scores 60-85% considered medium confidence
**And** scores below 60% flagged for potential review
**And** confidence score visible to parent on screenshot detail
**And** low-confidence classifications don't trigger automated actions

#### Story 20.4: Multi-Label Classification

As **the classification system**,
I want **to assign multiple relevant categories when appropriate**,
So that **mixed-content screenshots are accurately described**.

**Acceptance Criteria:**

**Given** screenshot contains multiple content types
**When** AI analyzes content
**Then** primary category assigned (highest confidence)
**And** secondary categories assigned if confidence > 50%
**And** maximum 3 categories per screenshot
**And** parent sees primary category in gallery view
**And** all categories visible in detail view
**And** example: YouTube homework video = Educational (primary), Entertainment (secondary)

#### Story 20.5: Classification Metadata Storage

As **the system**,
I want **classification results stored efficiently**,
So that **dashboard can filter and query by category**.

**Acceptance Criteria:**

**Given** classification completes
**When** storing results
**Then** metadata added to Firestore screenshot document
**And** fields: primaryCategory, secondaryCategories[], confidence, classifiedAt
**And** Firestore indexes support: filter by category, sort by confidence
**And** classification version tracked (for model updates)
**And** raw AI response stored for debugging (separate collection)
**And** classification can be re-run if model improves

#### Story 20.6: Classification Accuracy Monitoring

As **the development team**,
I want **to monitor classification accuracy over time**,
So that **we can ensure 95% accuracy (NFR4)**.

**Acceptance Criteria:**

**Given** classifications are being performed
**When** monitoring accuracy
**Then** sample of classifications flagged for human review
**And** accuracy calculated: correct / total reviewed
**And** accuracy dashboard visible to ops team
**And** alert triggered if accuracy drops below 90%
**And** accuracy tracked per category (identify weak areas)
**And** feedback loop: incorrect classifications improve model

#### Story 20.7: App/URL Context Enhancement

As **the classification system**,
I want **to use app name and URL as classification hints**,
So that **accuracy improves beyond image-only analysis**.

**Acceptance Criteria:**

**Given** screenshot includes app/URL metadata
**When** AI classifies content
**Then** app name and URL used as context signals
**And** YouTube URL biases toward Entertainment/Educational
**And** Google Docs URL biases toward Homework
**And** Known gaming apps bias toward Gaming category
**And** context hints improve confidence scores
**And** image content still primary factor (context is supplement)

---

### Epic 21: AI Classification - Concerning Content Detection
**Goal:** AI flags screenshots that may need parent attention with false positive throttling.

**User Outcome:** Concerning content is flagged for review without alert flood.

**FRs Covered:** FR36, FR149
**NFRs:** NFR4, NFR42

**Pre-mortem Addition:**
- **FR21A:** "Potential distress" classifier SUPPRESSES parent alerts (doesn't trigger them) - crisis moments need help, not confrontation

#### Story 21.1: Concerning Content Categories

As **the classification system**,
I want **to identify content that may need parent attention**,
So that **families can address concerns together**.

**Acceptance Criteria:**

**Given** screenshot is being analyzed
**When** AI detects potentially concerning content
**Then** content flagged with concern category
**And** categories include: Violence, Adult Content, Bullying, Self-Harm Indicators, Explicit Language, Unknown Contacts
**And** each category has clear definition for consistency
**And** flags are separate from basic categories (can coexist)
**And** concern severity assigned: Low, Medium, High
**And** flag includes AI reasoning (why flagged)

#### Story 21.2: Distress Detection Suppression (FR21A)

As **the classification system**,
I want **to detect potential distress and SUPPRESS alerts**,
So that **crisis moments get help, not parent confrontation**.

**Acceptance Criteria:**

**Given** AI detects potential distress indicators
**When** classification includes self-harm, crisis resources, distress signals
**Then** parent alert is SUPPRESSED (not sent)
**And** flag is created but held in "sensitive review" queue
**And** if crisis URL detected, no flag created at all (INV-001)
**And** child sees "Need help?" resource link more prominently
**And** suppression logged for internal audit only
**And** parent sees flag only after 48-hour delay (if at all)

#### Story 21.3: False Positive Throttling

As **the system**,
I want **to throttle flag alerts to prevent alert fatigue**,
So that **parents don't become desensitized to important flags**.

**Acceptance Criteria:**

**Given** multiple flags are generated
**When** alert threshold is considered
**Then** maximum 3 flag alerts per child per day
**And** highest severity flags prioritized for alerting
**And** lower severity flags batched into daily summary
**And** parent can adjust throttling threshold in settings
**And** throttling doesn't affect flag creation (all flags stored)
**And** "X additional flags today" shown in dashboard

#### Story 21.4: Concern Confidence Thresholds

As **the classification system**,
I want **configurable confidence thresholds for flagging**,
So that **families can balance sensitivity vs. false positives**.

**Acceptance Criteria:**

**Given** AI detects potential concern
**When** determining whether to flag
**Then** flag created only if confidence exceeds threshold
**And** default threshold: 75% confidence
**And** parent can adjust: Sensitive (60%), Balanced (75%), Relaxed (90%)
**And** threshold applies per concern category (configurable)
**And** very high confidence (95%+) always flags regardless of setting
**And** threshold changes apply to new screenshots only

#### Story 21.5: Flag Creation and Storage

As **the system**,
I want **flags stored with full context**,
So that **parents can review with complete information**.

**Acceptance Criteria:**

**Given** concerning content is detected
**When** flag is created
**Then** flag document created in `/children/{childId}/flags/{flagId}`
**And** flag includes: screenshotRef, category, severity, confidence, reasoning
**And** flag includes: timestamp, status (pending/reviewed/dismissed)
**And** flag linked to screenshot (one-to-one relationship)
**And** flags queryable: by status, severity, date
**And** flag creation triggers alert (subject to throttling)

#### Story 21.6: AI Reasoning Explanation

As a **parent reviewing a flag**,
I want **to understand why content was flagged**,
So that **I can assess whether the concern is valid**.

**Acceptance Criteria:**

**Given** flag is displayed to parent
**When** parent views flag details
**Then** AI reasoning shown in plain language
**And** reasoning explains: what was detected, where in image, why concerning
**And** confidence score displayed with explanation
**And** similar examples mentioned if helpful ("Often seen with...")
**And** reasoning helps parent decide: discuss with child vs. dismiss
**And** reasoning never reveals child's crisis resource usage

#### Story 21.7: Flag Accuracy Feedback Loop

As **the development team**,
I want **parents to provide feedback on flag accuracy**,
So that **AI improves over time**.

**Acceptance Criteria:**

**Given** parent reviews a flag
**When** parent marks flag as reviewed
**Then** parent can indicate: Helpful, Not Helpful, False Positive
**And** feedback stored anonymously for model improvement
**And** high false-positive categories identified for model tuning
**And** feedback aggregated across families (privacy preserved)
**And** model retrained periodically with feedback data
**And** accuracy improvements tracked over time

---

### Epic 22: Parent Dashboard - Flag Review
**Goal:** Parents can review flagged content with AI reasoning.

**User Outcome:** Parent sees flags, understands why content was flagged, can take action.

**FRs Covered:** FR37, FR49
**NFRs:** NFR42, NFR44

#### Story 22.1: Flag Review Queue

As a **parent**,
I want **to see all flags requiring my attention**,
So that **I can review concerning content systematically**.

**Acceptance Criteria:**

**Given** parent opens dashboard
**When** viewing Flags section
**Then** pending flags shown in priority order (severity, then date)
**And** each flag shows: thumbnail, category, severity badge, child name
**And** flag count badge visible in navigation ("3 flags")
**And** filters available: by child, by category, by severity
**And** reviewed flags move to "History" section
**And** queue updates in real-time as new flags arrive

#### Story 22.2: Flag Detail View

As a **parent**,
I want **to see full details of a flagged screenshot**,
So that **I can understand the concern in context**.

**Acceptance Criteria:**

**Given** parent clicks on a flag
**When** detail view opens
**Then** full screenshot displayed with flag overlay
**And** AI reasoning panel explains why flagged
**And** category and severity prominently displayed
**And** confidence score shown with explanation
**And** timestamp and device information visible
**And** child's annotation shown if provided (Epic 23)

#### Story 22.3: Flag Actions

As a **parent**,
I want **to take action on a flag**,
So that **I can respond appropriately to concerns**.

**Acceptance Criteria:**

**Given** parent is reviewing a flag
**When** choosing action
**Then** available actions: Dismiss, Note for Discussion, Requires Action
**And** "Dismiss" marks flag as reviewed (false positive or resolved)
**And** "Note for Discussion" saves flag for family conversation
**And** "Requires Action" escalates flag and logs parent's concern
**And** all actions require confirmation
**And** action logged in audit trail with timestamp

#### Story 22.4: Flag Discussion Notes

As a **parent**,
I want **to add notes to flags**,
So that **I can track my thoughts and conversation outcomes**.

**Acceptance Criteria:**

**Given** parent reviews a flag
**When** adding notes
**Then** text field available for parent notes
**And** notes saved with flag document
**And** notes visible only to guardians (not child)
**And** multiple notes can be added over time
**And** notes show: author, timestamp, content
**And** notes help track: "Discussed with Emma 12/15, agreed to..."

#### Story 22.5: Flag History and Patterns

As a **parent**,
I want **to see flag history and patterns**,
So that **I can identify trends in my child's activity**.

**Acceptance Criteria:**

**Given** parent views flag history
**When** reviewing past flags
**Then** all reviewed flags shown chronologically
**And** pattern summary: "5 gaming flags this month (up from 2)"
**And** category breakdown chart visible
**And** time-of-day analysis: "Most flags occur after 9pm"
**And** patterns help identify when to have conversations
**And** export option for flags (PDF report)

#### Story 22.6: Co-Parent Flag Visibility

As **co-parents**,
I want **both of us to see and act on flags**,
So that **we can coordinate our response**.

**Acceptance Criteria:**

**Given** flag is created
**When** either parent views dashboard
**Then** both parents see the flag in their queue
**And** flag shows if other parent has viewed it
**And** flag shows other parent's action if taken
**And** notes from either parent visible to both
**And** "Discussed together" option for joint review
**And** conflict prevention: "John is currently viewing this flag"

---

### Epic 23: Child Annotation Before Parent Alert
**Goal:** Children have 30-minute window to add context to flagged content.

**User Outcome:** Child can explain flagged content before parent sees it.

**FRs Covered:** FR40
**NFRs:** NFR42, NFR152 (pre-set response options)

#### Story 23.1: Flag Notification to Child

As a **child**,
I want **to be notified when my content is flagged**,
So that **I have a chance to explain before my parent sees it**.

**Acceptance Criteria:**

**Given** content is flagged by AI
**When** flag is created (and not distress-suppressed)
**Then** child receives notification: "Something was flagged - add context?"
**And** notification is gentle, not alarming ("We want your side")
**And** notification links directly to annotation screen
**And** notification appears in app and as push notification
**And** child has 30 minutes to respond before parent alert
**And** timer visible: "25 minutes to add your explanation"

#### Story 23.2: Child Annotation Interface

As a **child**,
I want **an easy way to explain flagged content**,
So that **I can provide context quickly**.

**Acceptance Criteria:**

**Given** child opens annotation screen
**When** viewing the flagged screenshot
**Then** screenshot displayed with flag category shown
**And** pre-set response options available (NFR152)
**And** options include: "School project", "Friend was showing me", "Didn't mean to see this", "Other"
**And** free-text field for custom explanation
**And** "Submit" button sends annotation
**And** "Skip" option available (no explanation)

#### Story 23.3: Annotation Timer and Escalation

As **the system**,
I want **to enforce the 30-minute annotation window**,
So that **parents aren't kept waiting indefinitely**.

**Acceptance Criteria:**

**Given** flag is created and child is notified
**When** 30 minutes pass without annotation
**Then** flag is released to parent automatically
**And** parent sees: "Child did not add context"
**And** if child annotates within window, timer stops
**And** annotated flag released to parent immediately
**And** timer pauses if child is actively typing
**And** child can request 15-minute extension (once)

#### Story 23.4: Annotation Display to Parent

As a **parent**,
I want **to see my child's explanation alongside flagged content**,
So that **I have their perspective when reviewing**.

**Acceptance Criteria:**

**Given** child has annotated a flag
**When** parent views flag detail
**Then** child's annotation displayed prominently
**And** annotation shows: selected option, free-text if provided
**And** annotation timestamp shown
**And** "Child's explanation" section clearly labeled
**And** parent can respond to annotation in their notes
**And** annotation helps parent decide appropriate response

#### Story 23.5: Skip Annotation Option

As a **child**,
I want **to skip explaining if I choose**,
So that **I'm not forced to justify everything**.

**Acceptance Criteria:**

**Given** child receives flag notification
**When** child chooses "Skip"
**Then** flag released to parent immediately
**And** parent sees: "Child chose not to add context"
**And** no negative language ("refused" → "chose not to")
**And** child can add annotation later (before parent reviews)
**And** skipping is valid choice - no pressure to explain
**And** skip action logged (not content of why)

#### Story 23.6: Annotation Privacy from Other Children

As a **child with siblings**,
I want **my annotations to be private**,
So that **my siblings can't see my explanations**.

**Acceptance Criteria:**

**Given** child annotates a flag
**When** annotation is stored
**Then** annotation visible only to: annotating child, guardians
**And** siblings cannot see each other's flags or annotations
**And** family data isolation rules enforced (Epic 8)
**And** even if siblings share device, annotations protected
**And** annotation stored under child's profile, not shared
**And** audit log tracks who viewed annotation

---

### Epic 24: AI Feedback Loop
**Goal:** Parent corrections improve future AI classifications for the family.

**User Outcome:** AI gets smarter for this family over time.

**FRs Covered:** FR38, FR39
**NFRs:** NFR42

#### Story 24.1: Parent Classification Correction

As a **parent**,
I want **to correct AI misclassifications**,
So that **future similar content is classified correctly**.

**Acceptance Criteria:**

**Given** parent is viewing a screenshot with classification
**When** parent disagrees with category
**Then** parent can select "Correct this" option
**And** dropdown shows available categories to choose from
**And** parent selects correct category
**And** correction saved with: original category, corrected category, parentId
**And** correction acknowledged: "Thanks! We'll learn from this"
**And** corrected classification updates in dashboard immediately

#### Story 24.2: Family-Specific Model Tuning

As **the AI system**,
I want **to learn from family corrections**,
So that **classifications improve for this specific family**.

**Acceptance Criteria:**

**Given** parent makes classification correction
**When** correction is stored
**Then** correction added to family's feedback corpus
**And** family model adjustment applied (bias toward corrected patterns)
**And** adjustment isolated to this family (not affecting others)
**And** minimum 5 corrections needed before model adapts
**And** adaptation happens within 24 hours of corrections
**And** "AI learning" indicator shown in settings

#### Story 24.3: Explicit Approval of Categories

As a **parent**,
I want **to approve categories for specific apps**,
So that **AI knows what I consider appropriate**.

**Acceptance Criteria:**

**Given** parent views app usage patterns
**When** parent sets app category preference
**Then** parent can mark: "YouTube Kids = Educational (approved)"
**And** approval reduces flag sensitivity for that app/category
**And** disapproval increases flag sensitivity
**And** preferences stored per-family, per-child
**And** preferences override default model thresholds
**And** child-specific: "Gaming OK for Emma, flag for Jake"

#### Story 24.4: Learning Progress Dashboard

As a **parent**,
I want **to see how AI has learned from my feedback**,
So that **I know my corrections matter**.

**Acceptance Criteria:**

**Given** parent has made corrections
**When** viewing AI settings
**Then** summary shows: "12 corrections made, AI adapted to 8"
**And** accuracy improvement shown: "Accuracy improved 15% for your family"
**And** top learned patterns: "YouTube homework videos now recognized"
**And** pending adaptations shown: "Learning from 3 recent corrections"
**And** reset option: "Clear my family's learning data"
**And** motivates continued feedback engagement

#### Story 24.5: Global Model Improvement Pipeline

As **the development team**,
I want **aggregated (anonymized) feedback to improve the global model**,
So that **all families benefit from collective learning**.

**Acceptance Criteria:**

**Given** corrections are made across many families
**When** aggregating feedback for model training
**Then** feedback anonymized (no family identifiers)
**And** only patterns shared, not actual images
**And** patterns with >10 corrections across families flagged for review
**And** global model retrained monthly with aggregated feedback
**And** families can opt-out of contributing to global model
**And** improvement metrics tracked: "Global accuracy +2% this month"

---

### Epic 25: ~~Child Dashboard - My Screenshots~~ → MOVED TO EPIC 19B
*Per Focus Group: Child transparency moved earlier to Phase 2 for bilateral visibility from day one.*

---

### Epic 26: ~~Child Dashboard - My Agreement~~ → MOVED TO EPIC 19C
*Per Focus Group: Child agreement view moved earlier to Phase 2.*

---

### Epic 27: Bidirectional Transparency - Audit Log
**Goal:** Both parties can see who accessed what data and when.

**User Outcome:** Complete transparency on data access.

**FRs Covered:** FR32, FR53
**NFRs:** NFR58, NFR82, NFR42

**Pre-mortem Addition:**
- **FR27B:** Asymmetric viewing pattern detection - alert when one parent views data 10x more than the other (potential weaponization signal)

#### Story 27.1: Audit Event Capture

As **the system**,
I want **to capture all data access events**,
So that **a complete audit trail exists for transparency**.

**Acceptance Criteria:**

**Given** any user accesses child data
**When** access occurs (view screenshot, read profile, open dashboard)
**Then** audit event created with: userId, childId, resourceType, resourceId, timestamp
**And** access type recorded: "view", "download", "export", "modify"
**And** device/session information captured
**And** events stored in append-only audit collection
**And** audit writes cannot fail silently (retry with dead-letter queue)
**And** events retained for 2 years minimum (NFR58)

#### Story 27.2: Parent Audit Log View

As a **parent**,
I want **to see who has accessed my family's data**,
So that **I have complete transparency on data access**.

**Acceptance Criteria:**

**Given** parent opens audit log section
**When** viewing access history
**Then** all access events shown chronologically (newest first)
**And** each event shows: who, what, when, from where
**And** events include: my own access, co-parent access, child access
**And** external access highlighted (if any API access)
**And** filter by: person, data type, date range
**And** "My data was never accessed by anyone but family" reassurance when true

#### Story 27.3: Child Audit Log View

As a **child**,
I want **to see who viewed my screenshots and data**,
So that **I know exactly what my parents saw**.

**Acceptance Criteria:**

**Given** child opens "Who's Seen My Data" section
**When** viewing their audit log
**Then** all access to their data shown (NFR42 - child-readable)
**And** each entry shows: "Mom viewed your screenshot from Dec 14"
**And** screenshot thumbnail shown with access event
**And** child sees same data parents see (bilateral transparency)
**And** language is friendly, not surveillance-like
**And** "No one viewed your data this week" when applicable
**And** builds trust through complete transparency

#### Story 27.4: Asymmetric Viewing Pattern Detection

As **the system**,
I want **to detect unbalanced viewing patterns between parents**,
So that **potential monitoring weaponization can be identified**.

**Acceptance Criteria:**

**Given** family has multiple guardians
**When** analyzing viewing patterns weekly
**Then** calculate views-per-guardian ratio
**And** if one parent views 10x more than others, flag pattern (FR27B)
**And** alert sent to under-viewing parent: "Your co-parent has been checking more frequently"
**And** no accusation - just information sharing
**And** pattern analysis excludes setup period (first 2 weeks)
**And** helps surface potential weaponization of monitoring tool
**And** both parents can see the balance metric

#### Story 27.5: Audit Log Search and Export

As a **parent**,
I want **to search and export audit history**,
So that **I can review specific access patterns or provide records if needed**.

**Acceptance Criteria:**

**Given** parent is in audit log section
**When** searching or exporting
**Then** search by: date range, user, data type, child
**And** export available as PDF or CSV
**And** export includes all visible events with full details
**And** export watermarked with requestor ID (forensic traceability)
**And** export event itself logged in audit trail
**And** useful for: custody documentation, verifying co-parent claims

#### Story 27.6: Real-Time Access Notifications

As a **parent or child**,
I want **optional real-time notifications when my data is accessed**,
So that **I can stay informed of access as it happens**.

**Acceptance Criteria:**

**Given** user enables access notifications in settings
**When** data is accessed by another user
**Then** notification sent: "John just viewed Emma's screenshots"
**And** notification is optional (off by default)
**And** digest option available: "Daily summary of who accessed what"
**And** child can enable: "Notify me when parents view my data"
**And** notifications respect quiet hours
**And** helps anxious users feel informed without being overwhelming

---

### Epic 27.5: Family Health Check-Ins (NEW - Family Therapist)
**Goal:** System prompts periodic relationship health check-ins and provides repair resources when monitoring causes friction.

**User Outcome:** Families receive gentle prompts asking "How are conversations about monitoring going?" with both parties responding privately. System surfaces repair resources when friction detected.

**Rationale:** *Family Therapist Finding - "You've built extensive systems for CATCHING problems and GRADUATING from monitoring. But families don't need more catching - they need help REPAIRING when monitoring causes harm."*

**Features:**
- Monthly check-in prompts to parent and child (separate, private responses)
- "This flag caused a difficult conversation" marker on any reviewed flag
- Aggregated friction indicators (not specific content) visible to both parties
- Links to age-appropriate conflict resolution resources
- Optional: Connect with family therapist directory (if configured)
- "Parent apologized" / "We talked it through" resolution markers

**FRs Covered:** None (new capability for relationship health)
**NFRs:** NFR42, NFR65 (6th-grade reading for child prompts)

#### Story 27.5.1: Monthly Health Check-In Prompts

As **the system**,
I want **to prompt periodic relationship health check-ins**,
So that **families can reflect on how monitoring is affecting their relationship**.

**Acceptance Criteria:**

**Given** family has been using fledgely for 30+ days
**When** monthly check-in is due
**Then** parent receives prompt: "How are conversations about monitoring going?"
**And** child receives separate prompt (age-appropriate): "How do you feel about the monitoring?"
**And** prompts sent via app notification and email
**And** responses are private (parent doesn't see child's response, vice versa)
**And** check-in frequency configurable (weekly, monthly, quarterly)
**And** reminder sent if check-in not completed within 3 days

#### Story 27.5.2: Check-In Response Interface

As a **parent or child**,
I want **an easy way to respond to health check-ins**,
So that **I can share how I'm feeling without pressure**.

**Acceptance Criteria:**

**Given** user receives check-in prompt
**When** opening check-in screen
**Then** simple emoji scale shown: 😊 😐 😟 (Happy, Neutral, Concerned)
**And** optional follow-up questions based on selection
**And** "Things are going well" path: "What's working?"
**And** "Things are hard" path: "What's been difficult?"
**And** free-text field for additional thoughts
**And** "Skip this month" option available
**And** takes under 2 minutes to complete

#### Story 27.5.3: Flag-Triggered Friction Markers

As a **parent**,
I want **to mark when a flag caused a difficult conversation**,
So that **the system can track friction points**.

**Acceptance Criteria:**

**Given** parent has reviewed a flag
**When** marking resolution
**Then** option available: "This caused a difficult conversation"
**And** marker stored with flag (no details required)
**And** friction flags aggregated for health analysis
**And** pattern visible: "3 gaming flags led to difficult conversations"
**And** helps identify which content types cause family friction
**And** no judgment - just data for family awareness

#### Story 27.5.4: Friction Indicators Dashboard

As **both parent and child**,
I want **to see aggregated friction indicators**,
So that **we both understand how monitoring is affecting us**.

**Acceptance Criteria:**

**Given** check-ins and friction markers exist
**When** viewing family health section
**Then** aggregated indicators shown (not specific responses)
**And** indicators: "Relationship health: Mostly positive" / "Some concerns"
**And** trend line: "Improving" / "Stable" / "Needs attention"
**And** no private check-in content revealed
**And** both parties see same aggregate view (bilateral transparency)
**And** conversation starter: "You both indicated some challenges this month"

#### Story 27.5.5: Repair Resources Surfacing

As **a family experiencing friction**,
I want **to receive helpful resources for repair**,
So that **we can improve our monitoring relationship**.

**Acceptance Criteria:**

**Given** friction indicators show concern
**When** system detects repair opportunity
**Then** age-appropriate resources surfaced to both parties
**And** parent resources: "How to discuss flags without shame"
**And** child resources: "How to talk to parents about privacy"
**And** joint resources: "Family conversation starters about trust"
**And** resources link to external trusted sources
**And** optional: family therapist directory link (if enabled)
**And** resources non-intrusive, offered not forced

#### Story 27.5.6: Resolution Markers

As a **parent or child**,
I want **to mark when we've resolved an issue**,
So that **our progress is tracked**.

**Acceptance Criteria:**

**Given** friction was indicated
**When** resolution occurs
**Then** markers available: "We talked it through", "Parent apologized", "Child understood", "Still working on it"
**And** either party can add resolution marker
**And** both parties can see that resolution was marked
**And** resolution improves friction indicator trend
**And** celebrates repair: "Great job working through this together!"
**And** resolution history visible in family health section

#### Story 27.5.7: Child-Safe Check-In Language

As a **child**,
I want **check-in prompts written for my age**,
So that **I can understand and respond meaningfully**.

**Acceptance Criteria:**

**Given** child receives check-in prompt
**When** viewing check-in screen
**Then** language meets 6th-grade reading level (NFR65)
**And** examples for younger: "Does looking at your screenshots with mom/dad feel okay?"
**And** examples for teens: "How do you feel about the monitoring arrangement?"
**And** no complex emotional vocabulary required
**And** visual aids (emojis, illustrations) support comprehension
**And** response options clear and simple
**And** privacy clearly communicated: "Your parents won't see your answer"

---

### Epic 28: AI-Generated Screenshot Descriptions
**Goal:** AI generates alt-text descriptions for screenshots (blind parent accessibility).

**User Outcome:** Blind parents can understand screenshot content via screen reader.

**FRs Covered:** FR102
**NFRs:** NFR44, NFR47

#### Story 28.1: AI Description Generation

As **the system**,
I want **to generate text descriptions of screenshots using AI**,
So that **blind or visually impaired parents can understand content**.

**Acceptance Criteria:**

**Given** screenshot is captured and stored
**When** processing for accessibility
**Then** AI generates natural language description of screenshot content
**And** description covers: visible apps, text content, images, context
**And** description length 100-300 words (concise but comprehensive)
**And** generation happens asynchronously after capture
**And** description stored with screenshot metadata
**And** processing completes within 60 seconds (NFR47)

#### Story 28.2: Description Quality Standards

As **a blind parent**,
I want **descriptions that are accurate and useful**,
So that **I can understand what my child was doing**.

**Acceptance Criteria:**

**Given** AI generates description
**When** description is created
**Then** description follows accessibility best practices (NFR44)
**And** factual content prioritized over interpretation
**And** sensitive content described appropriately (not graphic)
**And** OCR extracts visible text and includes in description
**And** app names and contexts identified when recognizable
**And** "Unable to describe" fallback when image unclear

#### Story 28.3: Screen Reader Integration

As **a blind parent using a screen reader**,
I want **descriptions properly formatted for screen readers**,
So that **I can navigate content efficiently**.

**Acceptance Criteria:**

**Given** parent uses screen reader (VoiceOver, NVDA, JAWS)
**When** viewing screenshot in dashboard
**Then** description set as alt-text for screenshot image
**And** description also available as expandable text
**And** semantic HTML ensures proper reading order
**And** "Read full description" button for detailed version
**And** keyboard navigation fully supported
**And** tested with VoiceOver (iOS/macOS) and NVDA (Windows)

#### Story 28.4: Description Display in Dashboard

As **a parent**,
I want **to see AI-generated descriptions alongside screenshots**,
So that **I have text context even when image is unclear**.

**Acceptance Criteria:**

**Given** screenshot has AI description
**When** parent views screenshot
**Then** description shown below/beside screenshot
**And** collapsible for sighted users who prefer images
**And** expanded by default when screen reader detected
**And** description helps when screenshot is blurry or low-resolution
**And** "AI Generated" label indicates source
**And** useful for all parents, not just visually impaired

#### Story 28.5: Description Generation Failures

As **the system**,
I want **to handle description generation failures gracefully**,
So that **parents still have access to screenshots**.

**Acceptance Criteria:**

**Given** AI description generation fails
**When** displaying screenshot
**Then** fallback text shown: "Description unavailable"
**And** screenshot still accessible (image visible for sighted users)
**And** retry option available: "Generate description"
**And** manual description request queued for processing
**And** failure logged for monitoring
**And** never blocks screenshot display waiting for description

#### Story 28.6: Accessibility Settings

As **a parent with visual impairment**,
I want **to configure accessibility preferences**,
So that **the app works best for my needs**.

**Acceptance Criteria:**

**Given** parent has accessibility needs
**When** configuring settings
**Then** "Always show descriptions" toggle available
**And** "High contrast mode" option for low-vision users
**And** "Larger text" option (respects system settings)
**And** "Audio descriptions" option for spoken playback
**And** settings sync across devices
**And** settings detectable from OS accessibility preferences

---

### Phase 4: Time Management & Agreements (Epics 29-38)
*Time limits, earned autonomy, agreement lifecycle*

---

### Epic 29: Time Tracking Foundation
**Goal:** System tracks screen time across enrolled devices.

**User Outcome:** Accurate screen time data per child visible to parents.

**FRs Covered:** FR50, FR55
**NFRs:** NFR7, NFR42

#### Story 29.1: Screen Time Data Model

As **the system**,
I want **a data model to track screen time**,
So that **time usage can be stored and queried accurately**.

**Acceptance Criteria:**

**Given** screen time needs to be tracked
**When** designing data model
**Then** schema includes: childId, deviceId, date, appCategory, minutes
**And** time tracked per-day granularity (not real-time streaming)
**And** Zod schema created: `screenTimeSchema` in @fledgely/contracts
**And** supports aggregation by: day, week, device, category
**And** timezone stored with record (child's local time)
**And** data retained per screenshot retention policy

#### Story 29.2: Chromebook Screen Time Capture

As **the Chromebook extension**,
I want **to capture screen time data**,
So that **parents can see Chromebook usage**.

**Acceptance Criteria:**

**Given** extension is installed and enrolled
**When** child uses Chromebook
**Then** active tab time tracked (not just open tabs)
**And** idle detection: no tracking when screen locked/inactive
**And** app/site category inferred from URL or tab title
**And** time data batched and synced every 15 minutes
**And** offline tracking with sync when online
**And** crisis URLs excluded from time tracking (zero-data-path)

#### Story 29.3: Android Screen Time Capture

As **the Android app**,
I want **to capture screen time data**,
So that **parents can see Android device usage**.

**Acceptance Criteria:**

**Given** Android app has UsageStats permission
**When** child uses device
**Then** foreground app time tracked via UsageStatsManager
**And** app category from Play Store metadata when available
**And** custom category mapping for uncategorized apps
**And** time data synced via WorkManager (batched)
**And** offline storage in Room database
**And** crisis URLs/apps excluded from tracking

#### Story 29.4: Parent Screen Time Dashboard

As **a parent**,
I want **to see my child's screen time**,
So that **I understand their device usage patterns**.

**Acceptance Criteria:**

**Given** screen time data exists
**When** parent views dashboard
**Then** today's total time shown prominently
**And** breakdown by device: "Chromebook: 2h, Android: 1h"
**And** breakdown by category: "Education: 1.5h, Gaming: 1h, Social: 30m"
**And** daily/weekly trend chart
**And** comparison to agreed limits (if set)
**And** "Most used apps" list with time per app

#### Story 29.5: Child Screen Time View

As **a child**,
I want **to see my own screen time**,
So that **I can self-regulate my usage**.

**Acceptance Criteria:**

**Given** child has screen time data
**When** child views their dashboard
**Then** today's total time shown (same data parent sees)
**And** friendly visualization (bar chart, pie chart)
**And** language appropriate: "You've used 2 hours today"
**And** comparison to limits: "1 hour left for gaming"
**And** historical view: "This week vs last week"
**And** encourages self-awareness without shame

#### Story 29.6: Screen Time Accuracy Validation

As **the development team**,
I want **screen time tracking to be accurate**,
So that **families can trust the data**.

**Acceptance Criteria:**

**Given** screen time is tracked
**When** validating accuracy
**Then** time matches actual usage within 5% (NFR7)
**And** edge cases handled: app switching, multitasking, split-screen
**And** background app time not counted as active use
**And** system apps excluded from tracking
**And** integration tests verify accuracy with simulated usage
**And** discrepancy logging for debugging

---

### Epic 30: Time Limits Configuration
**Goal:** Parents can set time limits (daily, per-device, per-app-category) with custom categories.

**User Outcome:** Time limits are defined in agreement with family-specific categories.

**FRs Covered:** FR56, FR142
**NFRs:** NFR42

#### Story 30.1: Time Limit Data Model

As **the system**,
I want **a data model for time limits**,
So that **limits can be configured and enforced**.

**Acceptance Criteria:**

**Given** time limits need to be stored
**When** designing data model
**Then** schema includes: childId, limitType, category, minutes, schedule
**And** limitType supports: "daily_total", "per_device", "per_category"
**And** schedule supports: weekday vs weekend different limits
**And** Zod schema: `timeLimitSchema` in @fledgely/contracts
**And** limits linked to agreement (part of family agreement)
**And** effective dates support future-dated changes

#### Story 30.2: Daily Total Limit Configuration

As **a parent**,
I want **to set a daily total screen time limit**,
So that **my child has a maximum daily usage**.

**Acceptance Criteria:**

**Given** parent is configuring time limits
**When** setting daily total
**Then** slider or input for total minutes (30m - 8h range)
**And** separate limits for weekdays vs weekends
**And** "School days" vs "Non-school days" option
**And** preview: "Emma can use devices for 2 hours on school days"
**And** limit applies across all enrolled devices combined
**And** changes require child acknowledgment (agreement update)

#### Story 30.3: Per-Category Limit Configuration

As **a parent**,
I want **to set limits per app category**,
So that **I can allow more time for education than gaming**.

**Acceptance Criteria:**

**Given** parent is configuring category limits
**When** setting per-category limits
**Then** categories available: Education, Gaming, Social, Entertainment, Other
**And** custom categories can be created (FR142)
**And** per-category limit can exceed daily total (not enforced simultaneously)
**And** "Unlimited" option for education category
**And** example: "Gaming: 1h/day, Education: Unlimited, Social: 30m/day"
**And** visual configuration with category icons

#### Story 30.4: Custom Category Creation

As **a parent**,
I want **to create custom app categories**,
So that **limits match my family's values**.

**Acceptance Criteria:**

**Given** parent wants custom categories
**When** creating custom category
**Then** category name entered (max 30 chars)
**And** apps/sites assigned to category via search
**And** category inherits from default or starts empty
**And** example: "Homework Apps" category with Khan Academy, Google Docs
**And** custom categories visible to child in their dashboard
**And** maximum 10 custom categories per family

#### Story 30.5: Per-Device Limit Configuration

As **a parent**,
I want **to set different limits per device**,
So that **school Chromebook has different rules than personal phone**.

**Acceptance Criteria:**

**Given** multiple devices enrolled
**When** configuring per-device limits
**Then** each device can have its own daily limit
**And** device-specific category overrides possible
**And** example: "School Chromebook: Education unlimited, Gaming blocked"
**And** device type shown: Chromebook, Android phone, Android tablet
**And** "Apply same limits to all devices" shortcut available
**And** per-device limits independent of daily total

#### Story 30.6: Limit Preview and Validation

As **a parent**,
I want **to preview how limits will work**,
So that **I understand the rules before activating**.

**Acceptance Criteria:**

**Given** parent has configured limits
**When** reviewing before save
**Then** summary shown: "Emma's limits: 2h total, 1h gaming, unlimited education"
**And** conflict detection: "Warning: Gaming limit exceeds daily total"
**And** scenario preview: "If Emma uses 1h gaming, she has 1h left for other apps"
**And** child preview: "This is what Emma will see"
**And** validation prevents impossible configurations
**And** "Save and notify child" button to activate

---

### Epic 31: Time Limit Enforcement & Warnings
**Goal:** System enforces limits with countdown warnings including neurodivergent accommodations.

**User Outcome:** Children see remaining time; devices enforce limits; educational resources exempted.

**FRs Covered:** FR57, FR58, FR104, FR109, FR129, FR143
**NFRs:** NFR42, NFR104

#### Story 31.1: Countdown Warning System

As **a child**,
I want **to see countdown warnings before my time runs out**,
So that **I can finish what I'm doing gracefully**.

**Acceptance Criteria:**

**Given** child is approaching time limit
**When** time remaining reaches warning thresholds
**Then** warning at 15 minutes: gentle notification "15 minutes left"
**And** warning at 5 minutes: prominent notification "5 minutes left"
**And** warning at 1 minute: urgent notification "1 minute - save your work"
**And** countdown timer visible in system tray/status bar
**And** warnings are non-intrusive (don't interrupt active work)
**And** warning thresholds configurable by parent (FR143)

#### Story 31.2: Neurodivergent Transition Accommodations

As **a neurodivergent child**,
I want **extra transition time and gentle warnings**,
So that **time limits don't cause distress**.

**Acceptance Criteria:**

**Given** child has neurodivergent accommodation enabled (FR129)
**When** approaching time limit
**Then** additional warning at 30 minutes ("Start wrapping up soon")
**And** extended 5-minute grace period after limit reached
**And** visual countdown uses calming colors (not red/alarming)
**And** audio warnings optional (can be disabled)
**And** "Transition mode" dims screen gradually instead of hard cutoff
**And** accommodation settings per-child in agreement

#### Story 31.3: Education Content Exemption

As **a parent**,
I want **educational content to be exempt from time limits**,
So that **homework and learning aren't interrupted**.

**Acceptance Criteria:**

**Given** education exemption is enabled (FR104)
**When** child uses educational apps/sites
**Then** time in "Education" category doesn't count toward daily limit
**And** exemption applies to: curated education apps, school domains
**And** parent can add custom sites to education exemption list
**And** child sees: "Homework time doesn't count toward your limit"
**And** usage still tracked for visibility (just not limited)
**And** anti-gaming: can't relabel gaming as education

#### Story 31.4: Chromebook Time Limit Enforcement

As **the Chromebook extension**,
I want **to enforce time limits on the device**,
So that **limits are actually respected**.

**Acceptance Criteria:**

**Given** time limit is reached on Chromebook
**When** enforcement activates
**Then** non-educational tabs blocked with friendly message
**And** message: "Screen time is up! Take a break."
**And** educational tabs remain accessible (if exemption enabled)
**And** child can request extension (routed to parent)
**And** override code available for emergencies (logged)
**And** enforcement persists through browser restart

#### Story 31.5: Android Time Limit Enforcement

As **the Android app**,
I want **to enforce time limits on the device**,
So that **limits work on phones and tablets**.

**Acceptance Criteria:**

**Given** time limit is reached on Android
**When** enforcement activates
**Then** overlay displays: "Screen time is up!"
**And** non-educational apps blocked (greyed out in launcher)
**And** educational apps remain accessible
**And** phone/emergency functions always accessible
**And** "Request more time" button on overlay
**And** enforcement uses Device Admin or Accessibility Service

#### Story 31.6: Time Extension Requests

As **a child**,
I want **to request more time when my limit is reached**,
So that **I can finish something important**.

**Acceptance Criteria:**

**Given** child's time limit is reached
**When** child requests extension
**Then** request sent to parent with reason options
**And** reason options: "Finishing homework", "5 more minutes", "Important project"
**And** parent receives notification with one-tap approve/deny
**And** approved extension adds time immediately
**And** denied request shows: "Mom said not right now"
**And** request limited to 2 per day (prevent spam)
**And** auto-deny if parent doesn't respond in 10 minutes (configurable)

#### Story 31.7: Time Limit Override for Emergencies

As **a parent**,
I want **an emergency override for time limits**,
So that **my child can use devices when truly needed**.

**Acceptance Criteria:**

**Given** child needs device access after limit
**When** parent initiates override
**Then** parent can grant temporary unlimited access
**And** override duration: 30m, 1h, 2h, "Rest of day"
**And** override reason logged: "School emergency", "Travel", "Other"
**And** child sees: "Mom gave you extra time today"
**And** override visible in audit log
**And** doesn't affect next day's limits

---

### Epic 32: Family Offline Time
**Goal:** System enforces family-wide offline time including parent devices.

**User Outcome:** Entire family goes offline together at configured times; parent compliance tracked.

**FRs Covered:** FR59, FR60
**NFRs:** NFR42

#### Story 32.1: Family Offline Schedule Configuration

As **a parent**,
I want **to configure family-wide offline times**,
So that **our whole family disconnects together**.

**Acceptance Criteria:**

**Given** parent is setting up family offline time
**When** configuring schedule
**Then** daily schedule: start time and end time (e.g., 8pm-7am)
**And** different schedules for weekdays vs weekends
**And** "Dinner time" quick preset (6pm-7pm daily)
**And** "Bedtime" quick preset (9pm-7am)
**And** schedule applies to all family members (parents included)
**And** child sees: "Family offline time: Everyone unplugs together!"

#### Story 32.2: Parent Device Enrollment for Offline Time

As **a parent**,
I want **to enroll my own devices in offline time**,
So that **I model the behavior I expect from my children**.

**Acceptance Criteria:**

**Given** family offline time is configured
**When** parent enrolls their devices
**Then** parent can add their phone/tablet to offline enforcement
**And** enrollment is voluntary but visible to children
**And** "Mom's phone is enrolled" shown in family settings
**And** parent compliance tracked (FR60)
**And** non-enrolled parent devices noted: "Dad hasn't enrolled yet"
**And** encourages modeling but doesn't force parent enrollment

#### Story 32.3: Family Offline Time Enforcement

As **the system**,
I want **to enforce offline time across enrolled devices**,
So that **the family actually disconnects**.

**Acceptance Criteria:**

**Given** family offline time begins
**When** enforcement activates
**Then** all enrolled devices show "Family Offline Time" screen
**And** non-essential apps blocked on child devices
**And** parent devices show reminder (enforcement optional for parents)
**And** emergency calls/texts always allowed
**And** 5-minute warning before offline time starts
**And** countdown shows: "Family time starts in 5 minutes"

#### Story 32.4: Parent Compliance Tracking

As **a child**,
I want **to see if my parents follow offline time too**,
So that **I know the rules are fair**.

**Acceptance Criteria:**

**Given** parent has enrolled devices
**When** offline time period ends
**Then** compliance logged: "Mom was offline for family time ✓"
**And** child can see parent compliance in their dashboard
**And** non-compliance noted: "Dad used phone during offline time"
**And** no shaming - just transparency
**And** builds trust through shared accountability
**And** parents see their own compliance stats too

#### Story 32.5: Offline Time Exceptions

As **a parent**,
I want **to configure exceptions to offline time**,
So that **emergencies and special cases are handled**.

**Acceptance Criteria:**

**Given** offline time is active
**When** exception is needed
**Then** "Pause offline time" option for parents (logged)
**And** emergency contacts always reachable
**And** work exceptions for parents (specific apps whitelisted)
**And** homework exception for children (education apps only)
**And** one-time skip: "Skip tonight's offline time"
**And** all exceptions logged in audit trail

#### Story 32.6: Offline Time Celebration

As **a family**,
I want **to see our offline time streaks**,
So that **we're motivated to keep disconnecting together**.

**Acceptance Criteria:**

**Given** family completes offline time periods
**When** viewing family dashboard
**Then** streak counter: "7 days of family offline time!"
**And** weekly summary: "Your family unplugged 14 hours together"
**And** celebration milestones: 7 days, 30 days, 100 days
**And** family leaderboard (optional): "Johnson family: 45 day streak"
**And** positive reinforcement, never punitive
**And** child sees: "Great job unplugging with your family!"

---

### Epic 33: Focus Mode & Work Mode
**Goal:** Children can enable focus mode; parents can configure work mode for working teens.

**User Outcome:** Special modes accommodate deep work, teen employment, and calendar integration.

**FRs Covered:** FR110, FR115, FR116, FR144
**NFRs:** NFR42

#### Story 33.1: Child-Initiated Focus Mode

As **a child**,
I want **to enable focus mode when I need to concentrate**,
So that **I can do deep work without distractions**.

**Acceptance Criteria:**

**Given** child wants to focus
**When** enabling focus mode
**Then** one-tap "Focus Mode" button available
**And** focus mode blocks: social media, games, entertainment
**And** focus mode allows: education, productivity apps
**And** duration options: 25min (pomodoro), 1h, 2h, "Until I turn off"
**And** child controls when to start/stop (autonomy)
**And** parent sees: "Emma enabled focus mode" (transparency, not control)

#### Story 33.2: Focus Mode App Configuration

As **a parent**,
I want **to configure which apps are allowed during focus mode**,
So that **my child has appropriate tools for concentration**.

**Acceptance Criteria:**

**Given** focus mode needs configuration
**When** parent sets up focus mode apps
**Then** default allow list: Google Docs, educational sites, productivity
**And** default block list: social media, games, streaming
**And** custom apps can be added to either list
**And** child can suggest apps: "Can I use Spotify during focus?"
**And** parent approves/denies suggestions
**And** configuration stored in agreement

#### Story 33.3: Work Mode for Employed Teens

As **a parent of a working teen**,
I want **to configure work mode for their job hours**,
So that **monitoring doesn't interfere with employment**.

**Acceptance Criteria:**

**Given** teen has a job (FR115, FR116)
**When** work mode is configured
**Then** work schedule entered: "Saturdays 10am-4pm"
**And** during work hours: reduced monitoring, no time limits
**And** work-related apps whitelisted (scheduling, communication)
**And** screenshot capture paused during work (privacy at workplace)
**And** work mode activates automatically per schedule
**And** teen can manually start/stop if schedule varies

#### Story 33.4: Calendar Integration for Modes

As **a child**,
I want **focus mode to integrate with my calendar**,
So that **it activates automatically during homework time**.

**Acceptance Criteria:**

**Given** child has connected calendar (FR144)
**When** calendar event is "Study" or "Homework"
**Then** focus mode auto-activates during calendar event
**And** Google Calendar integration supported
**And** school calendar integration (if available)
**And** manual override: child can exit early if needed
**And** notification: "Focus mode starting for 'Math Homework'"
**And** parent sees calendar-triggered focus sessions

#### Story 33.5: Focus Mode Analytics

As **a parent**,
I want **to see how my child uses focus mode**,
So that **I can understand their study habits**.

**Acceptance Criteria:**

**Given** child has used focus mode
**When** parent views analytics
**Then** summary: "Emma used focus mode 5 times this week"
**And** average duration: "45 minutes per session"
**And** timing patterns: "Usually 4-6pm on weekdays"
**And** completion rate: "Completed 80% of focus sessions"
**And** positive framing: celebrates focus, doesn't punish breaks
**And** child sees same analytics (bilateral transparency)

#### Story 33.6: Work Mode Verification

As **the system**,
I want **to verify work mode is used appropriately**,
So that **it's not abused to bypass monitoring**.

**Acceptance Criteria:**

**Given** work mode is configured
**When** monitoring work mode usage
**Then** work hours tracked: "Jake worked 6 hours this week"
**And** anomaly detection: alert if work mode exceeds typical hours
**And** "Work mode used outside scheduled hours" notification to parent
**And** parent can request: "What were you doing at work?"
**And** trust-based: no automatic blocking, just transparency
**And** respects teen's growing independence

---

### Epic 34: Agreement Changes & Proposals
**Goal:** Either party can propose changes; changes require both signatures.

**User Outcome:** Agreement evolves through negotiation with child voice respected.

**FRs Covered:** FR23, FR25, FR121
**NFRs:** NFR5 (60-second sync), NFR42

#### Story 34.1: Parent-Initiated Agreement Change

As **a parent**,
I want **to propose changes to our family agreement**,
So that **rules can evolve as my child grows**.

**Acceptance Criteria:**

**Given** parent wants to change agreement
**When** initiating change proposal
**Then** parent selects which section to modify
**And** changes shown in diff view (old vs new)
**And** reason for change can be added: "You've been responsible with gaming"
**And** proposal sent to child for review
**And** child notified: "Mom proposed a change to your agreement"
**And** change not active until child accepts

#### Story 34.2: Child-Initiated Agreement Change

As **a child**,
I want **to propose changes to our agreement**,
So that **I have a voice in my own monitoring**.

**Acceptance Criteria:**

**Given** child wants to propose a change (FR121)
**When** creating proposal
**Then** child selects what they want to change
**And** child provides reason: "I need more gaming time on weekends"
**And** proposal sent to parent for review
**And** parent notified: "Emma proposed a change to the agreement"
**And** child sees proposal status: "Waiting for mom to review"
**And** empowers child voice in family rules

#### Story 34.3: Change Review and Negotiation

As **a parent or child**,
I want **to review and respond to proposals**,
So that **we can negotiate agreement changes**.

**Acceptance Criteria:**

**Given** proposal is pending
**When** reviewer opens proposal
**Then** full diff shown: what changes, what stays same
**And** options: "Accept", "Decline", "Counter-propose"
**And** counter-propose allows modification before accepting
**And** comments can be added: "I'd agree to 1 hour, not 2"
**And** negotiation history visible to both parties
**And** multiple rounds of counter-proposals supported

#### Story 34.4: Dual-Signature Change Activation

As **the system**,
I want **changes to require both signatures**,
So that **agreement changes are truly consensual**.

**Acceptance Criteria:**

**Given** proposal has been accepted by recipient
**When** finalizing change
**Then** proposer confirms final acceptance
**And** both digital signatures recorded
**And** change effective immediately (NFR5 - 60-second sync)
**And** new agreement version created
**And** both parties notified: "Agreement updated!"
**And** change logged in agreement history

#### Story 34.5: Change Decline Handling

As **a parent or child**,
I want **to decline proposals respectfully**,
So that **we can disagree without conflict**.

**Acceptance Criteria:**

**Given** proposal received
**When** declining
**Then** decline reason required: "Not ready for this change yet"
**And** decline notification sent to proposer
**And** language is respectful, not punitive
**And** proposer can try again later
**And** no limit on proposals, but 7-day cooldown for same change
**And** declined doesn't mean forever - opens conversation

#### Story 34.6: Agreement Change History

As **a family member**,
I want **to see the history of agreement changes**,
So that **we can see how our rules have evolved**.

**Acceptance Criteria:**

**Given** agreement has been changed over time
**When** viewing change history
**Then** timeline shows all versions with dates
**And** each change shows: who proposed, who accepted, what changed
**And** diff view available for any two versions
**And** "We've updated the agreement 5 times" summary
**And** history demonstrates growth and trust-building
**And** export available for records

---

### Epic 35: Agreement Renewal & Expiry
**Goal:** Agreements have renewal reminders and expiry handling with grace periods.

**User Outcome:** Families reminded to renew; expired agreements trigger grace period not device lockout.

**FRs Covered:** FR24, FR147, FR148
**NFRs:** NFR42

#### Story 35.1: Agreement Expiry Configuration

As **a parent**,
I want **to set an agreement expiry date**,
So that **we regularly revisit our monitoring arrangement**.

**Acceptance Criteria:**

**Given** agreement is being created or modified
**When** setting expiry
**Then** expiry options: 3 months, 6 months, 1 year, "No expiry"
**And** recommended: 6 months for younger children, 1 year for teens
**And** expiry date shown prominently in agreement view
**And** "No expiry" still prompts annual review reminder
**And** expiry date can be changed via agreement modification (Epic 34)
**And** child sees when agreement expires

#### Story 35.2: Renewal Reminder System

As **a family**,
I want **to receive renewal reminders before agreement expires**,
So that **we don't forget to renew**.

**Acceptance Criteria:**

**Given** agreement has expiry date
**When** approaching expiry
**Then** reminder at 30 days: "Agreement expires in 30 days"
**And** reminder at 7 days: "Renew your agreement this week"
**And** reminder at 1 day: "Agreement expires tomorrow"
**And** reminders sent to both parent and child
**And** reminder includes one-tap "Renew now" action
**And** snooze option: "Remind me in 3 days"

#### Story 35.3: Agreement Renewal Flow

As **a parent**,
I want **to easily renew our agreement**,
So that **monitoring can continue smoothly**.

**Acceptance Criteria:**

**Given** renewal reminder received
**When** initiating renewal
**Then** option: "Renew as-is" or "Renew with changes"
**And** "Renew as-is" extends expiry with same terms
**And** "Renew with changes" enters modification flow (Epic 34)
**And** child must consent to renewal (even as-is)
**And** both signatures required for renewal
**And** new expiry date set upon renewal completion

#### Story 35.4: Expired Agreement Grace Period

As **a family with expired agreement**,
I want **a grace period before monitoring stops**,
So that **we have time to renew without disruption**.

**Acceptance Criteria:**

**Given** agreement has expired
**When** grace period begins (FR147, FR148)
**Then** 14-day grace period starts automatically
**And** monitoring continues during grace period
**And** banner shown: "Agreement expired - please renew within 14 days"
**And** daily reminders during grace period
**And** no device lockout - just reminders
**And** child sees: "Your agreement needs renewal"

#### Story 35.5: Post-Grace Period Handling

As **the system**,
I want **to handle agreements not renewed after grace period**,
So that **monitoring doesn't continue without consent**.

**Acceptance Criteria:**

**Given** grace period has expired without renewal
**When** 14 days pass
**Then** monitoring pauses (no new screenshots captured)
**And** existing data preserved (not deleted)
**And** time limits no longer enforced
**And** both parties notified: "Monitoring paused - renew to resume"
**And** can renew at any time to resume
**And** no punitive device restrictions

#### Story 35.6: Annual Review Prompts

As **a family**,
I want **annual prompts to review our agreement**,
So that **monitoring evolves with my child's growth**.

**Acceptance Criteria:**

**Given** agreement anniversary approaches
**When** 1 year since last review
**Then** prompt sent: "It's been a year - time for an agreement review?"
**And** prompt includes: "Your child has grown - consider updating terms"
**And** suggestions based on age: "Many 14-year-olds have reduced screenshot frequency"
**And** optional family meeting reminder
**And** prompt even for "no expiry" agreements
**And** celebrates healthy relationship: "1 year of building trust together!"

---

### Epic 34.5: Child Voice Escalation (NEW - Child Rights Advocate)
**Goal:** Provide children a meaningful escalation path when their agreement change requests are consistently denied.

**User Outcome:** After multiple rejected requests, system facilitates family mediation rather than leaving the child voiceless.

**Rationale:** *Child Rights Advocate Finding - "If a parent rejects every agreement change the child proposes, the child has no recourse. Their 'voice' exists, but has no power."*

**Features:**
- After 3 rejected change requests within 90 days, system prompts mediation resources
- Offers neutral family mediation service directory (opt-in)
- Suggests family meeting template for discussing monitoring disagreements
- Child can request "agreement review" that prompts BOTH parties to reassess terms
- System tracks request/response patterns (not content) to surface communication breakdowns
- Resources for age-appropriate negotiation techniques

**FRs Covered:** Extends FR121 (child change requests)
**NFRs:** NFR42, NFR65 (child-appropriate language)

**Note:** This is not arbitration - parents retain final authority. This ensures children have a VOICE that is genuinely heard.

#### Story 34.5.1: Rejection Pattern Tracking

As **the system**,
I want **to track patterns of rejected child proposals**,
So that **communication breakdowns can be identified**.

**Acceptance Criteria:**

**Given** child submits agreement change proposals
**When** proposals are rejected
**Then** system tracks: proposal count, rejection count, dates
**And** pattern analysis runs after each rejection
**And** only patterns tracked, not proposal content
**And** 90-day rolling window for pattern detection
**And** threshold: 3 rejections within 90 days triggers escalation
**And** tracking respects privacy (aggregate only)

#### Story 34.5.2: Mediation Resource Prompt

As **a child with consistently rejected proposals**,
I want **access to mediation resources**,
So that **I have a path forward when feeling unheard**.

**Acceptance Criteria:**

**Given** 3+ proposals rejected in 90 days
**When** threshold reached
**Then** child receives: "It seems you and your parent disagree. Here are some resources."
**And** resources include: family mediation services directory
**And** family meeting template for discussing disagreements
**And** age-appropriate negotiation tips
**And** prompt is supportive, not accusatory toward parent
**And** parent also notified: "Your child may feel unheard - consider a family conversation"

#### Story 34.5.3: Agreement Review Request

As **a child**,
I want **to request a formal agreement review**,
So that **both parties are prompted to reassess terms together**.

**Acceptance Criteria:**

**Given** child feels current agreement is unfair
**When** requesting agreement review
**Then** "Request Agreement Review" button available
**And** request prompts both parent and child to review current terms
**And** parent receives: "Emma is requesting that you both review the agreement"
**And** system suggests specific areas to discuss
**And** review request limited to once per 60 days
**And** not a demand - an invitation to dialogue

#### Story 34.5.4: Family Meeting Template

As **a family experiencing disagreement**,
I want **a structured template for discussing monitoring**,
So that **we can have productive conversations**.

**Acceptance Criteria:**

**Given** family accesses mediation resources
**When** viewing meeting template
**Then** template includes: conversation starters, ground rules, reflection questions
**And** parent section: "What concerns drive your current rules?"
**And** child section: "What feels unfair and why?"
**And** joint section: "What compromises might work?"
**And** template is printable/shareable
**And** optional: schedule meeting reminder in app

#### Story 34.5.5: Communication Health Indicator

As **a parent**,
I want **to see communication health with my child**,
So that **I can proactively address brewing frustration**.

**Acceptance Criteria:**

**Given** agreement has change request history
**When** parent views agreement dashboard
**Then** indicator shows: "Communication health: Healthy / Needs attention"
**And** "Needs attention" if multiple rejections without counter-proposals
**And** suggestion: "Your child has made 4 requests this month - consider discussing"
**And** no blame - just awareness
**And** helps parents notice patterns before escalation
**And** child sees same indicator (transparency)

#### Story 34.5.6: Age-Appropriate Negotiation Resources

As **a child**,
I want **tips for negotiating with my parents**,
So that **I can advocate for myself effectively**.

**Acceptance Criteria:**

**Given** child is learning to negotiate
**When** accessing resources
**Then** age-appropriate negotiation tips provided (NFR65)
**And** tips include: how to explain your reasoning, picking good timing
**And** examples: "Instead of 'I want more time', try 'Can we try 30 extra minutes for a week?'"
**And** respects parent authority while empowering child voice
**And** teaches life skills, not manipulation
**And** available proactively, not just after rejections

---

### Epic 36: Trust Score Foundation
**Goal:** System calculates trust scores based on responsible behavior without auto-punishment.

**User Outcome:** Child has a visible trust score; bypass attempts logged for conversation, not punishment.

**FRs Covered:** FR67, FR130, FR134
**NFRs:** NFR63, NFR42

#### Story 36.1: Trust Score Data Model

As **the system**,
I want **a data model for trust scores**,
So that **responsible behavior can be tracked and recognized**.

**Acceptance Criteria:**

**Given** trust scores need to be calculated
**When** designing data model
**Then** schema includes: childId, currentScore, history, factors
**And** score range: 0-100 (100 = highest trust)
**And** Zod schema: `trustScoreSchema` in @fledgely/contracts
**And** history tracks score changes over time with reasons
**And** factors breakdown: which behaviors contributed
**And** score updates daily (not real-time)

#### Story 36.2: Trust Score Calculation

As **the system**,
I want **to calculate trust scores based on behavior patterns**,
So that **responsible behavior is recognized**.

**Acceptance Criteria:**

**Given** child has activity data
**When** calculating trust score
**Then** positive factors: time limit compliance, focus mode usage, no bypass attempts
**And** neutral factors: normal app usage within limits
**And** concerning factors: bypass attempts, disabled monitoring (logged not punished)
**And** calculation weighted toward recent behavior (last 30 days)
**And** starting score: 70 (benefit of the doubt)
**And** calculation transparent (child can see why)

#### Story 36.3: Trust Score Display to Child

As **a child**,
I want **to see my trust score**,
So that **I understand where I stand**.

**Acceptance Criteria:**

**Given** child has trust score
**When** viewing their dashboard
**Then** score displayed prominently: "Your trust score: 85"
**And** trend shown: "Up 5 points this month"
**And** factors breakdown: "Following time limits: +10"
**And** language is encouraging, not punitive
**And** tips: "To improve: stick to time limits for 2 weeks"
**And** score framed as growth metric, not judgment

#### Story 36.4: Trust Score Display to Parent

As **a parent**,
I want **to see my child's trust score**,
So that **I can understand their behavior patterns**.

**Acceptance Criteria:**

**Given** child has trust score
**When** parent views dashboard
**Then** same score visible as child sees (transparency)
**And** historical chart: trust score over time
**And** milestone markers: "Reached 90 on Sept 15"
**And** factor details available on click
**And** guidance: "High trust = consider reducing monitoring"
**And** no auto-punishment tied to score

#### Story 36.5: Bypass Attempt Logging

As **the system**,
I want **to detect and log potential bypass attempts**,
So that **parents are informed for conversation, not auto-punishment**.

**Acceptance Criteria:**

**Given** monitoring is active
**When** potential bypass detected (FR134)
**Then** bypass logged: extension disabled, VPN usage, incognito mode
**And** parent notified: "Something to discuss with Emma"
**And** NO automatic punishment (time reduction, lockout)
**And** logged for conversation, not accusation
**And** child sees: "Your parent was notified about incognito usage"
**And** trust score impact is minimal unless repeated pattern

#### Story 36.6: Trust Score Privacy

As **a child**,
I want **my trust score to be private within my family**,
So that **siblings and others can't see it**.

**Acceptance Criteria:**

**Given** multiple children in family
**When** viewing trust scores
**Then** each child sees only their own score
**And** parents see each child's score separately
**And** siblings cannot compare scores
**And** no family-wide leaderboard (prevents competition)
**And** trust score not shared outside family
**And** privacy maintains dignity and prevents shame

---

### Epic 37: Developmental Rights Recognition (Reframed - Child Rights Advocate)
**Goal:** Restrictions automatically adjust at trust milestones as recognition of developmental growth - not as behavioral reward.

**User Outcome:** Higher trust = recognition of maturity through reduced monitoring (reduced screenshots, notification-only mode).

**Rationale:** *Child Rights Advocate Finding - "Privacy is a RIGHT - it's not earned, it's inherent. 'We're reducing monitoring because you're maturing' respects developmental rights."*

**Framing Change:** System language uses "developmental recognition" not "earned reward":
- ❌ "You've earned more privacy"
- ✅ "We're recognizing your growth by reducing monitoring"

**FRs Covered:** FR68, FR69, FR70
**NFRs:** NFR42

**Pre-mortem Addition:**
- **FR37A:** At 95%+ trust for 6 months, monitoring AUTOMATICALLY reduces (not optional) - developmental rights must be honored

#### Story 37.1: Trust Milestone Definitions

As **the system**,
I want **to define trust milestones that trigger monitoring adjustments**,
So that **developmental growth is recognized systematically**.

**Acceptance Criteria:**

**Given** trust score system exists
**When** defining milestones
**Then** milestones defined: 80 (Growing), 90 (Maturing), 95 (Ready for independence)
**And** duration requirement: score maintained for 30+ days
**And** milestone notifications sent to both parties
**And** language: "Recognizing your growth" not "You've earned"
**And** milestones documented in agreement
**And** regression handled gracefully (not punitive)

#### Story 37.2: Reduced Screenshot Frequency

As **a child with high trust score**,
I want **screenshot frequency to decrease**,
So that **my growing maturity is recognized with more privacy**.

**Acceptance Criteria:**

**Given** child reaches trust milestone (FR68)
**When** milestone triggers adjustment
**Then** 80+ trust: screenshots reduce from every 5min to every 15min
**And** 90+ trust: screenshots reduce to every 30min
**And** 95+ trust: screenshots reduce to hourly or notification-only
**And** child notified: "We're recognizing your growth with fewer screenshots"
**And** parent can override (but override logged)
**And** adjustment is automatic, not parent-initiated

#### Story 37.3: Notification-Only Mode

As **a child approaching independence**,
I want **notification-only monitoring mode**,
So that **I have maximum privacy while parents stay informed**.

**Acceptance Criteria:**

**Given** child has 95+ trust for extended period (FR69)
**When** notification-only mode activates
**Then** no screenshots captured
**And** parents receive daily summary: "Emma used device 3 hours today"
**And** only concerning patterns trigger alerts (not individual events)
**And** time limits still enforced (if configured)
**And** child sees: "You're in notification-only mode - we trust you"
**And** represents near-graduation status

#### Story 37.4: Automatic Monitoring Reduction (FR37A)

As **a child with sustained high trust**,
I want **monitoring to automatically reduce**,
So that **my developmental rights are honored, not just offered**.

**Acceptance Criteria:**

**Given** child has 95%+ trust for 6 months (FR37A)
**When** threshold reached
**Then** monitoring AUTOMATICALLY reduces (not optional)
**And** parent notified: "Your child's demonstrated maturity means reduced monitoring"
**And** parent cannot override without child agreement
**And** honors privacy as a right, not a reward
**And** both parties celebrate: "6 months of trust - monitoring reducing"
**And** sets expectation of eventual graduation

#### Story 37.5: Developmental Framing in UI

As **a child**,
I want **system messaging to frame privacy as a right**,
So that **I don't feel like I'm earning what I deserve**.

**Acceptance Criteria:**

**Given** child views trust-related screens
**When** reading system messages
**Then** language uses "recognition" not "reward"
**And** examples: "Recognizing your maturity" not "You've earned privacy"
**And** emphasis: privacy is inherent, monitoring is temporary support
**And** messaging validated with child rights advocate
**And** helps children understand their developmental rights
**And** reduces shame around monitoring

#### Story 37.6: Regression Handling

As **a family**,
I want **graceful handling when trust score drops**,
So that **setbacks don't feel punitive**.

**Acceptance Criteria:**

**Given** child's trust score drops below milestone
**When** regression occurs
**Then** 2-week grace period before monitoring increases
**And** notification: "Let's talk about what happened"
**And** conversation-first approach, not automatic punishment
**And** parent-child discussion encouraged before changes
**And** child can explain circumstances
**And** regression framed as "let's work on this" not "you failed"

---

### Epic 38: Graduation Path & Age 18 Deletion
**Goal:** Clear path to independence; automatic deletion at age 18.

**User Outcome:** Child graduates from monitoring; all data deleted at 18.

**FRs Covered:** FR71, FR72
**NFRs:** NFR42

**Pre-mortem Addition:**
- **FR38A:** At 100% trust for 12 months, system initiates "graduation conversation" that BOTH parties must acknowledge - prevents indefinite monitoring of compliant teens

**Child Rights Advocate Addition:**
- **FR-CR4:** Annual "proportionality check" prompt asking both parties if current monitoring level matches child's developmental stage and external risk profile

#### Story 38.1: Graduation Eligibility Tracking

As **the system**,
I want **to track graduation eligibility**,
So that **children can see their path to independence**.

**Acceptance Criteria:**

**Given** child has trust score history
**When** tracking graduation eligibility
**Then** eligibility criteria: 100% trust for 12 months (FR38A)
**And** progress visible: "9 months at 100% trust - 3 months to graduation eligibility"
**And** child sees clear path to end of monitoring
**And** parent sees same progress (transparency)
**And** eligibility doesn't mean automatic graduation - triggers conversation
**And** motivates sustained responsible behavior

#### Story 38.2: Graduation Conversation Trigger

As **a child who has maintained perfect trust**,
I want **the system to initiate a graduation conversation**,
So that **I don't stay monitored indefinitely despite compliance**.

**Acceptance Criteria:**

**Given** child has 100% trust for 12 months (FR38A)
**When** threshold reached
**Then** system notifies both parties: "Time for a graduation conversation"
**And** conversation prompt MUST be acknowledged by both parties
**And** system suggests: "Your child has shown consistent responsibility"
**And** conversation template provided with discussion points
**And** prevents indefinite monitoring of compliant teens
**And** respects child's demonstrated readiness for independence

#### Story 38.3: Formal Graduation Process

As **a family**,
I want **a formal process to graduate from monitoring**,
So that **the transition is celebrated and documented**.

**Acceptance Criteria:**

**Given** family decides to graduate child (FR71)
**When** initiating graduation
**Then** both parties confirm graduation decision
**And** graduation date can be immediate or scheduled
**And** celebration message: "Congratulations on graduating from monitoring!"
**And** monitoring stops on graduation date
**And** existing data enters deletion queue
**And** child account transitions to alumni status

#### Story 38.4: Annual Proportionality Check

As **a family**,
I want **annual prompts to assess if monitoring is still appropriate**,
So that **monitoring level matches developmental stage**.

**Acceptance Criteria:**

**Given** monitoring has been active for 12+ months (FR-CR4)
**When** anniversary approaches
**Then** both parties prompted: "Is current monitoring appropriate?"
**And** questions: "Has external risk changed?", "Has maturity increased?"
**And** suggestions based on age and trust score
**And** parent and child respond separately (private)
**And** disagreement surfaces for family conversation
**And** ensures monitoring doesn't outlast its necessity

#### Story 38.5: Age 18 Automatic Deletion

As **the system**,
I want **to automatically delete all data when child turns 18**,
So that **their childhood monitoring doesn't follow them into adulthood**.

**Acceptance Criteria:**

**Given** child's birthdate is on file (FR72)
**When** child turns 18
**Then** all monitoring data automatically deleted (INV-005)
**And** deletion is complete and irreversible
**And** includes: screenshots, flags, activity logs, trust history
**And** deletion occurs regardless of parent wishes
**And** child notified: "You're 18 - all data has been deleted"
**And** scheduled function executes daily to check birthdates

#### Story 38.6: Pre-18 Data Export Option

As **a parent**,
I want **option to export data before automatic deletion**,
So that **I can preserve memories if desired**.

**Acceptance Criteria:**

**Given** child approaching 18
**When** 30 days before birthday
**Then** parent notified: "Data will be deleted in 30 days"
**And** export option available (download all data)
**And** export includes: sanitized activity summaries (no screenshots)
**And** child must consent to any export
**And** no export of concerning flags or sensitive content
**And** export watermarked with date and purpose

#### Story 38.7: Post-Graduation Support

As **a graduated child**,
I want **access to digital wellness resources**,
So that **I can continue healthy habits independently**.

**Acceptance Criteria:**

**Given** child has graduated from monitoring
**When** accessing post-graduation resources
**Then** optional digital wellness tips available
**And** self-tracking tools (non-monitored) offered
**And** "Alumni" status preserved (can rejoin voluntarily if desired)
**And** no monitoring data collected post-graduation
**And** celebrates successful transition to independence
**And** resources for parents: "Supporting your independent teen"

---

### Phase 5: Extended Family & Platforms (Epics 39-45)
*Caregivers, shared custody, additional platforms*

---

### Epic 39: Caregiver Full Features (PARTIAL - Basic View in Epic 19D)
**Goal:** Parents can create temporary caregiver access with PIN, time extension, and flag viewing.

**User Outcome:** Grandparents/babysitters have full caregiver capabilities with all actions logged.

**Note:** *Basic caregiver status view (FR74) moved to Epic 19D per Focus Group. This epic adds PIN creation, time extension, and flag viewing.*

**FRs Covered:** FR4, FR5, FR73, FR75, FR76, FR77, FR78, FR122, FR123
**NFRs:** NFR62, NFR42

#### Story 39.1: Caregiver Account Creation

As **a parent**,
I want **to create caregiver accounts for extended family**,
So that **grandparents and babysitters can help supervise**.

**Acceptance Criteria:**

**Given** parent wants to add a caregiver (FR73)
**When** creating caregiver account
**Then** parent enters: caregiver name, email, relationship
**And** invitation sent to caregiver email
**And** caregiver creates account via invitation link
**And** caregiver linked to family (not full guardian)
**And** child notified: "Grandma has been added as a caregiver"
**And** maximum 5 caregivers per family

#### Story 39.2: Caregiver Permission Configuration

As **a parent**,
I want **to configure what each caregiver can do**,
So that **access is appropriate for their role**.

**Acceptance Criteria:**

**Given** caregiver account exists
**When** configuring permissions (FR75, FR76, FR77)
**Then** toggles for: view status, extend time, view flags
**And** "View status only" default (most restricted)
**And** "Extend time" allows granting extra screen time
**And** "View flags" allows seeing flagged content
**And** permissions can be changed anytime
**And** child sees caregiver permissions: "Grandma can see your status"

#### Story 39.3: Temporary Caregiver Access

As **a parent**,
I want **to grant temporary access to caregivers**,
So that **babysitters have access only when needed**.

**Acceptance Criteria:**

**Given** caregiver needs temporary access (FR4, FR5)
**When** setting up temporary access
**Then** start and end time configurable
**And** "This weekend" and "Today only" presets
**And** access automatically expires at end time
**And** caregiver notified when access starts and ends
**And** parent can revoke access early
**And** all temporary access logged

#### Story 39.4: Caregiver PIN for Time Extension

As **a caregiver**,
I want **a PIN to grant time extensions**,
So that **I can help without needing the parent**.

**Acceptance Criteria:**

**Given** caregiver has "extend time" permission (FR78)
**When** child requests extension
**Then** caregiver can approve with their PIN
**And** PIN set by parent during caregiver setup
**And** extension limits configurable: max 30min, 1h, 2h
**And** extension logged: "Grandma granted 30 minutes"
**And** parent sees all caregiver extensions in audit log
**And** child sees: "Grandma gave you 30 more minutes"

#### Story 39.5: Caregiver Flag Viewing

As **a caregiver with flag permission**,
I want **to view flagged content**,
So that **I can respond appropriately when babysitting**.

**Acceptance Criteria:**

**Given** caregiver has "view flags" permission (FR77)
**When** accessing flag queue
**Then** caregiver sees pending flags (same as parent view)
**And** caregiver can mark as "reviewed" (logged)
**And** caregiver cannot take permanent actions (dismiss, escalate)
**And** flag viewing logged: "Grandma viewed flag at 3pm"
**And** useful for: "Call me if you see anything concerning"
**And** respects child's privacy within family circle

#### Story 39.6: Caregiver Action Logging

As **a parent**,
I want **all caregiver actions logged**,
So that **I know what happened while I was away**.

**Acceptance Criteria:**

**Given** caregiver takes any action
**When** action completes
**Then** logged: who, what, when
**And** log visible in parent dashboard: "Caregiver Activity"
**And** summary: "Grandma: 2 time extensions, 1 flag viewed"
**And** child sees caregiver actions (transparency)
**And** helps parents trust and verify caregiver behavior
**And** NFR62: actions logged within 5 minutes

#### Story 39.7: Caregiver Removal

As **a parent**,
I want **to remove caregiver access**,
So that **I can manage who has access to my family**.

**Acceptance Criteria:**

**Given** caregiver access needs to be removed
**When** parent removes caregiver
**Then** access revoked immediately
**And** caregiver notified: "Your access has been removed"
**And** child notified: "Grandma is no longer a caregiver"
**And** historical logs preserved (caregiver anonymized)
**And** caregiver can be re-added later if needed
**And** removal reason optional but encouraged

---

### Epic 40: Advanced Shared Custody & Location Features
*Core shared custody safeguards moved to Epic 3A. This epic contains location-based features deferred from Epic 3A.*

**Goal:** Location-based rule variations for families who opt in, with abuse-aware safeguards.

**FRs Covered:** FR139, FR145
**NFRs:** NFR42

**Survivor Advocate Addition:**
- **Fleeing Mode:** All location features (FR139, FR145) can be instantly disabled by any family member activating "safe escape" - no cooldown, no notification to other family members for 72 hours

#### Story 40.1: Location-Based Rule Opt-In

As **a family**,
I want **to opt into location-based rules**,
So that **rules can vary based on where my child is**.

**Acceptance Criteria:**

**Given** family wants location-aware rules (FR139)
**When** enabling location features
**Then** explicit opt-in required from both parents
**And** clear explanation: "Rules can change based on child's location"
**And** child notified of location features
**And** location data usage explained (privacy)
**And** can be disabled anytime by any guardian
**And** disabled by default (must actively enable)

#### Story 40.2: Location-Specific Rule Configuration

As **a parent**,
I want **to configure different rules for different locations**,
So that **rules adapt to context (home vs school vs other parent's house)**.

**Acceptance Criteria:**

**Given** location features enabled
**When** configuring location rules (FR145)
**Then** locations defined: Home 1, Home 2, School, Other
**And** each location can have: different time limits, different categories
**And** example: "At Dad's house: 3h limit; At Mom's house: 2h limit"
**And** school location: education-only mode automatic
**And** geofence radius configurable (default 500m)
**And** child sees current location rule: "You're at Mom's - 2h limit"

#### Story 40.3: Fleeing Mode - Safe Escape

As **a family member in danger**,
I want **to instantly disable all location features**,
So that **I can escape safely without being tracked**.

**Acceptance Criteria:**

**Given** any family member feels unsafe
**When** activating "Safe Escape" mode
**Then** all location features disabled immediately
**And** NO notification to other family members for 72 hours
**And** no cooldown or confirmation delay
**And** location history cleared for activated user
**And** after 72 hours: neutral notification "Location features paused"
**And** can only be re-enabled by the person who activated

#### Story 40.4: Location Transition Handling

As **the system**,
I want **to handle location transitions smoothly**,
So that **rules change appropriately when child moves**.

**Acceptance Criteria:**

**Given** child moves between locations
**When** new location detected
**Then** rule transition with 5-minute grace period
**And** notification: "You're now at Dad's house - rules updated"
**And** time limits recalculated based on new location
**And** if location unclear, default to more permissive rules
**And** location detection uses device GPS + WiFi
**And** transition logged for audit trail

#### Story 40.5: Location Privacy Controls

As **a child**,
I want **to understand how my location is used**,
So that **I feel safe with location-based features**.

**Acceptance Criteria:**

**Given** location features are enabled
**When** child views location settings
**Then** clear explanation of what location data is collected
**And** child sees current location status: "At: Home (Mom's)"
**And** child can see location history (what parents see)
**And** location never shared outside family
**And** location data deleted with other data at 18
**And** child can request location features be disabled

#### Story 40.6: Location Feature Abuse Prevention

As **the system**,
I want **to detect potential location feature abuse**,
So that **location isn't weaponized in custody disputes**.

**Acceptance Criteria:**

**Given** location features active
**When** monitoring for abuse patterns
**Then** alert if: one parent checks location 10x more than other
**And** alert if: frequent location rule changes before custody exchanges
**And** alert if: location used to restrict child during other parent's time
**And** alerts sent to both parents (transparency)
**And** resources provided for conflict resolution
**And** system can auto-disable location if abuse pattern detected

---

### Epic 41: Notifications & Alerts
**Goal:** Family receives appropriate notifications without alert fatigue.

**User Outcome:** Configurable notifications for flags, limits, sync status, logins, with multiple format options.

**FRs Covered:** FR42, FR43, FR44, FR45, FR46, FR47, FR103, FR113, FR152, FR160
**NFRs:** NFR42

**Survivor Advocate Addition:**
- **FR160 modification:** "New location alerts" disabled during fleeing mode activation - prevents stalking via location change notifications

#### Story 41.1: Notification Preferences Configuration

As **a parent**,
I want **to configure my notification preferences**,
So that **I receive alerts that matter without notification overload**.

**Acceptance Criteria:**

**Given** parent opens notification settings
**When** configuring preferences
**Then** can toggle: flag notifications (on/off per severity)
**And** can toggle: time limit warnings (on/off)
**And** can toggle: sync status alerts (on/off)
**And** can set quiet hours (no notifications during sleep)
**And** can set per-child preferences (FR152)
**And** defaults are reasonable: critical=on, info=digest
**And** changes apply immediately

#### Story 41.2: Flag Notifications

As **a parent**,
I want **to be notified when flags are created**,
So that **I can respond to potential concerns promptly (FR42, FR43)**.

**Acceptance Criteria:**

**Given** flag is created on child's activity
**When** flag matches notification preferences
**Then** push notification sent immediately for critical flags
**And** notification shows: flag type, severity, child name
**And** tapping notification opens flag detail
**And** medium severity: batched into hourly digest
**And** low severity: daily digest only
**And** co-parents receive same notifications (FR103)
**And** crisis-related flags NEVER generate notifications (zero-data-path)

#### Story 41.3: Time Limit Notifications

As **a parent**,
I want **to be notified about time limit events**,
So that **I know when limits are reached (FR44, FR45)**.

**Acceptance Criteria:**

**Given** child approaching or reaching time limit
**When** time threshold crossed
**Then** notification at 15-minute warning (configurable)
**And** notification when limit reached
**And** notification when extension requested
**And** can configure which limits to notify about
**And** child also receives limit notifications
**And** notifications include current vs allowed time
**And** can disable time notifications while keeping flag notifications

#### Story 41.4: Device Sync Status Notifications

As **a parent**,
I want **to be notified about device sync issues**,
So that **I know when monitoring might be interrupted (FR46)**.

**Acceptance Criteria:**

**Given** device experiences sync issues
**When** device hasn't synced in configured threshold
**Then** notification: "Chromebook hasn't synced in 4 hours"
**And** configurable threshold: 1h, 4h, 12h, 24h (default 4h)
**And** no spam: one notification per device per threshold
**And** clears when device syncs again
**And** includes troubleshooting link
**And** more urgent notification if permissions revoked
**And** NFR78: notification within 30 seconds of threshold

#### Story 41.5: New Login Notifications

As **a parent**,
I want **to be notified when new devices log in**,
So that **I'm aware of account activity (FR47, FR160)**.

**Acceptance Criteria:**

**Given** new device or location logs in
**When** login detected from new context
**Then** notification: "New login from [Device/Location]"
**And** includes: device type, browser, approximate location
**And** "Wasn't you?" link to review sessions
**And** can disable for trusted devices
**And** location alerts disabled during fleeing mode (FR160)
**And** sent to all guardians on account
**And** login alerts cannot be disabled (security)

#### Story 41.6: Notification Delivery Channels

As **a parent**,
I want **multiple ways to receive notifications**,
So that **I don't miss important alerts (FR113)**.

**Acceptance Criteria:**

**Given** notification needs to be delivered
**When** sent to parent
**Then** push notification (mobile app)
**And** email for missed critical notifications
**And** optional: SMS for critical flags (phone verified)
**And** can configure channel per notification type
**And** fallback: if push fails, escalate to email
**And** unsubscribe link in all emails (except security)
**And** delivery confirmation logged

#### Story 41.7: Child Notification Preferences

As **a child**,
I want **some control over my notifications**,
So that **I'm informed without being overwhelmed**.

**Acceptance Criteria:**

**Given** child has notification settings
**When** viewing notification preferences
**Then** receives: time limit warnings (required, can't disable)
**And** receives: agreement changes (required)
**And** optional: trust score changes
**And** optional: weekly summary
**And** can set quiet hours for non-urgent
**And** parents cannot view child's notification preferences
**And** defaults set for age-appropriate information

#### Story 41.8: Fleeing Mode Notification Suppression

As **the system**,
I want **to suppress certain notifications during fleeing mode**,
So that **location-based alerts don't enable stalking**.

**Acceptance Criteria:**

**Given** fleeing mode is activated
**When** location-related events occur
**Then** NO notifications about: location changes, geofence exits/entries
**And** NO notifications about: location feature being paused
**And** regular notifications continue: flags, time limits, sync
**And** suppression automatic and immediate
**And** after 72 hours: neutral notification "Location features paused"
**And** prevents: "Alert: [Child] left home at 2am" weaponization
**And** logged for safety audit (not visible to family)

---

### Epic 42: Fire TV Agent
**Goal:** Fire TV agent captures viewing activity and enforces bedtime.

**User Outcome:** Fire TV monitored per agreement terms with D-pad navigable UI.

**FRs Covered:** FR81, FR82
**NFRs:** NFR38, NFR71, NFR42

#### Story 42.1: Fire TV App Installation & Setup

As **a parent**,
I want **to install the fledgely Fire TV app**,
So that **our Fire TV devices can be monitored per our agreement**.

**Acceptance Criteria:**

**Given** family has Fire TV device
**When** installing fledgely Fire TV app
**Then** app available in Amazon App Store
**And** sign-in via PIN code (displayed on Fire TV, entered on phone)
**And** links to existing family account
**And** selects which child this Fire TV is for
**And** permissions explained clearly on TV screen
**And** child notified: "Fire TV added to fledgely"
**And** appears in device list immediately

#### Story 42.2: Fire TV Viewing Activity Capture

As **a parent**,
I want **Fire TV viewing activity captured**,
So that **I can see what's being watched per our agreement (FR81)**.

**Acceptance Criteria:**

**Given** Fire TV app is installed and configured
**When** content is viewed
**Then** captures: app name (Netflix, Prime, YouTube, etc.)
**And** captures: content title when available
**And** captures: viewing duration
**And** captures: timestamps (start/stop)
**And** NFR38: battery-efficient capture
**And** syncs to dashboard when Fire TV has network
**And** child can see same viewing history (transparency)

#### Story 42.3: Fire TV D-pad Navigable UI

As **a child**,
I want **Fire TV fledgely UI navigable with remote**,
So that **I can interact with time warnings and status**.

**Acceptance Criteria:**

**Given** fledgely needs to show information on Fire TV
**When** displaying UI
**Then** fully navigable with Fire TV remote D-pad
**And** no mouse/touch required
**And** time remaining overlay (non-intrusive corner)
**And** warning popups: "15 minutes remaining"
**And** can dismiss warnings with OK button
**And** can request extension from Fire TV (navigates to request)
**And** NFR71: UI responsive within 100ms

#### Story 42.4: Fire TV Bedtime Enforcement

As **a parent**,
I want **Fire TV to enforce bedtime**,
So that **kids aren't watching TV late at night (FR82)**.

**Acceptance Criteria:**

**Given** bedtime is configured in agreement
**When** bedtime approaches
**Then** 15-minute warning: "Bedtime in 15 minutes"
**And** at bedtime: full-screen "Goodnight! Screen time is over"
**And** Fire TV locks to fledgely app (can't switch apps)
**And** can unlock with parent PIN for emergencies
**And** unlocks automatically at configured wake time
**And** bedtime can differ by day of week
**And** holiday/vacation override available

#### Story 42.5: Fire TV Time Limit Integration

As **a parent**,
I want **Fire TV viewing to count toward daily screen time**,
So that **all screens are tracked together**.

**Acceptance Criteria:**

**Given** child has daily screen time limit
**When** Fire TV viewing occurs
**Then** time counted toward daily total
**And** syncs with other devices in near-real-time
**And** if limit reached elsewhere, Fire TV shows limit reached
**And** if limit reached on Fire TV, other devices notified
**And** time limit warnings consistent across devices
**And** extension requests route to same parent flow
**And** NFR42: audit logged for all viewing

#### Story 42.6: Fire TV Offline Handling

As **the system**,
I want **Fire TV to function during network outages**,
So that **monitoring continues even with connectivity issues**.

**Acceptance Criteria:**

**Given** Fire TV loses network connectivity
**When** operating offline
**Then** viewing activity queued locally (up to 72 hours)
**And** time limits enforced using last known settings
**And** bedtime enforced using device clock
**And** syncs queued data when network restored
**And** dashboard shows "Fire TV offline since [time]"
**And** offline indicator visible on Fire TV
**And** conservative mode: if sync uncertain, use stricter limits

---

### Epic 43: iOS Integration
**Goal:** iOS app integrates with Screen Time API.

**User Outcome:** iOS devices provide usage data and display time limits.

**FRs Covered:** FR83, FR84
**NFRs:** NFR39, NFR74, NFR42

#### Story 43.1: iOS App Installation & Family Link

As **a parent**,
I want **to install the fledgely iOS app**,
So that **iOS devices can participate in our family agreement**.

**Acceptance Criteria:**

**Given** family has iOS device for child
**When** installing fledgely iOS app
**Then** app available in Apple App Store
**And** sign-in with Google (same as web)
**And** links to existing family account
**And** selects which child this iPhone/iPad is for
**And** explains Screen Time API permissions clearly
**And** child notified: "iPhone added to fledgely"
**And** appears in device list immediately

#### Story 43.2: Screen Time API Permission Setup

As **a parent**,
I want **to grant Screen Time API permissions**,
So that **fledgely can read usage data from iOS (FR83)**.

**Acceptance Criteria:**

**Given** iOS app needs Screen Time access
**When** setting up permissions
**Then** guided flow explains what data is accessed
**And** requests Family Sharing authorization (if applicable)
**And** requests Screen Time API access
**And** explains limitations: "iOS shares less than Chromebook/Android"
**And** shows what data IS available: app usage times, categories
**And** shows what is NOT available: screenshots, detailed content
**And** permission status visible in app settings

#### Story 43.3: iOS Usage Data Sync

As **a parent**,
I want **iOS app usage data synced to fledgely**,
So that **I can see iPhone activity in the dashboard**.

**Acceptance Criteria:**

**Given** Screen Time permissions granted
**When** iOS usage occurs
**Then** syncs: app name, category, duration per day
**And** syncs: pickups (device unlocks)
**And** syncs: notifications received count
**And** data refreshes at least hourly (iOS API limitation)
**And** NFR39: minimal battery impact (<3%)
**And** child sees same usage data (transparency)
**And** NFR42: sync events logged

#### Story 43.4: iOS Time Limit Display

As **a child**,
I want **to see my time limits on my iPhone**,
So that **I know how much screen time I have left (FR84)**.

**Acceptance Criteria:**

**Given** time limits configured in agreement
**When** child opens fledgely iOS app
**Then** shows: time used today vs limit
**And** shows: time remaining with visual progress
**And** widget available for home screen (quick glance)
**And** notifications: 15 minutes remaining
**And** notification: limit reached
**And** NFR74: display updates within 5 minutes of actual
**And** can request extension from iOS app

#### Story 43.5: iOS Native Screen Time Coordination

As **a parent**,
I want **fledgely to work with Apple's Screen Time**,
So that **limits are consistent and enforced**.

**Acceptance Criteria:**

**Given** family uses both fledgely and Apple Screen Time
**When** configuring limits
**Then** explains relationship: "fledgely tracks, Apple enforces"
**And** recommends setting Apple Screen Time limits to match agreement
**And** provides guidance to sync app limits
**And** dashboard shows if Apple limits differ from agreement
**And** doesn't fight with Apple's native controls
**And** family can choose: fledgely tracking only, or coordinated limits

#### Story 43.6: iOS App Limitation Transparency

As **a parent**,
I want **to understand iOS monitoring limitations**,
So that **I have realistic expectations**.

**Acceptance Criteria:**

**Given** iOS has stricter privacy than Chromebook/Android
**When** viewing iOS device in dashboard
**Then** clear indicator: "Limited visibility (iOS)"
**And** tooltip explains: no screenshots, app-level data only
**And** recommends: use Apple Screen Time for enforcement
**And** shows: what IS visible from iOS
**And** no false promises about capabilities
**And** helps family decide if iOS monitoring meets needs
**And** suggests alternatives if more visibility needed

---

### Epic 44: Windows & macOS Agents
**Goal:** Desktop agents monitor Windows and Mac computers.

**User Outcome:** Desktop computers are monitored with system tray support and permission handling.

**FRs Covered:** FR117, FR118
**NFRs:** NFR41, NFR75, NFR76, NFR42

#### Story 44.1: Windows Agent Installation

As **a parent**,
I want **to install the fledgely Windows agent**,
So that **Windows computers can be monitored per our agreement (FR117)**.

**Acceptance Criteria:**

**Given** family has Windows computer for child
**When** downloading and installing Windows agent
**Then** installer available from fledgely dashboard
**And** installer signed with valid certificate
**And** requires admin permission to install
**And** guided setup: sign in, select child, configure
**And** explains permissions needed clearly
**And** child notified: "Windows PC added to fledgely"
**And** NFR75: supports Windows 10 and 11

#### Story 44.2: macOS Agent Installation

As **a parent**,
I want **to install the fledgely macOS agent**,
So that **Mac computers can be monitored per our agreement (FR118)**.

**Acceptance Criteria:**

**Given** family has Mac computer for child
**When** downloading and installing macOS agent
**Then** installer available from fledgely dashboard (.pkg or .dmg)
**And** installer notarized by Apple
**And** requires admin permission to install
**And** guided setup: sign in, select child, configure
**And** explains Screen Recording permission requirement
**And** child notified: "Mac added to fledgely"
**And** NFR76: supports macOS 12 (Monterey) and newer

#### Story 44.3: Desktop Screenshot Capture

As **a parent**,
I want **periodic screenshots captured from desktop computers**,
So that **I can see what's happening on the computer**.

**Acceptance Criteria:**

**Given** desktop agent installed and configured
**When** capture interval reached
**Then** screenshot captured per agreement frequency
**And** multi-monitor: captures active monitor
**And** captures include: timestamp, active window title
**And** crisis allowlist checked BEFORE capture
**And** screenshots queued for upload
**And** NFR41: CPU usage <5% during capture
**And** child can view their own screenshots (transparency)

#### Story 44.4: System Tray Integration

As **a child**,
I want **fledgely visible in system tray**,
So that **I always know monitoring is active (transparency)**.

**Acceptance Criteria:**

**Given** desktop agent is running
**When** viewing system tray/menu bar
**Then** fledgely icon visible at all times
**And** icon color indicates: green=active, yellow=paused, red=issue
**And** clicking shows: time remaining, last sync, status
**And** right-click menu: view dashboard, request extension, help
**And** cannot be hidden or removed by child
**And** tooltip shows current monitoring status
**And** Windows: system tray; macOS: menu bar

#### Story 44.5: Desktop Permission Management

As **a parent**,
I want **clear guidance on desktop permissions**,
So that **I can ensure monitoring works properly**.

**Acceptance Criteria:**

**Given** desktop agent needs system permissions
**When** permissions are missing or revoked
**Then** Windows: explains admin requirements
**And** macOS: guides through Screen Recording permission
**And** macOS: guides through Accessibility permission if needed
**And** notification if permissions revoked
**And** dashboard shows permission status per device
**And** step-by-step re-permission guide available
**And** child cannot revoke permissions without admin password

#### Story 44.6: Desktop App Usage Tracking

As **a parent**,
I want **to see which applications are used on desktop**,
So that **I understand computer activity patterns**.

**Acceptance Criteria:**

**Given** desktop agent is running
**When** applications are used
**Then** tracks: application name, duration, active time
**And** tracks: window titles (for context)
**And** categorizes: productivity, entertainment, communication, other
**And** syncs usage data to dashboard
**And** child sees same usage data (transparency)
**And** usage aggregated into daily summaries
**And** NFR42: all tracking logged

#### Story 44.7: Desktop Time Limit Display

As **a child**,
I want **to see my time remaining on desktop**,
So that **I can manage my computer time**.

**Acceptance Criteria:**

**Given** time limits configured
**When** using desktop computer
**Then** time remaining visible in system tray tooltip
**And** warning notification at 15 minutes remaining
**And** warning notification at 5 minutes remaining
**And** can click to see detailed breakdown
**And** can request extension from system tray
**And** desktop time counts toward daily total
**And** shows time across all devices if shared limit

#### Story 44.8: Desktop Agent Auto-Update

As **the system**,
I want **desktop agents to auto-update**,
So that **families always have latest features and security fixes**.

**Acceptance Criteria:**

**Given** desktop agent installed
**When** new version available
**Then** downloads update in background
**And** installs on next restart (non-disruptive)
**And** can force immediate update for security fixes
**And** update history visible in settings
**And** rollback available if update causes issues
**And** update notifications optional (default: silent)
**And** NFR42: update events logged

---

### Epic 45: Nintendo Switch, Xbox & Home Assistant Integration
**Goal:** Gaming console integrations and optional Home Assistant enhancement.

**User Outcome:** Gaming console activity is visible; smart home integration optional.

**FRs Covered:** FR85, FR86, FR119
**NFRs:** NFR40, NFR72, NFR42

#### Story 45.1: Nintendo Switch Parental Controls Integration

As **a parent**,
I want **to connect Nintendo Switch Parental Controls to fledgely**,
So that **Switch gaming is visible in our family dashboard (FR85)**.

**Acceptance Criteria:**

**Given** family has Nintendo Switch
**When** connecting Switch to fledgely
**Then** links via Nintendo Account OAuth
**And** imports: play time per game, daily usage
**And** imports: play time limits (if set in Nintendo)
**And** shows game titles and durations in dashboard
**And** data syncs daily (Nintendo API limitation)
**And** child sees same gaming data (transparency)
**And** NFR40: respects Nintendo API rate limits

#### Story 45.2: Xbox Family Settings Integration

As **a parent**,
I want **to connect Xbox Family Settings to fledgely**,
So that **Xbox gaming is visible in our family dashboard (FR86)**.

**Acceptance Criteria:**

**Given** family has Xbox console
**When** connecting Xbox to fledgely
**Then** links via Microsoft Account OAuth
**And** imports: screen time, games played, durations
**And** imports: social activity (friends, messages - metadata only)
**And** shows Xbox activity in unified dashboard
**And** data syncs multiple times daily
**And** child sees same gaming data (transparency)
**And** NFR72: respects Microsoft API guidelines

#### Story 45.3: Gaming Console Unified View

As **a parent**,
I want **all gaming consoles in one view**,
So that **I can see total gaming time across platforms**.

**Acceptance Criteria:**

**Given** multiple consoles connected
**When** viewing gaming summary
**Then** shows: total gaming time (all consoles combined)
**And** shows: breakdown by console (Switch, Xbox, etc.)
**And** shows: breakdown by game title
**And** shows: daily/weekly trends
**And** gaming time can count toward daily limit
**And** child sees same unified view (transparency)
**And** clear indication of data freshness per console

#### Story 45.4: Gaming Time Limit Coordination

As **a parent**,
I want **gaming to count toward overall screen time**,
So that **limits are meaningful across all devices**.

**Acceptance Criteria:**

**Given** daily screen time limit configured
**When** gaming occurs on consoles
**Then** gaming time added to daily total
**And** can set separate "gaming-only" limit within total
**And** warning notifications when approaching limit
**And** recommends setting console-native limits to match
**And** explains: "fledgely tracks, console enforces"
**And** dashboard shows if native limits don't match agreement
**And** NFR42: gaming time logged

#### Story 45.5: Home Assistant Integration Setup

As **a technical parent**,
I want **to connect Home Assistant to fledgely**,
So that **smart home can enhance monitoring (FR119)**.

**Acceptance Criteria:**

**Given** family runs Home Assistant
**When** connecting to fledgely
**Then** links via Home Assistant API token
**And** optional integration (not required)
**And** clear explanation: what data is shared
**And** selects which HA entities to expose
**And** connection status visible in dashboard
**And** can disconnect anytime
**And** self-hosted compatible (works with local HA)

#### Story 45.6: Home Assistant Device Presence

As **a parent**,
I want **Home Assistant to help track device presence**,
So that **I know when devices are actively in use**.

**Acceptance Criteria:**

**Given** Home Assistant connected
**When** child's device detected on network
**Then** fledgely can use HA presence detection
**And** helps identify: device online but not syncing
**And** helps with: Chromebook lid closed detection
**And** data used to improve sync status accuracy
**And** privacy: only presence, not network traffic content
**And** enhances but doesn't replace native monitoring
**And** works with common HA integrations (UniFi, etc.)

#### Story 45.7: Home Assistant Automation Triggers

As **a technical parent**,
I want **fledgely events to trigger Home Assistant automations**,
So that **smart home responds to screen time events**.

**Acceptance Criteria:**

**Given** Home Assistant connected
**When** fledgely event occurs
**Then** can trigger HA automations for: time limit reached
**And** can trigger for: bedtime started
**And** can trigger for: extension granted
**And** example: turn off smart TV when bedtime starts
**And** example: turn on lights when screen time ends
**And** events sent via HA webhook or MQTT
**And** optional: family chooses which events to share

#### Story 45.8: Console & HA Integration Limitations

As **a parent**,
I want **to understand console/HA integration limitations**,
So that **I have realistic expectations**.

**Acceptance Criteria:**

**Given** consoles and HA have API limitations
**When** viewing integration settings
**Then** clear documentation: data delays (Nintendo: daily)
**And** clear: cannot enforce limits on consoles (only track)
**And** clear: HA is optional enhancement
**And** clear: some games don't report playtime
**And** suggests: use native parental controls for enforcement
**And** shows: what IS and ISN'T possible per platform
**And** helps family decide which integrations are worthwhile

---

### Phase 6: Operations & Self-Hosting (Epics 46-52)
*Self-hosted deployment, SaaS, offline operation, lifecycle*

---

### Epic 46: Offline Operation Foundation
**Goal:** Devices continue monitoring when offline with queue and sync.

**User Outcome:** Monitoring doesn't stop when internet unavailable; offline timestamp shown.

**FRs Covered:** FR87, FR88, FR89, FR91
**NFRs:** NFR55, NFR42

#### Story 46.1: Chromebook Extension Offline Queue

As **a Chromebook extension**,
I want **to queue captures when offline**,
So that **monitoring continues during network outages (FR87)**.

**Acceptance Criteria:**

**Given** Chromebook loses network connectivity
**When** screenshots are captured
**Then** stored in IndexedDB queue (up to 500 items)
**And** oldest items dropped if queue full (FIFO)
**And** queue includes: screenshot data, metadata, timestamp
**And** no data loss for typical offline periods (<24h)
**And** queue encrypted at rest
**And** NFR55: queue operations complete in <100ms
**And** extension continues capturing per normal schedule

#### Story 46.2: Android App Offline Queue

As **an Android app**,
I want **to queue captures when offline**,
So that **monitoring continues during network outages (FR87)**.

**Acceptance Criteria:**

**Given** Android device loses network connectivity
**When** screenshots are captured
**Then** stored in Room database (up to 1000 items)
**And** oldest items dropped if queue full
**And** queue includes: screenshot blob path, metadata, timestamp
**And** WorkManager schedules sync when network available
**And** queue survives app restart/device reboot
**And** queue encrypted with Android Keystore
**And** background capture continues uninterrupted

#### Story 46.3: Automatic Sync on Reconnect

As **a device**,
I want **to automatically sync queued data when online**,
So that **no manual intervention needed (FR88)**.

**Acceptance Criteria:**

**Given** device regains network connectivity
**When** network detected
**Then** sync starts automatically within 30 seconds
**And** uploads queued items in chronological order
**And** handles partial sync (resumes if interrupted)
**And** respects battery: delays large sync if battery <20%
**And** dashboard updated as items arrive
**And** NFR42: sync events logged
**And** conflict resolution: server timestamp wins

#### Story 46.4: Offline Timestamp Display

As **a parent**,
I want **to see when devices were last online**,
So that **I know data freshness (FR89)**.

**Acceptance Criteria:**

**Given** device is offline
**When** viewing dashboard
**Then** shows: "Last seen: 3 hours ago"
**And** shows: "Offline since: 2:30 PM"
**And** visual indicator: yellow for recent, red for extended
**And** tooltip explains what offline means
**And** different states: offline, syncing, online
**And** child sees same offline status (transparency)
**And** notifications for extended offline (>4h) if enabled

#### Story 46.5: Offline Mode Indication on Device

As **a child**,
I want **to know when my device is offline**,
So that **I understand monitoring status (FR91)**.

**Acceptance Criteria:**

**Given** device loses connectivity
**When** viewing fledgely status
**Then** Chromebook extension shows: "Offline - syncing when connected"
**And** Android app shows: "Offline" indicator
**And** shows queue size: "4 items waiting to sync"
**And** explains: monitoring continues, data uploads later
**And** no alarm: offline is normal, not suspicious
**And** clears automatically when back online
**And** status visible in extension popup/app status

#### Story 46.6: Offline Crisis URL Handling

As **the system**,
I want **crisis URL protection to work offline**,
So that **children can access help even without internet**.

**Acceptance Criteria:**

**Given** device is offline
**When** child visits crisis URL
**Then** cached allowlist used for blocking check
**And** NO capture occurs (zero-data-path maintained)
**And** allowlist cached: minimum 7 days stale is OK
**And** fuzzy matching works offline (FR7B)
**And** when online: queue does NOT contain crisis visits
**And** INV-001 maintained regardless of connectivity
**And** offline allowlist included in app/extension

#### Story 46.7: Offline Sync Progress

As **a parent**,
I want **to see sync progress when device reconnects**,
So that **I know when data will be available**.

**Acceptance Criteria:**

**Given** device comes back online with queued data
**When** sync in progress
**Then** dashboard shows: "Syncing: 45 of 120 items"
**And** progress bar visible on device card
**And** estimated time remaining for large queues
**And** can see sync speed if on slow connection
**And** completes in background (non-blocking)
**And** notification when sync complete (optional)
**And** historical sync stats available

---

### Epic 47: Reserved for Future Use
*(OTP moved to Epic 13)*

---

### Epic 48: Self-Hosted Terraform Deployment
**Goal:** Technical users can deploy to their own GCP project with one-click Terraform.

**User Outcome:** Self-hosted instance running on user's infrastructure with custom domain.

**FRs Covered:** FR92, FR93, FR94, FR95, FR96
**NFRs:** NFR51, NFR86, NFR42

#### Story 48.1: Terraform Module Repository

As **a technical user**,
I want **a public Terraform module for fledgely**,
So that **I can deploy to my own GCP project (FR92)**.

**Acceptance Criteria:**

**Given** user wants to self-host fledgely
**When** accessing deployment resources
**Then** Terraform module available on GitHub
**And** module published to Terraform Registry
**And** comprehensive README with prerequisites
**And** lists required GCP APIs to enable
**And** documents minimum GCP quotas needed
**And** includes cost estimate for typical usage
**And** Apache 2.0 license for module

#### Story 48.2: One-Click GCP Deployment

As **a technical user**,
I want **to deploy fledgely with minimal commands**,
So that **setup is straightforward (FR93)**.

**Acceptance Criteria:**

**Given** user has GCP project and Terraform installed
**When** running terraform apply
**Then** deploys: Cloud Run services
**And** deploys: Firestore database
**And** deploys: Cloud Storage buckets
**And** deploys: Cloud Functions
**And** deploys: Firebase Auth configuration
**And** NFR51: deployment completes in <15 minutes
**And** outputs: URLs, next steps, verification commands

#### Story 48.3: Custom Domain Configuration

As **a self-hosted user**,
I want **to use my own domain**,
So that **my family uses fledgely.myfamily.com (FR94)**.

**Acceptance Criteria:**

**Given** Terraform deployment complete
**When** configuring custom domain
**Then** variable: `custom_domain = "fledgely.myfamily.com"`
**And** automatically provisions SSL certificate
**And** configures Cloud Run domain mapping
**And** provides DNS records to add
**And** verifies DNS configuration
**And** supports subdomains and apex domains
**And** HTTPS enforced (no HTTP)

#### Story 48.4: Configuration Variables

As **a self-hosted user**,
I want **to customize my deployment**,
So that **it fits my family's needs (FR95)**.

**Acceptance Criteria:**

**Given** deploying with Terraform
**When** setting variables
**Then** configurable: GCP region (default: us-central1)
**And** configurable: screenshot retention days (default: 90)
**And** configurable: capture frequency options
**And** configurable: resource sizing (small/medium/large)
**And** configurable: backup schedule
**And** all sensitive values via terraform.tfvars (gitignored)
**And** validation prevents invalid configurations

#### Story 48.5: Deployment Verification

As **a self-hosted user**,
I want **to verify my deployment is working**,
So that **I know setup succeeded**.

**Acceptance Criteria:**

**Given** Terraform apply completes
**When** running verification
**Then** health check script provided
**And** verifies: API endpoints responding
**And** verifies: Firestore connection working
**And** verifies: Storage bucket accessible
**And** verifies: Auth configuration correct
**And** outputs: pass/fail with specific issues
**And** troubleshooting guide for common failures

#### Story 48.6: Self-Hosted Update Process

As **a self-hosted user**,
I want **to update my fledgely instance**,
So that **I get new features and security fixes (FR96)**.

**Acceptance Criteria:**

**Given** new fledgely version released
**When** updating self-hosted instance
**Then** git pull + terraform apply workflow
**And** database migrations run automatically
**And** zero-downtime updates (rolling deployment)
**And** rollback instructions if issues
**And** changelog highlights breaking changes
**And** NFR86: update completes in <10 minutes
**And** email notification option for new releases

#### Story 48.7: Self-Hosted Security Baseline

As **a self-hosted user**,
I want **secure defaults in my deployment**,
So that **my family's data is protected**.

**Acceptance Criteria:**

**Given** Terraform deployment
**When** reviewing security posture
**Then** all data encrypted at rest (default)
**And** all traffic encrypted in transit (TLS 1.3)
**And** IAM follows least privilege
**And** no public Firestore access
**And** Cloud Run requires authentication
**And** service accounts have minimal permissions
**And** security checklist in documentation

#### Story 48.8: Self-Hosted Cost Monitoring

As **a self-hosted user**,
I want **to understand and monitor costs**,
So that **there are no billing surprises**.

**Acceptance Criteria:**

**Given** self-hosted deployment running
**When** monitoring costs
**Then** Terraform outputs expected monthly cost range
**And** GCP budget alert configured (optional)
**And** cost breakdown by service documented
**And** tips for cost optimization included
**And** typical family: <$10/month estimate
**And** NFR42: cost monitoring events logged
**And** scale-to-zero when not in use

---

### Epic 49: Self-Hosted Backups & Restore
**Goal:** Self-hosted users can backup and restore data.

**User Outcome:** Data is protected against loss with restore capability.

**FRs Covered:** FR124, FR125
**NFRs:** NFR79, NFR54, NFR42

#### Story 49.1: Automated Firestore Backup

As **a self-hosted user**,
I want **automated daily backups of Firestore data**,
So that **my family's data is protected (FR124)**.

**Acceptance Criteria:**

**Given** self-hosted deployment running
**When** backup schedule triggers
**Then** Firestore export runs daily (configurable time)
**And** exports to Cloud Storage bucket
**And** retains backups per policy (default: 30 days)
**And** older backups automatically deleted
**And** NFR79: backup completes in <30 minutes for typical data
**And** backup success/failure logged
**And** email notification on backup failure

#### Story 49.2: Screenshot Storage Backup

As **a self-hosted user**,
I want **screenshots backed up separately**,
So that **images are preserved with data**.

**Acceptance Criteria:**

**Given** screenshots stored in Cloud Storage
**When** backup runs
**Then** screenshot bucket uses versioning
**And** lifecycle policy moves old versions to Nearline
**And** configurable: delete after X days or keep forever
**And** backup includes: original screenshots, thumbnails
**And** NFR54: storage costs optimized with lifecycle rules
**And** can exclude screenshots from backup (data-only option)
**And** backup size reported in dashboard

#### Story 49.3: Manual Backup Trigger

As **a self-hosted user**,
I want **to trigger backup manually**,
So that **I can backup before major changes**.

**Acceptance Criteria:**

**Given** self-hosted admin dashboard
**When** clicking "Backup Now"
**Then** immediate backup starts
**And** progress indicator shows status
**And** backup labeled with timestamp + "manual"
**And** can add custom label/note to backup
**And** manual backups count toward retention
**And** completes even if daily backup ran today
**And** NFR42: manual backup logged with user

#### Story 49.4: Restore from Backup

As **a self-hosted user**,
I want **to restore data from backup**,
So that **I can recover from data loss (FR125)**.

**Acceptance Criteria:**

**Given** backups exist
**When** initiating restore
**Then** list available backups with dates/sizes
**And** preview: what will be restored
**And** warning: this will overwrite current data
**And** requires typing "RESTORE" to confirm
**And** restore process runs with progress indicator
**And** NFR79: restore completes in <60 minutes
**And** verification after restore: data integrity check

#### Story 49.5: Point-in-Time Recovery

As **a self-hosted user**,
I want **to restore to a specific point in time**,
So that **I can recover from accidental deletions**.

**Acceptance Criteria:**

**Given** Firestore point-in-time recovery enabled
**When** restore needed
**Then** can select any time in last 7 days
**And** granularity: minute-level precision
**And** shows what data existed at that time
**And** can restore entire database or specific collections
**And** original data preserved until confirmed
**And** useful for: accidental deletion, data corruption
**And** requires GCP support (not all tiers)

#### Story 49.6: Backup Verification & Testing

As **a self-hosted user**,
I want **to verify backups are restorable**,
So that **I know recovery will work when needed**.

**Acceptance Criteria:**

**Given** backup exists
**When** running verification
**Then** validation script checks backup integrity
**And** optionally: restore to test environment
**And** reports: backup health status
**And** quarterly reminder to test restore
**And** documentation: recovery runbook
**And** estimated restore time shown per backup
**And** alerts if backup integrity issues detected

---

### Epic 50: SaaS Subscription Management
**Goal:** Users can subscribe and manage SaaS billing with proper ToS.

**User Outcome:** Managed service with self-service billing, family-only ToS, and trial period.

**FRs Covered:** FR97, FR98, FR99, FR100, FR135, FR136
**NFRs:** NFR42

#### Story 50.1: Subscription Plan Selection

As **a parent**,
I want **to choose a subscription plan**,
So that **I can access fledgely SaaS (FR97)**.

**Acceptance Criteria:**

**Given** user wants to use fledgely SaaS
**When** viewing pricing page
**Then** shows available plans: Free tier, Family plan
**And** clear feature comparison between plans
**And** Free tier: limited features, 1 child, 1 device
**And** Family plan: full features, unlimited children/devices
**And** annual discount shown (save 20%)
**And** no enterprise/school plans (family-only FR135)
**And** pricing transparent, no hidden fees

#### Story 50.2: Trial Period

As **a new user**,
I want **a free trial period**,
So that **I can evaluate fledgely before paying (FR100)**.

**Acceptance Criteria:**

**Given** new family signs up
**When** starting trial
**Then** 14-day free trial of Family plan
**And** no credit card required for trial
**And** full features available during trial
**And** clear countdown: "7 days left in trial"
**And** reminder emails at 7 days, 3 days, 1 day
**And** trial ends gracefully: data preserved, features limited
**And** can upgrade anytime during or after trial

#### Story 50.3: Stripe Payment Integration

As **a parent**,
I want **to pay with credit card**,
So that **I can subscribe to fledgely (FR98)**.

**Acceptance Criteria:**

**Given** user selects paid plan
**When** entering payment
**Then** Stripe Checkout handles payment securely
**And** accepts: credit cards, debit cards
**And** supports: USD, EUR, GBP, CAD, AUD
**And** no payment data stored by fledgely
**And** receipt emailed immediately
**And** subscription starts upon payment
**And** NFR42: payment events logged (no card details)

#### Story 50.4: Billing Management Portal

As **a subscriber**,
I want **to manage my billing**,
So that **I can update payment and view history**.

**Acceptance Criteria:**

**Given** user has active subscription
**When** accessing billing settings
**Then** shows: current plan, next billing date, amount
**And** can update payment method via Stripe portal
**And** can view invoice history
**And** can download invoices as PDF
**And** can switch between monthly/annual
**And** can add billing email (separate from account email)
**And** proration handled automatically for plan changes

#### Story 50.5: Subscription Cancellation

As **a subscriber**,
I want **to cancel my subscription**,
So that **I can stop paying if no longer needed**.

**Acceptance Criteria:**

**Given** user wants to cancel
**When** initiating cancellation
**Then** confirmation shows: what happens, when access ends
**And** access continues until end of billing period
**And** optional: feedback on why cancelling
**And** can resubscribe anytime (data preserved 90 days)
**And** no cancellation fees or penalties
**And** confirmation email with reactivation link
**And** win-back email 7 days after cancellation

#### Story 50.6: Terms of Service (Family-Only)

As **a user**,
I want **clear Terms of Service**,
So that **I understand fledgely's commitments (FR99, FR135, FR136)**.

**Acceptance Criteria:**

**Given** user signs up
**When** accepting ToS
**Then** ToS explicitly: "For families only, not schools/employers"
**And** ToS prohibits: surveillance of adults without consent
**And** ToS requires: child must be informed of monitoring
**And** ToS references: crisis URL protection commitment
**And** ToS commits to: data deletion at 18
**And** plain language summary above legal text
**And** version history of ToS changes available

#### Story 50.7: Organizational Use Prevention

As **fledgely**,
I want **to prevent organizational misuse**,
So that **fledgely remains family-only (FR135)**.

**Acceptance Criteria:**

**Given** someone tries to use for non-family purposes
**When** detecting organizational patterns
**Then** flag accounts with: 10+ children, business email domains
**And** require attestation: "I confirm this is for my family"
**And** periodic re-attestation for large accounts
**And** right to terminate accounts violating ToS
**And** no bulk pricing or organizational features
**And** report abuse mechanism for misuse
**And** documented in ToS: family-only enforcement

#### Story 50.8: Payment Failure Handling

As **a subscriber**,
I want **graceful handling of payment failures**,
So that **I don't lose access unexpectedly**.

**Acceptance Criteria:**

**Given** payment fails (card declined, expired)
**When** renewal attempted
**Then** email notification immediately
**And** retry automatically: day 3, day 7, day 14
**And** dashboard warning: "Payment issue - update card"
**And** access continues during retry period (grace)
**And** after 14 days: downgrade to free tier (not deletion)
**And** data preserved: upgrade to restore full access
**And** NFR42: payment failures logged

---

### Epic 51: Data Export, GDPR & Account Lifecycle
**Goal:** Users can export data, request deletion, report abuse, with breach notification.

**User Outcome:** Full GDPR compliance with data portability, deletion rights, and accountability.

**FRs Covered:** FR120, FR153, FR154, FR156, FR157, FR158
**NFRs:** NFR18, NFR66, NFR67, NFR42

#### Story 51.1: Data Export Request

As **a parent**,
I want **to export all my family's data**,
So that **I have data portability (FR120, GDPR Article 20)**.

**Acceptance Criteria:**

**Given** parent wants to export data
**When** requesting export
**Then** can request full data export from settings
**And** export includes: profiles, agreements, screenshots, flags, activity
**And** export format: JSON for data, ZIP with images
**And** export prepared within 48 hours
**And** download link emailed when ready
**And** link expires after 7 days (security)
**And** NFR66: export includes all data, no omissions

#### Story 51.2: Data Deletion Request

As **a parent**,
I want **to request deletion of all data**,
So that **I can exercise right to be forgotten (FR153, GDPR Article 17)**.

**Acceptance Criteria:**

**Given** parent wants data deleted
**When** requesting deletion
**Then** confirmation: "This will delete ALL family data permanently"
**And** requires typing "DELETE MY DATA" to confirm
**And** 14-day cooling off period before deletion
**And** can cancel during cooling off
**And** after 14 days: all data permanently deleted
**And** NFR67: deletion completes within 30 days
**And** confirmation email when deletion complete

#### Story 51.3: Child Data Deletion at 18 (INV-005)

As **the system**,
I want **automatic data deletion when child turns 18**,
So that **adults control their own data (FR154, INV-005)**.

**Acceptance Criteria:**

**Given** child approaches 18th birthday
**When** birthday arrives
**Then** 30-day advance notice to child and parents
**And** notice explains: data will be deleted, can export first
**And** child can export their own data before deletion
**And** on 18th birthday: all child data queued for deletion
**And** deletion completes within 7 days of birthday
**And** audit record preserved (anonymized) for compliance
**And** INV-005: automatic, no parent can prevent

#### Story 51.4: Account Deletion Flow

As **a parent**,
I want **to delete my account entirely**,
So that **I can leave fledgely completely**.

**Acceptance Criteria:**

**Given** parent wants to delete account
**When** initiating account deletion
**Then** cancels any active subscription first
**And** warns: "This affects all family members"
**And** other parent (if exists) notified
**And** children notified: "Family leaving fledgely"
**And** 14-day cooling off (same as data deletion)
**And** after deletion: account unrecoverable
**And** can create new account with same email later

#### Story 51.5: Abuse Reporting

As **anyone**,
I want **to report suspected abuse of fledgely**,
So that **misuse can be investigated (FR156)**.

**Acceptance Criteria:**

**Given** someone suspects fledgely misuse
**When** submitting abuse report
**Then** report form accessible without login
**And** can report: surveillance of adults, non-family use, harassment
**And** anonymous reporting option available
**And** reports reviewed within 72 hours
**And** reporter can optionally receive follow-up
**And** documented investigation process
**And** NFR42: abuse reports logged securely

#### Story 51.6: Breach Notification

As **a user**,
I want **to be notified of data breaches**,
So that **I can take protective action (FR157, GDPR Article 33-34)**.

**Acceptance Criteria:**

**Given** data breach occurs
**When** breach detected
**Then** affected users notified within 72 hours
**And** notification includes: what data affected, when, what to do
**And** notification via: email, in-app banner
**And** regulators notified per GDPR requirements
**And** incident response documented
**And** NFR18: breach response plan maintained
**And** post-incident review and improvements

#### Story 51.7: Privacy Dashboard

As **a parent**,
I want **a privacy dashboard**,
So that **I understand how my family's data is used**.

**Acceptance Criteria:**

**Given** parent accesses privacy settings
**When** viewing privacy dashboard
**Then** shows: what data is collected
**And** shows: where data is stored (GCP regions)
**And** shows: who has access (family members, support)
**And** shows: data retention periods
**And** links to: privacy policy, ToS
**And** controls for: marketing emails, analytics
**And** last login and session history visible

#### Story 51.8: Right to Rectification

As **a parent**,
I want **to correct inaccurate data**,
So that **my family's information is accurate (GDPR Article 16)**.

**Acceptance Criteria:**

**Given** data needs correction
**When** editing profile or settings
**Then** can update: names, birth dates, profile info
**And** historical data (screenshots, flags) cannot be altered
**And** can add context/notes to existing records
**And** changes logged for audit trail
**And** child can request corrections via parent
**And** dispute process for AI-generated content (descriptions)
**And** corrections processed within 30 days

---

### Epic 52: Reverse Mode & Trusted Adults (Age 16 Transition)
**Goal:** At 16, child can take control and choose what to share; trusted adult access available.

**User Outcome:** Teen transitions to self-management with optional parent sharing via designated trusted adults.

**FRs Covered:** FR9, FR10, FR108
**NFRs:** NFR42

#### Story 52.1: Age 16 Transition Notification

As **a teen approaching 16**,
I want **advance notice of my transition options**,
So that **I understand what changes when I turn 16 (FR108)**.

**Acceptance Criteria:**

**Given** child is approaching 16th birthday
**When** 30 days before birthday
**Then** notification to child: "At 16, you gain new controls"
**And** explains: reverse mode option, trusted adults
**And** links to: documentation about age 16 rights
**And** parents also notified: "Your child's controls are changing"
**And** in-app guide walks through new features
**And** celebrates milestone: "You're growing up!"
**And** no action required - transition is optional

#### Story 52.2: Reverse Mode Activation

As **a 16+ teen**,
I want **to activate reverse mode**,
So that **I control what parents see (FR9)**.

**Acceptance Criteria:**

**Given** child is 16 or older
**When** activating reverse mode
**Then** "Reverse Mode" option visible in child's settings
**And** activation requires: understanding confirmation
**And** mode switch: child now controls what's shared
**And** parents notified: "Teen has activated reverse mode"
**And** default after activation: nothing shared with parents
**And** can be deactivated anytime (returns to normal)
**And** NFR42: mode changes logged

#### Story 52.3: Selective Sharing in Reverse Mode

As **a teen in reverse mode**,
I want **to choose what to share with parents**,
So that **I maintain my preferred level of connection**.

**Acceptance Criteria:**

**Given** reverse mode is active
**When** configuring sharing
**Then** can share: daily screen time summary only
**And** can share: specific apps/categories only
**And** can share: time limit status (approaching/reached)
**And** can share: nothing at all
**And** granular controls: what, when, how much
**And** parents see only what teen chooses
**And** teen can change sharing settings anytime

#### Story 52.4: Trusted Adult Designation

As **a 16+ teen**,
I want **to designate trusted adults**,
So that **I have support people I choose (FR10)**.

**Acceptance Criteria:**

**Given** teen wants to add trusted adult
**When** inviting trusted adult
**Then** teen enters: adult's email, relationship, name
**And** invitation sent to adult
**And** adult must accept and create account
**And** adult sees what teen chooses to share
**And** maximum 3 trusted adults
**And** can be: teacher, counselor, other relative, mentor
**And** parents cannot see trusted adult list

#### Story 52.5: Trusted Adult Access

As **a trusted adult**,
I want **to see what the teen shares with me**,
So that **I can provide support**.

**Acceptance Criteria:**

**Given** trusted adult accepted invitation
**When** accessing fledgely
**Then** sees dashboard limited to what teen shares
**And** cannot modify settings or controls
**And** can receive notifications (if teen enables)
**And** can send messages/notes to teen (optional feature)
**And** access is read-only by default
**And** clearly labeled: "Shared by [Teen Name]"
**And** privacy: teen can revoke access anytime

#### Story 52.6: Trusted Adult Removal

As **a teen**,
I want **to remove trusted adults**,
So that **I control who has access**.

**Acceptance Criteria:**

**Given** teen wants to remove trusted adult
**When** removing access
**Then** access revoked immediately
**And** trusted adult notified: "Access has been revoked"
**And** no explanation required
**And** historical data remains (teen's property)
**And** can re-invite same adult later if desired
**And** removal logged for audit
**And** parents cannot see removal activity

#### Story 52.7: Parents' View in Reverse Mode

As **a parent of a 16+ teen**,
I want **to understand what I can still see**,
So that **I respect my teen's autonomy**.

**Acceptance Criteria:**

**Given** teen has activated reverse mode
**When** parent views dashboard
**Then** dashboard clearly shows: "Limited view - teen controls"
**And** sees only what teen has chosen to share
**And** cannot request more access (teen decides)
**And** can still: manage subscription, account settings
**And** resources: "Supporting your teen's independence"
**And** notification if teen adjusts sharing settings
**And** graceful transition: celebrate growth, not loss

#### Story 52.8: Reverse Mode Safety Net

As **the system**,
I want **safety features in reverse mode**,
So that **teens are protected even with increased autonomy**.

**Acceptance Criteria:**

**Given** reverse mode is active
**When** safety concern arises
**Then** crisis URL protection still active (INV-001 inviolable)
**And** teen can still access crisis resources
**And** safe escape (Epic 0.5) still works for teen
**And** teen can re-enable parent visibility anytime
**And** trusted adults can encourage (not force) sharing
**And** abuse reporting still available
**And** system does not weaponize autonomy against safety

---

## Epic Summary

| Phase | Epics | Focus |
|-------|-------|-------|
| Phase 1 | **0.5** + 1-8 + **3A** + **7.5** + **8.5** | **Safe Escape** + Core Foundation + **Shared Custody** + **Child Safety Signal** + **Demo Mode** |
| Phase 2 | 9-19 + **19A-D** | Chromebook & Android + **Quick Status, Child Dashboard, Basic Caregiver** |
| Phase 3 | 20-28 + **27.5** | Dashboard & AI + **Family Health Check-Ins** (Epics 25-26 moved to 19B-C) |
| Phase 4 | 29-38 + **34.5** | Time & Agreements + **Child Voice Escalation** |
| Phase 5 | 39-45 | Extended Family & Platforms (Epic 40 moved to 3A) |
| Phase 6 | 46-52 | Operations & Self-Hosting |

**Total: 52 base epics + 10 sub-epics (0.5, 3A, 7.5, 8.5, 19A-D, 27.5, 34.5) = 62 epics covering all 161 Functional Requirements + safety extensions**

### Focus Group Changes Applied:
- ✅ **Epic 3A** - Shared custody safeguards moved to Phase 1 (protections before features)
- ✅ **Epic 19A** - Quick status view added (green/yellow/red for parents & caregivers)
- ✅ **Epic 19B** - Child screenshot view moved from Epic 25 (bilateral transparency from day one)
- ✅ **Epic 19C** - Child agreement view moved from Epic 26 (child sees terms immediately)
- ✅ **Epic 19D** - Basic caregiver status view split from Epic 39 (Grandpa Joe can help sooner)

### Pre-mortem Analysis Additions:
- ✅ **FR7A, FR7B** - Emergency allowlist updates + fuzzy matching (prevents Crisis Bypass)
- ✅ **FR18B** - Forensic watermarking on screenshots (prevents Screenshot Scandal)
- ✅ **FR21A** - Distress classifier SUPPRESSES alerts (prevents Crisis Bypass)
- ✅ **FR27A** - Audit logging before dashboard live (prevents Screenshot Scandal)
- ✅ **FR27B** - Asymmetric viewing detection (prevents Custody Weapon)
- ✅ **FR37A** - Automatic autonomy reduction at 95% trust (prevents Graduation Never Came)
- ✅ **FR38A** - Required graduation conversation at 100% trust (prevents Graduation Never Came)

### War Room (Cross-Functional) Changes Applied:
- ✅ **Epic 3A** - Removed FR139, FR145 (location-based features) - requires device location data not available until Phase 2
- ✅ **Phase 2 Parallel Tracks** - Chromebook (9-12) and Android (14-17) can develop simultaneously
- ✅ **Epic 8.5** - Demo Mode added for early user value before agreement ceremony

### Red Team vs Blue Team Changes Applied:
- ✅ **FR134** - Moved to Epic 8 as security foundation (Ghost Child defense)
- ✅ **FR3A-X** - Screenshot viewing rate alert >50/hour (Angry Divorce defense)
- ✅ **FR19D-X** - Basic caregiver views logged from day one (Caregiver Backdoor defense)
- ✅ **NFR-CR** - Cross-platform crisis allowlist integration tests (Parallel Track defense)

### Family Therapist Changes Applied:
- ✅ **Epic 27.5** - Family Health Check-Ins with repair mechanisms (addresses missing repair concern)

### Domestic Abuse Survivor Changes Applied:
- ✅ **Epic 0.5** - Safe Account Escape path with 72-hour stealth window
- ✅ **Epic 7.5** - Child Safety Signal to external resources (not parents)
- ✅ **FR-SA1** (Epic 3) - Legal parent petition for access via court order
- ✅ **FR-SA2** (Epic 7) - Privacy gaps to mask crisis resource usage patterns
- ✅ **FR-SA3** (Epic 11, 16) - Decoy mode during crisis browsing
- ✅ **FR-SA4** (Epic 2) - Unilateral self-removal for victim escape
- ✅ **Fleeing Mode** (Epic 40, 41) - Instant location feature disable with 72-hour stealth

### Child Rights Advocate Changes Applied:
- ✅ **Epic 37** - Reframed from "Earned Autonomy" to "Developmental Rights Recognition" (language matters)
- ✅ **Epic 34.5** - Child Voice Escalation after 3 rejected requests (mediation resources)
- ✅ **FR-CR4** (Epic 38) - Annual proportionality check prompt

---

<!-- Story details will be added in Step 3 -->
