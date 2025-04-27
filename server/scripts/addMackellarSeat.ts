/**
 * This script adds the Mackellar seat to the database if it doesn't exist
 */
import { db } from '../db';
import { electoralSeats } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function addMackellarSeat() {
  console.log('Checking if Mackellar seat exists in the database...');
  
  // Check if Mackellar seat already exists
  const existingSeats = await db.select().from(electoralSeats)
    .where(eq(electoralSeats.name, 'Mackellar'));
  
  if (existingSeats.length > 0) {
    console.log('Mackellar seat already exists in the database.');
    return;
  }
  
  // Add Mackellar seat to the database
  console.log('Adding Mackellar seat to the database...');
  
  await db.insert(electoralSeats).values({
    name: 'Mackellar',
    state: 'NSW',
    slug: 'mackellar',
    description: 'Electoral division of Mackellar in NSW.',
    isMarginial: false,
    currentMp: 'Jason Falinski',
    currentParty: 'Liberal',
    keyIssues: ['Environment', 'Infrastructure', 'Education'],
    previousResults: {}
  });
  
  console.log('Successfully added Mackellar seat to the database.');
}

// Run the script
addMackellarSeat()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });