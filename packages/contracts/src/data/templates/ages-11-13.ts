/**
 * Agreement Templates for Ages 11-13 (Early Adolescence)
 *
 * Story 4.1: Template Library Structure
 *
 * Language level: 6th grade
 * Screen time default: 2-3 hrs/day
 * Monitoring default: Moderate
 *
 * All content written at 6th-grade reading level (NFR65)
 */

import type { AgreementTemplate } from '../../agreement-template.schema'

/**
 * Strict template for ages 11-13
 * Higher monitoring with clear boundaries for early teens
 */
export const ages11to13Strict: AgreementTemplate = {
  id: 'a1b9c4d6-7890-0123-4567-178901234567',
  name: 'Early Teen - Strict',
  description:
    'A structured approach for early teens. Clear rules help navigate the challenges of social media and online interactions safely.',
  ageGroup: '11-13',
  variation: 'strict',
  concerns: ['social_media', 'screen_time', 'gaming', 'homework', 'safety'],
  summary: {
    screenTimeLimit: '1.5 hours on school days, 2.5 hours on weekends',
    monitoringLevel: 'comprehensive',
    keyRules: [
      'Parents have access to all accounts',
      'No private social media accounts',
      'Homework completed before screen time',
      'No devices in bedroom at night',
      'Weekly device check-ins',
    ],
  },
  sections: [
    {
      id: 'terms-strict-11-13',
      type: 'terms',
      title: 'Our Family Technology Agreement',
      description: 'The core principles we agree to follow for technology use.',
      defaultValue:
        'I understand that using devices and being online is a privilege, not a right. I agree to be honest about my online activities. I will follow our family rules and accept the consequences if I do not. I know my parents monitor my device use to keep me safe, and I appreciate their guidance.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-strict-11-13',
      type: 'screen_time',
      title: 'Screen Time Rules',
      description: 'Daily limits for recreational screen time.',
      defaultValue:
        'School days: 1.5 hours of recreational screen time after all schoolwork is complete.\nWeekends: 2.5 hours total, which can be split throughout the day.\nEducational content and homework do not count against the limit.\nNo binge-watching or gaming marathons.\nUse a timer app to track time honestly.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-strict-11-13',
      type: 'monitoring_rules',
      title: 'Parental Oversight',
      description: 'How parents will monitor and guide technology use.',
      defaultValue:
        'Parents have access to all devices and accounts.\nParents can review browsing history, messages, and social media at any time.\nLocation sharing is enabled on all devices.\nWeekly check-ins to discuss online activities.\nParent approval required for all new apps, games, and accounts.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-strict-11-13',
      type: 'bedtime_schedule',
      title: 'Device Curfew',
      description: 'Rules about when devices must be put away.',
      defaultValue:
        'All devices must be turned in to the charging station by 8:30 PM on school nights.\nWeekend curfew is 9:30 PM.\nNo devices in bedrooms at any time.\nMorning device use only after getting ready for school.\nDevices stay in common areas during homework time.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-strict-11-13',
      type: 'app_restrictions',
      title: 'Apps and Social Media Rules',
      description: 'Guidelines for apps, games, and social media platforms.',
      defaultValue:
        'Social media accounts require parent approval and follow-access.\nNo private or hidden accounts.\nGames must be age-appropriate (rated T or below).\nNo chat features with strangers.\nParents must be friends or followers on all social accounts.\nNo downloading apps without asking first.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-strict-11-13',
      type: 'content_filters',
      title: 'Content Rules',
      description: 'What types of content are allowed.',
      defaultValue:
        'Content filters are enabled on all devices and accounts.\nNo violent, explicit, or inappropriate content.\nNo accessing content that would embarrass you if parents saw.\nReport anything uncomfortable or inappropriate.\nNo participating in trends that could be dangerous or harmful.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-strict-11-13',
      type: 'consequences',
      title: 'Consequences',
      description: 'What happens when rules are broken.',
      defaultValue:
        'Minor violation (first time): Warning and discussion.\nMinor violation (repeated): Loss of device privileges for 2-3 days.\nMajor violation (lying, hidden accounts, inappropriate content): Loss of privileges for 1 week or more.\nSafety violation (meeting strangers, sharing personal info): Extended restriction and serious conversation.\nAll privileges must be earned back through demonstrated trustworthiness.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-strict-11-13',
      type: 'rewards',
      title: 'Earning More Freedom',
      description: 'How to earn increased privileges.',
      defaultValue:
        'Consistent rule-following for 1 month: 30 extra minutes on weekends.\nExcellent grades: Choose a new game or app (with approval).\nDemonstrating trustworthiness: Gradually reduced monitoring.\nResponsible social media use: Consideration for new platforms.\nPositive online interactions: Recognition and praise.',
      customizable: true,
      order: 7,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * Balanced template for ages 11-13
 * Moderate monitoring with room for growing independence
 */
export const ages11to13Balanced: AgreementTemplate = {
  id: 'a2b0c5d7-8901-1234-5678-289012345678',
  name: 'Early Teen - Balanced',
  description:
    'A balanced approach for early teens. Provides structure while allowing room to develop digital responsibility.',
  ageGroup: '11-13',
  variation: 'balanced',
  concerns: ['social_media', 'screen_time', 'gaming', 'homework', 'safety'],
  summary: {
    screenTimeLimit: '2 hours on school days, 3 hours on weekends',
    monitoringLevel: 'moderate',
    keyRules: [
      'Keep parents informed about online activities',
      'Social media with parent awareness',
      'Balance screen time with other activities',
      'Devices charge outside bedroom',
      'Open communication about online life',
    ],
  },
  sections: [
    {
      id: 'terms-balanced-11-13',
      type: 'terms',
      title: 'Our Family Technology Agreement',
      description: 'The core principles we agree to follow for technology use.',
      defaultValue:
        'I will use technology responsibly and be open with my parents about my online activities. I understand that trust is earned through honest behavior. I will come to my parents with questions or if something online makes me uncomfortable. We will work together to navigate the digital world safely.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-balanced-11-13',
      type: 'screen_time',
      title: 'Screen Time Guidelines',
      description: 'Daily guidelines for recreational screen time.',
      defaultValue:
        'School days: About 2 hours of recreational screen time.\nWeekends: About 3 hours, with flexibility for special occasions.\nHomework and educational content are separate.\nBalance is key - make time for other activities.\nLearn to manage your own time within these guidelines.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-balanced-11-13',
      type: 'monitoring_rules',
      title: 'Parental Involvement',
      description: 'How parents will stay involved in your digital life.',
      defaultValue:
        'Parents have passwords but will respect privacy unless concerned.\nRegular conversations about online activities.\nParents may check devices occasionally.\nLocation sharing during outings.\nShare interesting or concerning things you encounter online.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-balanced-11-13',
      type: 'bedtime_schedule',
      title: 'Device Schedule',
      description: 'When devices should be put away.',
      defaultValue:
        'Devices off 45 minutes before bedtime.\nDevices charge in a common area overnight.\nNo devices during meals or family time.\nBe present and engaged during face-to-face conversations.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-balanced-11-13',
      type: 'app_restrictions',
      title: 'Apps and Social Media',
      description: 'Guidelines for apps, games, and social platforms.',
      defaultValue:
        'Discuss new apps and social media with parents before signing up.\nParents should be aware of your accounts.\nKeep profiles private and only connect with people you know in real life.\nAge-appropriate games and content.\nNo apps that hide activity or messages.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-balanced-11-13',
      type: 'content_filters',
      title: 'Content Guidelines',
      description: 'What types of content are appropriate.',
      defaultValue:
        'Stick to age-appropriate content.\nAvoid violent, explicit, or harmful material.\nThink before you post - would you be okay with anyone seeing it?\nDo not participate in harmful trends or challenges.\nReport bullying, harassment, or anything that concerns you.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-balanced-11-13',
      type: 'consequences',
      title: 'Consequences',
      description: 'What happens when rules are broken.',
      defaultValue:
        'First issue: Conversation about what happened and why.\nRepeated issues: Temporary reduction in screen time or privileges.\nSerious issues: More significant restrictions and a plan to rebuild trust.\nWe will always talk through problems and learn from them.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-balanced-11-13',
      type: 'rewards',
      title: 'Building Trust and Freedom',
      description: 'How to earn more independence.',
      defaultValue:
        'Honest communication leads to more trust.\nResponsible behavior earns more flexibility.\nGood grades may mean more screen time for fun.\nShowing maturity leads to considering new platforms.\nYour input matters in family tech decisions.',
      customizable: true,
      order: 7,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * Permissive template for ages 11-13
 * Trust-based approach with greater independence
 */
export const ages11to13Permissive: AgreementTemplate = {
  id: 'a3b1c6d8-9012-2345-6789-390123456789',
  name: 'Early Teen - Permissive',
  description:
    'A trust-based approach for mature early teens. Greater independence for those who have demonstrated responsible digital citizenship.',
  ageGroup: '11-13',
  variation: 'permissive',
  concerns: ['safety', 'social_media', 'screen_time'],
  summary: {
    screenTimeLimit: '2.5 hours on school days, flexible on weekends',
    monitoringLevel: 'light',
    keyRules: [
      'Make good choices independently',
      'Stay safe and be kind online',
      'Come to parents with concerns',
      'Maintain balance in your life',
      'Be honest about your activities',
    ],
  },
  sections: [
    {
      id: 'terms-permissive-11-13',
      type: 'terms',
      title: 'Our Family Technology Agreement',
      description: 'The core principles we agree to follow for technology use.',
      defaultValue:
        'My family trusts me to use technology wisely. I will continue to earn this trust through responsible behavior. I will be honest and come to my parents if I face challenges or see something concerning online. We are partners in navigating the digital world.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-permissive-11-13',
      type: 'screen_time',
      title: 'Screen Time',
      description: 'General expectations for screen time.',
      defaultValue:
        'School days: Around 2.5 hours is reasonable.\nWeekends: Flexible, based on other responsibilities and activities.\nYou are trusted to manage your time.\nMaintain balance - screen time should not replace sleep, exercise, or relationships.\nEducational use is encouraged.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-permissive-11-13',
      type: 'monitoring_rules',
      title: 'Family Communication',
      description: 'How we stay connected about your digital life.',
      defaultValue:
        'Share your online experiences with family.\nParents trust you but are here to help.\nLocation sharing when you are out.\nOccasional conversations about what you are doing online.\nAsk parents for advice when unsure about something.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-permissive-11-13',
      type: 'bedtime_schedule',
      title: 'Sleep and Device Balance',
      description: 'Making sure devices do not affect sleep and wellbeing.',
      defaultValue:
        'Get enough sleep - wind down before bed.\nConsider charging devices outside your room.\nBe present during family time.\nRecognize when you need a break from screens.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-permissive-11-13',
      type: 'app_restrictions',
      title: 'Apps and Social Media',
      description: 'Guidelines for choosing apps and platforms.',
      defaultValue:
        'Make thoughtful choices about which platforms to use.\nKeep parents informed about your accounts.\nProtect your privacy - be careful what you share.\nUse your judgment about what is appropriate.\nAvoid apps known for harmful content or predatory behavior.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-permissive-11-13',
      type: 'content_filters',
      title: 'Content Choices',
      description: 'Making good choices about content.',
      defaultValue:
        'Choose content that adds value to your life.\nAvoid things that make you feel bad or are harmful.\nThink about how your posts reflect on you.\nDo not engage with trolls or toxic people.\nCome to parents if you encounter something troubling.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-permissive-11-13',
      type: 'consequences',
      title: 'If Things Go Wrong',
      description: 'How we handle mistakes.',
      defaultValue:
        'Mistakes are opportunities to learn.\nWe will discuss what happened and how to do better.\nSerious issues may require stepping back to rebuild trust.\nHonesty is always the best approach.\nWe are on the same team.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-permissive-11-13',
      type: 'rewards',
      title: 'Maintaining Trust',
      description: 'The benefits of responsible behavior.',
      defaultValue:
        'Continued trust and freedom.\nYour voice in family technology decisions.\nSupport for new interests and platforms.\nPride in being a responsible digital citizen.\nPreparation for even more independence as you grow.',
      customizable: true,
      order: 7,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * All templates for ages 11-13
 */
export const ages11to13Templates: AgreementTemplate[] = [
  ages11to13Strict,
  ages11to13Balanced,
  ages11to13Permissive,
]
