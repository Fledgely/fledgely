/**
 * MediationResourceService - Story 34.5.2 Task 2
 *
 * Service for retrieving mediation resources based on child's age.
 * AC2: Link to Family Communication Resources
 * AC3: Family Meeting Template Access
 * AC4: Age-Appropriate Negotiation Tips
 *
 * CRITICAL: All content must be supportive, not accusatory (AC5)
 */

import type {
  AgeTier,
  MediationResource,
  FamilyMeetingTemplate,
  NegotiationTip,
} from '../contracts/mediationResources'

// ============================================
// Age Tier Calculation
// ============================================

/**
 * Calculate age tier from child's birthdate.
 * @param birthDate - Child's date of birth
 * @returns Age tier for content adaptation
 */
export function getAgeTier(birthDate: Date): AgeTier {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  if (age >= 15) {
    return 'teen-15-17'
  } else if (age >= 12) {
    return 'tween-12-14'
  } else {
    return 'child-8-11'
  }
}

// ============================================
// Family Meeting Templates
// ============================================

/**
 * Family meeting templates by age tier.
 * AC3: Template includes parent concerns, child concerns, compromises.
 * AC5: All content is supportive and empowering.
 */
export const FAMILY_MEETING_TEMPLATES: Record<AgeTier, FamilyMeetingTemplate> = {
  'child-8-11': {
    id: 'family-meeting-child-8-11',
    title: 'Family Talk Time',
    introduction:
      "Let's have a family talk! This is a time for everyone to share their thoughts and feelings. Remember, we're all on the same team.",
    parentSection: {
      heading: "What's on Your Mind, Grown-ups?",
      prompts: [
        'What are you worried about?',
        'What do you hope will happen?',
        'What makes you feel good about our family?',
      ],
    },
    childSection: {
      heading: "What's on Your Mind?",
      prompts: [
        'What feels unfair right now?',
        'What do you wish you could do?',
        'What makes you feel happy?',
      ],
    },
    jointSection: {
      heading: 'Working Together',
      prompts: [
        'What can we try that works for everyone?',
        'What are we willing to give up a little?',
        'How can we check if our new plan is working?',
      ],
    },
    closingNotes:
      "Great job talking together! Remember, it's okay if we don't solve everything today. What matters is that we're listening to each other.",
    ageTier: 'child-8-11',
  },
  'tween-12-14': {
    id: 'family-meeting-tween-12-14',
    title: 'Family Discussion Guide',
    introduction:
      "This is a structured way for your family to talk through disagreements. The goal isn't to win—it's to understand each other better and find solutions that work for everyone.",
    parentSection: {
      heading: 'Parent Perspective',
      prompts: [
        'What concerns do you have about the current situation?',
        'What values or priorities are driving your decisions?',
        'What would help you feel more comfortable?',
      ],
    },
    childSection: {
      heading: 'Your Perspective',
      prompts: [
        'What feels unfair or frustrating right now?',
        'What do you need your parents to understand?',
        'What would you like to see change?',
      ],
    },
    jointSection: {
      heading: 'Finding Middle Ground',
      prompts: [
        'What compromises could work for both sides?',
        'What are you each willing to try?',
        'How will you know if the new agreement is working?',
      ],
    },
    closingNotes:
      "Remember, good communication takes practice. It's okay if you don't resolve everything in one conversation. The important thing is that you're talking and listening to each other.",
    ageTier: 'tween-12-14',
  },
  'teen-15-17': {
    id: 'family-meeting-teen-15-17',
    title: 'Family Negotiation Framework',
    introduction:
      "This framework helps families navigate disagreements constructively. The goal is mutual understanding and collaborative problem-solving. Each person's perspective is valuable and deserves to be heard.",
    parentSection: {
      heading: 'Parent Concerns',
      prompts: [
        'What specific concerns are driving your current position?',
        'What underlying values or responsibilities inform your decisions?',
        'What conditions would help you feel confident in a different approach?',
      ],
    },
    childSection: {
      heading: 'Your Position',
      prompts: [
        'What aspects of the current situation feel restrictive or unfair?',
        'What do you want your parents to understand about your perspective?',
        'What responsibilities are you willing to take on?',
      ],
    },
    jointSection: {
      heading: 'Collaborative Solutions',
      prompts: [
        'What creative compromises could address both sets of concerns?',
        'What trial period or check-in system could you agree on?',
        'How can you rebuild trust if the agreement is broken?',
      ],
    },
    closingNotes:
      'Effective negotiation is a skill that will serve you throughout life. Even if you disagree, treating each other with respect strengthens your relationship. Consider revisiting this conversation after trying new approaches.',
    ageTier: 'teen-15-17',
  },
}

// ============================================
// Negotiation Tips
// ============================================

/**
 * Negotiation tips by age tier.
 * AC4: Tips are practical and actionable.
 * AC5: All content is empowering, not accusatory.
 */
export const NEGOTIATION_TIPS: Record<AgeTier, NegotiationTip[]> = {
  'child-8-11': [
    {
      id: 'tip-child-1',
      title: 'Pick the Right Time',
      shortDescription: 'Wait for a good moment to talk',
      fullContent:
        "Ask your parents to talk when they're not busy or stressed. You could say, 'Can we talk about something important when you have time?' This shows you respect their time and makes them more likely to listen.",
      ageTier: 'child-8-11',
      order: 0,
    },
    {
      id: 'tip-child-2',
      title: 'Use Your Listening Ears',
      shortDescription: 'Listen to understand, not just to reply',
      fullContent:
        "Before you share your ideas, really listen to what your parents are saying. Try to understand why they feel the way they do. Then you can say, 'I understand that you're worried about...' This helps everyone feel heard.",
      ageTier: 'child-8-11',
      order: 1,
    },
    {
      id: 'tip-child-3',
      title: 'Share Your Feelings',
      shortDescription: 'Explain how you feel using "I" statements',
      fullContent:
        "Instead of saying 'You never let me...', try 'I feel frustrated when...' This helps your parents understand your feelings without making them feel attacked. Feelings are important and deserve to be shared!",
      ageTier: 'child-8-11',
      order: 2,
    },
    {
      id: 'tip-child-4',
      title: 'Suggest a Compromise',
      shortDescription: 'Offer a middle-ground solution',
      fullContent:
        "Think of a solution that gives everyone a little of what they want. For example, 'What if I finished my homework first, and then I could have extra time?' Compromises show you're willing to work together.",
      ageTier: 'child-8-11',
      order: 3,
    },
  ],
  'tween-12-14': [
    {
      id: 'tip-tween-1',
      title: 'Choose Your Moment',
      shortDescription: 'Timing matters for important conversations',
      fullContent:
        "Don't bring up important topics when your parents are stressed, tired, or in a rush. Instead, ask if there's a good time to talk. You might say, 'I'd like to discuss something with you—when would be a good time?' This shows maturity and respect.",
      ageTier: 'tween-12-14',
      order: 0,
    },
    {
      id: 'tip-tween-2',
      title: 'Understand Their Perspective',
      shortDescription: "Try to see things from your parents' point of view",
      fullContent:
        "Before presenting your case, try to understand why your parents might say no. They might have concerns you haven't thought about. When you show you understand their perspective, they're more likely to consider yours.",
      ageTier: 'tween-12-14',
      order: 1,
    },
    {
      id: 'tip-tween-3',
      title: 'Present Your Case Calmly',
      shortDescription: 'Stay calm and use facts, not just emotions',
      fullContent:
        'Prepare what you want to say beforehand. Use facts and examples to support your request. Stay calm even if you feel frustrated. Yelling or crying might feel natural, but it usually makes it harder for parents to say yes.',
      ageTier: 'tween-12-14',
      order: 2,
    },
    {
      id: 'tip-tween-4',
      title: 'Offer to Earn Trust',
      shortDescription: 'Suggest ways to prove your responsibility',
      fullContent:
        "If your parents are worried about something, offer a trial period or a way to show you can handle the responsibility. For example, 'What if we try this for two weeks and see how it goes?' This shows maturity and willingness to compromise.",
      ageTier: 'tween-12-14',
      order: 3,
    },
    {
      id: 'tip-tween-5',
      title: 'Accept the Answer Gracefully',
      shortDescription: 'Respond maturely even if the answer is no',
      fullContent:
        "If your parents say no, don't storm off or argue endlessly. Thank them for listening and ask if you can revisit the topic later. Responding maturely now makes them more likely to reconsider in the future.",
      ageTier: 'tween-12-14',
      order: 4,
    },
  ],
  'teen-15-17': [
    {
      id: 'tip-teen-1',
      title: 'Schedule the Conversation',
      shortDescription: 'Request a dedicated time to discuss important matters',
      fullContent:
        'Important conversations deserve dedicated time. Ask your parents when they could give you their full attention. This approach signals that you take the matter seriously and respect their time. It also prevents catching them off-guard.',
      ageTier: 'teen-15-17',
      order: 0,
    },
    {
      id: 'tip-teen-2',
      title: 'Acknowledge Their Concerns First',
      shortDescription: 'Show you understand before asking for change',
      fullContent:
        'Before presenting your position, explicitly acknowledge your parents\' concerns. For example: "I understand you\'re worried about my safety when I stay out late." This validates their perspective and opens them to hearing yours.',
      ageTier: 'teen-15-17',
      order: 1,
    },
    {
      id: 'tip-teen-3',
      title: 'Use Evidence and Examples',
      shortDescription: 'Support your request with concrete examples',
      fullContent:
        "Build a case with specific examples of your responsibility. Reference times you've followed through on commitments. If relevant, mention how peers handle similar situations. Parents respond better to evidence than emotional appeals alone.",
      ageTier: 'teen-15-17',
      order: 2,
    },
    {
      id: 'tip-teen-4',
      title: 'Propose Accountability Measures',
      shortDescription: 'Suggest ways to verify your responsibility',
      fullContent:
        "Proactively suggest ways your parents can verify you're being responsible. Check-in texts, location sharing, or a trial period can address their concerns while giving you more freedom. Taking initiative on accountability builds trust.",
      ageTier: 'teen-15-17',
      order: 3,
    },
    {
      id: 'tip-teen-5',
      title: 'Stay Calm Under Pressure',
      shortDescription: 'Maintain composure even when frustrated',
      fullContent:
        "Emotional reactions can undermine your position. If you feel yourself getting frustrated, take a breath before responding. Saying 'I need a moment to think' is perfectly acceptable. Staying calm demonstrates the maturity you're asking them to recognize.",
      ageTier: 'teen-15-17',
      order: 4,
    },
    {
      id: 'tip-teen-6',
      title: 'Know When to Pause',
      shortDescription: 'Recognize when a break helps the conversation',
      fullContent:
        "Not every disagreement can be resolved in one conversation. If tensions are rising, suggest taking a break: 'Can we continue this conversation tomorrow?' This prevents saying things you'll regret and gives everyone time to reflect.",
      ageTier: 'teen-15-17',
      order: 5,
    },
  ],
}

// ============================================
// Mediation Resources
// ============================================

/**
 * Static mediation resources organized by age tier.
 */
const MEDIATION_RESOURCES: Record<AgeTier, MediationResource[]> = {
  'child-8-11': [
    {
      id: 'resource-child-comm-guide',
      type: 'communication-guide',
      title: 'Talking to Your Parents',
      description: 'Simple tips for sharing your feelings',
      content:
        '## How to Talk to Your Parents\n\nTalking about your feelings can be hard, but it\'s important! Here are some simple tips:\n\n1. **Pick a good time** - Make sure your parents aren\'t busy\n2. **Use "I feel" words** - Say "I feel sad when..." instead of "You always..."\n3. **Listen too** - Let your parents share their feelings\n4. **Be patient** - Change takes time',
      ageTier: 'child-8-11',
      externalUrl: null,
      isPrintable: true,
      order: 0,
    },
    {
      id: 'resource-child-meeting',
      type: 'family-meeting-template',
      title: 'Family Talk Time Guide',
      description: 'A fun way to have family meetings',
      content: '', // Content comes from template
      ageTier: 'child-8-11',
      externalUrl: null,
      isPrintable: true,
      order: 1,
    },
    {
      id: 'resource-child-tips',
      type: 'negotiation-tips',
      title: 'Getting What You Want (Nicely!)',
      description: 'Tips for asking your parents for things',
      content: '', // Content comes from tips
      ageTier: 'child-8-11',
      externalUrl: null,
      isPrintable: true,
      order: 2,
    },
  ],
  'tween-12-14': [
    {
      id: 'resource-tween-comm-guide',
      type: 'communication-guide',
      title: 'Communicating with Your Parents',
      description: 'Strategies for productive conversations',
      content:
        "## Effective Communication with Parents\n\nAs you get older, your relationship with your parents is changing. Here's how to navigate those conversations:\n\n1. **Timing matters** - Choose moments when everyone is calm\n2. **Be specific** - Clearly explain what you're asking for and why\n3. **Show empathy** - Acknowledge their perspective before sharing yours\n4. **Propose solutions** - Come prepared with compromise ideas\n5. **Stay calm** - Even when frustrated, keep your cool",
      ageTier: 'tween-12-14',
      externalUrl: null,
      isPrintable: true,
      order: 0,
    },
    {
      id: 'resource-tween-meeting',
      type: 'family-meeting-template',
      title: 'Family Discussion Guide',
      description: 'Structured approach to family conversations',
      content: '', // Content comes from template
      ageTier: 'tween-12-14',
      externalUrl: null,
      isPrintable: true,
      order: 1,
    },
    {
      id: 'resource-tween-tips',
      type: 'negotiation-tips',
      title: 'Negotiation Skills for Tweens',
      description: 'How to advocate for yourself respectfully',
      content: '', // Content comes from tips
      ageTier: 'tween-12-14',
      externalUrl: null,
      isPrintable: true,
      order: 2,
    },
  ],
  'teen-15-17': [
    {
      id: 'resource-teen-comm-guide',
      type: 'communication-guide',
      title: 'Navigating Parent Relationships',
      description: 'Communication strategies for teens',
      content:
        "## Adult Communication Skills\n\nAs you approach adulthood, your conversations with parents can shift toward mutual respect and understanding:\n\n1. **Request dedicated time** - Important topics deserve focused attention\n2. **Lead with understanding** - Show you've considered their perspective\n3. **Use evidence** - Back up requests with examples of your responsibility\n4. **Offer accountability** - Proactively suggest ways to build trust\n5. **Accept outcomes gracefully** - Maturity includes accepting 'no'\n6. **Revisit when needed** - Some conversations take multiple attempts",
      ageTier: 'teen-15-17',
      externalUrl: null,
      isPrintable: true,
      order: 0,
    },
    {
      id: 'resource-teen-meeting',
      type: 'family-meeting-template',
      title: 'Family Negotiation Framework',
      description: 'Structured approach to family negotiations',
      content: '', // Content comes from template
      ageTier: 'teen-15-17',
      externalUrl: null,
      isPrintable: true,
      order: 1,
    },
    {
      id: 'resource-teen-tips',
      type: 'negotiation-tips',
      title: 'Advocacy and Negotiation',
      description: 'Advanced strategies for productive discussions',
      content: '', // Content comes from tips
      ageTier: 'teen-15-17',
      externalUrl: null,
      isPrintable: true,
      order: 2,
    },
  ],
}

// ============================================
// Service Functions
// ============================================

/**
 * Get all mediation resources for an age tier.
 * @param ageTier - The age tier to get resources for
 * @returns Array of mediation resources sorted by order
 */
export async function getMediationResources(ageTier: AgeTier): Promise<MediationResource[]> {
  const resources = MEDIATION_RESOURCES[ageTier] || []
  return [...resources].sort((a, b) => a.order - b.order)
}

/**
 * Get family meeting template for an age tier.
 * @param ageTier - The age tier to get template for
 * @returns Family meeting template
 */
export function getFamilyMeetingTemplate(ageTier: AgeTier): FamilyMeetingTemplate {
  return FAMILY_MEETING_TEMPLATES[ageTier]
}

/**
 * Get negotiation tips for an age tier.
 * @param ageTier - The age tier to get tips for
 * @returns Array of negotiation tips sorted by order
 */
export function getNegotiationTips(ageTier: AgeTier): NegotiationTip[] {
  const tips = NEGOTIATION_TIPS[ageTier] || []
  return [...tips].sort((a, b) => a.order - b.order)
}

/**
 * Format resource content for display.
 * Handles both internal content and external URLs.
 * @param resource - The resource to format
 * @returns Formatted content string
 */
export function formatResourceContent(resource: MediationResource): string {
  let content = resource.content || ''

  if (resource.externalUrl) {
    content += `\n\n[Visit Resource](${resource.externalUrl})`
  }

  return content
}
