'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTimeUntilExpiry } from '@fledgely/contracts'
import { Copy, Check, Clock, Link as LinkIcon, Share2 } from 'lucide-react'

/**
 * Props for the InvitationLink component
 */
export interface InvitationLinkProps {
  /** The full invitation link URL */
  invitationLink: string
  /** When the invitation expires */
  expiresAt: Date
  /** Additional CSS classes */
  className?: string
}

/**
 * InvitationLink Component
 *
 * Displays an invitation link with copy functionality.
 * Shows expiry time and provides clear feedback when copied.
 *
 * Story 3.1: Co-Parent Invitation Generation
 *
 * Features:
 * - Copy to clipboard with visual feedback
 * - Fallback for browsers without Clipboard API
 * - Expiry countdown display
 * - Share button (Web Share API if available)
 *
 * Accessibility features:
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 * - aria-live announcements for copy feedback
 * - Proper button labels
 */
export function InvitationLink({
  invitationLink,
  expiresAt,
  className = '',
}: InvitationLinkProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  /**
   * Copy link to clipboard with fallback
   */
  const handleCopy = useCallback(async () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(invitationLink)
      } else {
        // Fallback: select and copy from input
        if (inputRef.current) {
          inputRef.current.select()
          inputRef.current.setSelectionRange(0, 99999) // For mobile
          document.execCommand('copy')
          inputRef.current.blur()
        }
      }

      setCopied(true)
      setCopyError(false)

      // Reset after 2 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setCopyError(true)
      setCopied(false)

      // Reset error after 3 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setCopyError(false)
      }, 3000)
    }
  }, [invitationLink])

  /**
   * Share link using Web Share API (if available)
   */
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my family on Fledgely',
          text: 'I\'m inviting you to join my family. Click the link to get started.',
          url: invitationLink,
        })
      } catch (err) {
        // User cancelled or share failed - ignore
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    }
  }, [invitationLink])

  // Check if Web Share API is available
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Link display */}
      <div className="space-y-2">
        <Label htmlFor="invitation-link" className="sr-only">
          Invitation link
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="invitation-link"
              ref={inputRef}
              type="text"
              value={invitationLink}
              readOnly
              className="pl-10 pr-4 font-mono text-sm min-h-[44px]"
              aria-label="Invitation link"
            />
          </div>
          <Button
            type="button"
            variant={copied ? 'default' : 'outline'}
            onClick={handleCopy}
            className={`min-h-[44px] min-w-[44px] ${
              copied ? 'bg-green-600 hover:bg-green-700' : ''
            }`}
            aria-label={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          {canShare && (
            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              className="min-h-[44px] min-w-[44px]"
              aria-label="Share link"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Copy feedback */}
      <div
        className="h-6"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {copied && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="h-4 w-4" aria-hidden="true" />
            Copied to clipboard!
          </p>
        )}
        {copyError && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Could not copy. Please select and copy the link manually.
          </p>
        )}
      </div>

      {/* Expiry info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" aria-hidden="true" />
        <span>
          This link expires in <strong>{getTimeUntilExpiry(expiresAt)}</strong>
        </span>
      </div>

      {/* Instructions */}
      <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
        <p className="font-medium">How to share:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Copy the link above</li>
          <li>Send it to the person you want to invite</li>
          <li>They click the link to join your family</li>
        </ol>
      </div>
    </div>
  )
}
