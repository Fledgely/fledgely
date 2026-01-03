# Story 40.2: Location-Specific Rule Configuration

## Status: done

## Story

As a **parent**,
I want **to configure different rules for different locations**,
So that **rules adapt to context (home vs school vs other parent's house)**.

## Acceptance Criteria

1. **AC1: Location Definitions**
   - Given location features enabled (Story 40.1)
   - When configuring location rules (FR145)
   - Then locations can be defined: Home 1, Home 2, School, Other
   - And each location has a name, address, and geofence radius

2. **AC2: Per-Location Time Limits**
   - Given a location is defined
   - When configuring location rules
   - Then each location can have different time limits
   - And example: "At Dad's house: 3h limit; At Mom's house: 2h limit"

3. **AC3: Per-Location Category Rules**
   - Given a location is defined
   - When configuring location rules
   - Then each location can have different category permissions
   - And school location: education-only mode automatic by default

4. **AC4: Geofence Configuration**
   - Given a location is being configured
   - When setting location boundaries
   - Then geofence radius is configurable
   - And default radius is 500 meters
   - And minimum radius is 100 meters
   - And maximum radius is 2000 meters

5. **AC5: Child Location Display**
   - Given child is at a defined location
   - When child views current status
   - Then child sees current location rule: "You're at Mom's - 2h limit"
   - And uses child-friendly language (NFR65)

6. **AC6: Location Rule Preview**
   - Given parent is configuring location rules
   - When viewing configuration
   - Then preview shows how rules differ across locations
   - And validation prevents conflicting configurations

## Tasks / Subtasks

### Task 1: Create Location Zone Schema (AC: #1, #4) [x]

Define Zod schemas for location zones.

**Files:**

- `packages/shared/src/contracts/locationZones.ts` (new)
- `packages/shared/src/contracts/locationZones.test.ts` (new)

**Implementation:**

- Create `locationZoneTypeSchema`: 'home_1' | 'home_2' | 'school' | 'other'
- Create `locationZoneSchema`:
  - `id: string`
  - `familyId: string`
  - `name: string` (user-friendly name)
  - `type: LocationZoneType`
  - `latitude: number`
  - `longitude: number`
  - `radiusMeters: number` (default 500, min 100, max 2000)
  - `address: string` (optional display address)
  - `createdAt: Date`
  - `updatedAt: Date`
- Export from `packages/shared/src/contracts/index.ts`

**Tests:** ~12 tests for schema validation

### Task 2: Create Location Rule Schema (AC: #2, #3) [x]

Define Zod schemas for location-specific rules.

**Files:**

- `packages/shared/src/contracts/locationRules.ts` (new)
- `packages/shared/src/contracts/locationRules.test.ts` (new)

**Implementation:**

- Create `locationRuleSchema`:
  - `id: string`
  - `zoneId: string` (references location zone)
  - `familyId: string`
  - `childId: string`
  - `dailyTimeLimitMinutes: number | null` (null = use default)
  - `categoryOverrides: Record<string, 'allowed' | 'blocked'>` (empty = use default)
  - `educationOnlyMode: boolean` (default true for school type)
  - `createdAt: Date`
  - `updatedAt: Date`
- Export from `packages/shared/src/contracts/index.ts`

**Tests:** ~10 tests for schema validation

### Task 3: Create Manage Location Zones Cloud Function (AC: #1, #4) [x]

Server-side functions to create, update, and delete location zones.

**Files:**

- `apps/functions/src/callable/manageLocationZone.ts` (new)
- `apps/functions/src/callable/manageLocationZone.test.ts` (new)

**Implementation:**

- `createLocationZone` action:
  - Validate location features enabled
  - Validate caller is guardian
  - Validate geofence radius within limits
  - Create zone document in `families/{familyId}/locationZones/{id}`
- `updateLocationZone` action:
  - Validate caller is guardian
  - Update zone document
- `deleteLocationZone` action:
  - Validate caller is guardian
  - Delete zone and associated rules
- Audit log all zone changes

**Tests:** ~15 tests for CRUD operations

### Task 4: Create Manage Location Rules Cloud Function (AC: #2, #3) [x]

Server-side functions to configure location-specific rules.

**Files:**

- `apps/functions/src/callable/manageLocationRule.ts` (new)
- `apps/functions/src/callable/manageLocationRule.test.ts` (new)

**Implementation:**

- `setLocationRule` action:
  - Validate location features enabled
  - Validate caller is guardian
  - Validate zone exists
  - Upsert rule in `families/{familyId}/locationRules/{id}`
- `deleteLocationRule` action:
  - Validate caller is guardian
  - Delete rule document
- Default school zones to education-only mode

**Tests:** ~12 tests for rule management

### Task 5: Create Location Zone Editor Component (AC: #1, #4, #6) [x]

UI for managing location zones.

**Files:**

- `apps/web/src/components/settings/LocationZoneEditor.tsx` (new)
- `apps/web/src/components/settings/LocationZoneEditor.test.tsx` (new)

**Implementation:**

- Zone list with add/edit/delete actions
- Zone form with:
  - Name input
  - Type selector (Home 1, Home 2, School, Other)
  - Address input with geocoding (future)
  - Lat/lng coordinate inputs
  - Radius slider (100-2000m, default 500m)
- Preview of zone coverage
- 44x44px touch targets (NFR49)
- Keyboard accessible (NFR43)

**Tests:** ~15 tests for UI and accessibility

### Task 6: Create Location Rule Editor Component (AC: #2, #3, #6) [x]

UI for configuring per-location rules.

**Files:**

- `apps/web/src/components/settings/LocationRuleEditor.tsx` (new)
- `apps/web/src/components/settings/LocationRuleEditor.test.tsx` (new)

**Implementation:**

- Per-zone rule configuration:
  - Time limit override slider
  - Category permission toggles
  - Education-only mode toggle (default on for school)
- Rule comparison view showing differences
- Clear indication of inherited vs overridden settings
- 4.5:1 contrast ratio (NFR45)

**Tests:** ~12 tests for UI and validation

### Task 7: Create Child Location Status Component (AC: #5) [x]

Child-facing component showing current location and rules.

**Files:**

- `apps/web/src/components/child/ChildLocationStatus.tsx` (new)
- `apps/web/src/components/child/ChildLocationStatus.test.tsx` (new)

**Implementation:**

- Display: "You're at Mom's - 2h limit today"
- Show current location name
- Show active time limit
- Show any special rules (education-only mode)
- Child-friendly language (NFR65: 6th-grade reading level)
- Simple, non-anxious presentation

**Tests:** ~10 tests for rendering and accessibility

### Task 8: Create useLocationZones Hook (AC: #1, #4) [x]

React hook for managing location zones.

**Files:**

- `apps/web/src/hooks/useLocationZones.ts` (new)
- `apps/web/src/hooks/useLocationZones.test.ts` (new)

**Implementation:**

- Subscribe to `families/{familyId}/locationZones`
- Provide `createZone()` function
- Provide `updateZone()` function
- Provide `deleteZone()` function
- Track loading/error states

**Tests:** ~10 tests for hook functionality

### Task 9: Create useLocationRules Hook (AC: #2, #3) [x]

React hook for managing location-specific rules.

**Files:**

- `apps/web/src/hooks/useLocationRules.ts` (new)
- `apps/web/src/hooks/useLocationRules.test.ts` (new)

**Implementation:**

- Subscribe to `families/{familyId}/locationRules`
- Provide `setRule()` function
- Provide `deleteRule()` function
- Helper to get effective rules for a zone

**Tests:** ~10 tests for hook functionality

### Task 10: Update Component Exports (AC: All) [x]

Export new components and hooks.

**Files:**

- `apps/web/src/components/settings/index.ts` (modify)
- `apps/web/src/components/child/index.ts` (modify)
- `packages/shared/src/contracts/index.ts` (modify)
- `apps/functions/src/index.ts` (modify)

**Implementation:**

- Export LocationZoneEditor
- Export LocationRuleEditor
- Export ChildLocationStatus
- Export location zone and rule schemas
- Export location cloud functions

**Tests:** No additional tests (export verification)

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Architecture Compliance

**From Architecture Document:**

- Firebase Security Rules as primary boundary
- Single-Source Bidirectional Transparency (parents and child see same data)
- Location data encrypted in transit and at rest

**Key Patterns to Follow:**

- Location settings pattern from Story 40.1
- Time limits pattern from Epic 30-31
- Category permissions pattern from Epic 20

### Data Model

```typescript
// families/{familyId}/locationZones/{zoneId}
interface LocationZone {
  id: string
  familyId: string
  name: string // "Mom's House", "School", etc.
  type: 'home_1' | 'home_2' | 'school' | 'other'
  latitude: number
  longitude: number
  radiusMeters: number // default 500, min 100, max 2000
  address: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

// families/{familyId}/locationRules/{ruleId}
interface LocationRule {
  id: string
  zoneId: string
  familyId: string
  childId: string
  dailyTimeLimitMinutes: number | null // null = use child's default
  categoryOverrides: Record<string, 'allowed' | 'blocked'>
  educationOnlyMode: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### File Structure

```
packages/shared/src/contracts/
├── locationZones.ts                     # NEW - Zone schemas
├── locationZones.test.ts                # NEW
├── locationRules.ts                     # NEW - Rule schemas
├── locationRules.test.ts                # NEW
└── index.ts                             # MODIFY - exports

apps/functions/src/callable/
├── manageLocationZone.ts                # NEW - Zone CRUD
├── manageLocationZone.test.ts           # NEW
├── manageLocationRule.ts                # NEW - Rule management
└── manageLocationRule.test.ts           # NEW

apps/web/src/components/settings/
├── LocationZoneEditor.tsx               # NEW - Zone management UI
├── LocationZoneEditor.test.tsx          # NEW
├── LocationRuleEditor.tsx               # NEW - Rule configuration UI
├── LocationRuleEditor.test.tsx          # NEW
└── index.ts                             # MODIFY - exports

apps/web/src/components/child/
├── ChildLocationStatus.tsx              # NEW - Child view
├── ChildLocationStatus.test.tsx         # NEW
└── index.ts                             # MODIFY - exports

apps/web/src/hooks/
├── useLocationZones.ts                  # NEW
├── useLocationZones.test.ts             # NEW
├── useLocationRules.ts                  # NEW
└── useLocationRules.test.ts             # NEW
```

### Testing Requirements

- Unit test all Zod schemas
- Unit test cloud functions with mocked Firestore
- Component tests for UI with accessibility verification
- Test zone CRUD operations
- Test rule configuration
- Test child location display
- Test education-only mode default for school zones

### NFR References

- NFR42: Location data handling (privacy requirements)
- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR65: Text at 6th-grade reading level for child views

### References

- [Source: docs/epics/epic-list.md#Story-40.2]
- [Source: docs/epics/epic-list.md#Epic-40]
- [Source: Story 40.1 for location settings patterns]
- [Source: Epic 30-31 for time limits patterns]

## Dev Agent Record

### Context Reference

- Epic: 40 (Advanced Shared Custody & Location Features)
- Story Key: 40-2-location-specific-rule-configuration
- Dependencies: Story 40.1 (Location Opt-In) - COMPLETE

### Agent Model Used

### Debug Log References

### Completion Notes List

- All 10 tasks completed with 259 passing tests
- Location zones support 4 types: home_1, home_2, school, other
- Geofence radius configurable: 100-2000m (default 500m)
- Education-only mode defaults to true for school zones
- Child-friendly language (6th-grade reading level) for status display
- All components keyboard accessible with 44x44px touch targets
- 4.5:1 contrast ratio maintained throughout

### File List

- `packages/shared/src/contracts/locationZones.ts` - 45 tests
- `packages/shared/src/contracts/locationRules.ts` - 42 tests
- `apps/functions/src/callable/manageLocationZone.ts` - 19 tests
- `apps/functions/src/callable/manageLocationRule.ts` - 16 tests
- `apps/web/src/components/settings/LocationZoneEditor.tsx` - 33 tests
- `apps/web/src/components/settings/LocationRuleEditor.tsx` - 35 tests
- `apps/web/src/components/child/ChildLocationStatus.tsx` - 31 tests
- `apps/web/src/hooks/useLocationZones.ts` - 18 tests
- `apps/web/src/hooks/useLocationRules.ts` - 20 tests
- `packages/shared/src/contracts/index.ts` (modified)
- `packages/shared/src/index.ts` (modified)
- `apps/web/src/components/settings/index.ts` (modified)
- `apps/web/src/components/child/index.ts` (modified)
- `apps/functions/src/index.ts` (modified)

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-03 | Story created (ready-for-dev) |
| 2026-01-03 | Story completed - 259 tests   |
