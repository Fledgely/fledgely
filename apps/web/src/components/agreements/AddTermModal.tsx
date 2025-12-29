/**
 * Add Term Modal Component.
 *
 * Story 5.2: Visual Agreement Builder - AC1, AC3
 *
 * Modal for adding or editing agreement terms.
 * Includes category selection and child-friendly explanation.
 */

'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { TermCategory, ContributionParty, AgreementTerm } from '@fledgely/shared/contracts'

/**
 * Category options with descriptions.
 */
const CATEGORY_OPTIONS: { value: TermCategory; label: string; description: string }[] = [
  { value: 'time', label: 'Time', description: 'Rules about when and how long' },
  { value: 'apps', label: 'Apps', description: 'Rules about apps and games' },
  { value: 'monitoring', label: 'Monitoring', description: 'Rules about what parents can see' },
  { value: 'rewards', label: 'Rewards', description: 'Special privileges and rewards' },
  { value: 'general', label: 'General', description: 'Other important rules' },
]

interface AddTermModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Called when a term is saved */
  onSave: (term: Omit<AgreementTerm, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => void
  /** Who is adding the term */
  party: ContributionParty
  /** Existing term to edit (if editing) */
  editingTerm?: AgreementTerm
}

export function AddTermModal({ isOpen, onClose, onSave, party, editingTerm }: AddTermModalProps) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<TermCategory>('general')
  const [explanation, setExplanation] = useState('')
  const [errors, setErrors] = useState<{ text?: string; explanation?: string }>({})

  // Populate form when editing
  useEffect(() => {
    if (editingTerm) {
      setText(editingTerm.text)
      setCategory(editingTerm.category)
      setExplanation(editingTerm.explanation)
    } else {
      setText('')
      setCategory('general')
      setExplanation('')
    }
    setErrors({})
  }, [editingTerm, isOpen])

  /**
   * Generate a simple child-friendly explanation.
   */
  const generateExplanation = () => {
    if (!text) return

    // Simple auto-generation based on category
    const prefixes: Record<TermCategory, string> = {
      time: 'This is about how much time you can spend on screens.',
      apps: 'This tells you which apps and games you can use.',
      monitoring: 'This explains what your parents can see on your devices.',
      rewards: 'This is about special things you can earn!',
      general: 'This is an important rule for using devices.',
    }

    setExplanation(`${prefixes[category]} ${text}`)
  }

  /**
   * Validate the form.
   */
  const validate = (): boolean => {
    const newErrors: { text?: string; explanation?: string } = {}

    if (!text.trim()) {
      newErrors.text = 'Please enter the rule text'
    } else if (text.length > 500) {
      newErrors.text = 'Rule text must be less than 500 characters'
    }

    if (!explanation.trim()) {
      newErrors.explanation = 'Please add an explanation for your child'
    } else if (explanation.length > 300) {
      newErrors.explanation = 'Explanation must be less than 300 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle form submission.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    onSave({
      text: text.trim(),
      category,
      party,
      explanation: explanation.trim(),
    })

    onClose()
  }

  const isEditing = !!editingTerm
  const partyLabel = party === 'parent' ? 'Parent' : 'Child'

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" data-testid="add-term-overlay" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto z-50 focus:outline-none"
          data-testid="add-term-modal"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-t-lg border-b border-gray-200">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Rule' : 'Add a New Rule'}
                </Dialog.Title>
                <Dialog.Description className="sr-only">
                  {isEditing
                    ? 'Modify the rule text, category, and explanation'
                    : 'Create a new rule with text, category, and explanation'}
                </Dialog.Description>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    party === 'parent'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-pink-100 text-pink-700'
                  }`}
                >
                  {partyLabel}&apos;s Idea
                </span>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-5">
              {/* Rule text */}
              <div>
                <label htmlFor="term-text" className="block text-sm font-medium text-gray-700 mb-1">
                  What&apos;s the rule? <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="term-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g., Screen time ends at 8pm on school nights"
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                    errors.text ? 'border-red-300' : 'border-gray-300'
                  }`}
                  data-testid="term-text-input"
                />
                {errors.text && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.text}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">{text.length}/500 characters</p>
              </div>

              {/* Category selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What type of rule is this?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={`p-3 text-left rounded-lg border-2 transition-all ${
                        category === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`category-${opt.value}`}
                    >
                      <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Child-friendly explanation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="term-explanation"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Explain it simply <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateExplanation}
                    className="text-xs text-primary hover:text-primary/80 focus:outline-none focus:underline"
                    data-testid="auto-generate-explanation"
                  >
                    Auto-generate
                  </button>
                </div>
                <textarea
                  id="term-explanation"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Write this so a child can understand (6th-grade reading level)"
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                    errors.explanation ? 'border-red-300' : 'border-gray-300'
                  }`}
                  data-testid="term-explanation-input"
                />
                {errors.explanation && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.explanation}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">{explanation.length}/300 characters</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                  data-testid="save-term"
                >
                  {isEditing ? 'Save Changes' : 'Add Rule'}
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                    data-testid="cancel-add-term"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default AddTermModal
