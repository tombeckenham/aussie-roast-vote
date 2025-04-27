import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import AustraliaMap from "./ui/australia-map";

interface SeatSelectorProps {
  onSeatSelect: (seatSlug: string) => void;
}

interface ElectoralSeat {
  id: number;
  name: string;
  slug: string;
  state: string;
}

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300;

const SeatSelector = ({ onSeatSelect }: SeatSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Query electoral seats for the map
  const { data: seats } = useQuery<ElectoralSeat[]>({
    queryKey: ["/api/seats"],
    initialData: [],
  });

  // State to store search results
  const [searchResults, setSearchResults] = useState<ElectoralSeat[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Search function
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      
      // Use the unified search endpoint with a single query parameter
      const searchUrl = `/api/seats/search?q=${encodeURIComponent(term)}`;
      
      // Fetch search results
      const res = await fetch(searchUrl);
      if (!res.ok) throw new Error("Failed to search seats");
      
      const results = await res.json();
      console.log("Search results:", results);
      setSearchResults(results);
      
      // If only one result, automatically select it
      if (results.length === 1) {
        onSeatSelect(results[0].slug);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [onSeatSelect]);

  // Effect to trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, performSearch]);

  // Handle search input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle seat selection from list
  const handleSeatClick = (slug: string) => {
    onSeatSelect(slug);
  };

  // On component load, fetch popular seats
  useEffect(() => {
    // Load a few popular electorates on initial render
    if (!searchTerm && !debouncedSearchTerm) {
      fetch('/api/seats/search?q=e')
        .then(res => res.json())
        .then(results => {
          // Limit to a few results for initial display
          setSearchResults(results.slice(0, 6));
        })
        .catch(error => {
          console.error("Error fetching initial results:", error);
        });
    }
  }, []);

  return (
    <section className="mb-12 bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <h3 className="font-heading font-bold text-2xl mb-6 text-center">
        Find Your Electorate
      </h3>
      
      <div className="md:flex md:justify-between md:items-start mb-8">
        <div className="md:w-1/2 mb-6 md:mb-0 md:pr-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Enter a seat name or postcode (e.g. Sydney or 2000)"
              className="w-full border-2 border-aussie-green rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-aussie-green"
              value={searchTerm}
              onChange={handleInputChange}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-aussie-green"></div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-heading font-bold text-lg">{searchTerm ? 'Search Results:' : 'Popular Electorates:'}</h4>
              {searchResults.length > 0 && searchTerm && (
                <span className="text-sm bg-aussie-green/10 text-aussie-green font-semibold rounded-full px-3 py-1">
                  {searchResults.length} {searchResults.length === 1 ? 'seat' : 'seats'} found
                </span>
              )}
            </div>
            <div className="bg-light-bg rounded-lg p-2">
              {searchResults.length > 0 ? (
                searchResults.map((seat) => (
                  <button
                    key={seat.id}
                    className="block w-full text-left px-3 py-2 hover:bg-aussie-gold/20 rounded-md transition-colors"
                    onClick={() => handleSeatClick(seat.slug)}
                  >
                    <span className="font-semibold">{seat.name}</span>, {seat.state}
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500">
                  {searchTerm.length >= 2 ? 
                    `No results found for "${searchTerm}". Try a different search term or postcode.` : 
                    'Type at least 2 characters to search'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="md:w-1/2 bg-light-bg rounded-lg p-4 relative min-h-[250px]">
          <AustraliaMap onSeatSelect={handleSeatClick} seats={seats || []} />
          <p className="text-sm italic mt-2 text-center">Click on the map or search above</p>
        </div>
      </div>
    </section>
  );
};

export default SeatSelector;
