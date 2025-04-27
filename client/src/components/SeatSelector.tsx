import { useState } from "react";
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

const SeatSelector = ({ onSeatSelect }: SeatSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Query electoral seats
  const { data: seats, isLoading } = useQuery<ElectoralSeat[]>({
    queryKey: ["/api/seats"],
    initialData: [],
  });

  // State to store search results
  const [searchResults, setSearchResults] = useState<ElectoralSeat[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) return;
    
    try {
      setIsSearching(true);
      
      // Determine if the search term is a postcode (4 digits) or a name
      const isPostcode = /^\d{4}$/.test(searchTerm);
      
      // Build the search URL based on the search term type
      const searchUrl = isPostcode
        ? `/api/seats/search?postcode=${encodeURIComponent(searchTerm)}`
        : `/api/seats/search?query=${encodeURIComponent(searchTerm)}`;
      
      // Directly fetch search results
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
  };

  // Handle search input keypress (Enter)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle seat selection from list
  const handleSeatClick = (slug: string) => {
    onSeatSelect(slug);
  };

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
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-aussie-green text-white px-4 py-1 rounded-lg disabled:bg-gray-400"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
          
          <div className="mt-6">
            <h4 className="font-heading font-bold text-lg mb-3">Popular Electorates:</h4>
            <div className="flex flex-wrap gap-2">
              {isLoading ? (
                <div className="text-sm opacity-75">Loading electorates...</div>
              ) : (
                seats?.slice(0, 5).map((seat) => (
                  <button
                    key={seat.id}
                    className="bg-light-bg hover:bg-aussie-gold transition-colors px-3 py-1 rounded-md text-sm font-semibold"
                    onClick={() => handleSeatClick(seat.slug)}
                  >
                    {seat.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {isSearching && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-aussie-green"></div>
            </div>
          )}
          
          {searchTerm && !isSearching && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-heading font-bold text-lg">Search Results:</h4>
                {searchResults.length > 0 && (
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
                    No results found for "{searchTerm}". Try a different search term or postcode.
                  </div>
                )}
              </div>
            </div>
          )}
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
