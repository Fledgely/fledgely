# Story 6.4: Signing Ceremony Celebration

Status: done

## Story

As a **family**,
I want **a celebration moment when we complete our agreement**,
So that **this feels like a positive milestone, not a chore**.

## Acceptance Criteria

1. **Given** agreement activation is complete **When** ceremony completion screen displays **Then** visual celebration appears (confetti, animation, or similar)
2. **Given** ceremony completion screen displays **When** family views celebration **Then** message emphasizes partnership ("You did this together!")
3. **Given** ceremony is complete **When** family wants to save/share **Then** family can share/download their signed agreement
4. **Given** ceremony completion screen displays **When** celebration is shown **Then** optional photo moment is suggested (screenshot memory)
5. **Given** celebration is complete **When** family is ready to continue **Then** next steps are clearly shown (device enrollment or agreement-only path)
6. **Given** family member uses assistive technology **When** celebration displays **Then** celebration is accessible (not dependent on animations only)
7. **Given** screen reader is active **When** celebration displays **Then** screen reader announces "Congratulations! Your family agreement is now active."

## Tasks / Subtasks

- [x] Task 1: Extend SigningCelebration Component for Family Completion (AC: 1, 2, 6, 7)
  - [x] 1.1: Create `FamilyCelebration.tsx` component that extends existing SigningCelebration
  - [x] 1.2: Add partnership message emphasizing "You did this together!"
  - [x] 1.3: Display both parent and child names in celebration
  - [x] 1.4: Ensure confetti/animation works (leverage existing CSS animation)
  - [x] 1.5: Add screen reader announcement for activation: "Congratulations! Your family agreement is now active."
  - [x] 1.6: Support reduced-motion preference (existing pattern from SigningCelebration)
  - [x] 1.7: Write component tests

- [x] Task 2: Create Agreement Download/Share Feature (AC: 3)
  - [x] 2.1: Create `useAgreementDownload` hook
  - [x] 2.2: Generate PDF of signed agreement with terms, signatures, timestamps
  - [x] 2.3: Add "Download Agreement" button (44x44px minimum touch target)
  - [x] 2.4: Add "Share Agreement" button using Web Share API (with fallback)
  - [x] 2.5: Create audit log entry when agreement is downloaded/shared
  - [x] 2.6: Write download/share tests

- [x] Task 3: Create Photo Moment Suggestion (AC: 4)
  - [x] 3.1: Add optional "Take a Screenshot" prompt after celebration
  - [x] 3.2: Display celebration freeze-frame suitable for screenshot
  - [x] 3.3: Include family-friendly message like "Take a photo of this moment!"
  - [x] 3.4: Make prompt dismissible (not required)
  - [x] 3.5: Write component tests

- [x] Task 4: Create Next Steps Navigation (AC: 5)
  - [x] 4.1: Display clear next steps after celebration
  - [x] 4.2: Show "Set Up Device Monitoring" option (links to device enrollment flow when available)
  - [x] 4.3: Show "Agreement Only for Now" option (links to dashboard)
  - [x] 4.4: Explain what each option means in child-friendly language
  - [x] 4.5: Make buttons accessible with 44x44px minimum touch targets
  - [x] 4.6: Write navigation tests

- [x] Task 5: Integrate Celebration into Signing Flow (AC: 1-7)
  - [x] 5.1: Modify signing flow to trigger FamilyCelebration after all signatures complete
  - [x] 5.2: Pass agreement data (version, terms count, signatories) to celebration
  - [x] 5.3: Handle shared custody display (show all parent names)
  - [x] 5.4: Create audit log entry for ceremony completion
  - [x] 5.5: Write integration tests for full flow

- [x] Task 6: Accessibility and Polish (AC: 6, 7)
  - [x] 6.1: Ensure all touch targets are 44x44px minimum (NFR49)
  - [x] 6.2: Add ARIA labels for all celebration elements (NFR42)
  - [x] 6.3: Verify screen reader announces celebration (NFR47)
  - [x] 6.4: Test keyboard navigation through celebration flow (NFR43)
  - [x] 6.5: Verify color contrast for all text (NFR45)
  - [x] 6.6: Write accessibility tests

## Dev Notes

### Previous Story Intelligence (Story 6.3)

**Story 6.3** completed Agreement Activation with:
```typescript
// packages/contracts/src/agreement.schema.ts
// - agreementStatusSchema: 'draft' | 'pending_signatures' | 'active' | 'archived' | 'superseded'
// - Version numbering (X.Y format)
// - getNextVersionNumber(), isAgreementActive() helpers

// apps/web/src/services/agreementActivationService.ts
// - activateAgreement() - triggers when all signatures complete
// - archiveAgreement() - for superseding old agreements
// - getActiveAgreement(), getAgreementHistory()

// apps/web/src/services/signatureService.ts
// - recordChildSignature() now sets status='active', assigns version
// - Creates 'agreement_activated' audit log entry
```

**Key insight:** Agreement activation already happens in signatureService. Story 6.4 adds:
- Family celebration UI after activation
- Download/share signed agreement
- Photo moment suggestion
- Next steps navigation

### Existing Infrastructure to Leverage

```typescript
// apps/web/src/components/co-creation/signing/SigningCelebration.tsx
// - Already has confetti animation (CSS-based)
// - Already has reduced-motion support
// - Already has screen reader announcements
// - Provides pattern to extend for family celebration

// apps/web/src/components/co-creation/signing/index.ts
// - Export point for signing components

// apps/web/src/hooks/useSigningOrder.ts
// - Has isComplete boolean
// - Tracks signing status

// Key pattern from existing SigningCelebration:
// - Uses CSS keyframes for confetti (lightweight)
// - Detects prefers-reduced-motion
// - aria-live="polite" for screen readers
// - 44x44px touch targets on buttons
```

### FamilyCelebration Component Pattern

```typescript
// apps/web/src/components/co-creation/signing/FamilyCelebration.tsx

interface FamilyCelebrationProps {
  /** Agreement data for display */
  agreement: {
    id: string
    version: string
    activatedAt: string
    termsCount: number
  }
  /** Parent name(s) who signed */
  parentNames: string[]
  /** Child name who signed */
  childName: string
  /** Callback for next steps selection */
  onNextStep: (choice: 'device-enrollment' | 'dashboard') => void
  /** Callback for download agreement */
  onDownload: () => Promise<void>
  /** Callback for share agreement */
  onShare: () => Promise<void>
}

export function FamilyCelebration({
  agreement,
  parentNames,
  childName,
  onNextStep,
  onDownload,
  onShare,
}: FamilyCelebrationProps) {
  // Leverage existing patterns from SigningCelebration
  // - confetti animation
  // - reduced-motion detection
  // - screen reader announcements
}
```

### Agreement PDF Generation Pattern

```typescript
// apps/web/src/hooks/useAgreementDownload.ts

/**
 * Hook for downloading/sharing signed agreements
 * Uses browser APIs - no external PDF library needed
 */
export function useAgreementDownload(agreementId: string, familyId: string) {
  // Option 1: Generate simple HTML and print to PDF
  // Option 2: Use html2canvas + jsPDF if more control needed
  // Start with simple approach, upgrade if needed

  const downloadAgreement = async () => {
    // Fetch full agreement with terms and signatures
    // Generate printable HTML
    // Trigger browser print dialog in PDF mode
    // Log audit entry
  }

  const shareAgreement = async () => {
    // Check for Web Share API support
    // If supported: use navigator.share()
    // If not: show copy link fallback
    // Log audit entry
  }

  return { downloadAgreement, shareAgreement, isLoading }
}
```

### Web Share API Pattern

```typescript
// Web Share API (modern browsers)
if (navigator.share) {
  await navigator.share({
    title: 'Our Family Agreement',
    text: `${childName} and ${parentNames.join(', ')} signed a family agreement!`,
    url: `${window.location.origin}/agreements/${agreementId}`,
  })
} else {
  // Fallback: copy link to clipboard
  await navigator.clipboard.writeText(`${window.location.origin}/agreements/${agreementId}`)
}
```

### Next Steps Navigation Pattern

```typescript
// apps/web/src/components/co-creation/signing/NextStepsNavigation.tsx

interface NextStepsProps {
  onChoice: (choice: 'device-enrollment' | 'dashboard') => void
}

export function NextStepsNavigation({ onChoice }: NextStepsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">What's Next?</h2>

      {/* Device enrollment option */}
      <button
        onClick={() => onChoice('device-enrollment')}
        className="min-h-[44px] w-full p-4 border rounded-lg text-left"
      >
        <h3 className="font-medium">Set Up Device Monitoring</h3>
        <p className="text-sm text-gray-500">
          Install fledgely on your child's devices to start monitoring
        </p>
      </button>

      {/* Agreement-only option */}
      <button
        onClick={() => onChoice('dashboard')}
        className="min-h-[44px] w-full p-4 border rounded-lg text-left"
      >
        <h3 className="font-medium">Agreement Only for Now</h3>
        <p className="text-sm text-gray-500">
          You can set up device monitoring later from your dashboard
        </p>
      </button>
    </div>
  )
}
```

### Key FRs for Story 6.4

- **FR19:** Parent can preview before signing (completed in Story 6.2)
- **FR20:** Both parties must sign (signing flow complete)
- **FR21:** Agreement becomes active when both sign (Story 6.3)
- No new FRs - this is UX enhancement for activation celebration

### NFR Compliance Checklist

- [ ] NFR42: All celebration elements screen reader accessible
- [ ] NFR43: Full keyboard navigation through celebration flow
- [ ] NFR45: Color contrast 4.5:1 for all text
- [ ] NFR47: Screen reader announces "Congratulations! Your family agreement is now active."
- [ ] NFR49: All touch targets 44x44px minimum

### Testing Standards

**Unit tests for:**
- FamilyCelebration component display states
- useAgreementDownload hook functionality
- NextStepsNavigation selection handling
- Reduced-motion behavior

**Component tests for:**
- Celebration with single parent
- Celebration with shared custody (multiple parents)
- Download/share button functionality
- Photo moment prompt display and dismissal

**Integration tests for:**
- Full signing → celebration flow
- Download generates correct content
- Share uses correct URL
- Next steps navigation works

**Accessibility tests for:**
- Screen reader announcement of activation
- Keyboard navigation through celebration
- Reduced-motion fallback
- Color contrast compliance

### Git Commit Pattern

```
feat(Story 6.4): Signing Ceremony Celebration - complete implementation
```

### Dependencies

- Story 6.1 signature infrastructure: DONE
- Story 6.2 parent signing: DONE
- Story 6.3 agreement activation: DONE
- SigningCelebration component: EXISTS (apps/web/src/components/co-creation/signing/SigningCelebration.tsx)
- No external package dependencies (use native browser APIs)

### File Structure

```
apps/web/src/
├── components/co-creation/signing/
│   ├── SigningCelebration.tsx          # Existing (child completion)
│   ├── FamilyCelebration.tsx           # NEW (family completion)
│   ├── NextStepsNavigation.tsx         # NEW (next steps)
│   ├── PhotoMomentPrompt.tsx           # NEW (screenshot suggestion)
│   ├── __tests__/
│   │   ├── FamilyCelebration.test.tsx  # NEW
│   │   ├── NextStepsNavigation.test.tsx # NEW
│   │   └── PhotoMomentPrompt.test.tsx  # NEW
│   └── index.ts                        # Update exports
├── hooks/
│   ├── useAgreementDownload.ts         # NEW
│   └── __tests__/
│       └── useAgreementDownload.test.ts # NEW
```

### References

- [Source: docs/epics/epic-list.md#Story-6.4] - Original acceptance criteria
- [Source: apps/web/src/components/co-creation/signing/SigningCelebration.tsx] - Existing celebration pattern
- [Source: docs/project_context.md] - Implementation patterns (shadcn/ui, Zod types)
- [Source: docs/sprint-artifacts/stories/6-3-agreement-activation.md] - Previous story patterns
- [Source: packages/contracts/src/agreement.schema.ts] - Agreement status types

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - implementation completed successfully without debug issues.

### Completion Notes List

1. **FamilyCelebration Component** - Created new component extending SigningCelebration pattern with:
   - Partnership message "You did this together!"
   - Parent and child name display (supports shared custody)
   - CSS-based confetti animation (60 pieces)
   - Screen reader announcement using role="alert"
   - prefers-reduced-motion support

2. **useAgreementDownload Hook** - Created hook for download/share with:
   - PDF generation via print dialog (no external dependencies)
   - Web Share API with clipboard fallback
   - Audit log creation for download/share events

3. **Photo Moment** - Integrated into FamilyCelebration as screenshot suggestion prompt

4. **Next Steps Navigation** - Integrated into FamilyCelebration with:
   - Device enrollment option (routes to /devices/enroll)
   - Dashboard option (agreement-only path)
   - Child-friendly explanations

5. **Signing Flow Integration** - Updated child signing page to use FamilyCelebration

6. **Accessibility** - All NFR requirements verified:
   - NFR42: ARIA labels on all interactive elements
   - NFR43: Full keyboard navigation
   - NFR45: Color contrast compliance
   - NFR47: Screen reader announcement
   - NFR49: 44x44px touch targets

**Test Summary:** 80 tests passing
- FamilyCelebration: 29 tests
- FamilyCelebration Accessibility: 27 tests
- useAgreementDownload: 13 tests
- Child Signing Page: 11 tests

### File List

**Created:**
- `apps/web/src/components/co-creation/signing/FamilyCelebration.tsx` - Family celebration component
- `apps/web/src/components/co-creation/signing/__tests__/FamilyCelebration.test.tsx` - 29 component tests
- `apps/web/src/components/co-creation/signing/__tests__/FamilyCelebration.accessibility.test.tsx` - 27 accessibility tests
- `apps/web/src/hooks/useAgreementDownload.ts` - Download/share hook
- `apps/web/src/hooks/__tests__/useAgreementDownload.test.ts` - 13 hook tests

**Modified:**
- `apps/web/src/components/co-creation/signing/index.ts` - Added FamilyCelebration export
- `apps/web/src/app/agreements/sign/child/[sessionId]/page.tsx` - Integrated FamilyCelebration
- `apps/web/src/app/agreements/sign/child/[sessionId]/page.test.tsx` - Updated tests for FamilyCelebration
