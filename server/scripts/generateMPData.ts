/**
 * Script to generate current Members of Parliament data
 * Uses AI to generate realistic information about current MPs for key electorates
 */

import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { db } from '../db';
import { electoralSeats } from '@shared/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

// Ensure we have a valid API key
if (!process.env.XAI_API_KEY) {
  console.error('❌ No XAI_API_KEY found in environment variables');
  process.exit(1);
}

// Configure OpenAI with xAI's API
const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

interface MP {
  id: number;
  name: string;
  electorate: string;
  party: string;
  photoUrl: string;
  profileUrl: string;
  bio: string;
}

/**
 * Generate MP data for key electorates
 */
async function generateMPData(): Promise<MP[]> {
  console.log('🔍 Generating MP data for key electorates...');
  
  try {
    // First, get all electoral seats from the database
    const seats = await db.select().from(electoralSeats);
    console.log(`Found ${seats.length} electoral seats in the database`);
    
    // Focus on just the first 5 electorates for now to avoid timeouts
    const keyElectorates = seats.slice(0, 5);
    const mps: MP[] = [];
    
    for (let i = 0; i < keyElectorates.length; i++) {
      const seat = keyElectorates[i];
      
      console.log(`Generating MP data for ${seat.name} (${i+1}/${keyElectorates.length})...`);
      
      try {
        // Generate MP information using xAI
        const mpInfo = await generateMPInfo(seat.name, seat.state);
        
        if (mpInfo) {
          mps.push({
            id: i + 1,
            name: mpInfo.name,
            electorate: seat.name,
            party: mpInfo.party,
            photoUrl: '', // We won't have actual photos
            profileUrl: '',
            bio: mpInfo.bio
          });
          
          console.log(`✅ Generated data for ${mpInfo.name}, Member for ${seat.name}, ${mpInfo.party}`);
        }
      } catch (error) {
        console.error(`❌ Error generating MP data for ${seat.name}:`, error);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Successfully generated data for ${mps.length} MPs`);
    return mps;
  } catch (error) {
    console.error('❌ Error generating MP data:', error);
    return [];
  }
}

interface MPInfo {
  name: string;
  party: string;
  bio: string;
}

/**
 * Generate MP information for a specific electorate using xAI
 */
async function generateMPInfo(electorateName: string, state: string): Promise<MPInfo | null> {
  try {
    const prompt = `
I need information about the current Australian Member of Parliament for the Division of ${electorateName} in ${state}.
Please provide the following information:
1. The full name of the current MP
2. Their political party
3. A brief professional biography (100 words maximum)

Note: I need information for the real current MP as of 2025. Return the information in JSON format with the following structure:
{
  "name": "Full Name",
  "party": "Political Party",
  "bio": "Brief biography..."
}
`;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an assistant who provides accurate information about Australian politics and current Members of Parliament. Your responses are concise, factual, and structured in the requested format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error(`No content returned for ${electorateName}`);
      return null;
    }

    let result: MPInfo;
    try {
      result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error(`Failed to parse JSON for ${electorateName}:`, content);
      return null;
    }
  } catch (error) {
    console.error(`Error generating MP information for ${electorateName}:`, error);
    return null;
  }
}

/**
 * Write MP data to CSV file
 */
async function writeToCSV(mps: MP[]): Promise<string> {
  const outputDir = path.join(process.cwd(), 'server/data');
  const outputFile = path.join(outputDir, 'current_mps.csv');
  
  // Ensure the directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const csvWriter = createObjectCsvWriter({
    path: outputFile,
    header: [
      { id: 'id', title: 'ID' },
      { id: 'name', title: 'Name' },
      { id: 'electorate', title: 'Electorate' },
      { id: 'party', title: 'Party' },
      { id: 'photoUrl', title: 'Photo URL' },
      { id: 'profileUrl', title: 'Profile URL' },
      { id: 'bio', title: 'Biography' }
    ]
  });
  
  try {
    await csvWriter.writeRecords(mps);
    console.log(`📁 CSV file created successfully at ${outputFile}`);
    return outputFile;
  } catch (error) {
    console.error('❌ Error writing CSV file:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting MP data generation process...');
    const mps = await generateMPData();
    
    if (mps.length === 0) {
      console.error('⚠️ No MP data was generated.');
      process.exit(1);
    }
    
    await writeToCSV(mps);
    
    console.log('✅ MP data generation completed successfully!');
    console.log(`📊 Statistics: ${mps.length} MPs generated`);
    
    // Display a sample of the data
    if (mps.length > 0) {
      console.log('\n📋 Sample data (first 3 MPs):');
      mps.slice(0, 3).forEach(mp => {
        console.log(`  - ${mp.name}, Member for ${mp.electorate}, ${mp.party}`);
        console.log(`    Bio: ${mp.bio.substring(0, 100)}...`);
      });
    }
    
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

export { generateMPData, writeToCSV };