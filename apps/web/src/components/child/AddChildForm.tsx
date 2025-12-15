'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createChildInputSchema,
  type CreateChildInput,
} from '@fledgely/contracts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddChildFormProps {
  onSubmit: (data: CreateChildInput) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

/**
 * Add Child Form Component
 *
 * A form for adding a child to a family with name and birthdate.
 * Uses react-hook-form with Zod validation for form handling.
 *
 * Accessibility features:
 * - All fields have proper labels
 * - Error states are announced via aria-live
 * - Focus moves to first error on validation failure
 * - Keyboard accessible (NFR43)
 * - 44x44px touch targets (NFR49)
 *
 * @example
 * ```tsx
 * <AddChildForm
 *   onSubmit={async (data) => await addChild(data)}
 *   onCancel={() => router.back()}
 *   isSubmitting={loading}
 * />
 * ```
 */
export function AddChildForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddChildFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const errorRegionRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<CreateChildInput>({
    resolver: zodResolver(createChildInputSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      birthdate: undefined,
      photoUrl: undefined,
    },
  })

  // Focus first input on mount
  useEffect(() => {
    firstNameRef.current?.focus()
  }, [])

  // Focus first error field on validation failure
  useEffect(() => {
    const errorFields = Object.keys(errors) as (keyof CreateChildInput)[]
    if (errorFields.length > 0) {
      setFocus(errorFields[0])
    }
  }, [errors, setFocus])

  const handleFormSubmit = async (data: CreateChildInput) => {
    setSubmitError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(message)
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
          Child&apos;s first name <span className="text-destructive">*</span>
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
        />
        <p id="birthdate-hint" className="text-xs text-muted-foreground">
          Children must be under 18 years old
        </p>
        {errors.birthdate && (
          <p id="birthdate-error" className="text-sm text-destructive" role="alert">
            {errors.birthdate.message}
          </p>
        )}
      </div>

      {/* Photo URL (optional - placeholder for future upload) */}
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
          {isSubmitting ? 'Adding...' : 'Add Child'}
        </Button>
      </div>
    </form>
  )
}
