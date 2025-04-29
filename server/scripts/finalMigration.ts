import { pool } from "../db";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Configuration
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

async function processSpecificCandidates() {
  console.log("Starting migration for specific candidates...");
  
  // These are the IDs of the remaining candidates with base64 images
  const candidateIds = [902, 903, 904, 905, 907];
  
  for (const candidateId of candidateIds) {
    try {
      // Get the candidate info
      const result = await pool.query(
        "SELECT id, name, image_url FROM candidates WHERE id = $1", 
        [candidateId]
      );
      
      if (!result.rows || result.rows.length === 0) {
        console.log(`Candidate ${candidateId} not found`);
        continue;
      }
      
      const row = result.rows[0];
      if (!row.image_url || (!row.image_url.startsWith('/9j/') && !row.image_url.startsWith('data:image/'))) {
        console.log(`Candidate ${candidateId} does not have a base64 image`);
        continue;
      }
      
      console.log(`Processing candidate ${candidateId}: ${row.name}`);
      
      // Save image to storage
      const newImageUrl = await saveBase64ImageToStorage(
        row.image_url,
        candidateId,
        row.name
      );
      
      // Update the database with the new URL
      await pool.query(
        "UPDATE candidates SET image_url = $1 WHERE id = $2",
        [newImageUrl, candidateId]
      );
      
      console.log(`Updated candidate ${candidateId} with new image URL: ${newImageUrl}`);
    } catch (error) {
      console.error(`Error processing candidate ${candidateId}:`, error);
    }
    
    // Small delay between candidates
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log("Migration of specific candidates complete!");
}

// Execute the script
processSpecificCandidates()
  .then(() => {
    console.log("Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });