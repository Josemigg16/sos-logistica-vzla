# Portuguesa Unida — Design Context

## Brand Identity

**Name:** Portuguesa Unida  
**Mission:** Humanitarian logistics coordination for disaster response in Portuguesa state, Venezuela.  
**Tone:** Trustworthy, urgent, community-driven. Institutional strength without coldness.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-primary` | `#2B5F8E` | Main brand blue — backgrounds, CTAs, headers |
| `brand-dark` | `#1E4A6E` | Deep navy — dark mode backgrounds, text on light |
| `brand-medium` | `#2D6A9F` | Mid blue — hover states, accents |
| `brand-light` | `#4A89C0` | Light blue — secondary accents, progress bars |
| `brand-pale` | `#C8DCF0` | Very light blue — subtle tints, tag backgrounds |
| `neutral-bg` | `#D3D3D3` | Light grey — used as background in brand materials |
| `neutral-off-white` | `#CECECE` | Off-white text — used over dark blue backgrounds |
| `white` | `#FFFFFF` | Pure white — text over brand-primary or brand-dark |

### Dark mode surface scale (derived from brand-dark)
| Token | Hex | Usage |
|-------|-----|-------|
| `surface-900` | `#0F2337` | Deepest background |
| `surface-800` | `#152D46` | Page background |
| `surface-700` | `#1E4166` | Card background |
| `surface-600` | `#265280` | Elevated surface |
| `surface-500` | `#2B5F8E` | Brand primary (same) |

---

## Typography

**Display / Headlines:** `Barlow Condensed` — Bold (700) or ExtraBold (800), Italic  
→ Captures the condensed, athletic, italic energy of the logo wordmark  
→ Use for page titles, section headers, large numbers  

**Body / UI:** `DM Sans` — Regular (400), Medium (500), SemiBold (600)  
→ Clean, humanist, highly legible at small sizes  
→ Use for all body text, labels, descriptions  

**Monospace / Numbers:** `DM Mono` — for tabular data, quantities, percentages

Google Fonts import:
```
Barlow+Condensed:ital,wght@1,700;1,800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500
```

---

## Design Language

**Style:** Institutional-bold with humanitarian warmth  
- Dark blue backgrounds (#0F2337 → #1E4A6E range) as the primary surface  
- Brand blue (#2B5F8E) as structural accent and interactive elements  
- White text as primary foreground over dark surfaces  
- Light blue (#4A89C0) for progress, active states, highlights  
- Avoid red/orange for urgency — use **white + brand-light contrast** instead  
- Critical items: white text on `brand-primary` background, strong typography weight  

**Urgency without alarm:** This is a community solidarity project, not an emergency broadcast.  
Urgency is expressed through **typographic weight and contrast**, not alarm colors.  
A CRITICA need card uses bold typography and a bright white accent stripe — not red.

**Shapes:** Slightly rounded (8-12px radius). Not pill-shaped. Structural, not soft.  
**Shadows:** Deep, blue-tinted: `0 4px 24px rgba(15, 35, 55, 0.6)`  
**Borders:** Subtle blue-tinted: `rgba(43, 95, 142, 0.3)` on dark surfaces  

---

## Logo Usage

| Asset | Use when |
|-------|----------|
| `white-isotipo-blue-background.webp` | Icon in app header on dark/blue backgrounds |
| `blue-isotipo.webp` | Icon on white/light backgrounds |
| `white-logotipo-blue-background.webp` | Full brand bar on dark backgrounds |
| `blue-logotipo-white-background.webp` | Full brand bar on light backgrounds |
| `white-isologo.webp` | Combined mark + text on dark backgrounds |
| `blue-isologo-white-background.webp` | Combined mark + text on light backgrounds |

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use `#2B5F8E` as the dominant structural color | Use red/orange for urgency signals |
| Use Barlow Condensed Italic Bold for display text | Use Inter, Roboto, or system-ui for headings |
| Dark navy (#0F2337–#1E4A6E) for dark mode surfaces | Mix warm tones (amber, emerald) into the palette |
| Express urgency through weight + white contrast | Over-saturate or use neon variants of blue |
| Keep the isotipo visible in the header | Recolor or modify brand assets |
