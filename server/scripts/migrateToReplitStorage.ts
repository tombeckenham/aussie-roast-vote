/**
 * Script to migrate base64-encoded images from candidate.imageUrl field to Replit storage
 * This handles images that were accidentally stored as base64 data instead of URLs
 */

import { db } from '../db';
import { candidates } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import replitStorageService from '../services/replitStorageService';

// Force console output to show in real-time
process.env.FORCE_COLOR = '1';

/**
 * Main function to migrate base64 images to Replit storage
 */
async function migrateToReplitStorage() {
  console.log('🖼️ Migrating base64 images from candidate.imageUrl to Replit storage...');
  
  try {
    // Create the storage directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'public', 'storage');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log(`Created directory: ${publicDir}`);
    }
    
    // Fetch all candidates
    const allCandidates = await db.select().from(candidates);
    console.log(`Found ${allCandidates.length} candidates in the database`);
    
    // Counter for stats
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const candidate of allCandidates) {
      try {
        if (!candidate.imageUrl) {
          console.log(`Skipping candidate ${candidate.id}: ${candidate.name} (no image)`);
          skippedCount++;
          continue;
        }
        
        // Check if the imageUrl field contains base64 data
        // Base64 images typically start with data:image/<format>;base64,
        if (candidate.imageUrl.startsWith('data:image/')) {
          console.log(`Migrating image for candidate ${candidate.id}: ${candidate.name}`);
          
          // Save to Replit storage
          const publicUrl = await replitStorageService.saveBase64Image(
            candidate.imageUrl,
            candidate.id,
            candidate.surname
          );
          
          // Update the candidate record with the new URL
          await db.update(candidates)
            .set({ imageUrl: publicUrl })
            .where(eq(candidates.id, candidate.id));
          
          console.log(`Updated candidate ${candidate.id}: ${candidate.name} with new image URL: ${publicUrl}`);
          migratedCount++;
        } else if (candidate.imageUrl.length > 500) {
          // This is likely a base64 string without the proper prefix
          console.log(`Candidate ${candidate.id}: ${candidate.name} has a long URL (${candidate.imageUrl.length} chars)`);
          
          try {
            // Save to Replit storage
            const publicUrl = await replitStorageService.saveBase64Image(
              candidate.imageUrl,
              candidate.id,
              candidate.surname,
              'jpg'
            );
            
            // Update the candidate record with the new URL
            await db.update(candidates)
              .set({ imageUrl: publicUrl })
              .where(eq(candidates.id, candidate.id));
            
            console.log(`Updated candidate ${candidate.id}: ${candidate.name} with new image URL: ${publicUrl}`);
            migratedCount++;
          } catch (decodeError) {
            console.error(`Error decoding base64 data for candidate ${candidate.id}:`, decodeError);
            errorCount++;
          }
        } else {
          // This appears to be a valid URL, not base64 data
          console.log(`Skipping candidate ${candidate.id}: ${candidate.name} (already has URL)`);
          skippedCount++;
        }
      } catch (candidateError) {
        console.error(`Error processing candidate ${candidate.id}:`, candidateError);
        errorCount++;
      }
    }
    
    console.log('Migration complete:');
    console.log(`- Migrated: ${migratedCount} images`);
    console.log(`- Skipped: ${skippedCount} candidates`);
    console.log(`- Errors: ${errorCount} candidates`);
  } catch (error) {
    console.error('Error migrating images:', error);
  }
}

async function main() {
  try {
    await migrateToReplitStorage();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();