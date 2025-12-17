#!/usr/bin/env node

/**
 * Quick audit script to test the polling mechanism
 * Uses an existing insight to avoid waiting for generation
 */

import superjson from 'superjson';
import * as db from './server/db.ts';

const SERVER_URL = 'http://localhost:3000';

async function testPolling() {
  console.log('[Audit] Testing polling mechanism...\n');
  
  try {
    // Step 1: Get an existing insight from the database
    console.log('[Step 1] Fetching existing insights from database...');
    const insights = await db.getInsightsByUserId(1); // Get insights for first user
    
    if (insights.length === 0) {
      console.log('⚠ No existing insights found. Creating a test book and generating...');
      // Fall back to creating a new one
      return await testNewGeneration();
    }
    
    const testInsight = insights[0];
    console.log(`✓ Found insight ID: ${testInsight.id}, Status: ${testInsight.status}\n`);
    
    // Step 2: Test polling this insight
    console.log('[Step 2] Testing getStatus polling (10 iterations)...');
    const errors = [];
    
    for (let i = 1; i <= 10; i++) {
      try {
        const statusPayload = superjson.serialize({ id: testInsight.id });
        const statusBatch = { '0': statusPayload };
        const statusUrl = `${SERVER_URL}/api/trpc/insights.getStatus?batch=1&input=${encodeURIComponent(JSON.stringify(statusBatch))}`;
        
        // Test URL construction
        try {
          new URL(statusUrl);
        } catch (urlError) {
          console.error(`✗ Poll ${i}: Invalid URL - ${urlError.message}`);
          errors.push(`Poll ${i}: URL error - ${urlError.message}`);
          continue;
        }
        
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!statusResponse.ok) {
          console.error(`✗ Poll ${i}: HTTP ${statusResponse.status}`);
          errors.push(`Poll ${i}: HTTP ${statusResponse.status}`);
          continue;
        }
        
        const statusText = await statusResponse.text();
        
        // Check for control characters
        const controlChars = statusText.match(/[\x00-\x1F\x7F]/g);
        if (controlChars) {
          console.error(`✗ Poll ${i}: Found control characters: ${controlChars.map(c => '0x' + c.charCodeAt(0).toString(16)).join(', ')}`);
          errors.push(`Poll ${i}: Control characters found`);
        }
        
        const statusData = JSON.parse(statusText);
        const status = superjson.deserialize(statusData[0].result.data);
        
        // Validate status structure
        if (!status || typeof status !== 'object') {
          console.error(`✗ Poll ${i}: Invalid status object`);
          errors.push(`Poll ${i}: Invalid status structure`);
          continue;
        }
        
        // Test string fields for URL safety
        if (status.title && typeof status.title === 'string') {
          try {
            new URL(`https://example.com/${encodeURIComponent(status.title)}`);
          } catch (urlError) {
            console.error(`✗ Poll ${i}: Title not URL-safe - ${urlError.message}`);
            console.error(`   Title: "${status.title.substring(0, 100)}"`);
            errors.push(`Poll ${i}: Title URL error`);
          }
        }
        
        if (status.summary && typeof status.summary === 'string') {
          try {
            new URL(`https://example.com/${encodeURIComponent(status.summary.substring(0, 100))}`);
          } catch (urlError) {
            console.error(`✗ Poll ${i}: Summary not URL-safe - ${urlError.message}`);
            errors.push(`Poll ${i}: Summary URL error`);
          }
        }
        
        console.log(`✓ Poll ${i}: OK - Status: ${status.status}, Progress: ${status.progress}%, Sections: ${status.sectionCount}`);
        
      } catch (pollError) {
        console.error(`✗ Poll ${i}: ${pollError.name} - ${pollError.message}`);
        
        if (pollError.message.includes('string did not match') || pollError.message.includes('pattern')) {
          console.error(`\n🔴 FOUND IT! The "string did not match expected pattern" error!`);
          console.error(`   Error at poll ${i}`);
          console.error(`   Stack: ${pollError.stack}`);
          errors.push(`Poll ${i}: TARGET ERROR - ${pollError.message}`);
        } else {
          errors.push(`Poll ${i}: ${pollError.message}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    if (errors.length === 0) {
      console.log('✓ AUDIT PASSED - All 10 polls successful!');
      return true;
    } else {
      console.log(`✗ AUDIT FAILED - ${errors.length} error(s) found:`);
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      return false;
    }
    
  } catch (error) {
    console.error(`\n✗ FATAL ERROR: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    return false;
  }
}

async function testNewGeneration() {
  console.log('[Fallback] No existing insights, testing with new generation...');
  // This would be the same as audit-generation.mjs
  console.log('⚠ Skipping - would take too long');
  return false;
}

// Run the audit
testPolling().then(success => {
  process.exit(success ? 0 : 1);
});
