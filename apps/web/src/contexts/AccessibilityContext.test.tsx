/**
 * AccessibilityContext Tests - Story 28.6
 *
 * Tests for the accessibility settings context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AccessibilityProvider, useAccessibility } from './AccessibilityContext'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/firebase', () => ({
  getFirebaseApp: vi.fn(() => ({})),
}))

// Mock AuthContext
vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
  })),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Test component to access context
function TestConsumer() {
  const { settings, loading, prefersReducedMotion, prefersHighContrast } = useAccessibility()
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="always-show">{settings.alwaysShowDescriptions.toString()}</div>
      <div data-testid="high-contrast">{settings.highContrastMode.toString()}</div>
      <div data-testid="larger-text">{settings.largerText.toString()}</div>
      <div data-testid="audio-descriptions">{settings.audioDescriptions.toString()}</div>
      <div data-testid="prefers-reduced-motion">{prefersReducedMotion.toString()}</div>
      <div data-testid="prefers-high-contrast">{prefersHighContrast.toString()}</div>
    </div>
  )
}

describe('AccessibilityContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Default settings', () => {
    it('should provide default accessibility settings', async () => {
      render(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('always-show')).toHaveTextContent('false')
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false')
      expect(screen.getByTestId('larger-text')).toHaveTextContent('false')
      expect(screen.getByTestId('audio-descriptions')).toHaveTextContent('false')
    })

    it('should provide OS preference detection', async () => {
      render(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('prefers-reduced-motion')).toHaveTextContent('false')
      expect(screen.getByTestId('prefers-high-contrast')).toHaveTextContent('false')
    })
  })

  describe('Story 28.6 AC1: Always show descriptions toggle', () => {
    it('should have alwaysShowDescriptions setting', async () => {
      render(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('always-show')).toBeInTheDocument()
      })
    })
  })

  describe('Story 28.6 AC2: High contrast mode', () => {
    it('should have highContrastMode setting', async () => {
      render(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('high-contrast')).toBeInTheDocument()
      })
    })
  })

  describe('Story 28.6 AC3: Larger text option', () => {
    it('should have largerText setting', async () => {
      render(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('larger-text')).toBeInTheDocument()
      })
    })
  })

  describe('Story 28.6 AC4: Audio descriptions option', () => {
    it('should have audioDescriptions setting', async () => {
      render(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('audio-descriptions')).toBeInTheDocument()
      })
    })
  })

  describe('Story 28.6 AC6: OS preference detection', () => {
    it('should detect prefers-reduced-motion', async () => {
      render(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('prefers-reduced-motion')).toBeInTheDocument()
      })
    })

    it('should detect prefers-contrast', async () => {
      render(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('prefers-high-contrast')).toBeInTheDocument()
      })
    })
  })

  describe('Hook usage', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestConsumer />)
      }).toThrow('useAccessibility must be used within an AccessibilityProvider')

      consoleError.mockRestore()
    })
  })
})
