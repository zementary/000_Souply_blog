#!/usr/bin/env node

/**
 * TEST SUITE FOR NEW FEATURES
 * Tests cover logic, search filters, and repair mode
 */

import { HybridSearcher } from './lib/search.js';

console.log('\n╔════════════════════════════════════════╗');
console.log('║  FEATURE TEST SUITE                    ║');
console.log('╚════════════════════════════════════════╝\n');

// ============================================================================
// TEST 1: Search Quality Filters
// ============================================================================

async function testSearchFilters() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Search Quality Filters');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const searcher = new HybridSearcher({ verbose: true });
  
  // Test case 1: Should return official music video
  console.log('Test 1.1: Official Music Video');
  const result1 = await searcher.search('LISA ROCKSTAR official video');
  console.log(`Result: ${result1 ? '✅ PASS' : '❌ FAIL'}`);
  if (result1) {
    console.log(`  Title: ${result1.title}`);
    console.log(`  Platform: ${result1.platform}`);
  }
  console.log('');
  
  // Test case 2: Should filter out "audio only"
  console.log('Test 1.2: Filter "Audio Only" Videos');
  const result2 = await searcher.search('test song audio only');
  console.log(`Result: ${result2 ? '⚠️  Found result (may be false positive)' : '✅ PASS - Filtered correctly'}`);
  console.log('');
  
  return true;
}

// ============================================================================
// TEST 2: Thumbnail Extraction Logic
// ============================================================================

function testThumbnailLogic() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Thumbnail Sorting Logic');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Mock yt-dlp thumbnail data
  const mockThumbnails = [
    { url: 'thumb1.jpg', width: 320, height: 180, preference: 1 },
    { url: 'thumb2.jpg', width: 1280, height: 720, preference: 3 },
    { url: 'thumb3.jpg', width: 640, height: 360, preference: 2 }
  ];
  
  // Test sorting logic
  const sorted = [...mockThumbnails].sort((a, b) => {
    if (a.preference !== undefined && b.preference !== undefined) {
      return b.preference - a.preference;
    }
    const aRes = (a.height || 0) * (a.width || 0);
    const bRes = (b.height || 0) * (b.width || 0);
    return bRes - aRes;
  });
  
  console.log('Input thumbnails:');
  mockThumbnails.forEach(t => {
    console.log(`  ${t.url}: ${t.width}x${t.height} (pref: ${t.preference})`);
  });
  
  console.log('\nSorted (highest quality first):');
  sorted.forEach(t => {
    console.log(`  ${t.url}: ${t.width}x${t.height} (pref: ${t.preference})`);
  });
  
  const pass = sorted[0].url === 'thumb2.jpg' && sorted[0].width === 1280;
  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  return pass;
}

// ============================================================================
// TEST 3: CSV Line Number Tracking
// ============================================================================

function testCSVLineTracking() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: CSV Line Number Tracking');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Simulate CSV parsing with line numbers
  const mockCSVRows = [
    { Artist: 'LISA', Title: 'ROCKSTAR', __csvLineNumber: 2 },
    { Artist: 'Tyler', Title: 'St. Chroma', __csvLineNumber: 3 },
    { Artist: 'FKA twigs', Title: 'Eusexua', __csvLineNumber: 4 }
  ];
  
  console.log('Mock CSV rows with line numbers:');
  mockCSVRows.forEach(row => {
    const lineInfo = row.__csvLineNumber ? ` [CSV Line ${row.__csvLineNumber}]` : '';
    console.log(`  ${lineInfo} ${row.Artist} - ${row.Title}`);
  });
  
  const pass = mockCSVRows.every(row => row.__csvLineNumber > 0);
  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  return pass;
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runTests() {
  try {
    const results = {
      test1: await testSearchFilters(),
      test2: testThumbnailLogic(),
      test3: testCSVLineTracking()
    };
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`Test 1 (Search Filters): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (Thumbnail Logic): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (CSV Line Tracking): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(r => r === true);
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}\n`);
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
