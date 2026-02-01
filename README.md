# SOUPLY

A disciplined, minimalist Music Video archive built with Swiss International Style principles.

## Design Philosophy

**"Democratic Grid"** - Every video is treated with equal importance. No hierarchy. No noise.

### Key Principles

- **Strict Grid Layout:** Uniform aspect ratios, consistent spacing
- **High Contrast:** Pure black background (#000000), white text (#FFFFFF)
- **Minimalist Typography:** Clean sans-serif (Inter) for all content
- **Generous Whitespace:** Breathing room between elements
- **Professional Focus:** Built for industry professionals who value clarity

## Tech Stack

- **Framework:** Astro 5.x
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Video Player:** lite-youtube-embed
- **Type Safety:** TypeScript (strict mode) + Zod schemas

## Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Header.astro
│   │   └── VideoCard.astro
│   ├── content/         # Content collections
│   │   ├── config.ts    # Schema definitions
│   │   └── videos/      # Video entries (MDX)
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── videos/[...slug].astro
│   ├── styles/
│   │   └── global.css
│   └── utils/
│       ├── cn.ts        # Class name utilities
│       └── video.ts     # Video URL helpers
├── astro.config.mjs
├── tailwind.config.mjs
└── tsconfig.json
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Adding Videos

Create a new `.mdx` file in `src/content/videos/`:

```mdx
---
title: "Video Title"
artist: "Artist Name"
video_url: "https://www.youtube.com/watch?v=VIDEO_ID"
publishDate: 2024-01-15
curator_note: "Your professional observation about the video."
director: "Director Name"
production_company: "Company Name"
editor: "Editor Name"
dop: "DoP Name"
colorist: "Colorist Name"
vfx: "VFX Artist"
sound_design: "Sound Designer"
label: "Record Label"
---

Optional additional content in Markdown.
```

## Design System

### Colors

- Background: `#000000` (Pure Black)
- Text: `#FFFFFF` (White)
- Secondary Text: `#A1A1AA` (Zinc-400)

### Typography

- **UI Text:** Inter (Sans-serif)
- **Metadata:** Monospace
- **Hierarchy:** Size and weight only, no color variation for hierarchy

### Spacing

- Grid Gap: `2rem` (md), `3rem` (lg)
- Section Padding: `2rem` (mobile), `3rem` (desktop)
- Generous whitespace between content blocks

### Components

- **VideoCard:** 16:9 aspect ratio, hover scale effect
- **Credits:** Single-column list, monospace font
- **Header:** Fixed top, minimal logo + shuffle button

## Content Schema

All fields are optional except `title` and `video_url`:

- `title` (required): Video title
- `artist`: Artist name
- `video_url` (required): YouTube/Vimeo URL
- `publishDate`: Release date
- `curator_note`: Professional observation
- Credits: `director`, `production_company`, `editor`, `dop`, `colorist`, `vfx`, `sound_design`, `label`

## Performance

- Uses `lite-youtube-embed` for fast video loading
- Images loaded lazily with native loading attribute
- Minimal JavaScript bundle
- Optimized Tailwind CSS output

## License

Private project. All rights reserved.
