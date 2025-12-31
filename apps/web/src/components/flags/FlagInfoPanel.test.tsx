/**
 * FlagInfoPanel Tests - Story 22.2
 *
 * Tests for the flag metadata display component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlagInfoPanel } from './FlagInfoPanel'
import type { FlagDocument } from '@fledgely/shared'

const createMockFlag = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
  id: 'flag-123',
  childId: 'child-456',
  screenshotId: 'screenshot-789',
  category: 'Violence',
  severity: 'high',
  confidence: 85,
  reasoning: 'Test reasoning',
  status: 'pending',
  createdAt: Date.now(),
  detectedAt: Date.now(),
  ...overrides,
})

describe('FlagInfoPanel', () => {
  describe('AC3: Category and severity prominently displayed', () => {
    it('should display category badge', () => {
      const flag = createMockFlag({ category: 'Violence' })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const categoryBadge = screen.getByTestId('flag-category')
      expect(categoryBadge).toHaveTextContent('Violence')
    })

    it('should display severity badge', () => {
      const flag = createMockFlag({ severity: 'high' })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const severityBadge = screen.getByTestId('flag-severity')
      expect(severityBadge).toHaveTextContent('High Severity')
    })

    it('should style high severity appropriately', () => {
      const flag = createMockFlag({ severity: 'high' })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const severityBadge = screen.getByTestId('flag-severity')
      expect(severityBadge).toHaveStyle({ backgroundColor: '#fef2f2' })
    })

    it('should display all category types correctly', () => {
      const categories = [
        { category: 'Violence', label: 'Violence' },
        { category: 'Adult Content', label: 'Adult Content' },
        { category: 'Bullying', label: 'Bullying' },
        { category: 'Self-Harm Indicators', label: 'Self-Harm' },
        { category: 'Explicit Language', label: 'Explicit Language' },
        { category: 'Unknown Contacts', label: 'Unknown Contacts' },
      ] as const

      categories.forEach(({ category, label }) => {
        const flag = createMockFlag({ category })
        const { unmount } = render(<FlagInfoPanel flag={flag} childName="Test Child" />)

        const categoryBadge = screen.getByTestId('flag-category')
        expect(categoryBadge).toHaveTextContent(label)

        unmount()
      })
    })

    it('should display all severity levels correctly', () => {
      const severities = [
        { severity: 'high', label: 'High Severity' },
        { severity: 'medium', label: 'Medium Severity' },
        { severity: 'low', label: 'Low Severity' },
      ] as const

      severities.forEach(({ severity, label }) => {
        const flag = createMockFlag({ severity })
        const { unmount } = render(<FlagInfoPanel flag={flag} childName="Test Child" />)

        const severityBadge = screen.getByTestId('flag-severity')
        expect(severityBadge).toHaveTextContent(label)

        unmount()
      })
    })
  })

  describe('AC4: Confidence score shown with explanation', () => {
    it('should display confidence value', () => {
      const flag = createMockFlag({ confidence: 85 })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const confidenceValue = screen.getByTestId('confidence-value')
      expect(confidenceValue).toHaveTextContent('85%')
    })

    it('should display confidence bar', () => {
      const flag = createMockFlag({ confidence: 75 })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const confidenceBar = screen.getByTestId('confidence-bar')
      expect(confidenceBar).toHaveStyle({ width: '75%' })
    })

    it('should display confidence explanation for high confidence', () => {
      const flag = createMockFlag({ confidence: 92 })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const explanation = screen.getByTestId('confidence-explanation')
      expect(explanation).toHaveTextContent('Very high confidence')
    })

    it('should display confidence explanation for moderate confidence', () => {
      const flag = createMockFlag({ confidence: 55 })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const explanation = screen.getByTestId('confidence-explanation')
      expect(explanation).toHaveTextContent('Moderate confidence')
    })

    it('should display confidence explanation for lower confidence', () => {
      const flag = createMockFlag({ confidence: 35 })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const explanation = screen.getByTestId('confidence-explanation')
      expect(explanation).toHaveTextContent('Lower confidence')
    })
  })

  describe('AC5: Context information visible', () => {
    it('should display child name', () => {
      const flag = createMockFlag()
      render(<FlagInfoPanel flag={flag} childName="Emma" />)

      const childName = screen.getByTestId('child-name')
      expect(childName).toHaveTextContent('Emma')
    })

    it('should display formatted timestamp', () => {
      const timestamp = new Date('2024-01-15T14:30:00').getTime()
      const flag = createMockFlag({ createdAt: timestamp })
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      const timestampEl = screen.getByTestId('timestamp')
      // Should contain date parts (actual format depends on locale)
      expect(timestampEl.textContent).toBeTruthy()
    })

    it('should display device name when provided', () => {
      const flag = createMockFlag()
      render(<FlagInfoPanel flag={flag} childName="Test Child" deviceName="iPhone 12" />)

      const deviceName = screen.getByTestId('device-name')
      expect(deviceName).toHaveTextContent('iPhone 12')
    })

    it('should not display device section when deviceName is not provided', () => {
      const flag = createMockFlag()
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      expect(screen.queryByTestId('device-name')).not.toBeInTheDocument()
    })
  })

  describe('Panel rendering', () => {
    it('should render the panel container', () => {
      const flag = createMockFlag()
      render(<FlagInfoPanel flag={flag} childName="Test Child" />)

      expect(screen.getByTestId('flag-info-panel')).toBeInTheDocument()
    })
  })
})
