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
    // NOTE: "production" field can contain EITHER a company name OR a person's name
    // Frontend should use generic label "PROD" instead of "PROD CO"
    production: z.string().optional(),
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
