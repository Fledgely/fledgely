# Design System Foundation

## Design System Choice

**Primary System:** Tailwind CSS + Radix UI Primitives (via shadcn/ui patterns)

A themeable, headless component approach that provides:
- Full control over visual aesthetics (achieving warm, Headspace-like tone)
- Unstyled accessibility-first primitives
- Portable design tokens across all platforms
- Open source with no licensing constraints

## Rationale for Selection

| Criterion | Why This Choice |
|-----------|-----------------|
| **Tone Flexibility** | Tailwind's utility-first approach allows crafting warm, family-friendly aesthetic without fighting against opinionated defaults |
| **Novel Pattern Support** | Headless primitives let us build Trust Skill Trees, Activity Rings, Fledge Compact ceremonies from scratch |
| **Multi-Platform** | Design tokens (colors, spacing, typography) export to CSS variables usable on web, extensions, and inform native styling |
| **Accessibility** | Radix primitives handle keyboard nav, focus management, ARIA - critical for children and parents |
| **Open Source Alignment** | MIT licensed, no vendor lock-in, perfect for self-hosted deployments |
| **Developer Experience** | Large community, excellent documentation, rapid prototyping |

## Architecture Decision Record

**ADR-001: Design System Foundation**

**Status:** Approved

**Decision:** Tailwind CSS + Radix UI primitives (shadcn/ui patterns) for web platforms, with shared design tokens for native platforms.

**Panel Consensus:**

| Architect Role | Position | Key Insight |
|----------------|----------|-------------|
| **Enterprise Architect** | Approved | Ownership model crucial for longevity; need component governance process |
| **Frontend/UX Architect** | Strong Yes | Ideal for brand-heavy, novel UX; full control for Trust Skill Tree, Activity Rings |
| **Cross-Platform Architect** | Approved with strategy | Excellent for web/extension; React Native needs separate evaluation |

**Alternatives Considered:**

| System | Novel Patterns | Warm Aesthetic | Bundle Size | Verdict |
|--------|---------------|----------------|-------------|---------|
| **Tailwind+Radix** | Excellent | Full control | Minimal | ✅ Selected |
| MUI/Material | Poor (fights system) | Difficult | Heavy | ❌ Too opinionated |
| Chakra UI | Moderate | Good | Medium | ❌ Less flexibility |
| Ant Design | Poor | Very difficult | Heavy | ❌ Enterprise-focused |

## Implementation Approach

| Platform | Implementation |
|----------|---------------|
| **Web Dashboard** | Tailwind CSS + Radix/shadcn components + custom components |
| **Mobile App** | React Native with shared design tokens (NativeWind or RN Paper - deferred decision) |
| **Browser Extension** | Tailwind CSS (compiled) + lightweight Radix components |
| **System Tray** | Native styling informed by design tokens |
| **Fire TV** | Native Android TV styling following design token palette |
| **Consoles** | Platform-native with design token colors/typography guidance |

**Component Strategy:**
- **Use Existing:** Buttons, inputs, dialogs, tooltips, dropdowns (Radix primitives)
- **Build Custom:** Trust Skill Tree, Activity Rings, Fledge Compact signing, screenshot viewer, time countdown

## Customization Strategy

**Design Token Architecture:**

```
tokens/
├── colors.css          # Warm palette (not clinical blue)
├── typography.css      # Friendly, readable fonts
├── spacing.css         # Generous, calm spacing
├── animation.css       # Celebration + calm micro-interactions
├── shadows.css         # Soft, approachable shadows
└── platform/
    ├── web.css
    ├── mobile.json     # Exported for React Native
    └── tv.css
```

**Fledgely Semantic Tokens:**

Beyond shadcn defaults, fledgely requires custom semantic tokens:

| Token | Purpose | Example Value |
|-------|---------|---------------|
| `--trust-high` | High trust score display | Warm green |
| `--trust-medium` | Medium trust score | Amber |
| `--trust-building` | Early trust phase | Soft blue |
| `--crisis-calm` | Crisis UI (NOT alarming) | Calming teal |
| `--celebration` | Milestone animations | Joyful gold |
| `--child-accent` | Child dashboard variant | Slightly more vibrant |
| `--parent-accent` | Parent dashboard variant | Slightly more muted |
| `--agreement-active` | Active agreement status | Healthy green |
| `--flag-pending` | Flag awaiting context | Gentle amber |

**Color Philosophy:**

```css
:root {
  /* Primary: Warm, trustworthy (not surveillance-blue) */
  --primary: oklch(0.65 0.15 45);           /* Warm amber */

  /* Success: Celebratory for trust milestones */
  --success: oklch(0.70 0.14 145);          /* Growth green */

  /* Warning: Gentle amber (not alarming red) for flags */
  --warning: oklch(0.75 0.12 70);           /* Soft amber */

  /* Destructive: Only for actual danger, still not panic-inducing */
  --destructive: oklch(0.65 0.12 30);       /* Gentle coral */

  /* Crisis: Maximum calm, supportive */
  --crisis-calm: oklch(0.70 0.08 200);      /* Soothing teal */
}
```

**Typography:**
- Friendly, rounded fonts for warmth
- High readability for all ages (6th-grade reading level)
- Clear hierarchy without feeling corporate

**Animation Principles:**
- **Celebrations:** Joyful, particle effects, satisfying
- **Status changes:** Smooth, reassuring transitions
- **Warnings:** Gentle pulse, not jarring
- **Crisis:** Maximum calm, minimal animation

## Component Governance

**Process for maintaining forked shadcn components:**

1. **Accessibility Review** - All modified components must pass accessibility audit
2. **Audience Testing** - Test with both child and parent audience variants
3. **Upstream Tracking** - Quarterly review of shadcn improvements to consider adopting
4. **Documentation** - Each custom component documents deviations from shadcn base

## Cross-Platform Token Export

**Build pipeline exports tokens as:**
- **CSS Variables** - Web dashboard, browser extension
- **JSON** - React Native consumption
- **Documentation** - Console platform guidelines for native developers

---
