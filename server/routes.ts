import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertCandidateQASchema,
  ElectoralSeat
} from "@shared/schema";
import { ensureCandidatesForSeat, generateCandidateData } from "./services/electoralData";
import { answerCandidateQuestion } from "./services/grok";
import { searchSeatsByPostcode, initializePostcodeMapping } from "./services/postcodeService";
import { 
  findElectoralSeatsByPostcode, 
  initializeAECDataService,
  findDivisionByPostcode,
  getDivisionDetailsByName,
  findDivisionsByPostcode
} from "./services/aecDataService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize postcode mapping service and AEC data service
  await initializePostcodeMapping();
  initializeAECDataService();
  // API routes for electoral data
  app.get("/api/seats", async (req: Request, res: Response) => {
    try {
      const seats = await storage.getElectoralSeats();
      res.json(seats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch electoral seats" });
    }
  });

  app.get("/api/seats/search", async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      
      if (!q) {
        // If no query provided, return empty results
        return res.json([]);
      }
      
      const searchQuery = (q as string).trim();
      // Use a Map to store results keyed by seat name (all uppercase)
      // This ensures we don't have duplication if the same seat is found by different methods
      const uniqueResults = new Map<string, ElectoralSeat>();
      
      // Get all seats from database (for matching if needed)
      const allSeats = await storage.getElectoralSeats();
      const allSeatsByName = new Map<string, ElectoralSeat>();
      allSeats.forEach(seat => {
        allSeatsByName.set(seat.name.toUpperCase(), seat);
      });
      
      // 1. Prioritize postcode search for numeric queries (3-4 digits)
      if (/^\d{3,4}$/.test(searchQuery)) {
        console.log(`Searching for postcode: ${searchQuery}`);
        
        // Look up divisions directly from AEC data
        const divisionNames = findDivisionsByPostcode(searchQuery);
        if (divisionNames.length > 0) {
          console.log(`Found divisions for postcode ${searchQuery}: ${divisionNames.join(', ')}`);
          
          for (const divisionName of divisionNames) {
            // First, see if we already have this division in the database
            // This matches the actual database record if we have it
            const existingSeat = allSeatsByName.get(divisionName.toUpperCase());
            if (existingSeat) {
              console.log(`Found matching seat: ${existingSeat.name} (${existingSeat.id})`);
              uniqueResults.set(divisionName.toUpperCase(), existingSeat);
              continue;
            }
            
            // If no matching seat in database, create virtual seat from AEC data
            const details = getDivisionDetailsByName(divisionName);
            if (details) {
              // Create a virtual seat object for display purposes
              // with a negative ID to avoid conflicts with database records
              const virtualSeat: ElectoralSeat = {
                id: -1 * Math.floor(Math.random() * 10000 + 1000), // Negative random ID
                name: details.Name,
                slug: details.Name.toLowerCase().replace(/\s+/g, '-'),
                state: details.State,
                description: `Electoral division of ${details.Name} in ${details.State}.`,
                isMarginial: false,
                currentMp: null,
                currentParty: null,
                keyIssues: [],
                previousResults: {},
                position: null
              };
              
              uniqueResults.set(divisionName.toUpperCase(), virtualSeat);
              console.log(`Created virtual seat for ${details.Name} (${details.State})`);
            }
          }
        }
      }
      
      // If we don't have results yet and it's not a postcode,
      // or we want to complement postcode results with text search:
      
      if (!(/^\d{3,4}$/.test(searchQuery)) || uniqueResults.size === 0) {
        // 2. Search by suburb name against AEC data
        console.log(`Searching for suburb: "${searchQuery}"`);
        
        // Get all postcode mappings
        const mappings = loadPostcodeMappings();
        
        // Search for suburbs that contain the query
        const matchingSuburbs = mappings.filter(mapping => 
          mapping.locality.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (matchingSuburbs.length > 0) {
          // Get unique division names from matching suburbs
          const divisionSet = new Set<string>();
          for (const suburb of matchingSuburbs) {
            console.log(`Found partial suburb match: "${suburb.locality}" for query "${searchQuery}"`);
            divisionSet.add(suburb.divisionName);
          }
          
          // For each division, find matching seat or create virtual seat
          console.log(`Found matching divisions: ${[...divisionSet].join(', ').toLowerCase()}`);
          
          for (const divisionName of divisionSet) {
            // Check if we have this division in the database
            const existingSeat = allSeatsByName.get(divisionName.toUpperCase());
            if (existingSeat) {
              console.log(`Found matching seat: ${existingSeat.name} (${existingSeat.id})`);
              uniqueResults.set(divisionName.toUpperCase(), existingSeat);
              continue;
            }
            
            // If no match in database, create virtual seat
            const details = getDivisionDetailsByName(divisionName);
            if (details) {
              const virtualSeat: ElectoralSeat = {
                id: -1 * Math.floor(Math.random() * 10000 + 1000),
                name: details.Name,
                slug: details.Name.toLowerCase().replace(/\s+/g, '-'),
                state: details.State,
                description: `Electoral division of ${details.Name} in ${details.State}.`,
                isMarginial: false,
                currentMp: null,
                currentParty: null,
                keyIssues: [],
                previousResults: {},
                position: null
              };
              
              uniqueResults.set(divisionName.toUpperCase(), virtualSeat);
            }
          }
        }
        
        // 3. Direct division name search (if the query matches division names)
        // This is useful for searches like "Sydney" or "Melbourne"
        const divisions = loadDivisionDetails();
        const matchingDivisions = divisions.filter(div => 
          div.Name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        for (const division of matchingDivisions) {
          // Check if we have this division in the database
          const existingSeat = allSeatsByName.get(division.Name.toUpperCase());
          if (existingSeat) {
            uniqueResults.set(division.Name.toUpperCase(), existingSeat);
            continue;
          }
          
          // Create virtual seat
          const virtualSeat: ElectoralSeat = {
            id: -1 * Math.floor(Math.random() * 10000 + 1000),
            name: division.Name,
            slug: division.Name.toLowerCase().replace(/\s+/g, '-'),
            state: division.State,
            description: `Electoral division of ${division.Name} in ${division.State}.`,
            isMarginial: false,
            currentMp: null,
            currentParty: null,
            keyIssues: [],
            previousResults: {},
            position: null
          };
          
          uniqueResults.set(division.Name.toUpperCase(), virtualSeat);
        }
      }
      
      // Convert map to array
      const finalResults = Array.from(uniqueResults.values());
      
      console.log(`Unified search for "${searchQuery}" found ${finalResults.length} seats`);
      return res.json(finalResults);
    } catch (error) {
      console.error("Error searching seats:", error);
      res.status(500).json({ message: "Failed to search electoral seats" });
    }
  });

  // Direct AEC data lookup endpoint for divisions by postcode
  app.get("/api/divisions/postcode/:postcode", async (req: Request, res: Response) => {
    try {
      const { postcode } = req.params;
      
      if (!postcode || !/^\d{3,4}$/.test(postcode)) {
        return res.status(400).json({ message: "Invalid postcode format. Must be 3-4 digits." });
      }
      
      // First get all division names for this postcode
      const divisionNames = findDivisionsByPostcode(postcode);
      
      if (divisionNames.length === 0) {
        return res.status(404).json({ message: "No divisions found for this postcode" });
      }
      
      // Get details for each division
      const divisions = divisionNames.map((name: string) => {
        const details = getDivisionDetailsByName(name);
        return {
          postcode,
          divisionName: name,
          details
        };
      });
      
      res.json(divisions);
    } catch (error) {
      console.error("Error fetching division by postcode:", error);
      res.status(500).json({ message: "Failed to fetch division information" });
    }
  });

  app.get("/api/seats/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const seat = await storage.getElectoralSeatBySlug(slug);
      
      if (!seat) {
        return res.status(404).json({ message: "Electoral seat not found" });
      }
      
      res.json(seat);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch electoral seat" });
    }
  });

  // Candidates API
  app.get("/api/seats/:seatId/candidates", async (req: Request, res: Response) => {
    try {
      const seatId = parseInt(req.params.seatId, 10);
      
      if (isNaN(seatId)) {
        return res.status(400).json({ message: "Invalid seat ID" });
      }
      
      // Ensure candidates exist for this seat
      await ensureCandidatesForSeat(seatId);
      
      const candidates = await storage.getCandidatesByElectoralSeat(seatId);
      
      // Fetch party data for each candidate
      const candidatesWithParty = await Promise.all(
        candidates.map(async (candidate) => {
          let party = null;
          if (candidate.partyId) {
            party = await storage.getPartyById(candidate.partyId);
          }
          
          // Fetch roast for candidate
          const roast = await storage.getRoastByCandidate(candidate.id);
          
          // Fetch upcoming activities
          const activities = await storage.getUpcomingCampaignActivities(candidate.id);
          
          return {
            ...candidate,
            party,
            roast,
            activities: activities.slice(0, 1) // Just return the next activity
          };
        })
      );
      
      res.json(candidatesWithParty);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.get("/api/candidates/:id", async (req: Request, res: Response) => {
    try {
      const candidateId = parseInt(req.params.id, 10);
      
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      
      const candidate = await storage.getCandidateById(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Ensure roast and activities exist
      await generateCandidateData(candidateId);
      
      // Fetch party data
      let party = null;
      if (candidate.partyId) {
        party = await storage.getPartyById(candidate.partyId);
      }
      
      // Fetch roast
      const roast = await storage.getRoastByCandidate(candidateId);
      
      // Fetch all upcoming activities
      const activities = await storage.getUpcomingCampaignActivities(candidateId);
      
      // Fetch QA history
      const qaHistory = await storage.getCandidateQA(candidateId);
      
      res.json({
        ...candidate,
        party,
        roast,
        activities,
        qaHistory
      });
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });

  // Q&A API
  app.post("/api/candidates/:id/ask", async (req: Request, res: Response) => {
    try {
      const candidateId = parseInt(req.params.id, 10);
      
      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }
      
      // Validate the question
      const questionSchema = z.object({
        question: z.string().min(5).max(500)
      });
      
      const parsedBody = questionSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid question format",
          errors: parsedBody.error.flatten().fieldErrors
        });
      }
      
      const { question } = parsedBody.data;
      
      // Fetch candidate
      const candidate = await storage.getCandidateById(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Fetch party data
      let partyName = "Independent";
      if (candidate.partyId) {
        const party = await storage.getPartyById(candidate.partyId);
        if (party) {
          partyName = party.name;
        }
      }
      
      // Fetch seat data
      const seat = await storage.getElectoralSeatById(candidate.electoralSeatId);
      
      // Generate candidate info for context
      const candidateInfo = `
        Name: ${candidate.name}
        Party: ${partyName}
        Position: ${candidate.position || ""}
        Bio: ${candidate.bio || ""}
        Key Policies: ${candidate.keyPolicies?.join(", ") || ""}
        Electorate: ${seat?.name || ""}
        Incumbent MP: ${candidate.isIncumbent ? "Yes" : "No"}
      `;
      
      // Get AI answer to the question
      const answer = await answerCandidateQuestion(
        candidate.name,
        partyName,
        question,
        candidateInfo
      );
      
      // Save the Q&A to the database
      const qa = await storage.createCandidateQA({
        candidateId,
        question,
        answer
      });
      
      res.json(qa);
    } catch (error) {
      console.error("Error processing question:", error);
      res.status(500).json({ message: "Failed to process question" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
