/**
 * Script to generate policy positions for all candidates
 * Uses xAI to create realistic policy statements for each candidate
 */

import { db } from "../db";
import { candidates } from "@shared/schema";
import xaiService from "../services/xaiService";
import { storage } from "../storage";

/**
 * Generate policy positions for all candidates
 */
async function generateCandidatePolicies() {
  try {
    console.log("Generating policy positions for all candidates...");
    
    // Get all candidates
    const allCandidates = await storage.getCandidates();
    console.log(`Found ${allCandidates.length} candidates`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each candidate
    for (const candidate of allCandidates) {
      try {
        console.log(`Processing policies for ${candidate.name}...`);
        
        // Skip if candidate already has policies
        if (candidate.keyPolicies && candidate.keyPolicies.length > 0) {
          console.log(`${candidate.name} already has policies, skipping...`);
          continue;
        }
        
        // Generate policies using xAI
        const policies = await xaiService.generateCandidatePolicies(candidate);
        
        if (policies && policies.length > 0) {
          // Update candidate with generated policies
          const updatedCandidate = await storage.updateCandidatePolicies(candidate.id, policies);
          
          if (updatedCandidate) {
            console.log(`Successfully updated policies for ${candidate.name}:`, policies);
            successCount++;
          } else {
            console.error(`Failed to update policies for ${candidate.name}`);
            errorCount++;
          }
        } else {
          console.error(`No policies generated for ${candidate.name}`);
          errorCount++;
        }
        
        // Rate limiting - sleep for a short period between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (candidateError) {
        console.error(`Error processing candidate ${candidate.name}:`, candidateError);
        errorCount++;
      }
    }
    
    console.log(`Policy generation complete.`);
    console.log(`Success: ${successCount}, Errors: ${errorCount}`);
    
    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error("Error generating candidate policies:", error);
    throw error;
  }
}

// Script can be run directly using tsx
// This is for ES modules compatibility
const isDirectlyExecuted = import.meta.url === `file://${process.argv[1]}`;

if (isDirectlyExecuted) {
  generateCandidatePolicies()
    .then(() => {
      console.log("Policy generation script completed");
      process.exit(0);
    })
    .catch(error => {
      console.error("Policy generation script failed:", error);
      process.exit(1);
    });
}

export default generateCandidatePolicies;