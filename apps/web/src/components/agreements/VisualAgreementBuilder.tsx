/**
 * Visual Agreement Builder Component.
 *
 * Story 5.2: Visual Agreement Builder - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * Main component for building agreements using visual cards.
 * Features:
 * - Visual cards for each term (AC1)
 * - Drag-and-drop reordering (AC2)
 * - Child-friendly explanations (AC3)
 * - Party attribution (AC4)
 * - Category color coding (AC5)
 * - 100 term limit validation (AC6, NFR60)
 */

'use client'

import { useState, useCallback } from 'react'
import type {
  AgreementTerm,
  ContributionParty,
  CoCreationSession,
  TermCategory,
} from '@fledgely/shared/contracts'
import { MAX_AGREEMENT_TERMS } from '@fledgely/shared/contracts'
import { DroppableTermList } from './DroppableTermList'
import { AddTermModal } from './AddTermModal'

interface VisualAgreementBuilderProps {
  /** Current session */
  session: CoCreationSession
  /** Current terms */
  terms: AgreementTerm[]
  /** Called when terms are updated */
  onTermsChange: (terms: AgreementTerm[]) => void
  /** Called when a contribution is made */
  onContribution?: (party: ContributionParty, type: string, content: unknown) => void
  /** Child name for display */
  childName: string
}

/**
 * Generate a unique ID.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function VisualAgreementBuilder({
  session: _session,
  terms,
  onTermsChange,
  onContribution,
  childName,
}: VisualAgreementBuilderProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<AgreementTerm | undefined>()
  const [activeParty, setActiveParty] = useState<ContributionParty>('parent')
  const [selectedTermId, setSelectedTermId] = useState<string | undefined>()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | undefined>()

  const termCount = terms.length
  const isAtLimit = termCount >= MAX_AGREEMENT_TERMS
  const isNearLimit = termCount >= MAX_AGREEMENT_TERMS - 10

  /**
   * Handle opening the add modal.
   */
  const handleOpenAddModal = useCallback((party: ContributionParty) => {
    setActiveParty(party)
    setEditingTerm(undefined)
    setIsAddModalOpen(true)
  }, [])

  /**
   * Handle editing a term.
   */
  const handleEditTerm = useCallback(
    (termId: string) => {
      const term = terms.find((t) => t.id === termId)
      if (term) {
        setEditingTerm(term)
        setActiveParty(term.party)
        setIsAddModalOpen(true)
      }
    },
    [terms]
  )

  /**
   * Handle saving a term (add or edit).
   */
  const handleSaveTerm = useCallback(
    (termData: Omit<AgreementTerm, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date()

      if (editingTerm) {
        // Editing existing term
        const updatedTerms = terms.map((t) =>
          t.id === editingTerm.id
            ? {
                ...t,
                ...termData,
                updatedAt: now,
              }
            : t
        )
        onTermsChange(updatedTerms)
        onContribution?.(termData.party, 'modify_term', {
          termId: editingTerm.id,
          changes: termData,
        })
      } else {
        // Adding new term
        if (isAtLimit) return

        const newTerm: AgreementTerm = {
          id: generateId(),
          ...termData,
          order: terms.length,
          createdAt: now,
          updatedAt: now,
        }
        onTermsChange([...terms, newTerm])
        onContribution?.(termData.party, 'add_term', newTerm)
      }

      setEditingTerm(undefined)
    },
    [editingTerm, terms, onTermsChange, onContribution, isAtLimit]
  )

  /**
   * Handle deleting a term.
   */
  const handleDeleteTerm = useCallback(
    (termId: string) => {
      const term = terms.find((t) => t.id === termId)
      if (term) {
        const updatedTerms = terms
          .filter((t) => t.id !== termId)
          .map((t, index) => ({ ...t, order: index }))
        onTermsChange(updatedTerms)
        onContribution?.(term.party, 'remove_term', { termId })
        setDeleteConfirmId(undefined)
        setSelectedTermId(undefined)
      }
    },
    [terms, onTermsChange, onContribution]
  )

  /**
   * Handle reordering terms.
   */
  const handleReorder = useCallback(
    (reorderedTerms: AgreementTerm[]) => {
      onTermsChange(reorderedTerms)
    },
    [onTermsChange]
  )

  /**
   * Count terms by category.
   */
  const categoryCounts = terms.reduce(
    (acc, term) => {
      acc[term.category] = (acc[term.category] || 0) + 1
      return acc
    },
    {} as Record<TermCategory, number>
  )

  return (
    <div className="space-y-6" data-testid="visual-agreement-builder">
      {/* Header with term count */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Agreement Rules</h2>
          <p className="text-sm text-gray-500">
            Build your family agreement together with {childName}
          </p>
        </div>
        <div
          className={`text-sm font-medium ${
            isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'
          }`}
          data-testid="term-count"
        >
          {termCount} / {MAX_AGREEMENT_TERMS} rules
        </div>
      </div>

      {/* Limit warning */}
      {isAtLimit && (
        <div
          className="p-4 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
          data-testid="limit-warning"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-700 font-medium">
              You&apos;ve reached the maximum of {MAX_AGREEMENT_TERMS} rules. Remove a rule to add
              more.
            </p>
          </div>
        </div>
      )}

      {/* Category summary */}
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="category-summary">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <span
              key={category}
              className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600"
            >
              {category}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Add term buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => handleOpenAddModal('parent')}
          disabled={isAtLimit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          data-testid="add-parent-term"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Parent Adds a Rule
        </button>
        <button
          type="button"
          onClick={() => handleOpenAddModal('child')}
          disabled={isAtLimit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pink-100 text-pink-700 font-medium rounded-lg hover:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          data-testid="add-child-term"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {childName} Adds a Rule
        </button>
      </div>

      {/* Term list with drag-and-drop */}
      <DroppableTermList
        terms={terms}
        onReorder={handleReorder}
        selectedTermId={selectedTermId}
        onSelectTerm={setSelectedTermId}
        onEditTerm={handleEditTerm}
        onDeleteTerm={(termId) => setDeleteConfirmId(termId)}
        emptyMessage={`No rules added yet. Work with ${childName} to add your first rule!`}
      />

      {/* Add/Edit Term Modal */}
      <AddTermModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingTerm(undefined)
        }}
        onSave={handleSaveTerm}
        party={activeParty}
        editingTerm={editingTerm}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          data-testid="delete-confirm-overlay"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
            role="alertdialog"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <h3 id="delete-title" className="text-lg font-semibold text-gray-900 mb-2">
              Remove this rule?
            </h3>
            <p id="delete-description" className="text-gray-600 mb-4">
              This will remove the rule from your agreement. You can always add it back later.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleDeleteTerm(deleteConfirmId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[44px]"
                data-testid="confirm-delete"
              >
                Yes, Remove
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(undefined)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                data-testid="cancel-delete"
              >
                Keep It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VisualAgreementBuilder
