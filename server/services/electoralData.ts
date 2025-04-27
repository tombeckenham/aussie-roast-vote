import { storage } from '../storage';
import { 
  InsertCandidate, 
  InsertCampaignActivity, 
  InsertAiRoast 
} from '@shared/schema';
import { 
  generateCandidateRoast, 
  generateCampaignActivities 
} from './grok';

// Generate candidates for an electoral seat if none exist
export async function ensureCandidatesForSeat(seatId: number): Promise<void> {
  const existingCandidates = await storage.getCandidatesByElectoralSeat(seatId);
  if (existingCandidates.length > 0) {
    return; // Candidates already exist
  }

  const seat = await storage.getElectoralSeatById(seatId);
  if (!seat) {
    throw new Error(`Electoral seat with ID ${seatId} not found`);
  }

  const parties = await storage.getParties();

  // Create a few candidates based on the seat's previous results
  const candidatesToCreate: InsertCandidate[] = [];

  // Start with the incumbent
  if (seat.currentMp && seat.currentParty) {
    // Find party
    const party = parties.find(p => 
      p.name.toLowerCase().includes(seat.currentParty!.toLowerCase()) || 
      p.shortName?.toLowerCase() === seat.currentParty!.toLowerCase()
    );

    candidatesToCreate.push({
      name: seat.currentMp,
      partyId: party?.id,
      isIndependent: seat.currentParty.toLowerCase() === 'independent',
      electoralSeatId: seatId,
      position: "Current Member of Parliament",
      bio: `Current Member for ${seat.name}`,
      imageUrl: `https://randomuser.me/api/portraits/women/${Math.floor(Math.random() * 70)}.jpg`,
      twitterHandle: `@${seat.currentMp.split(' ')[0].toLowerCase()}${seat.currentMp.split(' ')[1].toLowerCase()}`,
      facebookUrl: `https://facebook.com/${seat.currentMp.split(' ').join('')}`,
      websiteUrl: `https://${seat.currentMp.split(' ').join('').toLowerCase()}.com.au`,
      keyPolicies: seat.keyIssues || [],
      isIncumbent: true
    });
  }

  // Add candidates from major parties (if they're not already the incumbent)
  const majorPartyIds = parties
    .filter(p => !p.name.toLowerCase().includes('independent'))
    .filter(p => p.name !== seat.currentParty)
    .map(p => p.id);

  for (const partyId of majorPartyIds) {
    const party = parties.find(p => p.id === partyId);
    if (!party) continue;

    // Generate a random name
    const firstName = ["James", "David", "Sarah", "Emma", "Michael", "Amy", "Raj", "Priya", "Chen", "Li", "Mohammed", "Fatima"][Math.floor(Math.random() * 12)];
    const lastName = ["Smith", "Jones", "Brown", "Wilson", "Taylor", "Nguyen", "Wong", "Singh", "Li", "Zhang", "Ahmed", "Murphy"][Math.floor(Math.random() * 12)];
    const fullName = `${firstName} ${lastName}`;
    
    const positions = [
      "Former Local Councillor", 
      "Small Business Owner", 
      "Teacher", 
      "Doctor", 
      "Community Activist", 
      "Union Representative",
      "Lawyer",
      "Engineer"
    ];
    
    candidatesToCreate.push({
      name: fullName,
      partyId,
      isIndependent: false,
      electoralSeatId: seatId,
      position: positions[Math.floor(Math.random() * positions.length)],
      bio: `${party.name} candidate for ${seat.name}`,
      imageUrl: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 70)}.jpg`,
      twitterHandle: `@${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      facebookUrl: `https://facebook.com/${firstName}${lastName}`,
      websiteUrl: `https://${firstName.toLowerCase()}${lastName.toLowerCase()}.com.au`,
      keyPolicies: [
        ...seat.keyIssues?.slice(0, 2) || [], 
        "Economic growth", 
        "National security"
      ],
      isIncumbent: false
    });
  }

  // Add an independent candidate if there isn't one already
  if (!candidatesToCreate.some(c => c.isIndependent)) {
    const independentParty = parties.find(p => p.name.toLowerCase().includes('independent'));
    
    const firstName = ["Alex", "Sam", "Jordan", "Casey", "Taylor"][Math.floor(Math.random() * 5)];
    const lastName = ["Matthews", "Green", "Richards", "Stewart", "Cooper"][Math.floor(Math.random() * 5)];
    const fullName = `${firstName} ${lastName}`;
    
    candidatesToCreate.push({
      name: fullName,
      partyId: independentParty?.id,
      isIndependent: true,
      electoralSeatId: seatId,
      position: "Community Leader",
      bio: `Independent candidate for ${seat.name}`,
      imageUrl: `https://randomuser.me/api/portraits/women/${Math.floor(Math.random() * 30) + 40}.jpg`,
      twitterHandle: `@${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      facebookUrl: `https://facebook.com/${firstName}${lastName}`,
      websiteUrl: `https://${firstName.toLowerCase()}${lastName.toLowerCase()}.org.au`,
      keyPolicies: [
        "Political integrity", 
        "Climate action", 
        "Community representation"
      ],
      isIncumbent: false
    });
  }

  // Create all candidates
  for (const candidateData of candidatesToCreate) {
    const candidate = await storage.createCandidate(candidateData);
    await generateCandidateData(candidate.id);
  }
}

// Generate roast and campaign activities for a candidate
export async function generateCandidateData(candidateId: number): Promise<void> {
  const candidate = await storage.getCandidateById(candidateId);
  if (!candidate) {
    throw new Error(`Candidate with ID ${candidateId} not found`);
  }

  const seat = await storage.getElectoralSeatById(candidate.electoralSeatId);
  if (!seat) {
    throw new Error(`Electoral seat not found for candidate ${candidateId}`);
  }

  let partyName = "Independent";
  if (candidate.partyId) {
    const party = await storage.getPartyById(candidate.partyId);
    if (party) {
      partyName = party.name;
    }
  }

  // Generate a roast if one doesn't exist
  const existingRoast = await storage.getRoastByCandidate(candidateId);
  if (!existingRoast) {
    try {
      const roastResult = await generateCandidateRoast(
        candidate.name,
        partyName,
        candidate.keyPolicies || [],
        candidate.bio || "",
        seat.name
      );

      const roastData: InsertAiRoast = {
        candidateId,
        content: roastResult.content,
        fullContent: roastResult.fullContent,
        isSpicy: roastResult.isSpicy
      };

      await storage.createRoast(roastData);
    } catch (error) {
      console.error(`Error generating roast for candidate ${candidateId}:`, error);
    }
  }

  // Generate campaign activities if none exist
  const existingActivities = await storage.getCampaignActivitiesByCandidate(candidateId);
  if (existingActivities.length === 0) {
    try {
      const activities = await generateCampaignActivities(
        candidate.name,
        partyName,
        seat.name,
        candidate.keyPolicies || []
      );

      for (const activity of activities) {
        const activityData: InsertCampaignActivity = {
          candidateId,
          title: activity.title,
          description: activity.description,
          location: activity.location,
          dateTime: activity.dateTime,
          endDateTime: activity.endDateTime,
          type: activity.type
        };

        await storage.createCampaignActivity(activityData);
      }
    } catch (error) {
      console.error(`Error generating campaign activities for candidate ${candidateId}:`, error);
    }
  }
}
