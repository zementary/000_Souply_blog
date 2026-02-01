#!/usr/bin/env node

/**
 * TEST SCRIPT FOR PARSER V6.0 IMPROVEMENTS
 * Tests all the reported bad cases to verify fixes
 */

import { cleanSongTitle, normalizeArtistName, parseCredits } from './lib/parser.js';

console.log('\n╔════════════════════════════════════════╗');
console.log('║  PARSER V6.0 FIX VALIDATION            ║');
console.log('╚════════════════════════════════════════╝\n');

// Test cases from user feedback
const testCases = [
  // Case 1: Brodinski - title should be "Can't Help Myself"
  {
    name: 'Brodinski duplicate artist name',
    rawTitle: "Brodinski - Can't Help Myself",
    artist: 'Brodinski',
    expectedTitle: "Can't Help Myself",
  },
  
  // Case 2: HD quality tag removal
  {
    name: 'David Bowie HD tag',
    rawTitle: 'Blackstar [HD]',
    artist: 'David Bowie',
    expectedTitle: 'Blackstar',
  },
  
  // Case 3: Darwin Deez - artist in title
  {
    name: 'Darwin Deez artist extraction',
    rawTitle: 'Darwin Deez - The Mess She Made',
    artist: 'Darwin Deez',
    expectedTitle: 'The Mess She Made',
  },
  
  // Case 4: BICEP | APRICOTS format
  {
    name: 'BICEP pipe separator',
    rawTitle: 'BICEP | APRICOTS',
    artist: 'BICEP',
    expectedTitle: 'APRICOTS',
  },
  
  // Case 5: Fan repost - Rihanna
  {
    name: 'Fan repost Rihanna',
    rawTitle: 'Rihanna - Bitch Better Have My Money (Explicit)',
    artist: 'Rihanna',
    expectedTitle: 'Bitch Better Have My Money',
  },
  
  // Case 6: A$AP Rocky from ASAPROCKYUPTOWN
  {
    name: 'A$AP Rocky normalization',
    rawTitle: 'A$AP Rocky - Babushka Boi',
    artist: 'ASAPROCKYUPTOWN', // should normalize to A$AP Rocky
    expectedTitle: 'Babushka Boi',
  },
  
  // Case 7: Childish Gambino from GambinoArchive
  {
    name: 'Childish Gambino fan archive',
    rawTitle: 'Childish Gambino - Sober',
    artist: 'Childish Gambino',
    expectedTitle: 'Sober',
  },
  
  // Case 8: AntsLive - Captain Ants
  {
    name: 'AntsLive reversed',
    rawTitle: 'Captain Ants - AntsLive',
    artist: 'AntsLive',
    expectedTitle: 'Captain Ants',
  },
  
  // Case 9: 4K quality tag
  {
    name: '4K quality tag removal',
    rawTitle: 'Sabrina Carpenter - Taste (4K 120fps DTS-HD 5.1)',
    artist: 'Sabrina Carpenter',
    expectedTitle: 'Taste',
  },
];

// Test title cleaning
console.log('🔍 Testing Title Cleaning...\n');
let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Input: "${testCase.rawTitle}"`);
  console.log(`  Artist: "${testCase.artist}"`);
  
  // Important: Normalize artist name BEFORE cleaning title (mirrors real usage in ingest.js)
  const normalizedArtist = normalizeArtistName(testCase.artist);
  const cleanedTitle = cleanSongTitle(testCase.rawTitle, normalizedArtist);
  
  console.log(`  Normalized Artist: "${normalizedArtist}"`);
  console.log(`  Output: "${cleanedTitle}"`);
  console.log(`  Expected: "${testCase.expectedTitle}"`);
  
  const titlePassed = cleanedTitle === testCase.expectedTitle;
  
  if (titlePassed) {
    console.log(`  ✅ PASS\n`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL - Title mismatch\n`);
    failedTests++;
  }
});

// Test credits parsing
console.log('\n🔍 Testing Credits Parsing...\n');

const creditsTestCases = [
  {
    name: 'Remove "Editor:" prefix from director',
    description: `Director: Tom Emmerson
Editor: Sarah Johnson`,
    expectedDirector: 'Tom Emmerson',
  },
  {
    name: 'Extract from "Produced by DIVISION"',
    description: `Directed by John Doe
Produced by DIVISION
Co-ordinator: Laura Clery`,
    expectedDirector: 'John Doe',
    expectedProduction: 'DIVISION',
  },
  {
    name: 'Extract from "Produced by ICONOCLAST"',
    description: `Director: Jane Smith
Produced by ICONOCLAST
Editor: Bob Wilson`,
    expectedDirector: 'Jane Smith',
    expectedProduction: 'ICONOCLAST',
  },
  {
    name: 'Avoid "ordinator" extraction',
    description: `Director: Mark Jenkin
Producer: Bullion Productions
Co-ordinator: Richard Knickerbocker`,
    expectedDirector: 'Mark Jenkin',
    expectedProduction: 'Bullion Productions',
  },
  {
    name: 'Extract Executive Producers (Priority 3)',
    description: `Director: Alex Turner
Executive Producers: Pavel Brenner, Ania Markham`,
    expectedDirector: 'Alex Turner',
    expectedProduction: 'Pavel Brenner, Ania Markham',
  },
  {
    name: 'Remove parenthetical social media handles',
    description: `Director: Mark Jenkin (Insta: @markjenkin Twitter: @mark)
Production Company: Bullion Productions (Insta: @bullionproductions)`,
    expectedDirector: 'Mark Jenkin',
    expectedProduction: 'Bullion Productions',
  },
  {
    name: 'Priority Test: Production Company wins over Producer',
    description: `Director: John Smith
Production Company: Big Studios
Producer: Jane Doe`,
    expectedDirector: 'John Smith',
    expectedProduction: 'Big Studios',
  },
  {
    name: 'Priority Test: Producer wins over Executive Producer',
    description: `Director: Alice Brown
Producer: Cool Productions
Executive Producer: Bob Wilson`,
    expectedDirector: 'Alice Brown',
    expectedProduction: 'Cool Productions',
  },
  {
    name: 'CRITICAL: Skip Production Coordinator entirely',
    description: `Director: Sarah Lee
Production Coordinator: Mike Johnson
Producer: Awesome Films`,
    expectedDirector: 'Sarah Lee',
    expectedProduction: 'Awesome Films',
  },
  {
    name: 'CRITICAL: Skip Line Producer',
    description: `Director: Tom Hardy
Line Producer: Emma Watson
Production Company: Warner Bros`,
    expectedDirector: 'Tom Hardy',
    expectedProduction: 'Warner Bros',
  },
];

creditsTestCases.forEach((testCase, index) => {
  console.log(`Credits Test ${index + 1}: ${testCase.name}`);
  
  const parsed = parseCredits(testCase.description);
  
  console.log(`  Director: "${parsed.director || '(none)'}"`);
  if (testCase.expectedDirector) {
    console.log(`  Expected Director: "${testCase.expectedDirector}"`);
  }
  
  console.log(`  Production: "${parsed.production || '(none)'}"`);
  if (testCase.expectedProduction) {
    console.log(`  Expected Production: "${testCase.expectedProduction}"`);
  }
  
  const directorPassed = !testCase.expectedDirector || parsed.director === testCase.expectedDirector;
  const productionPassed = !testCase.expectedProduction || parsed.production === testCase.expectedProduction;
  
  if (directorPassed && productionPassed) {
    console.log(`  ✅ PASS\n`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL`);
    if (!directorPassed) console.log(`     - Director mismatch`);
    if (!productionPassed) console.log(`     - Production mismatch`);
    console.log('');
    failedTests++;
  }
});

// Test artist normalization
console.log('\n🔍 Testing Artist Normalization...\n');

const artistTestCases = [
  { input: 'ASAPROCKYUPTOWN', expected: 'A$AP Rocky' },
  { input: 'asap rocky', expected: 'A$AP Rocky' },
  { input: 'BICEP', expected: 'BICEP' },
  { input: 'bicep', expected: 'BICEP' },
  { input: 'Childish Gambino', expected: 'Childish Gambino' },
  { input: 'childish gambino', expected: 'Childish Gambino' },
  { input: 'Darwin Deez', expected: 'Darwin Deez' }, // No mapping, should stay as-is
];

artistTestCases.forEach((testCase) => {
  const normalized = normalizeArtistName(testCase.input);
  const passed = normalized === testCase.expected;
  
  console.log(`  "${testCase.input}" → "${normalized}"`);
  if (passed) {
    console.log(`  ✅ Expected: "${testCase.expected}"\n`);
    passedTests++;
  } else {
    console.log(`  ❌ Expected: "${testCase.expected}"\n`);
    failedTests++;
  }
});

// Summary
console.log('\n╔════════════════════════════════════════╗');
console.log('║  TEST SUMMARY                          ║');
console.log('╚════════════════════════════════════════╝\n');

const totalTests = passedTests + failedTests;
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

if (failedTests === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Review the output above.\n');
  process.exit(1);
}
