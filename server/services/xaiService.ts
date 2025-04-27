/**
 * XAI Service for generating caricature images and funny content for candidates
 * Uses x.ai's Grok models via the OpenAI package
 */

import OpenAI from "openai";
import { Candidate } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { candidates } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize the OpenAI client with x.ai base URL and API key
const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

/**
 * Generate a caricature image of a candidate using xAI Grok vision model
 * @param candidate The candidate to generate a caricature for
 * @returns Base64 encoded image data
 */
export async function generateCandidateCaricature(
  candidate: Candidate
): Promise<string> {
  try {
    console.log(`Generating caricature for ${candidate.name}...`);
    
    // Create a prompt describing the candidate and the style of caricature
    const prompt = `
      Create a political caricature image of Australian politician ${candidate.name} 
      from the ${candidate.partyBallotName || 'Independent'} party.
      
      The caricature should be:
      - Exaggerated in classic political cartoon style
      - Humorous but not offensive
      - Recognizably the person but with their prominent features emphasized
      - With Australian-themed elements in the background or outfit
      - With bright colors and a clean style
      
      Include props or elements that represent their political party.
      The image should have a white background and be centered.
    `;
    
    // Make the request to xAI's vision model
    const response = await openai.chat.completions.create({
      model: "grok-2-vision-1212", // Use the vision model
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      response_format: { type: "text" }
    });
    
    // This will return a text description rather than an image
    // In a production app, you would need to use a different approach
    console.log("Generated caricature description for: " + candidate.name);
    return response.choices[0].message.content || 
      "Failed to generate a caricature description. Please try again later.";
    
    // Note: The actual image generation would require using a different API
    // or configuring Grok differently. For now, we're returning the text description.
  } catch (error) {
    console.error(`Error generating caricature for ${candidate.name}:`, error);
    return "Error generating caricature. The AI service may be temporarily unavailable.";
  }
}

/**
 * Generate a humorous roast of a candidate using xAI
 * @param candidate The candidate to roast
 * @returns The generated roast text
 */
export async function generateCandidateRoast(
  candidate: Candidate
): Promise<string | null> {
  try {
    console.log(`Generating roast for ${candidate.name}...`);
    
    // Create a prompt for the roast
    const prompt = `
      Create a humorous Australian-style political roast of ${candidate.name} 
      from the ${candidate.partyBallotName || 'Independent'} party.
      
      The roast should:
      - Be funny and witty in a uniquely Aussie way
      - Reference stereotypical Australian political behavior
      - Include some gentle mockery of their party's typical positions
      - Use Australian slang and expressions
      - Be cheeky but not mean-spirited or offensive
      - Be between 150-200 words
      
      Make it sound like something an Australian political satirist would write.
    `;
    
    // Make the request to xAI
    const response = await openai.chat.completions.create({
      model: "grok-2-1212", // Using the text model
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.8, // More creative
    });
    
    console.log("Generated roast for: " + candidate.name);
    return response.choices[0].message.content;
  } catch (error) {
    console.error(`Error generating roast for ${candidate.name}:`, error);
    return null;
  }
}

/**
 * Answer a question about a candidate using xAI
 * @param candidate The candidate to ask about
 * @param question The user's question
 * @returns The generated answer
 */
export async function answerCandidateQuestion(
  candidate: Candidate,
  question: string
): Promise<string | null> {
  try {
    console.log(`Answering question about ${candidate.name}: "${question}"`);
    
    // Create a prompt for answering the question
    const prompt = `
      As an Australian political commentator with a humorous style, answer this question about
      ${candidate.name} from the ${candidate.partyBallotName || 'Independent'} party:
      
      "${question}"
      
      Your answer should:
      - Be informative but funny
      - Include some made-up but plausible policy positions based on their party
      - Use Australian political humor and expressions
      - Be between 100-150 words
      - End with a humorous one-liner
      
      Remember to keep it light-hearted but somewhat realistic for an Australian context.
    `;
    
    // Make the request to xAI
    const response = await openai.chat.completions.create({
      model: "grok-2-1212", // Using the text model
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });
    
    console.log("Generated answer for question about: " + candidate.name);
    return response.choices[0].message.content;
  } catch (error) {
    console.error(`Error answering question about ${candidate.name}:`, error);
    return null;
  }
}

/**
 * Generate ficitonal campaign activities for a candidate
 * @param candidate The candidate to generate activities for
 * @param count Number of activities to generate
 * @returns Array of campaign activities
 */
export async function generateCampaignActivities(
  candidate: Candidate,
  count: number = 3
): Promise<Array<{title: string, description: string, location: string, dateTime: Date}> | null> {
  try {
    console.log(`Generating ${count} campaign activities for ${candidate.name}...`);
    
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    // Create a prompt for generating campaign activities
    const prompt = `
      Generate ${count} fictional upcoming campaign activities for Australian politician
      ${candidate.name} from the ${candidate.partyBallotName || 'Independent'} party
      who is running in the electorate of ${candidate.electoralSeatId}.
      
      For each activity, provide:
      1. Title (short and catchy)
      2. Description (2-3 sentences about what will happen)
      3. Location (specific place in the electorate)
      4. Date and time (between now and one month from now, in YYYY-MM-DD HH:MM format)
      
      Make these realistic but with a touch of humor, formatted as JSON like this:
      [
        {
          "title": "Town Hall Meeting",
          "description": "Come join the discussion on local issues. Refreshments provided.",
          "location": "Springfield Community Center",
          "dateTime": "2025-05-15 18:30"
        }
      ]
    `;
    
    // Make the request to xAI
    const response = await openai.chat.completions.create({
      model: "grok-2-1212", // Using the text model
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    console.log("Generated campaign activities for: " + candidate.name);
    
    // Parse the JSON response
    try {
      const activities = JSON.parse(content);
      
      // Convert string dates to Date objects
      return activities.map((activity: any) => ({
        ...activity,
        dateTime: new Date(activity.dateTime)
      }));
    } catch (parseError) {
      console.error("Error parsing activities JSON:", parseError);
      return null;
    }
  } catch (error) {
    console.error(`Error generating activities for ${candidate.name}:`, error);
    return null;
  }
}

export default {
  generateCandidateCaricature,
  generateCandidateRoast,
  answerCandidateQuestion,
  generateCampaignActivities
};