/**
 * Agreement Templates for Ages 5-7 (Early Childhood)
 *
 * Story 4.1: Template Library Structure
 * Story 4.2: Age-Appropriate Template Content
 *   - AC #6: Ages 5-7 templates emphasize visual elements and simple yes/no rules
 *
 * Language level: Simple, visual
 * Screen time default: 30-60 min/day
 * Monitoring default: Comprehensive
 *
 * All content written at 6th-grade reading level (NFR65)
 * Visual elements include icons, yes/no rules, and color hints for young children
 */

import type { AgreementTemplate, VisualElements } from '../../agreement-template.schema'

/**
 * Standard visual elements for ages 5-7 template sections
 * Each section type has age-appropriate icons and colors
 */
const ages5to7VisualElements: Record<string, VisualElements> = {
  terms: {
    icon: '📋',
    isYesNoRule: false,
    colorHint: 'blue',
    altText: 'Clipboard icon for our rules',
  },
  screen_time: {
    icon: '⏰',
    isYesNoRule: true,
    colorHint: 'yellow',
    altText: 'Clock icon for screen time',
  },
  monitoring_rules: {
    icon: '👀',
    isYesNoRule: false,
    colorHint: 'blue',
    altText: 'Eyes icon for watching',
  },
  bedtime_schedule: {
    icon: '🌙',
    isYesNoRule: true,
    colorHint: 'purple',
    altText: 'Moon icon for bedtime',
  },
  app_restrictions: {
    icon: '📱',
    isYesNoRule: true,
    colorHint: 'green',
    altText: 'Phone icon for apps',
  },
  content_filters: {
    icon: '🛡️',
    isYesNoRule: true,
    colorHint: 'green',
    altText: 'Shield icon for safe content',
  },
  consequences: {
    icon: '⚠️',
    isYesNoRule: false,
    colorHint: 'yellow',
    altText: 'Warning icon for consequences',
  },
  rewards: {
    icon: '⭐',
    isYesNoRule: false,
    colorHint: 'green',
    altText: 'Star icon for rewards',
  },
}

/**
 * Strict template for ages 5-7
 * Maximum monitoring, lowest screen time limits
 */
export const ages5to7Strict: AgreementTemplate = {
  id: 'a5c3e8b0-1234-4567-8901-bcdef1234567',
  name: 'Early Childhood - Strict',
  description:
    'A careful approach for young children. More rules and close watching help keep kids safe while they learn to use devices.',
  ageGroup: '5-7',
  variation: 'strict',
  concerns: ['screen_time', 'safety', 'gaming'],
  summary: {
    screenTimeLimit: '30 minutes on school days, 1 hour on weekends',
    monitoringLevel: 'comprehensive',
    keyRules: [
      'Parent must be in the room during screen time',
      'Only approved apps and games',
      'No screens 1 hour before bedtime',
      'Screen time is earned after chores',
      'No talking to strangers online',
    ],
  },
  sections: [
    {
      id: 'terms-strict-5-7',
      type: 'terms',
      title: '📋 Our Device Rules',
      description: 'The main rules we agree to follow about using devices.',
      defaultValue:
        'I will use my devices safely and follow the rules. I will ask a grown-up for help if something scares me or makes me feel bad. I will tell mom or dad if someone I do not know tries to talk to me.',
      customizable: true,
      order: 0,
      visualElements: ages5to7VisualElements.terms,
    },
    {
      id: 'screen-time-strict-5-7',
      type: 'screen_time',
      title: '⏰ Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue:
        '✅ Yes: 30 minutes after homework and chores\n✅ Yes: 1 hour on weekends (two 30-minute times)\n❌ No: During meals\n❌ No: In bed',
      customizable: true,
      order: 1,
      visualElements: ages5to7VisualElements.screen_time,
    },
    {
      id: 'monitoring-strict-5-7',
      type: 'monitoring_rules',
      title: '👀 How Parents Will Watch',
      description: 'How parents will make sure devices are used safely.',
      defaultValue:
        'A parent will always be in the same room during screen time.\nParents can look at what is on the screen at any time.\nParents will check all apps before they are used.\nAll passwords will be known by parents.',
      customizable: true,
      order: 2,
      visualElements: ages5to7VisualElements.monitoring_rules,
    },
    {
      id: 'bedtime-strict-5-7',
      type: 'bedtime_schedule',
      title: '🌙 Bedtime Device Rules',
      description: 'Rules about devices at night.',
      defaultValue:
        '✅ Yes: Screens off 1 hour before bed\n✅ Yes: Devices stay in living room\n❌ No: Device use after 7:00 PM\n❌ No: Devices in bedroom',
      customizable: true,
      order: 3,
      visualElements: ages5to7VisualElements.bedtime_schedule,
    },
    {
      id: 'apps-strict-5-7',
      type: 'app_restrictions',
      title: '📱 Allowed Apps and Games',
      description: 'Which apps and games are okay to use.',
      defaultValue:
        '✅ Yes: Apps parents have approved\n✅ Yes: Games rated E for Everyone\n❌ No: New apps without asking\n❌ No: Social media apps',
      customizable: true,
      order: 4,
      visualElements: ages5to7VisualElements.app_restrictions,
    },
    {
      id: 'content-strict-5-7',
      type: 'content_filters',
      title: '🛡️ Safe Content',
      description: 'What kind of content is allowed.',
      defaultValue:
        '✅ Yes: Kid-friendly videos and shows\n✅ Yes: YouTube Kids\n❌ No: Scary or violent content\n❌ No: Regular YouTube',
      customizable: true,
      order: 5,
      visualElements: ages5to7VisualElements.content_filters,
    },
    {
      id: 'consequences-strict-5-7',
      type: 'consequences',
      title: '⚠️ What Happens If Rules Are Broken',
      description: 'The results of not following the rules.',
      defaultValue:
        'First time: A reminder and talk about the rule.\nSecond time: Lose screen time for that day.\nThird time: Lose screen time for the whole week.\nBreaking safety rules: Lose device use right away until we talk.',
      customizable: true,
      order: 6,
      visualElements: ages5to7VisualElements.consequences,
    },
    {
      id: 'rewards-strict-5-7',
      type: 'rewards',
      title: '⭐ Good Behavior Rewards',
      description: 'Rewards for following the rules well.',
      defaultValue:
        '⭐ Following rules all week: Pick a special app or game to try.\n⭐ One month of good behavior: Extra 15 minutes of screen time on weekends.\n⭐ Helping others use devices safely: Special praise and a sticker.',
      customizable: true,
      order: 7,
      visualElements: ages5to7VisualElements.rewards,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * Balanced template for ages 5-7
 * Moderate monitoring with reasonable limits
 */
export const ages5to7Balanced: AgreementTemplate = {
  id: 'b6d4f9c1-2345-5678-9012-cdef23456789',
  name: 'Early Childhood - Balanced',
  description:
    'A fair mix of rules and fun for young children. Good for families who want to be careful but also give some freedom.',
  ageGroup: '5-7',
  variation: 'balanced',
  concerns: ['screen_time', 'safety', 'gaming', 'homework'],
  summary: {
    screenTimeLimit: '45 minutes on school days, 1.5 hours on weekends',
    monitoringLevel: 'comprehensive',
    keyRules: [
      'Parent nearby during screen time',
      'Ask before downloading new apps',
      'No screens 30 minutes before bed',
      'Homework comes before screen time',
      'Tell a parent if something feels wrong',
    ],
  },
  sections: [
    {
      id: 'terms-balanced-5-7',
      type: 'terms',
      title: '📋 Our Device Rules',
      description: 'The main rules we agree to follow about using devices.',
      defaultValue:
        'I will use devices safely and have fun. I will ask for help when I need it. I will tell a grown-up if I see something that scares me or if someone is being mean.',
      customizable: true,
      order: 0,
      visualElements: ages5to7VisualElements.terms,
    },
    {
      id: 'screen-time-balanced-5-7',
      type: 'screen_time',
      title: '⏰ Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue:
        '✅ Yes: 45 minutes after homework\n✅ Yes: Up to 1.5 hours on weekends\n✅ Yes: Breaks every 20 minutes\n❌ No: During meals',
      customizable: true,
      order: 1,
      visualElements: ages5to7VisualElements.screen_time,
    },
    {
      id: 'monitoring-balanced-5-7',
      type: 'monitoring_rules',
      title: '👀 How Parents Will Watch',
      description: 'How parents will make sure devices are used safely.',
      defaultValue:
        'A parent will be nearby during screen time.\nParents may check what is on the screen.\nParents will help pick new apps.\nParents know all passwords.',
      customizable: true,
      order: 2,
      visualElements: ages5to7VisualElements.monitoring_rules,
    },
    {
      id: 'bedtime-balanced-5-7',
      type: 'bedtime_schedule',
      title: '🌙 Bedtime Device Rules',
      description: 'Rules about devices at night.',
      defaultValue:
        '✅ Yes: Screens off 30 minutes before bed\n✅ Yes: Devices charge in living room\n✅ Yes: Calm activities before bed\n❌ No: Devices in bedroom',
      customizable: true,
      order: 3,
      visualElements: ages5to7VisualElements.bedtime_schedule,
    },
    {
      id: 'apps-balanced-5-7',
      type: 'app_restrictions',
      title: '📱 Allowed Apps and Games',
      description: 'Which apps and games are okay to use.',
      defaultValue:
        '✅ Yes: Approved apps\n✅ Yes: Games rated E for Everyone\n✅ Yes: Educational apps\n❌ No: Downloads without asking',
      customizable: true,
      order: 4,
      visualElements: ages5to7VisualElements.app_restrictions,
    },
    {
      id: 'content-balanced-5-7',
      type: 'content_filters',
      title: '🛡️ Safe Content',
      description: 'What kind of content is allowed.',
      defaultValue:
        '✅ Yes: Kid-friendly content\n✅ Yes: YouTube Kids\n✅ Yes: Parent controls on\n❌ No: Scary or violent content',
      customizable: true,
      order: 5,
      visualElements: ages5to7VisualElements.content_filters,
    },
    {
      id: 'consequences-balanced-5-7',
      type: 'consequences',
      title: '⚠️ What Happens If Rules Are Broken',
      description: 'The results of not following the rules.',
      defaultValue:
        'First time: A friendly reminder.\nSecond time: Lose 15 minutes of screen time.\nRepeated problems: Lose screen time for the day.\nSafety issues: Talk right away and maybe take a break from devices.',
      customizable: true,
      order: 6,
      visualElements: ages5to7VisualElements.consequences,
    },
    {
      id: 'rewards-balanced-5-7',
      type: 'rewards',
      title: '⭐ Good Behavior Rewards',
      description: 'Rewards for following the rules well.',
      defaultValue:
        '⭐ Great week: Pick a fun family activity.\n⭐ Learning something new: Extra screen time for educational content.\n⭐ Being helpful: Choose a special show or game.',
      customizable: true,
      order: 7,
      visualElements: ages5to7VisualElements.rewards,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * Permissive template for ages 5-7
 * Lighter monitoring with more flexibility (still appropriate for young children)
 */
export const ages5to7Permissive: AgreementTemplate = {
  id: 'c7e5a0d2-3456-6789-0123-def345678901',
  name: 'Early Childhood - Permissive',
  description:
    'A flexible approach for young children. More trust and freedom while still keeping basic safety rules.',
  ageGroup: '5-7',
  variation: 'permissive',
  concerns: ['screen_time', 'safety'],
  summary: {
    screenTimeLimit: '1 hour on school days, 2 hours on weekends',
    monitoringLevel: 'moderate',
    keyRules: [
      'Parent available if needed',
      'Be kind online',
      'No screens at bedtime',
      'Tell someone if upset',
      'Keep devices in family areas',
    ],
  },
  sections: [
    {
      id: 'terms-permissive-5-7',
      type: 'terms',
      title: '📋 Our Device Rules',
      description: 'The main rules we agree to follow about using devices.',
      defaultValue:
        'I will be safe and kind when using devices. I will ask for help if I need it. I will talk to mom or dad if anything makes me feel bad.',
      customizable: true,
      order: 0,
      visualElements: ages5to7VisualElements.terms,
    },
    {
      id: 'screen-time-permissive-5-7',
      type: 'screen_time',
      title: '⏰ Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue:
        '✅ Yes: About 1 hour on school days\n✅ Yes: Up to 2 hours on weekends\n✅ Yes: Take breaks to play\n✅ Yes: Flexible timing based on the day',
      customizable: true,
      order: 1,
      visualElements: ages5to7VisualElements.screen_time,
    },
    {
      id: 'monitoring-permissive-5-7',
      type: 'monitoring_rules',
      title: '👀 How Parents Will Watch',
      description: 'How parents will make sure devices are used safely.',
      defaultValue:
        'A parent will be available to help.\nParents trust you to make good choices.\nParents will check in sometimes.\nParents can help if asked.',
      customizable: true,
      order: 2,
      visualElements: ages5to7VisualElements.monitoring_rules,
    },
    {
      id: 'bedtime-permissive-5-7',
      type: 'bedtime_schedule',
      title: '🌙 Bedtime Device Rules',
      description: 'Rules about devices at night.',
      defaultValue:
        '✅ Yes: Calm down time before bed\n✅ Yes: Devices in family areas\n❌ No: Screens right before sleep\n❌ No: Devices in bedroom at night',
      customizable: true,
      order: 3,
      visualElements: ages5to7VisualElements.bedtime_schedule,
    },
    {
      id: 'apps-permissive-5-7',
      type: 'app_restrictions',
      title: '📱 Allowed Apps and Games',
      description: 'Which apps and games are okay to use.',
      defaultValue:
        '✅ Yes: Many apps after parents check\n✅ Yes: Age-appropriate games\n✅ Yes: Educational apps\n❌ No: Buying without asking',
      customizable: true,
      order: 4,
      visualElements: ages5to7VisualElements.app_restrictions,
    },
    {
      id: 'content-permissive-5-7',
      type: 'content_filters',
      title: '🛡️ Safe Content',
      description: 'What kind of content is allowed.',
      defaultValue:
        '✅ Yes: Content for kids\n✅ Yes: Fun learning content\n✅ Yes: Parent controls on\n❌ No: Scary or violent content',
      customizable: true,
      order: 5,
      visualElements: ages5to7VisualElements.content_filters,
    },
    {
      id: 'consequences-permissive-5-7',
      type: 'consequences',
      title: '⚠️ What Happens If Rules Are Broken',
      description: 'The results of not following the rules.',
      defaultValue:
        'We will talk about what happened.\nWe will find a way to do better.\nBig problems may mean a short break from devices.\nWe will always work together to fix things.',
      customizable: true,
      order: 6,
      visualElements: ages5to7VisualElements.consequences,
    },
    {
      id: 'rewards-permissive-5-7',
      type: 'rewards',
      title: '⭐ Good Behavior Rewards',
      description: 'Rewards for following the rules well.',
      defaultValue:
        '⭐ Good choices mean more freedom over time.\n⭐ Special activities when things go well.\n⭐ Praise for being responsible.\n⭐ Family fun time together.',
      customizable: true,
      order: 7,
      visualElements: ages5to7VisualElements.rewards,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * All templates for ages 5-7
 */
export const ages5to7Templates: AgreementTemplate[] = [
  ages5to7Strict,
  ages5to7Balanced,
  ages5to7Permissive,
]
