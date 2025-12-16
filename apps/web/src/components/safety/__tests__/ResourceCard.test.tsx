/**
 * Resource Card Tests
 *
 * Story 7.3: Child Allowlist Visibility - Task 3
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResourceCard } from '../ResourceCard'
import type { CrisisUrlEntry } from '@fledgely/shared'

const mockResource: CrisisUrlEntry = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  domain: '988lifeline.org',
  category: 'suicide',
  aliases: ['suicidepreventionlifeline.org'],
  wildcardPatterns: ['*.988lifeline.org'],
  name: '988 Suicide & Crisis Lifeline',
  description: 'Free, confidential support for people in distress',
  region: 'us',
  contactMethods: ['phone', 'text', 'chat'],
  phoneNumber: '988',
  textNumber: '988',
}

describe('ResourceCard', () => {
  describe('Content Display (AC: 2)', () => {
    it('displays the resource name', () => {
      render(<ResourceCard resource={mockResource} />)

      expect(
        screen.getByText('988 Suicide & Crisis Lifeline')
      ).toBeInTheDocument()
    })

    it('displays the resource description', () => {
      render(<ResourceCard resource={mockResource} />)

      expect(
        screen.getByText(/free, confidential support/i)
      ).toBeInTheDocument()
    })

    it('displays "Always Private" badge', () => {
      render(<ResourceCard resource={mockResource} />)

      expect(screen.getByText('Always Private')).toBeInTheDocument()
    })
  })

  describe('Clickable Links (AC: 3)', () => {
    it('renders resource name as clickable link', () => {
      render(<ResourceCard resource={mockResource} />)

      // Use getAllByRole and find the website link (has target="_blank")
      const links = screen.getAllByRole('link')
      const websiteLink = links.find((link) => link.getAttribute('target') === '_blank')
      expect(websiteLink).toHaveAttribute('href', 'https://988lifeline.org')
    })

    it('link opens in new tab', () => {
      render(<ResourceCard resource={mockResource} />)

      const links = screen.getAllByRole('link')
      const websiteLink = links.find((link) => link.getAttribute('href')?.startsWith('https://'))
      expect(websiteLink).toHaveAttribute('target', '_blank')
    })

    it('link has security attributes', () => {
      render(<ResourceCard resource={mockResource} />)

      const links = screen.getAllByRole('link')
      const websiteLink = links.find((link) => link.getAttribute('href')?.startsWith('https://'))
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('Contact Methods (Task 3.4)', () => {
    it('displays phone contact method', () => {
      render(<ResourceCard resource={mockResource} />)

      expect(screen.getByText('Call')).toBeInTheDocument()
    })

    it('displays text contact method', () => {
      render(<ResourceCard resource={mockResource} />)

      expect(screen.getByText('Text')).toBeInTheDocument()
    })

    it('displays chat contact method', () => {
      render(<ResourceCard resource={mockResource} />)

      expect(screen.getByText('Chat')).toBeInTheDocument()
    })

    it('displays clickable phone number', () => {
      render(<ResourceCard resource={mockResource} />)

      const phoneLink = screen.getByRole('link', { name: /call.*988/i })
      expect(phoneLink).toHaveAttribute('href', 'tel:988')
    })

    it('displays clickable text number', () => {
      render(<ResourceCard resource={mockResource} />)

      const textLink = screen.getByRole('link', { name: /text.*988/i })
      expect(textLink).toHaveAttribute('href', 'sms:988')
    })
  })

  describe('Resource without phone/text', () => {
    const resourceWithoutNumbers: CrisisUrlEntry = {
      ...mockResource,
      id: '550e8400-e29b-41d4-a716-446655440002',
      phoneNumber: undefined,
      textNumber: undefined,
      contactMethods: ['web', 'chat'],
    }

    it('does not render phone link when not available', () => {
      render(<ResourceCard resource={resourceWithoutNumbers} />)

      expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument()
    })

    it('does not render text link when not available', () => {
      render(<ResourceCard resource={resourceWithoutNumbers} />)

      expect(screen.queryByRole('link', { name: /text.*\d/i })).not.toBeInTheDocument()
    })

    it('displays available contact methods', () => {
      render(<ResourceCard resource={resourceWithoutNumbers} />)

      expect(screen.getByText('Website')).toBeInTheDocument()
      expect(screen.getByText('Chat')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('resource card has article role', () => {
      render(<ResourceCard resource={mockResource} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('article is labeled by resource name', () => {
      render(<ResourceCard resource={mockResource} />)

      const article = screen.getByRole('article')
      expect(article).toHaveAttribute(
        'aria-labelledby',
        `resource-${mockResource.id}-name`
      )
    })

    it('link announces it opens in new window', () => {
      render(<ResourceCard resource={mockResource} />)

      expect(screen.getByText('(opens in new window)')).toHaveClass('sr-only')
    })

    it('Always Private badge has aria-label', () => {
      render(<ResourceCard resource={mockResource} />)

      const badge = screen.getByText('Always Private')
      expect(badge).toHaveAttribute('aria-label', 'This resource is always private')
    })
  })

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<ResourceCard resource={mockResource} className="custom-class" />)

      const article = screen.getByRole('article')
      expect(article).toHaveClass('custom-class')
    })
  })
})
