---
project_name: 'fledgely'
user_name: 'Cns'
date: '2025-12-14'
version: '1.0'
---

# Project Context for AI Agents

_Critical implementation rules. For full architecture: `docs/architecture.md`_

---

## Quick Facts

| Aspect | Choice |
|--------|--------|
| Monorepo | Nx (TypeScript packages) |
| Web | Next.js 14+ (App Router) |
| Backend | Firebase Cloud Functions (Node 20) |
| Database | Firestore (direct SDK) |
| State | TanStack Query (server) + Zustand (UI only) |
| Forms | react-hook-form + Zod resolver |
| UI | shadcn/ui + Radix + Tailwind |
| Testing | Vitest + Playwright + Firebase Emulators |
| Native | Separate repos: Kotlin (Android), Swift (iOS) |

---

## The 5 Unbreakable Rules

### 1. Types From Zod Only
```typescript
// ✅ CORRECT
import { agreementSchema } from '@fledgely/contracts'
type Agreement = z.infer<typeof agreementSchema>

// ❌ WRONG - never create standalone types
interface Agreement { ... }
```
Utility types (`Partial<>`, `Pick<>`) on Zod types are OK.

### 2. Firebase SDK Direct (No Abstractions)
```typescript
// ✅ OK: Ref helpers, query builders
const ref = doc(db, 'children', childId)

// ❌ FORBIDDEN: Repository pattern, ORM-like wrappers
const db = new DatabaseHelper(firestore)
```
Rule: If you can't see it's Firestore, it's wrong.

### 3. Crisis Allowlist Check FIRST
- Synchronous blocking check BEFORE any capture
- Fail-safe: use cached allowlist on network timeout
- ZERO data path - no logging, no analytics, nothing

### 4. State Ownership
| What | Where |
|------|-------|
| Server data | TanStack Query |
| Forms | react-hook-form |
| URL state | Next.js router |
| UI-only | Zustand |

**That's it.** If it's not UI-only, it's not Zustand.

### 5. Functions Delegate to Services
```typescript
// ✅ CORRECT: Thin function → testable service
export const flagContent = onCall(async (req) => {
  const input = flagContentSchema.parse(req.data)
  return flaggingService.createFlag(input, req.auth)
})

// ❌ WRONG: Business logic in function
export const flagContent = onCall(async (req) => {
  const child = await getChild(req.data.childId)
  const impact = calculateImpact(child) // Logic here = wrong
})
```

---

## Schema Reference (@fledgely/contracts)

| Schema | Purpose |
|--------|---------|
| `agreementSchema` | Digital family agreement |
| `childProfileSchema` | Child's profile data |
| `guardianSchema` | Guardian permissions |
| `screenshotSchema` | Screenshot metadata |
| `flagSchema` | Content flag/concern |
| `trustScoreSchema` | Calculated trust score |
| `activitySchema` | Daily activity summary |

---

## Anti-Patterns

```typescript
// ❌ Server Action in useQuery
const { data } = useQuery({ queryFn: () => submitForm(data) })
// ✅ Direct call or useMutation
await submitForm(data)

// ❌ Business logic in components
function FlagReview() { const impact = calculateImpact(flag) }
// ✅ Logic in services/hooks
function FlagReview() { const { data } = useFlagWithImpact(flagId) }

// ❌ Logging PII
console.log(`User: ${user.email}`)
// ✅ Log IDs only
console.log(`User: ${user.uid}`)
```

---

## Platform-Specific Rules

### Contract Consumption

| Platform | Source | Import |
|----------|--------|--------|
| TypeScript | Zod direct | `@fledgely/contracts` |
| Android | OpenAPI generated | `com.fledgely.contracts` |
| iOS | OpenAPI generated | `FledgelyContracts` |

### Offline Storage

| Platform | Storage | Sync | Queue Limit |
|----------|---------|------|-------------|
| Web | Firestore persistence | Automatic | N/A |
| Extension | Chrome storage | Alarms API | 500 |
| Android | Room (SQLite) | WorkManager | 1000 |
| iOS | CoreData | BGTaskScheduler | 1000 |

### Crisis Allowlist Distribution

| Platform | Bundled Location |
|----------|------------------|
| TypeScript | `@fledgely/shared/constants/crisis-urls` |
| Android | `assets/crisis-allowlist.json` |
| iOS | `Resources/crisis-allowlist.json` |

Sync: `GET /api/crisis-allowlist` (24h TTL, fallback to cached)

### Authentication

All platforms: Google Sign-In only → Firebase ID token for API calls

| Platform | Method |
|----------|--------|
| Web | Popup/redirect |
| Android | Credential Manager |
| iOS | GIDSignIn |

---

## Test Patterns

### File Naming
| Type | Pattern | Location |
|------|---------|----------|
| Unit | `*.test.ts` | Co-located |
| Integration | `*.integration.ts` | `__tests__/integration/` |
| E2E | `*.spec.ts` | `e2e/` |
| Adversarial | `*.adversarial.ts` | `e2e/adversarial/` |

### Unit Test
```typescript
import { describe, it, expect } from 'vitest'
import { calculateTrustScore } from './calculator'

describe('calculateTrustScore', () => {
  it('returns 100 for child with no flags', () => {
    const activity = createMockActivity({ flags: [] })
    expect(calculateTrustScore(activity)).toBe(100)
  })
})
```

### Integration Test (Emulators)
```typescript
import { initializeTestApp, clearFirestore } from '@fledgely/test-utils'

describe('Agreement Operations', () => {
  beforeAll(() => initializeTestApp())
  afterEach(() => clearFirestore())

  it('creates and retrieves agreement', async () => {
    const created = await createAgreement(mockInput)
    const retrieved = await getAgreement(created.id)
    expect(retrieved).toMatchObject(mockInput)
  })
})
```

### Adversarial Test (Required For)
- Permission checks
- Cross-family data isolation
- Crisis URL zero-data-path
- Rate limit enforcement

```typescript
test('guardian cannot access other family data', async ({ page }) => {
  const familyA = await createTestFamily('A')
  const familyB = await createTestFamily('B')

  await loginAsGuardian(page, familyA.guardian)
  await page.goto(`/children/${familyB.child.id}`)

  await expect(page.getByText('Access Denied')).toBeVisible()
})
```

**Mock vs Emulator:** Unit tests mock Firebase. Integration tests use emulators. NEVER mock security rules.

---

## UI Components (shadcn/ui)

**Add when needed:**
```bash
npx shadcn-ui@latest add [component]
```

**Import:** `@/components/ui/[component]`

**When to create custom:**
| Scenario | Action |
|----------|--------|
| Standard UI element | Use shadcn |
| Domain-specific | Create in `components/[feature]/` |
| Reusable layout | Create in `components/shells/` |

---

## Cloud Functions Template

```typescript
// apps/functions/src/callable/flagContent.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { flagContentSchema } from '@fledgely/contracts'
import { flaggingService } from '../services/flagging'
import { verifyAuth } from '../shared/auth'

export const flagContent = onCall(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const input = flagContentSchema.safeParse(request.data)
  if (!input.success) {
    throw new HttpsError('invalid-argument', 'Invalid input')
  }

  // 3. Permission (THIRD)
  await verifyChildAccess(user.uid, input.data.childId)

  // 4. Business logic (LAST)
  return flaggingService.createFlag(input.data, user)
})
```

**Shared Code:**
| Location | Contains |
|----------|----------|
| `packages/shared/` | Contracts, constants, pure utils |
| `apps/functions/src/shared/` | Auth, Firebase-specific utils |
| `apps/functions/src/services/` | Business logic |

---

## Error Handling

- React: ErrorBoundary at route level
- Async: try-catch in Server Actions, Query handles fetch errors
- User-facing: `{ title, message, action? }` - never raw errors
- Logging: Correlation IDs, sanitize PII with `sanitizeForLogging()`

**Never log:** email, name, phone, address, birthdate
**OK to log:** userId, childId, resourceId, action type, timestamps

---

## Architectural Invariants

| ID | Rule | Enforcement |
|----|------|-------------|
| INV-001 | Crisis URLs NEVER captured | Adversarial test |
| INV-002 | Child data requires guardian permission | Security rules tests |
| INV-003 | All types from Zod schemas | ESLint + grep |
| INV-004 | No Firebase abstractions | Code review |
| INV-005 | Deletion at 18 automatic | Scheduled function test |

---

## When Stuck

1. Check `docs/architecture.md` for full context
2. Look at existing code for patterns
3. When in doubt: direct Firebase SDK, Zod types, thin functions
