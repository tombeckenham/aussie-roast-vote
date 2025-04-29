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
  aiRoasts,
  candidates,
} from "@shared/schema";
import { eq } from "drizzle-orm";
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

  // Get commentaries for candidates in a specific electoral seat
  app.get(
    "/api/seats/:seatId/commentaries",
    async (req: Request, res: Response) => {
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

        // Create a map of candidate ID to commentary content
        const commentaryMap: Record<number, string> = {};

        for (const candidate of candidates) {
          const commentary = await storage.getRoastByCandidate(candidate.id);
          console.log("commentary found", commentary);
          if (commentary) {
            commentaryMap[candidate.id] = commentary.fullContent || "";
          }
        }

        res.json(commentaryMap);
      } catch (error) {
        console.error("Error fetching commentaries for seat:", error);
        res.status(500).json({ message: "Server error" });
      }
    },
  );

  // Generate commentaries for all candidates in a seat at once
  app.post(
    "/api/seats/:seatId/generate-commentaries",
    async (req: Request, res: Response) => {
      try {
        const seatId = parseInt(req.params.seatId, 10);
        const forceRegenerate = req.query.force === "true";

        if (isNaN(seatId)) {
          return res.status(400).json({ message: "Invalid seat ID" });
        }

        const seat = await storage.getElectoralSeatById(seatId);
        if (!seat) {
          return res.status(404).json({ message: "Seat not found" });
        }

        // Get all candidates for this seat
        const candidates = await storage.getCandidatesByElectoralSeat(seatId);

        if (candidates.length === 0) {
          return res
            .status(404)
            .json({ message: "No candidates found for this seat" });
        }

        // Import rate limiter
        const rateLimiter = await import("./services/rateLimiter").then(
          (m) => m.default,
        );
        console.log("generate-commentaries - forceRegenerate", forceRegenerate);

        // Rate limit check for seat-wide operations
        // We'll use the seat ID as the candidate ID for tracking commentary generation for the whole seat
        if (!forceRegenerate) {
          const isAllowed = rateLimiter.isOperationAllowed(
            seatId,
            "commentary",
            forceRegenerate,
          );
          if (!isAllowed) {
            const timeRemaining = rateLimiter.getTimeRemainingFormatted(
              seatId,
              "commentary",
            );
            console.log(
              `Rate limited: Commentary generation for ${seat.name} was performed recently. Next available in ${timeRemaining}`,
            );
            return res.status(429).json({
              message: `Commentary generation for this seat is rate limited. Try again in ${timeRemaining}.`,
              timeRemaining,
            });
          }

          // Record the operation for the seat
          rateLimiter.recordOperation(seatId, "commentary");
        }

        console.log(
          `Generating commentaries for all ${candidates.length} candidates in ${seat.name}...`,
        );

        // Import the services
        const { default: xaiService } = await import("./services/xaiService");
        const { default: perplexityService } = await import(
          "./services/perplexityService"
        );

        // Generate commentaries for each candidate
        const commentaryResults: Record<number, string> = {};

        for (const candidate of candidates) {
          console.log(`Generating commentary for ${candidate.name}...`);

          // Check if commentary already exists (for display)
          const existingCommentary = await storage.getRoastByCandidate(
            candidate.id,
          );

          // Always add existing commentary to the results if available
          if (existingCommentary) {
            commentaryResults[candidate.id] = existingCommentary.content;
          }

          // Generate a new commentary regardless if one exists
          try {
            // Try the combined Perplexity+xAI approach for better data
            let fullContent;
            try {
              // First, get raw factual data from Perplexity
              console.log(
                `Getting Perplexity raw data for ${candidate.name}...`,
              );
              const rawData = await perplexityService.getCandidateRawData(
                candidate,
                seat.name,
              );

              // Get party name for better context
              let partyName = "Independent";
              if (candidate.partyId) {
                const party = await storage.getPartyById(candidate.partyId);
                if (party) {
                  partyName = party.name;
                }
              }

              // Second, have xAI process it into a humorous commentary
              console.log(
                `Processing Perplexity data with xAI for ${candidate.name}...`,
              );
              fullContent = await xaiService.processCandidatePerplexityData(
                candidate.name,
                partyName,
                rawData,
              );

              console.log(
                `Generated combined Perplexity+xAI commentary for: ${candidate.name}`,
              );
            } catch (error) {
              console.error(
                `Error in combined approach, falling back to xAI only: ${(error as Error).message}`,
              );
              // Fall back to xAI only if the combined approach fails
              fullContent = await xaiService.generateCandidateRoast(candidate);
              console.log(
                `Generated xAI-only commentary for: ${candidate.name}`,
              );
            }

            if (fullContent) {
              // Create a more complete version for the table (show more content)
              // If there are paragraphs, use the first 2 paragraphs, otherwise show a larger portion
              const content = fullContent;

              // Check if we already have a roast for this candidate, to replace it
              const existingRoast = await storage.getRoastByCandidate(
                candidate.id,
              );

              if (existingRoast) {
                console.log(
                  `Replacing existing commentary for ${candidate.name} (id: ${existingRoast.id})`,
                );
              }

              // Save to database
              const commentary = await storage.createRoast({
                candidateId: candidate.id,
                content,
                fullContent,
              });

              commentaryResults[candidate.id] = fullContent;
            }
          } catch (error) {
            console.error(
              `Failed to generate commentary for ${candidate.name}:`,
              error,
            );
            if (!commentaryResults[candidate.id]) {
              commentaryResults[candidate.id] =
                "Commentary generation in progress...";
            }
          }
        }

        res.json({
          seatId,
          seatName: seat.name,
          commentaries: commentaryResults,
        });
      } catch (error) {
        console.error("Error generating commentaries:", error);
        res.status(500).json({ message: "Failed to generate commentaries" });
      }
    },
  );

  // Candidates API
  app.get(
    "/api/seats/:seatId/candidates",
    async (req: Request, res: Response) => {
      try {
        const seatId = parseInt(req.params.seatId, 10);

        if (isNaN(seatId)) {
          return res.status(400).json({ message: "Invalid seat ID" });
        }

        // Get the electoral seat to get current MP info
        const seat = await storage.getElectoralSeatById(seatId);
        if (!seat) {
          return res.status(404).json({ message: "Seat not found" });
        }

        // Ensure candidates exist for this seat
        await ensureCandidatesForSeat(seatId);

        const candidates = await storage.getCandidatesByElectoralSeat(seatId);

        // Fetch party data for each candidate
        // Log for debugging
        console.log("First candidate raw data:", candidates[0]);
        
        const candidatesWithParty = await Promise.all(
          candidates.map(async (candidate) => {
            // Log for debugging
            console.log(`Processing candidate ${candidate.name}, imageUrl: ${candidate.imageUrl}`);
            
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

            // Check if this is the incumbent MP
            const isIncumbent =
              seat.currentMp &&
              candidate.name
                .toLowerCase()
                .includes(seat.currentMp.toLowerCase());

            // Enhance candidate with seat info if they're the incumbent
            const enhancedCandidate = {
              ...candidate,
              isIncumbent: isIncumbent || candidate.isIncumbent,
              // If this is the incumbent but missing data, fill it in from the seat info
              bio:
                candidate.bio ||
                (isIncumbent
                  ? `Current Member for ${seat.name}`
                  : candidate.bio),
              // Ensure imageUrl is correctly set with a fallback for incumbents
              imageUrl:
                candidate.imageUrl ||
                (isIncumbent ? seat.currentMpPhotoUrl : null),
            };

            // Add debug logging for imageUrl values
            console.log(`Candidate ${enhancedCandidate.name} imageUrl:`, enhancedCandidate.imageUrl);
            
            return {
              ...enhancedCandidate,
              // Preserve the imageUrl value from the enhancedCandidate object
              imageUrl: enhancedCandidate.imageUrl,
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
      
      // Log for debugging
      console.log("Detail view - candidate raw data:", candidate);
      console.log("Detail view - candidate.imageUrl:", candidate.imageUrl);

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

      // Log for debugging what's coming from the database
      console.log("Candidate raw from DB:", JSON.stringify(candidate, null, 2));
      
      // Make sure we preserve the imageUrl field (debugging shows it might be getting lost)
      const mappedCandidate = {
        ...candidate,
        // Ensure imageUrl is preserved - if it's null/undefined, log a warning
        imageUrl: candidate.imageUrl || null,
        party,
        roast,
        activities,
        qaHistory,
      };
      
      // Log the final mapped candidate for debugging
      console.log("Mapped candidate imageUrl:", mappedCandidate.imageUrl);
      
      res.json(mappedCandidate);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });

  // Generate caricature for candidate
  app.post(
    "/api/candidates/:id/caricature",
    async (req: Request, res: Response) => {
      try {
        const candidateId = parseInt(req.params.id, 10);
        const forceRegenerate = req.query.force === "true";

        if (isNaN(candidateId)) {
          return res.status(400).json({ message: "Invalid candidate ID" });
        }

        const candidate = await storage.getCandidateById(candidateId);
        if (!candidate) {
          return res.status(404).json({ message: "Candidate not found" });
        }

        // Import rate limiter
        const rateLimiter = await import("./services/rateLimiter").then(
          (m) => m.default,
        );

        // Check if operation is allowed based on rate limiting
        if (!forceRegenerate && !candidate.imageUrl) {
          const isAllowed = rateLimiter.isOperationAllowed(
            candidateId,
            "caricature",
            forceRegenerate,
          );
          if (!isAllowed) {
            const timeRemaining = rateLimiter.getTimeRemainingFormatted(
              candidateId,
              "caricature",
            );
            console.log(
              `Rate limited: Caricature generation for ${candidate.name} was performed recently. Next available in ${timeRemaining}`,
            );
            return res.status(429).json({
              message: `Caricature generation for this candidate is rate limited. Try again in ${timeRemaining}.`,
              timeRemaining,
            });
          }

          // Record the operation
          rateLimiter.recordOperation(candidateId, "caricature");
        }

        // Add debug log for API KEY presence
        console.log(`XAI_API_KEY exists: ${!!process.env.XAI_API_KEY}`);
        console.log(
          `XAI_API_KEY first few chars: ${process.env.XAI_API_KEY?.substring(0, 4)}...`,
        );

        // Import the necessary service
        const { default: xaiService } = await import("./services/xaiService");
        console.log(
          `Generating caricature for candidate ${candidate.name} using xAI API...`,
        );
        const base64Image = await xaiService.generateCandidateCaricature(candidate);
     

        res.json({
          candidateId,
          name: candidate.name,
          description: "", // Not generating description anymore
          imageData: base64Image,
        });

       
      } catch (error) {
        console.error("Error generating caricature:", error);
        res.status(500).json({ message: "Failed to generate caricature" });
      }
    },
  );

  // Debug endpoint to check all ai_roasts
  app.get("/api/debug/roasts", async (req: Request, res: Response) => {
    try {
      const allRoasts = await storage.getAllRoasts();
      res.json(allRoasts);
    } catch (error) {
      console.error("Error fetching all roasts:", error);
      res.status(500).json({ message: "Failed to fetch roasts for debugging" });
    }
  });
  
  // Debug endpoint to check specific candidate with image info
  app.get("/api/debug/candidate/:id", async (req: Request, res: Response) => {
    try {
      const candidateId = parseInt(req.params.id, 10);
      
      // Get candidate directly from database using the candidates table
      const [rawCandidate] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId));
      
      // Get candidate through storage interface
      const storageCandidate = await storage.getCandidateById(candidateId);
      
      // See both results
      res.json({
        rawFromDb: rawCandidate,
        fromStorage: storageCandidate,
        imageUrlFromRaw: rawCandidate?.imageUrl,
        imageUrlFromStorage: storageCandidate?.imageUrl,
      });
    } catch (error) {
      console.error("Error fetching candidate for debugging:", error);
      res.status(500).json({ message: "Failed to fetch candidate for debugging" });
    }
  });

  // Regenerate commentary for a specific candidate
  app.post(
    "/api/candidates/:id/regenerate-commentary",
    async (req: Request, res: Response) => {
      try {
        const candidateId = parseInt(req.params.id, 10);
        const forceRegenerate = req.query.force === "true";

        if (isNaN(candidateId)) {
          return res.status(400).json({ message: "Invalid candidate ID" });
        }

        const candidate = await storage.getCandidateById(candidateId);
        if (!candidate) {
          return res.status(404).json({ message: "Candidate not found" });
        }

        // Import rate limiter
        const rateLimiter = await import("./services/rateLimiter").then(
          (m) => m.default,
        );

        // Check if operation is allowed based on rate limiting
        if (!forceRegenerate) {
          const isAllowed = rateLimiter.isOperationAllowed(
            candidateId,
            "commentary",
            forceRegenerate,
          );
          if (!isAllowed) {
            const timeRemaining = rateLimiter.getTimeRemainingFormatted(
              candidateId,
              "commentary",
            );
            console.log(
              `Rate limited: Commentary regeneration for ${candidate.name} was performed recently. Next available in ${timeRemaining}`,
            );
            return res.status(429).json({
              message: `Commentary regeneration for this candidate is rate limited. Try again in ${timeRemaining}.`,
              timeRemaining,
            });
          }

          // Record the operation
          rateLimiter.recordOperation(candidateId, "commentary");
        }

        // Get existing roast to delete
        const existingRoast = await storage.getRoastByCandidate(candidateId);

        // Delete the existing roast if it exists (in a real DB you'd use proper API)
        if (existingRoast) {
          await db
            .delete(aiRoasts)
            .where(eq(aiRoasts.candidateId, candidateId));
        }

        // Fetch seat data for context
        const seat = await storage.getElectoralSeatById(
          candidate.electoralSeatId,
        );
        if (!seat) {
          return res.status(404).json({ message: "Electoral seat not found" });
        }

        // Fetch party info for context
        let partyName = "Independent";
        if (candidate.partyId) {
          const party = await storage.getPartyById(candidate.partyId);
          if (party) {
            partyName = party.name;
          }
        }

        // Generate new commentary
        console.log(`Regenerating commentary for ${candidate.name}...`);

        // Import the services we need
        const { default: perplexityService } = await import(
          "./services/perplexityService"
        );
        const { default: xaiService } = await import("./services/xaiService");

        // Get raw data from Perplexity
        console.log(
          `Getting fresh data for ${candidate.name} from Perplexity...`,
        );
        const rawData = await perplexityService.getCandidateRawData(
          candidate,
          seat.name,
        );

        // Check if Perplexity found an image URL for the candidate
        const imageUrlMatch = rawData.match(/IMAGE_URL: (https?:\/\/[^\s]+)/i);
        if (imageUrlMatch && imageUrlMatch[1] && !candidate.imageUrl) {
          const imageUrl = imageUrlMatch[1].trim();
          console.log(`Found image URL for ${candidate.name}: ${imageUrl}`);
          // Update the candidate's image URL in the database
          await storage.updateCandidateImage(candidate.id, imageUrl);
        }

        // Extract and store key policies from the raw data
        const policiesSection = rawData.match(
          /(?:1\. Key policy positions|Key Policy Positions|### 1\. Key Policy Positions and Political Stances)([\s\S]*?)(?:2\. Background|### 2\.)/i,
        );
        if (policiesSection && policiesSection[1]) {
          const policyText = policiesSection[1];
          let policies = policyText
            .split(/\n\s*-\s*|\n\*\*|\n•/)
            .filter(
              (policy) =>
                policy.trim().length > 0 &&
                !policy.includes("Key policy positions") &&
                !policy.includes("Key Policy Positions") &&
                !policy.includes("and Political Stances"),
            )
            .map((policy) => policy.trim().replace(/\*\*/g, ""))
            .filter((policy) => policy.length > 10 && policy.length < 100); // Reasonable length for a policy

          // Get the first 3 policies
          policies = policies.slice(0, 3);

          if (policies.length > 0) {
            console.log(
              `Extracted key policies for ${candidate.name}:`,
              policies,
            );
            await storage.updateCandidatePolicies(candidate.id, policies);
          }
        }

        // Process with xAI
        console.log(`Processing data with xAI for ${candidate.name}...`);
        const fullContent = await xaiService.processCandidatePerplexityData(
          candidate.name,
          partyName,
          rawData,
        );

        // Create a more complete version for the card view (show more content)
        // If there are paragraphs, use the first 2 paragraphs, otherwise show a larger portion
        const content = fullContent.includes("\n")
          ? fullContent.split("\n").slice(0, 2).join("\n")
          : fullContent.substring(0, 600);

        // Create new roast
        await storage.createRoast({
          candidateId: candidate.id,
          content,
          fullContent,
        });

        // Return success
        res.json({
          success: true,
          message: `Commentary for ${candidate.name} is being regenerated`,
        });
      } catch (error) {
        console.error("Error regenerating commentary:", error);
        res.status(500).json({ message: "Failed to regenerate commentary" });
      }
    },
  );

  // Q&A API
  // Generate policies for a candidate
  app.post(
    "/api/candidates/:id/generate-policies",
    async (req: Request, res: Response) => {
      try {
        const candidateId = parseInt(req.params.id, 10);
        const forceRegenerate = req.query.force === "true";

        if (isNaN(candidateId)) {
          return res.status(400).json({ message: "Invalid candidate ID" });
        }

        const candidate = await storage.getCandidateById(candidateId);
        if (!candidate) {
          return res.status(404).json({ message: "Candidate not found" });
        }

        // Import rate limiter
        const rateLimiter = await import("./services/rateLimiter").then(
          (m) => m.default,
        );

        // Check if operation is allowed based on rate limiting
        const isAllowed = rateLimiter.isOperationAllowed(
          candidateId,
          "policies",
          forceRegenerate,
        );
        if (!isAllowed) {
          const timeRemaining = rateLimiter.getTimeRemainingFormatted(
            candidateId,
            "policies",
          );
          console.log(
            `Rate limited: Policy generation for ${candidate.name} was performed recently. Next available in ${timeRemaining}`,
          );
          return res.status(429).json({
            message: `Policy generation for this candidate is rate limited. Try again in ${timeRemaining}.`,
            timeRemaining,
          });
        }

        // Log the regeneration request
        console.log(
          `Policy regeneration requested for ${candidate.name}${forceRegenerate ? " (forced)" : ""}`,
        );

        // Get electoral seat for context
        const seat = await storage.getElectoralSeatById(
          candidate.electoralSeatId,
        );
        if (!seat) {
          return res.status(404).json({ message: "Electoral seat not found" });
        }

        // If candidate already has policies AND force=true is NOT specified, return existing policies
        if (
          candidate.keyPolicies &&
          candidate.keyPolicies.length > 0 &&
          !forceRegenerate
        ) {
          console.log(
            `Candidate ${candidate.name} already has policies, returning existing ones`,
          );
          return res.json({
            id: candidate.id,
            name: candidate.name,
            policies: candidate.keyPolicies,
            source: "existing",
          });
        }

        console.log(`Generating policies for candidate ${candidate.name}...`);

        // Record the operation is happening (before we respond to the client)
        rateLimiter.recordOperation(candidateId, "policies");

        // Always respond immediately to the client and continue processing in background
        res.json({
          id: candidate.id,
          name: candidate.name,
          message:
            "Policy generation started and will continue in the background",
          status: "processing",
        });

        // Import Perplexity service for getting raw data
        const { default: perplexityService } = await import(
          "./services/perplexityService"
        );

        try {
          // First try to get raw data from Perplexity
          console.log(
            `Getting raw data from Perplexity for ${candidate.name}...`,
          );
          const rawData = await perplexityService.getCandidateRawData(
            candidate,
            seat.name,
          );

          // Generate policies using both the raw data and xAI
          console.log(
            `Generating policies for ${candidate.name} with Perplexity data`,
          );
          const policies = await xaiService.generateCandidatePolicies(
            candidate,
            rawData,
          );

          if (!policies || policies.length === 0) {
            console.error(`No policies generated for ${candidate.name}`);
            return;
          }

          // Update candidate with generated policies
          const updatedCandidate = await storage.updateCandidatePolicies(
            candidate.id,
            policies,
          );

          if (!updatedCandidate) {
            console.error(
              `Failed to update ${candidate.name} with policies in database`,
            );
            return;
          }

          console.log(
            `Successfully updated policies for ${candidate.name}:`,
            policies,
          );
        } catch (error) {
          // If Perplexity data fails, fall back to xAI only
          const perplexityError = error as Error;
          console.error(
            `Error with Perplexity, falling back to xAI only: ${perplexityError.message}`,
          );

          // Generate policies using xAI only
          const policies =
            await xaiService.generateCandidatePolicies(candidate);

          if (!policies || policies.length === 0) {
            console.error(`No policies generated for ${candidate.name}`);
            return;
          }

          // Update candidate with generated policies
          const updatedCandidate = await storage.updateCandidatePolicies(
            candidate.id,
            policies,
          );

          if (!updatedCandidate) {
            console.error(
              `Failed to update ${candidate.name} with policies in database`,
            );
            return;
          }

          console.log(
            `Successfully updated policies for ${candidate.name} using fallback:`,
            policies,
          );
        }
      } catch (error) {
        console.error("Error generating policies:", error);
        res.status(500).json({ message: "Failed to generate policies" });
      }
    },
  );

  // Generate policies for all candidates in a specific seat
  app.post(
    "/api/seats/:seatId/generate-policies",
    async (req: Request, res: Response) => {
      try {
        const seatId = parseInt(req.params.seatId, 10);
        const forceRegenerate = req.query.force === "true";

        if (isNaN(seatId)) {
          return res.status(400).json({ message: "Invalid seat ID" });
        }

        const seat = await storage.getElectoralSeatById(seatId);
        if (!seat) {
          return res.status(404).json({ message: "Seat not found" });
        }

        // Get all candidates for this seat
        const candidates = await storage.getCandidatesByElectoralSeat(seatId);

        if (candidates.length === 0) {
          return res
            .status(404)
            .json({ message: "No candidates found for this seat" });
        }

        // Import rate limiter
        const rateLimiter = await import("./services/rateLimiter").then(
          (m) => m.default,
        );

        // Rate limit check for seat-wide operations
        // We'll use the seat ID to track policy generation for the whole seat
        if (!forceRegenerate) {
          const isAllowed = rateLimiter.isOperationAllowed(
            seatId,
            "policies",
            forceRegenerate,
          );
          if (!isAllowed) {
            const timeRemaining = rateLimiter.getTimeRemainingFormatted(
              seatId,
              "policies",
            );
            console.log(
              `Rate limited: Policy generation for ${seat.name} was performed recently. Next available in ${timeRemaining}`,
            );
            return res.status(429).json({
              message: `Policy generation for this seat is rate limited. Try again in ${timeRemaining}.`,
              timeRemaining,
            });
          }

          // Record the operation for the seat
          rateLimiter.recordOperation(seatId, "policies");
        }

        console.log(
          `Generating policies for all ${candidates.length} candidates in ${seat.name}...`,
        );

        // Respond quickly to the client, then continue processing
        res.json({
          seatId,
          seatName: seat.name,
          totalCandidates: candidates.length,
          message:
            "Policy generation has started and will continue in the background",
          status: "processing",
        });

        // Continue processing in the background
        (async () => {
          try {
            const results: Record<number, string[]> = {};
            let successCount = 0;
            const forceUpdate = req.query.force === "true";

            // Use Promise.all with a limited concurrency (process 3 candidates at a time)
            const batchSize = 3;
            for (let i = 0; i < candidates.length; i += batchSize) {
              const batch = candidates.slice(i, i + batchSize);

              // Import Perplexity service for getting raw data
              const { default: perplexityService } = await import(
                "./services/perplexityService"
              );

              await Promise.all(
                batch.map(async (candidate) => {
                  try {
                    console.log(`Generating policies for ${candidate.name}...`);

                    // Skip if candidate already has policies and force is not true
                    if (
                      candidate.keyPolicies &&
                      candidate.keyPolicies.length > 0 &&
                      !forceUpdate
                    ) {
                      console.log(
                        `${candidate.name} already has policies, skipping...`,
                      );
                      results[candidate.id] = candidate.keyPolicies;
                      return;
                    }

                    // First, try to get raw data from Perplexity
                    let policies: string[] = [];
                    try {
                      console.log(
                        `Getting raw data from Perplexity for ${candidate.name}...`,
                      );
                      const rawData =
                        await perplexityService.getCandidateRawData(
                          candidate,
                          seat.name,
                        );

                      // Generate policies using the raw data and xAI
                      console.log(
                        `Generating policies for ${candidate.name} with Perplexity data`,
                      );
                      policies = await xaiService.generateCandidatePolicies(
                        candidate,
                        rawData,
                      );
                    } catch (error) {
                      // Fall back to xAI only if Perplexity fails
                      const perplexityError = error as Error;
                      console.error(
                        `Perplexity error for ${candidate.name}, falling back to xAI only:`,
                        perplexityError.message,
                      );
                      policies =
                        await xaiService.generateCandidatePolicies(candidate);
                    }

                    if (policies && policies.length > 0) {
                      // Update candidate with generated policies
                      const updatedCandidate =
                        await storage.updateCandidatePolicies(
                          candidate.id,
                          policies,
                        );

                      if (updatedCandidate) {
                        console.log(
                          `Successfully updated policies for ${candidate.name}:`,
                          policies,
                        );
                        results[candidate.id] = policies;
                        successCount++;
                      }
                    }
                  } catch (candidateError) {
                    console.error(
                      `Error processing policies for ${candidate.name}:`,
                      candidateError,
                    );
                    results[candidate.id] = ["Error generating policies"];
                  }
                }),
              );

              // Brief pause between batches to prevent overwhelming the API
              if (i + batchSize < candidates.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }

            console.log(
              `Policy generation complete for ${seat.name}. Success: ${successCount} of ${candidates.length}`,
            );
          } catch (backgroundError) {
            console.error(
              `Background processing error for ${seat.name}:`,
              backgroundError,
            );
          }
        })();
      } catch (error) {
        console.error("Error generating policies for seat:", error);
        res.status(500).json({ message: "Failed to generate policies" });
      }
    },
  );

  // Generate policies for all candidates across all seats
  app.post(
    "/api/policies/generate-all",
    async (req: Request, res: Response) => {
      try {
        // Import the script
        const { default: generateCandidatePolicies } = await import(
          "./scripts/generateCandidatePolicies"
        );

        // Start the generation process (runs asynchronously)
        const result = await generateCandidatePolicies();

        return res.json({
          message: "Policy generation started",
          initialResults: result,
        });
      } catch (error) {
        console.error("Error starting policy generation:", error);
        res.status(500).json({ message: "Failed to start policy generation" });
      }
    },
  );

  app.post("/api/candidates/:id/ask", async (req: Request, res: Response) => {
    try {
      const candidateId = parseInt(req.params.id, 10);
      const forceRegenerate = req.query.force === "true";

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

      // Import rate limiter
      const rateLimiter = await import("./services/rateLimiter").then(
        (m) => m.default,
      );

      // Check if operation is allowed based on rate limiting
      if (!forceRegenerate) {
        const isAllowed = rateLimiter.isOperationAllowed(
          candidateId,
          "qa",
          forceRegenerate,
        );
        if (!isAllowed) {
          const timeRemaining = rateLimiter.getTimeRemainingFormatted(
            candidateId,
            "qa",
          );
          console.log(
            `Rate limited: Q&A for candidate ID ${candidateId} was performed recently. Next available in ${timeRemaining}`,
          );
          return res.status(429).json({
            message: `Q&A for this candidate is rate limited. Try again in ${timeRemaining}.`,
            timeRemaining,
          });
        }

        // Record the operation
        rateLimiter.recordOperation(candidateId, "qa");
      }

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
