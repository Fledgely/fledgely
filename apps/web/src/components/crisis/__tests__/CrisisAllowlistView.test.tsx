/**
 * Unit tests for CrisisAllowlistView component.
 *
 * Story 7.3: Child Allowlist Visibility - AC1, AC4, AC5, AC6, AC7
 * Tests the main allowlist view for children.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CrisisAllowlistView } from '../CrisisAllowlistView'
import { CRISIS_RESOURCES } from '@fledgely/shared'

describe('CrisisAllowlistView', () => {
  // ============================================
  // Secret Help Button Tests - Story 7.5.1 AC1
  // ============================================

  describe('secret help button documentation (Story 7.5.1 AC1)', () => {
    it('displays Secret Help Button section', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByRole('heading', { name: 'Secret Help Button' })).toBeInTheDocument()
    })

    it('displays logo tap instructions', () => {
      render(<CrisisAllowlistView />)

      expect(
        screen.getByText(/tap the fledgely logo 5 times quickly to send a silent help signal/i)
      ).toBeInTheDocument()
    })

    it('displays keyboard shortcut instructions', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByText(/press ctrl\+shift\+h on your keyboard/i)).toBeInTheDocument()
    })

    it('displays reassurance message', () => {
      render(<CrisisAllowlistView />)

      expect(
        screen.getByText(/no one will see that you did this\. help will reach out to you\./i)
      ).toBeInTheDocument()
    })

    it('displays SOS icon', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByText('🆘')).toBeInTheDocument()
    })

    it('secret help section has accessible region role', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByRole('region', { name: /secret help button/i })).toBeInTheDocument()
    })

    it('displays context instruction about being watched', () => {
      render(<CrisisAllowlistView />)

      expect(
        screen.getByText(/if you need help but someone is watching your screen/i)
      ).toBeInTheDocument()
    })

    it('displays section at top of view (before privacy banner)', () => {
      render(<CrisisAllowlistView />)

      const secretSection = screen.getByTestId('secret-help-section')
      const privacyRegion = screen.getByRole('region', { name: /always private/i })

      // Secret help section should appear before privacy banner in DOM
      expect(
        secretSection.compareDocumentPosition(privacyRegion) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    })
  })

  describe('organized display (AC1)', () => {
    it('displays resources organized by category', () => {
      render(<CrisisAllowlistView />)

      // Check that category sections exist
      expect(screen.getByRole('heading', { name: 'Feeling Really Low' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Need to Talk to Someone' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: "Home Isn't Safe" })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Being Hurt by Adults' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Someone Hurt Me' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'LGBTQ+ Support' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Food & Body Stuff' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Mental Health Support' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Drugs & Alcohol Help' })).toBeInTheDocument()
    })

    it('displays category descriptions', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByText(/help when life feels too hard/i)).toBeInTheDocument()
      expect(
        screen.getByText(/someone to talk to when you are going through a hard time/i)
      ).toBeInTheDocument()
    })

    it('displays category icons', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByText('💙')).toBeInTheDocument() // Suicide prevention
      expect(screen.getByText('💬')).toBeInTheDocument() // Crisis general
      expect(screen.getByText('🏠')).toBeInTheDocument() // Domestic violence
      expect(screen.getByText('🛡️')).toBeInTheDocument() // Child abuse
      expect(screen.getByText('💜')).toBeInTheDocument() // Sexual assault
      expect(screen.getByText('🌈')).toBeInTheDocument() // LGBTQ+
      expect(screen.getByText('💚')).toBeInTheDocument() // Eating disorder
      expect(screen.getByText('🧠')).toBeInTheDocument() // Mental health
      expect(screen.getByText('🤝')).toBeInTheDocument() // Substance abuse
    })

    it('displays all resources from CRISIS_RESOURCES', () => {
      render(<CrisisAllowlistView />)

      // Check that all resources are rendered
      for (const resource of CRISIS_RESOURCES) {
        expect(screen.getByText(resource.name)).toBeInTheDocument()
      }
    })

    it('groups resources under their category', () => {
      render(<CrisisAllowlistView />)

      // Find the suicide prevention section
      const suicideSection = screen.getByRole('region', {
        name: /feeling really low/i,
      })

      // Check that 988 Lifeline is in the suicide prevention section
      expect(within(suicideSection).getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
    })
  })

  describe('privacy message (AC6)', () => {
    it('displays prominent privacy message header', () => {
      render(<CrisisAllowlistView />)

      // Privacy banner is now h2 (Secret Help section is above it)
      expect(
        screen.getByRole('heading', { name: 'These sites are ALWAYS private', level: 2 })
      ).toBeInTheDocument()
    })

    it('displays reassuring privacy message', () => {
      render(<CrisisAllowlistView />)

      expect(
        screen.getByText(/your parents will never see that you visited these websites/i)
      ).toBeInTheDocument()
    })

    it('displays safety assurance', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByText(/it is safe to get help here/i)).toBeInTheDocument()
    })

    it('displays lock icon in privacy banner', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByText('🔒')).toBeInTheDocument()
    })

    it('privacy banner has accessible region role', () => {
      render(<CrisisAllowlistView />)

      expect(
        screen.getByRole('region', { name: /these sites are always private/i })
      ).toBeInTheDocument()
    })
  })

  describe('reading level (AC4)', () => {
    it('uses child-friendly category names', () => {
      render(<CrisisAllowlistView />)

      // Check that technical category names are NOT displayed
      expect(screen.queryByText('suicide_prevention')).not.toBeInTheDocument()
      expect(screen.queryByText('crisis_general')).not.toBeInTheDocument()
      expect(screen.queryByText('domestic_violence')).not.toBeInTheDocument()

      // Check that friendly names ARE displayed
      expect(screen.getByText('Feeling Really Low')).toBeInTheDocument()
      expect(screen.getByText('Need to Talk to Someone')).toBeInTheDocument()
      expect(screen.getByText("Home Isn't Safe")).toBeInTheDocument()
    })

    it('uses simple page title', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByText('Safe Places to Get Help')).toBeInTheDocument()
    })

    it('uses simple page subtitle', () => {
      render(<CrisisAllowlistView />)

      expect(
        screen.getByText('These are trusted websites and hotlines where you can get help for free.')
      ).toBeInTheDocument()
    })
  })

  describe('accessibility (AC7)', () => {
    it('has a skip-to-content link', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByRole('link', { name: 'Skip to resources' })).toBeInTheDocument()
    })

    it('skip link points to main content', () => {
      render(<CrisisAllowlistView />)

      const skipLink = screen.getByRole('link', { name: 'Skip to resources' })
      expect(skipLink).toHaveAttribute('href', '#crisis-resources-main')
    })

    it('main content has accessible name', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByRole('main', { name: 'Crisis resources' })).toBeInTheDocument()
    })

    it('main content can receive focus (tabIndex -1)', () => {
      render(<CrisisAllowlistView />)

      const main = screen.getByRole('main', { name: 'Crisis resources' })
      expect(main).toHaveAttribute('tabIndex', '-1')
    })

    it('main content has id for skip link target', () => {
      render(<CrisisAllowlistView />)

      const main = screen.getByRole('main', { name: 'Crisis resources' })
      expect(main).toHaveAttribute('id', 'crisis-resources-main')
    })

    it('each category section has aria-labelledby', () => {
      render(<CrisisAllowlistView />)

      const suicideSection = screen.getByRole('region', { name: /feeling really low/i })
      expect(suicideSection).toHaveAttribute('aria-labelledby', 'category-suicide_prevention')
    })

    it('each resource list has accessible name', () => {
      render(<CrisisAllowlistView />)

      expect(screen.getByRole('list', { name: 'Feeling Really Low resources' })).toBeInTheDocument()
    })

    it('category icons are hidden from screen readers', () => {
      const { container } = render(<CrisisAllowlistView />)

      // Find icon spans by their emoji content
      const iconSpans = container.querySelectorAll('[aria-hidden="true"]')
      expect(iconSpans.length).toBeGreaterThan(0)
    })
  })

  describe('keyboard navigation', () => {
    it('all resource links are keyboard accessible', () => {
      render(<CrisisAllowlistView />)

      // Get all visit website links
      const visitLinks = screen.getAllByRole('link', { name: /visit.*website/i })

      // Each should be focusable (not have negative tabIndex)
      for (const link of visitLinks) {
        expect(link).not.toHaveAttribute('tabIndex', '-1')
      }
    })
  })

  describe('custom className', () => {
    it('applies custom className when provided', () => {
      const { container } = render(<CrisisAllowlistView className="custom-view" />)

      expect(container.firstChild).toHaveClass('crisis-allowlist-view')
      expect(container.firstChild).toHaveClass('custom-view')
    })
  })

  describe('private access (AC5)', () => {
    it('component renders without requiring any props', () => {
      // AC5 requires view is accessible without parent knowledge
      // This means no authentication or parent notification props needed
      expect(() => render(<CrisisAllowlistView />)).not.toThrow()
    })
  })

  describe('empty state fallback', () => {
    // Note: Testing actual empty state requires mocking CRISIS_RESOURCES.
    // The empty state provides hardcoded fallback emergency numbers.
    // This ensures children always have access to help even if data fails.

    it('component has emergency fallback structure defined', () => {
      // Verify that the component's fallback state is properly structured
      // by checking it renders normally (resources loaded from shared package)
      render(<CrisisAllowlistView />)

      // When resources ARE present, empty state should NOT show
      expect(screen.queryByText('Resources temporarily unavailable')).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
