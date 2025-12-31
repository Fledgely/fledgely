/**
 * AccessibilitySettings Component Tests - Story 28.6
 *
 * Tests for the accessibility settings panel.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccessibilitySettings } from './AccessibilitySettings'
import { DEFAULT_ACCESSIBILITY_SETTINGS } from '@fledgely/shared'

// Mock the AccessibilityContext
const mockUpdateSetting = vi.fn().mockResolvedValue(undefined)
const mockSettings = { ...DEFAULT_ACCESSIBILITY_SETTINGS }

vi.mock('../../contexts/AccessibilityContext', () => ({
  useAccessibility: vi.fn(() => ({
    settings: mockSettings,
    loading: false,
    updateSetting: mockUpdateSetting,
    prefersReducedMotion: false,
    prefersHighContrast: false,
  })),
}))

// Import the mock to modify it in tests
import { useAccessibility } from '../../contexts/AccessibilityContext'

describe('AccessibilitySettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock settings
    Object.assign(mockSettings, DEFAULT_ACCESSIBILITY_SETTINGS)
    // Reset the mock to default state
    vi.mocked(useAccessibility).mockReturnValue({
      settings: mockSettings,
      loading: false,
      updateSetting: mockUpdateSetting,
      updateSettings: vi.fn(),
      prefersReducedMotion: false,
      prefersHighContrast: false,
    })
  })

  describe('Story 28.6 AC1: Always show descriptions toggle', () => {
    it('should render always show descriptions toggle', () => {
      render(<AccessibilitySettings />)

      expect(screen.getByTestId('setting-alwaysShowDescriptions')).toBeInTheDocument()
      expect(screen.getByText('Always Show Descriptions')).toBeInTheDocument()
      expect(
        screen.getByText('Automatically expand AI-generated descriptions for all screenshots')
      ).toBeInTheDocument()
    })

    it('should toggle always show descriptions when clicked', async () => {
      render(<AccessibilitySettings />)

      const toggle = screen.getByTestId('toggle-alwaysShowDescriptions')
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(mockUpdateSetting).toHaveBeenCalledWith('alwaysShowDescriptions', true)
      })
    })
  })

  describe('Story 28.6 AC2: High contrast mode', () => {
    it('should render high contrast mode toggle', () => {
      render(<AccessibilitySettings />)

      expect(screen.getByTestId('setting-highContrastMode')).toBeInTheDocument()
      expect(screen.getByText('High Contrast Mode')).toBeInTheDocument()
      expect(
        screen.getByText('Increase contrast for better visibility (for low-vision users)')
      ).toBeInTheDocument()
    })

    it('should toggle high contrast mode when clicked', async () => {
      render(<AccessibilitySettings />)

      const toggle = screen.getByTestId('toggle-highContrastMode')
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(mockUpdateSetting).toHaveBeenCalledWith('highContrastMode', true)
      })
    })
  })

  describe('Story 28.6 AC3: Larger text option', () => {
    it('should render larger text toggle', () => {
      render(<AccessibilitySettings />)

      expect(screen.getByTestId('setting-largerText')).toBeInTheDocument()
      expect(screen.getByText('Larger Text')).toBeInTheDocument()
      expect(
        screen.getByText('Increase text size throughout the app (also respects system font size)')
      ).toBeInTheDocument()
    })

    it('should toggle larger text when clicked', async () => {
      render(<AccessibilitySettings />)

      const toggle = screen.getByTestId('toggle-largerText')
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(mockUpdateSetting).toHaveBeenCalledWith('largerText', true)
      })
    })
  })

  describe('Story 28.6 AC4: Audio descriptions option', () => {
    it('should render audio descriptions toggle', () => {
      render(<AccessibilitySettings />)

      expect(screen.getByTestId('setting-audioDescriptions')).toBeInTheDocument()
      expect(screen.getByText('Audio Descriptions')).toBeInTheDocument()
      expect(
        screen.getByText('Enable spoken playback of screenshot descriptions (coming soon)')
      ).toBeInTheDocument()
    })

    it('should toggle audio descriptions when clicked', async () => {
      render(<AccessibilitySettings />)

      const toggle = screen.getByTestId('toggle-audioDescriptions')
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(mockUpdateSetting).toHaveBeenCalledWith('audioDescriptions', true)
      })
    })
  })

  describe('Story 28.6 AC6: OS preference indicators', () => {
    it('should show OS preference badge when high contrast matches OS preference', () => {
      vi.mocked(useAccessibility).mockReturnValue({
        settings: { ...DEFAULT_ACCESSIBILITY_SETTINGS, highContrastMode: true },
        loading: false,
        updateSetting: mockUpdateSetting,
        updateSettings: vi.fn(),
        prefersReducedMotion: false,
        prefersHighContrast: true,
      })

      render(<AccessibilitySettings />)

      expect(screen.getByTestId('os-preference-highContrastMode')).toBeInTheDocument()
      expect(screen.getByText('OS Default')).toBeInTheDocument()
    })

    it('should show OS preference badge when always show descriptions matches reduced motion', () => {
      vi.mocked(useAccessibility).mockReturnValue({
        settings: { ...DEFAULT_ACCESSIBILITY_SETTINGS, alwaysShowDescriptions: true },
        loading: false,
        updateSetting: mockUpdateSetting,
        updateSettings: vi.fn(),
        prefersReducedMotion: true,
        prefersHighContrast: false,
      })

      render(<AccessibilitySettings />)

      expect(screen.getByTestId('os-preference-alwaysShowDescriptions')).toBeInTheDocument()
    })

    it('should not show OS preference badge when setting does not match OS preference', () => {
      vi.mocked(useAccessibility).mockReturnValue({
        settings: { ...DEFAULT_ACCESSIBILITY_SETTINGS, highContrastMode: false },
        loading: false,
        updateSetting: mockUpdateSetting,
        updateSettings: vi.fn(),
        prefersReducedMotion: false,
        prefersHighContrast: true,
      })

      render(<AccessibilitySettings />)

      expect(screen.queryByTestId('os-preference-highContrastMode')).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show loading state when settings are loading', () => {
      vi.mocked(useAccessibility).mockReturnValue({
        settings: DEFAULT_ACCESSIBILITY_SETTINGS,
        loading: true,
        updateSetting: mockUpdateSetting,
        updateSettings: vi.fn(),
        prefersReducedMotion: false,
        prefersHighContrast: false,
      })

      render(<AccessibilitySettings />)

      expect(screen.getByTestId('accessibility-settings-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading accessibility settings...')).toBeInTheDocument()
    })
  })

  describe('Panel structure', () => {
    it('should render accessibility settings panel with header', () => {
      render(<AccessibilitySettings />)

      expect(screen.getByTestId('accessibility-settings')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Accessibility Settings' })).toBeInTheDocument()
    })

    it('should render description text', () => {
      render(<AccessibilitySettings />)

      expect(screen.getByText(/Customize how the app works for you/i)).toBeInTheDocument()
    })
  })
})
