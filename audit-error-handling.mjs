#!/usr/bin/env node

/**
 * AUDIT: Test tRPC error response handling
 * 
 * New hypothesis based on audit results:
 * - URL construction works fine with all data
 * - Error might occur when server returns an ERROR response
 * - The error message itself might contain invalid characters
 * - tRPC might try to construct a URL with the error message
 */

import superjson from 'superjson';

const SERVER_URL = 'http://localhost:3000';

console.log('🔍 ERROR RESPONSE HANDLING AUDIT\n');
console.log('Testing if error messages cause URL construction failures\n');

async function testErrorScenario(scenario) {
  console.log(`\n📝 Scenario: ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  
  try {
    const payload = superjson.serialize(scenario.input);
    const batchPayload = { '0': payload };
    const urlString = `${SERVER_URL}/api/trpc/insights.getStatus?batch=1&input=${encodeURIComponent(JSON.stringify(batchPayload))}`;
    
    const response = await fetch(urlString);
    const text = await response.text();
    
    console.log(`   HTTP ${response.status}`);
    
    if (!response.ok) {
      console.log(`   Error response received`);
      
      // Try to parse error
      try {
        const data = JSON.parse(text);
        console.log(`   ✓ JSON parse succeeded`);
        
        // Check if error object has problematic strings
        const errorStr = JSON.stringify(data);
        console.log(`   Error object length: ${errorStr.length} chars`);
        
        // Test if error can be URL encoded
        try {
          encodeURIComponent(errorStr);
          console.log(`   ✓ Error is URL-encodable`);
        } catch (encodeError) {
          console.error(`   ✗ ERROR CANNOT BE URL ENCODED!`);
          console.error(`   This would cause "string did not match pattern" error!`);
          console.error(`   Encode error: ${encodeError.message}`);
          return { scenario: scenario.name, issue: 'Error not URL-encodable' };
        }
        
        // Test if error message can be used in URL constructor
        try {
          if (data[0]?.error?.message) {
            const testUrl = `https://example.com/${encodeURIComponent(data[0].error.message)}`;
            new URL(testUrl);
            console.log(`   ✓ Error message is URL-safe`);
          }
        } catch (urlError) {
          console.error(`   ✗ ERROR MESSAGE CAUSES URL ERROR!`);
          console.error(`   Message: ${data[0]?.error?.message?.substring(0, 100)}`);
          console.error(`   URL error: ${urlError.message}`);
          return { scenario: scenario.name, issue: 'Error message not URL-safe' };
        }
        
      } catch (parseError) {
        console.error(`   ✗ JSON parse failed: ${parseError.message}`);
        console.error(`   Response preview: ${text.substring(0, 200)}`);
        return { scenario: scenario.name, issue: 'JSON parse failed' };
      }
    }
    
    console.log(`   ✅ PASSED`);
    return null;
    
  } catch (error) {
    console.error(`   ✗ Fetch error: ${error.message}`);
    
    if (error.message.includes('string did not match') || error.message.includes('pattern')) {
      console.error(`\n   🎯 FOUND THE ERROR!`);
      console.error(`   This is the exact error the user sees!`);
      console.error(`   Stack: ${error.stack}`);
      return { scenario: scenario.name, issue: 'Target error found', error: error.message };
    }
    
    return { scenario: scenario.name, issue: error.message };
  }
}

const scenarios = [
  {
    name: 'Invalid ID (triggers not found error)',
    description: 'Request insight that doesn\'t exist',
    input: { id: 999999 }
  },
  {
    name: 'Negative ID (triggers validation error)',
    description: 'Request with invalid ID format',
    input: { id: -1 }
  },
  {
    name: 'String ID (triggers type error)',
    description: 'Request with wrong type',
    input: { id: 'invalid' }
  },
  {
    name: 'Missing ID (triggers validation error)',
    description: 'Request without required field',
    input: {}
  },
  {
    name: 'Null ID (triggers validation error)',
    description: 'Request with null value',
    input: { id: null }
  },
];

async function runErrorAudit() {
  console.log('='.repeat(70));
  const issues = [];
  
  for (const scenario of scenarios) {
    const result = await testErrorScenario(scenario);
    if (result) {
      issues.push(result);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('ERROR HANDLING AUDIT RESULTS');
  console.log('='.repeat(70));
  
  if (issues.length === 0) {
    console.log('✅ ALL ERROR SCENARIOS HANDLED CORRECTLY');
  } else {
    console.log(`❌ ${issues.length} ISSUE(S) FOUND:\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.scenario}`);
      console.log(`   Issue: ${issue.issue}`);
      if (issue.error) {
        console.log(`   Error: ${issue.error}`);
      }
      console.log('');
    });
  }
  
  console.log('='.repeat(70));
  
  return issues.length === 0;
}

runErrorAudit().then(success => {
  process.exit(success ? 0 : 1);
});
