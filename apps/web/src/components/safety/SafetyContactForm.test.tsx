/**
 * SafetyContactForm Component Tests - Story 0.5.1
 *
 * Tests for the safety contact form component.
 *
 * Requirements tested:
 * - AC4: Form accepts message and safe contact info
 * - AC7: Visual subtlety for safety (neutral language)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SafetyContactForm } from './SafetyContactForm'

// Mock the useSafetyContact hook
const mockSubmit = vi.fn()
const mockReset = vi.fn()

vi.mock('../../hooks/useSafetyContact', () => ({
  useSafetyContact: () => ({
    submit: mockSubmit,
    isLoading: false,
    error: null,
    isSuccess: false,
    reset: mockReset,
  }),
}))

describe('SafetyContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Rendering', () => {
    it('should render message field', () => {
      render(<SafetyContactForm />)

      expect(screen.getByLabelText(/your message/i)).toBeInTheDocument()
    })

    it('should render urgency selector', () => {
      render(<SafetyContactForm />)

      expect(screen.getByLabelText(/when would you like us to respond/i)).toBeInTheDocument()
    })

    it('should render phone field', () => {
      render(<SafetyContactForm />)

      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    })

    it('should render email field', () => {
      render(<SafetyContactForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('should render safe time field', () => {
      render(<SafetyContactForm />)

      expect(screen.getByLabelText(/best time to contact/i)).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<SafetyContactForm />)

      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
    })

    it('should render cancel button when showCancel is true', () => {
      const onCancel = vi.fn()
      render(<SafetyContactForm showCancel={true} onCancel={onCancel} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should not render cancel button when showCancel is false', () => {
      render(<SafetyContactForm showCancel={false} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  describe('Neutral language (AC7)', () => {
    it('should use neutral title "Contact Support"', () => {
      render(<SafetyContactForm />)

      expect(screen.getByRole('heading', { name: /contact support/i })).toBeInTheDocument()
    })

    it('should have neutral urgency labels without alarming language', () => {
      render(<SafetyContactForm />)

      const select = screen.getByLabelText(/when would you like us to respond/i)
      expect(select).toHaveTextContent('Whenever convenient')
      expect(select).toHaveTextContent('Within a day or two')
      expect(select).toHaveTextContent('As soon as possible')
    })

    it('should NOT contain alarming words like "abuse" or "escape"', () => {
      render(<SafetyContactForm />)

      const formText = document.body.textContent?.toLowerCase() || ''
      expect(formText).not.toContain('abuse')
      expect(formText).not.toContain('escape')
      expect(formText).not.toContain('emergency')
      expect(formText).not.toContain('danger')
    })
  })

  describe('Form validation', () => {
    it('should show error when message is empty', async () => {
      render(<SafetyContactForm />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/please enter a message/i)
      })
    })

    it('should show error for invalid email format', async () => {
      render(<SafetyContactForm />)

      const messageField = screen.getByLabelText(/your message/i)
      const emailField = screen.getByLabelText(/email/i)

      fireEvent.change(messageField, { target: { value: 'Test message' } })
      fireEvent.change(emailField, { target: { value: 'invalid-email' } })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
      })
    })

    it('should show character count for message field', () => {
      render(<SafetyContactForm />)

      expect(screen.getByText(/0 \/ 5000/i)).toBeInTheDocument()
    })

    it('should update character count as user types', async () => {
      render(<SafetyContactForm />)

      const messageField = screen.getByLabelText(/your message/i)
      fireEvent.change(messageField, { target: { value: 'Hello' } })

      expect(screen.getByText(/5 \/ 5000/i)).toBeInTheDocument()
    })
  })

  describe('Form submission', () => {
    it('should call submit with correct data', async () => {
      render(<SafetyContactForm />)

      const messageField = screen.getByLabelText(/your message/i)
      fireEvent.change(messageField, { target: { value: 'I need help' } })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          message: 'I need help',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })
    })

    it('should include safe contact info when provided', async () => {
      render(<SafetyContactForm />)

      const messageField = screen.getByLabelText(/your message/i)
      const phoneField = screen.getByLabelText(/phone/i)
      const emailField = screen.getByLabelText(/email/i)

      fireEvent.change(messageField, { target: { value: 'I need help' } })
      fireEvent.change(phoneField, { target: { value: '555-1234' } })
      fireEvent.change(emailField, { target: { value: 'test@example.com' } })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          message: 'I need help',
          safeContactInfo: expect.objectContaining({
            phone: '555-1234',
            email: 'test@example.com',
          }),
          urgency: 'when_you_can',
        })
      })
    })

    it('should include selected urgency level', async () => {
      render(<SafetyContactForm />)

      const messageField = screen.getByLabelText(/your message/i)
      const urgencySelect = screen.getByLabelText(/when would you like us to respond/i)

      fireEvent.change(messageField, { target: { value: 'I need help' } })
      fireEvent.change(urgencySelect, { target: { value: 'urgent' } })

      const submitButton = screen.getByRole('button', { name: /send message/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          message: 'I need help',
          safeContactInfo: null,
          urgency: 'urgent',
        })
      })
    })
  })

  describe('Cancel functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn()
      render(<SafetyContactForm onCancel={onCancel} showCancel={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Preferred contact method', () => {
    it('should show preferred contact options when phone or email is entered', async () => {
      render(<SafetyContactForm />)

      // Get the phone input field using its id
      const phoneField = screen.getByPlaceholderText(/your phone number/i)
      fireEvent.change(phoneField, { target: { value: '555-1234' } })

      await waitFor(() => {
        expect(screen.getByText(/preferred way to contact/i)).toBeInTheDocument()
      })
      // Check that radio buttons are present
      expect(screen.getByRole('radio', { name: /^phone$/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /^email$/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /either/i })).toBeInTheDocument()
    })
  })
})
