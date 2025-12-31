'use client'

/**
 * DemoTransitionCTA Component - Story 8.5.5
 *
 * Provides a clear call-to-action for parents to transition from demo mode
 * to setting up their real child.
 *
 * Acceptance Criteria:
 * - AC1: Clear "Start with Your Child" call-to-action is visible
 * - AC6: Transition prompts agreement creation flow
 */

export interface DemoTransitionCTAProps {
  /** Callback when user clicks "Start with Your Child" */
  onStartWithRealChild: () => void
  /** Callback when user wants to continue exploring */
  onContinueExploring?: () => void
  /** Whether user has explored key demo features (shows more prominent CTA) */
  hasExploredDemo?: boolean
  /** Whether the start action is in progress */
  starting?: boolean
}

/**
 * DemoTransitionCTA - Call-to-action for transitioning from demo to real child
 */
export function DemoTransitionCTA({
  onStartWithRealChild,
  onContinueExploring,
  hasExploredDemo = false,
  starting = false,
}: DemoTransitionCTAProps) {
  return (
    <div
      data-testid="demo-transition-cta"
      style={{
        backgroundColor: hasExploredDemo ? '#f0fdf4' : '#faf5ff',
        border: `2px ${hasExploredDemo ? 'solid' : 'dashed'} ${hasExploredDemo ? '#86efac' : '#c4b5fd'}`,
        borderRadius: '12px',
        padding: '20px',
        marginTop: '16px',
        textAlign: 'center',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <span data-testid="cta-icon" style={{ fontSize: '24px' }} aria-hidden="true">
          {hasExploredDemo ? '🚀' : '👋'}
        </span>
        <h3
          data-testid="cta-title"
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: hasExploredDemo ? '#166534' : '#5b21b6',
          }}
        >
          {hasExploredDemo ? 'Ready to Get Started?' : "When You're Ready"}
        </h3>
      </div>

      {/* Description */}
      <p
        data-testid="cta-description"
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          color: '#4b5563',
          lineHeight: 1.5,
        }}
      >
        {hasExploredDemo
          ? "You've seen how Fledgely works. Now let's set up monitoring for your child with a family agreement you create together."
          : "Take your time exploring the demo. When you're ready, you can start setting up Fledgely with your real child."}
      </p>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <button
          type="button"
          onClick={onStartWithRealChild}
          disabled={starting}
          data-testid="start-with-child-button"
          style={{
            width: '100%',
            padding: '14px 20px',
            backgroundColor: hasExploredDemo ? '#22c55e' : '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: starting ? 'wait' : 'pointer',
            opacity: starting ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {starting ? (
            'Starting...'
          ) : (
            <>
              <span aria-hidden="true">👨‍👩‍👧</span>
              Start with Your Child
            </>
          )}
        </button>

        {onContinueExploring && (
          <button
            type="button"
            onClick={onContinueExploring}
            data-testid="continue-exploring-button"
            style={{
              width: '100%',
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Continue Exploring Demo
          </button>
        )}
      </div>

      {/* What happens next hint */}
      <p
        data-testid="cta-hint"
        style={{
          margin: '16px 0 0 0',
          fontSize: '12px',
          color: '#9ca3af',
          fontStyle: 'italic',
        }}
      >
        {hasExploredDemo
          ? "You'll create a family agreement together with your child."
          : 'Demo will remain available for reference during setup.'}
      </p>
    </div>
  )
}
