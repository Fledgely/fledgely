# Story 3.2: Invitation Delivery

Status: done

## Story

As a **parent**,
I want **to send the co-parent invitation via email**,
So that **my co-parent receives it and can join the family**.

## Acceptance Criteria

1. **AC1: Email Entry Interface**
   - Given a co-parent invitation has been generated
   - When parent views the invitation modal
   - Then they see an email input field
   - And the field validates email format before submission

2. **AC2: Invitation Email Sending**
   - Given parent enters co-parent's email address
   - When they submit the invitation
   - Then invitation email is sent with secure join link
   - And email subject is clear: "Join [Family Name] on fledgely"

3. **AC3: Email Content Requirements**
   - Given an invitation email is sent
   - When co-parent receives it
   - Then email explains what fledgely is briefly
   - And email explains what joining means (co-managing family)
   - And email includes inviting parent's name
   - And email does NOT include detailed family data (child names, etc.)
   - And email contains a call-to-action button to join

4. **AC4: Secure Join Link**
   - Given an invitation email is sent
   - When co-parent receives the email
   - Then the join link contains the secure token from Story 3.1
   - And the link is single-use (invalidated after use or expiry)
   - And the link expires after 7 days (per Story 3.1)

5. **AC5: Alternative Sharing (Copy Link)**
   - Given a parent has generated an invitation
   - When they view the invitation modal
   - Then they can copy the secure join link to clipboard
   - And they see confirmation that link was copied
   - And they can share via other channels (WhatsApp, SMS, etc.)

6. **AC6: Email Sending Error Handling**
   - Given parent attempts to send invitation email
   - When email sending fails
   - Then user sees friendly error message
   - And they can retry sending
   - And the copy link option remains available as fallback

7. **AC7: Accessibility**
   - Given the invitation delivery flow
   - When navigating with assistive technology
   - Then all elements are keyboard accessible (NFR43)
   - And touch targets are 44px minimum (NFR49)
   - And focus indicators are visible (NFR46)
   - And form errors are announced to screen readers

## Tasks / Subtasks

- [x] Task 1: Create Email Service Infrastructure (AC: #2, #6)
  - [x] 1.1 Add Resend package to functions dependencies
  - [x] 1.2 Create apps/functions/src/services/emailService.ts
  - [x] 1.3 Implement sendInvitationEmail function with error handling
  - [x] 1.4 Create email template with fledgely branding

- [x] Task 2: Create Send Invitation Cloud Function (AC: #2, #3, #4)
  - [x] 2.1 Create apps/functions/src/callable/sendInvitation.ts
  - [x] 2.2 Validate invitation exists and is pending
  - [x] 2.3 Validate email format
  - [x] 2.4 Call email service to send invitation
  - [x] 2.5 Update invitation document with email sent timestamp
  - [x] 2.6 Export function in apps/functions/src/index.ts

- [x] Task 3: Create Invitation Email Template (AC: #3)
  - [x] 3.1 Create apps/functions/src/templates/invitationEmail.ts
  - [x] 3.2 Include fledgely explanation (what it is)
  - [x] 3.3 Include what joining means (co-managing)
  - [x] 3.4 Include inviter name prominently
  - [x] 3.5 Exclude detailed family data (child names)
  - [x] 3.6 Add clear call-to-action button with join link

- [x] Task 4: Update Invitation Modal UI (AC: #1, #5, #7)
  - [x] 4.1 Add email input field to InviteCoParentModal
  - [x] 4.2 Add email format validation
  - [x] 4.3 Add "Send Invitation" button
  - [x] 4.4 Add "Copy Link" button with clipboard API
  - [x] 4.5 Show copy success feedback
  - [x] 4.6 Ensure 44px touch targets
  - [x] 4.7 Add focus indicators and ARIA attributes

- [x] Task 5: Create Client-Side Send Invitation Service (AC: #2, #6)
  - [x] 5.1 Add sendInvitationEmail function to invitationService.ts
  - [x] 5.2 Call Cloud Function using httpsCallable
  - [x] 5.3 Handle errors with user-friendly messages
  - [x] 5.4 Return success/failure status

- [x] Task 6: Update Invitation Schema (AC: #2)
  - [x] 6.1 Add emailSentAt optional field to invitationSchema
  - [x] 6.2 Add recipientEmail optional field to invitationSchema

- [x] Task 7: Add Unit Tests (AC: All)
  - [x] 7.1 Test email template generation
  - [x] 7.2 Test email validation
  - [x] 7.3 Test sendInvitationEmail service function
  - [x] 7.4 Test copy-to-clipboard UI interaction

## Dev Notes

### Technical Requirements

- **Email Provider:** Resend (recommended for transactional email with good deliverability)
- **Cloud Functions:** Firebase Cloud Functions v2 for email sending
- **Schema Source:** @fledgely/shared/contracts (Zod schemas - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Functions Pattern:** Thin function → service delegation (Unbreakable Rule #5)

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - extend invitationSchema for new fields
- "Firebase SDK Direct" - use `httpsCallable()` for client-side calls
- "Functions Delegate to Services" - emailService.ts handles sending logic

### Email Service Pattern

```typescript
// apps/functions/src/services/emailService.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendInvitationEmail(params: {
  to: string
  inviterName: string
  familyName: string
  joinLink: string
}): Promise<void> {
  await resend.emails.send({
    from: 'fledgely <noreply@fledgely.com>',
    to: params.to,
    subject: `Join ${params.familyName} on fledgely`,
    html: generateInvitationEmailHtml(params),
  })
}
```

### Email Template Structure

```typescript
// apps/functions/src/templates/invitationEmail.ts
export function generateInvitationEmailHtml(params: {
  inviterName: string
  familyName: string
  joinLink: string
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>You're invited to join ${params.familyName}</h1>
      <p>${params.inviterName} has invited you to be a co-parent on fledgely.</p>

      <h2>What is fledgely?</h2>
      <p>fledgely is a family-centered digital safety tool that helps parents
         work together to support their children's healthy technology use.</p>

      <h2>What does joining mean?</h2>
      <p>As a co-parent, you'll have equal access to family settings and
         share responsibility for guiding your children's digital experience.</p>

      <a href="${params.joinLink}" style="
        display: inline-block;
        padding: 16px 32px;
        background-color: #7c3aed;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
      ">
        Accept Invitation
      </a>

      <p style="color: #666; font-size: 14px;">
        This invitation expires in 7 days. If you didn't expect this email,
        you can safely ignore it.
      </p>
    </div>
  `
}
```

### Cloud Function Pattern

```typescript
// apps/functions/src/callable/sendInvitation.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { sendInvitationEmailSchema } from '@fledgely/contracts'
import { emailService } from '../services/emailService'
import { verifyAuth } from '../shared/auth'

export const sendInvitation = onCall(async (request) => {
  // 1. Auth
  const user = verifyAuth(request.auth)

  // 2. Validation
  const input = sendInvitationEmailSchema.safeParse(request.data)
  if (!input.success) {
    throw new HttpsError('invalid-argument', 'Invalid input')
  }

  // 3. Permission - verify user is inviter
  // 4. Business logic via service
  return emailService.sendInvitationEmail(input.data)
})
```

### Important: Epic 3A Dependency

Email sending is available even while Epic 3A safeguards are not ready, but invitation creation is still blocked by Story 3.1's `checkEpic3ASafeguards()`. This means:

1. Email sending infrastructure is built
2. Copy link feature works for any pending invitation
3. Actual invitation creation remains blocked until Epic 3A

### Library/Framework Requirements

| Dependency | Version | Purpose                          |
| ---------- | ------- | -------------------------------- |
| resend     | ^3.x    | Transactional email sending      |
| firebase   | ^10.x   | Firebase SDK (already installed) |
| zod        | ^3.x    | Schema validation                |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                         # UPDATE - Add sendInvitationEmailSchema

apps/functions/
├── package.json                     # UPDATE - Add resend dependency
├── src/
│   ├── index.ts                     # UPDATE - Export sendInvitation
│   ├── callable/
│   │   └── sendInvitation.ts        # NEW - Cloud function
│   ├── services/
│   │   └── emailService.ts          # NEW - Email sending service
│   ├── templates/
│   │   └── invitationEmail.ts       # NEW - Email template
│   └── shared/
│       └── auth.ts                  # UPDATE if needed - Auth verification

apps/web/src/
├── services/
│   └── invitationService.ts         # UPDATE - Add sendInvitationEmail
└── components/
    └── InviteCoParentModal.tsx      # UPDATE - Add email input and copy link
```

### Testing Requirements

- Unit test email template HTML generation
- Unit test email format validation
- Unit test Cloud Function input validation
- Test clipboard API interaction in modal
- Test error handling for email sending failures

### Previous Story Intelligence (Story 3.1)

From Story 3.1 completion:

- Invitation schema created with token, expiresAt, status fields
- InviteCoParentModal component exists with focus trap
- invitationService.ts has getPendingInvitation, createInvitation, revokeInvitation
- checkEpic3ASafeguards() blocks invitation creation for MVP
- Firestore security rules for invitations collection

**Key Pattern to Follow:**

```typescript
// Modal already has this pattern
interface InviteCoParentModalProps {
  family: Family
  isOpen: boolean
  onClose: () => void
  currentUserUid: string
}

// Extend with email input state
const [email, setEmail] = useState('')
const [sending, setSending] = useState(false)
const [emailError, setEmailError] = useState<string | null>(null)
```

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-3.2]
- [Source: docs/epics/epic-list.md#Story-3.1]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/project_context.md#Cloud-Functions-Template]

## Dev Agent Record

### Context Reference

- Epic: 3 (Co-Parent Invitation & Family Sharing)
- Sprint: 2 (Feature Development)
- Story Key: 3-2-invitation-delivery
- Depends On: Story 3.1 (Invitation Generation - completed)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Build passes with all new files
- Lint passes with no errors
- All tests pass (32 tests total: 18 functions, 14 web)

### Completion Notes List

1. Created Email Service Infrastructure:
   - Added resend ^3.2.0 and zod ^3.23.0 to functions dependencies
   - Created emailService.ts with sendInvitationEmail and isValidEmail functions
   - Handles Resend API errors with user-friendly messages

2. Created Invitation Email Template:
   - Full HTML email with responsive design
   - Explains what fledgely is and what joining means (AC3)
   - Includes inviter name prominently
   - Does NOT include child names or detailed family data
   - Call-to-action button with join link
   - Plain text fallback version

3. Created Send Invitation Cloud Function:
   - Following Cloud Functions Template pattern (Auth → Validation → Permission → Business Logic)
   - Validates invitation exists, is pending, and not expired
   - Verifies user is the inviter
   - Calls email service and updates invitation with recipientEmail and emailSentAt
   - Exported in index.ts with Firebase Admin SDK initialization

4. Updated Invitation Schema:
   - Added recipientEmail (string email nullable)
   - Added emailSentAt (date nullable)
   - Added sendInvitationEmailSchema for Cloud Function input validation

5. Updated Invitation Modal UI:
   - Email input field with validation (AC1)
   - Send Invitation Email button
   - Copy Link button with clipboard API (AC5)
   - Success and error feedback
   - Focus trap includes input field
   - All touch targets 44px minimum (AC7)
   - ARIA attributes for screen reader support

6. Created Client-Side Send Invitation Service:
   - sendInvitationEmail function using httpsCallable
   - isValidEmail function for email validation
   - getInvitationLink function for generating join URLs
   - User-friendly error messages (AC6)

7. Updated Firebase initialization:
   - Added getFirebaseFunctions to firebase.ts
   - Emulator connection for development

8. Added Unit Tests:
   - 15 tests for email template generation
   - 3 tests for email validation in emailService
   - 14 tests in invitationService.test.ts including new schema fields

### File List

- apps/functions/package.json (MODIFIED - added resend, zod)
- apps/functions/src/index.ts (MODIFIED - Firebase Admin init, export sendInvitation)
- apps/functions/src/callable/sendInvitation.ts (NEW - Cloud Function)
- apps/functions/src/callable/sendInvitation.test.ts (NEW - Cloud Function tests)
- apps/functions/src/services/emailService.ts (NEW - Email service)
- apps/functions/src/services/emailService.test.ts (NEW - Tests)
- apps/functions/src/templates/invitationEmail.ts (NEW - Email template with XSS protection)
- apps/functions/src/templates/invitationEmail.test.ts (NEW - Tests including XSS escaping)
- apps/functions/src/shared/auth.ts (NEW - Auth utilities)
- apps/web/src/lib/firebase.ts (MODIFIED - added getFirebaseFunctions)
- apps/web/src/services/invitationService.ts (MODIFIED - added email functions)
- apps/web/src/services/invitationService.test.ts (MODIFIED - added new tests)
- apps/web/src/components/InviteCoParentModal.tsx (MODIFIED - email UI, copy link)
- apps/web/src/components/InviteCoParentModal.test.tsx (NEW - clipboard and accessibility tests)
- packages/shared/src/contracts/index.ts (MODIFIED - schema fields)

## Change Log

| Date       | Change                                          |
| ---------- | ----------------------------------------------- |
| 2025-12-28 | Story created (drafted)                         |
| 2025-12-28 | Implementation complete - ready for code review |
| 2025-12-28 | Code review complete - all issues fixed         |
