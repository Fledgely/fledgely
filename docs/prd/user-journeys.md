# User Journeys

## Journey 1: The Martinez Family - Setting Up Trust Together

**Characters:** Carlos (father, 42), Sofia (mother, 40), Mateo (son, 12), Isabella (daughter, 8)

Carlos and Sofia are exhausted from the daily battle over screen time. Mateo has figured out how to bypass the Samsung parental controls on his tablet, and Isabella has discovered that Netflix on the Fire TV has no limits. Every evening ends in arguments about "just five more minutes" that neither parent can verify.

One Saturday morning, Carlos discovers fledgely through a Home Assistant forum. That afternoon, the family sits down together - not for another lecture, but for something different. Sofia explains that this isn't about control; it's about making a family agreement that everyone helps create.

**The Family Agreement Setup:**
Mateo is skeptical at first - he's seen parental control apps before. But when he realizes he can see exactly the same dashboard his parents see, something shifts. "So I can check my own time?" Carlos nods. They discuss together: homework time is protected, gaming time is earned, and crisis resources are private (Sofia explains what this means gently to both kids).

Isabella doesn't fully understand all the technical details, but she's excited to pick her avatar and feels important being included. The family creates their first agreement together - weekdays have homework priority, weekends are more flexible, and Friday night is "family offline time" where even Mom and Dad's phones go dark.

**The First Week:**
Mateo tests the system immediately, trying to watch YouTube during homework time. The AI flags it but doesn't block - instead, it asks him to classify: "Is this for homework?" He tries lying once, gets caught when the classification is reviewed, and realizes the system isn't about catching him - it's about the agreement they all made. He stops trying to cheat because cheating feels different when you helped write the rules.

**Three Months Later:**
The evening arguments have stopped. Mateo proudly shows his friends his "screen time stats" like a fitness tracker. Isabella asks to add more reading time to her agreement. Carlos and Sofia haven't opened the detailed dashboard in weeks - the weekly summary emails show healthy patterns, and that's enough.

**Six Months - Renewal:**
When the family agreement renewal notification arrives, Mateo negotiates for an extra hour on weekends in exchange for maintaining his homework completion streak. The negotiation itself is a lesson in responsibility and compromise.

---

## Journey 2: Grandma Takes Over - Delegated Access

**Characters:** Elena (grandmother, 68), Mateo (grandson, 12)

Sofia's mother Elena is watching Mateo and Isabella for the weekend while Carlos and Sofia attend a wedding. Elena isn't tech-savvy - she still calls Sofia for help with her iPhone - but she wants to be a good grandma without "ruining the rules."

**Friday Evening - The Handoff:**
Before leaving, Sofia opens the fledgely parent app and shows Elena the "Caregiver Access" feature. She generates a temporary PIN for Elena with specific permissions: Elena can see time remaining, extend time by 30 minutes (once per day), and unlock the "grandma override" for special treats. She cannot change the family agreement or see detailed activity logs.

**Saturday - The Test:**
Mateo finishes his homework early and asks Elena for extra game time. Elena opens the simple caregiver view on her phone - large, clear buttons show: "Mateo: 45 min gaming time remaining." She taps "Extend 30 min" and the system confirms. No need to call Sofia.

Later, Mateo tries "Grandma, can I watch this show?" but the AI has flagged it as age-inappropriate. Elena sees a gentle notification: "This content was flagged. Would you like to review?" She decides to wait for Sofia rather than override - the system supported her in making that choice without making her feel incompetent.

---

## Journey 3: Mateo's Crisis - The Invisible Allowlist

**Characters:** Mateo (12), school counselor situation in background

Mateo has been acting withdrawn for two weeks. He's been dealing with bullying at school that he hasn't told his parents about. Late one night, he searches "how to deal with bullying" and finds resources. Some searches lead to concerning content about self-harm.

**The Search:**
Mateo types into his Chromebook: "I feel like no one understands." The AI classifies this as a potential crisis search. Instead of logging it or alerting his parents, the system quietly redirects him to kid-friendly mental health resources. A gentle message appears: "It sounds like you're going through something hard. Here are some people who can help - and this is just between us."

He clicks through to a youth crisis text line. The conversation happens. He doesn't tell his parents yet, but he talks to someone. The next day, he feels slightly better.

**What Parents Don't See:**
In the weekly summary, Carlos and Sofia see normal activity. There's no record of the crisis searches, no flags, nothing to indicate what Mateo went through. This is by design.

**What Mateo Knows:**
During the family setup, Sofia had shown both kids the "always private" list. Mateo remembered: crisis lines, mental health resources, abuse hotlines - these never appear in any logs. He trusted that promise, and it helped him seek help.

---

## Journey 4: Carlos Sets Up Self-Hosting - Technical Parent

**Characters:** Carlos (father, 42, software engineer)

Carlos doesn't trust cloud services with his family's data. He already runs Home Assistant on a Raspberry Pi for smart home automation, and he wants fledgely to be part of that ecosystem.

**The Setup:**
Carlos clones the fledgely repository on a Saturday morning. The documentation points him to a Terraform module for Google Cloud deployment. He creates a new Google Cloud project for his family ("martinez-family-fledgely"), runs `terraform apply`, and watches the serverless infrastructure spin up in his own account.

The setup wizard walks him through:
1. Creating the family encryption keys (recovery key saved to his password manager)
2. Connecting to his Home Assistant instance (OAuth flow)
3. Inviting Sofia as a co-parent (she accepts from her phone)

**The Integration Magic:**
Carlos creates a Home Assistant automation: when fledgely reports "family offline time started," all smart speakers play a 5-minute warning sound, then the TV turns off automatically. Another automation: when Mateo's homework time starts, his desk lamp turns on.

---

## Journey 5: Lucia's First Day - Non-Technical Parent

**Characters:** Lucia (mother, 35, marketing manager), Diego (son, 9)

Lucia heard about fledgely from her neighbor and wants the benefits without the technical complexity. She doesn't know what "self-hosting" means and doesn't want to.

**The SaaS Onboarding:**
Lucia downloads the fledgely app from the Play Store. The setup takes 10 minutes:
1. Create account (email + password)
2. Add Diego as a child (name, age, profile photo)
3. Diego's device enrollment: she opens the Chromebook, scans a QR code from her phone, and Diego taps "I agree to the family agreement" on his screen
4. Default agreement suggested based on Diego's age - she reviews and accepts with minor tweaks

**The "It Just Works" Experience:**
Lucia doesn't configure Home Assistant. She doesn't write automation rules. She checks the app once a day, sees the traffic-light summary (green = all good), and moves on with her life.

---

## Journey 6: Mateo Turns 16 - The Transition to Autonomy

**Characters:** Mateo (now 16), Carlos, Sofia

Four years have passed. Mateo has demonstrated consistent responsible usage. His "earned autonomy" milestones have gradually relaxed restrictions.

**The Notification:**
On Mateo's 16th birthday, both he and his parents receive a notification: "Mateo is now eligible for Reverse Mode. This transfers account ownership to Mateo, with parents as invited viewers."

**The Family Conversation:**
Mateo chooses to keep sharing his time summary with his parents - he's proud of his habits. He stops sharing the detailed activity log. His parents accept this.

**The New Dynamic:**
Mateo now manages his own screen time, his own agreements, his own limits. He's internalized the self-regulation skills fledgely helped him develop.

---

## Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---------|--------------------------|
| **Martinez Family Setup** | Family onboarding, shared dashboards, AI classification, family agreement, weekly summaries, family offline mode |
| **Grandma Delegated Access** | Caregiver PINs, trust tiers, simple caregiver UI, time extension workflow, audit logging |
| **Mateo's Crisis** | Crisis allowlist, AI crisis detection, gentle redirects, privacy preservation, child-visible allowlist |
| **Carlos Self-Hosting** | Terraform deployment, E2EE key management, Home Assistant integration, open APIs |
| **Lucia SaaS** | App store distribution, QR enrollment, default agreements, minimal dashboard, subscription billing |
| **Mateo at 16** | Earned autonomy, reverse mode, ownership transfer, selective sharing, graduation path |

---
