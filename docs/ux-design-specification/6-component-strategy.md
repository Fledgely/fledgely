# 6. Component Strategy

## 6.1 Design System Foundation

**Base System:** shadcn/ui (Radix primitives + Tailwind CSS)

**Available from shadcn/ui:**
- Button, Input, Select, Checkbox, Radio, Switch, Slider
- Dialog, Sheet, Popover, Tooltip, Dropdown Menu
- Card, Tabs, Accordion, Avatar, Badge
- Form, Label, Toast, Alert, Progress
- Table, Skeleton, Separator

**Gap Analysis - Custom Components Needed:**

| Need | Available Component | Gap |
|------|---------------------|-----|
| Child status at a glance | Card | Need: Trust visualization, time ring, quick actions |
| Trust growth visualization | Progress | Need: Flame metaphor with animation, milestones |
| Screen time display | Progress | Need: Circular ring with remaining time |
| Agreement creation wizard | Dialog + Form | Need: Multi-step ceremony with signatures |
| Screenshot review | Image + Card | Need: Swipe gestures, bulk actions, AI labels |
| Traffic light status | Badge | Need: 96px circles with icons, polling |
| Celebration feedback | Toast | Need: Confetti, achievement badges |
| Crisis resources | Sheet | Need: Private, async-loaded, no tracking |
| Mutual selection | Checkbox | Need: Dating-app style reveal animation |

## 6.2 Custom Component Specifications

### 6.2.1 Fledge Compact Card

**Purpose:** Display child status at a glance on caregiver dashboard

**Anatomy:**
```
┌─────────────────────────────────────┐
│  [Avatar]  Child Name     [Status]  │
│            Trust: 🔥 82%            │
│  ┌─────────────────────────────┐   │
│  │     Time Ring: 45min left   │   │
│  └─────────────────────────────┘   │
│  [Quick Actions: View | Message]   │
└─────────────────────────────────────┘
```

**States:**
- `default` - Normal display
- `hover` - Slight elevation, actions visible
- `expanded` - Full detail view
- `offline` - Grayed, last-seen timestamp
- `alert` - Amber border, attention needed

**Props:**
```typescript
interface FledgeCompactCardProps {
  childId: string;
  childName: string;
  avatarUrl?: string;
  trustLevel: number; // 0-100
  trustTrend: 'growing' | 'stable' | 'milestone';
  screenTimeRemaining: number; // minutes
  screenTimeLimit: number; // minutes
  status: 'online' | 'offline' | 'attention';
  lastSeen?: Date;
  onExpand: () => void;
  onQuickAction: (action: 'view' | 'message') => void;
}
```

**Accessibility:**
- `role="article"` with `aria-labelledby` for child name
- `aria-describedby` for status summary
- Keyboard: Enter to expand, Tab to actions

**Implementation:** React Query for data, memo for render optimization

### 6.2.2 Trust Flame Visualization

**Purpose:** Show trust growth using flame metaphor that only grows

**Anatomy:**
```
        🔥
       /||\      <- Flame height = trust %
      / || \
     /  ||  \
    ────────────  <- Base (always visible)

    ✨ 82% ✨    <- Milestone particles at 25/50/75/100%
```

**States:**
- `growing` - Active growth animation (after positive event)
- `stable` - Gentle idle sway
- `milestone` - Celebration particles (10%, 25%, 50%, 75%, 100%)
- `streak` - Extra glow for consecutive positive days

**Props:**
```typescript
interface TrustFlameProps {
  trustLevel: number; // 0-100
  previousLevel?: number; // For growth animation
  streak?: number; // Days of positive behavior
  size: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onMilestoneReached?: (milestone: number) => void;
}
```

**Accessibility:**
- `role="meter"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- `aria-label="Trust level: 82 percent, growing"`
- Reduced motion: Static glow, no animation

**Implementation:** SVG + CSS keyframes, `prefers-reduced-motion` fallback

### 6.2.3 Time Ring

**Purpose:** Circular display of remaining screen time

**Anatomy:**
```
      ╭─────╮
    ╱    45   ╲     <- Minutes remaining (center)
   │    min    │
    ╲  ═══════ ╱    <- Progress arc (fills clockwise)
      ╰─────╯
```

**States:**
- `plenty` - Green arc (>30 min remaining)
- `warning` - Amber arc (<15 min remaining)
- `critical` - Amber pulse (<5 min remaining)
- `exhausted` - Gray, "Take a break" message
- `bonus` - Sparkle animation when time added

**Props:**
```typescript
interface TimeRingProps {
  remainingMinutes: number;
  totalMinutes: number;
  size: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onTimeUp?: () => void;
  onWarning?: () => void;
}
```

**Accessibility:**
- `role="img"` with comprehensive `aria-label`
- `aria-label="Screen time today: 45 of 120 minutes used. 75 minutes remaining."`

**Implementation:** SVG with CSS custom properties for arc animation

### 6.2.4 Agreement Builder

**Purpose:** Multi-step wizard for creating family digital agreements

**Anatomy:**
```
Step 1 of 5: Choose Agreement Type
━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━

[Screen Time] [Content Rules] [Privacy] [Custom]

                              [Next →]
```

**Steps:**
1. Select agreement type
2. Name the agreement
3. Add family members
4. Configure terms (parallel editing)
5. Review and sign (ceremony)

**States:**
- `idle` - Not started
- `setup.select_type` - Choosing template
- `setup.name_agreement` - Naming
- `setup.add_members` - Adding participants
- `terms.editing` - Configuring rules
- `terms.validating` - Checking completeness
- `review.preview` - Final review
- `review.awaiting` - Waiting for approvals
- `ceremony.signing` - Signature collection
- `ceremony.celebrating` - Success animation
- `complete` - Done

**Implementation:** XState state machine (see State Machine section)

### 6.2.5 Swipe Triage Card

**Purpose:** Efficient review of flagged content with gesture + button support

**Anatomy:**
```
┌─────────────────────────────────┐
│                                 │
│      [Screenshot/Content]       │
│                                 │
│  AI: "Minecraft gameplay"       │
│  Category: Games - Creative     │
│  Time: 3:47 PM                  │
│                                 │
├─────────────────────────────────┤
│ [✓ Fine] [💬 Discuss] [📌 Save] [🧠 Train] │
└─────────────────────────────────┘

Swipe: ← Dismiss | → Save | ↑ Discuss | ↓ Train AI
```

**Gestures:**
- Left swipe: Dismiss (this is fine)
- Right swipe: Save to album
- Up swipe: Add to discussion queue
- Down swipe: Train AI (show more/less like this)

**Props:**
```typescript
interface SwipeTriageCardProps {
  item: {
    id: string;
    type: 'screenshot' | 'search' | 'app_usage';
    imageUrl?: string;
    title: string;
    aiCategory: string;
    aiConfidence: number;
    timestamp: Date;
  };
  onDismiss: () => void;
  onSave: () => void;
  onDiscuss: () => void;
  onTrain: (feedback: 'more' | 'less') => void;
}
```

**Accessibility:**
- Visible buttons are PRIMARY, swipe is enhancement
- `role="group"` with `aria-label` for content
- `role="toolbar"` for action buttons
- Full keyboard support via buttons

**Implementation:** `use-gesture` + `react-spring` for physics

### 6.2.6 Traffic Light Status

**Purpose:** At-a-glance status for delegated caregivers

**Anatomy:**
```
    ┌─────┐
    │  ✓  │  <- Green: All good
    │     │     96px circle with icon
    └─────┘

    "All Good"  <- Text label below
```

**States:**
- `green` - All good (checkmark icon)
- `yellow` - Activity to note (lightning icon)
- `red` - Needs attention (exclamation icon)

**Props:**
```typescript
interface TrafficLightStatusProps {
  status: 'green' | 'yellow' | 'red';
  message: string;
  lastUpdated: Date;
  childName: string;
  onTap?: () => void; // For caregivers who want more detail
}
```

**Accessibility:**
- Icons AND text labels always shown
- `aria-label="Status for Emma: All good"`
- Color is never sole indicator

**Implementation:** 30-second polling, CSS transitions for state changes

### 6.2.7 Screenshot Album

**Purpose:** Browse and review captured screenshots

**Anatomy:**
```
Timeline: [Today] [Yesterday] [This Week] [Custom]

┌────┐ ┌────┐ ┌────┐ ┌────┐
│ 📸 │ │ 📸 │ │ 📸 │ │ 📸 │
│3:47│ │3:21│ │2:58│ │2:34│
└────┘ └────┘ └────┘ └────┘

[Load more...]
```

**Features:**
- Lazy loading with intersection observer
- FLIP animation for lightbox
- AI-generated alt text for each image
- "Skip to next day" keyboard shortcut

**Accessibility:**
- AI-generated alt text: "Screenshot from Minecraft at 3:47 PM showing gameplay in creative mode. Text visible: 'Building a house'. Activity category: Games - Creative."
- Skip links for timeline navigation

### 6.2.8 Celebration Animation

**Purpose:** Positive reinforcement for achievements

**Triggers:**
- Agreement signed
- Trust milestone reached (25%, 50%, 75%, 100%)
- Streak achieved (3, 7, 14, 30 days)
- Badge earned

**Configuration:**
```typescript
const celebrationConfig = {
  particleCount: 50,
  spread: 70,
  startVelocity: 30,
  decay: 0.95,
  gravity: 0.8,
  colors: ['#FFB347', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F7DC6F'],
  duration: 3000
};
```

**Accessibility:**
- Auto-pause after 3 seconds
- `prefers-reduced-motion`: Static confetti image
- Achievement text always readable

### 6.2.9 Crisis Resources Panel

**Purpose:** Private access to crisis support resources

**Anatomy:**
```
┌─────────────────────────────────────┐
│  It sounds like things are hard.   │
│                                     │
│  These resources are ALWAYS         │
│  private - no one else can see.    │
│                                     │
│  [📱 Text HOME to 741741]          │
│  [📞 Call 988]                     │
│  [💬 Chat with someone]            │
│                                     │
└─────────────────────────────────────┘
```

**Critical Requirements:**
- Async-loaded (separate webpack chunk)
- NO onClick tracking
- NO focus persistence
- NO history entries
- Separate code path that CANNOT log

**Accessibility:**
- `role="complementary"`
- `aria-label="Support resources - private and not logged"`
- Screen reader announcement: "This section is completely private"
- No focus trap - natural navigation away

### 6.2.10 Mutual Match Selector

**Purpose:** Dating-app style preference matching between parent and child

**Anatomy:**
```
Parent's Picks          Child's Picks
┌─────────────┐        ┌─────────────┐
│ [✓] 2hr/day │        │ [?] Hidden  │
│ [✓] No TikTok│       │ [?] Hidden  │
│ [ ] Bedtime │        │ [?] Hidden  │
└─────────────┘        └─────────────┘

[Both Confirm] → Reveal matches!
```

**Reveal Animation:**
1. Both selections pulse
2. Connection line draws between matches
3. Checkmark appears at midpoint
4. Non-matches show neutrally: "Different picks - let's discuss!"

**Implementation:** XState state machine with parallel selectors

## 6.3 Accessibility Audit Summary (WCAG 2.2 AA)

| Component | Critical Issues | Remediation |
|-----------|-----------------|-------------|
| Fledge Card | Card role unclear | Add `role="article"` with `aria-labelledby` |
| Trust Flame | Color-only growth indicator | Add size + particle count as redundant cues |
| Time Ring | Thin ring segments | Increase stroke to 8px, add `role="img"` |
| Agreement Builder | Focus jumps between steps | Trap focus, announce step changes via `aria-live` |
| Swipe Triage | Gesture-only controls | **Visible buttons PRIMARY**, swipe is enhancement |
| Traffic Light | Red/yellow/green color-only | Icons AND text labels always shown |
| Screenshot Album | Images need descriptions | AI-generated alt text |
| Celebration | Auto-playing animation | Auto-pause after 3s, respect `prefers-reduced-motion` |
| Crisis Panel | Must not leave trace | No focus ring persistence, no tracking |
| Mutual Match | Custom control unclear | Use `role="listbox"` with `role="option"` |

**Age-Specific Touch Targets:**
- Ages 6-10: 56px minimum (larger than standard)
- Ages 11-17: 44px minimum (standard)
- Parents: 44px minimum (standard)

## 6.4 Animation Choreography

### 6.4.1 Motion Tokens

```css
:root {
  /* Timing */
  --duration-instant: 100ms;    /* Micro-feedback */
  --duration-fast: 200ms;       /* Button states, toggles */
  --duration-medium: 350ms;     /* Card transitions, panels */
  --duration-slow: 500ms;       /* Page transitions, celebrations */
  --duration-ceremony: 800ms;   /* Agreement signing moments */

  /* Easing */
  --ease-out-gentle: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-in-out-soft: cubic-bezier(0.45, 0, 0.55, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-breathe: cubic-bezier(0.37, 0, 0.63, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0ms;
    --duration-fast: 0ms;
    --duration-medium: 0ms;
    --duration-slow: 0ms;
    --duration-ceremony: 0ms;
  }
}
```

### 6.4.2 Component Animation Summary

| Component | Key Animation | Duration | Feeling |
|-----------|---------------|----------|---------|
| Fledge Card | Staggered enter | 350ms + 50ms stagger | Welcoming |
| Trust Flame | Living flicker + growth | 2s idle / 800ms growth | Alive, growing |
| Time Ring | Smooth progress | 1s linear | Calm awareness |
| Agreement Builder | Step slides | 350ms | Guided journey |
| Swipe Triage | Physics-based swipe | Spring physics | Satisfying |
| Traffic Light | Color transitions | 400ms | Informative |
| Screenshot Album | FLIP lightbox | 300ms | Fluid |
| Celebration | Confetti burst | 3s | Joyful |
| Crisis Panel | Gentle fade | 400ms | Calm, safe |
| Mutual Match | Connection reveal | 800ms | Connecting |

### 6.4.3 Trust Flame Animation Detail

```css
/* Idle state - living flame */
.trust-flame {
  animation:
    flame-flicker 2s var(--ease-breathe) infinite,
    flame-sway 4s var(--ease-in-out-soft) infinite;
}

@keyframes flame-flicker {
  0%, 100% { filter: brightness(1) drop-shadow(0 0 8px var(--flame-glow)); }
  50% { filter: brightness(1.1) drop-shadow(0 0 12px var(--flame-glow)); }
}

@keyframes flame-sway {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}

/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
  .trust-flame {
    animation: none;
    filter: drop-shadow(0 0 calc(var(--trust) * 0.15px) var(--flame-glow));
    transition: filter 500ms ease;
  }
}
```

### 6.4.4 Signature Ceremony Animation

```
Duration: 1500ms - this is THE moment
Sequence:
  1. Screen dims slightly (0-200ms)
  2. Signature area glows warm (200-400ms)
  3. As finger/stylus moves, trail follows with slight delay
  4. On lift, signature "settles" with ink effect (400-600ms)
  5. Gentle pulse of completion (600-800ms)
  6. Confetti/celebration burst (800-1500ms)
```

## 6.5 State Machine Specifications

### 6.5.1 Agreement Builder State Machine

```
PHASES: Setup → Terms → Review → Ceremony → Complete

SETUP PHASE:
  select_type → name_agreement → add_members

TERMS PHASE (parallel editing):
  screen_time | content_rules | privacy_settings | consequences
  → validate_terms

REVIEW PHASE:
  preview → request_reviews → awaiting_reviews → review_feedback

CEREMONY PHASE:
  prepare_ceremony → signing_first → counter_signing → celebrating

PARALLEL STATES:
  - saving: idle | saving | saved | error
  - network: online | offline | reconnecting
```

**Key Transitions:**
- Cannot advance from `select_type` without selection
- Cannot advance from `add_members` without 2+ members
- `ceremony.celebrating` auto-transitions after 3 seconds
- Network offline queues changes for sync

### 6.5.2 Mutual Match State Machine

```
PHASES: Loading → Selection (parallel) → Reveal → Complete

SELECTION (parallel states):
  PARENT_SELECTOR: browsing → selecting → confirmed
  CHILD_SELECTOR: browsing → selecting → confirmed

REVEAL PHASE:
  preparing → revealing (one by one) → results

RESULTS (based on match quality):
  - full_match → celebrate
  - partial_match → show matches + "let's discuss"
  - no_match → "different picks - great starting point!"
```

**Key Guards:**
- `hasFullMatch`: All parent selections matched by child
- `hasPartialMatch`: Some matches exist
- Both must confirm before reveal

### 6.5.3 Swipe Triage State Machine

```
PHASES: Loading → Triage Loop → Complete

TRIAGE LOOP:
  showing_card → swiping | button_action → processing → dealing_next

SWIPE DETECTION:
  - Distance threshold: 30% of card width
  - Velocity threshold: 0.5
  - Direction determines action: left/right/up/down

BUTTON ALTERNATIVES:
  - Same actions as swipe
  - Immediate visual feedback
```

## 6.6 Implementation Roadmap

### Phase 1: Core Components (MVP)
1. **Fledge Compact Card** - Essential for dashboard
2. **Trust Flame** - Core visualization metaphor
3. **Time Ring** - Screen time display
4. **Traffic Light Status** - Caregiver view

### Phase 2: Agreement Flow
5. **Agreement Builder** - XState implementation
6. **Mutual Match Selector** - Collaborative rule-setting
7. **Celebration Animation** - Positive reinforcement

### Phase 3: Content Review
8. **Swipe Triage Card** - Efficient flag review
9. **Screenshot Album** - Content browsing

### Phase 4: Safety-Critical
10. **Crisis Resources Panel** - Must be architectural (separate code path)

---
