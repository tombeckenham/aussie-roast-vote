/**
 * Script to generate caricature descriptions for candidates using xAI
 * This will create humorous descriptions that could be used with image generation
 */

import { db } from '../db';
import { candidates } from '@shared/schema';
import xaiService from '../services/xaiService';
import fs from 'fs';
import path from 'path';

// Force console output to show in real-time
process.env.FORCE_COLOR = '1';

/**
 * Generate caricature descriptions for all candidates
 */
async function generateCandidateCaricatures() {
  console.log('🎭 Generating candidate caricatures using xAI...');
  
  try {
    // Get all candidates
    const allCandidates = await db.select().from(candidates);
    console.log(`Found ${allCandidates.length} candidates in the database`);
    
    // Directory to store the caricature descriptions
    const outputDir = path.join(process.cwd(), 'server/data/caricatures');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }
    
    // Limit to a small number for testing
    const limitedCandidates = allCandidates.slice(0, 5);
    
    // Process each candidate
    let successCount = 0;
    let failCount = 0;
    
    for (const candidate of limitedCandidates) {
      try {
        console.log(`Processing candidate ${candidate.id}: ${candidate.name}`);
        
        // Generate caricature description
        const caricatureDesc = await xaiService.generateCandidateCaricature(candidate);
        
        if (caricatureDesc) {
          // Write the description to a file
          const filename = `${candidate.id}_${candidate.surname.toLowerCase()}.txt`;
          const filePath = path.join(outputDir, filename);
          
          fs.writeFileSync(filePath, caricatureDesc, 'utf8');
          console.log(`✅ Generated caricature for ${candidate.name}`);
          successCount++;
        } else {
          console.log(`❌ Failed to generate caricature for ${candidate.name}`);
          failCount++;
        }
        
        // Add a small delay between requests to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (candidateError) {
        console.error(`Error processing candidate ${candidate.name}:`, candidateError);
        failCount++;
      }
    }
    
    console.log('====== GENERATION SUMMARY ======');
    console.log(`Processed candidates: ${limitedCandidates.length}`);
    console.log(`Successfully generated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    return { 
      success: true, 
      processed: limitedCandidates.length,
      succeeded: successCount,
      failed: failCount
    };
  } catch (error) {
    console.error('Error generating caricatures:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCandidateCaricatures()
    .then(result => {
      if (result.success) {
        console.log('✅ Script completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Script failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('❌ Unexpected error:', err);
      process.exit(1);
    });
}

export { generateCandidateCaricatures };