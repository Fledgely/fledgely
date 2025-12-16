'use client'

import { useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { type AgreementTemplate } from '@fledgely/contracts'
import { useTemplateDraft } from './useTemplateDraft'
import { CustomizationHeader } from './CustomizationHeader'
import { ScreenTimeEditor } from './ScreenTimeEditor'
import { MonitoringEditor } from './MonitoringEditor'
import { RulesEditor } from './RulesEditor'

/**
 * Props for TemplateCustomizationEditor
 */
export interface TemplateCustomizationEditorProps {
  /** Template to customize */
  template: AgreementTemplate
  /** Child ID for draft persistence */
  childId: string
  /** Callback when customization is saved */
  onSave?: () => void
  /** Callback when editor is closed */
  onClose?: () => void
  /** Callback when "Start Co-Creation" is clicked */
  onStartCoCreation?: () => void
  /** Additional class names */
  className?: string
}

/**
 * Get screen time from template
 */
function getTemplateScreenTime(template: AgreementTemplate): { weekday: number; weekend: number } {
  // Default values if not found in template
  let weekday = 60
  let weekend = 90

  // Look for screen time settings in template sections
  for (const section of template.sections) {
    if (section.category === 'time' && section.content) {
      // Parse screen time from content (simplified)
      const timeMatch = section.content.match(/(\d+)\s*(?:minutes?|min)/i)
      if (timeMatch) {
        weekday = parseInt(timeMatch[1], 10)
        weekend = Math.round(weekday * 1.5) // Default weekend is 1.5x weekday
      }
    }
  }

  return { weekday, weekend }
}

/**
 * Get bedtime from template
 */
function getTemplateBedtime(template: AgreementTemplate): string {
  // Default based on age group
  const ageDefaults: Record<string, string> = {
    '5-7': '19:00',
    '8-10': '20:00',
    '11-13': '21:00',
    '14-16': '22:00',
  }

  return ageDefaults[template.ageGroup] || '20:00'
}

/**
 * TemplateCustomizationEditor Component
 *
 * Story 4.5: Template Customization Preview - Task 1
 * AC #1: Parent can modify any template field (screen time, rules, monitoring)
 * AC #2: Changes are highlighted compared to original template
 * AC #5: Customized template is saved as "draft" for this child
 *
 * @param props - Component props
 */
export function TemplateCustomizationEditor({
  template,
  childId,
  onSave,
  onClose,
  onStartCoCreation,
  className,
}: TemplateCustomizationEditorProps) {
  const {
    draft,
    isLoading,
    initializeDraft,
    setScreenTime,
    setWeekendScreenTime,
    setMonitoringLevel,
    enableRule,
    disableRule,
    addCustomRule,
    removeCustomRule,
    updateCustomRule,
    revertToOriginal,
    getChangeCount,
  } = useTemplateDraft(childId)

  // Initialize draft when template changes or no draft exists
  useEffect(() => {
    if (!isLoading && !draft) {
      initializeDraft(template, childId)
    }
  }, [template, childId, draft, isLoading, initializeDraft])

  // Calculate original values from template
  const originalValues = useMemo(() => {
    const screenTime = getTemplateScreenTime(template)
    return {
      weekdayScreenTime: screenTime.weekday,
      weekendScreenTime: screenTime.weekend,
      bedtime: getTemplateBedtime(template),
      monitoringLevel: template.monitoringLevel,
    }
  }, [template])

  // Get current values from draft or fallback to original
  const currentValues = useMemo(() => {
    if (!draft) {
      return {
        weekdayScreenTime: originalValues.weekdayScreenTime,
        weekendScreenTime: originalValues.weekendScreenTime,
        monitoringLevel: template.monitoringLevel,
        enabledRuleIds: template.sections.map((s) => s.id),
        disabledRuleIds: [] as string[],
        customRules: [],
      }
    }

    return {
      weekdayScreenTime: draft.customizations.screenTimeMinutes ?? originalValues.weekdayScreenTime,
      weekendScreenTime: draft.customizations.weekendScreenTimeMinutes ?? originalValues.weekendScreenTime,
      monitoringLevel: draft.customizations.monitoringLevel ?? template.monitoringLevel,
      enabledRuleIds: draft.customizations.rules.enabled,
      disabledRuleIds: draft.customizations.rules.disabled,
      customRules: draft.customizations.rules.custom,
    }
  }, [draft, template, originalValues])

  const handleRevert = useCallback(() => {
    revertToOriginal()
    onSave?.()
  }, [revertToOriginal, onSave])

  const handleStartCoCreation = useCallback(() => {
    onSave?.()
    onStartCoCreation?.()
  }, [onSave, onStartCoCreation])

  const changeCount = draft ? getChangeCount() : 0

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <CustomizationHeader
        templateName={template.name}
        changeCount={changeCount}
        lastModified={draft?.modifiedAt}
        onRevert={handleRevert}
        onClose={onClose}
        className="px-6 pt-4"
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* Screen Time Section */}
        <section aria-labelledby="screen-time-heading">
          <ScreenTimeEditor
            weekdayMinutes={currentValues.weekdayScreenTime}
            weekendMinutes={currentValues.weekendScreenTime}
            originalWeekdayMinutes={originalValues.weekdayScreenTime}
            originalWeekendMinutes={originalValues.weekendScreenTime}
            onWeekdayChange={setScreenTime}
            onWeekendChange={setWeekendScreenTime}
          />
        </section>

        <hr className="border-gray-200" />

        {/* Monitoring Section */}
        <section aria-labelledby="monitoring-heading">
          <MonitoringEditor
            level={currentValues.monitoringLevel}
            originalLevel={originalValues.monitoringLevel}
            onChange={setMonitoringLevel}
          />
        </section>

        <hr className="border-gray-200" />

        {/* Rules Section */}
        <section aria-labelledby="rules-heading">
          <RulesEditor
            templateRules={template.sections}
            enabledRuleIds={currentValues.enabledRuleIds}
            disabledRuleIds={currentValues.disabledRuleIds}
            customRules={currentValues.customRules}
            onEnableRule={enableRule}
            onDisableRule={disableRule}
            onAddCustomRule={addCustomRule}
            onRemoveCustomRule={removeCustomRule}
            onUpdateCustomRule={updateCustomRule}
          />
        </section>
      </div>

      {/* Footer with action buttons */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {changeCount > 0 ? (
              <span>
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2" aria-hidden="true" />
                {changeCount} customization{changeCount > 1 ? 's' : ''} made
              </span>
            ) : (
              <span>No customizations yet</span>
            )}
          </div>

          <div className="flex gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium',
                  'min-h-[44px]', // NFR49: Touch target
                  'border border-gray-300 text-gray-700 bg-white',
                  'hover:bg-gray-50',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
              >
                Save & Close
              </button>
            )}
            <button
              type="button"
              onClick={handleStartCoCreation}
              className={cn(
                'px-6 py-2 rounded-md text-sm font-medium',
                'min-h-[44px]', // NFR49: Touch target
                'bg-blue-600 text-white',
                'hover:bg-blue-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
            >
              Start Co-Creation →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
