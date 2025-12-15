# Product Scope

## MVP Platform Coverage

| Platform | Implementation | Failure Resilience |
|----------|----------------|-------------------|
| **Chromebook** | Chrome extension + Android app | Sideload path independent of any store; Android app detects extension tampering |
| **Fire TV** | Sideloaded Android app | ADB fallback; DRM content logs titles only |
| **Netflix** | Via Fire TV + API | Title-based classification when screenshots blocked |
| **Nintendo Switch** | Home Assistant integration | Existing `ha-nintendoparentalcontrols`; accept eventual consistency |

## MVP Core Features

| Feature | Description | Failure Mitigation |
|---------|-------------|-------------------|
| **Screenshot capture** | Configurable intervals, 7-day retention | On-device continues if cloud unavailable |
| **AI classification** | Homework/leisure/games/concerning | On-device sufficient alone; cloud is enhancement |
| **Family digital agreement** | AI-readable document, per-child | Age-appropriate language; visual for young kids |
| **Time tracking** | Aggregate across platforms | Display data freshness; accept eventual consistency |
| **Internet history** | URLs alongside screenshots | Local storage; E2EE sync |
| **Home Assistant** | Dashboard, automation triggers | Local device continues if HA offline |
| **Offline OTP** | TOTP-based unlock | Rate limiting; backup codes at setup |
| **School calendar** | Term/holiday mode switching | Manual fallback; parent override |
| **Mood journal** | Child wellbeing tracking | E2EE; child controls sharing |
| **AI conversation guidance** | Parent discussion starters | Human-reviewed templates; not fully generative |

## MVP Architecture

- E2EE family sync with recovery key at setup
- Hybrid AI: on-device fast + optional cloud deeper
- Multi-child, multi-parent family model (no shared logins)
- Self-hosted: one-click deploy to user's Google Cloud
- QR code device enrollment; existing device approves new

## Reliability Requirements

### Store Independence
- Chrome extension and Android app must have sideload paths
- Never depend solely on Chrome Web Store or Play Store approval
- Android app manages Chrome extension installation

### AI Resilience
- On-device model must be sufficient for real-time decisions alone
- Cloud AI is enhancement, not dependency
- Accept 2-3 second latency for on-device classification
- Conservative defaults: allow and flag rather than block and miss

### Platform Graceful Degradation
- DRM content (Netflix, etc.): log app usage + titles when screenshots blocked
- Nintendo Switch: accept eventual consistency via HA integration
- Sync delays displayed to user ("last synced X minutes ago")

### Offline Robustness
- 72-hour minimum offline operation with cached rules
- TOTP with 30-second windows; time sync on reconnect
- 3 OTP attempts then increasing cooldown (prevent brute force)
- Backup codes generated at family setup

### Data Recovery
- E2EE recovery key generated at setup, stored securely by parent
- Conflict resolution: last-write-wins with audit trail
- New device enrollment via QR code approved by existing device

## Critical Failure Chains & Mitigations

| Failure Chain | Risk | Mitigation |
|---------------|------|------------|
| Extension removed → App rejected → No Chromebook monitoring | High | Always maintain sideload path independent of stores |
| Cloud AI down → On-device too slow → Decisions fail | Medium | On-device model must be sufficient alone |
| HA offline → Switch unmonitored → Aggregate time wrong | Low | Accept eventual consistency; display data freshness |
| Child refuses consent → Parent frustrated | Expected | This is by design; provide family discussion resources |

## Growth Features (Post-MVP)

- iOS/Android phone support
- Xbox integration
- Chore reward integration (via Home Assistant)
- Educational content recommendations
- Device health notifications
- Progressive "digital license" (earned autonomy)
- Reverse mode transition at 16

## Risk Contingencies

| Risk | Contingency |
|------|-------------|
| Nintendo Switch API changes | Monitor upstream HA integration; contribute fixes |
| AI accuracy below 80% at launch | Conservative defaults + family training; over-flag rather than under-flag |
| Children refuse consent | Non-negotiable boundary; negotiate scope not principle |
| Self-hosting too complex | One-click deploy; accept technical audience initially |
| Chrome Web Store rejects extension | Sideload via Android app; never depend on store |
