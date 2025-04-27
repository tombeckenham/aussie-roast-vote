import { Candidate } from "@shared/schema";
import fetch from "node-fetch";

// Define structure for the candidate data
export interface CandidateStructuredData {
  overviewRoast: string;           // Satirical overview/roast of the candidate
  policySummary: string;           // Key policies and positions
  trackRecord: string;             // Background and political history
  whyVoteForThem: string;          // Satirical reasons to vote for them
  imageSearchTerms: string[];      // Terms to help find or generate images
  fullCommentary: string;          // The complete commentary as a single text
}

class PerplexityService {
  private apiKey: string;
  private baseUrl: string = "https://api.perplexity.ai/chat/completions";

  constructor() {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate a structured commentary for a candidate using Perplexity's real-time data
   */
  async generateCandidateCommentary(
    candidate: Candidate,
    electorateName: string,
  ): Promise<string> {
    try {
      console.log(
        `Generating Perplexity commentary for ${candidate.name}, ${candidate.partyId}...`,
      );

      const partyInfo = candidate.partyId
        ? `who is running for the political party with ID ${candidate.partyId}`
        : "who is running as an Independent";

      const prompt = `Research and provide information about ${candidate.name}, ${partyInfo}, who is running for the ${electorateName} electorate in the 2025 Australian federal election.

I'd like a witty, satirical overview that gives the candidate a good Aussie-style roasting, a summary of their key policies and positions, information about their background and political history, and some satirical reasons to vote for them. 

Also include 5-10 specific descriptive terms that could help generate a caricature image of the candidate.

Try to structure your response like this (but don't worry about strict JSON formatting):

OVERVIEW ROAST: A witty, satirical overview of the candidate that roasts them in good Aussie fashion.

POLICY SUMMARY: Summary of key policies and political positions.

TRACK RECORD: Information about their background and political history.

WHY VOTE FOR THEM: Satirical reasons to vote for them.

IMAGE SEARCH TERMS: Specific descriptive terms that could help generate a caricature image.

FULL COMMENTARY: The combined full text as a narrative.

Use real information wherever possible. The overview and reasons to vote should be humorous and satirical in authentic Australian political humor style.`;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online", // Updated to sonar model
          messages: [
            {
              role: "system",
              content:
                "You are an Australian political analyzer who creates detailed, fact-based but humorous profiles of election candidates. You present information in structured formats and use authentic Aussie humor. Always return properly formatted JSON when asked.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 800,
          search_recency_filter: "month" // Use recent information
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Perplexity API error (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      };
      
      // Get the raw content from Perplexity
      const rawContent = data.choices[0].message.content;
      
      // First try to extract structured data from the text format
      try {
        const content = rawContent;
        
        // Extract sections if they exist in the format we requested
        let overviewRoast = "";
        const overviewMatch = content.match(/OVERVIEW ROAST:\s*([\s\S]*?)(?=POLICY SUMMARY:|$)/i);
        if (overviewMatch && overviewMatch[1]) {
          overviewRoast = overviewMatch[1].trim();
        }
        
        console.log(`Successfully generated Perplexity commentary for ${candidate.name}`);
        
        // For compatibility with our current UI, return either full content or just the overview
        return overviewRoast || content;
      } catch (error) {
        console.error("Error processing Perplexity response:", error);
        // If anything goes wrong, return the raw content
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error(
        `Error generating Perplexity commentary for ${candidate.name}:`,
        error,
      );
      throw error;
    }
  }
}

// Export as default singleton
export default new PerplexityService();
