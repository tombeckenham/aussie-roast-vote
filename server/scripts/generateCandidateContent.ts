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
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { candidates, aiRoasts } from '@shared/schema';

/**
 * Generate comprehensive content for all candidates
 */
async function generateCandidateContent() {
  try {
    console.log('🚀 Starting comprehensive candidate content generation...');
    
    // Get all candidates
    const allCandidates = await storage.getCandidates();
    console.log(`Found ${allCandidates.length} candidates in the database`);
    
    // Track statistics
    const stats = {
      total: allCandidates.length,
      roasts: { success: 0, failed: 0 },
      portraits: { success: 0, failed: 0 },
      policies: { success: 0, failed: 0 }
    };
    
    // Process each candidate
    for (const candidate of allCandidates) {
      console.log(`\n📝 Processing candidate ${candidate.id}: ${candidate.name}`);
      
      // 1. Generate roast/commentary
      try {
        console.log(`Generating roast for ${candidate.name}...`);
        
        // Check if candidate already has a roast
        const existingRoast = await db.select()
          .from(aiRoasts)
          .where(eq(aiRoasts.candidateId, candidate.id))
          .limit(1);
        
        if (existingRoast.length > 0) {
          console.log(`⏩ ${candidate.name} already has a roast, skipping...`);
        } else {
          // Generate a new roast
          const roastContent = await xaiService.generateCandidateRoast(candidate);
          
          if (roastContent) {
            // Store the roast in the database
            await db.insert(aiRoasts).values({
              candidateId: candidate.id,
              content: roastContent.substring(0, 500), // Truncate for preview
              fullContent: roastContent,
              isSpicy: false
            });
            
            console.log(`✅ Generated roast for ${candidate.name}`);
            stats.roasts.success++;
          } else {
            console.log(`❌ Failed to generate roast for ${candidate.name}`);
            stats.roasts.failed++;
          }
        }
      } catch (roastError) {
        console.error(`Error generating roast for ${candidate.name}:`, roastError);
        stats.roasts.failed++;
      }
      
      // 2. Generate policies (moved before portraits)
      try {
        console.log(`Generating policies for ${candidate.name}...`);
        
        // Check if candidate already has policies
        if (candidate.keyPolicies && candidate.keyPolicies.length > 0) {
          console.log(`⏩ ${candidate.name} already has policies, skipping...`);
        } else {
          // Get electoral seat for context
          const seat = await storage.getElectoralSeatById(candidate.electoralSeatId);
          if (!seat) {
            console.error(`Electoral seat not found for candidate ${candidate.id}`);
            stats.policies.failed++;
            continue;
          }
          
          // First try to get Perplexity data
          let policies: string[] = [];
          try {
            // Import perplexity service
            const perplexityService = (await import("../services/perplexityService")).default;
            
            // Get raw data from Perplexity
            console.log(`Getting raw data from Perplexity for ${candidate.name}...`);
            const rawData = await perplexityService.getCandidateRawData(candidate, seat.name);
            
            // Generate policies using the combined approach
            console.log(`Generating policies with Perplexity data for ${candidate.name}`);
            policies = await xaiService.generateCandidatePolicies(candidate, rawData);
          } catch (perplexityError) {
            console.error(`Error with Perplexity for ${candidate.name}, falling back to xAI only:`, perplexityError);
            
            // Fallback to just xAI
            policies = await xaiService.generateCandidatePolicies(candidate);
          }
          
          if (policies && policies.length > 0) {
            // Update candidate with generated policies
            const updatedCandidate = await storage.updateCandidatePolicies(candidate.id, policies);
            
            if (updatedCandidate) {
              console.log(`✅ Generated policies for ${candidate.name}:`, policies);
              stats.policies.success++;
            } else {
              console.error(`❌ Failed to update policies for ${candidate.name}`);
              stats.policies.failed++;
            }
          } else {
            console.error(`❌ No policies generated for ${candidate.name}`);
            stats.policies.failed++;
          }
        }
      } catch (policyError) {
        console.error(`Error generating policies for ${candidate.name}:`, policyError);
        stats.policies.failed++;
      }
      
      // 3. Generate portrait/caricature (moved after policies)
      try {
        console.log(`Generating portrait for ${candidate.name}...`);
        
        // Check if candidate already has an image
        if (candidate.imageUrl) {
          console.log(`⏩ ${candidate.name} already has an image, skipping...`);
        } else {
          // Reload candidate to get updated policies (important for portrait generation)
          const updatedCandidate = await storage.getCandidateById(candidate.id);
          
          // Generate a new caricature using the updated candidate data with policies
          const imageData = await xaiService.generateCaricatureImage(updatedCandidate || candidate);
          
          if (imageData) {
            // Store the image URL in the database
            await storage.updateCandidateImage(candidate.id, imageData);
            
            console.log(`✅ Generated portrait for ${candidate.name}`);
            stats.portraits.success++;
          } else {
            console.log(`❌ Failed to generate portrait for ${candidate.name}`);
            stats.portraits.failed++;
          }
        }
      } catch (portraitError) {
        console.error(`Error generating portrait for ${candidate.name}:`, portraitError);
        stats.portraits.failed++;
      }
      
      // Add delay between candidates to avoid rate limiting
      console.log('Waiting for rate limiting...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Print summary
    console.log('\n====== CONTENT GENERATION SUMMARY ======');
    console.log(`Total candidates processed: ${stats.total}`);
    console.log(`Roasts: ${stats.roasts.success} generated, ${stats.roasts.failed} failed`);
    console.log(`Policies: ${stats.policies.success} generated, ${stats.policies.failed} failed`);
    console.log(`Portraits: ${stats.portraits.success} generated, ${stats.portraits.failed} failed`);
    
    return {
      success: true,
      statistics: stats
    };
  } catch (error) {
    console.error('Error in content generation process:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCandidateContent()
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

export { generateCandidateContent }; 