#!/usr/bin/env node

function cleanAuthoritySignal(authorityString) {
  if (!authorityString) return '';
  
  // Remove internal tier markers and meta labels
  return authorityString
    .replace(/\s*\+\s*Tier\s+\d+\s+(Winner|Director|Nom)/gi, '')  // Remove "+ Tier X Winner/Director/Nom"
    .replace(/\s*\+\s*Authority[\s_]Signal/gi, '')                 // Remove "+ Authority_Signal"
    .replace(/\s*\+\s*Curated[\s_]Signal/gi, '')                   // Remove "+ Curated Signal"
    .replace(/\s*\+\s*Cultural\s+Impact/gi, ' + Cultural Impact')  // Keep Cultural Impact (it's public)
    .replace(/\s+\+\s+/g, ' + ')                                   // Normalize separators
    .replace(/^\s*\+\s*/, '')                                      // Remove leading "+"
    .replace(/\s*\+\s*$/, '')                                      // Remove trailing "+"
    .trim();
}

// Test cases
const testCases = [
  {
    input: 'UKMVA Video of Year + Tier 0 Winner',
    expected: 'UKMVA Video of Year'
  },
  {
    input: 'UKMVA Best Int Rock + Director of Year',
    expected: 'UKMVA Best Int Rock + Director of Year'
  },
  {
    input: 'UKMVA Prod Design Nom + Tier 2 Director',
    expected: 'UKMVA Prod Design Nom'
  },
  {
    input: 'Promonews Best of 2024 + Cultural Impact',
    expected: 'Promonews Best of 2024 + Cultural Impact'
  },
  {
    input: 'BMVA Best VFX Winner',
    expected: 'BMVA Best VFX Winner'
  },
  {
    input: 'UKMVA Best Alt Int + Prod Design',
    expected: 'UKMVA Best Alt Int + Prod Design'
  }
];

console.log('\n╔════════════════════════════════════════╗');
console.log('║  AUTHORITY SIGNAL CLEANING TEST        ║');
console.log('╚════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = cleanAuthoritySignal(test.input);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  
  console.log(`Test ${index + 1}: ${status}`);
  console.log(`  Input:    "${test.input}"`);
  console.log(`  Expected: "${test.expected}"`);
  console.log(`  Got:      "${result}"`);
  console.log('');
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Results: ${passed}/${testCases.length} passed`);
if (failed > 0) {
  console.log(`❌ ${failed} tests failed`);
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
}
