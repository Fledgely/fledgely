/**
 * Static agreement templates data.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC3
 * Story 4.2: Age-Appropriate Template Content - AC1-AC6
 *
 * Templates are organized by age group (5-7, 8-10, 11-13, 14-16) with
 * 2-3 variations per group (strict, balanced, permissive).
 *
 * Age-appropriate content:
 * - 5-7: Simple yes/no rules (3rd-grade reading level)
 * - 8-10: Gaming/education examples (4th-5th grade)
 * - 11-13: Social media/messaging context (6th grade)
 * - 14-16: Autonomy milestones toward independence (6th grade)
 */

import type { AgreementTemplate } from '@fledgely/shared/contracts'

/**
 * Pre-built agreement templates for families.
 *
 * Each template includes age-appropriate screen time limits,
 * monitoring levels, and key rules.
 */
export const AGREEMENT_TEMPLATES: AgreementTemplate[] = [
  // Age Group 5-7 (Young Children)
  // Reading level: 3rd grade, simple positive rules, parent-present focus
  {
    id: 'strict-5-7',
    name: 'Supervised Explorer',
    description:
      'For kids just starting with tablets. Mom or Dad stays with you while you play. Short fun times with learning games!',
    ageGroup: '5-7',
    variation: 'strict',
    categories: ['general'],
    screenTimeLimits: { weekday: 60, weekend: 90 },
    monitoringLevel: 'high',
    keyRules: [
      'Use tablet in the living room',
      'Ask Mom or Dad before new games',
      'No talking to strangers online',
      'No buying things in games',
      'Ask before opening new apps',
    ],
    simpleRules: [
      { text: 'Play in the living room with family', isAllowed: true },
      { text: 'Use learning games and videos', isAllowed: true },
      { text: 'Ask before trying a new app', isAllowed: true },
      { text: 'Talk to people you know in real life', isAllowed: true },
      { text: 'Buy things in games without asking', isAllowed: false },
      { text: 'Download apps by yourself', isAllowed: false },
    ],
    ruleExamples: {
      '0': 'Like when you read books on the couch with us',
      '1': 'Tell Mom or Dad you found a fun new game',
      '2': 'Only talk to Grandma, not people from games',
    },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'balanced-5-7',
    name: 'Guided Learner',
    description:
      'Learning is fun! Use your tablet for games that help you learn. Mom or Dad will check in on you while you play.',
    ageGroup: '5-7',
    variation: 'balanced',
    categories: ['general', 'homework'],
    screenTimeLimits: { weekday: 90, weekend: 120 },
    monitoringLevel: 'high',
    keyRules: [
      'Learning games are great',
      'Ask before new apps',
      'Stay in common areas',
      'No social media yet',
    ],
    simpleRules: [
      { text: 'Play learning games like ABCmouse', isAllowed: true },
      { text: 'Watch PBS Kids and educational shows', isAllowed: true },
      { text: 'Use tablet in the family room', isAllowed: true },
      { text: 'Ask before downloading something new', isAllowed: true },
      { text: 'Use social media apps', isAllowed: false },
      { text: 'Play games with strangers', isAllowed: false },
    ],
    ruleExamples: {
      '0': 'Games that help with letters, numbers, and reading',
      '1': 'Like playing in the room where everyone can see',
    },
    createdAt: new Date('2024-01-01'),
  },

  // Age Group 8-10 (Pre-Teens)
  // Reading level: 4th-5th grade, gaming/education focus, building digital citizenship
  {
    id: 'strict-8-10',
    name: 'Safe Surfer',
    description:
      'Clear rules for gaming and internet use. You can play approved games on weekends while learning good online habits.',
    ageGroup: '8-10',
    variation: 'strict',
    categories: ['general', 'gaming'],
    screenTimeLimits: { weekday: 60, weekend: 120 },
    monitoringLevel: 'high',
    keyRules: [
      'No social media accounts yet',
      'Games on weekends only',
      'Ask before downloading anything',
      'Charge device in the kitchen',
      'No messaging apps with strangers',
    ],
    ruleExamples: {
      '0': 'Social media is for when you are older - Minecraft and YouTube Kids are fine',
      '1': 'Weekday time is for homework and reading, weekends are for Roblox',
      '2': 'Found a cool game? Show your parent first before hitting download',
      '3': 'The device sleeps in the kitchen, not your room',
    },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'balanced-8-10',
    name: 'Responsible Explorer',
    description:
      'Play your favorite games and use the internet for school, but homework comes first. We will check in together about what you find online.',
    ageGroup: '8-10',
    variation: 'balanced',
    categories: ['general', 'gaming', 'homework'],
    screenTimeLimits: { weekday: 90, weekend: 150 },
    monitoringLevel: 'medium',
    keyRules: [
      'Homework before gaming',
      'Play only approved games',
      'Tell a parent about anything weird',
      'Never share your name or school online',
    ],
    ruleExamples: {
      '0': 'Finish your math worksheet before starting Fortnite',
      '1': 'We will pick games together - your parent can see what you play',
      '2': 'If someone says something mean or strange, show your parent right away',
      '3': 'Your username should not have your real name - make up a cool one',
    },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'permissive-8-10',
    name: 'Growing Independence',
    description:
      'More freedom to explore online because you are showing you can be responsible. We trust you and want to hear about your online world.',
    ageGroup: '8-10',
    variation: 'permissive',
    categories: ['general', 'gaming'],
    screenTimeLimits: { weekday: 120, weekend: 180 },
    monitoringLevel: 'medium',
    keyRules: [
      'Finish chores and homework first',
      'Tell us about cool stuff you find',
      'No devices after bedtime',
    ],
    ruleExamples: {
      '0': 'Complete your reading log before gaming time',
      '1': 'Found a new YouTube channel? Share it at dinner!',
      '2': 'Devices off by 8pm on school nights',
    },
    createdAt: new Date('2024-01-01'),
  },

  // Age Group 11-13 (Middle School)
  // Reading level: 6th grade, social media/messaging focus, building safety awareness
  {
    id: 'strict-11-13',
    name: 'Digital Guardian',
    description:
      'Social media is new territory. Your parents will guide you through it by following your accounts and helping you handle tricky situations.',
    ageGroup: '11-13',
    variation: 'strict',
    categories: ['general', 'social_media', 'gaming'],
    screenTimeLimits: { weekday: 90, weekend: 150 },
    monitoringLevel: 'high',
    keyRules: [
      'Parents follow all your social accounts',
      'No secret or private accounts',
      'Devices off by 9pm',
      'Ask before joining group chats',
      'Show parents any cyberbullying right away',
    ],
    ruleExamples: {
      '0': 'Your Instagram is connected to a parent account - they can see your posts',
      '1': 'No finsta or burner accounts - one account your parents know about',
      '2': 'Devices charge in the kitchen at 9pm on school nights',
      '3': 'New Discord server? Check with your parent first',
      '4': 'Screenshot mean messages and show a parent - they can help',
    },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'balanced-11-13',
    name: 'Connected Teen',
    description:
      'You can have social media with some supervision. We will check in weekly about what is happening online and help you stay safe.',
    ageGroup: '11-13',
    variation: 'balanced',
    categories: ['general', 'social_media', 'gaming', 'homework'],
    screenTimeLimits: { weekday: 120, weekend: 180 },
    monitoringLevel: 'medium',
    keyRules: [
      'Parents have your passwords saved',
      'No posting where you are or your school',
      'Homework done before games',
      'Weekly chat about your online week',
    ],
    ruleExamples: {
      '0': 'Passwords are in the family password manager - just in case',
      '1': 'Do not post photos showing your school name or uniform',
      '2': 'Math and science homework before TikTok or gaming',
      '3': 'Every Sunday we talk about what is new on your socials',
    },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'permissive-11-13',
    name: 'Trusted Teen',
    description:
      'You have earned more freedom online. Keep the communication open and come to us when something feels wrong.',
    ageGroup: '11-13',
    variation: 'permissive',
    categories: ['general', 'social_media'],
    screenTimeLimits: { weekday: 150, weekend: 240 },
    monitoringLevel: 'low',
    keyRules: [
      'Talk openly about your online life',
      'Come to us with any problems',
      'Keep your grades up',
    ],
    ruleExamples: {
      '0': 'Tell us about new apps or sites you are using',
      '1': 'If someone asks to meet up or for photos, tell a parent',
      '2': 'B average or higher means keeping your current screen time',
    },
    createdAt: new Date('2024-01-01'),
  },

  // Age Group 14-16 (High School)
  // Reading level: 6th grade, autonomy milestones, preparing for independence
  {
    id: 'strict-14-16',
    name: 'Focused Student',
    description:
      'School comes first right now. Meet your academic goals and unlock more freedom. This is about building the habits that lead to independence.',
    ageGroup: '14-16',
    variation: 'strict',
    categories: ['general', 'social_media', 'homework'],
    screenTimeLimits: { weekday: 120, weekend: 180 },
    monitoringLevel: 'medium',
    keyRules: [
      'Put phone away during homework',
      'Social media has a daily limit',
      'No phones at dinner table',
      'Devices off by 10pm on school nights',
      'Maintain passing grades in all classes',
    ],
    ruleExamples: {
      '0': 'Phone goes in the basket while you do homework - studies show this helps focus',
      '1': 'Two hours max on social apps per day - use the screen time tracker',
      '2': 'Family dinner is phone-free for everyone, including parents',
      '3': 'Better sleep helps your grades and your mood',
      '4': 'C or better in every class to keep current privileges',
    },
    autonomyMilestones: [
      {
        milestone: 'Maintain B average for a full semester',
        reward: 'Later device curfew (11pm)',
        description: 'Consistent grades prove you can balance tech and school',
      },
      {
        milestone: 'No rule violations for 2 months',
        reward: 'Reduced check-ins to bi-weekly',
        description: 'Following the agreement earns more trust',
      },
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'balanced-14-16',
    name: 'Emerging Adult',
    description:
      'You are almost ready for full digital independence. This agreement helps you practice adult-level responsibility while still having family support.',
    ageGroup: '14-16',
    variation: 'balanced',
    categories: ['general', 'social_media', 'gaming'],
    screenTimeLimits: { weekday: 180, weekend: 300 },
    monitoringLevel: 'low',
    keyRules: [
      'Keep grades at current level or better',
      'No devices during family time',
      'Monthly online life check-in',
      'Use your real identity online',
    ],
    ruleExamples: {
      '0': 'Your GPA stays stable - if it drops, we adjust screen time',
      '1': 'Sunday dinner and family movie night are screen-free',
      '2': 'Once a month we talk about what is happening in your digital life',
      '3': 'No anonymous accounts - own what you post',
    },
    autonomyMilestones: [
      {
        milestone: 'Get your learner permit or driver license',
        reward: 'No more location sharing requirement',
        description: 'Driving proves you are ready for more independence',
      },
      {
        milestone: 'Hold a part-time job for 3 months',
        reward: 'Manage your own screen time (honor system)',
        description: 'Work responsibility = life responsibility',
      },
      {
        milestone: 'Handle a difficult online situation maturely',
        reward: 'Parents step back from account monitoring',
        description: 'Showing you can handle drama without escalating',
      },
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'permissive-14-16',
    name: 'Independent Teen',
    description:
      'You have earned near-adult freedom. This is about staying connected with family and practicing the digital habits you will carry into adulthood.',
    ageGroup: '14-16',
    variation: 'permissive',
    categories: ['general'],
    screenTimeLimits: { weekday: 240, weekend: 360 },
    monitoringLevel: 'low',
    keyRules: [
      'Handle your responsibilities',
      'Stay reachable by family',
      'Practice safe online habits',
    ],
    ruleExamples: {
      '0': 'School, chores, and commitments first - then unlimited time is yours',
      '1': 'Respond to family texts within an hour during the day',
      '2': 'Think before you post - screenshots last forever',
    },
    autonomyMilestones: [
      {
        milestone: 'Turn 18',
        reward: 'Full transition to Reverse Mode - you control your own monitoring',
        description: 'Fledgely transitions to your control when you become a legal adult',
      },
      {
        milestone: 'Graduate high school',
        reward: 'Optional: Keep using fledgely for your own self-management',
        description: 'Many young adults find screen time tools helpful in college',
      },
    ],
    createdAt: new Date('2024-01-01'),
  },
]

/**
 * Get all available age groups.
 */
export const AGE_GROUPS = ['5-7', '8-10', '11-13', '14-16'] as const

/**
 * Get all template variations.
 */
export const TEMPLATE_VARIATIONS = ['strict', 'balanced', 'permissive'] as const

/**
 * Get all template categories.
 */
export const TEMPLATE_CATEGORIES = ['gaming', 'social_media', 'homework', 'general'] as const

/**
 * Human-readable labels for age groups.
 */
export const AGE_GROUP_LABELS: Record<string, string> = {
  '5-7': 'Ages 5-7',
  '8-10': 'Ages 8-10',
  '11-13': 'Ages 11-13',
  '14-16': 'Ages 14-16',
}

/**
 * Human-readable labels for variations.
 */
export const VARIATION_LABELS: Record<string, string> = {
  strict: 'Strict',
  balanced: 'Balanced',
  permissive: 'Permissive',
}

/**
 * Human-readable labels for categories.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  gaming: 'Gaming',
  social_media: 'Social Media',
  homework: 'Homework',
  general: 'General',
}

/**
 * Human-readable labels for monitoring levels.
 */
export const MONITORING_LEVEL_LABELS: Record<string, string> = {
  high: 'High Monitoring',
  medium: 'Medium Monitoring',
  low: 'Light Monitoring',
}
