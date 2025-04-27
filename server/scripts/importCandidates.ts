import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import slugify from 'slugify';
import { db } from '../db';
import { 
  electoralSeats, insertElectoralSeatSchema, 
  parties, insertPartySchema,
  candidates, insertCandidateSchema
} from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

interface CandidateCSV {
  state: string;
  division: string;
  ballotPosition: string;
  surname: string;
  ballotGivenName: string;
  partyBallotName: string;
}

async function importCandidates() {
  try {
    console.log('Starting to import candidates from CSV...');
    
    // Track import metrics
    let imported = 0;
    let skipped = 0;
    const errors = [];
    
    // Read and parse the CSV file
    const filePath = path.resolve('house-candidates.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    }) as CandidateCSV[];
    
    console.log(`Parsed ${records.length} records from CSV.`);

    // Create a map to track created electoralSeats and parties
    const createdSeats = new Map<string, number>();
    const createdParties = new Map<string, number>();
    
    // Process each record
    for (const record of records) {
      try {
        // Create or get electoral seat
        const seatSlug = slugify(record.division, { lower: true });
        let seatId = createdSeats.get(seatSlug);
        
        if (!seatId) {
          // Check if it already exists in the database
          const existingSeat = await db
            .select()
            .from(electoralSeats)
            .where(eq(electoralSeats.slug, seatSlug))
            .limit(1);
            
          if (existingSeat.length > 0) {
            seatId = existingSeat[0].id;
          } else {
            // Create a new electoral seat
            const seatData = {
              name: record.division,
              state: record.state,
              slug: seatSlug,
              description: `Electoral division of ${record.division} in ${record.state}.`,
              isMarginial: false,
              keyIssues: [],
              previousResults: {},
              position: { x: 0, y: 0 } // Default position, would need proper mapping
            };
            
            const [seat] = await db
              .insert(electoralSeats)
              .values(seatData)
              .returning();
              
            seatId = seat.id;
            console.log(`Created electoral seat: ${record.division}, ${record.state} with ID ${seatId}`);
          }
          
          createdSeats.set(seatSlug, seatId);
        }
        
        // Create or get party (if not Independent)
        let partyId: number | null = null;
        if (record.partyBallotName && record.partyBallotName !== 'Independent') {
          let partyKey = record.partyBallotName.toLowerCase();
          partyId = createdParties.get(partyKey);
          
          if (!partyId) {
            // Check if it already exists in the database
            const existingParty = await db
              .select()
              .from(parties)
              .where(eq(parties.name, record.partyBallotName))
              .limit(1);
              
            if (existingParty.length > 0) {
              partyId = existingParty[0].id;
            } else {
              // Create a new party
              const partyData = {
                name: record.partyBallotName,
                shortName: record.partyBallotName
              };
              
              const [party] = await db
                .insert(parties)
                .values(partyData)
                .returning();
                
              partyId = party.id;
              console.log(`Created party: ${record.partyBallotName} with ID ${partyId}`);
            }
            
            createdParties.set(partyKey, partyId);
          }
        }
        
        // Create candidate
        const fullName = `${record.ballotGivenName} ${record.surname}`;
        
        // Check if candidate already exists
        const existingCandidate = await db
          .select()
          .from(candidates)
          .where(
            sql`${candidates.surname} = ${record.surname} AND 
                ${candidates.givenName} = ${record.ballotGivenName} AND 
                ${candidates.electoralSeatId} = ${seatId}`
          )
          .limit(1);
          
        if (existingCandidate.length === 0) {
          // Create new candidate
          const candidateData = {
            surname: record.surname,
            givenName: record.ballotGivenName,
            name: fullName,
            electoralSeatId: seatId,
            partyId: partyId,
            partyBallotName: record.partyBallotName,
            ballotPosition: parseInt(record.ballotPosition, 10),
            isIndependent: record.partyBallotName === 'Independent'
          };
          
          const [candidate] = await db
            .insert(candidates)
            .values(candidateData)
            .returning();
            
          console.log(`Created candidate: ${fullName} (${record.partyBallotName}) for ${record.division}, ${record.state}`);
          imported++;
        } else {
          console.log(`Skipping duplicate candidate: ${fullName} in ${record.division}`);
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing record:`, record, error);
        errors.push(`${record.division} - ${record.surname}: ${error.message}`);
      }
    }
    
    // Display summary
    console.log('\n📊 Import summary:');
    console.log(`- Total candidates in CSV: ${records.length}`);
    console.log(`- Already in database: ${skipped}`);
    console.log(`- Successfully imported: ${imported}`);
    console.log(`- Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Error details:');
      errors.forEach(err => console.log(`- ${err}`));
    }
    
    console.log('\n✅ Import completed successfully');
    
    return {
      totalCandidates: records.length,
      skipped,
      imported,
      errors
    };
  } catch (error) {
    console.error('❌ Error importing candidates:', error);
    throw error;
  }
}

// Execute the import function if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importCandidates()
    .then(() => {
      console.log('Candidate import script finished.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

export { importCandidates };