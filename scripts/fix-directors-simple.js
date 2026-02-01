#!/usr/bin/env node

/**
 * DIRECTOR FIX SCRIPT (Simple Version)
 * Scans all .mdx files and clears incorrect director data
 * Generates a report of files that need re-ingestion
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    }
  }
  
  return content.replace(/^---\n[\s\S]+?\n---/, `---\n${frontmatterText}\n---`);
}

/**
 * Process a single MDX file
 */
function processFile(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(rawContent);
  
  if (!frontmatter) {
    return null;
  }
  
  const currentDirector = frontmatter.director || '';
  
  // Check if director is flagged
  if (!isDirectorFlagged(currentDirector)) {
    return null; // No fix needed
  }
  
  console.log(`\n🔍 FLAGGED: ${path.basename(filePath)}`);
  console.log(`   Old Director: "${currentDirector}"`);
  console.log(`   Video URL: ${frontmatter.video_url || 'N/A'}`);
  
  // Clear the bad director field
  const newContent = updateFrontmatter(rawContent, { director: '' });
  fs.writeFileSync(filePath, newContent, 'utf-8');
  
  console.log(`   ✅ Cleared director field`);
  
  return {
    file: path.basename(filePath),
    artist: frontmatter.artist,
    title: frontmatter.title,
    videoUrl: frontmatter.video_url,
    oldDirector: currentDirector,
  };
}

/**
 * Scan directory and process all MDX files
 */
function scanAndFix(directory) {
  const files = fs.readdirSync(directory);
  const results = [];
  
  for (const file of files) {
    if (!file.endsWith('.mdx')) continue;
    
    const filePath = path.join(directory, file);
    const result = processFile(filePath);
    
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Generate report file
 */
function generateReport(results, outputPath) {
  let report = '# DIRECTOR FIX REPORT\n\n';
  report += `Total files fixed: ${results.length}\n\n`;
  report += '## Files That Need Re-Ingestion\n\n';
  report += 'These files had incorrect director data and have been cleared.\n';
  report += 'You should re-ingest these videos to extract proper metadata.\n\n';
  
  results.forEach(({ file, artist, title, videoUrl, oldDirector }) => {
    report += `### ${file}\n`;
    report += `- **Artist**: ${artist}\n`;
    report += `- **Title**: ${title}\n`;
    report += `- **Video URL**: ${videoUrl}\n`;
    report += `- **Old Director**: "${oldDirector}"\n`;
    report += `\n`;
  });
  
  fs.writeFileSync(outputPath, report, 'utf-8');
  console.log(`\n📄 Report saved to: ${outputPath}\n`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('\n🚀 DIRECTOR FIX SCRIPT (Simple Version) - Starting Audit\n');
console.log('='.repeat(70));

const videosDir = path.join(__dirname, '../src/content/videos');

if (!fs.existsSync(videosDir)) {
  console.error(`❌ Directory not found: ${videosDir}`);
  process.exit(1);
}

const results = scanAndFix(videosDir);

console.log('\n' + '='.repeat(70));
console.log(`\n📊 SUMMARY: ${results.length} files fixed\n`);

if (results.length > 0) {
  console.log('Fixed Files:');
  results.forEach(({ file, oldDirector }) => {
    console.log(`  • ${file}`);
    console.log(`    Cleared: "${oldDirector}"`);
  });
  console.log('');
  
  // Generate report
  const reportPath = path.join(__dirname, '../DIRECTOR_FIX_REPORT.md');
  generateReport(results, reportPath);
}

console.log('✅ Audit Complete\n');
