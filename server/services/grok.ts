import OpenAI from "openai";

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY || "" 
});

// Generate a humorous roast for a political candidate
export async function generateCandidateRoast(
  candidateName: string, 
  party: string,
  policies: string[],
  background: string,
  electorateName: string
): Promise<{ content: string, fullContent: string, isSpicy: boolean }> {
  try {
    const prompt = `
    Generate a humorous Australian-style roast of the following political candidate:
    
    Candidate: ${candidateName}
    Party: ${party}
    Electorate: ${electorateName}
    Policies: ${policies.join(", ")}
    Background: ${background}
    
    Create two versions:
    1. A short, punchy roast (1-2 sentences, maximum 50 words)
    2. An extended roast with 3 paragraphs
    
    The tone should be:
    - Authentically Australian with local slang and humor
    - Cheeky and witty, but not mean-spirited
    - Poking fun at policies and public statements, not personal attacks
    - Include typical Australian expressions and humor
    
    Format your response as JSON with these fields:
    {
      "shortRoast": "the short roast here",
      "fullRoast": "the extended roast here",
      "isSpicy": true/false (whether it's particularly spicy/edgy)
    }
    `;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an Australian political satirist writing for a comedy website about the upcoming 2025 Australian federal election. You specialize in light-hearted, witty roasts of political candidates that poke fun at their policies and public personas while maintaining a fair and balanced approach. Use authentic Australian humor, slang, and expressions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "";
    const result = JSON.parse(content);

    return {
      content: result.shortRoast,
      fullContent: result.fullRoast,
      isSpicy: result.isSpicy
    };
  } catch (error) {
    console.error("Error generating roast:", error);
    return {
      content: `G'day! Even AI's havin' a smoko today. We'll roast ${candidateName} properly once we're back from break.`,
      fullContent: `Looks like our AI comedian is on a tea break! We'll have a proper Aussie roast of ${candidateName} ready for you soon. In the meantime, why not grab a cold one and check back later?`,
      isSpicy: false
    };
  }
}

// Answer a question about a political candidate
export async function answerCandidateQuestion(
  candidateName: string,
  party: string,
  question: string,
  candidateInfo: string
): Promise<string> {
  try {
    const prompt = `
    Answer this question about the political candidate:
    
    Candidate: ${candidateName}
    Party: ${party}
    Question: ${question}
    
    Additional information about the candidate:
    ${candidateInfo}
    
    Your answer should:
    - Be factual and based on the provided information
    - Include a touch of Australian humor and perspective
    - Be concise but informative (max 150 words)
    - If you don't have specific information to answer the question, acknowledge that but provide related context if possible
    `;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an Australian political analyst with a sense of humor. You provide accurate information about political candidates for the 2025 Australian federal election, with a dash of Aussie wit. Your responses are factual but include a lighthearted perspective. When information is unavailable, you acknowledge that transparently."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error answering question:", error);
    return `Sorry, mate! Our AI seems to be on smoko. We couldn't get an answer about ${candidateName} just yet. Try again in a bit!`;
  }
}

// Generate campaign activities for a candidate
export async function generateCampaignActivities(
  candidateName: string,
  party: string,
  electorateName: string,
  policies: string[]
): Promise<Array<{
  title: string;
  description: string;
  location: string;
  dateTime: Date;
  endDateTime: Date;
  type: string;
}>> {
  try {
    const today = new Date();
    const prompt = `
    Generate 3 realistic campaign activities for this political candidate during the 2025 Australian federal election:
    
    Candidate: ${candidateName}
    Party: ${party}
    Electorate: ${electorateName}
    Policies: ${policies.join(", ")}
    
    Today's date: ${today.toISOString().split('T')[0]}
    
    Format your response as JSON with an array of 3 activities, each having:
    {
      "title": "Activity title",
      "description": "Brief description",
      "location": "Specific location in ${electorateName}",
      "dateTime": "YYYY-MM-DDTHH:MM:SS" (ISO format, starting from now to next 7 days),
      "endDateTime": "YYYY-MM-DDTHH:MM:SS" (usually 1-2 hours after start),
      "type": "One of: speech, meet-and-greet, debate, community_event, press_conference, other"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an Australian political campaign manager planning realistic activities for candidates in the 2025 federal election campaign."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "";
    const responseData = JSON.parse(content);
    // Make sure we're accessing the activities array if it exists
    const activities = responseData.activities || responseData;
    
    // Ensure the result is an array before mapping
    if (Array.isArray(activities)) {
      return activities.map((activity: any) => ({
        ...activity,
        dateTime: new Date(activity.dateTime),
        endDateTime: new Date(activity.endDateTime)
      }));
    } else {
      // If not an array, create a proper error message and throw
      console.error("Unexpected response format:", responseData);
      throw new Error("Received unexpected format from API");
    }
  } catch (error) {
    console.error("Error generating campaign activities:", error);
    // Return fallback activities if API fails
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return [
      {
        title: `${candidateName} Community Forum`,
        description: `Join ${candidateName} to discuss local issues affecting ${electorateName}.`,
        location: `Local Community Center, ${electorateName}`,
        dateTime: today,
        endDateTime: new Date(today.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        type: "community_event"
      },
      {
        title: "Press Conference",
        description: `${candidateName} will address recent policy announcements.`,
        location: `Party Office, ${electorateName}`,
        dateTime: tomorrow,
        endDateTime: new Date(tomorrow.getTime() + 1 * 60 * 60 * 1000), // 1 hour later
        type: "press_conference"
      }
    ];
  }
}
