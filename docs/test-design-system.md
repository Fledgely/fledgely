# System-Level Test Design - fledgely

**Generated:** 2025-12-15
**Mode:** System-Level (Solutioning Phase)
**Author:** TEA (Test Expert Agent)

---

## 1. Testability Architecture Review

### 1.1 Controllability Assessment

**Overall Rating:** ⚠️ MEDIUM - Requires attention

| Component | Controllability | Evidence | Risk |
|-----------|-----------------|----------|------|
| **Firebase Auth** | HIGH | Google Sign-In delegation; Firebase emulators available for testing | LOW |
| **Firestore** | HIGH | Security rules testable via Firebase emulators; clear data isolation per family | LOW |
| **Cloud Functions** | HIGH | Emulators available; event-driven architecture testable | LOW |
| **AI Classification (Gemini)** | MEDIUM | Cloud dependency; mock responses needed; on-device fallback path | MEDIUM |
| **Screenshot Capture** | LOW | Platform-specific APIs; MediaProjection (Android), captureVisibleTab (Chrome); hard to simulate | HIGH |
| **Crisis Allowlist** | HIGH | GitHub-hosted YAML; mockable; local cache testable | LOW |
| **Device Enrollment** | MEDIUM | QR code flow; multi-device coordination testing complex | MEDIUM |
| **E2EE (Deferred M18)** | N/A | Not in current scope | N/A |

**Controllability Concerns:**

1. **Screenshot Capture APIs:** Platform-specific, requires device/emulator testing; cannot be unit tested meaningfully
2. **AI Classification Accuracy:** Depends on Gemini model behavior; must test with representative corpus and mock responses
3. **Cross-Platform Time Sync:** Device clocks may drift; affects TOTP and time tracking accuracy
4. **Third-Party Integrations:** Nintendo Switch API, Home Assistant integration have external dependencies

### 1.2 Observability Assessment

**Overall Rating:** ✅ GOOD - Well-designed for observability

| Component | Observability | Evidence | Risk |
|-----------|---------------|----------|------|
| **Firebase Analytics** | HIGH | Privacy-safe event design planned; structured logging | LOW |
| **Crashlytics** | HIGH | Platform-specific integration; stack traces available | LOW |
| **Cloud Function Logs** | HIGH | Structured JSON logs; correlation IDs | LOW |
| **Audit Trail** | HIGH | FR32, FR53, FR77 - who viewed what when, visible to family | LOW |
| **AI Classification Confidence** | HIGH | FR41 - confidence scores with each classification | LOW |
| **Health Check Endpoint** | HIGH | NFR documentation mentions /api/health | LOW |
| **Data Freshness Indicators** | HIGH | FR54 - dashboard displays data freshness | LOW |

**Observability Concerns:**

1. **Client-Side Monitoring:** Need to validate Sentry/error tracking integration works E2E
2. **Screenshot Capture Success Rate:** Must track capture failures separately from upload failures
3. **AI False Positive Rate:** Requires tracking mechanism for family feedback loop effectiveness

### 1.3 Reliability Assessment

**Overall Rating:** ⚠️ MEDIUM - Good design, testing complexity

| Component | Reliability | Evidence | Risk |
|-----------|-------------|----------|------|
| **Offline Operation** | HIGH | 72-hour minimum; TOTP works offline; cached rules | LOW |
| **Graceful Degradation** | HIGH | On-device AI sufficient alone; DRM content logs metadata only | LOW |
| **Error Recovery** | MEDIUM | Retry logic (NFR27); circuit breaker patterns needed | MEDIUM |
| **Data Integrity** | HIGH | Conflict resolution (last-write-wins with audit); Firestore transactions | LOW |
| **Permission Revocation** | HIGH | FR16 - parent alert on monitoring status change | LOW |

**Reliability Concerns:**

1. **Extension ↔ Android App Heartbeat:** Cross-component failure detection (M1.9 spike needed)
2. **Clock Drift Handling:** TOTP grace window + NTP sync must be tested
3. **Firebase Service Outages:** 24-hour cached token window; queue management

---

## 2. Architecturally Significant Requirements (ASRs)

### 2.1 Utility Tree - Quality Attribute Scenarios

| ID | Quality Attribute | Stimulus | Response | Business Value | Risk |
|----|-------------------|----------|----------|----------------|------|
| **ASR-1** | Security | Unauthenticated user attempts to access family data | Redirect to login; no data exposed | HIGH | HIGH |
| **ASR-2** | Security | Crisis resource access | Zero logging; invisible to parents; child sees 🔒 indicator | CRITICAL | HIGH |
| **ASR-3** | Privacy | Screenshot of crisis allowlisted site | Capture NEVER occurs; URL checked BEFORE capture | CRITICAL | HIGH |
| **ASR-4** | Performance | AI classification request | Completes within 30 seconds of upload | HIGH | MEDIUM |
| **ASR-5** | Performance | Dashboard page load | Loads within 2 seconds on standard broadband | HIGH | LOW |
| **ASR-6** | Reliability | Device offline for 72 hours | Monitoring continues; rules cached; sync on reconnect | HIGH | MEDIUM |
| **ASR-7** | Reliability | AI service unavailable | On-device classification continues; alerts queued | HIGH | MEDIUM |
| **ASR-8** | Security | Firebase Security Rules | Family data isolated; no cross-family access | CRITICAL | HIGH |
| **ASR-9** | Integrity | Screenshot tampering | Hash verification detects corruption (NFR57) | HIGH | MEDIUM |
| **ASR-10** | Consent | Child refuses family agreement | Device inoperable under fledgely management (FR26) | CRITICAL | LOW |
| **ASR-11** | Compliance | Child turns 18 | All data immediately deleted (FR72) | HIGH | MEDIUM |
| **ASR-12** | Safety | Domestic abuse/crisis | Professional resources first; system NEVER auto-notifies parents | CRITICAL | HIGH |

### 2.2 ASR Risk Prioritization

| Priority | ASR ID | Description | Test Approach |
|----------|--------|-------------|---------------|
| P0 | ASR-2, ASR-3, ASR-12 | Crisis resource protection | Unit tests for allowlist check; E2E test for zero-logging verification |
| P0 | ASR-8 | Firebase Security Rules | Security rules unit tests every PR; penetration testing |
| P0 | ASR-1 | Authentication/Authorization | E2E auth flow tests; RBAC boundary tests |
| P1 | ASR-6, ASR-7 | Offline/degradation | Integration tests with network mocking; device state simulation |
| P1 | ASR-4, ASR-5 | Performance | k6 load testing for API; Lighthouse for dashboard |
| P2 | ASR-9 | Integrity | Unit tests for hash generation/verification |
| P2 | ASR-10, ASR-11 | Consent/compliance | E2E workflow tests |

---

## 3. Test Levels Strategy

### 3.1 Test Pyramid Recommendation

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲
                 ╱______╲
                ╱        ╲
               ╱ Component╲
              ╱____________╲
             ╱              ╲
            ╱  Integration   ╲
           ╱__________________╲
          ╱                    ╲
         ╱       Unit Tests     ╲
        ╱________________________╲
```

**Target Distribution:**
- **Unit Tests:** 60% - Pure functions, business logic, validators, utilities
- **Integration Tests:** 20% - API contracts, Firebase rules, service interactions
- **Component Tests:** 10% - React/UI components in isolation
- **E2E Tests:** 10% - Critical user journeys, cross-platform workflows

### 3.2 Test Level Assignments by Feature Area

| Feature Area | Unit | Integration | Component | E2E |
|--------------|------|-------------|-----------|-----|
| **AI Classification Logic** | ✅ Category taxonomy, confidence thresholds | ✅ Gemini API mock responses | - | ✅ Flag-to-parent notification flow |
| **Firebase Security Rules** | - | ✅ Rule testing with emulator | - | ✅ Cross-family isolation verification |
| **Agreement Engine** | ✅ Validation logic, conflict detection | ✅ Firestore transactions | ✅ Agreement UI components | ✅ Full agreement creation flow |
| **Crisis Allowlist** | ✅ URL matching, cache management | ✅ GitHub sync | - | ✅ Zero-logging verification |
| **Screenshot Capture** | ✅ Hash generation | ✅ Storage upload | - | ⚠️ Device-specific (manual/device farm) |
| **Time Tracking** | ✅ Aggregate calculation | ✅ Cross-device sync | ✅ Time display components | ✅ Limit enforcement flow |
| **OTP/TOTP** | ✅ Token generation/validation | ✅ Clock sync handling | - | ✅ Offline unlock flow |
| **Notifications (FCM)** | ✅ Alert template generation | ✅ FCM delivery mock | - | ✅ Parent receives alert |
| **Dashboard** | - | ✅ API responses | ✅ Dashboard components | ✅ Parent reviews flagged content |
| **Device Enrollment** | ✅ QR code generation | ✅ Approval flow | - | ✅ Multi-device onboarding |

### 3.3 Framework Recommendations

| Test Level | Framework | Rationale |
|------------|-----------|-----------|
| **Unit** | Vitest | Fast, modern, TypeScript-native, great DX |
| **Integration** | Vitest + Firebase Emulator Suite | Firestore, Auth, Functions emulation |
| **Component** | Playwright Component Testing | `@playwright/experimental-ct-react` for React components |
| **E2E** | Playwright | Multi-browser, network interception, `@seontechnologies/playwright-utils` |
| **Performance** | k6 | Load/stress/spike testing for SLO/SLA validation |
| **Security** | OWASP ZAP, npm audit, Firebase Security Rules testing | Automated security scanning |

---

## 4. NFR Testing Approach

### 4.1 Security NFRs

| NFR | Test Approach | Tool | Priority |
|-----|---------------|------|----------|
| **NFR8-9** | Encryption at rest/transit | Infrastructure verification; TLS certificate checks | P0 |
| **NFR10-11** | Auth delegation | Firebase Auth E2E; session expiry validation | P0 |
| **NFR13** | Security Rules | Firebase emulator tests; every PR | P0 |
| **NFR80** | Agent authenticity | App Check verification tests | P1 |
| **NFR83** | Rate limiting | k6 tests for rate limit enforcement | P1 |
| **NFR84** | Suspicious pattern detection | Integration tests for anomaly alerting | P1 |

**Security Test Scenarios:**

```typescript
// Example: Firebase Security Rules Test
test('family data isolation - cannot access other family', async () => {
  // User A tries to access User B's family data
  const familyBData = await firebase
    .firestore()
    .collection('families')
    .doc('family-b-id')
    .get();

  // Should throw permission denied
  expect(familyBData.exists).toBe(false); // OR throws PermissionDenied
});

// Example: Crisis Allowlist Zero-Logging
test('crisis resource visits are never logged', async () => {
  // Navigate to crisis resource
  await page.goto('https://988lifeline.org');

  // Verify no screenshot captured
  const screenshots = await apiRequest.get('/api/screenshots?after=' + startTime);
  expect(screenshots.length).toBe(0);

  // Verify no URL logged
  const activityLog = await apiRequest.get('/api/activity?after=' + startTime);
  expect(activityLog.urls).not.toContain('988lifeline.org');
});
```

### 4.2 Performance NFRs

| NFR | Metric | Threshold | Tool | Priority |
|-----|--------|-----------|------|----------|
| **NFR1** | Dashboard load time | < 2 seconds | k6, Lighthouse | P1 |
| **NFR2** | Screenshot capture latency | < 500ms | Device instrumentation | P1 |
| **NFR3** | AI classification time | < 30 seconds | k6 API timing | P1 |
| **NFR4** | AI accuracy | > 95% | Corpus-based testing | P1 |
| **NFR5** | Agreement sync time | < 60 seconds | E2E timing | P2 |

**Performance Test Approach:**

```javascript
// k6 performance test for AI classification SLO
export const options = {
  thresholds: {
    'http_req_duration{endpoint:ai_classify}': ['p(95)<30000'], // 30s
    'http_req_duration{endpoint:dashboard}': ['p(95)<2000'], // 2s
  },
};
```

### 4.3 Reliability NFRs

| NFR | Test Approach | Tool | Priority |
|-----|---------------|------|----------|
| **NFR25** | Uptime monitoring | Synthetic monitoring; health check polling | P1 |
| **NFR26** | Screenshot processing delay tolerance | Queue backlog simulation | P1 |
| **NFR27** | Auto-recovery | Chaos engineering; service restart tests | P2 |
| **NFR55-56** | Degraded mode operation | Network disconnection E2E | P1 |

**Reliability Test Scenarios:**

```typescript
// Example: Offline operation test
test('monitoring continues when offline for 72 hours', async ({ page, context }) => {
  // Setup: Install agent, establish baseline
  await setupMonitoredDevice(page);

  // Go offline
  await context.setOffline(true);

  // Simulate 72 hours of operation (accelerated)
  await simulateTimePassage(72 * 60 * 60 * 1000);

  // Verify cached rules still apply
  expect(await checkTimeLimit(page)).toBe('enforced');

  // Reconnect and verify sync
  await context.setOffline(false);
  await waitForSync(page);

  expect(await getQueuedScreenshots()).toBeGreaterThan(0);
});
```

### 4.4 Maintainability NFRs

| NFR | Threshold | Tool | Priority |
|-----|-----------|------|----------|
| **NFR50** | Linting compliance | 0 errors | ESLint in CI | P1 |
| **NFR51** | IaC coverage | 100% Terraform | Manual review | P2 |
| **NFR52** | Log format | JSON structured | Log parsing tests | P2 |
| **Coverage** | > 80% | Vitest coverage | P1 |
| **Duplication** | < 5% | jscpd | P2 |

---

## 5. Testability Concerns & Recommendations

### 5.1 Critical Testability Gaps

| ID | Concern | Impact | Recommendation | Owner |
|----|---------|--------|----------------|-------|
| **TC-1** | Screenshot capture is platform-specific, hard to automate | Cannot fully E2E test capture flow | Use device farms (BrowserStack, Sauce Labs) for mobile; Chrome extension testing via Playwright | Architect |
| **TC-2** | AI classification accuracy depends on Gemini model | Flaky tests if model behavior changes | Mock Gemini responses in tests; maintain test corpus; separate accuracy testing from functional tests | TEA |
| **TC-3** | Cross-device time sync for aggregate tracking | Time drift causes incorrect totals | Test with intentionally drifted clocks; verify NTP sync behavior | Architect |
| **TC-4** | Crisis allowlist effectiveness across platforms | Privacy-critical; cannot have gaps | Comprehensive URL matching tests; platform-specific pre-capture checks | Security |
| **TC-5** | Firebase Security Rules complexity | Rules grow complex; risk of gaps | Dedicated security rules test suite; run on every PR; annual penetration test | Security |
| **TC-6** | Child consent flow enforcement | FR26 - device inoperable without consent | E2E test for consent withdrawal; verify enforcement across all agents | TEA |

### 5.2 Recommended Testability Improvements

| Recommendation | Rationale | Implementation Phase |
|----------------|-----------|---------------------|
| **Add test IDs to all interactive elements** | Stable selectors for E2E tests | M4, M5 |
| **Create Firebase Security Rules test suite** | Critical security boundary | M1.10, M2.5 |
| **Build AI classification test corpus** | Validate accuracy, detect regression | M6 |
| **Implement test data factories** | Consistent, isolated test data | M1-M2 |
| **Add feature flags for test modes** | Enable deterministic testing | M1 |
| **Create mock server for Nintendo/Xbox APIs** | Third-party API isolation | M14 |

### 5.3 Test Environment Requirements

| Environment | Purpose | Data | Infrastructure |
|-------------|---------|------|----------------|
| **Local** | Developer testing | Seeded test data; Firebase emulators | Local machine + emulators |
| **CI** | Automated testing | Fresh test data each run; Firebase emulators | GitHub Actions + Firebase Emulator Suite |
| **Staging** | Integration testing | Synthetic test families; Gemini API (test quota) | GCP project (staging) |
| **Device Farm** | Platform-specific testing | Test accounts | BrowserStack/Sauce Labs |

---

## 6. Risk Assessment Summary

### 6.1 Test Risk Matrix

| Risk | Probability | Impact | Score | Mitigation |
|------|-------------|--------|-------|------------|
| **Crisis allowlist bypass** | 1 | 3 | 3 | Comprehensive URL matching tests; platform-specific verification |
| **Firebase rules gap** | 2 | 3 | 6 | Security rules test suite; penetration testing |
| **AI false positives** | 3 | 2 | 6 | Test corpus; confidence thresholds; feedback loop monitoring |
| **Screenshot capture fails silently** | 2 | 2 | 4 | Capture success rate monitoring; parent alerts |
| **Offline data loss** | 1 | 3 | 3 | Extensive offline testing; sync verification |
| **Cross-platform inconsistency** | 2 | 2 | 4 | Platform parity audit; shared test scenarios |

### 6.2 Gate Criteria Alignment

This test design supports the following gate decisions:

| Gate | Key Test Requirements |
|------|----------------------|
| **Personal Gate (M6)** | Chrome extension captures; AI classification works; parent receives alerts |
| **Early Adopter Gate (M9)** | Fire TV working; Agreement system functional; Multi-child support |
| **Community Gate (M13)** | Self-hosted deployment; iOS approved; Zero security incidents |
| **SaaS Gate (M15)** | Billing system; Support processes |

---

## 7. Next Steps

### 7.1 Immediate Actions (Before Implementation)

1. **Establish Firebase Security Rules test suite** - M1.10 dependency
2. **Define AI classification test corpus** - M6.5 accuracy baseline
3. **Create test data factories** - Foundation for all testing
4. **Set up Firebase Emulator Suite in CI** - Required for integration tests

### 7.2 Test Design Documents Needed

| Document | Trigger | Owner |
|----------|---------|-------|
| **Epic Test Plan** | Before each epic implementation | TEA |
| **Security Test Specification** | M2.5 (Security Rules) | Security + TEA |
| **Performance Test Plan** | M6 (AI Pipeline) | TEA |
| **Acceptance Test Specification** | Per story | TEA |

---

## 8. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| **TEA** | System | 2025-12-15 | ✅ Generated |
| **Architect** | - | - | ⏳ Pending Review |
| **PM** | - | - | ⏳ Pending Review |

---

*Generated by TEA (Test Expert Agent) using BMad Method workflow: testarch-test-design*
