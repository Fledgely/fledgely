/**
 * Unit tests for TemplateRules component.
 *
 * Story 4.2: Age-Appropriate Template Content - AC4, AC5, AC6
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TemplateRules } from './TemplateRules'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

// Base template for testing
const createTemplate = (overrides: Partial<AgreementTemplate> = {}): AgreementTemplate => ({
  id: 'test-template',
  name: 'Test Template',
  description: 'A test template',
  ageGroup: '8-10',
  variation: 'balanced',
  categories: ['general'],
  screenTimeLimits: { weekday: 90, weekend: 120 },
  monitoringLevel: 'medium',
  keyRules: ['Rule one', 'Rule two', 'Rule three'],
  createdAt: new Date('2024-01-01'),
  ...overrides,
})

describe('TemplateRules', () => {
  describe('standard rules display (AC4)', () => {
    it('renders key rules for 8-10 age group', () => {
      const template = createTemplate()
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Key Rules')).toBeInTheDocument()
      expect(screen.getByText('Rule one')).toBeInTheDocument()
      expect(screen.getByText('Rule two')).toBeInTheDocument()
      expect(screen.getByText('Rule three')).toBeInTheDocument()
    })

    it('renders key rules for 11-13 age group', () => {
      const template = createTemplate({ ageGroup: '11-13' })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Key Rules')).toBeInTheDocument()
      expect(screen.getByText('Rule one')).toBeInTheDocument()
    })

    it('shows examples when showExamples is true', () => {
      const template = createTemplate({
        ruleExamples: {
          '0': 'Example for rule one',
          '1': 'Example for rule two',
        },
      })
      render(<TemplateRules template={template} showExamples />)

      expect(screen.getByText(/Example for rule one/)).toBeInTheDocument()
      expect(screen.getByText(/Example for rule two/)).toBeInTheDocument()
    })

    it('hides examples when showExamples is false', () => {
      const template = createTemplate({
        ruleExamples: {
          '0': 'Example for rule one',
        },
      })
      render(<TemplateRules template={template} showExamples={false} />)

      expect(screen.queryByText(/Example for rule one/)).not.toBeInTheDocument()
    })

    it('handles templates without rule examples', () => {
      const template = createTemplate()
      render(<TemplateRules template={template} showExamples />)

      expect(screen.getByText('Rule one')).toBeInTheDocument()
      expect(screen.queryByText(/Example:/)).not.toBeInTheDocument()
    })
  })

  describe('simple rules for young children (AC6)', () => {
    it('renders "Simple Rules" heading for 5-7 age group', () => {
      const template = createTemplate({
        ageGroup: '5-7',
        simpleRules: [{ text: 'Play in living room', isAllowed: true }],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Simple Rules')).toBeInTheDocument()
    })

    it('displays allowed rules with green styling', () => {
      const template = createTemplate({
        ageGroup: '5-7',
        simpleRules: [
          { text: 'Play in living room', isAllowed: true },
          { text: 'Use learning apps', isAllowed: true },
        ],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('You CAN do these things')).toBeInTheDocument()
      expect(screen.getByText('Play in living room')).toBeInTheDocument()
      expect(screen.getByText('Use learning apps')).toBeInTheDocument()
    })

    it('displays not allowed rules with orange styling', () => {
      const template = createTemplate({
        ageGroup: '5-7',
        simpleRules: [
          { text: 'Download apps alone', isAllowed: false },
          { text: 'Talk to strangers', isAllowed: false },
        ],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Not yet - wait until you are older')).toBeInTheDocument()
      expect(screen.getByText('Download apps alone')).toBeInTheDocument()
      expect(screen.getByText('Talk to strangers')).toBeInTheDocument()
    })

    it('separates allowed and not allowed rules', () => {
      const template = createTemplate({
        ageGroup: '5-7',
        simpleRules: [
          { text: 'Play games', isAllowed: true },
          { text: 'Buy things', isAllowed: false },
        ],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('You CAN do these things')).toBeInTheDocument()
      expect(screen.getByText('Not yet - wait until you are older')).toBeInTheDocument()
      expect(screen.getByText('Play games')).toBeInTheDocument()
      expect(screen.getByText('Buy things')).toBeInTheDocument()
    })

    it('falls back to standard rules if no simple rules provided', () => {
      const template = createTemplate({
        ageGroup: '5-7',
        keyRules: ['Standard rule for young child'],
        // No simpleRules
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Simple Rules')).toBeInTheDocument()
      expect(screen.getByText('Standard rule for young child')).toBeInTheDocument()
    })

    it('falls back to standard rules if simple rules array is empty', () => {
      const template = createTemplate({
        ageGroup: '5-7',
        keyRules: ['Fallback rule'],
        simpleRules: [],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Fallback rule')).toBeInTheDocument()
    })
  })

  describe('autonomy milestones for teens (AC5)', () => {
    it('displays autonomy milestones section for 14-16 age group', () => {
      const template = createTemplate({
        ageGroup: '14-16',
        autonomyMilestones: [
          {
            milestone: 'Maintain B average',
            reward: 'Later curfew',
            description: 'Shows academic responsibility',
          },
        ],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Earn More Freedom')).toBeInTheDocument()
      expect(screen.getByText('Maintain B average')).toBeInTheDocument()
      expect(screen.getByText(/Later curfew/)).toBeInTheDocument()
      expect(screen.getByText('Shows academic responsibility')).toBeInTheDocument()
    })

    it('displays multiple milestones', () => {
      const template = createTemplate({
        ageGroup: '14-16',
        autonomyMilestones: [
          { milestone: 'Get drivers license', reward: 'No location sharing' },
          { milestone: 'Part-time job', reward: 'Manage own screen time' },
        ],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Get drivers license')).toBeInTheDocument()
      expect(screen.getByText('Part-time job')).toBeInTheDocument()
      expect(screen.getByText(/No location sharing/)).toBeInTheDocument()
      expect(screen.getByText(/Manage own screen time/)).toBeInTheDocument()
    })

    it('handles milestones without description', () => {
      const template = createTemplate({
        ageGroup: '14-16',
        autonomyMilestones: [{ milestone: 'Turn 18', reward: 'Full independence' }],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText('Turn 18')).toBeInTheDocument()
      expect(screen.getByText(/Full independence/)).toBeInTheDocument()
    })

    it('hides milestones when showMilestones is false', () => {
      const template = createTemplate({
        ageGroup: '14-16',
        autonomyMilestones: [{ milestone: 'Hidden milestone', reward: 'Hidden reward' }],
      })
      render(<TemplateRules template={template} showMilestones={false} />)

      expect(screen.queryByText('Earn More Freedom')).not.toBeInTheDocument()
      expect(screen.queryByText('Hidden milestone')).not.toBeInTheDocument()
    })

    it('does not show milestones section for non-teen age groups', () => {
      const template = createTemplate({
        ageGroup: '11-13',
        autonomyMilestones: [{ milestone: 'Should not show', reward: 'Should not show' }],
      })
      render(<TemplateRules template={template} />)

      expect(screen.queryByText('Earn More Freedom')).not.toBeInTheDocument()
    })

    it('does not show milestones section if no milestones provided', () => {
      const template = createTemplate({
        ageGroup: '14-16',
        // No autonomyMilestones
      })
      render(<TemplateRules template={template} />)

      expect(screen.queryByText('Earn More Freedom')).not.toBeInTheDocument()
    })

    it('includes explanatory text about earning freedom', () => {
      const template = createTemplate({
        ageGroup: '14-16',
        autonomyMilestones: [{ milestone: 'Test', reward: 'Test' }],
      })
      render(<TemplateRules template={template} />)

      expect(screen.getByText(/Meet these goals to unlock more independence/)).toBeInTheDocument()
    })
  })

  describe('age group detection', () => {
    it('uses simple rules format only for 5-7', () => {
      const template5_7 = createTemplate({
        ageGroup: '5-7',
        simpleRules: [{ text: 'Simple rule', isAllowed: true }],
      })
      const template8_10 = createTemplate({
        ageGroup: '8-10',
        simpleRules: [{ text: 'Simple rule', isAllowed: true }],
      })

      const { rerender } = render(<TemplateRules template={template5_7} />)
      expect(screen.getByText('You CAN do these things')).toBeInTheDocument()

      rerender(<TemplateRules template={template8_10} />)
      expect(screen.queryByText('You CAN do these things')).not.toBeInTheDocument()
    })

    it('shows autonomy milestones only for 14-16', () => {
      const template14_16 = createTemplate({
        ageGroup: '14-16',
        autonomyMilestones: [{ milestone: 'Test', reward: 'Test' }],
      })
      const template11_13 = createTemplate({
        ageGroup: '11-13',
        autonomyMilestones: [{ milestone: 'Test', reward: 'Test' }],
      })

      const { rerender } = render(<TemplateRules template={template14_16} />)
      expect(screen.getByText('Earn More Freedom')).toBeInTheDocument()

      rerender(<TemplateRules template={template11_13} />)
      expect(screen.queryByText('Earn More Freedom')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('uses semantic heading structure', () => {
      const template = createTemplate()
      render(<TemplateRules template={template} />)

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Key Rules')
    })

    it('uses list elements for rules', () => {
      const template = createTemplate({ keyRules: ['Rule 1', 'Rule 2'] })
      render(<TemplateRules template={template} />)

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('marks decorative icons as aria-hidden', () => {
      const template = createTemplate({
        ageGroup: '5-7',
        simpleRules: [{ text: 'Test rule', isAllowed: true }],
      })
      const { container } = render(<TemplateRules template={template} />)

      const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenIcons.length).toBeGreaterThan(0)
    })
  })
})
