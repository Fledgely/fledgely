'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SessionTerm, SessionTermStatus } from '@fledgely/contracts'
import { AgreementTermCard } from './AgreementTermCard'

/**
 * Props for the DraggableTermCard component
 */
export interface DraggableTermCardProps {
  /** The term to display */
  term: SessionTerm
  /** Whether the card is selected */
  isSelected?: boolean
  /** Whether drag is disabled for this card */
  isDragDisabled?: boolean
  /** Callback when the card is clicked */
  onClick?: (term: SessionTerm) => void
  /** Callback when edit is requested */
  onEdit?: (term: SessionTerm) => void
  /** Callback when status change is requested */
  onStatusChange?: (term: SessionTerm, status: SessionTermStatus) => void
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * DraggableTermCard Component
 *
 * Story 5.2: Visual Agreement Builder - Task 4
 *
 * Wrapper component that adds drag-and-drop functionality to AgreementTermCard.
 * Uses @dnd-kit/sortable for accessible, keyboard-friendly drag-and-drop.
 *
 * Features:
 * - Drag handle with visual feedback (AC #2)
 * - Keyboard accessible: Space to pick up, Arrow keys to move, Space to drop (NFR43)
 * - Screen reader announcements for drag states (NFR42)
 * - Touch-friendly on mobile devices (NFR49)
 * - Visual transform during drag operation
 *
 * @example
 * ```tsx
 * <DndContext onDragEnd={handleDragEnd}>
 *   <SortableContext items={terms.map(t => t.id)}>
 *     {terms.map(term => (
 *       <DraggableTermCard
 *         key={term.id}
 *         term={term}
 *         onClick={handleClick}
 *       />
 *     ))}
 *   </SortableContext>
 * </DndContext>
 * ```
 */
export function DraggableTermCard({
  term,
  isSelected = false,
  isDragDisabled = false,
  onClick,
  onEdit,
  onStatusChange,
  className = '',
  'data-testid': dataTestId,
}: DraggableTermCardProps) {
  // Set up sortable hook from @dnd-kit
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: term.id,
    disabled: isDragDisabled,
  })

  // Compute transform style
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Ensure the card is above others when dragging
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'cursor-grabbing' : isDragDisabled ? '' : 'cursor-grab'}`}
      data-testid={dataTestId ?? `draggable-term-${term.id}`}
      data-is-dragging={isDragging}
      data-is-sorting={isSorting}
    >
      {/* Drag Handle (only visible when not disabled) */}
      {!isDragDisabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-50 hover:opacity-100 transition-opacity"
          aria-label={`Drag to reorder ${term.type} term`}
          data-testid={`drag-handle-${term.id}`}
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {/* Grip dots icon */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 6h.01M12 6h.01M16 6h.01M8 12h.01M12 12h.01M16 12h.01M8 18h.01M12 18h.01M16 18h.01"
            />
          </svg>
        </div>
      )}

      {/* Inner Term Card with left padding for drag handle */}
      <div className={isDragDisabled ? '' : 'pl-8'}>
        <AgreementTermCard
          term={term}
          isSelected={isSelected}
          isDragging={isDragging}
          isDragDisabled={isDragDisabled}
          onClick={onClick}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
          className={className}
        />
      </div>
    </div>
  )
}

export default DraggableTermCard
