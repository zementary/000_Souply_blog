#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import csv from 'csv-parser';
import { ingestVideo, checkIfVideoExists, extractVideoId } from './ingest.js';
import { visualHookToTags } from './visual-hook-to-tags.js';

// Import modular components
import { setupProxy } from './lib/proxy.js';
import { HybridSearcher } from './lib/search.js';

// Setup proxy (Anti-Block Layer)
setupProxy();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Smart jitter: randomized delay (2-7 seconds)
const RATE_LIMIT_MIN = 2000;
const RATE_LIMIT_MAX = 7000;

/**
 * Get randomized delay in milliseconds (Behavior Layer - Anti-Bot Detection)
 */
function getRandomDelay() {
  return Math.floor(Math.random() * (RATE_LIMIT_MAX - RATE_LIMIT_MIN + 1)) + RATE_LIMIT_MIN;
}

// ============================================================================
// HYBRID SEARCH ENGINE (YouTube + Vimeo Fallback)
// ============================================================================

// Initialize hybrid searcher
const searcher = new HybridSearcher({ verbose: true });

/**
 * Search for video using HybridSearcher (YouTube → Vimeo fallback)
 * V8.0 - "THE GATEKEEPER": Now uses director injection for more accurate results
 * V8.1 - Smart exemption: Auto-allows keywords from user's target title
 * @param {string} artist - Artist name
 * @param {string} title - Song title
 * @param {string} director - Director name (optional, will be injected into search)
 * @param {string} targetTitle - User's original requested title from CSV (for smart exemptions)
 * @returns {Promise<object|null>} searchResult or null
 */
async function searchVideo(artist, title, director, targetTitle = null) {
  console.log(`🔍 [Hybrid Search] Artist: "${artist}", Title: "${title}"`);
  if (director) {
    console.log(`   🎬 [GATEKEEPER] Director: "${director}" (will be injected)`);
  }
  
  // Use HybridSearcher with metadata-based search (enables director injection)
  const result = await searcher.searchByMetadata({
    artist,
    title,
    director: director || null,
    targetTitle: targetTitle || title, // Pass user's original title for smart exemptions
    allowedKeywords: [] // Use strict filtering (but auto-exemptions will apply)
  });
  
  if (result) {
    console.log(`   ✓ Found on ${result.platform.toUpperCase()}: "${result.title}"`);
    console.log(`   ↗ URL: ${result.url}`);
  } else {
    console.log(`   ✗ Not found on YouTube OR Vimeo`);
  }
  
  return result;
}

// ============================================================================
// CSV PROCESSING
// ============================================================================

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let lineNumber = 0;
    let hasHeaders = false;
    
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({
        skipEmptyLines: true,           // Skip empty lines
        trim: true,                     // Trim whitespace from fields
        relax_column_count: true,       // Allow varying column counts
        mapHeaders: ({ header }) => header.trim(), // Trim header names
        mapValues: ({ value }) => value.trim()     // Trim all values
      }))
      .on('headers', (headers) => {
        hasHeaders = true;
        console.log(`   📋 CSV Headers: ${headers.join(', ')}`);
        
        // Validate required headers
        const requiredHeaders = ['Artist', 'Title', 'Director', 'Year'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          console.warn(`   ⚠️  Warning: Missing headers: ${missingHeaders.join(', ')}`);
        }
      })
      .on('data', (row) => {
        lineNumber++;
        
        // Debug: Log first row to see structure
        if (lineNumber === 1) {
          console.log(`   🔍 Debug - First row keys:`, Object.keys(row));
          console.log(`   🔍 Debug - First row values:`, row);
        }
        
        // Validate required fields (trim to handle potential whitespace)
        const artist = row.Artist?.trim();
        const title = row.Title?.trim();
        
        if (!artist || !title) {
          console.warn(`   ⚠️  Line ${lineNumber}: Missing required fields (Artist: "${artist}", Title: "${title}")`);
          return; // Skip invalid rows
        }
        
        // CRITICAL: Attach CSV line number to row for traceability
        row.__csvLineNumber = lineNumber + 1; // +1 to account for header row
        
        rows.push(row);
      })
      .on('end', () => {
        console.log(`   ✅ CSV parsed: ${rows.length} valid entries found\n`);
        
        if (rows.length === 0) {
          console.warn(`   ⚠️  Warning: No valid rows found in CSV file!`);
        }
        
        resolve(rows);
      })
      .on('error', (error) => {
        console.error(`   ❌ CSV parsing error at line ${lineNumber}:`, error.message);
        reject(error);
      });
  });
}

// ============================================================================
// JUNK FILTER (THE BOUNCER) - STRICT BLOCKLIST
// ============================================================================

const BLOCKLIST = [
  'highlight',
  'highlights',
  'compilation',
  'best of',
  'teaser',
  'trailer',
  'react',
  'reacts',
  'reaction',
  'review',
  'behind the scene',
  'behind the scenes',
  'making of',
  'making-of',
  'makingof',
  'interview',
  'documentary',
  'awards ceremony',
  'music video awards',
  'award winner',
  'best director',
  'best music video',
  'live performance',
  'concert',
  'recap',
  'preview',
  'announcement',
  'mashup',
  'mix',
  'remix collection',
  'playlist',
  'top 10',
  'top 5'
];

function isJunkVideo(title) {
  const lowerTitle = title.toLowerCase();
  const matched = BLOCKLIST.some(keyword => lowerTitle.includes(keyword));
  
  if (matched) {
    const matchedKeyword = BLOCKLIST.find(keyword => lowerTitle.includes(keyword));
    console.log(`   🚨 Matched blocklist keyword: "${matchedKeyword}"`);
  }
  
  return matched;
}

// ============================================================================
// HUNTER WORKFLOW
// ============================================================================

async function huntAndIngest(row, index, total, missingReport) {
  const { Artist, Title, Director, Year, Authority_Signal, Visual_Hook, __csvLineNumber } = row;
  
  // Display CSV line number for traceability
  const lineInfo = __csvLineNumber ? ` [CSV Line ${__csvLineNumber}]` : '';
  
  console.log(`\n[${ index + 1 }/${total}]${lineInfo} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📼 Processing: ${Artist} - ${Title}`);
  console.log(`   Director: ${Director}`);
  console.log(`   🏆 Authority: ${Authority_Signal}`);
  console.log(`   🎨 Visual Hook: ${Visual_Hook}`);
  
  try {
    let searchResult;
    
    // ============================================================================
    // TASK 2: HYBRID CSV LOGIC - Check for Target_URL column
    // ============================================================================
    
    // Check if Target_URL column exists (case-insensitive)
    const targetUrlKey = Object.keys(row).find(key => key.toLowerCase() === 'target_url');
    const targetUrl = targetUrlKey ? row[targetUrlKey]?.trim() : null;
    
    if (targetUrl && targetUrl.length > 0) {
      // BRANCH A: Manual URL provided - Skip search
      console.log(`   🎯 Using manual URL: ${targetUrl}`);
      
      // Detect platform from URL
      let platform = 'youtube'; // default
      if (targetUrl.includes('vimeo.com')) {
        platform = 'vimeo';
      }
      
      // Create searchResult object to maintain compatibility with rest of flow
      searchResult = {
        url: targetUrl,
        platform: platform,
        title: `${Artist} - ${Title}` // Use CSV metadata as title
      };
      
      console.log(`   ✓ Platform detected: ${platform.toUpperCase()}`);
    } else {
      // BRANCH B: No manual URL - Use Hybrid Search
      console.log(`   🔍 No manual URL found, using Hybrid Search...`);
      searchResult = await searchVideo(Artist, Title, Director, Title); // Pass original CSV title
      
      if (!searchResult) {
        console.log(`   ⚠ NOT FOUND on YouTube OR Vimeo`);
        
        // Add to missing report
        missingReport.push({
          artist: Artist,
          title: Title,
          director: Director,
          year: Year,
          visual_hook: Visual_Hook,
          timestamp: new Date().toISOString()
        });
        
        return { 
          status: 'search_failed', 
          artist: Artist, 
          title: Title,
          platforms_searched: ['youtube', 'vimeo']
        };
      }
    }
    
    // Step 2: Junk Filter - Check if video title contains blacklisted keywords
    // (Skip junk filter if manual URL is provided)
    if (!targetUrl && isJunkVideo(searchResult.title)) {
      console.log(`   🚫 Skipping Junk Video: "${searchResult.title}"`);
      return { 
        status: 'junk_filtered', 
        artist: Artist, 
        title: Title, 
        videoTitle: searchResult.title,
        platform: searchResult.platform
      };
    }
    
    // Step 3: Check if already exists
    const videoId = extractVideoId(searchResult.url);
    const existingFile = checkIfVideoExists(videoId);
    
    if (existingFile) {
      console.log(`   ⏭  Skipping: Already exists in ${existingFile}`);
      return { 
        status: 'already_exists', 
        artist: Artist, 
        title: Title, 
        file: existingFile,
        platform: searchResult.platform
      };
    }
    
    // Step 4: Prepare injection options (convert Visual_Hook to taxonomy tags)
    const taxonomyTags = visualHookToTags(Visual_Hook);
    const options = {
      additionalTags: taxonomyTags
    };
    
    console.log(`   🏷️  Tags: ${JSON.stringify(taxonomyTags)}`);
    
    // Step 5: Ingest with metadata injection (pass searchResult object)
    console.log(`   📥 Ingesting from ${searchResult.platform.toUpperCase()}...`);
    await ingestVideo(searchResult, options);
    
    console.log(`   ✅ Successfully ingested!`);
    return { 
      status: 'success', 
      artist: Artist, 
      title: Title,
      platform: searchResult.platform,
      method: targetUrl ? 'manual_url' : 'search'
    };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { status: 'error', artist: Artist, title: Title, error: error.message };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  throw new Error(`Invalid YouTube URL: ${url}`);
}

function slugifyTag(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

function printSummary(results, csvFileName = null) {
  const header = csvFileName 
    ? `SUMMARY: ${csvFileName}`
    : 'HUNTER SUMMARY';
  
  console.log('\n\n╔════════════════════════════════════════╗');
  console.log(`║  ${header.padEnd(38)} ║`);
  console.log('╚════════════════════════════════════════╝\n');
  
  const success = results.filter(r => r.status === 'success').length;
  const searchFailed = results.filter(r => r.status === 'search_failed').length;
  const alreadyExists = results.filter(r => r.status === 'already_exists').length;
  const junkFiltered = results.filter(r => r.status === 'junk_filtered').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  // Platform breakdown
  const youtube = results.filter(r => ['success', 'already_exists'].includes(r.status) && r.platform === 'youtube').length;
  const vimeo = results.filter(r => ['success', 'already_exists'].includes(r.status) && r.platform === 'vimeo').length;
  
  console.log(`✅ Successfully ingested: ${success}`);
  if (youtube > 0 || vimeo > 0) {
    console.log(`   📺 YouTube: ${youtube} | 🎥 Vimeo: ${vimeo}`);
  }
  console.log(`⏭  Already existed: ${alreadyExists}`);
  console.log(`🚫 Junk filtered: ${junkFiltered}`);
  console.log(`⚠  Search failed: ${searchFailed}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Total processed: ${results.length}\n`);
  
  if (junkFiltered > 0) {
    console.log('\n🚫 Videos filtered as junk:');
    results
      .filter(r => r.status === 'junk_filtered')
      .forEach(r => {
        const platformTag = r.platform ? `[${r.platform.toUpperCase()}]` : '';
        console.log(`   - ${r.artist} - ${r.title} ${platformTag}\n      (Found title: "${r.videoTitle}")`);
      });
  }
  
  if (searchFailed > 0) {
    console.log('\n⚠ Videos that could not be found:');
    results
      .filter(r => r.status === 'search_failed')
      .forEach(r => {
        const platforms = r.platforms_searched ? ` (searched: ${r.platforms_searched.join(', ')})` : '';
        console.log(`   - ${r.artist} - ${r.title}${platforms}`);
      });
  }
  
  if (errors > 0) {
    console.log('\n❌ Videos with errors:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`   - ${r.artist} - ${r.title}: ${r.error}`));
  }
}

function printGrandSummary(allResults, processedFiles) {
  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║  GRAND SUMMARY (ALL FILES)             ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log(`📂 Files processed: ${processedFiles.length}`);
  processedFiles.forEach(f => console.log(`   - ${f}`));
  
  console.log('');
  
  const success = allResults.filter(r => r.status === 'success').length;
  const searchFailed = allResults.filter(r => r.status === 'search_failed').length;
  const alreadyExists = allResults.filter(r => r.status === 'already_exists').length;
  const junkFiltered = allResults.filter(r => r.status === 'junk_filtered').length;
  const errors = allResults.filter(r => r.status === 'error').length;
  
  // Platform breakdown
  const youtube = allResults.filter(r => ['success', 'already_exists'].includes(r.status) && r.platform === 'youtube').length;
  const vimeo = allResults.filter(r => ['success', 'already_exists'].includes(r.status) && r.platform === 'vimeo').length;
  
  console.log(`✅ Total successfully ingested: ${success}`);
  console.log(`⏭  Total already existed: ${alreadyExists}`);
  if (youtube > 0 || vimeo > 0) {
    console.log(`   📺 YouTube: ${youtube} | 🎥 Vimeo: ${vimeo}`);
  }
  console.log(`🚫 Total junk filtered: ${junkFiltered}`);
  console.log(`⚠  Total search failed: ${searchFailed}`);
  console.log(`❌ Total errors: ${errors}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Grand Total: ${allResults.length} videos\n`);
}

// ============================================================================
// FILE DISCOVERY
// ============================================================================

/**
 * Get all CSV files from data directory (UPGRADED: accepts any .csv file)
 * @returns {string[]} Array of CSV file paths
 */
function discoverYearCSVFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(DATA_DIR);
  
  // Ignore list: result.csv, summary.csv, missing_report.json
  const ignorePatterns = ['result.csv', 'summary.csv', 'missing_report.json'];
  
  // Filter for ANY .csv file (not in ignore list)
  const csvFiles = files
    .filter(f => {
      // Must end with .csv
      if (!/\.csv$/i.test(f)) return false;
      
      // Must NOT be in ignore list
      const lowerName = f.toLowerCase();
      return !ignorePatterns.some(ignore => lowerName.includes(ignore.toLowerCase()));
    })
    .map(f => path.join(DATA_DIR, f))
    .sort();  // Sort alphabetically
  
  return csvFiles;
}

/**
 * Get CSV path for specific year
 * @param {string|number} year - Year to process
 * @returns {string|null} CSV file path or null if not found
 */
function getCSVPathForYear(year) {
  const fileName = `${year}.csv`;
  const filePath = path.join(DATA_DIR, fileName);
  
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  
  return null;
}

/**
 * Process a single CSV file
 * @param {string} csvPath - Path to CSV file
 * @param {string} csvFileName - Name of CSV file (for logging)
 * @param {Array} missingReport - Array to collect missing videos
 * @returns {Promise<object[]>} Array of results
 */
async function processCSVFile(csvPath, csvFileName, missingReport) {
  console.log(`\n📂 Loading CSV: ${csvFileName}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const rows = await readCSV(csvPath);
  console.log(`✓ Found ${rows.length} videos to process\n`);
  
  const results = [];
  
  for (let i = 0; i < rows.length; i++) {
    const result = await huntAndIngest(rows[i], i, rows.length, missingReport);
    results.push(result);
    
    // Smart rate limiting with jitter (except for last item)
    if (i < rows.length - 1) {
      const delayMs = getRandomDelay();
      const delaySec = (delayMs / 1000).toFixed(1);
      console.log(`   ⏳ Waiting ${delaySec}s (jitter)...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = minimist(process.argv.slice(2));
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  SOUPLY HUNTER v2.0                    ║');
  console.log('║  Multi-Year CSV Batch Processor        ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  let csvFilesToProcess = [];
  
  // ============================================================================
  // ARGUMENT PARSING
  // ============================================================================
  
  // Option 1: Custom file path via --file
  if (args.file) {
    const customPath = path.resolve(args.file);
    if (!fs.existsSync(customPath)) {
      console.error(`❌ Error: CSV file not found at ${customPath}`);
      process.exit(1);
    }
    csvFilesToProcess = [customPath];
    console.log(`📄 Mode: Single custom file\n`);
  }
  // Option 2: Specific year or filename (e.g., npm run hunter 2015 or npm run hunter "The Lost Tapes01")
  else if (args._.length > 0) {
    const yearOrFilename = args._[0];
    let csvPath = getCSVPathForYear(yearOrFilename);
    
    // Try exact filename if year lookup failed
    if (!csvPath) {
      const directPath = path.join(DATA_DIR, `${yearOrFilename}.csv`);
      if (fs.existsSync(directPath)) {
        csvPath = directPath;
      }
    }
    
    if (!csvPath) {
      console.error(`❌ Error: CSV file "${yearOrFilename}" not found`);
      console.error(`   Expected location: ${DATA_DIR}/${yearOrFilename}.csv\n`);
      const availableFiles = discoverYearCSVFiles();
      if (availableFiles.length > 0) {
        console.log('Available CSV files:');
        availableFiles.forEach(f => {
          const fileName = path.basename(f, '.csv');
          console.log(`   - ${fileName}`);
        });
      } else {
        console.log('No CSV files found in data directory.');
      }
      console.log('');
      process.exit(1);
    }
    
    csvFilesToProcess = [csvPath];
    console.log(`📄 Mode: Single file (${path.basename(csvPath, '.csv')})\n`);
  }
  // Option 3: Auto-discover all year CSV files (default)
  else {
    csvFilesToProcess = discoverYearCSVFiles();
    
    if (csvFilesToProcess.length === 0) {
      console.error(`❌ Error: No year CSV files found in ${DATA_DIR}`);
      console.log('\nExpected format: YYYY.csv (e.g., 2015.csv, 2024.csv)');
      process.exit(1);
    }
    
    console.log(`📄 Mode: Auto-scan (found ${csvFilesToProcess.length} files)\n`);
    csvFilesToProcess.forEach(f => {
      console.log(`   - ${path.basename(f)}`);
    });
    console.log('');
  }
  
  // ============================================================================
  // PROCESSING
  // ============================================================================
  
  try {
    const allResults = [];
    const processedFiles = [];
    const missingReport = []; // Collect videos not found on any platform
    
    for (let fileIndex = 0; fileIndex < csvFilesToProcess.length; fileIndex++) {
      const csvPath = csvFilesToProcess[fileIndex];
      const csvFileName = path.basename(csvPath);
      
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📂 Processing File ${fileIndex + 1}/${csvFilesToProcess.length}: ${csvFileName}`);
      console.log(`${'═'.repeat(60)}`);
      
      const results = await processCSVFile(csvPath, csvFileName, missingReport);
      allResults.push(...results);
      processedFiles.push(csvFileName);
      
      // Print summary for this file
      printSummary(results, csvFileName);
      
      // Wait between files (if processing multiple)
      if (fileIndex < csvFilesToProcess.length - 1) {
        console.log(`\n⏸️  Pausing 5 seconds before next file...\n`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // ============================================================================
    // GRAND SUMMARY (if multiple files)
    // ============================================================================
    
    if (csvFilesToProcess.length > 1) {
      printGrandSummary(allResults, processedFiles);
    }
    
    // ============================================================================
    // MISSING REPORT (Save to JSON)
    // ============================================================================
    
    if (missingReport.length > 0) {
      const missingReportPath = path.join(DATA_DIR, 'missing_report.json');
      
      // Load existing report if it exists
      let existingReport = [];
      if (fs.existsSync(missingReportPath)) {
        try {
          existingReport = JSON.parse(fs.readFileSync(missingReportPath, 'utf-8'));
        } catch (e) {
          console.warn('⚠️  Could not read existing missing_report.json, creating new one.');
        }
      }
      
      // Merge with existing report (avoid duplicates by checking artist+title)
      const mergedReport = [...existingReport];
      for (const newEntry of missingReport) {
        const isDuplicate = existingReport.some(
          existing => existing.artist === newEntry.artist && existing.title === newEntry.title
        );
        if (!isDuplicate) {
          mergedReport.push(newEntry);
        }
      }
      
      // Save merged report
      fs.writeFileSync(missingReportPath, JSON.stringify(mergedReport, null, 2));
      
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║  MISSING VIDEOS REPORT                 ║');
      console.log('╚════════════════════════════════════════╝\n');
      console.log(`📝 ${missingReport.length} video(s) not found on YouTube OR Vimeo`);
      console.log(`💾 Saved to: ${missingReportPath}\n`);
      
      missingReport.forEach((entry, i) => {
        console.log(`${i + 1}. ${entry.artist} - ${entry.title}`);
        console.log(`   Director: ${entry.director}`);
        console.log(`   Visual Hook: ${entry.visual_hook}\n`);
      });
    }
    
    console.log('✨ All done!\n');
    
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
