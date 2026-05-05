import { defineCollection, z } from 'astro:content';

const videosCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    artist: z.string().optional(),
    video_url: z.string(),
    publishDate: z.date().optional(),
    curator_note: z.string().optional(),
    // Credits - all optional (Full Cast Support)
    director: z.string().optional(),
    // production: V8.2 (2026-05-06) — strict company name only (no person names).
    // V7.0 historical entries may still contain producer person names; new ingest
    // enforces company-only via parser.js + Layer 2 inbox override.
    production: z.string().optional(),
    // key_crew: V8.2 — flat string "Name (Role)" for the single most prominent
    // technical/creative collaborator. Replaces fragmented dop/vfx/editor/colorist
    // /art_director/sound_design typed fields for NEW ingest. Existing typed fields
    // kept optional for back-compat with 528 historical mdx.
    // Examples: "Marcell Rév (Cinematographer)" · "Time Based Arts (VFX)" ·
    //           "Benjamin Millepied (Choreographer)".
    key_crew: z.string().optional(),
    dop: z.string().optional(),
    editor: z.string().optional(),
    colorist: z.string().optional(),
    art_director: z.string().optional(),
    vfx: z.string().optional(),
    sound_design: z.string().optional(),
    label: z.string().optional(),
    // Phase 2: Logic additions
    tags: z.array(z.string()).optional(),
    director_link: z.string().url().optional(),
    cover: z.string().optional(), // Supports both remote URLs and local paths
  }),
});

export const collections = {
  videos: videosCollection,
};
