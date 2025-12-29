/**
 * Crisis Allowlist Data
 *
 * Story 7.1: Crisis Allowlist Data Structure
 *
 * This file contains the complete list of crisis resources that are ALWAYS
 * protected from monitoring. Visits to these resources are NEVER logged,
 * captured, or reported to parents.
 *
 * FR61: System maintains a public crisis allowlist
 * FR62: Visits to crisis-allowlisted resources are never logged or captured
 * NFR28: Crisis allowlist cached locally; functions without cloud connectivity
 *
 * IMPORTANT: All descriptions are written at 6th-grade reading level (NFR65)
 */

import type { CrisisAllowlist, CrisisResource } from '../contracts'

/**
 * Current version of the crisis allowlist.
 * Increment when resources are added, removed, or modified.
 */
export const CRISIS_ALLOWLIST_VERSION = '1.0.0'

/**
 * National Suicide Prevention Resources
 */
const suicidePreventionResources: CrisisResource[] = [
  {
    id: 'suicide-988-lifeline',
    domain: '988lifeline.org',
    pattern: '*.988lifeline.org',
    category: 'suicide_prevention',
    name: '988 Suicide & Crisis Lifeline',
    description:
      'Free help for anyone feeling sad, scared, or thinking about hurting themselves. Available 24 hours a day.',
    phone: '988',
    text: 'Text 988',
    aliases: ['988suicide.org', 'suicidepreventionlifeline.org'],
    regional: false,
  },
  {
    id: 'suicide-afsp',
    domain: 'afsp.org',
    pattern: '*.afsp.org',
    category: 'suicide_prevention',
    name: 'American Foundation for Suicide Prevention',
    description:
      'Information and resources for people who are struggling or who want to help others.',
    phone: '988',
    text: null,
    aliases: [],
    regional: false,
  },
  {
    id: 'suicide-imalive',
    domain: 'imalive.org',
    pattern: null,
    category: 'suicide_prevention',
    name: 'IMAlive',
    description:
      'Online chat with trained helpers who care. Available when you need someone to talk to.',
    phone: null,
    text: null,
    aliases: ['im-alive.org'],
    regional: false,
  },
]

/**
 * General Crisis Resources
 */
const crisisGeneralResources: CrisisResource[] = [
  {
    id: 'crisis-text-line',
    domain: 'crisistextline.org',
    pattern: '*.crisistextline.org',
    category: 'crisis_general',
    name: 'Crisis Text Line',
    description:
      'Free texting support for any crisis. Text HOME to get help from a trained person.',
    phone: null,
    text: 'Text HOME to 741741',
    aliases: ['crisistextline.com'],
    regional: false,
  },
  {
    id: 'crisis-samhsa',
    domain: 'samhsa.gov',
    pattern: '*.samhsa.gov',
    category: 'crisis_general',
    name: 'SAMHSA National Helpline',
    description:
      'Free help finding treatment for mental health and substance use problems. Available 24/7.',
    phone: '1-800-662-4357',
    text: null,
    aliases: [],
    regional: false,
  },
]

/**
 * Domestic Violence Resources
 */
const domesticViolenceResources: CrisisResource[] = [
  {
    id: 'dv-hotline',
    domain: 'thehotline.org',
    pattern: '*.thehotline.org',
    category: 'domestic_violence',
    name: 'National Domestic Violence Hotline',
    description:
      'Help for anyone being hurt by someone in their family or home. Safe, private, and free.',
    phone: '1-800-799-7233',
    text: 'Text START to 88788',
    aliases: ['ndvh.org', 'domesticviolencehotline.org'],
    regional: false,
  },
  {
    id: 'dv-loveisrespect',
    domain: 'loveisrespect.org',
    pattern: '*.loveisrespect.org',
    category: 'domestic_violence',
    name: 'Love Is Respect',
    description: 'Help for teens about healthy relationships. Learn what healthy love looks like.',
    phone: '1-866-331-9474',
    text: 'Text LOVEIS to 22522',
    aliases: [],
    regional: false,
  },
]

/**
 * Child Abuse Resources
 */
const childAbuseResources: CrisisResource[] = [
  {
    id: 'child-childhelp',
    domain: 'childhelp.org',
    pattern: '*.childhelp.org',
    category: 'child_abuse',
    name: 'Childhelp National Child Abuse Hotline',
    description:
      'Help for kids or adults worried about a child being hurt. Always private and safe.',
    phone: '1-800-422-4453',
    text: null,
    aliases: [],
    regional: false,
  },
  {
    id: 'child-stopitnow',
    domain: 'stopitnow.org',
    pattern: '*.stopitnow.org',
    category: 'child_abuse',
    name: 'Stop It Now',
    description: 'Help preventing child sexual abuse. Resources for families and concerned adults.',
    phone: '1-888-773-8368',
    text: null,
    aliases: [],
    regional: false,
  },
]

/**
 * Sexual Assault Resources
 */
const sexualAssaultResources: CrisisResource[] = [
  {
    id: 'sa-rainn',
    domain: 'rainn.org',
    pattern: '*.rainn.org',
    category: 'sexual_assault',
    name: 'RAINN',
    description:
      'Help for anyone who has been hurt sexually. Private chat and phone support available.',
    phone: '1-800-656-4673',
    text: null,
    aliases: [],
    regional: false,
  },
]

/**
 * LGBTQ+ Support Resources
 */
const lgbtqSupportResources: CrisisResource[] = [
  {
    id: 'lgbtq-trevor',
    domain: 'thetrevorproject.org',
    pattern: '*.thetrevorproject.org',
    category: 'lgbtq_support',
    name: 'The Trevor Project',
    description: 'Help for LGBTQ+ young people. Free and private support by phone, chat, or text.',
    phone: '1-866-488-7386',
    text: 'Text START to 678-678',
    aliases: ['trevorproject.org', 'thetrevoproject.org', 'trevorspace.org'],
    regional: false,
  },
  {
    id: 'lgbtq-translifeline',
    domain: 'translifeline.org',
    pattern: '*.translifeline.org',
    category: 'lgbtq_support',
    name: 'Trans Lifeline',
    description: 'Support for trans and questioning people. Run by trans people who understand.',
    phone: '1-877-565-8860',
    text: null,
    aliases: [],
    regional: false,
  },
  {
    id: 'lgbtq-glbt-hotline',
    domain: 'lgbthotline.org',
    pattern: '*.lgbthotline.org',
    category: 'lgbtq_support',
    name: 'GLBT National Hotline',
    description: 'Support for LGBTQ+ people of all ages. Free and confidential.',
    phone: '1-888-843-4564',
    text: null,
    aliases: ['glbtnationalhotline.org', 'glbthotline.org'],
    regional: false,
  },
]

/**
 * Eating Disorder Resources
 */
const eatingDisorderResources: CrisisResource[] = [
  {
    id: 'ed-neda',
    domain: 'nationaleatingdisorders.org',
    pattern: '*.nationaleatingdisorders.org',
    category: 'eating_disorder',
    name: 'NEDA (National Eating Disorders Association)',
    description:
      'Help for people struggling with eating or body image. Free and confidential support.',
    phone: '1-800-931-2237',
    text: 'Text NEDA to 741741',
    aliases: ['nedawareness.org'],
    regional: false,
  },
]

/**
 * Mental Health Resources
 */
const mentalHealthResources: CrisisResource[] = [
  {
    id: 'mh-nami',
    domain: 'nami.org',
    pattern: '*.nami.org',
    category: 'mental_health',
    name: 'NAMI (National Alliance on Mental Illness)',
    description:
      'Support for anyone dealing with mental health challenges. Information and help finding resources.',
    phone: '1-800-950-6264',
    text: 'Text NAMI to 741741',
    aliases: [],
    regional: false,
  },
  {
    id: 'mh-mha',
    domain: 'mhanational.org',
    pattern: '*.mhanational.org',
    category: 'mental_health',
    name: 'Mental Health America',
    description: 'Information and tools for mental health. Free screenings and resources.',
    phone: null,
    text: null,
    aliases: ['mentalhealthamerica.net'],
    regional: false,
  },
]

/**
 * Substance Abuse Resources
 */
const substanceAbuseResources: CrisisResource[] = [
  {
    id: 'sa-aa',
    domain: 'aa.org',
    pattern: '*.aa.org',
    category: 'substance_abuse',
    name: 'Alcoholics Anonymous',
    description: 'Help for anyone who wants to stop drinking. Find meetings and support.',
    phone: null,
    text: null,
    aliases: ['alcoholics-anonymous.org'],
    regional: false,
  },
  {
    id: 'sa-na',
    domain: 'na.org',
    pattern: '*.na.org',
    category: 'substance_abuse',
    name: 'Narcotics Anonymous',
    description: 'Help for anyone who wants to stop using drugs. Find meetings and support.',
    phone: null,
    text: null,
    aliases: ['narcotics-anonymous.org'],
    regional: false,
  },
]

/**
 * All crisis resources combined.
 */
export const CRISIS_RESOURCES: CrisisResource[] = [
  ...suicidePreventionResources,
  ...crisisGeneralResources,
  ...domesticViolenceResources,
  ...childAbuseResources,
  ...sexualAssaultResources,
  ...lgbtqSupportResources,
  ...eatingDisorderResources,
  ...mentalHealthResources,
  ...substanceAbuseResources,
]

/**
 * The complete crisis allowlist with versioning.
 *
 * Story 7.1: Crisis Allowlist Data Structure - AC4, AC5
 */
export const CRISIS_ALLOWLIST: CrisisAllowlist = {
  version: CRISIS_ALLOWLIST_VERSION,
  lastUpdated: '2025-12-29T00:00:00.000Z',
  resources: CRISIS_RESOURCES,
}

/**
 * Get all resources in a specific category.
 *
 * @param category - Category to filter by
 * @returns Array of resources in that category
 */
export function getResourcesByCategory(category: CrisisResource['category']): CrisisResource[] {
  return CRISIS_RESOURCES.filter((r) => r.category === category)
}

/**
 * Get all unique domains for quick lookup.
 * Includes primary domains, wildcard base domains, and aliases.
 *
 * @returns Set of all protected domains
 */
export function getAllProtectedDomains(): Set<string> {
  const domains = new Set<string>()

  for (const resource of CRISIS_RESOURCES) {
    // Add primary domain
    domains.add(resource.domain.toLowerCase())

    // Add wildcard base domain
    if (resource.pattern) {
      domains.add(resource.pattern.replace('*.', '').toLowerCase())
    }

    // Add aliases
    for (const alias of resource.aliases) {
      domains.add(alias.toLowerCase())
    }
  }

  return domains
}
