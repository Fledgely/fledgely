'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { useChild } from '@/hooks/useChild'
import { useCustody } from '@/hooks/useCustody'
import { AddChildForm } from '@/components/child/AddChildForm'
import { CustodyDeclarationForm } from '@/components/custody/CustodyDeclarationForm'
import { Button } from '@/components/ui/button'
import { SafetyResourcesLink } from '@/components/safety'
import type { CreateChildInput, CreateCustodyDeclarationInput, ChildProfile } from '@fledgely/contracts'

/**
 * Add Child Page - Second step of onboarding
 *
 * A multi-step flow for adding children to a family:
 * 1. Child Info - Create child profile
 * 2. Custody Declaration - Declare custody arrangement (required)
 * 3. Complete - Show success and options
 *
 * Story 2.2: Add Child to Family
 * Story 2.3: Custody Arrangement Declaration
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 color contrast ratio (NFR45)
 * - Visible focus indicators (NFR46)
 * - Keyboard accessible (NFR43)
 * - Screen reader announcements via aria-live
 */

type Step = 'child-info' | 'custody' | 'complete'

export default function AddChildPage() {
  const router = useRouter()
  const { userProfile, loading: userLoading } = useUser()
  const { hasFamily, loading: familyLoading } = useFamily()
  const { children, hasChildren, addChild, loading: childLoading, refreshChildren } = useChild()
  const { declareOrUpdateCustody, loading: custodyLoading } = useCustody()

  const [step, setStep] = useState<Step>('child-info')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentChild, setCurrentChild] = useState<ChildProfile | null>(null)

  // Get first name for personalized message
  const firstName = userProfile?.displayName?.split(' ')[0] || 'there'

  /**
   * Handle adding a child (step 1)
   */
  const handleAddChild = useCallback(
    async (data: CreateChildInput) => {
      setIsSubmitting(true)

      try {
        const child = await addChild(data)
        setCurrentChild(child)
        setStep('custody')
      } finally {
        setIsSubmitting(false)
      }
    },
    [addChild]
  )

  /**
   * Handle declaring custody (step 2)
   */
  const handleDeclareCustody = useCallback(
    async (data: CreateCustodyDeclarationInput) => {
      if (!currentChild) return

      setIsSubmitting(true)

      try {
        await declareOrUpdateCustody(currentChild.id, data)
        // Refresh children to get updated custody data
        await refreshChildren()
        setStep('complete')
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentChild, declareOrUpdateCustody, refreshChildren]
  )

  /**
   * Handle going back to child info step
   */
  const handleBackToChildInfo = useCallback(() => {
    setStep('child-info')
    setCurrentChild(null)
  }, [])

  /**
   * Handle adding another child
   */
  const handleAddAnother = useCallback(() => {
    setStep('child-info')
    setCurrentChild(null)
  }, [])

  /**
   * Handle continuing to next step (dashboard)
   */
  const handleContinue = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  // Loading state
  const isLoading = userLoading || familyLoading || childLoading

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main
          className="flex flex-1 flex-col items-center justify-center p-4"
          aria-busy="true"
          aria-label="Loading your family information"
        >
          <div className="w-full max-w-md space-y-6">
            {/* Screen reader loading announcement */}
            <span className="sr-only" role="status" aria-live="polite">
              Loading your family information, please wait.
            </span>
            {/* Loading skeleton */}
            <div className="space-y-4 text-center" aria-hidden="true">
              <div className="mx-auto h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted" />
              <div className="space-y-3 pt-4">
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
                <div className="h-10 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // If user doesn't have a family, redirect to create-family
  if (!hasFamily) {
    router.push('/onboarding/create-family')
    return null
  }

  // Step indicator configuration
  const stepConfig = {
    'child-info': { stepNumber: 1, label: 'Child Info' },
    custody: { stepNumber: 2, label: 'Custody' },
    complete: { stepNumber: 3, label: 'Complete' },
  }

  const currentStepNumber = stepConfig[step].stepNumber
  const totalSteps = 3

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Welcome header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {step === 'complete' && hasChildren
                ? `Your Children (${children.length})`
                : step === 'custody'
                  ? 'Custody Arrangement'
                  : hasChildren
                    ? `Your Children (${children.length})`
                    : `Hi ${firstName}!`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === 'complete'
                ? 'Add another child or continue to the dashboard.'
                : step === 'custody'
                  ? "Tell us about your custody situation for this child."
                  : hasChildren
                    ? 'Add another child or continue to the dashboard.'
                    : "Let's add your first child to get started."}
            </p>
          </div>

          {/* Add child card */}
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              {/* Progress indicator */}
              <div
                className="flex flex-col items-center gap-2"
                role="group"
                aria-label={`Onboarding progress: Step ${currentStepNumber} of ${totalSteps}`}
              >
                {/* Step dots */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        num <= currentStepNumber ? 'bg-primary' : 'bg-muted'
                      }`}
                      aria-label={
                        num < currentStepNumber
                          ? `Step ${num} completed`
                          : num === currentStepNumber
                            ? `Step ${num} current`
                            : `Step ${num}`
                      }
                    />
                  ))}
                </div>

                {/* Step labels */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className={currentStepNumber >= 1 ? 'text-primary' : ''}>
                    Child Info
                  </span>
                  <span className="mx-1">→</span>
                  <span className={currentStepNumber >= 2 ? 'text-primary' : ''}>
                    Custody
                  </span>
                  <span className="mx-1">→</span>
                  <span className={currentStepNumber >= 3 ? 'text-primary' : ''}>
                    Complete
                  </span>
                </div>
              </div>

              {/* Step 1: Child Info */}
              {step === 'child-info' && (
                <div className="space-y-4">
                  {/* Step description */}
                  <div className="text-center">
                    <h2 className="text-lg font-medium">
                      {hasChildren ? 'Add Another Child' : 'Add Your Child'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Enter your child&apos;s information below. You can add more
                      children later.
                    </p>
                  </div>

                  {/* Add child form */}
                  <AddChildForm
                    onSubmit={handleAddChild}
                    isSubmitting={isSubmitting}
                  />

                  {/* Skip option if already has children */}
                  {hasChildren && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={handleContinue}
                        className="text-sm text-muted-foreground underline hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Skip and continue to dashboard
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Custody Declaration */}
              {step === 'custody' && currentChild && (
                <div className="space-y-4">
                  {/* Step description */}
                  <div className="text-center">
                    <h2 className="text-lg font-medium">
                      Custody for {currentChild.firstName}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This helps us provide the right features for your family.
                    </p>
                  </div>

                  {/* Custody declaration form */}
                  <CustodyDeclarationForm
                    onSubmit={handleDeclareCustody}
                    onCancel={handleBackToChildInfo}
                    isSubmitting={isSubmitting || custodyLoading}
                  />
                </div>
              )}

              {/* Step 3: Complete */}
              {step === 'complete' && (
                <div className="space-y-4">
                  {/* Success message */}
                  <div
                    className="rounded-md bg-green-50 p-4 text-center dark:bg-green-950"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      {currentChild?.firstName} has been added to your family!
                    </p>
                  </div>

                  {/* Children count */}
                  <p className="text-center text-sm text-muted-foreground">
                    You have {children.length}{' '}
                    {children.length === 1 ? 'child' : 'children'} in your family.
                  </p>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleAddAnother}
                      variant="outline"
                      className="min-h-[44px] w-full"
                    >
                      Add Another Child
                    </Button>
                    <Button
                      onClick={handleContinue}
                      className="min-h-[44px] w-full"
                    >
                      Continue to Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Existing children list (if any) */}
          {hasChildren && step === 'child-info' && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium">Your Children</h3>
              <ul className="space-y-2">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="flex items-center gap-3 rounded-md bg-muted/50 p-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {child.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm">
                        {child.firstName}
                        {child.lastName ? ` ${child.lastName}` : ''}
                      </span>
                      {child.custodyDeclaration && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({child.custodyDeclaration.type} custody)
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Footer with safety link */}
      <footer className="border-t py-4">
        <div className="container flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Fledgely</span>
          <span>&middot;</span>
          <a href="/privacy" className="hover:underline">
            Privacy
          </a>
          <span>&middot;</span>
          <a href="/terms" className="hover:underline">
            Terms
          </a>
          <span>&middot;</span>
          <SafetyResourcesLink source="add-child-page" />
        </div>
      </footer>
    </div>
  )
}
