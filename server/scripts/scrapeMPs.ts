/**
 * Script to scrape Australian Members of Parliament details from official Parliament website
 * Collects names, electorates, parties, and photo URLs for all 151 members
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';

const URL = 'https://www.aph.gov.au/Senators_and_Members/Members/Members_Photos';
const BASE_URL = 'https://www.aph.gov.au';

interface MP {
  id: number;
  name: string;
  electorate: string;
  party: string;
  photoUrl: string;
  profileUrl: string;
}

async function scrapeMPs(): Promise<MP[]> {
  console.log('🔍 Fetching MPs data from the Parliament website...');
  
  try {
    // Fetch the webpage
    const response = await fetch(URL);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const mps: MP[] = [];
    let id = 1;

    // The MP photos are in table cells with class 'member-box'
    $('.member-box').each((index, element) => {
      // Extract the MP details
      const nameElement = $(element).find('h4 a');
      const name = nameElement.text().trim();
      
      // Get profile URL
      const profileUrl = BASE_URL + nameElement.attr('href');
      
      // Extract electorate and party from the full description
      const detailText = $(element).find('p').text().trim();
      const match = detailText.match(/Member for\s+(.+?),\s+(.+)/);
      
      let electorate = '', party = '';
      if (match && match.length >= 3) {
        electorate = match[1].trim();
        party = match[2].trim();
      }
      
      // Extract photo URL
      const photoElement = $(element).find('img');
      const photoUrl = photoElement.attr('src') 
        ? BASE_URL + photoElement.attr('src')
        : '';
      
      // Add to our array
      if (name && electorate) {
        mps.push({
          id,
          name,
          electorate,
          party,
          photoUrl,
          profileUrl
        });
        id++;
      }
    });
    
    console.log(`✅ Successfully scraped data for ${mps.length} MPs`);
    
    return mps;
  } catch (error) {
    console.error('❌ Error scraping MPs data:', error);
    throw error;
  }
}

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
      { id: 'profileUrl', title: 'Profile URL' }
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
    console.log('🚀 Starting MP data scraping process...');
    const mps = await scrapeMPs();
    
    if (mps.length === 0) {
      console.error('⚠️ No MP data was scraped. Check the scraping logic or the website structure.');
      process.exit(1);
    }
    
    await writeToCSV(mps);
    
    console.log('✅ MP data scraping completed successfully!');
    console.log(`📊 Statistics: ${mps.length} MPs scraped`);
    
    // Display a sample of the data
    if (mps.length > 0) {
      console.log('\n📋 Sample data (first 3 MPs):');
      mps.slice(0, 3).forEach(mp => {
        console.log(`  - ${mp.name}, Member for ${mp.electorate}, ${mp.party}`);
        console.log(`    Photo: ${mp.photoUrl.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
    process.exit(1);
  }
}

// Run the script when this file is executed directly
// Check if we're running directly (not being imported)
import { fileURLToPath } from 'url';
import { argv } from 'process';

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
}

export { scrapeMPs, writeToCSV };