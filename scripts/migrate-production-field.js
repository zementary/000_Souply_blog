#!/usr/bin/env node

/**
 * MIGRATION SCRIPT: production_company → production
 * 
 * This script:
 * 1. Finds all .mdx files with "production_company" field
 * 2. Renames field to "production"
 * 3. Identifies files with "ordinator" bug that need re-ingestion
 * 
 * Usage:
 *   node scripts/migrate-production-field.js              # Dry run (report only)
 *   node scripts/migrate-production-field.js --apply      # Actually modify files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content', 'videos');
const DRY_RUN = !process.argv.includes('--apply');

console.log('\n╔════════════════════════════════════════╗');
console.log('║  PRODUCTION FIELD MIGRATION            ║');
console.log('╚════════════════════════════════════════╝\n');

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE (no changes will be made)');
  console.log('   Use --apply flag to actually modify files\n');
} else {
  console.log('⚠️  APPLY MODE: Files will be modified!\n');
}

// Get all MDX files
const files = fs.readdirSync(CONTENT_DIR)
  .filter(f => f.endsWith('.mdx'))
  .map(f => path.join(CONTENT_DIR, f));

console.log(`📂 Found ${files.length} MDX files\n`);

// Statistics
let filesWithProductionCompany = 0;
let filesWithOrdinatorBug = 0;
let filesModified = 0;
const ordinatorFiles = [];

// Process each file
for (const filePath of files) {
  const fileName = path.basename(filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Check if file has production_company field
  if (content.includes('production_company:')) {
    filesWithProductionCompany++;
    
    // Check for "ordinator" bug
    const ordinatorMatch = content.match(/production_company:\s*"([^"]*ordinator[^"]*)"/i);
    if (ordinatorMatch) {
      filesWithOrdinatorBug++;
      ordinatorFiles.push({
        file: fileName,
        badValue: ordinatorMatch[1]
      });
      console.log(`🚨 ${fileName}`);
      console.log(`   BAD VALUE: "${ordinatorMatch[1]}"`);
      console.log(`   → Needs re-ingestion with yt-dlp\n`);
    }
    
    // Rename field: production_company → production
    const newContent = content.replace(/production_company:/g, 'production:');
    
    if (newContent !== content) {
      modified = true;
      filesModified++;
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`✅ ${fileName} - Field renamed`);
      } else {
        console.log(`📝 ${fileName} - Would rename field`);
      }
    }
  }
}

// Summary
console.log('\n╔════════════════════════════════════════╗');
console.log('║  MIGRATION SUMMARY                     ║');
console.log('╚════════════════════════════════════════╝\n');

console.log(`📊 Total files scanned: ${files.length}`);
console.log(`🔍 Files with production_company: ${filesWithProductionCompany}`);
console.log(`🚨 Files with "ordinator" bug: ${filesWithOrdinatorBug}`);

if (DRY_RUN) {
  console.log(`📝 Files that would be modified: ${filesModified}`);
} else {
  console.log(`✅ Files actually modified: ${filesModified}`);
}

if (ordinatorFiles.length > 0) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FILES NEEDING RE-INGESTION           ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log('⚠️  The following files have corrupted production data and should be re-ingested:\n');
  
  ordinatorFiles.forEach((item, index) => {
    console.log(`${index + 1}. ${item.file}`);
    console.log(`   Bad value: "${item.badValue}"\n`);
  });
  
  console.log('To re-ingest these files:');
  console.log('1. Extract video URLs from these files');
  console.log('2. Run: node scripts/ingest.js <video_url> --force');
  console.log('3. The new V7.0 parser will correctly extract production credits\n');
}

if (DRY_RUN) {
  console.log('\n💡 To apply changes, run:');
  console.log('   node scripts/migrate-production-field.js --apply\n');
}

console.log('✨ Migration scan complete!\n');
