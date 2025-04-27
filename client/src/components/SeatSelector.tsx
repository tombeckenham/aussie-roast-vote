import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface SeatSelectorProps {
  onSeatSelect: (seatSlug: string) => void;
}

interface ElectoralSeat {
  id: number;
  name: string;
  slug: string;
  state: string;
}

type Locality = {
  id: number;
  postcode: string;
  locality: string;
  state: string;
  divisionName: string;
};
// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300;

const SeatSelector = ({ onSeatSelect }: SeatSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  // Query electoral seats
  const { data: seats } = useQuery<ElectoralSeat[]>({
    queryKey: ["/api/seats"],
    initialData: [],
  });

  const { data: localityData } = useQuery<{
    localities: Locality[];
    resultSearchTerm: string;
  }>({
    queryKey: ["/api/locality/search", debouncedSearchTerm],
    enabled: !!debouncedSearchTerm,
    queryFn: async () => {
      const response = await fetch(
        `/api/locality/search?q=${encodeURIComponent(debouncedSearchTerm)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to search localities");
      }
      return {
        localities: (await response.json()) as Locality[],
        resultSearchTerm: debouncedSearchTerm,
      };
    },
  });
  const { localities, resultSearchTerm } = localityData || {};
  // State to store search results
  const [searchResults, setSearchResults] = useState<ElectoralSeat[]>([]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Handle search input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle seat selection from list
  const handleSeatClick = (slug: string) => {
    // Convert division name to lowercase and replace spaces with hyphens for slug format
    const formattedSlug = slug.toLowerCase().replace(/\s+/g, "-");
    // Navigate to the division page
    setLocation(`/division/${formattedSlug}`);
    // Also call the onSeatSelect prop for backward compatibility
  };

  return (
    <section className="mb-12 bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <h3 className="font-heading font-bold text-2xl mb-6 text-center">
        Find Your Electorate
      </h3>

      <div className="max-w-lg mx-auto mb-8">
        <div className="w-full mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Enter a seat name or postcode (e.g. Sydney or 2000)"
              className="w-full border-2 border-aussie-green rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-aussie-green"
              value={searchTerm}
              onChange={handleInputChange}
            />
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-heading font-bold text-lg">
                {searchTerm ? "Search Results:" : "Popular Electorates:"}
              </h4>
              {searchResults.length > 0 && searchTerm && (
                <span className="text-sm bg-aussie-green/10 text-aussie-green font-semibold rounded-full px-3 py-1">
                  {searchResults.length}{" "}
                  {searchResults.length === 1 ? "seat" : "seats"} found
                </span>
              )}
            </div>
            <div className="bg-light-bg rounded-lg p-2">
              {localities && localities.length > 0 ? (
                localities.map((locality) => (
                  <button
                    key={locality.id}
                    className="block w-full text-left px-3 py-2 hover:bg-aussie-gold/20 rounded-md transition-colors"
                    onClick={() => handleSeatClick(locality.divisionName)}
                  >
                    <span className="font-semibold">{locality.locality}</span>,{" "}
                    {locality.state} ({locality.postcode})
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500">
                  {searchTerm.length >= 2 &&
                  debouncedSearchTerm === resultSearchTerm
                    ? `No results found for "${resultSearchTerm}". Try a different search term or postcode.`
                    : searchTerm.length > 0
                      ? "Searching..."
                      : "Type at least 2 characters to search"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeatSelector;
