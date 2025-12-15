'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createCustodyDeclarationInputSchema,
  CUSTODY_TYPE_LABELS,
  type CreateCustodyDeclarationInput,
  type CustodyType,
} from '@fledgely/contracts'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface CustodyDeclarationFormProps {
  onSubmit: (data: CreateCustodyDeclarationInput) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  /** Initial values for editing existing custody */
  initialValues?: CreateCustodyDeclarationInput
}

/**
 * Custody Declaration Form Component
 *
 * A form for declaring custody arrangements for a child.
 * Uses react-hook-form with Zod validation for form handling.
 *
 * Accessibility features:
 * - Radio buttons have proper labels and ARIA attributes
 * - Error states are announced via aria-live
 * - Focus moves to first error on validation failure
 * - Keyboard accessible (NFR43)
 * - 44x44px touch targets (NFR49)
 * - 4.5:1 color contrast (NFR45)
 *
 * Story 2.3: Custody Arrangement Declaration
 *
 * @example
 * ```tsx
 * <CustodyDeclarationForm
 *   onSubmit={async (data) => await declareCustody(childId, data)}
 *   onCancel={() => router.back()}
 *   isSubmitting={loading}
 * />
 * ```
 */
export function CustodyDeclarationForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialValues,
}: CustodyDeclarationFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const errorRegionRef = useRef<HTMLDivElement>(null)

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setFocus,
  } = useForm<CreateCustodyDeclarationInput>({
    resolver: zodResolver(createCustodyDeclarationInputSchema),
    defaultValues: {
      type: initialValues?.type || undefined,
      notes: initialValues?.notes || '',
    },
  })

  // Watch custody type to show/hide notes field
  const custodyType = watch('type')

  // Focus first error field on validation failure
  useEffect(() => {
    const errorFields = Object.keys(errors) as (keyof CreateCustodyDeclarationInput)[]
    if (errorFields.length > 0) {
      // For radio groups, we need to focus the fieldset
      if (errorFields[0] === 'type') {
        const radioGroup = formRef.current?.querySelector('[role="radiogroup"]')
        ;(radioGroup as HTMLElement)?.focus()
      } else {
        setFocus(errorFields[0])
      }
    }
  }, [errors, setFocus])

  const handleFormSubmit = async (data: CreateCustodyDeclarationInput) => {
    setSubmitError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(message)
    }
  }

  // Define custody types with their labels
  const custodyTypes: CustodyType[] = ['sole', 'shared', 'complex']

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* Error announcement region for screen readers */}
      <div
        ref={errorRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {submitError && `Error: ${submitError}`}
        {Object.keys(errors).length > 0 &&
          `Form has ${Object.keys(errors).length} error${Object.keys(errors).length > 1 ? 's' : ''}`}
      </div>

      {/* Submit error message */}
      {submitError && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      {/* Custody Type Selection */}
      <div className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium leading-none mb-4">
            What is your custody situation? <span className="text-destructive">*</span>
          </legend>

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="space-y-3"
                aria-required="true"
                aria-invalid={!!errors.type}
                aria-describedby={errors.type ? 'type-error' : undefined}
              >
                {custodyTypes.map((type) => {
                  const label = CUSTODY_TYPE_LABELS[type]
                  return (
                    <div
                      key={type}
                      className="flex items-start space-x-3 p-3 rounded-lg border border-input hover:bg-accent/50 transition-colors cursor-pointer min-h-[44px]"
                    >
                      <RadioGroupItem
                        value={type}
                        id={`custody-${type}`}
                        className="mt-1 min-w-[16px] min-h-[16px]"
                      />
                      <Label
                        htmlFor={`custody-${type}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <span className="font-medium block">{label.title}</span>
                        <span className="text-sm text-muted-foreground block mt-1">
                          {label.description}
                        </span>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            )}
          />

          {errors.type && (
            <p id="type-error" className="text-sm text-destructive mt-2" role="alert">
              Please select a custody type
            </p>
          )}
        </fieldset>
      </div>

      {/* Shared Custody Informational Message */}
      {custodyType === 'shared' && (
        <div
          className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900"
          role="note"
          aria-label="Information about shared custody"
        >
          <p className="font-medium mb-1">About shared custody</p>
          <p>
            Shared custody families have extra safeguards to make sure both parents have
            equal access to their child&apos;s information. When another parent is added to
            the family, both of you will be notified.
          </p>
        </div>
      )}

      {/* Complex Custody Notes (shown for complex type) */}
      {custodyType === 'complex' && (
        <div className="space-y-2">
          <Label htmlFor="notes">
            Tell us about your situation{' '}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Textarea
                id="notes"
                placeholder="Tell us about your family situation..."
                className="min-h-[100px] resize-none"
                aria-invalid={!!errors.notes}
                aria-describedby={
                  errors.notes
                    ? 'notes-error notes-hint'
                    : 'notes-hint'
                }
                maxLength={500}
                {...field}
                value={field.value || ''}
              />
            )}
          />
          <p id="notes-hint" className="text-xs text-muted-foreground">
            Maximum 500 characters. This helps us understand your unique family needs.
          </p>
          {errors.notes && (
            <p id="notes-error" className="text-sm text-destructive" role="alert">
              {errors.notes.message}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px]"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className={`min-h-[44px] ${onCancel ? 'flex-1' : 'w-full'}`}
        >
          {isSubmitting ? 'Saving...' : initialValues ? 'Update Custody' : 'Continue'}
        </Button>
      </div>
    </form>
  )
}
