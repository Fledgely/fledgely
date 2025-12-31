'use client'

/**
 * ViewToggle Component - Story 19B.2
 *
 * Toggle button to switch between grid and timeline views.
 *
 * Task 5: Add View Toggle (AC: #5)
 * - 5.1 Create ViewToggle component (grid/timeline icons)
 */

/**
 * View mode options
 */
export type ViewMode = 'grid' | 'timeline'

/**
 * Props for ViewToggle
 */
export interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
}

/**
 * Styles
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'inline-flex',
    backgroundColor: '#e0f2fe', // sky-100
    borderRadius: '8px',
    padding: '4px',
    gap: '4px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
  },
  buttonActive: {
    backgroundColor: '#0ea5e9', // sky-500
    color: 'white',
  },
  buttonInactive: {
    backgroundColor: 'transparent',
    color: '#0369a1', // sky-700
  },
}

/**
 * ViewToggle - Switch between grid and timeline views
 */
export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <>
      {/* Focus styling for accessibility */}
      <style>
        {`
          .view-toggle-btn:focus {
            outline: 2px solid #0ea5e9;
            outline-offset: 2px;
          }
          .view-toggle-btn:focus:not(:focus-visible) {
            outline: none;
          }
        `}
      </style>
      <div
        style={styles.container}
        role="radiogroup"
        aria-label="View mode"
        data-testid="view-toggle"
      >
        <button
          type="button"
          className="view-toggle-btn"
          style={{
            ...styles.button,
            ...(currentView === 'grid' ? styles.buttonActive : styles.buttonInactive),
          }}
          onClick={() => onViewChange('grid')}
          role="radio"
          aria-checked={currentView === 'grid'}
          aria-label="Grid view"
          data-testid="view-toggle-grid"
        >
          <span role="img" aria-hidden="true">
            ⊞
          </span>
        </button>
        <button
          type="button"
          className="view-toggle-btn"
          style={{
            ...styles.button,
            ...(currentView === 'timeline' ? styles.buttonActive : styles.buttonInactive),
          }}
          onClick={() => onViewChange('timeline')}
          role="radio"
          aria-checked={currentView === 'timeline'}
          aria-label="Timeline view"
          data-testid="view-toggle-timeline"
        >
          <span role="img" aria-hidden="true">
            ☰
          </span>
        </button>
      </div>
    </>
  )
}
