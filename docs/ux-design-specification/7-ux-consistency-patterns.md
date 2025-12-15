# 7. UX Consistency Patterns

## 7.1 Button Hierarchy

**Core Button Levels:**

| Level | Use Case | Visual Treatment |
|-------|----------|------------------|
| **Primary** | Main action per screen (Sign Agreement, Continue, Confirm) | Solid warm amber, full weight |
| **Secondary** | Alternative actions (Edit, View Details, Add Context) | Outlined, amber border |
| **Tertiary/Ghost** | Low-emphasis actions (Cancel, Skip, Maybe Later) | Text only, subtle hover |
| **Destructive** | Irreversible actions (Remove Child, Delete Agreement) | Gentle coral, requires confirmation |
| **Celebration** | Positive outcomes (Complete!, Milestone Reached) | Gold with subtle glow/animation |

**Audience Adaptations:**

| Audience | Button Characteristics |
|----------|----------------------|
| **Parent Dashboard** | Professional weight, comprehensive options |
| **Child Dashboard** | Larger touch targets, slightly more vibrant/playful |
| **Caregiver View** | Minimal buttons - only essential actions |
| **Crisis Context** | Maximum calm - muted, no urgency styling |

**Destructive Action Pattern:**
- Two-step confirmation dialog (clear consequences listed)
- 24-hour cooling-off period (action queued, reversible)
- Destructive button styled as secondary (not prominent)
- Cooling-off queue visible to ALL affected parties (transparency)

**Agreement Action States:**
- "Your turn to act": Prominent, subtle pulse animation, primary styling
- "Waiting for other party": Muted, progress indicator, disabled state

**Age-Adaptive Language:**

| Age Group | Example Label | Rationale |
|-----------|---------------|-----------|
| 6-8 | "This will go away forever" | Concrete thinking, avoid abstract terms |
| 9-12 | "Remove permanently" | Building vocabulary, clearer meaning |
| 13+ | "Delete permanently" | Teen-appropriate, respects maturity |

- Language layer adapts automatically based on child's age
- Consequences always explained in age-appropriate terms

**Pending Decisions Dashboard:**
- Unified view of ALL queued actions across family
- Cooling-off items, draft agreements, awaiting signatures
- Single place to see "what needs attention"
- Notification throttling to prevent fatigue

**Technical Implementation:**
- WebSocket for real-time queue synchronization
- Child sees immediately when parent cancels queued action
- Optimistic UI updates with rollback on conflict

---

## 7.2 Feedback Patterns

**Feedback Philosophy:** Celebration > Notification, Calm > Alarm

| Type | Tone | Visual Treatment |
|------|------|------------------|
| **Success/Celebration** | Joyful | Confetti, gold accents, linger 3+ seconds |
| **Informational** | Neutral | Toast or inline, auto-dismiss |
| **Warning/Attention** | Gentle | Amber tones, conversation starter framing |
| **Error/Problem** | Calm, helpful | Clear recovery path, no blame |
| **Crisis/Support** | Maximum calm | Teal palette, no urgency, immediate access |

**Toast vs Modal Decision:**
- Quick confirmations (settings saved): Toast notification, auto-dismiss
- In-flow actions: Inline confirmation where action was taken
- Important outcomes: Modal with appropriate ceremony level

**Ambient Status Feedback (Optional):**
- Subtle screen edge glow for routine status awareness
- Green glow = all healthy, Amber glow = needs attention
- Non-intrusive alternative to toast notifications
- User can enable/disable in preferences

**Accessibility Fallbacks for Ambient Feedback:**
- Haptic option: gentle vibration patterns for status
- Sound option: subtle audio cues (chime, soft tone)
- Ensures users with visual impairments aren't excluded

**Flag Notification Timing:**
- Configurable per family agreement
- Options: Immediate, post-annotation window (30 min), daily/weekly digest
- Urgent content (safety concerns): Always immediate
- **Notification footer:** "Per your agreement: [setting name]" (source clarity)

**Caregiver Notification Settings:**
- Configured during delegation setup
- Options: All alerts, urgent only, or none (status check only)

**Grace Tokens:**
- Earned through consistent positive behavior (not arbitrary weekly)
- Accumulate: 3 good days = 1 grace token (max 2 stored)
- Acknowledges that everyone has off days
- Visual: "1 grace token available" / "Grace token used"
- Reinforces positive behavior while allowing imperfection

**Bidirectional Accountability (Parent Nudges):**
- Gentle suggestions when parent over-checks
- "Taking a break might feel good - Emma's doing fine"
- NEVER shaming: "You're checking too much" ❌
- ALWAYS supportive: "Trust is building nicely" ✅
- A/B tested message variants for optimal tone
- 3:1 ratio: Three positive affirmations per gentle suggestion
- Maximum 1 suggestion per week
- Nudges are OPT-IN, not default
- Reframed as "Parenting insights" not corrections

**"Healthy Checking" Guidance:**
- Shown in parent onboarding
- Visual example: Weekly check-in = healthy; 5x daily = concerning
- System tracks and gently surfaces checking patterns to parents

**Celebration Intensity:**

| Achievement Type | Treatment |
|------------------|-----------|
| **Daily** (balanced day) | Subtle inline acknowledgment, quick animation |
| **Weekly** (streak maintained) | Toast with progress visualization |
| **Major Milestone** (trust threshold, agreement renewal) | Full-screen ceremony, confetti, linger |
| **Inbox Zero** | Achievement badge when nothing needs attention |

**Toast Queue Management:**
- When multiple toasts arrive, show count badge: "2 more notifications"
- Tap to expand queue and see all
- Auto-dismiss continues for older toasts

**Tidal Time Transitions:**
- Hard cutoffs feel punishing; gradual transitions feel respectful
- At 15 min remaining: Subtle visual warmth shift
- At 5 min remaining: Gentle overlay pulse, "Wrapping up soon"
- At 0: "The tide is out" celebration of what was accomplished
- Never sudden black screen or jarring interruption

**Trust Maturation Model:**
Trust isn't just a score - it has age and resilience:

| Stage | Age | Characteristics |
|-------|-----|-----------------|
| **Seedling** | 0-3 months | Fragile, needs careful attention, small setbacks feel big |
| **Growing** | 3-12 months | Strengthening, can handle minor stress, shows personality |
| **Mature** | 12+ months | Resilient, survives mistakes, has deep roots |

- Visual: Trust Flame evolves in appearance (not just height) as it matures
- Mature trust can absorb a bad day without collapsing
- Setbacks in seedling phase treated with extra gentleness

**Trust Score De-emphasis:**
- Child view shows TREND ("Growing", "Steady", "Building") not percentage
- Parent can see number, child sees flame height only
- Anti-weaponization guidance in onboarding: "Trust scores are for celebration, not punishment"
- Multi-dimensional trust: consistency, communication, responsibility shown separately

**Family Trust Bank (Optional):**
- Positive behaviors from ANY family member contribute to shared "trust credits"
- Credits can be spent on family privileges (movie night, special outing, extra flexibility)
- Encourages collaboration: "Emma's great week + Dad's patience = family reward"
- Optional feature - some families prefer individual tracking
- Reinforces that trust is a family project, not child compliance

**Gaming Detection:**
- Detect unusual patterns: "Google Docs open 3h with minimal interaction"
- Flag to parent as conversation opportunity, not accusation
- Prompt: "Your child may be working around limits. This often signals they want to discuss the agreement."
- Never auto-punish; always invite dialogue
- AI confidence indicators: "Classification confidence: Medium - consider reviewing"

---

## 7.3 Form Patterns

**Validation Approach:**
- Real-time validation with gentle messaging
- ✓ "Looks good" (green checkmark, subtle)
- ⚠ Inline amber for conflicts or issues
- ✗ "Required" messaging only on submit attempt
- Never: Red errors on first keystroke or while typing

**Label & Input Structure:**
- Labels always above inputs (mobile-friendly, accessible)
- Helper text below for context
- Required indicator: subtle asterisk, not aggressive

**Multi-Step Wizard Pattern (Agreement Builder):**
- Clear step indicator with visual progress bar
- Previous steps collapsible but accessible
- Auto-save with 7-day draft expiration + reminder
- Back navigation always available (no trapped states)
- **Visible "Drafts" section in navigation** (never silently expire)

**Dual Onboarding Paths:**

| Path | Best For | Flow |
|------|----------|------|
| **Start Now** | Families wanting quick setup | Choose template → customize → sign |
| **Learn First** | Families wanting data-driven agreement | 2-week observation → AI suggests terms → review → sign |

- Both paths equally prominent in onboarding
- "Learn First" solves cold-start problem with immediate value (status monitoring)
- Users can switch paths anytime

**Conversational Agreement Builder (Alternative Mode):**
- Chatbot-style flow: one question at a time
- "What's most important to you about screen time?"
- Progressive disclosure, feels like dialogue not bureaucracy
- Typeform-inspired, reduces form fatigue
- **Parallel option** - users choose form OR conversation (not replacement)
- Some users prefer predictable form structure (especially neurodivergent users)

**Behavior-First Agreements:**
- Optional 2-week observation period before first agreement
- System suggests agreement terms based on actual patterns
- "Based on Emma's typical usage, here's a draft that matches reality"
- Reduces aspirational-but-unrealistic agreements

**Community Templates:**
- Anonymized, opt-in sharing of agreement structures
- Framed as **"inspiration"** not "what you should do"
- "See how other families approached this" (not "See what normal families do")
- Filter by child age, family size, concern areas
- Templates are starting points, fully customizable

**Child Form Adaptations:**
- Simplified layouts with more visual options
- Voice input option alongside text fields
- Suggested answers to reduce typing burden
- Larger touch targets
- Emoji-based inputs for ratings and preferences

**Young Child Accessibility (Ages 6-8):**
- Visual/icon-based agreement summary
- Simple confirmation button ("I agree")
- AI-generated video explanation of agreement terms (Veo)
- **Video capped at 90 seconds** (attention span appropriate)
- **Graceful degradation:** If Veo unavailable, fall back to illustrated slides
- **Video replayable from "My Agreement" section** anytime
- Parent can read aloud while child follows visual

**Mutual Selection Reveal (Agreement Builder):**
- Dating-app style hidden picks until both confirm
- Matches highlighted joyfully with connection animation
- **Non-matches framed positively:** "Different picks - let's talk about it!"
- Never "you're wrong" or adversarial language

**Draft Recovery:**
- Auto-save on every change
- Drafts expire after 7 days
- Reminder notification before expiration
- Resume from exact point
- **Drafts visible in dedicated section** (not hidden)
- **Expired drafts recoverable for 30 days** (not permanently deleted)

**Agreement Distribution & Physical Artifact:**

Upon signing, the agreement is:
1. **Emailed to all parties** - Full text sent to all signers (parents, child, any co-parents)
2. **PDF generation** - Elegant, customizable PDF with:
   - Family name and crest/avatar (if set)
   - All terms in readable format (including non-app-enforced commitments)
   - Signature lines (digital signatures shown, space for physical)
   - Date and version number
   - **QR code linking to live digital version in app**
3. **Print encouragement** - "Many families print and display their agreement. [Download PDF]"

**Physical Signing Ceremony Option:**
- After digital signing, prompt: "Want to make it official? Print and sign together."
- Designed for display: Letter size, frameable, fridge-worthy
- Physical signatures alongside digital create meaningful ritual
- "Hang it somewhere the whole family can see - even during screen-free time"

**Agreement Visibility:**
- Displayed agreement serves as constant reminder
- Visible during screen bans - child sees the terms they helped create
- Conversation starter for visitors: "What's that on your fridge?"
- Backup: Physical copy exists independent of app/account

**Beyond-App Terms:**
Agreements may include terms fledgely doesn't enforce:
- "Devices charge in the kitchen, not bedrooms"
- "No phones at dinner table"
- "Ask before downloading new apps"
- "Weekly family game night"

These appear in the agreement document with note: "Family commitment - not app-enforced"

This acknowledges:
- Digital wellness extends beyond what software can monitor
- Family values matter even when not measurable
- The agreement is a family document, not just app configuration

**Agreement Versioning:**
- Each modification creates new version (v1.0, v1.1, v2.0)
- All versions emailed to all parties
- PDF clearly shows: "Version 2.3 - Updated December 2025"
- Physical copies can be updated: "New version available - print and re-sign?"
- History preserved: "View all past versions" in app
- **Child-facing:** "Your family agreement was updated!" (not version numbers)

**Agreement Health:**
- Monthly "Agreement Health Check" prompt
- "Last reviewed" timestamp visible on agreement
- Violations trigger conversation prompts, not punishments
- Living document UI shows when refresh is needed

**Active Transparency Mechanisms:**
- Weekly summary to child: "This week: X screenshots, Y flags. See what your parents see?"
- First-week onboarding: Daily prompt to child to view their own activity
- Quarterly agreement reminder: "Remember, your family agreement includes [key terms]"
- Never let monitoring become "background noise" - keep it visible

---

## 7.4 Navigation Patterns

**Parent Dashboard Navigation:**

```
Desktop: Persistent sidebar
├── Dashboard (home)
├── Children
├── Agreements
├── Activity
├── Pending Decisions (if any)
├── Drafts (if any)
├── Settings
└── Help

Mobile: Bottom tab bar (4-5 items max)
[Dashboard] [Children] [Activity] [More]
```

**Child Dashboard Navigation:**
- Status-first design (Time Ring is hero element)
- Trust Flame always visible in header
- **Privacy mode toggle:** Temporarily minimize gamification elements
- **Sticky preference:** Privacy mode remembers child's choice across sessions
- Simplified hierarchy (3-4 main destinations)
- "Need Help?" always one tap away
- **Always-visible "I want to discuss this" button** - one-tap access to propose agreement changes
- Bottom nav: [Home] [Agreement] [Activity] [Help 🔒]

**Teen Mode (13+):**
- Distinct UX: professional dashboard aesthetic, less gamification
- One-tap "stealth mode" - app icon/appearance changes for peer privacy
- Teen testimonials in onboarding (why teens choose fledgely)
- Prominent graduation timeline visible

**Caregiver Navigation:**
- Single-screen design when possible
- Traffic light status per child
- Maximum 2-3 actions: Extend Time, Contact Parent
- **Help/Support accessible** for when things go wrong
- No deep navigation required

**Caregiver Confidence Building:**
- Prominent message: "You can't change any settings - only [Parent] can. Feel free to explore."
- Time-out notifications show to caregiver: "Screen time ended (as scheduled). You didn't cause this!"
- Large, always-visible "Call [Parent]" button - no scrolling, high contrast
- Status messages include action guidance: "Yellow: Note for later - no action needed from you"
- Escalation tiers: Yellow (note) → Orange (text parent) → Red (call parent)
- Post-session summary for caregiver to share with parent

**Family Presence Indicators (Optional):**
- **Default: OFF** - must opt-in to enable
- See when other family members are in the app
- Small avatar dots: "Dad is viewing" / "Emma is online"
- Builds transparency and connection for families who want it
- No guilt mechanics - doesn't show "last seen 3 days ago"

**Time-of-Day Adaptive Navigation:**
- **Phase 1:** Manual toggle (Morning Mode / Evening Mode)
- **Phase 2:** Auto-detection based on time (with timezone handling)
- Morning mode: Quick glance, status-first, minimal depth
- Evening mode: Review-focused, activity details prominent

**Portable Agreement Export:**
- Child can export their agreement terms
- Share with teachers, coaches, other trusted adults
- PDF or shareable link (read-only)
- Builds trust: "Here's what my family agreed to"

**Sibling Separation:**
- Each child sees ONLY their own agreement, progress, and data
- No cross-child comparisons anywhere in UI
- Architectural enforcement: APIs don't return sibling data
- No age-based growth paths or benchmarks
- Progress is individual: "Your trust is growing" not "Kids your age typically..."

**Navigation Decisions:**

| Pattern | Implementation |
|---------|----------------|
| **Parent viewing child's view** | "View as [Child]" opens separate authentic child view |
| **Breadcrumbs** | Desktop: full trail; Mobile: back arrow + section title |
| **Crisis resources** | Always in navigation, persistent footer/header on every screen |
| **Privacy mode** | Child can toggle to minimize scores/flames; preference persists |

---

## 7.5 Modal & Overlay Patterns

**Modal Types by Emotional Weight:**

| Type | Treatment | Dismiss Behavior |
|------|-----------|------------------|
| **Ceremony** (signing, graduation) | Full-screen takeover | Cannot dismiss by clicking outside |
| **Confirmation** (destructive actions) | Centered modal | Click outside = cancel (with unsaved changes warning) |
| **Quick Action** (time extension) | Bottom sheet on mobile | Swipe down to dismiss |
| **Crisis Resources** | Calm overlay | Immediate close, no confirmation, no friction |
| **Content Review** (screenshots) | Lightbox | Keyboard nav, swipe on mobile |

**Undo-First Pattern (Reversible Actions):**
- For eligible actions, execute immediately
- Show 10-second undo bar at bottom: "Time extended +15min [Undo]"
- Reduces confirmation friction while maintaining safety

**Action Classification:**

| Classification | Examples | Pattern |
|----------------|----------|---------|
| **Undo-eligible** | Time extension, filter changes, quick settings, dismiss notification | Execute → show undo bar |
| **Confirm-required** | Remove child, delete agreement, change permissions, export data | Show confirmation modal |

**Modal Interaction Rules:**
- Backdrop click closes non-critical modals
- Unsaved changes trigger confirmation before close
- Alerts arrive as toast over current modal (don't interrupt)
- Mobile: small actions = bottom sheet; important = centered modal
- **All swipe-dismissable overlays also have visible X button** (accessibility backup)

**Ceremony Intensity Options:**
- **Full:** Complete ceremony with animation, music option, signature flourish
- **Simple:** Streamlined signing with brief celebration
- **Minimal:** Quick confirmation, subtle acknowledgment
- Intensity configurable per family or by child age/preference
- **Default by age:** Full ceremony suggested for under 13; Minimal for 14+
- **Private preference:** Teen sets ceremony preference in THEIR settings before ceremony begins

**Ceremony Evolution:**
- Each ceremony type is DIFFERENT:
  - Initial signing: Full ceremony, significance established
  - 6-month renewal: Lighter, reflection-focused ("What worked?")
  - Annual renewal: Celebration of growth, bigger than renewal
  - Graduation: Major ceremony, journey recap
- "Skipped ceremony" visible on agreement (social accountability)

**Child-Hosted Ceremony Mode:**
- Child reads the agreement terms aloud (or system reads)
- Parents listen and acknowledge each section
- Child "officiates" the signing
- Powerful role reversal that builds ownership
- **Always optional, never required** (respects varying comfort levels)

**Ceremony Video Capture:**
- **Default: Local storage only** (on-device)
- **Opt-in: Cloud storage** with explicit COPPA-compliant consent
- Saved to family memories
- Replayable on agreement anniversaries
- Privacy-conscious design throughout

**Printable Certificate:**
- Export signed agreement as PDF poster
- Frameable, fridge-worthy design
- Includes signatures, date, key terms
- QR code linking to digital version
- Physical artifact reinforces digital commitment

**Ceremony Guidance:**
- "Tip: Keep ceremony to signers only. Siblings can celebrate after."
- Engagement requirement: Can't sign without scrolling through each section
- Teen tone option: Less "family journey," more "let's set this up"

**Ceremony Modal Requirements:**
- Full-screen presence
- Signature animation on signing
- Cannot be accidentally dismissed
- Optional celebratory sound/music
- Confetti on completion (respecting reduced-motion)

**Crisis Overlay Requirements:**
- Calm teal background (not clinical white)
- NO confirmation to close
- NO "are you sure you want to leave?"
- Escape/click-outside immediately closes
- Privacy reassurance prominent: "This page is never logged"
- Separate code path that architecturally cannot log

**Post-Crisis Access Reassurance:**
After child closes crisis resources:
1. Immediate message: "This visit was completely private. No record exists anywhere."
2. Technical clarity: "This opened inside fledgely, not your browser. No history."
3. Normalization: "Many people look at these resources. It shows strength."
4. Optional follow-up: "Want a reminder in 24 hours that this was private? [Yes/No]"

**Toast Queue Management:**
- Multiple simultaneous toasts stack with count indicator
- "2 more notifications" badge when queue forms
- Tap to expand and see all pending
- Prevents notification overwhelm

---

## 7.6 Empty & Loading States

**Empty State Principles:**
- Warm, welcoming illustrations (family-themed, not corporate)
- Single clear next action
- Time expectations when relevant
- Frame positively ("All quiet" not "No data")

**Empty State Treatments:**

| State | Tone | Key Message |
|-------|------|-------------|
| **First-time setup** | Welcoming, guided | "Let's create your first agreement together" |
| **No activity yet** | Reassuring | "All quiet so far - connection is working" |
| **Nothing needs attention** | Celebratory | "All clear! Maybe time for coffee?" |
| **Offline device** | Calm, informative | Last seen timestamp + common reasons + reassurance |
| **Search no results** | Helpful | Suggestions + clear escape hatch |

**Inbox Zero Achievement:**
- When parent has reviewed all flags and nothing needs attention
- Celebrate with achievement badge: "All caught up!"
- Reinforces that empty is good, not concerning

**Loading State Treatments:**
- Skeleton screens matching content shape (no spinners blocking views)
- Subtle shimmer animation
- Show known data immediately (timestamps, device names)
- **Generic loading messages:** "Loading..." NOT "Gathering Emma's data..."

**Trust-Building Tips During Load:**
- Only for waits **>5 seconds** (avoid tip fatigue)
- "Did you know? Emma's trust score grew 12% this month"
- "Tip: Agreements work best when reviewed together monthly"
- Rotates through relevant, positive insights

**Breathing Animation (Long Waits):**
- For extended waits (>10 seconds), offer Headspace-style breathing visual
- Calming, not frustrating
- Optional: "Take a breath while we load..."
- Note: Long waits indicate backend optimization needed (roadmap item)

**Simplified Language for Non-Technical Users:**

| Technical Term | User-Friendly Term |
|----------------|-------------------|
| Syncing | Updating |
| Sync complete | Connected ✓ |
| Sync failed | Reconnecting... |
| Offline | Not connected |
| Last sync | Last updated |

**Offline Child View:**
- Show last known state with timestamp
- **2-hour grace period** before any visual escalation
- Gradual concern: 2h = subtle badge, 4h = amber, 8h+ = needs attention
- Reassurance that cached rules remain active on device
- Common reasons listed to reduce parent anxiety
- **Never show duration of inactivity** - "No recent activity" not "No activity for 2 hours"
- Frame gaps as breaks: "Emma's taking a break from screens"

**Child-Side Offline Notification:**
- Child sees: "Your device disconnected. Your parents will see this after 2 hours."
- Reduces child anxiety about being blamed for WiFi issues
- Empowers child to fix the issue if possible

**Error States:**
- Friendly message upfront ("Something went wrong")
- Expandable technical details for debugging
- Clear retry action
- Never a dead end

---

## 7.7 Search & Filtering Patterns

**Screenshot Album Structure:**
- Time-based grouping (natural mental model)
- Quick date filters prominent: Today, Yesterday, This Week, Custom
- Secondary filters: Child, Category, Flagged Only
- Applied filters shown as removable chips
- Count display: "Showing 47 of 156 screenshots"

**Bidirectional Search Access:**
- **Parents AND children can search** their respective activity
- Child sees same search tools for their own data
- Reinforces transparency: "Same data, same access"

**Search Behavior:**
- Scope prompt: "Search all children or just [current child]?"
- Results grouped by match type: AI Category, Text Detected (OCR), Child Notes
- Most relevant results first
- **Suggestions don't reveal content prematurely** (respect surprise/review flow)

**AI Summary (Phased Rollout):**

| Phase | Feature | Implementation |
|-------|---------|----------------|
| **V1** | Structured summary | Stats, top apps, flagged items, time breakdown |
| **V2** | Narrative summary | "Show me Emma's week" generates natural language story |

**AI-Powered Search Suggestions:**
- Full suggestions as user types:
  - AI categories (Games, Homework, Video)
  - Child names
  - Detected apps
  - Recent searches

**Proactive Celebration Surfacing:**
- AI identifies "moments worth celebrating"
- Surfaces positive activity proactively
- "Emma spent 2 hours on her science project yesterday!"

**Celebration Calibration:**

| Activity Type | Celebration? | Rationale |
|---------------|--------------|-----------|
| Homework completion | ✅ Yes | Clearly positive |
| Creative apps (art, music) | ✅ Yes | Productive and expressive |
| Educational content | ✅ Yes | Learning is celebrated |
| Games (moderate) | ➖ Neutral | Not good or bad |
| YouTube (general) | ➖ Neutral | Context-dependent |
| Social media (excessive) | ➖ Neutral | No judgment, just data |

- AI never shames, only celebrates clearly positive patterns

**Quick Filters (formerly "Saved Views"):**
- Parents can save filter combinations as named quick filters
- Framed as **efficiency tool**, not surveillance
- Examples: "Homework check", "This week's games", "Flagged items"
- Quick access from filter bar

**Digital Life Wrapped:**
- Monthly summary: Spotify Wrapped-style celebratory review
- Annual summary: Year in review with milestones, growth, achievements
- **Launch timing:** January (new year) and September (back-to-school)
- **Child-to-specific-person sharing only** (no group blast)
- Add anti-comparison tip: "Every child's digital life is different - comparison isn't helpful"
- Focus on growth and positive patterns, not surveillance metrics

**Activity Timeline:**
- Visual timeline bar for quick scanning
- Tap to jump to specific time
- View modes: Timeline, By App, By Category
- Homework flagged positively (✓), not just concerning content

**No Results Pattern:**
- Helpful suggestions (check spelling, broaden search, expand date range)
- One-tap "Clear Filters" escape
- Never a dead end

---

## 7.8 Power Inversion Patterns

**Philosophy:** Fledgely inverts traditional parental control dynamics. Children have agency; parents guide.

**Critical: Onboarding Expectation Setting**
- First-run experience MUST explain power-inversion model
- "Fledgely is different: your child participates in setting the rules"
- Clear value proposition: "Kids who help make rules follow them better"
- Prevents parent surprise and churn from unmet expectations

**Child Initiates, Parent Confirms:**

| Action | Child Does | Parent Does |
|--------|------------|-------------|
| **Time Extension** | Requests +30min with reason | Approves/discusses |
| **Agreement Change** | Proposes modification | Reviews and co-signs |
| **New Freedom** | Requests (e.g., new app) | Considers and responds |
| **Flag Context** | Adds explanation first | Sees context before judgment |

**Request Management:**
- Request rate limiting: **3 requests per day** OR cooldown after denial
- Prevents request spam while allowing legitimate needs
- **Voice-first for request reasons** (kids type slowly)
- Declined requests include "let's talk about why"

**Implementation:**
- Child-initiated requests appear in parent's "Pending Decisions"
- Requests include child's reasoning (voice or text)
- Parent can approve, discuss, or decline with explanation

**Call and Response Pattern:**
Every parent action creates visible invitation for child dialogue:

| Parent Action | Child Sees |
|---------------|------------|
| Reviews screenshots | "Dad looked at your Tuesday activity. Want to share anything about it?" |
| Extends time | "Mom gave you 30 extra minutes. She said: [reason]. Want to say thanks or ask why?" |
| Flags content | "This was flagged. Before anyone sees it, what's the story?" |
| Checks status | "Dad checked in. Everything okay, or want to chat?" |

- Transforms one-way monitoring into two-way dialogue
- Child always has voice, even when not initiating
- Parent actions become conversation starters

**Appeal Mechanism:**
- Child can escalate denied request to "mandatory discussion"
- Not override - guaranteed conversation within 48 hours
- Cooling-off period before denial becomes final
- Ensures child's voice is heard even in disagreement

**Bidirectional Accountability:**

| Behavior | Who's Nudged | Message |
|----------|--------------|---------|
| Parent checks >5x/day | Parent | "Taking a break might feel good - Emma's doing fine" |
| Parent reviews every screenshot | Parent | "Trust tip: Spot-checking works as well as reviewing everything" |
| Parent overrides agreement | Parent | "This override will be visible to Emma" |

**Age Gating:**
- Bidirectional accountability controls: **12+ only**
- Younger children shouldn't decide whether parents receive nudges
- Setting visible to child 12+ in their preferences
- Parents always see that the feature exists

**Configuration:**
- Child (12+) can enable/disable parent nudges (their choice)
- Nudges are gentle suggestions, not restrictions
- Parent can acknowledge and continue, or adjust behavior
- Builds mutual accountability into the system

**Graduation:**
- Cannot be indefinitely blocked by parent
- System actively advocates for child independence
- Mandatory family conversation before parent can deny graduation request
- Graduation timeline determined by family, not system expectations

**Child-Hosted Ceremonies:**
- Child can choose to "host" agreement signing
- Child reads or presents the terms
- Parents acknowledge and sign
- Powerful ownership moment
- **Optional but encouraged** for renewals (never required)

**Transparency Guarantees:**
- Everything visible to parent is visible to child
- No hidden monitoring capabilities
- "View as [Child]" shows exact same data
- Agreement terms visible to all signers always

---

## 7.9 Implementation Priority Matrix

**Critical Path (Must Have for Launch):**

| Item | Section | Why Critical |
|------|---------|--------------|
| Age-adaptive language layer | 7.1 | Core accessibility |
| Dual onboarding paths | 7.3 | Solves cold-start |
| Undo-eligible action classification | 7.5 | Safety vs convenience |
| Power-inversion onboarding | 7.8 | Prevents churn |
| Bidirectional accountability age-gate | 7.8 | Developmental appropriateness |

**High Priority (Soon After Launch):**

| Item | Section | Value |
|------|---------|-------|
| WebSocket for queue sync | 7.1 | Real-time trust |
| Veo fallback to illustrations | 7.3 | Reliability |
| Sticky privacy mode | 7.4 | Teen dignity |
| Celebration calibration | 7.7 | Tone-appropriate AI |
| Child-side offline notification | 7.6 | Reduces anxiety |

**V2 Features (Validate Demand First):**

| Item | Section | Notes |
|------|---------|-------|
| NLP narrative summary | 7.7 | Start structured, evolve |
| Conversational agreement builder | 7.3 | Alternative mode |
| Auto time-of-day navigation | 7.4 | Manual toggle first |
| Earned grace tokens | 7.2 | Data-driven refinement |

---

## 7.10 Anti-Surveillance Commitments

**Fledgely's Core Principles:**

What fledgely will **NEVER** do:
- Enable covert monitoring (everything visible to child)
- Compare siblings (no cross-child metrics or rankings)
- Sell or share family data (your data stays yours)
- Log keystrokes (no keystroke capture, ever)

**What fledgely MAY do, only under family agreement:**
- Track location (if included in signed agreement, visible to child)
- Monitor communications (if agreed, with child's knowledge)
- Read messages (if agreed, child sees same access parent has)

**The Difference:**
- Competitors: Parent enables features covertly; child discovers they're being watched
- Fledgely: Features only exist within mutual agreement; child always knows and has voice

**Visible in-app as trust signal** - accessible from Settings and About

**Architectural Enforcements:**
- Crisis module: separate code path, no logging capability
- Activity displays: never show gap durations
- Inactivity framed as "Taking a break" not "No activity detected"
- No cross-child data in any view
- All monitoring features require bilateral agreement activation

**Anti-Weaponization Commitments:**
- 30-day rolling data retention (no long-term archives)
- Shared custody mode requires dual consent for exports
- Public commitment to fight custody dispute subpoenas
- Either parent can delete all historical data

**Shared Custody Mode:**
- Destructive actions (delete agreement, remove child) require BOTH parents' consent
- 72-hour cooling-off period for all destructive actions
- Child notified before any deletion: "Your agreement is being deleted. Your progress will be affected."
- Soft delete: "Deleted" items recoverable for 30 days
- Neither parent can unilaterally weaponize the tool against the other

**Crisis Sovereignty:**
- Explicit parent consent at signup: "I understand crisis resources are private"
- Research-backed explanation: "Private access = more likely to seek help"
- Warm handoff option: "Would you like help talking to a trusted adult?"
- Professional partnership for crisis follow-up

---

## 7.11 Values Governance

**Structural Commitments:**
- Public changelog for any scope changes (30-day notice)
- Grandfathering: Existing users keep existing scope
- Quarterly values audit: "What we said no to and why"
- Community advisory board with scope-change input

**Enforcement:**
- Open source core enforces monitoring boundaries
- Community can verify claims against codebase
- Whistleblower protection for employees flagging values drift

---

## 7.12 Ethical Design Principles

**When Values Conflict:**

Fledgely operates in ethically complex territory. When values conflict, we follow this hierarchy:

1. **Child physical safety** - Immediate threat to life overrides other concerns
2. **Child psychological safety** - Dignity, trust, and mental health
3. **Child autonomy** - Grows individually; system advocates for independence
4. **Family autonomy** - Respect agreements families make
5. **Transparency** - Default to openness, but not at cost of weaponization
6. **Parental authority** - Valid but bounded and individually negotiated

**No Comparisons, Ever:**
- No age-based benchmarks ("kids your age typically...")
- No sibling comparisons
- No "average family" metrics
- No growth paths based on external standards
- Every child, parent, relationship, context, agreement, and version is unique
- Progress is measured against the individual's own journey, never others

**Individual Journey Ethics:**

| Principle | Implementation |
|-----------|----------------|
| **Unique agreements** | No "recommended" terms based on age or demographics |
| **Unique progress** | Trust growth measured against child's own baseline |
| **Unique graduation** | Timeline determined by family, not system expectations |
| **Unique context** | Same behavior may mean different things in different families |

**Safety Response Considerations:**

When child safety concerns arise, response timing may consider:
- Child's demonstrated capacity to seek help independently
- Family's agreed-upon notification preferences
- Whether child has engaged with offered resources
- Severity and immediacy of detected concern

These are contextual factors, not age-based rules. A mature 12-year-old and a struggling 16-year-old may need different approaches - determined by family agreement, not system assumptions.

**Insight, Not Judgment:**
- Surface patterns without labeling them good/bad
- Provide research, let families decide
- Optional wellness metrics, never mandatory
- No ranking of apps/content as "better" or "worse"
- No comparison to other families or children

**False Positive Mitigation:**
- Confidence-based notification language
- Child annotation window for ALL flags (even high-confidence)
- System learns from THIS family's pattern of false positives
- Batch low-confidence items into digest

---

## 7.13 Product Metaphor: Greenhouse, Not Prison

**Consistent language throughout fledgely:**

| Instead of... | Use... |
|---------------|--------|
| Parental controls | Growth conditions |
| Monitoring | Visibility for growth |
| Restrictions | Boundaries |
| Violations | Unexpected notes |
| Surveillance | Sunlight |
| Compliance | Flourishing |
| Rules | Agreements |
| Punishment | Course correction |
| Release/freedom | Ready to thrive outside |

- Parents are **gardeners** creating conditions for growth
- Children are **growing** toward independence
- Fledgely is a **greenhouse** - temporary, protective, transparent
- Graduation is **transplanting** to thrive in the open world

**Training Wheels Metaphor:**
Frame fledgely's arc as learning to ride a bike:
- Agreement = Getting your first bike with training wheels
- Trust growth = Getting steadier, needing less support
- Graduation = Taking off the training wheels
- Post-graduation = Riding on your own

Use this metaphor consistently in child-facing content.

---

## 7.14 Child-Facing Language (Feynman-Tested)

Every child-facing concept should be explainable to a 6-year-old.

| Concept | Child Language |
|---------|----------------|
| Agreement | "Your family's promise about screens and being online together" |
| Screenshots | "Pictures of your screen that you and your parents can both see" |
| Trust growth | "Showing you're ready for more" |
| Graduation | "When you don't need the app anymore - like taking off training wheels" |
| Time limits | "Your screen timer - with friendly warnings before it ends" |
| Crisis resources | "Private help when things feel hard" |
| Caregiver view | "Traffic light for grandma - green, yellow, red" |
| AI classification | "A helper computer that's still learning - you can teach it!" |

**Framing principles:**
- Autonomy is natural, not earned - children are growing INTO independence, not being released from restriction
- "Showing you're ready" not "earning freedom"
- Agreement covers more than screen time - it's about how your family handles digital life together
- Screenshots are between you and your parents, not broadcast to everyone

**What NOT to expose to young children:**
- Version numbers (just say "updated")
- Bidirectional accountability details (just say "helps the whole family")
- Technical AI explanations (just say "helper that learns")

**"Private" Not "Secret":**
- Secrets can feel wrong or shameful
- Privacy feels like a right
- Child-facing language: "This is private - just for you"
- Never: "This is a secret from your parents"

---
