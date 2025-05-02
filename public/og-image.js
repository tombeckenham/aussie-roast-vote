// Enhanced OpenGraph image creator
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a more visually appealing OpenGraph image with Canvas
async function createOgImage() {
  try {
    // Create a canvas with the proper dimensions for OpenGraph
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#00008B');  // Dark blue (Australian flag blue)
    gradient.addColorStop(0.8, '#194693');
    gradient.addColorStop(1, '#00008B');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add gold horizontal bars (Australian gold)
    ctx.fillStyle = '#FFCD00';
    ctx.fillRect(50, 80, width - 100, 8);
    ctx.fillRect(50, height - 80, width - 100, 8);
    
    // Set text styles
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    
    // Draw main title
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.fillText('Aussie How-to-vote', width / 2, height / 2 - 50);
    
    // Draw subtitle
    ctx.font = '48px Arial, sans-serif';
    ctx.fillText('2025 Election Guide', width / 2, height / 2 + 30);
    
    // Draw tagline
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('Your comprehensive guide to candidates, policies, and electorates', width / 2, height / 2 + 100);
    
    // Draw URL
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText('aussiehowtovote.com.au', width / 2, height - 40);
    
    // Save the image as JPEG
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    writeFileSync(join(__dirname, 'og-image.jpg'), buffer);
    
    console.log('Enhanced OpenGraph image created successfully!');
  } catch (error) {
    console.error('Error creating OpenGraph image:', error);
    
    // Fallback to simple color block if Canvas fails
    console.log('Falling back to simple image...');
    createSimpleImage();
  }
}

// Fallback function to create a very simple image
function createSimpleImage() {
  // Simple base64 JPEG - blue background with minimal styling
  const base64Image = `
    /9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAnAEsAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A+f6KKK+mPzgKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Z
  `;
  
  // Remove header and whitespace
  const cleanedBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '').trim();
  
  // Create buffer from base64
  const imageBuffer = Buffer.from(cleanedBase64, 'base64');
  
  // Write to file
  writeFileSync(join(__dirname, 'og-image.jpg'), imageBuffer);
  
  console.log('Simple OpenGraph image created successfully!');
}

// Try to create enhanced image, fall back to simple one if needed
createSimpleImage();

console.log('OpenGraph image process completed!');