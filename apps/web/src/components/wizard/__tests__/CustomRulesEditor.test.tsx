/**
 * Tests for CustomRulesEditor component.
 *
 * Story 4.5: Template Customization Preview - AC3, AC4
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomRulesEditor } from '../CustomRulesEditor'
import { MAX_CONDITIONS } from '../../../hooks/useTemplateCustomization'

describe('CustomRulesEditor', () => {
  const mockOnAddRule = vi.fn().mockReturnValue(true)
  const mockOnRemoveCustomRule = vi.fn()
  const mockOnRemoveTemplateRule = vi.fn()
  const mockOnRestoreTemplateRule = vi.fn()
  const mockIsTemplateRuleRemoved = vi.fn().mockReturnValue(false)

  const defaultProps = {
    templateRules: ['Rule 1', 'Rule 2', 'Rule 3'],
    customRules: [],
    isTemplateRuleRemoved: mockIsTemplateRuleRemoved,
    onAddRule: mockOnAddRule,
    onRemoveCustomRule: mockOnRemoveCustomRule,
    onRemoveTemplateRule: mockOnRemoveTemplateRule,
    onRestoreTemplateRule: mockOnRestoreTemplateRule,
    totalRuleCount: 3,
    canAddMoreRules: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render heading', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      expect(screen.getByText('Agreement Rules')).toBeInTheDocument()
    })

    it('should render rule count', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      expect(screen.getByText(`3 / ${MAX_CONDITIONS} rules`)).toBeInTheDocument()
    })

    it('should render template rules section', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      expect(screen.getByText('Template Rules')).toBeInTheDocument()
      expect(screen.getByText('Rule 1')).toBeInTheDocument()
      expect(screen.getByText('Rule 2')).toBeInTheDocument()
      expect(screen.getByText('Rule 3')).toBeInTheDocument()
    })

    it('should render custom rules section', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      expect(screen.getByText('Custom Rules')).toBeInTheDocument()
      expect(screen.getByText('No custom rules added yet')).toBeInTheDocument()
    })

    it('should render add new rule form', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      expect(screen.getByText('Add Custom Rule')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter a new rule...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add Rule' })).toBeInTheDocument()
    })
  })

  describe('template rules', () => {
    it('should render remove button for each template rule', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const removeButtons = screen.getAllByRole('button', { name: /Remove rule:/i })
      expect(removeButtons).toHaveLength(3)
    })

    it('should call onRemoveTemplateRule when remove button clicked', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const removeButtons = screen.getAllByRole('button', { name: /Remove rule:/i })
      fireEvent.click(removeButtons[0])

      expect(mockOnRemoveTemplateRule).toHaveBeenCalledWith(0)
    })

    it('should show restore button for removed rules', () => {
      mockIsTemplateRuleRemoved.mockImplementation((index) => index === 0)

      render(<CustomRulesEditor {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Restore rule: Rule 1/i })).toBeInTheDocument()
    })

    it('should call onRestoreTemplateRule when restore button clicked', () => {
      mockIsTemplateRuleRemoved.mockImplementation((index) => index === 0)

      render(<CustomRulesEditor {...defaultProps} />)

      const restoreButton = screen.getByRole('button', { name: /Restore rule: Rule 1/i })
      fireEvent.click(restoreButton)

      expect(mockOnRestoreTemplateRule).toHaveBeenCalledWith(0)
    })

    it('should show removed badge for removed rules', () => {
      mockIsTemplateRuleRemoved.mockImplementation((index) => index === 0)

      render(<CustomRulesEditor {...defaultProps} />)

      expect(screen.getByText('Removed')).toBeInTheDocument()
    })
  })

  describe('custom rules', () => {
    it('should render custom rules with added badge', () => {
      const propsWithCustomRules = {
        ...defaultProps,
        customRules: [
          {
            id: 'custom-1',
            text: 'My custom rule',
            category: 'behavior' as const,
            isCustom: true as const,
          },
        ],
      }

      render(<CustomRulesEditor {...propsWithCustomRules} />)

      expect(screen.getByText('My custom rule')).toBeInTheDocument()
      expect(screen.getByText('Custom Addition')).toBeInTheDocument()
      expect(screen.getByText('(Behavior)')).toBeInTheDocument()
    })

    it('should call onRemoveCustomRule when remove button clicked', () => {
      const propsWithCustomRules = {
        ...defaultProps,
        customRules: [
          {
            id: 'custom-1',
            text: 'My custom rule',
            category: 'behavior' as const,
            isCustom: true as const,
          },
        ],
      }

      render(<CustomRulesEditor {...propsWithCustomRules} />)

      const removeButton = screen.getByRole('button', { name: /Remove custom rule:/i })
      fireEvent.click(removeButton)

      expect(mockOnRemoveCustomRule).toHaveBeenCalledWith('custom-1')
    })
  })

  describe('adding rules', () => {
    it('should call onAddRule with text and category', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter a new rule...')
      const categorySelect = screen.getByRole('combobox')
      const addButton = screen.getByRole('button', { name: 'Add Rule' })

      fireEvent.change(input, { target: { value: 'New rule text' } })
      fireEvent.change(categorySelect, { target: { value: 'behavior' } })
      fireEvent.click(addButton)

      expect(mockOnAddRule).toHaveBeenCalledWith('New rule text', 'behavior')
    })

    it('should clear input after adding rule', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter a new rule...') as HTMLInputElement
      const addButton = screen.getByRole('button', { name: 'Add Rule' })

      fireEvent.change(input, { target: { value: 'New rule text' } })
      fireEvent.click(addButton)

      expect(input.value).toBe('')
    })

    it('should add rule on Enter key', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter a new rule...')

      fireEvent.change(input, { target: { value: 'New rule text' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockOnAddRule).toHaveBeenCalledWith('New rule text', 'other')
    })

    it('should disable add button when input is empty', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const addButton = screen.getByRole('button', { name: 'Add Rule' })
      expect(addButton).toBeDisabled()
    })

    it('should enable add button when input has text', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter a new rule...')
      fireEvent.change(input, { target: { value: 'Some text' } })

      const addButton = screen.getByRole('button', { name: 'Add Rule' })
      expect(addButton).not.toBeDisabled()
    })
  })

  describe('rule limit enforcement', () => {
    it('should disable input when limit reached', () => {
      render(<CustomRulesEditor {...defaultProps} canAddMoreRules={false} totalRuleCount={100} />)

      const input = screen.getByPlaceholderText('Enter a new rule...')
      expect(input).toBeDisabled()
    })

    it('should show warning when limit reached', () => {
      render(<CustomRulesEditor {...defaultProps} canAddMoreRules={false} totalRuleCount={100} />)

      expect(
        screen.getByText(`Maximum of ${MAX_CONDITIONS} rules reached. Remove a rule to add more.`)
      ).toBeInTheDocument()
    })

    it('should show red text when at limit', () => {
      render(<CustomRulesEditor {...defaultProps} totalRuleCount={100} />)

      const countText = screen.getByText(`100 / ${MAX_CONDITIONS} rules`)
      expect(countText).toHaveClass('text-red-600')
    })
  })

  describe('accessibility', () => {
    it('should have accessible list for template rules', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      expect(screen.getByRole('list', { name: 'Template rules' })).toBeInTheDocument()
    })

    it('should have accessible list for custom rules', () => {
      const propsWithCustomRules = {
        ...defaultProps,
        customRules: [
          {
            id: 'custom-1',
            text: 'My custom rule',
            category: 'behavior' as const,
            isCustom: true as const,
          },
        ],
      }

      render(<CustomRulesEditor {...propsWithCustomRules} />)

      expect(screen.getByRole('list', { name: 'Custom rules' })).toBeInTheDocument()
    })

    it('should have minimum touch target on buttons (NFR49)', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const removeButtons = screen.getAllByRole('button', { name: /Remove rule:/i })
      removeButtons.forEach((button) => {
        expect(button).toHaveClass('min-h-[44px]')
        expect(button).toHaveClass('min-w-[60px]')
      })
    })

    it('should have aria-live on rule count', () => {
      render(<CustomRulesEditor {...defaultProps} />)

      const countElement = screen.getByText(`3 / ${MAX_CONDITIONS} rules`)
      expect(countElement).toHaveAttribute('aria-live', 'polite')
    })
  })
})
