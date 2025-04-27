/**
 * XAI Service for generating caricature images and funny content for candidates
 * Uses x.ai's Grok models via the OpenAI package
 */

import OpenAI from "openai";
import { Candidate } from "@shared/schema";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { candidates } from "@shared/schema";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";

// Initialize the OpenAI client with x.ai base URL and API key
const openai = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

/**
 * Generate a caricature image of a candidate using xAI Grok vision model
 * @param candidate The candidate to generate a caricature for
 * @returns Base64 encoded image data
 */
export async function generateCandidateCaricature(
  candidate: Candidate,
): Promise<string> {
  try {
    console.log(`Generating caricature for ${candidate.name}...`);

    // Create a prompt describing the candidate and the style of caricature
    const prompt = `
      Create a political caricature image of Australian politician ${candidate.name} 
      from the ${candidate.partyBallotName || "Independent"} party.
      
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
          content: prompt,
        },
      ],
      max_tokens: 4000,
      response_format: { type: "text" },
    });

    // This will return a text description rather than an image
    // In a production app, you would need to use a different approach
    console.log("Generated caricature description for: " + candidate.name);
    const content = response.choices[0].message.content;
    return content
      ? content
      : "Failed to generate a caricature description. Please try again later.";

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
  candidate: Candidate,
): Promise<string | null> {
  try {
    console.log(`Generating roast for ${candidate.name}...`);

    // Create a prompt for the roast
    const prompt = `
      Create an Aussie style summary of ${candidate.name} 
      from the ${candidate.partyBallotName || "Independent"} party a candidate for the 2025 Australian Election. It should outline their policies and really take the piss out of them.
    `;

    // Make the request to xAI
    const response = await openai.chat.completions.create({
      model: "grok-3-beta", // Using the text model
      messages: [
        {
          role: "user",
          content: prompt,
        },
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
  question: string,
): Promise<string | null> {
  try {
    console.log(`Answering question about ${candidate.name}: "${question}"`);

    // Create a prompt for answering the question
    const prompt = `
      As an Australian political commentator with a humorous style, answer this question about
      ${candidate.name} from the ${candidate.partyBallotName || "Independent"} party:
      
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
      model: "grok-3-beta", // Using the text model
      messages: [
        {
          role: "user",
          content: prompt,
        },
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
  count: number = 3,
): Promise<Array<{
  title: string;
  description: string;
  location: string;
  dateTime: Date;
}> | null> {
  try {
    console.log(
      `Generating ${count} campaign activities for ${candidate.name}...`,
    );

    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    // Create a prompt for generating campaign activities
    const prompt = `
      Generate ${count} fictional upcoming campaign activities for Australian politician
      ${candidate.name} from the ${candidate.partyBallotName || "Independent"} party
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
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "[]";
    console.log("Generated campaign activities for: " + candidate.name);

    // Parse the JSON response
    try {
      const activities = JSON.parse(content);

      // Convert string dates to Date objects
      return activities.map((activity: any) => ({
        ...activity,
        dateTime: new Date(activity.dateTime),
      }));
    } catch (parseError) {
      console.error("Error parsing activities JSON:", parseError);
      return [];
    }
  } catch (error) {
    console.error(`Error generating activities for ${candidate.name}:`, error);
    return [];
  }
}

/**
 * Process raw candidate data from Perplexity and turn it into a structured roast
 * @param candidateName The name of the candidate
 * @param partyName The name of the party
 * @param rawData The raw data from Perplexity
 * @returns Structured and humorous commentary
 */
export async function processCandidatePerplexityData(
  candidateName: string,
  partyName: string | null,
  rawData: string,
): Promise<string> {
  try {
    console.log(`Processing Perplexity data for ${candidateName} with xAI...`);

    // Create a prompt for processing the raw data
    const prompt = `
      I have raw research data about Australian politician ${candidateName} 
      ${partyName ? `from the ${partyName} party` : "who is an Independent candidate"}.
      Create an Aussie style summary of the candidate using this data. Really take the piss out them and their policies. Make the summary short and sweet. 1 paragraph is enough. Don't include g'day or any preamble. Just get straight into it.
      
      Here's the raw data:
      ${rawData}`;

    // Make the request to xAI
    const response = await openai.chat.completions.create({
      model: "grok-3-beta", // Using the text model
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const processedContent = response.choices.reduce((acc, choice) => {
      return acc + (choice.message.content || "Failed to process candidate data.");
    }, "");
    console.log(
      `Successfully processed Perplexity data for ${candidateName} with xAI`,
      processedContent,
    );

    // Log a preview of the processed content
    console.log(`xAI processed content preview for ${candidateName}:
${processedContent.substring(0, 300)}...`);

    return processedContent;
  } catch (error) {
    console.error(
      `Error processing Perplexity data for ${candidateName}:`,
      error,
    );
    return `Failed to process data for ${candidateName}. The AI service may be temporarily unavailable.`;
  }
}

/**
 * Generate a caricature image of a political candidate using xAI's image generation API
 * @param candidate The candidate object
 * @param description Optional description to enhance the prompt
 * @returns Base64 encoded image data or image URL
 */
export async function generateCaricatureImage(
  candidate: Candidate,
  description?: string,
): Promise<string | null> {
  try {
    console.log(
      `Generating caricature image for ${candidate.name} using xAI...`,
    );

    // Create a detailed prompt for xAI focused on Australian political humor
    const policyStr =
      candidate.keyPolicies && candidate.keyPolicies.length > 0
        ? `Key policies: ${candidate.keyPolicies.join(", ")}.`
        : "";

    const enhancedPrompt = `
      Create a political caricature in true Australian cartoon style of politician ${candidate.name} 
      from the ${candidate.partyBallotName || "Independent"} party.
      
      ${policyStr}
      
      ${candidate.isIncumbent ? "They are the current incumbent MP." : ""}
      ${candidate.bio ? "Bio excerpt: " + candidate.bio.substring(0, 150) : ""}
      
      Style: Australian political cartoon with exaggerated features, bright colors, clean lines,
      similar to cartoons from The Australian, Sydney Morning Herald, or The Betoota Advocate.
      
      Quintessential Aussie caricature style with satirical elements
      - A humorous visual joke or pun based on their political stance
      
      Format: Digital illustration with white background, clean and shareable
    `;

    // Generate the image using xAI's image generation model
    // Note: xAI API doesn't support the 'size' parameter like OpenAI
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: enhancedPrompt.trim(),
        model: "grok-2-image", // Using the latest model for image generation
        n: 1,
        // Removed size parameter because it's not supported by xAI API
      }),
    });

    if (!response.ok) {
      console.error(
        `xAI image generation failed with status: ${response.status}`,
      );
      const errorData = await response.json();
      console.error("Error details:", errorData);
      throw new Error(`xAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(
      `xAI image generation response status: ${response.status} - Success`,
    );

    // Type guard to check if response data has the expected structure
    interface XAIImageResponse {
      data: Array<{ url: string }>;
    }
    
    // Define the type guard outside the block
    const isValidImageResponse = (data: any): data is XAIImageResponse => {
      return (
        data &&
        typeof data === "object" &&
        Array.isArray(data.data) &&
        data.data.length > 0 &&
        typeof data.data[0].url === "string"
      );
    }

    // Get the image URL from the response
    if (isValidImageResponse(data)) {
      console.log(
        `Successfully generated caricature image for ${candidate.name} using xAI`,
      );

      // Fetch the image from the URL and convert to base64
      try {
        const imageResponse = await fetch(data.data[0].url);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");
        return base64Image;
      } catch (fetchError) {
        console.error(
          `Error fetching image for ${candidate.name}:`,
          fetchError,
        );
        return null;
      }
    } else {
      console.error(
        `No image URL returned for ${candidate.name} from xAI:`,
        data,
      );
      return null;
    }
  } catch (error) {
    console.error(
      `Error generating caricature image for ${candidate.name}:`,
      error,
    );
    return null;
  }
}

/**
 * Generate short policy sentences for a candidate using xAI
 * @param candidate The candidate to generate policies for
 * @param rawData Optional perplexity raw data to extract policies from
 * @returns Array of policy sentences
 */
export async function generateCandidatePolicies(
  candidate: Candidate,
  rawData?: string
): Promise<string[]> {
  try {
    console.log(`Generating policy highlights for ${candidate.name}...`);

    // Default policies based on party
    const partyName = candidate.partyBallotName || "Independent";
    
    let defaultPolicies: string[] = [];
    
    if (partyName.includes("Liberal")) {
      defaultPolicies = [
        "Will lower taxes for small businesses and individuals.",
        "Committed to strengthening national security and border protection.",
        "Supports investment in infrastructure for economic growth."
      ];
    } else if (partyName.includes("Labor")) {
      defaultPolicies = [
        "Will increase funding for public healthcare and education.",
        "Committed to action on climate change and renewable energy.",
        "Supports strengthening workers' rights and fair wages."
      ];
    } else if (partyName.includes("Green")) {
      defaultPolicies = [
        "Will implement ambitious climate action and environmental protection.",
        "Committed to social justice and equality initiatives.",
        "Supports transition to 100% renewable energy sources."
      ];
    } else if (partyName.includes("One Nation")) {
      defaultPolicies = [
        "Will prioritize Australian jobs and industries first.",
        "Committed to reducing immigration and stronger border policies.",
        "Supports traditional values and cultural preservation."
      ];
    } else if (partyName.includes("Independent")) {
      defaultPolicies = [
        "Will represent local community needs above party politics.",
        "Committed to transparency and accountability in government.",
        "Supports practical solutions tailored to electorate concerns."
      ];
    }

    // Create a prompt for policy generation with short timeout
    const prompt = `
      Generate 3 short policy positions for Australian politician ${candidate.name} 
      from the ${partyName} party. These should be in simple, concise, Australian political style.
      
      Return exactly 3 policies in a JSON array:
      ["Policy 1", "Policy 2", "Policy 3"]
    `;

    // Set up a promise that times out
    const timeoutPromise = new Promise<string[]>((resolve) => {
      setTimeout(() => {
        console.log(`Policy generation timed out for ${candidate.name}, using defaults`);
        resolve(defaultPolicies);
      }, 5000); // 5 second timeout
    });

    // The actual API call promise
    const apiPromise = new Promise<string[]>(async (resolve) => {
      try {
        // Make the request to xAI
        const response = await openai.chat.completions.create({
          model: "grok-3-beta", // Using the text model
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.6,
          response_format: { type: "json_object" }
        });
        
        const content = response.choices[0].message.content;
        console.log(`Generated policies for: ${candidate.name}`);
        
        try {
          if (content) {
            const policies = JSON.parse(content);
            if (Array.isArray(policies) && policies.length > 0) {
              resolve(policies.slice(0, 3)); // Return a maximum of 3 policies
              return;
            }
          }
          resolve(defaultPolicies);
        } catch (parseError) {
          console.error(`Error parsing policy JSON for ${candidate.name}:`, parseError);
          resolve(defaultPolicies);
        }
      } catch (error) {
        console.error(`API error for ${candidate.name}:`, error);
        resolve(defaultPolicies);
      }
    });

    // Race the promises - whichever resolves first wins
    return Promise.race([apiPromise, timeoutPromise]);
  } catch (error) {
    console.error(`Error in generateCandidatePolicies for ${candidate.name}:`, error);
    return ["Will address key issues facing the electorate.", 
            "Committed to improving local infrastructure.", 
            "Supports economic growth and job creation."];
  }
}

export default {
  generateCandidateCaricature,
  generateCandidateRoast,
  answerCandidateQuestion,
  generateCampaignActivities,
  processCandidatePerplexityData,
  generateCaricatureImage,
  generateCandidatePolicies,
};
