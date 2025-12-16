'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  safetyRequestInputSchema,
  type SafetyRequestInput,
  type SafetyRequestSource,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_DOCUMENTS_PER_REQUEST,
  isAllowedDocumentType,
  formatFileSize,
} from '@fledgely/contracts'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { LegalPetitionForm } from './LegalPetitionForm'
import { PetitionStatusChecker } from './PetitionStatusChecker'

interface PendingFile {
  file: File
  id: string
}

interface SafetyContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: SafetyRequestSource
}

/**
 * Safety Contact Form Component
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 *
 * Design considerations:
 * - Uses Sheet (slides in from side) rather than Dialog for subtlety
 * - Neutral, calming language - no alarming words like "escape" or "abuse"
 * - Clears form data on close (no persistence in browser)
 * - No external loading indicators (nothing visible to shoulder-surfer)
 * - Success message is neutral and doesn't reveal action taken
 */
export function SafetyContactForm({
  open,
  onOpenChange,
  source,
}: SafetyContactFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showLegalPetition, setShowLegalPetition] = useState(false)
  const [showPetitionStatus, setShowPetitionStatus] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SafetyRequestInput>({
    resolver: zodResolver(safetyRequestInputSchema),
    defaultValues: {
      message: '',
      safeEmail: '',
      safePhone: '',
      source,
    },
  })

  const validateFile = (file: File): string | null => {
    if (!isAllowedDocumentType(file.type)) {
      return `File type "${file.type}" is not supported`
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (max ${formatFileSize(MAX_FILE_SIZE_BYTES)})`
    }
    return null
  }

  const handleFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setFileError(null)

    const remainingSlots = MAX_DOCUMENTS_PER_REQUEST - pendingFiles.length
    const newFiles: PendingFile[] = []

    for (let i = 0; i < files.length && newFiles.length < remainingSlots; i++) {
      const file = files[i]
      const error = validateFile(file)
      if (error) {
        setFileError(error)
        continue
      }
      newFiles.push({ file, id: `pending-${Date.now()}-${i}` })
    }

    if (newFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newFiles])
    }

    if (pendingFiles.length + newFiles.length >= MAX_DOCUMENTS_PER_REQUEST && files.length > remainingSlots) {
      setFileError(`Maximum ${MAX_DOCUMENTS_PER_REQUEST} files allowed`)
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== fileId))
    setFileError(null)
  }

  const uploadFiles = async (requestId: string): Promise<void> => {
    const uploadSafetyDocument = httpsCallable(functions, 'uploadSafetyDocument')

    for (const { file } of pendingFiles) {
      // Convert file to base64
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })

      await uploadSafetyDocument({
        requestId,
        fileName: file.name,
        fileType: file.type,
        sizeBytes: file.size,
        fileContent: base64Content,
      })
    }
  }

  const onSubmit = async (data: SafetyRequestInput) => {
    setIsSubmitting(true)
    setSubmitError(false)
    try {
      const submitSafetyRequest = httpsCallable(functions, 'submitSafetyRequest')
      const result = await submitSafetyRequest(data)
      const responseData = result.data as { requestId?: string }

      // Upload any pending files to the created request
      if (pendingFiles.length > 0 && responseData.requestId) {
        await uploadFiles(responseData.requestId)
      }

      setIsSubmitted(true)
    } catch {
      // Show neutral error message - victim needs to know to retry
      // The function logs errors internally for support team review
      setSubmitError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Clear all form data on close - no persistence
    reset()
    setIsSubmitted(false)
    setIsSubmitting(false)
    setSubmitError(false)
    setPendingFiles([])
    setFileError(null)
    setIsDragging(false)
    onOpenChange(false)
  }

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelection(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const acceptTypes = ALLOWED_DOCUMENT_TYPES.join(',')
  const remainingSlots = MAX_DOCUMENTS_PER_REQUEST - pendingFiles.length

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md"
        // Prevent closing on overlay click for accidental dismissal protection
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-medium">
            Safety Resources
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            We&apos;re here to help. Your message is private and secure.
          </SheetDescription>
        </SheetHeader>

        {submitError ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t complete your request. Please try again.
            </p>
            <Button
              onClick={() => setSubmitError(false)}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        ) : isSubmitted ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Thank you. Someone will reach out to your safe contact if
              provided.
            </p>
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <input type="hidden" {...register('source')} value={source} />

            <div className="space-y-2">
              <Label htmlFor="message">How can we help?</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your situation..."
                className="min-h-[120px] resize-none"
                {...register('message')}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {errors.message && (
                <p id="message-error" className="text-sm text-destructive">
                  {errors.message.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="safeEmail">
                Safe email address{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="safeEmail"
                type="email"
                placeholder="An email only you can access"
                {...register('safeEmail')}
                aria-describedby={
                  errors.safeEmail ? 'safeEmail-error' : undefined
                }
              />
              {errors.safeEmail && (
                <p id="safeEmail-error" className="text-sm text-destructive">
                  {errors.safeEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="safePhone">
                Safe phone number{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="safePhone"
                type="tel"
                placeholder="A number only you can access"
                {...register('safePhone')}
                aria-describedby={
                  errors.safePhone ? 'safePhone-error' : undefined
                }
              />
              {errors.safePhone && (
                <p id="safePhone-error" className="text-sm text-destructive">
                  {errors.safePhone.message}
                </p>
              )}
            </div>

            {/* Document Upload Section */}
            <div className="space-y-2">
              <Label>
                Supporting documents{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>

              {/* Drop zone - only show if there are remaining slots */}
              {remainingSlots > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    'relative rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  )}
                  aria-label="Upload documents"
                  aria-describedby="upload-description"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptTypes}
                    multiple
                    onChange={(e) => {
                      handleFileSelection(e.target.files)
                      e.target.value = ''
                    }}
                    className="hidden"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="text-sm">
                      {isDragging ? 'Drop files here' : 'Add files'}
                    </p>
                    <p
                      id="upload-description"
                      className="text-xs text-muted-foreground"
                    >
                      PDF, images, or documents
                    </p>
                  </div>
                </div>
              )}

              {/* Pending files list */}
              {pendingFiles.length > 0 && (
                <ul className="space-y-1" role="list" aria-label="Selected files">
                  {pendingFiles.map((pf) => (
                    <li
                      key={pf.id}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                    >
                      <span className="truncate pr-2">{pf.file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(pf.id)}
                        className="h-6 px-2 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${pf.file.name}`}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {/* File error message */}
              {fileError && (
                <p className="text-sm text-destructive">{fileError}</p>
              )}

              {/* Maximum files reached message */}
              {remainingSlots === 0 && (
                <p className="text-xs text-muted-foreground">
                  Maximum files reached
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {/* No loading spinner - avoid external indicators */}
                Send
              </Button>
            </div>

            {/* Legal Parent Access Section */}
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Are you a legal parent seeking access to your child&apos;s account?
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setShowLegalPetition(true)}
                  className="h-auto p-0 text-xs"
                >
                  Submit request
                </Button>
                <span className="text-xs text-muted-foreground">|</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setShowPetitionStatus(true)}
                  className="h-auto p-0 text-xs"
                >
                  Check status
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Legal Petition Form Dialog */}
        <LegalPetitionForm
          open={showLegalPetition}
          onOpenChange={setShowLegalPetition}
        />

        {/* Petition Status Checker Dialog */}
        <PetitionStatusChecker
          open={showPetitionStatus}
          onOpenChange={setShowPetitionStatus}
        />
      </SheetContent>
    </Sheet>
  )
}
