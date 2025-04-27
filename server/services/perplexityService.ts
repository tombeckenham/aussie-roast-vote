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

Please provide in detail:
1. Key policy positions and political stances - list specific policies with bullet points
   - Include policy positions on climate change, economy, healthcare, education, immigration
   - Note flagship policies or signature issues they campaign on
   - Include any specific promises made for the ${electorateName} electorate

2. Background and political history
   - Previous political roles or positions
   - Educational and professional background
   - Connection to the ${electorateName} electorate

3. Recent news (last 7 days)
   - Recent campaign announcements or statements
   - Media appearances or interviews
   - Controversies or notable events in the past week

4. Upcoming campaign events
   - Scheduled rallies, speeches, or town halls in the next 7 days
   - Planned debates or public appearances
   - Digital events or online forums

5. Controversies or notable achievements
   - Any scandals or criticisms from opponents
   - Major accomplishments or recognition
   - Funding announcements or electorate-specific projects

6. How they compare to other candidates in ${electorateName}
   - Policy differences
   - Polling information if available
   - Areas where they differentiate themselves

Also, if you can find it, please include any official photo URL for the candidate. If you find an image, label it with "IMAGE_URL: " followed by the URL.

FORMAT REQUIREMENT: For the policy section, use bullet points with a dash (-) at the start of each line. Make sure each policy is clearly identified and separated.

Only provide factual information - don't create any commentary, humor or opinions. I'll use this raw data for my own analysis. Focus especially on detailed policy information wherever possible.`;

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
          max_tokens: 2000, // Increased token limit for more detailed information
          search_recency_filter: "week", // More recent information
          search_domain_filter: ["abc.net.au", "sbs.com.au", "theage.com.au", "smh.com.au", "news.com.au", "theaustralian.com.au", "theguardian.com/au"], // Australian news sources
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
