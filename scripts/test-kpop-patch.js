#!/usr/bin/env node

// Test K-Pop Patch & Strict Credits

console.log('\n╔════════════════════════════════════════╗');
console.log('║  K-POP PATCH TEST v2.1                 ║');
console.log('╚════════════════════════════════════════╝\n');

// Copy the parsing functions from ingest.js
function cleanArtistName(name) {
  return name
    .replace(/VEVO$/i, '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/Official$/i, '')
    .trim();
}

function cleanTitleName(title) {
  return title
    .replace(/\(Official\s*(?:Music\s*)?Video\)/gi, '')
    .replace(/\[Official\s*(?:Music\s*)?Video\]/gi, '')
    .replace(/Official\s*(?:Music\s*)?Video/gi, '')
    .replace(/\(Music\s*Video\)/gi, '')
    .replace(/\[Music\s*Video\]/gi, '')
    .replace(/\(4K\)/gi, '')
    .replace(/\[4K\]/gi, '')
    .replace(/\(HD\)/gi, '')
    .replace(/\[HD\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseArtistAndTitle(rawTitle, channelName) {
  const labelBlocklist = [
    'LABELS', 'LABEL', 'ENTERTAINMENT', 'ENT', 
    'SMTOWN', 'JYP', 'YG', 'HYBE', 
    'VEVO', 'RECORDS', 'MUSIC'
  ];
  
  const isLabelChannel = labelBlocklist.some(keyword => 
    channelName.toUpperCase().includes(keyword)
  );
  
  const kpopPatterns = [
    /^\[MV\]\s*(.+?)\s*[-–—]\s*(.+)$/i,
    /^(.+?)\s+['"](.+?)['"]/,
    /^(.+?)\s*[-–—]\s*(.+?)\s*\(/,
  ];
  
  for (const pattern of kpopPatterns) {
    const match = rawTitle.match(pattern);
    if (match) {
      return {
        artist: cleanArtistName(match[1].trim()),
        title: cleanTitleName(match[2]?.trim() || match[1].trim())
      };
    }
  }
  
  const separators = [' - ', ' – ', ' — ', ' : ', ' | '];
  
  for (const sep of separators) {
    if (rawTitle.includes(sep)) {
      const parts = rawTitle.split(sep);
      if (parts.length >= 2) {
        return {
          artist: cleanArtistName(parts[0].trim()),
          title: cleanTitleName(parts.slice(1).join(sep).trim())
        };
      }
    }
  }
  
  if (!isLabelChannel) {
    return {
      artist: cleanArtistName(channelName),
      title: cleanTitleName(rawTitle)
    };
  }
  
  return {
    artist: cleanArtistName(rawTitle.split(/[-–—:]/)[0] || channelName),
    title: cleanTitleName(rawTitle)
  };
}

// Test cases
const testCases = [
  {
    title: "RM 'LOST!' Official MV",
    channel: "HYBE LABELS",
    expected: { artist: "RM", title: "LOST!" }
  },
  {
    title: "[MV] IU - Love wins all",
    channel: "1theK",
    expected: { artist: "IU", title: "Love wins all" }
  },
  {
    title: "Charli xcx - 360 (official video)",
    channel: "Charli xcx",
    expected: { artist: "Charli xcx", title: "360" }
  },
  {
    title: "A$AP Rocky - Tailor Swif (Official Video)",
    channel: "LIVELOVEASAPVEVO",
    expected: { artist: "A$AP Rocky", title: "Tailor Swif" }
  },
  {
    title: "Kendrick Lamar - Not Like Us",
    channel: "Kendrick Lamar",
    expected: { artist: "Kendrick Lamar", title: "Not Like Us" }
  },
  {
    title: "Fontaines D.C. - Starburster (Official Video)",
    channel: "Fontaines D.C.",
    expected: { artist: "Fontaines D.C.", title: "Starburster" }
  }
];

console.log('Testing Artist/Title Parsing:\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = parseArtistAndTitle(test.title, test.channel);
  const artistMatch = result.artist === test.expected.artist;
  const titleMatch = result.title === test.expected.title;
  const status = (artistMatch && titleMatch) ? '✅' : '❌';
  
  if (artistMatch && titleMatch) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`Test ${index + 1}: ${status}`);
  console.log(`  Input: "${test.title}" (${test.channel})`);
  console.log(`  Expected: Artist="${test.expected.artist}", Title="${test.expected.title}"`);
  console.log(`  Got:      Artist="${result.artist}", Title="${result.title}"`);
  
  if (!artistMatch) console.log(`    ⚠️  Artist mismatch`);
  if (!titleMatch) console.log(`    ⚠️  Title mismatch`);
  console.log('');
});

// Test Director Regex
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('Testing Director Regex (Strict Mode):\n');

const directorPattern = /(?:^|\n)(?:Director|Directed by|Dir)(?!.*(?:Creative|Art|Technical|Tech|Executive|Associate))\s*:?\s*(.+?)(?:\n|$)/im;

const directorTests = [
  {
    description: "Director: Aube Perrie\nCreative Director: San Yawn",
    expected: "Aube Perrie",
    shouldMatch: true
  },
  {
    description: "Creative Director: John Doe\nDirector: Jane Smith",
    expected: "Jane Smith",
    shouldMatch: true
  },
  {
    description: "Art Director: Wrong Person",
    expected: null,
    shouldMatch: false
  },
  {
    description: "Director: Paul Thomas Anderson",
    expected: "Paul Thomas Anderson",
    shouldMatch: true
  }
];

directorTests.forEach((test, index) => {
  const match = test.description.match(directorPattern);
  const result = match ? match[1].trim() : null;
  const success = test.shouldMatch 
    ? (result === test.expected)
    : (result === null);
  
  console.log(`Test ${index + 1}: ${success ? '✅' : '❌'}`);
  console.log(`  Description:\n    ${test.description.replace(/\n/g, '\n    ')}`);
  console.log(`  Expected: ${test.expected || 'null'}`);
  console.log(`  Got: ${result || 'null'}`);
  console.log('');
  
  if (success) passed++; else failed++;
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Results: ${passed}/${testCases.length + directorTests.length} tests passed`);

if (failed > 0) {
  console.log(`❌ ${failed} tests failed`);
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
}
