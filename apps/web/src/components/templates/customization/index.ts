/**
 * Template Customization Components
 *
 * Story 4.5: Template Customization Preview
 * Components for customizing templates before co-creation
 */

// Main editor
export { TemplateCustomizationEditor } from './TemplateCustomizationEditor'
export type { TemplateCustomizationEditorProps } from './TemplateCustomizationEditor'

// Header
export { CustomizationHeader } from './CustomizationHeader'
export type { CustomizationHeaderProps } from './CustomizationHeader'

// Field editors
export { ScreenTimeEditor } from './ScreenTimeEditor'
export type { ScreenTimeEditorProps } from './ScreenTimeEditor'

export { MonitoringEditor } from './MonitoringEditor'
export type { MonitoringEditorProps } from './MonitoringEditor'

export { RulesEditor } from './RulesEditor'
export type { RulesEditorProps } from './RulesEditor'

export { CustomRuleForm } from './CustomRuleForm'
export type { CustomRuleFormProps } from './CustomRuleForm'

// Diff indicators
export {
  DiffIndicator,
  DiffBadge,
  DiffHighlight,
  getDiffStyles,
  getDiffLabel,
} from './DiffIndicator'
export type { DiffIndicatorProps, DiffBadgeProps, DiffHighlightProps } from './DiffIndicator'

// Draft hook
export { useTemplateDraft } from './useTemplateDraft'
export type {
  CustomRule,
  TemplateCustomizations,
  TemplateDraft,
  DiffStatus,
  UseTemplateDraftReturn,
} from './useTemplateDraft'
