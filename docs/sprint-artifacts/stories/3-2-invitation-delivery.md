# Story 3.2: Invitation Delivery

**Status:** ready-for-dev

---

## Story

As a **parent**,
I want **to send the co-parent invitation via email**,
So that **my co-parent receives it and can join the family**.

---

## Acceptance Criteria

### AC1: Email Address Entry
**Given** a co-parent invitation has been generated (Story 3.1)
**When** parent wants to send invitation via email
**Then** system displays email input field with validation
**And** email format is validated (RFC 5322 compliant)
**And** input has accessible label "Co-parent's email address"
**And** input meets 44x44px touch target (NFR49)
**And** validation error is at 6th-grade reading level (NFR65)

### AC2: Email Sending
**Given** a valid email address is entered
**When** parent clicks "Send Invitation"
**Then** invitation email is sent via email service
**And** sending state shows loading indicator
**And** success confirmation displays on completion
**And** button is disabled during sending (prevent double-send)

### AC3: Email Content - Subject Line
**Given** an invitation email is being composed
**When** the email is sent
**Then** subject line is: "Join [Family Name] on fledgely"
**And** family name is from the invitation record
**And** subject is clear and professional

### AC4: Email Content - Body
**Given** an invitation email is sent
**When** the recipient receives it
**Then** email explains what fledgely is in simple terms
**And** email includes inviting parent's name (not email)
**And** email includes prominent "Join Family" button with secure link
**And** email includes plain text link as fallback
**And** email does NOT include detailed family data (privacy)
**And** email explains the link expires in [X days/hours]
**And** content is at 6th-grade reading level (NFR65)

### AC5: Secure Join Link
**Given** an invitation email is sent
**When** the email contains the join link
**Then** link format is: `{app_url}/join/{invitationId}?token={secureToken}`
**And** token is the same as generated in Story 3.1
**And** link is single-use (invalidated after acceptance or expiry)
**And** link click is trackable (optional analytics)

### AC6: Copy Link Alternative
**Given** an invitation has been generated
**When** parent prefers to share via other channels (WhatsApp, SMS, etc.)
**Then** "Copy Link" button is prominently displayed
**And** clicking copies full invitation URL to clipboard
**And** "Copied!" feedback shows for 2 seconds
**And** copy action works without sending email
**And** button meets 44x44px touch target (NFR49)

### AC7: Share via Native Share API
**Given** the browser supports Web Share API
**When** parent clicks "Share" button
**Then** native share dialog opens with:
  - Title: "Join my family on fledgely"
  - Text: Brief invitation message
  - URL: Full invitation link
**And** fallback to copy-only on unsupported browsers

### AC8: Email Send Error Handling
**Given** email sending fails
**When** an error occurs
**Then** error message is at 6th-grade reading level (NFR65)
**And** user can retry sending
**And** specific error codes handled:
  - `invalid-email`: "Please enter a valid email address."
  - `email-send-failed`: "Could not send email. Please try again or copy the link."
  - `rate-limited`: "Please wait a moment before sending again."
  - `invitation-expired`: "This invitation has expired. Create a new one."

### AC9: Email Send Audit
**Given** an invitation email is sent
**When** the operation completes
**Then** audit entry is created in family audit log
**And** audit includes: action type, email sent to (masked), timestamp
**And** audit does NOT include the full email address (privacy)
**And** email is masked as: first 2 chars + "***" + "@" + domain
**And** audit is visible to all family guardians

### AC10: Resend Capability
**Given** an invitation exists and email was previously sent
**When** parent wants to resend
**Then** "Resend Email" option is available
**And** resend uses the same invitation link
**And** resend is rate-limited (max 3 sends per hour)
**And** resend creates a new audit entry

### AC11: Accessibility
**Given** a parent using assistive technology
**When** sending an invitation email
**Then** all form elements have proper labels
**And** success/error messages use aria-live regions
**And** send button has accessible name "Send invitation email"
**And** all buttons meet 44x44px minimum (NFR49)
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** keyboard navigation is fully supported (NFR43)

---

## Tasks / Subtasks

### Task 1: Update Invitation Schema for Email Tracking (packages/contracts/src/invitation.schema.ts)
- [ ] 1.1 Add `emailSentTo` field (masked email for audit)
- [ ] 1.2 Add `emailSentAt` field (timestamp of last send)
- [ ] 1.3 Add `emailSendCount` field (for rate limiting)
- [ ] 1.4 Create `sendInvitationEmailInputSchema` for email input validation
- [ ] 1.5 Add email-related error messages at 6th-grade reading level
- [ ] 1.6 Export new types from packages/contracts/src/index.ts
- [ ] 1.7 Write unit tests for new schemas

### Task 2: Create Email Service (apps/web/src/services/emailService.ts)
- [ ] 2.1 Create `sendInvitationEmail(invitationId, email)` function
- [ ] 2.2 Integrate with email provider (Firebase Extensions or SendGrid)
- [ ] 2.3 Implement rate limiting check (max 3 sends/hour per invitation)
- [ ] 2.4 Mask email address for audit storage
- [ ] 2.5 Update invitation document with email send info
- [ ] 2.6 Create audit entry for email send
- [ ] 2.7 Handle email service errors gracefully
- [ ] 2.8 Write unit tests for email service

### Task 3: Create Email Template (apps/web/src/templates/invitation-email.tsx)
- [ ] 3.1 Create React Email template component
- [ ] 3.2 Include fledgely explanation at 6th-grade reading level
- [ ] 3.3 Include inviting parent's name (not email)
- [ ] 3.4 Include prominent "Join Family" CTA button
- [ ] 3.5 Include plain text fallback link
- [ ] 3.6 Include expiry time display
- [ ] 3.7 Apply consistent branding
- [ ] 3.8 Test email rendering across clients

### Task 4: Update useInvitation Hook (apps/web/src/hooks/useInvitation.ts)
- [ ] 4.1 Add `sendEmail(invitationId, email)` function
- [ ] 4.2 Add `emailSending` loading state
- [ ] 4.3 Add `emailSent` success state
- [ ] 4.4 Add `emailError` error state
- [ ] 4.5 Implement idempotency guard for email sending
- [ ] 4.6 Add `resendEmail` function with rate limit check
- [ ] 4.7 Update existing tests
- [ ] 4.8 Write new tests for email functions

### Task 5: Create SendInvitationEmail Component (apps/web/src/components/invitation/SendInvitationEmail.tsx)
- [ ] 5.1 Create form with email input and send button
- [ ] 5.2 Implement email validation (RFC 5322)
- [ ] 5.3 Show loading state during send
- [ ] 5.4 Show success state with confirmation
- [ ] 5.5 Show error state with retry option
- [ ] 5.6 44x44px minimum touch targets (NFR49)
- [ ] 5.7 Accessible form labels and error messages
- [ ] 5.8 aria-live announcements for state changes
- [ ] 5.9 Write component tests

### Task 6: Enhance InvitationLink Component (apps/web/src/components/invitation/InvitationLink.tsx)
- [ ] 6.1 Add "Send via Email" button that opens email form
- [ ] 6.2 Improve copy button visibility
- [ ] 6.3 Add Web Share API integration
- [ ] 6.4 Fallback for browsers without Share API
- [ ] 6.5 Show "Copied!" feedback animation
- [ ] 6.6 Update existing tests
- [ ] 6.7 Write new tests for share functionality

### Task 7: Update InvitationDialog Component (apps/web/src/components/invitation/InvitationDialog.tsx)
- [ ] 7.1 Add email send step to dialog flow
- [ ] 7.2 Add "Send Email" and "Copy Link" options after creation
- [ ] 7.3 Show email sent confirmation
- [ ] 7.4 Add resend option for existing invitations
- [ ] 7.5 Update dialog flow diagram
- [ ] 7.6 Update component tests

### Task 8: Configure Email Provider
- [ ] 8.1 Evaluate Firebase Trigger Email extension vs SendGrid
- [ ] 8.2 Set up email provider configuration
- [ ] 8.3 Configure email templates in provider
- [ ] 8.4 Set up development/staging email testing
- [ ] 8.5 Document email configuration

### Task 9: Write Tests
- [ ] 9.1 Unit tests for email service
- [ ] 9.2 Unit tests for invitation schema updates
- [ ] 9.3 Component tests for SendInvitationEmail
- [ ] 9.4 Component tests for enhanced InvitationLink
- [ ] 9.5 Integration tests for email flow
- [ ] 9.6 Adversarial tests: rate limiting
- [ ] 9.7 Adversarial tests: invalid email handling
- [ ] 9.8 Accessibility tests for new components

---

## Dev Notes

### Critical Requirements

This story implements **FR2: Co-Parent Invitation Delivery** - enabling parents to share invitations via email or link copying.

**CRITICAL PATTERNS:**

1. **Email Privacy** - Email addresses stored masked, never in plain text in audit
2. **Rate Limiting** - Prevent email spam with 3 sends/hour limit per invitation
3. **Copy-First Design** - Copy link should work independently of email sending
4. **Single-Use Link** - Same token from Story 3.1, already single-use

### Architecture Patterns

**Email Service Pattern:**
```typescript
// apps/web/src/services/emailService.ts

import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, collection, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Invitation } from '@fledgely/contracts'

const INVITATIONS_COLLECTION = 'invitations'
const FAMILIES_COLLECTION = 'families'
const AUDIT_COLLECTION = 'audit_log'
const MAX_EMAILS_PER_HOUR = 3

/**
 * Mask email address for audit storage
 * Example: "jane@example.com" -> "ja***@example.com"
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  const masked = localPart.substring(0, 2) + '***'
  return `${masked}@${domain}`
}

/**
 * Check if email send is rate limited
 */
export async function isRateLimited(invitationId: string): Promise<boolean> {
  const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
  const invitationDoc = await getDoc(invitationRef)

  if (!invitationDoc.exists()) return true

  const data = invitationDoc.data()
  const sendCount = data.emailSendCount || 0
  const lastSentAt = data.emailSentAt?.toDate()

  if (!lastSentAt) return false

  // Reset count if last send was more than an hour ago
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (lastSentAt < hourAgo) return false

  return sendCount >= MAX_EMAILS_PER_HOUR
}

/**
 * Send invitation email
 *
 * Story 3.2: Invitation Delivery
 */
export async function sendInvitationEmail(
  invitationId: string,
  email: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Check rate limit
  if (await isRateLimited(invitationId)) {
    return { success: false, error: 'rate-limited' }
  }

  // 2. Get invitation
  const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
  const invitationDoc = await getDoc(invitationRef)

  if (!invitationDoc.exists()) {
    return { success: false, error: 'invitation-not-found' }
  }

  const invitation = invitationDoc.data()

  // 3. Check if expired
  if (invitation.expiresAt.toDate() < new Date()) {
    return { success: false, error: 'invitation-expired' }
  }

  // 4. Verify user is the inviter
  if (invitation.invitedBy !== userId) {
    return { success: false, error: 'not-authorized' }
  }

  // 5. Send email via email provider
  // Option A: Firebase Trigger Email extension
  // Option B: Direct SendGrid API call
  // Option C: Cloud Function trigger

  try {
    // Using Firebase Trigger Email extension pattern:
    const mailRef = doc(collection(db, 'mail'))
    await writeBatch(db)
      .set(mailRef, {
        to: email,
        template: {
          name: 'co-parent-invitation',
          data: {
            familyName: invitation.familyName,
            inviterName: invitation.invitedByName,
            joinLink: `${process.env.NEXT_PUBLIC_APP_URL}/join/${invitationId}?token=${invitation.tokenHash}`,
            expiresAt: invitation.expiresAt.toDate().toLocaleDateString(),
          },
        },
      })
      .commit()

    // 6. Update invitation with email tracking
    const batch = writeBatch(db)

    batch.update(invitationRef, {
      emailSentTo: maskEmail(email),
      emailSentAt: serverTimestamp(),
      emailSendCount: (invitation.emailSendCount || 0) + 1,
    })

    // 7. Create audit entry
    const auditRef = doc(collection(db, FAMILIES_COLLECTION, invitation.familyId, AUDIT_COLLECTION))
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'co_parent_invitation_email_sent',
      performedBy: userId,
      performedAt: serverTimestamp(),
      metadata: {
        invitationId,
        emailSentTo: maskEmail(email),
      },
    })

    await batch.commit()

    return { success: true }
  } catch (error) {
    console.error('Email send failed:', error)
    return { success: false, error: 'email-send-failed' }
  }
}
```

**Email Template Pattern (React Email):**
```typescript
// apps/web/src/templates/invitation-email.tsx

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface InvitationEmailProps {
  familyName: string
  inviterName: string
  joinLink: string
  expiresAt: string
}

export function InvitationEmail({
  familyName,
  inviterName,
  joinLink,
  expiresAt,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Join {familyName} on fledgely</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You're Invited!</Heading>

          <Text style={text}>
            {inviterName} has invited you to join {familyName} on fledgely.
          </Text>

          <Text style={text}>
            Fledgely helps parents manage their children's digital lives together.
            By joining, you'll be able to:
          </Text>

          <ul style={list}>
            <li>See and manage family agreements</li>
            <li>View children's activity</li>
            <li>Make decisions together as co-parents</li>
          </ul>

          <Section style={buttonContainer}>
            <Button style={button} href={joinLink}>
              Join Family
            </Button>
          </Section>

          <Text style={smallText}>
            Or copy this link: {joinLink}
          </Text>

          <Text style={expiryText}>
            This invitation expires on {expiresAt}.
          </Text>

          <Text style={footer}>
            If you weren't expecting this invitation, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles...
const main = { backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '560px' }
const h1 = { color: '#333', fontSize: '24px', fontWeight: 'bold' }
const text = { color: '#333', fontSize: '16px', lineHeight: '24px' }
const list = { color: '#333', fontSize: '16px', lineHeight: '28px' }
const buttonContainer = { textAlign: 'center' as const, margin: '32px 0' }
const button = {
  backgroundColor: '#5469d4',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}
const smallText = { color: '#666', fontSize: '12px' }
const expiryText = { color: '#666', fontSize: '14px', fontStyle: 'italic' }
const footer = { color: '#8898aa', fontSize: '12px', marginTop: '32px' }
```

**Updated Invitation Schema:**
```typescript
// Add to packages/contracts/src/invitation.schema.ts

/**
 * Extended invitation schema with email tracking
 */
export const invitationWithEmailSchema = invitationSchema.extend({
  /** Masked email address (for audit display) */
  emailSentTo: z.string().nullable().optional(),

  /** When invitation email was last sent */
  emailSentAt: z.date().nullable().optional(),

  /** Number of times email was sent (for rate limiting) */
  emailSendCount: z.number().int().nonnegative().default(0),
})

export type InvitationWithEmail = z.infer<typeof invitationWithEmailSchema>

/**
 * Input schema for sending invitation email
 */
export const sendInvitationEmailInputSchema = z.object({
  invitationId: z.string().min(1, 'Invitation ID is required'),
  email: z.string().email('Please enter a valid email address'),
})

export type SendInvitationEmailInput = z.infer<typeof sendInvitationEmailInputSchema>

/**
 * Email-related error messages at 6th-grade reading level (NFR65)
 */
export const EMAIL_ERROR_MESSAGES: Record<string, string> = {
  'invalid-email': 'Please enter a valid email address.',
  'email-send-failed': 'Could not send email. Please try again or copy the link.',
  'rate-limited': 'Please wait a moment before sending again.',
  'invitation-expired': 'This invitation has expired. Create a new one.',
  'invitation-not-found': 'Could not find this invitation.',
  'not-authorized': 'You can only send emails for your own invitations.',
  default: 'Something went wrong. Please try again.',
}

export function getEmailErrorMessage(code: string): string {
  return EMAIL_ERROR_MESSAGES[code] || EMAIL_ERROR_MESSAGES.default
}
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| INV-001 | Types from Zod only | All schemas with z.infer<> |
| INV-002 | Direct Firestore SDK | writeBatch, doc directly |
| INV-003 | Cross-family isolation | Security rules verify guardian status |
| NFR42 | WCAG 2.1 AA | Accessible forms, aria-live announcements |
| NFR43 | Keyboard accessible | All elements tab-navigable |
| NFR45 | 4.5:1 color contrast | Use existing design system |
| NFR49 | 44x44px touch targets | Buttons and inputs sized appropriately |
| NFR65 | 6th-grade reading level | Simple email content and error messages |

### Previous Story Intelligence

**Story 3.1 Patterns to Reuse:**
1. InvitationLink component already has copy-to-clipboard functionality
2. InvitationDialog multi-step flow pattern
3. useInvitation hook state management
4. Audit trail pattern for family operations
5. Error handling with user-friendly messages

**Key Additions for Story 3.2:**
- Email sending capability with rate limiting
- Email template with fledgely explanation
- Masked email storage for privacy
- Web Share API integration

**Files from Story 3.1 to Extend:**
- `packages/contracts/src/invitation.schema.ts` - Add email fields
- `apps/web/src/hooks/useInvitation.ts` - Add email functions
- `apps/web/src/components/invitation/InvitationLink.tsx` - Add share button
- `apps/web/src/components/invitation/InvitationDialog.tsx` - Add email step

### Email Provider Decision

**Option A: Firebase Trigger Email Extension**
- Pros: Simple setup, managed infrastructure, good for transactional emails
- Cons: Less customization, depends on extension availability
- Setup: Install extension, configure SMTP, use mail collection

**Option B: SendGrid Direct Integration**
- Pros: Full control, rich templates, analytics, deliverability tools
- Cons: Another service dependency, requires API key management
- Setup: Create SendGrid account, get API key, use SDK

**Option C: Resend (Modern Alternative)**
- Pros: Developer-friendly, React Email compatible, good DX
- Cons: Newer service, fewer features than SendGrid
- Setup: Simple API, works well with Next.js

**Recommendation:** Start with Firebase Trigger Email extension for simplicity. Can migrate to SendGrid/Resend later if needed.

### Dependencies

**Already Installed (from Story 3.1):**
- `firebase` (in apps/web)
- `zod` (in packages/contracts)
- `uuid` (in apps/web)
- shadcn/ui components (in apps/web)

**Check/Install:**
```bash
# For React Email templates (optional but recommended)
cd apps/web && npm install @react-email/components

# For SendGrid (if choosing Option B)
npm install @sendgrid/mail
```

### File Structure

**Files to Create:**
```
apps/web/src/services/emailService.ts
apps/web/src/services/emailService.test.ts
apps/web/src/templates/invitation-email.tsx
apps/web/src/templates/invitation-email.test.tsx
apps/web/src/components/invitation/SendInvitationEmail.tsx
apps/web/src/components/invitation/SendInvitationEmail.test.tsx
```

**Files to Modify:**
```
packages/contracts/src/invitation.schema.ts      # Add email tracking fields
packages/contracts/src/invitation.schema.test.ts # Add email schema tests
packages/contracts/src/index.ts                  # Export new types
apps/web/src/hooks/useInvitation.ts              # Add email functions
apps/web/src/hooks/useInvitation.test.ts         # Add email tests
apps/web/src/components/invitation/InvitationLink.tsx      # Add share button
apps/web/src/components/invitation/InvitationLink.test.tsx # Add share tests
apps/web/src/components/invitation/InvitationDialog.tsx    # Add email step
apps/web/src/components/invitation/InvitationDialog.test.tsx # Update tests
```

### Important Considerations

1. **Email Privacy**: Never store full email addresses in audit logs - always mask them.

2. **Rate Limiting**: The 3 sends/hour limit prevents abuse. Reset counter after an hour.

3. **Copy-First UX**: Ensure copy link works perfectly, as some users prefer WhatsApp/SMS.

4. **Email Deliverability**: Test with multiple email providers (Gmail, Outlook, Yahoo).

5. **Fallback Design**: If email fails, copy link should always work.

6. **Token Security**: The invitation token is already generated and hashed in Story 3.1. Use the same token in the email link.

### Story 3.1 Prerequisite

This story depends on Story 3.1 being complete:
- Invitation creation with secure token
- InvitationLink component with copy functionality
- InvitationDialog component
- useInvitation hook
- Invitation schema and service

---

## References

- [Source: docs/epics/epic-list.md#Story-3.2] - Original story requirements
- [Source: docs/epics/epic-list.md#Epic-3] - Epic context
- [Source: docs/sprint-artifacts/stories/3-1-co-parent-invitation-generation.md] - Story 3.1 patterns
- [Source: packages/contracts/src/invitation.schema.ts] - Invitation schema
- [Source: apps/web/src/components/invitation/InvitationLink.tsx] - Copy functionality

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/3-2-invitation-delivery.md
- Epic context: Epic 3 - Co-Parent Invitation & Family Sharing
- Previous story: Story 3.1 - Co-Parent Invitation Generation (completed)
- Related stories: Story 3.3 (Invitation Acceptance)

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change | Files |
|------|--------|-------|
