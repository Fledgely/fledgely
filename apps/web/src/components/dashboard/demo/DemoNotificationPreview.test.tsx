/**
 * Tests for DemoNotificationPreview Component
 *
 * Story 8.5.4: Sample Flag & Alert Examples
 * AC4: Notification preview shows what alerts look like
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoNotificationPreview } from './DemoNotificationPreview'

describe('DemoNotificationPreview', () => {
  describe('basic rendering', () => {
    it('should render the component', () => {
      render(<DemoNotificationPreview />)
      const component = screen.getByTestId('demo-notification-preview')
      expect(component).toBeInTheDocument()
    })

    it('should show demo badge', () => {
      render(<DemoNotificationPreview />)
      const badge = screen.getByTestId('demo-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Demo')
    })

    it('should have demo styling (lavender background, dashed border)', () => {
      render(<DemoNotificationPreview />)
      const component = screen.getByTestId('demo-notification-preview')
      expect(component).toHaveStyle({ backgroundColor: '#faf5ff' })
    })
  })

  describe('notification card (AC4)', () => {
    it('should display notification card', () => {
      render(<DemoNotificationPreview />)
      const card = screen.getByTestId('notification-card')
      expect(card).toBeInTheDocument()
    })

    it('should show app icon', () => {
      render(<DemoNotificationPreview />)
      const icon = screen.getByTestId('notification-app-icon')
      expect(icon).toBeInTheDocument()
    })

    it('should show app name (Fledgely)', () => {
      render(<DemoNotificationPreview />)
      const appName = screen.getByTestId('notification-app-name')
      expect(appName).toHaveTextContent('Fledgely')
    })

    it('should show notification time', () => {
      render(<DemoNotificationPreview />)
      const time = screen.getByTestId('notification-time')
      expect(time).toBeInTheDocument()
      expect(time.textContent).toBeTruthy()
    })

    it('should show notification title', () => {
      render(<DemoNotificationPreview />)
      const title = screen.getByTestId('notification-title')
      expect(title).toBeInTheDocument()
    })

    it('should show notification body', () => {
      render(<DemoNotificationPreview />)
      const body = screen.getByTestId('notification-body')
      expect(body).toBeInTheDocument()
    })
  })

  describe('flag notification (default)', () => {
    it('should show flag notification title with child name', () => {
      render(<DemoNotificationPreview />)
      const title = screen.getByTestId('notification-title')
      expect(title).toHaveTextContent('Fledgely - New Flag for Alex')
    })

    it('should show flag notification body', () => {
      render(<DemoNotificationPreview />)
      const body = screen.getByTestId('notification-body')
      expect(body).toHaveTextContent('A new item has been flagged for your review')
    })

    it('should show flag icon', () => {
      render(<DemoNotificationPreview />)
      const title = screen.getByTestId('notification-title')
      expect(title).toHaveTextContent('🚩')
    })

    it('should use custom child name', () => {
      render(<DemoNotificationPreview childName="Emma" />)
      const title = screen.getByTestId('notification-title')
      expect(title).toHaveTextContent('New Flag for Emma')
    })
  })

  describe('screentime notification', () => {
    it('should show screen time notification title', () => {
      render(<DemoNotificationPreview notificationType="screentime" />)
      const title = screen.getByTestId('notification-title')
      expect(title).toHaveTextContent('Screen Time Alert')
    })

    it('should show screen time notification body with child name', () => {
      render(<DemoNotificationPreview notificationType="screentime" childName="Alex" />)
      const body = screen.getByTestId('notification-body')
      expect(body).toHaveTextContent('Alex has reached their daily screen time limit')
    })

    it('should show clock icon', () => {
      render(<DemoNotificationPreview notificationType="screentime" />)
      const title = screen.getByTestId('notification-title')
      expect(title).toHaveTextContent('⏰')
    })
  })

  describe('activity notification', () => {
    it('should show activity notification title', () => {
      render(<DemoNotificationPreview notificationType="activity" />)
      const title = screen.getByTestId('notification-title')
      expect(title).toHaveTextContent('Activity Update')
    })

    it('should show activity notification body with child name', () => {
      render(<DemoNotificationPreview notificationType="activity" childName="Alex" />)
      const body = screen.getByTestId('notification-body')
      expect(body).toHaveTextContent('Alex has started a new session')
    })

    it('should show phone icon', () => {
      render(<DemoNotificationPreview notificationType="activity" />)
      const title = screen.getByTestId('notification-title')
      expect(title).toHaveTextContent('📱')
    })
  })

  describe('custom content', () => {
    it('should use custom title when provided', () => {
      render(<DemoNotificationPreview title="Custom Title" />)
      const title = screen.getByTestId('notification-title')
      expect(title).toHaveTextContent('Custom Title')
    })

    it('should use custom body when provided', () => {
      render(<DemoNotificationPreview body="Custom notification body" />)
      const body = screen.getByTestId('notification-body')
      expect(body).toHaveTextContent('Custom notification body')
    })

    it('should use custom timestamp', () => {
      const customDate = new Date('2024-01-15T10:30:00')
      render(<DemoNotificationPreview timestamp={customDate} />)
      const time = screen.getByTestId('notification-time')
      expect(time).toHaveTextContent('10:30 AM')
    })
  })

  describe('info text', () => {
    it('should show info text', () => {
      render(<DemoNotificationPreview />)
      const info = screen.getByTestId('notification-info')
      expect(info).toBeInTheDocument()
      expect(info).toHaveTextContent('preview of how notifications will appear')
    })
  })
})
