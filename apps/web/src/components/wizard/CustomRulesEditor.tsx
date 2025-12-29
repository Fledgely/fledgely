/**
 * Custom Rules Editor Component.
 *
 * Story 4.5: Template Customization Preview - AC3, AC4
 *
 * Allows parents to add custom rules, remove template rules,
 * and manage the overall rule set.
 */

'use client'

import { useState } from 'react'
import type { CustomRule, RuleCategory } from '../../hooks/useTemplateCustomization'
import { MAX_CONDITIONS } from '../../hooks/useTemplateCustomization'
import { ChangeHighlightBadge } from './ChangeHighlightBadge'

interface CustomRulesEditorProps {
  templateRules: string[]
  customRules: CustomRule[]
  isTemplateRuleRemoved: (index: number) => boolean
  onAddRule: (text: string, category: RuleCategory) => boolean
  onRemoveCustomRule: (ruleId: string) => void
  onRemoveTemplateRule: (index: number) => void
  onRestoreTemplateRule: (index: number) => void
  totalRuleCount: number
  canAddMoreRules: boolean
}

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  time: 'Time Limits',
  content: 'Content Rules',
  behavior: 'Behavior',
  other: 'Other',
}

export function CustomRulesEditor({
  templateRules,
  customRules,
  isTemplateRuleRemoved,
  onAddRule,
  onRemoveCustomRule,
  onRemoveTemplateRule,
  onRestoreTemplateRule,
  totalRuleCount,
  canAddMoreRules,
}: CustomRulesEditorProps) {
  const [newRuleText, setNewRuleText] = useState('')
  const [newRuleCategory, setNewRuleCategory] = useState<RuleCategory>('other')
  const [error, setError] = useState<string | null>(null)

  const handleAddRule = () => {
    if (!newRuleText.trim()) {
      setError('Please enter a rule')
      return
    }
    if (!canAddMoreRules) {
      setError(`Maximum ${MAX_CONDITIONS} rules allowed`)
      return
    }
    const success = onAddRule(newRuleText.trim(), newRuleCategory)
    if (success) {
      setNewRuleText('')
      setNewRuleCategory('other')
      setError(null)
    } else {
      setError(`Maximum ${MAX_CONDITIONS} rules allowed`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddRule()
    }
  }

  const activeTemplateRules = templateRules.filter((_, index) => !isTemplateRuleRemoved(index))
  const removedTemplateRules = templateRules
    .map((rule, index) => ({ rule, index }))
    .filter(({ index }) => isTemplateRuleRemoved(index))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Agreement Rules</h3>
        <span
          className={`text-sm ${totalRuleCount >= MAX_CONDITIONS ? 'text-red-600' : 'text-gray-500'}`}
          aria-live="polite"
        >
          {totalRuleCount} / {MAX_CONDITIONS} rules
        </span>
      </div>

      {/* Template Rules Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Template Rules</h4>
        {activeTemplateRules.length === 0 && removedTemplateRules.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No template rules</p>
        ) : (
          <ul className="space-y-2" role="list" aria-label="Template rules">
            {templateRules.map((rule, index) => {
              const isRemoved = isTemplateRuleRemoved(index)
              return (
                <li
                  key={`template-${index}`}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border
                    ${isRemoved ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
                  `}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span
                      className={`text-sm ${isRemoved ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                    >
                      {rule}
                    </span>
                    {isRemoved && <ChangeHighlightBadge type="removed" />}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      isRemoved ? onRestoreTemplateRule(index) : onRemoveTemplateRule(index)
                    }
                    className={`
                      px-3 py-1.5 text-sm font-medium rounded
                      min-h-[44px] min-w-[60px]
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${
                        isRemoved
                          ? 'text-green-700 hover:text-green-800 focus:ring-green-500'
                          : 'text-red-700 hover:text-red-800 focus:ring-red-500'
                      }
                    `}
                    aria-label={isRemoved ? `Restore rule: ${rule}` : `Remove rule: ${rule}`}
                  >
                    {isRemoved ? 'Restore' : 'Remove'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Custom Rules Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Custom Rules</h4>
        {customRules.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No custom rules added yet</p>
        ) : (
          <ul className="space-y-2" role="list" aria-label="Custom rules">
            {customRules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-green-50 border-green-200"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-gray-900">{rule.text}</span>
                  <ChangeHighlightBadge type="added" />
                  <span className="text-xs text-gray-500">({CATEGORY_LABELS[rule.category]})</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCustomRule(rule.id)}
                  className="px-3 py-1.5 text-sm font-medium text-red-700 hover:text-red-800 rounded min-h-[44px] min-w-[60px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label={`Remove custom rule: ${rule.text}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add New Rule Form */}
      <div className="space-y-3 p-4 rounded-lg border border-gray-200 bg-white">
        <h4 className="text-sm font-medium text-gray-700">Add Custom Rule</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="new-rule-text" className="sr-only">
              Rule text
            </label>
            <input
              id="new-rule-text"
              type="text"
              value={newRuleText}
              onChange={(e) => {
                setNewRuleText(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter a new rule..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              disabled={!canAddMoreRules}
              aria-describedby={error ? 'rule-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="new-rule-category" className="sr-only">
              Category
            </label>
            <select
              id="new-rule-category"
              value={newRuleCategory}
              onChange={(e) => setNewRuleCategory(e.target.value as RuleCategory)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              disabled={!canAddMoreRules}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddRule}
            disabled={!canAddMoreRules || !newRuleText.trim()}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg min-h-[44px] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Rule
          </button>
        </div>
        {error && (
          <p id="rule-error" className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {!canAddMoreRules && (
          <p className="text-sm text-yellow-600">
            Maximum of {MAX_CONDITIONS} rules reached. Remove a rule to add more.
          </p>
        )}
      </div>
    </div>
  )
}

export default CustomRulesEditor
