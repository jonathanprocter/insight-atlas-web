/**
 * Comprehensive Generation Error Audit
 * 
 * This script will:
 * 1. Test the entire generation pipeline
 * 2. Capture all errors with full stack traces
 * 3. Test tRPC serialization
 * 4. Identify the exact source of "string did not match expected pattern"
 */

import { generatePremiumInsight } from './server/services/premiumInsightPipeline';
import * as db from './server/db';

async function auditGenerationError() {
  console.log('=== COMPREHENSIVE GENERATION ERROR AUDIT ===\n');
  
  try {
    // Step 1: Get a real book from database
    console.log('Step 1: Fetching book from database...');
    const books = await db.getAllBooks();
    if (books.length === 0) {
      console.log('❌ No books found in database');
      return;
    }
    
    const book = books[0];
    console.log(`✅ Found book: "${book.title}" by ${book.author}`);
    console.log(`   Word count: ${book.wordCount}, Text length: ${book.extractedText?.length || 0}\n`);
    
    // Step 2: Create insight record
    console.log('Step 2: Creating insight record...');
    const insightId = await db.createInsight({
      userId: 1,
      bookId: book.id,
      title: `Test Audit: ${book.title}`,
      summary: "",
      status: "generating",
      keyThemes: JSON.stringify([]),
      audioScript: "",
    });
    console.log(`✅ Created insight ID: ${insightId}\n`);
    
    // Step 3: Test generation with full error capture
    console.log('Step 3: Running generation pipeline with error capture...');
    
    const updateProgress = async (stage: string, progress: number) => {
      console.log(`   Progress: ${stage} - ${progress}%`);
      await db.updateInsight(insightId, {
        currentStage: stage,
        generationProgress: progress,
        status: stage === 'completed' ? 'completed' : 'generating'
      });
    };
    
    try {
      const result = await generatePremiumInsight(
        book.title,
        book.author,
        book.extractedText || "",
        insightId,
        updateProgress
      );
      
      console.log('\n✅ Generation completed successfully!');
      console.log(`   Sections: ${result.sections.length}`);
      console.log(`   Word count: ${result.wordCount}`);
      console.log(`   Key themes: ${result.keyThemes.length}`);
      
      // Step 4: Test tRPC serialization
      console.log('\nStep 4: Testing tRPC response serialization...');
      
      // Simulate what the mutation returns
      const mutationResponse = { insightId };
      console.log('   Mutation response:', mutationResponse);
      console.log('   insightId type:', typeof insightId);
      console.log('   insightId value:', insightId);
      console.log('   Is valid number:', typeof insightId === 'number' && insightId > 0);
      
      // Test JSON serialization
      try {
        const serialized = JSON.stringify(mutationResponse);
        console.log('   ✅ JSON serialization successful:', serialized);
      } catch (serError) {
        console.log('   ❌ JSON serialization failed:', serError);
      }
      
      // Step 5: Check for problematic characters in result
      console.log('\nStep 5: Checking for problematic characters...');
      
      const checkString = (str: string, name: string) => {
        const hasControlChars = /[\x00-\x1F\x7F-\x9F]/.test(str);
        const hasNonASCII = /[^\x20-\x7E]/.test(str);
        const hasQuotes = /["'`]/.test(str);
        
        if (hasControlChars || hasNonASCII || hasQuotes) {
          console.log(`   ⚠️  ${name} has problematic characters:`);
          if (hasControlChars) console.log('      - Control characters');
          if (hasNonASCII) console.log('      - Non-ASCII characters');
          if (hasQuotes) console.log('      - Quotes');
        } else {
          console.log(`   ✅ ${name} is clean`);
        }
      };
      
      checkString(result.title, 'Title');
      checkString(result.summary, 'Summary');
      result.keyThemes.forEach((theme, i) => checkString(theme, `Theme ${i + 1}`));
      
      console.log('\n=== AUDIT COMPLETE - NO ERRORS FOUND ===');
      
    } catch (genError) {
      console.log('\n❌ Generation failed with error:');
      console.log('   Error:', genError);
      console.log('   Message:', genError instanceof Error ? genError.message : String(genError));
      console.log('   Stack:', genError instanceof Error ? genError.stack : 'No stack trace');
      
      // Check if this is the "string did not match expected pattern" error
      const errorMessage = genError instanceof Error ? genError.message : String(genError);
      if (errorMessage.includes('string did not match') || errorMessage.includes('expected pattern')) {
        console.log('\n🎯 FOUND THE ERROR!');
        console.log('   This is the "string did not match expected pattern" error');
        console.log('   Error details:', genError);
      }
    }
    
  } catch (error) {
    console.log('\n❌ Audit failed:');
    console.log('   Error:', error);
    console.log('   Message:', error instanceof Error ? error.message : String(error));
    console.log('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Run the audit
auditGenerationError()
  .then(() => {
    console.log('\nAudit script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nAudit script crashed:', error);
    process.exit(1);
  });
