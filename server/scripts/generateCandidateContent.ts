/**
 * Comprehensive script to generate all candidate content:
 * - Commentaries (roasts)
 * - Policies
 * - Portraits (caricatures)
 * 
 * This script can be used to populate all content for candidates in the database
 */

import { db } from '../db';
import { storage } from '../storage';
import xaiService from '../services/xaiService';
import { eq } from 'drizzle-orm';
import { Candidate, candidates, aiRoasts } from '@shared/schema';

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 5000; // Increased delay for batches

interface ProcessResult {
  candidateId: number;
  candidateName: string;
  roast: { success: boolean; skipped?: boolean; updated?: boolean; error?: string };
  policies: { success: boolean; skipped?: boolean; error?: string };
  portrait: { success: boolean; skipped?: boolean; error?: string };
}

/**
 * Processes a single candidate, generating the specified content types.
 * @param candidate The candidate to process.
 * @param options Flags indicating which content types to generate and whether to force.
 * @returns A promise resolving with the processing result.
 */
async function processSingleCandidate(
  candidate: Candidate,
  options: { 
    generateRoast: boolean; 
    generatePolicies: boolean; 
    generatePortrait: boolean; 
    force: boolean; 
  }
): Promise<ProcessResult> {
  console.log(`\n📝 Processing candidate ${candidate.id}: ${candidate.name}${options.force ? ' [FORCE MODE]' : ''}`);
  const result: ProcessResult = {
    candidateId: candidate.id,
    candidateName: candidate.name,
    roast: { success: true },
    policies: { success: true },
    portrait: { success: true },
  };

  let updatedCandidateData: Candidate | null = candidate;

  // 1. Generate roast/commentary if requested
  if (options.generateRoast) {
    result.roast.success = false;
    try {
      console.log(`  -> Generating roast for ${candidate.name}...`);
      const existingRoast = await db.query.aiRoasts.findFirst({ 
        where: eq(aiRoasts.candidateId, candidate.id)
      });
      
      if (!options.force && existingRoast) {
        console.log(`  ⏩ ${candidate.name} already has a roast, skipping...`);
        result.roast.success = true;
        result.roast.skipped = true;
      } else {
        const roastContent = await xaiService.generateCandidateRoast(candidate);
        if (roastContent) {
          if (existingRoast) {
            // Update existing roast
            await db.update(aiRoasts)
              .set({ 
                  content: roastContent.substring(0, 500),
                  fullContent: roastContent,
                  generatedAt: new Date() // Update timestamp
              })
              .where(eq(aiRoasts.id, existingRoast.id));
            console.log(`  ✅ Updated roast for ${candidate.name} (forced)`);
            result.roast.updated = true;
          } else {
            // Insert new roast
            await db.insert(aiRoasts).values({
              candidateId: candidate.id,
              content: roastContent.substring(0, 500),
              fullContent: roastContent,
              isSpicy: false
            });
            console.log(`  ✅ Generated new roast for ${candidate.name}`);
          }
          result.roast.success = true;
        } else {
          result.roast.error = `Failed to generate roast content`;
          console.log(`  ❌ ${result.roast.error} for ${candidate.name}`);
        }
      }
    } catch (roastError) {
      result.roast.error = roastError instanceof Error ? roastError.message : String(roastError);
      console.error(`  ❌ Error generating roast for ${candidate.name}:`, result.roast.error);
    }
  }

  // 2. Generate policies if requested
  if (options.generatePolicies) {
    result.policies.success = false;
    try {
      console.log(`  -> Generating policies for ${candidate.name}...`);
      if (!options.force && candidate.keyPolicies && candidate.keyPolicies.length > 0) {
        console.log(`  ⏩ ${candidate.name} already has policies, skipping...`);
        result.policies.success = true;
        result.policies.skipped = true;
      } else {
        const seat = await storage.getElectoralSeatById(candidate.electoralSeatId);
        if (!seat) {
            result.policies.error = `Electoral seat not found for candidate ${candidate.id}`;
            console.error(`  ❌ ${result.policies.error}`);
        } else {
          let policies: string[] = [];
          try {
            const perplexityService = (await import("../services/perplexityService")).default;
            console.log(`  -> Getting raw data from Perplexity for ${candidate.name}...`);
            const rawData = await perplexityService.getCandidateRawData(candidate, seat.name);
            console.log(`  -> Generating policies with Perplexity data for ${candidate.name}`);
            policies = await xaiService.generateCandidatePolicies(candidate, rawData);
          } catch (perplexityError) {
            console.warn(`  ⚠️ Error with Perplexity for ${candidate.name}, falling back to xAI only:`, perplexityError);
            policies = await xaiService.generateCandidatePolicies(candidate);
          }
          
          if (policies && policies.length > 0) {
            const updated = await storage.updateCandidatePolicies(candidate.id, policies);
            if (updated) {
              console.log(`  ✅ ${options.force && candidate.keyPolicies && candidate.keyPolicies.length > 0 ? 'Updated' : 'Generated'} policies for ${candidate.name}:`, policies);
              result.policies.success = true;
              updatedCandidateData = updated;
            } else {
              result.policies.error = `Failed to update policies in storage`;
              console.error(`  ❌ ${result.policies.error} for ${candidate.name}`);
            }
          } else {
            result.policies.error = `No policies generated by AI service`;
            console.error(`  ❌ ${result.policies.error} for ${candidate.name}`);
          }
        }
      }
    } catch (policyError) {
      result.policies.error = policyError instanceof Error ? policyError.message : String(policyError);
      console.error(`  ❌ Error generating policies for ${candidate.name}:`, result.policies.error);
    }
  }

  // 3. Generate portrait/caricature if requested
  if (options.generatePortrait) {
    result.portrait.success = false;
    try {
      console.log(`  -> Generating portrait for ${candidate.name}...`);
      const candidateForPortrait = updatedCandidateData || candidate;
      if (!options.force && candidateForPortrait.imageUrl) {
        console.log(`  ⏩ ${candidate.name} already has an image, skipping...`);
        result.portrait.success = true;
        result.portrait.skipped = true;
      } else {
        const imageData = await xaiService.generateCaricatureImage(candidateForPortrait);
        if (imageData) {
          await storage.updateCandidateImage(candidate.id, imageData);
          console.log(`  ✅ ${options.force && candidateForPortrait.imageUrl ? 'Updated' : 'Generated'} portrait for ${candidate.name}`);
          result.portrait.success = true;
        } else {
          result.portrait.error = `Failed to generate portrait image data`;
          console.log(`  ❌ ${result.portrait.error} for ${candidate.name}`);
        }
      }
    } catch (portraitError) {
      result.portrait.error = portraitError instanceof Error ? portraitError.message : String(portraitError);
      console.error(`  ❌ Error generating portrait for ${candidate.name}:`, result.portrait.error);
    }
  }

  return result;
}


/**
 * Generate comprehensive content for candidates in parallel batches.
 * @param options Flags indicating which content types to generate, whether to force, and optional limit.
 */
async function generateCandidateContentInBatches(
  options: { 
    generateRoast: boolean; 
    generatePolicies: boolean; 
    generatePortrait: boolean; 
    limit?: number;
    force: boolean; // Add force option here
  }
) {
  try {
    console.log('🚀 Starting batched candidate content generation...');
    console.log(`Batch size: ${BATCH_SIZE}, Delay between batches: ${DELAY_BETWEEN_BATCHES_MS}ms`);
    console.log(`Options: Roasts=${options.generateRoast}, Policies=${options.generatePolicies}, Portraits=${options.generatePortrait}, Limit=${options.limit ?? 'None'}, Force=${options.force}`);

    // Get all candidates
    let allCandidates = await storage.getCandidates();
    console.log(`Found ${allCandidates.length} total candidates in the database`);

    // Apply limit if specified
    if (options.limit && options.limit > 0 && options.limit < allCandidates.length) {
      allCandidates = allCandidates.slice(0, options.limit);
      console.log(`Processing limited to ${allCandidates.length} candidates`);
    }
    
    // Track statistics
    const stats = {
      totalProcessed: 0,
      roasts: { success: 0, skipped: 0, updated: 0, failed: 0 },
      policies: { success: 0, skipped: 0, failed: 0 },
      portraits: { success: 0, skipped: 0, failed: 0 },
    };

    // Process candidates in batches
    for (let i = 0; i < allCandidates.length; i += BATCH_SIZE) {
      const batch = allCandidates.slice(i, i + BATCH_SIZE);
      console.log(`\n--- Processing Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allCandidates.length / BATCH_SIZE)} (Candidates ${i + 1}-${Math.min(i + BATCH_SIZE, allCandidates.length)}) ---`);

      const batchPromises = batch.map(candidate => 
        processSingleCandidate(candidate, {
          generateRoast: options.generateRoast,
          generatePolicies: options.generatePolicies,
          generatePortrait: options.generatePortrait,
          force: options.force // Pass force option down
        })
      );

      // Wait for all promises in the batch to settle
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results from the batch
      batchResults.forEach((settledResult, index) => {
        const candidateName = batch[index].name; // Get name for logging
        stats.totalProcessed++;
        if (settledResult.status === 'fulfilled') {
          const result = settledResult.value;
          // Aggregate stats based on the result object
          if (options.generateRoast) { 
            if (result.roast.success) stats.roasts.success++;
            if (result.roast.skipped) stats.roasts.skipped++;
            if (result.roast.updated) stats.roasts.updated++;
            if (!result.roast.success && !result.roast.skipped) stats.roasts.failed++;
          }
          if (options.generatePolicies) {
            if (result.policies.success) stats.policies.success++;
            if (result.policies.skipped) stats.policies.skipped++;
            if (!result.policies.success && !result.policies.skipped) stats.policies.failed++;
          }
          if (options.generatePortrait) {
            if (result.portrait.success) stats.portraits.success++;
            if (result.portrait.skipped) stats.portraits.skipped++;
            if (!result.portrait.success && !result.portrait.skipped) stats.portraits.failed++;
          }
        } else {
          // Promise rejected - means an unexpected error in processSingleCandidate itself
          console.error(`❌ Unexpected error processing candidate ${candidateName}:`, settledResult.reason);
          // Increment fail counts for all attempted types in this candidate
          if (options.generateRoast) stats.roasts.failed++;
          if (options.generatePolicies) stats.policies.failed++;
          if (options.generatePortrait) stats.portraits.failed++;
        }
      });

      // Delay before the next batch (if not the last batch)
      if (i + BATCH_SIZE < allCandidates.length) {
        console.log(`\n--- Batch Complete. Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s before next batch... ---`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      } else {
         console.log(`\n--- Final Batch Complete. ---`);
      }
    }
    
    // Print summary
    console.log('\n====== BATCHED CONTENT GENERATION SUMMARY ======');
    console.log(`Total candidates processed: ${stats.totalProcessed} / ${allCandidates.length}`);
    if (options.generateRoast) console.log(`Roasts: ${stats.roasts.success} generated, ${stats.roasts.updated} updated, ${stats.roasts.skipped} skipped, ${stats.roasts.failed} failed`);
    if (options.generatePolicies) console.log(`Policies: ${stats.policies.success} generated/updated, ${stats.policies.skipped} skipped, ${stats.policies.failed} failed`);
    if (options.generatePortrait) console.log(`Portraits: ${stats.portraits.success} generated/updated, ${stats.portraits.skipped} skipped, ${stats.portraits.failed} failed`);
    
    return {
      success: true,
      statistics: stats
    };
  } catch (error) {
    console.error('Error in batched content generation process:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Keep the direct execution part for the original script (if needed for simple 'generate all')
// Or remove/comment it out if runGenerateCandidateContent.ts is the sole entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running generateCandidateContent.ts directly (generating all content)...");
  // Note: Running directly does not support --force, use runGenerateCandidateContent.ts for that
  generateCandidateContentInBatches({ 
    generateRoast: true, 
    generatePolicies: true, 
    generatePortrait: true,
    force: false // Default to false when run directly
  })
    .then(result => {
      if (result.success) {
        console.log('✅ Content generation completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Content generation failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('❌ Unexpected error during content generation:', err);
      process.exit(1);
    });
}

// Export the new batch generation function
export { generateCandidateContentInBatches };
// Export the single candidate processor if needed elsewhere (optional)
// export { processSingleCandidate }; 