/**
 * Service for accessing and working with AEC electoral data
 * Provides functions for looking up electorates by postcode, division details, etc.
 */
import fs from 'fs';
import path from 'path';
import { ElectoralSeat } from '@shared/schema';
import { storage } from '../storage';

// Paths to the AEC data files
const POSTCODE_DATA_PATH = './server/data/aec_postcodes.txt';
const DIVISIONS_DATA_PATH = './server/data/aec_divisions.json';

// Interface for the original postcode data structure
interface PostcodeMapping {
  stateCode: string;
  state: string; // Full state name mapped from stateCode
  postcode: string;
  locality: string; // Changed from suburb
  divisionName: string; // Changed from divisionId
}

// Interface for division details based on AEC data
interface DivisionDetail {
  DivisionId: number;
  Name: string;
  State: string;
  Abbreviation: string;
  LocationDescription: string;
  Area: string;
  NameDerivation: string;
  [key: string]: any; // Allow for additional properties
}

// Result structure for postcode lookups
interface ElectorateResult {
  postcode: string;
  divisionName: string;
  state: string;
}

// State code mapping as used in AEC data
const stateCodeMap: { [key: string]: string } = {
  'A': 'ACT',
  'D': 'NT',
  'N': 'NSW',
  'V': 'VIC',
  'S': 'SA',
  'W': 'WA',
  'Q': 'QLD',
  'T': 'TAS',
};

// Cache for the data to avoid repeated parsing
let postcodeMappingsCache: PostcodeMapping[] = [];
let divisionDetailsCache: DivisionDetail[] = [];

/**
 * Parse the postcode data file
 */
export function loadPostcodeMappings(): PostcodeMapping[] {
  if (postcodeMappingsCache.length > 0) {
    return postcodeMappingsCache;
  }

  try {
    console.log(`Reading postcode data from: ${POSTCODE_DATA_PATH}`);
    
    if (!fs.existsSync(POSTCODE_DATA_PATH)) {
      console.error(`Postcode data file not found at: ${POSTCODE_DATA_PATH}`);
      return [];
    }
    
    const textData = fs.readFileSync(POSTCODE_DATA_PATH, 'utf-8');
    const lines = textData.trim().split('\n');
    
    // Check if the first line is the header and skip it
    const header = 'state;postcode;locality;division';
    const dataLines = lines[0].toLowerCase() === header ? lines.slice(1) : lines;

    const mappings: PostcodeMapping[] = dataLines
      .map((line) => {
        // Split by semicolon
        const columns = line.split(';');
        if (columns.length < 4) {
          return null;
        }
        const stateCode = columns[0]?.trim() || ' ';
        const stateFullName = stateCodeMap[stateCode] || 'Unknown'; // Map state code

        return {
          stateCode: stateCode,
          state: stateFullName,
          postcode: columns[1]?.trim() || ' ',
          locality: columns[2]?.trim() || ' ',
          divisionName: columns[3]?.trim() || ' ',
        };
      })
      .filter((mapping): mapping is PostcodeMapping => mapping !== null);

    console.log(`Loaded ${mappings.length} postcode mappings from AEC file.`);
    postcodeMappingsCache = mappings;
    return mappings;
  } catch (error) {
    console.error('Error reading or parsing AEC postcode data:', error);
    return [];
  }
}

/**
 * Load division details from AEC data
 */
export function loadDivisionDetails(): DivisionDetail[] {
  if (divisionDetailsCache.length > 0) {
    return divisionDetailsCache;
  }
  
  try {
    console.log(`Reading division details from: ${DIVISIONS_DATA_PATH}`);
    
    if (!fs.existsSync(DIVISIONS_DATA_PATH)) {
      console.error(`Division details file not found at: ${DIVISIONS_DATA_PATH}`);
      return [];
    }
    
    const jsonData = fs.readFileSync(DIVISIONS_DATA_PATH, 'utf-8');
    const divisions = JSON.parse(jsonData) as DivisionDetail[];
    
    console.log(`Loaded ${divisions.length} division details from AEC file.`);
    divisionDetailsCache = divisions;
    return divisions;
  } catch (error) {
    console.error('Error reading or parsing AEC division data:', error);
    return [];
  }
}

/**
 * Find all division names associated with a postcode
 */
export function findDivisionsByPostcode(postcode: string): string[] {
  const mappings = loadPostcodeMappings();
  const matches = mappings.filter(mapping => mapping.postcode === postcode);
  
  if (matches.length > 0) {
    // Extract unique division names using Array.from instead of spread operator
    const divisionSet = new Set<string>();
    matches.forEach(match => divisionSet.add(match.divisionName));
    const divisions = Array.from(divisionSet);
    
    console.log(`Found divisions for postcode ${postcode}: ${divisions.join(', ')}`);
    return divisions;
  }
  
  console.log(`No divisions found for postcode ${postcode}`);
  return [];
}

/**
 * Find all localities (suburbs) associated with a postcode
 */
export function findLocalitiesByPostcode(postcode: string): string[] {
  const mappings = loadPostcodeMappings();
  const matches = mappings.filter(mapping => mapping.postcode === postcode);
  
  if (matches.length > 0) {
    // Extract unique localities using Array.from instead of spread operator
    const localitySet = new Set<string>();
    matches.forEach(match => {
      if (match.locality && match.locality.trim() !== '') {
        localitySet.add(match.locality);
      }
    });
    return Array.from(localitySet);
  }
  
  return [];
}

/**
 * Find division by postcode (returns first match)
 */
export function findDivisionByPostcode(postcode: string): ElectorateResult | null {
  const mappings = loadPostcodeMappings();
  const match = mappings.find(m => m.postcode === postcode);

  if (match) {
    console.log(`Found match for postcode ${postcode}: Division ${match.divisionName} in ${match.state}`);
    return {
      postcode,
      divisionName: match.divisionName,
      state: match.state
    };
  }
  
  console.log(`No division found for postcode ${postcode}`);
  return null;
}

/**
 * Get details for a specific division by name
 */
export function getDivisionDetails(divisionName: string): DivisionDetail | null {
  const divisions = loadDivisionDetails();
  const normalizedName = divisionName.trim().toLowerCase();
  
  const division = divisions.find(d => d.Name?.trim().toLowerCase() === normalizedName);
  if (division) {
    return division;
  }
  
  return null;
}

/**
 * Get division details by name (direct function from example)
 */
export function getDivisionDetailsByName(name: string): DivisionDetail | null {
  const divisions = loadDivisionDetails();
  const normalizedName = name.trim().toLowerCase();
  
  const division = divisions.find(d => d.Name?.trim().toLowerCase() === normalizedName);
  if (!division) {
    console.log(`Division with name "${name}" not found.`);
    return null;
  }
  
  return division;
}

/**
 * Enhanced function to find electoral seats by postcode that uses the AEC data
 * This replaces the previous version in postcodeService.ts
 */
export async function findElectoralSeatsByPostcode(postcode: string): Promise<ElectoralSeat[]> {
  try {
    // Get division names for this postcode
    const divisionNames = findDivisionsByPostcode(postcode);
    
    if (divisionNames.length === 0) {
      console.log(`No electoral divisions found for postcode ${postcode}`);
      return [];
    }
    
    // Get all seats from the database
    const allSeats = await storage.getElectoralSeats();
    if (allSeats.length === 0) {
      console.log('No electoral seats found in database');
      return [];
    }
    
    // Find matching seats by name (case-insensitive)
    const seats: ElectoralSeat[] = [];
    const seatMap = new Map<number, ElectoralSeat>(); // Use map to avoid duplicates
    
    for (const divisionName of divisionNames) {
      const normalizedDivisionName = divisionName.toLowerCase();
      
      for (const seat of allSeats) {
        const seatName = seat.name.toLowerCase();
        
        // Check for exact or partial matches
        if (seatName === normalizedDivisionName || 
            seatName.includes(normalizedDivisionName) ||
            normalizedDivisionName.includes(seatName)) {
          seatMap.set(seat.id, seat);
        }
      }
    }
    
    // Convert map to array
    seatMap.forEach(seat => seats.push(seat));
    
    console.log(`Found ${seats.length} matching seats for postcode ${postcode}`);
    return seats;
  } catch (error) {
    console.error('Error in findElectoralSeatsByPostcode:', error);
    return [];
  }
}

/**
 * Initialize the AEC data service and preload data
 */
export function initializeAECDataService() {
  console.log('Initializing AEC Data Service...');
  
  // Preload the data
  const mappings = loadPostcodeMappings();
  const divisionDetails = loadDivisionDetails();
  
  // Count unique postcodes (using a traditional approach to avoid Set iteration issues)
  const postcodeCountMap: Record<string, boolean> = {};
  mappings.forEach(m => {
    if (m.postcode) {
      postcodeCountMap[m.postcode] = true;
    }
  });
  const uniquePostcodeCount = Object.keys(postcodeCountMap).length;
  
  console.log(`AEC Data Service initialized with ${uniquePostcodeCount} postcodes and ${divisionDetails.length} division details`);
  
  // Log some sample data for debugging
  const samplePostcodes = ['2087', '2000', '2600'];
  for (const postcode of samplePostcodes) {
    const divisions = findDivisionsByPostcode(postcode);
    if (divisions.length > 0) {
      console.log(`Sample: Postcode ${postcode} maps to divisions: ${divisions.join(', ')}`);
    }
  }
  
  return {
    postcodeCount: uniquePostcodeCount,
    divisionCount: divisionDetails.length
  };
}