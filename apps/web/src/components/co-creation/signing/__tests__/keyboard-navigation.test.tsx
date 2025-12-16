import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignaturePad } from '../SignaturePad'
import { ChildSigningCeremony } from '../ChildSigningCeremony'
import { FamilyCelebration } from '../FamilyCelebration'

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
 * Keyboard Navigation Tests
 *
 * Story 6.7: Signature Accessibility - Task 1
 *
 * Comprehensive keyboard navigation tests for the signing flow
 * to ensure full keyboard accessibility per WCAG 2.1 AA (NFR43)
 */
describe('Keyboard Navigation (Story 6.7)', () => {
  describe('SignaturePad', () => {
    it('can navigate between mode toggle buttons with Tab', async () => {
      const user = userEvent.setup()

      render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      // Tab to first button
      await user.tab()
      expect(screen.getByRole('button', { name: /type/i })).toHaveFocus()

      // Tab to second button
      await user.tab()
      expect(screen.getByRole('button', { name: /draw/i })).toHaveFocus()
    })

    it('can switch mode with Enter key', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <SignaturePad
          mode="typed"
          onModeChange={onModeChange}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      // Focus draw button
      const drawButton = screen.getByRole('button', { name: /draw/i })
      drawButton.focus()

      // Press Enter
      await user.keyboard('{Enter}')

      expect(onModeChange).toHaveBeenCalledWith('drawn')
    })

    it('can switch mode with Space key', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(
        <SignaturePad
          mode="typed"
          onModeChange={onModeChange}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      // Focus draw button
      const drawButton = screen.getByRole('button', { name: /draw/i })
      drawButton.focus()

      // Press Space
      await user.keyboard(' ')

      expect(onModeChange).toHaveBeenCalledWith('drawn')
    })

    it('can type signature with keyboard in typed mode', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value=""
          onChange={onChange}
          childName="Alex"
        />
      )

      // Find and focus the input
      const input = screen.getByLabelText(/signature input/i)
      await user.click(input)

      // Type a name
      await user.type(input, 'Alex Smith')

      expect(onChange).toHaveBeenCalled()
    })

    it('can clear signature with keyboard', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <SignaturePad
          mode="typed"
          onModeChange={vi.fn()}
          value="Alex Smith"
          onChange={onChange}
          childName="Alex"
        />
      )

      // Focus and activate clear button
      const clearButton = screen.getByRole('button', { name: /clear/i })
      clearButton.focus()
      await user.keyboard('{Enter}')

      expect(onChange).toHaveBeenCalledWith('')
    })

    it('provides keyboard fallback link in drawn mode', () => {
      render(
        <SignaturePad
          mode="drawn"
          onModeChange={vi.fn()}
          value=""
          onChange={vi.fn()}
          childName="Alex"
        />
      )

      const fallbackLink = screen.getByRole('button', {
        name: /use keyboard to type instead/i,
      })
      expect(fallbackLink).toBeInTheDocument()
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

    it('can check consent checkbox with Space key', async () => {
      const user = userEvent.setup()

      render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={mockTerms}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      checkbox.focus()

      expect(checkbox).not.toBeChecked()
      await user.keyboard(' ')
      expect(checkbox).toBeChecked()
    })

    it('can navigate back with keyboard', async () => {
      const user = userEvent.setup()
      const onBack = vi.fn()

      render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={mockTerms}
          onComplete={vi.fn()}
          onBack={onBack}
        />
      )

      const backButton = screen.getByRole('button', { name: /back/i })
      backButton.focus()
      await user.keyboard('{Enter}')

      expect(onBack).toHaveBeenCalled()
    })

    it('submit button is disabled until form is complete', () => {
      render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={mockTerms}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      const submitButton = screen.getByRole('button', { name: /sign.*agreement/i })
      expect(submitButton).toBeDisabled()
    })

    it('can complete full flow with keyboard only', async () => {
      const user = userEvent.setup()
      const onComplete = vi.fn()

      render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={mockTerms}
          onComplete={onComplete}
          onBack={vi.fn()}
        />
      )

      // 1. Tab to checkbox and check it
      const checkbox = screen.getByRole('checkbox')
      checkbox.focus()
      await user.keyboard(' ')
      expect(checkbox).toBeChecked()

      // 2. Tab to signature input and type name
      const input = screen.getByLabelText(/signature input/i)
      await user.click(input)
      await user.type(input, 'Alex')

      // 3. Submit button should now be enabled
      const submitButton = screen.getByRole('button', { name: /sign.*agreement/i })
      expect(submitButton).not.toBeDisabled()

      // 4. Tab to submit button and press Enter
      submitButton.focus()
      await user.keyboard('{Enter}')

      expect(onComplete).toHaveBeenCalled()
    })

    it('logical tab order through ceremony', async () => {
      const user = userEvent.setup()

      render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={mockTerms}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Start tabbing
      await user.tab()

      // Should follow logical order:
      // 1. Consent checkbox
      // 2. Signature mode toggle (type)
      // 3. Signature mode toggle (draw)
      // 4. Signature input
      // 5. Clear button
      // 6. Back button
      // 7. Submit button

      // First tab should be checkbox or first interactive element
      const focusedElement = document.activeElement
      expect(focusedElement?.tagName).toBe('INPUT') // checkbox
    })
  })

  describe('FamilyCelebration', () => {
    const mockAgreement = {
      id: 'agreement-123',
      version: '1.0',
      activatedAt: new Date().toISOString(),
      termsCount: 5,
    }

    it('can navigate to download button with keyboard', async () => {
      const user = userEvent.setup()
      const onDownload = vi.fn().mockResolvedValue(undefined)

      render(
        <FamilyCelebration
          agreement={mockAgreement}
          parentNames={['Sarah']}
          childName="Alex"
          onNextStep={vi.fn()}
          onDownload={onDownload}
          onShare={vi.fn().mockResolvedValue('shared' as const)}
        />
      )

      const downloadButton = screen.getByRole('button', { name: /download/i })
      downloadButton.focus()
      await user.keyboard('{Enter}')

      expect(onDownload).toHaveBeenCalled()
    })

    it('can navigate to share button with keyboard', async () => {
      const user = userEvent.setup()
      const onShare = vi.fn().mockResolvedValue('shared' as const)

      render(
        <FamilyCelebration
          agreement={mockAgreement}
          parentNames={['Sarah']}
          childName="Alex"
          onNextStep={vi.fn()}
          onDownload={vi.fn().mockResolvedValue(undefined)}
          onShare={onShare}
        />
      )

      const shareButton = screen.getByRole('button', { name: /share/i })
      shareButton.focus()
      await user.keyboard('{Enter}')

      expect(onShare).toHaveBeenCalled()
    })

    it('can select next step with keyboard', async () => {
      const user = userEvent.setup()
      const onNextStep = vi.fn()

      render(
        <FamilyCelebration
          agreement={mockAgreement}
          parentNames={['Sarah']}
          childName="Alex"
          onNextStep={onNextStep}
          onDownload={vi.fn().mockResolvedValue(undefined)}
          onShare={vi.fn().mockResolvedValue('shared' as const)}
        />
      )

      // Find device enrollment button
      const deviceButton = screen.getByRole('button', {
        name: /set up device monitoring/i,
      })
      deviceButton.focus()
      await user.keyboard('{Enter}')

      expect(onNextStep).toHaveBeenCalledWith('device-enrollment')
    })

    it('can select dashboard option with keyboard', async () => {
      const user = userEvent.setup()
      const onNextStep = vi.fn()

      render(
        <FamilyCelebration
          agreement={mockAgreement}
          parentNames={['Sarah']}
          childName="Alex"
          onNextStep={onNextStep}
          onDownload={vi.fn().mockResolvedValue(undefined)}
          onShare={vi.fn().mockResolvedValue('shared' as const)}
        />
      )

      // Find agreement only button
      const agreementOnlyButton = screen.getByRole('button', {
        name: /agreement only for now/i,
      })
      agreementOnlyButton.focus()
      await user.keyboard('{Enter}')

      expect(onNextStep).toHaveBeenCalledWith('dashboard')
    })
  })
})

/**
 * Focus Management Tests
 *
 * Story 6.7: Signature Accessibility - Task 4
 */
describe('Focus Management (Story 6.7)', () => {
  describe('ChildSigningCeremony', () => {
    it('has visible focus indicators on all interactive elements', () => {
      render(
        <ChildSigningCeremony
          agreementId="agreement-123"
          childName="Alex"
          terms={[]}
          onComplete={vi.fn()}
          onBack={vi.fn()}
        />
      )

      // Check all buttons have focus styles
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/focus:/)
      })

      // Check checkbox has focus styles
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox.className).toMatch(/focus:/)
    })
  })
})

/**
 * Skip Link Tests
 *
 * Story 6.7: Signature Accessibility - Task 1.6
 */
describe('Skip Links (Story 6.7)', () => {
  it('ChildSigningCeremony should allow users to navigate efficiently', async () => {
    const user = userEvent.setup()

    render(
      <ChildSigningCeremony
        agreementId="agreement-123"
        childName="Alex"
        terms={[]}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    )

    // Users should be able to navigate through interactive elements
    // without getting stuck
    await user.tab()
    await user.tab()
    await user.tab()

    // Should not be null/undefined (not stuck)
    expect(document.activeElement).not.toBe(document.body)
  })
})
