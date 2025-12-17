#!/usr/bin/env node

/**
 * Test script to simulate the exact generation flow and identify the error
 */

import superjson from 'superjson';

const SERVER_URL = 'http://localhost:3000';

async function testGenerationFlow() {
  console.log('[Test] Starting generation flow test...');
  
  try {
    // Step 1: Get the latest book
    console.log('\n[Step 1] Fetching books...');
    const booksResponse = await fetch(`${SERVER_URL}/api/trpc/books.list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('[Step 1] Books response status:', booksResponse.status);
    const booksText = await booksResponse.text();
    console.log('[Step 1] Books response text (first 500 chars):', booksText.substring(0, 500));
    
    const booksData = JSON.parse(booksText);
    const books = superjson.deserialize(booksData.result.data);
    console.log('[Step 1] Books count:', books.length);
    
    if (books.length === 0) {
      console.log('[Test] No books found. Please upload a book first.');
      return;
    }
    
    const testBook = books[0];
    console.log('[Step 1] Test book:', { id: testBook.id, title: testBook.title });
    
    // Step 2: Call generate mutation using batch link format
    console.log('\n[Step 2] Calling generate mutation...');
    const generatePayload = superjson.serialize({ bookId: testBook.id });
    
    console.log('[Step 2] Generate payload:', JSON.stringify(generatePayload));
    
    const batchPayload = {
      '0': generatePayload
    };
    
    const generateResponse = await fetch(`${SERVER_URL}/api/trpc/insights.generate?batch=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(batchPayload),
    });
    
    console.log('[Step 2] Generate response status:', generateResponse.status);
    console.log('[Step 2] Generate response headers:', Object.fromEntries(generateResponse.headers.entries()));
    
    const generateText = await generateResponse.text();
    console.log('[Step 2] Generate response text (first 1000 chars):', generateText.substring(0, 1000));
    
    // Try to parse the response
    console.log('\n[Step 3] Parsing response...');
    const generateData = JSON.parse(generateText);
    console.log('[Step 3] Parsed JSON:', JSON.stringify(generateData, null, 2).substring(0, 1000));
    
    // Try to deserialize with superjson
    console.log('\n[Step 4] Deserializing with superjson...');
    const result = superjson.deserialize(generateData.result.data);
    console.log('[Step 4] Deserialized result:', result);
    
    // Check for invalid characters in the result
    console.log('\n[Step 5] Checking for invalid characters...');
    const checkString = (str, name) => {
      if (!str) return;
      
      // Check for control characters
      const controlChars = str.match(/[\x00-\x1F\x7F]/g);
      if (controlChars) {
        console.log(`[Step 5] Found control characters in ${name}:`, controlChars.map(c => c.charCodeAt(0)));
      }
      
      // Check for unpaired surrogates
      const surrogates = str.match(/[\uD800-\uDFFF]/g);
      if (surrogates) {
        console.log(`[Step 5] Found unpaired surrogates in ${name}:`, surrogates.map(c => c.charCodeAt(0)));
      }
      
      // Try to create a URL with the string
      try {
        new URL(`https://example.com/${encodeURIComponent(str)}`);
        console.log(`[Step 5] URL creation with ${name}: OK`);
      } catch (error) {
        console.log(`[Step 5] URL creation with ${name}: FAILED -`, error.message);
      }
    };
    
    if (result.title) checkString(result.title, 'title');
    if (result.summary) checkString(result.summary, 'summary');
    if (result.keyThemes) {
      result.keyThemes.forEach((theme, i) => checkString(theme, `keyTheme[${i}]`));
    }
    
    console.log('\n[Test] ✓ Generation flow completed successfully!');
    console.log('[Test] Result:', result);
    
  } catch (error) {
    console.error('\n[Test] ✗ Error occurred:', error);
    console.error('[Test] Error name:', error.name);
    console.error('[Test] Error message:', error.message);
    console.error('[Test] Error stack:', error.stack);
  }
}

testGenerationFlow();
