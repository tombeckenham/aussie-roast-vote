import { ElectoralSeat } from '@shared/schema';

// Mapping of suburbs to electoral divisions
// This would ideally come from a database or official AEC data
export const SUBURBS_TO_DIVISIONS: Record<string, string[]> = {
  // Mackellar suburbs
  'killarney heights': ['Mackellar'],
  'frenchs forest': ['Mackellar'],
  'dee why': ['Mackellar'],
  'collaroy': ['Mackellar'],
  'narrabeen': ['Mackellar'],
  'mona vale': ['Mackellar'],
  'newport': ['Mackellar'],
  'avalon': ['Mackellar'],
  'palm beach': ['Mackellar'],
  'whale beach': ['Mackellar'],
  'bilgola': ['Mackellar'],
  'bayview': ['Mackellar'],
  'warriewood': ['Mackellar'],
  'ingleside': ['Mackellar'],
  'elanora heights': ['Mackellar'],
  'terrey hills': ['Mackellar'],
  'belrose': ['Mackellar'],
  'davidson': ['Mackellar'],
  'oxford falls': ['Mackellar'],
  'cromer': ['Mackellar'],
  'north curl curl': ['Mackellar'],
  'curl curl': ['Mackellar'],
  'manly vale': ['Mackellar'],
  'brookvale': ['Mackellar'],
  'north manly': ['Mackellar'],
  'allambie heights': ['Mackellar'],
};

/**
 * Searches for electoral seats based on suburb name
 * @param query The suburb name to search for
 * @param allSeats All available electoral seats
 * @returns Electoral seats that match the suburb
 */
export function searchSeatsBySuburb(query: string, allSeats: ElectoralSeat[]): ElectoralSeat[] {
  const normalizedQuery = query.toLowerCase().trim();
  const matchingDivisions = new Set<string>();
  const results: ElectoralSeat[] = [];
  
  // Check for exact suburb match
  if (SUBURBS_TO_DIVISIONS[normalizedQuery]) {
    SUBURBS_TO_DIVISIONS[normalizedQuery].forEach(division => {
      matchingDivisions.add(division.toLowerCase());
    });
  }
  
  // Check for partial suburb matches
  for (const suburb in SUBURBS_TO_DIVISIONS) {
    if (suburb.includes(normalizedQuery) || normalizedQuery.includes(suburb)) {
      SUBURBS_TO_DIVISIONS[suburb].forEach(division => {
        matchingDivisions.add(division.toLowerCase());
      });
    }
  }
  
  // Find matching electoral seats
  if (matchingDivisions.size > 0) {
    for (const seat of allSeats) {
      if (matchingDivisions.has(seat.name.toLowerCase())) {
        results.push(seat);
      }
    }
  }
  
  return results;
}