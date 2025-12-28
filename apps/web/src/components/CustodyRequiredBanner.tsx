'use client'

/**
 * Custody required banner component.
 *
 * Shows a blocking message when custody is not declared for a child.
 * Used to gate monitoring features until custody is declared.
 */

import { useRouter } from 'next/navigation'
import type { ChildProfile } from '@fledgely/shared/contracts'

interface CustodyRequiredBannerProps {
  child: ChildProfile
}

const styles = {
  banner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
  },
  icon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#dc2626',
    marginBottom: '8px',
  },
  message: {
    fontSize: '14px',
    color: '#7f1d1d',
    marginBottom: '16px',
    lineHeight: 1.6,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

export default function CustodyRequiredBanner({ child }: CustodyRequiredBannerProps) {
  const router = useRouter()

  const handleDeclare = () => {
    router.push(`/family/children/${child.id}/custody`)
  }

  return (
    <div style={styles.banner} role="alert">
      <style>
        {`
          .custody-required-button:hover {
            background-color: #b91c1c;
          }
          .custody-required-button:focus {
            outline: 2px solid #dc2626;
            outline-offset: 2px;
          }
        `}
      </style>
      <div style={styles.icon} aria-hidden="true">
        &#9888;
      </div>
      <h3 style={styles.title}>Custody Declaration Required</h3>
      <p style={styles.message}>
        Before you can set up monitoring for <strong>{child.name}</strong>, you must declare your
        custody arrangement. This helps us apply appropriate safeguards.
      </p>
      <button
        type="button"
        onClick={handleDeclare}
        style={styles.button}
        className="custody-required-button"
      >
        Declare Custody Now
      </button>
    </div>
  )
}
