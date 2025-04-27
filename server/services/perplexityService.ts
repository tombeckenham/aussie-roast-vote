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
   * Generate a commentary for a candidate using Perplexity's real-time data
   */
  async generateCandidateCommentary(candidate: Candidate, electorateName: string): Promise<string> {
    try {
      console.log(`Generating Perplexity commentary for ${candidate.name}...`);
      
      const partyInfo = candidate.partyId 
        ? `who is running for the political party with ID ${candidate.partyId}` 
        : "who is running as an Independent";
      
      const prompt = `Write a funny, satirical commentary about ${candidate.name}, ${partyInfo}, who is running for the ${electorateName} electorate in the 2025 Australian federal election. 
      Use authentic Australian political humor style (larrikin humor). Keep it light-hearted and humorous, focusing on their policies and style. 
      Make it about 2-3 paragraphs long, totaling 100-150 words. Do not make up policies they don't have.
      Use recent information when possible (up to April 2025).`;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: "You are an Australian political humorist writing funny commentaries on election candidates. Use recent real information when possible. Keep it lighthearted and humorous, focusing on authentic Aussie political humor."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 500,
          search_recency_filter: "month"  // Use recent information
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string;
          }
        }>
      };
      const commentary = data.choices[0].message.content;

      console.log(`Successfully generated Perplexity commentary for ${candidate.name}`);
      return commentary;
    } catch (error) {
      console.error(`Error generating Perplexity commentary for ${candidate.name}:`, error);
      throw error;
    }
  }
}

// Export as default singleton
export default new PerplexityService();