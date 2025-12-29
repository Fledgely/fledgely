# Story 11.4: Fuzzy URL Matching

Status: Done

## Story

As **the crisis protection system**,
I want **to use fuzzy URL matching for crisis sites**,
So that **subpages, query params, and redirects are all protected**.

## Acceptance Criteria

1. **AC1: Subpath Matching**
   - Given crisis allowlist contains a domain
   - When checking URL with subpaths
   - Then matching includes all subpaths of protected domains

2. **AC2: Query Parameter Handling**
   - Given URL has query parameters
   - When checking against allowlist
   - Then matching ignores query parameters and fragments

3. **AC3: WWW Variations**
   - Given URL with www prefix
   - When checking against allowlist
   - Then matching handles www/non-www variations

4. **AC4: Protocol Variations**
   - Given URL with http or https
   - When checking against allowlist
   - Then matching handles http/https variations

5. **AC5: URL Shorteners**
   - Given URL from common shortener
   - When shortener redirects to crisis site
   - Then matching handles common URL shorteners that redirect to crisis sites

6. **AC6: Case Insensitive**
   - Given URL with mixed case
   - When checking against allowlist
   - Then matching is case-insensitive for domains

7. **AC7: Prefer Over-Blocking**
   - Given matching is performed
   - When edge cases occur
   - Then false positives (over-blocking) preferred to false negatives (under-blocking)

## Tasks / Subtasks

- [x] Task 1: Domain Matching (AC: #1, #3, #6) - Done in 11.1
  - [x] 1.1 Extract domain from URL (done in 11.1)
  - [x] 1.2 Normalize www/non-www (done in 11.1)
  - [x] 1.3 Case-insensitive comparison (done in 11.1)

- [x] Task 2: Query/Fragment Handling (AC: #2)
  - [x] 2.1 URL parsing strips query params (done in 11.1)
  - [x] 2.2 URL parsing strips fragments (done in 11.1)

- [x] Task 3: Protocol Handling (AC: #4)
  - [x] 3.1 URL parsing normalizes protocol (done in 11.1)

- [x] Task 4: URL Shortener Support (AC: #5, #7)
  - [x] 4.1 Add common URL shorteners to allowlist
  - [x] 4.2 Document that over-blocking is acceptable

## Dev Notes

### Implementation Strategy

Most of Story 11.4's requirements were already implemented in Story 11.1's extractDomain function:

- Domain extraction ignores query params and fragments (URL.hostname only)
- WWW normalization strips www. prefix
- Case-insensitive via toLowerCase()
- Protocol is ignored (URL.hostname doesn't include protocol)

The remaining work is adding URL shorteners to the allowlist as a safety measure.
Note: We can't detect redirects in real-time (would require network calls), so we
add shorteners to the allowlist to over-block rather than under-protect.

### Key Requirements

- **INV-001:** Zero data path - never under-block
- **FR64:** No capture of crisis sites
- **NFR28:** Crisis protection reliability

### Technical Details

Matching behavior (already in extractDomain):

```typescript
// URL: https://www.rainn.org/some/path?query=value#anchor
// hostname: www.rainn.org
// after normalization: rainn.org (lowercase, no www)
// subpaths, query, fragment: ignored (hostname only)
```

URL shorteners to add (over-blocking approach):

```typescript
const URL_SHORTENERS = [
  'bit.ly',
  't.co', // Twitter
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'tiny.cc',
]
```

Note: Adding URL shorteners means ALL links from these services are "protected",
which is acceptable over-blocking per AC7.

### References

- [Source: docs/epics/epic-list.md - Story 11.4]
- [Story 11.1: Pre-Capture Allowlist Check]

## Dev Agent Record

### Context Reference

Story 11.3 completed - protected site visual indicator in place

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **Domain Extraction** - extractDomain() from Story 11.1 handles all matching
2. **Query/Fragment Handling** - URL.hostname ignores query params and fragments
3. **WWW Normalization** - Strips www. prefix for matching
4. **Case Insensitive** - toLowerCase() for all domain comparisons
5. **Protocol Agnostic** - URL.hostname doesn't include protocol
6. **URL Shorteners Added** - 10 common shorteners added to DEFAULT_CRISIS_SITES:
   - bit.ly, t.co, tinyurl.com, goo.gl, ow.ly
   - is.gd, buff.ly, tiny.cc, rb.gy, cutt.ly
7. **Over-Blocking Documented** - Comments note that blocking all shortener links is acceptable per AC7

### File List

- `apps/extension/src/crisis-allowlist.ts` - Added URL shorteners to DEFAULT_CRISIS_SITES

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ Subpath matching via domain-only comparison
2. ✅ Query params and fragments ignored (URL.hostname)
3. ✅ WWW normalization (strips www. prefix)
4. ✅ Protocol variations handled (hostname doesn't include protocol)
5. ✅ 10 URL shorteners added to allowlist
6. ✅ Over-blocking documented and accepted per AC7
7. ✅ Case-insensitive domain matching

**Verdict:** APPROVED - Fuzzy URL matching with over-blocking preference implemented.
