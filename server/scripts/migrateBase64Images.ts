/**
 * Script to migrate base64-encoded images from candidate.imageUrl field to local file storage
 * This handles images that were accidentally stored as base64 data instead of URLs
 */

import { db } from '../db';
import { candidates } from '@shared/schema';
import { eq, like } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Force console output to show in real-time
process.env.FORCE_COLOR = '1';

const IMAGE_STORAGE_DIR = path.join(process.cwd(), 'public', 'images', 'candidates');
const PUBLIC_PATH_PREFIX = '/images/candidates';

/**
 * Main function to migrate base64 images to local storage
 */
async function migrateBase64Images() {
  console.log('🖼️ Migrating base64 images from candidate.imageUrl to local storage...');
  
  try {
    // Create directories if they don't exist
    if (!fs.existsSync(IMAGE_STORAGE_DIR)) {
      fs.mkdirSync(IMAGE_STORAGE_DIR, { recursive: true });
      console.log(`Created directory: ${IMAGE_STORAGE_DIR}`);
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
          
          // Extract image format and data
          const matches = candidate.imageUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
          if (!matches) {
            console.log(`Skipping candidate ${candidate.id}: Invalid base64 image format`);
            skippedCount++;
            continue;
          }
          
          const imageFormat = matches[1];
          const base64Data = matches[2];
          
          // Create a unique filename
          const filename = `${candidate.id}_${candidate.surname.toLowerCase()}_${uuidv4().substring(0, 8)}.${imageFormat}`;
          const filePath = path.join(IMAGE_STORAGE_DIR, filename);
          const publicUrl = `${PUBLIC_PATH_PREFIX}/${filename}`;
          
          // Save the image to disk
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          console.log(`Saved image to ${filePath}`);
          
          // Update the candidate record with the new URL
          await db.update(candidates)
            .set({ imageUrl: publicUrl })
            .where(eq(candidates.id, candidate.id));
          
          console.log(`Updated candidate ${candidate.id}: ${candidate.name} with new image URL: ${publicUrl}`);
          migratedCount++;
        } else if (candidate.imageUrl.length > 500) {
          // This is likely a base64 string without the proper prefix
          console.log(`Candidate ${candidate.id}: ${candidate.name} has a long URL (${candidate.imageUrl.length} chars)`);
          
          // Handle raw base64 data without the data:image prefix
          // We'll assume it's a JPEG if we can't determine the format
          const imageFormat = 'jpg';
          const base64Data = candidate.imageUrl;
          
          try {
            // Create a unique filename
            const filename = `${candidate.id}_${candidate.surname.toLowerCase()}_${uuidv4().substring(0, 8)}.${imageFormat}`;
            const filePath = path.join(IMAGE_STORAGE_DIR, filename);
            const publicUrl = `${PUBLIC_PATH_PREFIX}/${filename}`;
            
            // Try to decode and save the image
            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
            console.log(`Saved image to ${filePath}`);
            
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
    
    console.log('Remember to update the caricature generation code to save images locally!');
  } catch (error) {
    console.error('Error migrating images:', error);
  }
}

async function main() {
  try {
    await migrateBase64Images();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();