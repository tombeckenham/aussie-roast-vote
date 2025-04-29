/**
 * Batch migration script to move all remaining base64 images to Replit storage
 */

import { db } from "../db";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Configuration
const BATCH_SIZE = 25; // Process this many images at a time (reduced to prevent timeouts)
const STORAGE_DIR = path.join(process.cwd(), "public", "storage");

// Create the storage directory if it doesn't exist
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  console.log(`Created storage directory at ${STORAGE_DIR}`);
}

/**
 * Save a base64 image to Replit storage and return the public URL
 */
async function saveBase64ImageToStorage(
  base64Data: string,
  candidateId: number,
  candidateName: string
): Promise<string> {
  try {
    // Strip data:image prefix if present
    let imageData = base64Data;
    let imageFormat = "jpg"; // Default format
    
    if (base64Data.startsWith("data:image/")) {
      const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        imageFormat = matches[1];
        imageData = matches[2];
      }
    }
    
    // Sanitize the candidate name for the filename
    const sanitizedName = candidateName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    // Create a unique filename
    const filename = `candidate_${candidateId}_${sanitizedName}_${uuidv4().substring(0, 8)}.${imageFormat}`;
    const storagePath = path.join(STORAGE_DIR, filename);
    
    // Write the file
    fs.writeFileSync(storagePath, Buffer.from(imageData, "base64"));
    
    // Return the public URL to the file
    const publicUrl = `/storage/${filename}`;
    console.log(`Saved image to Replit storage: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("Error saving base64 image to Replit storage:", error);
    throw error;
  }
}

/**
 * Process a batch of images
 */
async function processBatch(offset: number): Promise<number> {
  // Get a batch of candidates with base64-encoded images
  const result = await db.execute(
    `SELECT id, name, image_url FROM candidates 
     WHERE image_url LIKE '/9j/%' OR image_url LIKE 'data:image/%' 
     LIMIT ${BATCH_SIZE} OFFSET ${offset}`
  );
  
  if (!result.rows || result.rows.length === 0) {
    return 0;
  }
  
  console.log(`Processing batch of ${result.rows.length} candidates (offset ${offset})...`);
  
  // Process each candidate in the batch
  for (const row of result.rows) {
    if (!row.image_url) continue;
    
    const candidateId = row.id;
    const candidateName = row.name;
    
    console.log(`Processing candidate ${candidateId}: ${candidateName}`);
    
    try {
      // Save image to storage
      const newImageUrl = await saveBase64ImageToStorage(
        row.image_url,
        candidateId,
        candidateName
      );
      
      // Update the database with the new URL
      await db.execute(
        `UPDATE candidates SET image_url = '${newImageUrl}' WHERE id = ${candidateId}`
      );
      
      console.log(`Updated candidate ${candidateId} with new image URL: ${newImageUrl}`);
    } catch (error) {
      console.error(`Error processing candidate ${candidateId}:`, error);
    }
  }
  
  return result.rows.length;
}

/**
 * Main migration function that processes all images in batches
 */
async function migrateAllImages() {
  console.log("Starting batch migration of all base64 images to Replit storage...");
  
  try {
    // Get total count of images to process
    const countResult = await db.execute(
      `SELECT COUNT(*) as total FROM candidates WHERE image_url LIKE '/9j/%' OR image_url LIKE 'data:image/%'`
    );
    
    const totalImages = parseInt(countResult.rows[0]?.total as string) || 0;
    console.log(`Found ${totalImages} total candidates with base64 images to process.`);
    
    if (totalImages === 0) {
      console.log("No candidates found with base64 images. Migration complete.");
      return;
    }
    
    // Process in batches (continue from offset 50)
    let offset = 50;
    let processedCount = 0;
    let batchCount = 0;
    
    while (true) {
      const processedInBatch = await processBatch(offset);
      
      if (processedInBatch === 0) {
        break; // No more images to process
      }
      
      processedCount += processedInBatch;
      batchCount++;
      offset += BATCH_SIZE;
      
      const progressPercentage = ((processedCount / totalImages) * 100).toFixed(2);
      console.log(`Batch ${batchCount} complete. Progress: ${processedCount}/${totalImages} (${progressPercentage}%)`);
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Migration complete! Successfully processed ${processedCount} images in ${batchCount} batches.`);
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Execute the migration
migrateAllImages()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });