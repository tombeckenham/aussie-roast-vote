import { storage } from '../storage';
import { ElectoralSeat } from '@shared/schema';

// Static mapping of postcodes to electorates
// This is a simplified implementation for demo purposes - in a production app,
// you would use a more complete database or API for this data
const POSTCODE_TO_ELECTORATES: Record<string, string[]> = {
  // Sydney area
  '2000': ['Sydney', 'Wentworth'],
  '2010': ['Sydney'],
  '2011': ['Sydney', 'Wentworth'],
  '2060': ['North Sydney'],
  '2065': ['North Sydney'],
  '2088': ['Warringah'],
  
  // Melbourne area
  '3000': ['Melbourne'],
  '3004': ['Macnamara'],
  '3053': ['Melbourne'],
  '3121': ['Kooyong'],
  '3141': ['Higgins'],
  '3182': ['Macnamara'],
  
  // Brisbane area
  '4000': ['Brisbane'],
  '4006': ['Brisbane'],
  '4101': ['Griffith'],
  '4064': ['Ryan'],
  '4068': ['Ryan'],
  
  // Perth area
  '6000': ['Perth'],
  '6003': ['Perth'],
  '6050': ['Perth'],
  '6100': ['Swan'],
  '6151': ['Tangney'],
  
  // Adelaide area
  '5000': ['Adelaide'],
  '5006': ['Adelaide'],
  '5067': ['Sturt'],
  '5034': ['Boothby'],
  
  // Canberra area
  '2600': ['Canberra'],
  '2602': ['Canberra'],
  '2617': ['Fenner'],
  
  // Hobart area
  '7000': ['Clark'],
  '7004': ['Clark'],
  '7050': ['Franklin'],
  
  // Darwin area
  '0800': ['Solomon'],
  '0810': ['Solomon'],
  '0820': ['Solomon']
};

/**
 * Gets electorate names associated with a postcode using a static lookup table
 */
export async function getElectoratesByPostcode(postcode: string): Promise<string[]> {
  try {
    // Validate postcode format
    if (!/^\d{4}$/.test(postcode)) {
      console.log(`Invalid postcode format: ${postcode}`);
      return [];
    }

    // Look up in our static mapping
    const electorates = POSTCODE_TO_ELECTORATES[postcode] || [];
    console.log(`Postcode ${postcode} maps to electorates: ${electorates.join(', ')}`);
    return electorates;
  } catch (error) {
    console.error('Error in postcode lookup:', error);
    return [];
  }
}

/**
 * Updates the DatabaseStorage searchElectoralSeatsByPostcode method to use real AEC data
 */
export async function searchSeatsByPostcode(postcode: string): Promise<ElectoralSeat[]> {
  try {
    // Get electorate names from AEC API
    const electorateNames = await getElectoratesByPostcode(postcode);
    
    if (electorateNames.length === 0) {
      console.log(`No electorates found for postcode ${postcode}`);
      return [];
    }
    
    // Find matching seats in our database
    const seats: ElectoralSeat[] = [];
    
    for (const name of electorateNames) {
      // Search for seats with matching name 
      // (case insensitive and allowing for slight differences in naming)
      const allSeats = await storage.getElectoralSeats();
      
      const matchingSeats = allSeats.filter(seat => {
        // Direct match
        if (seat.name.toLowerCase() === name.toLowerCase()) return true;
        
        // Match with "electorate" removed
        const cleanName = name.toLowerCase().replace(/\s*electorate\s*/i, '');
        return seat.name.toLowerCase() === cleanName;
      });
      
      seats.push(...matchingSeats);
    }
    
    console.log(`Found ${seats.length} matching seats for postcode ${postcode}`);
    return seats;
  } catch (error) {
    console.error('Error in searchSeatsByPostcode:', error);
    return [];
  }
}

/**
 * This is a placeholder implementation that should eventually be replaced with
 * real mapping data from AEC, Australia Post, or another authoritative source.
 */
export function initializePostcodeMapping() {
  console.log('Postcode mapping service initialized');
}