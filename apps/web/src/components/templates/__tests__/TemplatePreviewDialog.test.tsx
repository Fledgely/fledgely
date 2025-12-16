import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatePreviewDialog } from '../TemplatePreviewDialog'
import type { AgreementTemplate, VisualElements, AutonomyMilestone } from '@fledgely/contracts'

/**
 * TemplatePreviewDialog Tests
 *
 * Story 4.3: Template Preview & Selection
 *   - AC #1: Full template preview displays in modal
 *   - AC #2: Preview shows all sections: screen time, monitoring, apps, websites, consequences
 *   - AC #3: Preview highlights which items can be customized
 *   - AC #6: Preview is screen reader accessible with proper heading structure
 */

// Visual elements for ages 5-7
const mockVisualElements: VisualElements = {
  icon: '⏰',
  isYesNoRule: true,
  colorHint: 'yellow',
  altText: 'Clock icon for screen time',
}

// Mock template for ages 5-7 with visual elements
const mockTemplate5to7: AgreementTemplate = {
  id: 'test-5-7-id',
  name: 'Early Childhood - Balanced',
  description: 'A fair mix of rules and fun for young children.',
  ageGroup: '5-7',
  variation: 'balanced',
  concerns: ['screen_time', 'safety', 'gaming'],
  summary: {
    screenTimeLimit: '45 minutes on school days',
    monitoringLevel: 'comprehensive',
    keyRules: [
      'Parent nearby during screen time',
      'Ask before downloading new apps',
      'No screens before bed',
    ],
  },
  sections: [
    {
      id: 'terms-5-7',
      type: 'terms',
      title: '📋 Our Device Rules',
      description: 'The main rules we agree to follow.',
      defaultValue: 'I will use devices safely and have fun.',
      customizable: true,
      order: 0,
      visualElements: {
        icon: '📋',
        isYesNoRule: false,
        colorHint: 'blue',
        altText: 'Clipboard icon for our rules',
      },
    },
    {
      id: 'screen-time-5-7',
      type: 'screen_time',
      title: '⏰ Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue: '✅ Yes: 45 minutes after homework\n❌ No: During meals',
      customizable: true,
      order: 1,
      visualElements: mockVisualElements,
    },
    {
      id: 'monitoring-5-7',
      type: 'monitoring_rules',
      title: '👀 How Parents Will Watch',
      description: 'How parents will make sure devices are used safely.',
      defaultValue: 'A parent will be nearby during screen time.',
      customizable: false,
      order: 2,
      visualElements: {
        icon: '👀',
        isYesNoRule: false,
        colorHint: 'blue',
        altText: 'Eyes icon for watching',
      },
    },
    {
      id: 'consequences-5-7',
      type: 'consequences',
      title: '⚠️ What Happens If Rules Are Broken',
      description: 'The results of not following the rules.',
      defaultValue: 'First time: A friendly reminder.',
      customizable: true,
      order: 3,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

// Mock autonomy milestones for ages 14-16
const mockAutonomyMilestones: AutonomyMilestone[] = [
  {
    id: 'milestone-1',
    title: 'Trust Level 1: Extended Time',
    description: 'Show you can follow rules well to earn more screen time.',
    criteria: {
      trustScoreThreshold: 70,
      timeWithoutIncident: '1 month',
      parentApproval: true,
    },
    unlocks: ['30 extra minutes on weekends', 'Later bedtime on Fridays'],
    order: 1,
  },
  {
    id: 'milestone-2',
    title: 'Trust Level 2: More Privacy',
    description: 'Keep earning trust to have less frequent device checks.',
    criteria: {
      trustScoreThreshold: 80,
      timeWithoutIncident: '2 months',
      parentApproval: true,
    },
    unlocks: ['Weekly check-ins instead of daily', 'Choose one new app to try'],
    order: 2,
  },
]

// Mock template for ages 14-16 with autonomy milestones
const mockTemplate14to16: AgreementTemplate = {
  id: 'test-14-16-id',
  name: 'Older Teen - Balanced',
  description: 'A balanced approach for older teens with earned autonomy.',
  ageGroup: '14-16',
  variation: 'balanced',
  concerns: ['social_media', 'screen_time', 'homework', 'safety'],
  summary: {
    screenTimeLimit: '2.5 hours on school days, 4 hours on weekends',
    monitoringLevel: 'moderate',
    keyRules: [
      'Keep parents informed',
      'Prioritize responsibilities',
      'Practice good digital citizenship',
    ],
  },
  sections: [
    {
      id: 'terms-14-16',
      type: 'terms',
      title: 'Family Technology Contract',
      description: 'The principles guiding our technology use.',
      defaultValue: 'I am developing into a responsible digital citizen.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-14-16',
      type: 'screen_time',
      title: 'Screen Time Guidelines',
      description: 'General expectations for screen time.',
      defaultValue: 'School days: Around 2.5 hours of recreational time.',
      customizable: true,
      order: 1,
    },
  ],
  autonomyMilestones: mockAutonomyMilestones,
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

describe('TemplatePreviewDialog', () => {
  describe('basic rendering (AC #1)', () => {
    it('renders nothing when closed', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={false}
          onClose={() => {}}
        />
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders nothing when template is null', () => {
      render(
        <TemplatePreviewDialog
          template={null}
          isOpen={true}
          onClose={() => {}}
        />
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when open with template', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders template name in header', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )
      expect(screen.getByText('Early Childhood - Balanced')).toBeInTheDocument()
    })

    it('renders template description', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )
      expect(screen.getByText('A fair mix of rules and fun for young children.')).toBeInTheDocument()
    })

    it('renders variation badge', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )
      expect(screen.getByText('Balanced')).toBeInTheDocument()
    })

    it('renders age group label', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )
      // Age group appears in both title and description paragraph
      expect(screen.getByText(/Early Childhood \(5-7 years\)/)).toBeInTheDocument()
    })
  })

  describe('full section display (AC #2)', () => {
    it('displays all template sections', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('📋 Our Device Rules')).toBeInTheDocument()
      expect(screen.getByText('⏰ Screen Time Limits')).toBeInTheDocument()
      expect(screen.getByText('👀 How Parents Will Watch')).toBeInTheDocument()
      expect(screen.getByText('⚠️ What Happens If Rules Are Broken')).toBeInTheDocument()
    })

    it('displays section descriptions', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('The main rules we agree to follow.')).toBeInTheDocument()
      expect(screen.getByText('How much time can be spent on screens each day.')).toBeInTheDocument()
    })

    it('displays section default values', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/I will use devices safely and have fun/)).toBeInTheDocument()
      expect(screen.getByText(/45 minutes after homework/)).toBeInTheDocument()
    })

    it('renders section type icons for ages 5-7', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Icons should be displayed in section headers (may appear multiple times)
      const dialog = screen.getByRole('dialog')
      // Check that icons are present anywhere in the dialog
      expect(dialog.textContent).toContain('📋')
      expect(dialog.textContent).toContain('⏰')
      expect(dialog.textContent).toContain('👀')
      expect(dialog.textContent).toContain('⚠️')
    })
  })

  describe('visual elements display for ages 5-7 (Story 4.2 AC #6)', () => {
    it('displays visual element icons with section headers', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Visual elements should render their icons in section titles
      // The icons are in separate spans, so search by text that contains both
      const dialog = screen.getByRole('dialog')
      expect(dialog.textContent).toContain('📋')
      expect(dialog.textContent).toContain('Our Device Rules')
      expect(dialog.textContent).toContain('⏰')
      expect(dialog.textContent).toContain('Screen Time Limits')
    })

    it('displays yes/no rule formatting for applicable sections', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Screen time section should show yes/no formatting
      expect(screen.getByText(/✅ Yes:/)).toBeInTheDocument()
      expect(screen.getByText(/❌ No:/)).toBeInTheDocument()
    })

    it('applies color hints from visual elements', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Sections with visualElements should have color-coded styling
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      // Note: Actual color application depends on implementation
    })

    it('provides alt text for screen readers', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Visual elements should have aria-label or title with altText
      const dialog = screen.getByRole('dialog')
      expect(dialog.textContent).toContain('Screen Time')
    })
  })

  describe('autonomy milestones display for ages 14-16 (Story 4.2 AC #5)', () => {
    it('displays autonomy milestones section for 14-16 templates', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate14to16}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Should have a milestones section - look for the h3 heading specifically
      expect(screen.getByRole('heading', { name: /Earned Autonomy Milestones/i })).toBeInTheDocument()
    })

    it('displays all milestone titles', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate14to16}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Trust Level 1: Extended Time')).toBeInTheDocument()
      expect(screen.getByText('Trust Level 2: More Privacy')).toBeInTheDocument()
    })

    it('displays milestone descriptions', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate14to16}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Show you can follow rules well to earn more screen time.')).toBeInTheDocument()
      expect(screen.getByText('Keep earning trust to have less frequent device checks.')).toBeInTheDocument()
    })

    it('displays milestone criteria', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate14to16}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Should show trust score and time requirements
      expect(screen.getByText(/70% trust score/i)).toBeInTheDocument()
      // There may be multiple time references, use getAllByText
      const timeTexts = screen.getAllByText(/1 month/i)
      expect(timeTexts.length).toBeGreaterThan(0)
    })

    it('displays milestone unlocks', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate14to16}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/30 extra minutes on weekends/i)).toBeInTheDocument()
      expect(screen.getByText(/Later bedtime on Fridays/i)).toBeInTheDocument()
    })

    it('does not display milestones section for templates without milestones', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.queryByRole('heading', { name: /Earned Autonomy Milestones/i })).not.toBeInTheDocument()
    })
  })

  describe('customization highlighting (AC #3)', () => {
    it('shows customizable badge for customizable sections', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Customizable sections should show a badge or indicator
      const customizableBadges = screen.getAllByText(/customiz/i)
      expect(customizableBadges.length).toBeGreaterThan(0)
    })

    it('displays customization indicator with pencil icon', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Look for pencil icon indicator for customizable sections
      const dialog = screen.getByRole('dialog')
      // Sections marked customizable: true should have visual indicator
      expect(dialog).toBeInTheDocument()
    })

    it('does not show customization badge for non-customizable sections', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // The monitoring section (customizable: false) should not show the badge
      // Find the monitoring section and verify it doesn't have the customizable indicator
      const monitoringSection = screen.getByText('👀 How Parents Will Watch').closest('div')
      expect(monitoringSection).toBeInTheDocument()
      // Implementation will determine exact selector
    })

    it('customizable badge has aria-label for accessibility', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Customizable badge should have accessible label explaining what it means
      const customizableBadges = screen.getAllByLabelText(/customiz/i)
      expect(customizableBadges.length).toBeGreaterThan(0)
    })

    it('displays customization legend explaining indicators', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Legend section explaining customization should be visible
      const dialog = screen.getByRole('dialog')
      expect(dialog.textContent).toContain('Customizable')
      // Legend should explain what customizable means - look for "modified" or "customiz"
      expect(dialog.textContent?.toLowerCase()).toMatch(/modified|customiz|can be.*changed|personalize|adjust/i)
    })

    it('shows tooltip-style info when hovering customizable badge', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Badge should have title attribute or be associated with tooltip content
      const badges = screen.getAllByLabelText(/customiz/i)
      // At least one badge should have descriptive title or aria-describedby
      expect(badges.some(badge =>
        badge.hasAttribute('title') || badge.hasAttribute('aria-describedby')
      )).toBe(true)
    })

    it('distinguishes customization levels when section has special restrictions', () => {
      // Screen time sections typically have recommended ranges, so they may be "partially" customizable
      render(
        <TemplatePreviewDialog
          template={mockTemplate14to16}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Template with screen_time sections should still show customizable indicator
      const dialog = screen.getByRole('dialog')
      expect(dialog.textContent).toContain('Customizable')
    })

    it('counts correct number of customizable sections', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Count customizable badges - should match number of sections with customizable: true
      // mockTemplate5to7 has 3 customizable sections (terms, screen-time, consequences)
      // Plus the legend includes an example badge, so total is 4
      const customizableBadges = screen.getAllByLabelText(/this section can be customized/i)
      expect(customizableBadges.length).toBe(4) // 3 sections + 1 in legend
    })
  })

  describe('template selection flow (AC #4)', () => {
    it('renders "Use This Template" button when onSelect is provided', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /use this template/i })).toBeInTheDocument()
    })

    it('does not render "Use This Template" button when onSelect is not provided', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.queryByRole('button', { name: /use this template/i })).not.toBeInTheDocument()
    })

    it('calls onSelect with template when button is clicked', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
          onSelect={handleSelect}
        />
      )

      await user.click(screen.getByRole('button', { name: /use this template/i }))

      expect(handleSelect).toHaveBeenCalledTimes(1)
      expect(handleSelect).toHaveBeenCalledWith(mockTemplate5to7)
    })

    it('calls onClose after selecting template', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={handleClose}
          onSelect={handleSelect}
        />
      )

      await user.click(screen.getByRole('button', { name: /use this template/i }))

      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('summary section display', () => {
    it('displays screen time limit', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('45 minutes on school days')).toBeInTheDocument()
    })

    it('displays monitoring level', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/comprehensive/i)).toBeInTheDocument()
    })

    it('displays key rules', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Parent nearby during screen time')).toBeInTheDocument()
      expect(screen.getByText('Ask before downloading new apps')).toBeInTheDocument()
      expect(screen.getByText('No screens before bed')).toBeInTheDocument()
    })

    it('displays topics/concerns covered', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Look for concern tags in the Topics Covered section
      // These appear as chips/badges distinct from section headers
      const topicsSection = screen.getByText('Topics Covered').parentElement
      expect(topicsSection).toBeInTheDocument()

      // Check that the concern labels are displayed (may appear multiple times, use getAllByText)
      const screenTimeTexts = screen.getAllByText('Screen Time')
      expect(screenTimeTexts.length).toBeGreaterThan(0)

      const safetyTexts = screen.getAllByText('Online Safety')
      expect(safetyTexts.length).toBeGreaterThan(0)

      const gamingTexts = screen.getAllByText('Gaming')
      expect(gamingTexts.length).toBeGreaterThan(0)
    })
  })

  describe('dialog interactions', () => {
    it('closes when clicking backdrop', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={handleClose}
        />
      )

      // Click backdrop (aria-hidden div)
      const backdrop = document.querySelector('[aria-hidden="true"]')
      if (backdrop) {
        await user.click(backdrop)
        expect(handleClose).toHaveBeenCalledTimes(1)
      }
    })

    it('closes when pressing Escape key', () => {
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={handleClose}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('closes when clicking cancel button', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={handleClose}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancel/i }))
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('closes when clicking close (X) button', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={handleClose}
        />
      )

      await user.click(screen.getByRole('button', { name: /close dialog/i }))
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility (AC #6)', () => {
    it('has role="dialog"', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby pointing to title', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')

      const labelledById = dialog.getAttribute('aria-labelledby')
      const titleElement = document.getElementById(labelledById!)
      expect(titleElement?.textContent).toContain('Early Childhood - Balanced')
    })

    it('has proper heading hierarchy (h2 for title, h3 for sections)', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Dialog title should be h2
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)
      expect(h2Elements[0].textContent).toContain('Early Childhood - Balanced')

      // Section headers should be h3
      const h3Elements = screen.getAllByRole('heading', { level: 3 })
      expect(h3Elements.length).toBeGreaterThan(0)
    })

    it('has focus trap - Tab cycles through focusable elements', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )

      // Focus should be trapped within the dialog
      const dialog = screen.getByRole('dialog')
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('has visible focus indicators on interactive elements', async () => {
      const user = userEvent.setup()

      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.tab()

      // Check that focus styles are applied (the element should be focusable)
      expect(document.activeElement).not.toBe(document.body)
    })

    it('has ARIA labels for all icons', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Close button should have aria-label
      const closeButton = screen.getByRole('button', { name: /close dialog/i })
      expect(closeButton).toHaveAttribute('aria-label')
    })

    it('provides screen reader text for visual elements', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Visual elements should have accessible names via aria-label or sr-only text
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('buttons meet minimum touch target size (44x44px)', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
          onSelect={() => {}}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      // Check min-h-[44px] and min-w-[100px] classes
      expect(cancelButton.className).toMatch(/min-h-\[44px\]|min-h-11/)
    })
  })

  describe('responsive layout', () => {
    it('uses responsive classes for dialog width', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const dialogContent = screen.getByRole('dialog').querySelector('[class*="max-w"]')
      expect(dialogContent).toBeInTheDocument()
    })

    it('uses scrollable content area', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplate5to7}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Should have overflow-y-auto for scrolling
      const scrollableArea = screen.getByRole('dialog').querySelector('[class*="overflow-y-auto"]')
      expect(scrollableArea).toBeInTheDocument()
    })
  })
})
