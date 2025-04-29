#!/usr/bin/env tsx

/**
 * Runner script for candidate content generation with command line options
 * 
 * Usage:
 *   tsx runGenerateCandidateContent.ts [options]
 * 
 * Options:
 *   --all        Generate all content types (default)
 *   --roasts     Generate only commentaries/roasts
 *   --portraits  Generate only portraits/caricatures
 *   --policies   Generate only policy statements
 *   --limit=N    Process only N candidates (for testing)
 *   --help       Show this help message
 */

import { generateCandidateContent } from './generateCandidateContent';
import { storage } from '../storage';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { aiRoasts, candidates } from '@shared/schema';
import xaiService from '../services/xaiService';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all') || (!args.includes('--roasts') && !args.includes('--portraits') && !args.includes('--policies')),
  roasts: args.includes('--roasts'),
  portraits: args.includes('--portraits'),
  policies: args.includes('--policies'),
  limit: args.find(arg => arg.startsWith('--limit='))?.split('=')[1] ? parseInt(args.find(arg => arg.startsWith('--limit='))!.split('=')[1]) : undefined,
  help: args.includes('--help')
};

// Show help and exit
if (options.help) {
  console.log(`
Candidate Content Generation Tool
================================

Usage:
  tsx runGenerateCandidateContent.ts [options]

Options:
  --all        Generate all content types (default)
  --roasts     Generate only commentaries/roasts
  --portraits  Generate only portraits/caricatures
  --policies   Generate only policy statements
  --limit=N    Process only N candidates (for testing)
  --help       Show this help message

Examples:
  tsx runGenerateCandidateContent.ts --all
  tsx runGenerateCandidateContent.ts --roasts --portraits
  tsx runGenerateCandidateContent.ts --limit=5 --policies
  `);
  process.exit(0);
}

/**
 * Generate specific content types based on command line options
 */
async function runWithOptions() {
  try {
    console.log('🚀 Starting candidate content generation with options:');
    console.log(`Generate all: ${options.all}`);
    console.log(`Generate roasts: ${options.all || options.roasts}`);
    console.log(`Generate policies: ${options.all || options.policies}`);
    console.log(`Generate portraits: ${options.all || options.portraits}`);
    if (options.limit) console.log(`Limit: ${options.limit} candidates`);
    
    // Get candidates
    let allCandidates = await storage.getCandidates();
    console.log(`Found ${allCandidates.length} candidates in the database`);
    
    // Apply limit if specified
    if (options.limit && options.limit > 0 && options.limit < allCandidates.length) {
      allCandidates = allCandidates.slice(0, options.limit);
      console.log(`Limited to ${allCandidates.length} candidates`);
    }
    
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
      
      // 1. Generate roast/commentary if selected
      if (options.all || options.roasts) {
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
      }
      
      // 2. Generate policies if selected (moved before portraits)
      if (options.all || options.policies) {
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
      }
      
      // 3. Generate portrait/caricature if selected (moved after policies)
      if (options.all || options.portraits) {
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
      }
      
      // Add delay between candidates to avoid rate limiting
      console.log('Waiting for rate limiting...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Print summary
    console.log('\n====== CONTENT GENERATION SUMMARY ======');
    console.log(`Total candidates processed: ${stats.total}`);
    
    if (options.all || options.roasts) {
      console.log(`Roasts: ${stats.roasts.success} generated, ${stats.roasts.failed} failed`);
    }
    
    if (options.all || options.policies) {
      console.log(`Policies: ${stats.policies.success} generated, ${stats.policies.failed} failed`);
    }
    
    if (options.all || options.portraits) {
      console.log(`Portraits: ${stats.portraits.success} generated, ${stats.portraits.failed} failed`);
    }
    
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

// Run the script
runWithOptions()
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