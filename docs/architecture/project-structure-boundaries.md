# Project Structure & Boundaries

## Complete Project Directory Structure

```
fledgely/                                    # Primary Nx monorepo
├── README.md
├── package.json
├── nx.json
├── tsconfig.json                            # Root config with project references
├── tsconfig.base.json                       # Base compiler options
├── .nvmrc                                   # Node version: 20
├── .env.example
├── .gitignore
├── .prettierrc
├── .eslintrc.json
├── firebase.json
├── firestore.rules → packages/firebase-rules/firestore.rules  # Symlink
├── storage.rules → packages/firebase-rules/storage.rules      # Symlink
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                          # Main CI: lint, type, test, build
│   │   ├── security-rules.yml              # Firebase rules testing
│   │   ├── e2e.yml                         # Playwright E2E against emulators
│   │   ├── deploy-preview.yml              # PR preview deployments
│   │   ├── deploy-production.yml           # Production deployment
│   │   ├── compatibility-matrix.yml        # Contract version testing
│   │   └── openapi-sync.yml                # Zod → OpenAPI generation + native notify
│   ├── actions/
│   │   ├── setup-node/action.yml           # Reusable Node setup
│   │   └── firebase-emulators/action.yml   # Reusable emulator setup
│   ├── CODEOWNERS
│   └── pull_request_template.md
│
├── .husky/
│   ├── pre-commit                          # Lint-staged
│   └── commit-msg                          # Commitlint
│
├── .vscode/
│   ├── extensions.json                     # Recommended extensions
│   ├── settings.json                       # Workspace settings
│   └── launch.json                         # Debug configurations
│
├── docker/
│   ├── emulator.Dockerfile
│   └── docker-compose.emulators.yml
│
├── apps/
│   ├── web/                                 # Next.js 14+ dashboard
│   │   ├── package.json
│   │   ├── project.json                    # Nx project config
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json                   # Extends base, references shared
│   │   ├── vitest.config.ts                # Unit tests
│   │   ├── vitest.integration.config.ts    # Integration tests
│   │   ├── .env.local.example
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx              # Root layout (Server Component)
│   │   │   │   ├── page.tsx                # Landing page
│   │   │   │   ├── actions/                # Server Actions
│   │   │   │   │   ├── agreement-actions.ts
│   │   │   │   │   └── auth-actions.ts
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   └── callback/page.tsx
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── layout.tsx          # Dashboard shell
│   │   │   │   │   ├── page.tsx            # Dashboard home
│   │   │   │   │   ├── children/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [childId]/
│   │   │   │   │   │       ├── page.tsx
│   │   │   │   │   │       ├── activity/page.tsx
│   │   │   │   │   │       ├── screenshots/page.tsx
│   │   │   │   │   │       └── agreement/page.tsx
│   │   │   │   │   ├── agreements/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   │   └── [agreementId]/page.tsx
│   │   │   │   │   ├── family/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── members/page.tsx
│   │   │   │   │   │   └── devices/page.tsx
│   │   │   │   │   └── settings/page.tsx
│   │   │   │   └── api/
│   │   │   │       └── health/route.ts
│   │   │   ├── components/
│   │   │   │   ├── ui/                     # shadcn/ui components (flat)
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   └── data-table.tsx
│   │   │   │   ├── shells/                 # Layout shells (reusable)
│   │   │   │   │   ├── DashboardShell.tsx
│   │   │   │   │   └── AuthShell.tsx
│   │   │   │   ├── agreements/             # PRD 4.1
│   │   │   │   │   ├── AgreementCard.tsx
│   │   │   │   │   ├── AgreementList.tsx
│   │   │   │   │   ├── AgreementForm.tsx
│   │   │   │   │   └── AgreementConversation.tsx
│   │   │   │   ├── dashboard/              # PRD 4.2
│   │   │   │   │   ├── TrustScoreCard.tsx
│   │   │   │   │   ├── ActivitySummary.tsx
│   │   │   │   │   ├── RecentFlags.tsx
│   │   │   │   │   └── ChildSelector.tsx
│   │   │   │   ├── screenshots/            # PRD 4.4
│   │   │   │   │   ├── ScreenshotGrid.tsx
│   │   │   │   │   ├── ScreenshotViewer.tsx
│   │   │   │   │   └── ScreenshotFilter.tsx
│   │   │   │   ├── flagging/               # PRD 4.3
│   │   │   │   │   ├── FlagCard.tsx
│   │   │   │   │   ├── FlagReview.tsx
│   │   │   │   │   └── ChildAnnotation.tsx
│   │   │   │   ├── family/                 # PRD 4.5
│   │   │   │   │   ├── FamilyMemberCard.tsx
│   │   │   │   │   ├── DeviceList.tsx
│   │   │   │   │   ├── InviteGuardian.tsx
│   │   │   │   │   └── CustodySettings.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── ErrorBoundary.tsx
│   │   │   │       ├── LoadingSkeleton.tsx
│   │   │   │       └── SyncIndicator.tsx
│   │   │   ├── providers/
│   │   │   │   ├── QueryProvider.tsx
│   │   │   │   ├── AuthProvider.tsx
│   │   │   │   └── index.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAgreement.ts
│   │   │   │   ├── useAgreementsRealtime.ts
│   │   │   │   ├── useChild.ts
│   │   │   │   ├── useScreenshots.ts
│   │   │   │   ├── useTrustScore.ts
│   │   │   │   ├── useFlags.ts
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useOfflineStatus.ts
│   │   │   ├── lib/
│   │   │   │   ├── firebase.ts             # Firebase client init
│   │   │   │   ├── query-client.ts         # TanStack Query config
│   │   │   │   ├── ui-store.ts             # Zustand UI state (single file)
│   │   │   │   ├── utils.ts
│   │   │   │   └── cn.ts
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── public/
│   │   │   └── assets/
│   │   ├── __tests__/
│   │   │   └── integration/
│   │   │       └── agreements.integration.ts
│   │   └── e2e/
│   │       ├── playwright.config.ts
│   │       ├── fixtures/
│   │       │   └── test-users.ts
│   │       ├── page-objects/
│   │       │   ├── DashboardPage.ts
│   │       │   └── AgreementPage.ts
│   │       ├── dashboard.spec.ts
│   │       ├── agreements.spec.ts
│   │       └── adversarial/
│   │           ├── circumvention.adversarial.ts
│   │           ├── custody-manipulation.adversarial.ts
│   │           └── weaponization.adversarial.ts
│   │
│   ├── functions/                          # Firebase Cloud Functions
│   │   ├── package.json
│   │   ├── project.json                    # Nx project config
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── index.ts                    # Function exports
│   │   │   ├── http/
│   │   │   │   ├── sync/
│   │   │   │   │   ├── activity.ts
│   │   │   │   │   └── screenshots.ts
│   │   │   │   └── webhooks/
│   │   │   │       └── stripe.ts
│   │   │   ├── callable/
│   │   │   │   ├── flagContent.ts
│   │   │   │   ├── acknowledgeFlag.ts
│   │   │   │   ├── createAgreement.ts
│   │   │   │   ├── signAgreement.ts
│   │   │   │   ├── proposeRuleChange.ts
│   │   │   │   └── inviteGuardian.ts
│   │   │   ├── scheduled/
│   │   │   │   ├── calculateTrustScores.ts
│   │   │   │   ├── cleanupExpiredData.ts
│   │   │   │   └── syncCrisisAllowlist.ts
│   │   │   ├── triggers/
│   │   │   │   ├── onScreenshotCreated.ts
│   │   │   │   ├── onFlagCreated.ts
│   │   │   │   ├── onAgreementSigned.ts
│   │   │   │   ├── onUserCreated.ts
│   │   │   │   └── onChildTurns18.ts
│   │   │   ├── services/                   # Business logic (testable)
│   │   │   │   ├── trust-score/
│   │   │   │   │   ├── calculator.ts
│   │   │   │   │   ├── factors.ts
│   │   │   │   │   ├── batch-processor.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── flagging/
│   │   │   │       └── index.ts
│   │   │   ├── ai/
│   │   │   │   ├── gemini.ts
│   │   │   │   ├── classifier.ts
│   │   │   │   ├── regexGenerator.ts
│   │   │   │   └── prompts/
│   │   │   │       ├── classification.prompt.ts
│   │   │   │       └── agreement-conversation.prompt.ts
│   │   │   ├── middleware/
│   │   │   │   ├── rate-limit.ts
│   │   │   │   ├── request-logging.ts
│   │   │   │   └── index.ts
│   │   │   ├── config/
│   │   │   │   ├── schema.ts               # Zod config validation
│   │   │   │   ├── defaults.ts
│   │   │   │   ├── loader.ts
│   │   │   │   └── index.ts
│   │   │   └── shared/
│   │   │       ├── auth.ts
│   │   │       ├── permissions.ts
│   │   │       ├── errors.ts
│   │   │       ├── logging.ts
│   │   │       └── crisis-allowlist.ts
│   │   └── __tests__/
│   │       ├── http/
│   │       │   └── sync.test.ts
│   │       ├── callable/
│   │       │   └── flagContent.test.ts
│   │       ├── triggers/
│   │       │   └── onScreenshotCreated.test.ts
│   │       ├── services/
│   │       │   └── trust-score.test.ts
│   │       └── integration/
│   │           ├── flagging.integration.ts
│   │           └── agreements.integration.ts
│   │
│   └── extension/                          # Chrome Extension (MV3)
│       ├── package.json
│       ├── project.json                    # Nx project config
│       ├── manifest.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── background/
│       │   │   ├── service-worker.ts
│       │   │   ├── alarm-scheduler.ts
│       │   │   └── sync-queue.ts
│       │   ├── content/
│       │   │   ├── capture.ts
│       │   │   └── crisis-check.ts
│       │   ├── popup/
│       │   │   ├── Popup.tsx
│       │   │   └── index.tsx
│       │   └── shared/
│       │       ├── storage.ts
│       │       └── messaging.ts
│       ├── public/
│       │   └── icons/
│       └── __tests__/
│           └── capture.test.ts
│
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── project.json                    # Nx project config
│   │   ├── tsconfig.json                   # composite: true
│   │   ├── src/
│   │   │   ├── contracts/
│   │   │   │   ├── agreement.schema.ts
│   │   │   │   ├── child-profile.schema.ts
│   │   │   │   ├── activity.schema.ts
│   │   │   │   ├── screenshot.schema.ts
│   │   │   │   ├── flag.schema.ts
│   │   │   │   ├── guardian.schema.ts
│   │   │   │   ├── trust-score.schema.ts
│   │   │   │   ├── api-responses.schema.ts
│   │   │   │   └── index.ts                # Curated exports
│   │   │   ├── firestore/
│   │   │   │   ├── children.ts
│   │   │   │   ├── agreements.ts
│   │   │   │   ├── screenshots.ts
│   │   │   │   ├── flags.ts
│   │   │   │   ├── guardians.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── error-codes.ts
│   │   │   │   ├── stale-times.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   ├── crisis-urls.ts          # Bundled baseline allowlist
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       ├── dates/
│   │   │       │   ├── format.ts
│   │   │       │   ├── parse.ts
│   │   │       │   └── index.ts
│   │   │       ├── strings/
│   │   │       │   ├── truncate.ts
│   │   │       │   └── index.ts
│   │   │       ├── sanitize-logging.ts
│   │   │       └── index.ts
│   │   └── __tests__/
│   │       └── contracts.test.ts
│   │
│   ├── firebase-rules/
│   │   ├── package.json
│   │   ├── project.json                    # Nx project config
│   │   ├── firestore.rules                 # Source of truth
│   │   ├── storage.rules                   # Source of truth
│   │   └── __tests__/
│   │       ├── firestore/
│   │       │   ├── children.rules.test.ts
│   │       │   ├── agreements.rules.test.ts
│   │       │   └── guardians.rules.test.ts
│   │       └── storage/
│   │           └── screenshots.rules.test.ts
│   │
│   ├── mobile-bridge/
│   │   ├── package.json
│   │   ├── project.json                    # Nx project config
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── contracts/
│   │   │   │   └── index.ts                # Re-export from shared
│   │   │   ├── types/
│   │   │   │   ├── api-responses.ts
│   │   │   │   └── platform-capabilities.ts
│   │   │   └── constants/
│   │   │       ├── platform-features.ts
│   │   │       └── index.ts
│   │   └── openapi/
│   │       └── spec.yaml                   # Generated from Zod
│   │
│   └── test-utils/
│       ├── package.json
│       ├── project.json                    # Nx project config
│       ├── tsconfig.json
│       └── src/
│           ├── firebase/
│           │   ├── emulator-setup.ts
│           │   ├── test-helpers.ts
│           │   └── index.ts
│           ├── factories/
│           │   ├── child.factory.ts
│           │   ├── agreement.factory.ts
│           │   ├── screenshot.factory.ts
│           │   └── index.ts
│           ├── fixtures/
│           │   ├── agreements.json
│           │   ├── children.json
│           │   ├── validate.test.ts        # CI validates fixtures
│           │   └── index.ts
│           ├── mock-api/
│           │   ├── handlers.ts
│           │   ├── server.ts
│           │   └── index.ts
│           ├── mocks/
│           │   ├── firebase-auth.mock.ts
│           │   └── index.ts
│           └── index.ts
│
├── infrastructure/
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       ├── modules/
│       │   ├── firebase/
│       │   ├── cloud-functions/
│       │   ├── storage/
│       │   └── monitoring/
│       └── environments/
│           ├── dev/
│           ├── staging/
│           └── production/
│
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   ├── ux-design-specification.md
│   ├── CONTRIBUTING.md                     # How to contribute
│   ├── DEVELOPMENT.md                      # Local setup guide
│   ├── AI_AGENT_GUIDE.md                   # AI agent specific guidance
│   ├── api/                                # Generated from OpenAPI
│   │   └── index.html
│   └── security/
│       ├── audit-reports/
│       └── compliance-checklist.md
│
├── scripts/
│   ├── generate-openapi.ts
│   ├── seed-emulator.ts
│   └── compare-component-versions.js
│
└── .env.template                           # Required vs optional documented
```

## Separate Native Repositories

```
fledgely-android/                           # Kotlin + Jetpack Compose
├── app/src/main/kotlin/com/fledgely/
├── contracts/                              # Generated from OpenAPI
└── gradle/

fledgely-ios/                               # Swift + SwiftUI
├── Fledgely/
├── Contracts/                              # Generated from OpenAPI
└── Package.swift
```

---

## Architectural Boundaries

**API Boundaries:**
| Boundary | Location | Access |
|----------|----------|--------|
| HTTP Functions | `apps/functions/src/http/` | External agents via REST |
| Callable Functions | `apps/functions/src/callable/` | Web/mobile via Firebase SDK |
| Firestore Triggers | `apps/functions/src/triggers/` | Internal event-driven |
| Security Rules | `packages/firebase-rules/` | Client ↔ Firestore |

**Component Boundaries:**
| Layer | Boundary Rule |
|-------|---------------|
| Components → Hooks | Components consume hooks, never call Firestore directly |
| Hooks → Data Access | Hooks use `@fledgely/firestore` functions |
| Data Access → Firebase | Only data access layer touches Firebase SDK |
| Server → Client | Callable functions return canonical state |

**Data Boundaries:**
| Data Type | Boundary |
|-----------|----------|
| User Data | Security Rules: user can only read own data |
| Child Data | Security Rules: guardian permission check |
| Screenshots | Cloud Storage: path-based access control |
| Agreements | Firestore: guardian + child permissions |

---

## Data Flow Patterns

**Web Dashboard Flow:**
```
Browser → Firestore (direct, Security Rules enforced)
Browser → Server Actions (Next.js SSR, auth flows only)
```

**Chrome Extension Flow:**
```
Extension → Local Chrome Storage → HTTP Sync → Cloud Functions → Firestore
```

**Mobile App Flow:**
```
Native App → Callable Functions → Firestore (functions validate, then write)
```

---

## Server Actions vs Callable Functions

| Use Case | Choice | Reason |
|----------|--------|--------|
| Web-only auth flow | Server Action | SSR, cookies, redirects |
| Web-only form (no mobile) | Server Action | Simpler, no function cold start |
| Feature needed by mobile | Callable Function | Cross-platform |
| Real-time data mutation | Callable Function | Cache invalidation |
| File upload | Server Action | Streaming support |

---

## Function/Service Separation

```typescript
// ❌ WRONG: Business logic in function
export const flagContent = onCall(async (request) => {
  const input = schema.parse(request.data)
  const child = await getChild(input.childId)
  const score = calculateTrustImpact(child, input.category)
  // ... lots of logic
})

// ✅ CORRECT: Function delegates to service
export const flagContent = onCall(async (request) => {
  const input = flagContentSchema.parse(request.data)
  return await flaggingService.flagContent(input, request.auth)
})
```

---

## Requirements to Structure Mapping

**PRD Feature Mapping:**
| PRD Section | Feature | Primary Location | Tests |
|-------------|---------|------------------|-------|
| 4.1 | Agreement Management | `apps/web/src/components/agreements/` | `e2e/agreements.spec.ts` |
| 4.2 | Trust Score | `apps/web/src/components/dashboard/`, `apps/functions/src/services/trust-score/` | Integration tests |
| 4.3 | Content Flagging | `apps/functions/src/callable/`, `apps/web/src/components/flagging/` | `adversarial/` |
| 4.4 | Activity Monitoring | `apps/functions/src/triggers/`, `apps/web/src/components/screenshots/` | Integration tests |
| 4.5 | Family Management | `apps/web/src/components/family/` | E2E tests |

**Cross-Cutting Concerns Mapping:**
| Concern | Locations |
|---------|-----------|
| Authentication | `apps/web/src/lib/firebase.ts`, `apps/functions/src/shared/auth.ts` |
| Error Handling | `packages/shared/src/constants/error-codes.ts`, `apps/functions/src/shared/errors.ts` |
| Crisis Allowlist | `apps/functions/src/shared/crisis-allowlist.ts`, `packages/shared/src/constants/crisis-urls.ts` |
| Offline Sync | `apps/extension/src/background/sync-queue.ts`, `apps/web/src/hooks/useOfflineStatus.ts` |
| Logging | `apps/functions/src/shared/logging.ts`, `packages/shared/src/utils/sanitize-logging.ts` |

---

## Test File Naming Convention

| Type | Pattern | Location | Runner |
|------|---------|----------|--------|
| Unit | `*.test.ts` | Co-located | Vitest |
| Integration | `*.integration.ts` | `__tests__/integration/` | Vitest + Emulators |
| E2E | `*.spec.ts` | `e2e/` | Playwright |
| Adversarial | `*.adversarial.ts` | `e2e/adversarial/` | Playwright |

---

## Structural Discipline Rules

**Barrel File Discipline:**
- Barrel files (`index.ts`) ONLY in `packages/`
- Apps import directly: `import { X } from './component/X'`
- Never wildcard re-export: `export * from`

**Utility Organization:**
- Max 5 files per utils subfolder
- Subfolder per domain (dates/, strings/, validation/)
- JSDoc categories in barrel file for discoverability

**Component Composition:**
- Max 7 props before requiring composition pattern
- Compound component pattern for complex UI
- Context for deeply nested prop drilling

**Hook Composition (No Variants):**
```typescript
// ❌ WRONG: useChildWithScreenshots, useChildWithActivity
// ✅ CORRECT: Compose useChild + useScreenshots in component
```

**Type Discipline:**
- NO standalone `types/` folders (except mobile-bridge platform types)
- All types inferred from Zod schemas
- `z.infer<typeof schema>` is the only pattern

**Config Validation:**
- Zod schema for all environment config
- Startup validation with clear error messages
- CI test that all .env examples parse correctly

**Fixture Validation:**
- All test fixtures Zod-validated in CI
- Factory functions preferred over JSON fixtures
- Fixtures in `test-utils`, not scattered

---

## When to Write Adversarial Tests

Write adversarial test when feature involves:
- Permission checks (can user X do action Y?)
- Custody/guardian relationships
- Child safety (crisis allowlist, flagging)
- Data deletion or modification
- Rate limiting or abuse prevention

Regular E2E tests cover: happy paths, error states, loading states, form validation.

---
