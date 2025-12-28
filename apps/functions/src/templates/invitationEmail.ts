/**
 * Email template for co-parent invitations.
 *
 * Generates HTML email content that:
 * - Explains what fledgely is (AC3)
 * - Explains what joining means (AC3)
 * - Includes inviter name prominently (AC3)
 * - Does NOT include detailed family data like child names (AC3)
 * - Contains a clear call-to-action button (AC3)
 */

export interface InvitationEmailParams {
  inviterName: string
  familyName: string
  joinLink: string
}

/**
 * Escape HTML special characters to prevent XSS.
 * Used for user-provided content in email templates.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate HTML content for the invitation email.
 *
 * The email uses inline styles for maximum email client compatibility.
 * Colors use the fledgely brand purple (#7c3aed) for the CTA button.
 */
export function generateInvitationEmailHtml(params: InvitationEmailParams): string {
  // Escape user-provided content to prevent XSS
  const safeInviterName = escapeHtml(params.inviterName)
  const safeFamilyName = escapeHtml(params.familyName)
  const safeJoinLink = escapeHtml(params.joinLink)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${safeFamilyName} on fledgely</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <div style="width: 64px; height: 64px; background-color: #ede9fe; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; color: #7c3aed;">+</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                You're invited to join ${safeFamilyName}
              </h1>
            </td>
          </tr>

          <!-- Invitation message -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                <strong>${safeInviterName}</strong> has invited you to be a co-parent on fledgely.
              </p>
            </td>
          </tr>

          <!-- What is fledgely section -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
                What is fledgely?
              </h2>
              <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                fledgely is a family-centered digital safety tool that helps parents work together to support their children's healthy technology use. It's built on trust, transparency, and collaboration between parents and children.
              </p>
            </td>
          </tr>

          <!-- What does joining mean section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
                What does joining mean?
              </h2>
              <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                As a co-parent, you'll have equal access to family settings and share responsibility for guiding your children's digital experience. Both parents see the same information and have equal decision-making power.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${safeJoinLink}" style="display: inline-block; padding: 16px 40px; background-color: #7c3aed; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background-color 0.2s;">
                Accept Invitation
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 20px 0 0 0; font-size: 13px; color: #9ca3af; line-height: 1.5; text-align: center;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 13px; color: #9ca3af; line-height: 1.5; text-align: center;">
                <a href="${safeJoinLink}" style="color: #7c3aed; text-decoration: none; word-break: break-all;">
                  ${safeJoinLink}
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

/**
 * Generate plain text version of the invitation email.
 * Used as fallback for email clients that don't support HTML.
 */
export function generateInvitationEmailText(params: InvitationEmailParams): string {
  const { inviterName, familyName, joinLink } = params

  return `
You're invited to join ${familyName} on fledgely

${inviterName} has invited you to be a co-parent on fledgely.

WHAT IS FLEDGELY?
fledgely is a family-centered digital safety tool that helps parents work together to support their children's healthy technology use. It's built on trust, transparency, and collaboration between parents and children.

WHAT DOES JOINING MEAN?
As a co-parent, you'll have equal access to family settings and share responsibility for guiding your children's digital experience. Both parents see the same information and have equal decision-making power.

ACCEPT INVITATION:
${joinLink}

This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
`.trim()
}
