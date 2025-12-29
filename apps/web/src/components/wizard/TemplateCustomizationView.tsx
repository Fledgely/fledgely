/**
 * Template Customization View Component.
 *
 * Story 4.5: Template Customization Preview - AC1, AC2, AC7
 *
 * Main customization interface allowing parents to modify template
 * values, add/remove rules, and preview changes.
 */

'use client'

import { useState } from 'react'
import type { AgreementTemplate } from '@fledgely/shared/contracts'
import { useTemplateCustomization } from '../../hooks/useTemplateCustomization'
import { ScreenTimeStep } from './steps/ScreenTimeStep'
import { BedtimeCutoffStep } from './steps/BedtimeCutoffStep'
import { MonitoringLevelStep } from './steps/MonitoringLevelStep'
import { CustomRulesEditor } from './CustomRulesEditor'
import { DraftPreview } from './DraftPreview'
import { ChangeHighlightBadge } from './ChangeHighlightBadge'

type CustomizationTab = 'settings' | 'rules' | 'preview'

interface TemplateCustomizationViewProps {
  template: AgreementTemplate
  ageGroup: string | null
  onSaveDraft: (
    summary: ReturnType<typeof useTemplateCustomization>['getCustomizationSummary']
  ) => void
  onContinueToCoCreation: (
    summary: ReturnType<typeof useTemplateCustomization>['getCustomizationSummary']
  ) => void
  onCancel: () => void
}

export function TemplateCustomizationView({
  template,
  ageGroup,
  onSaveDraft,
  onContinueToCoCreation,
  onCancel,
}: TemplateCustomizationViewProps) {
  const [activeTab, setActiveTab] = useState<CustomizationTab>('settings')

  const customization = useTemplateCustomization(template)

  const handleSaveDraft = () => {
    onSaveDraft(customization.getCustomizationSummary())
  }

  const handleContinue = () => {
    onContinueToCoCreation(customization.getCustomizationSummary())
  }

  const tabs: { id: CustomizationTab; label: string }[] = [
    { id: 'settings', label: 'Settings' },
    { id: 'rules', label: 'Rules' },
    { id: 'preview', label: 'Preview' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customize Template</h2>
          <p className="mt-1 text-sm text-gray-600">
            Customizing: {template.name}
            {customization.isDirty && (
              <span className="ml-2">
                <ChangeHighlightBadge type="modified" />
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
          aria-label="Cancel customization"
        >
          Cancel
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Customization tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm min-h-[44px]
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
                ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
              {tab.id === 'rules' && customization.customRules.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                  {customization.customRules.length}
                </span>
              )}
              {tab.id === 'rules' && customization.removedRuleIds.size > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                  -{customization.removedRuleIds.size}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div role="tabpanel" aria-label={`${activeTab} tab content`}>
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* Screen Time Settings */}
            <div className="relative">
              {customization.hasFieldChanged('screenTimeLimits') && (
                <div className="absolute -top-2 right-0">
                  <ChangeHighlightBadge type="modified" />
                </div>
              )}
              <ScreenTimeStep
                screenTimeLimits={customization.currentValues.screenTimeLimits}
                onUpdateLimits={customization.setScreenTimeLimits}
                templateDefaults={template.screenTimeLimits}
              />
            </div>

            {/* Bedtime Settings */}
            <div className="relative">
              {customization.hasFieldChanged('bedtimeCutoff') && (
                <div className="absolute -top-2 right-0">
                  <ChangeHighlightBadge type="modified" />
                </div>
              )}
              <BedtimeCutoffStep
                bedtimeCutoff={customization.currentValues.bedtimeCutoff}
                ageGroup={ageGroup as '5-7' | '8-10' | '11-13' | '14-16' | null}
                onUpdateBedtime={customization.setBedtimeCutoff}
              />
            </div>

            {/* Monitoring Level Settings */}
            <div className="relative">
              {customization.hasFieldChanged('monitoringLevel') && (
                <div className="absolute -top-2 right-0">
                  <ChangeHighlightBadge type="modified" />
                </div>
              )}
              <MonitoringLevelStep
                monitoringLevel={
                  customization.currentValues.monitoringLevel as 'high' | 'medium' | 'low'
                }
                onSelectLevel={customization.setMonitoringLevel}
                templateDefault={template.monitoringLevel as 'high' | 'medium' | 'low'}
              />
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <CustomRulesEditor
            templateRules={template.keyRules || []}
            customRules={customization.customRules}
            isTemplateRuleRemoved={customization.isTemplateRuleRemoved}
            onAddRule={customization.addCustomRule}
            onRemoveCustomRule={customization.removeCustomRule}
            onRemoveTemplateRule={customization.removeTemplateRule}
            onRestoreTemplateRule={customization.restoreTemplateRule}
            totalRuleCount={customization.totalRuleCount}
            canAddMoreRules={customization.canAddMoreRules}
          />
        )}

        {activeTab === 'preview' && (
          <DraftPreview
            templateName={template.name}
            originalValues={{
              screenTimeLimits: template.screenTimeLimits,
              monitoringLevel: template.monitoringLevel,
            }}
            currentValues={customization.currentValues}
            modifications={customization.modifications}
            customRules={customization.customRules}
            removedRuleCount={customization.removedRuleIds.size}
            isDirty={customization.isDirty}
            onSaveDraft={handleSaveDraft}
            onRevertToOriginal={customization.revertToOriginal}
            onContinueToCoCreation={handleContinue}
          />
        )}
      </div>

      {/* Bottom Actions (for settings and rules tabs) */}
      {activeTab !== 'preview' && (
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={customization.revertToOriginal}
            disabled={!customization.isDirty}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset Changes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className="px-6 py-3 bg-primary text-white font-medium rounded-lg min-h-[44px] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Review & Continue
          </button>
        </div>
      )}
    </div>
  )
}

export default TemplateCustomizationView
