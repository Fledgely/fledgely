/**
 * CrisisResourceList Tests - Story 7.5.3 Task 5
 *
 * Tests for the crisis resource list component.
 * AC2: Crisis resources with direct links
 * AC4: Crisis chat option
 *
 * CRITICAL: Resources must have working direct links.
 * Chat option must be clearly available when supported.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CrisisResourceList from './CrisisResourceList'
import type { SignalCrisisResource } from '@fledgely/shared'

const mockResources: SignalCrisisResource[] = [
  {
    id: '988-lifeline',
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential support 24/7',
    type: 'phone',
    value: '988',
    priority: 1,
    jurisdictions: ['US'],
    available24x7: true,
    chatAvailable: true,
  },
  {
    id: 'crisis-text',
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741',
    type: 'text',
    value: '741741',
    priority: 2,
    jurisdictions: ['US'],
    available24x7: true,
    chatAvailable: false,
  },
  {
    id: 'childhelp',
    name: 'Childhelp National Hotline',
    description: '24/7 support for children',
    type: 'phone',
    value: '1-800-422-4453',
    priority: 3,
    jurisdictions: ['US'],
    available24x7: true,
    chatAvailable: false,
  },
  {
    id: 'teen-help',
    name: 'Teen Help Website',
    description: 'Online resources for teens',
    type: 'website',
    value: 'https://teenhelp.example.com',
    priority: 4,
    jurisdictions: ['US'],
    available24x7: true,
    chatAvailable: true,
  },
]

describe('CrisisResourceList', () => {
  let onResourceClick: ReturnType<typeof vi.fn>
  let onChatClick: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onResourceClick = vi.fn()
    onChatClick = vi.fn()
  })

  // ============================================
  // Rendering Tests
  // ============================================

  describe('Rendering', () => {
    it('should render all resources', () => {
      render(<CrisisResourceList resources={mockResources} />)

      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
      expect(screen.getByText('Crisis Text Line')).toBeInTheDocument()
      expect(screen.getByText('Childhelp National Hotline')).toBeInTheDocument()
      expect(screen.getByText('Teen Help Website')).toBeInTheDocument()
    })

    it('should render resource descriptions', () => {
      render(<CrisisResourceList resources={mockResources} />)

      expect(screen.getByText('Free, confidential support 24/7')).toBeInTheDocument()
      expect(screen.getByText('Text HOME to 741741')).toBeInTheDocument()
    })

    it('should render empty state when no resources', () => {
      render(<CrisisResourceList resources={[]} />)

      expect(screen.getByText(/no resources available/i)).toBeInTheDocument()
    })

    it('should render resources in priority order', () => {
      render(<CrisisResourceList resources={mockResources} />)

      const items = screen.getAllByRole('listitem')
      expect(items[0]).toHaveTextContent('988 Suicide & Crisis Lifeline')
      expect(items[1]).toHaveTextContent('Crisis Text Line')
      expect(items[2]).toHaveTextContent('Childhelp National Hotline')
    })

    it('should show 24/7 availability badge when available', () => {
      render(<CrisisResourceList resources={mockResources} />)

      const badges = screen.getAllByText(/24\/7/i)
      expect(badges.length).toBeGreaterThan(0)
    })

    it('should render resource type icons', () => {
      render(<CrisisResourceList resources={mockResources} />)

      // Check for different resource type indicators (may have multiple)
      expect(screen.getAllByTestId('resource-type-phone').length).toBeGreaterThan(0)
      expect(screen.getAllByTestId('resource-type-text').length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Direct Links Tests (AC2)
  // ============================================

  describe('Direct Links (AC2)', () => {
    it('should render hotline as tel: link', () => {
      render(<CrisisResourceList resources={mockResources} onResourceClick={onResourceClick} />)

      const hotlineLink = screen.getByRole('link', { name: /988 Suicide & Crisis Lifeline/i })
      expect(hotlineLink).toHaveAttribute('href', 'tel:988')
    })

    it('should render text as sms: link', () => {
      render(<CrisisResourceList resources={mockResources} onResourceClick={onResourceClick} />)

      const textLink = screen.getByRole('link', { name: /Crisis Text Line/i })
      expect(textLink).toHaveAttribute('href', 'sms:741741?body=HOME')
    })

    it('should render website as https: link', () => {
      render(<CrisisResourceList resources={mockResources} onResourceClick={onResourceClick} />)

      const websiteLink = screen.getByRole('link', { name: /Teen Help Website/i })
      expect(websiteLink).toHaveAttribute('href', 'https://teenhelp.example.com')
    })

    it('should open links in new tab for websites', () => {
      render(<CrisisResourceList resources={mockResources} />)

      const websiteLink = screen.getByRole('link', { name: /Teen Help Website/i })
      expect(websiteLink).toHaveAttribute('target', '_blank')
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should call onResourceClick when resource clicked', () => {
      render(<CrisisResourceList resources={mockResources} onResourceClick={onResourceClick} />)

      const hotlineLink = screen.getByRole('link', { name: /988 Suicide & Crisis Lifeline/i })
      fireEvent.click(hotlineLink)

      expect(onResourceClick).toHaveBeenCalledWith(mockResources[0])
    })
  })

  // ============================================
  // Chat Option Tests (AC4)
  // ============================================

  describe('Chat Option (AC4)', () => {
    it('should show chat button for resources with chat available', () => {
      render(<CrisisResourceList resources={mockResources} onChatClick={onChatClick} />)

      // 988 Lifeline and Teen Help have chat available
      const chatButtons = screen.getAllByRole('button', { name: /chat/i })
      expect(chatButtons.length).toBe(2)
    })

    it('should not show chat button for resources without chat', () => {
      const noChat: SignalCrisisResource[] = [
        {
          id: 'no-chat',
          name: 'Phone Only Resource',
          description: 'Phone only',
          type: 'phone',
          value: '1-800-555-5555',
          priority: 1,
          jurisdictions: ['US'],
          available24x7: true,
          chatAvailable: false,
        },
      ]
      render(<CrisisResourceList resources={noChat} onChatClick={onChatClick} />)

      expect(screen.queryByRole('button', { name: /chat/i })).not.toBeInTheDocument()
    })

    it('should call onChatClick with resource when chat button clicked', () => {
      render(<CrisisResourceList resources={mockResources} onChatClick={onChatClick} />)

      const chatButtons = screen.getAllByRole('button', { name: /chat/i })
      fireEvent.click(chatButtons[0])

      expect(onChatClick).toHaveBeenCalledWith(mockResources[0])
    })

    it('should show chat option prominently', () => {
      render(<CrisisResourceList resources={mockResources} />)

      const chatButtons = screen.getAllByRole('button', { name: /chat/i })
      // Chat buttons should be visually prominent
      chatButtons.forEach((button) => {
        expect(button).toHaveClass('bg-blue-100')
      })
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should render as a list', () => {
      render(<CrisisResourceList resources={mockResources} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('should have accessible link names', () => {
      render(<CrisisResourceList resources={mockResources} />)

      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveAccessibleName()
      })
    })

    it('should have aria-label on chat buttons', () => {
      render(<CrisisResourceList resources={mockResources} />)

      const chatButtons = screen.getAllByRole('button', { name: /chat/i })
      chatButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label')
      })
    })

    it('should indicate external links', () => {
      render(<CrisisResourceList resources={mockResources} />)

      const websiteLink = screen.getByRole('link', { name: /Teen Help Website/i })
      expect(websiteLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
    })
  })

  // ============================================
  // Filtering Tests
  // ============================================

  describe('Filtering', () => {
    it('should filter to show only chat resources when chatOnly is true', () => {
      render(<CrisisResourceList resources={mockResources} chatOnly={true} />)

      // Only resources with chatAvailable should show
      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
      expect(screen.getByText('Teen Help Website')).toBeInTheDocument()
      expect(screen.queryByText('Crisis Text Line')).not.toBeInTheDocument()
      expect(screen.queryByText('Childhelp National Hotline')).not.toBeInTheDocument()
    })

    it('should filter by resource type', () => {
      render(<CrisisResourceList resources={mockResources} typeFilter="phone" />)

      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
      expect(screen.getByText('Childhelp National Hotline')).toBeInTheDocument()
      expect(screen.queryByText('Crisis Text Line')).not.toBeInTheDocument()
      expect(screen.queryByText('Teen Help Website')).not.toBeInTheDocument()
    })

    it('should limit number of resources shown', () => {
      render(<CrisisResourceList resources={mockResources} maxItems={2} />)

      const items = screen.getAllByRole('listitem')
      expect(items.length).toBe(2)
    })
  })

  // ============================================
  // Visual Style Tests
  // ============================================

  describe('Visual Style', () => {
    it('should apply custom className', () => {
      render(<CrisisResourceList resources={mockResources} className="custom-class" />)

      const list = screen.getByRole('list')
      expect(list).toHaveClass('custom-class')
    })

    it('should use compact layout when compact prop is true', () => {
      render(<CrisisResourceList resources={mockResources} compact={true} />)

      const items = screen.getAllByRole('listitem')
      items.forEach((item) => {
        expect(item).toHaveClass('p-2')
      })
    })

    it('should use standard layout by default', () => {
      render(<CrisisResourceList resources={mockResources} />)

      const items = screen.getAllByRole('listitem')
      items.forEach((item) => {
        expect(item).toHaveClass('p-4')
      })
    })
  })
})
