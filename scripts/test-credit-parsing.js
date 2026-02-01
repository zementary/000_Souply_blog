#!/usr/bin/env node

/**
 * Test credit parsing logic
 */

function parseCredits(description) {
  const credits = {};
  
  // 1. Director parsing
  const directorPatterns = [
    /(?:Directed\s+by|Director)[:\s]+(.+?)(?:\n|$)/i,
    /(?:Writer\s+&\s+Director|Written\s+&\s+Directed\s+by)[:\s]+(.+?)(?:\n|$)/i,
    /\bDir[:\.\s]+(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of directorPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      let director = match[1].trim();
      
      // Enhanced cleaning for director
      director = director.replace(/^and\s+\w+:\s*/i, '');
      director = director.replace(/^(?:by|and|with|&)\s+/i, '');
      director = director.replace(/\s*@[\w.]+\s*/g, ' ');
      director = director.replace(/[,.\-–—]+$/, '');
      director = director.trim().replace(/\s{2,}/g, ' ');
      
      if (director && 
          director.length > 1 && 
          !/(Creative|Art|Tech|Assistant|Production)/i.test(director.substring(0, 20))) {
        credits.director = director;
        break;
      }
    }
  }

  // 2. Role mappings
  const roleMaps = [
    { 
      key: 'dop', 
      regex: /\b(?:DOP|Cinematographer|Director\s+of\s+Photography)\b\.?\s*[:.\-]?\s*(.+?)(?:\n|$|\.|,)/im 
    },
    { 
      key: 'editor', 
      regex: /\b(?:Editors?|Editor\(s\)|Edited\s+by)\b\.?\s*[:.\-]?\s*(.+?)(?:\n|$|\.|,)/im 
    },
    { 
      key: 'vfx', 
      regex: /\b(?:VFX|Visual\s+Effects|CGI)(?:\s+(?:Supervisor|Studio|Company))?\b\.?\s*[:.\-]?\s*(.+?)(?:\n|$|\.|,)/im,
    }
  ];

  roleMaps.forEach(({ key, regex }) => {
    const match = description.match(regex);
    if (match && match[1]) {
      let cleanName = match[1].trim();

      // Enhanced cleaning logic
      cleanName = cleanName.replace(/^(?:by|and|with|&)\s+/i, '');
      cleanName = cleanName.replace(/^(?:Studio|Company|Team|Agency|House|Collective):\s*/i, '');
      cleanName = cleanName.replace(/\b(?:Supervisor|Lead|Engineer|Mixer|Designer|Colorist|Editor|Co\.|Inc\.|Ltd\.)\b/gi, '');
      cleanName = cleanName.replace(/^and\s+\w+:\s*/i, '');
      cleanName = cleanName.replace(/^[a-z]{1,6}:\s*/i, '');
      cleanName = cleanName.replace(/\s*@[\w.]+\s*/g, ' ');
      cleanName = cleanName.replace(/^s\s*[:.\-]?\s*/i, '');
      cleanName = cleanName.replace(/^[:.\-,\s&]+|[:.\-,\s&]+$/g, '');
      cleanName = cleanName.trim().replace(/\s{2,}/g, ' ');

      if (cleanName && cleanName.length > 1 && !/^[:.\-&]+$/.test(cleanName)) {
        credits[key] = cleanName;
      }
    }
  });

  return credits;
}

// Test cases
const testCases = [
  {
    name: 'Test 1: "by" prefix in VFX',
    description: `
Director: Aidan Zamiri
Production: Object & Animal
DOP: Ben Carey
Editor: Neal Farmer
VFX by Corduroy Studio
Sound Design: Delroy Cornick
    `,
    expected: {
      director: 'Aidan Zamiri',
      dop: 'Ben Carey',
      editor: 'Neal Farmer',
      vfx: 'Corduroy Studio'
    }
  },
  {
    name: 'Test 2: "and Editor:" prefix + Instagram handles',
    description: `
Director and Editor: Tom Emmerson @tom.emmerson
Production Company: Cadenza
DOP: Jaime Ackroyd @jaimeackroyd
VFX Studio: Frame 23 @frame23
    `,
    expected: {
      director: 'Tom Emmerson',
      dop: 'Jaime Ackroyd',
      editor: 'Tom Emmerson',
      vfx: 'Frame 23'
    }
  },
  {
    name: 'Test 3: Partial word "tudio:"',
    description: `
Director: John Doe
VFX tudio: Amazing VFX @amazing
Editor: Jane Smith
    `,
    expected: {
      director: 'John Doe',
      vfx: 'Amazing VFX',
      editor: 'Jane Smith'
    }
  },
  {
    name: 'Test 4: Multiple Instagram handles',
    description: `
Director: Aube Perrie
Editor: Gwennaël Ghelid @gwennael.edit @studio
DOP: Christopher Ripley @chrispripley
    `,
    expected: {
      director: 'Aube Perrie',
      editor: 'Gwennaël Ghelid',
      dop: 'Christopher Ripley'
    }
  }
];

console.log('\n🧪 Testing Credit Parsing Logic\n');
console.log('='.repeat(70) + '\n');

let passedCount = 0;
let failedCount = 0;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log('-'.repeat(70));
  
  const result = parseCredits(test.description);
  let allPassed = true;
  
  // Check each expected field
  for (const [key, expectedValue] of Object.entries(test.expected)) {
    const actualValue = result[key];
    const passed = actualValue === expectedValue;
    
    if (!passed) {
      allPassed = false;
      console.log(`  ❌ ${key}:`);
      console.log(`     Expected: "${expectedValue}"`);
      console.log(`     Got:      "${actualValue}"`);
    } else {
      console.log(`  ✅ ${key}: "${actualValue}"`);
    }
  }
  
  if (allPassed) {
    passedCount++;
    console.log('  ✅ PASS\n');
  } else {
    failedCount++;
    console.log('  ❌ FAIL\n');
  }
});

console.log('='.repeat(70));
console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed\n`);

if (failedCount === 0) {
  console.log('🎉 All tests passed!\n');
} else {
  console.log('⚠️  Some tests failed. Please review the cleaning logic.\n');
  process.exit(1);
}
