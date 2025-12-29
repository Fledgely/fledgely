/**
 * Tests for AgreementSummary component.
 *
 * Story 5.5: Agreement Preview & Summary - AC2
 */

import { render, screen } from '@testing-library/react'
import { AgreementSummary } from '../AgreementSummary'
import type { AgreementTerm } from '@fledgely/shared/contracts'

describe('AgreementSummary', () => {
  const createTerm = (overrides: Partial<AgreementTerm>): AgreementTerm => ({
    id: `term-${Math.random()}`,
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
    it('should render the summary container', () => {
      const terms = [createTerm({ party: 'parent' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByTestId('agreement-summary')).toBeInTheDocument()
    })

    it('should display the header', () => {
      const terms = [createTerm({ party: 'parent' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByText("What We're Agreeing To")).toBeInTheDocument()
    })

    it('should return null when no terms', () => {
      const { container } = render(<AgreementSummary terms={[]} childName="Alex" />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('parent commitments', () => {
    it('should display parent section when parent terms exist', () => {
      const terms = [createTerm({ party: 'parent', text: 'Allow 2 hours screen time' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByTestId('parent-summary')).toBeInTheDocument()
      expect(screen.getByText('Parent will:')).toBeInTheDocument()
    })

    it('should list parent commitments', () => {
      const terms = [
        createTerm({ id: '1', party: 'parent', text: 'Allow gaming on weekends' }),
        createTerm({ id: '2', party: 'parent', text: 'Provide homework help' }),
      ]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByText('allow gaming on weekends')).toBeInTheDocument()
      expect(screen.getByText('provide homework help')).toBeInTheDocument()
    })

    it('should not show parent section when no parent terms', () => {
      const terms = [createTerm({ party: 'child' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.queryByTestId('parent-summary')).not.toBeInTheDocument()
    })
  })

  describe('child commitments', () => {
    it('should display child section when child terms exist', () => {
      const terms = [createTerm({ party: 'child', text: 'Complete homework first' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByTestId('child-summary')).toBeInTheDocument()
      expect(screen.getByText('Alex agrees to:')).toBeInTheDocument()
    })

    it('should list child commitments', () => {
      const terms = [
        createTerm({ id: '1', party: 'child', text: 'Turn off devices at bedtime' }),
        createTerm({ id: '2', party: 'child', text: 'Ask before downloading apps' }),
      ]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByText('turn off devices at bedtime')).toBeInTheDocument()
      expect(screen.getByText('ask before downloading apps')).toBeInTheDocument()
    })

    it('should use child name in section header', () => {
      const terms = [createTerm({ party: 'child' })]
      render(<AgreementSummary terms={terms} childName="Jordan" />)

      expect(screen.getByText('Jordan agrees to:')).toBeInTheDocument()
    })

    it('should show child initial in avatar', () => {
      const terms = [createTerm({ party: 'child' })]
      render(<AgreementSummary terms={terms} childName="Jordan" />)

      expect(screen.getByText('J')).toBeInTheDocument()
    })
  })

  describe('shared commitments', () => {
    it('should display shared section when shared terms exist', () => {
      const terms = [
        createTerm({ party: 'shared' as 'parent' | 'child', text: 'Review rules weekly' }),
      ]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByTestId('shared-summary')).toBeInTheDocument()
      expect(screen.getByText('Together we will:')).toBeInTheDocument()
    })

    it('should not show shared section when no shared terms', () => {
      const terms = [createTerm({ party: 'parent' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.queryByTestId('shared-summary')).not.toBeInTheDocument()
    })
  })

  describe('text formatting', () => {
    it('should lowercase first letter for list items', () => {
      const terms = [createTerm({ party: 'parent', text: 'Allow screen time' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByText('allow screen time')).toBeInTheDocument()
    })

    it('should remove trailing periods', () => {
      const terms = [createTerm({ party: 'parent', text: 'Allow gaming.' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByText('allow gaming')).toBeInTheDocument()
    })

    it('should remove parenthetical clauses', () => {
      const terms = [createTerm({ party: 'parent', text: 'Allow gaming (on approved devices)' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByText('allow gaming')).toBeInTheDocument()
    })

    it('should handle dashes in text', () => {
      const terms = [createTerm({ party: 'parent', text: 'Allow gaming - on weekends' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByText('allow gaming on weekends')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have region role', () => {
      const terms = [createTerm({ party: 'parent' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should have aria-label on container', () => {
      const terms = [createTerm({ party: 'parent' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Agreement summary')
    })

    it('should have labeled lists', () => {
      const terms = [createTerm({ party: 'parent' }), createTerm({ party: 'child' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByRole('list', { name: 'Parent commitments' })).toBeInTheDocument()
      expect(screen.getByRole('list', { name: "Alex's commitments" })).toBeInTheDocument()
    })

    it('should mark decorative elements as aria-hidden', () => {
      const terms = [createTerm({ party: 'parent' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      const container = screen.getByTestId('parent-summary')
      const avatar = container.querySelector('[aria-hidden="true"]')
      expect(avatar).toBeInTheDocument()
    })
  })

  describe('mixed terms', () => {
    it('should display all sections when all parties have terms', () => {
      const terms = [
        createTerm({ id: '1', party: 'parent', text: 'Parent commitment' }),
        createTerm({ id: '2', party: 'child', text: 'Child commitment' }),
        createTerm({ id: '3', party: 'shared' as 'parent' | 'child', text: 'Shared commitment' }),
      ]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      expect(screen.getByTestId('parent-summary')).toBeInTheDocument()
      expect(screen.getByTestId('child-summary')).toBeInTheDocument()
      expect(screen.getByTestId('shared-summary')).toBeInTheDocument()
    })

    it('should preserve term order within groups', () => {
      const terms = [
        createTerm({ id: '1', party: 'parent', text: 'First parent term' }),
        createTerm({ id: '2', party: 'parent', text: 'Second parent term' }),
        createTerm({ id: '3', party: 'parent', text: 'Third parent term' }),
      ]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      const list = screen.getByRole('list', { name: 'Parent commitments' })
      const items = list.querySelectorAll('li')

      expect(items[0]).toHaveTextContent('first parent term')
      expect(items[1]).toHaveTextContent('second parent term')
      expect(items[2]).toHaveTextContent('third parent term')
    })
  })

  describe('styling', () => {
    it('should use gradient background', () => {
      const terms = [createTerm({ party: 'parent' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      const container = screen.getByTestId('agreement-summary')
      expect(container).toHaveClass('bg-gradient-to-r')
    })

    it('should use blue color for parent section', () => {
      const terms = [createTerm({ party: 'parent' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      const header = screen.getByText('Parent will:')
      expect(header).toHaveClass('text-blue-800')
    })

    it('should use pink color for child section', () => {
      const terms = [createTerm({ party: 'child' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      const header = screen.getByText('Alex agrees to:')
      expect(header).toHaveClass('text-pink-800')
    })

    it('should use purple color for shared section', () => {
      const terms = [createTerm({ party: 'shared' as 'parent' | 'child' })]
      render(<AgreementSummary terms={terms} childName="Alex" />)

      const header = screen.getByText('Together we will:')
      expect(header).toHaveClass('text-purple-800')
    })
  })
})
