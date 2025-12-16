'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { type TemplateSection } from '@fledgely/contracts'
import { DiffHighlight, DiffBadge } from './DiffIndicator'
import { type CustomRule, type DiffStatus } from './useTemplateDraft'
import { CustomRuleForm } from './CustomRuleForm'

/**
 * Props for RulesEditor
 */
export interface RulesEditorProps {
  /** Template rules to display */
  templateRules: TemplateSection[]
  /** IDs of enabled rules */
  enabledRuleIds: string[]
  /** IDs of disabled rules */
  disabledRuleIds: string[]
  /** Custom rules added by user */
  customRules: CustomRule[]
  /** Callback when a rule is enabled */
  onEnableRule: (ruleId: string) => void
  /** Callback when a rule is disabled */
  onDisableRule: (ruleId: string) => void
  /** Callback when a custom rule is added */
  onAddCustomRule: (rule: Omit<CustomRule, 'id' | 'createdAt'>) => void
  /** Callback when a custom rule is removed */
  onRemoveCustomRule: (ruleId: string) => void
  /** Callback when a custom rule is updated */
  onUpdateCustomRule: (ruleId: string, updates: Partial<Omit<CustomRule, 'id' | 'createdAt'>>) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Rule category icons
 */
const CATEGORY_ICONS: Record<string, string> = {
  time: '⏰',
  apps: '📱',
  monitoring: '👁️',
  content: '🔒',
  other: '📋',
}

/**
 * Get diff status for a rule
 */
function getRuleDiffStatus(
  ruleId: string,
  disabledRuleIds: string[],
  isCustom: boolean
): DiffStatus {
  if (isCustom) return 'added'
  if (disabledRuleIds.includes(ruleId)) return 'removed'
  return 'original'
}

/**
 * RulesEditor Component
 *
 * Story 4.5: Template Customization Preview - Task 3
 * AC #3: Parent can add custom rules not in template
 * AC #4: Parent can remove template rules they don't want
 *
 * @param props - Component props
 */
export function RulesEditor({
  templateRules,
  enabledRuleIds,
  disabledRuleIds,
  customRules,
  onEnableRule,
  onDisableRule,
  onAddCustomRule,
  onRemoveCustomRule,
  onUpdateCustomRule,
  disabled = false,
  className,
}: RulesEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  const hasChanges = disabledRuleIds.length > 0 || customRules.length > 0
  const totalChanges = disabledRuleIds.length + customRules.length

  const handleToggleRule = useCallback((ruleId: string, isEnabled: boolean) => {
    if (disabled) return
    if (isEnabled) {
      onDisableRule(ruleId)
    } else {
      onEnableRule(ruleId)
    }
  }, [disabled, onEnableRule, onDisableRule])

  const handleAddRule = useCallback((rule: Omit<CustomRule, 'id' | 'createdAt'>) => {
    onAddCustomRule(rule)
    setShowAddForm(false)
  }, [onAddCustomRule])

  const handleEditRule = useCallback((ruleId: string, updates: Partial<Omit<CustomRule, 'id' | 'createdAt'>>) => {
    onUpdateCustomRule(ruleId, updates)
    setEditingRuleId(null)
  }, [onUpdateCustomRule])

  const handleRemoveRule = useCallback((ruleId: string) => {
    onRemoveCustomRule(ruleId)
  }, [onRemoveCustomRule])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            <span aria-hidden="true">📜</span> Agreement Rules
          </h3>
          <p className="text-sm text-gray-500">
            Customize which rules to include in the agreement
          </p>
        </div>
        {hasChanges && (
          <DiffBadge status="modified" label={`${totalChanges} change${totalChanges > 1 ? 's' : ''}`} />
        )}
      </div>

      {/* Template Rules */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Template Rules</h4>
        <div className="space-y-2" role="list" aria-label="Template rules">
          {templateRules.map((rule) => {
            const isEnabled = enabledRuleIds.includes(rule.id)
            const status = getRuleDiffStatus(rule.id, disabledRuleIds, false)
            const categoryIcon = CATEGORY_ICONS[rule.category] || CATEGORY_ICONS.other

            return (
              <DiffHighlight key={rule.id} status={status} className="!p-2">
                <div className="flex items-center gap-3" role="listitem">
                  {/* Toggle switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`${isEnabled ? 'Disable' : 'Enable'} rule: ${rule.title}`}
                    onClick={() => handleToggleRule(rule.id, isEnabled)}
                    disabled={disabled}
                    className={cn(
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      isEnabled ? 'bg-blue-600' : 'bg-gray-200',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Rule content */}
                  <div className={cn('flex-1 min-w-0', !isEnabled && 'opacity-60')}>
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">{categoryIcon}</span>
                      <span className={cn('font-medium text-gray-900', !isEnabled && 'line-through')}>
                        {rule.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{rule.description}</p>
                  </div>
                </div>
              </DiffHighlight>
            )
          })}
        </div>
      </div>

      {/* Custom Rules */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Custom Rules</h4>
          {customRules.length > 0 && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
              {customRules.length} added
            </span>
          )}
        </div>

        {customRules.length > 0 && (
          <div className="space-y-2" role="list" aria-label="Custom rules">
            {customRules.map((rule) => {
              const categoryIcon = CATEGORY_ICONS[rule.category] || CATEGORY_ICONS.other

              if (editingRuleId === rule.id) {
                return (
                  <CustomRuleForm
                    key={rule.id}
                    initialValues={rule}
                    onSubmit={(values) => handleEditRule(rule.id, values)}
                    onCancel={() => setEditingRuleId(null)}
                  />
                )
              }

              return (
                <DiffHighlight key={rule.id} status="added" className="!p-2">
                  <div className="flex items-center gap-3" role="listitem">
                    {/* Custom rule indicator */}
                    <div
                      className="h-6 w-11 flex items-center justify-center bg-green-100 rounded-full"
                      aria-hidden="true"
                    >
                      <span className="text-xs text-green-600 font-medium">NEW</span>
                    </div>

                    {/* Rule content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{categoryIcon}</span>
                        <span className="font-medium text-gray-900">{rule.title}</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{rule.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingRuleId(rule.id)}
                        disabled={disabled}
                        className={cn(
                          'p-2 text-gray-400 hover:text-gray-600 rounded',
                          'min-h-[44px] min-w-[44px]', // NFR49: Touch target
                          'focus:outline-none focus:ring-2 focus:ring-blue-500',
                          disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        aria-label={`Edit rule: ${rule.title}`}
                      >
                        <span aria-hidden="true">✏️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.id)}
                        disabled={disabled}
                        className={cn(
                          'p-2 text-gray-400 hover:text-red-600 rounded',
                          'min-h-[44px] min-w-[44px]', // NFR49: Touch target
                          'focus:outline-none focus:ring-2 focus:ring-red-500',
                          disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        aria-label={`Remove rule: ${rule.title}`}
                      >
                        <span aria-hidden="true">🗑️</span>
                      </button>
                    </div>
                  </div>
                </DiffHighlight>
              )
            })}
          </div>
        )}

        {/* Add custom rule form or button */}
        {showAddForm ? (
          <CustomRuleForm
            onSubmit={handleAddRule}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={disabled}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-4',
              'border-2 border-dashed border-gray-300 rounded-lg',
              'text-gray-600 hover:border-blue-400 hover:text-blue-600',
              'transition-colors',
              'min-h-[44px]', // NFR49: Touch target
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span aria-hidden="true">➕</span>
            Add Custom Rule
          </button>
        )}
      </div>

      {/* Summary */}
      {hasChanges && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-sm text-gray-700">
            <strong>Summary:</strong>{' '}
            {enabledRuleIds.length} rules enabled
            {disabledRuleIds.length > 0 && `, ${disabledRuleIds.length} disabled`}
            {customRules.length > 0 && `, ${customRules.length} custom added`}
          </p>
        </div>
      )}
    </div>
  )
}
