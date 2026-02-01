#!/usr/bin/env node

/**
 * Extract MISSING videos from AUDIT_REPORT.md and create a CSV for hunter.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIT_REPORT_PATH = path.join(__dirname, 'AUDIT_REPORT.md');
const OUTPUT_CSV_PATH = path.join(__dirname, '..', 'src', 'data', 'MISSING_RECOVERY.csv');

// Read audit report
const reportContent = fs.readFileSync(AUDIT_REPORT_PATH, 'utf-8');

// Extract MISSING section
const missingSectionMatch = reportContent.match(/## 🔴 MISSING \((\d+)\)([\s\S]*?)(?=\n## |$)/);

if (!missingSectionMatch) {
  console.error('❌ Could not find MISSING section in audit report');
  process.exit(1);
}

const missingCount = parseInt(missingSectionMatch[1]);
const missingText = missingSectionMatch[2];

console.log(`📊 MISSING section reports ${missingCount} videos`);

// Parse entries line by line
const lines = missingText.split('\n');
const entries = [];

let currentEntry = null;

for (const line of lines) {
  const trimmed = line.trim();
  
  // Match ### Artist - Title
  const titleMatch = trimmed.match(/^### (.+?) - (.+)$/);
  if (titleMatch) {
    if (currentEntry && currentEntry.Artist && currentEntry.Title) {
      entries.push(currentEntry);
    }
    currentEntry = {
      Artist: titleMatch[1].trim(),
      Title: titleMatch[2].trim(),
      Director: '',
      Year: '',
      Authority_Signal: 'Missing from audit',
      Visual_Hook: 'To be determined'
    };
    continue;
  }
  
  // Match - **Year:** YYYY
  const yearMatch = trimmed.match(/^- \*\*Year:\*\* (\d{4})$/);
  if (yearMatch && currentEntry) {
    currentEntry.Year = yearMatch[1];
    continue;
  }
  
  // Match - **Director:** Name
  const directorMatch = trimmed.match(/^- \*\*Director:\*\* (.+)$/);
  if (directorMatch && currentEntry) {
    currentEntry.Director = directorMatch[1].trim();
    continue;
  }
}

// Don't forget the last entry
if (currentEntry && currentEntry.Artist && currentEntry.Title) {
  entries.push(currentEntry);
}

console.log(`📋 Found ${entries.length} MISSING videos\n`);

// Generate CSV
const csvHeader = 'Artist,Title,Director,Year,Authority_Signal,Visual_Hook';
const csvRows = entries.map(entry => {
  // Escape fields that contain commas
  const escapeField = (field) => {
    if (field.includes(',') || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };
  
  return [
    escapeField(entry.Artist),
    escapeField(entry.Title),
    escapeField(entry.Director),
    entry.Year,
    escapeField(entry.Authority_Signal),
    escapeField(entry.Visual_Hook)
  ].join(',');
});

const csvContent = [csvHeader, ...csvRows].join('\n');

// Write CSV
fs.writeFileSync(OUTPUT_CSV_PATH, csvContent);

console.log(`✅ Created recovery CSV: ${OUTPUT_CSV_PATH}`);
console.log(`   ${entries.length} videos to process\n`);

// Print first 5 entries
console.log('Preview (first 5):');
entries.slice(0, 5).forEach((entry, i) => {
  console.log(`${i + 1}. ${entry.Artist} - ${entry.Title} (${entry.Year})`);
});

if (entries.length > 5) {
  console.log(`   ... and ${entries.length - 5} more\n`);
}

console.log('\n🚀 Run with: npm run hunter MISSING_RECOVERY\n');
