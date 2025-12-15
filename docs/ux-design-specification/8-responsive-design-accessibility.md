# 8. Responsive Design & Accessibility

## 8.1 Responsive Strategy

### Desktop Strategy (1024px+)
- **Multi-column layouts** with higher information density
- **Keyboard shortcuts** for power users (Ctrl+K quick actions)
- **Multi-select capabilities** for batch operations
- **Side-by-side comparisons** when reviewing agreements
- **Feature parity commitment:** Desktop shows MORE data at once, but never provides CAPABILITY advantages over mobile

### Tablet Strategy (768-1023px)
- **Enhanced mobile experience** rather than stripped desktop
- **Touch-optimized** with larger interactive elements
- **Both orientations supported** with adaptive layouts
- **Ideal for family meeting scenarios** (shared viewing during agreement creation)

### Mobile Strategy (320-767px)
- **4-tab bottom navigation:** Dashboard, Alerts, Children/My Family, Settings
- **Role-adaptive labels:** Child sees "My Family"/"My Space", Parent sees "Children"/"Dashboard"
- **Swipe gestures** for common actions (with confirmation for critical actions)
- **Pull-to-refresh** for status updates
- **Alerts above fold** with priority hierarchy (urgent first, not flat list)
- **Mobile-first design philosophy** - all features accessible on smallest screens

## 8.2 Breakpoint Strategy

| Breakpoint | Range | Target Devices | Design Approach |
|------------|-------|----------------|-----------------|
| **Micro** | 280-320px | Samsung Fold (folded), small devices | Ultra-condensed, essential actions only |
| **Mobile** | 320-767px | Smartphones | Single column, bottom nav, touch-first |
| **Tablet-Mini** | 717-768px | iPad Mini, tweener tablets | Adapted mobile with optional 2-column |
| **Tablet** | 768-1023px | iPads, Android tablets | Touch-optimized 2-column layouts |
| **Desktop** | 1024-1439px | Laptops, smaller monitors | Full multi-column, keyboard support |
| **Large Desktop** | 1440px+ | Large monitors | Maximum data density, dashboard views |

**Testing Requirements:**
- Test at 120% and 150% OS scaling (effectively changes breakpoints)
- Test all breakpoints at 400% zoom (WCAG requirement)
- Test on actual foldable devices (Fold, Flip)

## 8.3 Platform-Specific Considerations

### Fire TV / Shared Displays
- **Family viewing mode** (hides monitoring indicators during movie night)
- **Parent authentication required** to toggle family mode
- **Auto-timeout** to neutral screen after 2 minutes inactivity
- **Voice control primary** ("Show me Emma's status")
- **Tremor-friendly:** Extended focus dwell time (1-second hold to select)
- **Cast detection:** Auto-blur sensitive content when external display detected
- **No screen burn-in:** Moving elements, screen saver for static displays

### Browser Extension
- **Minimal permission model** - request only what's needed
- **Auto-blocklist** for sensitive domains (banking, health, government)
- **No data capture** on blocklisted sites
- **Clear indicator** when extension is active

## 8.4 Accessibility Strategy

### WCAG Compliance
- **Level AA** for all standard features
- **Level AAA** for crisis resources (maximum accessibility when it matters most)
- Color contrast ratios: 4.5:1 minimum for normal text, 3:1 for large text
- Touch targets: 44x44px minimum

### In-App Accessibility Controls
Users can configure accessibility WITHOUT relying on OS settings:
- **Font size adjustment** (independent of OS)
- **High contrast toggle** (independent of OS)
- **Motion reduction** (respects OS prefers-reduced-motion, plus manual override)
- **"Make it easier to see" button** on every screen - always visible, always large
- **Voice input** available for ALL text inputs, ALL users

### Accessibility Onboarding
- **Wizard during setup** - questionnaire-based suggestions
- **OS setting detection** - auto-configure based on system accessibility settings
- **Bundled profiles** instead of individual toggles (easier to manage)
- **Emergency accessibility:** Universal "Help" button, voice commands ("Make everything bigger", "I can't see")

## 8.5 Accessibility Modes

### Core Accessibility Modes

| Mode | Trigger | Adaptations |
|------|---------|-------------|
| **Comfort Mode** | User setting | Large text default, high contrast, reduced feature set, voice-first option. NEVER hides information - presentation only |
| **Dyslexia Mode** | User setting | OpenDyslexic font, cream background, increased letter/word spacing, key info highlighting |
| **Tremor Mode** | User setting | Extended dwell time (1s hold to select), larger targets, sticky selections, voice as primary input |
| **ADHD Mode** | User setting | Reduced steps, quick requests with smart defaults, suggested responses, instant feedback, interrupt protection |
| **Low Vision Night Mode** | Time + screen reader | Whisper volume for VoiceOver/TalkBack, haptic priority patterns, audio-only triage |
| **Discreet/Teen Mode** | Schedule or manual | Neutral notifications, disguised app icon option, friend-proof display |
| **Travel Mode** | Pre-set or detected | Offline preview of rules, manual location override, graceful offline degradation |
| **Caregiver Mode** | Role-based | Simplified interface, icon-first design, user-level language preference |

### Mode Conflict Resolution
- **Hierarchy:** Safety > Accessibility > Preference
- **Testing required:** All 127 mode combinations tested
- **Auto-disable conflicts:** Some modes auto-disable incompatible settings

### Expanded Cognitive Accessibility
- **Memory support:** "You were doing X, would you like to continue?"
- **Processing speed:** Extended timeouts everywhere, no time pressure
- **Intellectual disability:** Symbol-based navigation option, reduced vocabulary
- **Autism-specific patterns:**
  - Predictable, consistent layouts (never move buttons)
  - Literal language (no idioms or metaphors)
  - Clear cause-effect ("You tapped X, now Y will happen")
  - No social pressure language ("Your dad is waiting" creates anxiety)

## 8.6 Age-Aware Accessibility Defaults

| Age Group | Default Accessibility Baseline |
|-----------|-------------------------------|
| **6-8** | Symbol-based navigation, audio support, no reading required, parent-assisted flows |
| **9-11** | Simple text, visual progress indicators, immediate feedback, low patience threshold |
| **12-14** | Growing sophistication, embarrassment awareness, emerging privacy needs |
| **15-17** | Near-adult capability, dignity paramount, minimal supervision visibility |

## 8.7 Emotional Accessibility

Language and interaction patterns that support emotional wellbeing:

- **No countdown timers** for parental responses (creates panic/anxiety)
- **"Not this time"** instead of "DENIED" (rejection-resilient language)
- **Child controls acknowledgment timing** - even when parent says no, child picks WHEN to acknowledge
- **Celebration intensity preference** - some children hate fanfare, let them choose
- **Autonomy framing:** "Showing you're ready" not "earning freedom"

## 8.8 Voice Input & AI-Facilitated Interactions

### Voice Input Design
- **Cloud processing permitted** (Gemini for facilitated agreement interviews)
- **Echo provider privacy policies** to users transparently
- **No audio storage by fledgely** after processing
- **Visual "voice active" indicator** whenever microphone is on
- **Transcription confirmation:** Always show "I heard you say [X]. Is that correct?" before saving

### Child Voice Considerations
- Test with child voice samples (models trained on adult voices may fail)
- Multi-dialect support for multilingual households
- Background noise handling (siblings, TV, household chaos)
- Confirmation of transcription before any agreement term is saved

## 8.9 Cross-Device Continuity

### Session Management
- **"Continue where you left off"** across devices
- **Draft state synced** across all logged-in devices
- **Device-bound sessions** with explicit handoff approval
- **Re-authentication required** for sensitive actions on new device
- **Session invalidation** when device removed from account

### Offline-First Architecture
- **Assume offline, delight when online** - core functions work offline
- **Viewing data, drafting requests, queuing approvals** all work offline
- **"All changes saved" confidence indicator** (not "Last synced")
- **Conflict resolution UI** as first-class citizen
- **Sync queue visibility** - show pending changes waiting for connectivity

### Device Trust Levels
- **Trusted devices:** Full functionality, biometric shortcuts
- **Recognized devices:** Standard functionality, PIN required for sensitive actions
- **New/untrusted devices:** Full re-authentication, sensitive actions blocked
- **Shared/public devices:** View-only mode available, no persistent sessions

## 8.10 Family System Design

### Multi-Child Accessibility
- **Per-child mode** in shared family views
- **Multi-child dashboard** respects each child's accessibility settings in their section
- **Sibling privacy** - one child's mode doesn't reveal another's settings
- **Parent efficiency** - manage 3 kids with 3 different accessibility needs from single dashboard

### Role-Adaptive Interface
- **Navigation labels change** based on user role (not device)
- **Child sees:** "My Family" / "My Space" / "My Requests"
- **Parent sees:** "Children" / "Dashboard" / "Pending Requests"
- **Screen reader consistency:** Landmark labels consistent, use aria-label for role context

## 8.11 Security & Privacy Integration

### Session Security
- **Re-authenticate sensitive actions** on new device
- **Undo window ownership** - only action initiator can undo
- **Family viewing mode** requires parent auth to toggle, has time limits, audit logged

### Voice Input Privacy
- **No audio recordings stored** by fledgely (ever)
- **Visual indicator** when voice is active
- **Provider privacy policies** echoed to users

### Notification Security
- **Random delay** (0-15 min) for non-urgent notifications (breaks timing correlation)
- **End-to-end encrypted** calm mode digests
- **Auto-delete digests** after confirmed receipt

### Accessibility Consent Trail
- **Log all accessibility setting changes** with timestamp
- **Child confirmation required** for changes to child's profile settings
- **Reversible by child** for their own settings
- **Prevents coercion:** Abusive parent can't secretly force settings

## 8.12 Gesture Safety

### Critical Action Protection
- **No swipe-to-approve** for permission changes
- **Swipe only for low-risk actions** (dismiss notification, mark as read)
- **Permissions require deliberate tap + confirm**
- **3-second undo window** for accidental dismissals (5 seconds in accessibility modes)
- **Double-tap required** for destructive actions

### Motor Accessibility
- **Always offer tap alternative** to swipe (for users with motor difficulties)
- **Pocket activation prevention** - motion detection to disable touch
- **Dead zone detection** - detect cracked/damaged screens, offer nav relocation
- **Gesture conflict avoidance** - safe zones that don't overlap with OS gestures

## 8.13 Crisis Accessibility

### Child-Specific Crisis Features
- **Age-appropriate crisis language** (a 10-year-old won't recognize "ideation")
- **Age-segmented crisis resources** (teen crisis line vs child crisis line)
- **Silent/text-based crisis trigger** - access help without speaking
- **Pattern detection** for proactive resource surfacing (don't wait for search)
- **Crisis sovereignty** - private resources, no logging, no parent notification

### Universal Crisis Access
- **Always in navigation** - crisis resources visible from every screen
- **WCAG AAA compliance** for all crisis-related features
- **Works offline** - essential crisis info cached locally
- **No authentication required** to access crisis resources

## 8.14 Testing Strategy

### Device Testing Matrix

| Platform | Specific Devices | Priority |
|----------|-----------------|----------|
| iOS | iPhone SE (small), iPhone 15 (standard), iPhone 15 Pro Max (large), iPad Mini, iPad Pro | Critical |
| Android | Pixel 7a (standard), Samsung S24 (flagship), Samsung A14 (budget), Samsung Fold 5 (foldable) | Critical |
| Fire TV | Fire TV Stick 4K, Fire TV Cube | High |
| Browsers | Chrome, Firefox, Safari, Edge (latest 2 versions each) | Critical |

### Accessibility Testing

| Test Type | Tools/Methods |
|-----------|---------------|
| Screen readers | VoiceOver (iOS/Mac), TalkBack (Android), NVDA (Windows) |
| Keyboard navigation | Full flow completion without mouse |
| Color blindness | Sim Daltonism, Color Oracle |
| Motor impairment | Tremor simulation, switch access testing |
| Cognitive testing | User testing with neurodivergent participants |

### Performance Budgets

| Platform | First Contentful Paint Target |
|----------|------------------------------|
| Mobile (3G) | < 1.5 seconds |
| Tablet (4G) | < 1.2 seconds |
| Desktop (broadband) | < 1.0 seconds |
| Fire TV | < 2.0 seconds |
| Accessibility mode overhead | max +200ms |

### Specific Test Scenarios
- 400% zoom on all breakpoints
- Device rotation during every form (state preservation)
- All entry points (deep links, notifications, widget) verify nav state
- Calm mode with simulated urgent alert (must break through)
- External display detection with sensitive data visible (must auto-blur)
- Child voices in noisy environments for speech recognition
- Motor-impaired gesture testing (tremor simulation)
- 48-hour calm mode to test "stuck" scenario

## 8.15 Implementation Guidelines

### CSS Architecture
- **Mobile-first media queries** (min-width)
- **Relative units** (rem, %, vw, vh) over fixed pixels
- **CSS custom properties** for theme switching
- **Safe-area-inset** for notches and cutouts
- **prefers-reduced-motion** and **prefers-contrast** media query support

### Design Token Architecture
- **Color tokens** that adapt per mode (Comfort, High Contrast, Dyslexia cream)
- **Spacing tokens** that scale (Tremor needs larger, ADHD needs tighter focus)
- **Typography tokens** for all font modes
- **Animation tokens** (reduced motion, no motion, extended duration)
- **Single source of truth** prevents mode conflicts

### HTML Patterns
- **Semantic structure** (header, nav, main, footer)
- **ARIA labels and roles** where semantic HTML insufficient
- **Skip links** for keyboard navigation
- **Focus management** for modals and dynamic content
- **Consistent landmark labels** across role-adaptive views

### Platform Requirements
- **iOS:** Safe area insets, dynamic type support, VoiceOver optimization
- **Android:** Material accessibility guidelines, TalkBack optimization
- **Fire TV:** D-pad navigation, voice control integration, focus indicators
- **Web:** Progressive enhancement, keyboard navigation, screen reader testing

---
