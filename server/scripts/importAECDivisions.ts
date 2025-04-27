/**
 * Script to import all AEC electoral divisions into the database
 * This ensures we have all 150 federal electoral divisions with proper slugs and metadata
 */

import { db } from "../db";
import { electoralSeats } from "@shared/schema";
import {
  loadDivisionDetails,
  initializeAECDataService,
} from "../services/aecDataService";
import { fileURLToPath } from "url";

// Force console output to show in real-time
process.env.FORCE_COLOR = "1";

async function importAECDivisions() {
  try {
    console.log(
      "🔄 Starting import of AEC divisions into electoral_seats table...",
    );

    // Initialize AEC data service to load division data
    console.log("📂 Loading AEC division details...");
    initializeAECDataService();

    // Load all division details from AEC data
    const divisions = loadDivisionDetails();
    console.log(`✅ Loaded ${divisions.length} divisions from AEC data files`);

    // Check if any divisions already exist in the database
    console.log("🔍 Checking for existing seats in database...");
    const existingSeats = await db
      .select({ name: electoralSeats.name })
      .from(electoralSeats);
    const existingSeatNames = new Set(
      existingSeats.map((seat) => seat.name.toUpperCase()),
    );

    console.log(
      `ℹ️ Found ${existingSeatNames.size} existing electoral seats in database`,
    );

    // Track import metrics
    let imported = 0;
    let skipped = 0;
    const errors = [];

    // Import each division as an electoral seat
    console.log("🚀 Starting import process...");

    for (const division of divisions) {
      try {
        // Skip if this division already exists in the database
        if (existingSeatNames.has(division.Name.toUpperCase())) {
          console.log(`⏩ Skipping existing seat: ${division.Name}`);
          skipped++;
          continue;
        }

        // Clean and transform division data
        const description = `Electoral division of ${division.Name} in ${division.State}. ${division.NameDerivation || ""}`;

        // Create slug from division name
        const slug = division.Name.toLowerCase()
          .replace(/[^\w\s-]/g, "") // Remove special characters
          .replace(/\s+/g, "-") // Replace spaces with hyphens
          .replace(/-+/g, "-"); // Remove consecutive hyphens

        // Prepare key issues based on location description
        const keyIssues = [];
        const locationDesc = division.LocationDescription || "";

        if (locationDesc.includes("rural")) {
          keyIssues.push("Agriculture");
          keyIssues.push("Regional development");
        }
        if (
          locationDesc.includes("urban") ||
          locationDesc.includes("metropolitan")
        ) {
          keyIssues.push("Urban planning");
          keyIssues.push("Infrastructure");
        }
        if (locationDesc.includes("coastal")) {
          keyIssues.push("Marine conservation");
          keyIssues.push("Tourism");
        }

        // Insert the new electoral seat
        await db.insert(electoralSeats).values({
          name: division.Name,
          slug: slug,
          state: division.State,
          description: description.substring(0, 500), // Ensure it doesn't exceed column length
          isMarginial: false,
          currentMp: null,
          currentParty: null,
          keyIssues: keyIssues,
          previousResults: {},
          position: null,
        });

        console.log(`✅ Imported: ${division.Name} (${division.State})`);
        imported++;
      } catch (error) {
        console.error(
          `❌ Error importing division ${division.Name}:`,
          error.message,
        );
        errors.push(`${division.Name}: ${error.message}`);
      }
    }

    // Display summary
    console.log("\n📊 Import summary:");
    console.log(`- Total divisions in AEC data: ${divisions.length}`);
    console.log(`- Already in database: ${skipped}`);
    console.log(`- Successfully imported: ${imported}`);
    console.log(`- Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n❌ Error details:");
      errors.forEach((err) => console.log(`- ${err}`));
    }

    console.log("\n✅ Import completed successfully");
    return {
      totalDivisions: divisions.length,
      skipped,
      imported,
      errors,
    };
  } catch (error) {
    console.error("❌ Critical error during import:", error);
    throw error;
  }
}

// Run the import immediately
if (import.meta.url === `file://${process.argv[1]}`) {
  importAECDivisions()
    .then(() => {
      console.log("🎉 AEC divisions import script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error in AEC divisions import script:", error);
      process.exit(1);
    });
}
export { importAECDivisions };
