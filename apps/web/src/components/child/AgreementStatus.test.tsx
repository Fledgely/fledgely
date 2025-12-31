/**
 * AgreementStatus Component Tests - Story 19C.4
 *
 * Task 6: Add component tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgreementStatus } from './AgreementStatus'

describe('AgreementStatus', () => {
  describe('Task 6.1: Active status display', () => {
    it('should render with correct test id', () => {
      render(<AgreementStatus status="active" />)
      expect(screen.getByTestId('agreement-status')).toBeInTheDocument()
    })

    it('should display active status title', () => {
      render(<AgreementStatus status="active" />)
      expect(screen.getByText('Agreement Status: Active')).toBeInTheDocument()
    })

    it('should display active message', () => {
      render(<AgreementStatus status="active" />)
      expect(screen.getByText('Monitoring is working as we agreed')).toBeInTheDocument()
    })

    it('should show green indicator for active status', () => {
      render(<AgreementStatus status="active" />)
      const indicator = screen.getByTestId('status-indicator')
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(34, 197, 94)' })
    })

    it('should show checkmark icon for active status', () => {
      render(<AgreementStatus status="active" />)
      expect(screen.getByTestId('status-icon')).toHaveTextContent('✅')
    })
  })

  describe('Task 6.2: Paused status display', () => {
    it('should display paused status title', () => {
      render(<AgreementStatus status="paused" />)
      expect(screen.getByText('Agreement Status: Paused')).toBeInTheDocument()
    })

    it('should display paused message with call to action', () => {
      render(<AgreementStatus status="paused" />)
      expect(screen.getByText('Monitoring is paused - talk to your parent')).toBeInTheDocument()
    })

    it('should show amber indicator for paused status', () => {
      render(<AgreementStatus status="paused" />)
      const indicator = screen.getByTestId('status-indicator')
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(245, 158, 11)' })
    })

    it('should show pause icon for paused status', () => {
      render(<AgreementStatus status="paused" />)
      expect(screen.getByTestId('status-icon')).toHaveTextContent('⏸️')
    })
  })

  describe('Task 6.3: Expired status display', () => {
    it('should display expired status title', () => {
      render(<AgreementStatus status="expired" />)
      expect(screen.getByText('Agreement Status: Needs Renewal')).toBeInTheDocument()
    })

    it('should display expired message', () => {
      render(<AgreementStatus status="expired" />)
      expect(screen.getByText('Time to renew our agreement')).toBeInTheDocument()
    })

    it('should show indigo indicator for expired status', () => {
      render(<AgreementStatus status="expired" />)
      const indicator = screen.getByTestId('status-indicator')
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(99, 102, 241)' })
    })

    it('should show clipboard icon for expired status', () => {
      render(<AgreementStatus status="expired" />)
      expect(screen.getByTestId('status-icon')).toHaveTextContent('📋')
    })

    it('should display expiration date when provided (Task 3.2)', () => {
      const expirationDate = new Date('2024-12-15')
      render(<AgreementStatus status="expired" expirationDate={expirationDate} />)
      expect(screen.getByTestId('expiration-date')).toHaveTextContent('(ended Dec 15, 2024)')
    })

    it('should not display expiration date when not provided', () => {
      render(<AgreementStatus status="expired" />)
      expect(screen.queryByTestId('expiration-date')).not.toBeInTheDocument()
    })

    it('should not display expiration date for non-expired status', () => {
      const expirationDate = new Date('2024-12-15')
      render(<AgreementStatus status="active" expirationDate={expirationDate} />)
      expect(screen.queryByTestId('expiration-date')).not.toBeInTheDocument()
    })
  })

  describe('Task 6.4: Neutral language (no punitive words)', () => {
    const punitiveWords = [
      'bad',
      'wrong',
      'failed',
      'breaking',
      'violated',
      'punishment',
      'trouble',
    ]

    it('should not contain punitive language in active state', () => {
      render(<AgreementStatus status="active" />)
      const content = screen.getByTestId('agreement-status').textContent?.toLowerCase() || ''
      punitiveWords.forEach((word) => {
        expect(content).not.toContain(word)
      })
    })

    it('should not contain punitive language in paused state', () => {
      render(<AgreementStatus status="paused" />)
      const content = screen.getByTestId('agreement-status').textContent?.toLowerCase() || ''
      punitiveWords.forEach((word) => {
        expect(content).not.toContain(word)
      })
    })

    it('should not contain punitive language in expired state', () => {
      render(<AgreementStatus status="expired" />)
      const content = screen.getByTestId('agreement-status').textContent?.toLowerCase() || ''
      punitiveWords.forEach((word) => {
        expect(content).not.toContain(word)
      })
    })
  })

  describe('Visual styling', () => {
    it('should have proper container styling', () => {
      render(<AgreementStatus status="active" />)
      const container = screen.getByTestId('agreement-status')
      expect(container).toHaveStyle({ borderRadius: '12px' })
    })

    it('should have status message text', () => {
      render(<AgreementStatus status="active" />)
      expect(screen.getByTestId('status-message')).toBeInTheDocument()
    })

    it('should have visual transition for status changes (Task 4.3)', () => {
      render(<AgreementStatus status="active" />)
      const indicator = screen.getByTestId('status-indicator')
      expect(indicator).toHaveStyle({ transition: 'background-color 0.3s ease' })
    })
  })
})
