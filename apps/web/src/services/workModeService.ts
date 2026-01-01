/**
 * Work Mode Service - Story 33.6
 *
 * Service functions for work mode operations including:
 * - Session history tracking
 * - Daily summary aggregation
 * - Anomaly flag creation
 * - Outside-schedule notifications
 * - Parent check-ins
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type {
  WorkModeSession,
  WorkModeDailySummary,
  WorkModeSessionSummary,
  WorkModeCheckIn,
} from '@fledgely/shared'

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Save a completed session to history and update daily summary
 */
export async function saveSessionToHistory(
  session: WorkModeSession,
  isOutsideSchedule: boolean = false
): Promise<void> {
  const db = getFirestoreDb()
  const { familyId, childId, id: sessionId } = session

  if (!session.endedAt) {
    console.warn('[workModeService] Cannot save session without endedAt')
    return
  }

  const durationMinutes = Math.round((session.endedAt - session.startedAt) / (60 * 1000))

  // Create session summary for history
  const sessionSummary: WorkModeSessionSummary = {
    sessionId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMinutes,
    activationType: session.activationType,
    scheduleId: session.scheduleId,
    scheduleName: session.scheduleName,
    wasOutsideSchedule: isOutsideSchedule,
  }

  // Save to session history collection
  const sessionRef = doc(
    db,
    'families',
    familyId,
    'workModeHistory',
    childId,
    'sessions',
    sessionId
  )
  await setDoc(sessionRef, sessionSummary)

  // Update daily summary
  const date = new Date(session.startedAt).toISOString().split('T')[0]
  await updateDailySummary(familyId, childId, date, sessionSummary)
}

/**
 * Update the daily summary with a new session
 */
async function updateDailySummary(
  familyId: string,
  childId: string,
  date: string,
  sessionSummary: WorkModeSessionSummary
): Promise<void> {
  const db = getFirestoreDb()
  const summaryRef = doc(db, 'families', familyId, 'workModeDailySummary', childId, 'days', date)

  const existing = await getDoc(summaryRef)

  if (existing.exists()) {
    const data = existing.data() as WorkModeDailySummary
    const sessions = [...data.sessions, sessionSummary]

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0)
    const scheduledMinutes = sessions
      .filter((s) => s.activationType === 'scheduled')
      .reduce((sum, s) => sum + s.durationMinutes, 0)
    const manualMinutes = sessions
      .filter((s) => s.activationType === 'manual')
      .reduce((sum, s) => sum + s.durationMinutes, 0)
    const outsideScheduleCount = sessions.filter((s) => s.wasOutsideSchedule).length

    await updateDoc(summaryRef, {
      sessionCount: sessions.length,
      totalMinutes,
      scheduledMinutes,
      manualMinutes,
      outsideScheduleCount,
      sessions,
      updatedAt: Date.now(),
    })
  } else {
    const newSummary: WorkModeDailySummary = {
      childId,
      familyId,
      date,
      sessionCount: 1,
      totalMinutes: sessionSummary.durationMinutes,
      scheduledMinutes:
        sessionSummary.activationType === 'scheduled' ? sessionSummary.durationMinutes : 0,
      manualMinutes:
        sessionSummary.activationType === 'manual' ? sessionSummary.durationMinutes : 0,
      outsideScheduleCount: sessionSummary.wasOutsideSchedule ? 1 : 0,
      sessions: [sessionSummary],
      updatedAt: Date.now(),
    }

    await setDoc(summaryRef, newSummary)
  }
}

/**
 * Send a parent check-in message to a child
 */
export async function sendParentCheckIn(
  familyId: string,
  childId: string,
  parentId: string,
  parentName: string,
  message: string
): Promise<string> {
  const db = getFirestoreDb()
  const checkInsRef = collection(db, 'families', familyId, 'workModeCheckIns', childId, 'messages')

  const checkIn: Omit<WorkModeCheckIn, 'id'> = {
    familyId,
    childId,
    parentId,
    parentName,
    message,
    sentAt: Date.now(),
    readAt: null,
    response: null,
    respondedAt: null,
  }

  const docRef = await addDoc(checkInsRef, checkIn)
  return docRef.id
}

/**
 * Mark a check-in as read by the child
 */
export async function markCheckInAsRead(
  familyId: string,
  childId: string,
  checkInId: string
): Promise<void> {
  const db = getFirestoreDb()
  const checkInRef = doc(
    db,
    'families',
    familyId,
    'workModeCheckIns',
    childId,
    'messages',
    checkInId
  )

  await updateDoc(checkInRef, {
    readAt: Date.now(),
  })
}

/**
 * Respond to a parent check-in
 */
export async function respondToCheckIn(
  familyId: string,
  childId: string,
  checkInId: string,
  response: string
): Promise<void> {
  const db = getFirestoreDb()
  const checkInRef = doc(
    db,
    'families',
    familyId,
    'workModeCheckIns',
    childId,
    'messages',
    checkInId
  )

  await updateDoc(checkInRef, {
    response,
    respondedAt: Date.now(),
  })
}

/**
 * Get recent check-ins for a child
 */
export async function getRecentCheckIns(
  familyId: string,
  childId: string,
  limitCount: number = 10
): Promise<WorkModeCheckIn[]> {
  const db = getFirestoreDb()
  const checkInsRef = collection(db, 'families', familyId, 'workModeCheckIns', childId, 'messages')

  const q = query(checkInsRef, orderBy('sentAt', 'desc'), limit(limitCount))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as WorkModeCheckIn[]
}

/**
 * Create an anomaly notification for unusual work hours
 * Uses existing flag system from Epic 21-22
 */
export async function createWorkModeAnomalyNotification(
  familyId: string,
  childId: string,
  currentHours: number,
  typicalHours: number,
  deviation: number
): Promise<string> {
  const db = getFirestoreDb()
  const flagsRef = collection(db, 'children', childId, 'flags')

  const flag = {
    familyId,
    childId,
    category: 'work-mode-anomaly',
    severity: 'low', // Trust-based approach - always low severity
    status: 'pending',
    title: 'Work hours higher than usual this week',
    description: `This week's work hours (${currentHours.toFixed(1)}h) are ${Math.round(deviation * 100)}% above the typical ${typicalHours.toFixed(1)}h. Just checking in!`,
    metadata: {
      currentHours,
      typicalHours,
      deviationPercentage: Math.round(deviation * 100),
      weekDate: getTodayDate(),
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const docRef = await addDoc(flagsRef, flag)
  return docRef.id
}

/**
 * Create an outside-schedule notification
 * Informational only, non-blocking
 */
export async function createOutsideScheduleNotification(
  familyId: string,
  childId: string,
  childName: string,
  sessionId: string
): Promise<void> {
  const db = getFirestoreDb()

  // Create notification for parent (using access notifications pattern from Story 27.6)
  const notificationsRef = collection(db, 'families', familyId, 'notifications')

  await addDoc(notificationsRef, {
    type: 'work-mode-outside-schedule',
    title: `${childName} started work mode outside scheduled hours`,
    message: 'This is informational only - work mode was not blocked.',
    severity: 'low',
    childId,
    sessionId,
    isRead: false,
    createdAt: Date.now(),
  })
}

/**
 * Check if a manual activation is outside scheduled hours
 */
export function isOutsideScheduledHours(
  schedules: Array<{ days: string[]; startTime: string; endTime: string; isEnabled: boolean }>
): boolean {
  if (!schedules.length) return false // No schedules = can't be "outside"

  const now = new Date()
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    now.getDay()
  ]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const schedule of schedules) {
    if (!schedule.isEnabled) continue
    if (!schedule.days.includes(currentDay)) continue

    const [startHours, startMins] = schedule.startTime.split(':').map(Number)
    const [endHours, endMins] = schedule.endTime.split(':').map(Number)
    const startMinutes = startHours * 60 + startMins
    const endMinutes = endHours * 60 + endMins

    // Handle midnight crossing
    if (endMinutes < startMinutes) {
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
        return false // Within this schedule
      }
    } else {
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return false // Within this schedule
      }
    }
  }

  return true // Not within any schedule
}
