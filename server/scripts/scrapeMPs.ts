/**
 * Script to scrape Australian Members of Parliament details from official Parliament website
 * Collects names, electorates, parties, and photo URLs for all 151 members
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';

const PHOTOS_URL = 'https://www.aph.gov.au/Senators_and_Members/Members/Members_Photos';
const MEMBER_LIST_URL = 'https://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results?q=&mem=1&par=-1&gen=0&ps=96';
const ALTERNATIVE_URL = 'https://www.aph.gov.au/Senators_and_Members/Members';
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
    // Try the first approach - using the members photos page
    const mps = await scrapeFromPhotosPage();
    
    // If the first approach didn't yield results, try alternative method
    if (mps.length === 0) {
      console.log('Trying alternative method - search results page...');
      const searchMps = await scrapeFromSearchPage();
      
      // If that still didn't work, try the basic members page
      if (searchMps.length === 0) {
        console.log('Trying final method - members list page...');
        return await scrapeFromMembersPage();
      }
      
      return searchMps;
    }
    
    return mps;
  } catch (error) {
    console.error('❌ Error scraping MPs data:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function scrapeFromPhotosPage(): Promise<MP[]> {
  try {
    // Fetch the webpage with photos
    const response = await fetch(PHOTOS_URL);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const mps: MP[] = [];
    let id = 1;

    // Save HTML for debugging
    fs.writeFileSync('photos_page.html', html);
    
    // Debug output of page structure
    console.log('Debugging page structure:');
    console.log(`Page title: ${$('title').text()}`);
    console.log(`Found member-box elements: ${$('.member-box').length}`);

    // The MP photos are in table cells with class 'member-box'
    $('.member-box').each((index, element) => {
      // Extract the MP details
      const nameElement = $(element).find('h4 a');
      const name = nameElement.text().trim();
      
      // Get profile URL
      const profileUrl = nameElement.attr('href') ? 
        (nameElement.attr('href')!.startsWith('http') ? nameElement.attr('href')! : BASE_URL + nameElement.attr('href')) 
        : '';
      
      // Extract electorate and party from the full description
      const detailText = $(element).find('p').text().trim();
      console.log(`Debug - Detail text for ${name}: ${detailText}`);
      
      const match = detailText.match(/Member for\s+(.+?),\s+(.+)/);
      
      let electorate = '', party = '';
      if (match && match.length >= 3) {
        electorate = match[1].trim();
        party = match[2].trim();
      }
      
      // Extract photo URL
      const photoElement = $(element).find('img');
      const photoUrl = photoElement.attr('src') 
        ? (photoElement.attr('src')!.startsWith('http') ? photoElement.attr('src')! : BASE_URL + photoElement.attr('src'))
        : '';
      
      console.log(`Debug - Found MP: ${name}, Electorate: ${electorate}, Party: ${party}`);
      
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
    
    console.log(`✅ Scraped data for ${mps.length} MPs from photos page`);
    return mps;
  } catch (error) {
    console.error('Error in photos page scraping:', error);
    return [];
  }
}

async function scrapeFromSearchPage(): Promise<MP[]> {
  try {
    // Parliament of Australia Members list by search results
    const response = await fetch(MEMBER_LIST_URL);
    const html = await response.text();
    
    // Save HTML for debugging
    fs.writeFileSync('search_page.html', html);
    
    const $ = cheerio.load(html);
    const mps: MP[] = [];
    let id = 1;
    
    console.log(`Search page table rows: ${$('.search-filter-results tbody tr').length}`);
    
    // Search the table rows on this page
    $('.search-filter-results tbody tr').each((i, el) => {
      // First column has name and profile link
      const nameCol = $(el).find('td').eq(0);
      const name = nameCol.text().trim();
      const profileUrl = nameCol.find('a').attr('href') || '';
      
      // Second column has party
      const party = $(el).find('td').eq(1).text().trim();
      
      // Third column has electorate 
      const electorate = $(el).find('td').eq(2).text().trim();
      
      console.log(`Debug - Found MP in search: ${name}, Electorate: ${electorate}, Party: ${party}`);
      
      // We'll build the photo URL from the profile link
      // Standard format: /Senators_and_Members/Parliamentarian?MPID=XXXXX
      // Photo URL format: https://www.aph.gov.au/~/media/03%20Senators%20and%20Members/32%20Members/Images/photos/XXXXX.jpg
      
      let photoUrl = '';
      if (profileUrl) {
        const mpidMatch = profileUrl.match(/MPID=([A-Za-z0-9]+)/);
        if (mpidMatch && mpidMatch[1]) {
          const mpid = mpidMatch[1];
          photoUrl = `https://www.aph.gov.au/~/media/03%20Senators%20and%20Members/32%20Members/Images/photos/${mpid}.jpg`;
        }
      }
      
      // Only add if we have a name and electorate
      if (name && electorate) {
        mps.push({
          id: id++,
          name,
          electorate,
          party,
          photoUrl,
          profileUrl: profileUrl.startsWith('http') ? profileUrl : `https://www.aph.gov.au${profileUrl}`,
        });
      }
    });
    
    console.log(`✅ Scraped data for ${mps.length} MPs from search page`);
    return mps;
  } catch (error) {
    console.error('Error in search page scraping:', error);
    return [];
  }
}

async function scrapeFromMembersPage(): Promise<MP[]> {
  try {
    // Alternative URL with a different format
    const response = await fetch(ALTERNATIVE_URL);
    const html = await response.text();
    
    // Save HTML for debugging
    fs.writeFileSync('members_page.html', html);
    
    const $ = cheerio.load(html);
    const mps: MP[] = [];
    let id = 1;
    
    console.log(`Members page table rows: ${$('#main table tbody tr').length}`);
    
    $('#main table tbody tr').each((i, el) => {
      const nameCol = $(el).find('td').eq(0);
      const name = nameCol.text().trim();
      const profileUrl = nameCol.find('a').attr('href') || '';
      
      const party = $(el).find('td').eq(1).text().trim();
      const electorate = $(el).find('td').eq(2).text().trim();
      
      console.log(`Debug - Found MP in members page: ${name}, Electorate: ${electorate}, Party: ${party}`);
      
      // Build photo URL
      let photoUrl = '';
      if (profileUrl) {
        const mpidMatch = profileUrl.match(/MPID=([A-Za-z0-9]+)/);
        if (mpidMatch && mpidMatch[1]) {
          const mpid = mpidMatch[1];
          photoUrl = `https://www.aph.gov.au/~/media/03%20Senators%20and%20Members/32%20Members/Images/photos/${mpid}.jpg`;
        }
      }
      
      if (name && electorate) {
        mps.push({
          id: id++,
          name,
          electorate,
          party,
          photoUrl,
          profileUrl: profileUrl.startsWith('http') ? profileUrl : `https://www.aph.gov.au${profileUrl}`,
        });
      }
    });
    
    console.log(`✅ Scraped data for ${mps.length} MPs from members page`);
    return mps;
  } catch (error) {
    console.error('Error in members page scraping:', error);
    return [];
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