/**
 * This script sets up the database by importing all necessary data:
 * 1. AEC electoral divisions
 * 2. Localities (suburbs and postcodes)
 * 3. Candidates from the elections data
 * 4. Current MPs data (if available)
 * 
 * Run this script after setting up the database schema.
 */

import { importAECDivisions } from './importAECDivisions';
import { importLocalities } from './importLocalities';
import { importCandidates } from './importCandidates';
import { importCurrentMPs } from './importCurrentMPs';
import { importManualMPData } from './importManualMPData';
import { candidates, electoralSeats, localities } from '@shared/schema';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Force console output to show in real-time
process.env.FORCE_COLOR = '1';

async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup process...');
    
    // Check for existing data
    console.log('🔍 Checking current database state...');
    
    const electoralSeatsCount = await db.select({ count: sql`count(*)` }).from(electoralSeats);
    const localitiesCount = await db.select({ count: sql`count(*)` }).from(localities);
    const candidatesCount = await db.select({ count: sql`count(*)` }).from(candidates);
    
    const seatsCount = parseInt(electoralSeatsCount[0].count.toString());
    const locCount = parseInt(localitiesCount[0].count.toString());
    const candCount = parseInt(candidatesCount[0].count.toString());
    
    console.log(`📊 Current database state:
- Electoral seats: ${seatsCount}
- Localities: ${locCount}
- Candidates: ${candCount}`);
    
    // STEP 1: Import electoral divisions
    console.log('\n📋 STEP 1: Importing electoral divisions...');
    const divisionResult = await importAECDivisions();
    console.log(`✅ Electoral divisions import complete. Imported: ${divisionResult.imported}, Skipped: ${divisionResult.skipped}`);
    
    // STEP 2: Import localities
    console.log('\n📋 STEP 2: Importing localities (postcodes and suburbs)...');
    const localitiesResult = await importLocalities();
    if (!localitiesResult.success) {
      throw new Error(`Localities import failed: ${localitiesResult.error}`);
    }
    console.log('✅ Localities import complete.');
    
    // STEP 3: Import candidates
    console.log('\n📋 STEP 3: Importing candidates...');
    const candidatesResult = await importCandidates();
    console.log(`✅ Candidates import complete. Imported: ${candidatesResult.imported}, Skipped: ${candidatesResult.skipped}`);
    
    // STEP 4: Import MP data (if available)
    console.log('\n📋 STEP 4: Importing current MPs data...');
    const mpsCsvPath = path.join(process.cwd(), 'server/data/current_mps.csv');
    if (fs.existsSync(mpsCsvPath)) {
      try {
        await importCurrentMPs();
        console.log('✅ Current MPs data imported successfully');
      } catch (mpError) {
        console.warn('⚠️ Error importing MPs from CSV:', mpError instanceof Error ? mpError.message : String(mpError));
      }
    } else {
      console.log('ℹ️ Current MPs data file not found, using alternative sources');
      
      // Use our manually created MP data as fallback
      const mpDataPath = path.join(process.cwd(), 'server/data/mp_data.json');
      if (fs.existsSync(mpDataPath)) {
        try {
          console.log('🔄 Using manual MP data file as fallback');
          const manualMpResult = await importManualMPData();
          
          if (manualMpResult.success) {
            console.log(`✅ Manual MP data processed. Imported: ${manualMpResult.imported}, Not found: ${manualMpResult.notFound}`);
          } else {
            console.warn(`⚠️ Error importing manual MP data: ${manualMpResult.error}`);
          }
        } catch (jsonError) {
          console.warn('⚠️ Error processing manual MP data:', jsonError instanceof Error ? jsonError.message : String(jsonError));
        }
      } else {
        console.log('ℹ️ No MP data sources available, skipping this step');
      }
    }
    
    // Final database check
    const finalElectoralSeatsCount = await db.select({ count: sql`count(*)` }).from(electoralSeats);
    const finalLocalitiesCount = await db.select({ count: sql`count(*)` }).from(localities);
    const finalCandidatesCount = await db.select({ count: sql`count(*)` }).from(candidates);
    
    const finalSeatsCount = parseInt(finalElectoralSeatsCount[0].count.toString());
    const finalLocCount = parseInt(finalLocalitiesCount[0].count.toString());
    const finalCandCount = parseInt(finalCandidatesCount[0].count.toString());
    
    console.log(`\n📊 Final database state:
- Electoral seats: ${finalSeatsCount} (${finalSeatsCount - seatsCount} new)
- Localities: ${finalLocCount} (${finalLocCount - locCount} new)
- Candidates: ${finalCandCount} (${finalCandCount - candCount} new)`);
    
    console.log('\n🎉 Database setup completed successfully!');
    
    return {
      success: true,
      initialState: {
        electoralSeats: seatsCount,
        localities: locCount,
        candidates: candCount
      },
      finalState: {
        electoralSeats: finalSeatsCount,
        localities: finalLocCount,
        candidates: finalCandCount
      }
    };
  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then((result) => {
      if (result.success) {
        console.log('🏁 Setup script completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Setup script failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error in setup script:', error);
      process.exit(1);
    });
}

export { setupDatabase };