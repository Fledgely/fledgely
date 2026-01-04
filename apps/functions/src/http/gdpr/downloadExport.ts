/**
 * Data Export Download Endpoint
 *
 * Story 51.1: Data Export Request - AC5, AC6
 *
 * HTTP endpoint for downloading data exports:
 * - Verifies user authentication via Firebase ID token
 * - Verifies export belongs to user's family
 * - Verifies export is completed and not expired
 * - Generates fresh signed URL for download
 *
 * This endpoint is used when:
 * - Original download URL has expired but export is still valid
 * - User needs a fresh download link
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { DataExportStatus, DATA_EXPORT_CONFIG } from '@fledgely/shared'
import { getExportRequest, generateExportDownloadUrl } from '../../services/gdpr'

/**
 * Download export endpoint
 *
 * GET /gdpr/export/{exportId}/download
 *
 * Headers:
 * - Authorization: Bearer {idToken} - Firebase ID token
 *
 * Response:
 * - 200: { downloadUrl, expiresAt }
 * - 401: Unauthorized
 * - 403: Not authorized to access this export
 * - 404: Export not found
 * - 410: Export expired
 */
export const downloadExport = onRequest(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Only allow GET
    if (req.method !== 'GET') {
      res.status(405).json({
        error: { code: 'method-not-allowed', message: 'Method not allowed' },
      })
      return
    }

    // Extract exportId from URL path
    // Expected: /gdpr/export/{exportId}/download
    const pathParts = req.path.split('/')
    const exportIdIndex = pathParts.indexOf('export') + 1
    const exportId = pathParts[exportIdIndex]

    if (!exportId) {
      res.status(400).json({
        error: { code: 'invalid-argument', message: 'Export ID is required' },
      })
      return
    }

    // Verify authentication
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'unauthenticated', message: 'Authentication required' },
      })
      return
    }

    const idToken = authHeader.split('Bearer ')[1]

    try {
      // Verify ID token
      const auth = getAuth()
      const decodedToken = await auth.verifyIdToken(idToken)
      const userUid = decodedToken.uid

      // Get export request
      const exportRequest = await getExportRequest(exportId)

      if (!exportRequest) {
        res.status(404).json({
          error: { code: 'not-found', message: 'Export not found' },
        })
        return
      }

      // Verify user is a guardian of the family
      const db = getFirestore()
      const familyDoc = await db.collection('families').doc(exportRequest.familyId).get()

      if (!familyDoc.exists) {
        res.status(404).json({
          error: { code: 'not-found', message: 'Family not found' },
        })
        return
      }

      const familyData = familyDoc.data()
      const guardians = familyData?.guardians || []
      const isGuardian = guardians.some((g: { uid: string }) => g.uid === userUid)

      if (!isGuardian) {
        res.status(403).json({
          error: { code: 'permission-denied', message: 'Not authorized to access this export' },
        })
        return
      }

      // Check export status
      if (exportRequest.status !== DataExportStatus.COMPLETED) {
        if (
          exportRequest.status === DataExportStatus.PENDING ||
          exportRequest.status === DataExportStatus.PROCESSING
        ) {
          res.status(202).json({
            message: 'Export is still being processed',
            status: exportRequest.status,
            exportId: exportRequest.exportId,
          })
          return
        }

        if (exportRequest.status === DataExportStatus.FAILED) {
          res.status(410).json({
            error: {
              code: 'export-failed',
              message: exportRequest.errorMessage || 'Export generation failed',
            },
          })
          return
        }

        if (exportRequest.status === DataExportStatus.EXPIRED) {
          res.status(410).json({
            error: {
              code: 'export-expired',
              message: 'Export has expired. Please request a new export.',
            },
          })
          return
        }
      }

      // Check if expired
      if (exportRequest.expiresAt && exportRequest.expiresAt < Date.now()) {
        res.status(410).json({
          error: {
            code: 'export-expired',
            message: 'Export download link has expired. Please request a new export.',
          },
        })
        return
      }

      // Generate fresh signed URL
      const storagePath = `${DATA_EXPORT_CONFIG.STORAGE_PATH_PREFIX}/${exportRequest.familyId}/${exportRequest.exportId}.zip`
      const expiresAt = exportRequest.expiresAt || Date.now() + DATA_EXPORT_CONFIG.LINK_EXPIRY_MS

      const downloadUrl = await generateExportDownloadUrl(storagePath, expiresAt)

      logger.info('Export download URL generated', {
        exportId,
        familyId: exportRequest.familyId,
        requestedBy: userUid,
      })

      res.status(200).json({
        downloadUrl,
        expiresAt,
        fileSize: exportRequest.fileSize,
        exportId: exportRequest.exportId,
      })
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/id-token-expired') {
        res.status(401).json({
          error: { code: 'token-expired', message: 'Authentication token expired' },
        })
        return
      }

      if ((error as { code?: string }).code === 'auth/argument-error') {
        res.status(401).json({
          error: { code: 'invalid-token', message: 'Invalid authentication token' },
        })
        return
      }

      logger.error('Failed to generate download URL', {
        exportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        error: { code: 'internal', message: 'Failed to generate download URL' },
      })
    }
  }
)
