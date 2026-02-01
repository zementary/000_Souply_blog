#!/usr/bin/env node

/**
 * Test CSV parsing with hunter.js readCSV function
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy of the enhanced readCSV function from hunter.js
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

async function main() {
  console.log('\n🧪 Testing CSV Parsing (hunter.js readCSV function)\n');
  console.log('━'.repeat(60) + '\n');
  
  const testFiles = [
    'src/data/2015.csv',
    'src/data/2016.csv',
    'src/data/2024.csv'
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(__dirname, '..', file);
    const fileName = path.basename(file);
    
    console.log(`📂 Testing: ${fileName}`);
    console.log('─'.repeat(60));
    
    try {
      const rows = await readCSV(filePath);
      
      console.log(`✅ Successfully parsed ${rows.length} entries\n`);
      console.log(`   Sample entries:`);
      rows.slice(0, 3).forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.Artist} - ${row.Title}`);
      });
      
      if (rows.length > 3) {
        console.log(`   ... and ${rows.length - 3} more\n`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to parse ${fileName}:`, error.message);
    }
    
    console.log('');
  }
  
  console.log('━'.repeat(60));
  console.log('✅ CSV parsing test completed\n');
}

main().catch(console.error);
