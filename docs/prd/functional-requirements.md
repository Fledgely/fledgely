# Functional Requirements

This section defines the complete capability contract for fledgely. UX designers will ONLY design what's listed here. Architects will ONLY support what's listed here. If a capability is missing, it will NOT exist in the final product.

**Total: 160 Functional Requirements**

---

## Family & Account Management

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

## Device Enrollment & Management

- **FR11:** Parent can enroll a new device by scanning a QR code
- **FR12:** Existing family device can approve new device enrollment
- **FR13:** Parent can view all enrolled devices and their status
- **FR14:** Parent can remove a device from monitoring
- **FR15:** System detects when monitoring is disabled or tampered with
- **FR16:** Parent receives alert when device monitoring status changes
- **FR17:** Child can see which of their devices are being monitored

---

## Family Digital Agreement

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

## Screenshot Capture & Storage

- **FR27:** System captures screenshots at configurable intervals on monitored devices
- **FR28:** Screenshots are stored in Firebase with security rule protection
- **FR29:** System automatically deletes screenshots after retention period (default 7 days)
- **FR30:** Parent can configure screenshot retention period per family
- **FR31:** Parent can manually delete specific screenshots
- **FR32:** System logs all screenshot access in audit trail
- **FR33:** Child can view their own screenshots
- **FR34:** Screenshots from crisis-allowlisted sites are never captured

---

## AI Content Classification

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

## Notifications & Alerts

- **FR42:** Parent receives push notification when concerning content is flagged
- **FR43:** Parent can configure notification preferences (immediate, digest, off)
- **FR44:** Child receives age-appropriate notifications about their activity
- **FR45:** Parent receives alert when child's monitoring is interrupted
- **FR46:** System provides weekly summary email to parents
- **FR47:** Caregiver receives only permitted notifications based on trust level
- **FR113:** All family members receive login alerts when any account is accessed
- **FR160:** Parent receives alert when account is accessed from new location

---

## Parent Dashboard

- **FR48:** Parent can view screenshot list filtered by child, device, date, or classification
- **FR49:** Parent can view individual screenshot with AI classification
- **FR50:** Parent can view aggregate screen time across all family devices
- **FR51:** Parent can see "last synced" timestamp for each device
- **FR52:** Child can view the same dashboard data as parent (bidirectional transparency)
- **FR53:** Parent can access audit log showing who viewed what and when
- **FR54:** Dashboard displays data freshness indicators

---

## Time Tracking & Limits

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

## Crisis Resource Protection

- **FR61:** System maintains a public crisis allowlist (domestic abuse, suicide prevention, etc.)
- **FR62:** Visits to crisis-allowlisted resources are never logged or captured
- **FR63:** Child can view the complete crisis allowlist
- **FR64:** Visual indicator shows child when they are on a protected resource
- **FR65:** System redirects concerning searches to appropriate crisis resources
- **FR66:** Crisis allowlist updates are distributed via versioned GitHub Releases

---

## Earned Autonomy & Independence

- **FR67:** System tracks child's responsible usage patterns over time
- **FR68:** Restrictions automatically relax based on demonstrated responsibility
- **FR69:** Parent can view child's "earned autonomy" progress
- **FR70:** Child can see their progress toward more freedom
- **FR71:** At age 16, system offers transition to Reverse Mode
- **FR72:** At age 18, all child data is immediately deleted

---

## Delegated Access (Caregivers)

- **FR73:** Parent can create temporary caregiver PIN with specific permissions
- **FR74:** Caregiver can view child's remaining screen time
- **FR75:** Caregiver can extend time by configured amount (once per day)
- **FR76:** Caregiver can view flagged content with parent approval
- **FR77:** Caregiver actions are logged in audit trail
- **FR78:** Caregiver PIN only works from registered caregiver device
- **FR122:** Caregiver can send "contact parent" request through the app
- **FR123:** Trusted adult authenticates via invitation link from parent

---

## Platform-Specific Capabilities

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

## Offline Operation

- **FR87:** Devices continue monitoring when offline (cached rules)
- **FR88:** Offline screenshots queue for upload when connectivity returns
- **FR89:** Time tracking continues offline with sync on reconnect
- **FR90:** OTP unlock works offline using TOTP
- **FR91:** System displays "offline since" timestamp to users

---

## Self-Hosting

- **FR92:** Technical users can deploy fledgely to their own Google Cloud account
- **FR93:** One-click Terraform deployment creates all required infrastructure
- **FR94:** Self-hosted deployment uses family's own Firebase project
- **FR95:** Self-hosted users can configure custom domain
- **FR96:** Upgrade path documentation guides self-hosted users through updates
- **FR124:** System performs automated backups of family data
- **FR125:** Parent can restore family data from backup (self-hosted)

---

## SaaS Features

- **FR97:** Users can subscribe to managed SaaS service
- **FR98:** Users can select subscription tier based on family size
- **FR99:** Users can manage billing through self-service portal
- **FR100:** System provides trial period for new SaaS users

---

## Accessibility

- **FR101:** All user interfaces support screen readers
- **FR102:** System provides AI-generated screenshot descriptions for blind parents
- **FR103:** All notifications have visual, audio, and haptic alternatives
- **FR104:** Time displays use natural language ("2 hours left" not "120 minutes")
- **FR105:** Agreements support visual/picture-based format for cognitive accessibility
- **FR142:** Parent can create custom activity categories per child
- **FR143:** Parent can enable transition warnings (activity ending soon) with configurable lead times
- **FR152:** Child can respond to agreement and notifications via pre-set response options (non-verbal support)

---

## Security & Data Isolation

- **FR131:** System enforces strict data isolation between families (no cross-family data access)
- **FR132:** Child accounts cannot modify family settings or parent configurations
- **FR112:** System detects VPN/proxy usage and logs transparently to all family members
- **FR114:** System applies jurisdiction-appropriate privacy defaults (e.g., UK AADC)
- **FR146:** System displays unclassifiable/encrypted traffic to all family members
- **FR159:** Siblings cannot view each other's detailed activity data (only aggregate family)

---

## Shared Custody & Family Structures

- **FR139:** Parent can configure location-based rule variations (e.g., different limits at each home)
- **FR140:** Safety-critical settings (crisis allowlist, age restrictions) require both parents to approve changes
- **FR141:** Parent declares custody arrangement during family setup
- **FR144:** System can import work schedule from connected calendar
- **FR145:** Work mode can activate automatically based on device location (opt-in)
- **FR151:** Either parent can initiate family dissolution, requiring data handling decision

---

## Data Rights & Account Lifecycle

- **FR120:** Parent can export all family data in portable format (GDPR compliance)
- **FR154:** System notifies affected families within 72 hours of any data breach (GDPR requirement)
- **FR158:** Parent can close family account with complete data deletion

---

## Analytics & Improvement

- **FR153:** System collects anonymized usage analytics to improve product (with consent)

---

## Negative Capabilities (System Must NOT)

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
