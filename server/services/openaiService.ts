/**
 * OpenAI Service for generating images based on descriptions
 * Uses OpenAI's DALL-E model for image generation
 */
import OpenAI from "openai";
import fetch from "node-fetch";
import { Candidate } from "@shared/schema";

// Initialize OpenAI client with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a caricature image of a political candidate
 * @param candidate The candidate object
 * @param description Optional description to enhance the prompt
 * @returns Base64 encoded image data
 */
export async function generateCaricatureImage(
  candidate: Candidate,
  description?: string
): Promise<string | null> {
  try {
    console.log(`Generating caricature image for ${candidate.name} using DALL-E...`);
    
    // Create a detailed prompt for DALL-E focused on Australian political humor
    const policyStr = candidate.keyPolicies && candidate.keyPolicies.length > 0 
      ? `Key policies: ${candidate.keyPolicies.join(', ')}.` 
      : '';
    
    const enhancedPrompt = `
      Create a political caricature in true Australian cartoon style of politician ${candidate.name} 
      from the ${candidate.partyBallotName || 'Independent'} party.
      
      ${policyStr}
      
      ${candidate.isIncumbent ? 'They are the current incumbent MP.' : ''}
      ${candidate.bio ? 'Bio excerpt: ' + candidate.bio.substring(0, 150) : ''}
      
      Style: Australian political cartoon with exaggerated features, bright colors, clean lines,
      similar to cartoons from The Australian, Sydney Morning Herald, or The Betoota Advocate.
      
      Must include these Australian elements: 
      - Either a cork hat, Australian flag, kangaroo, koala, or Sydney Opera House
      - Colors resembling the Australian flag (green and gold) or the outback (orange and red)
      - Quintessential Aussie caricature style with satirical elements
      - A humorous visual joke or pun based on their political stance
      
      Format: Digital illustration with white background, clean and shareable
    `;
    
    // Generate the image using OpenAI's latest image generation model
    // Using dall-e-3 which is a stable image generation model
    const response = await openai.images.generate({
      model: "dall-e-3",  // Using dall-e-3 model which is more stable
      prompt: enhancedPrompt.trim(),
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });
    
    // Get the image URL from the response
    if (response.data && response.data.length > 0 && response.data[0].url) {
      console.log(`Successfully generated caricature image for ${candidate.name}`);
      
      // Fetch the image from the URL and convert to base64
      try {
        const imageResponse = await fetch(response.data[0].url);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        return base64Image;
      } catch (fetchError) {
        console.error(`Error fetching image for ${candidate.name}:`, fetchError);
        return null;
      }
    } else {
      console.error(`No image URL returned for ${candidate.name}`);
      return null;
    }
  } catch (error) {
    console.error(`Error generating caricature image for ${candidate.name}:`, error);
    return null;
  }
}

// Default export for the OpenAI service
export default {
  generateCaricatureImage
};