import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import {
  insertCandidateQASchema,
  ElectoralSeat,
  electoralSeats,
  localities,
} from "@shared/schema";
import {
  ensureCandidatesForSeat,
  generateCandidateData,
} from "./services/electoralData";
import { answerCandidateQuestion } from "./services/grok";
import xaiService from "./services/xaiService";
import openaiService from "./services/openaiService";
import {
  searchSeatsByPostcode,
  initializePostcodeMapping,
} from "./services/postcodeService";
import {
  findElectoralSeatsByPostcode,
  initializeAECDataService,
  findDivisionByPostcode,
  getDivisionDetailsByName,
  findDivisionsByPostcode,
  loadPostcodeMappings,
  loadDivisionDetails,
  findLocalitiesByQuery,
} from "./services/aecDataService";
import { sql } from "drizzle-orm";

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

  app.get("/api/locality/search", async (req: Request, res: Response) => {
    try {
      const { q } = req.query;

      if (!q) {
        // If no query provided, return empty results
        return res.json([]);
      }

      const searchQuery = (q as string).trim();

      const localityResult = await findLocalitiesByQuery(searchQuery);
      return res.json(localityResult);
    } catch (error) {
      console.error("Error searching seats:", error);
      res.status(500).json({ message: "Failed to search electoral seats" });
    }
  });

  // Direct AEC data lookup endpoint for divisions by postcode
  app.get(
    "/api/divisions/postcode/:postcode",
    async (req: Request, res: Response) => {
      try {
        const { postcode } = req.params;

        if (!postcode || !/^\d{3,4}$/.test(postcode)) {
          return res
            .status(400)
            .json({ message: "Invalid postcode format. Must be 3-4 digits." });
        }

        // First get all division names for this postcode
        const divisionNames = findDivisionsByPostcode(postcode);

        if (divisionNames.length === 0) {
          return res
            .status(404)
            .json({ message: "No divisions found for this postcode" });
        }

        // Get details for each division
        const divisions = divisionNames.map((name: string) => {
          const details = getDivisionDetailsByName(name);
          return {
            postcode,
            divisionName: name,
            details,
          };
        });

        res.json(divisions);
      } catch (error) {
        console.error("Error fetching division by postcode:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch division information" });
      }
    },
  );

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

  // Get roasts for candidates in a specific electoral seat
  app.get("/api/seats/:seatId/roasts", async (req: Request, res: Response) => {
    try {
      const seatId = parseInt(req.params.seatId, 10);
      
      if (isNaN(seatId)) {
        return res.status(400).json({ message: "Invalid seat ID" });
      }
      
      // Get all candidates for the seat
      const candidates = await storage.getCandidatesByElectoralSeat(seatId);
      
      if (!candidates || candidates.length === 0) {
        return res.json({});
      }
      
      // Create a map of candidate ID to roast content
      const roastMap: Record<number, string> = {};
      
      for (const candidate of candidates) {
        const roast = await storage.getRoastByCandidate(candidate.id);
        if (roast) {
          roastMap[candidate.id] = roast.content;
        }
      }
      
      res.json(roastMap);
    } catch (error) {
      console.error("Error fetching roasts for seat:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Candidates API
  app.get(
    "/api/seats/:seatId/candidates",
    async (req: Request, res: Response) => {
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
            const activities = await storage.getUpcomingCampaignActivities(
              candidate.id,
            );

            return {
              ...candidate,
              party,
              roast,
              activities: activities.slice(0, 1), // Just return the next activity
            };
          }),
        );

        res.json(candidatesWithParty);
      } catch (error) {
        console.error("Error fetching candidates:", error);
        res.status(500).json({ message: "Failed to fetch candidates" });
      }
    },
  );

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
      const activities =
        await storage.getUpcomingCampaignActivities(candidateId);

      // Fetch QA history
      const qaHistory = await storage.getCandidateQA(candidateId);

      res.json({
        ...candidate,
        party,
        roast,
        activities,
        qaHistory,
      });
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });

  // Generate caricature for candidate
  app.post("/api/candidates/:id/caricature", async (req: Request, res: Response) => {
    try {
      const candidateId = parseInt(req.params.id, 10);

      if (isNaN(candidateId)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidateById(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Generate the caricature image directly using OpenAI
      console.log(`Generating caricature for candidate ${candidate.name}...`);
      const imageData = await openaiService.generateCaricatureImage(candidate);

      // Return only the image data
      res.json({ 
        candidateId, 
        name: candidate.name,
        description: "", // Sending empty description since we're not generating it anymore
        imageData: imageData || null
      });
    } catch (error) {
      console.error("Error generating caricature:", error);
      res.status(500).json({ message: "Failed to generate caricature" });
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
        question: z.string().min(5).max(500),
      });

      const parsedBody = questionSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: "Invalid question format",
          errors: parsedBody.error.flatten().fieldErrors,
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
      const seat = await storage.getElectoralSeatById(
        candidate.electoralSeatId,
      );

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
        candidateInfo,
      );

      // Save the Q&A to the database
      const qa = await storage.createCandidateQA({
        candidateId,
        question,
        answer,
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
