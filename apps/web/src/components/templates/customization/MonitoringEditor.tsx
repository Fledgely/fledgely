'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { type MonitoringLevel } from '@fledgely/contracts'
import { DiffBadge } from './DiffIndicator'
import { type DiffStatus } from './useTemplateDraft'

/**
 * Props for MonitoringEditor
 */
export interface MonitoringEditorProps {
  /** Current monitoring level */
  level: MonitoringLevel
  /** Original monitoring level from template (for comparison) */
  originalLevel?: MonitoringLevel
  /** Callback when level changes */
  onChange: (level: MonitoringLevel) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Monitoring level configuration
 */
interface LevelConfig {
  label: string
  emoji: string
  description: string
  features: string[]
  privacyNote: string
}

const LEVEL_CONFIGS: Record<MonitoringLevel, LevelConfig> = {
  light: {
    label: 'Light',
    emoji: '🌱',
    description: 'Trust-based monitoring with minimal oversight',
    features: [
      'Daily screen time summary',
      'Weekly activity report',
      'No real-time tracking',
    ],
    privacyNote: 'Maximum privacy - only aggregated data collected',
  },
  moderate: {
    label: 'Moderate',
    emoji: '🌿',
    description: 'Balanced approach with key insights',
    features: [
      'Real-time screen time tracking',
      'App usage categories',
      'Bedtime compliance alerts',
      'Weekly detailed reports',
    ],
    privacyNote: 'Balanced - app categories tracked, not specific content',
  },
  comprehensive: {
    label: 'Comprehensive',
    emoji: '🌳',
    description: 'Detailed oversight for younger children',
    features: [
      'Real-time screen time tracking',
      'Individual app usage tracking',
      'Content category insights',
      'Location sharing (optional)',
      'Daily detailed reports',
    ],
    privacyNote: 'Detailed tracking - recommended for ages 5-10',
  },
}

const LEVELS: MonitoringLevel[] = ['light', 'moderate', 'comprehensive']

/**
 * Get diff status for monitoring level
 */
function getDiffStatus(current: MonitoringLevel, original?: MonitoringLevel): DiffStatus {
  if (original === undefined) return 'original'
  return current !== original ? 'modified' : 'original'
}

/**
 * MonitoringEditor Component
 *
 * Story 4.5: Template Customization Preview - Task 4
 * AC #1: Parent can modify monitoring level
 * AC #2: Changes are highlighted compared to original template
 *
 * @param props - Component props
 */
export function MonitoringEditor({
  level,
  originalLevel,
  onChange,
  disabled = false,
  className,
}: MonitoringEditorProps) {
  const diffStatus = getDiffStatus(level, originalLevel)

  const handleLevelSelect = useCallback((newLevel: MonitoringLevel) => {
    if (!disabled) {
      onChange(newLevel)
    }
  }, [onChange, disabled])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            <span aria-hidden="true">👁️</span> Monitoring Level
          </h3>
          <p className="text-sm text-gray-500">
            Choose how much oversight you&apos;d like
          </p>
        </div>
        {diffStatus === 'modified' && <DiffBadge status="modified" label="Modified" />}
      </div>

      {/* Level cards */}
      <div
        role="radiogroup"
        aria-label="Monitoring level selection"
        className="space-y-3"
      >
        {LEVELS.map((levelOption) => {
          const config = LEVEL_CONFIGS[levelOption]
          const isSelected = level === levelOption
          const isOriginal = originalLevel === levelOption

          return (
            <button
              key={levelOption}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleLevelSelect(levelOption)}
              disabled={disabled}
              className={cn(
                'w-full text-left rounded-lg border-2 p-4 transition-all',
                'min-h-[44px]', // NFR49: Touch target
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
                disabled && 'opacity-50 cursor-not-allowed',
                isSelected && diffStatus === 'modified' && 'border-amber-500 bg-amber-50'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Radio indicator */}
                <div
                  className={cn(
                    'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    isSelected
                      ? diffStatus === 'modified'
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  )}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-lg">{config.emoji}</span>
                    <span className="font-semibold text-gray-900">{config.label}</span>
                    {isOriginal && !isSelected && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        Original
                      </span>
                    )}
                    {isSelected && diffStatus === 'modified' && (
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        Changed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                </div>
              </div>

              {/* Expanded details when selected */}
              {isSelected && (
                <div className="mt-4 ml-8 space-y-3">
                  {/* Features list */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                      What&apos;s included
                    </p>
                    <ul className="space-y-1.5">
                      {config.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" aria-hidden="true" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Privacy note */}
                  <div className="rounded-md bg-gray-100 p-2.5">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Privacy:</span> {config.privacyNote}
                    </p>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Comparison note */}
      {originalLevel && level !== originalLevel && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            <span aria-hidden="true">↔️</span>{' '}
            Changed from <strong>{LEVEL_CONFIGS[originalLevel].label}</strong> to{' '}
            <strong>{LEVEL_CONFIGS[level].label}</strong>
          </p>
        </div>
      )}
    </div>
  )
}
