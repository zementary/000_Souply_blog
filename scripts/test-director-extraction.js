#!/usr/bin/env node

/**
 * TEST DIRECTOR EXTRACTION LOGIC
 * Validates the upgraded extraction logic with real-world test cases
 */

import { parseCredits } from './lib/parser.js';

const testCases = [
  {
    name: 'Test 1: Director of Photography (should be EXCLUDED)',
    description: `
Directed by: Aidan Zamiri
Director of Photography: Ben Carey
Editor: Neal Farmer
Production Company: Object & Animal
    `,
    expected: {
      director: 'Aidan Zamiri'
    }
  },
  {
    name: 'Test 2: Director\'s Rep (should be EXCLUDED)',
    description: `
Director: Aube Perrie
Director's Rep: Hands & Legs
Production: Pulse Films
    `,
    expected: {
      director: 'Aube Perrie'
    }
  },
  {
    name: 'Test 3: Art Director (should be EXCLUDED)',
    description: `
Director: Alex Takacs
Art Director: John Smith
Editor: Jane Doe
    `,
    expected: {
      director: 'Alex Takacs'
    }
  },
  {
    name: 'Test 4: Assistant Director (should be EXCLUDED)',
    description: `
Director: Romain Gavras
Assistant Director: Sarah Johnson
DOP: Tom Anderson
    `,
    expected: {
      director: 'Romain Gavras'
    }
  },
  {
    name: 'Test 5: Creative Director (should be EXCLUDED from Priority B)',
    description: `
Director: Hiro Murai
Creative Director: Emily Chen
Production: ICONOCLAST
    `,
    expected: {
      director: 'Hiro Murai'
    }
  },
  {
    name: 'Test 6: Explicit "Directed by:" format (Priority A)',
    description: `
Directed by: Nabil Elderkin
Director of Photography: André Chemtoff
Production Company: PRETTYBIRD
    `,
    expected: {
      director: 'Nabil Elderkin'
    }
  },
  {
    name: 'Test 7: Compact "Dir:" format (Priority A)',
    description: `
Dir: Grant Singer
DOP: Mike Simpson
Production: Park Pictures
    `,
    expected: {
      director: 'Grant Singer'
    }
  },
  {
    name: 'Test 8: Only Director of Photography (should find NOTHING)',
    description: `
Director of Photography: Ben Carey
Editor: Tom Smith
Production: Pulse Films
    `,
    expected: {
      director: undefined
    }
  },
  {
    name: 'Test 9: Only Art Director (should find NOTHING)',
    description: `
Art Director: Lisa Park
Editor: Jake Williams
Production: Object & Animal
    `,
    expected: {
      director: undefined
    }
  },
  {
    name: 'Test 10: "Written & Directed by" (Priority A2)',
    description: `
Written & Directed by: Spike Jonze
Director of Photography: Hoyte van Hoytema
Production: MJZ
    `,
    expected: {
      director: 'Spike Jonze'
    }
  },
  {
    name: 'Test 11: Real-world case - Charli XCX 360 (SHOULD EXCLUDE DOP)',
    description: `
Director: Aidan Zamiri
Director of Photography: Ben Carey
Editor: Neal Farmer
Production: Object & Animal
    `,
    expected: {
      director: 'Aidan Zamiri'
    }
  },
  {
    name: 'Test 12: Real-world case - Jade (SHOULD EXCLUDE REP)',
    description: `
Director: Aube Perrie
Director's Rep: Hands & Legs Creative
Production: Pulse Films
    `,
    expected: {
      director: 'Aube Perrie'
    }
  },
];

console.log('\n🧪 TESTING DIRECTOR EXTRACTION LOGIC (UPGRADED)\n');
console.log('='.repeat(70) + '\n');

let passedCount = 0;
let failedCount = 0;
const failures = [];

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log('-'.repeat(70));
  
  const result = parseCredits(test.description);
  const actualDirector = result.director;
  const expectedDirector = test.expected.director;
  
  const passed = actualDirector === expectedDirector;
  
  if (!passed) {
    failedCount++;
    console.log(`  ❌ FAILED`);
    console.log(`     Expected: "${expectedDirector}"`);
    console.log(`     Got:      "${actualDirector}"`);
    failures.push({
      test: test.name,
      expected: expectedDirector,
      actual: actualDirector
    });
  } else {
    passedCount++;
    console.log(`  ✅ PASS: "${actualDirector || '(none)'}"`);
  }
  console.log('');
});

console.log('='.repeat(70));
console.log(`\n📊 SUMMARY: ${passedCount} passed, ${failedCount} failed\n`);

if (failedCount > 0) {
  console.log('❌ FAILED TESTS:\n');
  failures.forEach(({ test, expected, actual }) => {
    console.log(`  • ${test}`);
    console.log(`    Expected: "${expected}"`);
    console.log(`    Got:      "${actual}"\n`);
  });
  process.exit(1);
} else {
  console.log('🎉 All tests passed! The upgraded extraction logic is working correctly.\n');
}
