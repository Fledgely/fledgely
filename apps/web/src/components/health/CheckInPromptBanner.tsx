'use client'

/**
 * Check-In Prompt Banner Component
 *
 * Story 27.5.2: Check-In Response Interface - AC1, Task 3
 *
 * Displays a banner prompting users to complete pending health check-ins.
 * Shows on dashboard when there are pending check-ins.
 */

import Link from 'next/link'
import type { Route } from 'next'
import type { HealthCheckIn } from '@fledgely/shared'

const styles = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    border: '1px solid #fcd34d',
    marginBottom: '24px',
  },
  bannerChild: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    fontSize: '24px',
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e',
    margin: 0,
  },
  titleChild: {
    color: '#1e40af',
  },
  message: {
    fontSize: '14px',
    color: '#a16207',
    margin: 0,
  },
  messageChild: {
    color: '#3b82f6',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#f59e0b',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  buttonChild: {
    backgroundColor: '#3b82f6',
    padding: '12px 24px',
    fontSize: '16px',
  },
}

interface CheckInPromptBannerProps {
  checkIn: HealthCheckIn
  isChild?: boolean
}

export function CheckInPromptBanner({ checkIn, isChild = false }: CheckInPromptBannerProps) {
  const basePath = isChild ? '/child/check-in' : '/dashboard/check-in'
  const href = `${basePath}/${checkIn.id}` as Route

  return (
    <div style={{ ...styles.banner, ...(isChild ? styles.bannerChild : {}) }}>
      <div style={styles.content}>
        <span style={styles.icon} role="img" aria-hidden="true">
          {isChild ? '💭' : '📋'}
        </span>
        <div style={styles.textContainer}>
          <h3 style={{ ...styles.title, ...(isChild ? styles.titleChild : {}) }}>
            {isChild ? 'How are things going?' : 'Family Check-In Time'}
          </h3>
          <p style={{ ...styles.message, ...(isChild ? styles.messageChild : {}) }}>
            {isChild
              ? 'Share how you feel about the monitoring - your answers are private!'
              : 'Take a moment to reflect on how monitoring is going with your family.'}
          </p>
        </div>
      </div>
      <Link href={href} style={{ ...styles.button, ...(isChild ? styles.buttonChild : {}) }}>
        {isChild ? 'Share Now' : 'Complete Check-In'}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
