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
import { storage } from "server/storage";

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
  
     // Create a shorter prompt for xAI that stays within character limits
     const policyStr = candidate.keyPolicies && candidate.keyPolicies.length > 0
     ? `Key policies: ${candidate.keyPolicies.slice(0, 1).join(", ")}.`
     : "";

   let enhancedPrompt = `Australian political cartoon of ${candidate.name} (${candidate.partyBallotName || "Independent"}). ${policyStr} ${candidate.isIncumbent ? "Current MP." : ""} Style: Exaggerated features, bright colors, clean lines. Include: Australian elements (cork hat/flag/kangaroo/koala), satirical elements, political humor based on stance. White background.`.trim();

   // Before sending the request, check and log the prompt length
   console.log(`Prompt length: ${enhancedPrompt.length} characters`);
   if (enhancedPrompt.length > 1000) {
     console.log("Warning: Prompt approaching maximum length, truncating...");
     enhancedPrompt = enhancedPrompt.substring(0, 1000);
   }

   // Make a direct fetch to the xAI API (without using any 'size' parameter)
   const response = await fetch("https://api.x.ai/v1/images/generations", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${process.env.XAI_API_KEY}`,
     },
     body: JSON.stringify({
       prompt: enhancedPrompt,
       model: "grok-2-image", // Using the latest model for image generation
       n: 1,
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
    // Type guard to check if response data has the expected structure
    if (
      data &&
      typeof data === "object" &&
      'data' in data && Array.isArray(data.data) &&
      data.data.length > 0 &&
      typeof data.data[0].url === "string"
    ) {
      console.log(
        `Successfully generated caricature image for ${candidate.name} using xAI`,
      );

      // Fetch the image from the URL and store it in the database
      let base64Image = null;
      try {
        const imageUrl = data.data[0].url;
        await storage.updateCandidateImage(candidate.id, imageUrl); // Store the image URL

        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        base64Image = Buffer.from(imageBuffer).toString("base64");
      } catch (fetchOrStoreError) {
        console.error(
          `Error fetching or storing image for ${candidate.name}:`,
          fetchOrStoreError,
        );
        throw new Error( "Failed to fetch or store generated image" );
      }

      // Return image data in the response
      return base64Image
    } else {
      throw new Error( "Failed to generate caricature" );
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
      return (
        acc + (choice.message.content || "Failed to process candidate data.")
      );
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
 * Process raw candidate data from Perplexity and turn it into humorous policy statements
 * @param candidateName The name of the candidate
 * @param partyName The name of the party
 * @param rawData The raw data from Perplexity
 * @returns Array of humorous policy statements
 */
export async function processPolicyPerplexityData(
  candidateName: string,
  partyName: string | null,
  rawData: string,
): Promise<string[]> {
  try {
    console.log(`Processing policy data for ${candidateName} with xAI...`);

    // First extract any policy information from the raw data
    const extractedPolicies = extractPoliciesFromRawData(rawData);

    // Create a prompt for processing the raw data into humorous policy statements
    const prompt = `
      Create ONE SENTENCE Aussie style summary of ${candidateName}'s 
      ${partyName ? `(${partyName})` : "(Independent)"} policies using this data. 
      Really take the piss out of the policies. Make the summary short and sweet.
      1 sentence is enough. Don't include g'day, mate, or crikey at the beginning, just get straight into it.
      
      IMPORTANT: Do not use any markdown formatting like asterisks (*), hashtags (#), 
      or other special characters. Plain text only.
      
      Here's the raw policy data:
      ${
        extractedPolicies.length > 0
          ? extractedPolicies.join("\n")
          : "No specific policy data available. Use the general information below."
      }
      
      Additional context:
      ${rawData.substring(0, 500)}...`;

    // Make the request to xAI
    const response = await openai.chat.completions.create({
      model: "grok-3-beta", // Using the text model
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 250,
      temperature: 0.8,
    });

    let processedContent =
      response.choices[0].message.content ||
      "This drongo's policies are as empty as a pub on Sunday morning.";

    // Clean up any markdown formatting that might have been included despite instructions
    processedContent = processedContent
      .replace(/\*\*/g, "") // Remove bold formatting
      .replace(/\*/g, "") // Remove italic formatting
      .replace(/^[-*#]+\s*/g, "") // Remove bullet points and hashtags at the beginning
      .replace(/^[^a-zA-Z0-9]*/, "") // Remove any non-alphanumeric characters at the start
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove Markdown links
      .replace(/`([^`]+)`/g, "$1") // Remove code formatting
      .trim();

    console.log(
      `Generated policy summary for ${candidateName}: ${processedContent}`,
    );

    // Format the result as an array of policy statements
    return [processedContent];
  } catch (error) {
    console.error(`Error processing policy data for ${candidateName}:`, error);
    return [
      "Policy information unavailable - this pollie's all talk and no action.",
    ];
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
    };

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
 * Extract policy information from raw Perplexity data
 * @param rawData Raw data from Perplexity API
 * @returns Array of extracted policy statements
 */
export function extractPoliciesFromRawData(rawData: string): string[] {
  try {
    if (!rawData) return [];

    console.log("Extracting policies from raw Perplexity data...");

    // Find the policy section by looking for headings
    const policySection = rawData.match(
      /(?:1\. Key policy positions|Key Policy Positions|### 1\. Key Policy Positions and Political Stances)([\s\S]*?)(?:2\. Background|### 2\.)/i,
    );

    if (!policySection || !policySection[1]) {
      console.log("No policy section found in raw data");
      return [];
    }

    // Extract bullet points that start with dash
    const policyText = policySection[1];
    let policies = policyText
      .split("\n")
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => line.trim().replace(/^-\s*/, "").trim()) // Remove the dash and leading whitespace
      .filter(
        (policy) =>
          policy.length > 10 &&
          policy.length < 150 &&
          !policy.includes("Include policy positions") &&
          !policy.includes("Note flagship policies") &&
          !policy.includes("signature issues"),
      );

    // If we didn't find dash-based bullet points, try other formats
    if (policies.length === 0) {
      policies = policyText
        .split(/\n\s*-\s*|\n\*\*|\n•|\n\*/)
        .filter(
          (policy) =>
            policy.trim().length > 10 &&
            !policy.includes("Key policy positions") &&
            !policy.includes("Key Policy Positions") &&
            !policy.includes("and Political Stances"),
        )
        .map((policy) => policy.trim().replace(/\*\*/g, ""))
        .filter((policy) => policy.length > 10 && policy.length < 150);
    }

    // Get top 3 policies
    policies = policies.slice(0, 3);

    console.log(`Extracted ${policies.length} policies from raw data`);
    return policies;
  } catch (error) {
    console.error("Error extracting policies from raw data:", error);
    return [];
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
  rawData?: string,
): Promise<string[]> {
  try {
    console.log(
      `Generating policies for ${candidate.name} with Perplexity data`,
    );

    // Default policies based on party (fallback if everything else fails)
    const partyName = candidate.partyBallotName || "Independent";

    let defaultPolicies: string[] = [];

    if (partyName.includes("Liberal")) {
      defaultPolicies = [
        "Will lower taxes for small businesses and individuals.",
        "Committed to strengthening national security and border protection.",
        "Supports investment in infrastructure for economic growth.",
      ];
    } else if (partyName.includes("Labor")) {
      defaultPolicies = [
        "Will increase funding for public healthcare and education.",
        "Committed to action on climate change and renewable energy.",
        "Supports strengthening workers' rights and fair wages.",
      ];
    } else if (partyName.includes("Green")) {
      defaultPolicies = [
        "Will implement ambitious climate action and environmental protection.",
        "Committed to social justice and equality initiatives.",
        "Supports transition to 100% renewable energy sources.",
      ];
    } else if (partyName.includes("One Nation")) {
      defaultPolicies = [
        "Will prioritize Australian jobs and industries first.",
        "Committed to reducing immigration and stronger border policies.",
        "Supports traditional values and cultural preservation.",
      ];
    } else if (partyName.includes("Independent")) {
      defaultPolicies = [
        "Will represent local community needs above party politics.",
        "Committed to transparency and accountability in government.",
        "Supports practical solutions tailored to electorate concerns.",
      ];
    }

    // TWO-STEP PROCESS:
    // STEP 1: If we have raw Perplexity data, try to create an Aussie-style policy summary first
    if (rawData) {
      try {
        // Process the policy data with xAI to get humorous one-sentence summary
        const aussiePolicySummary = await processPolicyPerplexityData(
          candidate.name,
          candidate.partyBallotName,
          rawData,
        );

        if (
          aussiePolicySummary.length > 0 &&
          !aussiePolicySummary[0].includes("unavailable")
        ) {
          console.log(
            `Generated Aussie policy summary for ${candidate.name}:`,
            aussiePolicySummary[0],
          );

          // STEP 2: Also extract regular policies for context
          const extractedPolicies = extractPoliciesFromRawData(rawData);

          // If we have both, combine them - the funny summary first, then some regular policies
          if (extractedPolicies.length > 0) {
            return [
              aussiePolicySummary[0],
              ...extractedPolicies.slice(
                0,
                Math.min(2, extractedPolicies.length),
              ),
            ];
          }

          // If we only have the Aussie summary, return it alone (avoiding default policies)
          return [aussiePolicySummary[0]];
        }
      } catch (error) {
        console.error(
          `Error generating Aussie policy summary for ${candidate.name}:`,
          error,
        );
      }

      // Fallback: Try to extract standard policies if the summary generation failed
      const extractedPolicies = extractPoliciesFromRawData(rawData);
      if (extractedPolicies.length > 0) {
        console.log(
          `Using extracted policies from Perplexity data for ${candidate.name}:`,
          extractedPolicies,
        );
        return extractedPolicies;
      }
    }

    // STEP 3: If no raw data, extraction failed, or xAI processing failed, use standard xAI policy generation
    console.log(
      `No policies extracted from raw data, generating with xAI for ${candidate.name}`,
    );

    // Create a prompt for policy generation with short timeout
    const prompt = `
      Generate 3 short policy positions for Australian politician ${candidate.name} 
      from the ${partyName} party. These should be in simple, concise, Australian political style.
      
      ${rawData ? `Use this background information: ${rawData.substring(0, 1000)}...` : ""}
      
      Each policy should:
      - Be a single sentence (15-20 words maximum)
      - Start with an action verb (e.g., "Will implement...", "Committed to...", "Supports...")
      - Be specific rather than generic
      - Focus on issues important to Australian voters
      - Align with typical ${partyName} party positions

      Return exactly 3 policies in a JSON array:
      ["Policy 1", "Policy 2", "Policy 3"]
    `;

    // Set up a promise that times out
    const timeoutPromise = new Promise<string[]>((resolve) => {
      setTimeout(() => {
        console.log(
          `Policy generation timed out for ${candidate.name}, using single fallback policy`,
        );
        // Just use a single generic policy message instead of the full default set
        resolve(["This candidate's policies are currently unavailable."]);
      }, 8000); // 8 second timeout
    });

    // The actual API call promise
    const apiPromise = new Promise<string[]>(async (resolve) => {
      try {
        // Make the request to xAI
        const response = await openai.chat.completions.create({
          model: "grok-3-beta", // Using the text model
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.6,
          response_format: { type: "json_object" },
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
          resolve(["Failed to generate specific policy information."]);
        } catch (parseError) {
          console.error(
            `Error parsing policy JSON for ${candidate.name}:`,
            parseError,
          );
          resolve(["Failed to parse policy information."]);
        }
      } catch (error) {
        console.error(`API error for ${candidate.name}:`, error);
        resolve(["API error occurred while generating policy information."]);
      }
    });

    // Race the promises - whichever resolves first wins
    return Promise.race([apiPromise, timeoutPromise]);
  } catch (error) {
    console.error(
      `Error in generateCandidatePolicies for ${candidate.name}:`,
      error,
    );
    return ["An error occurred while generating policy information."];
  }
}

export default {
  generateCandidateCaricature,
  generateCandidateRoast,
  answerCandidateQuestion,
  generateCampaignActivities,
  processCandidatePerplexityData,
  processPolicyPerplexityData,
  generateCaricatureImage,
  generateCandidatePolicies,
};
