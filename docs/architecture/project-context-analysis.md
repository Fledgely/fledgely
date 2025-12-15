# Project Context Analysis

## Requirements Overview

**Functional Requirements:**
160 functional requirements spanning 20 categories covering family management, device enrollment, digital agreements, screenshot capture, AI classification, notifications, dashboards, time tracking, crisis protection, earned autonomy, delegated access, multi-platform agents, offline operation, self-hosting, SaaS, accessibility, security, shared custody, data rights, and explicit negative capabilities (what the system must NOT do).

**Non-Functional Requirements:**
91 NFRs covering:
- Performance (2-second dashboard loads, 500ms screenshot capture, 30-second AI classification)
- Security (AES-256 at rest, TLS 1.3 in transit, Firebase Security Rules as primary boundary)
- Privacy & Compliance (COPPA 2025, GDPR, UK AADC, data minimization)
- Scalability (10x growth without re-architecture)
- Reliability (99.5% uptime, 72-hour offline operation)
- Accessibility (WCAG 2.1 AA compliance)
- Platform compatibility (7+ platforms with specific SDK requirements)
- Operational (cost alerts, resource limits, incident classification)

**Scale & Complexity:**
- Primary domain: Multi-platform consumer application with native clients
- Complexity level: High
- Estimated architectural components: 15-20 major components
- Platform count: 7 (Chromebook, Android, Fire TV, iOS, Nintendo Switch, Windows, macOS)
- User types: 4 (Parents, Children, Caregivers, Shared Custody)

## Technical Constraints & Dependencies

| Constraint | Impact |
|------------|--------|
| Firebase-centric architecture | All backend services built on Firebase; self-hosted deploys to user's GCP project |
| Google Sign-In delegation | No auth logic in fledgely; MFA encouragement only |
| iOS screenshot impossibility | Metadata/title classification only on iOS |
| Chrome MV3 5-minute limit | Alarms API scheduling; chunked uploads |
| Android 14+ MediaProjection | Per-session consent; clear UX for re-approval |
| Crisis allowlist immutability | Check BEFORE any capture; zero data path |
| Store independence | Sideload paths mandatory; never depend on app stores |
| E2EE deferred to M18 | Firebase Security Rules are current security boundary |

## Cross-Cutting Concerns Identified

1. **Security & Data Isolation** - Family-level data boundaries enforced via Firebase Security Rules; screenshot access auditing; role-based permissions
2. **Offline Operation** - 72-hour minimum; TOTP unlock; local rule cache; on-device AI classification
3. **Privacy Compliance** - Jurisdiction-aware defaults; crisis resource invisibility; data deletion at 18; retention enforcement
4. **Accessibility** - WCAG 2.1 AA; screen reader support; AI-generated screenshot descriptions for blind parents
5. **Multi-Platform Consistency** - Unified agreement terms across all devices; platform-appropriate enforcement
6. **AI Classification Resilience** - On-device sufficient alone; cloud enhancement optional; family feedback loops
7. **Graceful Degradation** - Never lock out homework; visible failure states; degraded > broken

---

## Architectural Patterns Discovered

**1. Crisis-First Data Pipeline**
All data capture pipelines MUST check crisis allowlist as the FIRST operation - not a filter, but a gate. Architecture must make accidental crisis data capture impossible.

**2. Platform Capability Normalization**
Design for heterogeneous platform capabilities from day one. iOS provides metadata-only; others provide screenshots. Dashboard and trust scoring must handle "best available data" rather than expecting uniform data.

**3. On-Device Primary, Cloud Enhancement**
AI classification architecture treats on-device as the PRIMARY path, not a fallback. Cloud processing is an optional enhancement. This inverts the typical cloud-first assumption.

**4. Multi-Signature Agreement Operations**
Safety rule modifications are transactional multi-party operations with cooling periods and dual-consent requirements, not simple CRUD. Lifestyle rules require proposer + child acknowledgment.

**5. Single-Source Bidirectional Transparency**
All user roles (parent, child, caregiver) view the SAME underlying data through role-appropriate lenses. No separate data stores - only read-path filtering.

**6. Firebase Security Rules as Critical Path**
With E2EE deferred to M18, Firebase Security Rules are the PRIMARY security boundary. Must be tested on every PR, audited regularly, and documented as the trust model.

---

## Security Architecture Requirements

**SA1: Firebase Security Rules as Code**
Rules stored in version control with automated test suite. PR review required for all changes. CI blocks deployment if security tests fail. Monthly security audit.

**SA2: Crisis Allowlist Integrity**
Cached allowlist with bundled baseline (ships with app). Server rejects ANY data for allowlisted URLs. Fallback on network failure: use cached version.

**SA3: Agent Authenticity Chain**
Firebase App Check required for MVP. Device attestation deferred until abuse patterns observed.

**SA4: Insider Threat Mitigations**
All screenshot views logged. Cross-family access impossible via security rules. No bulk export. Child notified when parent views detailed data.

**SA5: Self-Hosted Security Baseline**
Terraform enforces security best practices (hardcoded, not configurable). Documented shared responsibility model.

---

## Compliance Architecture Requirements

**CA1: Consent Audit Trail**
Record parental attestation and child acknowledgment with timestamps. Agreement version history retained.

**CA2: Deletion Verification**
Automated deletion at retention expiry. Age-18 deletion trigger. Proof of deletion available.

**CA3: Crisis Allowlist Compliance**
Automated tests proving zero-data-path. Audit log of allowlist version per capture.

**CA4: AI Human-in-Loop Documentation**
AI provides recommendations only. Parent makes enforcement decisions. No automated punishment.

**CA5: Self-Hosted Compliance Guidance**
Shared responsibility matrix. Compliance checklist. Template privacy policy.

---

## Architectural Trade-Offs

**AT1: Full Firebase Commitment (No Abstraction)**
Firebase IS the architecture. No abstraction layers, no migration planning. Build custom server-side capabilities (Cloud Functions) only where Firebase has functional gaps. This is a strategic commitment: we're a Firebase app, not a "cloud-agnostic app that happens to use Firebase."

**AT2: Full AI Pipeline - Sequenced Development**
Cloud AI (Gemini) primary in early development, collecting training data from day one. Gemini generates regex patterns for on-device real-time blocking (keywords, wildcards for compression). By end of development cycle: on-device ML model trained and deployed, infrastructure ready, cloud AI becomes enhancement. All in scope.

**AT3: Conversational AI Agreement Creation**
AI guides family conversation, filling form fields as discussion progresses. AI conversation IS the form-filling mechanism. Agreement always visible as readable text generated from captured decisions.

**AT4: Universal + Enhanced Platform Capabilities**
All platforms provide universal capabilities (activity, time, enforcement, status, offline). Platforms provide enhanced capabilities where possible (screenshots, deep insights). Dashboard shows "best available" with data source indicators, never "broken."

**AT5: Pure Infrastructure-as-Code Deployment**
Self-hosted deployment is infrastructure-as-code only. User points Terraform at their Google Cloud project and runs apply. Sensible defaults baked into modules.

---

## Architectural Risk Preventions

**PR1: Firebase Security Rules Protocol**
Mandatory security review for all rules changes. 100% test coverage for reads AND writes. Runtime anomaly detection. Rate limiting. <15 minute incident response capability.

**PR2: Crisis Allowlist Absolute Guarantee**
Synchronous blocking allowlist check before any capture. Cached allowlist with bundled baseline. Server rejects screenshots of allowlisted URLs. Fail-safe default (use cached on timeout).

**PR3: Offline Queue Security**
Use platform hardware encryption where available (Keystore/Keychain). Queue is small (limited retention). Focus on making circumvention VISIBLE to parents rather than impossible for determined teens. Capture continuity monitoring.

**PR4: Self-Hosted Security Enforcement**
Security-critical settings hardcoded in Terraform, not configurable. Documented shared responsibility model.

**PR5: Adversarial Family Protections - Full Scope**
- Shared custody immutability (can't remove other parent)
- Separation flow with 30-day waiting period
- Safety rule 48-hour cooling period
- Anti-weaponization design (no export, no legal holds, auto-expiry)
- Child "I feel unsafe" flag with restriction freeze

**PR6: Platform Sustainability**
Graceful degradation hierarchy (never "completely broken"). Explicit platform tier commitments. Documentation over abstraction.

---

## Architecture Decision Records

**ADR-001: Firestore Data Model - Child-Centric with Guardian Links**

Children are the root entity, not families. Each child has:
- Their own guardians (parents, step-parents, legal guardians) with explicit permissions
- Their own agreement that travels with them across households
- Their own screenshots, activity, and trust score

Data Structure:
```
/users/{userId}/
  - profile: { name, email }
  - type: "adult"
  - guardianOf: [childId, ...]

/children/{childId}/
  - profile: { name, birthDate }
  - guardians: {
      [userId]: {
        role: "parent" | "step-parent" | "legal-guardian",
        permissions: { canModifyAgreement, canViewScreenshots, canModifySafetyRules, canAddDevices },
        custody: "primary" | "shared" | "visitation" | null
      }
    }
  - agreement/current
  - agreement/history/{version}
  - screenshots/{date}/{id}
  - activity/{date}
  - trustScore
  - devices: [{ deviceId, platform, lastSeen }]

/caregiverAccess/{accessId}/
  - childId, grantedBy, grantedTo, permissions, expiresAt
```

This supports: shared custody, blended families, complex multi-partner situations, caregiver access.

**ADR-002: Screenshot Storage - Child-Scoped Paths**

Single Cloud Storage bucket with path structure:
```
gs://fledgely-screenshots/
  └── children/{childId}/screenshots/{YYYY-MM-DD}/{timestamp}_{deviceId}_{uuid}.enc
```

Security rules enforce path-based access. Lifecycle policies handle retention. Encryption at rest via Google-managed keys.

**ADR-003: Real-Time Sync - Direct Listeners with Query Limits**

Direct Firestore listeners with query limits for cost efficiency. Dashboard queries last 24h of activity with limited fields. Add Cloud Function aggregation only if costs become problematic.

**ADR-004: Agreement Versioning - Full History**

Keep ALL historical versions (agreements don't change frequently). Current agreement + complete history + proposals with approval workflow.
```
/children/{childId}/agreement/current
/children/{childId}/agreement/history/{version}
/children/{childId}/agreement/proposals/{proposalId}
```

**ADR-005: Notifications - Direct Firestore Triggers + FCM**

Firestore trigger on flag creation sends FCM directly. Notification preferences stored in user doc, checked at send time. No Pub/Sub, no separate service. Add queuing/batching only if volume warrants.

---

## Architectural Simplifications

**S1: Full AI Pipeline - Sequenced Development**
Cloud AI (Gemini) for all classification in early development, collecting training data from day one. Gemini generates regex/keyword patterns for on-device real-time blocking (compressed with wildcards). By end of development cycle: on-device ML model trained and deployed. All in scope.

**S2: Conversational AI Agreement Creation**
AI guides family conversation, filling form fields as discussion progresses. AI conversation IS the form-filling mechanism. Agreement always visible as readable text generated from captured decisions.

**S3: Direct Firebase Patterns**
Notifications via Firestore triggers → FCM (no Pub/Sub). Real-time via direct listeners with query limits (no aggregation docs). Security via Firebase App Check (device attestation deferred).

**S4: Documentation Over Abstraction**
Platform capabilities documented, not abstracted. Defensive coding handles missing capabilities. No abstraction layers.

**S5: Adversarial Protections - Full Scope**
All adversarial family protections in scope: custody immutability, separation flow, cooling periods, anti-weaponization, child safety flags. Core to product mission.

---

## Ethical Framework

**EF1: Child Annotation Before Parent Alert**
Flags always show to child first (30-minute window). Child context accompanies parent notification. System facilitates conversation, not accusation.

**EF2: Guardrails Over Judgments**
System never judges if parent is "good" or "bad." System provides structural protections (audit trails, cooling periods, crisis access) that protect children regardless of parent type.

**EF3: Crisis Invisibility is Absolute**
Zero data path for crisis resources. No "helpful" tracking. Fledgely gets out of the way; crisis professionals handle crisis.

**EF4: Transparency Over Snitching**
Circumvention visible as status indicator, not push alert. Same data shown to both parties. Family decides how to address.

**EF5: Third-Party Privacy is Mitigated, Not Solved**
Accept that friend content will be captured. Mitigate via retention limits, no export, parental education. Perfect redaction is aspirational.

**EF6: Graduation is Non-Negotiable**
At 18, monitoring stops automatically. Data deletion is the child's right. No parent override. This is success, not failure.

---

## Starter Template & Repository Strategy

**ADR-006: Hybrid Repository Architecture**

Decision: Nx monorepo for TypeScript packages + separate repositories for native mobile platforms.

Rationale: Development will leverage AI agentic engineers as specialists (Kotlin specialist, Swift specialist, TypeScript specialist). Specialized agents work best with focused, single-language repositories where they can apply deep expertise without navigating cross-language complexity.

**Repository Structure:**

Primary Monorepo (`fledgely/`):
```
fledgely/
├── apps/
│   ├── web/                    # Next.js dashboard (App Router)
│   ├── functions/              # Firebase Cloud Functions
│   └── extension/              # Chrome Extension (MV3)
├── packages/
│   ├── contracts/              # Zod schemas - single source of truth
│   ├── api-client/             # Generated TypeScript API client
│   ├── shared/                 # Utilities, crisis allowlist, constants
│   └── firebase-rules/         # Firestore & Storage security rules
├── infrastructure/
│   └── terraform/              # GCP/Firebase IaC
├── openapi/                    # Generated OpenAPI specs from Zod
└── nx.json
```

Separate Native Repositories:
```
fledgely-android/              # Kotlin - Android + Fire TV
fledgely-ios/                  # Swift - iOS
fledgely-desktop/              # Electron or Tauri - Windows + macOS (if needed)
```

**Comparative Analysis Matrix:**

| Criterion (Weight) | Nx Mono | Turborepo | Polyrepo | Hybrid |
|--------------------|---------|-----------|----------|--------|
| TS Code Sharing (1.0) | 5 | 5 | 2 | 5 |
| Native Dev Experience (1.0) | 3 | 3 | 5 | 5 |
| Version Compat Testing (1.0) | 5 | 4 | 3 | 4 |
| AI Agent Specialization (1.0) | 3 | 3 | 5 | 5 |
| **Weighted Total** | **4.00** | **3.75** | **3.75** | **4.75** |

Hybrid wins by providing best-of-both-worlds: unified TypeScript tooling where it matters, native-first experience where it matters.

**ADR-007: API Contract Strategy**

Zod schemas in `packages/contracts/` are the single source of truth:

1. TypeScript clients consume Zod directly
2. OpenAPI specs generated from Zod via `@anatine/zod-openapi`
3. Native clients generated from OpenAPI:
   - Android: OpenAPI Generator → Kotlin with kotlinx.serialization
   - iOS: OpenAPI Generator → Swift with Codable

Version compatibility enforced via:
- Contract version field in all API requests
- Server supports current + N-1 versions
- CI matrix tests: {latest server × old clients} + {old server × latest clients}
- Breaking changes require version bump + migration path

**ADR-008: Web Framework - Next.js with App Router**

Decision: Next.js 14+ with App Router for the web dashboard.

Rationale:
- Firebase hosting has first-class Next.js support via `firebase init hosting`
- App Router provides React Server Components for dashboard performance
- Native Firebase SDK integration (no adapter layers)
- Strong TypeScript support aligned with Zod contract strategy
- SSR/SSG flexibility for public pages vs authenticated dashboard

Configuration:
```typescript
// next.config.js
module.exports = {
  output: 'export',  // Static export for Firebase Hosting
  // Or 'standalone' if using Cloud Functions for SSR
}
```

**ADR-009: Monorepo Tooling - Nx**

Decision: Nx for TypeScript monorepo management.

Rationale:
- Superior affected command detection for CI efficiency
- Built-in caching (local + Nx Cloud)
- First-class Firebase/Next.js generators
- Better suited for larger codebases (fledgely scale)
- Stronger TypeScript project references support

Key Nx Features Used:
- `nx affected:test` - Only test what changed
- `nx graph` - Dependency visualization
- Workspace generators for consistent package scaffolding
- Task orchestration for build/test/deploy pipelines

**Version Compatibility Testing Strategy:**

CI Matrix Approach:
```yaml
# .github/workflows/compatibility.yml
strategy:
  matrix:
    server: [current, previous]
    client: [current, previous]
    platform: [web, android, ios, extension]
```

Contract Versioning:
- Major version: Breaking changes (migration required)
- Minor version: Additive changes (backward compatible)
- Every request includes `X-Contract-Version` header
- Server responds with supported version range

Native Repository Sync:
- OpenAPI spec published as GitHub release artifact
- Native repos pin to specific contract version
- Dependabot-style PRs when new contract version available
- CI blocks if native repo contract version is >1 minor behind

---

## Core Architectural Decisions

**ADR-010: State Management - Hybrid Approach**

Decision: TanStack Query for server state + Zustand for UI state + Direct Firestore listeners for critical real-time.

Rationale: TanStack Query provides SSR hydration and normalized caching that Firestore SDK alone doesn't offer. For simpler projects without SSR needs, react-firebase-hooks would be a valid alternative.

**Server-Authoritative Pattern:**
- Firestore is ALWAYS the source of truth - TanStack Query and Zustand are read caches only
- All writes route through Cloud Functions returning canonical state
- Optimistic updates show `pendingWrites` visual indicator
- Conflict resolution: server timestamp wins, no client-side merge logic

**Tiered staleTime Configuration:**
```typescript
export const QUERY_STALE_TIMES = {
  agreement: 5 * 60 * 1000,     // 5 min - rarely changes
  childProfile: 5 * 60 * 1000,  // 5 min - stable
  trustScore: 5 * 60 * 1000,    // 5 min - matches batch frequency
  activity: 60 * 1000,          // 1 min - moderate volatility
  screenshots: 30 * 1000,       // 30s - new captures arrive real-time
} as const
```

**Performance Optimization:**
- Trust scores batched server-side every 5 minutes (90% read cost reduction)
- ESLint rule enforces onSnapshot cleanup to prevent listener leaks

---

**ADR-011: Component Library - shadcn/ui + Radix**

Decision: shadcn/ui built on Radix UI primitives + Tailwind CSS.

Rationale:
- WCAG 2.1 AA accessibility via Radix primitives (required by NFRs)
- Copy-paste ownership allows customization for family-specific UX
- Minimal bundle impact (~20KB base)
- Next.js App Router / RSC friendly

**CI-Enforced Accessibility (not quarterly audits):**
```yaml
# .github/workflows/accessibility.yml
name: Accessibility Check
on:
  push:
    paths:
      - 'packages/ui/**'
      - 'apps/web/components/**'
jobs:
  axe-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Run axe on all stories
        run: npx @storybook/test-runner --url http://localhost:6006
        # Fails PR if any a11y violations
```

**Automated Radix Version Tracking:**
```yaml
# .github/workflows/radix-updates.yml
- name: Check Radix Updates
  run: |
    npm outdated @radix-ui/* --json | \
    node scripts/compare-component-versions.js
```

**Pre-Generated AI Descriptions:**
Screenshot documents include `aiDescription` field generated during classification, never at render time.

---

**ADR-012: Testing Stack**

Decision: Vitest (unit) + Playwright (E2E) + Firebase Emulator Suite + Adversarial Tests.

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Components, hooks, utilities, Cloud Functions logic |
| Integration | Vitest + Firebase Emulators | Firestore operations, security rules |
| E2E | Playwright | Full browser flows against local stack |
| Adversarial | Playwright | Circumvention, abuse, weaponization scenarios |
| Shadow | Weekly | Production parity verification |

**Adversarial Test Suite:**
```
e2e/
  adversarial/
    queue-tampering.spec.ts         # Clear data, clock manipulation
    custody-manipulation.spec.ts    # Remove parent, separation bypass
    crisis-resource-probing.spec.ts # Attempt to detect crisis URLs
    circumvention-detection.spec.ts # Agent disable, uninstall detection
    weaponization.spec.ts           # Excessive flagging, false reports
```

**Test Instrumentation for Crisis Verification:**
```typescript
// Test environments can verify blocking happened without exposing to client
if (process.env.NODE_ENV === 'test') {
  context.testMetadata = { crisisBlocked: isBlocked }
}
```

**Developer Experience:**
```typescript
// playwright.config.ts
webServer: {
  reuseExistingServer: !process.env.CI, // Fast iteration locally
}
```

**Seed Data Validation:**
```typescript
// Zod validation on seed data prevents schema drift
seedData.children.forEach(child => ChildSchema.parse(child))
```

---

**ADR-013: Error Handling Standards**

Decision: Typed internal error codes + sanitized user-facing messages + correlation IDs.

**Error Sanitization Layer:**
```typescript
const ERROR_SANITIZATION: Record<string, string> = {
  'crisis/resource-blocked': 'content/unavailable',
  'agreement/cooling-period-active': 'agreement/pending-changes',
  'auth/permission-denied': 'auth/access-denied'
}

function handleError(error: InternalError, res: Response) {
  const correlationId = crypto.randomUUID().slice(0, 8)

  // Full context server-side
  logger.error('Request failed', { correlationId, code: error.code })

  // Sanitized for client with support ID
  res.status(400).json({
    code: sanitizeError(error.code),
    message: getUserFriendlyMessage(error.code),
    supportId: correlationId
  })
}
```

**Constant-Time Responses:**
Auth-sensitive endpoints use constant-time responses (minimum 200ms) to prevent timing attacks.

---

**ADR-014: CI/CD Pipeline**

Decision: GitHub Actions + Workload Identity Federation + Nx affected commands.

**Security: No Static Keys**
```yaml
jobs:
  deploy:
    permissions:
      id-token: write
    steps:
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/PROJECT/locations/global/...'
          service_account: 'github-deploy@PROJECT.iam.gserviceaccount.com'
```

**Nx-ified Security Rules:**
```
packages/
  firebase-rules/
    project.json        # Nx project - affected detection applies
    firestore.rules
    storage.rules
    src/__tests__/
```

**Deploy Order:** Rules deploy AFTER functions to prevent brief misconfiguration window.

**Break-Glass Emergency Procedure:**
```markdown
When GitHub Actions unavailable (requires 2-person auth):
1. Retrieve break-glass key from 1Password vault
2. gcloud auth activate-service-account --key-file=break-glass.json
3. firebase deploy --only functions,hosting
4. Rotate key immediately; file incident report
```

---

**ADR-015: Monitoring & Observability**

Decision: All-Google stack - Firebase Crashlytics + Cloud Monitoring. No Sentry.

| Concern | Tool |
|---------|------|
| Crashes (all platforms) | Firebase Crashlytics |
| Performance | Firebase Performance Monitoring |
| Infrastructure | Cloud Monitoring |
| Logs | Cloud Logging (structured JSON) |
| Alerts | Cloud Monitoring (single pane) |

Rationale: Crashlytics added web support in 2024. All-Google eliminates Sentry → BigQuery pipeline complexity.

**Key Metrics:**
- Screenshot capture success rate by platform
- AI classification latency (target: 30s)
- Dashboard load time (target: 2s)
- Security rule denials (anomaly detection)

---

**ADR-016: Offline Sync Strategy**

Decision: Firestore offline persistence + bounded queue + sequential ID integrity + throttled sync.

**Configurable Offline Tolerance:**
```typescript
interface AgreementSettings {
  offlineToleranceHours: number  // Default: 72, range: 24-168 (1-7 days)
}
```

**Queue Integrity (Lightweight):**
```typescript
interface QueueEntry {
  id: string           // Sequential: 1, 2, 3...
  timestamp: number
  data: EncryptedScreenshot
}

// Gap detection on sync (no SHA-256 overhead)
function detectGaps(entries: QueueEntry[]): number[] {
  const gaps: number[] = []
  for (let i = 1; i < entries.length; i++) {
    if (parseInt(entries[i].id) !== parseInt(entries[i-1].id) + 1) {
      gaps.push(parseInt(entries[i-1].id) + 1)
    }
  }
  return gaps
}
```

**Throttled Sync on Reconnect:**
```typescript
async function syncOfflineQueue(entries: QueueEntry[]) {
  const BATCH_SIZE = 50
  const BATCH_DELAY_MS = 5000

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    await uploadBatch(entries.slice(i, i + BATCH_SIZE))
    if (i + BATCH_SIZE < entries.length) await delay(BATCH_DELAY_MS)
  }
}
```

**Root/Jailbreak Detection:** Refuse to run on compromised devices.

---

**ADR-017: Rate Limiting & Cost Control**

Decision: GCP-native rate limiting + behavioral anomaly detection.

**GCP-Native Controls (Cost):**
| Layer | GCP Solution |
|-------|--------------|
| Client Auth | Firebase App Check |
| Function Limits | Cloud Functions maxInstances |
| Per-User Throttle | Firestore Security Rules timestamps |
| Budget | Cloud Billing alerts at 25%, 50%, 80%, 100% |

**Behavioral Anomaly Detection (Abuse):**
```typescript
// Separate from cost control - detects weaponization patterns
const ANOMALY_PATTERNS = {
  excessive_flags: { threshold: 20, window: '24h' },
  category_clustering: { sameCategory: 0.8, minFlags: 10 },
  timing_burst: { count: 5, window: '5m' },
}

// Offline sync bursts are expected, not anomalies
const ANOMALY_EXEMPTIONS = { offline_sync: true }
```

---

## Decision Consistency Matrix

All ADRs validated for cross-consistency:
- State management aligned with offline sync (Firestore authoritative)
- Error handling flows to monitoring (correlation IDs)
- Testing covers adversarial scenarios from PRD
- CI/CD integrates with Nx affected detection
- Rate limiting separates cost control from abuse prevention

---
