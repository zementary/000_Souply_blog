#!/usr/bin/env node

/**
 * BATCH REFETCH SCRIPT
 * Automatically re-ingest videos with empty director fields
 * Uses the upgraded extraction logic to fetch correct data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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
 * Check if director field is explicitly set to empty string
 * This distinguishes between "" (cleared by us) vs undefined (never had a director)
 */
function isDirectorEmpty(director) {
  // Only match files with explicitly empty director field: director: ""
  return director === '';
}

/**
 * Scan directory and collect files that need re-ingestion
 */
function scanForEmptyDirectors(directory) {
  const files = fs.readdirSync(directory);
  const targets = [];
  
  for (const file of files) {
    if (!file.endsWith('.mdx')) continue;
    
    const filePath = path.join(directory, file);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(rawContent);
    
    if (!frontmatter) continue;
    
    const director = frontmatter.director || '';
    const videoUrl = frontmatter.video_url;
    
    if (isDirectorEmpty(director) && videoUrl) {
      targets.push({
        file,
        url: videoUrl,
        artist: frontmatter.artist,
        title: frontmatter.title,
      });
    }
  }
  
  return targets;
}

/**
 * Re-ingest a single video
 */
function reingestVideo(url, filename) {
  try {
    console.log(`   🔄 Running: node scripts/ingest.js "${url}" --force`);
    
    // Run ingest script synchronously with --force flag (one at a time to avoid rate limiting)
    // Also add PATH to environment to ensure yt-dlp is found
    const result = execSync(`node scripts/ingest.js "${url}" --force`, {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        PATH: `/Users/eddy/Library/Python/3.12/bin:${process.env.PATH}`
      },
      stdio: 'inherit' // Show output in real-time
    });
    
    console.log(`   ✅ Completed: ${filename}\n`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed: ${filename}`);
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('\n🚀 BATCH REFETCH SCRIPT - Starting\n');
console.log('='.repeat(70));
console.log('\n📋 Scanning for files with empty director fields...\n');

const videosDir = path.join(__dirname, '../src/content/videos');

if (!fs.existsSync(videosDir)) {
  console.error(`❌ Directory not found: ${videosDir}`);
  process.exit(1);
}

const targets = scanForEmptyDirectors(videosDir);

console.log(`Found ${targets.length} files that need re-ingestion:\n`);

if (targets.length === 0) {
  console.log('✅ No files need re-ingestion. All director fields are populated.\n');
  process.exit(0);
}

// Display list of files to process
targets.forEach(({ file, artist, title }, index) => {
  console.log(`${index + 1}. ${file}`);
  console.log(`   Artist: ${artist}`);
  console.log(`   Title: ${title}`);
});

console.log('\n' + '='.repeat(70));
console.log('\n🔄 Starting re-ingestion process...\n');
console.log('⚠️  This will take a few minutes (processing one at a time to avoid rate limits)\n');
console.log('='.repeat(70) + '\n');

let successCount = 0;
let failCount = 0;

targets.forEach(({ file, url, artist, title }, index) => {
  console.log(`\n[${index + 1}/${targets.length}] Re-ingesting: ${file}`);
  console.log(`   Artist: ${artist} - ${title}`);
  console.log(`   URL: ${url}`);
  
  const success = reingestVideo(url, file);
  
  if (success) {
    successCount++;
  } else {
    failCount++;
  }
  
  // Small delay between requests to be nice to the servers
  if (index < targets.length - 1) {
    console.log('   ⏸️  Waiting 2 seconds before next request...\n');
    execSync('sleep 2');
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n📊 BATCH REFETCH COMPLETE\n');
console.log(`✅ Success: ${successCount} files`);
console.log(`❌ Failed: ${failCount} files`);
console.log(`📁 Total: ${targets.length} files processed\n`);

if (failCount > 0) {
  console.log('⚠️  Some files failed. Check the logs above for details.\n');
  console.log('💡 Tip: You can manually re-run failed videos using:');
  console.log('   node scripts/ingest.js <video_url>\n');
}

console.log('✅ Batch refetch complete!\n');
