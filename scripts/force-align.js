#!/usr/bin/env node

/**
 * FORCE-ALIGN.JS - "THE ALIGNER"
 * Automatically fixes artist name mismatches by aligning MDX files with CSV source of truth
 * 
 * Usage:
 *   npm run force-align             # Dry run (shows what would change)
 *   npm run force-align -- --yes    # Actually write changes
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
// HELPER FUNCTIONS (Copied from audit.js)
// ============================================================================

/**
 * Generate filename slug from artist and title
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Find MDX file matching artist/title (ENHANCED fuzzy match - same as audit.js)
 * @param {string} year - Year string
 * @param {string} artist - Artist name
 * @param {string} title - Song title
 * @returns {string|null} - MDX filename or null if not found
 */
function findMDXFile(year, artist, title) {
  const artistSlug = generateSlug(artist);
  const titleSlug = generateSlug(title);
  const expectedFileName = `${year}-${artistSlug}-${titleSlug}.mdx`;
  const expectedFilePath = path.join(CONTENT_DIR, expectedFileName);
  
  // LEVEL 1: Exact match
  if (fs.existsSync(expectedFilePath)) {
    return expectedFileName;
  }
  
  // LEVEL 2: Fuzzy match with enhanced year tolerance
  try {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx'));
    const yearNum = parseInt(year);
    
    // STRATEGY A: Same year, fuzzy artist/title
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
    
    // STRATEGY B: Year ±1 tolerance + artist match
    const yearTolerantMatches = files.filter(file => {
      const fileYearMatch = file.match(/^(\d{4})-/);
      if (!fileYearMatch) return false;
      
      const fileYear = parseInt(fileYearMatch[1]);
      
      if (Math.abs(fileYear - yearNum) > 1) {
        return false;
      }
      
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
    
    // STRATEGY C: Title-only match (handles artist name parsing errors)
    const titleWords = titleSlug.split('-').filter(w => w.length > 2);
    if (titleWords.length >= 2) {
      const titleOnlyMatches = files.filter(file => {
        const fileYearMatch = file.match(/^(\d{4})-/);
        if (!fileYearMatch) return false;
        
        const fileYear = parseInt(fileYearMatch[1]);
        
        if (Math.abs(fileYear - yearNum) > 1) {
          return false;
        }
        
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

/**
 * Read MDX frontmatter to extract metadata
 * @param {string} filename - MDX filename
 * @returns {object|null} - { frontmatter: {}, rawFrontmatter: string } or null
 */
function readMDXFrontmatter(filename) {
  try {
    const content = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8');
    
    // Extract frontmatter (between --- markers)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }
    
    const rawFrontmatter = frontmatterMatch[1];
    const frontmatter = {};
    const lines = rawFrontmatter.split('\n');
    
    for (const line of lines) {
      // Match key: value or key: "value"
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        frontmatter[key] = value;
      }
    }
    
    return { frontmatter, rawFrontmatter, fullContent: content };
  } catch (err) {
    console.error(`Error reading MDX file ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Update artist field in MDX frontmatter
 * @param {string} filename - MDX filename
 * @param {string} newArtist - New artist value
 * @param {boolean} dryRun - If true, don't actually write
 * @returns {boolean} - Success
 */
function updateMDXArtist(filename, newArtist, dryRun = true) {
  try {
    const filePath = path.join(CONTENT_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace artist field in frontmatter
    // Match: artist: "value" or artist: value
    const updatedContent = content.replace(
      /^artist:\s*["']?([^"'\n]+)["']?$/m,
      `artist: "${newArtist}"`
    );
    
    if (updatedContent === content) {
      console.error(`   ⚠️  Failed to update ${filename}: artist field not found or already correct`);
      return false;
    }
    
    if (!dryRun) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
    }
    
    return true;
  } catch (err) {
    console.error(`   ❌ Error updating ${filename}: ${err.message}`);
    return false;
  }
}

/**
 * Read CSV file
 */
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
        
        if (!artist || !title) {
          return; // Skip invalid rows
        }
        
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Get all CSV files from data directory
 */
function discoverCSVFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(DATA_DIR);
  
  // Ignore list
  const ignorePatterns = ['result.csv', 'summary.csv', 'missing_report.json', 'MISSING_RECOVERY.csv'];
  
  const csvFiles = files
    .filter(f => {
      if (!/\.csv$/i.test(f)) return false;
      
      const lowerName = f.toLowerCase();
      return !ignorePatterns.some(ignore => lowerName.includes(ignore.toLowerCase()));
    })
    .map(f => path.join(DATA_DIR, f))
    .sort();
  
  return csvFiles;
}

// ============================================================================
// MAIN ALIGNMENT LOGIC
// ============================================================================

async function alignMetadata(dryRun = true) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FORCE-ALIGN v1.0                      ║');
  console.log('║  Metadata Alignment Tool               ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes will be written)' : 'LIVE MODE (will update files)'}\n`);
  
  const csvFiles = discoverCSVFiles();
  
  if (csvFiles.length === 0) {
    console.error('❌ No CSV files found');
    process.exit(1);
  }
  
  console.log(`📂 Found ${csvFiles.length} CSV files to process\n`);
  
  const stats = {
    totalRows: 0,
    foundMDX: 0,
    mismatches: 0,
    fixed: 0,
    errors: 0,
    notFound: 0
  };
  
  const mismatches = [];
  
  // Process each CSV file
  for (const csvPath of csvFiles) {
    const csvFileName = path.basename(csvPath);
    console.log(`📄 Processing: ${csvFileName}`);
    
    const rows = await readCSV(csvPath);
    stats.totalRows += rows.length;
    
    for (const row of rows) {
      const { Artist, Title, Year } = row;
      
      if (!Artist || !Title || !Year) {
        continue;
      }
      
      // Find corresponding MDX file
      const mdxFileName = findMDXFile(Year, Artist, Title);
      
      if (!mdxFileName) {
        stats.notFound++;
        continue;
      }
      
      stats.foundMDX++;
      
      // Read MDX frontmatter
      const mdxData = readMDXFrontmatter(mdxFileName);
      
      if (!mdxData) {
        stats.errors++;
        console.error(`   ❌ Could not read frontmatter: ${mdxFileName}`);
        continue;
      }
      
      const mdxArtist = mdxData.frontmatter.artist;
      
      // Check if artist matches
      if (mdxArtist !== Artist) {
        stats.mismatches++;
        
        const mismatch = {
          csvArtist: Artist,
          mdxArtist: mdxArtist,
          title: Title,
          year: Year,
          file: mdxFileName
        };
        
        mismatches.push(mismatch);
        
        // Attempt to fix
        console.log(`   🔧 MISMATCH: "${Title}"`);
        console.log(`      CSV Artist: "${Artist}"`);
        console.log(`      MDX Artist: "${mdxArtist}"`);
        console.log(`      File: ${mdxFileName}`);
        
        const success = updateMDXArtist(mdxFileName, Artist, dryRun);
        
        if (success) {
          stats.fixed++;
          if (dryRun) {
            console.log(`      ✅ Would fix (use --yes to apply)\n`);
          } else {
            console.log(`      ✅ FIXED!\n`);
          }
        } else {
          stats.errors++;
          console.log(``);
        }
      }
    }
  }
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  ALIGNMENT SUMMARY                     ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log(`📊 Total CSV rows processed: ${stats.totalRows}`);
  console.log(`✅ MDX files found: ${stats.foundMDX}`);
  console.log(`🔍 Mismatches detected: ${stats.mismatches}`);
  console.log(`🔧 Fixed: ${stats.fixed}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`⚠️  MDX not found: ${stats.notFound}\n`);
  
  if (dryRun && stats.mismatches > 0) {
    console.log('💡 This was a DRY RUN. No files were modified.');
    console.log('   To apply changes, run: npm run force-align -- --yes\n');
  } else if (!dryRun && stats.fixed > 0) {
    console.log('🎉 Changes have been written to disk!\n');
    console.log('💡 Recommended next steps:');
    console.log('   1. Run: npm run audit');
    console.log('   2. Check git diff to review changes');
    console.log('   3. Commit if everything looks good\n');
  }
  
  // ============================================================================
  // DETAILED MISMATCH REPORT (First 10)
  // ============================================================================
  
  if (mismatches.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 DETAILED MISMATCH REPORT (First 10):\n');
    
    mismatches.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. ${m.title} (${m.year})`);
      console.log(`   Expected: "${m.csvArtist}"`);
      console.log(`   Found:    "${m.mdxArtist}"`);
      console.log(`   File:     ${m.file}\n`);
    });
    
    if (mismatches.length > 10) {
      console.log(`   ... and ${mismatches.length - 10} more\n`);
    }
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = minimist(process.argv.slice(2));
  const dryRun = !args.yes && !args.y;
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be written');
    console.log('   Use --yes flag to apply changes\n');
  }
  
  try {
    await alignMetadata(dryRun);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
