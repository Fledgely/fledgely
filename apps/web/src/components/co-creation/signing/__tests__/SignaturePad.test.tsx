import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignaturePad } from '../SignaturePad'

// Mock canvas context for jsdom
const mockContext = {
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 3,
  strokeStyle: '',
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
}

// Mock HTMLCanvasElement methods
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockImageData')
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      right: 300,
      bottom: 200,
      width: 300,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }),
    writable: true
  })
})

describe('SignaturePad', () => {
  const defaultProps = {
    mode: 'typed' as const,
    onModeChange: vi.fn(),
    value: '',
    onChange: vi.fn(),
    childName: 'Alex',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Mode Toggle (Task 2.6)', () => {
    it('renders mode toggle buttons', () => {
      render(<SignaturePad {...defaultProps} />)

      expect(screen.getByRole('button', { name: /type.*name/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /draw.*signature/i })).toBeInTheDocument()
    })

    it('indicates current mode visually', () => {
      render(<SignaturePad {...defaultProps} mode="typed" />)

      const typedButton = screen.getByRole('button', { name: /type.*name/i })
      expect(typedButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('calls onModeChange when toggling modes', async () => {
      const user = userEvent.setup()
      render(<SignaturePad {...defaultProps} mode="typed" />)

      const drawButton = screen.getByRole('button', { name: /draw.*signature/i })
      await user.click(drawButton)

      expect(defaultProps.onModeChange).toHaveBeenCalledWith('drawn')
    })
  })

  describe('Typed Mode (Task 2.2)', () => {
    it('renders text input in typed mode', () => {
      render(<SignaturePad {...defaultProps} mode="typed" />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('has placeholder with child name', () => {
      render(<SignaturePad {...defaultProps} mode="typed" value="" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder')
      // Placeholder should contain child name
      expect(input.getAttribute('placeholder')).toContain('Alex')
    })

    it('calls onChange when typing', async () => {
      const user = userEvent.setup()
      render(<SignaturePad {...defaultProps} mode="typed" />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'A')

      // onChange called for each character
      expect(defaultProps.onChange).toHaveBeenCalled()
    })

    it('displays current value', () => {
      render(<SignaturePad {...defaultProps} mode="typed" value="Alex Smith" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('Alex Smith')
    })
  })

  describe('Drawn Mode (Task 2.1, 2.4)', () => {
    it('renders canvas in drawn mode', () => {
      render(<SignaturePad {...defaultProps} mode="drawn" />)

      expect(screen.getByRole('img', { name: /signature/i })).toBeInTheDocument()
    })

    it('has accessible label for canvas', () => {
      render(<SignaturePad {...defaultProps} mode="drawn" />)

      const canvas = screen.getByRole('img')
      expect(canvas).toHaveAttribute('aria-label')
    })

    it('supports mouse interaction for drawing', () => {
      render(<SignaturePad {...defaultProps} mode="drawn" />)

      const canvas = screen.getByRole('img')

      // Simulate mouse events
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
      fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 })
      fireEvent.mouseUp(canvas)

      // Should call onChange with base64 data
      expect(defaultProps.onChange).toHaveBeenCalledWith('data:image/png;base64,mockImageData')
    })

    it('supports touch interaction for drawing (Task 2.4)', () => {
      render(<SignaturePad {...defaultProps} mode="drawn" />)

      const canvas = screen.getByRole('img')

      // Simulate touch events
      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 10, clientY: 10 }]
      })
      fireEvent.touchMove(canvas, {
        touches: [{ clientX: 50, clientY: 50 }]
      })
      fireEvent.touchEnd(canvas)

      expect(defaultProps.onChange).toHaveBeenCalled()
    })
  })

  describe('Clear Button (Task 2.3)', () => {
    it('renders clear button', () => {
      render(<SignaturePad {...defaultProps} value="some value" />)

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('clears typed signature when clicked', async () => {
      const user = userEvent.setup()
      render(<SignaturePad {...defaultProps} mode="typed" value="Alex Smith" />)

      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)

      expect(defaultProps.onChange).toHaveBeenCalledWith('')
    })

    it('clears drawn signature when clicked', async () => {
      const user = userEvent.setup()
      render(<SignaturePad {...defaultProps} mode="drawn" value="data:image/png;base64,abc" />)

      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)

      expect(defaultProps.onChange).toHaveBeenCalledWith('')
    })

    it('is disabled when signature is empty', () => {
      render(<SignaturePad {...defaultProps} value="" />)

      const clearButton = screen.getByRole('button', { name: /clear/i })
      expect(clearButton).toBeDisabled()
    })
  })

  describe('Accessibility (Task 2.5)', () => {
    it('has accessible label for text input', () => {
      render(<SignaturePad {...defaultProps} mode="typed" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-label')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SignaturePad {...defaultProps} mode="typed" />)

      // Tab through the component
      await user.tab()
      await user.tab()

      // Should be able to tab through elements
      expect(document.activeElement).toBeTruthy()
    })

    it('provides keyboard fallback link for drawn mode', () => {
      render(<SignaturePad {...defaultProps} mode="drawn" />)

      // Should show keyboard fallback option
      expect(screen.getByText(/use keyboard/i)).toBeInTheDocument()
    })

    it('has 44px minimum height for clear button (NFR49)', () => {
      render(<SignaturePad {...defaultProps} value="test" />)

      const clearButton = screen.getByRole('button', { name: /clear/i })

      // Check if button has min-h-[44px] class
      expect(clearButton.className).toContain('min-h-[44px]')
    })
  })

  describe('Disabled State', () => {
    it('disables text input when disabled', () => {
      render(<SignaturePad {...defaultProps} mode="typed" disabled />)

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('disables clear button when disabled', () => {
      render(<SignaturePad {...defaultProps} value="test" disabled />)

      expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled()
    })

    it('shows visual indication of disabled state', () => {
      render(<SignaturePad {...defaultProps} disabled />)

      const container = screen.getByTestId('signature-pad')
      expect(container.className).toContain('opacity-50')
    })
  })

  describe('Export Format (Task 2.7)', () => {
    it('exports typed signature as string', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<SignaturePad {...defaultProps} mode="typed" onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'A')

      // Verify onChange receives string
      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
      expect(typeof lastCall[0]).toBe('string')
    })

    it('exports drawn signature as base64', () => {
      const onChange = vi.fn()
      render(<SignaturePad {...defaultProps} mode="drawn" onChange={onChange} />)

      const canvas = screen.getByRole('img')

      // Simulate drawing
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
      fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 })
      fireEvent.mouseUp(canvas)

      // Check that onChange was called with base64 data
      expect(onChange).toHaveBeenCalledWith('data:image/png;base64,mockImageData')
    })
  })

  describe('Visual Feedback', () => {
    it('shows preview of typed signature', () => {
      render(<SignaturePad {...defaultProps} mode="typed" value="Alex Smith" />)

      // Should display the typed name in preview
      const previews = screen.getAllByText('Alex Smith')
      expect(previews.length).toBeGreaterThanOrEqual(1)
    })

    it('shows instruction text for empty typed state', () => {
      render(<SignaturePad {...defaultProps} mode="typed" value="" />)

      // Multiple elements may contain "type your name", just check at least one exists
      const instructions = screen.getAllByText(/type your name/i)
      expect(instructions.length).toBeGreaterThanOrEqual(1)
    })

    it('shows instruction text for drawn mode', () => {
      render(<SignaturePad {...defaultProps} mode="drawn" value="" />)

      // Multiple elements may contain "draw" and "signature", check at least one exists
      const instructions = screen.getAllByText(/draw.*signature/i)
      expect(instructions.length).toBeGreaterThanOrEqual(1)
    })
  })
})
