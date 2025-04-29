/**
 * Service for storing and managing candidate images locally
 * This replaces the direct URL storage approach with a file-based solution
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Directory where candidate images will be stored
const IMAGE_STORAGE_DIR = path.join(process.cwd(), 'public', 'images', 'candidates');
const PUBLIC_PATH_PREFIX = '/images/candidates';

// Ensure directory exists
if (!fs.existsSync(IMAGE_STORAGE_DIR)) {
  fs.mkdirSync(IMAGE_STORAGE_DIR, { recursive: true });
  console.log(`Created image storage directory: ${IMAGE_STORAGE_DIR}`);
}

/**
 * Save a base64 image to disk and return the public URL
 * @param base64Data Base64-encoded image data (can include or exclude the data:image prefix)
 * @param candidateId The ID of the candidate this image belongs to
 * @param candidateSurname The surname of the candidate (for filename generation)
 * @param format Optional image format (default: jpg)
 * @returns URL path to the saved image
 */
export async function saveBase64Image(
  base64Data: string,
  candidateId: number,
  candidateSurname: string,
  format: string = 'jpg'
): Promise<string> {
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
  const filename = `${candidateId}_${candidateSurname.toLowerCase()}_${uuidv4().substring(0, 8)}.${imageFormat}`;
  const filePath = path.join(IMAGE_STORAGE_DIR, filename);
  const publicUrl = `${PUBLIC_PATH_PREFIX}/${filename}`;
  
  // Save the image to disk
  fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));
  console.log(`Saved image to ${filePath}`);
  
  return publicUrl;
}

/**
 * Save an image from a URL to local storage
 * @param imageUrl The URL of the image to save
 * @param candidateId The ID of the candidate
 * @param candidateSurname The surname of the candidate
 * @returns URL path to the saved image
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
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a unique filename
    const filename = `${candidateId}_${candidateSurname.toLowerCase()}_${uuidv4().substring(0, 8)}.${format}`;
    const filePath = path.join(IMAGE_STORAGE_DIR, filename);
    const publicUrl = `${PUBLIC_PATH_PREFIX}/${filename}`;
    
    // Save the image to disk
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved image from URL to ${filePath}`);
    
    return publicUrl;
  } catch (error) {
    console.error(`Error saving image from URL for candidate ${candidateId}:`, error);
    throw error;
  }
}

export default {
  saveBase64Image,
  saveImageFromUrl
};