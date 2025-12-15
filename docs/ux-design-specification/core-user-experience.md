# Core User Experience

## 2.1 Defining Experience

**"Create and sign a family digital agreement together"**

The Fledge Compact is THE interaction that defines fledgely. If we nail this one thing, everything else follows - because this moment establishes the collaborative dynamic that differentiates fledgely from every competitor.

**Why this is the defining experience:**

| Aspect | Why It Matters |
|--------|---------------|
| **First impression** | Sets the tone for the entire family relationship with the product |
| **Ownership** | Child helped write the rules = child follows the rules |
| **Ceremony** | Transforms software setup into family moment = memory |
| **Transparency** | Both see the same document = no secrets from day one |
| **Differentiation** | 0 competitors have collaborative agreement creation |

**The 10-second pitch:** *"We sat down together and wrote our family's digital agreement. We both signed it."*

## 2.2 User Mental Model

**How families currently approach digital rules:**

| Current Approach | Problem | Fledgely Shift |
|-----------------|---------|----------------|
| Parent installs app secretly | Child feels spied on, betrayed | Both know, both participate |
| Parent sets all rules unilaterally | Child has no investment | Child contributes to rules |
| Click through settings screens | Forgettable, feels like software | Feels like family ceremony |
| "Parental controls" framing | Child = controlled object | Child = agreement partner |

**Research-validated insight:** *"Kids are more willing to accept monitoring when parents also show trust, keep their word about how data will be used, and monitoring leads to conversations, not just consequences."*

**Mental models by age:**

| Age | Mental Model | Design Implication |
|-----|-------------|-------------------|
| **6-10** | "Rules are for safety" | Simpler choices, visual metaphors, excitement about signing |
| **11-14** | "I want privacy but get why parents worry" | Negotiation matters, explain the "why" |
| **15-17** | "Treat me like an adult" | Maximum agency, clear graduation path |

## 2.3 Success Criteria

**The Fledge Compact ceremony succeeds when:**

| Criterion | Success Indicator |
|-----------|-------------------|
| **Both parties feel heard** | Child adds at least one rule/preference; parent affirms it |
| **Takes appropriate time** | 15-20 minutes (not rushed, not tedious) |
| **Feels like a ceremony** | Both remember it a week later |
| **Creates artifact** | Named document exists ("The [Family Name] Digital Compact") |
| **Establishes transparency** | Child understands what will be monitored and why |
| **Sets expectations** | Both know what happens if rules are broken |
| **Enables negotiation** | Child can request changes to defaults |

**"It just works" indicators:**
- Parent and child can explain their agreement to others
- Neither party is surprised by anything that happens post-signing
- The agreement is referenced in future conversations ("Remember, we agreed...")
- Child feels proud of the agreement, not resentful

## 2.4 Novel UX Patterns

**This interaction is NOVEL - no competitors have it.**

| Element | Challenge | Design Approach |
|---------|-----------|-----------------|
| **Dual-author interface** | Two people editing one document | Turn-taking mode with "Your Turn" indicators |
| **Age-appropriate contribution** | 7-year-old ≠ 14-year-old input | Three tiers: 6-10, 11-14, 15-17 |
| **Negotiation flow** | What if they disagree? | Structured mediation: "Can you meet in the middle?" |
| **Reluctant participant** | What if child refuses? | Gentle onboarding with provisional agreement option |
| **AI flagging explanation** | Children anxious about "robot telling on them" | Clear examples of what triggers flags |
| **Signing ceremony** | Make digital signature feel meaningful | Animation, sound, print option |
| **Physical artifact** | Digital-only feels less real | PDF export to print and hang on fridge |

## 2.5 Experience Mechanics

**The Fledge Compact Flow:**

### Phase 1: Invitation (2 min)

```
┌─────────────────────────────────────────────────────────────────┐
│  Parent opens fledgely, selects "Create Family Agreement"       │
│                                                                 │
│  "To create your family's digital agreement, you'll need        │
│   to do this together with [Child Name].                        │
│                                                                 │
│   Find a good time when you can both sit down for about         │
│   15-20 minutes. This is worth doing well.                      │
│                                                                 │
│   Disagreement is normal - we'll help you work through it."     │
│                                                                 │
│  [We're Together Now] [Send Invite] [Start Provisional]         │
└─────────────────────────────────────────────────────────────────┘
```

- **Provisional option:** For reluctant children - parent sets basics, child can join anytime
- **Reassurance:** "Disagreement is normal" reduces parent anxiety about conflict

### Phase 2: Values Discovery (5 min)

**Parent prompts:**
- What are you most concerned about online?
- What freedoms are important for [Child] to have?
- When would you want to be alerted?

**Child prompts (age-adapted):**

| Age 6-10 | Age 11-14 | Age 15-17 |
|----------|-----------|-----------|
| "What do you like to do online?" | "When do you want privacy?" | "What boundaries feel reasonable?" |
| "What rules seem unfair?" | "What would make this feel fair?" | "What's non-negotiable for you?" |
| "What makes you feel safe?" | "What do you want parents to understand?" | "How should we handle disagreements?" |

### Phase 3: Agreement Building (8 min)

System suggests age-appropriate defaults, both can adjust:

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 SCREEN TIME                                                 │
│     Weekday: [___] hours  |  Weekend: [___] hours               │
│     Categories: Homework [✓] Leisure [✓] Games [✓]              │
│                                                                 │
│  📸 SCREENSHOTS                                                 │
│     Frequency: Every [30 seconds / 1 min / 2 min]               │
│                                                                 │
│     "Screenshots help us see what you're doing so we can        │
│      keep you safe. You can always see them too. This isn't     │
│      about catching you - it's about keeping you safe.          │
│      Screenshot frequency stays the same as you build trust -   │
│      what changes is your screen time allowance."               │
│                                                                 │
│  🚩 FLAGS & CONVERSATIONS                                       │
│     When AI flags something: [Child gets 30 min first]          │
│                                                                 │
│     "The AI looks for things like adult content, self-harm      │
│      references, or scams. It does NOT read your private        │
│      conversations with friends."                               │
│                                                                 │
│  🎯 TRUST MILESTONES                                            │
│     After 2 weeks of balance: [+30 min leisure time]            │
│     After 1 month of balance: [+1 hour leisure time]            │
│                                                                 │
│  💬 [Child's Additions] - "[Child] wants: _______________"      │
│  💬 [Parent's Additions] - "[Parent] wants: _______________"    │
│                                                                 │
│  ⚠️ NEGOTIATION PROMPT (if values conflict):                    │
│  "You have different views on [X]. Can you meet in the middle?" │
│  [Suggested compromise] [Discuss privately] [Keep discussing]   │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 4: Review & Sign (3 min)

```
┌─────────────────────────────────────────────────────────────────┐
│           THE [FAMILY NAME] FLEDGE COMPACT                      │
│                    December 2025                                │
│                                                                 │
│  We, the [Family Name] family, agree to these digital           │
│  guidelines. This agreement helps us stay safe online           │
│  while building trust together.                                 │
│                                                                 │
│  [Full agreement terms rendered beautifully]                    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  IMPORTANT: Changes to this agreement need BOTH of us to agree. │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Parent signature: [________________] ✍️                        │
│  Child signature:  [________________] ✍️                        │
│                                                                 │
│  [Print This Compact 🖨️]                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 5: Celebration (30 sec)

- Age-appropriate celebration (confetti for younger, dignified for teens)
- "Congratulations! Your family agreement is now active."
- "You did something special today - you made this decision together."
- Anniversary reminder: "We'll check in at 6 months to review"

## 2.6 Edge Case Handling

| Scenario | Solution |
|----------|----------|
| **Child refuses to participate** | Provisional agreement + persistent "join" invitations + "reluctant teen" scripts |
| **Parents disagree on settings** | "Discuss Privately" pause + age defaults as anchor + mediation prompts |
| **Genuine deadlock** | Concrete middle-ground suggestions + "start strict, loosen later" guidance |
| **Child won't sign** | Agreement proceeds as provisional; child can convert to full compact later |
| **Multiple children** | Each child gets their own compact (no sibling comparison) |
| **Shared custody** | Both parents included; symmetry enforced; neither can weaponize data |
| **Child circumvents** | Grace period notification → "Renegotiate" option → conversation signal, not escalation |
| **Agreement forgotten** | Monthly check-ins (non-dismissable) + exception tracking + milestone triggers |
| **Child turns 18** | Automatic graduation; monitoring ends; parent cannot override |
| **Crisis disclosed during setup** | Flow pauses; conversation resources provided; agreement can wait |

## 2.7 Agreement Maintenance

**Preventing drift:**

| Mechanism | Trigger | Purpose |
|-----------|---------|---------|
| **Monthly pulse** | Every 30 days | "How's the agreement working?" - quick check |
| **Quarterly review** | Every 90 days | Full review of rules, trust progress, flags |
| **Anniversary** | Yearly | Celebration + renewal ceremony |
| **Exception tracking** | Ongoing | "You've granted 8 exceptions. Make them permanent?" |
| **Age milestones** | 13, 15, 17 | "Time for age-appropriate update?" |
| **Trust milestones** | Achievement | "Earned more freedom - update agreement?" |
| **School transitions** | Sept/June | "Summer rules → School rules?" |

## 2.8 Common Support Scenarios

Based on anticipated user friction:

| Issue | Support Response | Design Implication |
|-------|-----------------|-------------------|
| "Child refuses to participate" | Provisional flow + reluctant teen scripts | Prominent in onboarding |
| "Parents disagree" | "Discuss Privately" + defaults as anchor | Built into Phase 3 |
| "Screenshot frequency complaints" | Clear: screenshots = protection, TIME increases with trust | Messaging in agreement builder |
| "Agreement drift" | Exception tracking + "make it intentional" prompts | Monthly check-ins |
| "Circumvention detected" | Grace period + "Renegotiate" option | No escalation recommendation |
| "Teen wants to delete" | Can't delete + redirect to participation | Transparency comparison |

## 2.9 Key Messaging

**For children anxious about screenshots:**
> "Screenshots help us see what you're doing so we can keep you safe. You see the exact same screenshots your parents do - nothing is hidden from you. Screenshot frequency stays the same as you build trust. What DOES change is your screen time allowance. The more responsibility you show, the more time you earn."

**For parents worried about conflict:**
> "Disagreement during setup is normal and healthy. It means you're having a real conversation. The app provides mediation prompts to help you find middle ground. This conversation IS the safety mechanism - you're aligning before there's a crisis."

**For reluctant teens:**
> "We get it - most parental control apps are terrible. They spy on you without telling you, treat you like a criminal, and never end. Fledgely is different: you see everything your parents see, you helped write the rules, and there's a real path to graduation. You can't delete it, but you CAN influence it."

---
