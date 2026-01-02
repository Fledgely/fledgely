'use client'

/**
 * Graduation Celebration Component - Story 38.3 Task 8
 *
 * UI component for celebrating graduation milestone.
 * AC3: Celebration message displayed
 * AC7: Graduation certificate generated for family
 */

import type { GraduationCertificate, DataType, ViewerType } from '@fledgely/shared'

export interface GraduationCelebrationProps {
  childName: string
  viewerType: ViewerType
  certificate: GraduationCertificate
  deletionInfo: {
    scheduledDate: Date
    dataTypes: DataType[]
  }
  onViewCertificate: () => void
  onViewResources?: () => void
}

const styles = {
  container: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #22c55e',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '700px',
    textAlign: 'center' as const,
  },
  header: {
    marginBottom: '32px',
  },
  celebrationIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#166534',
    margin: 0,
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#15803d',
    margin: 0,
    lineHeight: 1.6,
  },
  achievementSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #86efac',
  },
  achievementTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#166534',
    marginBottom: '16px',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  statCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#166534',
    margin: 0,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#15803d',
    margin: 0,
  },
  certificateSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #86efac',
  },
  certificatePreview: {
    backgroundColor: '#fefce8',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    border: '2px solid #fcd34d',
  },
  certificateTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#854d0e',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    margin: 0,
    marginBottom: '8px',
  },
  certificateName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#166534',
    margin: 0,
    marginBottom: '8px',
  },
  certificateDate: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  deletionSection: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #bfdbfe',
    textAlign: 'left' as const,
  },
  deletionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
    marginBottom: '8px',
    margin: 0,
  },
  deletionText: {
    fontSize: '14px',
    color: '#1e3a8a',
    lineHeight: 1.6,
    margin: 0,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
    padding: '12px 28px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
    padding: '12px 28px',
    backgroundColor: '#ffffff',
    color: '#166534',
    fontSize: '16px',
    fontWeight: 500,
    border: '2px solid #22c55e',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function GraduationCelebration({
  childName,
  viewerType,
  certificate,
  deletionInfo,
  onViewCertificate,
  onViewResources,
}: GraduationCelebrationProps) {
  const isChild = viewerType === 'child'

  const getTitle = () => {
    if (isChild) {
      return "You've Graduated!"
    }
    return `${childName} Has Graduated!`
  }

  const getSubtitle = () => {
    if (isChild) {
      return 'Congratulations on this incredible achievement! Your monitoring journey has come to an end, and you now have full digital independence.'
    }
    return `Congratulations! ${childName} has successfully completed their monitoring journey and earned full digital independence.`
  }

  return (
    <article
      style={styles.container}
      aria-label={`Graduation celebration for ${isChild ? 'you' : childName}`}
    >
      <style>
        {`
          .celebration-btn:hover {
            opacity: 0.9;
            transform: scale(1.02);
          }
          .celebration-btn:focus {
            outline: 2px solid #22c55e;
            outline-offset: 2px;
          }
        `}
      </style>

      <header style={styles.header}>
        <div style={styles.celebrationIcon} aria-hidden="true">
          🎓
        </div>
        <h1 style={styles.title}>{getTitle()}</h1>
        <p style={styles.subtitle}>{getSubtitle()}</p>
      </header>

      <section style={styles.achievementSection}>
        <h2 style={styles.achievementTitle}>Your Achievement</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{certificate.monthsAtPerfectTrust}</p>
            <p style={styles.statLabel}>Months at 100% Trust</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{certificate.totalMonitoringDuration}</p>
            <p style={styles.statLabel}>Month Monitoring Journey</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{formatDate(certificate.graduationDate).split(' ')[0]}</p>
            <p style={styles.statLabel}>
              {formatDate(certificate.graduationDate).split(' ').slice(1).join(' ')}
            </p>
          </div>
        </div>
      </section>

      <section style={styles.certificateSection}>
        <div style={styles.certificatePreview}>
          <p style={styles.certificateTitle}>Certificate of Graduation</p>
          <p style={styles.certificateName}>{certificate.childName}</p>
          <p style={styles.certificateDate}>Graduated {formatDate(certificate.graduationDate)}</p>
        </div>
        <button
          type="button"
          onClick={onViewCertificate}
          style={styles.primaryButton}
          className="celebration-btn"
          aria-label="View Certificate"
        >
          View Certificate
        </button>
      </section>

      <div style={styles.deletionSection}>
        <h3 style={styles.deletionTitle}>About Your Data</h3>
        <p style={styles.deletionText}>
          {isChild ? 'Your' : `${childName}'s`} monitoring data will be permanently deleted on{' '}
          {formatDate(deletionInfo.scheduledDate)}. This gives your family time to export anything
          you&apos;d like to keep. After this date, all screenshots, activity logs, and monitoring
          history will be removed.
        </p>
      </div>

      <div style={styles.buttonGroup}>
        {onViewResources && (
          <button
            type="button"
            onClick={onViewResources}
            style={styles.secondaryButton}
            className="celebration-btn"
            aria-label="View Resources"
          >
            View Resources
          </button>
        )}
      </div>
    </article>
  )
}
