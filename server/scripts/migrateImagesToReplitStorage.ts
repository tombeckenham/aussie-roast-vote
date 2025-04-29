/**
 * Script to migrate base64-encoded images from candidate.image_url field to Replit storage
 * This handles images that were accidentally stored as base64 data instead of URLs
 */

import { db } from "../db";
import { candidates } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Create the storage directory if it doesn't exist
const STORAGE_DIR = path.join(process.cwd(), "public", "storage");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Save a base64 image to Replit storage and return the public URL
 */
async function saveBase64ImageToStorage(
  base64Data: string,
  candidateId: number,
  candidateSurname: string
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
    
    // Create a unique filename
    const filename = `candidate_${candidateId}_${candidateSurname.toLowerCase()}_${uuidv4().substring(0, 8)}.${imageFormat}`;
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
 * Main function to migrate base64 images to Replit storage
 */
async function migrateToReplitStorage() {
  console.log("Starting migration of base64 images to Replit storage...");
  
  try {
    // Get all candidates with base64-encoded images (using raw SQL)
    const { rows } = await db.execute(
      `SELECT id, name, surname, image_url FROM candidates WHERE image_url LIKE '/9j/%' OR image_url LIKE 'data:image/%'`
    );
    
    console.log(`Found ${rows.length} candidates with base64-encoded images`);
    
    // Process each candidate
    for (const candidate of rows) {
      if (!candidate.image_url) continue;
      
      console.log(`Processing candidate ${candidate.id}: ${candidate.name}`);
      
      try {
        // Save the image to Replit storage
        const newImageUrl = await saveBase64ImageToStorage(
          candidate.image_url,
          candidate.id,
          candidate.surname
        );
        
        // Update the candidate record
        await db
          .update(candidates)
          .set({ imageUrl: newImageUrl })
          .where(eq(candidates.id, candidate.id));
        
        console.log(`Updated candidate ${candidate.id} with new image URL: ${newImageUrl}`);
      } catch (error) {
        console.error(`Error processing candidate ${candidate.id}:`, error);
      }
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Execute the migration
migrateToReplitStorage()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });