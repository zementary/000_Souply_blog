# PHASE 1 HANDOFF: PROJECT SOUPLY

## Project Context

**Souply** is a curated music video archive designed for industry professionals. The aesthetic combines:
- **Embroidery craft identity**: Logo features orange stitching on blue outline
- **Gallery minimalism**: White background, high contrast typography
- **Brutalist utility**: Geometric shapes, zero decoration, raw industrial feel
- **"Democratic Grid"**: Every video treated with equal visual importance

---

## Tech Stack

```json
{
  "framework": "Astro 5.x",
  "styling": "Tailwind CSS",
  "ui-components": "React 19.x (Lucide icons only)",
  "content": "Astro Content Collections + MDX",
  "video-player": "lite-youtube-embed",
  "fonts": "Inter (sans-serif)",
  "validation": "Zod schemas",
  "utils": "tailwind-merge, clsx"
}
```

**Key Config:**
- `astro.config.mjs`: DevToolbar disabled
- `tailwind.config.mjs`: Custom orange/blue palette
- `tsconfig.json`: Strict mode, path aliases (@/*, @components/*)

---

## Visual Rules (CRITICAL - DO NOT BREAK)

### Typography
```css
/* ONLY Inter - NO serif, NO mono */
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

**Hierarchy:**
- Titles: `text-2xl font-bold tracking-tight text-zinc-900`
- Body: `text-base leading-relaxed text-zinc-600`
- Metadata: `text-sm text-zinc-500`
- Credits: `text-xs uppercase tracking-wider text-zinc-400`

### Color Palette
```javascript
primary: {
  orange: '#F97316',  // Brand accent (hover states)
  blue: '#1E3A8A',    // Logo outline
}
zinc: {
  900: '#18181B',     // Headings
  600: '#52525B',     // Body text
  500: '#71717A',     // Metadata
  400: '#A1A1AA',     // Inactive UI
  200: '#E4E4E7',     // Borders
}
```

### Layout Architecture

#### Header (Top Fixed)
```astro
<Header />
  - Logo: src/assets/logo.png
  - Size: h-16 (64px)
  - Position: fixed top-0 z-50
  - NO navigation (moved to bottom)
```

#### Floating Deck (Bottom Fixed)
```astro
<NavControls />
  - Position: fixed bottom-8 left-1/2 -translate-x-1/2
  - Style: bg-white border rounded-full shadow-xl
  - Icons: 28x28px geometric SVGs
  - Modes:
    * Home: [⚄ Shuffle]
    * Detail: [◀ Prev] [⚄ Shuffle] [▶ Next]
  - Hover: scale(1.1) + text-primary-orange
```

#### Homepage Grid
```css
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
gap-8 lg:gap-12
```
- Uniform 16:9 thumbnails
- No hover animations on images
- Metadata label: `[ ARCHIVE v1.0 // DEMOCRATIC GRID SYSTEM ]`

#### Detail Page ("Cinema Mode")
```astro
<article class="max-w-3xl mx-auto">
  <lite-youtube />
  <h1>Title</h1>
  <p>Artist • Year</p>
  <p>Curator Note</p>
  <div>Credits Grid</div>
</article>
```

**Spacing:**
- Video → Title: `mb-6`
- Title → Note: `mb-8`
- Note → Credits: `mt-8`

**NO decorations:**
- No borders, no dashed lines
- No background boxes
- No italic/serif fonts

#### Credits Display
```css
grid-cols-[180px_1fr] gap-y-3 gap-x-6
```

**Industry Abbreviations:**
```typescript
'Production Company' → 'Prod Co'
'Editor' → 'Edit'
'Colorist' → 'Color'
'Sound Design' → 'Sound'
```

**Format:**
- Labels: Right-aligned, uppercase, text-zinc-400
- Values: Left-aligned, text-zinc-900, font-medium

---

## Schema Status (src/content/config.ts)

### Current Structure

```typescript
const videosCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Required
    title: z.string(),
    video_url: z.string(),  // Full YouTube URL
    
    // Optional Metadata
    artist: z.string().optional(),
    publishDate: z.date().optional(),  // ISO format: 2024-01-15
    curator_note: z.string().optional(),
    
    // Optional Credits
    director: z.string().optional(),
    production_company: z.string().optional(),
    editor: z.string().optional(),
    dop: z.string().optional(),
    colorist: z.string().optional(),
    vfx: z.string().optional(),
    sound_design: z.string().optional(),
    label: z.string().optional(),
  }),
});
```

### Sample Data Format

```yaml
---
title: "Cellophane"
artist: "FKA twigs"
video_url: "https://www.youtube.com/watch?v=YkLjqFpBh84"
publishDate: 2019-04-24
curator_note: "Andrew Thomas Huang orchestrates..."
director: "Andrew Thomas Huang"
production_company: "Prettybird"
dop: "Pak Lok Liu"
editor: "Elise Butt"
colorist: "Sofía Chalkho"
vfx: "Mathematic"
sound_design: "Nicolas Becker"
label: "Young Turks"
---
```

### Current Video Library (7 entries)

1. `sample-video.mdx` - Billie Eilish "Bad Guy"
2. `kendrick-lamar-humble.mdx` - Kendrick Lamar "HUMBLE."
3. `malamente.md` - Massive Attack "Teardrop"
4. `massive-attack-teardrop.mdx` - Massive Attack "Teardrop" (DUPLICATE)
5. `radiohead-daydreaming.mdx` - Radiohead "Daydreaming"
6. `fka-twigs-cellophane.mdx` - FKA twigs "Cellophane"
7. `childish-gambino-this-is-america.mdx` - Childish Gambino "This Is America"

---

## Component Architecture

### File Structure

```
src/
├── assets/
│   └── logo.png              # Embroidered logo (transparent PNG)
├── components/
│   ├── Header.astro          # Logo only
│   ├── NavControls.astro     # Floating bottom deck
│   └── VideoCard.astro       # Grid item (static)
├── content/
│   ├── config.ts             # Zod schema
│   └── videos/               # 7 MDX files
├── layouts/
│   └── BaseLayout.astro      # Global wrapper + NavControls
├── pages/
│   ├── index.astro           # Homepage grid
│   └── videos/[...slug].astro # Detail page
├── styles/
│   └── global.css            # Tailwind + lite-youtube
└── utils/
    ├── cn.ts                 # tailwind-merge helper
    └── video.ts              # YouTube ID extractor
```

### Key Component Logic

#### NavControls.astro
- **Props**: `currentSlug`, `prevUrl`, `nextUrl`, `allSlugs`
- **Shuffle**: Picks random from `allSlugs` (excludes current)
- **Navigation**: Looping (first ↔ last)

#### [...slug].astro
```typescript
getStaticPaths() {
  // Sort by publishDate (desc)
  // Calculate prev/next with looping
  // Return { video, prevUrl, nextUrl, allSlugs }
}
```

---

## Navigation System

### Shuffle Logic (Client-Side)
```javascript
const allSlugs = JSON.parse(nav.getAttribute('data-all-slugs'));
const availableSlugs = currentSlug 
  ? allSlugs.filter(s => s !== currentSlug) 
  : allSlugs;
const randomSlug = availableSlugs[
  Math.floor(Math.random() * availableSlugs.length)
];
window.location.href = `/videos/${randomSlug}`;
```

### Prev/Next Logic (Static)
```typescript
const prevIndex = index === 0 ? videos.length - 1 : index - 1;
const nextIndex = index === videos.length - 1 ? 0 : index + 1;
```

---

## Design Constraints Checklist

### ❌ NEVER Do:
- [ ] Use `font-mono` or `font-serif`
- [ ] Add hover animations to thumbnails
- [ ] Use dashed borders or decorative lines
- [ ] Display "Additional Notes" section
- [ ] Create rounded corners on video player
- [ ] Use text labels "PREV/NEXT" (use SVG icons)
- [ ] Move navigation from bottom-center position

### ✅ ALWAYS Do:
- [x] Use `max-w-3xl mx-auto` for detail pages
- [x] Use `currentColor` in SVG paths
- [x] Use industry abbreviations for credits
- [x] Keep shuffle button in center slot
- [x] Use `lite-youtube-embed` for videos
- [x] Validate against Zod schema
- [x] Test build before committing

---

## Known Issues

1. **Duplicate Entry**: `malamente.md` and `massive-attack-teardrop.mdx` are both Massive Attack "Teardrop"
2. **Missing Pages**: No 404 page designed
3. **No Search**: No filter/search functionality yet
4. **Footer**: Generic copyright text (could add curator bio)

---

## Next Steps: PHASE 2

### 2.1 Mood Tags System
**Goal**: Add genre/mood categorization

**Schema Addition:**
```typescript
tags: z.array(z.enum([
  'experimental', 'narrative', 'performance',
  'animation', 'abstract', 'documentary',
  'conceptual', 'dance', 'vfx-heavy', 'one-shot'
])).optional()
```

**UI Implementation:**
- Pill badges below artist name
- Style: `text-xs px-2 py-1 bg-zinc-100 rounded-full`
- Clickable → Filter grid by tag

**Tasks:**
- [ ] Update schema in `config.ts`
- [ ] Add tags to all 7 existing videos
- [ ] Display tags on VideoCard
- [ ] Display tags on detail page
- [ ] Implement tag filter on homepage

### 2.2 Smart Shuffle
**Goal**: Enhance shuffle algorithm

**Features:**
- Weight recent videos lower (avoid repetition)
- Filter by mood tags (match current video's mood)
- Fallback to pure random if no matches
- Keyboard shortcuts (R=Random, Arrow keys=Prev/Next)

**Implementation:**
- [ ] Update NavControls shuffle logic
- [ ] Add tag-based matching algorithm
- [ ] Store last 5 viewed videos (localStorage)
- [ ] Add keyboard event listeners

### 2.3 Auto-Ingest Workflow
**Goal**: Streamline video entry via `.cursorrules`

**Workflow:**
```bash
# User provides: YouTube URL + Basic info
# AI generates: Properly formatted .mdx file
# AI validates: Against Zod schema
# AI suggests: Tags based on curator_note
# AI commits: To content/videos/
```

**Tasks:**
- [ ] Create `.cursorrules` template
- [ ] Add YouTube metadata fetcher
- [ ] Implement AI tag suggestion prompt
- [ ] Add validation check script

### 2.4 Director Links
**Schema Addition:**
```typescript
director_link: z.string().url().optional()
```

**UI:**
- Clickable director name in credits
- External link icon (Lucide `ExternalLink`)
- Opens in new tab

---

## Testing Checklist

### Build Validation
- [ ] `npm run build` succeeds
- [ ] No Zod validation errors
- [ ] All YouTube thumbnails load
- [ ] No console errors

### Navigation Testing
- [ ] Shuffle works on home + detail
- [ ] Prev/Next loop correctly
- [ ] Floating Deck doesn't overlap content
- [ ] Logo links to homepage

### Responsive Testing
- [ ] Grid adapts (1/2/3 columns)
- [ ] Floating Deck stays centered
- [ ] Detail page readable on mobile
- [ ] Credits grid doesn't break

### Visual Regression
- [ ] Logo size correct (h-16)
- [ ] Only Inter font used
- [ ] Credits use abbreviations
- [ ] No decorative borders

---

## Quick Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview

# Git commit
git add .
git commit -m "Phase 2: [feature description]"
```

---

## Contact Points for Design Decisions

| Aspect | Rule |
|--------|------|
| Typography | Always Inter, no exceptions |
| Navigation | Always bottom-center floating deck |
| Credits | Always abbreviated (Edit, DoP, Color) |
| Curator Notes | Always plain text (no italics, no borders) |
| Grid | Always uniform 16:9 aspect ratios |
| Hover | Always orange (#F97316) for interactive states |
| Spacing | Always generous (gap-8, mb-8, mt-8) |

---

**Last Updated**: 2026-01-16  
**Session Status**: Phase 1 Complete, Phase 2 Schema Updated  
**Git Commit**: `190fb29` - "Finish Phase 1: UI Polish and Floating Deck"  
**Next Agent Task**: Implement Mood Tags UI + Smart Shuffle Logic
