/**
 * Agreement Templates for Ages 8-10 (Middle Childhood)
 *
 * Story 4.1: Template Library Structure
 *
 * Language level: 4th grade
 * Screen time default: 1-2 hrs/day
 * Monitoring default: Moderate-High
 *
 * All content written at 6th-grade reading level (NFR65)
 */

import type { AgreementTemplate } from '../../agreement-template.schema'

/**
 * Strict template for ages 8-10
 * High monitoring, conservative screen time limits
 */
export const ages8to10Strict: AgreementTemplate = {
  id: 'd8f6a1e3-4567-7890-1234-ef4567890123',
  name: 'Middle Childhood - Strict',
  description:
    'A careful approach for children ages 8-10. Clear rules and close monitoring help build good digital habits from the start.',
  ageGroup: '8-10',
  variation: 'strict',
  concerns: ['screen_time', 'gaming', 'homework', 'safety'],
  summary: {
    screenTimeLimit: '1 hour on school days, 2 hours on weekends',
    monitoringLevel: 'comprehensive',
    keyRules: [
      'Homework and chores before screen time',
      'Parent approval for all apps',
      'No devices in bedroom',
      'No online chatting without permission',
      'Daily screen time check-in',
    ],
  },
  sections: [
    {
      id: 'terms-strict-8-10',
      type: 'terms',
      title: 'Our Family Device Agreement',
      description: 'The main rules we agree to follow when using devices.',
      defaultValue:
        'I agree to use devices responsibly and safely. I will follow our family rules about screen time. I will tell my parents if I see something wrong online or if someone makes me uncomfortable. I understand that my parents check my device use to keep me safe.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-strict-8-10',
      type: 'screen_time',
      title: 'Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue:
        'School days: 1 hour maximum after homework and chores are done.\nWeekends: Up to 2 hours total.\nEducational screen time does not count against the limit.\nNo more than 30 minutes at a time without a break.\nTimer must be used to track time.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-strict-8-10',
      type: 'monitoring_rules',
      title: 'Parental Monitoring',
      description: 'How parents will supervise device use.',
      defaultValue:
        'Parents will check device history daily.\nAll accounts and passwords are shared with parents.\nParents can check devices at any time.\nWeekly review of apps and content.\nParent controls are enabled on all devices.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-strict-8-10',
      type: 'bedtime_schedule',
      title: 'Bedtime and Device Schedule',
      description: 'When devices can and cannot be used.',
      defaultValue:
        'All devices off 1 hour before bedtime.\nNo devices before school in the morning.\nDevices charge in the kitchen overnight.\nNo device use during family meals.\nNo screens during homework time.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-strict-8-10',
      type: 'app_restrictions',
      title: 'App and Game Rules',
      description: 'Which apps and games are allowed.',
      defaultValue:
        'All apps must be approved by parents before downloading.\nGames must be rated E or E10+.\nNo social media accounts.\nNo multiplayer games with strangers.\nEducational apps are encouraged.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-strict-8-10',
      type: 'content_filters',
      title: 'Content Rules',
      description: 'What content is allowed on devices.',
      defaultValue:
        'Strict content filters are enabled.\nNo violent, scary, or inappropriate content.\nYouTube is allowed only with parent supervision.\nNo searching for things without parent approval.\nReport anything that seems wrong.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-strict-8-10',
      type: 'consequences',
      title: 'Consequences for Breaking Rules',
      description: 'What happens when rules are not followed.',
      defaultValue:
        'First offense: Warning and discussion about the rule.\nSecond offense: Lose device privileges for 1 day.\nThird offense: Lose device privileges for 1 week.\nSerious violations (like hiding activity or unsafe behavior): Immediate loss of privileges until we talk and make a plan.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-strict-8-10',
      type: 'rewards',
      title: 'Rewards for Following Rules',
      description: 'How good behavior is recognized.',
      defaultValue:
        'Perfect week: 30 extra minutes on the weekend.\nPerfect month: Choose a new app or game (with approval).\nConsistent responsibility: Gradually earn more freedom.\nHelping siblings follow rules: Special recognition.',
      customizable: true,
      order: 7,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * Balanced template for ages 8-10
 * Moderate monitoring with age-appropriate freedom
 */
export const ages8to10Balanced: AgreementTemplate = {
  id: 'e9a7b2f4-5678-8901-2345-f56789012345',
  name: 'Middle Childhood - Balanced',
  description:
    'A balanced approach for children ages 8-10. Fair rules that allow for fun while building responsibility.',
  ageGroup: '8-10',
  variation: 'balanced',
  concerns: ['screen_time', 'gaming', 'homework', 'safety', 'social_media'],
  summary: {
    screenTimeLimit: '1.5 hours on school days, 2.5 hours on weekends',
    monitoringLevel: 'moderate',
    keyRules: [
      'Finish important tasks before screens',
      'Talk about new apps before downloading',
      'Devices stay in common areas',
      'Be kind online',
      'Weekly family tech check-in',
    ],
  },
  sections: [
    {
      id: 'terms-balanced-8-10',
      type: 'terms',
      title: 'Our Family Device Agreement',
      description: 'The main rules we agree to follow when using devices.',
      defaultValue:
        'I will use devices in a responsible way. I will be honest about what I do online. I will talk to my parents if something bothers me or seems wrong. We will work together to make good choices about technology.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-balanced-8-10',
      type: 'screen_time',
      title: 'Screen Time Limits',
      description: 'How much time can be spent on screens each day.',
      defaultValue:
        'School days: About 1.5 hours of screen time.\nWeekends: About 2.5 hours of screen time.\nTime can be flexible based on the day.\nTake breaks every 30-45 minutes.\nBalance screen time with other activities.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-balanced-8-10',
      type: 'monitoring_rules',
      title: 'Parental Monitoring',
      description: 'How parents will supervise device use.',
      defaultValue:
        'Parents will check devices regularly.\nPasswords are shared with parents.\nDevices should be used where parents can see.\nWeekly check-in about online activities.\nParent controls help guide safe use.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-balanced-8-10',
      type: 'bedtime_schedule',
      title: 'Bedtime and Device Schedule',
      description: 'When devices can and cannot be used.',
      defaultValue:
        'Devices off 30-45 minutes before bed.\nNo devices during meals.\nDevices charge outside the bedroom.\nMorning device use is limited before school.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-balanced-8-10',
      type: 'app_restrictions',
      title: 'App and Game Rules',
      description: 'Which apps and games are allowed.',
      defaultValue:
        'Talk to parents before downloading new apps.\nGames should be age-appropriate.\nNo social media without discussion.\nMultiplayer games only with known friends.\nEducational apps are great choices.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-balanced-8-10',
      type: 'content_filters',
      title: 'Content Rules',
      description: 'What content is allowed on devices.',
      defaultValue:
        'Content filters are on to help with safety.\nNo violent or inappropriate content.\nYouTube with some supervision.\nAsk before exploring new websites.\nShare interesting things you find.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-balanced-8-10',
      type: 'consequences',
      title: 'Consequences for Breaking Rules',
      description: 'What happens when rules are not followed.',
      defaultValue:
        'First time: Talk about what happened and why.\nRepeated issues: Reduce screen time for a few days.\nSerious problems: Take a longer break from devices.\nWe will always discuss and learn from mistakes.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-balanced-8-10',
      type: 'rewards',
      title: 'Rewards for Following Rules',
      description: 'How good behavior is recognized.',
      defaultValue:
        'Consistent good choices: More flexibility with time.\nGreat responsibility: Input on new apps or games.\nHelping the family: Special screen time activity.\nBuilding trust: More independence over time.',
      customizable: true,
      order: 7,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * Permissive template for ages 8-10
 * Lighter monitoring with more trust and freedom
 */
export const ages8to10Permissive: AgreementTemplate = {
  id: 'f0a8b3c5-6789-9012-3456-067890123456',
  name: 'Middle Childhood - Permissive',
  description:
    'A trust-based approach for children ages 8-10. More freedom for kids who have shown good judgment and responsibility.',
  ageGroup: '8-10',
  variation: 'permissive',
  concerns: ['screen_time', 'safety'],
  summary: {
    screenTimeLimit: '2 hours on school days, 3 hours on weekends',
    monitoringLevel: 'light',
    keyRules: [
      'Be responsible with time',
      'Keep devices in family areas',
      'Be honest about online activities',
      'Ask for help when needed',
      'Stay safe online',
    ],
  },
  sections: [
    {
      id: 'terms-permissive-8-10',
      type: 'terms',
      title: 'Our Family Device Agreement',
      description: 'The main rules we agree to follow when using devices.',
      defaultValue:
        'I will use devices responsibly because my family trusts me. I will make good choices about my time. I will be honest and ask for help if I need it. I will tell my parents about problems right away.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-permissive-8-10',
      type: 'screen_time',
      title: 'Screen Time Guidelines',
      description: 'General guidelines for screen time.',
      defaultValue:
        'School days: Around 2 hours is a good amount.\nWeekends: Around 3 hours, depending on other activities.\nYou can manage your own time within these guidelines.\nBalance is important - mix screens with other fun.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-permissive-8-10',
      type: 'monitoring_rules',
      title: 'How Parents Stay Involved',
      description: 'How parents will stay informed about device use.',
      defaultValue:
        'Parents trust you but will check in sometimes.\nShare what you are doing online.\nDevices should generally be in family areas.\nTalk about anything interesting or concerning.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-permissive-8-10',
      type: 'bedtime_schedule',
      title: 'Bedtime Guidelines',
      description: 'Guidelines for device use at night.',
      defaultValue:
        'Wind down from screens before bed.\nKeep devices out of the bedroom for better sleep.\nYou can help decide what time is right to stop.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-permissive-8-10',
      type: 'app_restrictions',
      title: 'App and Game Guidelines',
      description: 'Guidelines for apps and games.',
      defaultValue:
        'Discuss new apps and games with parents.\nMake good choices about what is appropriate.\nAvoid things that seem too grown-up.\nShare what you like and why.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-permissive-8-10',
      type: 'content_filters',
      title: 'Content Guidelines',
      description: 'Guidelines for online content.',
      defaultValue:
        'Choose age-appropriate content.\nAvoid violent or inappropriate material.\nTalk to parents about anything confusing.\nShare cool things you discover.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-permissive-8-10',
      type: 'consequences',
      title: 'If Problems Come Up',
      description: 'What happens if there are issues.',
      defaultValue:
        'We will talk about what happened.\nWe will figure out a solution together.\nTrust is earned back by making better choices.\nSerious issues may need a break to reset.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-permissive-8-10',
      type: 'rewards',
      title: 'Recognizing Responsibility',
      description: 'How good choices are recognized.',
      defaultValue:
        'Good judgment means continued freedom.\nResponsible use leads to more trust.\nYour input matters in family tech decisions.\nCelebrate when things are going well.',
      customizable: true,
      order: 7,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * All templates for ages 8-10
 */
export const ages8to10Templates: AgreementTemplate[] = [
  ages8to10Strict,
  ages8to10Balanced,
  ages8to10Permissive,
]
