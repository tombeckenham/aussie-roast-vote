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

  const handleViewCandidate = (id: number) => {
    setLocation(`/candidate/${id}`);
  };

  return (
    <>
      <IntroSection />
      <SeatSelector />
    </>
  );
};

export default Home;
