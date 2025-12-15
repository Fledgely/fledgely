'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  updateChildInputSchema,
  calculateAge,
  type UpdateChildInput,
  type ChildProfile,
} from '@fledgely/contracts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditChildProfileFormProps {
  /** The child profile being edited */
  child: ChildProfile
  /** Called when the form is submitted with valid data */
  onSubmit: (data: UpdateChildInput) => Promise<void>
  /** Called when user cancels editing */
  onCancel?: () => void
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Called when form has unsaved changes and user tries to navigate away */
  onDirtyStateChange?: (isDirty: boolean) => void
}

/**
 * Edit Child Profile Form Component
 *
 * A form for editing an existing child's profile information.
 * Uses react-hook-form with Zod validation for form handling.
 *
 * Accessibility features:
 * - All fields have proper labels
 * - Error states are announced via aria-live
 * - Focus moves to first error on validation failure
 * - Keyboard accessible (NFR43)
 * - 44x44px touch targets (NFR49)
 *
 * Story 2.5: Edit Child Profile
 *
 * @example
 * ```tsx
 * <EditChildProfileForm
 *   child={childData}
 *   onSubmit={async (data) => await updateChild(childId, data)}
 *   onCancel={() => router.back()}
 *   isSubmitting={loading}
 * />
 * ```
 */
export function EditChildProfileForm({
  child,
  onSubmit,
  onCancel,
  isSubmitting = false,
  onDirtyStateChange,
}: EditChildProfileFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [internalSubmitting, setInternalSubmitting] = useState(false)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const errorRegionRef = useRef<HTMLDivElement>(null)

  // Combined submitting state (external prop or internal state)
  const isCurrentlySubmitting = isSubmitting || internalSubmitting

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setFocus,
    watch,
  } = useForm<UpdateChildInput>({
    resolver: zodResolver(updateChildInputSchema),
    defaultValues: {
      firstName: child.firstName,
      lastName: child.lastName ?? '',
      nickname: child.nickname ?? '',
      birthdate: child.birthdate,
      photoUrl: child.photoUrl ?? '',
    },
  })

  // Watch birthdate to show calculated age
  const watchedBirthdate = watch('birthdate')
  const calculatedAge = watchedBirthdate ? calculateAge(watchedBirthdate) : calculateAge(child.birthdate)

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyStateChange?.(isDirty)
  }, [isDirty, onDirtyStateChange])

  // Focus first input on mount
  useEffect(() => {
    firstNameRef.current?.focus()
  }, [])

  // Focus first error field on validation failure
  useEffect(() => {
    const errorFields = Object.keys(errors) as (keyof UpdateChildInput)[]
    if (errorFields.length > 0) {
      setFocus(errorFields[0])
    }
  }, [errors, setFocus])

  const handleFormSubmit = async (data: UpdateChildInput) => {
    // Idempotency guard - prevent double submissions
    if (isCurrentlySubmitting) {
      return
    }

    setSubmitError(null)
    setInternalSubmitting(true)
    try {
      await onSubmit(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(message)
    } finally {
      setInternalSubmitting(false)
    }
  }

  // Get the firstName field registration with our ref
  const firstNameRegister = register('firstName')

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* Error announcement region for screen readers */}
      <div
        ref={errorRegionRef}
        role="status"
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

      {/* First Name */}
      <div className="space-y-2">
        <Label htmlFor="firstName">
          First name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="firstName"
          type="text"
          placeholder="Enter first name"
          autoComplete="given-name"
          aria-required="true"
          aria-invalid={!!errors.firstName}
          aria-describedby={errors.firstName ? 'firstName-error' : undefined}
          {...firstNameRegister}
          ref={(e) => {
            firstNameRegister.ref(e)
            ;(firstNameRef as React.MutableRefObject<HTMLInputElement | null>).current = e
          }}
        />
        {errors.firstName && (
          <p id="firstName-error" className="text-sm text-destructive" role="alert">
            {errors.firstName.message}
          </p>
        )}
      </div>

      {/* Last Name (optional) */}
      <div className="space-y-2">
        <Label htmlFor="lastName">
          Last name <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="lastName"
          type="text"
          placeholder="Enter last name"
          autoComplete="family-name"
          aria-invalid={!!errors.lastName}
          aria-describedby={errors.lastName ? 'lastName-error' : undefined}
          {...register('lastName')}
        />
        {errors.lastName && (
          <p id="lastName-error" className="text-sm text-destructive" role="alert">
            {errors.lastName.message}
          </p>
        )}
      </div>

      {/* Nickname (optional) */}
      <div className="space-y-2">
        <Label htmlFor="nickname">
          Nickname <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="nickname"
          type="text"
          placeholder="What do they like to be called?"
          aria-invalid={!!errors.nickname}
          aria-describedby={errors.nickname ? 'nickname-error' : undefined}
          {...register('nickname')}
        />
        {errors.nickname && (
          <p id="nickname-error" className="text-sm text-destructive" role="alert">
            {errors.nickname.message}
          </p>
        )}
      </div>

      {/* Birthdate */}
      <div className="space-y-2">
        <Label htmlFor="birthdate">
          Date of birth <span className="text-destructive">*</span>
        </Label>
        <Input
          id="birthdate"
          type="date"
          aria-required="true"
          aria-invalid={!!errors.birthdate}
          aria-describedby={
            errors.birthdate
              ? 'birthdate-error birthdate-hint'
              : 'birthdate-hint'
          }
          max={new Date().toISOString().split('T')[0]}
          {...register('birthdate', {
            setValueAs: (value: string) => (value ? new Date(value) : undefined),
          })}
          defaultValue={child.birthdate.toISOString().split('T')[0]}
        />
        <p id="birthdate-hint" className="text-xs text-muted-foreground">
          Age: {calculatedAge} years old
        </p>
        {errors.birthdate && (
          <p id="birthdate-error" className="text-sm text-destructive" role="alert">
            {errors.birthdate.message}
          </p>
        )}
      </div>

      {/* Photo URL (optional) */}
      <div className="space-y-2">
        <Label htmlFor="photoUrl">
          Photo URL <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="photoUrl"
          type="url"
          placeholder="https://example.com/photo.jpg"
          aria-invalid={!!errors.photoUrl}
          aria-describedby={errors.photoUrl ? 'photoUrl-error' : undefined}
          {...register('photoUrl')}
        />
        {errors.photoUrl && (
          <p id="photoUrl-error" className="text-sm text-destructive" role="alert">
            {errors.photoUrl.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isCurrentlySubmitting}
            className="flex-1 min-h-[44px]"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isCurrentlySubmitting || !isDirty}
          className={`min-h-[44px] ${onCancel ? 'flex-1' : 'w-full'}`}
        >
          {isCurrentlySubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Dirty state indicator */}
      {isDirty && !isCurrentlySubmitting && (
        <p className="text-sm text-muted-foreground text-center">
          You have unsaved changes
        </p>
      )}
    </form>
  )
}
