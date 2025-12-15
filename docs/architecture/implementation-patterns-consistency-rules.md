# Implementation Patterns & Consistency Rules

## Pattern Categories Defined

**Critical Conflict Points Identified:** 47 areas where AI agents could make different choices - all now standardized.

## Naming Patterns

**Database Naming Conventions (Firestore):**
- Collections: `camelCase` plural (`agreements`, `childProfiles`, `activityLogs`)
- Documents: Firebase auto-generated IDs (never custom slugs)
- Fields: `camelCase` (`createdAt`, `childId`, `trustScore`)
- Subcollections: `camelCase` plural (`/children/{id}/screenshots`)

**API Naming Conventions:**
- HTTP Functions: `kebab-case` paths (`/api/sync-activity`)
- Callable Functions: `camelCase` (`syncChildData`, `flagContent`)
- Route parameters: `:paramName` format
- Query params: `camelCase` (`?childId=xxx&startDate=xxx`)

**Code Naming Conventions:**
- Components: `PascalCase` files and exports (`AgreementCard.tsx`)
- Hooks: `camelCase` with `use` prefix (`useAgreement.ts`)
- Utilities: `camelCase` (`formatTrustScore.ts`)
- Types: `PascalCase` with descriptive suffix (`AgreementFormData`, `ChildProfileResponse`)
- Constants: `SCREAMING_SNAKE_CASE` (`MAX_SCREENSHOTS_PER_DAY`)
- Zod schemas: `camelCase` with `Schema` suffix (`agreementSchema`, `childProfileSchema`)

**[Stable] Type Inference Patterns:**
```typescript
// ✅ CORRECT: Infer from Zod
import { agreementSchema } from '@fledgely/contracts'
type Agreement = z.infer<typeof agreementSchema>

// ❌ WRONG: Duplicate type definition
interface Agreement { ... }
```

## Structure Patterns

**[Stable] Project Organization:**
```
packages/
├── web/src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # UI components (by feature)
│   │   ├── agreements/
│   │   ├── dashboard/
│   │   └── shared/
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and helpers
│   └── styles/          # Global styles only
├── functions/src/
│   ├── http/            # HTTP-triggered functions
│   │   ├── sync/
│   │   └── webhooks/
│   ├── callable/        # Callable functions
│   ├── scheduled/       # Cron jobs
│   ├── triggers/        # Firestore/Auth triggers
│   └── shared/          # Shared function utilities
├── shared/src/
│   ├── contracts/       # Zod schemas (source of truth)
│   ├── firestore/       # Data access layer
│   │   ├── children.ts
│   │   ├── agreements.ts
│   │   └── index.ts     # Re-exports only
│   └── types/           # Generated types only
└── mobile-bridge/       # React Native shared code
```

**[Stable] Feature Boundaries (maps to PRD):**
| Feature | Package | PRD Section |
|---------|---------|-------------|
| Agreement Management | `web/components/agreements/` | 4.1 |
| Trust Score | `web/components/dashboard/` | 4.2 |
| Content Flagging | `functions/callable/` | 4.3 |
| Activity Monitoring | `functions/triggers/` | 4.4 |
| Family Management | `web/components/family/` | 4.5 |

**Test Organization:**
- Unit tests: Co-located `*.test.ts` files
- Integration tests: `__tests__/integration/`
- E2E tests: `e2e/` at package root
- Test utilities: `packages/test-utils/`
  ```
  packages/test-utils/
  ├── firebase/          # Emulator helpers
  ├── factories/         # Test data factories
  ├── mocks/             # Shared mocks
  └── setup/             # Test setup files
  ```

**[Stable] Schema File Organization:**
```
packages/shared/src/contracts/
├── agreement.schema.ts      # One domain per file
├── child-profile.schema.ts
├── activity.schema.ts
├── index.ts                 # Re-exports only
└── generated/               # OpenAPI output (gitignored build artifact)
```

## Format Patterns

**[Stable] API Response Formats:**
```typescript
// Success response
{ data: T, metadata?: { cached: boolean, timestamp: string } }

// Error response
{ error: { code: string, message: string, details?: unknown } }

// Pagination
{ data: T[], pagination: { cursor?: string, hasMore: boolean } }
```

**[Stable] Error Codes:**
```typescript
const ERROR_CODES = {
  // Auth
  AUTH_REQUIRED: 'auth/required',
  AUTH_EXPIRED: 'auth/expired',
  // Permission
  PERMISSION_DENIED: 'permission/denied',
  PERMISSION_CHILD_ACCESS: 'permission/child-access',
  // Validation
  VALIDATION_FAILED: 'validation/failed',
  VALIDATION_SCHEMA: 'validation/schema',
  // Resource
  NOT_FOUND: 'resource/not-found',
  CONFLICT: 'resource/conflict',
} as const
```

**[Stable] Date/Time Formats:**
```typescript
// Storage: Always Firestore Timestamps
import { Timestamp } from 'firebase/firestore'

// API: ISO 8601 strings
"2024-01-15T10:30:00Z"

// Display: date-fns with explicit locale
import { format } from 'date-fns'
import { enGB } from 'date-fns/locale'
format(date, 'PPP', { locale: enGB })

// ⚠️ date-fns Gotchas:
// - formatDistance returns "about 2 hours" not "2h" - use custom formatter for compact
// - isToday/isYesterday use local timezone - be explicit about user's timezone
// - parseISO is strict - invalid dates throw, always wrap in try-catch
```

**JSON Field Conventions:**
- All fields: `camelCase`
- Booleans: `is` or `has` prefix (`isActive`, `hasConsent`)
- Timestamps: `*At` suffix (`createdAt`, `lastSyncAt`)
- IDs: `*Id` suffix (`childId`, `agreementId`)

## Communication Patterns

**[Stable] Firebase Realtime Listener Pattern:**
```typescript
// ✅ CORRECT: TanStack Query + Firestore listener
export function useAgreements(childId: string) {
  return useQuery({
    queryKey: ['agreements', childId],
    queryFn: () => getAgreements(childId),
    staleTime: QUERY_STALE_TIMES.agreement,
  })
}

// Real-time updates via separate listener hook
export function useAgreementsRealtime(childId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = onSnapshot(
      agreementsQuery(childId),
      (snapshot) => {
        queryClient.setQueryData(['agreements', childId],
          snapshot.docs.map(doc => doc.data())
        )
      }
    )
    return unsubscribe
  }, [childId, queryClient])
}
```

**[Stable] React Query Configuration:**
```typescript
export const QUERY_STALE_TIMES = {
  agreement: 5 * 60 * 1000,     // 5 min - rarely changes
  childProfile: 5 * 60 * 1000,  // 5 min - stable
  trustScore: 5 * 60 * 1000,    // 5 min - matches batch frequency
  activity: 60 * 1000,          // 1 min - moderate volatility
  screenshots: 30 * 1000,       // 30s - new captures arrive real-time
} as const
```

**Zustand Store Pattern:**
```typescript
// Only for UI state that doesn't belong in URL or server
interface UIStore {
  sidebarOpen: boolean
  activeChildId: string | null
  // Actions
  toggleSidebar: () => void
  setActiveChild: (id: string) => void
}

// ❌ NEVER store in Zustand:
// - Server data (use TanStack Query)
// - URL state (use Next.js router)
// - Form state (use react-hook-form)
```

**[Stable] Server Action vs TanStack Mutation Decision Tree:**
```
Is it a simple form submission?
├── Yes → Does it need optimistic updates?
│   ├── Yes → TanStack useMutation
│   └── No → Server Action
└── No (complex flow) → TanStack useMutation

Exceptions:
- Auth flows → Always Server Actions (security)
- File uploads → Always Server Actions (streaming)
- Real-time data → Always TanStack (cache integration)
```

**[Stable] Batch & Transaction Patterns:**
```typescript
// Atomic multi-document updates
import { writeBatch, runTransaction } from 'firebase/firestore'

// Batch: Multiple independent writes (no reads needed)
const batch = writeBatch(db)
batch.update(agreementRef, { status: 'approved' })
batch.update(childRef, { trustScore: newScore })
await batch.commit()

// Transaction: When reads inform writes
await runTransaction(db, async (transaction) => {
  const child = await transaction.get(childRef)
  const currentScore = child.data()?.trustScore ?? 0
  transaction.update(childRef, {
    trustScore: currentScore + delta
  })
})

// ⚠️ Transaction retries: Firebase auto-retries up to 5 times
// Keep transactions fast (<1 second) to avoid contention
```

## Process Patterns

**[Stable] Data Access Layer Error Handling:**
```typescript
// packages/shared/src/firestore/agreements.ts

// GET operations: Return null for not found
export async function getAgreement(id: string): Promise<Agreement | null> {
  const doc = await getDoc(agreementRef(id))
  return doc.exists() ? doc.data() as Agreement : null
}

// MUTATION operations: Throw typed errors
export async function createAgreement(data: AgreementInput): Promise<Agreement> {
  const validated = agreementSchema.parse(data)
  // throws ValidationError, PermissionError, etc.
}
```

**[Stable] Error Handling Pattern:**
```typescript
// Global error boundary for React
// Per-query error handling for data fetching
// Structured logging for debugging

// User-facing errors
{ title: string, message: string, action?: { label: string, onClick: () => void } }

// Internal errors (logged, not shown)
{ code: string, context: Record<string, unknown>, stack?: string }
```

**Loading State Pattern:**
```typescript
// Component-level loading
const { data, isLoading, error } = useQuery(...)

// Skeleton components for major UI sections only
// Inline spinners for buttons and small elements
// No full-page loading screens after initial load
```

**[Stable] Offline Sync Pattern:**
```typescript
// Enable Firestore persistence
enableIndexedDbPersistence(db)

// Queue writes when offline
// Sync on reconnection with exponential backoff
// Show sync status indicator

// Conflict resolution: Last-write-wins with timestamp
// Exception: Agreement signatures require explicit merge UI
```

**[Stable] Component Re-export & Boundaries:**
```typescript
// Re-export convention: YES for feature folders
// components/agreements/index.ts
export { AgreementCard } from './AgreementCard'
export { AgreementList } from './AgreementList'
export { AgreementForm } from './AgreementForm'

// Client Component Boundary Rule:
// Default to Server Component. Add 'use client' ONLY when:
// - Using hooks (useState, useEffect, useQuery, etc.)
// - Using browser APIs (localStorage, window, etc.)
// - Handling user events (onClick, onSubmit, etc.)

// Pattern: Leaf components are client, layouts are server
// app/dashboard/page.tsx (Server) → components/DashboardStats (Client)
```

**[Stable] Mobile Bridge Scope:**
```typescript
// packages/mobile-bridge/ contains ONLY:
// ✅ Zod schemas (re-exported from @fledgely/contracts)
// ✅ Type definitions
// ✅ Pure utility functions (no React, no Firebase SDK)
// ✅ Constants and enums

// ❌ NOT in mobile-bridge:
// - React hooks (platform-specific implementations)
// - Firebase SDK calls (different SDKs per platform)
// - UI components

// Platform-specific files: Use .native.ts / .web.ts
// utils.ts        → shared
// utils.native.ts → React Native override
// utils.web.ts    → Web override (rare)
```

**[Stable] CI Test Execution:**
```typescript
// CI Pipeline Order:
// 1. Lint (parallel) - fastest feedback
// 2. Type check (parallel)
// 3. Unit tests (parallel per package)
// 4. Integration tests (sequential - shared emulators)
// 5. E2E tests (sequential - full environment)

// Firebase Emulator Lifecycle:
// - Unit tests: Mock Firebase, no emulators
// - Integration tests: Single emulator instance per CI job
//   └── Start once in beforeAll, stop in afterAll (global setup)
//   └── Clear data between test files, not between tests
// - E2E tests: Fresh emulator per test file (isolation > speed)
```

**[Stable] Logging & PII Sanitization:**
```typescript
// Log vs Display Matrix:
// | Error Type | User Sees | Logged Context |
// |------------|-----------|----------------|
// | PERMISSION_DENIED | "You don't have access" | userId, resourceId, attemptedAction |
// | VALIDATION_FAILED | Field-specific messages | Full payload (sanitized) |
// | NOT_FOUND | "Item not found" | resourceType, resourceId |
// | INTERNAL | "Something went wrong" | Full error, stack trace |

// PII Sanitization before logging:
const sanitizeForLogging = (data: unknown) => {
  const REDACT_FIELDS = ['email', 'phone', 'name', 'address', 'dob']
  // Deep clone and replace matching fields with '[REDACTED]'
}

// ✅ ALWAYS sanitize user-provided data before logging
// ✅ NEVER log: passwords, tokens, full names, email addresses
// ✅ OK to log: user IDs, resource IDs, action types, timestamps
```

## Enforcement Guidelines

**All AI Agents MUST:**
1. Use Zod schemas from `@fledgely/contracts` as the single source of truth
2. Follow the naming conventions exactly (no variations)
3. Place files in the correct feature directories
4. Use TanStack Query for all server state
5. Include Firebase emulator tests for any Firestore operations
6. Never create abstraction layers over Firebase SDK

**[Stable] Enforcement Categories:**
| Category | Enforcement | Tool |
|----------|-------------|------|
| Naming conventions | `[Lint]` | ESLint rules |
| Import paths | `[CI]` | TypeScript paths + build check |
| Test coverage | `[CI]` | Vitest coverage threshold |
| Schema validation | `[CI]` | Zod parse in tests |
| Feature boundaries | `[Review]` | PR review checklist |
| Error handling | `[Review]` | PR review checklist |

**[Stable] Path Alias Conventions:**
```typescript
// tsconfig.json paths
{
  "@/*": ["./src/*"],                    // Package-internal
  "@fledgely/contracts": ["../shared/src/contracts"],
  "@fledgely/firestore": ["../shared/src/firestore"],
  "@fledgely/test-utils": ["../test-utils/src"]
}

// ❌ NEVER: Relative imports across packages
import { schema } from '../../../shared/src/contracts'

// ✅ ALWAYS: Alias imports
import { schema } from '@fledgely/contracts'
```

**[Stable] Environment Variable Conventions:**
```typescript
// Public (exposed to client): NEXT_PUBLIC_ prefix
NEXT_PUBLIC_FIREBASE_API_KEY=xxx

// Private (server only): No prefix
FIREBASE_ADMIN_KEY=xxx

// Feature flags (build-time): FEATURE_ prefix
FEATURE_NATIVE_SYNC=true

// Runtime feature flags: Firebase Remote Config
// - Used for: A/B tests, gradual rollouts, kill switches
// - Not for: Security-sensitive features
```

**[Stable] Git Workflow Conventions:**
```
Branch naming: {type}/{ticket-id}-{short-description}
Examples:
- feature/FL-123-agreement-signing
- fix/FL-456-trust-score-calc
- chore/FL-789-update-deps

Commit format: {type}({scope}): {description}
Examples:
- feat(agreements): add digital signature flow
- fix(dashboard): correct trust score display
- test(functions): add flagging integration tests

PR requirements:
- All CI checks passing
- At least 1 approval
- No unresolved conversations
- Squash merge to main
```

**Pattern Enforcement:**
- ESLint rules for naming conventions (automated)
- TypeScript strict mode for type safety (automated)
- PR template checklist for patterns (manual review)
- Architecture decision log for deviations

## Pattern Examples

**Good Examples:**
```typescript
// ✅ Correct component structure
// packages/web/src/components/agreements/AgreementCard.tsx
import { Agreement } from '@fledgely/contracts'
import { useAgreement } from '@/hooks/useAgreement'

export function AgreementCard({ agreementId }: { agreementId: string }) {
  const { data: agreement, isLoading } = useAgreement(agreementId)
  // ...
}

// ✅ Correct data access
// packages/shared/src/firestore/agreements.ts
export async function getAgreement(id: string): Promise<Agreement | null>
export async function createAgreement(data: AgreementInput): Promise<Agreement>

// ✅ Correct test structure
// packages/web/src/components/agreements/AgreementCard.test.tsx
import { render, screen } from '@fledgely/test-utils'
```

**Anti-Patterns:**
```typescript
// ❌ Wrong: Creating Firebase abstraction
class FirebaseRepository { ... }

// ❌ Wrong: Duplicate type definitions
interface Agreement { ... } // Should use Zod inference

// ❌ Wrong: Server state in Zustand
useStore.setState({ agreements: data })

// ❌ Wrong: Missing emulator test
test('creates agreement', async () => {
  // No Firebase emulator setup
})

// ❌ Wrong: Relative cross-package imports
import { schema } from '../../../shared/src/contracts'

// ❌ Wrong: Type guards for Zod-validated data
function isAgreement(data: unknown): data is Agreement {
  // Unnecessary - Zod.parse already validates
}
```

---
