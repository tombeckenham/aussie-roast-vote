/**
 * Script to import manually collected MP data from JSON file
 * This is a fallback option when the CSV data is not available
 */

import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { electoralSeats } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ManualMP {
  id: number;
  name: string;
  electorate: string;
  party: string;
  photoUrl: string;
  bio: string;
}

async function importManualMPData() {
  console.log('🔍 Importing manual MP data to electoral seats...');
  
  try {
    // Read the JSON file
    const jsonFilePath = path.join(process.cwd(), 'server/data/mp_data.json');
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ JSON file not found at ${jsonFilePath}`);
      return { success: false, error: 'JSON file not found' };
    }
    
    const fileContent = fs.readFileSync(jsonFilePath, { encoding: 'utf-8' });
    const mps = JSON.parse(fileContent) as ManualMP[];
    
    console.log(`Found ${mps.length} MPs in the JSON file`);
    
    // Get all electoral seats
    const allSeats = await db.select().from(electoralSeats);
    console.log(`Found ${allSeats.length} electoral seats in the database`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    // Process each MP
    for (const mp of mps) {
      try {
        // Find the matching electoral seat by name
        // First try exact match
        let seat = allSeats.find(s => 
          s.name.toLowerCase() === mp.electorate.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!seat) {
          seat = allSeats.find(s => 
            mp.electorate.toLowerCase().includes(s.name.toLowerCase()) || 
            s.name.toLowerCase().includes(mp.electorate.toLowerCase())
          );
        }
        
        if (seat) {
          // Update the electoral seat with MP info
          await db.update(electoralSeats)
            .set({
              currentMp: mp.name,
              currentParty: mp.party,
              currentMpPhotoUrl: mp.photoUrl || null,
              description: seat.description || mp.bio // Use bio as description if no description exists
            })
            .where(eq(electoralSeats.id, seat.id));
          
          console.log(`✅ Updated seat ${seat.name} with MP ${mp.name} (${mp.party})`);
          updatedCount++;
        } else {
          console.log(`⚠️ Could not find seat for MP ${mp.name}, Electorate: ${mp.electorate}`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating seat for MP ${mp.name}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    console.log('====== IMPORT SUMMARY ======');
    console.log(`Total MPs in JSON: ${mps.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Not found: ${notFoundCount}`);
    
    return { 
      success: true, 
      imported: updatedCount,
      notFound: notFoundCount
    };
  } catch (error) {
    console.error('❌ Error importing MP data:', error instanceof Error ? error.message : String(error));
    return { 
      success: false,  
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run the script
async function main() {
  try {
    console.log('🚀 Starting manual MP data import process...');
    await importManualMPData();
    console.log('✅ Manual MP data import completed!');
  } catch (error) {
    console.error('❌ Error in main execution:', error);
    process.exit(1);
  }
}

// Run the script when this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
}

export { importManualMPData };