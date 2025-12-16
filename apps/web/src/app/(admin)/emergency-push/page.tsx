'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  emergencyAllowlistPush,
  getEmergencyPushHistory,
  EmergencyPushHistoryItem,
} from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import type { CrisisUrlEntry, CrisisResourceCategory, ContactMethod } from '@fledgely/shared'
import { EMERGENCY_PUSH_STATUS_LABELS, EMERGENCY_PUSH_STATUS_DESCRIPTIONS } from '@fledgely/contracts'

/**
 * Emergency Allowlist Push Page
 *
 * CRITICAL: This page enables operations to push crisis resource updates
 * within 1 hour without requiring code deployment.
 *
 * Story 7.4: Emergency Allowlist Push - Task 4
 * AC #7: Push success is verified via monitoring dashboard
 *
 * Security: Only accessible to users with isAdmin claim
 */
export default function EmergencyPushPage() {
  const [history, setHistory] = useState<EmergencyPushHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Entry form fields
  const [domain, setDomain] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CrisisResourceCategory>('crisis')
  const [region, setRegion] = useState<string>('us')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [reason, setReason] = useState('')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const pushes = await getEmergencyPushHistory()
      setHistory(pushes)
    } catch (err) {
      console.error('Error fetching push history:', err)
      setError('Failed to load push history. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const resetForm = () => {
    setDomain('')
    setName('')
    setDescription('')
    setCategory('crisis')
    setRegion('us')
    setPhoneNumber('')
    setReason('')
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setSuccessMessage(null)

    // Validate required fields
    if (!domain.trim()) {
      setFormError('Domain is required')
      setSubmitting(false)
      return
    }

    if (!name.trim()) {
      setFormError('Name is required')
      setSubmitting(false)
      return
    }

    if (reason.trim().length < 10) {
      setFormError('Reason must be at least 10 characters')
      setSubmitting(false)
      return
    }

    try {
      // Build the crisis entry
      const contactMethods: ContactMethod[] = phoneNumber.trim()
        ? ['phone', 'web']
        : ['web']

      const entry: CrisisUrlEntry = {
        id: crypto.randomUUID(),
        domain: domain.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim() || `Crisis resource: ${name.trim()}`,
        category,
        region,
        aliases: [],
        wildcardPatterns: [],
        contactMethods,
        ...(phoneNumber.trim() && { phoneNumber: phoneNumber.trim() }),
      }

      const result = await emergencyAllowlistPush([entry], reason.trim())

      if (result.success) {
        setSuccessMessage(
          `Emergency push successful! ${result.entriesAdded} entry added. ` +
          `Expected propagation: ~${result.estimatedPropagationMinutes} minutes.`
        )
        resetForm()
        setShowForm(false)
        fetchHistory()
      } else {
        setFormError('Push failed. Please try again.')
      }
    } catch (err) {
      console.error('Error pushing allowlist entry:', err)
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to push entry. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      propagated: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Emergency Allowlist Push</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Push crisis resource updates without code deployment (FR7A)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchHistory()}
            variant="outline"
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'outline' : 'default'}
          >
            {showForm ? 'Cancel' : 'New Push'}
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          {successMessage}
        </div>
      )}

      {/* Push Form */}
      {showForm && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Add Crisis Resource</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form Error */}
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Domain */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g., crisis-helpline.org"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., National Crisis Helpline"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CrisisResourceCategory)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="crisis">General Crisis</option>
                  <option value="suicide">Suicide Prevention</option>
                  <option value="domestic_violence">Domestic Violence</option>
                  <option value="child_abuse">Child Abuse</option>
                  <option value="mental_health">Mental Health</option>
                  <option value="substance_abuse">Substance Abuse</option>
                  <option value="eating_disorder">Eating Disorder</option>
                  <option value="lgbtq">LGBTQ+ Support</option>
                  <option value="abuse">General Abuse</option>
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="block text-sm font-medium mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="us">United States</option>
                  <option value="uk">United Kingdom</option>
                  <option value="ca">Canada</option>
                  <option value="au">Australia</option>
                  <option value="global">Global</option>
                </select>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone Number (optional)
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., 1-800-273-8255"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the crisis resource"
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {/* Reason (Audit Trail) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Reason for Push <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detailed reason for this emergency push (minimum 10 characters, required for audit trail)"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
                minLength={10}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This reason will be recorded in the audit trail.
              </p>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Pushing...' : 'Push Entry'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Push History */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium">Push History</h2>
          <p className="text-sm text-muted-foreground">
            Recent emergency allowlist pushes and their status
          </p>
        </div>

        {loading && history.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading history...
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No emergency pushes have been made yet.
          </div>
        ) : (
          <div className="divide-y">
            {history.map((push) => (
              <div key={push.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(
                          push.status
                        )}`}
                        title={EMERGENCY_PUSH_STATUS_DESCRIPTIONS[push.status]}
                      >
                        {EMERGENCY_PUSH_STATUS_LABELS[push.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {push.entriesCount} {push.entriesCount === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-900">
                      {push.reason}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Pushed: {formatDate(push.timestamp)}</span>
                      <span>By: {push.operator}</span>
                      {push.verifiedAt && (
                        <span className="text-green-600">
                          Verified: {formatDate(push.verifiedAt)}
                        </span>
                      )}
                    </div>
                    {push.failureReason && (
                      <p className="mt-2 text-sm text-red-600">
                        Failure: {push.failureReason}
                      </p>
                    )}
                    {/* Show entries */}
                    <div className="mt-2 space-y-1">
                      {push.entries.map((entry, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-gray-50 rounded px-2 py-1"
                        >
                          <span className="font-medium">{entry.domain}</span>
                          {' - '}
                          <span>{entry.name}</span>
                          {' '}
                          <span className="text-muted-foreground">
                            ({entry.category})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
