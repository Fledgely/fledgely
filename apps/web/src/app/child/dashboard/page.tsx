'use client'

/**
 * Child Dashboard Page - Story 19B.1, Story 23.1
 *
 * Main dashboard for authenticated children.
 * Shows screenshot gallery with child-friendly design.
 * Shows flag notifications pending child annotation (Story 23.1).
 *
 * Task 6: Create Child Dashboard Layout (AC: #1, #5)
 * - 6.1 Create /child/dashboard page
 * - 6.2 Create child-specific header with name and logout
 * - 6.3 Add "My Screenshots" section as primary content
 * - 6.4 Use sky blue color scheme (distinct from parent purple)
 * - 6.5 Ensure fully responsive layout
 *
 * Story 23.1 - Task 5: Integrate flag notifications
 * - 5.1 Add ChildFlagNotificationBanner to child-facing pages
 * - 5.2 Show notification count badge if pending flags exist
 * - 5.3 Route to annotation screen
 *
 * Story 23.2 - Task 6: Update dashboard handleAddContext
 * - 6.1 Navigate to /child/annotate/${flagId} (implemented)
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChildAuthGuard } from '../../../components/child/ChildAuthGuard'
import { ChildScreenshotGallery } from '../../../components/child/ChildScreenshotGallery'
import { ChildScreenshotDetail } from '../../../components/child/ChildScreenshotDetail'
import { ChildFlagNotificationBanner } from '../../../components/child/ChildFlagNotificationBanner'
import { ChildScreenTimeCard } from '../../../components/child/ChildScreenTimeCard'
import { ChildOfflineScheduleCard } from '../../../components/child/ChildOfflineScheduleCard'
import { ChildEnrolledDevicesCard } from '../../../components/child/ChildEnrolledDevicesCard'
import { ParentComplianceCard } from '../../../components/child/ParentComplianceCard'
import { HomeworkExceptionRequest } from '../../../components/child/HomeworkExceptionRequest'
import { useChildAuth } from '../../../contexts/ChildAuthContext'
import { useChildScreenshots, type ChildScreenshot } from '../../../hooks/useChildScreenshots'
import { useChildPendingFlags } from '../../../hooks/useChildPendingFlags'
import { useChildAuditLog } from '../../../hooks/useChildAuditLog'
import { ChildAuditSection } from '../../../components/child/ChildAuditSection'
import {
  CheckInPromptBanner,
  FrictionIndicatorsDashboard,
  RepairResourcesPanel,
} from '../../../components/health'
import { useChildPendingCheckIns } from '../../../hooks/useChildPendingCheckIns'
import { useChildFrictionIndicators } from '../../../hooks/useChildFrictionIndicators'
import { useChildResolutions } from '../../../hooks/useChildResolutions'
import { useFamilyOfflineSchedule } from '../../../hooks/useFamilyOfflineSchedule'
import { useParentDeviceEnrollment } from '../../../hooks/useParentDeviceEnrollment'
import { useOfflineExceptions } from '../../../hooks/useOfflineExceptions'
import { ExceptionHistoryCard } from '../../../components/settings/ExceptionHistoryCard'
import { StreakCounterCard } from '../../../components/dashboard'
import { useOfflineTimeStreak } from '../../../hooks/useOfflineTimeStreak'

/**
 * Styles using sky blue theme for child dashboard
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f9ff', // sky-50
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #bae6fd', // sky-200
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0369a1', // sky-700
  },
  logoIcon: {
    fontSize: '1.75rem',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#e0f2fe', // sky-100
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#0c4a6e', // sky-900
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#0ea5e9', // sky-500
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  },
  logoutButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #7dd3fc', // sky-300
    backgroundColor: '#ffffff',
    color: '#0369a1', // sky-700
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    minHeight: '44px',
    transition: 'all 0.15s ease',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e0f2fe', // sky-100
  },
  welcomeTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: '0 0 8px 0',
  },
  welcomeText: {
    fontSize: '1rem',
    color: '#0369a1', // sky-700
    margin: 0,
    lineHeight: 1.5,
  },
  galleryCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e0f2fe', // sky-100
    overflow: 'hidden',
  },
  sessionIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#d1fae5', // green-100
    borderRadius: '9999px',
    fontSize: '0.75rem',
    color: '#065f46', // green-800
  },
  sessionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981', // green-500
  },
  // Story 23.1 - Notification badge styles
  notificationBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#fef3c7', // amber-100
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#92400e', // amber-800
    cursor: 'pointer',
    border: '2px solid #fcd34d', // amber-300
    transition: 'all 0.15s ease',
  },
  notificationIcon: {
    fontSize: '1rem',
  },
  notificationsSection: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
}

/**
 * Dashboard content component (inside auth guard)
 */
function DashboardContent() {
  const router = useRouter()
  const { childSession, signOutChild } = useChildAuth()
  const [selectedScreenshot, setSelectedScreenshot] = useState<ChildScreenshot | null>(null)

  // Fetch screenshots for this child
  const { screenshots, loading, loadingMore, error, hasMore, loadMore } = useChildScreenshots({
    childId: childSession?.childId || null,
    enabled: !!childSession?.childId,
  })

  // Story 23.1 - Fetch pending flags for annotation
  const { pendingFlags, pendingCount } = useChildPendingFlags({
    childId: childSession?.childId || '',
  })

  // Story 27.3 - Fetch child audit log
  const {
    events: auditEvents,
    isLoading: auditLoading,
    error: auditError,
    noRecentAccess,
    lastAccessDate,
  } = useChildAuditLog(childSession?.childId || null, childSession?.familyId || null)

  // Story 27.5.2 - Fetch pending health check-ins
  const { pendingCheckIns } = useChildPendingCheckIns({
    childId: childSession?.childId || null,
    enabled: !!childSession?.childId,
  })

  // Story 27.5.4 - Fetch friction indicators (bilateral transparency)
  const {
    indicators: frictionIndicators,
    isLoading: frictionLoading,
    error: frictionError,
  } = useChildFrictionIndicators(childSession?.familyId || null)

  // Resolutions (Story 27.5.6)
  const {
    resolutions,
    isLoading: resolutionsLoading,
    createResolution,
  } = useChildResolutions(childSession?.familyId || null)

  // Story 32.1 - Family offline schedule
  const { schedule: offlineSchedule, loading: offlineLoading } = useFamilyOfflineSchedule({
    familyId: childSession?.familyId,
    enabled: !!childSession?.familyId,
  })

  // Story 32.2 - Parent device enrollment
  const { enrollment, loading: enrollmentLoading } = useParentDeviceEnrollment(
    childSession?.familyId
  )

  // Story 32.5 - Offline exceptions for audit display (AC6)
  const { exceptions: offlineExceptions, loading: exceptionsLoading } = useOfflineExceptions({
    familyId: childSession?.familyId ?? null,
    enabled: !!childSession?.familyId,
  })

  // Story 32.6 - Offline time streak
  const {
    streak,
    loading: streakLoading,
    celebrationMilestone,
    dismissCelebration,
  } = useOfflineTimeStreak({ familyId: childSession?.familyId ?? null })

  // Story 23.1/23.2 - Handle navigation to annotation screen
  const handleAddContext = useCallback(
    (flagId: string) => {
      router.push(`/child/annotate/${flagId}`)
    },
    [router]
  )

  const handleLogout = () => {
    signOutChild()
    router.push('/child/login')
  }

  const handleSelectScreenshot = (screenshot: ChildScreenshot) => {
    setSelectedScreenshot(screenshot)
  }

  const handleCloseDetail = () => {
    setSelectedScreenshot(null)
  }

  const handleNavigateScreenshot = (screenshot: ChildScreenshot) => {
    setSelectedScreenshot(screenshot)
  }

  return (
    <div style={styles.container} data-testid="child-dashboard">
      <style>
        {`
          .logout-button:hover {
            background-color: #e0f2fe !important;
            border-color: #0ea5e9 !important;
          }
          .logout-button:focus {
            outline: 2px solid #0ea5e9;
            outline-offset: 2px;
          }
        `}
      </style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🐣</span>
          <span>Fledgely</span>
        </div>

        <div style={styles.headerRight}>
          {/* Story 23.1 - Notification badge */}
          {pendingCount > 0 && (
            <div
              style={styles.notificationBadge}
              data-testid="notification-badge"
              onClick={() => {
                // Scroll to notifications section
                document
                  .getElementById('notifications-section')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  document
                    .getElementById('notifications-section')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              <span style={styles.notificationIcon}>💬</span>
              <span>{pendingCount} to review</span>
            </div>
          )}

          {/* Session indicator */}
          <div style={styles.sessionIndicator} data-testid="session-indicator">
            <div style={styles.sessionDot} />
            <span>Signed in</span>
          </div>

          {/* User info */}
          <div style={styles.userName} data-testid="user-name">
            <div style={styles.userAvatar}>
              {childSession?.childName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span>{childSession?.childName || 'Guest'}</span>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
            className="logout-button"
            data-testid="logout-button"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" style={styles.main} role="main">
        {/* Welcome card */}
        <div style={styles.welcomeCard} data-testid="welcome-card">
          <h1 style={styles.welcomeTitle}>Hi, {childSession?.childName || 'there'}! 👋</h1>
          <p style={styles.welcomeText}>
            This is your dashboard. You can see the pictures from your devices here. Your parent
            sees the same things you do!
          </p>
        </div>

        {/* Story 32.1 - Family Offline Schedule Card (AC5) */}
        <ChildOfflineScheduleCard schedule={offlineSchedule} loading={offlineLoading} />

        {/* Story 32.2 - Parent Enrolled Devices Card (AC2, AC3, AC5) */}
        <ChildEnrolledDevicesCard
          enrolledDevices={enrollment?.devices ?? []}
          offlineScheduleEnabled={offlineSchedule?.enabled ?? false}
          loading={enrollmentLoading}
        />

        {/* Story 32.4 - Parent Compliance Card (AC2, AC4) */}
        <ParentComplianceCard familyId={childSession?.familyId} />

        {/* Story 32.6 - Offline Time Streak (Child View) */}
        <div style={{ marginBottom: '16px' }}>
          <StreakCounterCard
            streak={streak}
            loading={streakLoading}
            isChildView={true}
            celebrationMilestone={celebrationMilestone}
            onCelebrationDismiss={dismissCelebration}
          />
        </div>

        {/* Story 32.5 - Homework Exception Request (AC4) */}
        <HomeworkExceptionRequest
          familyId={childSession?.familyId ?? null}
          childId={childSession?.childId ?? null}
          childName={childSession?.childName ?? 'Child'}
          isOfflineTimeActive={offlineSchedule?.enabled ?? false}
        />

        {/* Story 32.5 - Exception History (AC6) - Child-friendly view */}
        <ExceptionHistoryCard
          exceptions={offlineExceptions}
          loading={exceptionsLoading}
          isChildView={true}
          limit={5}
        />

        {/* Story 27.5.2: Health Check-In Prompt Banner */}
        {pendingCheckIns.length > 0 && <CheckInPromptBanner checkIn={pendingCheckIns[0]} isChild />}

        {/* Story 27.5.4: Friction Indicators Dashboard - bilateral transparency */}
        {/* Story 27.5.6: Resolution Markers */}
        <FrictionIndicatorsDashboard
          indicators={frictionIndicators}
          isLoading={frictionLoading}
          error={frictionError}
          resolutions={resolutions}
          resolutionsLoading={resolutionsLoading}
          onCreateResolution={createResolution}
          showResolutions={true}
        />

        {/* Story 27.5.5: Repair Resources - shown when friction detected */}
        {frictionIndicators?.hasEnoughData &&
          (frictionIndicators.relationshipHealth === 'some_concerns' ||
            frictionIndicators.trend === 'needs_attention') && (
            <RepairResourcesPanel showParentResources={false} showChildResources={true} />
          )}

        {/* Story 29.5 - Child Screen Time Card */}
        <ChildScreenTimeCard
          familyId={childSession?.familyId || null}
          childId={childSession?.childId || null}
        />

        {/* Story 23.1 - Flag notification banners */}
        {pendingFlags.length > 0 && (
          <div
            id="notifications-section"
            style={styles.notificationsSection}
            data-testid="notifications-section"
          >
            {pendingFlags.map((flag) => (
              <ChildFlagNotificationBanner
                key={flag.id}
                flag={flag}
                onAddContext={handleAddContext}
              />
            ))}
          </div>
        )}

        {/* Screenshot gallery */}
        <div style={styles.galleryCard}>
          <ChildScreenshotGallery
            screenshots={screenshots}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            error={error}
            onLoadMore={loadMore}
            onSelectScreenshot={handleSelectScreenshot}
          />
        </div>

        {/* Story 27.3 - Child audit log section */}
        <ChildAuditSection
          events={auditEvents}
          isLoading={auditLoading}
          error={auditError}
          noRecentAccess={noRecentAccess}
          lastAccessDate={lastAccessDate}
        />
      </main>

      {/* Screenshot detail modal */}
      {selectedScreenshot && (
        <ChildScreenshotDetail
          screenshot={selectedScreenshot}
          screenshots={screenshots}
          onClose={handleCloseDetail}
          onNavigate={handleNavigateScreenshot}
        />
      )}
    </div>
  )
}

/**
 * Child Dashboard Page - Protected by ChildAuthGuard
 */
export default function ChildDashboardPage() {
  return (
    <ChildAuthGuard>
      <DashboardContent />
    </ChildAuthGuard>
  )
}
