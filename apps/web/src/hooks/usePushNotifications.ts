'use client'

/**
 * usePushNotifications Hook - Story 19A.4
 *
 * Handles FCM token registration and management for push notifications.
 * Stores tokens in Firestore for server-side notification delivery.
 *
 * Features:
 * - Request notification permission
 * - Get and register FCM token
 * - Store token in Firestore
 * - Handle token refresh
 * - Clean up tokens on sign-out
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseApp, getFirestoreDb } from '../lib/firebase'

/**
 * Permission status for notifications
 */
export type NotificationPermission = 'default' | 'granted' | 'denied' | 'not-supported'

/**
 * Result from usePushNotifications hook
 */
export interface PushNotificationResult {
  /** Current notification permission status */
  permissionStatus: NotificationPermission
  /** Current FCM token, or null if not registered */
  token: string | null
  /** Whether the hook is loading (fetching token) */
  loading: boolean
  /** Error message if something went wrong */
  error: string | null
  /** Request notification permission from user */
  requestPermission: () => Promise<NotificationPermission>
  /** Unregister the current token (for sign-out) */
  unregisterToken: () => Promise<void>
}

/**
 * Props for usePushNotifications hook
 */
export interface UsePushNotificationsProps {
  /** User ID to associate token with */
  userId: string | null
  /** Optional VAPID key for FCM (defaults to env variable) */
  vapidKey?: string
}

/**
 * Generate a unique token ID based on the FCM token
 * Uses first 20 chars of token as ID (enough to be unique per device)
 */
function generateTokenId(token: string): string {
  // Use a hash of the token for a cleaner ID
  return token.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')
}

/**
 * Hook for managing push notification registration
 *
 * @param props - Hook configuration
 * @returns Push notification state and actions
 */
export function usePushNotifications({
  userId,
  vapidKey,
}: UsePushNotificationsProps): PushNotificationResult {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    // Check if Notification API is available
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'not-supported'
    }
    return Notification.permission as NotificationPermission
  })

  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep refs for cleanup
  const messagingRef = useRef<Messaging | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const currentTokenIdRef = useRef<string | null>(null)

  /**
   * Save token to Firestore
   */
  const saveTokenToFirestore = useCallback(
    async (fcmToken: string) => {
      if (!userId) return

      const db = getFirestoreDb()
      const tokenId = generateTokenId(fcmToken)
      const tokenRef = doc(db, 'users', userId, 'notificationTokens', tokenId)

      await setDoc(
        tokenRef,
        {
          token: fcmToken,
          platform: 'web' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        },
        { merge: true }
      )

      currentTokenIdRef.current = tokenId
    },
    [userId]
  )

  /**
   * Get FCM token and register it
   */
  const registerToken = useCallback(async () => {
    if (!userId || permissionStatus !== 'granted') {
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const app = getFirebaseApp()
      const messaging = getMessaging(app)
      messagingRef.current = messaging

      // Get the VAPID key from props or environment
      const key = vapidKey || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

      const fcmToken = await getToken(messaging, {
        vapidKey: key,
      })

      if (fcmToken) {
        setToken(fcmToken)
        await saveTokenToFirestore(fcmToken)

        // Listen for token refresh
        unsubscribeRef.current = onMessage(messaging, (payload) => {
          // Handle foreground messages if needed
          console.log('[FCM] Foreground message:', payload)
        })
      }

      return fcmToken
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get FCM token'
      setError(message)
      console.error('[FCM] Error getting token:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [userId, permissionStatus, vapidKey, saveTokenToFirestore])

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'not-supported'
    }

    try {
      const result = await Notification.requestPermission()
      setPermissionStatus(result as NotificationPermission)
      return result as NotificationPermission
    } catch (err) {
      console.error('[FCM] Error requesting permission:', err)
      return 'denied'
    }
  }, [])

  /**
   * Unregister the current token (for sign-out)
   */
  const unregisterToken = useCallback(async () => {
    if (!userId || !currentTokenIdRef.current) return

    try {
      const db = getFirestoreDb()
      const tokenRef = doc(db, 'users', userId, 'notificationTokens', currentTokenIdRef.current)
      await deleteDoc(tokenRef)

      setToken(null)
      currentTokenIdRef.current = null

      // Clean up message listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    } catch (err) {
      console.error('[FCM] Error unregistering token:', err)
    }
  }, [userId])

  // Effect to register token when permission is granted and userId is available
  useEffect(() => {
    if (userId && permissionStatus === 'granted' && !token) {
      registerToken()
    }
  }, [userId, permissionStatus, token, registerToken])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  return {
    permissionStatus,
    token,
    loading,
    error,
    requestPermission,
    unregisterToken,
  }
}
