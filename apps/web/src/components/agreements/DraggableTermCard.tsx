/**
 * Draggable Term Card Component.
 *
 * Story 5.2: Visual Agreement Builder - AC2
 *
 * Wrapper component that makes AgreementTermCard draggable using @dnd-kit.
 * Supports keyboard navigation for accessibility (NFR42).
 */

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AgreementTerm } from '@fledgely/shared/contracts'
import { AgreementTermCard } from './AgreementTermCard'

interface DraggableTermCardProps {
  /** The agreement term to display */
  term: AgreementTerm
  /** Whether the card is selected */
  isSelected?: boolean
  /** Called when the card is clicked */
  onClick?: () => void
  /** Called when edit is requested */
  onEdit?: () => void
  /** Called when delete is requested */
  onDelete?: () => void
}

export function DraggableTermCard({
  term,
  isSelected = false,
  onClick,
  onEdit,
  onDelete,
}: DraggableTermCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: term.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`draggable-term-${term.id}`}
    >
      <AgreementTermCard
        term={term}
        isSelected={isSelected}
        showDragHandle={true}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
        className={isDragging ? 'shadow-lg' : ''}
        data-testid={`term-card-${term.id}`}
      />
    </div>
  )
}

export default DraggableTermCard
