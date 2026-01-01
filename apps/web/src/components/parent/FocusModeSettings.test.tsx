/**
 * FocusModeSettings Component Tests - Story 33.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FocusModeSettings } from './FocusModeSettings'
import { useFocusModeConfig } from '../../hooks/useFocusModeConfig'

// Mock the useFocusModeConfig hook
vi.mock('../../hooks/useFocusModeConfig')
const mockUseFocusModeConfig = vi.mocked(useFocusModeConfig)

const mockAddToAllowList = vi.fn()
const mockAddToBlockList = vi.fn()
const mockRemoveFromAllowList = vi.fn()
const mockRemoveFromBlockList = vi.fn()
const mockToggleDefaultCategories = vi.fn()

const defaultMockReturn = {
  config: {
    childId: 'child-1',
    familyId: 'family-1',
    useDefaultCategories: true,
    customAllowList: [],
    customBlockList: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  loading: false,
  error: null,
  effectiveAllowList: [
    { pattern: 'docs.google.com', name: 'Google Docs', isDefault: true },
    { pattern: 'custom-edu.com', name: 'Custom Education', isDefault: false },
  ],
  effectiveBlockList: [
    { pattern: 'tiktok.com', name: 'TikTok', isDefault: true },
    { pattern: 'distraction.com', name: 'Distraction Site', isDefault: false },
  ],
  addToAllowList: mockAddToAllowList,
  addToBlockList: mockAddToBlockList,
  removeFromAllowList: mockRemoveFromAllowList,
  removeFromBlockList: mockRemoveFromBlockList,
  toggleDefaultCategories: mockToggleDefaultCategories,
  toggleCategory: vi.fn(),
}

describe('FocusModeSettings - Story 33.2', () => {
  const defaultProps = {
    childId: 'child-1',
    familyId: 'family-1',
    parentUid: 'parent-1',
    childName: 'Emma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFocusModeConfig.mockReturnValue(defaultMockReturn)
  })

  describe('Rendering', () => {
    it('renders the settings component', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByTestId('focus-mode-settings')).toBeInTheDocument()
    })

    it('displays header with child name', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByText('Focus Mode Settings')).toBeInTheDocument()
      expect(screen.getByText(/Emma/)).toBeInTheDocument()
    })

    it('shows loading state', () => {
      mockUseFocusModeConfig.mockReturnValueOnce({
        ...defaultMockReturn,
        config: null,
        loading: true,
        effectiveAllowList: [],
        effectiveBlockList: [],
      })

      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByTestId('focus-mode-settings-loading')).toBeInTheDocument()
    })

    it('shows error state', () => {
      mockUseFocusModeConfig.mockReturnValueOnce({
        ...defaultMockReturn,
        config: null,
        loading: false,
        error: 'Failed to load configuration',
        effectiveAllowList: [],
        effectiveBlockList: [],
      })

      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByTestId('focus-mode-settings-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load configuration')).toBeInTheDocument()
    })
  })

  describe('Default Categories (AC1, AC2)', () => {
    it('shows default categories toggle', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByTestId('default-categories-section')).toBeInTheDocument()
      expect(screen.getByTestId('default-categories-toggle')).toBeInTheDocument()
    })

    it('displays allowed categories', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByText('education')).toBeInTheDocument()
      expect(screen.getByText('productivity')).toBeInTheDocument()
    })

    it('displays blocked categories', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByText('social media')).toBeInTheDocument()
      expect(screen.getByText('games')).toBeInTheDocument()
    })

    it('calls toggleDefaultCategories when toggle is clicked', () => {
      render(<FocusModeSettings {...defaultProps} />)

      const toggle = screen.getByTestId('default-categories-toggle')
      fireEvent.click(toggle)

      expect(mockToggleDefaultCategories).toHaveBeenCalledWith(false)
    })
  })

  describe('Allowed Apps Section (AC3)', () => {
    it('displays allowed apps list', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByTestId('allowed-apps-section')).toBeInTheDocument()
      expect(screen.getByTestId('allowed-apps-list')).toBeInTheDocument()
    })

    it('shows default app with badge', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByText('Google Docs')).toBeInTheDocument()
      expect(screen.getByText('docs.google.com')).toBeInTheDocument()
    })

    it('shows custom app without badge', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByText('Custom Education')).toBeInTheDocument()
    })

    it('allows adding custom app to allow list', async () => {
      render(<FocusModeSettings {...defaultProps} />)

      const patternInput = screen.getByTestId('allow-app-pattern-input')
      const nameInput = screen.getByTestId('allow-app-name-input')
      const addButton = screen.getByTestId('add-allow-app-button')

      fireEvent.change(patternInput, { target: { value: 'newapp.com' } })
      fireEvent.change(nameInput, { target: { value: 'New App' } })
      fireEvent.click(addButton)

      expect(mockAddToAllowList).toHaveBeenCalledWith('newapp.com', 'New App')
    })

    it('allows removing custom app from allow list', () => {
      render(<FocusModeSettings {...defaultProps} />)

      const removeButton = screen.getByTestId('remove-allow-custom-edu.com')
      fireEvent.click(removeButton)

      expect(mockRemoveFromAllowList).toHaveBeenCalledWith('custom-edu.com')
    })

    it('does not show remove button for default apps', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.queryByTestId('remove-allow-docs.google.com')).not.toBeInTheDocument()
    })
  })

  describe('Blocked Apps Section (AC3)', () => {
    it('displays blocked apps list', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByTestId('blocked-apps-section')).toBeInTheDocument()
      expect(screen.getByTestId('blocked-apps-list')).toBeInTheDocument()
    })

    it('shows default blocked app with badge', () => {
      render(<FocusModeSettings {...defaultProps} />)

      expect(screen.getByText('TikTok')).toBeInTheDocument()
      expect(screen.getByText('tiktok.com')).toBeInTheDocument()
    })

    it('allows adding custom app to block list', async () => {
      render(<FocusModeSettings {...defaultProps} />)

      const patternInput = screen.getByTestId('block-app-pattern-input')
      const nameInput = screen.getByTestId('block-app-name-input')
      const addButton = screen.getByTestId('add-block-app-button')

      fireEvent.change(patternInput, { target: { value: 'badsite.com' } })
      fireEvent.change(nameInput, { target: { value: 'Bad Site' } })
      fireEvent.click(addButton)

      expect(mockAddToBlockList).toHaveBeenCalledWith('badsite.com', 'Bad Site')
    })

    it('allows removing custom app from block list', () => {
      render(<FocusModeSettings {...defaultProps} />)

      const removeButton = screen.getByTestId('remove-block-distraction.com')
      fireEvent.click(removeButton)

      expect(mockRemoveFromBlockList).toHaveBeenCalledWith('distraction.com')
    })
  })

  describe('Form Validation', () => {
    it('disables add button when pattern is empty', () => {
      render(<FocusModeSettings {...defaultProps} />)

      const nameInput = screen.getByTestId('allow-app-name-input')
      const addButton = screen.getByTestId('add-allow-app-button')

      fireEvent.change(nameInput, { target: { value: 'New App' } })

      expect(addButton).toBeDisabled()
    })

    it('disables add button when name is empty', () => {
      render(<FocusModeSettings {...defaultProps} />)

      const patternInput = screen.getByTestId('allow-app-pattern-input')
      const addButton = screen.getByTestId('add-allow-app-button')

      fireEvent.change(patternInput, { target: { value: 'example.com' } })

      expect(addButton).toBeDisabled()
    })

    it('enables add button when both fields are filled', () => {
      render(<FocusModeSettings {...defaultProps} />)

      const patternInput = screen.getByTestId('allow-app-pattern-input')
      const nameInput = screen.getByTestId('allow-app-name-input')
      const addButton = screen.getByTestId('add-allow-app-button')

      fireEvent.change(patternInput, { target: { value: 'example.com' } })
      fireEvent.change(nameInput, { target: { value: 'Example' } })

      expect(addButton).not.toBeDisabled()
    })
  })
})
