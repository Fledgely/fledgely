# Crisis Allowlist Test Matrix

Story 7.9: Cross-Platform Allowlist Testing

## Overview

This document describes the comprehensive test suite for crisis allowlist functionality. These tests ensure crisis protection works correctly across all platforms before deployment.

**CRITICAL**: Deployment is BLOCKED if any allowlist test fails.

## Test Categories

### 1. Presence Tests (Critical)

| Test | Description | AC |
|------|-------------|-----|
| Allowlist is non-empty | Verifies bundled allowlist has entries | 1 |
| Minimum entry count | At least 10 crisis resources | 1 |
| Valid version string | Semantic versioning format | 1 |
| All required fields | domain, category, region, name, description | 1 |
| Contact methods present | Each entry has at least one contact method | 1 |
| Critical URLs present | 988, RAINN, Trevor Project, etc. | 1 |

### 2. Zero-Data-Path Tests (Critical)

| Test | Description | AC |
|------|-------------|-----|
| Crisis URL detection | Known URLs trigger detection | 2 |
| No false positives | Common domains not detected | 2 |
| CaptureSuppressResult type | Only `suppress` field, no reason | 2 |
| CaptureDecision type | Only `shouldCapture` field, no reason | 2 |
| GapEntry type | No reason field for timeline display | 2 |
| No logging during detection | console.log not called | 2 |
| Identical suppression result | Crisis and privacy gaps indistinguishable | 2 |

### 3. Fuzzy Matching Tests

| Test | Description | AC |
|------|-------------|-----|
| Typosquatting detection | 988lifecline.org → 988lifeline.org | 3 |
| Subdomain handling | chat.988lifeline.org detected | 3 |
| Blocklist enforcement | google.com not fuzzy matched | 3 |
| Levenshtein distance | Max distance of 2 enforced | 3 |
| Length ratio | Min ratio of 0.7 enforced | 3 |
| Fuzzy toggle | Can be enabled/disabled | 3 |
| TLD matching | Exact TLD match required | 3 |

### 4. Fallback Chain Tests

| Test | Description | AC |
|------|-------------|-----|
| Network → Cache fallback | Cache used on network failure | 4 |
| Cache → Bundled fallback | Bundled used when no cache | 4 |
| Never empty guarantee | Always returns valid allowlist | 4 |
| Timeout handling | Fallback on timeout, not hang | 4 |
| Offline detection | Crisis URLs work offline | 4 |
| Emergency version re-sync | Emergency triggers immediate fetch | 4 |

### 5. E2E Integration Tests

| Test | Description | AC |
|------|-------------|-----|
| Full pipeline | sync → cache → detect → suppress | 1-7 |
| Privacy gap integration | Gap schedule + detection works | 5 |
| Cross-platform consistency | All platforms same behavior | 1 |
| Report generation | JSON and Markdown reports | 7 |
| Deployment gate | Blocks on critical failure | 6 |

## Platform Coverage

| Platform | Adapter | Status | Epic |
|----------|---------|--------|------|
| Web | `createWebTestAdapter` | ✅ Implemented | - |
| Chrome Extension | `createChromeTestAdapter` | 🔶 Mock | Epic 11 |
| Android | `createAndroidTestAdapter` | 🔶 Mock | Epic 15 |
| iOS | `createiOSTestAdapter` | 🔶 Mock | Epic 43 |

## Running Tests

### All Allowlist Tests
```bash
npm run test:allowlist
```

### By Category
```bash
npm run test:allowlist:presence
npm run test:allowlist:zero-data-path
npm run test:allowlist:fuzzy
npm run test:allowlist:fallback
npm run test:allowlist:e2e
```

### Generate Report
```bash
npm run test:allowlist:report
```

## CI/CD Integration

### GitHub Actions Workflow

Located at `.github/workflows/allowlist-tests.yml`:

1. **Triggers**: Push to main/develop, PRs, daily schedule
2. **Tests**: All categories run sequentially
3. **Artifacts**: JSON and Markdown reports uploaded
4. **PR Comments**: Automatic test summary comment
5. **Deployment Gate**: Blocks deployment on failure

### Deployment Blocking Criteria

Deployment is blocked if:
- Any critical test fails (presence or zero-data-path)
- Overall pass rate < 95%
- Test report not generated

### Test Result Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| `allowlist-tests.json` | JSON | CI/CD automation |
| `allowlist-tests.md` | Markdown | PR comments, review |

## Test Failure Runbook

### 1. Presence Test Failures

**Symptoms**: "Allowlist is empty" or "Critical URL missing"

**Actions**:
1. Check `packages/shared/src/constants/crisis-urls/allowlist.json`
2. Verify build process includes allowlist data
3. Run `npm run generate:allowlist` if needed
4. Check for schema validation errors

### 2. Zero-Data-Path Test Failures

**Symptoms**: "Reason field exposed" or "Crisis URL not suppressed"

**Actions**:
1. Check type definitions have no `reason` fields
2. Review recent changes to CaptureSuppressResult/CaptureDecision
3. Verify no logging in crisis detection functions
4. Run integration tests locally with verbose output

### 3. Fuzzy Matching Test Failures

**Symptoms**: "Typo not detected" or "False positive triggered"

**Actions**:
1. Check Levenshtein distance constants
2. Review blocklist for missing domains
3. Verify length ratio constraints
4. Test specific cases in isolation

### 4. Fallback Chain Test Failures

**Symptoms**: "Empty allowlist returned" or "Timeout not handled"

**Actions**:
1. Verify bundled allowlist is included in build
2. Check sync service fallback logic
3. Test with network disabled
4. Review timeout configuration

### 5. E2E Integration Failures

**Symptoms**: Complex failures across multiple components

**Actions**:
1. Run individual test categories first
2. Check Firebase emulator configuration
3. Review recent changes to shared package
4. Check for race conditions in async code

## Adding New Tests

### Test File Locations

```
packages/shared/src/testing/
├── __tests__/
│   ├── allowlistPresence.test.ts      # Presence tests
│   ├── zeroDataPath.test.ts           # Zero-data-path tests
│   ├── fuzzyMatching.test.ts          # Fuzzy matching tests
│   ├── fallbackChain.test.ts          # Fallback tests
│   └── allowlistE2E.integration.test.ts  # E2E tests
├── adapters/
│   ├── webTestAdapter.ts              # Web platform
│   ├── chromeTestAdapter.ts           # Chrome extension
│   ├── androidTestAdapter.ts          # Android
│   └── iosTestAdapter.ts              # iOS
└── allowlistTestHarness.ts            # Test harness
```

### Adding a New Crisis URL Test

```typescript
// In allowlistPresence.test.ts
it('detects new crisis resource', () => {
  const result = isCrisisUrl('https://new-crisis-resource.org')
  expect(result).toBe(true)
})
```

### Adding a New Platform Adapter

```typescript
// 1. Create adapter file
// packages/shared/src/testing/adapters/newPlatformTestAdapter.ts
export function createNewPlatformTestAdapter(): AllowlistTestHarnessConfig {
  return {
    platform: 'new-platform',
    getAllowlist: getCrisisAllowlist,
    isCrisisUrl,
    isCrisisUrlFuzzy,
    // Platform-specific implementations...
  }
}

// 2. Export from index
// packages/shared/src/testing/index.ts
export { createNewPlatformTestAdapter } from './adapters/newPlatformTestAdapter'
```

## Maintenance

### Regular Tasks

1. **Daily**: Check CI for scheduled test failures
2. **Weekly**: Review test coverage metrics
3. **Monthly**: Update critical URL list if needed
4. **Per Release**: Run full test suite locally

### Updating Critical URLs

When adding a new critical crisis URL:

1. Add to `CRITICAL_CRISIS_URLS` in `allowlistTestHarness.ts`
2. Ensure URL exists in `allowlist.json`
3. Add specific test if needed
4. Run full test suite

### Schema Changes

When updating allowlist schema:

1. Update Zod schemas in `@fledgely/contracts`
2. Update test data in test files
3. Run presence tests to verify
4. Update documentation

## References

- [Story 7.9 Definition](../sprint-artifacts/stories/7-9-cross-platform-allowlist-testing.md)
- [Zero-Data-Path Requirements](../sprint-artifacts/stories/7-2-crisis-visit-zero-data-path.md)
- [Fuzzy Matching Implementation](../sprint-artifacts/stories/7-5-fuzzy-domain-matching.md)
- [Sync Service](../sprint-artifacts/stories/7-7-allowlist-distribution-sync.md)
