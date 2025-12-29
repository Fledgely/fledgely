/**
 * Screenshot View HTTP Endpoint with Forensic Watermarking
 * Story 18.5: Forensic Watermarking on View
 *
 * Serves screenshots with invisible forensic watermarks embedded.
 * The watermark encodes the viewer's identity for leak tracing.
 *
 * Key Security Features:
 * - Requires Firebase Auth token
 * - Verifies family membership
 * - Never serves unwatermarked original
 * - Logs all view events for audit
 *
 * Follows Cloud Functions Template pattern:
 * 1. Auth (FIRST) - validate Firebase Auth token
 * 2. Validation (SECOND) - validate request params
 * 3. Permission (THIRD) - verify family membership
 * 4. Business logic (LAST) - fetch, watermark, serve
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'
import { embedWatermark, type WatermarkPayload } from '../../lib/watermark'

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
 * Screenshot view HTTP endpoint
 *
 * GET /viewScreenshot?screenshotId={id}&childId={childId}
 *
 * Headers:
 * - Authorization: Bearer {Firebase ID token}
 *
 * Response:
 * - 200: JPEG image with watermark
 * - 400: Invalid request
 * - 401: Authentication required/failed
 * - 403: Not authorized to view this child's screenshots
 * - 404: Screenshot not found
 * - 500: Server error
 */
export const viewScreenshot = onRequest(
  {
    cors: true,
    maxInstances: 50,
    timeoutSeconds: 60,
    memory: '512MiB', // Image processing requires more memory
  },
  async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // 1. Auth (FIRST) - Validate Firebase Auth token
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization header required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    const viewerId = decodedToken.uid
    const viewerEmail = decodedToken.email || null

    // 2. Validation (SECOND) - Validate request params
    const { screenshotId, childId } = req.query

    if (!screenshotId || typeof screenshotId !== 'string') {
      res.status(400).json({ error: 'screenshotId parameter required' })
      return
    }

    if (!childId || typeof childId !== 'string') {
      res.status(400).json({ error: 'childId parameter required' })
      return
    }

    const db = getFirestore()

    // 3. Permission (THIRD) - Verify user is family member
    // First, get the child document to find familyId
    const childRef = db.collection('children').doc(childId)
    const childDoc = await childRef.get()

    if (!childDoc.exists) {
      res.status(404).json({ error: 'Child not found' })
      return
    }

    const childData = childDoc.data()
    const familyId = childData?.familyId

    if (!familyId) {
      res.status(500).json({ error: 'Child has no family association' })
      return
    }

    // Check if user is a member of this family
    const familyRef = db.collection('families').doc(familyId)
    const familyDoc = await familyRef.get()

    if (!familyDoc.exists) {
      res.status(404).json({ error: 'Family not found' })
      return
    }

    const familyData = familyDoc.data()
    const memberIds = familyData?.memberIds || []

    if (!memberIds.includes(viewerId)) {
      logger.warn('Unauthorized screenshot access attempt', {
        viewerId,
        childId,
        screenshotId,
      })
      res.status(403).json({ error: "Not authorized to view this child's screenshots" })
      return
    }

    // 4. Business logic (LAST) - Fetch screenshot, apply watermark, serve

    // Get screenshot metadata to find storage path
    const screenshotRef = childRef.collection('screenshots').doc(screenshotId)
    const screenshotDoc = await screenshotRef.get()

    if (!screenshotDoc.exists) {
      res.status(404).json({ error: 'Screenshot not found' })
      return
    }

    const screenshotData = screenshotDoc.data()
    const storagePath = screenshotData?.storagePath

    if (!storagePath) {
      res.status(500).json({ error: 'Screenshot has no storage path' })
      return
    }

    // Fetch original image from Firebase Storage
    const storage = getStorage()
    const bucket = storage.bucket()
    const file = bucket.file(storagePath)

    // Check if file exists
    const [exists] = await file.exists()
    if (!exists) {
      logger.error('Screenshot file missing from storage', {
        screenshotId,
        storagePath,
      })
      res.status(404).json({ error: 'Screenshot file not found' })
      return
    }

    let originalBuffer: Buffer
    try {
      const [fileContent] = await file.download()
      originalBuffer = fileContent
    } catch (error) {
      logger.error('Failed to download screenshot', {
        screenshotId,
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to retrieve screenshot' })
      return
    }

    // Create watermark payload
    const viewTimestamp = Date.now()
    const watermarkPayload: WatermarkPayload = {
      viewerId,
      viewTimestamp,
      screenshotId,
    }

    // Apply watermark
    let watermarkedBuffer: Buffer
    try {
      watermarkedBuffer = await embedWatermark(originalBuffer, watermarkPayload)
    } catch (error) {
      logger.error('Failed to apply watermark', {
        screenshotId,
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      // SECURITY: Do NOT serve unwatermarked original on error
      res.status(500).json({ error: 'Failed to process screenshot' })
      return
    }

    // Log view event for audit (AC6)
    // Extract request metadata for security audit
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown'
    const userAgent = req.headers['user-agent'] || 'unknown'

    try {
      const viewRef = childRef.collection('screenshotViews').doc()
      await viewRef.set({
        viewId: viewRef.id,
        viewerId,
        viewerEmail,
        screenshotId,
        childId,
        timestamp: viewTimestamp,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : ipAddress[0],
        userAgent,
        watermarkGenerated: true,
      })
    } catch (error) {
      // Log failure but don't block serving (audit is secondary)
      logger.error('Failed to log view audit', {
        screenshotId,
        viewerId,
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
    }

    // Log successful view (without PII)
    logger.info('Screenshot viewed with watermark', {
      screenshotId,
      childId,
      viewerId,
      viewTimestamp,
    })

    // Serve watermarked image
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': watermarkedBuffer.length.toString(),
      // Prevent caching to ensure fresh watermarks
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    })

    res.status(200).send(watermarkedBuffer)
  }
)
