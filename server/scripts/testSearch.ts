/**
 * Test script to verify unified search functionality
 * Tests if searches for postcode, suburb name, and seat name all return the correct electorate
 */

import fetch from 'node-fetch';

// Mackellar test cases
const TEST_CASES = [
  { 
    query: '2087', 
    description: 'Postcode in Mackellar electorate',
    expectedDivision: 'Mackellar'
  },
  { 
    query: 'Killarney Heights', 
    description: 'Suburb in Mackellar electorate',
    expectedDivision: 'Mackellar'
  },
  { 
    query: 'Mackellar', 
    description: 'Electorate name itself',
    expectedDivision: 'Mackellar'
  }
];

async function runSearchTests() {
  console.log('🔍 Running unified search tests...\n');
  
  let allTestsPassed = true;
  
  for (const testCase of TEST_CASES) {
    process.stdout.write(`Testing "${testCase.query}" (${testCase.description})... `);
    
    try {
      // Call the search API
      const response = await fetch(`http://localhost:5000/api/seats/search?q=${encodeURIComponent(testCase.query)}`);
      
      if (!response.ok) {
        console.log('❌ FAILED - API request error');
        allTestsPassed = false;
        continue;
      }
      
      const results = await response.json();
      
      // Check if we got any results
      if (results.length === 0) {
        console.log('❌ FAILED - No results returned');
        allTestsPassed = false;
        continue;
      }
      
      // Check if the expected division is in the results
      const foundExpectedDivision = results.some(
        (seat: any) => seat.name.toLowerCase() === testCase.expectedDivision.toLowerCase()
      );
      
      if (!foundExpectedDivision) {
        console.log(`❌ FAILED - Expected to find "${testCase.expectedDivision}" division in results`);
        console.log('  Results:', results.map((r: any) => r.name).join(', '));
        allTestsPassed = false;
      } else {
        console.log('✅ PASSED');
      }
    } catch (error) {
      console.log(`❌ FAILED - ${error}`);
      allTestsPassed = false;
    }
  }
  
  console.log('\nTest Summary:');
  if (allTestsPassed) {
    console.log('✅ All tests passed! The unified search is working correctly.');
  } else {
    console.log('❌ Some tests failed. The unified search needs fixing.');
  }
}

// Run the tests
runSearchTests();