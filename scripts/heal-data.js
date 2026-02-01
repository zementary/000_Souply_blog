import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestVideo } from './ingest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// HEAL-DATA V1.0 - SMART DATA REPAIR SCRIPT
// ============================================================================
// Automatically identifies and repairs problematic MDX files by re-ingesting
// them with the latest parser logic.
//
// IDENTIFIES:
// - Missing directors (empty string)
// - Dirty directors (containing blacklisted keywords)
// - Too-long directors (> 50 chars, likely parsing errors)
//
// USAGE:
//   node scripts/heal-data.js                  # Heal all problematic files
//   node scripts/heal-data.js --dry-run        # Preview what would be fixed
// ============================================================================

const videosDir = path.join(__dirname, '../src/content/videos');

// Blacklist regex (matches dirty data patterns)
const dirtyPattern = /Assistant|Rep|Producer|Photography|DOP|Editor|Production|Commissioner|Cinematographer|Creative Director/i;

/**
 * Extract YouTube URL from MDX frontmatter
 * @param {string} content - MDX file content
 * @returns {string|null} - YouTube URL or null
 */
function extractYoutubeUrl(content) {
  // Match video_url field (supports both youtube and vimeo)
  const match = content.match(/video_url:\s*["']?(https?:\/\/[^\s"']+)["']?/);
  return match ? match[1] : null;
}

/**
 * Extract director from MDX frontmatter
 * @param {string} content - MDX file content
 * @returns {string} - Director name (empty string if not found)
 */
function extractDirector(content) {
  const match = content.match(/director:\s*["']([^"']*)["']/);
  return match ? match[1] : '';
}

/**
 * Check if a file needs healing
 * @param {string} filePath - Path to MDX file
 * @returns {Object|null} - { file, url, reason } or null if healthy
 */
function diagnoseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const videoUrl = extractYoutubeUrl(content);
  const director = extractDirector(content);

  if (!videoUrl) {
    // Skip files without video URLs (might be drafts)
    return null;
  }

  // DECISION LOGIC: Identify files that need healing
  let reason = null;
  
  if (!director || director.trim() === '') {
    reason = 'MISSING';
  } else if (dirtyPattern.test(director)) {
    reason = 'DIRTY';
  } else if (director.length > 50) {
    reason = 'TOO_LONG';
  }

  if (reason) {
    return {
      file: path.basename(filePath),
      url: videoUrl,
      reason,
      currentDirector: director
    };
  }

  return null;
}

/**
 * Main healing function
 * @param {boolean} dryRun - If true, only show what would be fixed
 */
async function healAllFiles(dryRun = false) {
  console.log('🏥 HEAL-DATA v1.0 - Smart Data Repair Script');
  console.log('================================================\n');

  if (!fs.existsSync(videosDir)) {
    console.error(`❌ Error: Videos directory not found: ${videosDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(videosDir).filter(f => f.endsWith('.mdx'));
  console.log(`📊 Scanning ${files.length} files for issues...\n`);

  // Phase 1: Diagnosis
  const problematicFiles = [];
  
  for (const file of files) {
    const filePath = path.join(videosDir, file);
    const diagnosis = diagnoseFile(filePath);
    
    if (diagnosis) {
      problematicFiles.push(diagnosis);
    }
  }

  // Report findings
  console.log('📋 DIAGNOSIS REPORT');
  console.log('===================');
  
  const byReason = {
    MISSING: problematicFiles.filter(f => f.reason === 'MISSING'),
    DIRTY: problematicFiles.filter(f => f.reason === 'DIRTY'),
    TOO_LONG: problematicFiles.filter(f => f.reason === 'TOO_LONG')
  };

  console.log(`❌ Missing Directors: ${byReason.MISSING.length}`);
  console.log(`🗑️  Dirty Directors: ${byReason.DIRTY.length}`);
  console.log(`📏 Too Long: ${byReason.TOO_LONG.length}`);
  console.log(`✅ Total Healthy Files: ${files.length - problematicFiles.length}`);
  console.log(`\n🎯 TOTAL FILES TO HEAL: ${problematicFiles.length}\n`);

  if (problematicFiles.length === 0) {
    console.log('🎉 All files are healthy! Nothing to fix.');
    return;
  }

  // Show sample of problematic files
  console.log('📄 SAMPLE PROBLEMATIC FILES:');
  console.log('============================');
  
  ['MISSING', 'DIRTY', 'TOO_LONG'].forEach(reason => {
    const samples = byReason[reason].slice(0, 3);
    if (samples.length > 0) {
      console.log(`\n[${reason}]`);
      samples.forEach(f => {
        const preview = f.currentDirector || '(empty)';
        const truncated = preview.length > 50 ? preview.substring(0, 47) + '...' : preview;
        console.log(`  • ${f.file}`);
        console.log(`    Current: "${truncated}"`);
      });
    }
  });

  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No files will be modified.');
    console.log('   Remove --dry-run flag to perform actual healing.');
    return;
  }

  // Phase 2: Healing
  console.log('\n\n💉 STARTING HEALING PROCESS');
  console.log('============================\n');

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < problematicFiles.length; i++) {
    const { file, url, reason, currentDirector } = problematicFiles[i];
    const progress = `[${i + 1}/${problematicFiles.length}]`;
    
    console.log(`${progress} 💉 Healing [${reason}]: ${file}`);
    
    try {
      const result = await ingestVideo(url, { force: true });
      
      if (result.status === 'success') {
        const newDirector = result.credits?.director || '(still missing)';
        console.log(`   ✅ Success! New director: "${newDirector}"`);
        successCount++;
      } else if (result.status === 'skipped') {
        console.log(`   ⚠️  Skipped: ${result.reason}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
    
    // Add small delay to avoid rate limiting
    if (i < problematicFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final Report
  console.log('\n\n📊 HEALING COMPLETE');
  console.log('===================');
  console.log(`✅ Successfully healed: ${successCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`\n🎉 Done! Run the script again to check for remaining issues.\n`);
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    await healAllFiles(dryRun);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
