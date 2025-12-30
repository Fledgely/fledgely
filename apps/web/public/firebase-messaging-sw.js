/**
 * Firebase Cloud Messaging Service Worker
 *
 * Story 19A.4: Status Push Notifications (AC: #2)
 *
 * Handles background push notifications when the app is closed or backgrounded.
 * This file must be in the public directory to be served at the root.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Firebase configuration - these are public keys, safe to include
// The actual project values will be injected at build time or use defaults
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || 'AIzaSyExample',
  authDomain: self.FIREBASE_AUTH_DOMAIN || 'fledgely-dev.firebaseapp.com',
  projectId: self.FIREBASE_PROJECT_ID || 'fledgely-dev',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || 'fledgely-dev.appspot.com',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: self.FIREBASE_APP_ID || '1:123456789:web:abcdef',
})

const messaging = firebase.messaging()

/**
 * Handle background messages
 * This is called when the app is not in the foreground
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'Fledgely'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.type || 'status_change',
    data: payload.data,
    requireInteraction: payload.data?.transition?.includes('_to_action') || false,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
      },
    ],
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

/**
 * Handle notification click
 * Opens the dashboard with the relevant child selected
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event)

  event.notification.close()

  const data = event.notification.data || {}
  const childId = data.childId
  const url = childId ? `/dashboard?childId=${childId}` : '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
