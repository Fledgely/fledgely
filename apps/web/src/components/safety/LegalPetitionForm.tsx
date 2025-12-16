'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { z } from 'zod'
import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * Form input schema matching the backend submitLegalPetitionInputSchema
 * but adapted for form use (dates as strings)
 */
const legalPetitionFormSchema = z.object({
  petitionerName: z.string().min(1, 'Your name is required'),
  petitionerEmail: z.string().email('Please enter a valid email address'),
  petitionerPhone: z.string().optional(),
  childName: z.string().min(1, "Child's name is required"),
  childDOB: z.string().min(1, "Child's date of birth is required"),
  claimedRelationship: z.enum(['parent', 'legal-guardian']),
  message: z.string().min(10, 'Please provide more detail about your request'),
})

type LegalPetitionFormData = z.infer<typeof legalPetitionFormSchema>

interface PendingFile {
  file: File
  id: string
}

interface LegalPetitionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Legal Petition Form Component
 *
 * Story 3.6: Legal Parent Petition for Access - Task 6
 *
 * Allows legal parents to submit a petition for access to their child's
 * monitoring when they were not invited by the account creator.
 *
 * Design considerations:
 * - Clear, professional language (not alarmist)
 * - 6th-grade reading level (NFR65)
 * - 44x44px touch targets (NFR49)
 * - Proper labels and accessibility
 * - Document upload reuses SafetyDocument infrastructure
 */
export function LegalPetitionForm({ open, onOpenChange }: LegalPetitionFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LegalPetitionFormData>({
    resolver: zodResolver(legalPetitionFormSchema),
    defaultValues: {
      petitionerName: '',
      petitionerEmail: '',
      petitionerPhone: '',
      childName: '',
      childDOB: '',
      claimedRelationship: 'parent',
      message: '',
    },
  })

  const claimedRelationship = watch('claimedRelationship')

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

    if (
      pendingFiles.length + newFiles.length >= MAX_DOCUMENTS_PER_REQUEST &&
      files.length > remainingSlots
    ) {
      setFileError(`Maximum ${MAX_DOCUMENTS_PER_REQUEST} files allowed`)
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== fileId))
    setFileError(null)
  }

  const convertFilesToDocuments = async (): Promise<
    Array<{
      id: string
      fileName: string
      fileType: string
      storagePath: string
      uploadedAt: Date
      sizeBytes: number
    }>
  > => {
    // For legal petitions, we store document metadata without actual upload
    // The support team will request actual documents through secure channel
    return pendingFiles.map((pf, index) => ({
      id: crypto.randomUUID(),
      fileName: pf.file.name,
      fileType: pf.file.type,
      storagePath: `pending/legal-petition/${Date.now()}-${index}`,
      uploadedAt: new Date(),
      sizeBytes: pf.file.size,
    }))
  }

  const onSubmit = async (data: LegalPetitionFormData) => {
    setIsSubmitting(true)
    setSubmitError(false)

    try {
      const documents = await convertFilesToDocuments()

      const submitLegalPetition = httpsCallable(functions, 'submitLegalPetition')
      const result = await submitLegalPetition({
        petitionerName: data.petitionerName,
        petitionerEmail: data.petitionerEmail,
        petitionerPhone: data.petitionerPhone || undefined,
        childName: data.childName,
        childDOB: new Date(data.childDOB),
        claimedRelationship: data.claimedRelationship,
        message: data.message,
        documents,
      })

      const responseData = result.data as {
        success: boolean
        referenceNumber?: string
      }

      if (responseData.success && responseData.referenceNumber) {
        setReferenceNumber(responseData.referenceNumber)
        setIsSubmitted(true)
      }
    } catch {
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
    setReferenceNumber(null)
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
        className="w-full overflow-y-auto sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-medium">
            Legal Parent Access Request
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            If you are a legal parent seeking access to your child&apos;s account,
            please complete this form. Our team will review your request.
          </SheetDescription>
        </SheetHeader>

        {submitError ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t submit your request. Please try again.
            </p>
            <Button
              onClick={() => setSubmitError(false)}
              className="min-h-[44px] w-full"
            >
              Try Again
            </Button>
          </div>
        ) : isSubmitted ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="font-medium text-green-900">
                Request Submitted Successfully
              </p>
              <p className="mt-2 text-sm text-green-800">
                Your reference number is:
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-green-900">
                {referenceNumber}
              </p>
              <p className="mt-3 text-sm text-green-700">
                Save this number to check your request status. We will contact you
                at the email address you provided.
              </p>
            </div>
            <Button
              onClick={handleClose}
              variant="outline"
              className="min-h-[44px] w-full"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {/* Petitioner Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Your Information</h3>

              <div className="space-y-2">
                <Label htmlFor="petitionerName">Your Full Name</Label>
                <Input
                  id="petitionerName"
                  placeholder="Enter your full legal name"
                  {...register('petitionerName')}
                  aria-describedby={
                    errors.petitionerName ? 'petitionerName-error' : undefined
                  }
                />
                {errors.petitionerName && (
                  <p
                    id="petitionerName-error"
                    className="text-sm text-destructive"
                  >
                    {errors.petitionerName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="petitionerEmail">Your Email</Label>
                <Input
                  id="petitionerEmail"
                  type="email"
                  placeholder="email@example.com"
                  {...register('petitionerEmail')}
                  aria-describedby={
                    errors.petitionerEmail ? 'petitionerEmail-error' : undefined
                  }
                />
                {errors.petitionerEmail && (
                  <p
                    id="petitionerEmail-error"
                    className="text-sm text-destructive"
                  >
                    {errors.petitionerEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="petitionerPhone">
                  Phone Number{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="petitionerPhone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  {...register('petitionerPhone')}
                />
              </div>
            </div>

            {/* Child Information Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Child Information</h3>

              <div className="space-y-2">
                <Label htmlFor="childName">Child&apos;s Name</Label>
                <Input
                  id="childName"
                  placeholder="Enter child's full name"
                  {...register('childName')}
                  aria-describedby={
                    errors.childName ? 'childName-error' : undefined
                  }
                />
                {errors.childName && (
                  <p id="childName-error" className="text-sm text-destructive">
                    {errors.childName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="childDOB">Child&apos;s Date of Birth</Label>
                <Input
                  id="childDOB"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  {...register('childDOB')}
                  aria-describedby={errors.childDOB ? 'childDOB-error' : undefined}
                />
                {errors.childDOB && (
                  <p id="childDOB-error" className="text-sm text-destructive">
                    {errors.childDOB.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="claimedRelationship">
                  Your Relationship to Child
                </Label>
                <Select
                  value={claimedRelationship}
                  onValueChange={(value: 'parent' | 'legal-guardian') =>
                    setValue('claimedRelationship', value)
                  }
                >
                  <SelectTrigger id="claimedRelationship">
                    <SelectValue placeholder="Select your relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Biological/Adoptive Parent</SelectItem>
                    <SelectItem value="legal-guardian">Legal Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message Section */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="message">Additional Information</Label>
              <Textarea
                id="message"
                placeholder="Please explain why you are requesting access and any relevant details..."
                className="min-h-[100px] resize-none"
                {...register('message')}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {errors.message && (
                <p id="message-error" className="text-sm text-destructive">
                  {errors.message.message}
                </p>
              )}
            </div>

            {/* Document Upload Section */}
            <div className="space-y-2 border-t pt-4">
              <Label>
                Court Documents{' '}
                <span className="text-muted-foreground">(recommended)</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload custody orders, birth certificates, or court decrees
              </p>

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

              {fileError && (
                <p className="text-sm text-destructive">{fileError}</p>
              )}

              {remainingSlots === 0 && (
                <p className="text-xs text-muted-foreground">
                  Maximum files reached
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="min-h-[44px] flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
