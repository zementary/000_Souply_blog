#!/usr/bin/env node

/**
 * REPAIR COVERS UTILITY
 * Scans all .mdx files and re-downloads missing or corrupted cover images
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestVideo } from './ingest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content', 'videos');
const PUBLIC_COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');

/**
 * Extract video_url from MDX frontmatter
 */
function extractVideoUrl(mdxContent) {
  const match = mdxContent.match(/video_url:\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

/**
 * Extract cover path from MDX frontmatter
 */
function extractCoverPath(mdxContent) {
  const match = mdxContent.match(/cover:\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

/**
 * Check if a cover file exists and is valid
 */
function isCoverValid(coverPath) {
  // Convert public path to local filesystem path
  const localPath = coverPath.startsWith('/covers/')
    ? path.join(__dirname, '..', 'public', coverPath)
    : coverPath;
  
  if (!fs.existsSync(localPath)) {
    return false;
  }
  
  const stats = fs.statSync(localPath);
  return stats.size > 0;
}

/**
 * Scan all MDX files and find those with missing/corrupted covers
 */
function scanForMissingCovers() {
  const mdxFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx'));
  const missing = [];
  
  console.log(`📂 Scanning ${mdxFiles.length} MDX files for missing covers...\n`);
  
  for (const file of mdxFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const videoUrl = extractVideoUrl(content);
    const coverPath = extractCoverPath(content);
    
    if (!videoUrl) {
      console.log(`⚠️  Skipping ${file}: No video_url found`);
      continue;
    }
    
    if (!coverPath) {
      console.log(`⚠️  ${file}: No cover field found`);
      missing.push({ file, videoUrl, reason: 'no_cover_field' });
      continue;
    }
    
    // Check if cover is a remote URL (not downloaded)
    if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
      console.log(`⚠️  ${file}: Cover is remote URL`);
      missing.push({ file, videoUrl, coverPath, reason: 'remote_url' });
      continue;
    }
    
    // Check if local cover file exists and is valid
    if (!isCoverValid(coverPath)) {
      console.log(`⚠️  ${file}: Cover file missing or corrupted (${coverPath})`);
      missing.push({ file, videoUrl, coverPath, reason: 'missing_or_corrupted' });
      continue;
    }
  }
  
  return missing;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  COVER REPAIR UTILITY                  ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  // Scan for missing covers
  const missing = scanForMissingCovers();
  
  if (missing.length === 0) {
    console.log('\n✅ All covers are present and valid! Nothing to repair.\n');
    process.exit(0);
  }
  
  console.log(`\n📊 Found ${missing.length} files with missing/corrupted covers\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Ask for confirmation
  const args = process.argv.slice(2);
  const autoConfirm = args.includes('--yes') || args.includes('-y');
  
  if (!autoConfirm) {
    console.log('⚠️  This will re-download covers using yt-dlp metadata.');
    console.log('   Run with --yes to skip this confirmation.\n');
    console.log('Press Ctrl+C to cancel, or run with --yes flag to proceed.\n');
    process.exit(0);
  }
  
  // Repair each file
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  for (let i = 0; i < missing.length; i++) {
    const { file, videoUrl, reason } = missing[i];
    
    console.log(`\n[${i + 1}/${missing.length}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📄 File: ${file}`);
    console.log(`🔗 URL: ${videoUrl}`);
    console.log(`❓ Reason: ${reason}`);
    
    try {
      const result = await ingestVideo(videoUrl, { repairCovers: true });
      
      if (result.status === 'repaired') {
        console.log(`✅ Successfully repaired cover`);
        results.success++;
      } else if (result.status === 'skipped') {
        console.log(`⏭️  Skipped: ${result.reason}`);
        results.skipped++;
      } else {
        console.log(`⚠️  Unexpected result: ${result.status}`);
        results.skipped++;
      }
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      results.failed++;
    }
    
    // Rate limiting
    if (i < missing.length - 1) {
      console.log(`   ⏳ Waiting 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Summary
  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║  REPAIR SUMMARY                        ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`✅ Successfully repaired: ${results.success}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Total: ${missing.length}\n`);
}

main().catch(console.error);
