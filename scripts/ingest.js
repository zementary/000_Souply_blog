import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Import modular components
import { setupProxy } from './lib/proxy.js';
import { parseCredits, cleanSongTitle, normalizeArtistName, normalizeChannelName } from './lib/parser.js';

// Setup proxy (Anti-Block Layer)
setupProxy();

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract video ID from URL (supports YouTube and Vimeo)
 * @param {string} url - Video URL
 * @returns {string|null} Video ID or null if invalid
 */
export function extractVideoId(url) {
  // YouTube pattern: 11-character alphanumeric ID
  const youtubeMatch = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/);
  if (youtubeMatch) {
    return youtubeMatch[1];
  }
  
  // Vimeo pattern: numeric ID (e.g., vimeo.com/123456789)
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return vimeoMatch[1];
  }
  
  return null;
}

/**
 * Download thumbnail with zombie image detection and fallback
 * @param {string} url - Thumbnail URL to download
 * @param {string} localPath - Local file path to save
 * @param {string|null} fallbackUrl - Fallback URL if primary fails or is zombie
 * @returns {Promise<{success: boolean, sizeKB: number, isZombie: boolean}>}
 */
async function downloadThumbnail(url, localPath, fallbackUrl = null) {
  const ZOMBIE_THRESHOLD_KB = 8; // Files smaller than 8KB are likely zombie images
  
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const buffer = await res.arrayBuffer();
    
    if (buffer.byteLength === 0) {
      throw new Error('Empty file downloaded');
    }
    
    // Write file first
    fs.writeFileSync(localPath, Buffer.from(buffer));
    
    // Check file size for zombie detection
    const stats = fs.statSync(localPath);
    const sizeKB = stats.size / 1024;
    
    // 🚨 ZOMBIE DETECTION: If file is suspiciously small, it's likely a gray placeholder
    if (sizeKB < ZOMBIE_THRESHOLD_KB) {
      console.log(`⚠️  Detected broken thumbnail (${sizeKB.toFixed(1)} KB < ${ZOMBIE_THRESHOLD_KB} KB threshold)`);
      
      // Delete the zombie file
      fs.unlinkSync(localPath);
      console.log(`🗑️  Deleted zombie thumbnail: ${localPath}`);
      
      // Try fallback URL if available
      if (fallbackUrl && fallbackUrl !== url) {
        console.log(`🔄 Attempting fallback URL: ${fallbackUrl}`);
        
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        
        if (fallbackRes.ok) {
          const fallbackBuffer = await fallbackRes.arrayBuffer();
          if (fallbackBuffer.byteLength > 0) {
            fs.writeFileSync(localPath, Buffer.from(fallbackBuffer));
            const fallbackStats = fs.statSync(localPath);
            const fallbackSizeKB = fallbackStats.size / 1024;
            
            if (fallbackSizeKB >= ZOMBIE_THRESHOLD_KB) {
              console.log(`✅ Downloaded fallback thumbnail: ${localPath} (${fallbackSizeKB.toFixed(1)} KB)`);
              return { success: true, sizeKB: fallbackSizeKB, isZombie: false };
            } else {
              console.log(`⚠️  Fallback thumbnail is also a zombie (${fallbackSizeKB.toFixed(1)} KB)`);
              fs.unlinkSync(localPath);
              return { success: false, sizeKB: fallbackSizeKB, isZombie: true };
            }
          }
        }
      }
      
      return { success: false, sizeKB, isZombie: true };
    }
    
    // Valid thumbnail (>= 8KB)
    console.log(`✅ Downloaded thumbnail: ${localPath} (${sizeKB.toFixed(1)} KB)`);
    return { success: true, sizeKB, isZombie: false };
    
  } catch (error) {
    console.log(`❌ Download failed: ${error.message}`);
    return { success: false, sizeKB: 0, isZombie: false };
  }
}

/**
 * Check if a video already exists in the content directory
 * @param {string} videoId - YouTube video ID
 * @returns {string|null} - File name if exists, null otherwise
 */
export function checkIfVideoExists(videoId) {
  const contentDir = path.join(__dirname, '..', 'src', 'content', 'videos');
  
  if (!fs.existsSync(contentDir)) {
    return null;
  }
  
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(contentDir, file), 'utf-8');
      // Check if video_url contains the videoId
      if (content.includes(videoId)) {
        return file;
      }
    } catch (err) {
      // Skip files that can't be read
      continue;
    }
  }
  
  return null;
}

// ============================================================================
// PARSING FUNCTIONS (V5.0 - NOW IMPORTED FROM PARSER MODULE)
// ============================================================================
// parseCredits, cleanSongTitle, normalizeArtistName are now imported from lib/parser.js

/**
 * Ingest a video from search result or URL
 * @param {string|object} videoUrlOrResult - YouTube/Vimeo URL OR searchResult object from HybridSearcher
 *                                            searchResult format: { url, platform: 'youtube'|'vimeo', title }
 * @param {Object} options - Ingestion options
 * @param {boolean} options.force - Force overwrite if file exists
 * @param {boolean} options.repairCovers - Only repair missing/corrupted cover images (skip if .mdx exists)
 * @param {Array<string>} options.additionalTags - Additional tags to inject
 * @param {string} options.curatorNote - Curator note to inject
 * @returns {Promise<Object>} - Result object with status and details
 */
export async function ingestVideo(videoUrlOrResult, options = {}) {
  const { force = false, repairCovers = false, additionalTags = [], curatorNote = '' } = options;
  
  // Support both URL string (legacy) and searchResult object (new)
  let videoUrl, platform, searchTitle;
  if (typeof videoUrlOrResult === 'string') {
    // Legacy mode: direct URL
    videoUrl = videoUrlOrResult;
    platform = 'youtube'; // Assume YouTube for backward compatibility
    searchTitle = null;
  } else if (videoUrlOrResult && typeof videoUrlOrResult === 'object') {
    // New mode: searchResult object from HybridSearcher
    videoUrl = videoUrlOrResult.url;
    platform = videoUrlOrResult.platform || 'youtube';
    searchTitle = videoUrlOrResult.title || null;
  } else {
    throw new Error('Invalid input: expected URL string or searchResult object');
  }
  
  const videoId = extractVideoId(videoUrl);
  
  if (!videoId) {
    throw new Error(`Invalid ${platform} URL: ${videoUrl}`);
  }
  
  console.log(`🎬 Processing [${platform.toUpperCase()}]: ${videoId} (Force Mode: ${force})`);
  if (searchTitle) {
    console.log(`   🔍 Search result: "${searchTitle}"`);
  }

  try {
    // ============================================================================
    // TASK 4: VIMEO SUPPORT - Platform-specific cookie handling
    // ============================================================================
    let data;
    let jsonOutput;
    
    // Cookie file: BRAVE_COOKIE_PATH env or fallback to project root cookies.txt
    const cookiesFilePath = process.env.BRAVE_COOKIE_PATH
      ? path.resolve(process.env.BRAVE_COOKIE_PATH)
      : path.join(__dirname, '..', 'cookies.txt');
    const hasCookiesFile = fs.existsSync(cookiesFilePath);
    const cookiesArg = hasCookiesFile ? `--cookies "${cookiesFilePath}"` : '';

    if (hasCookiesFile) {
      console.log(`🍪 Found cookies file, will use for authentication`);
    }
    
    // Determine if we should use cookies based on platform
    const shouldUseCookies = platform === 'youtube';
    
    if (shouldUseCookies) {
      // YouTube: Try with Brave cookies (Identity Layer)
      try {
        const cmdWithCookies = `yt-dlp --no-check-certificate --cookies-from-browser brave ${cookiesArg} --dump-json "${videoUrl}"`;
        console.log('🍪 [YouTube] Attempting with Brave cookies...');
        const { stdout } = await execAsync(cmdWithCookies);
        jsonOutput = stdout;
        data = JSON.parse(jsonOutput);
        console.log('✅ Successfully fetched with Brave cookies');
      } catch (cookieError) {
        // Fallback: proxy from HTTPS_PROXY (if set), cookies from cookiesFilePath
        console.log('⚠️  Brave Cookie 读取失败，尝试无 Cookie 模式...');
        const proxyArg = process.env.HTTPS_PROXY ? `--proxy "${process.env.HTTPS_PROXY}"` : '';
        const cmdWithoutCookies = `yt-dlp ${proxyArg} --no-check-certificate ${cookiesArg} --extractor-args "youtube:player-client=ios,web" --dump-json "${videoUrl}"`.replace(/\s+/g, ' ').trim();
        const { stdout } = await execAsync(cmdWithoutCookies);
        jsonOutput = stdout;
        data = JSON.parse(jsonOutput);
        console.log('✅ Fetched without cookies (fallback mode)');
      }
    } else {
      // Vimeo (or other platforms): Use cookies.txt if available
      console.log(`📥 [${platform.toUpperCase()}] Fetching metadata...`);
      const cmdWithCookies = `yt-dlp --no-check-certificate ${cookiesArg} --dump-json "${videoUrl}"`;
      const { stdout } = await execAsync(cmdWithCookies);
      jsonOutput = stdout;
      data = JSON.parse(jsonOutput);
      console.log('✅ Metadata fetched successfully');
    }

    // Extract raw title (will be cleaned after artist is determined)
    const rawTitle = data.title || '';

    // 🛑 CRITICAL: Check if this is a music video (not pure audio)
    // Pure audio videos often have keywords like "Audio", "Lyric", "Visualizer" in title
    const audioKeywords = ['audio', 'lyric video', 'lyrics', 'visualizer', 'audio only', 'official audio'];
    const isPureAudio = audioKeywords.some(kw => rawTitle?.toLowerCase().includes(kw));
    
    if (isPureAudio) {
      console.log(`⚠️  Skipping: This appears to be a pure audio video (not a music video).`);
      console.log(`   Title: "${rawTitle}"`);
      return { 
        status: 'skipped', 
        reason: 'pure_audio', 
        title: rawTitle 
      };
    }
    const description = data.description || "";
    let channel = data.uploader || '';
    
    // ============================================================================
    // THE BRAIN - Apply channel normalization using Knowledge Base
    // ============================================================================
    const normalizedChannel = normalizeChannelName(channel);
    if (normalizedChannel && normalizedChannel !== channel) {
      console.log(`🧠 [BRAIN] Normalized channel: "${channel}" → "${normalizedChannel}"`);
      channel = normalizedChannel;
    }
    
    // ✅ 日期解析逻辑 (Enhanced with fallback and debugging)
    let publishDate = null;
    
    // Debug: Show raw date data from yt-dlp
    console.log(`📅 [Debug] upload_date: ${data.upload_date} (type: ${typeof data.upload_date})`);
    console.log(`📅 [Debug] release_date: ${data.release_date} (type: ${typeof data.release_date})`);
    
    // Try upload_date first (primary source)
    const rawUploadDate = String(data.upload_date || '').trim();
    if (rawUploadDate && rawUploadDate.length === 8 && /^\d{8}$/.test(rawUploadDate)) {
      // yt-dlp 返回 YYYYMMDD (例如 20240524)
      const year = rawUploadDate.slice(0, 4);
      const month = rawUploadDate.slice(4, 6);
      const day = rawUploadDate.slice(6, 8);
      publishDate = `${year}-${month}-${day}`;
      console.log(`✅ Parsed upload_date: ${publishDate}`);
    }
    
    // Fallback to release_date if upload_date is not available
    if (!publishDate) {
      const rawReleaseDate = String(data.release_date || '').trim();
      if (rawReleaseDate && rawReleaseDate.length === 8 && /^\d{8}$/.test(rawReleaseDate)) {
        const year = rawReleaseDate.slice(0, 4);
        const month = rawReleaseDate.slice(4, 6);
        const day = rawReleaseDate.slice(6, 8);
        publishDate = `${year}-${month}-${day}`;
        console.log(`✅ Parsed release_date: ${publishDate}`);
      }
    }
    
    // Final fallback: use today's date
    if (!publishDate) {
      publishDate = new Date().toISOString().split('T')[0];
      console.log(`⚠️  Warning: No valid date found from yt-dlp, using today: ${publishDate}`);
    }

    // Artist 处理 (K-Pop, Label & Fan Repost Detection v3.0)
    let artist = channel;
    
    // Expanded label/channel keywords (不应作为 artist 的频道名)
    const labelKeywords = [
      'LABEL', 'ENTERTAINMENT', 'SMTOWN', 'JYP', 'YG', 'HYBE', 'VEVO', 'OFFICIAL',
      'RECORDS', 'MUSIC', 'LLOUD', 'RCA', 'ATLANTIC', 'COLUMBIA', 'INTERSCOPE'
    ];
    
    // Fan repost channel patterns (频道名包含艺术家名但不是官方频道)
    const fanRepostPatterns = [
      /^(.+?)(?:UPTOWN|ARCHIVE|FAN|LIVE|VIDEOS?|CHANNEL|HD|OFFICIAL)$/i, // e.g., ASAPROCKYUPTOWN → A$AP Rocky
      /^(.+?)(?:Music|Videos?|Channel|Archive|Fan|Live|HD)$/i
    ];
    
    // Check if channel is a label or fan repost
    const isLabelChannel = labelKeywords.some(kw => (channel || '').toUpperCase().includes(kw));
    let isFanRepost = false;
    let extractedArtistFromChannel = null;
    
    // Try to extract artist from fan repost channel name
    for (const pattern of fanRepostPatterns) {
      const match = channel.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        extractedArtistFromChannel = match[1].trim();
        isFanRepost = true;
        break;
      }
    }
    
    if (isLabelChannel || isFanRepost) {
      // 尝试从标题提取艺术家 (更多模式)
      // Pattern 1: "Artist - Song" (e.g., "LISA - ROCKSTAR", "A$AP Rocky - Babushka Boi")
      const titleMatchA = rawTitle.match(/^([^-–—\[\(]+?)\s*[-–—]\s*/);
      // Pattern 2: "[MV] Artist - Song"
      const titleMatchB = rawTitle.match(/^\[MV\]\s*(.+?)\s*[-–—]\s*/);
      // Pattern 3: Artist name in quotes: "Artist" - Song
      const titleMatchC = rawTitle.match(/^['""]([^'""]+)['""]?\s*[-–—]?\s*/);
      
      if (titleMatchA && titleMatchA[1].length > 1 && titleMatchA[1].length < 50) {
        artist = titleMatchA[1].trim();
      } else if (titleMatchB) {
        artist = titleMatchB[1].trim();
      } else if (titleMatchC) {
        artist = titleMatchC[1].trim();
      } else if (isFanRepost && extractedArtistFromChannel) {
        // Fallback: use extracted artist from fan repost channel name
        artist = extractedArtistFromChannel;
      }
    }
    
    // Normalize artist name (fix capitalization)
    artist = normalizeArtistName(artist);

    // Clean the song title after artist is determined
    const title = cleanSongTitle(rawTitle, artist);

    // 文件路径处理
    const year = publishDate.split('-')[0];
    const artistSlug = (artist || 'unknown').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    const titleSlug = (title || 'untitled').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    const fileName = `${year}-${artistSlug}-${titleSlug}.mdx`;
    const filePath = path.join('src/content/videos', fileName);
    
    // 封面处理
    const publicCoverDir = path.join('public', 'covers', year);
    const coverSlug = `${artistSlug}-${titleSlug}`;
    const publicCoverPath = `/covers/${year}/${coverSlug}.jpg`;
    const localCoverPath = path.join(publicCoverDir, `${coverSlug}.jpg`);

    // ============================================================================
    // REPAIR MODE: Only fix missing covers if .mdx exists
    // ============================================================================
    if (repairCovers) {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  [Repair Mode] Skipping: .mdx file doesn't exist (${fileName})`);
        return { status: 'skipped', reason: 'no_mdx_file', filePath };
      }
      
      // Check if cover exists and is valid (> 0 bytes)
      if (fs.existsSync(localCoverPath)) {
        const stats = fs.statSync(localCoverPath);
        if (stats.size > 0) {
          console.log(`✅ [Repair Mode] Cover exists and is valid: ${localCoverPath}`);
          return { status: 'skipped', reason: 'cover_already_exists', filePath, coverPath: localCoverPath };
        } else {
          console.log(`⚠️  [Repair Mode] Cover is corrupted (0 bytes), re-downloading...`);
        }
      } else {
        console.log(`🔧 [Repair Mode] Cover missing, downloading...`);
      }
      
      // Skip to cover download logic (skip MDX generation)
    } else {
      // Normal mode: Check if file exists
      if (fs.existsSync(filePath) && !force) {
        console.log(`⚠️  File exists: ${fileName}. Skipping (Use --force to overwrite).`);
        return { status: 'skipped', reason: 'already_exists', filePath };
      }
    }
    
    const credits = await parseCredits(description, { title, artist });

    // ============================================================================
    // UNIVERSAL COVER LOGIC - Use yt-dlp thumbnails (YouTube + Vimeo)
    // ============================================================================
    if (!fs.existsSync(publicCoverDir)) fs.mkdirSync(publicCoverDir, { recursive: true });
    
    let coverUrl;
    let fallbackCoverUrl;
    
    // STRATEGY: Use yt-dlp's thumbnail data as source of truth
    // 1. Try to find highest resolution from thumbnails array
    // 2. Fallback to single thumbnail field
    // 3. Ultimate fallback: platform-specific constructed URL
    
    if (data.thumbnails && Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
      // Find thumbnail with highest resolution
      // Sort by preference (if exists), then by height, then by width
      const sortedThumbs = [...data.thumbnails].sort((a, b) => {
        // Prefer thumbnails with higher preference value
        if (a.preference !== undefined && b.preference !== undefined) {
          return b.preference - a.preference;
        }
        // Otherwise sort by dimensions
        const aRes = (a.height || 0) * (a.width || 0);
        const bRes = (b.height || 0) * (b.width || 0);
        return bRes - aRes;
      });
      
      const bestThumbnail = sortedThumbs[0];
      coverUrl = bestThumbnail.url;
      
      // Smart fallback: For YouTube, if maxresdefault is used, ensure hqdefault as fallback
      if (platform === 'youtube' && coverUrl.includes('maxresdefault')) {
        fallbackCoverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        console.log(`📸 Using yt-dlp thumbnail (maxresdefault → hqdefault fallback)`);
      } else {
        // Fallback: try second-best thumbnail if available
        fallbackCoverUrl = sortedThumbs.length > 1 ? sortedThumbs[1].url : coverUrl;
        console.log(`📸 Using yt-dlp thumbnail (${bestThumbnail.width}x${bestThumbnail.height})`);
      }
    } else if (data.thumbnail) {
      // Single thumbnail field exists
      coverUrl = data.thumbnail;
      
      // Smart fallback: For YouTube maxresdefault, use hqdefault as fallback
      if (platform === 'youtube' && coverUrl.includes('maxresdefault')) {
        fallbackCoverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        console.log(`📸 Using yt-dlp thumbnail (single field, with hqdefault fallback)`);
      } else {
        fallbackCoverUrl = coverUrl;
        console.log(`📸 Using yt-dlp thumbnail (single field)`);
      }
    } else {
      // Ultimate fallback: construct platform-specific URL
      console.log(`⚠️  No thumbnails in yt-dlp data, using constructed URL`);
      if (platform === 'youtube') {
        coverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        fallbackCoverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else if (platform === 'vimeo') {
        coverUrl = `https://vumbnail.com/${videoId}.jpg`;
        fallbackCoverUrl = coverUrl;
      } else {
        throw new Error(`No thumbnail data available for ${platform}`);
      }
    }
    
    // ============================================================================
    // SMART THUMBNAIL DOWNLOAD with ZOMBIE DETECTION
    // ============================================================================
    console.log(`📥 Downloading thumbnail from: ${coverUrl}`);
    
    let downloadSuccess = false;
    
    // Try primary URL with zombie detection
    const primaryResult = await downloadThumbnail(coverUrl, localCoverPath, fallbackCoverUrl);
    
    if (primaryResult.success) {
      downloadSuccess = true;
      console.log(`✅ Cover downloaded [${platform.toUpperCase()}]: ${localCoverPath}`);
    } else if (primaryResult.isZombie) {
      // Zombie detected, fallback should have already been attempted
      console.log(`⚠️  All thumbnails are zombie images (< 8KB), using remote URL`);
    } else {
      // Download failed for other reasons, try explicit fallback
      if (fallbackCoverUrl && fallbackCoverUrl !== coverUrl) {
        console.log(`⚠️  Primary download failed, trying explicit fallback...`);
        const fallbackResult = await downloadThumbnail(fallbackCoverUrl, localCoverPath, null);
        if (fallbackResult.success) {
          downloadSuccess = true;
          console.log(`✅ Fallback cover downloaded successfully`);
        }
      }
    }
    
    // If all download attempts failed, keep remote URL as last resort
    if (!downloadSuccess) {
      console.log(`⚠️  Using remote URL as backup: ${fallbackCoverUrl || coverUrl}`);
      coverUrl = fallbackCoverUrl || coverUrl;
    }
    
    const finalCover = fs.existsSync(localCoverPath) ? publicCoverPath : coverUrl;

    // ============================================================================
    // REPAIR MODE: Skip MDX generation if only repairing covers
    // ============================================================================
    if (repairCovers) {
      console.log(`✅ [Repair Mode] Cover repaired successfully: ${localCoverPath}`);
      return {
        status: 'repaired',
        filePath,
        coverPath: localCoverPath,
        title,
        artist
      };
    }

    // ============================================================================
    // FRONTMATTER GENERATION (V7.0 - Unified Production Field)
    // ============================================================================
    
    const escapeQuotes = (str) => str.replace(/"/g, '\\"');
    
    // Smart Tag Generation Strategy (V5.0 - 4-Layer Fallback):
    // 1. Use injected tags from hunter.js (Visual Hook taxonomy) - PRIORITY
    // 2. If no tags, try director-based tag
    // 3. Add decade tag as supplementary context
    // 4. Ultimate fallback: "uncategorized"
    let allTags = [...additionalTags];
    
    if (allTags.length === 0) {
      // Layer 1: Try director-based tag
      if (credits.director) {
        const directorSlug = (credits.director || '')
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 20);
        if (directorSlug) {
          allTags.push(`dir-${directorSlug}`);
        }
      }
      
      // Layer 2: If we have some meaningful tag, add decade as context
      if (allTags.length > 0) {
        const decade = `${year.substring(0, 3)}0s`;
        allTags.push(decade);
      } else {
        // Layer 3: No director? Ultimate fallback
        allTags.push('uncategorized');
      }
    }
    
    const tagsString = JSON.stringify(allTags);
    
    // Build frontmatter with ONLY 3 credit fields
    // NOTE: "production" field is unified and can contain company OR person name
    const frontmatter = [
      '---',
      `title: "${escapeQuotes(title)}"`,
      `artist: "${escapeQuotes(artist)}"`,
      `video_url: "${videoUrl}"`,
      `publishDate: ${publishDate}`,
      `cover: "${finalCover}"`,
      `curator_note: "${escapeQuotes(curatorNote)}"`,
      // Only 3 credit fields (V7.0 - unified "production" field):
      credits.director ? `director: "${escapeQuotes(credits.director)}"` : null,
      credits.production ? `production: "${escapeQuotes(credits.production)}"` : null,
      credits.label ? `label: "${escapeQuotes(credits.label)}"` : null,
      `tags: ${tagsString}`,
      '---',
      ''
    ].filter(Boolean).join('\n');

    fs.writeFileSync(filePath, frontmatter);
    console.log(`✅ Generated: ${filePath}`);
    console.log(`   📅 Date: ${publishDate}`);
    console.log(`   🎬 Director: ${credits.director || "Not found"}`);
    console.log(`   🎬 Production: ${credits.production || "Not found"}`);
    console.log(`   🏷️  Tags: ${allTags.join(', ')}`);
    
    return {
      status: 'success',
      filePath,
      title,
      artist,
      publishDate,
      credits
    };

  } catch (error) {
    console.error('❌ Failed:', error.message);
    throw error;
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const forceUpdate = args.includes('--force') || process.argv.includes('--force');
  const repairMode = args.includes('--repair-covers') || process.argv.includes('--repair-covers');

  // Batch mode: --file <path>
  const fileIndex = args.findIndex(a => a === '--file');
  if (fileIndex !== -1) {
    const filePath = args[fileIndex + 1];
    if (!filePath) {
      console.error('❌ --file requires a path argument. e.g. --file batch-urls.txt');
      process.exit(1);
    }
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      console.error(`❌ File not found: ${absPath}`);
      process.exit(1);
    }
    const urls = fs.readFileSync(absPath, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    console.log(`📋 Batch mode: ${urls.length} URLs from ${filePath}\n`);
    let success = 0, skipped = 0, failed = 0;
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n[${i + 1}/${urls.length}] ${url}`);
      try {
        const result = await ingestVideo(url, { force: forceUpdate, repairCovers: repairMode });
        if (result?.status === 'skipped') skipped++;
        else success++;
      } catch (err) {
        console.error(`❌ Failed: ${err.message}`);
        failed++;
      }
    }
    console.log(`\n✅ Done — success: ${success}, skipped: ${skipped}, failed: ${failed}`);
    return;
  }

  // Single URL mode
  const videoUrl = args[0];
  if (!videoUrl) {
    console.error('❌ Error: Please provide a YouTube/Vimeo URL.');
    console.error('Usage:');
    console.error('  npm run ingest <url>                       # Ingest new video');
    console.error('  npm run ingest <url> --force               # Force overwrite existing');
    console.error('  npm run ingest <url> --repair-covers       # Only repair missing covers');
    console.error('  npm run ingest -- --file batch-urls.txt    # Batch import from file');
    process.exit(1);
  }

  try {
    await ingestVideo(videoUrl, { force: forceUpdate, repairCovers: repairMode });
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Only run main if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}