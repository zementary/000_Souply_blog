#!/usr/bin/env node

/**
 * DIRECTOR FIX SCRIPT (V2.0)
 * Scans all .mdx files and fixes incorrect director data
 * Uses yt-dlp to re-fetch video descriptions from YouTube/Vimeo
 * Applies upgraded extraction logic with negative lookahead
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parseCredits } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse frontmatter from MDX content
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return null;
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    frontmatter[key] = value;
  }
  
  return frontmatter;
}

/**
 * Update frontmatter in MDX content
 */
function updateFrontmatter(content, updates) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return content;
  
  let frontmatterText = match[1];
  
  // Update each field
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}:.*$`, 'm');
    const replacement = `${key}: "${value}"`;
    
    if (regex.test(frontmatterText)) {
      frontmatterText = frontmatterText.replace(regex, replacement);
    } else {
      // Add new field after title
      frontmatterText = frontmatterText.replace(
        /^title:.*$/m,
        `$&\n${replacement}`
      );
    }
  }
  
  return content.replace(/^---\n[\s\S]+?\n---/, `---\n${frontmatterText}\n---`);
}

// Blacklist: Keywords that indicate WRONG director data
const DIRECTOR_BLACKLIST = [
  'assistant',
  'photography',
  'dop',
  'dp',
  'editor',
  'producer',
  'cinematographer',
  'art',
  'creative',
  'casting',
  'executive',
  "'s rep",
  "'s assistant",
  'of photography',
  'technical',
  'music',
  's rep:', // catches "Director's Rep:"
];

/**
 * Check if director field is flagged (contains blacklisted keywords)
 */
function isDirectorFlagged(director) {
  if (!director) return false;
  const lowerDirector = director.toLowerCase();
  return DIRECTOR_BLACKLIST.some(keyword => lowerDirector.includes(keyword));
}

/**
 * Fetch video description using yt-dlp
 */
function fetchVideoDescription(videoUrl) {
  try {
    console.log(`   🔄 Fetching description from: ${videoUrl}`);
    
    // Try with cookies first (for age-restricted videos)
    let cmd = `yt-dlp --cookies-from-browser brave --dump-json --no-warnings "${videoUrl}"`;
    let stdout;
    
    try {
      stdout = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch (err) {
      // Fallback: try without cookies
      console.log(`   ⚠️  Brave cookies failed, trying without...`);
      cmd = `yt-dlp --dump-json --no-warnings "${videoUrl}"`;
      stdout = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    }
    
    const data = JSON.parse(stdout);
    const description = data.description || '';
    
    console.log(`   ✅ Description fetched (${description.length} chars)`);
    return description;
  } catch (error) {
    console.log(`   ❌ Failed to fetch description: ${error.message}`);
    return null;
  }
}

/**
 * Process a single MDX file
 */
async function processFile(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(rawContent);
  
  if (!frontmatter) {
    console.log(`   ⚠️  Could not parse frontmatter: ${path.basename(filePath)}`);
    return null;
  }
  
  const currentDirector = frontmatter.director || '';
  
  // Check if director is flagged
  if (!isDirectorFlagged(currentDirector)) {
    return null; // No fix needed
  }
  
  console.log(`\n🔍 FLAGGED: ${path.basename(filePath)}`);
  console.log(`   Old Director: "${currentDirector}"`);
  
  // Get video URL
  const videoUrl = frontmatter.video_url;
  if (!videoUrl) {
    console.log(`   ⚠️  No video_url in frontmatter, skipping`);
    return null;
  }
  
  // Fetch description from YouTube/Vimeo
  const description = fetchVideoDescription(videoUrl);
  
  if (!description) {
    console.log(`   ⚠️  Could not fetch description, clearing director field`);
    const newContent = updateFrontmatter(rawContent, { director: '' });
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return { file: path.basename(filePath), old: currentDirector, new: '(cleared - no description)' };
  }
  
  // Apply NEW extraction logic
  const newCredits = parseCredits(description);
  const newDirector = newCredits.director || '';
  
  if (newDirector && newDirector !== currentDirector) {
    // Update frontmatter
    const newContent = updateFrontmatter(rawContent, { director: newDirector });
    fs.writeFileSync(filePath, newContent, 'utf-8');
    
    console.log(`   ✅ Fixed: "${currentDirector}" → "${newDirector}"`);
    return { file: path.basename(filePath), old: currentDirector, new: newDirector };
  } else {
    console.log(`   ⚠️  Could not extract valid director. Clearing field.`);
    // Clear the bad director field
    const newContent = updateFrontmatter(rawContent, { director: '' });
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return { file: path.basename(filePath), old: currentDirector, new: '(cleared)' };
  }
}

/**
 * Scan directory and process all MDX files
 */
async function scanAndFix(directory) {
  const files = fs.readdirSync(directory);
  const results = [];
  
  for (const file of files) {
    if (!file.endsWith('.mdx')) continue;
    
    const filePath = path.join(directory, file);
    const result = await processFile(filePath);
    
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

(async () => {
  console.log('\n🚀 DIRECTOR FIX SCRIPT (V2.0) - Starting Audit\n');
  console.log('='.repeat(70));

  const videosDir = path.join(__dirname, '../src/content/videos');

  if (!fs.existsSync(videosDir)) {
    console.error(`❌ Directory not found: ${videosDir}`);
    process.exit(1);
  }

  const results = await scanAndFix(videosDir);

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 SUMMARY: ${results.length} files fixed\n`);

  if (results.length > 0) {
    console.log('Fixed Files:');
    results.forEach(({ file, old, new: newVal }) => {
      console.log(`  • ${file}`);
      console.log(`    "${old}" → "${newVal}"`);
    });
    console.log('');
  }

  console.log('✅ Audit Complete\n');
})();
