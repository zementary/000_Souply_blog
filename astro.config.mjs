import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://souply.vercel.app',
  integrations: [mdx(), tailwind({
    applyBaseStyles: false,
  }), react(), sitemap()],
  devToolbar: {
    enabled: false,
  },
});