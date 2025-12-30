/**
 * Safety Resource Email Template
 *
 * Story 0.5.9: Domestic Abuse Resource Referral
 *
 * CRITICAL SAFETY DESIGN:
 * - NO fledgely branding or references
 * - NO mention of "escape", "abuse", "safety" in subject
 * - Neutral subject line ("Important Resources")
 * - Generic resource information only
 * - Error disclaimer included
 * - Sent to safe contact email (not account email)
 *
 * This email is sent automatically after a successful escape action
 * to provide victims with immediate access to safety resources.
 */

/**
 * National hotlines and resources.
 * These are US-based resources for the MVP.
 */
export const SAFETY_RESOURCES = {
  hotlines: [
    {
      name: 'National Hotline',
      number: '1-800-799-7233',
      description: 'Available 24/7',
    },
    {
      name: 'Crisis Text Line',
      number: 'Text HOME to 741741',
      description: 'Free text support',
    },
    {
      name: 'Childhelp National Hotline',
      number: '1-800-422-4453',
      description: 'Available 24/7',
    },
    {
      name: 'National Sexual Assault Hotline',
      number: '1-800-656-4673',
      description: 'RAINN support line',
    },
  ],
  safetyPlanningLinks: [
    {
      url: 'thehotline.org/plan-for-safety',
      description: 'Safety planning guide',
    },
    {
      url: 'loveisrespect.org/personal-safety/safety-planning',
      description: 'Personal safety planning',
    },
  ],
  legalAidLinks: [
    {
      url: 'lawhelp.org',
      description: 'Find free legal aid',
    },
    {
      url: 'lsc.gov/what-legal-aid/find-legal-aid',
      description: 'Legal services directory',
    },
  ],
} as const

/**
 * Subject line for safety resource email.
 *
 * CRITICAL: Must NOT mention fledgely, escape, abuse, or safety.
 * Uses neutral language that won't raise suspicion if seen by abuser.
 */
export const SAFETY_RESOURCE_EMAIL_SUBJECT = 'Important Resources'

/**
 * Error disclaimer text included in all resource emails.
 */
export const ERROR_DISCLAIMER = 'If this email was sent in error, you can safely ignore it.'

/**
 * Generate HTML content for the safety resource email.
 *
 * CRITICAL: No fledgely branding, logos, or references.
 * Uses minimal, generic styling for discretion.
 */
export function generateSafetyResourceEmailHtml(): string {
  const hotlinesHtml = SAFETY_RESOURCES.hotlines
    .map(
      (h) => `
      <tr>
        <td style="padding: 8px 0;">
          <strong style="color: #1f2937;">${h.name}</strong><br>
          <span style="font-size: 16px; color: #374151;">${h.number}</span>
          <span style="font-size: 13px; color: #6b7280;"> - ${h.description}</span>
        </td>
      </tr>`
    )
    .join('')

  const safetyLinksHtml = SAFETY_RESOURCES.safetyPlanningLinks
    .map(
      (l) => `
      <tr>
        <td style="padding: 4px 0;">
          <a href="https://www.${l.url}" style="color: #2563eb; text-decoration: none;">${l.url}</a>
          <span style="font-size: 13px; color: #6b7280;"> - ${l.description}</span>
        </td>
      </tr>`
    )
    .join('')

  const legalLinksHtml = SAFETY_RESOURCES.legalAidLinks
    .map(
      (l) => `
      <tr>
        <td style="padding: 4px 0;">
          <a href="https://www.${l.url}" style="color: #2563eb; text-decoration: none;">${l.url}</a>
          <span style="font-size: 13px; color: #6b7280;"> - ${l.description}</span>
        </td>
      </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Important Resources</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">
                Important Resources
              </h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                If you need support, these resources are available 24/7.
              </p>
            </td>
          </tr>

          <!-- Immediate Help Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; text-transform: uppercase; letter-spacing: 0.5px;">
                Immediate Help
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                ${hotlinesHtml}
              </table>
            </td>
          </tr>

          <!-- Safety Planning Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; text-transform: uppercase; letter-spacing: 0.5px;">
                Safety Planning
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                ${safetyLinksHtml}
              </table>
            </td>
          </tr>

          <!-- Legal Help Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; text-transform: uppercase; letter-spacing: 0.5px;">
                Legal Help
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                ${legalLinksHtml}
              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                ${ERROR_DISCLAIMER}
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
 * Generate plain text version of the safety resource email.
 *
 * CRITICAL: No fledgely references. Plain text for maximum compatibility.
 */
export function generateSafetyResourceEmailText(): string {
  const hotlinesText = SAFETY_RESOURCES.hotlines
    .map((h) => `- ${h.name}: ${h.number} (${h.description})`)
    .join('\n')

  const safetyLinksText = SAFETY_RESOURCES.safetyPlanningLinks
    .map((l) => `- ${l.url} - ${l.description}`)
    .join('\n')

  const legalLinksText = SAFETY_RESOURCES.legalAidLinks
    .map((l) => `- ${l.url} - ${l.description}`)
    .join('\n')

  return `
Important Resources

If you need support, these resources are available 24/7.

IMMEDIATE HELP
${hotlinesText}

SAFETY PLANNING
${safetyLinksText}

LEGAL HELP
${legalLinksText}

${ERROR_DISCLAIMER}
`.trim()
}

/**
 * Check if the email content contains words that would identify it as
 * coming from fledgely or reveal the escape action.
 *
 * CRITICAL: This checks for words that would connect the email back to
 * fledgely or reveal the escape action. Legitimate hotline names like
 * "National Child Abuse Hotline" are acceptable since they are proper
 * nouns for real resources.
 *
 * Words that MUST NOT appear:
 * - fledgely (would identify the source)
 * - escape/escaped (would reveal the action)
 * - victim (sensitive terminology)
 * - abuser (sensitive terminology)
 *
 * Acceptable in context:
 * - abuse (part of hotline names like "National Child Abuse Hotline")
 * - domestic violence (part of hotline names)
 * - safety (part of section headers and resource names)
 */
export function containsSensitiveWords(content: string): boolean {
  // Words that MUST NOT appear as they identify the source or action
  const forbiddenWords = ['fledgely', 'escape', 'escaped', 'victim', 'abuser']
  const lowerContent = content.toLowerCase()
  return forbiddenWords.some((word) => lowerContent.includes(word))
}
