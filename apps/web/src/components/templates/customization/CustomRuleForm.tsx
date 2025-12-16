'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { type CustomRule } from './useTemplateDraft'

/**
 * Props for CustomRuleForm
 */
export interface CustomRuleFormProps {
  /** Initial values for editing an existing rule */
  initialValues?: Partial<CustomRule>
  /** Callback when form is submitted */
  onSubmit: (rule: Omit<CustomRule, 'id' | 'createdAt'>) => void
  /** Callback when form is cancelled */
  onCancel: () => void
  /** Additional class names */
  className?: string
}

/**
 * Rule category options
 */
const CATEGORIES: Array<{ value: CustomRule['category']; label: string; emoji: string }> = [
  { value: 'time', label: 'Time & Schedule', emoji: '⏰' },
  { value: 'apps', label: 'Apps & Content', emoji: '📱' },
  { value: 'monitoring', label: 'Privacy & Safety', emoji: '👁️' },
  { value: 'other', label: 'Other', emoji: '📋' },
]

/**
 * Form validation
 */
interface FormErrors {
  title?: string
  description?: string
}

function validateForm(title: string, description: string): FormErrors {
  const errors: FormErrors = {}

  if (!title.trim()) {
    errors.title = 'Title is required'
  } else if (title.length > 100) {
    errors.title = 'Title must be 100 characters or less'
  }

  if (!description.trim()) {
    errors.description = 'Description is required'
  } else if (description.length > 500) {
    errors.description = 'Description must be 500 characters or less'
  }

  return errors
}

/**
 * CustomRuleForm Component
 *
 * Story 4.5: Template Customization Preview - Task 3.3
 * AC #3: Parent can add custom rules not in template
 *
 * @param props - Component props
 */
export function CustomRuleForm({
  initialValues,
  onSubmit,
  onCancel,
  className,
}: CustomRuleFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [category, setCategory] = useState<CustomRule['category']>(initialValues?.category || 'other')
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<{ title: boolean; description: boolean }>({
    title: false,
    description: false,
  })

  const titleInputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!initialValues?.title

  // Focus title input on mount
  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateForm(title, description)
    setErrors(validationErrors)
    setTouched({ title: true, description: true })

    if (Object.keys(validationErrors).length === 0) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
      })
    }
  }, [title, description, category, onSubmit])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    if (touched.title) {
      setErrors((prev) => ({
        ...prev,
        title: e.target.value.trim() ? undefined : 'Title is required',
      }))
    }
  }, [touched.title])

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value)
    if (touched.description) {
      setErrors((prev) => ({
        ...prev,
        description: e.target.value.trim() ? undefined : 'Description is required',
      }))
    }
  }, [touched.description])

  const handleBlur = useCallback((field: 'title' | 'description') => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const value = field === 'title' ? title : description
    if (!value.trim()) {
      setErrors((prev) => ({
        ...prev,
        [field]: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
      }))
    }
  }, [title, description])

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'rounded-lg border border-green-200 bg-green-50 p-4 space-y-4',
        className
      )}
      aria-label={isEditing ? 'Edit custom rule' : 'Add custom rule'}
    >
      <h4 className="font-medium text-gray-900">
        {isEditing ? 'Edit Custom Rule' : 'Add Custom Rule'}
      </h4>

      {/* Title field */}
      <div>
        <label
          htmlFor="rule-title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Rule Title <span className="text-red-500">*</span>
        </label>
        <input
          ref={titleInputRef}
          type="text"
          id="rule-title"
          value={title}
          onChange={handleTitleChange}
          onBlur={() => handleBlur('title')}
          placeholder="e.g., No phones during meals"
          maxLength={100}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className={cn(
            'w-full rounded-md border px-3 py-2 text-sm',
            'min-h-[44px]', // NFR49: Touch target
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            errors.title
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-white'
          )}
        />
        {errors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.title}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {title.length}/100 characters
        </p>
      </div>

      {/* Description field */}
      <div>
        <label
          htmlFor="rule-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="rule-description"
          value={description}
          onChange={handleDescriptionChange}
          onBlur={() => handleBlur('description')}
          placeholder="Describe what this rule means and when it applies..."
          rows={3}
          maxLength={500}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
          className={cn(
            'w-full rounded-md border px-3 py-2 text-sm resize-none',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            errors.description
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-white'
          )}
        />
        {errors.description && (
          <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.description}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {description.length}/500 characters
        </p>
      </div>

      {/* Category field */}
      <div>
        <label
          htmlFor="rule-category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Category
        </label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rule category">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              role="radio"
              aria-checked={category === cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                'min-h-[36px]', // NFR49: Touch target
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                category === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              <span aria-hidden="true">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium',
            'min-h-[44px]', // NFR49: Touch target
            'border border-gray-300 text-gray-700 bg-white',
            'hover:bg-gray-50',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium',
            'min-h-[44px]', // NFR49: Touch target
            'bg-blue-600 text-white',
            'hover:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
        >
          {isEditing ? 'Save Changes' : 'Add Rule'}
        </button>
      </div>
    </form>
  )
}
