import { Candidate } from "@shared/schema";
import fetch from "node-fetch";

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
   * Fetch raw research data about a candidate using Perplexity's real-time search
   * This function only gets raw data that will later be processed by xAI
   */
  async getCandidateRawData(
    candidate: Candidate,
    electorateName: string,
  ): Promise<string> {
    try {
      console.log(`Getting raw data from Perplexity for ${candidate.name}...`);

      const partyInfo = candidate.partyId
        ? `who is running for the political party with ID ${candidate.partyId}`
        : "who is running as an Independent";

      const prompt = `Research and collect information about ${candidate.name}, ${partyInfo}, who is running for the ${electorateName} electorate in the 2025 Australian federal election.

Please provide:
1. Key policy positions and political stances
2. Background and political history
3. Recent news or social media activities 
4. Any controversies or notable achievements
5. How they compare to other candidates

Only provide factual information - don't create any commentary, humor or opinions. I'll use this raw data for my own analysis.`;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar", // Using Sonar for latest info
          messages: [
            {
              role: "system",
              content:
                "You are a factual research assistant who collects comprehensive information about political candidates. Provide only facts and information, not analysis or opinions.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3, // Low temperature for more factual responses
          top_p: 0.9,
          max_tokens: 1000,
          search_recency_filter: "month", // Use recent information
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Perplexity API error (${response.status}): ${errorText}`,
        );
      }
      const responseJson = await response.json();
      const data = responseJson as {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      };

      // Concat all the messages into one long string
      const rawContent = data.choices
        .map((choice) => choice.message.content)
        .join(" ");
      console.log(
        `Successfully fetched raw data from Perplexity for ${candidate.name}`,
        rawContent,
      );

      return rawContent;
    } catch (error) {
      console.error(
        `Error fetching data from Perplexity for ${candidate.name}:`,
        error,
      );
      throw error;
    }
  }
}

// Export as default singleton
export default new PerplexityService();
