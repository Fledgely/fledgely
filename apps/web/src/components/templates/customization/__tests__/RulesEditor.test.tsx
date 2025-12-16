/**
 * RulesEditor Tests
 *
 * Story 4.5: Template Customization Preview - Task 3
 * AC #3: Parent can add custom rules not in template
 * AC #4: Parent can remove template rules they don't want
 *
 * Tests:
 * - Basic rendering
 * - Rule toggle (enable/disable)
 * - Add custom rule
 * - Remove custom rule
 * - Edit custom rule
 * - Diff highlighting
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RulesEditor } from '../RulesEditor'
import type { TemplateSection } from '@fledgely/contracts'
import type { CustomRule } from '../useTemplateDraft'

const mockTemplateRules: TemplateSection[] = [
  {
    id: 'rule-1',
    title: 'Screen Time Limits',
    description: 'Daily screen time rules',
    category: 'time',
    content: '60 minutes on school days',
  },
  {
    id: 'rule-2',
    title: 'Bedtime Rules',
    description: 'No screens before bed',
    category: 'time',
    content: 'No screens after 8:00 PM',
  },
  {
    id: 'rule-3',
    title: 'App Categories',
    description: 'Allowed app types',
    category: 'apps',
    content: 'Educational and entertainment apps',
  },
]

const mockCustomRules: CustomRule[] = [
  {
    id: 'custom-1',
    title: 'No phones during meals',
    description: 'Keep family meals device-free',
    category: 'time',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

describe('RulesEditor', () => {
  const defaultProps = {
    templateRules: mockTemplateRules,
    enabledRuleIds: ['rule-1', 'rule-2', 'rule-3'],
    disabledRuleIds: [] as string[],
    customRules: [] as CustomRule[],
    onEnableRule: vi.fn(),
    onDisableRule: vi.fn(),
    onAddCustomRule: vi.fn(),
    onRemoveCustomRule: vi.fn(),
    onUpdateCustomRule: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('renders section heading', () => {
      render(<RulesEditor {...defaultProps} />)
      expect(screen.getByText(/agreement rules/i)).toBeInTheDocument()
    })

    it('renders section description', () => {
      render(<RulesEditor {...defaultProps} />)
      expect(screen.getByText(/customize which rules to include/i)).toBeInTheDocument()
    })

    it('renders all template rules', () => {
      render(<RulesEditor {...defaultProps} />)
      expect(screen.getByText('Screen Time Limits')).toBeInTheDocument()
      expect(screen.getByText('Bedtime Rules')).toBeInTheDocument()
      expect(screen.getByText('App Categories')).toBeInTheDocument()
    })

    it('renders rule descriptions', () => {
      render(<RulesEditor {...defaultProps} />)
      expect(screen.getByText('Daily screen time rules')).toBeInTheDocument()
    })

    it('renders add custom rule button', () => {
      render(<RulesEditor {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add custom rule/i })).toBeInTheDocument()
    })
  })

  describe('rule toggle (AC #4)', () => {
    it('renders toggle switches for all rules', () => {
      render(<RulesEditor {...defaultProps} />)
      const switches = screen.getAllByRole('switch')
      expect(switches).toHaveLength(3)
    })

    it('shows enabled rules as checked', () => {
      render(<RulesEditor {...defaultProps} />)
      const switches = screen.getAllByRole('switch')
      switches.forEach((sw) => {
        expect(sw).toHaveAttribute('aria-checked', 'true')
      })
    })

    it('shows disabled rules as unchecked', () => {
      render(
        <RulesEditor
          {...defaultProps}
          enabledRuleIds={['rule-1', 'rule-3']}
          disabledRuleIds={['rule-2']}
        />
      )
      const bedtimeSwitch = screen.getByRole('switch', { name: /bedtime rules/i })
      expect(bedtimeSwitch).toHaveAttribute('aria-checked', 'false')
    })

    it('calls onDisableRule when enabled rule is toggled', async () => {
      const user = userEvent.setup()
      const onDisableRule = vi.fn()
      render(<RulesEditor {...defaultProps} onDisableRule={onDisableRule} />)

      await user.click(screen.getByRole('switch', { name: /screen time limits/i }))

      expect(onDisableRule).toHaveBeenCalledWith('rule-1')
    })

    it('calls onEnableRule when disabled rule is toggled', async () => {
      const user = userEvent.setup()
      const onEnableRule = vi.fn()
      render(
        <RulesEditor
          {...defaultProps}
          onEnableRule={onEnableRule}
          enabledRuleIds={['rule-1', 'rule-3']}
          disabledRuleIds={['rule-2']}
        />
      )

      await user.click(screen.getByRole('switch', { name: /bedtime rules/i }))

      expect(onEnableRule).toHaveBeenCalledWith('rule-2')
    })
  })

  describe('add custom rule (AC #3)', () => {
    it('opens form when add button is clicked', async () => {
      const user = userEvent.setup()
      render(<RulesEditor {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add custom rule/i }))

      expect(screen.getByLabelText(/rule title/i)).toBeInTheDocument()
    })

    it('closes form when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<RulesEditor {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add custom rule/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByLabelText(/rule title/i)).not.toBeInTheDocument()
    })

    it('calls onAddCustomRule when form is submitted', async () => {
      const user = userEvent.setup()
      const onAddCustomRule = vi.fn()
      render(<RulesEditor {...defaultProps} onAddCustomRule={onAddCustomRule} />)

      await user.click(screen.getByRole('button', { name: /add custom rule/i }))
      await user.type(screen.getByLabelText(/rule title/i), 'New Rule')
      await user.type(screen.getByLabelText(/description/i), 'Rule description')
      await user.click(screen.getByRole('button', { name: /add rule/i }))

      expect(onAddCustomRule).toHaveBeenCalledWith({
        title: 'New Rule',
        description: 'Rule description',
        category: 'other',
      })
    })
  })

  describe('custom rules display', () => {
    it('renders custom rules', () => {
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)
      expect(screen.getByText('No phones during meals')).toBeInTheDocument()
    })

    it('shows "NEW" indicator on custom rules', () => {
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)
      expect(screen.getByText('NEW')).toBeInTheDocument()
    })

    it('shows edit button for custom rules', () => {
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)
      expect(screen.getByRole('button', { name: /edit rule.*no phones/i })).toBeInTheDocument()
    })

    it('shows remove button for custom rules', () => {
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)
      expect(screen.getByRole('button', { name: /remove rule.*no phones/i })).toBeInTheDocument()
    })

    it('shows added count badge', () => {
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)
      expect(screen.getByText('1 added')).toBeInTheDocument()
    })
  })

  describe('remove custom rule', () => {
    it('calls onRemoveCustomRule when remove is clicked', async () => {
      const user = userEvent.setup()
      const onRemoveCustomRule = vi.fn()
      render(
        <RulesEditor
          {...defaultProps}
          customRules={mockCustomRules}
          onRemoveCustomRule={onRemoveCustomRule}
        />
      )

      await user.click(screen.getByRole('button', { name: /remove rule.*no phones/i }))

      expect(onRemoveCustomRule).toHaveBeenCalledWith('custom-1')
    })
  })

  describe('edit custom rule', () => {
    it('opens edit form when edit is clicked', async () => {
      const user = userEvent.setup()
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)

      await user.click(screen.getByRole('button', { name: /edit rule.*no phones/i }))

      expect(screen.getByDisplayValue('No phones during meals')).toBeInTheDocument()
    })

    it('calls onUpdateCustomRule when edit form is submitted', async () => {
      const user = userEvent.setup()
      const onUpdateCustomRule = vi.fn()
      render(
        <RulesEditor
          {...defaultProps}
          customRules={mockCustomRules}
          onUpdateCustomRule={onUpdateCustomRule}
        />
      )

      await user.click(screen.getByRole('button', { name: /edit rule.*no phones/i }))
      const titleInput = screen.getByDisplayValue('No phones during meals')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated title')
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      expect(onUpdateCustomRule).toHaveBeenCalledWith('custom-1', {
        title: 'Updated title',
        description: 'Keep family meals device-free',
        category: 'time',
      })
    })

    it('closes edit form when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)

      await user.click(screen.getByRole('button', { name: /edit rule.*no phones/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByDisplayValue('No phones during meals')).not.toBeInTheDocument()
    })
  })

  describe('diff highlighting', () => {
    it('shows modified badge when there are changes', () => {
      render(
        <RulesEditor
          {...defaultProps}
          disabledRuleIds={['rule-1']}
        />
      )
      expect(screen.getByText(/1 change/)).toBeInTheDocument()
    })

    it('counts disabled rules and custom rules together', () => {
      render(
        <RulesEditor
          {...defaultProps}
          disabledRuleIds={['rule-1', 'rule-2']}
          customRules={mockCustomRules}
        />
      )
      expect(screen.getByText(/3 changes/)).toBeInTheDocument()
    })

    it('applies removed styling to disabled rules', () => {
      const { container } = render(
        <RulesEditor
          {...defaultProps}
          enabledRuleIds={['rule-1', 'rule-3']}
          disabledRuleIds={['rule-2']}
        />
      )
      const removedHighlight = container.querySelector('.bg-red-50')
      expect(removedHighlight).toBeInTheDocument()
    })

    it('applies added styling to custom rules', () => {
      const { container } = render(
        <RulesEditor {...defaultProps} customRules={mockCustomRules} />
      )
      const addedHighlight = container.querySelector('.bg-green-50')
      expect(addedHighlight).toBeInTheDocument()
    })
  })

  describe('summary display', () => {
    it('shows summary when there are changes', () => {
      render(
        <RulesEditor
          {...defaultProps}
          disabledRuleIds={['rule-1']}
          customRules={mockCustomRules}
        />
      )
      expect(screen.getByText(/summary/i)).toBeInTheDocument()
    })

    it('shows count of enabled rules', () => {
      render(
        <RulesEditor
          {...defaultProps}
          enabledRuleIds={['rule-1', 'rule-3']}
          disabledRuleIds={['rule-2']}
          customRules={mockCustomRules}
        />
      )
      expect(screen.getByText(/2 rules enabled/)).toBeInTheDocument()
    })

    it('shows count of disabled rules', () => {
      render(
        <RulesEditor
          {...defaultProps}
          enabledRuleIds={['rule-1', 'rule-3']}
          disabledRuleIds={['rule-2']}
        />
      )
      expect(screen.getByText(/1 disabled/)).toBeInTheDocument()
    })

    it('shows count of custom rules', () => {
      render(
        <RulesEditor {...defaultProps} customRules={mockCustomRules} />
      )
      expect(screen.getByText(/1 custom added/)).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('disables toggle switches when disabled', () => {
      render(<RulesEditor {...defaultProps} disabled />)
      const switches = screen.getAllByRole('switch')
      switches.forEach((sw) => {
        expect(sw).toBeDisabled()
      })
    })

    it('disables add button when disabled', () => {
      render(<RulesEditor {...defaultProps} disabled />)
      expect(screen.getByRole('button', { name: /add custom rule/i })).toBeDisabled()
    })

    it('disables edit/remove buttons when disabled', () => {
      render(
        <RulesEditor {...defaultProps} customRules={mockCustomRules} disabled />
      )
      expect(screen.getByRole('button', { name: /edit rule/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /remove rule/i })).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has list role for rules', () => {
      render(<RulesEditor {...defaultProps} />)
      expect(screen.getByRole('list', { name: /template rules/i })).toBeInTheDocument()
    })

    it('toggle switches have accessible labels', () => {
      render(<RulesEditor {...defaultProps} />)
      // Rule is enabled by default, so label says "Disable rule: ..."
      expect(
        screen.getByRole('switch', { name: /disable rule.*screen time limits/i })
      ).toBeInTheDocument()
    })

    it('edit buttons have accessible labels', () => {
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)
      expect(
        screen.getByRole('button', { name: /edit rule.*no phones/i })
      ).toBeInTheDocument()
    })

    it('remove buttons have accessible labels', () => {
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)
      expect(
        screen.getByRole('button', { name: /remove rule.*no phones/i })
      ).toBeInTheDocument()
    })

    it('action buttons meet minimum touch target (44px)', () => {
      render(<RulesEditor {...defaultProps} customRules={mockCustomRules} />)
      const editButton = screen.getByRole('button', { name: /edit rule/i })
      expect(editButton.className).toContain('min-h-[44px]')
    })
  })

  describe('category icons', () => {
    it('shows time icon for time category', () => {
      render(<RulesEditor {...defaultProps} />)
      // Screen Time Limits is category 'time'
      const ruleItem = screen.getByText('Screen Time Limits').closest('[role="listitem"]')
      expect(ruleItem?.textContent).toContain('⏰')
    })

    it('shows apps icon for apps category', () => {
      render(<RulesEditor {...defaultProps} />)
      // App Categories is category 'apps'
      const ruleItem = screen.getByText('App Categories').closest('[role="listitem"]')
      expect(ruleItem?.textContent).toContain('📱')
    })
  })
})
