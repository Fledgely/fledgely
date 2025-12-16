'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { z } from 'zod'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Reference number format validation
 * Format: LP-YYYYMMDD-XXXXX
 */
const referenceNumberRegex = /^LP-\d{8}-[A-Z0-9]{5}$/

const statusCheckSchema = z.object({
  referenceNumber: z
    .string()
    .min(1, 'Reference number is required')
    .regex(referenceNumberRegex, 'Invalid reference number format'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
})

type StatusCheckFormData = z.infer<typeof statusCheckSchema>

interface PetitionStatus {
  success: boolean
  status?: string
  statusLabel?: string
  submittedAt?: Date
  updatedAt?: Date
  supportMessage?: string
  error?: string
}

interface PetitionStatusCheckerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Get status color based on petition status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'verified':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'pending':
    case 'under-review':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'denied':
      return 'text-red-700 bg-red-50 border-red-200'
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200'
  }
}

/**
 * Petition Status Checker Component
 *
 * Story 3.6: Legal Parent Petition for Access - Task 7
 *
 * Allows petitioners to check the status of their petition using
 * their reference number and email address.
 *
 * Design considerations:
 * - Simple, clear interface
 * - 6th-grade reading level (NFR65)
 * - 44x44px touch targets (NFR49)
 * - Accessible form fields
 */
export function PetitionStatusChecker({
  open,
  onOpenChange,
}: PetitionStatusCheckerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [statusResult, setStatusResult] = useState<PetitionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StatusCheckFormData>({
    resolver: zodResolver(statusCheckSchema),
    defaultValues: {
      referenceNumber: '',
      email: '',
    },
  })

  const handleClose = () => {
    reset()
    setStatusResult(null)
    setError(null)
    setIsLoading(false)
    onOpenChange(false)
  }

  const handleCheckAnother = () => {
    reset()
    setStatusResult(null)
    setError(null)
  }

  const onSubmit = async (data: StatusCheckFormData) => {
    setIsLoading(true)
    setError(null)
    setStatusResult(null)

    try {
      const checkPetitionStatus = httpsCallable(functions, 'checkPetitionStatus')
      const result = await checkPetitionStatus({
        referenceNumber: data.referenceNumber,
        petitionerEmail: data.email,
      })

      const response = result.data as PetitionStatus

      if (response.success) {
        setStatusResult(response)
      } else {
        setError(response.error || "We couldn't find a petition with those details.")
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-medium">
            Check Petition Status
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Enter your reference number and email to check the status of your
            legal parent access request.
          </SheetDescription>
        </SheetHeader>

        {statusResult?.success ? (
          <div className="mt-6 space-y-4">
            {/* Status Badge */}
            <div
              className={cn(
                'rounded-lg border p-4',
                getStatusColor(statusResult.status || '')
              )}
            >
              <p className="text-sm font-medium">Status</p>
              <p className="mt-1 text-lg font-semibold">
                {statusResult.statusLabel || statusResult.status}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatDate(statusResult.submittedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{formatDate(statusResult.updatedAt)}</p>
              </div>
            </div>

            {/* Support Message */}
            {statusResult.supportMessage && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-medium text-blue-900">From Our Team</p>
                <p className="mt-1 text-sm text-blue-800">
                  {statusResult.supportMessage}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCheckAnother}
                variant="outline"
                className="min-h-[44px] flex-1"
              >
                Check Another
              </Button>
              <Button
                onClick={handleClose}
                className="min-h-[44px] flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                placeholder="LP-YYYYMMDD-XXXXX"
                {...register('referenceNumber')}
                aria-describedby={
                  errors.referenceNumber ? 'referenceNumber-error' : undefined
                }
              />
              {errors.referenceNumber && (
                <p id="referenceNumber-error" className="text-sm text-destructive">
                  {errors.referenceNumber.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="The email you used when submitting"
                {...register('email')}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="min-h-[44px] w-full"
            >
              {isLoading ? 'Checking...' : 'Check Status'}
            </Button>

            {/* Cancel Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="min-h-[44px] w-full"
            >
              Cancel
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
