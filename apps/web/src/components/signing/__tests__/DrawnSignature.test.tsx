/**
 * Tests for DrawnSignature component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC2
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DrawnSignature } from '../DrawnSignature'

// Mock canvas context
const mockContext = {
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
  fillStyle: '',
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext)
  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,test')
})

describe('DrawnSignature', () => {
  const defaultProps = {
    onChange: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the drawn signature component', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByTestId('drawn-signature')).toBeInTheDocument()
    })

    it('should render canvas element', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByTestId('signature-canvas')).toBeInTheDocument()
    })

    it('should display label', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByText('Draw Your Signature')).toBeInTheDocument()
    })

    it('should display help text', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(
        screen.getByText('Use your finger or mouse to draw your signature above.')
      ).toBeInTheDocument()
    })

    it('should display placeholder text when empty', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByText('Sign here with your finger or mouse')).toBeInTheDocument()
    })
  })

  describe('clear button', () => {
    it('should render clear button', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByTestId('clear-signature-button')).toBeInTheDocument()
    })

    it('should disable clear button when no drawing', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByTestId('clear-signature-button')).toBeDisabled()
    })

    it('should have accessible label on clear button', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })
  })

  describe('drawing interactions', () => {
    it('should handle mouse down event', () => {
      render(<DrawnSignature {...defaultProps} />)
      const canvas = screen.getByTestId('signature-canvas')

      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 })

      expect(mockContext.beginPath).toHaveBeenCalled()
      expect(mockContext.moveTo).toHaveBeenCalled()
    })

    it('should handle mouse move during drawing', () => {
      render(<DrawnSignature {...defaultProps} />)
      const canvas = screen.getByTestId('signature-canvas')

      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 })
      fireEvent.mouseMove(canvas, { clientX: 60, clientY: 60 })

      expect(mockContext.lineTo).toHaveBeenCalled()
      expect(mockContext.stroke).toHaveBeenCalled()
    })

    it('should call onChange on mouse up after drawing', () => {
      const onChange = vi.fn()
      render(<DrawnSignature {...defaultProps} onChange={onChange} />)
      const canvas = screen.getByTestId('signature-canvas')

      // Simulate drawing
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 })
      fireEvent.mouseMove(canvas, { clientX: 60, clientY: 60 })
      fireEvent.mouseUp(canvas)

      expect(onChange).toHaveBeenCalledWith('data:image/png;base64,test')
    })

    it('should handle touch events', () => {
      render(<DrawnSignature {...defaultProps} />)
      const canvas = screen.getByTestId('signature-canvas')

      fireEvent.touchStart(canvas, { touches: [{ clientX: 50, clientY: 50 }] })

      expect(mockContext.beginPath).toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should not start drawing when disabled', () => {
      render(<DrawnSignature {...defaultProps} disabled />)
      const canvas = screen.getByTestId('signature-canvas')

      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 })

      expect(mockContext.beginPath).not.toHaveBeenCalled()
    })

    it('should disable clear button when disabled', () => {
      render(<DrawnSignature {...defaultProps} disabled />)

      expect(screen.getByTestId('clear-signature-button')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('should have aria-label on canvas', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByTestId('signature-canvas')).toHaveAttribute(
        'aria-label',
        'Signature drawing canvas'
      )
    })

    it('should have role=img on canvas', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByTestId('signature-canvas')).toHaveAttribute('role', 'img')
    })

    it('should have 44px minimum touch target on clear button', () => {
      render(<DrawnSignature {...defaultProps} />)

      expect(screen.getByTestId('clear-signature-button')).toHaveClass('min-h-[44px]')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<DrawnSignature {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('drawn-signature')).toHaveClass('custom-class')
    })
  })
})
