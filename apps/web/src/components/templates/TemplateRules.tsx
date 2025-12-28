/**
 * TemplateRules Component.
 *
 * Story 4.2: Age-Appropriate Template Content - AC4, AC5, AC6
 *
 * Displays template rules with age-appropriate formatting:
 * - 5-7: Simple yes/no visual format
 * - 8-13: Standard rules with examples on expand
 * - 14-16: Rules with autonomy milestones section
 */

import type { AgreementTemplate, SimpleRule, AutonomyMilestone } from '@fledgely/shared/contracts'

interface TemplateRulesProps {
  template: AgreementTemplate
  showExamples?: boolean
  showMilestones?: boolean
}

/**
 * Display simple yes/no rules for young children (5-7).
 */
function SimpleRulesDisplay({ rules }: { rules: SimpleRule[] }) {
  const allowedRules = rules.filter((r) => r.isAllowed)
  const notYetRules = rules.filter((r) => !r.isAllowed)

  return (
    <div className="space-y-4">
      {allowedRules.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              ✓
            </span>
            You CAN do these things
          </h4>
          <ul className="space-y-2">
            {allowedRules.map((rule, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 p-2 rounded-lg"
              >
                <span className="text-green-600 flex-shrink-0" aria-hidden="true">
                  ✓
                </span>
                {rule.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notYetRules.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              ✕
            </span>
            Not yet - wait until you are older
          </h4>
          <ul className="space-y-2">
            {notYetRules.map((rule, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-700 bg-orange-50 p-2 rounded-lg"
              >
                <span className="text-orange-600 flex-shrink-0" aria-hidden="true">
                  ✕
                </span>
                {rule.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Display autonomy milestones for teens (14-16).
 */
function AutonomyMilestonesDisplay({ milestones }: { milestones: AutonomyMilestone[] }) {
  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h4 className="text-sm font-medium text-indigo-700 mb-3 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          🎯
        </span>
        Earn More Freedom
      </h4>
      <p className="text-xs text-gray-500 mb-3">
        Meet these goals to unlock more independence. This is your path to full digital autonomy.
      </p>
      <ul className="space-y-3">
        {milestones.map((milestone, index) => (
          <li key={index} className="bg-indigo-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 flex-shrink-0 mt-0.5" aria-hidden="true">
                →
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{milestone.milestone}</p>
                <p className="text-sm text-indigo-700 mt-1">
                  <span className="font-medium">Unlock:</span> {milestone.reward}
                </p>
                {milestone.description && (
                  <p className="text-xs text-gray-500 mt-1">{milestone.description}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Display standard rules with optional examples.
 */
function StandardRulesDisplay({
  keyRules,
  ruleExamples,
  showExamples,
}: {
  keyRules: string[]
  ruleExamples?: Record<string, string>
  showExamples: boolean
}) {
  return (
    <ul className="space-y-2">
      {keyRules.map((rule, index) => (
        <li key={index} className="text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <span className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true">
              •
            </span>
            <div>
              <span>{rule}</span>
              {showExamples && ruleExamples?.[String(index)] && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  Example: {ruleExamples[String(index)]}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Main TemplateRules component.
 *
 * Renders rules in age-appropriate format based on template's age group.
 */
export function TemplateRules({
  template,
  showExamples = false,
  showMilestones = true,
}: TemplateRulesProps) {
  const isYoungChild = template.ageGroup === '5-7'
  const isTeen = template.ageGroup === '14-16'
  const hasSimpleRules = template.simpleRules && template.simpleRules.length > 0
  const hasAutonomyMilestones =
    template.autonomyMilestones && template.autonomyMilestones.length > 0

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">
        {isYoungChild ? 'Simple Rules' : 'Key Rules'}
      </h3>

      {/* Show simple yes/no format for young children if available */}
      {isYoungChild && hasSimpleRules ? (
        <SimpleRulesDisplay rules={template.simpleRules!} />
      ) : (
        <StandardRulesDisplay
          keyRules={template.keyRules}
          ruleExamples={template.ruleExamples}
          showExamples={showExamples}
        />
      )}

      {/* Show autonomy milestones for teens if available */}
      {isTeen && hasAutonomyMilestones && showMilestones && (
        <AutonomyMilestonesDisplay milestones={template.autonomyMilestones!} />
      )}
    </div>
  )
}
