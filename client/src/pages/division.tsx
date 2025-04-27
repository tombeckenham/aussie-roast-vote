import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SeatInfo from "@/components/SeatInfo";
import CandidateList from "@/components/CandidateList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ElectoralSeat {
  id: number;
  name: string;
  state: string;
  description: string | null;
  isMarginial: boolean | null;
  currentMp: string | null;
  currentParty: string | null;
  currentMpPhotoUrl: string | null;
  keyIssues: string[] | null;
  previousResults: any;
  slug: string;
  position: any;
}

const DivisionPage = () => {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [, setLocation] = useLocation();
  
  // Get the seat info
  const { data: seat, isLoading: seatLoading, error: seatError } = useQuery<ElectoralSeat>({
    queryKey: [`/api/seats/${slug}`],
    enabled: !!slug,
  });

  const handleViewCandidate = (id: number) => {
    setLocation(`/candidate/${id}`);
  };

  const handleBackClick = () => {
    setLocation("/");
  };

  if (seatLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-32 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (seatError || !seat) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <Button 
            variant="outline" 
            onClick={handleBackClick}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to search
          </Button>
          <h1 className="text-2xl font-bold text-center text-red-500 mb-4">Division Not Found</h1>
          <p className="text-center">
            Sorry, we couldn't find the electoral division "{slug}". Please try searching again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button 
        variant="outline" 
        onClick={handleBackClick}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to search
      </Button>
      
      <div className="mb-8">
        <SeatInfo slug={slug} />
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-aussie-blue mb-6">Candidates</h2>
        <CandidateList seatId={seat?.id} onViewCandidate={handleViewCandidate} />
      </div>
    </div>
  );
};

export default DivisionPage;