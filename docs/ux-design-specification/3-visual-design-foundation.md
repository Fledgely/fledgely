# 3. Visual Design Foundation

## 3.1 Color System

### Selected Theme: Warm Amber

Fledgely uses a warm, amber-based color palette that evokes trust, comfort, and nurturing - inspired by apps like Headspace and family-oriented products. We deliberately avoid clinical blues common in surveillance software, choosing colors that feel like home, not a hospital.

**Competitive Differentiation:**
| Competitor | Primary Color | Our Advantage |
|------------|---------------|---------------|
| Bark | Navy + Teal | We're warmer, less corporate |
| Qustodio | Turquoise + Navy | We're more approachable |
| Life360 | Purple gradient | We're warmer, less "tracking" |
| Net Nanny | Royal Blue | We're family-first, not security-first |
| Google Family Link | Material Blue | We're distinctive, not generic |
| Apple Screen Time | White + Purple | We're warmer, more celebratory |

**No major parental control app uses warm orange/amber** - we own this visual space.

### Color Philosophy (OKLCH)

We use OKLCH color space for perceptual uniformity - colors that look equally bright to human eyes across the entire palette.

```css
:root {
  /* Core palette - OKLCH for perceptual uniformity */
  --primary: oklch(0.65 0.15 45);           /* Warm amber - trust, warmth */
  --primary-hover: oklch(0.60 0.16 45);     /* Darker on interaction */

  /* Semantic colors */
  --success: oklch(0.70 0.14 145);          /* Growth green - trust milestones */
  --warning: oklch(0.75 0.12 70);           /* Soft amber - gentle alerts */
  --destructive: oklch(0.65 0.12 30);       /* Gentle coral - NOT angry red */
  --crisis-calm: oklch(0.70 0.08 200);      /* Soothing teal - safety disclosures */
  --celebration: oklch(0.75 0.15 85);       /* Joyful gold - achievements */

  /* Role-specific accents */
  --child-accent: oklch(0.60 0.18 280);     /* Vibrant purple - child dashboard */
  --parent-accent: oklch(0.55 0.12 45);     /* Deeper amber - parent dashboard */

  /* Surfaces and text */
  --bg-surface: oklch(0.97 0.01 45);        /* Warm off-white */
  --bg-card: oklch(1.0 0 0);                /* Pure white cards */
  --bg-muted: oklch(0.94 0.01 45);          /* Subtle warm gray */
  --border: oklch(0.90 0.02 45);            /* Soft warm border */
  --text-primary: oklch(0.25 0.02 45);      /* Near-black with warmth */
  --text-secondary: oklch(0.50 0.02 45);    /* Muted for secondary info */
}

/* Fallback for older browsers */
@supports not (color: oklch(0 0 0)) {
  :root {
    --primary: #d4843e;
    --success: #4ead6b;
    --warning: #e8a849;
    --destructive: #d16b4a;
    --crisis-calm: #5ba3a8;
    --celebration: #e6b84d;
  }
}
```

### Semantic Token Mapping

| Token | Purpose | Emotional Intent | Plain Language |
|-------|---------|------------------|----------------|
| `--primary` | Main actions, branding | Trust, warmth | "The hug color" |
| `--success` / `--trust-high` | Trust score 75%+, achievements | Pride, accomplishment | "The growth color" |
| `--warning` | Gentle alerts, time reminders | Attention, not alarm | "Heads up" |
| `--destructive` | Delete, serious actions | Careful, not punishing | "Think twice" |
| `--crisis-calm` | Safety disclosures, flags | Calm, safe, supportive | "We're here for you" |
| `--celebration` | Milestones, ceremonies | Joy, family pride | "Celebration time" |
| `--child-accent` | Child-facing elements | Fun, ownership | "Your space" |
| `--parent-accent` | Parent-facing elements | Grounded, authoritative | "Your view" |

## 3.2 Theme System

### Available Themes

**1. Light Amber (Default)**
- Primary warm amber palette
- Best for daytime use and younger children
- Feels warm, inviting, family-friendly

**2. Dark Mode**
```css
[data-theme="dark"] {
  --bg-surface: oklch(0.15 0.01 45);
  --bg-card: oklch(0.20 0.02 45);
  --bg-muted: oklch(0.12 0.01 45);
  --text-primary: oklch(0.92 0.01 45);
  --text-secondary: oklch(0.65 0.01 45);
  --border: oklch(0.28 0.02 45);
  /* Primary amber adjusted for dark backgrounds */
  --primary: oklch(0.70 0.16 45);
}
```
- Essential for nighttime use
- Reduces eye strain
- Preferred by teens

**3. Neutral/Stealth Mode**
```css
[data-theme="neutral"] {
  --primary: oklch(0.55 0.04 250);      /* Muted blue-gray */
  --child-accent: oklch(0.50 0.03 250); /* Same family */
  --celebration: oklch(0.60 0.04 250);  /* Subtle */
}
```
- For teens concerned about peer perception
- Looks like a generic utility app
- Optional generic app icon

### Accent Color Picker

Children can personalize with 8 accent colors (replaces `--child-accent`):

| Color | OKLCH Value | Emotional Feel |
|-------|-------------|----------------|
| Amber (default) | oklch(0.65 0.15 45) | Warm, cozy |
| Teal | oklch(0.60 0.12 185) | Calm, cool |
| Purple | oklch(0.60 0.18 280) | Creative, fun |
| Coral | oklch(0.68 0.14 25) | Energetic, playful |
| Green | oklch(0.62 0.14 145) | Natural, growing |
| Blue | oklch(0.58 0.12 250) | Trustworthy, calm |
| Pink | oklch(0.70 0.14 350) | Friendly, soft |
| Orange | oklch(0.68 0.16 55) | Energetic, bold |

### Theme Selection in Onboarding

During child profile setup:
```
"How do you like your apps to look?"

[ ☀️ Bright and Warm ]  →  Light Amber theme
[ 🌙 Dark and Cool ]     →  Dark theme
[ ⚪ Simple and Clean ]  →  Neutral/Stealth theme
```

### Time-Aware Theming (Optional Enhancement)

Auto-adjusts based on time of day:
```
Morning (6am-12pm):   Warm amber, energizing
Afternoon (12pm-6pm): Standard amber
Evening (6pm-9pm):    Slightly cooler, wind-down
Night (9pm+):         Auto-dark mode if enabled
```

## 3.3 Typography System

### Font Stack

**Primary: System Fonts (Performance-First)**
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Display/Celebration: Nunito (Async Loaded)**
```css
@font-face {
  font-family: 'Nunito';
  src: url('/fonts/nunito-var.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 700;
}
```
- Loaded asynchronously (~50KB subsetted)
- Used for headlines, celebrations, ceremony moments
- Rounded, friendly warmth without being childish

**Why System + Nunito:**
- Zero-delay initial load (system fonts)
- Brand warmth where it matters (Nunito for special moments)
- Optimal performance on budget Chromebooks
- Both open-source friendly for self-hosters

### Type Scale

```css
/* Scale based on 16px base */
--text-xs: 0.75rem;    /* 12px - timestamps, meta */
--text-sm: 0.875rem;   /* 14px - secondary labels */
--text-base: 1rem;     /* 16px - body text */
--text-lg: 1.125rem;   /* 18px - important body */
--text-xl: 1.25rem;    /* 20px - H3 */
--text-2xl: 1.5rem;    /* 24px - H2 */
--text-3xl: 1.875rem;  /* 30px - H1 */
--text-4xl: 2.25rem;   /* 36px - Hero, ceremonies */

/* Line heights */
--leading-tight: 1.25;   /* Headings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.625; /* Long-form content */
```

### Age-Tier Typography Adjustments

| Age Tier | Body Size | Line Length | Special Considerations |
|----------|-----------|-------------|----------------------|
| **6-10** | 18px (+2px) | 60 characters max | Shorter sentences, more icons, bulleted lists |
| **11-14** | 16px (base) | 70 characters max | Standard readability |
| **15-17** | 16px (base) | 75 characters max | Can handle denser information |
| **Parents** | 16px (base) | 75 characters max | Professional tone acceptable |

## 3.4 Spacing & Layout Foundation

### Base Unit: 4px

All spacing derives from a 4px base unit:

```css
--space-1: 0.25rem;   /* 4px - tight spacing */
--space-2: 0.5rem;    /* 8px - element padding */
--space-3: 0.75rem;   /* 12px - component padding */
--space-4: 1rem;      /* 16px - section spacing */
--space-6: 1.5rem;    /* 24px - card padding */
--space-8: 2rem;      /* 32px - section gaps */
--space-12: 3rem;     /* 48px - major sections */
--space-16: 4rem;     /* 64px - page sections */
```

### Display Density Options

**Comfortable (Default):**
- Generous padding and margins
- Best for touch devices and younger users
- Card padding: 24px
- Section gaps: 32px

**Compact (Power Users):**
- Reduced spacing for data density
- Preferred by parents reviewing logs
- Card padding: 16px
- Section gaps: 16px

### Responsive Strategy

**Mobile-first for daily interactions, tablet-optimized for ceremonies:**

| Breakpoint | Use Case | Layout |
|------------|----------|--------|
| **< 640px** | Phone (daily use) | Single column, bottom nav |
| **640-1024px** | Tablet (ceremonies, family discussions) | Premium ceremony layouts |
| **> 1024px** | Desktop (parent dashboard) | Sidebar + main content |

**Special: Ceremony Mode**
- Signing ceremony detects screen size
- Tablet (640px+) gets enhanced ceremony layout
- Designed for family gathered around one device

## 3.5 Age-Based Visual Defaults

Different visual treatment by age tier:

| Setting | Ages 6-10 | Ages 11-14 | Ages 15-17 |
|---------|-----------|------------|------------|
| **Default theme** | Light Amber | User choice | User choice |
| **Celebration level** | Full (confetti) | Subtle (pulse) | Minimal (color only) |
| **Trust visualization** | Flames 🔥 | Choice | Achievement badges |
| **Illustration density** | High | Medium | None/minimal |
| **UI density** | Spacious | Comfortable | User choice |
| **"My Day" screenshot style** | Scrapbook | Album | Journal (minimal) |

## 3.6 Animation & Celebration System

### Performance Approach: CSS-Only

All animations use CSS `@keyframes` for GPU acceleration:

```css
@keyframes celebration-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}

@keyframes confetti-fall {
  0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
```

**Performance Budget:**
- Animations must complete in <16ms per frame
- Max 20 confetti elements for ceremony
- Automatically disabled if `navigator.deviceMemory < 4GB`
- Respect `prefers-reduced-motion`

### Celebration Levels (User-Configurable)

| Level | Visual | Sound | Haptic | Default For |
|-------|--------|-------|--------|-------------|
| **Full** | Confetti, bounce, glow | Chime | Vibrate | Ages 6-10 |
| **Subtle** | Pulse, color shift | None | Light tap | Ages 11-14 |
| **Minimal** | Color change only | None | None | Ages 15+ |

### Celebration Budget

To prevent fatigue:
- **Max 3 celebratory moments per session**
- Full celebrations reserved for:
  - Fledge Compact signing
  - Weekly trust milestones
  - Trust tier increases (50%, 75%, 90%)
- Daily interactions use subtle acknowledgment only

## 3.7 Trust Visualization System

### Trust Streak Options

| Style | Visual | Best For |
|-------|--------|----------|
| **Flames** 🔥 | Growing fire (ember → blaze → crown) | Ages 6-10 |
| **Badges** 🏆 | Achievement medals | Ages 11-17 |
| **Trend Line** 📈 | Simple graph | Parents |

**Flame Progression:**
```
Day 1-3:   🔥 Small ember
Day 4-7:   🔥🔥 Growing flame
Day 8-14:  🔥🔥🔥 Strong fire
Day 15-30: 🌟 Golden star
Day 30+:   👑 Crown (legendary)
```

### "My Day" Screenshot Album

Child-facing view of their screenshots, styled by age:

| Age | Style | Framing |
|-----|-------|---------|
| **6-10** | Scrapbook with stickers | "Look what you explored today!" |
| **11-14** | Photo album grid | "Your digital day" |
| **15-17** | Minimal journal | "Activity log" (neutral) |

**Key Principle:** Screenshots are "your memory book" not "surveillance evidence"

## 3.8 Language Design (Visual/Textual)

### Reframed Terminology

| ❌ Avoid | ✅ Use Instead | Why |
|----------|----------------|-----|
| Blocked | Protected | Not punitive |
| Restricted | Guided | Supportive framing |
| Limit reached | Time to recharge | Positive spin |
| Violation | Flag for discussion | No accusation |
| Monitoring | Supporting | Partnership language |
| Screen time limit | Screen time allowance | Positive framing |
| Rules | Agreements | Mutual commitment |
| Parental controls | Family digital agreement | Collaborative |

## 3.9 Accessibility Requirements

### WCAG 2.1 AA Compliance

| Requirement | Our Standard | Implementation |
|-------------|--------------|----------------|
| **Text contrast** | Minimum 4.5:1 | Automated CI testing |
| **Large text contrast** | Minimum 3:1 | All headings verified |
| **Touch targets** | Minimum 44×44px (48×48 for ages 6-10) | Component library enforced |
| **Focus indicators** | 2px solid, 2px offset | Visible in all themes |
| **Motion** | Respect `prefers-reduced-motion` | CSS media query |

### Alert Override System

**Safety-critical alerts override theme settings:**
- Crisis-calm alerts always use high-contrast colors
- Parent notification dots visible in ANY theme (white/yellow)
- Audible + haptic alert for safety flags (not color alone)
- "Safety alerts always bright" parent setting available

### Screen Reader Support

- All images have meaningful alt text
- Trust visualizations include text alternatives
- Celebration sounds are optional, never sole feedback
- Full keyboard navigation support

## 3.10 Implementation Requirements

### Browser Support

- Chrome 111+ (primary - Chromebook target)
- Safari 16.4+
- Firefox 113+
- OKLCH with RGB fallbacks via `@supports`

### Performance Targets

- Font load: <50KB (Nunito subsetted)
- First paint: <1s on 3G
- Animation frames: <16ms
- Test device: HP Chromebook 11 (2GB RAM)

### Risk Mitigations

| Risk | Prevention |
|------|------------|
| **Brand recognition** | Logo visible on every screen, not just color reliance |
| **Teen embarrassment** | Private ceremony mode (no screenshots), stealth theme |
| **Accessibility lawsuits** | Automated contrast testing in CI/CD |
| **Performance on budget devices** | Test on $200 Chromebook in QA |
| **Celebration fatigue** | 3-per-session budget, age-appropriate defaults |
| **Dark mode alert visibility** | Safety alerts override theme |

## 3.11 Design Assets

**Color Theme Visualizer:**
Interactive HTML file demonstrating all themes:
`docs/design-assets/color-theme-visualizer.html`

Includes:
- Four theme options with live preview
- Fledge Compact card styling
- Alert state demonstrations
- Parent vs Child dashboard comparison
- Signing ceremony celebration moment

---
