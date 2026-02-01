#!/usr/bin/env node

/**
 * Visual Hook to Tags Mapping
 * 
 * This file maps Visual_Hook descriptions from CSV to reusable taxonomy tags
 */

export const visualHookMapping = {
  // Pattern matching for common visual hooks
  patterns: [
    {
      keywords: ['choreography', 'dance', 'dancing'],
      tags: ['dance-choreography']
    },
    {
      keywords: ['one-shot', 'one-take', 'single take'],
      tags: ['one-take']
    },
    {
      keywords: ['surreal', 'surrealism'],
      tags: ['surreal']
    },
    {
      keywords: ['black and white', 'monochrome', 'noir'],
      tags: ['black-and-white']
    },
    {
      keywords: ['animation', 'animated'],
      tags: ['animation']
    },
    {
      keywords: ['stop-motion'],
      tags: ['stop-motion']
    },
    {
      keywords: ['vfx', 'cgi', 'visual effects'],
      tags: ['vfx-heavy']
    },
    {
      keywords: ['narrative', 'story'],
      tags: ['narrative']
    },
    {
      keywords: ['abstract'],
      tags: ['abstract']
    },
    {
      keywords: ['performance'],
      tags: ['performance']
    },
    {
      keywords: ['dystopian', 'dystopia'],
      tags: ['dystopian']
    },
    {
      keywords: ['cyberpunk', 'cyber'],
      tags: ['cyberpunk']
    },
    {
      keywords: ['horror'],
      tags: ['horror']
    },
    {
      keywords: ['reverse', 'backwards'],
      tags: ['reverse-motion']
    },
    {
      keywords: ['time-lapse', 'timelapse'],
      tags: ['time-lapse']
    },
    {
      keywords: ['slow-motion', 'slow motion'],
      tags: ['slow-motion']
    },
    {
      keywords: ['mixed media', 'mixed-media'],
      tags: ['mixed-media']
    },
    {
      keywords: ['anime'],
      tags: ['anime-style']
    },
    {
      keywords: ['desert'],
      tags: ['desert']
    },
    {
      keywords: ['urban', 'city'],
      tags: ['urban']
    },
    {
      keywords: ['nature', 'natural'],
      tags: ['nature']
    },
    {
      keywords: ['office'],
      tags: ['office-setting']
    },
    {
      keywords: ['stunt', 'stunts', 'action'],
      tags: ['action-stunts']
    },
    {
      keywords: ['synchronized', 'sync'],
      tags: ['synchronized']
    },
    {
      keywords: ['crowd'],
      tags: ['crowd-scene']
    },
    {
      keywords: ['meta'],
      tags: ['meta']
    }
  ],
  
  // Exact mappings for specific visual hooks
  exact: {
    'Era-Defining Internet Panopticon': ['meta', 'crowd-scene', 'synchronized', 'social-commentary'],
    'Manic Spitting Montage': ['rapid-editing', 'performance', 'high-energy', 'urban'],
    'Surreal Office Maze': ['surreal', 'narrative', 'office-setting', 'dystopian'],
    'Robot Sextape Sci-Fi': ['sci-fi', 'vfx-heavy', 'surreal', 'provocative'],
    'Stone Skipping Physics': ['vfx-heavy', 'nature', 'abstract', 'slow-motion'],
    'Alpine Rap Stunt': ['action-stunts', 'nature', 'performance', 'extreme-sports'],
    'Deepfake Kid Courtroom': ['vfx-heavy', 'narrative', 'social-commentary', 'political'],
    'Pop Star Life Cycle': ['narrative', 'meta', 'performance'],
    'Noir Social Realism': ['black-and-white', 'narrative', 'social-commentary', 'cinematic'],
    'Melting Face Horror': ['vfx-heavy', 'horror', 'body-horror', 'surreal'],
    'Infinite Stop-Motion Loop': ['stop-motion', 'loop', 'animation', 'abstract'],
    'Polish Folk Surrealism': ['surreal', 'folk-art', 'cultural', 'narrative'],
    'Liquid Choreography': ['dance-choreography', 'vfx-heavy', 'synchronized', 'fluid'],
    'Ballroom Dance Narrative': ['dance-choreography', 'narrative', 'ballroom', 'cultural'],
    'Suburban Surrealism': ['surreal', 'suburban', 'social-commentary'],
    'Afro-Surrealist Tableau': ['surreal', 'cultural', 'tableaux-vivants', 'afrofuturism'],
    'Hyper-Pop Anime Mixed Media': ['mixed-media', 'anime-style', 'maximalist', 'colorful'],
    'One-Shot Desert Ride': ['one-take', 'desert', 'action', 'vehicle'],
    'Reverse Body Horror': ['reverse-motion', 'body-horror', 'horror', 'vfx-heavy'],
    'Cinematic Car Time-Lapse': ['time-lapse', 'vehicle', 'cinematic', 'narrative'],
    'Noir Monochrome Reveal': ['black-and-white', 'reveal', 'minimalist', 'artistic'],
    'West Coast Cultural Victory': ['cultural', 'political', 'social-commentary', 'celebration'],
    'Bangkok Cyberpunk Choreography': ['cyberpunk', 'dance-choreography', 'urban', 'neon-lights']
  }
};

/**
 * Convert Visual_Hook to taxonomy tags
 */
export function visualHookToTags(visualHook) {
  // Safety check: return fallback if visualHook is empty
  if (!visualHook) {
    console.warn(`⚠️  Empty Visual_Hook provided`);
    return ['uncategorized'];
  }
  
  // First check exact match
  if (visualHookMapping.exact[visualHook]) {
    return visualHookMapping.exact[visualHook];
  }
  
  // Then try pattern matching
  const tags = new Set();
  const lowerHook = visualHook.toLowerCase();
  
  for (const pattern of visualHookMapping.patterns) {
    for (const keyword of pattern.keywords) {
      if (lowerHook.includes(keyword.toLowerCase())) {
        pattern.tags.forEach(tag => tags.add(tag));
      }
    }
  }
  
  // If no tags found, return a generic set
  if (tags.size === 0) {
    console.warn(`⚠️  No tags found for Visual_Hook: "${visualHook}"`);
    return ['uncategorized'];
  }
  
  return Array.from(tags);
}

// Test
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n🧪 Testing Visual Hook to Tags Mapping\n');
  
  const testHooks = [
    'Era-Defining Internet Panopticon',
    'Manic Spitting Montage',
    'Surreal Office Maze',
    'Stone Skipping Physics',
    'Bangkok Cyberpunk Choreography'
  ];
  
  testHooks.forEach(hook => {
    const tags = visualHookToTags(hook);
    console.log(`${hook}`);
    console.log(`  → ${JSON.stringify(tags)}\n`);
  });
}
