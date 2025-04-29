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
 *   --force      Force regeneration of content even if it already exists
 *   --help       Show this help message
 */

// Import the new batch processing function
import { generateCandidateContentInBatches } from './generateCandidateContent'; 

// Note: Other imports (db, storage, eq, schemas, xaiService) are no longer 
// needed here as the processing logic is encapsulated in generateCandidateContent.ts

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  // Determine which content types to generate based on flags or --all
  generateRoast: args.includes('--all') || args.includes('--roasts') || (!args.includes('--portraits') && !args.includes('--policies')),
  generatePolicies: args.includes('--all') || args.includes('--policies') || (!args.includes('--roasts') && !args.includes('--portraits')),
  generatePortrait: args.includes('--all') || args.includes('--portraits') || (!args.includes('--roasts') && !args.includes('--policies')),
  // Parse limit
  limit: args.find(arg => arg.startsWith('--limit='))?.split('=')[1] ? parseInt(args.find(arg => arg.startsWith('--limit='))!.split('=')[1]) : undefined,
  // Parse force flag
  force: args.includes('--force'), 
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
  --all        Generate all content types (roasts, policies, portraits)
  --roasts     Generate only commentaries/roasts
  --policies   Generate only policy statements
  --portraits  Generate only portraits/caricatures
  --limit=N    Process only N candidates (for testing)
  --force      Force regeneration of content even if it already exists
  --help       Show this help message

Examples:
  tsx runGenerateCandidateContent.ts              # Generate all content (default)
  tsx runGenerateCandidateContent.ts --all        # Explicitly generate all content
  tsx runGenerateCandidateContent.ts --roasts --portraits
  tsx runGenerateCandidateContent.ts --limit=5 --policies
  tsx runGenerateCandidateContent.ts --force --all # Force regenerate all content
  `);
  process.exit(0);
}

/**
 * Main function to trigger batched generation based on parsed options
 */
async function runWithOptions() {
  try {
    console.log(`Force regeneration flag: ${options.force}`); // Log the force flag status
    
    // Call the refactored batch generation function with the parsed options
    const result = await generateCandidateContentInBatches({
      generateRoast: options.generateRoast,
      generatePolicies: options.generatePolicies,
      generatePortrait: options.generatePortrait,
      limit: options.limit,
      force: options.force // Pass the force flag
    });
    
    // The generateCandidateContentInBatches function now handles its own summary logging.
    // We just need to handle the overall success/failure exit code here.
    return result; 

  } catch (error) {
    console.error('❌ Top-level error in runner script:', error);
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
      console.log('\n✅ Runner script finished successfully.');
      process.exit(0);
    } else {
      console.error('\n❌ Runner script finished with errors:', result.error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ Unexpected error in runner script execution:', err);
    process.exit(1);
  }); 