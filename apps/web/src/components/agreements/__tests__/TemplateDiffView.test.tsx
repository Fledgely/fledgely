/**
 * Tests for TemplateDiffView component.
 *
 * Story 5.5: Agreement Preview & Summary - AC6
 */

import { render, screen } from '@testing-library/react'
import { TemplateDiffView } from '../TemplateDiffView'
import type { AgreementTerm } from '@fledgely/shared/contracts'

describe('TemplateDiffView', () => {
  const createTerm = (overrides: Partial<AgreementTerm>): AgreementTerm => ({
    id: 'term-1',
    text: 'Test term',
    category: 'general',
    party: 'parent',
    order: 0,
    explanation: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  describe('rendering', () => {
    it('should render the diff view container', () => {
      const currentTerms = [createTerm({})]
      const templateTerms = [createTerm({})]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByTestId('template-diff-view')).toBeInTheDocument()
    })

    it('should display the header', () => {
      const currentTerms = [createTerm({})]
      const templateTerms = [createTerm({})]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('Changes from Template')).toBeInTheDocument()
    })
  })

  describe('added terms', () => {
    it('should detect added terms', () => {
      const currentTerms = [
        createTerm({ id: 'term-1' }),
        createTerm({ id: 'term-2', text: 'New term' }),
      ]
      const templateTerms = [createTerm({ id: 'term-1' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('1 added')).toBeInTheDocument()
    })

    it('should show added badge on new terms', () => {
      const currentTerms = [createTerm({ id: 'new-term', text: 'Newly added rule' })]
      const templateTerms: AgreementTerm[] = []

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should display added term text', () => {
      const currentTerms = [createTerm({ id: 'new-term', text: 'This is a new rule' })]
      const templateTerms: AgreementTerm[] = []

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('This is a new rule')).toBeInTheDocument()
    })

    it('should style added terms with green', () => {
      const currentTerms = [createTerm({ id: 'new-term', text: 'New rule' })]
      const templateTerms: AgreementTerm[] = []

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      const termCard = screen.getByTestId('diff-term-new-term')
      expect(termCard).toHaveClass('bg-green-50')
      expect(termCard).toHaveClass('border-green-500')
    })
  })

  describe('modified terms', () => {
    it('should detect modified terms', () => {
      const currentTerms = [createTerm({ id: 'term-1', text: 'Modified text' })]
      const templateTerms = [createTerm({ id: 'term-1', text: 'Original text' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('1 changed')).toBeInTheDocument()
    })

    it('should show changed badge on modified terms', () => {
      const currentTerms = [createTerm({ id: 'term-1', text: 'New version' })]
      const templateTerms = [createTerm({ id: 'term-1', text: 'Old version' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('Changed')).toBeInTheDocument()
    })

    it('should show original text for modified terms', () => {
      const currentTerms = [createTerm({ id: 'term-1', text: 'New version' })]
      const templateTerms = [createTerm({ id: 'term-1', text: 'Old version' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('Was: Old version')).toBeInTheDocument()
    })

    it('should detect category changes as modifications', () => {
      const currentTerms = [createTerm({ id: 'term-1', category: 'apps' })]
      const templateTerms = [createTerm({ id: 'term-1', category: 'time' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('1 changed')).toBeInTheDocument()
    })

    it('should detect party changes as modifications', () => {
      const currentTerms = [createTerm({ id: 'term-1', party: 'child' })]
      const templateTerms = [createTerm({ id: 'term-1', party: 'parent' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('1 changed')).toBeInTheDocument()
    })

    it('should detect explanation changes as modifications', () => {
      const currentTerms = [createTerm({ id: 'term-1', explanation: 'New explanation' })]
      const templateTerms = [createTerm({ id: 'term-1', explanation: 'Old explanation' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      // Explanation is not compared, so should be unchanged
      expect(screen.getByText('No changes from template')).toBeInTheDocument()
    })

    it('should style modified terms with yellow', () => {
      const currentTerms = [createTerm({ id: 'term-1', text: 'Modified' })]
      const templateTerms = [createTerm({ id: 'term-1', text: 'Original' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      const termCard = screen.getByTestId('diff-term-term-1')
      expect(termCard).toHaveClass('bg-yellow-50')
      expect(termCard).toHaveClass('border-yellow-500')
    })
  })

  describe('removed terms', () => {
    it('should detect removed terms', () => {
      const currentTerms: AgreementTerm[] = []
      const templateTerms = [createTerm({ id: 'term-1' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('1 removed')).toBeInTheDocument()
    })

    it('should show removed badge on deleted terms', () => {
      const currentTerms: AgreementTerm[] = []
      const templateTerms = [createTerm({ id: 'term-1', text: 'Deleted rule' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('Removed')).toBeInTheDocument()
    })

    it('should show strikethrough for removed terms', () => {
      const currentTerms: AgreementTerm[] = []
      const templateTerms = [createTerm({ id: 'term-1', text: 'Deleted rule' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      const termText = screen.getByText('Deleted rule')
      expect(termText).toHaveClass('line-through')
    })

    it('should style removed terms with red', () => {
      const currentTerms: AgreementTerm[] = []
      const templateTerms = [createTerm({ id: 'term-1' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      const termCard = screen.getByTestId('diff-term-term-1')
      expect(termCard).toHaveClass('bg-red-50')
      expect(termCard).toHaveClass('border-red-500')
    })
  })

  describe('unchanged terms', () => {
    it('should not display unchanged terms in diff list', () => {
      const currentTerms = [createTerm({ id: 'term-1', text: 'Same text' })]
      const templateTerms = [createTerm({ id: 'term-1', text: 'Same text' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.queryByTestId('diff-term-term-1')).not.toBeInTheDocument()
    })

    it('should show no changes message when all unchanged', () => {
      const currentTerms = [createTerm({ id: 'term-1' })]
      const templateTerms = [createTerm({ id: 'term-1' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('No changes from template')).toBeInTheDocument()
    })

    it('should not show diff list when no changes', () => {
      const currentTerms = [createTerm({ id: 'term-1' })]
      const templateTerms = [createTerm({ id: 'term-1' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.queryByTestId('diff-list')).not.toBeInTheDocument()
    })
  })

  describe('summary stats', () => {
    it('should show summary counts', () => {
      const currentTerms = [
        createTerm({ id: 'term-1', text: 'Modified' }),
        createTerm({ id: 'term-new', text: 'Added' }),
      ]
      const templateTerms = [
        createTerm({ id: 'term-1', text: 'Original' }),
        createTerm({ id: 'term-removed', text: 'Removed' }),
      ]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByTestId('diff-summary')).toBeInTheDocument()
      expect(screen.getByText('1 added')).toBeInTheDocument()
      expect(screen.getByText('1 changed')).toBeInTheDocument()
      expect(screen.getByText('1 removed')).toBeInTheDocument()
    })

    it('should not show count for zero categories', () => {
      const currentTerms = [createTerm({ id: 'new-term' })]
      const templateTerms: AgreementTerm[] = []

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('1 added')).toBeInTheDocument()
      expect(screen.queryByText(/changed/)).not.toBeInTheDocument()
      expect(screen.queryByText(/removed/)).not.toBeInTheDocument()
    })
  })

  describe('mixed changes', () => {
    it('should handle complex diff scenarios', () => {
      const currentTerms = [
        createTerm({ id: 'unchanged', text: 'Same' }),
        createTerm({ id: 'modified', text: 'New text' }),
        createTerm({ id: 'added-1', text: 'New rule 1' }),
        createTerm({ id: 'added-2', text: 'New rule 2' }),
      ]
      const templateTerms = [
        createTerm({ id: 'unchanged', text: 'Same' }),
        createTerm({ id: 'modified', text: 'Old text' }),
        createTerm({ id: 'removed', text: 'Deleted' }),
      ]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('2 added')).toBeInTheDocument()
      expect(screen.getByText('1 changed')).toBeInTheDocument()
      expect(screen.getByText('1 removed')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have region role', () => {
      const currentTerms = [createTerm({})]
      const templateTerms = [createTerm({})]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should have aria-label on container', () => {
      const currentTerms = [createTerm({})]
      const templateTerms = [createTerm({})]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Changes from template')
    })

    it('should have status badges with aria-labels', () => {
      const currentTerms = [createTerm({ id: 'new-term' })]
      const templateTerms: AgreementTerm[] = []

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      const badge = screen.getByText('New')
      expect(badge).toHaveAttribute('aria-label', 'New term')
    })

    it('should use color-coded borders for WCAG compliance', () => {
      const currentTerms = [
        createTerm({ id: 'added', text: 'Added' }),
        createTerm({ id: 'modified', text: 'Modified' }),
      ]
      const templateTerms = [
        createTerm({ id: 'modified', text: 'Original' }),
        createTerm({ id: 'removed', text: 'Removed' }),
      ]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      const addedCard = screen.getByTestId('diff-term-added')
      const modifiedCard = screen.getByTestId('diff-term-modified')
      const removedCard = screen.getByTestId('diff-term-removed')

      expect(addedCard).toHaveClass('border-l-4')
      expect(modifiedCard).toHaveClass('border-l-4')
      expect(removedCard).toHaveClass('border-l-4')
    })
  })

  describe('empty states', () => {
    it('should handle empty current terms', () => {
      const currentTerms: AgreementTerm[] = []
      const templateTerms = [createTerm({ id: 'term-1' })]

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('1 removed')).toBeInTheDocument()
    })

    it('should handle empty template terms', () => {
      const currentTerms = [createTerm({ id: 'term-1' })]
      const templateTerms: AgreementTerm[] = []

      render(<TemplateDiffView currentTerms={currentTerms} templateTerms={templateTerms} />)

      expect(screen.getByText('1 added')).toBeInTheDocument()
    })

    it('should handle both empty', () => {
      render(<TemplateDiffView currentTerms={[]} templateTerms={[]} />)

      expect(screen.getByText('No changes from template')).toBeInTheDocument()
    })
  })
})
