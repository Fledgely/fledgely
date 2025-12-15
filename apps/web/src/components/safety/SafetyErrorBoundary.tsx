'use client'

import { Component, type ReactNode } from 'react'

interface SafetyErrorBoundaryProps {
  children: ReactNode
}

interface SafetyErrorBoundaryState {
  hasError: boolean
}

/**
 * Error Boundary for Safety Features
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 *
 * If the safety form crashes, we MUST show a fallback that allows
 * the victim to still get help through alternative means.
 */
export class SafetyErrorBoundary extends Component<
  SafetyErrorBoundaryProps,
  SafetyErrorBoundaryState
> {
  constructor(props: SafetyErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): SafetyErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging - but don't expose to family
    console.error('Safety feature error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm text-muted-foreground">
          <p className="mb-2">
            We&apos;re experiencing technical difficulties.
          </p>
          <p>
            If you need immediate assistance, please contact support directly.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
