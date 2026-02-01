#!/usr/bin/env node

/**
 * REFETCH 12 SPECIFIC FILES
 * Re-ingest the 12 videos that had their director fields cleared
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The 12 specific files that need re-ingestion
const TARGET_FILES = [
  '2016-kaytranada-lite-spots.mdx',
  '2016-tyrone-lebon-nikes.mdx',
  '2017-the-blaze-territory.mdx',
  '2018-tommy-cash-pussy-money-weed.mdx',
  '2019-thom-yorke-last-i-heard-he-was-circling-the-drain.mdx',
  '2023-captain-ants-antslive.mdx',
  '2023-mitski-my-love-mine-all-mine.mdx',
  '2024-charli-xcx-360.mdx',
  '2024-fontaines-dc-starburster.mdx',
  '2024-hana-vu-care.mdx',
  '2024-jade-angel-of-my-dreams.mdx',
  '2024-kamasi-washington-get-lit.mdx',
];

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
 * Re-ingest a single video
 */
function reingestVideo(url, filename) {
  try {
    console.log(`   🔄 Running: node scripts/ingest.js "${url}" --force`);
    
    execSync(`node scripts/ingest.js "${url}" --force`, {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        PATH: `/Users/eddy/Library/Python/3.12/bin:${process.env.PATH}`
      },
      stdio: 'inherit'
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

console.log('\n🚀 REFETCH 12 SPECIFIC FILES - Starting\n');
console.log('='.repeat(70));

const videosDir = path.join(__dirname, '../src/content/videos');

console.log(`\n📋 Processing ${TARGET_FILES.length} files:\n`);

const targets = [];

// Collect file information
TARGET_FILES.forEach((file, index) => {
  const filePath = path.join(videosDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(rawContent);
  
  if (!frontmatter || !frontmatter.video_url) {
    console.log(`⚠️  No video_url found: ${file}`);
    return;
  }
  
  targets.push({
    file,
    url: frontmatter.video_url,
    artist: frontmatter.artist,
    title: frontmatter.title,
  });
  
  console.log(`${index + 1}. ${file}`);
  console.log(`   Artist: ${frontmatter.artist}`);
  console.log(`   Title: ${frontmatter.title}`);
});

console.log('\n' + '='.repeat(70));
console.log('\n🔄 Starting re-ingestion process...\n');
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
  
  // Small delay between requests
  if (index < targets.length - 1) {
    console.log('   ⏸️  Waiting 2 seconds before next request...\n');
    execSync('sleep 2');
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n📊 REFETCH COMPLETE\n');
console.log(`✅ Success: ${successCount} files`);
console.log(`❌ Failed: ${failCount} files`);
console.log(`📁 Total: ${targets.length} files processed\n`);

if (failCount > 0) {
  console.log('⚠️  Some files failed. Check the logs above for details.\n');
}

console.log('✅ Refetch complete!\n');
