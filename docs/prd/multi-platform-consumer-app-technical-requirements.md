# Multi-Platform Consumer App - Technical Requirements

## Platform Implementation Strategy

| Platform | Technology | Rationale |
|----------|------------|-----------|
| **Chrome Extension** | Manifest V3 (TypeScript) | Future-proof; avoid migration pain |
| **Android (phones/tablets)** | Native Kotlin | Best platform integration; performance |
| **Fire TV** | Native Kotlin (shared codebase with Android) | Reuse Android components |
| **iOS** | Native Swift | Platform-specific quality; no cross-platform compromise |
| **Nintendo Switch** | Direct API integration | Code adapted from ha-nintendoparentalcontrols |

## Firebase-Centric Architecture

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

## Authentication Architecture

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

## Device Permissions Matrix

| Permission | Android | Chrome Extension | iOS | Justification |
|------------|---------|------------------|-----|---------------|
| **Screenshot capture** | MediaProjection API | tabs.captureVisibleTab | N/A (not possible) | Core functionality |
| **Accessibility service** | AccessibilityService | N/A | N/A | App detection; foreground monitoring |
| **Usage stats** | UsageStatsManager | N/A | Screen Time API | Time tracking |
| **Notifications** | POST_NOTIFICATIONS | notifications | UNUserNotificationCenter | Alerts to parents/children |
| **Background execution** | FOREGROUND_SERVICE | service_worker | Background App Refresh | Continuous monitoring |
| **Network state** | ACCESS_NETWORK_STATE | N/A | Network framework | Online/offline detection |

## Offline Architecture

| Component | Offline Behavior | Sync Strategy |
|-----------|------------------|---------------|
| **Time tracking** | Local accumulation | Merge on reconnect; conflict = sum |
| **Screenshots** | Local queue (encrypted) | Upload when online; respect retention |
| **Classification** | On-device model only | Cloud enhancement when available |
| **Family agreement** | Cached locally | Pull on reconnect; version check |
| **OTP unlock** | TOTP works offline | Time sync check on reconnect |

**Offline Duration:** 72-hour minimum with full functionality; configurable buffer extends to 7+ days.

## Platform Constraints & Mitigations

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

## Failure Mode Architecture

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

## Security Threat Mitigations

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

## Data Flow Architecture

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

## Integration Architecture

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
