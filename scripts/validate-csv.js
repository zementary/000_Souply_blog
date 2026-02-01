#!/usr/bin/env node

/**
 * CSV Validation Tool
 * Validates CSV files for hunter.js compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Required fields for video entries
const REQUIRED_FIELDS = ['Artist', 'Title', 'Director', 'Year'];
const OPTIONAL_FIELDS = ['Authority_Signal', 'Visual_Hook'];

/**
 * Validate a single CSV file
 */
async function validateCSV(filePath) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    let lineNumber = 0;
    let headerCount = 0;
    const rows = [];
    const errors = [];
    const warnings = [];
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Validating: ${fileName}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}\n`);
      return resolve({ valid: false, errors: ['File not found'] });
    }
    
    // Check file size
    const stats = fs.statSync(filePath);
    console.log(`📊 File size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      console.error(`❌ File is empty\n`);
      return resolve({ valid: false, errors: ['File is empty'] });
    }
    
    // Check encoding and line endings
    const buffer = fs.readFileSync(filePath);
    const lfCount = buffer.filter(b => b === 0x0a).length; // \n
    const crCount = buffer.filter(b => b === 0x0d).length; // \r
    const crlfCount = buffer.toString('binary').split('\r\n').length - 1;
    
    console.log(`📋 Line endings:`);
    console.log(`   - LF (\\n): ${lfCount}`);
    console.log(`   - CR (\\r): ${crCount}`);
    console.log(`   - CRLF (\\r\\n): ${crlfCount}`);
    
    if (crCount > 0 && crlfCount === 0) {
      warnings.push('File uses old Mac (CR) line endings. Consider converting to Unix (LF).');
    }
    
    fs.createReadStream(filePath)
      .pipe(csv({ skipEmptyLines: true, trim: true }))
      .on('headers', (headers) => {
        headerCount = headers.length;
        console.log(`\n✅ Headers detected (${headerCount} columns):`);
        headers.forEach((h, i) => console.log(`   ${i + 1}. ${h}`));
        
        // Check for required headers
        const missingHeaders = REQUIRED_FIELDS.filter(f => !headers.includes(f));
        if (missingHeaders.length > 0) {
          errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        }
        
        // Check for unexpected headers
        const expectedHeaders = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
        const unexpectedHeaders = headers.filter(h => !expectedHeaders.includes(h));
        if (unexpectedHeaders.length > 0) {
          warnings.push(`Unexpected headers: ${unexpectedHeaders.join(', ')}`);
        }
      })
      .on('data', (row) => {
        lineNumber++;
        
        // Validate required fields
        const missingFields = REQUIRED_FIELDS.filter(f => !row[f] || row[f].trim() === '');
        if (missingFields.length > 0) {
          errors.push(`Line ${lineNumber}: Missing ${missingFields.join(', ')}`);
        }
        
        // Check column count
        const rowFieldCount = Object.keys(row).length;
        if (rowFieldCount !== headerCount) {
          warnings.push(`Line ${lineNumber}: Column count mismatch (expected ${headerCount}, got ${rowFieldCount})`);
        }
        
        rows.push(row);
      })
      .on('end', () => {
        console.log(`\n📊 Parsing Results:`);
        console.log(`   - Valid rows: ${rows.length}`);
        console.log(`   - Errors: ${errors.length}`);
        console.log(`   - Warnings: ${warnings.length}`);
        
        if (errors.length > 0) {
          console.log(`\n❌ Errors:\n`);
          errors.forEach(err => console.log(`   - ${err}`));
        }
        
        if (warnings.length > 0) {
          console.log(`\n⚠️  Warnings:\n`);
          warnings.forEach(warn => console.log(`   - ${warn}`));
        }
        
        if (rows.length > 0) {
          console.log(`\n✅ Sample entries:\n`);
          rows.slice(0, 3).forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.Artist} - ${row.Title} (${row.Year})`);
          });
          if (rows.length > 3) {
            console.log(`   ... and ${rows.length - 3} more`);
          }
        }
        
        const isValid = errors.length === 0 && rows.length > 0;
        console.log(`\n${'='.repeat(60)}`);
        console.log(isValid ? `✅ Validation PASSED` : `❌ Validation FAILED`);
        console.log(`${'='.repeat(60)}\n`);
        
        resolve({
          valid: isValid,
          rowCount: rows.length,
          errors,
          warnings
        });
      })
      .on('error', (error) => {
        console.error(`\n❌ CSV parsing error:`, error.message);
        reject(error);
      });
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
CSV Validation Tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage:
  npm run validate-csv <file>        Validate a specific CSV file
  npm run validate-csv --all         Validate all CSV files in src/data/

Examples:
  npm run validate-csv src/data/2016.csv
  npm run validate-csv --all
`);
    process.exit(0);
  }
  
  let filesToValidate = [];
  
  if (args[0] === '--all') {
    // Validate all CSV files in data directory
    const dataDir = path.join(__dirname, '..', 'src', 'data');
    const files = fs.readdirSync(dataDir)
      .filter(f => /^\d{4}\.csv$/.test(f))
      .map(f => path.join(dataDir, f));
    filesToValidate = files;
  } else {
    // Validate specific file
    const filePath = path.resolve(args[0]);
    filesToValidate = [filePath];
  }
  
  console.log(`\n🔍 CSV Validation Tool`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`Files to validate: ${filesToValidate.length}\n`);
  
  const results = [];
  
  for (const file of filesToValidate) {
    try {
      const result = await validateCSV(file);
      results.push({ file: path.basename(file), ...result });
    } catch (error) {
      console.error(`❌ Failed to validate ${file}:`, error.message);
      results.push({ file: path.basename(file), valid: false, errors: [error.message] });
    }
  }
  
  // Summary
  if (filesToValidate.length > 1) {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`📊 VALIDATION SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);
    
    results.forEach(r => {
      const status = r.valid ? '✅' : '❌';
      const rowInfo = r.rowCount ? `(${r.rowCount} rows)` : '';
      console.log(`${status} ${r.file} ${rowInfo}`);
    });
    
    const passCount = results.filter(r => r.valid).length;
    const failCount = results.filter(r => !r.valid).length;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }
  
  // Exit with error code if any validation failed
  const allValid = results.every(r => r.valid);
  process.exit(allValid ? 0 : 1);
}

main().catch(console.error);
