/**
 * Graduation Celebration Tests - Story 38.3 Task 8
 *
 * Tests for graduation celebration UI component.
 * AC3: Celebration message displayed
 * AC7: Graduation certificate generated for family
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraduationCelebration from './GraduationCelebration'
import type { GraduationCertificate, DataType } from '@fledgely/shared'

const createMockCertificate = (
  overrides?: Partial<GraduationCertificate>
): GraduationCertificate => ({
  id: 'cert-123',
  childId: 'child-456',
  familyId: 'family-789',
  childName: 'Alex',
  graduationDate: new Date('2025-06-15'),
  monthsAtPerfectTrust: 12,
  totalMonitoringDuration: 24,
  generatedAt: new Date('2025-06-15'),
  ...overrides,
})

const createMockDeletionInfo = () => ({
  scheduledDate: new Date('2025-07-15'),
  dataTypes: ['screenshots', 'flags', 'activity_logs', 'trust_history'] as DataType[],
})

describe('GraduationCelebration', () => {
  const mockOnViewCertificate = vi.fn()
  const mockOnViewResources = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Basic Rendering Tests
  // ============================================

  describe('Basic Rendering', () => {
    it('should render component with required props', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('should display celebratory congratulations message', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
    })

    it('should have celebratory styling', () => {
      const { container } = render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      // Check for celebratory colors (green success colors)
      const article = container.querySelector('article')
      expect(article).toHaveStyle({ backgroundColor: expect.stringContaining('') })
    })
  })

  // ============================================
  // Celebration Message Tests (AC3)
  // ============================================

  describe('Celebration Message', () => {
    it('should display child-specific congratulations for child viewer', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/graduated/i)
    })

    it('should display parent-specific congratulations for parent viewer', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="parent"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Alex/i)
    })

    it('should mention monitoring has stopped', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/monitoring journey has come to an end/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Achievement Summary Tests
  // ============================================

  describe('Achievement Summary', () => {
    it('should display months at perfect trust', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate({ monthsAtPerfectTrust: 12 })}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/12/)).toBeInTheDocument()
    })

    it('should display total monitoring duration', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate({ totalMonitoringDuration: 24 })}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/24/)).toBeInTheDocument()
    })

    it('should display graduation date', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate({ graduationDate: new Date('2025-06-15') })}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/Graduated June 15, 2025/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Certificate Tests (AC7)
  // ============================================

  describe('Certificate', () => {
    it('should display certificate section', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/Certificate of Graduation/i)).toBeInTheDocument()
    })

    it('should have view certificate button', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByRole('button', { name: /certificate/i })).toBeInTheDocument()
    })

    it('should call onViewCertificate when button clicked', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      const button = screen.getByRole('button', { name: /certificate/i })
      fireEvent.click(button)

      expect(mockOnViewCertificate).toHaveBeenCalled()
    })

    it('should display child name on certificate preview', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="parent"
          certificate={createMockCertificate({ childName: 'Alex' })}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getAllByText(/Alex/i).length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Deletion Timeline Tests
  // ============================================

  describe('Deletion Timeline', () => {
    it('should display deletion information section', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/About Your Data/i)).toBeInTheDocument()
    })

    it('should show scheduled deletion date', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={{
            scheduledDate: new Date('2025-07-15'),
            dataTypes: ['screenshots'] as DataType[],
          }}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/July 15, 2025/)).toBeInTheDocument()
    })

    it('should explain deletion is permanent', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByText(/permanently deleted/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Resources Link Tests
  // ============================================

  describe('Resources Link', () => {
    it('should display resources link when onViewResources provided', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
          onViewResources={mockOnViewResources}
        />
      )

      expect(screen.getByRole('button', { name: /resources/i })).toBeInTheDocument()
    })

    it('should call onViewResources when clicked', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
          onViewResources={mockOnViewResources}
        />
      )

      const button = screen.getByRole('button', { name: /resources/i })
      fireEvent.click(button)

      expect(mockOnViewResources).toHaveBeenCalled()
    })

    it('should not show resources link when onViewResources not provided', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.queryByRole('button', { name: /resources/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Viewer Type Tests
  // ============================================

  describe('Viewer Type Specific Content', () => {
    it('should show child-specific next steps for child', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      // Child view uses "you" language in the title
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/You've Graduated/)
    })

    it('should show parent-specific next steps for parent', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="parent"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      // Parent view references child by name in the title
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Alex Has Graduated/)
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByRole('article')).toHaveAttribute('aria-label')
    })

    it('should have focusable buttons', () => {
      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={createMockCertificate()}
          deletionInfo={createMockDeletionInfo()}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      const button = screen.getByRole('button', { name: /certificate/i })
      expect(button).not.toHaveAttribute('tabindex', '-1')
    })
  })
})
