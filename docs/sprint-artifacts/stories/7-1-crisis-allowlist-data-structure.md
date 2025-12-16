# Story 7.1: Crisis Allowlist Data Structure

Status: done

## Story

As **the system**,
I want **a maintainable allowlist of crisis resources**,
So that **these resources can be protected across all platforms consistently**.

## Acceptance Criteria

1. **Given** fledgely needs to protect crisis resources **When** the allowlist is structured **Then** allowlist is stored in `@fledgely/shared/constants/crisis-urls`
2. **Given** allowlist entries are created **When** viewing entry structure **Then** each entry includes: domain, category (suicide, abuse, crisis, LGBTQ+, etc.), aliases
3. **Given** allowlist is structured **When** adding URL patterns **Then** allowlist supports wildcard patterns (*.thetrevoproject.org)
4. **Given** allowlist is distributed **When** checking version **Then** allowlist is versioned with timestamp for sync verification
5. **Given** multiple platforms exist **When** allowlist is built **Then** bundled copy exists for each platform (TypeScript, Android assets, iOS resources)
6. **Given** audit requirements **When** viewing allowlist **Then** allowlist is human-readable JSON for auditing
7. **Given** initial deployment **When** allowlist is created **Then** initial list includes: National Suicide Prevention, Crisis Text Line, RAINN, Trevor Project, Childhelp, National DV Hotline, and regional equivalents

## Tasks / Subtasks

- [x] Task 1: Create @fledgely/shared Package (AC: 1)
  - [x] 1.1: Create `packages/shared/` directory structure
  - [x] 1.2: Initialize package.json with name `@fledgely/shared`
  - [x] 1.3: Configure TypeScript with tsconfig.json
  - [x] 1.4: Add to workspace configuration in root package.json
  - [x] 1.5: Set up build scripts and exports in package.json
  - [x] 1.6: Verify package can be imported from other packages

- [x] Task 2: Create Crisis URL Schema (AC: 2, 3)
  - [x] 2.1: Create `packages/shared/src/constants/crisis-urls/schema.ts`
  - [x] 2.2: Define `crisisResourceCategorySchema` enum: 'suicide', 'abuse', 'crisis', 'lgbtq', 'mental_health', 'domestic_violence', 'child_abuse', 'eating_disorder', 'substance_abuse'
  - [x] 2.3: Define `crisisUrlEntrySchema` with: id, domain, category, aliases, wildcardPatterns, name, description
  - [x] 2.4: Define `crisisAllowlistSchema` with: version, lastUpdated, entries array
  - [x] 2.5: Add wildcard pattern validation (must start with `*.`)
  - [x] 2.6: Write schema validation tests

- [x] Task 3: Create Initial Allowlist Data (AC: 6, 7)
  - [x] 3.1: Create `packages/shared/src/constants/crisis-urls/allowlist.json`
  - [x] 3.2: Add National Suicide Prevention Lifeline (988lifeline.org, suicidepreventionlifeline.org)
  - [x] 3.3: Add Crisis Text Line (crisistextline.org)
  - [x] 3.4: Add RAINN (rainn.org, hotline.rainn.org)
  - [x] 3.5: Add Trevor Project (thetrevoproject.org, thetrevorproject.org)
  - [x] 3.6: Add Childhelp (childhelp.org, childhelp.org/hotline)
  - [x] 3.7: Add National DV Hotline (thehotline.org)
  - [x] 3.8: Add regional equivalents: Samaritans (UK), Kids Help Phone (Canada), Lifeline (Australia)
  - [x] 3.9: Add additional resources: SAMHSA, National Alliance on Mental Illness, PFLAG
  - [x] 3.10: Validate allowlist against schema

- [x] Task 4: Create Version Management (AC: 4)
  - [x] 4.1: Create `packages/shared/src/constants/crisis-urls/version.ts`
  - [x] 4.2: Define version format: semver + ISO timestamp (e.g., "1.0.0-2025-12-16T12:00:00Z")
  - [x] 4.3: Create `getAllowlistVersion()` function
  - [x] 4.4: Create `isAllowlistStale(remoteVersion)` comparison helper
  - [x] 4.5: Write version management tests

- [x] Task 5: Create TypeScript API (AC: 1, 2)
  - [x] 5.1: Create `packages/shared/src/constants/crisis-urls/index.ts` with exports
  - [x] 5.2: Create `getCrisisAllowlist()` function returning typed data
  - [x] 5.3: Create `isCrisisUrl(url: string)` check function
  - [x] 5.4: Create `getCrisisResourceByDomain(domain: string)` lookup
  - [x] 5.5: Create `getCrisisResourcesByCategory(category)` filter
  - [x] 5.6: Write API function tests

- [x] Task 6: Create Platform Export Scripts (AC: 5)
  - [x] 6.1: Create `packages/shared/scripts/export-allowlist.ts`
  - [x] 6.2: Export TypeScript module (default - already exists)
  - [x] 6.3: Export JSON for Android (`dist/android/crisis-allowlist.json`)
  - [x] 6.4: Export JSON for iOS (`dist/ios/crisis-allowlist.json`)
  - [x] 6.5: Add npm script `export:allowlist` to package.json
  - [x] 6.6: Verify exported files match schema

- [x] Task 7: Integration and Documentation (AC: 1-7)
  - [x] 7.1: Update `packages/shared/src/index.ts` with all exports
  - [x] 7.2: Export from main package entry point
  - [x] 7.3: Add README.md with usage examples
  - [x] 7.4: Add JSDoc comments to all public functions
  - [x] 7.5: Write integration tests verifying package can be imported
  - [x] 7.6: Verify all acceptance criteria are met

## Dev Notes

### Epic 7 Context: Crisis Allowlist Foundation

Epic 7 establishes the foundation for protecting crisis resources from any monitoring. This is a **CRITICAL SAFETY FEATURE** - children must be able to access crisis resources without any trace being visible to parents.

**Key NFRs:**
- **NFR28:** Allowlist must be cached locally (fail-safe to protection)
- **NFR42:** WCAG 2.1 AA accessibility for any UI displaying allowlist

**Key FRs:**
- **FR61:** Crisis resources protected from monitoring
- **FR62:** Allowlist synchronized across platforms
- **FR63:** Version control for sync verification
- **FR65:** Child can view protected resources
- **FR66:** Emergency update capability (< 1 hour)

### Project Structure Requirements

According to `project_context.md`, crisis allowlist location:
```
| Platform | Bundled Location |
|----------|------------------|
| TypeScript | @fledgely/shared/constants/crisis-urls |
| Android | assets/crisis-allowlist.json |
| iOS | Resources/crisis-allowlist.json |
```

### Package Structure to Create

```
packages/shared/
├── package.json           # @fledgely/shared package
├── tsconfig.json          # TypeScript configuration
├── README.md              # Package documentation
├── src/
│   ├── index.ts           # Main exports
│   └── constants/
│       └── crisis-urls/
│           ├── index.ts       # Crisis URL API
│           ├── schema.ts      # Zod schemas
│           ├── allowlist.json # Allowlist data
│           ├── version.ts     # Version management
│           └── __tests__/
│               ├── schema.test.ts
│               ├── api.test.ts
│               └── version.test.ts
├── scripts/
│   └── export-allowlist.ts    # Platform export script
└── dist/                      # Build output (gitignored)
    ├── android/
    │   └── crisis-allowlist.json
    └── ios/
        └── crisis-allowlist.json
```

### Schema Design

```typescript
// packages/shared/src/constants/crisis-urls/schema.ts

import { z } from 'zod'

/**
 * Crisis resource categories for organization
 */
export const crisisResourceCategorySchema = z.enum([
  'suicide',          // Suicide prevention
  'abuse',            // General abuse
  'crisis',           // General crisis support
  'lgbtq',            // LGBTQ+ specific resources
  'mental_health',    // Mental health support
  'domestic_violence', // Domestic violence
  'child_abuse',      // Child abuse specific
  'eating_disorder',  // Eating disorder support
  'substance_abuse',  // Substance abuse support
])

export type CrisisResourceCategory = z.infer<typeof crisisResourceCategorySchema>

/**
 * Single crisis URL entry
 */
export const crisisUrlEntrySchema = z.object({
  /** Unique identifier for the entry */
  id: z.string().uuid(),

  /** Primary domain (e.g., "988lifeline.org") */
  domain: z.string().min(1),

  /** Resource category */
  category: crisisResourceCategorySchema,

  /** Domain aliases (e.g., ["suicidepreventionlifeline.org"]) */
  aliases: z.array(z.string()).default([]),

  /** Wildcard patterns (e.g., ["*.988lifeline.org"]) */
  wildcardPatterns: z.array(
    z.string().regex(/^\*\./, 'Wildcard patterns must start with *.')
  ).default([]),

  /** Human-readable name */
  name: z.string().min(1),

  /** Description of what this resource helps with */
  description: z.string().min(1),

  /** Country/region code (ISO 3166-1 alpha-2) or 'global' */
  region: z.string().default('us'),

  /** Contact method: phone, text, chat, web */
  contactMethods: z.array(z.enum(['phone', 'text', 'chat', 'web'])).default(['web']),

  /** Optional: phone number if applicable */
  phoneNumber: z.string().optional(),

  /** Optional: text number if applicable */
  textNumber: z.string().optional(),
})

export type CrisisUrlEntry = z.infer<typeof crisisUrlEntrySchema>

/**
 * Complete crisis allowlist with versioning
 */
export const crisisAllowlistSchema = z.object({
  /** Semantic version + timestamp (e.g., "1.0.0-2025-12-16T12:00:00Z") */
  version: z.string().regex(/^\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),

  /** When this version was created */
  lastUpdated: z.string().datetime(),

  /** All crisis URL entries */
  entries: z.array(crisisUrlEntrySchema),
})

export type CrisisAllowlist = z.infer<typeof crisisAllowlistSchema>
```

### Initial Allowlist Data (Required Resources)

Per AC #7, initial list MUST include:

| Resource | Domain | Category | Region |
|----------|--------|----------|--------|
| 988 Suicide & Crisis Lifeline | 988lifeline.org | suicide | us |
| Crisis Text Line | crisistextline.org | crisis | us |
| RAINN | rainn.org | abuse | us |
| The Trevor Project | thetrevoproject.org | lgbtq | us |
| Childhelp | childhelp.org | child_abuse | us |
| National DV Hotline | thehotline.org | domestic_violence | us |
| Samaritans | samaritans.org | suicide | uk |
| Kids Help Phone | kidshelpphone.ca | crisis | ca |
| Lifeline Australia | lifeline.org.au | crisis | au |

### API Functions

```typescript
// packages/shared/src/constants/crisis-urls/index.ts

import { CrisisAllowlist, CrisisUrlEntry, CrisisResourceCategory } from './schema'
import allowlistData from './allowlist.json'

/**
 * Get the complete crisis allowlist
 */
export function getCrisisAllowlist(): CrisisAllowlist {
  return allowlistData as CrisisAllowlist
}

/**
 * Check if a URL matches any crisis resource
 * @param url - Full URL or domain to check
 * @returns true if URL is a protected crisis resource
 */
export function isCrisisUrl(url: string): boolean {
  const domain = extractDomain(url)
  const allowlist = getCrisisAllowlist()

  for (const entry of allowlist.entries) {
    // Check primary domain
    if (domainMatches(domain, entry.domain)) return true

    // Check aliases
    if (entry.aliases.some(alias => domainMatches(domain, alias))) return true

    // Check wildcard patterns
    if (entry.wildcardPatterns.some(pattern => wildcardMatches(domain, pattern))) return true
  }

  return false
}

/**
 * Get crisis resource by domain
 */
export function getCrisisResourceByDomain(domain: string): CrisisUrlEntry | undefined {
  // Implementation
}

/**
 * Get all crisis resources in a category
 */
export function getCrisisResourcesByCategory(category: CrisisResourceCategory): CrisisUrlEntry[] {
  // Implementation
}
```

### Testing Standards

**Unit tests for:**
- Schema validation (valid entries pass, invalid entries fail)
- Wildcard pattern validation
- Version format validation
- API function behavior

**Integration tests for:**
- Package import from other packages
- Exported JSON file validity
- All initial resources present

### NFR Compliance

- **NFR28 (Cached locally):** Allowlist is bundled with each platform for offline access
- **NFR42 (Accessibility):** Not applicable for this story (no UI)

### Git Commit Pattern

```
feat(Story 7.1): Crisis Allowlist Data Structure - create @fledgely/shared package
```

### Dependencies

- No external dependencies on other stories
- Creates foundation for all other Epic 7 stories
- Must be complete before Stories 7.2-7.9 can proceed

### References

- [Source: docs/epics/epic-list.md#Story-7.1] - Original acceptance criteria
- [Source: docs/project_context.md] - Crisis allowlist distribution requirements
- [Source: docs/architecture.md] - Platform-specific bundled locations

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None - implementation completed without errors.

### Completion Notes List

- Created new `@fledgely/shared` package from scratch with complete workspace integration
- Implemented comprehensive crisis URL matching supporting primary domains, aliases, and wildcard patterns
- Allowlist contains 18 crisis resources covering US, UK, Canada, and Australia regions
- All 9 required categories implemented: suicide, abuse, crisis, lgbtq, mental_health, domestic_violence, child_abuse, eating_disorder, substance_abuse
- Version format follows `MAJOR.MINOR.PATCH-YYYY-MM-DDTHH:MM:SSZ` pattern for sync verification
- Platform export script generates Android and iOS JSON files for native app integration
- Fail-safe behavior implemented throughout: invalid inputs return false/undefined rather than throwing
- **Test Summary:** 104 tests passing (35 schema, 24 version, 45 API)
- All 7 Acceptance Criteria verified and met

**Code Review Fixes Applied:**
- H1: Added all missing exports to main entry point (getCrisisResourcesByRegion, getAllCategories, getAllRegions, etc.)
- M1: Added `isolatedModules: true` to tsconfig.json for build tool compatibility
- M2: Added `@internal` JSDoc tags to helper functions (domainMatches, wildcardMatches)
- M3: Added runtime schema validation with caching in getCrisisAllowlist() for fail-safe operation

### File List

**Created:**
- `packages/shared/package.json` - Package definition with exports
- `packages/shared/tsconfig.json` - TypeScript configuration
- `packages/shared/README.md` - Usage documentation
- `packages/shared/.gitignore` - Ignores dist/ and node_modules/
- `packages/shared/src/index.ts` - Main package exports
- `packages/shared/src/constants/crisis-urls/schema.ts` - Zod schemas
- `packages/shared/src/constants/crisis-urls/allowlist.json` - 18 crisis resources
- `packages/shared/src/constants/crisis-urls/version.ts` - Version management
- `packages/shared/src/constants/crisis-urls/index.ts` - Main API functions
- `packages/shared/src/constants/crisis-urls/__tests__/schema.test.ts` - 35 tests
- `packages/shared/src/constants/crisis-urls/__tests__/version.test.ts` - 24 tests
- `packages/shared/src/constants/crisis-urls/__tests__/api.test.ts` - 45 tests
- `packages/shared/scripts/export-allowlist.ts` - Platform export script

**Modified:**
- `package.json` (root) - Added test:shared, typecheck:shared scripts and workspace reference
