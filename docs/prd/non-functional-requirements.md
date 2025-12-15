# Non-Functional Requirements

## Performance

- **NFR1:** Dashboard pages load within 2 seconds on standard broadband connections
- **NFR2:** Screenshot capture completes within 500ms without visible lag to child
- **NFR3:** AI classification completes within 30 seconds of screenshot upload
- **NFR4:** AI classification accuracy exceeds 95% for clear content categories
- **NFR5:** Agreement state syncs across all family devices within 60 seconds
- **NFR6:** System supports 10 concurrent family members viewing dashboard simultaneously
- **NFR7:** Time tracking updates display within 5 seconds of activity change

---

## Security

- **NFR8:** All data encrypted at rest using Google Cloud default encryption (AES-256)
- **NFR9:** All data encrypted in transit using TLS 1.3
- **NFR10:** Authentication delegated entirely to Google Accounts via Firebase Auth
- **NFR11:** User sessions expire after 30 days of inactivity
- **NFR12:** API endpoints validate all input against defined schemas
- **NFR13:** Firebase Security Rules enforce family-level data isolation
- **NFR14:** Cloud Functions execute with minimum required IAM permissions
- **NFR15:** Service account keys never stored in client applications
- **NFR16:** All third-party dependencies scanned for vulnerabilities in CI/CD pipeline
- **NFR80:** System verifies agent authenticity through signed binaries and Firebase App Check before accepting data from any device
- **NFR81:** Agreement configurations validated server-side; client-side state is display-only and not trusted for enforcement
- **NFR82:** Every screenshot view logged with viewer identity, timestamp, and IP address, visible in family audit log
- **NFR83:** API endpoints enforce rate limits: 100 requests/minute per user, 10 screenshot uploads/minute per device, 1000 requests/hour per family
- **NFR84:** System detects and alerts on suspicious permission patterns: rapid role changes, self-elevation attempts, permission grants during unusual hours
- **NFR85:** All security-relevant settings default to most restrictive option; users must explicitly opt into less secure configurations

---

## Privacy & Compliance

- **NFR17:** System collects only data necessary for stated functionality (data minimization)
- **NFR18:** Users can request complete data deletion within 30 days (GDPR compliance)
- **NFR19:** Screenshot retention configurable from 1-7 days, default 7 days
- **NFR20:** Automated deletion enforced at retention window expiry with no recovery option
- **NFR64:** System obtains parental self-attestation of authority before enabling monitoring of any child account, with attestation recorded and auditable
- **NFR65:** All child-facing content written at 6th-grade reading level or below, verified through readability scoring
- **NFR66:** Data export includes JSON format alongside human-readable formats for GDPR data portability compliance
- **NFR67:** Data collected for safety monitoring not repurposed for analytics, marketing, or other secondary uses without explicit consent
- **NFR68:** Families can disable AI-powered screenshot classification while retaining manual review capability
- **NFR69:** System never sells, shares, or monetizes family data; immutable default with no opt-in mechanism

---

## Scalability

- **NFR21:** Architecture supports 10x user growth without re-architecture
- **NFR22:** Storage scales automatically with family count (Cloud Storage)
- **NFR23:** Database scales automatically with query load (Firestore)
- **NFR24:** Cloud Functions scale to zero when idle, scale up automatically under load

---

## Reliability & Availability

- **NFR25:** Target 99.5% uptime for core services (dashboard, agreements, notifications)
- **NFR26:** Screenshot processing tolerates 4-hour delays without data loss
- **NFR27:** System recovers automatically from transient cloud service failures
- **NFR28:** Crisis allowlist cached locally; functions without cloud connectivity
- **NFR55:** System maintains core safety functions (crisis allowlist, existing agreements) even when cloud services unavailable
- **NFR56:** System recovers from component failures within 15 minutes for non-critical services, 5 minutes for safety-critical (crisis allowlist updates)
- **NFR57:** Screenshots include cryptographic hash verification to detect tampering or corruption
- **NFR58:** Audit logs append-only and tamper-evident for dispute resolution
- **NFR77:** All deployments support automated rollback to previous version within 5 minutes if health checks fail
- **NFR79:** Maximum acceptable data loss: <1 hour for agreement state, <24 hours for screenshots (RPO)

---

## Accessibility

- **NFR42:** All interfaces comply with WCAG 2.1 AA standards
- **NFR43:** Dashboard fully navigable via keyboard alone
- **NFR44:** All images include alt text; screenshots include AI-generated descriptions
- **NFR45:** Color contrast ratios meet 4.5:1 minimum for text
- **NFR46:** Focus indicators visible on all interactive elements
- **NFR47:** Screen reader announcements for all state changes
- **NFR48:** Plain language used throughout; no jargon without explanation
- **NFR49:** Touch targets minimum 44x44 pixels on mobile interfaces

---

## Compatibility

- **NFR29:** Dashboard responsive from 320px to 4K displays
- **NFR30:** Dashboard supports Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **NFR31:** Dashboard functions on mobile browsers (iOS Safari, Chrome Mobile)
- **NFR32:** Progressive enhancement: core functions work without JavaScript for initial load
- **NFR36:** Chromebook agent supports ChromeOS 100+ as Chrome extension
- **NFR37:** Android agent supports Android 10+ (API 29+)
- **NFR38:** Fire TV agent supports Fire OS 7+ (Fire TV Stick 4K and newer)
- **NFR39:** iOS agent supports iOS 15+ with MDM profile
- **NFR40:** Nintendo Switch integration via Nintendo Parental Controls API
- **NFR41:** Windows/macOS agents support Windows 10+ and macOS 12+
- **NFR70:** Chromebook extension consumes <5% CPU during idle monitoring and <50MB memory
- **NFR71:** All Fire TV agent UI fully navigable using D-pad remote with no dead-ends
- **NFR72:** Switch agent integrates with (not bypasses) Nintendo's native parental controls API
- **NFR73:** Android agent uses <2% battery per hour during active monitoring using WorkManager/foreground service best practices
- **NFR74:** iOS agent complies with App Store Review Guidelines section 5.4 (VPN/parental controls) including MDM profile requirements
- **NFR75:** Windows agent supports system tray minimization, startup registration, and silent operation without UAC prompts during normal use
- **NFR76:** macOS agent gracefully handles Screen Recording, Accessibility, and Full Disk Access permissions with clear user guidance when denied

---

## Maintainability

- **NFR50:** Codebase follows consistent style enforced by automated linting
- **NFR51:** Infrastructure defined as code (Terraform) for reproducible deployments
- **NFR52:** All services emit structured logs in JSON format
- **NFR53:** Alerting configured for error rate spikes and service degradation
- **NFR54:** Database backups automated daily with 30-day retention

---

## Operational

- **NFR86:** Self-hosted instance includes configurable monthly cost alert threshold (default $20) with automatic screenshot processing pause at 150% of threshold
- **NFR87:** Screenshot storage uses efficient compression (WebP/AVIF) targeting <100KB average per screenshot while maintaining classification accuracy
- **NFR88:** AI classification supports configurable daily processing limit (default 100/day per device) with graceful queue management when exceeded
- **NFR89:** Dashboard uses incremental sync and lazy loading; full page refresh transfers <500KB after initial load
- **NFR90:** Dashboard displays current period's resource consumption (storage used, AI calls, function invocations) alongside cost estimates
- **NFR91:** System automatically classifies incidents as P1 (safety-critical), P2 (core function), P3 (degraded), P4 (cosmetic)

---

## User Journey Support

- **NFR59:** New families can create first draft agreement within 10 minutes of starting onboarding
- **NFR60:** System supports agreements with up to 100 conditions without performance degradation
- **NFR62:** Delegated access revocation takes effect within 5 minutes across all active sessions
- **NFR63:** Trust score calculations deterministic and reproducible, with variance <1% across recalculations
