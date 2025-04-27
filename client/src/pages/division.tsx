import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SeatInfo from "@/components/SeatInfo";
import CandidateTable from "@/components/CandidateTable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingCommentary, setGeneratingCommentary] = useState(false);
  
  // Get the seat info
  const { data: seat, isLoading: seatLoading, error: seatError } = useQuery<ElectoralSeat>({
    queryKey: [`/api/seats/${slug}`],
    enabled: !!slug
  });
  
  // Generate commentaries for all candidates in this seat
  const generateCommentaryMutation = useMutation({
    mutationFn: async () => {
      setGeneratingCommentary(true);
      // Make sure we have a valid seat id
      if (!seat?.id) throw new Error("Invalid seat ID");
      
      const response = await apiRequest("POST", `/api/seats/${seat.id}/generate-commentaries`, {});
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate candidate queries and commentaries to refresh the table
      queryClient.invalidateQueries({ queryKey: [`/api/seats/${seat?.id}/candidates`] });
      queryClient.invalidateQueries({ queryKey: [`/api/seats/${seat?.id}/commentaries`] });
      
      // No need to show a toast when automatically generating on page load
      console.log("Commentaries generated:", data.commentaries);
      setGeneratingCommentary(false);
    },
    onError: (error) => {
      console.error("Error generating commentaries:", error);
      toast({
        title: "Failed to generate commentaries",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setGeneratingCommentary(false);
    }
  });
  
  const handleGenerateCommentary = () => {
    generateCommentaryMutation.mutate();
  };
  
  // Effect to trigger commentary generation when seat data loads
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;
    
    if (seat?.id) {
      console.log("Auto-generating commentaries for seat:", seat.name);
      
      // First generate the commentaries
      generateCommentaryMutation.mutate();
      
      // Setup polling to refresh commentaries every few seconds
      refreshInterval = setInterval(() => {
        if (generatingCommentary) {
          queryClient.invalidateQueries({ queryKey: [`/api/seats/${seat?.id}/commentaries`] });
          console.log("Refreshing commentaries for seat:", seat.name);
        } else if (refreshInterval) {
          clearInterval(refreshInterval);
        }
      }, 3000); // Poll every 3 seconds while generating
    }
    
    // Clean up interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [seat?.id, seat?.name, generatingCommentary, queryClient, generateCommentaryMutation]);

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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-aussie-blue">Candidates</h2>
        </div>
        
        {generatingCommentary && (
          <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-lg">
            <p className="text-sm">
              <span className="font-bold">Generating commentary:</span> Aussie-style humorous commentary is being created for all {seat.name} candidates. This might take 10-20 seconds per candidate.
            </p>
          </div>
        )}
        
        <CandidateTable 
          seatId={seat?.id} 
          onViewCandidate={handleViewCandidate} 
          isGeneratingCommentary={generatingCommentary} 
        />
      </div>
    </div>
  );
};

export default DivisionPage;