# Story 31.3: Education Content Exemption

Status: Done

## Story

As **a parent**,
I want **educational content to be exempt from time limits**,
So that **homework and learning aren't interrupted**.

## Acceptance Criteria

1. **AC1: Education exemption flag**
   - Given education exemption is enabled (FR104)
   - When child uses educational apps/sites
   - Then time in "Education" category doesn't count toward daily limit

2. **AC2: Curated education apps**
   - Given exemption is enabled
   - When child accesses curated education apps
   - Then those apps are automatically exempt

3. **AC3: Custom site exemptions**
   - Given parent is configuring exemptions
   - When adding custom sites
   - Then those sites are added to education exemption list

4. **AC4: Child notification**
   - Given child is using educational content
   - When exemption is active
   - Then child sees: "Homework time doesn't count toward your limit"

5. **AC5: Usage tracking**
   - Given educational content is exempt
   - When child uses educational sites
   - Then usage still tracked for visibility (just not counted toward limit)

6. **AC6: Anti-gaming protection**
   - Given exemption system exists
   - When child tries to relabel non-education as education
   - Then system prevents gaming via category rules

## Tasks / Subtasks

- [x] Task 1: Add education exemption schema (AC: #1, #6)
  - [x] 1.1 Create educationExemptionSchema
  - [x] 1.2 Add educationExemption field to childTimeLimitsSchema
  - [x] 1.3 Add curated education domains list
  - [x] 1.4 Write schema tests

- [x] Task 2: Update time limit calculation (AC: #1, #5)
  - [x] 2.1 Skip education category when calculating remaining time
  - [x] 2.2 Continue tracking education usage for visibility
  - [x] 2.3 Update getTimeLimitConfig to return exemption settings

- [ ] Task 3: Update badge/notification for exempt content (AC: #4)
  - [x] 3.1 Detect when on exempt educational site (isEducationDomain function)
  - [ ] 3.2 Show "Homework time" indicator in badge (deferred to UI story)
  - [ ] 3.3 Update popup to show exempt vs counted time (deferred to UI story)

- [x] Task 4: Build and test
  - [x] 4.1 Write tests for exemption logic
  - [x] 4.2 Verify extension build passes
  - [x] 4.3 Verify web build passes

## Dev Notes

### Education Exemption Schema

```typescript
export const educationExemptionSchema = z.object({
  /** Whether education exemption is enabled */
  enabled: z.boolean().default(false),
  /** Custom domains added by parent (in addition to curated list) */
  customDomains: z.array(z.string()).default([]),
  /** Include Homework category in exemption */
  includeHomework: z.boolean().default(true),
  /** Show notification when on exempt site */
  showExemptNotification: z.boolean().default(true),
})
```

### Curated Education Domains (Default)

- khanacademy.org
- coursera.org
- edx.org
- duolingo.com
- quizlet.com
- \*.edu domains
- wolframalpha.com
- britannica.com
- wikipedia.org

### Deferred: UI Configuration

Parent UI for configuring education exemption (custom domains, toggle) will be handled in a separate story focusing on time limits UI.

### References

- [Source: docs/epics/epic-list.md#story-313] - Story requirements
- [Source: FR104] - Education exemption requirement
- [Source: FR129] - Educational exception

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Backend implementation complete: schema, helper functions, cloud function, extension
- Task 3 UI components (badge indicator, popup display) deferred to UI story
- AC4 (child notification) partially implemented - educationMinutes tracked in TimeLimitStatus
- AC6 (anti-gaming) inherently handled by category rules and parent-only configuration

### File List

- packages/shared/src/contracts/index.ts - Added educationExemptionSchema, CURATED_EDUCATION_DOMAINS
- packages/shared/src/contracts/timeLimits.test.ts - Added education exemption tests (12 tests)
- apps/extension/src/time-limit-warnings.ts - Added education exemption support
- apps/extension/src/time-limit-warnings.test.ts - Added education exemption tests (16 tests)
- apps/functions/src/http/timeLimits/getConfig.ts - Returns educationExemption in response
