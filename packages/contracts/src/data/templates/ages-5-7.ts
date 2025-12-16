/**
 * Agreement Templates for Ages 5-7 (Early Childhood)
 *
 * Story 4.1: Template Library Structure
 *
 * Language level: Simple, visual
 * Screen time default: 30-60 min/day
 * Monitoring default: Comprehensive
 *
 * All content written at 6th-grade reading level (NFR65)
 */

import type { AgreementTemplate } from '../../agreement-template.schema'

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
      title: 'Our Device Rules',
      description: 'The main rules we agree to follow about using devices.',
      defaultValue:
        'I will use my devices safely and follow the rules. I will ask a grown-up for help if something scares me or makes me feel bad. I will tell mom or dad if someone I do not know tries to talk to me.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-strict-5-7',
      type: 'screen_time',
      title: 'Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue:
        'School days: 30 minutes of screen time after homework and chores are done.\nWeekends and holidays: 1 hour of screen time, split into two 30-minute sessions.\nNo screens during meals or in bed.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-strict-5-7',
      type: 'monitoring_rules',
      title: 'How Parents Will Watch',
      description: 'How parents will make sure devices are used safely.',
      defaultValue:
        'A parent will always be in the same room during screen time.\nParents can look at what is on the screen at any time.\nParents will check all apps before they are used.\nAll passwords will be known by parents.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-strict-5-7',
      type: 'bedtime_schedule',
      title: 'Bedtime Device Rules',
      description: 'Rules about devices at night.',
      defaultValue:
        'All screens must be turned off 1 hour before bedtime.\nDevices stay in the living room at night, not in bedrooms.\nNo device use after 7:00 PM.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-strict-5-7',
      type: 'app_restrictions',
      title: 'Allowed Apps and Games',
      description: 'Which apps and games are okay to use.',
      defaultValue:
        'Only apps that parents have approved can be used.\nNew apps must be asked for and checked by a parent first.\nGames must be rated E for Everyone.\nNo social media apps.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-strict-5-7',
      type: 'content_filters',
      title: 'Safe Content',
      description: 'What kind of content is allowed.',
      defaultValue:
        'Only kid-friendly videos and shows.\nParent controls will be turned on.\nNo scary, violent, or mean content.\nYouTube Kids only, not regular YouTube.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-strict-5-7',
      type: 'consequences',
      title: 'What Happens If Rules Are Broken',
      description: 'The results of not following the rules.',
      defaultValue:
        'First time: A reminder and talk about the rule.\nSecond time: Lose screen time for that day.\nThird time: Lose screen time for the whole week.\nBreaking safety rules: Lose device use right away until we talk.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-strict-5-7',
      type: 'rewards',
      title: 'Good Behavior Rewards',
      description: 'Rewards for following the rules well.',
      defaultValue:
        'Following rules all week: Pick a special app or game to try.\nOne month of good behavior: Extra 15 minutes of screen time on weekends.\nHelping others use devices safely: Special praise and a sticker.',
      customizable: true,
      order: 7,
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
      title: 'Our Device Rules',
      description: 'The main rules we agree to follow about using devices.',
      defaultValue:
        'I will use devices safely and have fun. I will ask for help when I need it. I will tell a grown-up if I see something that scares me or if someone is being mean.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-balanced-5-7',
      type: 'screen_time',
      title: 'Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue:
        'School days: 45 minutes of screen time after homework.\nWeekends and holidays: Up to 1.5 hours of screen time.\nBreaks every 20 minutes to rest eyes.\nNo screens during meals.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-balanced-5-7',
      type: 'monitoring_rules',
      title: 'How Parents Will Watch',
      description: 'How parents will make sure devices are used safely.',
      defaultValue:
        'A parent will be nearby during screen time.\nParents may check what is on the screen.\nParents will help pick new apps.\nParents know all passwords.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-balanced-5-7',
      type: 'bedtime_schedule',
      title: 'Bedtime Device Rules',
      description: 'Rules about devices at night.',
      defaultValue:
        'Screens off 30 minutes before bedtime.\nDevices charge in the living room overnight.\nCalm activities only in the hour before bed.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-balanced-5-7',
      type: 'app_restrictions',
      title: 'Allowed Apps and Games',
      description: 'Which apps and games are okay to use.',
      defaultValue:
        'Only approved apps can be used.\nAsk before downloading anything new.\nGames should be rated E for Everyone.\nEducational apps are encouraged.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-balanced-5-7',
      type: 'content_filters',
      title: 'Safe Content',
      description: 'What kind of content is allowed.',
      defaultValue:
        'Kid-friendly content only.\nParent controls are on.\nNo scary or violent content.\nYouTube Kids preferred over regular YouTube.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-balanced-5-7',
      type: 'consequences',
      title: 'What Happens If Rules Are Broken',
      description: 'The results of not following the rules.',
      defaultValue:
        'First time: A friendly reminder.\nSecond time: Lose 15 minutes of screen time.\nRepeated problems: Lose screen time for the day.\nSafety issues: Talk right away and maybe take a break from devices.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-balanced-5-7',
      type: 'rewards',
      title: 'Good Behavior Rewards',
      description: 'Rewards for following the rules well.',
      defaultValue:
        'Great week: Pick a fun family activity.\nLearning something new: Extra screen time for educational content.\nBeing helpful: Choose a special show or game.',
      customizable: true,
      order: 7,
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
      title: 'Our Device Rules',
      description: 'The main rules we agree to follow about using devices.',
      defaultValue:
        'I will be safe and kind when using devices. I will ask for help if I need it. I will talk to mom or dad if anything makes me feel bad.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-permissive-5-7',
      type: 'screen_time',
      title: 'Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue:
        'School days: About 1 hour of screen time.\nWeekends: Up to 2 hours of screen time.\nFlexible timing based on the day.\nTake breaks to play and move around.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-permissive-5-7',
      type: 'monitoring_rules',
      title: 'How Parents Will Watch',
      description: 'How parents will make sure devices are used safely.',
      defaultValue:
        'A parent will be available to help.\nParents trust you to make good choices.\nParents will check in sometimes.\nParents can help if asked.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-permissive-5-7',
      type: 'bedtime_schedule',
      title: 'Bedtime Device Rules',
      description: 'Rules about devices at night.',
      defaultValue:
        'No screens right before sleep.\nDevices stay in family areas at night.\nCalm down time before bed is important.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-permissive-5-7',
      type: 'app_restrictions',
      title: 'Allowed Apps and Games',
      description: 'Which apps and games are okay to use.',
      defaultValue:
        'Many apps are okay after parents check.\nAsk before buying or downloading.\nGames should be age-appropriate.\nTry educational apps too.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-permissive-5-7',
      type: 'content_filters',
      title: 'Safe Content',
      description: 'What kind of content is allowed.',
      defaultValue:
        'Content should be appropriate for kids.\nParent controls help guide choices.\nAvoid scary or very violent content.\nWatch fun things that help you learn.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-permissive-5-7',
      type: 'consequences',
      title: 'What Happens If Rules Are Broken',
      description: 'The results of not following the rules.',
      defaultValue:
        'We will talk about what happened.\nWe will find a way to do better.\nBig problems may mean a short break from devices.\nWe will always work together to fix things.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-permissive-5-7',
      type: 'rewards',
      title: 'Good Behavior Rewards',
      description: 'Rewards for following the rules well.',
      defaultValue:
        'Good choices mean more freedom over time.\nSpecial activities when things go well.\nPraise for being responsible.\nFamily fun time together.',
      customizable: true,
      order: 7,
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
