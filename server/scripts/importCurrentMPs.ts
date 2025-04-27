/**
 * Script to import current Members of Parliament data into electoral seats
 * Uses the CSV file with official MP data to update our database
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../db';
import { electoralSeats } from '@shared/schema';
import { eq, like } from 'drizzle-orm';

interface MP {
  Name: string;
  Title: string;
  Constituency: string;
  State: string;
  Photo: string;
}

async function importCurrentMPs() {
  console.log('🔍 Importing current MP data to electoral seats...');
  
  try {
    // Read the CSV file
    const csvFilePath = path.join(process.cwd(), 'current_mps.csv');
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ CSV file not found at ${csvFilePath}`);
      return;
    }
    
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as MP[];
    
    console.log(`Found ${records.length} MPs in the CSV file`);
    
    // Get all electoral seats
    const allSeats = await db.select().from(electoralSeats);
    console.log(`Found ${allSeats.length} electoral seats in the database`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    // Process each MP
    for (const mp of records) {
      try {
        // Find the matching electoral seat by name
        // Note: Electoral division names in Australia are sometimes slightly different
        // from constituency names, so we need to handle potential mismatches
        
        // First try exact match
        let seat = allSeats.find(s => 
          s.name.toLowerCase() === mp.Constituency.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!seat) {
          seat = allSeats.find(s => 
            mp.Constituency.toLowerCase().includes(s.name.toLowerCase()) || 
            s.name.toLowerCase().includes(mp.Constituency.toLowerCase())
          );
        }
        
        if (seat) {
          // Update the electoral seat with MP info
          await db.update(electoralSeats)
            .set({
              currentMp: mp.Name,
              currentParty: deriveParty(mp.Name), // We don't have party info in the CSV
            })
            .where(eq(electoralSeats.id, seat.id));
          
          console.log(`✅ Updated seat ${seat.name} with MP ${mp.Name}`);
          updatedCount++;
        } else {
          console.log(`⚠️ Could not find seat for MP ${mp.Name}, Constituency: ${mp.Constituency}`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating seat for MP ${mp.Name}:`, error);
      }
    }
    
    console.log('====== IMPORT SUMMARY ======');
    console.log(`Total MPs in CSV: ${records.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Not found: ${notFoundCount}`);
    
  } catch (error) {
    console.error('❌ Error importing MP data:', error);
  }
}

/**
 * Derive party affiliation based on known MPs
 * This is a simplified approach since the CSV doesn't include party information
 */
function deriveParty(name: string): string {
  const knownMPs: Record<string, string> = {
    'Anthony Albanese': 'Australian Labor Party',
    'Peter Dutton': 'Liberal Party of Australia',
    'Adam Bandt': 'Australian Greens',
    'Zali Steggall': 'Independent',
    'David Smith': 'Australian Labor Party',
    'Alicia Payne': 'Australian Labor Party',
    'Tanya Plibersek': 'Australian Labor Party',
    // Add more as needed
  };
  
  return knownMPs[name] || 'Unknown'; // Default to Unknown if not in our list
}

// Run the script
async function main() {
  try {
    console.log('🚀 Starting MP data import process...');
    await importCurrentMPs();
    console.log('✅ MP data import completed!');
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

export { importCurrentMPs };