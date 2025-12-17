#!/usr/bin/env node

/**
 * Comprehensive audit script to test insight generation flow
 * Simulates the exact user flow and captures any errors
 */

import superjson from 'superjson';

const SERVER_URL = 'http://localhost:3000';
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${COLORS.reset} ${message}`);
}

function success(message) { log(COLORS.green, '✓', message); }
function error(message) { log(COLORS.red, '✗', message); }
function info(message) { log(COLORS.blue, 'ℹ', message); }
function warn(message) { log(COLORS.yellow, '⚠', message); }

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testGenerationFlow() {
  const errors = [];
  const warnings = [];
  
  try {
    info('Starting comprehensive generation audit...\n');
    
    // Step 1: Get test book
    info('Step 1: Fetching test book...');
    const booksResponse = await fetch(`${SERVER_URL}/api/trpc/books.list?batch=1&input=${encodeURIComponent(JSON.stringify({ '0': {} }))}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!booksResponse.ok) {
      error(`Books list failed: ${booksResponse.status}`);
      errors.push(`Books list HTTP ${booksResponse.status}`);
      return { success: false, errors, warnings };
    }
    
    const booksText = await booksResponse.text();
    const booksData = JSON.parse(booksText);
    const books = superjson.deserialize(booksData[0].result.data);
    
    if (books.length === 0) {
      error('No books found in database');
      errors.push('No test books available');
      return { success: false, errors, warnings };
    }
    
    const testBook = books[0];
    success(`Found test book: "${testBook.title}" (ID: ${testBook.id})`);
    
    // Step 2: Start generation
    info('\nStep 2: Starting insight generation...');
    const generatePayload = superjson.serialize({ bookId: testBook.id });
    const batchPayload = { '0': generatePayload };
    
    const generateResponse = await fetch(`${SERVER_URL}/api/trpc/insights.generate?batch=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload),
    });
    
    if (!generateResponse.ok) {
      error(`Generation failed: ${generateResponse.status}`);
      const errorText = await generateResponse.text();
      errors.push(`Generation HTTP ${generateResponse.status}: ${errorText.substring(0, 200)}`);
      return { success: false, errors, warnings };
    }
    
    const generateText = await generateResponse.text();
    const generateData = JSON.parse(generateText);
    const result = superjson.deserialize(generateData[0].result.data);
    
    success(`Generation started! Insight ID: ${result.insightId}`);
    info(`Initial status: ${result.title || 'No title yet'}`);
    
    // Step 3: Poll for status (simulate what the UI does)
    info('\nStep 3: Polling for generation status...');
    const insightId = result.insightId;
    let pollCount = 0;
    let lastStatus = null;
    const maxPolls = 180; // 3 minutes max
    
    while (pollCount < maxPolls) {
      pollCount++;
      
      try {
        const statusPayload = superjson.serialize({ id: insightId });
        const statusBatch = { '0': statusPayload };
        const statusUrl = `${SERVER_URL}/api/trpc/insights.getStatus?batch=1&input=${encodeURIComponent(JSON.stringify(statusBatch))}`;
        
        // Check if URL is valid before making request
        try {
          new URL(statusUrl);
        } catch (urlError) {
          error(`Invalid URL constructed: ${urlError.message}`);
          errors.push(`URL construction error: ${urlError.message}`);
          warn(`Problematic URL: ${statusUrl.substring(0, 200)}`);
          break;
        }
        
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!statusResponse.ok) {
          warn(`Status poll ${pollCount} failed: ${statusResponse.status}`);
          warnings.push(`Poll ${pollCount}: HTTP ${statusResponse.status}`);
          await sleep(1000);
          continue;
        }
        
        const statusText = await statusResponse.text();
        
        // Check for invalid characters in response
        const invalidChars = statusText.match(/[\x00-\x1F\x7F]/g);
        if (invalidChars) {
          warn(`Found control characters in response: ${invalidChars.map(c => c.charCodeAt(0)).join(', ')}`);
          warnings.push(`Control characters in poll ${pollCount}`);
        }
        
        const statusData = JSON.parse(statusText);
        const status = superjson.deserialize(statusData[0].result.data);
        
        // Validate status object structure
        if (!status || typeof status !== 'object') {
          error(`Invalid status object at poll ${pollCount}`);
          errors.push(`Invalid status structure at poll ${pollCount}`);
          break;
        }
        
        // Check for string validity
        if (status.title && typeof status.title === 'string') {
          try {
            // Test if title can be used in URL
            new URL(`https://example.com/${encodeURIComponent(status.title)}`);
          } catch (urlError) {
            error(`Title contains invalid URL characters: "${status.title.substring(0, 50)}"`);
            errors.push(`Invalid title at poll ${pollCount}: ${urlError.message}`);
          }
        }
        
        if (status.summary && typeof status.summary === 'string') {
          try {
            new URL(`https://example.com/${encodeURIComponent(status.summary.substring(0, 100))}`);
          } catch (urlError) {
            error(`Summary contains invalid URL characters`);
            errors.push(`Invalid summary at poll ${pollCount}: ${urlError.message}`);
          }
        }
        
        // Log progress
        if (status.status !== lastStatus?.status || status.sectionCount !== lastStatus?.sectionCount) {
          info(`Poll ${pollCount}: ${status.status} - ${status.progress}% - ${status.sectionCount} sections`);
          lastStatus = status;
        }
        
        if (status.status === 'completed') {
          success(`\nGeneration completed after ${pollCount} polls!`);
          success(`Final: ${status.sectionCount} sections, ${status.progress}% progress`);
          break;
        }
        
        if (status.status === 'failed') {
          error(`\nGeneration failed at poll ${pollCount}`);
          errors.push('Generation status: failed');
          break;
        }
        
        await sleep(1000); // Poll every second like the UI
        
      } catch (pollError) {
        error(`Poll ${pollCount} error: ${pollError.message}`);
        errors.push(`Poll ${pollCount}: ${pollError.message}`);
        
        // Check if it's the specific URL pattern error
        if (pollError.message.includes('string did not match') || pollError.message.includes('pattern')) {
          error('🔴 FOUND THE ERROR! "String did not match expected pattern"');
          error(`Error occurred at poll ${pollCount}`);
          error(`Error type: ${pollError.name}`);
          error(`Error stack: ${pollError.stack}`);
          errors.push('TARGET ERROR FOUND: String pattern mismatch');
          break;
        }
        
        await sleep(1000);
      }
    }
    
    if (pollCount >= maxPolls) {
      warn('Polling timeout after 3 minutes');
      warnings.push('Polling timeout');
    }
    
    // Step 4: Summary
    info('\n' + '='.repeat(60));
    if (errors.length === 0) {
      success('✓ AUDIT PASSED - No errors detected!');
    } else {
      error(`✗ AUDIT FAILED - ${errors.length} error(s) found`);
      console.log('\nErrors:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
    
    if (warnings.length > 0) {
      warn(`⚠ ${warnings.length} warning(s)`);
      console.log('\nWarnings:');
      warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
    }
    
    return { success: errors.length === 0, errors, warnings };
    
  } catch (fatalError) {
    error(`\nFATAL ERROR: ${fatalError.message}`);
    error(`Stack: ${fatalError.stack}`);
    errors.push(`Fatal: ${fatalError.message}`);
    return { success: false, errors, warnings };
  }
}

// Run the audit
testGenerationFlow().then(result => {
  process.exit(result.success ? 0 : 1);
});
