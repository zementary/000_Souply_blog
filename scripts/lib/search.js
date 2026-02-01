/**
 * HYBRID SEARCH MODULE (V8.0 - "THE GATEKEEPER")
 * Supports YouTube (primary) + Vimeo (fallback) video search
 * Enhanced with strict quality filters and director injection
 */

import yts from 'yt-search';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// GATEKEEPER - Quality Filter Rules
// ============================================================================

/**
 * STRICT NEGATIVE KEYWORDS - Videos with these are likely NOT official music videos
 * Expanded to catch Audio Only, Lyrics, BTS, Making Of, Teasers, etc.
 */
const STRICT_NEGATIVE_KEYWORDS = [
  // Audio-only content
  'audio only',
  'official audio',
  'audio',
  
  // Lyrics/Visualizers
  'lyrics',
  'lyric video',
  'visualizer',
  'official visualizer',
  
  // Behind the scenes / Making of
  'behind the scenes',
  'bts',
  'making of',
  'making-of',
  'the making of',
  
  // Teasers / Trailers
  'teaser',
  'trailer',
  'preview',
  
  // Extended/Loop versions
  '1 hour',
  'one hour',
  'loop',
  'extended version',
  'extended',
  
  // Fan content
  'fan made',
  'fan video',
  'fan edit',
  'reupload',
  
  // Compilations / Playlists
  'compilation',
  'playlist',
  'full album',
  'best of',
];

/**
 * Duration thresholds (in seconds)
 */
const DURATION_MIN = 60;  // Skip shorts/teasers under 1 minute
const DURATION_MAX = 900; // Skip albums/compilations over 15 minutes

/**
 * HybridSearcher Class
 * Tries YouTube first, falls back to Vimeo if YouTube fails
 */
export class HybridSearcher {
  constructor(options = {}) {
    this.verbose = options.verbose !== false; // Default: true
    this.director = options.director || null; // Optional: inject director into search
    this.allowedKeywords = options.allowedKeywords || []; // Override negative filters
  }

  /**
   * Search for video on YouTube (V8.0 - "THE GATEKEEPER")
   * @param {string} query - Search query (will be enhanced with director if available)
   * @returns {Promise<object|null>} { url, platform: 'youtube', title } or null
   */
  async searchYouTube(query) {
    // ============================================================================
    // DIRECTOR INJECTION - Enhance search query if director provided
    // ============================================================================
    let enhancedQuery = query;
    if (this.director) {
      enhancedQuery = `${query} ${this.director}`;
      if (this.verbose) {
        console.log(`   🎬 [GATEKEEPER] Injecting director: "${this.director}"`);
      }
    }
    
    if (this.verbose) {
      console.log(`🔍 [YouTube] Searching: "${enhancedQuery}"`);
    }
    
    try {
      const results = await yts(enhancedQuery);
      
      if (!results || !results.videos || results.videos.length === 0) {
        if (this.verbose) {
          console.log(`   ✗ [YouTube] No results found`);
        }
        return null;
      }
      
      // Filter for videos only (not playlists, channels)
      let videos = results.videos.filter(v => v.type === 'video');
      
      if (videos.length === 0) {
        if (this.verbose) {
          console.log(`   ✗ [YouTube] No video results found`);
        }
        return null;
      }
      
      // ============================================================================
      // GATEKEEPER - STRICT QUALITY FILTERS
      // Avoid Audio Only, Lyrics, BTS, Fan Reposts, Teasers
      // ============================================================================
      
      // Filter out videos with STRICT_NEGATIVE_KEYWORDS
      // EXCEPTION: If user explicitly allows certain keywords (e.g., "Making Of")
      videos = videos.filter(video => {
        const titleLower = video.title.toLowerCase();
        
        // Check if any negative keyword is present
        const foundNegativeKeyword = STRICT_NEGATIVE_KEYWORDS.find(kw => titleLower.includes(kw));
        
        if (foundNegativeKeyword) {
          // Check if this keyword is explicitly allowed
          const isAllowed = this.allowedKeywords.some(allowed => 
            foundNegativeKeyword.includes(allowed.toLowerCase())
          );
          
          if (!isAllowed) {
            if (this.verbose) {
              console.log(`   🚫 [GATEKEEPER] Blocked: "${video.title}" (contains: "${foundNegativeKeyword}")`);
            }
            return false;
          } else {
            if (this.verbose) {
              console.log(`   ✅ [GATEKEEPER] Allowed: "${video.title}" (exception: "${foundNegativeKeyword}")`);
            }
          }
        }
        
        return true;
      });
      
      // ============================================================================
      // DURATION GUARD - Skip shorts and albums
      // ============================================================================
      videos = videos.filter(video => {
        const duration = video.duration?.seconds || video.seconds || 0;
        const titleLower = video.title.toLowerCase();
        
        // Exception: Allow "Director's Cut" or "Short Film" even if long
        const isException = titleLower.includes("director's cut") || 
                           titleLower.includes('directors cut') ||
                           titleLower.includes('short film');
        
        if (duration > 0) {
          if (duration < DURATION_MIN) {
            if (this.verbose) {
              console.log(`   ⏱️  [GATEKEEPER] Too short: "${video.title}" (${duration}s < ${DURATION_MIN}s)`);
            }
            return false;
          }
          
          if (duration > DURATION_MAX && !isException) {
            if (this.verbose) {
              console.log(`   ⏱️  [GATEKEEPER] Too long: "${video.title}" (${Math.round(duration/60)}min > ${DURATION_MAX/60}min)`);
            }
            return false;
          }
        }
        
        return true;
      });
      
      if (videos.length === 0) {
        if (this.verbose) {
          console.log(`   ✗ [YouTube] All results filtered out (quality filters)`);
        }
        return null;
      }
      
      // Return top result after filtering
      const topResult = videos[0];
      
      if (this.verbose) {
        console.log(`   ✓ [YouTube] Found: "${topResult.title}"`);
        console.log(`   ↗ URL: ${topResult.url}`);
        if (topResult.duration?.seconds) {
          console.log(`   ⏱️  Duration: ${Math.floor(topResult.duration.seconds / 60)}:${String(topResult.duration.seconds % 60).padStart(2, '0')}`);
        }
      }
      
      return {
        url: topResult.url,
        platform: 'youtube',
        title: topResult.title,
        author: topResult.author?.name || 'Unknown',
        duration: topResult.duration?.seconds || topResult.seconds || 0,
        thumbnail: topResult.thumbnail || null
      };
    } catch (error) {
      if (this.verbose) {
        console.error(`   ✗ [YouTube] Search failed: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Search for video on Vimeo using yt-dlp
   * @param {string} query - Search query
   * @returns {Promise<object|null>} { url, platform: 'vimeo', title } or null
   */
  async searchVimeo(query) {
    if (this.verbose) {
      console.log(`🔍 [Vimeo] Searching: "${query}"`);
    }
    
    try {
      // Check if cookies.txt exists in project root
      const cookiesFilePath = path.join(__dirname, '..', '..', 'cookies.txt');
      const hasCookiesFile = fs.existsSync(cookiesFilePath);
      const cookiesArg = hasCookiesFile ? `--cookies "${cookiesFilePath}"` : '';
      
      if (hasCookiesFile && this.verbose) {
        console.log(`🍪 [Vimeo] Using cookies.txt for authentication`);
      }
      
      // Use yt-dlp's vimeosearch1 extractor to search Vimeo
      // This returns the first search result
      const searchQuery = `vimeosearch1:${query}`;
      const cmd = `yt-dlp ${cookiesArg} --dump-json --skip-download "${searchQuery}"`;
      
      const output = execSync(cmd, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
      });
      
      const data = JSON.parse(output);
      
      if (!data || !data.webpage_url) {
        if (this.verbose) {
          console.log(`   ✗ [Vimeo] No results found`);
        }
        return null;
      }
      
      if (this.verbose) {
        console.log(`   ✓ [Vimeo] Found: "${data.title || 'Untitled'}"`);
        console.log(`   ↗ URL: ${data.webpage_url}`);
      }
      
      // Extract best thumbnail from Vimeo metadata
      let thumbnail = null;
      if (data.thumbnails && Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
        // Get highest resolution thumbnail
        const sortedThumbs = [...data.thumbnails].sort((a, b) => {
          const aRes = (a.height || 0) * (a.width || 0);
          const bRes = (b.height || 0) * (b.width || 0);
          return bRes - aRes;
        });
        thumbnail = sortedThumbs[0].url;
      } else if (data.thumbnail) {
        thumbnail = data.thumbnail;
      }
      
      return {
        url: data.webpage_url,
        platform: 'vimeo',
        title: data.title || 'Untitled',
        author: data.uploader || 'Unknown',
        thumbnail: thumbnail
      };
    } catch (error) {
      if (this.verbose) {
        console.error(`   ✗ [Vimeo] Search failed: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Hybrid search: Try YouTube first, fallback to Vimeo
   * @param {string} query - Search query (e.g., "Artist - Title official video")
   * @returns {Promise<object|null>} { url, platform, title, author } or null
   */
  async search(query) {
    // Stage 1: Try YouTube
    const youtubeResult = await this.searchYouTube(query);
    if (youtubeResult) {
      return youtubeResult;
    }
    
    // Stage 2: Fallback to Vimeo
    if (this.verbose) {
      console.log(`   ⚠️  YouTube search failed, trying Vimeo fallback...`);
    }
    
    const vimeoResult = await this.searchVimeo(query);
    if (vimeoResult) {
      return vimeoResult;
    }
    
    // Stage 3: Total failure
    if (this.verbose) {
      console.log(`   ❌ Video not found on YouTube OR Vimeo`);
    }
    
    return null;
  }

  /**
   * Build search query from components (V8.0 - Director injection now handled in constructor)
   * @param {string} artist - Artist name
   * @param {string} title - Song title
   * @param {string} director - Director name (optional, can also be set in constructor)
   * @returns {string} Formatted search query
   */
  buildQuery(artist, title, director = '') {
    // Base query: artist + title + "official video"
    // Director is injected separately in searchYouTube if set in constructor
    return `${artist} ${title} official video`.trim();
  }

  /**
   * Search with structured input (artist + title + director)
   * @param {object} params - { artist, title, director, allowedKeywords, targetTitle }
   * @returns {Promise<object|null>} Search result or null
   */
  async searchByMetadata(params) {
    const { artist, title, director, allowedKeywords, targetTitle } = params;
    
    // Set director for this search instance
    if (director) {
      this.director = director;
    }
    
    // ============================================================================
    // SMART EXEMPTION - Auto-detect keywords from user's target title
    // If user explicitly asks for "Visualizer" or "Remix", don't block it!
    // ============================================================================
    let finalAllowedKeywords = [...(allowedKeywords || [])];
    
    if (targetTitle) {
      const targetLower = targetTitle.toLowerCase();
      
      // Extract negative keywords that user explicitly included in their title
      const userRequestedKeywords = STRICT_NEGATIVE_KEYWORDS.filter(kw => 
        targetLower.includes(kw)
      );
      
      if (userRequestedKeywords.length > 0) {
        finalAllowedKeywords.push(...userRequestedKeywords);
        if (this.verbose) {
          console.log(`   🔓 [GATEKEEPER] User explicitly requested: [${userRequestedKeywords.join(', ')}]`);
          console.log(`   🔓 [GATEKEEPER] Auto-exempting these keywords from filter`);
        }
      }
    }
    
    // Set allowed keywords (original + auto-detected exemptions)
    this.allowedKeywords = finalAllowedKeywords;
    
    const query = this.buildQuery(artist, title);
    return this.search(query);
  }
}

/**
 * Helper function for simple one-off searches
 * @param {string} query - Search query
 * @param {object} options - Options
 * @returns {Promise<object|null>} Search result or null
 */
export async function hybridSearch(query, options = {}) {
  const searcher = new HybridSearcher(options);
  return searcher.search(query);
}
