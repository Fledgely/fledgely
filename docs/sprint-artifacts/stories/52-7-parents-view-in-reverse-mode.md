# Story 52-7: Parents' View in Reverse Mode

## User Story

As **a parent of a 16+ teen**,
I want **to understand what I can still see**,
So that **I respect my teen's autonomy**.

## Acceptance Criteria

### AC1: Dashboard Limited View Indicator

**Given** teen has activated reverse mode
**When** parent views dashboard
**Then** dashboard clearly shows: "Limited view - [Teen Name] controls"

### AC2: Only Shared Data Visible

**Given** reverse mode is active
**When** parent views child's data
**Then** sees only what teen has chosen to share
**And** empty states for non-shared categories

### AC3: No Request More Access

**Given** reverse mode is active
**When** parent views dashboard
**Then** cannot request more access (teen decides)
**And** no "request access" buttons shown

### AC4: Subscription & Account Access Preserved

**Given** reverse mode is active
**When** parent manages family
**Then** can still: manage subscription, account settings
**And** can manage family members
**And** can manage devices

### AC5: Independence Resources

**Given** reverse mode is active
**When** parent views limited dashboard
**Then** resources: "Supporting your teen's independence" visible
**And** links to helpful guidance for parents

### AC6: Sharing Settings Change Notification

**Given** teen adjusts sharing settings
**When** settings change is saved
**Then** parent receives notification of change
**And** notification describes what is now shared

### AC7: Graceful Transition Celebration

**Given** teen activates reverse mode
**When** parent first sees limited view
**Then** celebration message: growth, not loss
**And** positive framing of teen's development

## Technical Notes

- Uses existing reverseMode contract from shared package
- Leverages sharingPreferences from ReverseModeSettings
- Parent dashboard conditionally renders based on reverseMode status
- Add parent notification for sharing preference changes
- Add "Supporting Independence" resources component

## Dependencies

- Story 52-2: Reverse Mode Activation (provides reverseMode status)
- Story 52-3: Selective Sharing (provides sharingPreferences)

## Implementation Tasks

- [ ] Task 1: Add ParentReverseModeIndicator component showing limited view status
- [ ] Task 2: Update parent dashboard to filter data based on sharingPreferences
- [ ] Task 3: Add empty states for non-shared data categories
- [ ] Task 4: Add SupportingIndependenceResources component
- [ ] Task 5: Add parent notification when teen changes sharing settings
- [ ] Task 6: Add celebration/transition messaging for first reverse mode view
- [ ] Task 7: Write tests for parent view filtering
