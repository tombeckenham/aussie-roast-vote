/**
 * Service for storing and managing candidate images using Replit Object Storage
 */

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';

// We'll use the relative path for accessing images in Replit storage
const STORAGE_PATH = '/storage';

/**
 * Save a base64 image to Replit object storage and return the public URL
 * @param base64Data Base64-encoded image data (can include or exclude the data:image prefix)
 * @param candidateId The ID of the candidate this image belongs to
 * @param candidateSurname The surname of the candidate (for filename generation)
 * @param format Optional image format (default: jpg)
 * @returns URL to the saved image
 */
export async function saveBase64Image(
  base64Data: string,
  candidateId: number,
  candidateSurname: string,
  format: string = 'jpg'
): Promise<string> {
  try {
    // Strip data:image prefix if present
    let imageData = base64Data;
    let imageFormat = format;
    
    if (base64Data.startsWith('data:image/')) {
      const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        imageFormat = matches[1];
        imageData = matches[2];
      }
    }
    
    // Create a unique filename
    const filename = `candidate_${candidateId}_${candidateSurname.toLowerCase()}_${uuidv4().substring(0, 8)}.${imageFormat}`;
    
    // Create a temp file
    const tempFilePath = path.join(os.tmpdir(), filename);
    fs.writeFileSync(tempFilePath, Buffer.from(imageData, 'base64'));
    
    // Use Replit's built-in storage
    // Store the file in the public directory under /storage
    const publicDir = path.join(process.cwd(), 'public', 'storage');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    const storagePath = path.join(publicDir, filename);
    fs.copyFileSync(tempFilePath, storagePath);
    
    // Clean up the temp file
    fs.unlinkSync(tempFilePath);
    
    // Return the public URL to the file
    const publicUrl = `/storage/${filename}`;
    
    console.log(`Saved image to Replit storage: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Error saving base64 image to Replit storage:', error);
    throw error;
  }
}

/**
 * Save an image from a URL to Replit object storage
 * @param imageUrl The URL of the image to save
 * @param candidateId The ID of the candidate
 * @param candidateSurname The surname of the candidate
 * @returns URL to the saved image
 */
export async function saveImageFromUrl(
  imageUrl: string,
  candidateId: number,
  candidateSurname: string
): Promise<string> {
  try {
    // Determine image format from URL
    const urlParts = imageUrl.split('.');
    const format = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
    
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get the image data
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    // Save using the base64 method
    return saveBase64Image(base64Data, candidateId, candidateSurname, format);
  } catch (error) {
    console.error(`Error saving image from URL for candidate ${candidateId}:`, error);
    throw error;
  }
}

export default {
  saveBase64Image,
  saveImageFromUrl
};