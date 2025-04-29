/**
 * Simple migration script to move base64 images to Replit storage
 */

import { db } from "../db";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Create the storage directory if it doesn't exist
const STORAGE_DIR = path.join(process.cwd(), "public", "storage");
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
 * Main migration function
 */
async function migrateImages() {
  console.log("Starting migration of base64 images to Replit storage...");
  
  try {
    // Get all candidates with images that look like base64 data
    // We've already processed 300 images, let's continue with the next batch
    const result = await db.execute(
      `SELECT id, name, image_url FROM candidates WHERE image_url LIKE '/9j/%' OR image_url LIKE 'data:image/%' LIMIT 100 OFFSET 300`
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log("No candidates found with base64 images.");
      return;
    }
    
    console.log(`Found ${result.rows.length} candidates with base64 images.`);
    
    // Process each candidate
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
        // Use direct SQL string interpolation for this one-time script
        // This is generally not recommended for production code due to SQL injection risks
        // but it's acceptable for a one-time migration script
        await db.execute(
          `UPDATE candidates SET image_url = '${newImageUrl}' WHERE id = ${candidateId}`
        );
        
        console.log(`Updated candidate ${candidateId} with new image URL: ${newImageUrl}`);
      } catch (error) {
        console.error(`Error processing candidate ${candidateId}:`, error);
      }
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Execute the migration
migrateImages()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });