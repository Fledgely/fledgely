/**
 * CustomRuleForm Tests
 *
 * Story 4.5: Template Customization Preview - Task 3.3
 * AC #3: Parent can add custom rules not in template
 *
 * Tests:
 * - Form rendering
 * - Validation
 * - Category selection
 * - Submit behavior
 * - Edit mode
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomRuleForm } from '../CustomRuleForm'

describe('CustomRuleForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  }

  describe('basic rendering', () => {
    it('renders form heading for new rule', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByText('Add Custom Rule')).toBeInTheDocument()
    })

    it('renders form heading for edit mode', () => {
      render(
        <CustomRuleForm
          {...defaultProps}
          initialValues={{ title: 'Existing', description: 'Rule' }}
        />
      )
      expect(screen.getByText('Edit Custom Rule')).toBeInTheDocument()
    })

    it('renders title input', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByLabelText(/rule title/i)).toBeInTheDocument()
    })

    it('renders description textarea', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('renders category selection', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByRole('radiogroup', { name: /category/i })).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add rule/i })).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('initial values', () => {
    it('populates title from initial values', () => {
      render(
        <CustomRuleForm
          {...defaultProps}
          initialValues={{ title: 'Test Title' }}
        />
      )
      expect(screen.getByLabelText(/rule title/i)).toHaveValue('Test Title')
    })

    it('populates description from initial values', () => {
      render(
        <CustomRuleForm
          {...defaultProps}
          initialValues={{ description: 'Test Description' }}
        />
      )
      expect(screen.getByLabelText(/description/i)).toHaveValue('Test Description')
    })

    it('selects category from initial values', () => {
      render(
        <CustomRuleForm
          {...defaultProps}
          initialValues={{ category: 'apps' }}
        />
      )
      expect(screen.getByRole('radio', { name: /apps.*content/i })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })
  })

  describe('validation', () => {
    it('shows error when title is empty on submit', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      await user.type(screen.getByLabelText(/description/i), 'Some description')
      await user.click(screen.getByRole('button', { name: /add rule/i }))

      expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    })

    it('shows error when description is empty on submit', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      await user.type(screen.getByLabelText(/rule title/i), 'Some title')
      await user.click(screen.getByRole('button', { name: /add rule/i }))

      expect(await screen.findByText(/description is required/i)).toBeInTheDocument()
    })

    it('does not submit when validation fails', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<CustomRuleForm {...defaultProps} onSubmit={onSubmit} />)

      await user.click(screen.getByRole('button', { name: /add rule/i }))

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows validation error on blur', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      const titleInput = screen.getByLabelText(/rule title/i)
      await user.click(titleInput)
      await user.tab() // Blur

      expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    })

    it('clears error when field is filled', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      // Trigger error
      await user.click(screen.getByRole('button', { name: /add rule/i }))
      expect(await screen.findByText(/title is required/i)).toBeInTheDocument()

      // Fill field
      await user.type(screen.getByLabelText(/rule title/i), 'Test')

      expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
    })

    it('marks input as invalid when error', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add rule/i }))

      expect(screen.getByLabelText(/rule title/i)).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('character limits', () => {
    it('shows title character count', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByText('0/100 characters')).toBeInTheDocument()
    })

    it('shows description character count', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByText('0/500 characters')).toBeInTheDocument()
    })

    it('updates title character count on input', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      await user.type(screen.getByLabelText(/rule title/i), 'Hello')

      expect(screen.getByText('5/100 characters')).toBeInTheDocument()
    })

    it('enforces maxLength on title', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByLabelText(/rule title/i)).toHaveAttribute('maxLength', '100')
    })

    it('enforces maxLength on description', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByLabelText(/description/i)).toHaveAttribute('maxLength', '500')
    })
  })

  describe('category selection', () => {
    it('renders all category options', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /time.*schedule/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /apps.*content/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /privacy.*safety/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /other/i })).toBeInTheDocument()
    })

    it('defaults to "other" category', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /other/i })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })

    it('allows selecting different category', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /time.*schedule/i }))

      expect(screen.getByRole('radio', { name: /time.*schedule/i })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })
  })

  describe('submit behavior', () => {
    it('calls onSubmit with form data', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<CustomRuleForm {...defaultProps} onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/rule title/i), 'My Rule')
      await user.type(screen.getByLabelText(/description/i), 'My Description')
      await user.click(screen.getByRole('radio', { name: /time.*schedule/i }))
      await user.click(screen.getByRole('button', { name: /add rule/i }))

      expect(onSubmit).toHaveBeenCalledWith({
        title: 'My Rule',
        description: 'My Description',
        category: 'time',
      })
    })

    it('trims whitespace from inputs', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<CustomRuleForm {...defaultProps} onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/rule title/i), '  My Rule  ')
      await user.type(screen.getByLabelText(/description/i), '  My Description  ')
      await user.click(screen.getByRole('button', { name: /add rule/i }))

      expect(onSubmit).toHaveBeenCalledWith({
        title: 'My Rule',
        description: 'My Description',
        category: 'other',
      })
    })

    it('shows "Save Changes" button in edit mode', () => {
      render(
        <CustomRuleForm
          {...defaultProps}
          initialValues={{ title: 'Test', description: 'Test' }}
        />
      )
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })
  })

  describe('cancel behavior', () => {
    it('calls onCancel when cancel is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<CustomRuleForm {...defaultProps} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('focus management', () => {
    it('focuses title input on mount', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByLabelText(/rule title/i)).toHaveFocus()
    })
  })

  describe('accessibility', () => {
    it('form has accessible name', () => {
      render(<CustomRuleForm {...defaultProps} />)
      expect(screen.getByRole('form', { name: /add custom rule/i })).toBeInTheDocument()
    })

    it('required fields are marked', () => {
      render(<CustomRuleForm {...defaultProps} />)
      const titleLabel = screen.getByText(/rule title/i)
      expect(titleLabel.textContent).toContain('*')
    })

    it('error messages have alert role', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add rule/i }))

      const errorMessages = await screen.findAllByRole('alert')
      expect(errorMessages.length).toBeGreaterThan(0)
    })

    it('inputs are linked to error messages via aria-describedby', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add rule/i }))

      const titleInput = screen.getByLabelText(/rule title/i)
      expect(titleInput).toHaveAttribute('aria-describedby', 'title-error')
    })

    it('buttons meet minimum touch target (44px)', () => {
      render(<CustomRuleForm {...defaultProps} />)
      const submitButton = screen.getByRole('button', { name: /add rule/i })
      expect(submitButton.className).toContain('min-h-[44px]')
    })

    it('category options have proper radiogroup', () => {
      render(<CustomRuleForm {...defaultProps} />)
      const radiogroup = screen.getByRole('radiogroup')
      expect(radiogroup).toHaveAttribute('aria-label', 'Rule category')
    })
  })

  describe('styling', () => {
    it('has green background styling', () => {
      const { container } = render(<CustomRuleForm {...defaultProps} />)
      const form = container.querySelector('form')
      expect(form?.className).toContain('bg-green')
    })

    it('shows error styling on invalid inputs', async () => {
      const user = userEvent.setup()
      render(<CustomRuleForm {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add rule/i }))

      const titleInput = screen.getByLabelText(/rule title/i)
      expect(titleInput.className).toContain('border-red')
    })
  })
})
