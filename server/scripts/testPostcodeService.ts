import { searchSeatsByPostcode, getElectoratesByPostcode } from '../services/postcodeService';

async function testPostcodeService() {
  // Test postcodes representing different regions in Australia
  const postcodes = ['2000', '3000', '4000', '6000', '5000'];
  
  console.log('Testing postcode service with sample postcodes...\n');
  
  for (const postcode of postcodes) {
    console.log(`\nPostcode: ${postcode}`);
    
    // Test raw electorate names
    console.log('  Fetching electorate names from AEC:');
    const electorateNames = await getElectoratesByPostcode(postcode);
    
    if (electorateNames.length > 0) {
      electorateNames.forEach(name => console.log(`    - ${name}`));
    } else {
      console.log('    No electorate names found');
    }
    
    // Test matched electoral seats
    console.log('  Matching to electoral seats in database:');
    const seats = await searchSeatsByPostcode(postcode);
    
    if (seats.length > 0) {
      seats.forEach(seat => console.log(`    - ${seat.name} (${seat.state})`));
    } else {
      console.log('    No matching seats found');
    }
  }
}

// Run the test
testPostcodeService().catch(err => {
  console.error('Error testing postcode service:', err);
  process.exit(1);
});