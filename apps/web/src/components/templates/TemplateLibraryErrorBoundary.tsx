'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface TemplateLibraryErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface TemplateLibraryErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Template Library Error Boundary Component
 *
 * Story 4.1: Template Library Structure - Task 6.4
 *
 * Catches JavaScript errors in the template library component tree
 * and displays a fallback UI instead of crashing the entire app.
 *
 * @example
 * ```tsx
 * <TemplateLibraryErrorBoundary>
 *   <TemplateLibrary />
 * </TemplateLibraryErrorBoundary>
 * ```
 */
export class TemplateLibraryErrorBoundary extends Component<
  TemplateLibraryErrorBoundaryProps,
  TemplateLibraryErrorBoundaryState
> {
  constructor(props: TemplateLibraryErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): TemplateLibraryErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    console.error('Template Library Error:', error, errorInfo)

    // In production, you might want to send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div
          className="flex flex-col items-center justify-center h-full p-8 text-center"
          role="alert"
          aria-live="assertive"
        >
          <svg
            className="w-16 h-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Unable to load templates
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
            We had trouble loading the template library. This might be a temporary issue.
          </p>
          <Button
            onClick={this.handleRetry}
            className="min-h-[44px]"
          >
            Try Again
          </Button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left w-full max-w-md">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
