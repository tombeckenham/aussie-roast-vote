import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { Express } from 'express';
import express from 'express';
import { storage } from '../server/storage';
import { ElectoralSeat } from '../shared/schema';
import { registerRoutes } from '../server/routes';

describe('Search API Tests', () => {
  let app: Express;
  let server: ReturnType<typeof createServer>;
  
  // Mock data for tests
  const mockSeats: Partial<ElectoralSeat>[] = [
    {
      id: 1,
      name: 'Mackellar',
      slug: 'mackellar',
      state: 'NSW',
      description: 'Electoral division of Mackellar in NSW.',
    },
    {
      id: 2,
      name: 'Warringah',
      slug: 'warringah',
      state: 'NSW',
      description: 'Electoral division of Warringah in NSW.',
    }
  ];
  
  // Mock implementations
  const mockSearchByPostcode = async (postcode: string): Promise<ElectoralSeat[]> => {
    if (postcode === '2087') {
      return mockSeats.filter(seat => seat.name === 'Mackellar') as ElectoralSeat[];
    }
    return [];
  };
  
  const mockSearchByName = async (query: string): Promise<ElectoralSeat[]> => {
    const normalizedQuery = query.toLowerCase();
    if (normalizedQuery === 'mackellar') {
      return mockSeats.filter(seat => seat.name?.toLowerCase() === 'mackellar') as ElectoralSeat[];
    } else if (normalizedQuery === 'killarney heights') {
      return mockSeats.filter(seat => seat.name === 'Mackellar') as ElectoralSeat[];
    }
    return mockSeats.filter(
      seat => seat.name?.toLowerCase().includes(normalizedQuery) || 
              seat.state?.toLowerCase().includes(normalizedQuery)
    ) as ElectoralSeat[];
  };
  
  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Mock storage functions
    vi.spyOn(storage, 'searchElectoralSeatsByPostcode').mockImplementation(mockSearchByPostcode);
    vi.spyOn(storage, 'searchElectoralSeatsByName').mockImplementation(mockSearchByName);
    
    // Register routes
    server = await registerRoutes(app);
    server.listen(0); // Use a random available port
  });
  
  afterAll(() => {
    vi.clearAllMocks();
    server.close();
  });
  
  // Test cases
  it('should return Mackellar when searching for "2087" (postcode)', async () => {
    // Using the new unified search endpoint
    const response = await fetch(`http://localhost:${(server.address() as any).port}/api/seats/search?q=2087`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
    expect(data.some((seat: any) => seat.name === 'Mackellar')).toBe(true);
  });
  
  it('should return Mackellar when searching for "Killarney Heights" (suburb)', async () => {
    const response = await fetch(`http://localhost:${(server.address() as any).port}/api/seats/search?q=Killarney%20Heights`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
    expect(data.some((seat: any) => seat.name === 'Mackellar')).toBe(true);
  });
  
  it('should return Mackellar when searching for "Mackellar" (electorate name)', async () => {
    const response = await fetch(`http://localhost:${(server.address() as any).port}/api/seats/search?q=Mackellar`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
    expect(data.some((seat: any) => seat.name === 'Mackellar')).toBe(true);
  });
});