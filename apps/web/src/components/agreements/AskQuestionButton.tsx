/**
 * Ask Question Button Component.
 *
 * Story 5.8: Child Agreement Viewing - AC5
 *
 * Child-friendly button for asking questions about agreement terms.
 * Sends a message to the parent about a specific rule.
 */

'use client'

interface AskQuestionButtonProps {
  /** ID of the term this question relates to */
  termId: string
  /** Text of the term for context */
  termText: string
  /** Callback when question is asked */
  onAskQuestion: (termId: string, termText: string) => void
  /** Whether question is being sent */
  isLoading?: boolean
  /** Whether question has been sent for this term */
  hasSent?: boolean
  /** Whether button is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

export function AskQuestionButton({
  termId,
  termText,
  onAskQuestion,
  isLoading = false,
  hasSent = false,
  disabled = false,
  className = '',
}: AskQuestionButtonProps) {
  const isDisabled = disabled || isLoading || hasSent

  const handleClick = () => {
    if (!isDisabled) {
      onAskQuestion(termId, termText)
    }
  }

  // Determine button content based on state
  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <span className="animate-spin" aria-hidden="true">
            ↻
          </span>
          <span className="sr-only">Sending question</span>
          <span aria-hidden="true">Sending...</span>
        </>
      )
    }

    if (hasSent) {
      return (
        <>
          <span aria-hidden="true">✓</span>
          <span>Sent!</span>
        </>
      )
    }

    return (
      <>
        <span
          className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold"
          aria-hidden="true"
        >
          ?
        </span>
        <span>Ask a question</span>
      </>
    )
  }

  // Determine button styles based on state
  const getButtonStyles = () => {
    const baseStyles =
      'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] min-w-[44px]'

    if (hasSent) {
      return `${baseStyles} bg-green-100 text-green-700 cursor-default`
    }

    if (isDisabled) {
      return `${baseStyles} bg-gray-100 text-gray-400 cursor-not-allowed`
    }

    return `${baseStyles} bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`${getButtonStyles()} ${className}`}
      aria-label={
        hasSent
          ? 'Question sent to parent'
          : isLoading
            ? 'Sending question to parent'
            : 'Ask a question about this rule'
      }
      data-testid={`ask-question-button-${termId}`}
    >
      {getButtonContent()}
    </button>
  )
}
