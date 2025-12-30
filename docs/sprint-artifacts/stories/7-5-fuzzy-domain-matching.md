# Story 7.5: Fuzzy Domain Matching

Status: done

## Story

As **the system**,
I want **to match crisis resources even with typos or variations**,
So that **protection isn't defeated by URL variations**.

## Acceptance Criteria

1. **AC1: Exact Domain Match**
   - Given a child navigates to a URL
   - When allowlist check is performed
   - Then exact domain matches are protected (thetrevorproject.org)

2. **AC2: Subdomain Variations**
   - Given a child navigates to a URL with subdomains
   - When allowlist check is performed
   - Then subdomain variations are protected (www.thetrevorproject.org, help.thetrevorproject.org)

3. **AC3: Common Typo Detection**
   - Given a child navigates to a typo'd crisis URL
   - When allowlist check is performed
   - Then common typos are protected (trevorproject.org ≈ thetrevorproject.org)
   - And protection triggers for typos within Levenshtein distance ≤2

4. **AC4: Levenshtein Algorithm**
   - Given a URL is being checked
   - When fuzzy matching is used
   - Then Levenshtein distance ≤2 for known domains triggers protection
   - And only base domains are compared (not subdomains or paths)

5. **AC5: No False Positives**
   - Given fuzzy matching is active
   - When domains are compared
   - Then fuzzy matching does NOT create false positives on unrelated domains
   - And domains with distance >2 are NOT matched
   - And very short domains (≤5 chars) require exact match only

6. **AC6: Improvement Queue Logging**
   - Given a fuzzy match occurs
   - When a typo is detected
   - Then fuzzy matches are logged to allowlist improvement queue
   - And logging does NOT include family or child identifiers
   - And logged data: matched_domain, candidate_domain, distance, timestamp

## Tasks / Subtasks

- [x] Task 1: Implement Levenshtein Distance Function (AC: #4)
  - [x] 1.1 Create levenshteinDistance() function in crisis-allowlist.ts
  - [x] 1.2 Use Wagner-Fischer algorithm for O(mn) space/time
  - [x] 1.3 Add early exit optimization for distance > max threshold
  - [x] 1.4 Add unit tests for distance calculations

- [x] Task 2: Implement Fuzzy Domain Matching (AC: #3, #4, #5)
  - [x] 2.1 Create findFuzzyMatch() function to check domain against allowlist
  - [x] 2.2 Create extractBaseDomain() for comparison (strip subdomains)
  - [x] 2.3 Only fuzzy match against base domain part
  - [x] 2.4 Use threshold of distance ≤2 (FUZZY_MATCH_THRESHOLD)
  - [x] 2.5 Skip fuzzy matching for domains <10 chars to prevent false positives
  - [x] 2.6 Add unit tests for fuzzy matching

- [x] Task 3: Integrate with isUrlProtected (AC: #1, #2, #3)
  - [x] 3.1 Modify isUrlProtected() to call fuzzy matching after exact match fails
  - [x] 3.2 Ensure exact matches still work (no regression)
  - [x] 3.3 Ensure subdomain handling still works (no regression)
  - [x] 3.4 Return true if fuzzy match succeeds
  - [x] 3.5 Maintain <10ms performance target
  - [x] 3.6 Add integration tests

- [x] Task 4: Implement Improvement Queue Logging (AC: #6)
  - [x] 4.1 Create logFuzzyMatch() function
  - [x] 4.2 Log to chrome.storage.local queue (NOT family logs)
  - [x] 4.3 Include only: matched_domain, candidate_domain, distance, timestamp
  - [x] 4.4 NO family/child identifiers in logs
  - [x] 4.5 Add queue size limit (max 100 entries, FIFO)
  - [x] 4.6 Add tests for privacy of logging

- [x] Task 5: Unit Tests (AC: All)
  - [x] 5.1 Test Levenshtein distance calculations
  - [x] 5.2 Test exact match still works
  - [x] 5.3 Test subdomain variations
  - [x] 5.4 Test typo detection (crisistextline.org typos)
  - [x] 5.5 Test false positive prevention (ensure random.org ≠ rainn.org)
  - [x] 5.6 Test short domain exact-match-only rule
  - [x] 5.7 Test improvement queue logging privacy
  - [x] 5.8 Test performance (<10ms per check)

## Dev Notes

### Implementation Strategy

Story 7.5 adds fuzzy/typo matching to the existing crisis allowlist. The existing `isUrlProtected()` function in `apps/extension/src/crisis-allowlist.ts` currently uses exact domain matching with O(1) Set lookups. We need to add Levenshtein distance-based fuzzy matching as a FALLBACK when exact match fails.

**Key principle: Over-protect, never under-protect.** Per FR64 (zero data path invariant), false positives (skipping capture of non-crisis site) are acceptable; false negatives (capturing crisis site) are NOT.

### Key Requirements

- **FR64:** Visits to crisis-allowlisted resources are never logged or captured
- **INV-001:** Zero data path - crisis sites NEVER captured
- **Performance:** <10ms per check (NFR28 crisis protection reliability)

### Technical Approach

1. **Levenshtein Distance Algorithm**:

   ```typescript
   /**
    * Calculate Levenshtein distance between two strings
    * Uses Wagner-Fischer algorithm with early exit optimization
    */
   function levenshteinDistance(a: string, b: string, maxDistance: number = 2): number {
     // Early exit: length difference exceeds max distance
     if (Math.abs(a.length - b.length) > maxDistance) {
       return maxDistance + 1
     }

     const m = a.length
     const n = b.length
     const dp: number[][] = Array(m + 1)
       .fill(null)
       .map(() => Array(n + 1).fill(0))

     for (let i = 0; i <= m; i++) dp[i][0] = i
     for (let j = 0; j <= n; j++) dp[0][j] = j

     for (let i = 1; i <= m; i++) {
       for (let j = 1; j <= n; j++) {
         if (a[i - 1] === b[j - 1]) {
           dp[i][j] = dp[i - 1][j - 1]
         } else {
           dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
         }
       }
     }

     return dp[m][n]
   }
   ```

2. **Fuzzy Matching Function**:

   ```typescript
   const FUZZY_MATCH_THRESHOLD = 2
   const MIN_DOMAIN_LENGTH_FOR_FUZZY = 6 // Prevent false positives on short domains

   function isFuzzyMatch(inputDomain: string, allowlistDomains: string[]): string | null {
     // Skip fuzzy matching for very short domains
     if (inputDomain.length <= MIN_DOMAIN_LENGTH_FOR_FUZZY) {
       return null
     }

     for (const protectedDomain of allowlistDomains) {
       // Skip short protected domains too
       if (protectedDomain.length <= MIN_DOMAIN_LENGTH_FOR_FUZZY) {
         continue
       }

       const distance = levenshteinDistance(inputDomain, protectedDomain, FUZZY_MATCH_THRESHOLD)
       if (distance <= FUZZY_MATCH_THRESHOLD) {
         return protectedDomain
       }
     }

     return null
   }
   ```

3. **Integration with isUrlProtected()**:

   ```typescript
   export function isUrlProtected(url: string): boolean {
     // ... existing domain extraction ...

     // Step 1: Exact match (existing behavior)
     if (cachedDomainSet.has(domain)) {
       return true
     }

     // Step 2: Fuzzy match (new)
     const baseDomain = extractBaseDomain(domain) // Strip subdomains
     const fuzzyMatch = isFuzzyMatch(baseDomain, DEFAULT_CRISIS_DOMAINS)
     if (fuzzyMatch) {
       logFuzzyMatch(baseDomain, fuzzyMatch, levenshteinDistance(baseDomain, fuzzyMatch))
       return true
     }

     return false
   }
   ```

4. **Expected Typos to Catch**:
   | Typo | Correct | Distance |
   |------|---------|----------|
   | trevorproject.org | thetrevorproject.org | 3 (won't match - needs manual alias) |
   | thetrevorprojct.org | thetrevorproject.org | 1 |
   | thetrevorprojet.org | thetrevorproject.org | 1 |
   | rainnn.org | rainn.org | 1 |
   | raiinn.org | rainn.org | 1 |
   | criisistextline.org | crisistextline.org | 1 |

   **Note:** "trevorproject.org" → "thetrevorproject.org" has distance 3 (missing "the"), so this requires an alias in the allowlist rather than fuzzy matching.

5. **False Positive Prevention**:
   - `random.org` ≠ `rainn.org` (distance 4)
   - `bit.ly` exact match only (length 6)
   - `nami.org` exact match only (length 8, but base is 4)

### Performance Considerations

- Levenshtein is O(mn) but with early exit at maxDistance
- Only runs when exact match fails
- Cache fuzzy results for session? (optional optimization)
- Target: <10ms total including fuzzy match

### Privacy Requirements

- Improvement queue logs ONLY: matched_domain, candidate_domain, distance, timestamp
- NO family identifiers, NO child identifiers, NO IP, NO user agent
- Queue stored locally in extension storage
- Queue cleared on extension uninstall

### Project Structure Notes

- Modify: `apps/extension/src/crisis-allowlist.ts`
- Add tests: `apps/extension/src/crisis-allowlist.test.ts`
- Follow existing patterns from Story 11.1/11.4

### Previous Story Learnings

From Story 7.1 and 11.x:

- Use Zod for any new data schemas
- Existing tests in crisis-allowlist.test.ts are comprehensive
- Performance testing via `performance.now()` already established
- `DEFAULT_CRISIS_DOMAINS` is the source of truth (40 domains)
- Cache initialization pattern with `resetCache()` for testing

### References

- [Source: docs/epics/epic-list.md - Story 7.5]
- [Source: apps/extension/src/crisis-allowlist.ts - Existing implementation]
- [Source: apps/extension/src/crisis-allowlist.test.ts - Existing tests]
- [Source: Story 11.4 - Fuzzy URL Matching (different - handles subpaths/params)]
- [Depends: Story 7.1 (Crisis Allowlist Data Structure)]
- [Depends: Story 11.1 (Pre-Capture Allowlist Check)]

## Dev Agent Record

### Context Reference

Ultimate context engine analysis completed - comprehensive developer guide created.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Implemented Levenshtein distance algorithm with Wagner-Fischer O(mn) complexity
- Added early exit optimization when distance exceeds threshold
- Created `findFuzzyMatch()` function for typo detection
- Created `extractBaseDomain()` for subdomain stripping
- Set MIN_DOMAIN_LENGTH_FOR_FUZZY to 10 chars to prevent false positives on short domains
- Fuzzy matching only triggers after exact match fails (no regression)
- Improvement queue logs only: candidateDomain, matchedDomain, distance, timestamp (NO user identifiers)
- Queue limited to 100 entries with FIFO eviction
- 38 new tests added for Story 7.5 functionality (total 295 tests pass)
- Build successful

### File List

- `apps/extension/src/crisis-allowlist.ts` - MODIFIED: Added levenshteinDistance(), extractBaseDomain(), findFuzzyMatch(), logFuzzyMatch() functions
- `apps/extension/src/crisis-allowlist.test.ts` - MODIFIED: Added 38 new tests for Story 7.5

## Senior Developer Review (AI)

**Review Date:** 2025-12-30
**Outcome:** Approve (after fixes)
**Action Items:** 4 issues found and fixed

### Action Items

- [x] [AI-Review][CRITICAL] DoS vulnerability in Levenshtein - Add MAX_DOMAIN_LENGTH_FOR_FUZZY (256) bounds check - FIXED
- [x] [AI-Review][HIGH] Performance regression - Add first-character filtering optimization - FIXED
- [x] [AI-Review][MEDIUM] Missing input validation in extractBaseDomain - Add null/empty/malformed handling - FIXED
- [x] [AI-Review][MEDIUM] DoS via long domains in findFuzzyMatch - Add length check before processing - FIXED

## Change Log

| Date       | Change                                              |
| ---------- | --------------------------------------------------- |
| 2025-12-30 | Story created                                       |
| 2025-12-30 | Implementation complete (286 tests pass)            |
| 2025-12-30 | Code review: security fixes (DoS, perf, validation) |
| 2025-12-30 | All 295 tests pass after security fixes             |
