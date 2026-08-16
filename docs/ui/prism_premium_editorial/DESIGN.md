---
name: Prism Premium Editorial
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#006a6a'
  on-secondary: '#ffffff'
  secondary-container: '#90efef'
  on-secondary-container: '#006e6e'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#93f2f2'
  secondary-fixed-dim: '#76d6d5'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#004f4f'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  deep-charcoal: '#121212'
  soft-white: '#F9F9F9'
  silver-grey: '#E0E0E0'
  transparency-teal: '#008080'
typography:
  headline-display:
    fontFamily: ebGaramond
    fontSize: 64px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: ebGaramond
    fontSize: 40px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: ebGaramond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-md:
    fontFamily: ebGaramond
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: hankenGrotesk
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: hankenGrotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: hankenGrotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: hankenGrotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
spacing:
  margin-page: 4rem
  margin-mobile: 1.5rem
  gutter: 2rem
  section-gap: 8rem
  element-gap: 1rem
---

## Brand & Style

The design system is anchored in the concept of **Premium Editorial Transparency**. It avoids the cluttered, data-heavy "dashboard" aesthetic of competitors in favor of a sophisticated, high-end reading experience. The brand personality is authoritative yet transparent—it doesn't just provide a verdict; it shows the intellectual labor behind it.

The visual style is a blend of **Minimalism** and **Modern Editorial**. It prioritizes generous whitespace, precision hairline dividers (0.5pt to 1pt), and a subtle grain texture to evoke the feel of high-quality physical newsprint. Motion is used purposefully to visualize the "multi-agent debate," transforming static data into a living dialogue. The interface must feel expensive, calm, and intellectually honest.

**Key Principles:**
- **Show the Work:** Avoid "dead" badges; all scores are interactive and expandable.
- **Intellectual Depth:** Use serif typography for headlines to signal traditional journalistic authority.
- **Focus over Density:** Display one clear verdict or debate at a time rather than a sea of metrics.

## Colors

The palette is strictly near-monochrome to maintain a serious, unbiased, and premium tone. 

- **Primary (Deep Charcoal):** Used for all text, iconography, and primary branding elements.
- **Neutral (Soft White):** The primary background color. It is slightly off-white to reduce eye strain and feel more like high-grade paper.
- **Tertiary (Silver-Grey):** Used exclusively for hairline dividers, inactive states, and subtle UI borders.
- **Secondary/Accent (Teal):** This is a functional accent used sparingly. It signifies "transparency" and "action"—it should be reserved for the filling of animated gauges, active nodes in the debate visualization, and primary call-to-action highlights.

The color mode is locked to **Light** to reinforce the editorial, "published" feel of the platform.

## Typography

This design system employs a classic "Serif for Story, Sans for System" hierarchy.

- **Headlines (EB Garamond):** Used for titles, article headers, and large quotes. It provides the "expensive" editorial feel and signals authority. High-contrast and elegant.
- **Body & UI (Hanken Grotesk):** A clean, modern sans-serif chosen for its legibility and professional precision. Used for all reading text, interface labels, and interactive components.

**Hierarchy Rules:**
- Use `headline-display` for hero sections and major landing page statements.
- `label-md` is always uppercase with slight tracking to differentiate UI controls from content.
- Ensure `body-lg` is used for the primary "Transparency Feed" to maintain a calm, readable pacing.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** on desktop and a **Fluid Grid** on mobile, emphasizing "The Reading Experience." 

- **Desktop:** A 12-column grid with a maximum content width of 1280px. Margins are generous (4rem) to prevent the UI from feeling cramped.
- **Section Gaps:** Large vertical gaps (8rem) are used between major content sections to allow the user to focus on one idea at a time.
- **The Feed:** The primary transparency feed should be centered with wide "safe-area" gutters, avoiding sidebars wherever possible to minimize distraction.
- **Mobile:** Transitions to a 4-column fluid grid with 1.5rem margins. Serif headlines should scale down to `headline-lg-mobile` to maintain balance.

## Elevation & Depth

This design system rejects traditional shadows and "card" containers in favor of **Tonal Layers** and **Hairline Dividers**.

- **Surface Tiers:** Depth is created by placing elements on top of the #F9F9F9 base. If a container is needed, use a slightly darker tint or a 1px border in Silver-Grey (#E0E0E0).
- **Subtle Texture:** A faint, almost imperceptible grain noise is applied to the background to give the digital surface a tactile, physical quality.
- **Zero-Shadow Policy:** Do not use ambient shadows for cards or buttons. Instead, use thin, precise outlines or subtle shifts in background value to denote hierarchy.
- **Motion as Depth:** In the "Multi-Agent Debate" section, depth is implied through the pulsing of connector lines and the movement of nodes, rather than Z-axis stacking.

## Shapes

The shape language is **Sharp (0px)**. 

To maintain the "premium editorial" and "high-precision" aesthetic, all UI elements—including buttons, input fields, and image containers—should have square corners. This architectural approach distinguishes the design from "friendly" consumer apps and aligns it with professional journals and data visualization tools. 

The only exception to this rule is functional circular elements, such as score gauges or agent nodes, which are inherently geometric.

## Components

### Buttons
Primary buttons are solid Deep Charcoal (#121212) with Soft White text, sharp corners, and no shadow. Secondary buttons are Silver-Grey outlines with an arrow icon. Interaction should be immediate, with a slight background color shift on hover.

### Gauges & Scores
Never use a static badge. Scores must be animated radial gauges or multi-axis indicators using Teal (#008080) for the fill. They must be interactive: clicking a gauge expands a "Reasoning Panel."

### Transparency Feed
The feed is the heart of the system. Items are separated by a 1px Silver-Grey horizontal hairline. Each item features a serif headline, a short summary in Hanken Grotesk, and a small, functional Teal indicator for the transparency score.

### Multi-Agent Debate Nodes
Central to the UI. These are circular nodes representing different analyst "voices." They are connected by hairline pulses. On hover, a node should reveal its specific bias/framing perspective.

### Input Fields
Minimalist underlines (1px Silver-Grey) that turn Deep Charcoal when active. Labels are small, uppercase, and placed above the field.

### Dividers
Use 0.5pt to 1pt Silver-Grey lines. These are the primary structural elements used to group content, replacing the need for cards or boxes.