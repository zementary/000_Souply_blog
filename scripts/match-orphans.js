#!/usr/bin/env node

/**
 * MATCH-ORPHANS.JS - "THE CONNECTOR"
 * Finds orphaned MDX files and links them to missing CSV entries by renaming
 * 
 * Usage:
 *   npm run match-orphans           # Dry run (shows what would change)
 *   npm run match-orphans -- --yes  # Actually rename files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import minimist from 'minimist';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content', 'videos');

// ============================================================================
// HELPER FUNCTIONS (from audit.js)
// ============================================================================

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function findMDXFile(year, artist, title) {
  const artistSlug = generateSlug(artist);
  const titleSlug = generateSlug(title);
  const expectedFileName = `${year}-${artistSlug}-${titleSlug}.mdx`;
  const expectedFilePath = path.join(CONTENT_DIR, expectedFileName);
  
  if (fs.existsSync(expectedFilePath)) {
    return expectedFileName;
  }
  
  try {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx'));
    const yearNum = parseInt(year);
    
    // Same fuzzy logic as audit.js
    const partialMatches = files.filter(file => {
      if (!file.startsWith(`${year}-${artistSlug}`)) {
        return false;
      }
      
      const titleWords = titleSlug.split('-').filter(w => w.length > 2);
      const filenameLower = file.toLowerCase();
      const matchedWords = titleWords.filter(word => filenameLower.includes(word));
      return matchedWords.length >= Math.ceil(titleWords.length * 0.6);
    });
    
    if (partialMatches.length > 0) {
      return partialMatches[0];
    }
    
    const yearTolerantMatches = files.filter(file => {
      const fileYearMatch = file.match(/^(\d{4})-/);
      if (!fileYearMatch) return false;
      
      const fileYear = parseInt(fileYearMatch[1]);
      if (Math.abs(fileYear - yearNum) > 1) return false;
      
      const filenameLower = file.toLowerCase();
      const artistMatch = filenameLower.includes(artistSlug);
      
      const titleWords = titleSlug.split('-').filter(w => w.length > 2);
      const matchedWords = titleWords.filter(word => filenameLower.includes(word));
      const titleMatch = matchedWords.length >= Math.ceil(titleWords.length * 0.6);
      
      return artistMatch && titleMatch;
    });
    
    if (yearTolerantMatches.length > 0) {
      return yearTolerantMatches[0];
    }
    
    const titleWords = titleSlug.split('-').filter(w => w.length > 2);
    if (titleWords.length >= 2) {
      const titleOnlyMatches = files.filter(file => {
        const fileYearMatch = file.match(/^(\d{4})-/);
        if (!fileYearMatch) return false;
        
        const fileYear = parseInt(fileYearMatch[1]);
        if (Math.abs(fileYear - yearNum) > 1) return false;
        
        const filenameLower = file.toLowerCase();
        const allTitleWordsMatch = titleWords.every(word => filenameLower.includes(word));
        
        return allTitleWordsMatch;
      });
      
      if (titleOnlyMatches.length > 0) {
        return titleOnlyMatches[0];
      }
    }
    
  } catch (err) {
    console.error(`Error scanning content directory: ${err.message}`);
  }
  
  return null;
}

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({
        skipEmptyLines: true,
        trim: true,
        relax_column_count: true,
        mapHeaders: ({ header }) => header.trim(),
        mapValues: ({ value }) => value.trim()
      }))
      .on('data', (row) => {
        const artist = row.Artist?.trim();
        const title = row.Title?.trim();
        
        if (!artist || !title) return;
        rows.push(row);
      })
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });
}

function discoverCSVFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];
  
  const files = fs.readdirSync(DATA_DIR);
  const ignorePatterns = ['result.csv', 'summary.csv', 'missing_report.json', 'MISSING_RECOVERY.csv', 'final_39_missing.csv'];
  
  return files
    .filter(f => {
      if (!/\.csv$/i.test(f)) return false;
      const lowerName = f.toLowerCase();
      return !ignorePatterns.some(ignore => lowerName.includes(ignore.toLowerCase()));
    })
    .map(f => path.join(DATA_DIR, f))
    .sort();
}

// ============================================================================
// STEP 1: IDENTIFY MATCHED AND ORPHAN FILES
// ============================================================================

async function identifyOrphans() {
  console.log('🔍 Step 1: Identifying matched and orphan files...\n');
  
  // Get all MDX files
  const allFiles = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.mdx'))
    .sort();
  
  console.log(`   📁 Total MDX files: ${allFiles.length}`);
  
  // Get all CSV files and find which MDX files are matched
  const csvFiles = discoverCSVFiles();
  const matchedFiles = new Set();
  
  for (const csvPath of csvFiles) {
    const rows = await readCSV(csvPath);
    
    for (const row of rows) {
      const { Artist, Title, Year } = row;
      if (!Artist || !Title || !Year) continue;
      
      const mdxFileName = findMDXFile(Year, Artist, Title);
      if (mdxFileName) {
        matchedFiles.add(mdxFileName);
      }
    }
  }
  
  console.log(`   ✅ Matched files: ${matchedFiles.size}`);
  
  // Orphans = All files - Matched files
  const orphans = allFiles.filter(f => !matchedFiles.has(f));
  console.log(`   🔗 Orphan files: ${orphans.length}\n`);
  
  return { allFiles, matchedFiles, orphans };
}

// ============================================================================
// STEP 2: MATCH ORPHANS TO MISSING ENTRIES
// ============================================================================

function fuzzyMatchOrphan(orphanFile, csvArtist, csvTitle, csvYear) {
  const orphanLower = orphanFile.toLowerCase();
  const titleSlug = generateSlug(csvTitle);
  const artistSlug = generateSlug(csvArtist);
  const yearStr = String(csvYear);
  
  // Extract year from orphan filename
  const orphanYearMatch = orphanFile.match(/^(\d{4})-/);
  if (!orphanYearMatch) return false;
  
  const orphanYear = orphanYearMatch[1];
  
  // Year must match or be within ±1
  if (Math.abs(parseInt(orphanYear) - parseInt(yearStr)) > 1) {
    return false;
  }
  
  // Title words must appear in orphan filename
  const titleWords = titleSlug.split('-').filter(w => w.length > 2);
  
  if (titleWords.length === 0) {
    // If no meaningful title words, try exact artist + title match
    return orphanLower.includes(artistSlug) && orphanLower.includes(titleSlug);
  }
  
  // Check if ALL title words appear in orphan (strict)
  const allTitleWordsMatch = titleWords.every(word => orphanLower.includes(word));
  
  // Check if artist slug appears
  const artistMatch = orphanLower.includes(artistSlug);
  
  // Match if: (All title words + artist) OR (All title words + similar year)
  return allTitleWordsMatch && (artistMatch || Math.abs(parseInt(orphanYear) - parseInt(yearStr)) === 0);
}

async function matchOrphansToMissing(orphans) {
  console.log('🎯 Step 2: Matching orphans to missing entries...\n');
  
  const missingCSVPath = path.join(DATA_DIR, 'final_39_missing.csv');
  
  if (!fs.existsSync(missingCSVPath)) {
    console.error(`❌ Error: ${missingCSVPath} not found`);
    console.log(`   Run the previous script to generate this file first.\n`);
    return [];
  }
  
  const missingRows = await readCSV(missingCSVPath);
  console.log(`   📋 Missing entries to match: ${missingRows.length}`);
  
  // Try to infer year from CSV filenames or use default
  const matches = [];
  
  for (const missing of missingRows) {
    const { Artist, Title } = missing;
    
    // Try to find year from original CSV files
    let year = null;
    const csvFiles = discoverCSVFiles();
    
    for (const csvPath of csvFiles) {
      const rows = await readCSV(csvPath);
      const found = rows.find(r => r.Artist === Artist && r.Title === Title);
      if (found && found.Year) {
        year = found.Year;
        break;
      }
    }
    
    if (!year) {
      console.log(`   ⚠️  No year found for: ${Artist} - ${Title}, skipping...`);
      continue;
    }
    
    // Search through orphans for a match
    for (const orphan of orphans) {
      if (fuzzyMatchOrphan(orphan, Artist, Title, year)) {
        matches.push({
          orphan,
          csvArtist: Artist,
          csvTitle: Title,
          csvYear: year
        });
        break; // Only match once per missing entry
      }
    }
  }
  
  console.log(`   🔗 Found ${matches.length} orphan-to-missing matches\n`);
  
  return matches;
}

// ============================================================================
// STEP 3: RENAME AND UPDATE FILES
// ============================================================================

function readMDXFrontmatter(filename) {
  try {
    const content = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;
    
    return { fullContent: content, rawFrontmatter: frontmatterMatch[1] };
  } catch (err) {
    console.error(`Error reading ${filename}: ${err.message}`);
    return null;
  }
}

function updateFrontmatter(content, newArtist, newTitle) {
  let updated = content;
  
  // Update artist
  updated = updated.replace(
    /^artist:\s*["']?([^"'\n]+)["']?$/m,
    `artist: "${newArtist}"`
  );
  
  // Update title
  updated = updated.replace(
    /^title:\s*["']?([^"'\n]+)["']?$/m,
    `title: "${newTitle}"`
  );
  
  return updated;
}

function renameAndUpdate(match, dryRun = true) {
  const { orphan, csvArtist, csvTitle, csvYear } = match;
  
  const artistSlug = generateSlug(csvArtist);
  const titleSlug = generateSlug(csvTitle);
  const newFileName = `${csvYear}-${artistSlug}-${titleSlug}.mdx`;
  
  const oldPath = path.join(CONTENT_DIR, orphan);
  const newPath = path.join(CONTENT_DIR, newFileName);
  
  console.log(`   🔗 MATCH FOUND:`);
  console.log(`      Orphan: ${orphan}`);
  console.log(`      CSV: ${csvArtist} - ${csvTitle} (${csvYear})`);
  console.log(`      New filename: ${newFileName}`);
  
  // Check if target filename already exists
  if (fs.existsSync(newPath) && newPath !== oldPath) {
    console.log(`      ⚠️  Target file already exists, skipping...\n`);
    return { success: false, reason: 'target_exists' };
  }
  
  // Read and update frontmatter
  const mdxData = readMDXFrontmatter(orphan);
  if (!mdxData) {
    console.log(`      ❌ Failed to read frontmatter, skipping...\n`);
    return { success: false, reason: 'read_error' };
  }
  
  const updatedContent = updateFrontmatter(mdxData.fullContent, csvArtist, csvTitle);
  
  if (!dryRun) {
    try {
      // Write updated content
      fs.writeFileSync(oldPath, updatedContent, 'utf-8');
      
      // Rename file if needed
      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
      }
      
      console.log(`      ✅ LINKED!\n`);
      return { success: true, oldName: orphan, newName: newFileName };
    } catch (err) {
      console.log(`      ❌ Error: ${err.message}\n`);
      return { success: false, reason: 'write_error', error: err.message };
    }
  } else {
    console.log(`      ✅ Would link (use --yes to apply)\n`);
    return { success: true, dryRun: true, oldName: orphan, newName: newFileName };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = minimist(process.argv.slice(2));
  const dryRun = !args.yes && !args.y;
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  MATCH-ORPHANS v1.0                    ║');
  console.log('║  Orphan File Connector                 ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes will be written)' : 'LIVE MODE (will rename files)'}\n`);
  
  try {
    // Step 1: Find orphans
    const { orphans } = await identifyOrphans();
    
    if (orphans.length === 0) {
      console.log('✨ No orphan files found! All files are matched to CSV entries.\n');
      return;
    }
    
    // Step 2: Match orphans to missing entries
    const matches = await matchOrphansToMissing(orphans);
    
    if (matches.length === 0) {
      console.log('⚠️  No matches found between orphans and missing entries.\n');
      console.log('💡 Orphans might be:');
      console.log('   - Test files');
      console.log('   - Manually created files not in CSV');
      console.log('   - Files with very different naming\n');
      return;
    }
    
    // Step 3: Rename and update
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔗 LINKING ORPHANS:\n');
    
    const results = matches.map(match => renameAndUpdate(match, dryRun));
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║  SUMMARY                               ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const successful = results.filter(r => r.success && !r.dryRun).length;
    const wouldLink = results.filter(r => r.success && r.dryRun).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`📊 Total matches found: ${matches.length}`);
    
    if (dryRun) {
      console.log(`✅ Would link: ${wouldLink}`);
    } else {
      console.log(`✅ Successfully linked: ${successful}`);
    }
    
    console.log(`❌ Failed/Skipped: ${failed}\n`);
    
    if (dryRun && wouldLink > 0) {
      console.log('💡 This was a DRY RUN. No files were modified.');
      console.log('   To apply changes, run: npm run match-orphans -- --yes\n');
    } else if (!dryRun && successful > 0) {
      console.log('🎉 Files have been linked!\n');
      console.log('💡 Recommended next steps:');
      console.log('   1. Run: npm run audit');
      console.log('   2. Check if MISSING count decreased');
      console.log('   3. Review git diff to verify changes\n');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
