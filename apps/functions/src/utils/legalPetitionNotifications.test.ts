/**
 * Tests for Legal Petition Notification Templates
 * Story 3.6: Legal Parent Petition for Access - Task 12
 */

import {
  generateSubject,
  generateAccessGrantedHtml,
  generateAccessGrantedText,
  generateCourtOrderedParentAddedHtml,
  generateCourtOrderedParentAddedText,
  generatePetitionStatusUpdateHtml,
  generatePetitionStatusUpdateText,
  generateIntegrityHash,
} from './legalPetitionNotifications'

describe('legalPetitionNotifications', () => {
  describe('generateSubject', () => {
    it('generates neutral subject for legal-parent-access-granted', () => {
      const subject = generateSubject('legal-parent-access-granted')
      expect(subject).toBe('Your access request has been processed')
      // Ensure it does not reveal sensitive information
      expect(subject.toLowerCase()).not.toContain('court')
      expect(subject.toLowerCase()).not.toContain('legal')
      expect(subject.toLowerCase()).not.toContain('petition')
    })

    it('generates neutral subject for court-ordered-parent-added', () => {
      const subject = generateSubject('court-ordered-parent-added')
      expect(subject).toBe('Important family account update')
      // Ensure it does not reveal sensitive information
      expect(subject.toLowerCase()).not.toContain('court')
      expect(subject.toLowerCase()).not.toContain('legal')
      expect(subject.toLowerCase()).not.toContain('petition')
    })

    it('generates neutral subject for petition-status-update', () => {
      const subject = generateSubject('petition-status-update')
      expect(subject).toBe('Update on your request')
      // Ensure it does not reveal sensitive information
      expect(subject.toLowerCase()).not.toContain('court')
      expect(subject.toLowerCase()).not.toContain('legal')
      expect(subject.toLowerCase()).not.toContain('petition')
    })

    it('generates default subject for unknown type', () => {
      const subject = generateSubject('unknown-type' as never)
      expect(subject).toBe('Fledgely notification')
    })
  })

  describe('generateAccessGrantedHtml', () => {
    it('generates HTML with petitioner name', () => {
      const html = generateAccessGrantedHtml('John Doe', 'Jane')
      expect(html).toContain('John Doe')
      expect(html).toContain('Jane')
    })

    it('contains approval messaging', () => {
      const html = generateAccessGrantedHtml('Test User', 'Child Name')
      expect(html).toContain('approved')
      expect(html).toContain('access')
    })

    it('includes next steps guidance', () => {
      const html = generateAccessGrantedHtml('Test User', 'Child Name')
      expect(html).toContain('Log in')
      expect(html).toContain('family settings')
    })

    it('properly escapes HTML special characters', () => {
      const html = generateAccessGrantedHtml('<script>alert(1)</script>', '&<>')
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
      expect(html).toContain('&amp;&lt;&gt;')
    })

    it('includes footer with contact information', () => {
      const html = generateAccessGrantedHtml('Test', 'Test')
      expect(html).toContain('support team')
    })
  })

  describe('generateAccessGrantedText', () => {
    it('generates plain text with petitioner name', () => {
      const text = generateAccessGrantedText('John Doe', 'Jane')
      expect(text).toContain('John Doe')
      expect(text).toContain('Jane')
    })

    it('contains approval messaging', () => {
      const text = generateAccessGrantedText('Test User', 'Child Name')
      expect(text).toContain('approved')
      expect(text).toContain('access')
    })

    it('includes next steps guidance', () => {
      const text = generateAccessGrantedText('Test User', 'Child Name')
      expect(text).toContain('Log in')
      expect(text).toContain('family settings')
    })
  })

  describe('generateCourtOrderedParentAddedHtml', () => {
    it('generates HTML for existing guardians', () => {
      const html = generateCourtOrderedParentAddedHtml()
      expect(html).toContain('court documentation')
      expect(html).toContain('verified')
    })

    it('explains this was a legal process', () => {
      const html = generateCourtOrderedParentAddedHtml()
      expect(html).toContain('legal process')
      expect(html).toContain('not an invitation')
    })

    it('mentions cannot be revoked through app', () => {
      const html = generateCourtOrderedParentAddedHtml()
      expect(html).toContain('cannot be revoked')
    })

    it('includes support contact for errors', () => {
      const html = generateCourtOrderedParentAddedHtml()
      expect(html).toContain('support team')
      expect(html).toContain('error')
    })
  })

  describe('generateCourtOrderedParentAddedText', () => {
    it('generates plain text for existing guardians', () => {
      const text = generateCourtOrderedParentAddedText()
      expect(text).toContain('court documentation')
      expect(text).toContain('verified')
    })

    it('explains this was a legal process', () => {
      const text = generateCourtOrderedParentAddedText()
      expect(text).toContain('legal process')
      expect(text).toContain('not an invitation')
    })

    it('mentions cannot be revoked through app', () => {
      const text = generateCourtOrderedParentAddedText()
      expect(text).toContain('cannot be revoked')
    })
  })

  describe('generatePetitionStatusUpdateHtml', () => {
    it('generates HTML for pending status', () => {
      const html = generatePetitionStatusUpdateHtml('Test User', 'pending')
      expect(html).toContain('Test User')
      expect(html).toContain('Petition Received')
      expect(html).toContain('awaiting review')
    })

    it('generates HTML for under-review status', () => {
      const html = generatePetitionStatusUpdateHtml('Test User', 'under-review')
      expect(html).toContain('Under Review')
      expect(html).toContain('currently being reviewed')
    })

    it('generates HTML for verified status', () => {
      const html = generatePetitionStatusUpdateHtml('Test User', 'verified')
      expect(html).toContain('Petition Approved')
      expect(html).toContain('approved')
    })

    it('generates HTML for denied status', () => {
      const html = generatePetitionStatusUpdateHtml('Test User', 'denied')
      expect(html).toContain('Petition Denied')
      expect(html).toContain('unable to verify')
    })

    it('includes required documentation for denied status', () => {
      const html = generatePetitionStatusUpdateHtml('Test User', 'denied')
      expect(html).toContain('Court custody order')
      expect(html).toContain('Birth certificate')
      expect(html).toContain('Legal guardian documentation')
    })

    it('includes support message when provided', () => {
      const html = generatePetitionStatusUpdateHtml('Test User', 'under-review', 'Please submit ID')
      expect(html).toContain('Please submit ID')
      expect(html).toContain('Message from Support')
    })

    it('does not include support message section when not provided', () => {
      const html = generatePetitionStatusUpdateHtml('Test User', 'under-review')
      expect(html).not.toContain('Message from Support')
    })

    it('properly escapes support message', () => {
      const html = generatePetitionStatusUpdateHtml('Test', 'pending', '<script>alert(1)</script>')
      expect(html).not.toContain('<script>alert')
      expect(html).toContain('&lt;script&gt;')
    })

    it('generates HTML for unknown status with default', () => {
      const html = generatePetitionStatusUpdateHtml('Test User', 'unknown-status')
      expect(html).toContain('Status Update')
    })
  })

  describe('generatePetitionStatusUpdateText', () => {
    it('generates plain text for pending status', () => {
      const text = generatePetitionStatusUpdateText('Test User', 'pending')
      expect(text).toContain('Test User')
      expect(text).toContain('PETITION RECEIVED')
      expect(text).toContain('awaiting review')
    })

    it('generates plain text for under-review status', () => {
      const text = generatePetitionStatusUpdateText('Test User', 'under-review')
      expect(text).toContain('UNDER REVIEW')
    })

    it('generates plain text for verified status', () => {
      const text = generatePetitionStatusUpdateText('Test User', 'verified')
      expect(text).toContain('PETITION APPROVED')
    })

    it('generates plain text for denied status', () => {
      const text = generatePetitionStatusUpdateText('Test User', 'denied')
      expect(text).toContain('PETITION DENIED')
      expect(text).toContain('Court custody order')
    })

    it('includes support message when provided', () => {
      const text = generatePetitionStatusUpdateText('Test', 'pending', 'Additional info needed')
      expect(text).toContain('Additional info needed')
      expect(text).toContain('MESSAGE FROM SUPPORT')
    })
  })

  describe('generateIntegrityHash', () => {
    it('generates consistent hash for same data', () => {
      const data = { action: 'test', timestamp: '2024-01-01T00:00:00Z' }
      const hash1 = generateIntegrityHash(data)
      const hash2 = generateIntegrityHash(data)
      expect(hash1).toBe(hash2)
    })

    it('generates different hash for different data', () => {
      const data1 = { action: 'test1', timestamp: '2024-01-01T00:00:00Z' }
      const data2 = { action: 'test2', timestamp: '2024-01-01T00:00:00Z' }
      const hash1 = generateIntegrityHash(data1)
      const hash2 = generateIntegrityHash(data2)
      expect(hash1).not.toBe(hash2)
    })

    it('is consistent regardless of key order', () => {
      const data1 = { a: 1, b: 2 }
      const data2 = { b: 2, a: 1 }
      const hash1 = generateIntegrityHash(data1)
      const hash2 = generateIntegrityHash(data2)
      expect(hash1).toBe(hash2)
    })

    it('returns hex string of expected length', () => {
      const hash = generateIntegrityHash({ test: 'data' })
      expect(hash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 produces 64 hex chars
    })
  })

  describe('Security Considerations', () => {
    it('all subject lines are neutral and do not reveal petition purpose', () => {
      const subjects = [
        generateSubject('legal-parent-access-granted'),
        generateSubject('court-ordered-parent-added'),
        generateSubject('petition-status-update'),
      ]

      for (const subject of subjects) {
        // Should not reveal petition/legal context in subject
        expect(subject.toLowerCase()).not.toContain('petition')
        // Should be generic enough to not raise concerns if intercepted
        expect(subject.length).toBeLessThan(100)
      }
    })

    it('HTML content properly escapes all user input', () => {
      const maliciousInput = '<script>document.cookie</script><img onerror="alert(1)" src=x>'
      const html1 = generateAccessGrantedHtml(maliciousInput, maliciousInput)
      const html2 = generatePetitionStatusUpdateHtml(maliciousInput, 'pending', maliciousInput)

      // Should not contain unescaped script tags
      expect(html1).not.toContain('<script>')
      expect(html2).not.toContain('<script>')

      // Should contain properly escaped versions
      expect(html1).toContain('&lt;script&gt;')
      expect(html2).toContain('&lt;script&gt;')

      // The onerror is escaped as onerror=&quot; which is safe
      expect(html1).toContain('onerror=&quot;')
      expect(html2).toContain('onerror=&quot;')
    })
  })
})
