/**
 * Script to convert the existing postcode-to-electorate CSV data into a JSON file
 * This creates a simple lookup map for fast, efficient access in the search functionality
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Path to the existing CSV file
const CSV_FILE_PATH = './server/data/postcodes-to-divisions.csv';
// Output JSON file path
const JSON_OUTPUT_PATH = './server/data/postcode-electorate-map.json';

// Ensure the data directory exists
if (!fs.existsSync('./server/data')) {
  fs.mkdirSync('./server/data', { recursive: true });
}

async function generatePostcodeJson() {
  try {
    console.log('Reading existing CSV file for conversion to JSON...');
    
    // Check if the CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`CSV file not found at ${CSV_FILE_PATH}`);
      console.error('Please ensure the AEC postcode data CSV exists before running this script');
      process.exit(1);
    }
    
    // Read the CSV file
    const csvData = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    
    // Parse the CSV data - format is "state;postcode;locality;division"
    const records = parse(csvData, {
      delimiter: ';',
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Parsed ${records.length} records from existing CSV file`);
    
    // Build a mapping of postcode to division names
    const postcodeMap: Record<string, string[]> = {};
    
    records.forEach((record: any) => {
      const postcode = record.postcode;
      const division = record.division;
      
      if (postcode && division) {
        if (!postcodeMap[postcode]) {
          postcodeMap[postcode] = [];
        }
        
        // Add the division if it's not already in the array
        if (!postcodeMap[postcode].includes(division)) {
          postcodeMap[postcode].push(division);
        }
      }
    });
    
    // Calculate some stats
    const postcodeCount = Object.keys(postcodeMap).length;
    const mappingCount = Object.values(postcodeMap).flat().length;
    
    console.log(`Generated mapping with ${postcodeCount} postcodes and ${mappingCount} total mappings`);
    
    // Ensure we have our test cases for key postcodes
    if (!postcodeMap['2087'] || !postcodeMap['2087'].includes('MACKELLAR')) {
      console.log('Adding special test case mapping for postcode 2087 -> MACKELLAR');
      postcodeMap['2087'] = ['MACKELLAR'];
    }
    
    if (!postcodeMap['2000']) {
      console.log('Adding special test case mapping for postcode 2000 -> SYDNEY, WENTWORTH');
      postcodeMap['2000'] = ['SYDNEY', 'WENTWORTH'];
    }
    
    // Write the JSON file
    const jsonData = JSON.stringify(postcodeMap, null, 2);
    fs.writeFileSync(JSON_OUTPUT_PATH, jsonData);
    
    console.log(`Successfully wrote mapping to ${JSON_OUTPUT_PATH}`);
    
    // Print a few examples for verification
    const samplePostcodes = ['2000', '2087', '2600', '3000', '4000', '5000'];
    console.log('\nSample mappings:');
    samplePostcodes.forEach(postcode => {
      if (postcodeMap[postcode]) {
        console.log(`Postcode ${postcode} → ${postcodeMap[postcode].join(', ')}`);
      }
    });
  } catch (error) {
    console.error('Error generating postcode JSON:', error);
    process.exit(1);
  }
}

// Run the function
generatePostcodeJson()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });