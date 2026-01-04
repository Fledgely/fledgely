# Story 51.6: Breach Notification

## Status: done

## Story

As **a user**,
I want **to be notified of data breaches**,
So that **I can take protective action (FR157, GDPR Article 33-34)**.

## Acceptance Criteria

1. **AC1: 72-Hour Notification**
   - Given data breach occurs
   - When breach detected
   - Then affected users notified within 72 hours

2. **AC2: Notification Content**
   - Given breach notification is sent
   - When user receives notification
   - Then includes: what data affected, when, what to do
   - And clear actionable guidance provided

3. **AC3: Multi-Channel Notification**
   - Given breach needs to be communicated
   - When notification is triggered
   - Then notification via email
   - And in-app banner shown on login

4. **AC4: Regulatory Notification**
   - Given breach affects personal data
   - When breach severity requires reporting
   - Then regulators notified per GDPR requirements
   - And notification documented with timestamps

5. **AC5: Incident Documentation**
   - Given breach response is underway
   - When incident is managed
   - Then incident response documented
   - And timeline of actions recorded

6. **AC6: Response Plan**
   - Given breach handling policy exists
   - When responding to incident
   - Then NFR18: breach response plan maintained
   - And checklist followed

7. **AC7: Post-Incident Review**
   - Given breach has been resolved
   - When response is complete
   - Then post-incident review conducted
   - And improvements documented

## Tasks / Subtasks

### Task 1: Create Breach Notification Data Model

**Files:**

- `packages/shared/src/contracts/breachNotification.ts` (new)

**Implementation:**
1.1 Define BreachIncidentSchema with Zod:

- Incident ID, severity (low/medium/high/critical)
- Data types affected
- Detection and occurrence timestamps
- Affected user count/list
- Regulatory reporting status
- Response timeline

  1.2 Define BreachNotificationSchema:

- User notification status
- Delivery channels used
- Acknowledgment tracking

### Task 2: Create Breach Incident Admin Functions

**Files:**

- `apps/functions/src/callable/admin/createBreachIncident.ts` (new)
- `apps/functions/src/callable/admin/updateBreachIncident.ts` (new)

**Implementation:**
2.1 Admin callable to create breach incident
2.2 Admin callable to update incident status and notify users

### Task 3: Create Breach Notification Email Template

**Files:**

- `apps/functions/src/lib/email/templates/breachNotificationEmail.ts` (new)

**Implementation:**
3.1 Create breach notification email with:

- What data was affected
- When it occurred
- What actions to take
- Contact information

### Task 4: Create In-App Banner Component

**Files:**

- `apps/web/src/components/breach/BreachBanner.tsx` (new)

**Implementation:**
4.1 Create dismissible banner shown on login
4.2 Link to full breach details page

### Task 5: Create Admin Breach Dashboard

**Files:**

- `apps/web/src/app/admin/breach-incidents/page.tsx` (new)

**Implementation:**
5.1 List all breach incidents
5.2 Create new incident
5.3 Track notification status
5.4 Document response actions

### Task 6: Add Firestore Indexes

**Files:**

- `firestore.indexes.json` (modify)

### Task 7: Export Functions

**Files:**

- `apps/functions/src/index.ts` (modify)

## Dev Notes

### GDPR Breach Notification Requirements

- Article 33: Notify supervisory authority within 72 hours
- Article 34: Notify affected individuals if high risk

### Severity Levels

1. **Low**: Minor incident, no sensitive data exposed
2. **Medium**: Limited data exposure, contained quickly
3. **High**: Sensitive data potentially accessed
4. **Critical**: Widespread exposure, requires immediate action

### Response Plan (NFR18)

1. Detection and containment
2. Assessment of scope and severity
3. Regulatory notification (if required)
4. User notification
5. Remediation
6. Post-incident review

## Dev Agent Record

### File List

- packages/shared/src/contracts/breachNotification.ts
- apps/functions/src/callable/admin/createBreachIncident.ts
- apps/functions/src/callable/admin/updateBreachIncident.ts
- apps/functions/src/callable/admin/getBreachIncidents.ts
- apps/functions/src/callable/getUserBreachNotifications.ts
- apps/functions/src/callable/dismissBreachBanner.ts
- apps/functions/src/lib/email/templates/breachNotificationEmail.ts
- apps/web/src/components/breach/BreachBanner.tsx
- apps/web/src/components/breach/index.ts
- apps/web/src/hooks/useBreachIncidentAdmin.ts
- apps/web/src/app/admin/breach-incidents/page.tsx
- firestore.indexes.json (modified)
- apps/functions/src/index.ts (modified)
- packages/shared/src/index.ts (modified)
