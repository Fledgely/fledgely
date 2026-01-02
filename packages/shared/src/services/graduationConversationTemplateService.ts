/**
 * Graduation Conversation Template Service - Story 38.2 Task 4
 *
 * Service providing conversation templates for graduation discussions.
 * AC5: Conversation template provided with discussion points
 */

import {
  ConversationTemplate,
  DiscussionPoint,
  Resource,
} from '../contracts/graduationConversation'
import { ViewerType } from '../contracts/graduationEligibility'

// ============================================
// Default Conversation Template
// ============================================

export const DEFAULT_GRADUATION_TEMPLATE: ConversationTemplate = {
  id: 'default',
  title: 'Graduation Conversation Guide',
  introduction:
    'This guide will help your family have a meaningful conversation about graduating from monitoring. Take your time with each topic and listen to each other.',
  discussionPoints: [
    {
      topic: 'Celebrating Achievement',
      forChild:
        "You've shown 12 months of consistent responsibility. How do you feel about this milestone? What are you most proud of?",
      forParent:
        "Your child has demonstrated sustained trustworthy behavior. Share your pride in their growth and what you've noticed about their development.",
      optional: false,
    },
    {
      topic: 'Reflecting on the Journey',
      forChild: 'What have you learned during this monitoring period? How have you grown?',
      forParent:
        'What changes have you observed in your child during this period? How has your relationship evolved?',
      optional: false,
    },
    {
      topic: 'Readiness for Independence',
      forChild:
        'What does more digital independence mean to you? How do you plan to maintain healthy habits?',
      forParent:
        'What aspects of monitoring do you feel comfortable reducing? What concerns, if any, remain?',
      optional: false,
    },
    {
      topic: 'Ongoing Support',
      forChild:
        'What kind of support would you still like from your parents regarding your digital life?',
      forParent:
        'How can you continue to support healthy digital habits without active monitoring?',
      optional: false,
    },
    {
      topic: 'Transition Timeline',
      forChild:
        'What timeline feels right for transitioning off monitoring? Would you prefer gradual or immediate?',
      forParent:
        'What transition approach would work for your family? Consider gradual reduction vs full graduation.',
      optional: true,
    },
    {
      topic: 'Future Communication',
      forChild: 'How would you like to communicate about digital life after graduation?',
      forParent:
        'How will you maintain open communication about digital topics without monitoring?',
      optional: true,
    },
  ],
  suggestedQuestions: [
    'What have you learned during this monitoring period?',
    'How has trust grown in our family?',
    'What digital habits will you continue independently?',
    'Are there any concerns we should address before graduation?',
    'How can we celebrate this milestone together?',
    'What does healthy digital independence look like for our family?',
  ],
  closingMessage:
    'Remember, graduation is the beginning of a new chapter, not the end of your relationship around digital topics. Continue to communicate openly and celebrate this achievement!',
  resources: [
    {
      title: 'Healthy Digital Independence Guide',
      url: '/resources/digital-independence',
      description: 'Tips for maintaining healthy digital habits after graduation.',
    },
    {
      title: 'Post-Graduation Communication Tips',
      url: '/resources/post-graduation-communication',
      description: 'How to keep the conversation going without monitoring.',
    },
    {
      title: 'Family Digital Wellness Check-In',
      url: '/resources/wellness-checkin',
      description: 'A simple framework for periodic check-ins.',
    },
  ],
}

// ============================================
// Template Service Functions
// ============================================

/**
 * Get the default conversation template.
 */
export function getDefaultTemplate(): ConversationTemplate {
  return DEFAULT_GRADUATION_TEMPLATE
}

/**
 * Get template by ID (currently only default is available).
 */
export function getTemplateById(templateId: string): ConversationTemplate | null {
  if (templateId === 'default') {
    return DEFAULT_GRADUATION_TEMPLATE
  }
  return null
}

/**
 * Get discussion points for a specific viewer type.
 */
export function getDiscussionPointsForViewer(
  template: ConversationTemplate,
  viewerType: ViewerType
): { topic: string; prompt: string; optional: boolean }[] {
  return template.discussionPoints.map((point) => ({
    topic: point.topic,
    prompt: viewerType === 'child' ? point.forChild : point.forParent,
    optional: point.optional,
  }))
}

/**
 * Get required discussion points.
 */
export function getRequiredDiscussionPoints(template: ConversationTemplate): DiscussionPoint[] {
  return template.discussionPoints.filter((point) => !point.optional)
}

/**
 * Get optional discussion points.
 */
export function getOptionalDiscussionPoints(template: ConversationTemplate): DiscussionPoint[] {
  return template.discussionPoints.filter((point) => point.optional)
}

/**
 * Get suggested questions.
 */
export function getSuggestedQuestions(template: ConversationTemplate): string[] {
  return template.suggestedQuestions
}

/**
 * Get resources.
 */
export function getResources(template: ConversationTemplate): Resource[] {
  return template.resources
}

/**
 * Get introduction text for viewer type.
 */
export function getIntroduction(
  template: ConversationTemplate,
  viewerType: ViewerType,
  childName?: string
): string {
  if (viewerType === 'child') {
    return template.introduction
  }

  // Personalize for parent if child name provided
  if (childName) {
    return `This guide will help your family have a meaningful conversation about ${childName}'s graduation from monitoring. Take your time with each topic and listen to each other.`
  }

  return template.introduction
}

/**
 * Get closing message for viewer type.
 */
export function getClosingMessage(
  template: ConversationTemplate,
  viewerType: ViewerType,
  childName?: string
): string {
  if (viewerType === 'child') {
    return template.closingMessage
  }

  if (childName) {
    return `Remember, graduation is the beginning of a new chapter in ${childName}'s digital independence. Continue to communicate openly and celebrate this achievement together!`
  }

  return template.closingMessage
}

/**
 * Get a specific discussion point by topic.
 */
export function getDiscussionPointByTopic(
  template: ConversationTemplate,
  topic: string
): DiscussionPoint | null {
  return (
    template.discussionPoints.find((point) => point.topic.toLowerCase() === topic.toLowerCase()) ||
    null
  )
}

/**
 * Get discussion point count.
 */
export function getDiscussionPointCount(template: ConversationTemplate): {
  total: number
  required: number
  optional: number
} {
  const required = template.discussionPoints.filter((p) => !p.optional).length
  const optional = template.discussionPoints.filter((p) => p.optional).length

  return {
    total: template.discussionPoints.length,
    required,
    optional,
  }
}

/**
 * Get template summary for display.
 */
export function getTemplateSummary(
  template: ConversationTemplate,
  viewerType: ViewerType,
  childName?: string
): {
  title: string
  introduction: string
  pointCount: number
  questionCount: number
  resourceCount: number
} {
  return {
    title: template.title,
    introduction: getIntroduction(template, viewerType, childName),
    pointCount: template.discussionPoints.length,
    questionCount: template.suggestedQuestions.length,
    resourceCount: template.resources.length,
  }
}

/**
 * Format discussion points for display as checklist.
 */
export function formatAsChecklist(
  template: ConversationTemplate,
  viewerType: ViewerType
): { topic: string; prompt: string; isRequired: boolean }[] {
  return template.discussionPoints.map((point) => ({
    topic: point.topic,
    prompt: viewerType === 'child' ? point.forChild : point.forParent,
    isRequired: !point.optional,
  }))
}

/**
 * Get printable version of template for offline use.
 */
export function getPrintableTemplate(template: ConversationTemplate, childName: string): string {
  const lines: string[] = []

  lines.push(`# ${template.title}`)
  lines.push('')
  lines.push(`## Graduation Conversation for ${childName}`)
  lines.push('')
  lines.push(`### Introduction`)
  lines.push(getIntroduction(template, 'parent', childName))
  lines.push('')

  lines.push(`### Discussion Points`)
  lines.push('')

  template.discussionPoints.forEach((point, index) => {
    const marker = point.optional ? '(Optional)' : '(Required)'
    lines.push(`${index + 1}. **${point.topic}** ${marker}`)
    lines.push(`   - For ${childName}: ${point.forChild}`)
    lines.push(`   - For Parent: ${point.forParent}`)
    lines.push('')
  })

  lines.push(`### Suggested Questions`)
  template.suggestedQuestions.forEach((q) => {
    lines.push(`- ${q}`)
  })
  lines.push('')

  lines.push(`### Closing`)
  lines.push(getClosingMessage(template, 'parent', childName))
  lines.push('')

  lines.push(`### Resources`)
  template.resources.forEach((r) => {
    lines.push(`- ${r.title}: ${r.description || r.url}`)
  })

  return lines.join('\n')
}
