#!/usr/bin/env node

/**
 * AUDIT.JS - "THE AUDITOR"
 * Data reconciliation script that compares CSV data against MDX files
 * 
 * Usage:
 *   npm run audit                # Full audit of all years
 *   npm run audit -- --year 2024 # Audit specific year
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
const PUBLIC_COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');
const REPORT_PATH = path.join(__dirname, 'AUDIT_REPORT.md');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate filename slug from artist and title
 * Matches the slug generation logic in ingest.js
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Find MDX file matching artist/title (ENHANCED fuzzy match v2.0)
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
    
    // STRATEGY A: Same year, fuzzy artist/title (original logic)
    const partialMatches = files.filter(file => {
      if (!file.startsWith(`${year}-${artistSlug}`)) {
        return false;
      }
      
      // Check if title slug words appear in filename
      const titleWords = titleSlug.split('-').filter(w => w.length > 2);
      const filenameLower = file.toLowerCase();
      
      // Require at least 60% of title words to match
      const matchedWords = titleWords.filter(word => filenameLower.includes(word));
      return matchedWords.length >= Math.ceil(titleWords.length * 0.6);
    });
    
    if (partialMatches.length > 0) {
      return partialMatches[0];
    }
    
    // STRATEGY B: Year ±1 tolerance + artist match (handles CSV year vs release year mismatch)
    const yearTolerantMatches = files.filter(file => {
      // Extract year from filename (YYYY-...)
      const fileYearMatch = file.match(/^(\d{4})-/);
      if (!fileYearMatch) return false;
      
      const fileYear = parseInt(fileYearMatch[1]);
      
      // Allow ±1 year difference
      if (Math.abs(fileYear - yearNum) > 1) {
        return false;
      }
      
      // Check if artist and title match
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
    // Only use this if title is distinctive enough (3+ words)
    const titleWords = titleSlug.split('-').filter(w => w.length > 2);
    if (titleWords.length >= 2) {
      const titleOnlyMatches = files.filter(file => {
        // Extract year from filename
        const fileYearMatch = file.match(/^(\d{4})-/);
        if (!fileYearMatch) return false;
        
        const fileYear = parseInt(fileYearMatch[1]);
        
        // Allow ±1 year difference
        if (Math.abs(fileYear - yearNum) > 1) {
          return false;
        }
        
        // Check if ALL title words appear in filename (strict title match)
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
 * @returns {object|null} - Frontmatter data or null
 */
function readMDXFrontmatter(filename) {
  try {
    const content = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8');
    
    // Extract frontmatter (between --- markers)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }
    
    const frontmatter = {};
    const lines = frontmatterMatch[1].split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*["']?([^"']+?)["']?\s*$/);
      if (match) {
        frontmatter[match[1]] = match[2];
      }
    }
    
    return frontmatter;
  } catch (err) {
    console.error(`Error reading MDX file ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Check if cover image exists and is valid
 * @param {string} year - Year string
 * @param {string} artist - Artist name
 * @param {string} title - Song title
 * @returns {boolean} - True if cover exists and is valid
 */
function checkCoverExists(year, artist, title) {
  const artistSlug = generateSlug(artist);
  const titleSlug = generateSlug(title);
  const coverPath = path.join(PUBLIC_COVERS_DIR, year, `${artistSlug}-${titleSlug}.jpg`);
  
  if (!fs.existsSync(coverPath)) {
    return false;
  }
  
  // Check if file is not empty (> 0 bytes)
  const stats = fs.statSync(coverPath);
  return stats.size > 0;
}

/**
 * Detect suspicious content (Audio, Lyrics, etc.) in title
 * @param {string} title - Video title
 * @returns {string|null} - Reason string or null if clean
 */
function detectSuspiciousContent(title) {
  const suspiciousKeywords = [
    { keyword: 'audio', reason: 'Audio Only' },
    { keyword: 'lyric', reason: 'Lyric Video' },
    { keyword: 'visualizer', reason: 'Visualizer' },
    { keyword: 'behind the scenes', reason: 'BTS' },
    { keyword: 'making of', reason: 'Making Of' },
  ];
  
  const titleLower = title.toLowerCase();
  
  for (const { keyword, reason } of suspiciousKeywords) {
    if (titleLower.includes(keyword)) {
      return reason;
    }
  }
  
  return null;
}

// ============================================================================
// CSV READING
// ============================================================================

/**
 * Read CSV file and return rows
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of row objects
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
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

// ============================================================================
// AUDIT LOGIC
// ============================================================================

/**
 * Audit a single CSV row against MDX files
 * @param {object} row - CSV row data
 * @param {string} year - Year string
 * @returns {object} - Audit result
 */
function auditRow(row, year) {
  const artist = row.Artist || '';
  const title = row.Title || '';
  const director = row.Director || '';
  
  if (!artist || !title) {
    return {
      status: '⚪️ SKIP',
      reason: 'Missing Artist or Title in CSV',
      row: { artist, title, director, year },
      mdxFile: null,
    };
  }
  
  // Check if MDX exists
  const mdxFile = findMDXFile(year, artist, title);
  
  if (!mdxFile) {
    return {
      status: '🔴 MISSING',
      reason: 'No MDX file found (failed search or skipped)',
      row: { artist, title, director, year },
      mdxFile: null,
    };
  }
  
  // Read MDX frontmatter
  const frontmatter = readMDXFrontmatter(mdxFile);
  
  if (!frontmatter) {
    return {
      status: '🔴 MISSING',
      reason: 'MDX file exists but frontmatter is invalid',
      row: { artist, title, director, year },
      mdxFile,
    };
  }
  
  // Check for artist mismatch
  const mdxArtist = frontmatter.artist || '';
  const mdxTitle = frontmatter.title || '';
  
  // Normalize for comparison (case-insensitive)
  const artistMatch = mdxArtist.toLowerCase() === artist.toLowerCase();
  
  if (!artistMatch) {
    // Check if this is a known mapping issue (e.g., "Jungle4eva" vs "Jungle")
    const artistSlugCSV = generateSlug(artist);
    const artistSlugMDX = generateSlug(mdxArtist);
    
    return {
      status: '🟠 MISMATCH',
      reason: `Artist mismatch: CSV="${artist}" vs MDX="${mdxArtist}"`,
      row: { artist, title, director, year },
      mdxFile,
      mdxArtist,
      mdxTitle,
    };
  }
  
  // Check for suspicious content
  const suspiciousReason = detectSuspiciousContent(mdxTitle);
  if (suspiciousReason) {
    return {
      status: '🟡 SUSPICIOUS',
      reason: `Title contains suspicious keyword: ${suspiciousReason}`,
      row: { artist, title, director, year },
      mdxFile,
      mdxArtist,
      mdxTitle,
    };
  }
  
  // Check if cover exists
  const coverExists = checkCoverExists(year, artist, title);
  if (!coverExists) {
    return {
      status: '🟡 SUSPICIOUS',
      reason: 'Cover image missing or corrupted',
      row: { artist, title, director, year },
      mdxFile,
      mdxArtist,
      mdxTitle,
    };
  }
  
  // All checks passed
  return {
    status: '✅ OK',
    reason: 'All checks passed',
    row: { artist, title, director, year },
    mdxFile,
    mdxArtist,
    mdxTitle,
  };
}

/**
 * Audit all CSV files
 * @param {string|null} specificYear - Specific year/filename to audit, or null for all
 * @returns {Promise<Array>} - Array of audit results
 */
async function auditAll(specificYear = null) {
  const results = [];
  
  // ============================================================================
  // CSV FILE DISCOVERY (V8.1 - Support non-year filenames like "The Lost Tapes")
  // ============================================================================
  
  // Blacklist for system/report files
  const BLACKLIST = [
    'result.csv',
    'summary.csv',
    'missing_report.json',
    'MISSING_RECOVERY.csv',
    'final_39_missing.csv',
    'AUDIT_REPORT.md'
  ];
  
  // Find all CSV files (excluding blacklisted)
  const csvFiles = fs.readdirSync(DATA_DIR)
    .filter(f => {
      // Must end with .csv (case-insensitive)
      if (!/\.csv$/i.test(f)) return false;
      
      // Must NOT be in blacklist
      const lowerName = f.toLowerCase();
      return !BLACKLIST.some(blocked => lowerName === blocked.toLowerCase());
    })
    .sort();
  
  for (const csvFile of csvFiles) {
    // Extract "context" from filename (could be year or other identifier)
    // For "2024.csv" -> "2024", for "The Lost Tapes01.csv" -> "The Lost Tapes01"
    const fileContext = path.basename(csvFile, '.csv');
    
    // Skip if specific year/filename requested and this isn't it
    if (specificYear && fileContext !== specificYear) {
      continue;
    }
    
    console.log(`\n📊 Auditing ${csvFile}...`);
    
    const csvPath = path.join(DATA_DIR, csvFile);
    const rows = await readCSV(csvPath);
    
    console.log(`   Found ${rows.length} rows`);
    
    // Use fileContext as "year" for audit purposes
    // (Individual rows may have their own Year column)
    for (const row of rows) {
      // Prefer Year column from CSV if available, fallback to file context
      const yearFromRow = row.Year || fileContext;
      const result = auditRow(row, yearFromRow);
      results.push(result);
    }
  }
  
  return results;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate markdown audit report
 * @param {Array} results - Audit results
 * @returns {string} - Markdown report
 */
function generateReport(results) {
  const timestamp = new Date().toISOString();
  
  // Count by status
  const statusCounts = {
    '✅ OK': 0,
    '🔴 MISSING': 0,
    '🟡 SUSPICIOUS': 0,
    '🟠 MISMATCH': 0,
    '⚪️ SKIP': 0,
  };
  
  results.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  
  let report = `# 📋 AUDIT REPORT\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `**Total Rows:** ${results.length}\n\n`;
  
  report += `## 📊 Summary\n\n`;
  report += `| Status | Count | Percentage |\n`;
  report += `|--------|-------|------------|\n`;
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    const percentage = ((count / results.length) * 100).toFixed(1);
    report += `| ${status} | ${count} | ${percentage}% |\n`;
  });
  
  report += `\n---\n\n`;
  
  // Section 1: MISSING
  const missing = results.filter(r => r.status === '🔴 MISSING');
  if (missing.length > 0) {
    report += `## 🔴 MISSING (${missing.length})\n\n`;
    report += `Videos that exist in CSV but no corresponding MDX file was found.\n\n`;
    
    for (const item of missing) {
      report += `### ${item.row.artist} - ${item.row.title}\n`;
      report += `- **Year:** ${item.row.year}\n`;
      report += `- **Director:** ${item.row.director || 'N/A'}\n`;
      report += `- **Reason:** ${item.reason}\n`;
      report += `- **Action:** Run hunter.js or ingest manually\n\n`;
    }
    
    report += `---\n\n`;
  }
  
  // Section 2: SUSPICIOUS
  const suspicious = results.filter(r => r.status === '🟡 SUSPICIOUS');
  if (suspicious.length > 0) {
    report += `## 🟡 SUSPICIOUS (${suspicious.length})\n\n`;
    report += `Videos that exist but have quality issues (Audio, missing cover, etc.).\n\n`;
    
    for (const item of suspicious) {
      report += `### ${item.row.artist} - ${item.row.title}\n`;
      report += `- **Year:** ${item.row.year}\n`;
      report += `- **MDX File:** \`${item.mdxFile}\`\n`;
      report += `- **Reason:** ${item.reason}\n`;
      report += `- **Action:** Review manually and re-ingest if needed\n\n`;
    }
    
    report += `---\n\n`;
  }
  
  // Section 3: MISMATCH
  const mismatch = results.filter(r => r.status === '🟠 MISMATCH');
  if (mismatch.length > 0) {
    report += `## 🟠 MISMATCH (${mismatch.length})\n\n`;
    report += `Videos where parsed artist name doesn't match expected.\n\n`;
    
    for (const item of mismatch) {
      report += `### ${item.row.artist} - ${item.row.title}\n`;
      report += `- **Year:** ${item.row.year}\n`;
      report += `- **Expected Artist:** \`${item.row.artist}\`\n`;
      report += `- **Parsed Artist:** \`${item.mdxArtist}\`\n`;
      report += `- **MDX File:** \`${item.mdxFile}\`\n`;
      report += `- **Reason:** ${item.reason}\n`;
      report += `- **Action:** Add to KNOWN_MAPPINGS in parser.js or fix manually\n\n`;
    }
    
    report += `---\n\n`;
  }
  
  // Section 4: SKIP
  const skipped = results.filter(r => r.status === '⚪️ SKIP');
  if (skipped.length > 0) {
    report += `## ⚪️ SKIP (${skipped.length})\n\n`;
    report += `Rows that were skipped due to missing data.\n\n`;
    
    for (const item of skipped) {
      report += `- **Year:** ${item.row.year}, **Reason:** ${item.reason}\n`;
    }
    
    report += `\n---\n\n`;
  }
  
  return report;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = minimist(process.argv.slice(2));
  const year = args.year || null;
  
  console.log('🔍 Starting audit...');
  
  if (year) {
    console.log(`   📅 Auditing year: ${year}`);
  } else {
    console.log(`   📅 Auditing all years`);
  }
  
  const results = await auditAll(year);
  
  console.log(`\n✅ Audit complete. Found ${results.length} rows.`);
  
  // Generate report
  const report = generateReport(results);
  
  // Save report
  fs.writeFileSync(REPORT_PATH, report, 'utf-8');
  
  console.log(`\n📄 Report saved to: ${REPORT_PATH}`);
  
  // Print summary to console
  const statusCounts = {
    '✅ OK': 0,
    '🔴 MISSING': 0,
    '🟡 SUSPICIOUS': 0,
    '🟠 MISMATCH': 0,
    '⚪️ SKIP': 0,
  };
  
  results.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  
  console.log('\n📊 Summary:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`   ${status}: ${count}`);
    }
  });
}

main().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
