# Story 52-8: Reverse Mode Safety Net

## User Story

As **the system**,
I want **safety features in reverse mode**,
So that **teens are protected even with increased autonomy**.

## Acceptance Criteria

### AC1: Crisis URL Protection Active

**Given** reverse mode is active
**When** teen browses crisis URLs (INV-001)
**Then** crisis URL protection is still active
**And** no screenshots captured for protected URLs
**And** this protection cannot be disabled

### AC2: Crisis Resources Accessible

**Given** reverse mode is active
**When** teen needs help
**Then** teen can still access crisis resources
**And** safety signal (Story 7.5.1) still available

### AC3: Safe Escape Works

**Given** reverse mode is active
**When** teen needs to escape (Epic 0.5)
**Then** safe escape functionality still works
**And** parent access can be severed if needed

### AC4: Re-enable Parent Visibility

**Given** teen is in reverse mode
**When** teen wants to share more
**Then** can re-enable parent visibility anytime
**And** sharing preferences can be changed at will

### AC5: Trusted Adults Encourage (Not Force)

**Given** trusted adult views teen data
**When** data is limited
**Then** UI shows supportive messaging
**And** no mechanism to force sharing
**And** trusted adult can suggest but not demand

### AC6: Abuse Reporting Available

**Given** reverse mode is active
**When** teen or parent needs to report abuse
**Then** abuse reporting still accessible
**And** safety contact still available

### AC7: No Weaponization of Autonomy

**Given** reverse mode is active
**When** safety concern is detected
**Then** system prioritizes safety over privacy
**And** crisis protections remain inviolable
**And** reverse mode cannot disable safety features

## Technical Notes

- This story is primarily verification that existing safety features work in reverse mode
- INV-001 (crisis URL protection) is already implemented and should be unaffected by reverse mode
- Safe escape (Epic 0.5) is already implemented
- Safety signal (Story 7.5.1) is already implemented
- Need to add verification tests that these features work when reverseMode.status === 'active'

## Dependencies

- Story 52-2: Reverse Mode Activation
- Epic 0.5: Safe Account Escape
- Story 7.5.1: Hidden Safety Signal Access
- Epic 7: Crisis Allowlist Foundation

## Implementation Tasks

- [ ] Task 1: Add verification tests for crisis URL protection in reverse mode
- [ ] Task 2: Verify safety signal access in reverse mode
- [ ] Task 3: Add supportive messaging for trusted adults when data is limited
- [ ] Task 4: Add safety-first messaging to reverse mode components
- [ ] Task 5: Write integration tests verifying safety features work in reverse mode
