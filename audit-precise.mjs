#!/usr/bin/env node

/**
 * PRECISE AUDIT: Test the exact data flow that causes "string did not match expected pattern"
 * 
 * Based on error analysis:
 * - Error occurs in Vite chunk (browser-side)
 * - Error is "The string did not match the expected pattern" (DOMException from URL constructor)
 * - Happens during polling, not initial mutation call
 * 
 * Hypothesis: The error occurs when:
 * 1. Server returns data with special characters
 * 2. tRPC client tries to construct a URL with this data
 * 3. URL constructor throws because the string contains invalid URL characters
 */

import superjson from 'superjson';

const SERVER_URL = 'http://localhost:3000';

console.log('🎯 PRECISE URL PATTERN ERROR AUDIT\n');
console.log('Testing hypothesis: tRPC URL construction fails with special characters\n');

// Test cases with problematic strings that might cause URL errors
const testCases = [
  {
    name: 'Normal ASCII',
    data: { id: 1, title: 'Normal Title', summary: 'Normal summary' }
  },
  {
    name: 'Unicode characters',
    data: { id: 2, title: 'Title with émojis 🎉', summary: 'Summary with 中文' }
  },
  {
    name: 'Newlines and tabs',
    data: { id: 3, title: 'Title\nwith\nnewlines', summary: 'Summary\twith\ttabs' }
  },
  {
    name: 'Control characters',
    data: { id: 4, title: 'Title\x00with\x01control', summary: 'Summary\x1Fchars' }
  },
  {
    name: 'Unpaired surrogates',
    data: { id: 5, title: 'Title\uD800unpaired', summary: 'Summary\uDFFFsurrogate' }
  },
  {
    name: 'URL-problematic chars',
    data: { id: 6, title: 'Title with #hash &amp; ?query', summary: 'Summary with /slash \\backslash' }
  },
  {
    name: 'Very long string',
    data: { id: 7, title: 'A'.repeat(2000), summary: 'B'.repeat(3000) }
  },
];

async function testURLConstruction(testCase) {
  console.log(`\n📝 Test: ${testCase.name}`);
  
  try {
    // Step 1: Serialize like tRPC does
    const serialized = superjson.serialize(testCase.data);
    const batchPayload = { '0': serialized };
    const inputParam = JSON.stringify(batchPayload);
    
    console.log(`  Serialized length: ${inputParam.length} chars`);
    
    // Step 2: URL encode like tRPC batch link does
    let encoded;
    try {
      encoded = encodeURIComponent(inputParam);
      console.log(`  ✓ encodeURIComponent succeeded (${encoded.length} chars)`);
    } catch (encodeError) {
      console.error(`  ✗ encodeURIComponent FAILED: ${encodeError.message}`);
      return { test: testCase.name, error: 'encodeURIComponent failed', details: encodeError.message };
    }
    
    // Step 3: Construct URL like tRPC does
    const urlString = `${SERVER_URL}/api/trpc/insights.getStatus?batch=1&input=${encoded}`;
    
    console.log(`  Full URL length: ${urlString.length} chars`);
    
    // Step 4: Test URL constructor (this is where the error occurs!)
    try {
      const url = new URL(urlString);
      console.log(`  ✓ URL constructor succeeded`);
      console.log(`  ✓ URL is valid: ${url.href.substring(0, 100)}...`);
    } catch (urlError) {
      console.error(`\n  🔴 URL CONSTRUCTOR FAILED!`);
      console.error(`  Error: ${urlError.name}: ${urlError.message}`);
      console.error(`  URL preview: ${urlString.substring(0, 200)}...`);
      
      // This is the target error!
      if (urlError.message.includes('string did not match') || urlError.message.includes('pattern')) {
        console.error(`\n  🎯 FOUND IT! This is the exact error the user sees!`);
        console.error(`  Problem data: ${JSON.stringify(testCase.data).substring(0, 200)}`);
      }
      
      return { test: testCase.name, error: 'URL constructor failed', details: urlError.message };
    }
    
    // Step 5: Test actual fetch (if URL construction succeeded)
    try {
      const response = await fetch(urlString);
      console.log(`  ✓ Fetch succeeded: HTTP ${response.status}`);
    } catch (fetchError) {
      console.error(`  ✗ Fetch failed: ${fetchError.message}`);
      return { test: testCase.name, error: 'Fetch failed', details: fetchError.message };
    }
    
    console.log(`  ✅ PASSED`);
    return null;
    
  } catch (error) {
    console.error(`  ✗ Unexpected error: ${error.message}`);
    return { test: testCase.name, error: 'Unexpected', details: error.message };
  }
}

async function runPreciseAudit() {
  console.log('='.repeat(70));
  console.log('TESTING URL CONSTRUCTION WITH VARIOUS DATA PATTERNS');
  console.log('='.repeat(70));
  
  const errors = [];
  
  for (const testCase of testCases) {
    const result = await testURLConstruction(testCase);
    if (result) {
      errors.push(result);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('AUDIT RESULTS');
  console.log('='.repeat(70));
  
  if (errors.length === 0) {
    console.log('✅ ALL TESTS PASSED - No URL construction errors found');
  } else {
    console.log(`❌ ${errors.length} TEST(S) FAILED:\n`);
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.test}`);
      console.log(`   Error type: ${err.error}`);
      console.log(`   Details: ${err.details}\n`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    errors.forEach(err => {
      if (err.error === 'encodeURIComponent failed') {
        console.log(`- Fix ${err.test}: Remove invalid characters before serialization`);
      } else if (err.error === 'URL constructor failed') {
        console.log(`- Fix ${err.test}: Sanitize data to be URL-safe`);
      }
    });
  }
  
  console.log('='.repeat(70));
  
  return errors.length === 0;
}

runPreciseAudit().then(success => {
  process.exit(success ? 0 : 1);
});
