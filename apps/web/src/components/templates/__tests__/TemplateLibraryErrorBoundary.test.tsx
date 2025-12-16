import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateLibraryErrorBoundary } from '../TemplateLibraryErrorBoundary'

// Component that throws an error
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Normal content</div>
}

describe('TemplateLibraryErrorBoundary', () => {
  // Suppress console.error during error boundary tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })

  describe('normal rendering', () => {
    it('renders children when no error', () => {
      render(
        <TemplateLibraryErrorBoundary>
          <div>Test content</div>
        </TemplateLibraryErrorBoundary>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('renders error UI when child throws', () => {
      render(
        <TemplateLibraryErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </TemplateLibraryErrorBoundary>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Unable to load templates')).toBeInTheDocument()
    })

    it('renders custom fallback when provided', () => {
      render(
        <TemplateLibraryErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowingComponent shouldThrow={true} />
        </TemplateLibraryErrorBoundary>
      )

      expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    })

    it('displays error message with helpful description', () => {
      render(
        <TemplateLibraryErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </TemplateLibraryErrorBoundary>
      )

      expect(screen.getByText(/temporary issue/i)).toBeInTheDocument()
    })

    it('renders Try Again button', () => {
      render(
        <TemplateLibraryErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </TemplateLibraryErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  describe('retry functionality', () => {
    it('resets error state when Try Again is clicked', () => {
      // Use a stateful component to control the error
      let throwError = true
      function ConditionalErrorComponent() {
        if (throwError) {
          throw new Error('Test error')
        }
        return <div>Normal content</div>
      }

      render(
        <TemplateLibraryErrorBoundary>
          <ConditionalErrorComponent />
        </TemplateLibraryErrorBoundary>
      )

      // Verify error state
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Unable to load templates')).toBeInTheDocument()

      // "Fix" the error
      throwError = false

      // Click Try Again - this resets the error boundary state
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      // After reset, the component re-renders
      // Since throwError is now false, it should render normally
      expect(screen.getByText('Normal content')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role="alert" on error container', () => {
      render(
        <TemplateLibraryErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </TemplateLibraryErrorBoundary>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('has aria-live="assertive" for immediate announcement', () => {
      render(
        <TemplateLibraryErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </TemplateLibraryErrorBoundary>
      )

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
    })

    it('Try Again button has minimum touch target', () => {
      render(
        <TemplateLibraryErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </TemplateLibraryErrorBoundary>
      )

      const button = screen.getByRole('button', { name: /try again/i })
      expect(button).toHaveClass('min-h-[44px]')
    })
  })

  describe('error logging', () => {
    it('logs error to console', () => {
      render(
        <TemplateLibraryErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </TemplateLibraryErrorBoundary>
      )

      expect(console.error).toHaveBeenCalled()
    })
  })
})
