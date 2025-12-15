'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getSafetyRequest,
  updateRequestStatus,
  assignRequest,
  updateVerification,
  addNote,
  updateEscalation,
  SafetyRequestDetail,
  VerificationChecklist,
} from '@/lib/admin-api'
import { useAdminAuth } from '@/lib/admin-auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/**
 * Safety Request Detail Page
 *
 * CRITICAL: This page displays full safety request details including documents.
 * Document access is via time-limited signed URLs (15 min).
 * All actions are logged to adminAuditLog.
 *
 * Security: Only accessible to users with isSafetyTeam or isAdmin claims
 */
export default function SafetyRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAdminAuth()
  const requestId = params.id as string

  const [request, setRequest] = useState<SafetyRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Note form state
  const [noteContent, setNoteContent] = useState('')
  const [escalationReason, setEscalationReason] = useState('')

  const fetchRequest = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getSafetyRequest(requestId)
      setRequest(data)
    } catch (err) {
      console.error('Error fetching request:', err)
      setError('Failed to load safety request. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    fetchRequest()
  }, [fetchRequest])

  const handleStatusChange = async (
    status: 'pending' | 'in-progress' | 'resolved'
  ) => {
    setActionLoading('status')
    try {
      await updateRequestStatus(requestId, status)
      await fetchRequest()
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssignToMe = async () => {
    if (!user?.uid) return
    setActionLoading('assign')
    try {
      await assignRequest(requestId, user.uid)
      await fetchRequest()
    } catch (err) {
      console.error('Error assigning request:', err)
      setError('Failed to assign request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnassign = async () => {
    setActionLoading('assign')
    try {
      await assignRequest(requestId, null)
      await fetchRequest()
    } catch (err) {
      console.error('Error unassigning request:', err)
      setError('Failed to unassign request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerificationChange = async (
    field: keyof VerificationChecklist,
    value: boolean
  ) => {
    setActionLoading(`verification-${field}`)
    try {
      await updateVerification(requestId, { [field]: value })
      await fetchRequest()
    } catch (err) {
      console.error('Error updating verification:', err)
      setError('Failed to update verification')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    setActionLoading('note')
    try {
      await addNote(requestId, noteContent.trim())
      setNoteContent('')
      await fetchRequest()
    } catch (err) {
      console.error('Error adding note:', err)
      setError('Failed to add note')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEscalationToggle = async () => {
    setActionLoading('escalation')
    try {
      const newEscalated = !request?.escalation.isEscalated
      await updateEscalation(
        requestId,
        newEscalated,
        newEscalated ? escalationReason : undefined
      )
      setEscalationReason('')
      await fetchRequest()
    } catch (err) {
      console.error('Error updating escalation:', err)
      setError('Failed to update escalation')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (timestamp: { _seconds: number }) => {
    return new Date(timestamp._seconds * 1000).toLocaleString()
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading request details...
          </p>
        </div>
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchRequest} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  if (!request) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/safety-requests')}
            className="text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            ← Back to Queue
          </button>
          <h1 className="text-2xl font-semibold">Safety Request</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {request.id}
          </p>
        </div>
        <Button onClick={fetchRequest} variant="outline" disabled={loading}>
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Message</h2>
            <p className="whitespace-pre-wrap text-gray-900">{request.message}</p>
            <div className="mt-4 text-sm text-muted-foreground">
              Submitted: {formatDate(request.submittedAt)}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Safe Contact Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Safe Email:
                </span>
                <p className="text-gray-900">
                  {request.safeEmail || '(Not provided)'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Safe Phone:
                </span>
                <p className="text-gray-900">
                  {request.safePhone || '(Not provided)'}
                </p>
              </div>
            </div>
          </div>

          {/* Documents */}
          {request.documents.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold mb-4">
                Documents ({request.documents.length})
              </h2>
              <div className="space-y-3">
                {request.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileType} • {formatBytes(doc.sizeBytes)}
                      </p>
                    </div>
                    {doc.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Document
                      </a>
                    ) : (
                      <span className="text-sm text-red-600">
                        {doc.urlError || 'URL unavailable'}
                      </span>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  Document links expire after 15 minutes. Refresh to get new
                  links.
                </p>
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Internal Notes</h2>

            {/* Note List */}
            {request.adminNotes.length > 0 ? (
              <div className="space-y-4 mb-6">
                {request.adminNotes.map((note) => (
                  <div key={note.id} className="border-l-2 pl-4 py-2">
                    <p className="text-sm text-gray-900">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(note.addedAt)} by {note.addedBy.slice(0, 8)}...
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6">
                No notes yet.
              </p>
            )}

            {/* Add Note Form */}
            <div className="border-t pt-4">
              <Textarea
                placeholder="Add an internal note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddNote}
                disabled={!noteContent.trim() || actionLoading === 'note'}
                className="mt-2"
              >
                {actionLoading === 'note' ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Status & Actions</h2>

            {/* Current Status */}
            <div className="mb-4">
              <span className="text-sm font-medium text-muted-foreground">
                Current Status:
              </span>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-1 rounded text-sm ${
                    request.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : request.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {request.status}
                </span>
              </div>
            </div>

            {/* Status Actions */}
            <div className="space-y-2 mb-6">
              <Button
                onClick={() => handleStatusChange('in-progress')}
                disabled={
                  request.status === 'in-progress' ||
                  actionLoading === 'status'
                }
                variant="outline"
                className="w-full"
              >
                Mark In Progress
              </Button>
              <Button
                onClick={() => handleStatusChange('resolved')}
                disabled={
                  request.status === 'resolved' || actionLoading === 'status'
                }
                variant="outline"
                className="w-full"
              >
                Mark Resolved
              </Button>
            </div>

            {/* Assignment */}
            <div className="border-t pt-4">
              <span className="text-sm font-medium text-muted-foreground">
                Assigned To:
              </span>
              <p className="text-sm mt-1">
                {request.assignedTo
                  ? `${request.assignedTo.slice(0, 8)}...`
                  : 'Unassigned'}
              </p>
              <div className="mt-2 space-y-2">
                {!request.assignedTo || request.assignedTo !== user?.uid ? (
                  <Button
                    onClick={handleAssignToMe}
                    disabled={actionLoading === 'assign'}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Assign to Me
                  </Button>
                ) : null}
                {request.assignedTo && (
                  <Button
                    onClick={handleUnassign}
                    disabled={actionLoading === 'assign'}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Unassign
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Verification Checklist</h2>
            <div className="space-y-3">
              {Object.entries(request.verificationChecklist).map(
                ([key, value]) => {
                  const labels: Record<string, string> = {
                    phoneVerified: 'Phone Verified',
                    idMatched: 'ID Matched',
                    accountOwnershipVerified: 'Account Ownership Verified',
                    safeContactConfirmed: 'Safe Contact Confirmed',
                  }
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          handleVerificationChange(
                            key as keyof VerificationChecklist,
                            e.target.checked
                          )
                        }
                        disabled={actionLoading === `verification-${key}`}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{labels[key] || key}</span>
                    </label>
                  )
                }
              )}
            </div>
          </div>

          {/* Escalation */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Escalation</h2>
            <div
              className={`p-3 rounded mb-4 ${
                request.escalation.isEscalated
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-gray-50'
              }`}
            >
              <p className="text-sm font-medium">
                {request.escalation.isEscalated ? 'ESCALATED' : 'Not escalated'}
              </p>
              {request.escalation.isEscalated && request.escalation.reason && (
                <p className="text-sm text-muted-foreground mt-1">
                  {request.escalation.reason}
                </p>
              )}
            </div>

            {!request.escalation.isEscalated && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Escalation reason (optional)"
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  rows={2}
                />
                <Button
                  onClick={handleEscalationToggle}
                  disabled={actionLoading === 'escalation'}
                  variant="destructive"
                  className="w-full"
                >
                  Escalate Request
                </Button>
              </div>
            )}

            {request.escalation.isEscalated && (
              <Button
                onClick={handleEscalationToggle}
                disabled={actionLoading === 'escalation'}
                variant="outline"
                className="w-full"
              >
                Remove Escalation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
