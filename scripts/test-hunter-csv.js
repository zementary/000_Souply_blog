#!/usr/bin/env node

/**
 * Integration test: Verify hunter.js can correctly parse CSV files
 * This simulates the CSV reading part of hunter.js without actually searching YouTube
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Enhanced readCSV function from hunter.js
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let lineNumber = 0;
    let hasHeaders = false;
    
    fs.createReadStream(filePath)
      .pipe(csv({
        skipEmptyLines: true,
        trim: true,
        relax_column_count: true
      }))
      .on('headers', (headers) => {
        hasHeaders = true;
        console.log(`   📋 CSV Headers: ${headers.join(', ')}`);
        
        const requiredHeaders = ['Artist', 'Title', 'Director', 'Year'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          console.warn(`   ⚠️  Warning: Missing headers: ${missingHeaders.join(', ')}`);
        }
      })
      .on('data', (row) => {
        lineNumber++;
        
        if (!row.Artist || !row.Title) {
          console.warn(`   ⚠️  Line ${lineNumber}: Missing required fields`);
          return;
        }
        
        rows.push(row);
      })
      .on('end', () => {
        console.log(`   ✅ CSV parsed: ${rows.length} valid entries found\n`);
        
        if (rows.length === 0) {
          console.warn(`   ⚠️  Warning: No valid rows found!\n`);
        }
        
        resolve(rows);
      })
      .on('error', (error) => {
        console.error(`   ❌ CSV error:`, error.message);
        reject(error);
      });
  });
}

// Simulate processCSVFile from hunter.js
async function processCSVFile(csvPath, csvFileName) {
  console.log(`\n📂 Loading CSV: ${csvFileName}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const rows = await readCSV(csvPath);
  console.log(`✓ Found ${rows.length} videos to process\n`);
  
  // Display all entries
  console.log(`📊 All entries:\n`);
  rows.forEach((row, i) => {
    console.log(`[${i + 1}/${rows.length}] ${row.Artist} - ${row.Title}`);
    console.log(`   Director: ${row.Director}`);
    console.log(`   Visual Hook: ${row.Visual_Hook || 'N/A'}\n`);
  });
  
  return rows;
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  HUNTER CSV INTEGRATION TEST           ║');
  console.log('║  Verify CSV parsing without API calls ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  // Test 2016.csv specifically
  const csvPath = path.join(DATA_DIR, '2016.csv');
  const csvFileName = '2016.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: ${csvPath} not found`);
    process.exit(1);
  }
  
  try {
    const results = await processCSVFile(csvPath, csvFileName);
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  TEST RESULT: ${results.length === 19 ? 'PASSED ✅' : 'FAILED ❌'.padEnd(25)}║`);
    console.log('╚════════════════════════════════════════╝\n');
    
    if (results.length === 19) {
      console.log(`✅ Expected 19 videos, got ${results.length}`);
      console.log(`✅ All entries parsed correctly\n`);
      process.exit(0);
    } else {
      console.error(`❌ Expected 19 videos, got ${results.length}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);
