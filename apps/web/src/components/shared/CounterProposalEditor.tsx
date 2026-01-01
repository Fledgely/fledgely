/**
 * CounterProposalEditor Component - Story 34.3 (AC3)
 *
 * Editor for creating counter-proposals with value editing.
 * Pre-populates with proposed values and shows original for reference.
 */

import { useState, useMemo } from 'react'
import type { ProposalChange } from '@fledgely/shared'

interface EditableChange extends ProposalChange {
  isRemoved: boolean
  editedValue: string
}

interface CounterProposalEditorProps {
  originalChanges: ProposalChange[]
  onSubmit: (changes: ProposalChange[]) => void
  onCancel: () => void
  isSubmitting: boolean
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'None'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return String(value)
}

/**
 * Get badge styling for change type
 */
function getChangeTypeBadge(changeType: ProposalChange['changeType']): {
  bg: string
  color: string
  label: string
} {
  switch (changeType) {
    case 'add':
      return { bg: '#dcfce7', color: '#16a34a', label: 'Add' }
    case 'modify':
      return { bg: '#dbeafe', color: '#2563eb', label: 'Modify' }
    case 'remove':
      return { bg: '#fee2e2', color: '#dc2626', label: 'Remove' }
    default:
      return { bg: '#f3f4f6', color: '#6b7280', label: changeType }
  }
}

export function CounterProposalEditor({
  originalChanges,
  onSubmit,
  onCancel,
  isSubmitting,
}: CounterProposalEditorProps) {
  // Initialize editable changes with values from original
  const [editableChanges, setEditableChanges] = useState<EditableChange[]>(() =>
    originalChanges.map((change) => ({
      ...change,
      isRemoved: false,
      editedValue: formatValue(change.newValue),
    }))
  )

  // Count removed changes
  const removedCount = useMemo(
    () => editableChanges.filter((c) => c.isRemoved).length,
    [editableChanges]
  )

  // Count active changes
  const activeChanges = useMemo(
    () => editableChanges.filter((c) => !c.isRemoved),
    [editableChanges]
  )

  // Check if a change has been modified from its original proposed value
  const isChanged = (change: EditableChange): boolean => {
    return change.editedValue !== formatValue(change.newValue)
  }

  const handleValueChange = (index: number, value: string) => {
    setEditableChanges((prev) =>
      prev.map((change, i) => (i === index ? { ...change, editedValue: value } : change))
    )
  }

  const handleRemove = (index: number) => {
    setEditableChanges((prev) =>
      prev.map((change, i) => (i === index ? { ...change, isRemoved: true } : change))
    )
  }

  const handleSubmit = () => {
    // Convert back to ProposalChange format with edited values
    const submittedChanges: ProposalChange[] = editableChanges
      .filter((change) => !change.isRemoved)
      .map((change) => ({
        sectionId: change.sectionId,
        sectionName: change.sectionName,
        fieldPath: change.fieldPath,
        oldValue: change.oldValue,
        newValue: parseEditedValue(change.editedValue, change.newValue),
        changeType: change.changeType,
      }))

    onSubmit(submittedChanges)
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Header */}
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#1e293b',
          margin: 0,
          marginBottom: 8,
        }}
      >
        Create Counter-Proposal
      </h3>
      <p
        style={{
          color: '#64748b',
          fontSize: 14,
          margin: 0,
          marginBottom: 24,
        }}
      >
        Edit the proposed values below to create your counter-proposal.
      </p>

      {/* Removed count message */}
      {removedCount > 0 && (
        <div
          style={{
            background: '#fef3c7',
            color: '#b45309',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {removedCount} change{removedCount > 1 ? 's' : ''} removed from counter-proposal
        </div>
      )}

      {/* Changes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {editableChanges.map((change, index) => {
          if (change.isRemoved) return null

          const badge = getChangeTypeBadge(change.changeType)
          const hasChanged = isChanged(change)
          const canRemove = activeChanges.length > 1

          return (
            <div
              key={`${change.sectionId}-${change.fieldPath}`}
              data-changed={hasChanged ? 'true' : 'false'}
              style={{
                background: hasChanged ? '#eff6ff' : '#f8fafc',
                border: hasChanged ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
              }}
            >
              {/* Section Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{change.sectionName}</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={!canRemove || isSubmitting}
                  aria-label="Remove change"
                  style={{
                    padding: '4px 12px',
                    fontSize: 12,
                    background: 'transparent',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    color: canRemove ? '#dc2626' : '#cbd5e1',
                    cursor: canRemove && !isSubmitting ? 'pointer' : 'not-allowed',
                    opacity: canRemove ? 1 : 0.5,
                  }}
                >
                  Remove
                </button>
              </div>

              {/* Field Path */}
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  marginBottom: 12,
                }}
              >
                {change.fieldPath}
              </div>

              {/* Values Display */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                }}
              >
                {/* Original Value */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Original: {formatValue(change.oldValue)}
                  </label>
                  <div
                    style={{
                      padding: 8,
                      background: '#fff',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      fontSize: 14,
                      color: '#64748b',
                    }}
                  >
                    {formatValue(change.oldValue)}
                  </div>
                </div>

                {/* Proposed Value */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Proposed: {formatValue(change.newValue)}
                  </label>
                  <div
                    style={{
                      padding: 8,
                      background: '#dbeafe',
                      borderRadius: 6,
                      border: '1px solid #93c5fd',
                      fontSize: 14,
                      color: '#1e40af',
                    }}
                  >
                    {formatValue(change.newValue)}
                  </div>
                </div>

                {/* Counter Value (Editable) */}
                <div>
                  <label
                    htmlFor={`counter-value-${index}`}
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: hasChanged ? '#2563eb' : '#64748b',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Your Counter
                  </label>
                  <input
                    id={`counter-value-${index}`}
                    type="text"
                    value={change.editedValue}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    disabled={isSubmitting}
                    aria-label={`Counter value for ${change.sectionName}`}
                    style={{
                      width: '100%',
                      padding: 8,
                      background: hasChanged ? '#fff' : '#f8fafc',
                      borderRadius: 6,
                      border: hasChanged ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      fontSize: 14,
                      color: '#1e293b',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          marginTop: 24,
          paddingTop: 24,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Cancel counter-proposal"
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            color: '#64748b',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          aria-label="Submit counter-proposal"
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            background: '#2563eb',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Counter-Proposal'}
        </button>
      </div>
    </div>
  )
}

/**
 * Parse edited value back to original type
 */
function parseEditedValue(editedValue: string, originalValue: unknown): unknown {
  // Try to match original type
  if (typeof originalValue === 'number') {
    const parsed = parseFloat(editedValue)
    return isNaN(parsed) ? editedValue : parsed
  }
  if (typeof originalValue === 'boolean') {
    return editedValue.toLowerCase() === 'yes' || editedValue.toLowerCase() === 'true'
  }
  return editedValue
}
