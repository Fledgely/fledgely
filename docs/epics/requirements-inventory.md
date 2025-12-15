# Requirements Inventory

## Functional Requirements

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

## Non-Functional Requirements

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

## Additional Requirements

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

## FR Coverage Map

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
