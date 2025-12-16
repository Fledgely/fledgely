'use client'

import { useState, useCallback, useEffect, useId } from 'react'
import type { SessionTermType, SessionTerm, SessionContributor } from '@fledgely/contracts'
import {
  getTermTypeLabel,
  getTermExplanation,
  getTermCategoryColors,
  getTermCategoryIcon,
} from './termUtils'

/**
 * Form data for term creation/editing
 */
export interface TermFormData {
  type: SessionTermType
  content: Record<string, unknown>
}

/**
 * Props for the AddTermModal component
 */
export interface AddTermModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Callback when a term is saved */
  onSave: (data: TermFormData) => void
  /** Initial term type (for category-specific add) */
  initialType?: SessionTermType
  /** Existing term to edit (if editing) */
  editingTerm?: SessionTerm
  /** Who is adding/editing this term */
  contributor: SessionContributor
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Term type selection option
 */
interface TermTypeOption {
  type: SessionTermType
  label: string
  explanation: string
  icon: string
}

/**
 * Get all term type options
 */
function getTermTypeOptions(): TermTypeOption[] {
  const types: SessionTermType[] = [
    'screen_time',
    'bedtime',
    'monitoring',
    'rule',
    'consequence',
    'reward',
  ]

  return types.map((type) => ({
    type,
    label: getTermTypeLabel(type),
    explanation: getTermExplanation(type),
    icon: getTermCategoryIcon(type),
  }))
}

/**
 * AddTermModal Component
 *
 * Story 5.2: Visual Agreement Builder - Task 7
 *
 * Modal for adding new terms or editing existing terms in the agreement.
 * Features:
 * - Term type selection with visual cards
 * - Type-specific content forms
 * - Form validation
 * - Child-friendly explanations (NFR65)
 * - Keyboard accessible (NFR43)
 * - 44x44px touch targets (NFR49)
 *
 * @example
 * ```tsx
 * <AddTermModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   onSave={handleSaveTerm}
 *   contributor="parent"
 * />
 * ```
 */
export function AddTermModal({
  isOpen,
  onClose,
  onSave,
  initialType,
  editingTerm,
  contributor,
  className = '',
  'data-testid': dataTestId,
}: AddTermModalProps) {
  const titleId = useId()
  const descriptionId = useId()

  // Form state
  const [selectedType, setSelectedType] = useState<SessionTermType | null>(
    editingTerm?.type ?? initialType ?? null
  )
  const [content, setContent] = useState<Record<string, unknown>>(
    editingTerm?.content ?? {}
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes or editing term changes
  useEffect(() => {
    if (isOpen) {
      setSelectedType(editingTerm?.type ?? initialType ?? null)
      setContent(editingTerm?.content ?? {})
      setErrors({})
    }
  }, [isOpen, editingTerm, initialType])

  // Get term type options
  const typeOptions = getTermTypeOptions()

  // Handle type selection
  const handleTypeSelect = useCallback((type: SessionTermType) => {
    setSelectedType(type)
    setContent({})
    setErrors({})
  }, [])

  // Handle content change
  const handleContentChange = useCallback(
    (field: string, value: unknown) => {
      setContent((prev) => ({ ...prev, [field]: value }))
      // Clear error for this field
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    },
    []
  )

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedType) {
      newErrors.type = 'Please select a term type'
      setErrors(newErrors)
      return false
    }

    // Type-specific validation
    switch (selectedType) {
      case 'screen_time':
        if (!content.minutes || (content.minutes as number) <= 0) {
          newErrors.minutes = 'Please enter a valid number of minutes'
        }
        break
      case 'bedtime':
        if (!content.time) {
          newErrors.time = 'Please select a bedtime'
        }
        break
      case 'monitoring':
        if (!content.level) {
          newErrors.level = 'Please select a monitoring level'
        }
        break
      case 'rule':
      case 'consequence':
      case 'reward':
        if (!content.text || (content.text as string).trim() === '') {
          newErrors.text = 'Please enter a description'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [selectedType, content])

  // Handle save
  const handleSave = useCallback(() => {
    if (!validateForm() || !selectedType) return

    onSave({
      type: selectedType,
      content,
    })
    onClose()
  }, [validateForm, selectedType, content, onSave, onClose])

  // Handle keyboard escape
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  if (!isOpen) return null

  const isEditing = !!editingTerm

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      role="dialog"
      onKeyDown={handleKeyDown}
      data-testid={dataTestId ?? 'add-term-modal'}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl transition-all ${className}`}
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2
              id={titleId}
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {isEditing ? 'Edit Term' : 'Add New Term'}
            </h2>
            <p
              id={descriptionId}
              className="mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              {isEditing
                ? 'Update this part of your agreement'
                : `${contributor === 'parent' ? 'Parent' : 'Child'} is adding a new term`}
            </p>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Select term type (if not already selected or editing) */}
            {!selectedType && !isEditing ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  What kind of term do you want to add?
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {typeOptions.map((option) => (
                    <TermTypeButton
                      key={option.type}
                      option={option}
                      onClick={() => handleTypeSelect(option.type)}
                    />
                  ))}
                </div>
                {errors.type && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {errors.type}
                  </p>
                )}
              </div>
            ) : selectedType ? (
              // Step 2: Fill in term content
              <div>
                {/* Selected type header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <TypeIcon type={selectedType} />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {getTermTypeLabel(selectedType)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getTermExplanation(selectedType)}
                    </p>
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setSelectedType(null)}
                      className="ml-auto text-sm text-primary hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Type-specific form */}
                <TermContentForm
                  type={selectedType}
                  content={content}
                  errors={errors}
                  onChange={handleContentChange}
                />
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedType}
              className={`px-4 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] transition-colors ${
                selectedType
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {isEditing ? 'Save Changes' : 'Add Term'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Term type selection button
 */
function TermTypeButton({
  option,
  onClick,
}: {
  option: TermTypeOption
  onClick: () => void
}) {
  const colors = getTermCategoryColors(option.type)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] ${colors.bg} ${colors.border}`}
      data-testid={`term-type-${option.type}`}
    >
      <TypeIcon type={option.type} />
      <span className={`block mt-2 font-medium ${colors.text}`}>
        {option.label}
      </span>
      <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {option.explanation}
      </span>
    </button>
  )
}

/**
 * Type icon component
 */
function TypeIcon({ type }: { type: SessionTermType }) {
  const colors = getTermCategoryColors(type)
  const iconPath = getTermCategoryIcon(type)

  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border`}
    >
      <svg className={`w-5 h-5 ${colors.icon}`} viewBox="0 0 24 24" fill="currentColor">
        <path d={iconPath} />
      </svg>
    </div>
  )
}

/**
 * Type-specific content form
 */
function TermContentForm({
  type,
  content,
  errors,
  onChange,
}: {
  type: SessionTermType
  content: Record<string, unknown>
  errors: Record<string, string>
  onChange: (field: string, value: unknown) => void
}) {
  const baseInputClasses =
    'w-full px-3 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100'

  switch (type) {
    case 'screen_time':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How many minutes of screen time per day?
          </label>
          <input
            type="number"
            min={1}
            max={1440}
            value={(content.minutes as number) ?? ''}
            onChange={(e) => onChange('minutes', parseInt(e.target.value) || 0)}
            className={`${baseInputClasses} ${errors.minutes ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="e.g., 60 for 1 hour"
            data-testid="input-minutes"
          />
          {errors.minutes && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.minutes}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Tip: 60 minutes = 1 hour, 120 minutes = 2 hours
          </p>
        </div>
      )

    case 'bedtime':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What time should devices be put away?
          </label>
          <input
            type="time"
            value={(content.time as string) ?? ''}
            onChange={(e) => onChange('time', e.target.value)}
            className={`${baseInputClasses} ${errors.time ? 'border-red-500' : 'border-gray-300'}`}
            data-testid="input-time"
          />
          {errors.time && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.time}
            </p>
          )}
        </div>
      )

    case 'monitoring':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How much should parents check in?
          </label>
          <div className="space-y-2">
            {[
              { value: 'light', label: 'Light', description: 'Occasional check-ins' },
              { value: 'moderate', label: 'Regular', description: 'Check in a few times per week' },
              { value: 'comprehensive', label: 'Close', description: 'Frequent check-ins and reviews' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                  content.level === option.value
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="monitoring-level"
                  value={option.value}
                  checked={content.level === option.value}
                  onChange={(e) => onChange('level', e.target.value)}
                  className="mt-0.5 mr-3"
                  data-testid={`input-level-${option.value}`}
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
          {errors.level && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {errors.level}
            </p>
          )}
        </div>
      )

    case 'rule':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What rule do you want to add?
          </label>
          <textarea
            value={(content.text as string) ?? ''}
            onChange={(e) => onChange('text', e.target.value)}
            className={`${baseInputClasses} min-h-[100px] ${errors.text ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="e.g., No phones at the dinner table"
            data-testid="input-text"
          />
          {errors.text && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.text}
            </p>
          )}
        </div>
      )

    case 'consequence':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What happens if the rules are not followed?
          </label>
          <textarea
            value={(content.text as string) ?? ''}
            onChange={(e) => onChange('text', e.target.value)}
            className={`${baseInputClasses} min-h-[100px] ${errors.text ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="e.g., Device taken away for 1 hour"
            data-testid="input-text"
          />
          {errors.text && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.text}
            </p>
          )}
        </div>
      )

    case 'reward':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            What reward for following the rules?
          </label>
          <textarea
            value={(content.text as string) ?? ''}
            onChange={(e) => onChange('text', e.target.value)}
            className={`${baseInputClasses} min-h-[100px] ${errors.text ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="e.g., Extra 30 minutes of screen time on weekends"
            data-testid="input-text"
          />
          {errors.text && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.text}
            </p>
          )}
        </div>
      )

    default:
      return null
  }
}

export default AddTermModal
