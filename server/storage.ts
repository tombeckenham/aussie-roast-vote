import { 
  User, InsertUser, 
  ElectoralSeat, InsertElectoralSeat,
  Party, InsertParty,
  Candidate, InsertCandidate, 
  CampaignActivity, InsertCampaignActivity,
  AiRoast, InsertAiRoast,
  CandidateQA, InsertCandidateQA,
  users, electoralSeats, parties, candidates, campaignActivities, aiRoasts, candidateQA
} from "@shared/schema";
import { eq, gte, ilike, or, and, desc } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // Users (kept from original)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Electoral Seats
  getElectoralSeats(): Promise<ElectoralSeat[]>;
  getElectoralSeatById(id: number): Promise<ElectoralSeat | undefined>;
  getElectoralSeatBySlug(slug: string): Promise<ElectoralSeat | undefined>;
  createElectoralSeat(seat: InsertElectoralSeat): Promise<ElectoralSeat>;
  searchElectoralSeatsByPostcode(postcode: string): Promise<ElectoralSeat[]>;
  searchElectoralSeatsByName(query: string): Promise<ElectoralSeat[]>;

  // Parties
  getParties(): Promise<Party[]>;
  getPartyById(id: number): Promise<Party | undefined>;
  createParty(party: InsertParty): Promise<Party>;

  // Candidates
  getCandidates(): Promise<Candidate[]>;
  getCandidateById(id: number): Promise<Candidate | undefined>;
  getCandidatesByElectoralSeat(seatId: number): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;

  // Campaign Activities
  getCampaignActivitiesByCandidate(candidateId: number): Promise<CampaignActivity[]>;
  getUpcomingCampaignActivities(candidateId: number): Promise<CampaignActivity[]>;
  createCampaignActivity(activity: InsertCampaignActivity): Promise<CampaignActivity>;

  // AI Roasts
  getRoastByCandidate(candidateId: number): Promise<AiRoast | undefined>;
  createRoast(roast: InsertAiRoast): Promise<AiRoast>;

  // Candidate Q&A
  getCandidateQA(candidateId: number): Promise<CandidateQA[]>;
  createCandidateQA(qa: InsertCandidateQA): Promise<CandidateQA>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private electoralSeats: Map<number, ElectoralSeat>;
  private parties: Map<number, Party>;
  private candidates: Map<number, Candidate>;
  private campaignActivities: Map<number, CampaignActivity>;
  private aiRoasts: Map<number, AiRoast>;
  private candidateQAs: Map<number, CandidateQA>;
  
  currentUserId: number;
  currentElectoralSeatId: number;
  currentPartyId: number;
  currentCandidateId: number;
  currentCampaignActivityId: number;
  currentAiRoastId: number;
  currentCandidateQAId: number;

  constructor() {
    this.users = new Map();
    this.electoralSeats = new Map();
    this.parties = new Map();
    this.candidates = new Map();
    this.campaignActivities = new Map();
    this.aiRoasts = new Map();
    this.candidateQAs = new Map();
    
    this.currentUserId = 1;
    this.currentElectoralSeatId = 1;
    this.currentPartyId = 1;
    this.currentCandidateId = 1;
    this.currentCampaignActivityId = 1;
    this.currentAiRoastId = 1;
    this.currentCandidateQAId = 1;
    
    this.initializeData();
  }

  // Initialize with sample data for development
  private initializeData() {
    // Initialize with some common Australian political parties
    const parties = [
      {
        name: "Liberal Party",
        shortName: "Liberal",
        color: "#0047AB", // Blue
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Liberal_Party_of_Australia_logo.svg/200px-Liberal_Party_of_Australia_logo.svg.png"
      },
      {
        name: "Australian Labor Party",
        shortName: "Labor",
        color: "#E4181C", // Red
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Australian_Labor_Party_logo.svg/200px-Australian_Labor_Party_logo.svg.png"
      },
      {
        name: "Australian Greens",
        shortName: "Greens",
        color: "#009B3A", // Green
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Australian_Greens_logo.svg/200px-Australian_Greens_logo.svg.png"
      },
      {
        name: "Independent",
        shortName: "Ind",
        color: "#45B1E8", // Teal
        logoUrl: ""
      }
    ];

    parties.forEach(party => {
      this.createParty(party);
    });

    // Initialize a few electoral seats
    const electoralSeats = [
      {
        name: "Wentworth",
        state: "NSW",
        description: "Wentworth covers Sydney's eastern suburbs including Bondi, Double Bay, and Paddington. It's known for its beautiful beaches, wealthy residents, and being a formerly safe Liberal seat that's now contested.",
        isMarginial: true,
        currentMp: "Allegra Spender",
        currentParty: "Independent",
        keyIssues: ["Climate change action", "Cost of living", "Housing affordability"],
        previousResults: {
          "2022": [
            { party: "Independent", percentage: 43.9 },
            { party: "Liberal", percentage: 38.1 },
            { party: "Labor", percentage: 18.0 }
          ]
        },
        slug: "wentworth",
        position: { x: 500, y: 180 }
      },
      {
        name: "Sydney",
        state: "NSW",
        description: "Sydney covers the central business district and inner suburbs of Australia's largest city, including areas like Surry Hills, Redfern, and Glebe.",
        isMarginial: false,
        currentMp: "Tanya Plibersek",
        currentParty: "Labor",
        keyIssues: ["Public transport", "Housing affordability", "LGBTQ+ rights"],
        previousResults: {
          "2022": [
            { party: "Labor", percentage: 58.3 },
            { party: "Greens", percentage: 22.1 },
            { party: "Liberal", percentage: 19.6 }
          ]
        },
        slug: "sydney",
        position: { x: 300, y: 200 }
      },
      {
        name: "Melbourne",
        state: "VIC",
        description: "Melbourne covers the central business district and inner suburbs of Victoria's capital city.",
        isMarginial: false,
        currentMp: "Adam Bandt",
        currentParty: "Greens",
        keyIssues: ["Climate action", "Housing affordability", "Public transport"],
        previousResults: {
          "2022": [
            { party: "Greens", percentage: 49.3 },
            { party: "Labor", percentage: 32.8 },
            { party: "Liberal", percentage: 17.9 }
          ]
        },
        slug: "melbourne",
        position: { x: 450, y: 350 }
      }
    ];

    electoralSeats.forEach(seat => {
      this.createElectoralSeat(seat);
    });
  }

  // Users (kept from original)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Electoral Seats
  async getElectoralSeats(): Promise<ElectoralSeat[]> {
    return Array.from(this.electoralSeats.values());
  }

  async getElectoralSeatById(id: number): Promise<ElectoralSeat | undefined> {
    return this.electoralSeats.get(id);
  }

  async getElectoralSeatBySlug(slug: string): Promise<ElectoralSeat | undefined> {
    return Array.from(this.electoralSeats.values()).find(
      (seat) => seat.slug === slug,
    );
  }

  async createElectoralSeat(insertSeat: InsertElectoralSeat): Promise<ElectoralSeat> {
    const id = this.currentElectoralSeatId++;
    const seat: ElectoralSeat = { ...insertSeat, id };
    this.electoralSeats.set(id, seat);
    return seat;
  }

  async searchElectoralSeatsByPostcode(postcode: string): Promise<ElectoralSeat[]> {
    // In a real implementation, this would use a lookup table or API
    // For demo purposes, just return all seats
    return this.getElectoralSeats();
  }

  async searchElectoralSeatsByName(query: string): Promise<ElectoralSeat[]> {
    if (!query) return this.getElectoralSeats();
    
    query = query.toLowerCase();
    return Array.from(this.electoralSeats.values()).filter(
      (seat) => seat.name.toLowerCase().includes(query) || 
                seat.state.toLowerCase().includes(query)
    );
  }

  // Parties
  async getParties(): Promise<Party[]> {
    return Array.from(this.parties.values());
  }

  async getPartyById(id: number): Promise<Party | undefined> {
    return this.parties.get(id);
  }

  async createParty(insertParty: InsertParty): Promise<Party> {
    const id = this.currentPartyId++;
    const party: Party = { ...insertParty, id };
    this.parties.set(id, party);
    return party;
  }

  // Candidates
  async getCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values());
  }

  async getCandidateById(id: number): Promise<Candidate | undefined> {
    return this.candidates.get(id);
  }

  async getCandidatesByElectoralSeat(seatId: number): Promise<Candidate[]> {
    return Array.from(this.candidates.values()).filter(
      (candidate) => candidate.electoralSeatId === seatId
    );
  }

  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const id = this.currentCandidateId++;
    const candidate: Candidate = { ...insertCandidate, id };
    this.candidates.set(id, candidate);
    return candidate;
  }

  // Campaign Activities
  async getCampaignActivitiesByCandidate(candidateId: number): Promise<CampaignActivity[]> {
    return Array.from(this.campaignActivities.values())
      .filter(activity => activity.candidateId === candidateId)
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }

  async getUpcomingCampaignActivities(candidateId: number): Promise<CampaignActivity[]> {
    const now = new Date();
    return Array.from(this.campaignActivities.values())
      .filter(activity => 
        activity.candidateId === candidateId && 
        activity.dateTime.getTime() >= now.getTime()
      )
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }

  async createCampaignActivity(insertActivity: InsertCampaignActivity): Promise<CampaignActivity> {
    const id = this.currentCampaignActivityId++;
    const activity: CampaignActivity = { ...insertActivity, id };
    this.campaignActivities.set(id, activity);
    return activity;
  }

  // AI Roasts
  async getRoastByCandidate(candidateId: number): Promise<AiRoast | undefined> {
    return Array.from(this.aiRoasts.values()).find(
      (roast) => roast.candidateId === candidateId
    );
  }

  async createRoast(insertRoast: InsertAiRoast): Promise<AiRoast> {
    const id = this.currentAiRoastId++;
    const roast: AiRoast = { 
      ...insertRoast, 
      id, 
      generatedAt: new Date() 
    };
    this.aiRoasts.set(id, roast);
    return roast;
  }

  // Candidate Q&A
  async getCandidateQA(candidateId: number): Promise<CandidateQA[]> {
    return Array.from(this.candidateQAs.values())
      .filter(qa => qa.candidateId === candidateId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createCandidateQA(insertQA: InsertCandidateQA): Promise<CandidateQA> {
    const id = this.currentCandidateQAId++;
    const qa: CandidateQA = { 
      ...insertQA, 
      id, 
      timestamp: new Date() 
    };
    this.candidateQAs.set(id, qa);
    return qa;
  }
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Electoral Seats
  async getElectoralSeats(): Promise<ElectoralSeat[]> {
    return db.select().from(electoralSeats);
  }

  async getElectoralSeatById(id: number): Promise<ElectoralSeat | undefined> {
    const [seat] = await db.select().from(electoralSeats).where(eq(electoralSeats.id, id));
    return seat || undefined;
  }

  async getElectoralSeatBySlug(slug: string): Promise<ElectoralSeat | undefined> {
    const [seat] = await db.select().from(electoralSeats).where(eq(electoralSeats.slug, slug));
    return seat || undefined;
  }

  async createElectoralSeat(seat: InsertElectoralSeat): Promise<ElectoralSeat> {
    const [createdSeat] = await db
      .insert(electoralSeats)
      .values(seat)
      .returning();
    return createdSeat;
  }

  async searchElectoralSeatsByPostcode(postcode: string): Promise<ElectoralSeat[]> {
    // In a real implementation, this would use a lookup table or API
    // For now, just return seats with similar names (postcode implementation would need geocoding)
    return this.searchElectoralSeatsByName(postcode);
  }

  async searchElectoralSeatsByName(query: string): Promise<ElectoralSeat[]> {
    if (!query) return this.getElectoralSeats();
    
    return db
      .select()
      .from(electoralSeats)
      .where(
        or(
          ilike(electoralSeats.name, `%${query}%`),
          ilike(electoralSeats.state, `%${query}%`)
        )
      );
  }

  // Parties
  async getParties(): Promise<Party[]> {
    return db.select().from(parties);
  }

  async getPartyById(id: number): Promise<Party | undefined> {
    const [party] = await db.select().from(parties).where(eq(parties.id, id));
    return party || undefined;
  }

  async createParty(party: InsertParty): Promise<Party> {
    const [createdParty] = await db
      .insert(parties)
      .values(party)
      .returning();
    return createdParty;
  }

  // Candidates
  async getCandidates(): Promise<Candidate[]> {
    return db.select().from(candidates);
  }

  async getCandidateById(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async getCandidatesByElectoralSeat(seatId: number): Promise<Candidate[]> {
    return db
      .select()
      .from(candidates)
      .where(eq(candidates.electoralSeatId, seatId));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [createdCandidate] = await db
      .insert(candidates)
      .values(candidate)
      .returning();
    return createdCandidate;
  }

  // Campaign Activities
  async getCampaignActivitiesByCandidate(candidateId: number): Promise<CampaignActivity[]> {
    return db
      .select()
      .from(campaignActivities)
      .where(eq(campaignActivities.candidateId, candidateId))
      .orderBy(campaignActivities.dateTime);
  }

  async getUpcomingCampaignActivities(candidateId: number): Promise<CampaignActivity[]> {
    const now = new Date();
    return db
      .select()
      .from(campaignActivities)
      .where(
        and(
          eq(campaignActivities.candidateId, candidateId),
          gte(campaignActivities.dateTime, now)
        )
      )
      .orderBy(campaignActivities.dateTime);
  }

  async createCampaignActivity(activity: InsertCampaignActivity): Promise<CampaignActivity> {
    const [createdActivity] = await db
      .insert(campaignActivities)
      .values(activity)
      .returning();
    return createdActivity;
  }

  // AI Roasts
  async getRoastByCandidate(candidateId: number): Promise<AiRoast | undefined> {
    const [roast] = await db
      .select()
      .from(aiRoasts)
      .where(eq(aiRoasts.candidateId, candidateId));
    return roast || undefined;
  }

  async createRoast(roast: InsertAiRoast): Promise<AiRoast> {
    const [createdRoast] = await db
      .insert(aiRoasts)
      .values(roast)
      .returning();
    return createdRoast;
  }

  // Candidate Q&A
  async getCandidateQA(candidateId: number): Promise<CandidateQA[]> {
    return db
      .select()
      .from(candidateQA)
      .where(eq(candidateQA.candidateId, candidateId))
      .orderBy(desc(candidateQA.timestamp));
  }

  async createCandidateQA(qa: InsertCandidateQA): Promise<CandidateQA> {
    const [createdQA] = await db
      .insert(candidateQA)
      .values(qa)
      .returning();
    return createdQA;
  }
}

// Switch from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
