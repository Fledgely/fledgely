/**
 * Email template for caregiver invitations.
 *
 * Generates HTML email content that:
 * - Explains what fledgely is (AC3)
 * - Explains what "Status Viewer" access means
 * - Includes inviter name prominently
 * - Does NOT include detailed family data like child names
 * - Contains a clear call-to-action button
 * - Uses large, clear UI suitable for older adults (NFR49)
 *
 * Story 19D.1
 */

export interface CaregiverInvitationEmailParams {
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
 * Generate HTML content for the caregiver invitation email.
 *
 * The email uses inline styles for maximum email client compatibility.
 * Colors use the fledgely brand purple (#7c3aed) for the CTA button.
 * Font sizes are larger for accessibility (NFR49).
 */
export function generateCaregiverInvitationEmailHtml(
  params: CaregiverInvitationEmailParams
): string {
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
  <title>View ${safeFamilyName}'s status on fledgely</title>
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
                <span style="font-size: 32px; color: #7c3aed;">👀</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                You can now view ${safeFamilyName}'s status
              </h1>
            </td>
          </tr>

          <!-- Invitation message -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 18px; color: #4b5563; line-height: 1.6;">
                <strong>${safeInviterName}</strong> has invited you to see how their family is doing on fledgely.
              </p>
            </td>
          </tr>

          <!-- What is fledgely section -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1f2937;">
                What is fledgely?
              </h2>
              <p style="margin: 0; font-size: 17px; color: #6b7280; line-height: 1.6;">
                fledgely helps families manage screen time together. Parents and children work as a team to build healthy technology habits.
              </p>
            </td>
          </tr>

          <!-- What you can see section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1f2937;">
                What can you see?
              </h2>
              <p style="margin: 0; font-size: 17px; color: #6b7280; line-height: 1.6;">
                As a status viewer, you can check in on how the children are doing with their screen time. You will see simple status updates like "on track" or "needs attention" - just enough to stay connected.
              </p>
            </td>
          </tr>

          <!-- CTA Button - Large for accessibility -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${safeJoinLink}" style="display: inline-block; padding: 20px 48px; background-color: #7c3aed; color: #ffffff; font-size: 18px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background-color 0.2s;">
                Accept Invitation
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 20px 0 0 0; font-size: 15px; color: #9ca3af; line-height: 1.5; text-align: center;">
                This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 15px; color: #9ca3af; line-height: 1.5; text-align: center;">
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
 * Generate plain text version of the caregiver invitation email.
 * Used as fallback for email clients that don't support HTML.
 */
export function generateCaregiverInvitationEmailText(
  params: CaregiverInvitationEmailParams
): string {
  const { inviterName, familyName, joinLink } = params

  return `
You can now view ${familyName}'s status on fledgely

${inviterName} has invited you to see how their family is doing on fledgely.

WHAT IS FLEDGELY?
fledgely helps families manage screen time together. Parents and children work as a team to build healthy technology habits.

WHAT CAN YOU SEE?
As a status viewer, you can check in on how the children are doing with their screen time. You will see simple status updates like "on track" or "needs attention" - just enough to stay connected.

ACCEPT INVITATION:
${joinLink}

This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
`.trim()
}
