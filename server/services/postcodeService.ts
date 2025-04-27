import { storage } from '../storage';
import { ElectoralSeat } from '@shared/schema';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

// AEC API configuration
const AEC_API_KEY = 'b924f84fc0ed4026a1681aa1777eefa4';
const AEC_API_BASE_URL = 'https://api.aec.gov.au/elections/v1';
const AEC_POSTCODE_DATA_URL = 'https://www.aec.gov.au/_template/inc/oHGjG11qZEx2aemk.txt';

// Cache for storing API results to reduce API calls
const divisionCache: { divisions?: any[], timestamp?: number } = {};
const postcodeCache: { data?: Map<string, string[]>, timestamp?: number } = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Static mapping of postcodes to electorates
// This is a simplified implementation for demo purposes - in a production app,
// you would use a more complete database or API for this data
const POSTCODE_TO_ELECTORATES: Record<string, string[]> = {
  // ACT - Canberra area
  '2600': ['Canberra'],
  '2601': ['Canberra'],
  '2602': ['Canberra'],
  '2603': ['Canberra'],
  '2604': ['Bean'],
  '2605': ['Bean'],
  '2606': ['Bean'],
  '2607': ['Bean'],
  '2612': ['Canberra'],
  '2614': ['Fenner'],
  '2615': ['Fenner'],
  '2617': ['Fenner'],
  '2900': ['Bean'],
  '2902': ['Bean'],
  '2904': ['Bean'],
  '2905': ['Bean'],
  '2906': ['Bean'],
  
  // NSW - Sydney area
  '2000': ['Sydney', 'Wentworth'],
  '2010': ['Sydney'],
  '2011': ['Sydney', 'Wentworth'],
  '2015': ['Wentworth'],
  '2025': ['Wentworth'],
  '2026': ['Wentworth'],
  '2027': ['Wentworth'],
  '2028': ['Wentworth'],
  '2030': ['Wentworth'],
  '2060': ['North Sydney'],
  '2061': ['Warringah'],
  '2062': ['North Sydney'],
  '2063': ['North Sydney'],
  '2064': ['North Sydney'],
  '2065': ['North Sydney'],
  '2066': ['North Sydney'],
  '2067': ['North Sydney'],
  '2068': ['Warringah'],
  '2069': ['Warringah'],
  '2070': ['Bennelong'],
  '2071': ['Bennelong'],
  '2072': ['Bennelong'],
  '2073': ['Mackellar'],
  '2074': ['Mackellar'],
  '2075': ['Berowra'],
  '2076': ['Berowra'],
  '2077': ['Berowra'],
  '2079': ['Berowra'],
  '2080': ['Berowra'],
  '2081': ['Berowra'],
  '2082': ['Berowra'],
  '2083': ['Berowra'],
  '2084': ['Mackellar'],
  '2085': ['Mackellar'],
  '2086': ['Mackellar'],
  '2087': ['Mackellar'],
  '2088': ['Warringah'],
  '2089': ['Warringah'],
  '2090': ['Grayndler'],
  '2092': ['Warringah'],
  '2093': ['Warringah'],
  '2094': ['Warringah'],
  '2095': ['Warringah'],
  '2096': ['Warringah'],
  '2097': ['Mackellar'],
  '2099': ['Mackellar'],
  '2100': ['Mackellar'],
  '2101': ['Mackellar'],
  '2102': ['Mackellar'],
  '2106': ['Mackellar'],
  '2107': ['Mackellar'],
  '2108': ['Mackellar'],
  '2110': ['Bennelong'],
  '2111': ['Bennelong'],
  '2112': ['Bennelong'],
  '2113': ['Bennelong'],
  '2114': ['Bennelong'],
  '2115': ['Bennelong'],
  '2116': ['Bennelong'],
  '2117': ['Bennelong'],
  '2118': ['Bennelong'],
  '2119': ['Bennelong'],
  '2120': ['Bennelong'],
  '2122': ['Bennelong'],
  '2125': ['Mitchell'],
  '2126': ['Mitchell'],
  '2127': ['Reid'],
  '2128': ['Reid'],
  '2130': ['Grayndler'],
  '2131': ['Grayndler'],
  '2132': ['Watson'],
  '2133': ['Watson'],
  '2134': ['Reid'],
  '2135': ['Reid'],
  '2136': ['Watson'],
  '2137': ['Reid'],
  '2138': ['Reid'],
  '2140': ['Grayndler'],
  '2141': ['Blaxland'],
  '2142': ['Blaxland'],
  '2143': ['Watson'],
  '2144': ['Watson'],
  '2145': ['Blaxland'],
  '2146': ['Blaxland'],
  '2147': ['Blaxland'],
  '2148': ['Greenway'],
  '2150': ['Parramatta'],
  '2151': ['Mitchell'],
  '2152': ['Mitchell'],
  '2153': ['Mitchell'],
  '2154': ['Mitchell'],
  '2155': ['Mitchell'],
  '2160': ['Parramatta'],
  '2161': ['Blaxland'],
  '2162': ['Blaxland'],
  '2163': ['Blaxland'],
  '2164': ['Fowler'],
  '2165': ['Fowler'],
  '2166': ['Fowler'],
  '2170': ['Werriwa'],
  '2176': ['Werriwa'],
  '2177': ['Werriwa'],
  '2190': ['Barton'],
  '2192': ['Barton'],
  '2193': ['Barton'],
  '2194': ['Barton'],
  '2196': ['Watson'],
  '2197': ['Watson'],
  '2198': ['Watson'],
  '2199': ['Banks'],
  '2200': ['Banks'],
  '2205': ['Barton'],
  '2206': ['Barton'],
  '2207': ['Barton'],
  '2208': ['Banks'],
  '2209': ['Banks'],
  '2210': ['Banks'],
  '2211': ['Banks'],
  '2212': ['Banks'],
  '2213': ['Banks'],
  '2214': ['Banks'],
  '2216': ['Barton'],
  '2217': ['Barton'],
  '2218': ['Barton'],
  '2219': ['Banks'],
  '2220': ['Banks'],
  '2221': ['Banks'],
  '2222': ['Banks'],
  '2223': ['Cook'],
  '2224': ['Cook'],
  '2225': ['Hughes'],
  '2226': ['Hughes'],
  '2227': ['Hughes'],
  '2228': ['Cook'],
  '2229': ['Cook'],
  '2230': ['Cook'],
  '2231': ['Cook'],
  '2232': ['Cook'],
  '2233': ['Hughes'],
  '2234': ['Hughes'],
  
  // VIC - Melbourne area
  '3000': ['Melbourne'],
  '3001': ['Melbourne'],
  '3002': ['Melbourne'],
  '3003': ['Melbourne'],
  '3004': ['Macnamara'],
  '3006': ['Macnamara'],
  '3008': ['Melbourne'],
  '3010': ['Melbourne'],
  '3011': ['Maribyrnong'],
  '3012': ['Maribyrnong'],
  '3013': ['Maribyrnong'],
  '3015': ['Gellibrand'],
  '3016': ['Goldstein'],
};

/**
 * Fetches all electoral divisions from the AEC API
 */
export async function fetchAllDivisions(): Promise<any[]> {
  try {
    // Check cache first
    const now = Date.now();
    if (divisionCache.divisions && divisionCache.timestamp && 
        (now - divisionCache.timestamp < CACHE_TTL)) {
      console.log('Using cached divisions data');
      return divisionCache.divisions;
    }
    
    // Fetch from AEC API
    console.log('Fetching divisions from AEC API');
    const url = `${AEC_API_BASE_URL}/divisions?api_key=${AEC_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`AEC API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) {
      console.error('Unexpected response format from AEC API');
      return [];
    }
    
    // Cache the results
    divisionCache.divisions = data;
    divisionCache.timestamp = now;
    
    console.log(`Fetched ${data.length} divisions from AEC API`);
    return data;
  } catch (error) {
    console.error('Error fetching divisions from AEC API:', error);
    
    // If API call fails, but we have cache data that's not too old (< 7 days), use it
    if (divisionCache.divisions && divisionCache.timestamp && 
        (Date.now() - divisionCache.timestamp < 7 * 24 * 60 * 60 * 1000)) {
      console.log('Using stale cached data due to API error');
      return divisionCache.divisions;
    }
    
    return [];
  }
}

/**
 * Fetches and processes the AEC postcode mapping data
 */
export async function fetchPostcodeData(): Promise<Map<string, string[]>> {
  try {
    // Check cache first
    const now = Date.now();
    if (postcodeCache.data && postcodeCache.timestamp && 
        (now - postcodeCache.timestamp < CACHE_TTL)) {
      console.log('Using cached postcode mapping data');
      return postcodeCache.data;
    }
    
    // Fetch from AEC data file
    console.log('Fetching postcode mapping data from AEC');
    const response = await fetch(AEC_POSTCODE_DATA_URL);
    
    if (!response.ok) {
      throw new Error(`AEC data fetch error: ${response.status} ${response.statusText}`);
    }
    
    const csvData = await response.text();
    
    // Parse the CSV data - format is "state;postcode;locality;division"
    const records = parse(csvData, {
      delimiter: ';',
      columns: true,
      skip_empty_lines: true
    });
    
    // Build a mapping of postcode to division names
    const postcodeMap = new Map<string, Set<string>>();
    
    records.forEach((record: any) => {
      const postcode = record.postcode;
      const division = record.division;
      
      if (postcode && division) {
        if (!postcodeMap.has(postcode)) {
          postcodeMap.set(postcode, new Set<string>());
        }
        postcodeMap.get(postcode)?.add(division);
      }
    });
    
    // Convert Sets to Arrays for easier use
    const result = new Map<string, string[]>();
    postcodeMap.forEach((divisions, postcode) => {
      result.set(postcode, Array.from(divisions));
    });
    
    // Cache the results
    postcodeCache.data = result;
    postcodeCache.timestamp = now;
    
    console.log(`Processed ${result.size} postcodes and ${records.length} mappings from AEC data`);
    return result;
  } catch (error) {
    console.error('Error fetching postcode mapping data:', error);
    
    // If we have cache data that's not too old (< 7 days), use it as fallback
    if (postcodeCache.data && postcodeCache.timestamp && 
        (Date.now() - postcodeCache.timestamp < 7 * 24 * 60 * 60 * 1000)) {
      console.log('Using stale cached postcode data due to fetch error');
      return postcodeCache.data;
    }
    
    // Otherwise return an empty map
    return new Map<string, string[]>();
  }
}

/**
 * Gets electorate divisions associated with a postcode
 * Uses official AEC postcode-to-division mapping data, with fallback to static mapping
 */
export async function getElectoratesByPostcode(postcode: string): Promise<string[]> {
  try {
    // Validate postcode format
    if (!/^\d{4}$/.test(postcode)) {
      console.log(`Invalid postcode format: ${postcode}`);
      return [];
    }

    // First try the AEC postcode data
    try {
      const postcodeMap = await fetchPostcodeData();
      
      if (postcodeMap.size > 0 && postcodeMap.has(postcode)) {
        const electorates = postcodeMap.get(postcode) || [];
        console.log(`[AEC Data] Postcode ${postcode} maps to electorates: ${electorates.join(', ')}`);
        return electorates;
      }
    } catch (dataError) {
      console.error('Error using AEC postcode data:', dataError);
    }

    // If AEC mapping doesn't have the postcode, fall back to our static mapping
    const electorates = POSTCODE_TO_ELECTORATES[postcode] || [];
    console.log(`[Fallback] Postcode ${postcode} maps to electorates: ${electorates.join(', ')}`);
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
    // Get electorate names from our static mapping
    const electorateNames = await getElectoratesByPostcode(postcode);
    
    if (electorateNames.length === 0) {
      console.log(`No electorates found for postcode ${postcode}`);
      return [];
    }
    
    // Get all seats from the database once
    const allSeats = await storage.getElectoralSeats();
    if (allSeats.length === 0) {
      console.log('No electoral seats found in database');
      return [];
    }
    
    // Find matching seats in our database
    const seats: ElectoralSeat[] = [];
    const seatMap = new Map<number, ElectoralSeat>(); // Use a map to avoid duplicates
    
    for (const name of electorateNames) {
      // Normalize the name for comparison
      const normalizedSearchName = name.toLowerCase().trim();
      
      for (const seat of allSeats) {
        const seatName = seat.name.toLowerCase().trim();
        
        // Check for matches
        if (seatName === normalizedSearchName) {
          // Exact match
          seatMap.set(seat.id, seat);
        } else if (seatName.includes(normalizedSearchName) || normalizedSearchName.includes(seatName)) {
          // Partial match (one contains the other)
          seatMap.set(seat.id, seat);
        }
        
        // Special case for certain divisions that may have different spellings
        // Note: This could be extended with more sophisticated fuzzy matching
        if (
          (normalizedSearchName === 'north sydney' && seatName === 'northsydney') ||
          (normalizedSearchName === 'macnamara' && seatName === 'macnamara') ||
          (normalizedSearchName === 'sydney' && seatName === 'sydney')
        ) {
          seatMap.set(seat.id, seat);
        }
      }
    }
    
    // Convert map values to array
    seats.push(...seatMap.values());
    
    // If no direct matches, try a fallback search for divisions in the same state
    if (seats.length === 0) {
      // Determine which state the postcode is in
      let state = '';
      if (postcode.startsWith('2') || postcode.startsWith('1')) state = 'NSW';
      else if (postcode.startsWith('3') || postcode.startsWith('8')) state = 'VIC';
      else if (postcode.startsWith('4') || postcode.startsWith('9')) state = 'QLD';
      else if (postcode.startsWith('5')) state = 'SA';
      else if (postcode.startsWith('6')) state = 'WA';
      else if (postcode.startsWith('7')) state = 'TAS';
      else if (postcode.startsWith('0')) state = 'NT';
      
      if (state) {
        const stateSeats = allSeats.filter(s => s.state === state);
        if (stateSeats.length > 0) {
          // Add up to 3 seats from the same state as fallback
          seats.push(...stateSeats.slice(0, 3));
          console.log(`Using fallback: ${stateSeats.length} seats from ${state} state`);
        }
      }
    }
    
    console.log(`Found ${seats.length} matching seats for postcode ${postcode}`);
    return seats;
  } catch (error) {
    console.error('Error in searchSeatsByPostcode:', error);
    return [];
  }
}

/**
 * Initializes the postcode mapping service by pre-fetching both the electoral divisions
 * and postcode-to-division mappings from the AEC data to ensure they're ready for fast lookups
 */
export async function initializePostcodeMapping() {
  try {
    console.log('Initializing postcode mapping service with AEC data...');
    
    // Pre-fetch divisions from API
    const divisions = await fetchAllDivisions();
    console.log(`Initialized with ${divisions.length} electoral divisions from AEC API`);
    
    // Log some sample divisions for debugging
    if (divisions.length > 0) {
      console.log('Sample division data:');
      console.log(JSON.stringify(divisions[0], null, 2).slice(0, 500) + '...');
    }

    // Pre-fetch postcode mapping data
    const postcodeMap = await fetchPostcodeData();
    console.log(`Loaded ${postcodeMap.size} postcodes to electoral division mappings`);
    
    // Log a few sample postcode mappings for debugging
    if (postcodeMap.size > 0) {
      const samplePostcodes = ['2600', '2000', '3000', '4000', '5000', '6000']; // Capital cities
      
      for (const postcode of samplePostcodes) {
        if (postcodeMap.has(postcode)) {
          const divisions = postcodeMap.get(postcode);
          console.log(`Sample mapping - Postcode ${postcode} maps to: ${divisions?.join(', ')}`);
        }
      }
    }
    
    return {
      divisions,
      postcodeMap
    };
  } catch (error) {
    console.error('Error initializing postcode mapping service:', error);
    console.log('Postcode mapping service initialized with fallback data only');
    return { 
      divisions: [],
      postcodeMap: new Map<string, string[]>()
    };
  }
}