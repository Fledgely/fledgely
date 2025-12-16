'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'

interface TemplateSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

/**
 * Template Search Input Component
 *
 * Story 4.1: Template Library Structure - Task 5.1
 *
 * Provides debounced search input for filtering templates by name or description.
 * Debouncing prevents excessive filtering on each keystroke.
 *
 * Accessibility features:
 * - ARIA label for screen readers
 * - Clear button for easy reset
 * - Keyboard accessible (NFR43)
 * - 44x44px minimum touch targets (NFR49)
 * - Focus indicators (NFR46)
 *
 * @example
 * ```tsx
 * <TemplateSearchInput
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="Search templates..."
 *   debounceMs={300}
 * />
 * ```
 */
export function TemplateSearchInput({
  value,
  onChange,
  placeholder = 'Search templates...',
  debounceMs = 300,
}: TemplateSearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      onChange(newValue)
    }, debounceMs)
  }, [onChange, debounceMs])

  // Clear input
  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      {/* Search icon */}
      <div
        className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
        aria-hidden="true"
      >
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input */}
      <Input
        ref={inputRef}
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10 pr-10 min-h-[44px]"
        aria-label="Search templates by name or description"
      />

      {/* Clear button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:text-gray-600 dark:focus:text-gray-300"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
