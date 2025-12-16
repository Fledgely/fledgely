# Story 7.9: Cross-Platform Allowlist Testing

Status: done

## Story

As **the development team**,
I want **automated integration tests verifying allowlist behavior on all platforms**,
So that **no platform ships with broken crisis protection**.

## Acceptance Criteria

1. **Given** any platform agent is being deployed **When** CI/CD pipeline runs **Then** integration tests verify allowlist is present and parseable
2. **Given** CI/CD pipeline runs **When** tests execute **Then** tests verify known crisis URLs trigger zero-data-path
3. **Given** CI/CD pipeline runs **When** tests execute **Then** tests verify fuzzy matching works correctly
4. **Given** CI/CD pipeline runs **When** network failure is simulated **Then** tests verify fallback to bundled allowlist works
5. **Given** tests run **When** test infrastructure initializes **Then** tests run against Firebase Emulators (not production)
6. **Given** any allowlist test fails **When** deployment is attempted **Then** deployment is BLOCKED
7. **Given** tests complete **When** deployment artifacts are created **Then** test results are included in deployment artifacts

## Tasks / Subtasks

- [ ] Task 1: Create Cross-Platform Test Harness (AC: 1, 5)
  - [ ] 1.1: Create `packages/shared/src/testing/allowlistTestHarness.ts`
  - [ ] 1.2: Define `AllowlistTestHarness` interface with platform-agnostic test methods
  - [ ] 1.3: Implement `createTestHarness(platform: Platform): AllowlistTestHarness`
  - [ ] 1.4: Add test utilities for asserting allowlist presence and validity
  - [ ] 1.5: Export from `@fledgely/shared/testing`
  - [ ] 1.6: Write unit tests for test harness

- [ ] Task 2: Create Allowlist Presence & Parse Tests (AC: 1)
  - [ ] 2.1: Create `packages/shared/src/testing/__tests__/allowlistPresence.test.ts`
  - [ ] 2.2: Test bundled allowlist is non-empty
  - [ ] 2.3: Test allowlist entries parse against schema
  - [ ] 2.4: Test all required fields are present (domain, category, region)
  - [ ] 2.5: Test version string is valid semantic version
  - [ ] 2.6: Test generated JSON matches TypeScript data

- [ ] Task 3: Create Zero-Data-Path Verification Tests (AC: 2)
  - [ ] 3.1: Create `packages/shared/src/testing/__tests__/zeroDataPath.test.ts`
  - [ ] 3.2: Test known crisis URLs (988lifeline.org, rainn.org, etc.) trigger suppression
  - [ ] 3.3: Test suppression result contains ONLY boolean - no reason field
  - [ ] 3.4: Test no logging occurs during crisis URL detection (mock logger)
  - [ ] 3.5: Test crisis search queries trigger detection
  - [ ] 3.6: Test privacy gaps don't expose gap type
  - [ ] 3.7: Verify CaptureDecision has no reason field
  - [ ] 3.8: Verify GapEntry has no reason field

- [ ] Task 4: Create Fuzzy Matching Verification Tests (AC: 3)
  - [ ] 4.1: Create `packages/shared/src/testing/__tests__/fuzzyMatching.test.ts`
  - [ ] 4.2: Test typosquatting detection (988lifecline.org → 988lifeline.org)
  - [ ] 4.3: Test subdomain variations (help.988lifeline.org)
  - [ ] 4.4: Test path variations (/crisis-help)
  - [ ] 4.5: Test Levenshtein distance threshold enforcement
  - [ ] 4.6: Test length ratio validation
  - [ ] 4.7: Test blocklist prevents false positives (google.com, facebook.com)

- [ ] Task 5: Create Fallback Chain Tests (AC: 4)
  - [ ] 5.1: Create `packages/shared/src/testing/__tests__/fallbackChain.test.ts`
  - [ ] 5.2: Test network failure triggers cache fallback
  - [ ] 5.3: Test cache miss triggers bundled fallback
  - [ ] 5.4: Test bundled allowlist is always available
  - [ ] 5.5: Test never returns empty allowlist (critical safety)
  - [ ] 5.6: Test timeout triggers fallback (not hang)

- [ ] Task 6: Create Platform-Specific Test Adapters (AC: 1)
  - [ ] 6.1: Create `packages/shared/src/testing/adapters/webTestAdapter.ts`
  - [ ] 6.2: Create `packages/shared/src/testing/adapters/chromeTestAdapter.ts` (mock for Epic 11)
  - [ ] 6.3: Create `packages/shared/src/testing/adapters/androidTestAdapter.ts` (mock for Epic 15)
  - [ ] 6.4: Create `packages/shared/src/testing/adapters/iosTestAdapter.ts` (mock for Epic 43)
  - [ ] 6.5: Document adapter usage for native platform test suites
  - [ ] 6.6: Write adapter tests

- [ ] Task 7: Create CI Pipeline Integration (AC: 5, 6, 7)
  - [ ] 7.1: Create `.github/workflows/allowlist-tests.yml` workflow
  - [ ] 7.2: Configure Firebase Emulator setup in CI
  - [ ] 7.3: Add allowlist test job that blocks deployment on failure
  - [ ] 7.4: Add test result artifact upload
  - [ ] 7.5: Add coverage reporting for allowlist code
  - [ ] 7.6: Create deployment gate that checks allowlist test status

- [ ] Task 8: Create Test Result Reporting (AC: 7)
  - [ ] 8.1: Create `packages/shared/src/testing/testReporter.ts`
  - [ ] 8.2: Implement `generateTestReport(results: TestResults): TestReport`
  - [ ] 8.3: Include test counts, pass/fail status, coverage metrics
  - [ ] 8.4: Generate JSON report for artifact inclusion
  - [ ] 8.5: Generate Markdown summary for PR comments
  - [ ] 8.6: Write reporter tests

- [ ] Task 9: Create End-to-End Integration Tests (AC: 1-7)
  - [ ] 9.1: Create `packages/shared/src/testing/__tests__/allowlistE2E.integration.test.ts`
  - [ ] 9.2: Test full flow: sync → cache → detect → suppress
  - [ ] 9.3: Test emergency version triggers immediate re-sync
  - [ ] 9.4: Test 48h stale detection alerts work
  - [ ] 9.5: Test sync status reporting endpoint
  - [ ] 9.6: Verify all platforms use consistent allowlist data

- [ ] Task 10: Documentation & Test Matrix (AC: 1-7)
  - [ ] 10.1: Create `docs/testing/allowlist-test-matrix.md`
  - [ ] 10.2: Document all test categories and their coverage
  - [ ] 10.3: Document platform-specific test requirements
  - [ ] 10.4: Document CI/CD integration steps
  - [ ] 10.5: Add runbook for test failures
  - [ ] 10.6: Document test maintenance procedures

## Dev Notes

### Epic 7 Context: Crisis Allowlist Foundation

This story implements **CROSS-PLATFORM ALLOWLIST TESTING** to ensure crisis protection is verified on all platforms before deployment. This is the final story in Epic 7 and serves as a quality gate for all future platform implementations.

**Critical Requirement:**
Deployment MUST be blocked if any allowlist test fails. This ensures no platform ever ships with broken crisis protection.

### Previous Story Foundation (Stories 7.1-7.8)

Built upon existing infrastructure:
- `@fledgely/shared` package with crisis URL data
- Crisis protection guard (Story 7.2)
- Fuzzy domain matching (Story 7.5)
- Allowlist sync service (Story 7.7)
- Privacy gaps injection (Story 7.8)
- Zero-data-path infrastructure throughout

### Key Design Decisions

**1. Test Harness Architecture:**
```typescript
interface AllowlistTestHarness {
  // Presence tests
  verifyAllowlistPresent(): Promise<TestResult>
  verifyAllowlistParseable(): Promise<TestResult>

  // Zero-data-path tests
  verifyZeroDataPath(crisisUrl: string): Promise<TestResult>
  verifyNoLogging(): Promise<TestResult>

  // Fuzzy matching tests
  verifyFuzzyMatch(typo: string, expected: string): Promise<TestResult>
  verifyBlocklistPrevention(domain: string): Promise<TestResult>

  // Fallback tests
  verifyNetworkFallback(): Promise<TestResult>
  verifyBundledFallback(): Promise<TestResult>
  verifyNeverEmpty(): Promise<TestResult>
}
```

**2. Test Categories:**
| Category | Purpose | Critical? |
|----------|---------|-----------|
| Presence | Allowlist exists and parses | YES |
| Zero-Data-Path | No logging of crisis URLs | YES |
| Fuzzy Matching | Typosquatting protection | YES |
| Fallback Chain | Network failure handling | YES |
| Platform Adapters | Platform-specific behavior | Per Platform |

**3. CI Pipeline Gates:**
```yaml
# .github/workflows/allowlist-tests.yml
jobs:
  allowlist-tests:
    runs-on: ubuntu-latest
    services:
      firebase-emulator:
        image: firebase/emulator
    steps:
      - uses: actions/checkout@v4
      - name: Run Allowlist Tests
        run: npm run test:allowlist
      - name: Upload Test Results
        uses: actions/upload-artifact@v4
        with:
          name: allowlist-test-results
          path: reports/allowlist-tests.json
      - name: Block on Failure
        if: failure()
        run: |
          echo "::error::Allowlist tests failed - deployment blocked"
          exit 1
```

### Zero-Data-Path Test Strategy

Per INV-001 and Story 7.2 requirements, tests must verify:

1. **Type-Level Safety:**
   - `CaptureSuppressResult` has no `reason` field
   - `CaptureDecision` has no `reason` field
   - `GapEntry` has no `reason` field

2. **Runtime Safety:**
   - Mock logger captures zero calls during crisis URL detection
   - No console output during suppression
   - No telemetry events fired

3. **Integration Safety:**
   - Full flow from URL → detection → suppression has no leakage
   - Timeline display shows identical gaps (no type indicator)

### Fuzzy Matching Test Cases

From Story 7.5, test these scenarios:
```typescript
const FUZZY_TEST_CASES = [
  // Typosquatting (should match)
  { input: '988lifecline.org', expected: '988lifeline.org' },
  { input: 'rain.org', expected: 'rainn.org' },
  { input: 'suicidepreventionlifline.org', expected: 'suicidepreventionlifeline.org' },

  // Subdomains (should match)
  { input: 'help.988lifeline.org', expected: '988lifeline.org' },
  { input: 'chat.rainn.org', expected: 'rainn.org' },

  // Blocklist (should NOT match)
  { input: 'google.com', expected: null },
  { input: 'facebook.com', expected: null },
  { input: 'amazon.com', expected: null },
]
```

### Platform Test Matrix

| Platform | Adapter | Test Location | Status |
|----------|---------|---------------|--------|
| Web | webTestAdapter | packages/shared | Implement Now |
| Chrome Extension | chromeTestAdapter | packages/shared | Mock (Epic 11) |
| Android | androidTestAdapter | packages/shared | Mock (Epic 15) |
| iOS | iosTestAdapter | packages/shared | Mock (Epic 43) |

### Architecture Compliance

Per `project_context.md`:
- **Rule 1:** Types from Zod - test harness types derive from schemas
- **Rule 2:** Firebase SDK direct - use emulators for testing
- **Rule 3:** Crisis allowlist check FIRST - verify this in tests
- **Rule 5:** Functions delegate to services - test services directly

### File Structure

```
packages/shared/src/testing/
├── allowlistTestHarness.ts           # Test harness interface & factory
├── testReporter.ts                   # Test result reporting
├── adapters/
│   ├── webTestAdapter.ts             # Web platform test adapter
│   ├── chromeTestAdapter.ts          # Chrome extension mock adapter
│   ├── androidTestAdapter.ts         # Android mock adapter
│   └── iosTestAdapter.ts             # iOS mock adapter
├── __tests__/
│   ├── allowlistPresence.test.ts     # Presence & parse tests
│   ├── zeroDataPath.test.ts          # Zero-data-path tests
│   ├── fuzzyMatching.test.ts         # Fuzzy matching tests
│   ├── fallbackChain.test.ts         # Fallback chain tests
│   └── allowlistE2E.integration.test.ts  # End-to-end tests
└── index.ts                          # Testing exports

.github/workflows/
└── allowlist-tests.yml               # CI pipeline workflow

docs/testing/
└── allowlist-test-matrix.md          # Test documentation
```

### Testing Standards

Per `project_context.md`:
- Unit tests: `*.test.ts` (co-located)
- Integration tests: `*.integration.test.ts`
- Test with Firebase emulators
- NEVER mock security rules

**Critical Tests:**
1. Allowlist present and non-empty on all platforms
2. Zero-data-path verified (no reason exposure)
3. Fuzzy matching catches typosquatting
4. Fallback chain never returns empty
5. CI blocks deployment on any failure

### Git Commit Pattern

```
feat(story-7.9): Cross-Platform Allowlist Testing - ensure crisis protection on all platforms
```

### Dependencies

- **Requires:** Story 7.1 (Crisis Allowlist Data Structure) - DONE
- **Requires:** Story 7.2 (Crisis Visit Zero-Data-Path) - DONE
- **Requires:** Story 7.5 (Fuzzy Domain Matching) - DONE
- **Requires:** Story 7.7 (Allowlist Distribution & Sync) - DONE
- **Requires:** Story 7.8 (Privacy Gaps Injection) - DONE
- **Enables:** Epic 11 (Chromebook Extension) - uses test adapters
- **Enables:** Epic 15 (Android Agent) - uses test adapters
- **Enables:** Epic 43 (iOS Integration) - uses test adapters

### References

- [Source: docs/epics/epic-list.md#Story-7.9] - Original acceptance criteria
- [Source: docs/project_context.md] - Types from Zod, Firebase direct rules
- [Source: docs/sprint-artifacts/stories/7-2-crisis-visit-zero-data-path.md] - Zero-data-path requirements
- [Source: docs/sprint-artifacts/stories/7-5-fuzzy-domain-matching.md] - Fuzzy matching requirements
- [Source: docs/sprint-artifacts/stories/7-7-allowlist-distribution-sync.md] - Sync service requirements
- [Source: docs/sprint-artifacts/stories/7-8-privacy-gaps-injection.md] - Privacy gaps requirements

## Dev Agent Record

### Context Reference

Story 7.9 - Cross-Platform Allowlist Testing

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

(To be filled during implementation)

### Completion Notes List

(To be filled during implementation)

### File List

(To be filled during implementation)
