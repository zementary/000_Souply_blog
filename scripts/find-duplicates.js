import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const VIDEOS_DIR = path.join(__dirname, '../src/content/videos');
const SIMILARITY_THRESHOLD = 0.85; // For fuzzy matching (0-1 scale)

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract video ID from video_url field
 * Supports YouTube and Vimeo
 */
function extractVideoId(url) {
  if (!url) return null;

  // YouTube patterns
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) return youtubeMatch[1];

  // Vimeo patterns
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return vimeoMatch[1];

  return null;
}

/**
 * Normalize string for comparison
 * - Lowercase
 * - Remove special characters
 * - Remove common suffixes like "Official Video", "Music Video", etc.
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[-–—_]/g, ' ') // Normalize separators
    .replace(/\(.*?\)/g, '') // Remove parentheses content
    .replace(/\[.*?\]/g, '') // Remove brackets content
    .replace(/official|music video|video|mv|lyric|lyrics|audio/gi, '')
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio between two strings (0-1 scale)
 */
function similarityRatio(a, b) {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Parse frontmatter from MDX file
 */
function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = {};
  const lines = frontmatterMatch[1].split('\n');

  lines.forEach(line => {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Handle quoted strings
      frontmatter[key] = value.replace(/^["']|["']$/g, '').trim();
    }
  });

  return frontmatter;
}

/**
 * Scan all MDX files and extract metadata
 */
function scanVideos() {
  const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mdx'));
  const videos = [];

  files.forEach(file => {
    const filePath = path.join(VIDEOS_DIR, file);
    const frontmatter = parseFrontmatter(filePath);

    if (frontmatter && frontmatter.video_url) {
      videos.push({
        file,
        path: filePath,
        title: frontmatter.title || 'Untitled',
        artist: frontmatter.artist || '',
        videoId: extractVideoId(frontmatter.video_url),
        videoUrl: frontmatter.video_url,
        normalizedTitle: normalizeTitle(frontmatter.title || ''),
      });
    }
  });

  return videos;
}

/**
 * Find exact duplicates by video ID
 */
function findExactDuplicates(videos) {
  const idMap = new Map();
  const duplicates = [];

  videos.forEach(video => {
    if (!video.videoId) return;

    if (idMap.has(video.videoId)) {
      idMap.get(video.videoId).push(video);
    } else {
      idMap.set(video.videoId, [video]);
    }
  });

  idMap.forEach((group, videoId) => {
    if (group.length > 1) {
      duplicates.push({
        type: 'exact',
        videoId,
        count: group.length,
        files: group,
      });
    }
  });

  return duplicates;
}

/**
 * Find fuzzy duplicates by title similarity
 */
function findFuzzyDuplicates(videos) {
  const duplicates = [];
  const processed = new Set();

  for (let i = 0; i < videos.length; i++) {
    if (processed.has(i)) continue;

    const similar = [videos[i]];

    for (let j = i + 1; j < videos.length; j++) {
      if (processed.has(j)) continue;

      const similarity = similarityRatio(
        videos[i].normalizedTitle,
        videos[j].normalizedTitle
      );

      if (similarity >= SIMILARITY_THRESHOLD) {
        similar.push(videos[j]);
        processed.add(j);
      }
    }

    if (similar.length > 1) {
      duplicates.push({
        type: 'fuzzy',
        similarity: Math.min(...similar.slice(1).map(v => 
          similarityRatio(videos[i].normalizedTitle, v.normalizedTitle)
        )),
        count: similar.length,
        files: similar,
      });
      processed.add(i);
    }
  }

  return duplicates;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('🔍 Scanning for duplicates...\n');

const videos = scanVideos();
console.log(`📊 Total videos found: ${videos.length}\n`);

// Find exact duplicates
const exactDuplicates = findExactDuplicates(videos);
console.log(`🎯 Exact Duplicates (Same Video ID): ${exactDuplicates.length}\n`);

if (exactDuplicates.length > 0) {
  exactDuplicates.forEach((dup, index) => {
    console.log(`\n[EXACT #${index + 1}] Video ID: ${dup.videoId}`);
    dup.files.forEach(file => {
      console.log(`  - ${file.file}`);
      console.log(`    Title: ${file.title}`);
      console.log(`    Artist: ${file.artist || 'N/A'}`);
      console.log(`    URL: ${file.videoUrl}\n`);
    });
  });
}

// Find fuzzy duplicates
const fuzzyDuplicates = findFuzzyDuplicates(videos);
console.log(`\n🔤 Fuzzy Duplicates (Similar Titles): ${fuzzyDuplicates.length}\n`);

if (fuzzyDuplicates.length > 0) {
  fuzzyDuplicates.forEach((dup, index) => {
    console.log(`\n[FUZZY #${index + 1}] Similarity: ${(dup.similarity * 100).toFixed(1)}%`);
    dup.files.forEach(file => {
      console.log(`  - ${file.file}`);
      console.log(`    Title: ${file.title}`);
      console.log(`    Artist: ${file.artist || 'N/A'}`);
      console.log(`    Video ID: ${file.videoId || 'N/A'}\n`);
    });
  });
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📝 SUMMARY');
console.log('='.repeat(60));
console.log(`Total Videos: ${videos.length}`);
console.log(`Exact Duplicates: ${exactDuplicates.length} groups (${exactDuplicates.reduce((sum, d) => sum + d.count, 0)} files)`);
console.log(`Fuzzy Duplicates: ${fuzzyDuplicates.length} groups (${fuzzyDuplicates.reduce((sum, d) => sum + d.count, 0)} files)`);
console.log('='.repeat(60) + '\n');

if (exactDuplicates.length === 0 && fuzzyDuplicates.length === 0) {
  console.log('✅ No duplicates found! Your collection is clean.\n');
} else {
  console.log('⚠️  Please manually review and delete unwanted MDX files.\n');
}
