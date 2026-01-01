/**
 * AppSuggestionButton Component Tests - Story 33.2 (AC4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppSuggestionButton } from './AppSuggestionButton'
import { useFocusModeSuggestions } from '../../hooks/useFocusModeSuggestions'

// Mock the hook
vi.mock('../../hooks/useFocusModeSuggestions')
const mockUseFocusModeSuggestions = vi.mocked(useFocusModeSuggestions)

const mockSubmitSuggestion = vi.fn()

const defaultMockReturn = {
  submitSuggestion: mockSubmitSuggestion,
  pendingSuggestions: [] as Array<{
    id: string
    name: string
    pattern: string
    status: 'pending' | 'approved' | 'denied'
    reason: string | null
    childId: string
    familyId: string
    createdAt: number
    updatedAt: number
    respondedByUid: string | null
    respondedAt: number | null
    denialReason: string | null
  }>,
  loading: false,
  error: null,
  suggestions: [],
  approveSuggestion: vi.fn(),
  denySuggestion: vi.fn(),
}

describe('AppSuggestionButton - Story 33.2 AC4', () => {
  const defaultProps = {
    childId: 'child-1',
    familyId: 'family-1',
    childUid: 'child-uid-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitSuggestion.mockResolvedValue(undefined)
    mockUseFocusModeSuggestions.mockReturnValue(defaultMockReturn)
  })

  describe('Rendering', () => {
    it('renders the suggestion button', () => {
      render(<AppSuggestionButton {...defaultProps} />)

      expect(screen.getByTestId('app-suggestion-button')).toBeInTheDocument()
      expect(screen.getByTestId('suggest-app-trigger')).toBeInTheDocument()
    })

    it('displays suggest app text', () => {
      render(<AppSuggestionButton {...defaultProps} />)

      expect(screen.getByText('Suggest an App')).toBeInTheDocument()
    })

    it('shows pending count badge when there are pending suggestions', () => {
      const baseSuggestion = {
        pattern: 'test.com',
        reason: null,
        childId: 'child-1',
        familyId: 'family-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        respondedByUid: null,
        respondedAt: null,
        denialReason: null,
      }
      mockUseFocusModeSuggestions.mockReturnValueOnce({
        ...defaultMockReturn,
        pendingSuggestions: [
          { ...baseSuggestion, id: '1', name: 'App 1', status: 'pending' as const },
          { ...baseSuggestion, id: '2', name: 'App 2', status: 'pending' as const },
        ],
      })

      render(<AppSuggestionButton {...defaultProps} />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('opens form when button is clicked', () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))

      expect(screen.getByTestId('suggestion-form')).toBeInTheDocument()
    })

    it('shows form fields', () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))

      expect(screen.getByTestId('app-url-input')).toBeInTheDocument()
      expect(screen.getByTestId('app-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('reason-input')).toBeInTheDocument()
    })

    it('closes form when close button is clicked', () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))
      fireEvent.click(screen.getByTestId('close-form'))

      expect(screen.queryByTestId('suggestion-form')).not.toBeInTheDocument()
    })

    it('closes form when cancel button is clicked', () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))
      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(screen.queryByTestId('suggestion-form')).not.toBeInTheDocument()
    })
  })

  describe('Submission', () => {
    it('submits suggestion with all fields', async () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))

      fireEvent.change(screen.getByTestId('app-url-input'), { target: { value: 'spotify.com' } })
      fireEvent.change(screen.getByTestId('app-name-input'), { target: { value: 'Spotify' } })
      fireEvent.change(screen.getByTestId('reason-input'), {
        target: { value: 'I listen to music while studying' },
      })

      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockSubmitSuggestion).toHaveBeenCalledWith(
          'spotify.com',
          'Spotify',
          'I listen to music while studying'
        )
      })
    })

    it('submits suggestion without reason', async () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))

      fireEvent.change(screen.getByTestId('app-url-input'), { target: { value: 'spotify.com' } })
      fireEvent.change(screen.getByTestId('app-name-input'), { target: { value: 'Spotify' } })

      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockSubmitSuggestion).toHaveBeenCalledWith('spotify.com', 'Spotify', undefined)
      })
    })

    it('shows success message after submission', async () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))

      fireEvent.change(screen.getByTestId('app-url-input'), { target: { value: 'spotify.com' } })
      fireEvent.change(screen.getByTestId('app-name-input'), { target: { value: 'Spotify' } })

      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-success')).toBeInTheDocument()
      })
    })

    it('disables submit button when fields are empty', () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))

      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })

    it('enables submit button when required fields are filled', () => {
      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))

      fireEvent.change(screen.getByTestId('app-url-input'), { target: { value: 'example.com' } })
      fireEvent.change(screen.getByTestId('app-name-input'), { target: { value: 'Example' } })

      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    })
  })

  describe('Pending Suggestions Display', () => {
    it('shows pending suggestions in form', () => {
      // Use mockReturnValue (not Once) since component re-renders when form opens
      mockUseFocusModeSuggestions.mockReturnValue({
        ...defaultMockReturn,
        pendingSuggestions: [
          {
            id: '1',
            name: 'Spotify',
            pattern: 'spotify.com',
            status: 'pending' as const,
            reason: null,
            childId: 'child-1',
            familyId: 'family-1',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            respondedByUid: null,
            respondedAt: null,
            denialReason: null,
          },
        ],
      })

      render(<AppSuggestionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suggest-app-trigger'))

      expect(screen.getByTestId('pending-list')).toBeInTheDocument()
      expect(screen.getByText('Spotify')).toBeInTheDocument()
    })
  })
})
