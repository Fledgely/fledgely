/**
 * Calendar Integration HTTP Handlers - Story 33.4
 *
 * HTTP endpoints for Google Calendar OAuth flow and calendar management.
 * Implements secure token storage and calendar integration for focus mode.
 *
 * Story 33.4 AC1: Google Calendar Connection
 * - Google Calendar OAuth flow supported
 * - Calendar events are read-only (no modifications)
 * - Connection status visible to child and parent
 * - Child can disconnect calendar at any time
 */

import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { google } from 'googleapis'
import { encryptToken, decryptToken } from '../../utils/encryption'

const db = getFirestore()

// Define secrets for OAuth credentials
const GOOGLE_CLIENT_ID = defineSecret('GOOGLE_CALENDAR_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = defineSecret('GOOGLE_CALENDAR_CLIENT_SECRET')
const TOKEN_ENCRYPTION_KEY = defineSecret('CALENDAR_TOKEN_ENCRYPTION_KEY')

// OAuth configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Create OAuth2 client with credentials
 */
function createOAuth2Client(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): InstanceType<typeof google.auth.OAuth2> {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Initiate Google Calendar OAuth flow
 *
 * Called by client to get the OAuth authorization URL.
 * Requires Firebase authentication to verify child identity.
 *
 * Story 33.4 AC1: Google Calendar OAuth flow supported
 * Story 33.4 AC6: Child must consent to calendar access
 */
export const initiateCalendarOAuth = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 50,
    concurrency: 40,
    secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET],
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify authentication
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    let userId: string
    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      userId = decodedToken.uid
      console.log('[initiateCalendarOAuth] Authenticated request from:', userId)
    } catch (error) {
      console.error('[initiateCalendarOAuth] Token verification failed:', error)
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const { childId, familyId, redirectUri } = req.body

    if (!childId || !familyId) {
      res.status(400).json({ error: 'Missing childId or familyId' })
      return
    }

    // Validate inputs
    if (typeof childId !== 'string' || typeof familyId !== 'string') {
      res.status(400).json({ error: 'Invalid childId or familyId format' })
      return
    }

    // Verify the user has permission (is the child or a parent in the family)
    try {
      const familyDoc = await db.doc(`families/${familyId}`).get()
      if (!familyDoc.exists) {
        res.status(404).json({ error: 'Family not found' })
        return
      }

      const familyData = familyDoc.data()
      const isParent = familyData?.parentIds?.includes(userId) || false
      const isChild = userId === childId

      if (!isParent && !isChild) {
        res.status(403).json({ error: 'Not authorized to connect calendar for this child' })
        return
      }
    } catch (error) {
      console.error('[initiateCalendarOAuth] Family verification error:', error)
      res.status(500).json({ error: 'Failed to verify permissions' })
      return
    }

    try {
      // Create OAuth client
      const callbackUri = redirectUri || `https://${req.hostname}/calendarOAuthCallback`
      const oauth2Client = createOAuth2Client(
        GOOGLE_CLIENT_ID.value(),
        GOOGLE_CLIENT_SECRET.value(),
        callbackUri
      )

      // Generate state token to prevent CSRF and carry context
      const state = Buffer.from(JSON.stringify({ childId, familyId, userId })).toString('base64url')

      // Generate authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state,
        prompt: 'consent', // Force consent to get refresh token
      })

      // Store pending OAuth state in Firestore (expires in 10 minutes)
      const oauthStateRef = db.doc(`calendarOAuthStates/${state}`)
      await oauthStateRef.set({
        childId,
        familyId,
        userId,
        redirectUri: callbackUri,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      })

      console.log('[initiateCalendarOAuth] Generated auth URL for child:', childId)
      res.json({ authUrl, state })
    } catch (error) {
      console.error('[initiateCalendarOAuth] Error:', error)
      res.status(500).json({ error: 'Failed to initiate OAuth' })
    }
  }
)

/**
 * Handle Google Calendar OAuth callback
 *
 * Called by Google after user grants calendar access.
 * Exchanges authorization code for tokens and stores them securely.
 *
 * Story 33.4 AC1: Connection status visible to child and parent
 */
export const calendarOAuthCallback = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 50,
    concurrency: 40,
    secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY],
  },
  async (req, res) => {
    // Handle both GET (redirect from Google) and POST
    const code = req.query.code as string | undefined
    const state = req.query.state as string | undefined
    const error = req.query.error as string | undefined

    // Handle OAuth errors
    if (error) {
      console.error('[calendarOAuthCallback] OAuth error:', error)
      res.redirect(`/calendar-connect?error=${encodeURIComponent(error)}&status=failed`)
      return
    }

    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state' })
      return
    }

    // Validate and retrieve state
    let stateData: {
      childId: string
      familyId: string
      userId: string
      redirectUri: string
    }

    try {
      const stateRef = db.doc(`calendarOAuthStates/${state}`)
      const stateDoc = await stateRef.get()

      if (!stateDoc.exists) {
        console.error('[calendarOAuthCallback] Invalid or expired state')
        res.status(400).json({ error: 'Invalid or expired OAuth state' })
        return
      }

      stateData = stateDoc.data() as typeof stateData

      // Check expiry
      const data = stateDoc.data()
      if (data?.expiresAt && data.expiresAt < Date.now()) {
        await stateRef.delete()
        res.status(400).json({ error: 'OAuth state expired' })
        return
      }

      // Delete state after use (one-time use)
      await stateRef.delete()
    } catch (error) {
      console.error('[calendarOAuthCallback] State retrieval error:', error)
      res.status(500).json({ error: 'Failed to validate OAuth state' })
      return
    }

    try {
      const { childId, familyId, redirectUri } = stateData

      // Create OAuth client and exchange code for tokens
      const oauth2Client = createOAuth2Client(
        GOOGLE_CLIENT_ID.value(),
        GOOGLE_CLIENT_SECRET.value(),
        redirectUri
      )

      const { tokens } = await oauth2Client.getToken(code)
      console.log('[calendarOAuthCallback] Received tokens for child:', childId)

      if (!tokens.access_token) {
        throw new Error('No access token received')
      }

      // Get user info to determine connected email
      oauth2Client.setCredentials(tokens)
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()
      const connectedEmail = userInfo.data.email || 'Unknown'

      // Encrypt tokens before storing
      const encryptionKey = TOKEN_ENCRYPTION_KEY.value()
      const encryptedAccessToken = encryptToken(tokens.access_token, encryptionKey)
      const encryptedRefreshToken = tokens.refresh_token
        ? encryptToken(tokens.refresh_token, encryptionKey)
        : null

      // Store calendar integration config
      const configRef = db.doc(`families/${familyId}/calendarIntegration/${childId}`)
      await configRef.set(
        {
          childId,
          familyId,
          isEnabled: true,
          provider: 'google',
          connectionStatus: 'connected',
          connectedEmail,
          connectedAt: Date.now(),
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiry_date || null,
          lastSyncAt: null,
          lastSyncError: null,
          updatedAt: Date.now(),
        },
        { merge: true }
      )

      console.log(
        '[calendarOAuthCallback] Calendar connected for child:',
        childId,
        'email:',
        connectedEmail
      )

      // Redirect to success page
      res.redirect(`/calendar-connect?status=success&email=${encodeURIComponent(connectedEmail)}`)
    } catch (error) {
      console.error('[calendarOAuthCallback] Token exchange error:', error)
      res.redirect('/calendar-connect?status=failed&error=token_exchange_failed')
    }
  }
)

/**
 * Disconnect Google Calendar
 *
 * Removes OAuth tokens and disables calendar integration.
 * Requires Firebase authentication.
 *
 * Story 33.4 AC1: Child can disconnect calendar at any time
 */
export const disconnectCalendar = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 50,
    concurrency: 40,
    secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY],
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify authentication
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    let userId: string
    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      userId = decodedToken.uid
      console.log('[disconnectCalendar] Authenticated request from:', userId)
    } catch (error) {
      console.error('[disconnectCalendar] Token verification failed:', error)
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const { childId, familyId } = req.body

    if (!childId || !familyId) {
      res.status(400).json({ error: 'Missing childId or familyId' })
      return
    }

    // Verify the user has permission
    try {
      const familyDoc = await db.doc(`families/${familyId}`).get()
      if (!familyDoc.exists) {
        res.status(404).json({ error: 'Family not found' })
        return
      }

      const familyData = familyDoc.data()
      const isParent = familyData?.parentIds?.includes(userId) || false
      const isChild = userId === childId

      if (!isParent && !isChild) {
        res.status(403).json({ error: 'Not authorized to disconnect calendar for this child' })
        return
      }
    } catch (error) {
      console.error('[disconnectCalendar] Family verification error:', error)
      res.status(500).json({ error: 'Failed to verify permissions' })
      return
    }

    try {
      const configRef = db.doc(`families/${familyId}/calendarIntegration/${childId}`)
      const configDoc = await configRef.get()

      if (configDoc.exists) {
        const configData = configDoc.data()

        // Try to revoke the Google token
        if (configData?.accessToken) {
          try {
            const encryptionKey = TOKEN_ENCRYPTION_KEY.value()
            const accessToken = decryptToken(configData.accessToken, encryptionKey)

            const oauth2Client = createOAuth2Client(
              GOOGLE_CLIENT_ID.value(),
              GOOGLE_CLIENT_SECRET.value(),
              ''
            )
            oauth2Client.setCredentials({ access_token: accessToken })
            await oauth2Client.revokeCredentials()
            console.log('[disconnectCalendar] Revoked Google credentials')
          } catch (revokeError) {
            // Log but don't fail - token might already be invalid
            console.warn('[disconnectCalendar] Failed to revoke credentials:', revokeError)
          }
        }

        // Update config to disconnected state (remove tokens)
        await configRef.update({
          isEnabled: false,
          provider: null,
          connectionStatus: 'disconnected',
          connectedEmail: null,
          connectedAt: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          lastSyncAt: null,
          lastSyncError: null,
          autoActivateFocusMode: false,
          updatedAt: Date.now(),
        })
      }

      // Also clear cached calendar events
      const eventsRef = db.doc(`families/${familyId}/calendarEvents/${childId}`)
      await eventsRef.delete().catch(() => {
        // Ignore if doesn't exist
      })

      console.log('[disconnectCalendar] Disconnected calendar for child:', childId)
      res.json({ success: true, message: 'Calendar disconnected' })
    } catch (error) {
      console.error('[disconnectCalendar] Error:', error)
      res.status(500).json({ error: 'Failed to disconnect calendar' })
    }
  }
)

/**
 * Get calendar connection status
 *
 * Returns the current calendar connection status for a child.
 * Does not return sensitive token data.
 *
 * Story 33.4 AC1: Connection status visible to child and parent
 */
export const getCalendarStatus = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 100,
    concurrency: 80,
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify authentication
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    let userId: string
    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      userId = decodedToken.uid
    } catch (error) {
      console.error('[getCalendarStatus] Token verification failed:', error)
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const { childId, familyId } = req.body

    if (!childId || !familyId) {
      res.status(400).json({ error: 'Missing childId or familyId' })
      return
    }

    // Verify the user has permission
    try {
      const familyDoc = await db.doc(`families/${familyId}`).get()
      if (!familyDoc.exists) {
        res.status(404).json({ error: 'Family not found' })
        return
      }

      const familyData = familyDoc.data()
      const isParent = familyData?.parentIds?.includes(userId) || false
      const isChild = userId === childId

      if (!isParent && !isChild) {
        res.status(403).json({ error: 'Not authorized to view calendar status' })
        return
      }
    } catch (error) {
      console.error('[getCalendarStatus] Family verification error:', error)
      res.status(500).json({ error: 'Failed to verify permissions' })
      return
    }

    try {
      const configRef = db.doc(`families/${familyId}/calendarIntegration/${childId}`)
      const configDoc = await configRef.get()

      if (!configDoc.exists) {
        res.json({
          isConnected: false,
          connectionStatus: 'disconnected',
          connectedEmail: null,
          connectedAt: null,
          lastSyncAt: null,
          lastSyncError: null,
          autoActivateFocusMode: false,
          syncFrequencyMinutes: 30,
        })
        return
      }

      const data = configDoc.data()
      res.json({
        isConnected: data?.connectionStatus === 'connected',
        connectionStatus: data?.connectionStatus || 'disconnected',
        connectedEmail: data?.connectedEmail || null,
        connectedAt: data?.connectedAt || null,
        lastSyncAt: data?.lastSyncAt || null,
        lastSyncError: data?.lastSyncError || null,
        autoActivateFocusMode: data?.autoActivateFocusMode || false,
        syncFrequencyMinutes: data?.syncFrequencyMinutes || 30,
        focusTriggerKeywords: data?.focusTriggerKeywords || [],
      })
    } catch (error) {
      console.error('[getCalendarStatus] Error:', error)
      res.status(500).json({ error: 'Failed to get calendar status' })
    }
  }
)

// Export utilities for use by calendar sync function
export { createOAuth2Client, SCOPES }
// Re-export encryption utilities from shared module
export { encryptToken, decryptToken } from '../../utils/encryption'
