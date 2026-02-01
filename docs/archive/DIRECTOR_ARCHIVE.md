# 🎬 Director Archive System

## Overview

Every director in the SOUPLY archive now has their own **internal portfolio page** showcasing all their work.

## Features

### 1. Automatic Page Generation
- **17 unique director pages** were generated from existing videos
- Each page shows all videos by that director
- Sorted by date (newest first)

### 2. Internal Linking
- Director names in video Credits section are now **clickable**
- Links to `/directors/{director-slug}`
- Example: `Aidan Zamiri` → `/directors/aidan-zamiri`

### 3. URL Slugification
- Director names are converted to URL-safe slugs
- Examples:
  - `Aube Perrie` → `aube-perrie`
  - `Dave Free & Kendrick Lamar` → `dave-free-kendrick-lamar`
  - `Vania Heymann & Gal Muggia` → `vania-heymann-gal-muggia`

---

## File Structure

```
src/
├── pages/
│   └── directors/
│       └── [...slug].astro        # Dynamic director pages
├── utils/
│   └── slugify.ts                 # URL slugification utility
```

---

## How It Works

### Step 1: Data Collection
```typescript
// Extract unique directors from all videos
const directorMap = new Map<string, Video[]>();
for (const video of allVideos) {
  if (video.data.director) {
    directorMap.set(director, [...videos]);
  }
}
```

### Step 2: Page Generation
```typescript
// Generate static paths for each director
return Array.from(directorMap.entries()).map(([name, videos]) => ({
  params: { slug: slugify(name) },
  props: { directorName: name, videos }
}));
```

### Step 3: Linking
```astro
<!-- Video detail page -->
<a href={`/directors/${slugify(directorName)}`}>
  {directorName}
</a>
```

---

## Director Page Design

### Header
```
[Director Name]
[ DIRECTOR ARCHIVE // X VIDEOS ]
```

### Grid Layout
- Reuses `VideoCard` component
- Same grid system as homepage
- 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)

### Example: Aube Perrie
```
Aube Perrie
[ DIRECTOR ARCHIVE // 3 VIDEOS ]

┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Starburster│ │   LOST!     │ │ Angel of    │
│ Fontaines   │ │     RM      │ │ My Dreams   │
│    D.C.     │ │             │ │    Jade     │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## Visual Design

### Typography (Brutalist Minimal)
```css
/* Director Name */
text-4xl font-bold tracking-tight text-zinc-900

/* Metadata Label */
text-sm tracking-wider text-zinc-500 uppercase
```

### Link Styling
```css
/* Hover state */
hover:text-primary-orange
underline decoration-zinc-300
hover:decoration-primary-orange
```

---

## Generated Director Pages (17 Total)

| Director | Slug | Videos |
|----------|------|--------|
| Aidan Zamiri | `aidan-zamiri` | 1 |
| Aube Perrie | `aube-perrie` | 3 |
| Dave Free & Kendrick Lamar | `dave-free-kendrick-lamar` | 1 |
| François Rousselet | `franois-rousselet` | 1 |
| Henry Scholfield | `henry-scholfield-hscholfield` | 1 |
| Hugh Mulhern | `hugh-mulhern` | 1 |
| Jenn Nkiru | `jenn-nkiru` | 1 |
| Léa Ceheivi | `la-ceheivi` | 1 |
| Maegan Houang | `maegan-houang-producer-...` | 1 |
| Pensacola | `pensacola` | 1 |
| Rich Hall | `rich-hall` | 1 |
| San Yawn | `san-yawn` | 1 |
| Tajana Tokyo | `tajana-tokyo` | 1 |
| Vania Heymann & Gal Muggia | `vania-heymann-gal-muggia` | 1 |
| Victor Haegelin | `victor-haegelin` | 2 |
| André Muir | `andre-muir` | 1 |

---

## Benefits

### 1. Discovery
- Users can explore all works by a director
- Acts as an internal "filmography"

### 2. Navigation
- Natural way to discover related videos
- Complements Smart Shuffle algorithm

### 3. SEO
- Each director page is indexable
- Director names become entry points

### 4. Professionalism
- Shows respect for directors' body of work
- Creates a curated "who's who" reference

---

## Future Enhancements

### Potential Additions (Not Implemented Yet)
- [ ] Director bio/description
- [ ] External portfolio link (if available)
- [ ] Sort options (by date, by video title)
- [ ] Statistics (total videos, years active)
- [ ] Director photo/avatar
- [ ] Collaboration network (worked with X artists)

---

## Technical Notes

### Performance
- All pages are **statically generated** at build time
- No runtime database queries
- Instant page loads

### Scalability
- System handles any number of directors
- Automatically updates when new videos are added
- No manual director page creation needed

### Maintenance
- Zero maintenance required
- Pages regenerate on each build
- Always in sync with video data

---

## Example Usage

### User Journey
1. User watches "360" by Charli xcx
2. Sees "Aidan Zamiri" in credits
3. Clicks director name
4. Lands on `/directors/aidan-zamiri`
5. Discovers all videos directed by Aidan Zamiri

### Code Example
```astro
<!-- Credits section in video detail page -->
{key === 'Director' ? (
  <a href={`/directors/${slugify(value)}`}>
    {value}
  </a>
) : (
  <span>{value}</span>
)}
```

---

**Status**: ✅ Fully Implemented  
**Pages Generated**: 42 total (24 videos + 17 directors + 1 homepage)  
**Build Time**: 2.60s
