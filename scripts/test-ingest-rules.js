#!/usr/bin/env node

/**
 * Test ingest.js rules without actually downloading or creating files
 * This demonstrates how the import rules will work
 */

// Copy the key functions from ingest.js
function normalizeArtistName(artistName) {
  const artistMappings = {
    'charli xcx': 'Charli XCX',
    'asap rocky': 'A$AP Rocky',
    'a$ap rocky': 'A$AP Rocky',
    'rm': 'RM',
    'bts': 'BTS',
    'blackpink': 'BLACKPINK',
    'fontaines dc': 'Fontaines D.C.',
    'fontaines d.c.': 'Fontaines D.C.'
  };
  
  const lowerArtist = artistName.toLowerCase().trim();
  return artistMappings[lowerArtist] || artistName;
}

function cleanSongTitle(originalTitle, artistName) {
  let cleanTitle = originalTitle.trim();

  // Step 1: Remove leading commas, dashes, and spaces
  cleanTitle = cleanTitle.replace(/^[,\s-]+/, '');

  // Step 2: Extract content within quotes
  const quoteMatch = cleanTitle.match(/['''"""]([^'''"""]+)['''"""]/);
  if (quoteMatch && quoteMatch[1]) {
    cleanTitle = quoteMatch[1].trim();
  } else {
    // Step 3: Remove [MV] prefix
    cleanTitle = cleanTitle.replace(/^\[MV\]\s*/i, '');
    
    // Step 4: Remove artist name from the beginning
    const escapedArtist = artistName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const artistPattern = new RegExp(`^${escapedArtist}\\s*[-:,–—]?\\s*`, 'i');
    cleanTitle = cleanTitle.replace(artistPattern, '');
  }

  // Step 5: Remove common MV/Video suffixes
  cleanTitle = cleanTitle
    .replace(/\s*[\(\[]?\s*Official\s*(Music\s*)?Video\s*[\)\]]?\s*$/i, '')
    .replace(/\s*[\(\[]?\s*Official\s*MV\s*[\)\]]?\s*$/i, '')
    .replace(/\s*[\(\[]\s*MV\s*[\)\]]\s*$/i, '')
    .replace(/\s*\(MV\)\s*$/i, '')
    .replace(/\s*\[MV\]\s*$/i, '')
    .replace(/\s*M\/V\s*$/i, '')
    .replace(/\s*[-:–—]\s*Official\s*(Music\s*)?Video$/i, '')
    .replace(/\s*[-:–—]\s*Official\s*MV$/i, '')
    .replace(/\s*\[[^\]]*Official[^\]]*\]/gi, '')
    .replace(/\s*\([^)]*Official[^)]*\)/gi, '')
    .replace(/[-–—,]+$/, '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s{2,}/g, ' ');

  return cleanTitle;
}

function generateFileName(artist, title, year) {
  const artistSlug = artist.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  const titleSlug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  return `${year}-${artistSlug}-${titleSlug}.mdx`;
}

// Test cases
const testCases = [
  {
    name: 'Charli XCX - 360',
    input: {
      rawTitle: 'Charli xcx - 360 (Official Video)',
      channel: 'Charli XCX',
      year: '2024'
    },
    expected: {
      artist: 'Charli XCX',
      title: '360',
      fileName: '2024-charli-xcx-360.mdx'
    }
  },
  {
    name: 'Fontaines D.C. - Starburster',
    input: {
      rawTitle: 'Fontaines D.C. - Starburster',
      channel: 'Fontaines DC',
      year: '2024'
    },
    expected: {
      artist: 'Fontaines D.C.',
      title: 'Starburster',
      fileName: '2024-fontaines-dc-starburster.mdx'
    }
  },
  {
    name: 'RM - LOST!',
    input: {
      rawTitle: "RM 'LOST!' Official MV",
      channel: 'HYBE LABELS',
      year: '2024'
    },
    expected: {
      artist: 'RM',
      title: 'LOST!',
      fileName: '2024-rm-lost.mdx'
    }
  },
  {
    name: 'Free Nationals - Gangsta',
    input: {
      rawTitle: ', A$AP Rocky, Anderson .Paak - Gangsta',
      channel: 'Free Nationals',
      year: '2024'
    },
    expected: {
      artist: 'Free Nationals',
      title: 'A$AP Rocky, Anderson .Paak - Gangsta',
      fileName: '2024-free-nationals-aap-rocky-anderson-paak---gangsta.mdx'
    }
  },
  {
    name: 'The Chemical Brothers - Skipping Like A Stone',
    input: {
      rawTitle: 'The Chemical Brothers - Skipping Like A Stone ft. Beck',
      channel: 'The Chemical Brothers',
      year: '2023'
    },
    expected: {
      artist: 'The Chemical Brothers',
      title: 'Skipping Like A Stone ft. Beck',
      fileName: '2023-the-chemical-brothers-skipping-like-a-stone-ft-beck.mdx'
    }
  }
];

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  INGEST RULES TEST                                             ║');
console.log('║  Testing import rules WITHOUT creating actual files            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\n[${index + 1}/${testCases.length}] Testing: ${test.name}`);
  console.log('─'.repeat(70));
  
  // Simulate the ingest logic
  let artist = test.input.channel;
  
  // For K-Pop labels, extract artist from title
  const labelKeywords = ['LABEL', 'ENTERTAINMENT', 'SMTOWN', 'JYP', 'VEVO', 'OFFICIAL', 'HYBE'];
  if (labelKeywords.some(kw => test.input.channel.toUpperCase().includes(kw))) {
    const titleMatchA = test.input.rawTitle.match(/^(.+?)\s+['"]/);
    if (titleMatchA) artist = titleMatchA[1];
  }
  
  // Normalize artist
  artist = normalizeArtistName(artist);
  
  // Clean title
  const title = cleanSongTitle(test.input.rawTitle, artist);
  
  // Generate file name
  const fileName = generateFileName(artist, title, test.input.year);
  
  // Check results
  const artistMatch = artist === test.expected.artist;
  const titleMatch = title === test.expected.title;
  const fileNameMatch = fileName === test.expected.fileName;
  
  const allPassed = artistMatch && titleMatch && fileNameMatch;
  
  if (allPassed) {
    passed++;
    console.log('✅ PASS');
  } else {
    failed++;
    console.log('❌ FAIL');
  }
  
  console.log(`\n  Input:`);
  console.log(`    Raw Title:  "${test.input.rawTitle}"`);
  console.log(`    Channel:    "${test.input.channel}"`);
  console.log(`    Year:       "${test.input.year}"`);
  
  console.log(`\n  Output:`);
  console.log(`    Artist:     "${artist}" ${artistMatch ? '✅' : `❌ Expected: "${test.expected.artist}"`}`);
  console.log(`    Title:      "${title}" ${titleMatch ? '✅' : `❌ Expected: "${test.expected.title}"`}`);
  console.log(`    File Name:  "${fileName}" ${fileNameMatch ? '✅' : `❌ Expected: "${test.expected.fileName}"`}`);
});

console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  SUMMARY                                                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`  ✅ Passed: ${passed}/${testCases.length}`);
console.log(`  ❌ Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log(`\n  🎉 All tests passed! Import rules are working correctly.\n`);
} else {
  console.log(`\n  ⚠️  Some tests failed. Please review the rules.\n`);
  process.exit(1);
}
