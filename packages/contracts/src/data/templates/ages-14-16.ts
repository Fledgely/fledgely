/**
 * Agreement Templates for Ages 14-16 (Late Adolescence)
 *
 * Story 4.1: Template Library Structure
 * Story 4.2: Age-Appropriate Template Content
 *   - AC #5: Ages 14-16 templates include earned autonomy milestones
 *   - References Epic 52 Reverse Mode concepts (age 16 transition, trusted adults)
 *
 * Language level: 6th grade
 * Screen time default: 3-4 hrs/day
 * Monitoring default: Light-Moderate
 *
 * All content written at 6th-grade reading level (NFR65)
 */

import type { AgreementTemplate, AutonomyMilestone } from '../../agreement-template.schema'

/**
 * Autonomy milestones for strict variation
 * Progressive path with higher thresholds reflecting need for more trust building
 */
const strictAutonomyMilestones: AutonomyMilestone[] = [
  {
    id: 'strict-milestone-1',
    title: 'Trust Level 1: Extended Time',
    description: 'Show you can follow rules well to earn more screen time.',
    criteria: {
      trustScoreThreshold: 70,
      timeWithoutIncident: '1 month',
      parentApproval: true,
    },
    unlocks: ['30 extra minutes on weekends', 'Later bedtime on Fridays by 30 minutes'],
    order: 1,
  },
  {
    id: 'strict-milestone-2',
    title: 'Trust Level 2: More Privacy',
    description: 'Keep earning trust to have less frequent device checks.',
    criteria: {
      trustScoreThreshold: 80,
      timeWithoutIncident: '2 months',
      parentApproval: true,
    },
    unlocks: [
      'Weekly check-ins instead of daily',
      'Choose one new app to try',
      'Control your own bedtime on weekends',
    ],
    order: 2,
  },
  {
    id: 'strict-milestone-3',
    title: 'Trust Level 3: Self-Managed Time',
    description: 'Prove yourself ready to manage your own screen time.',
    criteria: {
      trustScoreThreshold: 85,
      timeWithoutIncident: '3 months',
      parentApproval: true,
    },
    unlocks: [
      'Self-managed weekend screen time',
      'Monthly check-ins',
      'Input on new app decisions',
    ],
    order: 3,
  },
  {
    id: 'strict-milestone-4',
    title: 'Trust Level 4: Preparing for Independence',
    description: 'Show you are ready for near-adult independence.',
    criteria: {
      trustScoreThreshold: 90,
      timeWithoutIncident: '6 months',
      parentApproval: true,
    },
    unlocks: [
      'Full self-managed time (with basic boundaries)',
      'Occasional check-ins only',
      'Help set rules for younger family members',
      'Preparation for age 16 transition',
    ],
    order: 4,
  },
]

/**
 * Autonomy milestones for balanced variation
 * Moderate progression for teens building trust
 */
const balancedAutonomyMilestones: AutonomyMilestone[] = [
  {
    id: 'balanced-milestone-1',
    title: 'Trust Level 1: Flexible Weekends',
    description: 'Show responsible use to earn more weekend freedom.',
    criteria: {
      trustScoreThreshold: 65,
      timeWithoutIncident: '3 weeks',
      parentApproval: true,
    },
    unlocks: ['Self-managed weekend time', 'Later weekend bedtimes', 'Try one new platform'],
    order: 1,
  },
  {
    id: 'balanced-milestone-2',
    title: 'Trust Level 2: Increased Privacy',
    description: 'Keep being responsible to have more digital privacy.',
    criteria: {
      trustScoreThreshold: 75,
      timeWithoutIncident: '6 weeks',
      parentApproval: true,
    },
    unlocks: [
      'Bi-weekly check-ins instead of weekly',
      'Private messaging without routine review',
      'Control bedtime on school nights',
    ],
    order: 2,
  },
  {
    id: 'balanced-milestone-3',
    title: 'Trust Level 3: Near-Adult Freedom',
    description: 'Prove you are ready for adult-like digital independence.',
    criteria: {
      trustScoreThreshold: 85,
      timeWithoutIncident: '3 months',
      parentApproval: true,
    },
    unlocks: [
      'Fully self-managed time',
      'Monthly family conversations instead of check-ins',
      'Input on all technology decisions',
      'Trusted adult status for younger siblings',
    ],
    order: 3,
  },
]

/**
 * Autonomy milestones for permissive variation
 * Faster progression for teens who have already demonstrated maturity
 */
const permissiveAutonomyMilestones: AutonomyMilestone[] = [
  {
    id: 'permissive-milestone-1',
    title: 'Full Independence Track',
    description: 'Continue showing maturity to keep your current freedom.',
    criteria: {
      trustScoreThreshold: 60,
      timeWithoutIncident: '2 weeks',
      parentApproval: true,
    },
    unlocks: [
      'Maintain current high level of freedom',
      'Reduced check-ins',
      'Input on family technology policies',
    ],
    order: 1,
  },
  {
    id: 'permissive-milestone-2',
    title: 'Trusted Adult Preparation',
    description: 'Prepare for the transition to adult independence at age 16.',
    criteria: {
      trustScoreThreshold: 75,
      timeWithoutIncident: '2 months',
      parentApproval: true,
    },
    unlocks: [
      'Full digital autonomy',
      'Family advisor role for technology decisions',
      'Help guide younger family members',
      'Age 16 reverse mode transition eligibility',
    ],
    order: 2,
  },
]

/**
 * Strict template for ages 14-16
 * More monitoring for teens who need additional structure
 */
export const ages14to16Strict: AgreementTemplate = {
  id: 'a4b2c7d9-0123-3456-7890-401234567890',
  name: 'Older Teen - Strict',
  description:
    'A structured approach for older teens. Clear boundaries provide guidance while preparing for future independence.',
  ageGroup: '14-16',
  variation: 'strict',
  concerns: ['social_media', 'screen_time', 'gaming', 'homework', 'safety'],
  summary: {
    screenTimeLimit: '2 hours on school days, 3 hours on weekends',
    monitoringLevel: 'moderate',
    keyRules: [
      'Parents have account access',
      'School responsibilities come first',
      'No hidden apps or accounts',
      'Device-free zones and times',
      'Regular check-ins about online life',
    ],
  },
  sections: [
    {
      id: 'terms-strict-14-16',
      type: 'terms',
      title: 'Family Technology Contract',
      description: 'The principles guiding our technology use.',
      defaultValue:
        'I understand that while I am gaining more independence, my parents still play an important role in guiding my digital life. I agree to follow our family rules honestly. I will communicate openly about my online activities and come to my parents with concerns. I am working toward full independence by demonstrating responsibility.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-strict-14-16',
      type: 'screen_time',
      title: 'Screen Time Limits',
      description: 'Guidelines for recreational screen time.',
      defaultValue:
        'School days: 2 hours of recreational screen time after academic responsibilities are complete.\nWeekends: 3 hours total recreational screen time.\nAcademic and creative work are separate from these limits.\nNo all-night gaming or social media sessions.\nTrack your own time and be honest about it.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-strict-14-16',
      type: 'monitoring_rules',
      title: 'Parental Oversight',
      description: 'How parents will stay involved.',
      defaultValue:
        'Parents have access to accounts and devices.\nWeekly discussions about online activities.\nParents may review content occasionally.\nLocation sharing is required when out.\nTransparency about new accounts or apps.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-strict-14-16',
      type: 'bedtime_schedule',
      title: 'Device Schedule',
      description: 'When devices should be put away.',
      defaultValue:
        'School nights: Devices off by 10:00 PM.\nWeekend nights: Devices off by 11:00 PM.\nNo devices during study time without permission.\nDevices charge outside of bedrooms.\nBe present and device-free during family activities.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-strict-14-16',
      type: 'app_restrictions',
      title: 'Apps and Social Media',
      description: 'Rules for apps and online platforms.',
      defaultValue:
        'All social media accounts must be known to parents.\nNo anonymous or hidden accounts.\nParents should be able to follow or friend you.\nDiscuss new platforms before joining.\nNo apps designed to hide conversations or activity.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-strict-14-16',
      type: 'content_filters',
      title: 'Content Standards',
      description: 'Expectations for online content.',
      defaultValue:
        'No explicit, illegal, or harmful content.\nThink before posting - your digital footprint matters for college and jobs.\nNo engaging with online drama or bullying.\nReport concerning content or behavior.\nRepresent yourself and our family well online.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-strict-14-16',
      type: 'consequences',
      title: 'Consequences',
      description: 'What happens when rules are broken.',
      defaultValue:
        'First violation: Serious discussion and warning.\nRepeated violations: Loss of specific privileges (gaming, social media, etc.).\nMajor violations: Extended loss of device access.\nDishonesty or hidden activity: Significant restrictions and rebuilding trust.\nAll consequences are discussed and aimed at learning, not punishment.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-strict-14-16',
      type: 'rewards',
      title: 'Earning More Freedom',
      description: 'How to build trust and gain independence.',
      defaultValue:
        'Consistent responsibility: Gradually relaxed monitoring.\nGood grades and priorities: More flexibility with time.\nHonest communication: Consideration for new privileges.\nDemonstrated maturity: Input on rule adjustments.\nGoal: Full digital independence by adulthood.',
      customizable: true,
      order: 7,
    },
  ],
  autonomyMilestones: strictAutonomyMilestones,
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * Balanced template for ages 14-16
 * Moderate oversight with increasing independence
 */
export const ages14to16Balanced: AgreementTemplate = {
  id: 'a5b3c8d0-1234-4567-8901-512345678901',
  name: 'Older Teen - Balanced',
  description:
    'A balanced approach for older teens. Provides guidance while respecting growing independence and maturity.',
  ageGroup: '14-16',
  variation: 'balanced',
  concerns: ['social_media', 'screen_time', 'homework', 'safety'],
  summary: {
    screenTimeLimit: '2.5 hours on school days, 4 hours on weekends',
    monitoringLevel: 'moderate',
    keyRules: [
      'Keep parents informed, not in control',
      'Prioritize responsibilities',
      'Practice good digital citizenship',
      'Maintain sleep and wellbeing',
      'Open communication about online experiences',
    ],
  },
  sections: [
    {
      id: 'terms-balanced-14-16',
      type: 'terms',
      title: 'Family Technology Contract',
      description: 'The principles guiding our technology use.',
      defaultValue:
        'I am developing into a responsible digital citizen. I will make thoughtful choices about my technology use. I will maintain open communication with my parents about my online life. I understand that with more freedom comes more responsibility. We are partners in this journey.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-balanced-14-16',
      type: 'screen_time',
      title: 'Screen Time Guidelines',
      description: 'General expectations for screen time.',
      defaultValue:
        'School days: Around 2.5 hours of recreational time is reasonable.\nWeekends: Around 4 hours, with flexibility for activities and social plans.\nAcademic work is separate.\nYou manage your own time, with parents as backup.\nMaintain balance with sleep, exercise, and in-person relationships.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-balanced-14-16',
      type: 'monitoring_rules',
      title: 'Family Involvement',
      description: 'How parents stay connected to your digital life.',
      defaultValue:
        'Share your online experiences willingly.\nParents know your main accounts.\nOccasional check-ins rather than constant monitoring.\nLocation sharing for safety.\nParents available to help with any issues.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-balanced-14-16',
      type: 'bedtime_schedule',
      title: 'Sleep and Wellbeing',
      description: 'Maintaining healthy habits around devices.',
      defaultValue:
        'Get adequate sleep - screens off in reasonable time.\nConsider keeping devices out of bedroom for better sleep.\nBe present during family meals and events.\nRecognize when you need digital breaks.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-balanced-14-16',
      type: 'app_restrictions',
      title: 'Apps and Social Media',
      description: 'Guidelines for digital platforms.',
      defaultValue:
        'Make informed choices about which platforms you use.\nLet parents know about your accounts.\nProtect your privacy and reputation.\nAvoid platforms known for toxicity or danger.\nBe selective about who you connect with online.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-balanced-14-16',
      type: 'content_filters',
      title: 'Content and Conduct',
      description: 'Expectations for online behavior.',
      defaultValue:
        'Be a good digital citizen - kind, thoughtful, honest.\nAvoid content that is harmful or illegal.\nConsider your digital footprint and future.\nDo not engage in or tolerate bullying or harassment.\nTalk to parents about anything concerning.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-balanced-14-16',
      type: 'consequences',
      title: 'When Things Go Wrong',
      description: 'How we handle problems.',
      defaultValue:
        'Issues lead to conversation and problem-solving.\nRepeated poor choices may result in temporary restrictions.\nSerious issues require more significant intervention.\nHonesty is always better than hiding mistakes.\nGoal is learning and growth, not punishment.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-balanced-14-16',
      type: 'rewards',
      title: 'Growing Independence',
      description: 'The path toward full digital independence.',
      defaultValue:
        'Responsible behavior leads to more freedom.\nYour input shapes family technology decisions.\nDemonstrating maturity earns more trust.\nPreparation for full independence as an adult.\nRecognition for being a positive digital citizen.',
      customizable: true,
      order: 7,
    },
  ],
  autonomyMilestones: balancedAutonomyMilestones,
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * Permissive template for ages 14-16
 * Trust-based approach for mature teens approaching adulthood
 */
export const ages14to16Permissive: AgreementTemplate = {
  id: 'a6b4c9d1-2345-5678-9012-623456789012',
  name: 'Older Teen - Permissive',
  description:
    'A trust-based approach for mature older teens. Near-adult independence for those who have proven they can handle it.',
  ageGroup: '14-16',
  variation: 'permissive',
  concerns: ['safety', 'social_media'],
  summary: {
    screenTimeLimit: '3 hours on school days, self-managed on weekends',
    monitoringLevel: 'light',
    keyRules: [
      'You are responsible for your choices',
      'Stay safe and make wise decisions',
      'Maintain your priorities',
      'Be honest with family',
      'Ask for help when needed',
    ],
  },
  sections: [
    {
      id: 'terms-permissive-14-16',
      type: 'terms',
      title: 'Family Technology Understanding',
      description: 'Our shared principles for technology.',
      defaultValue:
        'My family trusts me to manage my digital life responsibly. I will continue to earn this trust through my choices and actions. I know my parents are here to support me, not control me. I will be honest and ask for help when I need it. I am preparing for full independence as an adult.',
      customizable: true,
      order: 0,
    },
    {
      id: 'screen-time-permissive-14-16',
      type: 'screen_time',
      title: 'Managing Your Time',
      description: 'Your responsibility for managing screen time.',
      defaultValue:
        'School days: Keep recreational time reasonable (around 3 hours).\nWeekends: Self-managed based on responsibilities and activities.\nYou own your schedule and choices.\nMaintain balance - do not let screens crowd out sleep, health, or relationships.\nAcademic and personal growth come first.',
      customizable: true,
      order: 1,
    },
    {
      id: 'monitoring-permissive-14-16',
      type: 'monitoring_rules',
      title: 'Family Connection',
      description: 'Staying connected while respecting independence.',
      defaultValue:
        'Share your digital life because you want to, not because you have to.\nParents are available for guidance and support.\nLocation sharing for safety during outings.\nOccasional conversations about online trends and experiences.\nCome to parents with problems - we are on your side.',
      customizable: true,
      order: 2,
    },
    {
      id: 'bedtime-permissive-14-16',
      type: 'bedtime_schedule',
      title: 'Your Wellbeing',
      description: 'Taking care of yourself.',
      defaultValue:
        'Get the sleep you need to function well.\nMake your own decisions about device use at night.\nBe present for important family moments.\nTake breaks when screens are affecting your mood or health.',
      customizable: true,
      order: 3,
    },
    {
      id: 'apps-permissive-14-16',
      type: 'app_restrictions',
      title: 'Your Digital Choices',
      description: 'Guidelines for platforms and apps.',
      defaultValue:
        'Choose platforms that add value to your life.\nProtect your privacy and personal information.\nBe thoughtful about your digital footprint.\nAvoid toxic communities and harmful content.\nYour reputation online matters for your future.',
      customizable: true,
      order: 4,
    },
    {
      id: 'content-permissive-14-16',
      type: 'content_filters',
      title: 'Being a Good Digital Citizen',
      description: 'Expectations for conduct.',
      defaultValue:
        'Be kind, honest, and respectful online.\nDo not create, share, or engage with harmful content.\nStand up against bullying and harassment.\nThink about how your actions affect others.\nUse technology to make a positive impact.',
      customizable: true,
      order: 5,
    },
    {
      id: 'consequences-permissive-14-16',
      type: 'consequences',
      title: 'When Issues Arise',
      description: 'Handling mistakes and problems.',
      defaultValue:
        'Mistakes are part of learning.\nWe will discuss problems honestly and find solutions together.\nSerious issues may require temporary adjustments.\nTrust can be rebuilt through consistent good choices.\nYou are responsible for the consequences of your actions.',
      customizable: true,
      order: 6,
    },
    {
      id: 'rewards-permissive-14-16',
      type: 'rewards',
      title: 'The Benefits of Responsibility',
      description: 'What comes with demonstrating maturity.',
      defaultValue:
        'Continued trust and freedom.\nFull preparation for adult independence.\nA positive relationship with technology.\nThe skills to manage digital life on your own.\nPride in being someone others can count on.',
      customizable: true,
      order: 7,
    },
  ],
  autonomyMilestones: permissiveAutonomyMilestones,
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

/**
 * All templates for ages 14-16
 */
export const ages14to16Templates: AgreementTemplate[] = [
  ages14to16Strict,
  ages14to16Balanced,
  ages14to16Permissive,
]
