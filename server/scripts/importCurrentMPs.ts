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

// Updated to match the actual CSV format we discovered
interface MP {
  Name: string;
  Title: string;
  Constituency: string;
  State: string;
  Photo: string;
}

// Set of common party abbreviations found in Title prefixes
const PARTY_MAP: Record<string, string> = {
  'ALP': 'Australian Labor Party',
  'LP': 'Liberal Party of Australia',
  'LNP': 'Liberal National Party of Queensland',
  'NP': 'National Party of Australia', 
  'AG': 'Australian Greens',
  'PHON': 'Pauline Hanson\'s One Nation',
  'IND': 'Independent',
  'CA': 'Centre Alliance',
  'KAP': 'Katter\'s Australian Party',
  'UAP': 'United Australia Party',
  'JLN': 'Jacqui Lambie Network'
};

// Map of MP names to their known parties for those we can confidently identify
const MP_PARTY_MAP: Record<string, string> = {
  'Anthony Albanese': 'Australian Labor Party',
  'Peter Dutton': 'Liberal Party of Australia',
  'Adam Bandt': 'Australian Greens',
  'Zali Steggall': 'Independent',
  'David Smith': 'Australian Labor Party',
  'Alicia Payne': 'Australian Labor Party',
  'Tanya Plibersek': 'Australian Labor Party',
  'Andrew Leigh': 'Australian Labor Party',
  'Jason Falinski': 'Liberal Party of Australia',
  'Sophie Scamps': 'Independent',
  'Allegra Spender': 'Independent',
  'Monique Ryan': 'Independent',
  'Kate Chaney': 'Independent',
  'Max Chandler-Mather': 'Australian Greens',
  'Elizabeth Watson-Brown': 'Australian Greens',
  'Stephen Bates': 'Australian Greens',
  'Jim Chalmers': 'Australian Labor Party',
  'Mark Dreyfus': 'Australian Labor Party',
  'Josh Frydenberg': 'Liberal Party of Australia',
  'Barnaby Joyce': 'National Party of Australia',
  'Pauline Hanson': 'Pauline Hanson\'s One Nation',
  'Andrew Willcox': 'Liberal National Party of Queensland',
  'Andrew Wilkie': 'Independent',
  'Bob Katter': 'Katter\'s Australian Party',
  'Rebekha Sharkie': 'Centre Alliance'
};

// Map of state acronyms to full names
const STATE_MAP: Record<string, string> = {
  'NSW': 'New South Wales',
  'VIC': 'Victoria',
  'QLD': 'Queensland',
  'SA': 'South Australia',
  'WA': 'Western Australia',
  'TAS': 'Tasmania',
  'ACT': 'Australian Capital Territory',
  'NT': 'Northern Territory'
};

async function importCurrentMPs() {
  console.log('🔍 Importing current MP data to electoral seats...');
  
  try {
    // Read the CSV file
    const csvFilePath = path.join(process.cwd(), 'server/data/current_mps.csv');
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ CSV file not found at ${csvFilePath}`);
      return { success: false, error: 'CSV file not found' };
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
        // Clean up the MP name (remove titles and honorifics)
        const cleanName = mp.Name.replace(/^(Hon |Dr |Mr |Mrs |Ms |Miss |Professor |Senator )/, '');
        
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
          // Determine the party - first check our known list
          let party = MP_PARTY_MAP[cleanName] || MP_PARTY_MAP[mp.Name] || derivePartyFromTitle(mp.Title);
          
          // Update the electoral seat with MP info
          await db.update(electoralSeats)
            .set({
              currentMp: cleanName,
              currentParty: party,
              currentMpPhotoUrl: mp.Photo ? mp.Photo : null
            })
            .where(eq(electoralSeats.id, seat.id));
          
          console.log(`✅ Updated seat ${seat.name} with MP ${cleanName} (${party})`);
          updatedCount++;
        } else {
          console.log(`⚠️ Could not find seat for MP ${mp.Name}, Constituency: ${mp.Constituency}`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating seat for MP ${mp.Name}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    console.log('====== IMPORT SUMMARY ======');
    console.log(`Total MPs in CSV: ${records.length}`);
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

/**
 * Try to derive party affiliation from the MP's title
 * Often titles contain party abbreviations
 */
function derivePartyFromTitle(title: string): string {
  // Check for common party abbreviations in the title
  for (const [abbr, party] of Object.entries(PARTY_MAP)) {
    if (title.includes(`(${abbr})`)) {
      return party;
    }
  }
  
  // If we can't determine the party, return Unknown
  return 'Unknown';
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