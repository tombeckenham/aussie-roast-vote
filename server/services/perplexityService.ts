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

Please return the results in a JSON format with the following structure:
{
  "overviewRoast": "A witty, satirical overview of the candidate that roasts them in good Aussie fashion",
  "policySummary": "Summary of key policies and political positions",
  "trackRecord": "Information about their background and political history",
  "whyVoteForThem": "Satirical reasons to vote for them",
  "imageSearchTerms": ["5-10 specific descriptive terms that could help generate a caricature image"],
  "fullCommentary": "The combined full text as a narrative"
}

Make sure the JSON is properly formatted and use real information whenever possible. The overviewRoast and whyVoteForThem should be humorous and satirical in authentic Australian political humor style.`;

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
          search_recency_filter: "month", // Use recent information 
          response_format: { type: "json_object" } // Force JSON response
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
      
      // Parse the structured JSON response
      try {
        const parsedResponse = JSON.parse(data.choices[0].message.content) as CandidateStructuredData;
        
        // For backward compatibility, return the full commentary
        const commentary = parsedResponse.fullCommentary || parsedResponse.overviewRoast;

        console.log(
          `Successfully generated Perplexity structured data for ${candidate.name}`,
        );
        
        return commentary;
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        // Return raw content if JSON parsing fails
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
