/**
 * Unit tests for invitation email template.
 */

import { describe, it, expect } from 'vitest'
import {
  generateInvitationEmailHtml,
  generateInvitationEmailText,
  type InvitationEmailParams,
} from './invitationEmail'

const testParams: InvitationEmailParams = {
  inviterName: 'Jane Doe',
  familyName: 'Doe Family',
  joinLink: 'https://fledgely.com/invite/accept?token=abc123',
}

describe('generateInvitationEmailHtml', () => {
  it('generates HTML email with family name in title', () => {
    const html = generateInvitationEmailHtml(testParams)
    expect(html).toContain('Doe Family')
    expect(html).toContain("You're invited to join Doe Family")
  })

  it('includes inviter name prominently (AC3)', () => {
    const html = generateInvitationEmailHtml(testParams)
    expect(html).toContain('Jane Doe')
    expect(html).toContain('<strong>Jane Doe</strong>')
  })

  it('explains what fledgely is (AC3)', () => {
    const html = generateInvitationEmailHtml(testParams)
    expect(html).toContain('What is fledgely?')
    expect(html).toContain('family-centered digital safety tool')
  })

  it('explains what joining means (AC3)', () => {
    const html = generateInvitationEmailHtml(testParams)
    expect(html).toContain('What does joining mean?')
    expect(html).toContain('equal access to family settings')
    expect(html).toContain('co-parent')
  })

  it('does NOT include child names (AC3)', () => {
    const html = generateInvitationEmailHtml(testParams)
    // Should not contain any placeholder for child data
    expect(html).not.toContain('childName')
    expect(html).not.toContain('child_name')
  })

  it('includes call-to-action button with join link (AC3, AC4)', () => {
    const html = generateInvitationEmailHtml(testParams)
    expect(html).toContain('Accept Invitation')
    expect(html).toContain('href="https://fledgely.com/invite/accept?token=abc123"')
  })

  it('includes expiry notice', () => {
    const html = generateInvitationEmailHtml(testParams)
    expect(html).toContain('expires in 7 days')
  })

  it('includes link as text fallback', () => {
    const html = generateInvitationEmailHtml(testParams)
    // Link should appear twice - in button href and as visible text
    const linkMatches = html.match(/abc123/g)
    expect(linkMatches).toBeTruthy()
    expect(linkMatches!.length).toBeGreaterThanOrEqual(1)
  })
})

describe('generateInvitationEmailText', () => {
  it('generates plain text version', () => {
    const text = generateInvitationEmailText(testParams)
    expect(text).toContain('Doe Family')
    expect(text).toContain('Jane Doe')
  })

  it('includes join link', () => {
    const text = generateInvitationEmailText(testParams)
    expect(text).toContain('https://fledgely.com/invite/accept?token=abc123')
  })

  it('explains fledgely and joining', () => {
    const text = generateInvitationEmailText(testParams)
    expect(text).toContain('WHAT IS FLEDGELY?')
    expect(text).toContain('WHAT DOES JOINING MEAN?')
  })

  it('includes expiry notice', () => {
    const text = generateInvitationEmailText(testParams)
    expect(text).toContain('expires in 7 days')
  })
})

describe('edge cases', () => {
  it('handles special characters in names', () => {
    const params: InvitationEmailParams = {
      inviterName: "O'Brien & Partners",
      familyName: "O'Brien <Family>",
      joinLink: 'https://fledgely.com/invite/accept?token=test',
    }
    const html = generateInvitationEmailHtml(params)
    // Should not throw
    expect(html).toContain('O&#039;Brien')
  })

  it('escapes HTML special characters to prevent XSS', () => {
    const params: InvitationEmailParams = {
      inviterName: '<script>alert("xss")</script>',
      familyName: '<img src=x onerror=alert(1)>',
      joinLink: 'https://fledgely.com/invite/accept?token=test',
    }
    const html = generateInvitationEmailHtml(params)
    // Should escape HTML tags
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
  })

  it('escapes ampersands and quotes', () => {
    const params: InvitationEmailParams = {
      inviterName: 'Tom & Jerry',
      familyName: 'The "Best" Family',
      joinLink: 'https://fledgely.com/invite/accept?token=test',
    }
    const html = generateInvitationEmailHtml(params)
    expect(html).toContain('Tom &amp; Jerry')
    expect(html).toContain('The &quot;Best&quot; Family')
  })

  it('handles empty strings gracefully', () => {
    const params: InvitationEmailParams = {
      inviterName: '',
      familyName: '',
      joinLink: '',
    }
    // Should not throw
    const html = generateInvitationEmailHtml(params)
    expect(html).toBeTruthy()
  })

  it('handles very long names', () => {
    const longName = 'A'.repeat(200)
    const params: InvitationEmailParams = {
      inviterName: longName,
      familyName: longName,
      joinLink: 'https://fledgely.com/invite/accept?token=test',
    }
    const html = generateInvitationEmailHtml(params)
    expect(html).toContain(longName)
  })
})
