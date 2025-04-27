import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import IntroSection from "@/components/IntroSection";
import SeatSelector from "@/components/SeatSelector";
import SeatInfo from "@/components/SeatInfo";
import CandidateList from "@/components/CandidateList";

const Home = () => {
  const [selectedSeatSlug, setSelectedSeatSlug] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Get the seat info if a seat is selected
  const { data: selectedSeat } = useQuery({
    queryKey: [`/api/seats/${selectedSeatSlug}`],
    enabled: !!selectedSeatSlug,
  });

  const handleSeatSelect = (slug: string) => {
    setSelectedSeatSlug(slug);
    // Scroll to seat info
    setTimeout(() => {
      const seatInfoSection = document.getElementById("selectedSeatSection");
      if (seatInfoSection) {
        seatInfoSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleViewCandidate = (id: number) => {
    setLocation(`/candidate/${id}`);
  };

  return (
    <>
      <IntroSection />
      <SeatSelector onSeatSelect={handleSeatSelect} />
      
      {selectedSeatSlug && (
        <div id="selectedSeatSection">
          <SeatInfo slug={selectedSeatSlug} />
          <CandidateList 
            seatId={selectedSeat?.id} 
            onViewCandidate={handleViewCandidate} 
          />
        </div>
      )}
    </>
  );
};

export default Home;
