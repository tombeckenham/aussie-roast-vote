/**
 * Script to import all localities (suburbs) with postcodes from AEC data
 * This ensures we have complete mapping between postcodes, localities and electoral divisions
 */

import { db } from "../db";
import { localities, InsertLocality } from "@shared/schema";
import * as fs from 'fs';
import * as path from 'path';
import { eq, sql } from "drizzle-orm";

// Key for mapping state codes to full state names
const STATE_CODES: Record<string, string> = {
  'A': 'ACT',
  'N': 'NSW',
  'Q': 'QLD',
  'S': 'SA',
  'T': 'TAS',
  'V': 'VIC',
  'W': 'WA',
  'D': 'NT'
};

async function importLocalities() {
  try {
    console.log('🔄 Starting import of localities into database...');
    
    // Read the AEC postcode data file
    const filePath = path.join('./server/data/aec_postcodes.txt');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`AEC postcodes data file not found at ${filePath}`);
    }
    
    console.log('📂 Reading AEC postcode data file...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
    
    console.log(`✅ Found ${lines.length} entries in AEC postcode data file`);
    
    // Check if any localities already exist in the database
    const existingCount = await db.select({ count: sql`count(*)` }).from(localities);
    const existingLocalities = parseInt(existingCount[0].count.toString());
    
    console.log(`ℹ️ Found ${existingLocalities} existing localities in database`);
    
    if (existingLocalities > 0) {
      // Ask for confirmation if there are existing records
      console.log('⚠️ WARNING: There are already localities in the database.');
      console.log('Would you like to continue and add only new localities?');
      console.log('If you continue, only new unique combinations of postcode, locality, and division will be added.');
      
      // Get list of existing postcode+locality+division combinations
      console.log('🔍 Building list of existing combinations to avoid duplicates...');
      const existing = await db.select({
        key: sql`CONCAT(${localities.postcode}, '|', ${localities.locality}, '|', ${localities.divisionName})`
      }).from(localities);
      
      const existingKeys = new Set(existing.map(e => e.key));
      console.log(`📊 Found ${existingKeys.size} unique existing combinations`);
      
      // Process the localities 
      console.log('🚀 Starting import of new localities...');
      
      let totalProcessed = 0;
      let imported = 0;
      let skipped = 0;
      const batchSize = 500;
      let batch: InsertLocality[] = [];
      
      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;
        
        // Parse the line using the AEC format: state;postcode;locality;division
        const parts = line.split(';');
        if (parts.length < 4) continue;
        
        const stateCode = parts[0].trim();
        const postcode = parts[1].trim();
        const locality = parts[2].trim(); 
        const divisionName = parts[3].trim();
        
        // Skip if missing essential data
        if (!stateCode || !postcode || !locality || !divisionName) continue;
        
        // Get full state name
        const state = STATE_CODES[stateCode] || stateCode;
        
        // Create a unique key for this combination
        const key = `${postcode}|${locality}|${divisionName}`;
        
        // Skip if this combination already exists
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        
        // Add to batch
        batch.push({
          postcode,
          locality,
          state,
          stateCode,
          divisionName
        });
        
        // When batch is full, insert and reset
        if (batch.length >= batchSize) {
          await db.insert(localities).values(batch);
          imported += batch.length;
          totalProcessed += batch.length;
          console.log(`✅ Imported ${totalProcessed} localities (${skipped} skipped)`);
          batch = [];
        }
      }
      
      // Insert any remaining items in the last batch
      if (batch.length > 0) {
        await db.insert(localities).values(batch);
        imported += batch.length;
        totalProcessed += batch.length;
        console.log(`✅ Imported ${totalProcessed} localities (${skipped} skipped)`);
      }
      
      // Display summary
      console.log('\n📊 Import summary:');
      console.log(`- Total entries in file: ${lines.length}`);
      console.log(`- Already in database: ${skipped}`);
      console.log(`- Successfully imported: ${imported}`);
      console.log('\n✅ Import completed successfully');
      
    } else {
      // No existing localities - import all at once
      console.log('🚀 Starting import of all localities...');
      
      let imported = 0;
      let skipped = 0;
      const batchSize = 500;
      let batch: InsertLocality[] = [];
      
      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;
        
        // Parse the line using the AEC format: state;postcode;locality;division
        const parts = line.split(';');
        if (parts.length < 4) {
          skipped++;
          continue;
        }
        
        const stateCode = parts[0].trim();
        const postcode = parts[1].trim();
        const locality = parts[2].trim(); 
        const divisionName = parts[3].trim();
        
        // Skip if missing essential data
        if (!stateCode || !postcode || !locality || !divisionName) {
          skipped++;
          continue;
        }
        
        // Get full state name
        const state = STATE_CODES[stateCode] || stateCode;
        
        // Add to batch
        batch.push({
          postcode,
          locality,
          state,
          stateCode,
          divisionName
        });
        
        // When batch is full, insert and reset
        if (batch.length >= batchSize) {
          await db.insert(localities).values(batch);
          imported += batch.length;
          console.log(`✅ Imported ${imported} localities`);
          batch = [];
        }
      }
      
      // Insert any remaining items in the last batch
      if (batch.length > 0) {
        await db.insert(localities).values(batch);
        imported += batch.length;
        console.log(`✅ Imported ${imported} localities`);
      }
      
      // Display summary
      console.log('\n📊 Import summary:');
      console.log(`- Total entries in file: ${lines.length}`);
      console.log(`- Skipped entries: ${skipped}`);
      console.log(`- Successfully imported: ${imported}`);
      console.log('\n✅ Import completed successfully');
    }
    
    return {
      success: true,
      message: 'Import completed successfully'
    };
  } catch (error: any) {
    console.error('❌ Error importing localities:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the import if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importLocalities()
    .then((result) => {
      if (result.success) {
        console.log('🎉 Localities import script completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Localities import failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error in localities import script:', error);
      process.exit(1);
    });
}

export { importLocalities };
