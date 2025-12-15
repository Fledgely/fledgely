# Executive Summary

## TLDR

**Problem:** 76% of children give parental control apps 1-star ratings. Current solutions impose static restrictions that damage family trust.

**Solution:** Fledgely is an open-source family digital agreement tool where children actively consent to their own protection. AI-powered content classification distinguishes homework from leisure. Cross-platform visibility across Chromebook, Android, iOS, Fire TV, Nintendo Switch, and Xbox.

**Why Now:** $1.7B market growing to $5.5B by 2032. No open-source competitor exists. COPPA 2025 amendments (effective June 2025) mandate privacy-first approaches that align with our architecture.

**Moat:** Only unified view across all family devices. Platform vendors are structurally prevented from replicating cross-platform visibility.

---

## Vision

Fledgely is an open-source family digital agreement tool built on a radical premise: **supervision through consent, not control**. It's a safety tool, not a policing tool.

**Safe freedom, not a cage.**

Current parental control solutions are universally despised by children - 76% give them 1-star ratings. They impose static rules that restrict freedom without understanding context. Fledgely takes a different approach: dynamic freedom governed by AI-managed family agreements.

**The Core Promise:** Freedom and safety without sitting next to them the entire time.

**When safety and consent conflict, safety wins - but the child is always informed.**

**Success Metric:** Children excited to be protected by it.
- **Measured by:** Child-initiated app store rating >3.5 stars (vs industry average 1.2 stars)
- **Measured by:** Voluntary re-consent rate >80% at 6-month family agreement renewal
- **Measured by:** <5% uninstall rate initiated by children

## Why Consent-Based Design Works

Smart children will always find ways to circumvent imposed controls. Consent-based design is more sustainable than restriction - you can't bypass an agreement you helped create.

For younger children, consent is about participation and family discussion, not legal capacity. We encourage families to have age-appropriate conversations about online safety before setup - the process itself is a trust-building exercise.

**Compliance Note:** Legal consent (COPPA, GDPR) is provided by parents for children under applicable age thresholds. Child participation in the family digital agreement is a product philosophy requirement, not a legal substitute for parental consent.

## What Makes This Special

1. **Dynamic Freedom, Not Static Rules** - Instead of rigid "no YouTube after 7pm" restrictions, fledgely enables family agreements that adapt to context. The AI understands whether a child is doing homework research or browsing for entertainment. AI classification improves over time through family feedback loops - families can review and correct classifications to train their personalized model.

2. **AI-Powered Real-Time Content Analysis** - Screenshots are analyzed by AI to make contextual decisions about content appropriateness, moving beyond simple URL blocking to genuine understanding. Fast real-time classification runs on-device; optional deeper analysis uses cloud processing. Screenshot retention is configurable (default 7 days) and automatically deleted after the retention period. AI classification will produce false positives, especially early on. We accept this trade-off - safety margins matter more than perfect accuracy. Over time, family feedback loops and model improvements will reduce false positives while maintaining safety coverage. When AI flags content, parents receive context, not accusations. Flags are framed as "conversation starters" not evidence of wrongdoing. Children can add context to any flagged item before parents see it.

3. **Consent-Based Design** - Children see the same data parents see. Monitoring is transparent, not surveillance. **Fledgely requires joint parent-child setup as part of the family digital agreement. The device becomes inoperable under fledgely management without the child's active consent and participation.** The child is a participant in their own safety, not a subject of control. Consent is non-negotiable. If a child refuses to participate in the family digital agreement, the device becomes inoperable under fledgely management. We will not compromise this principle for adoption metrics.

4. **Open Source & Privacy-First** - Local-first architecture with E2EE. Self-hostable for families who want complete data sovereignty. No hidden data collection - the code is auditable. Open source builds community and trust; managed SaaS service provides the easy button for families who want it to "just work."

5. **Cross-Platform Aggregate Control** - Single view across Chromebook, Android, iOS, Fire TV, Nintendo Switch, and Xbox. Time and safety managed holistically, not per-device.

## The Path to Independence

Fledgely isn't eternal surveillance - it's training wheels with a clear graduation path.

**Earned Autonomy Milestones** - Restrictions automatically relax as children demonstrate responsible usage over time. Consistent healthy patterns unlock more freedom. The system teaches self-regulation and then trusts children to practice it.

**Parent Compliance** - During family offline time, ALL devices go dark - parents included. Fledgely monitors parent compliance too. Fair is fair. This models the behavior we expect from children and builds trust through shared accountability.

**Reverse Mode at 16** - The power dynamic shifts. Teen becomes the account owner; parents become invited guests who can view data only if the teen chooses to share. Legal guardians retain emergency override capability, but the default is teen autonomy. The goal is proven independence, not eternal monitoring.

## Privacy Architecture

Data is stored locally on each device. Family sync uses E2EE - only family devices can decrypt shared data.

For AI analysis: fast classification runs entirely on-device; optional deeper analysis sends encrypted screenshots to cloud processing where they are analyzed and immediately discarded (not stored). Cloud processing is opt-in and can be disabled for fully local-only operation.

Self-hosted deployments own the entire encryption pipeline - no data ever leaves infrastructure you control.

*Note: This reflects current technology constraints. As on-device AI capabilities improve, we will shift more processing locally.*

## Safety Exceptions

While transparency is core to fledgely, one critical exception exists: **crisis and safety-seeking resources are never logged or visible to parents.** Domestic abuse hotlines, suicide prevention resources, and similar safety-seeking behavior are permanently allowlisted and invisible to monitoring.

Children can see the allowlist upfront - they know exactly which resources are protected. These sites simply don't appear in any activity logs or reports. A child researching how to get help should never fear that research being seen.

## Competitive Moat

Apple Screen Time only sees Apple devices. Google Family Link only sees Android. Fledgely provides the **only unified view across all family devices** - Chromebook, Android, iOS, Fire TV, Nintendo Switch, and Xbox. No single platform vendor can replicate this cross-platform visibility.
