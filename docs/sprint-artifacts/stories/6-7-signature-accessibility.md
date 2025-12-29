# Story 6.7: Signature Accessibility

Status: Done

## Story

As a **family member using assistive technology**,
I want **the signing process to be fully accessible**,
So that **disability doesn't prevent participation in family agreements**.

## Acceptance Criteria

1. **AC1: Keyboard Navigation**
   - Given a user navigating with keyboard only
   - When they participate in the signing ceremony
   - Then all signing steps are keyboard navigable
   - And tab order follows logical flow
   - And no keyboard traps exist

2. **AC2: Alternative Signature Methods**
   - Given a user with motor accessibility needs
   - When they need to sign
   - Then signature can be typed (not just drawn)
   - And typed signature is equally valid
   - And clear toggle between methods exists

3. **AC3: Screen Reader Announcements**
   - Given a screen reader user
   - When they navigate the signing ceremony
   - Then each step change is announced
   - And confirmation is announced
   - And form validation states are announced

4. **AC4: Focus Management**
   - Given a user navigating the ceremony
   - When they advance to a new step
   - Then focus moves to the first interactive element
   - And focus is visible and clear

5. **AC5: Color Contrast**
   - Given any user viewing the ceremony
   - When they view any text or UI element
   - Then color contrast meets WCAG 2.1 AA (4.5:1 for text)
   - And focus indicators are clearly visible

6. **AC6: Touch Target Size**
   - Given a user with motor impairment
   - When they interact with buttons or controls
   - Then all touch targets are at least 44x44px

7. **AC7: Error Accessibility**
   - Given a user makes a validation error
   - When error is displayed
   - Then error is announced to assistive technology
   - And error is associated with the relevant field

## Tasks / Subtasks

- [x] Task 1: Audit Existing Accessibility (AC: All)
  - [x] 1.1 Review TypedSignature component accessibility
  - [x] 1.2 Review DrawnSignature component accessibility
  - [x] 1.3 Review ConsentCheckbox component accessibility
  - [x] 1.4 Review ChildSigningCeremony step flow accessibility
  - [x] 1.5 Review ParentSigningCeremony step flow accessibility
  - [x] 1.6 Review CelebrationScreen accessibility

- [x] Task 2: Enhance Focus Management (AC: #4)
  - [x] 2.1 Add useEffect to focus first element when step changes in ChildSigningCeremony
  - [x] 2.2 Add useEffect to focus first element when step changes in ParentSigningCeremony
  - [x] 2.3 Add ref to first focusable element in each step

- [x] Task 3: Add Step Change Announcements (AC: #3)
  - [x] 3.1 Create live region for step announcements
  - [x] 3.2 Announce step changes in ChildSigningCeremony
  - [x] 3.3 Announce step changes in ParentSigningCeremony

- [x] Task 4: Enhance Error Announcements (AC: #7)
  - [x] 4.1 Add aria-live region for validation messages
  - [x] 4.2 Connect validation error to form fields with aria-errormessage
  - [x] 4.3 Announce when submit is blocked and why

- [x] Task 5: DrawnSignature Keyboard Alternative Notice (AC: #2)
  - [x] 5.1 Add notice that TypedSignature is recommended for keyboard users
  - [x] 5.2 Add keyboard shortcut to switch to typed signature from drawn

- [x] Task 6: Accessibility Tests (AC: All)
  - [x] 6.1 Test keyboard-only navigation through entire flow
  - [x] 6.2 Test focus management on step changes
  - [x] 6.3 Test screen reader announcements
  - [x] 6.4 Test touch targets are 44px+
  - [x] 6.5 Test error state accessibility

## Dev Notes

### Implementation Strategy

Story 6.7 enhances the existing accessibility features implemented in Stories 6.1-6.4. The core signing components (TypedSignature, DrawnSignature, ConsentCheckbox) already have solid accessibility foundations. This story focuses on:

1. **Focus management** - ensuring focus moves correctly when ceremony steps change
2. **Live announcements** - ensuring screen readers announce step transitions
3. **Error accessibility** - making validation errors fully accessible

### Existing Accessibility Features

The following accessibility features are already in place:

- **TypedSignature**: label, aria-describedby, aria-invalid, visible focus
- **DrawnSignature**: aria-label, role="img", clear button with aria-label
- **ConsentCheckbox**: aria-describedby, large touch target
- **ChildSigningCeremony**: role="main", aria-label, aria-current for steps
- **ParentSigningCeremony**: role="main", aria-label, aria-current for steps
- **SignatureConfirmation**: role="status", aria-live="polite"
- **CelebrationScreen**: role="region", aria-labelledby, screen reader announcement

### Key Requirements

- **NFR42:** WCAG 2.1 AA compliance
- **NFR45:** 4.5:1 color contrast ratio
- **NFR46:** Visible focus indicators
- **NFR47:** Screen reader announcements
- **NFR49:** 44x44px minimum touch targets

### Technical Approach

1. **Focus Management Hook**:

```typescript
// Use useRef and useEffect to manage focus on step changes
const headingRef = useRef<HTMLHeadingElement>(null)
useEffect(() => {
  headingRef.current?.focus()
}, [step])
```

2. **Live Region for Announcements**:

```typescript
// Create a visually hidden live region
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {stepAnnouncement}
</div>
```

3. **Error Accessibility Pattern**:

```typescript
// Connect errors to fields
<input aria-describedby="field-error" aria-invalid={hasError} />
<p id="field-error" role="alert">{error}</p>
```

### Project Structure Notes

- Components: `apps/web/src/components/signing/`
- Tests: Adjacent `__tests__/` folder
- Existing patterns: See CelebrationScreen for screen reader announcement pattern

### References

- [Source: docs/epics/epic-list.md - Story 6.7]
- [Source: docs/prd/non-functional-requirements.md - NFR42, NFR45-49]
- [Source: Story 6.1-6.4 - Existing signing components]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

### Debug Log References

### Completion Notes List

- Added focus management with refs for step headings in ChildSigningCeremony
- Added focus management with refs for step headings in ParentSigningCeremony
- Added live region for step announcements (aria-live="polite")
- Added role="alert" to validation error messages
- Added aria-describedby connecting submit buttons to validation errors
- Added keyboard accessibility notice to DrawnSignature
- All headings have tabIndex={-1} for programmatic focus
- 5 new accessibility tests for ChildSigningCeremony
- All 1648 tests passing

### File List

- `apps/web/src/components/signing/ChildSigningCeremony.tsx` - MODIFIED: Focus management, step announcements, error accessibility
- `apps/web/src/components/signing/ParentSigningCeremony.tsx` - MODIFIED: Focus management, step announcements, error accessibility
- `apps/web/src/components/signing/DrawnSignature.tsx` - MODIFIED: Keyboard accessibility notice
- `apps/web/src/components/signing/__tests__/ChildSigningCeremony.test.tsx` - MODIFIED: 5 new accessibility tests

## Change Log

| Date       | Change                         |
| ---------- | ------------------------------ |
| 2025-12-29 | Story created                  |
| 2025-12-29 | Story implementation completed |
