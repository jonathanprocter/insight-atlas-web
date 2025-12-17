#!/usr/bin/env node

/**
 * End-to-end audit script that tests the complete generation flow
 * Creates a small test book and monitors the entire generation process
 */

import superjson from 'superjson';
import * as db from './server/db.ts';

const SERVER_URL = 'http://localhost:3000';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${COLORS.reset} ${message}`);
}

function success(msg) { log(COLORS.green, '✓', msg); }
function error(msg) { log(COLORS.red, '✗', msg); }
function info(msg) { log(COLORS.blue, 'ℹ', msg); }
function warn(msg) { log(COLORS.yellow, '⚠', msg); }

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2EAudit() {
  const errors = [];
  const warnings = [];
  
  try {
    info('='.repeat(60));
    info('END-TO-END GENERATION AUDIT');
    info('='.repeat(60) + '\n');
    
    // Step 1: Create a small test book
    info('[Step 1] Creating test book in database...');
    const testBookId = await db.createBook({
      userId: 1,
      title: 'Test Book for Audit',
      author: 'Audit Script',
      content: 'This is a short test book with minimal content. It should generate quickly. The book discusses testing and validation of software systems.',
      wordCount: 25,
      pageCount: 1,
      uploadedAt: new Date(),
    });
    success(`Created test book ID: ${testBookId}\n`);
    
    // Step 2: Start generation via API
    info('[Step 2] Starting insight generation via API...');
    const generatePayload = superjson.serialize({ bookId: testBookId });
    const batchPayload = { '0': generatePayload };
    
    const generateResponse = await fetch(`${SERVER_URL}/api/trpc/insights.generate?batch=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload),
    });
    
    if (!generateResponse.ok) {
      error(`Generation API failed: HTTP ${generateResponse.status}`);
      const errorText = await generateResponse.text();
      errors.push(`Generation failed: ${errorText.substring(0, 200)}`);
      return { success: false, errors, warnings };
    }
    
    const generateText = await generateResponse.text();
    const generateData = JSON.parse(generateText);
    const result = superjson.deserialize(generateData[0].result.data);
    
    const insightId = result.insightId;
    success(`Generation started! Insight ID: ${insightId}\n`);
    
    // Step 3: Poll for status and monitor for errors
    info('[Step 3] Monitoring generation with real-time polling...');
    info('Watching for "string did not match expected pattern" errors...\n');
    
    let pollCount = 0;
    let lastStatus = null;
    let lastSectionCount = 0;
    const maxPolls = 120; // 2 minutes max
    let generationComplete = false;
    
    while (pollCount < maxPolls && !generationComplete) {
      pollCount++;
      
      try {
        // Construct the status query exactly like the UI does
        const statusPayload = superjson.serialize({ id: insightId });
        const statusBatch = { '0': statusPayload };
        const statusUrl = `${SERVER_URL}/api/trpc/insights.getStatus?batch=1&input=${encodeURIComponent(JSON.stringify(statusBatch))}`;
        
        // Validate URL construction
        try {
          const urlObj = new URL(statusUrl);
          if (pollCount === 1) {
            info(`URL format: ${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, 30)}...`);
          }
        } catch (urlError) {
          error(`🔴 URL CONSTRUCTION ERROR at poll ${pollCount}`);
          error(`   Message: ${urlError.message}`);
          error(`   URL: ${statusUrl.substring(0, 200)}`);
          errors.push(`Poll ${pollCount}: URL construction failed - ${urlError.message}`);
          break;
        }
        
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!statusResponse.ok) {
          warn(`Poll ${pollCount}: HTTP ${statusResponse.status}`);
          warnings.push(`Poll ${pollCount}: HTTP ${statusResponse.status}`);
          await sleep(1000);
          continue;
        }
        
        const statusText = await statusResponse.text();
        
        // Check for problematic characters
        const controlChars = statusText.match(/[\x00-\x1F\x7F]/g);
        if (controlChars) {
          warn(`Poll ${pollCount}: Found ${controlChars.length} control character(s)`);
          warnings.push(`Poll ${pollCount}: Control characters in response`);
        }
        
        // Check for unpaired surrogates
        const surrogates = statusText.match(/[\uD800-\uDFFF]/g);
        if (surrogates) {
          warn(`Poll ${pollCount}: Found ${surrogates.length} unpaired surrogate(s)`);
          warnings.push(`Poll ${pollCount}: Unpaired surrogates in response`);
        }
        
        // Parse response
        let statusData, status;
        try {
          statusData = JSON.parse(statusText);
          status = superjson.deserialize(statusData[0].result.data);
        } catch (parseError) {
          error(`🔴 JSON PARSE ERROR at poll ${pollCount}`);
          error(`   Message: ${parseError.message}`);
          error(`   Response preview: ${statusText.substring(0, 200)}`);
          errors.push(`Poll ${pollCount}: JSON parse failed - ${parseError.message}`);
          break;
        }
        
        // Validate status structure
        if (!status || typeof status !== 'object') {
          error(`🔴 INVALID STATUS OBJECT at poll ${pollCount}`);
          error(`   Type: ${typeof status}`);
          error(`   Value: ${JSON.stringify(status)}`);
          errors.push(`Poll ${pollCount}: Invalid status structure`);
          break;
        }
        
        // Test string fields for URL safety
        if (status.title && typeof status.title === 'string') {
          try {
            const testUrl = new URL(`https://example.com/${encodeURIComponent(status.title)}`);
          } catch (urlError) {
            error(`🔴 TITLE URL ERROR at poll ${pollCount}`);
            error(`   Message: ${urlError.message}`);
            error(`   Title: "${status.title.substring(0, 100)}"`);
            error(`   Title length: ${status.title.length}`);
            error(`   Title bytes: ${Buffer.from(status.title).toString('hex').substring(0, 100)}`);
            errors.push(`Poll ${pollCount}: Title not URL-safe - ${urlError.message}`);
          }
        }
        
        if (status.summary && typeof status.summary === 'string') {
          try {
            const testUrl = new URL(`https://example.com/${encodeURIComponent(status.summary.substring(0, 100))}`);
          } catch (urlError) {
            error(`🔴 SUMMARY URL ERROR at poll ${pollCount}`);
            error(`   Message: ${urlError.message}`);
            error(`   Summary preview: "${status.summary.substring(0, 100)}"`);
            errors.push(`Poll ${pollCount}: Summary not URL-safe - ${urlError.message}`);
          }
        }
        
        // Log progress changes
        if (status.status !== lastStatus || status.sectionCount !== lastSectionCount) {
          info(`Poll ${pollCount}: ${status.status} | ${status.progress}% | ${status.sectionCount} sections`);
          if (status.title && status.title !== 'Insights: Test Book for Audit') {
            info(`  Title: ${status.title.substring(0, 60)}${status.title.length > 60 ? '...' : ''}`);
          }
          lastStatus = status.status;
          lastSectionCount = status.sectionCount;
        }
        
        // Check completion
        if (status.status === 'completed') {
          success(`\n✓ Generation completed after ${pollCount} polls!`);
          success(`  Final: ${status.sectionCount} sections, ${status.progress}% progress`);
          generationComplete = true;
          break;
        }
        
        if (status.status === 'failed') {
          error(`\n✗ Generation failed at poll ${pollCount}`);
          errors.push(`Generation status: failed`);
          break;
        }
        
        await sleep(1000);
        
      } catch (pollError) {
        error(`🔴 POLL ERROR at iteration ${pollCount}`);
        error(`   Type: ${pollError.name}`);
        error(`   Message: ${pollError.message}`);
        
        // Check for the target error
        if (pollError.message.includes('string did not match') || 
            pollError.message.includes('pattern') ||
            pollError.message.toLowerCase().includes('url')) {
          error(`\n${'='.repeat(60)}`);
          error(`🎯 TARGET ERROR FOUND!`);
          error(`${'='.repeat(60)}`);
          error(`Poll number: ${pollCount}`);
          error(`Error name: ${pollError.name}`);
          error(`Error message: ${pollError.message}`);
          error(`Stack trace:\n${pollError.stack}`);
          error(`${'='.repeat(60)}\n`);
          errors.push(`🎯 TARGET ERROR at poll ${pollCount}: ${pollError.message}`);
          break;
        }
        
        errors.push(`Poll ${pollCount}: ${pollError.message}`);
        await sleep(1000);
      }
    }
    
    if (pollCount >= maxPolls) {
      warn('Polling timeout after 2 minutes');
      warnings.push('Polling timeout');
    }
    
    // Step 4: Cleanup
    info('\n[Step 4] Cleaning up test data...');
    await db.deleteBook(testBookId);
    success('Test book deleted\n');
    
    // Summary
    info('='.repeat(60));
    if (errors.length === 0) {
      success('✓✓✓ AUDIT PASSED - No errors detected! ✓✓✓');
    } else {
      error(`✗✗✗ AUDIT FAILED - ${errors.length} error(s) found ✗✗✗`);
      console.log('\n📋 ERRORS:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
    
    if (warnings.length > 0) {
      warn(`\n⚠ ${warnings.length} WARNING(S):`);
      warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
    }
    info('='.repeat(60));
    
    return { success: errors.length === 0, errors, warnings };
    
  } catch (fatalError) {
    error(`\n💥 FATAL ERROR: ${fatalError.message}`);
    error(`Stack:\n${fatalError.stack}`);
    errors.push(`Fatal: ${fatalError.message}`);
    return { success: false, errors, warnings };
  }
}

// Run the audit
runE2EAudit().then(result => {
  process.exit(result.success ? 0 : 1);
});
