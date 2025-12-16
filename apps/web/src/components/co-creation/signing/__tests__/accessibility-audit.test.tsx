import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { SignaturePad } from '../SignaturePad'
import { ChildSigningCeremony } from '../ChildSigningCeremony'
import { SigningCelebration } from '../SigningCelebration'
import { FamilyCelebration } from '../FamilyCelebration'

// Extend expect with axe matchers
expect.extend(matchers)

// Mock canvas for SignaturePad
beforeEach(() => {
  const mockContext = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    scale: vi.fn(),
    lineCap: 'round',
    lineJoin: 'round',
    lineWidth: 2,
    strokeStyle: '#000',
  }
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => mockContext
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock')
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 300,
    bottom: 200,
    width: 300,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }))

  // Mock matchMedia for reduced motion
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

/**
 * Accessibility Audit Tests
 *
 * Story 6.7: Signature Accessibility - Task 6.1
 *
 * Uses axe-core to automatically detect WCAG 2.1 AA violations
 * in signing components. These tests complement manual testing
 * with screen readers.
 */
describe('Accessibility Audit - axe-core (Story 6.7)', () => {
  describe('SignaturePad', () => {
    it('has no accessibility violations in typed mode', async () => {
      const { container } = render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations in drawn mode', async () => {
      const { container } = render(
        <SignaturePad
          mode="drawn"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations when disabled', async () => {
      const { container } = render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
          disabled
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations with value', async () => {
      const { container } = render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value="Alex Smith"
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('ChildSigningCeremony', () => {
    const mockTerms = [
      {
        id: 'term-1',
        sessionId: 'session-1',
        type: 'screen_time' as const,
        category: 'device' as const,
        title: 'Screen Time Limit',
        content: 'I will limit my screen time to 2 hours per day',
        status: 'accepted' as const,
        addedBy: 'parent',
        addedAt: new Date().toISOString(),
        discussion: [],
      },
    ]

    it('has no accessibility violations', async () => {
      const { container } = render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={mockTerms}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations when loading', async () => {
      const { container } = render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={mockTerms}
          onComplete={vi.fn()}
          onBack={vi.fn()}
          isLoading
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations with no terms', async () => {
      const { container } = render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('SigningCelebration', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <SigningCelebration childName="Alex" onContinue={vi.fn()} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('FamilyCelebration', () => {
    const mockAgreement = {
      id: 'agreement-123',
      version: '1.0',
      activatedAt: new Date().toISOString(),
      termsCount: 5,
    }

    it('has no accessibility violations', async () => {
      const { container } = render(
        <FamilyCelebration
          agreement={mockAgreement}
          parentNames={['Sarah']}
          childName="Alex"
          onNextStep={vi.fn()}
          onDownload={vi.fn().mockResolvedValue(undefined)}
          onShare={vi.fn().mockResolvedValue('shared' as const)}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations with multiple parents', async () => {
      const { container } = render(
        <FamilyCelebration
          agreement={mockAgreement}
          parentNames={['Sarah', 'John']}
          childName="Alex"
          onNextStep={vi.fn()}
          onDownload={vi.fn().mockResolvedValue(undefined)}
          onShare={vi.fn().mockResolvedValue('shared' as const)}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})

/**
 * WCAG 2.1 AA Specific Tests
 *
 * Story 6.7: Signature Accessibility - Task 6.2
 *
 * Tests for specific WCAG success criteria
 */
describe('WCAG 2.1 AA Compliance (Story 6.7)', () => {
  describe('1.3.1 Info and Relationships', () => {
    it('SignaturePad mode toggle has proper button group', () => {
      const { container } = render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const buttonGroup = container.querySelector('[role="group"]')
      expect(buttonGroup).toBeInTheDocument()
      expect(buttonGroup).toHaveAttribute('aria-label')
    })

    it('ChildSigningCeremony has proper heading structure', () => {
      const { container } = render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const h1 = container.querySelector('h1')
      const h2s = container.querySelectorAll('h2')

      expect(h1).toBeInTheDocument()
      expect(h2s.length).toBeGreaterThan(0)
    })
  })

  describe('1.4.3 Contrast (Minimum)', () => {
    it('SignaturePad uses high contrast colors', () => {
      const { container } = render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      // Check button text colors
      const buttons = container.querySelectorAll('button')
      buttons.forEach((button) => {
        // Active button should have white text on blue background
        // Inactive button should have dark text
        expect(button.className).toMatch(
          /text-(white|gray-\d{3}|gray-\d{3})/
        )
      })
    })
  })

  describe('2.4.6 Headings and Labels', () => {
    it('ChildSigningCeremony checkbox has descriptive label', () => {
      const { container } = render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const checkbox = container.querySelector('input[type="checkbox"]')
      expect(checkbox).toHaveAttribute('aria-describedby')

      const describedById = checkbox?.getAttribute('aria-describedby')
      const description = container.querySelector(`#${describedById}`)
      expect(description).toBeInTheDocument()
      expect(description?.textContent).toBeTruthy()
    })
  })

  describe('2.4.7 Focus Visible', () => {
    it('SignaturePad buttons have visible focus styles', () => {
      const { container } = render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const buttons = container.querySelectorAll('button')
      buttons.forEach((button) => {
        // Check for focus ring classes
        expect(button.className).toMatch(/focus:/)
      })
    })
  })

  describe('4.1.2 Name, Role, Value', () => {
    it('SignaturePad mode toggle buttons have aria-pressed', () => {
      const { container } = render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const buttons = container.querySelectorAll('button[aria-pressed]')
      expect(buttons.length).toBeGreaterThanOrEqual(2)

      // One should be pressed, one not
      const pressed = Array.from(buttons).filter(
        (b) => b.getAttribute('aria-pressed') === 'true'
      )
      expect(pressed.length).toBe(1)
    })

    it('SignaturePad canvas has accessible role and label', () => {
      const { container } = render(
        <SignaturePad
          mode="drawn"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toHaveAttribute('role', 'img')
      expect(canvas).toHaveAttribute('aria-label')
    })
  })
})
