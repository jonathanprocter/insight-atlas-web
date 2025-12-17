#!/usr/bin/env node

/**
 * Audit script that tests polling on an ACTIVE generating insight
 * This tests the exact scenario where the user sees the error
 */

import superjson from 'superjson';

const SERVER_URL = 'http://localhost:3000';
const INSIGHT_ID = 690001; // The insight currently generating

console.log('🔍 ACTIVE GENERATION POLLING AUDIT\n');
console.log(`Testing getStatus polling on insight ID: ${INSIGHT_ID}`);
console.log(`This insight should be actively generating right now.\n`);

const errors = [];
const warnings = [];

async function testActivePolling() {
  for (let i = 1; i <= 20; i++) {
    try {
      const statusPayload = superjson.serialize({ id: INSIGHT_ID });
      const statusBatch = { '0': statusPayload };
      const statusUrl = `${SERVER_URL}/api/trpc/insights.getStatus?batch=1&input=${encodeURIComponent(JSON.stringify(statusBatch))}`;
      
      // Test URL construction
      try {
        new URL(statusUrl);
      } catch (urlError) {
        console.error(`\n🔴 Poll ${i}: URL CONSTRUCTION ERROR`);
        console.error(`   ${urlError.message}`);
        errors.push(`Poll ${i}: URL error - ${urlError.message}`);
        continue;
      }
      
      const response = await fetch(statusUrl);
      
      if (!response.ok) {
        console.log(`⚠ Poll ${i}: HTTP ${response.status}`);
        warnings.push(`Poll ${i}: HTTP ${response.status}`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      
      const text = await response.text();
      
      // Check for problematic characters
      const controlChars = text.match(/[\x00-\x1F\x7F]/g);
      if (controlChars) {
        console.error(`🔴 Poll ${i}: Found ${controlChars.length} control character(s)`);
        errors.push(`Poll ${i}: Control characters`);
      }
      
      const surrogates = text.match(/[\uD800-\uDFFF]/g);
      if (surrogates) {
        console.error(`🔴 Poll ${i}: Found ${surrogates.length} unpaired surrogate(s)`);
        errors.push(`Poll ${i}: Unpaired surrogates`);
      }
      
      // Parse
      const data = JSON.parse(text);
      const status = superjson.deserialize(data[0].result.data);
      
      // Test string fields
      if (status.title && typeof status.title === 'string') {
        try {
          new URL(`https://example.com/${encodeURIComponent(status.title)}`);
        } catch (urlError) {
          console.error(`\n🔴 Poll ${i}: TITLE URL ERROR`);
          console.error(`   Message: ${urlError.message}`);
          console.error(`   Title: "${status.title.substring(0, 100)}"`);
          errors.push(`Poll ${i}: Title URL error`);
        }
      }
      
      if (status.summary && typeof status.summary === 'string') {
        try {
          new URL(`https://example.com/${encodeURIComponent(status.summary.substring(0, 100))}`);
        } catch (urlError) {
          console.error(`\n🔴 Poll ${i}: SUMMARY URL ERROR`);
          console.error(`   Message: ${urlError.message}`);
          console.error(`   Summary: "${status.summary.substring(0, 100)}"`);
          errors.push(`Poll ${i}: Summary URL error`);
        }
      }
      
      console.log(`✓ Poll ${i}: ${status.status} | ${status.progress}% | ${status.sectionCount} sections`);
      
      if (status.status === 'completed' || status.status === 'failed') {
        console.log(`\nGeneration ${status.status}. Stopping audit.`);
        break;
      }
      
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (pollError) {
      console.error(`\n🔴 Poll ${i}: ${pollError.name}`);
      console.error(`   Message: ${pollError.message}`);
      
      if (pollError.message.includes('string did not match') || 
          pollError.message.includes('pattern')) {
        console.error(`\n${'='.repeat(60)}`);
        console.error(`🎯 FOUND THE TARGET ERROR!`);
        console.error(`${'='.repeat(60)}`);
        console.error(`Poll: ${i}`);
        console.error(`Error: ${pollError.message}`);
        console.error(`Stack:\n${pollError.stack}`);
        console.error(`${'='.repeat(60)}\n`);
        errors.push(`🎯 TARGET ERROR at poll ${i}`);
        break;
      }
      
      errors.push(`Poll ${i}: ${pollError.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (errors.length === 0) {
    console.log('✅ AUDIT PASSED - No errors during active generation polling!');
  } else {
    console.log(`❌ AUDIT FAILED - ${errors.length} error(s):`);
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):`);
    warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  }
  console.log('='.repeat(60));
  
  return errors.length === 0;
}

testActivePolling().then(success => {
  process.exit(success ? 0 : 1);
});
