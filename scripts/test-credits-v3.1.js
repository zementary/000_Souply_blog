#!/usr/bin/env node

/**
 * Test Suite for V3.1 Credits Parser
 * Validates the upgraded extractCreditsFromDescription logic
 */

function extractCreditsFromDescription(description) {
  const credits = {};
  
  // 1. DIRECTOR - Use negative lookbehind to exclude modifiers
  const directorRegex = /(?<!Creative\s|Art\s|Tech(?:nical)?\s|Assistant\s|Associate\s|Casting\s|Music\s|Executive\s)(?:Directed\s+by|Written\s+&\s+Directed\s+by|Writer\s+&\s+Director|Director(?!\s+of\s+Photography))\.?\s*(?::|by)?\s*(.+?)(?:\n|$|\.|&)/im;
  
  const directorMatch = description.match(directorRegex);
  if (directorMatch && directorMatch[1]) {
    const cleaned = directorMatch[1].trim();
    if (cleaned.length >= 2 && /[A-Za-z]/.test(cleaned)) {
      credits.director = cleaned;
      console.log(`✓ Director: "${cleaned}"`);
    }
  }

  // 2. OTHER ROLES - Clean role mapping with auto-sanitization
  const roleMaps = [
    { 
      key: 'dop', 
      regex: /(?:DOP|DP|Cinematographer|Director\s+of\s+Photography)\.?\s*:?\s*(.+?)(?:\n|$|\.)/im 
    },
    { 
      key: 'production_company', 
      regex: /(?:Production\s+Co(?:mpany)?|Prod\s+Co|Produced\s+by)\.?\s*:?\s*(.+?)(?:\n|$|\.)/im 
    },
    { 
      key: 'editor', 
      regex: /(?:Editor|Edited\s+by|Edit(?:ing)?)\.?\s*(?::|by)?\s*(.+?)(?:\n|$|\.)/im 
    },
    { 
      key: 'colorist', 
      regex: /(?:Color(?:ist)?|Grade|Grading|Color\s+Grade)\.?\s*:?\s*(.+?)(?:\n|$|\.)/im 
    },
    { 
      key: 'art_director', 
      regex: /(?:Art\s+Director)\.?\s*:?\s*(.+?)(?:\n|$|\.)/im 
    },
    { 
      key: 'vfx', 
      regex: /(?:VFX|Visual\s+Effects|CGI)(?:\s+Supervisor)?\.?\s*:?\s*(.+?)(?:\n|$|\.)/im,
      sanitize: true
    },
    { 
      key: 'sound_design', 
      regex: /(?:Sound\s+Design|Sound|Audio|Mix)(?:\s+Designer|\s+Mixer|\s+Engineer)?\.?\s*:?\s*(.+?)(?:\n|$|\.)/im,
      sanitize: true
    },
    { 
      key: 'label', 
      regex: /(?:Label|Record\s+Label|Released\s+by)\.?\s*:?\s*(.+?)(?:\n|$|\.)/im 
    },
  ];

  // Noise words to strip from all roles
  const noiseWords = /\b(Supervisor|Lead|Company|Studio|House|Team|Engineer|Designer|Mixer|Recordist|Co\.|Inc\.|by)\b\s*:?\s*/gi;

  roleMaps.forEach(({ key, regex, sanitize }) => {
    const match = description.match(regex);
    if (match && match[1]) {
      let cleaned = match[1]
        .replace(/^by\s+/i, '')        // Remove "by" prefix
        .replace(/\n.*/, '')           // Take only first line
        .replace(/\s+/g, ' ')          // Collapse spaces
        .trim();
      
      // Apply noise word removal if specified
      if (sanitize) {
        const original = cleaned;
        cleaned = cleaned.replace(noiseWords, '').replace(/[:]/g, '').trim();
        if (cleaned !== original && cleaned) {
          console.log(`🧹 ${key}: "${original}" → "${cleaned}"`);
        }
      }
      
      // Validate and store
      if (cleaned && cleaned.length >= 2 && /[A-Za-z]/.test(cleaned)) {
        // Exclude invalid starts (but allow "The" for company names like "The Mill")
        const invalidStarts = ['and ', 'or ', 'with ', 'for ', 'from '];
        const isValid = !invalidStarts.some(invalid => 
          cleaned.toLowerCase().startsWith(invalid)
        );
        
        if (isValid) {
          credits[key] = cleaned;
          console.log(`✓ ${key}: "${cleaned}"`);
        }
      }
    }
  });

  return credits;
}

// ============================================================================
// TEST CASES
// ============================================================================

const testCases = [
  {
    name: "Standard Credits",
    description: `Director: Spike Jonze
Production Company: MJZ
DOP: Lance Acord
Editor: Eric Zumbrunnen`,
    expected: {
      director: "Spike Jonze",
      production_company: "MJZ",
      dop: "Lance Acord",
      editor: "Eric Zumbrunnen"
    }
  },
  {
    name: "Creative Director (Should NOT match)",
    description: `Creative Director: John Doe
Art Director: Jane Smith
Director: Hiro Murai`,
    expected: {
      director: "Hiro Murai",
      art_director: "Jane Smith"
    }
  },
  {
    name: "VFX with Noise Words",
    description: `Director: Michel Gondry
VFX Supervisor: The Mill
Sound Design Engineer: Ben Burtt`,
    expected: {
      director: "Michel Gondry",
      vfx: "The Mill",
      sound_design: "Ben Burtt"
    }
  },
  {
    name: "Directed by Format",
    description: `Directed by: Paul Thomas Anderson
Produced by: Ghoulish Films`,
    expected: {
      director: "Paul Thomas Anderson",
      production_company: "Ghoulish Films"
    }
  },
  {
    name: "Writer & Director",
    description: `Written & Directed by: Wes Anderson
Colorist: Company 3`,
    expected: {
      director: "Wes Anderson",
      colorist: "Company 3"
    }
  }
];

// Run tests
console.log('\n╔════════════════════════════════════════╗');
console.log('║  V3.1 CREDITS PARSER TEST SUITE       ║');
console.log('╚════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\n[Test ${index + 1}] ${test.name}`);
  console.log('─'.repeat(50));
  
  const result = extractCreditsFromDescription(test.description);
  
  // Compare results
  let testPassed = true;
  
  // Check all expected keys are present
  for (const [key, expectedValue] of Object.entries(test.expected)) {
    if (result[key] !== expectedValue) {
      console.error(`❌ ${key}: Expected "${expectedValue}", got "${result[key] || 'undefined'}"`);
      testPassed = false;
    }
  }
  
  // Check no extra keys are present
  for (const key of Object.keys(result)) {
    if (!(key in test.expected)) {
      console.warn(`⚠️  Unexpected key: ${key} = "${result[key]}"`);
    }
  }
  
  if (testPassed) {
    console.log('✅ PASSED');
    passed++;
  } else {
    console.log('❌ FAILED');
    failed++;
  }
});

console.log('\n' + '═'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);
