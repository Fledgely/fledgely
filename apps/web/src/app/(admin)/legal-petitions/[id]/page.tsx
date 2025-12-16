'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getLegalPetition,
  updatePetitionStatus,
  assignPetition,
  addPetitionNote,
  updatePetitionSupportMessage,
  addCourtOrderedParent,
  LegalPetitionDetail,
} from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Legal Petition Detail Page
 *
 * Story 3.6: Legal Parent Petition for Access - Task 10
 *
 * CRITICAL: This page allows safety-team to review and process petitions.
 * All data access and updates are verified server-side.
 *
 * Security: Only accessible to users with isSafetyTeam or isAdmin claims
 */
export default function LegalPetitionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const petitionId = params.id as string

  const [petition, setPetition] = useState<LegalPetitionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Form states
  const [newNote, setNewNote] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [targetFamilyId, setTargetFamilyId] = useState('')
  const [newParentUserId, setNewParentUserId] = useState('')

  const fetchPetition = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getLegalPetition(petitionId)
      setPetition(data)
      setSupportMessage(data.supportMessageToUser || '')
      setTargetFamilyId(data.targetFamilyId || '')
    } catch (err) {
      console.error('Error fetching petition:', err)
      setError('Failed to load petition details. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [petitionId])

  useEffect(() => {
    if (petitionId) {
      fetchPetition()
    }
  }, [petitionId, fetchPetition])

  const formatDate = (timestamp: { _seconds: number }) => {
    return new Date(timestamp._seconds * 1000).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      'under-review': 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      'under-review': 'Under Review',
      verified: 'Verified',
      denied: 'Denied',
    }
    return labels[status] || status
  }

  const handleStatusUpdate = async (
    newStatus: 'pending' | 'under-review' | 'verified' | 'denied'
  ) => {
    if (!petition) return

    setUpdating(true)
    try {
      await updatePetitionStatus(petitionId, newStatus, targetFamilyId || undefined)
      await fetchPetition()
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setUpdating(true)
    try {
      await addPetitionNote(petitionId, newNote.trim())
      setNewNote('')
      await fetchPetition()
    } catch (err) {
      console.error('Error adding note:', err)
      setError('Failed to add note. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateSupportMessage = async () => {
    setUpdating(true)
    try {
      await updatePetitionSupportMessage(petitionId, supportMessage)
      await fetchPetition()
    } catch (err) {
      console.error('Error updating support message:', err)
      setError('Failed to update support message. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddCourtOrderedParent = async () => {
    if (!targetFamilyId.trim() || !newParentUserId.trim()) {
      setError('Family ID and Parent User ID are required')
      return
    }

    setUpdating(true)
    try {
      await addCourtOrderedParent(petitionId, targetFamilyId, newParentUserId)
      setNewParentUserId('')
      await fetchPetition()
    } catch (err) {
      console.error('Error adding court-ordered parent:', err)
      setError('Failed to add court-ordered parent. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">
          Loading petition details...
        </p>
      </div>
    )
  }

  if (error && !petition) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
        <Button onClick={fetchPetition} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  if (!petition) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Petition not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/legal-petitions')}
            className="mb-2"
          >
            &larr; Back to Petitions
          </Button>
          <h1 className="text-2xl font-semibold">
            Petition {petition.referenceNumber}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 rounded text-sm ${getStatusBadge(petition.status)}`}>
              {getStatusLabel(petition.status)}
            </span>
          </div>
        </div>
        <Button
          onClick={fetchPetition}
          variant="outline"
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Petition Details */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Petition Details</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Petitioner Name</p>
              <p className="font-medium">{petition.petitionerName}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Petitioner Email</p>
              <p className="font-medium">{petition.petitionerEmail}</p>
            </div>

            {petition.petitionerPhone && (
              <div>
                <p className="text-sm text-muted-foreground">Petitioner Phone</p>
                <p className="font-medium">{petition.petitionerPhone}</p>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Child Name</p>
              <p className="font-medium">{petition.childName}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Child Date of Birth</p>
              <p className="font-medium">{formatDate(petition.childDOB)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Claimed Relationship</p>
              <p className="font-medium">
                {petition.claimedRelationship === 'parent'
                  ? 'Biological/Adoptive Parent'
                  : 'Legal Guardian'}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Message</p>
              <p className="whitespace-pre-wrap text-sm">{petition.message}</p>
            </div>

            <div className="border-t pt-4 flex gap-4 text-xs text-muted-foreground">
              <span>Submitted: {formatDate(petition.submittedAt)}</span>
              <span>Updated: {formatDate(petition.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Documents</h2>

          {petition.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <ul className="space-y-2">
              {petition.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {doc.signedUrl && (
                    <a
                      href={doc.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Status Actions */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Status Actions</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="targetFamilyId">Target Family ID (for verification)</Label>
              <Input
                id="targetFamilyId"
                value={targetFamilyId}
                onChange={(e) => setTargetFamilyId(e.target.value)}
                placeholder="Family ID to verify against"
                className="mt-1"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleStatusUpdate('pending')}
                variant="outline"
                disabled={updating || petition.status === 'pending'}
              >
                Set Pending
              </Button>
              <Button
                onClick={() => handleStatusUpdate('under-review')}
                variant="outline"
                disabled={updating || petition.status === 'under-review'}
              >
                Set Under Review
              </Button>
              <Button
                onClick={() => handleStatusUpdate('verified')}
                className="bg-green-600 hover:bg-green-700"
                disabled={updating || petition.status === 'verified'}
              >
                Verify
              </Button>
              <Button
                onClick={() => handleStatusUpdate('denied')}
                variant="destructive"
                disabled={updating || petition.status === 'denied'}
              >
                Deny
              </Button>
            </div>
          </div>
        </div>

        {/* Add Court-Ordered Parent */}
        {petition.status === 'verified' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-medium mb-4">Add Court-Ordered Parent</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This will add the petitioner as a guardian with court-order protection
              (cannot be revoked by other guardians).
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="newParentUserId">Petitioner User ID</Label>
                <Input
                  id="newParentUserId"
                  value={newParentUserId}
                  onChange={(e) => setNewParentUserId(e.target.value)}
                  placeholder="Firebase UID of the petitioner"
                  className="mt-1"
                />
              </div>

              <Button
                onClick={handleAddCourtOrderedParent}
                disabled={updating || !targetFamilyId || !newParentUserId}
                className="bg-green-600 hover:bg-green-700"
              >
                Add to Family
              </Button>
            </div>
          </div>
        )}

        {/* Support Message */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Support Message</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This message will be visible to the petitioner when they check status.
          </p>

          <Textarea
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
            placeholder="Enter a message for the petitioner..."
            className="min-h-[100px]"
          />

          <Button
            onClick={handleUpdateSupportMessage}
            disabled={updating}
            className="mt-4"
          >
            Update Message
          </Button>
        </div>

        {/* Internal Notes */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Internal Notes</h2>

          {petition.internalNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">No notes yet.</p>
          ) : (
            <ul className="space-y-3 mb-4">
              {petition.internalNotes.map((note, index) => (
                <li key={index} className="p-3 rounded bg-gray-50">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.addedBy.slice(0, 8)}... - {formatDate(note.addedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an internal note..."
            className="min-h-[80px]"
          />

          <Button
            onClick={handleAddNote}
            disabled={updating || !newNote.trim()}
            className="mt-4"
          >
            Add Note
          </Button>
        </div>

        {/* Status History */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Status History</h2>

          {petition.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <ul className="space-y-3">
              {petition.statusHistory.map((entry, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge(entry.status)}`}>
                    {getStatusLabel(entry.status)}
                  </span>
                  <div className="flex-1">
                    {entry.note && (
                      <p className="text-sm text-muted-foreground">{entry.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.updatedBy.slice(0, 8)}... - {formatDate(entry.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
