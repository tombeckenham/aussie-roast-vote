import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronRight, User, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface CandidateTableProps {
  seatId: number;
  onViewCandidate: (id: number) => void;
  isGeneratingCommentary?: boolean;
}

interface Candidate {
  id: number;
  name: string;
  surname: string;
  givenName: string;
  electoralSeatId: number;
  position: string | null;
  partyId: number | null;
  partyBallotName: string | null;
  isIndependent: boolean | null;
  imageUrl: string | null;
  bio: string | null;
  keyPolicies: string[] | null;
  websiteUrl: string | null;
  isIncumbent: boolean | null;
}

interface CaricatureData {
  candidateId: number;
  name: string;
  description: string;
  imageData: string | null;
}

const CandidateTable = ({ seatId, onViewCandidate, isGeneratingCommentary = false }: CandidateTableProps) => {
  const queryClient = useQueryClient();
  const [generatingCaricature, setGeneratingCaricature] = useState<number | null>(null);

  // Fetch candidates for the electoral seat
  const { data: candidates, isLoading, error } = useQuery<Candidate[]>({
    queryKey: [`/api/seats/${seatId}/candidates`],
    enabled: !!seatId,
  });

  // Fetch candidate commentaries from the API
  const { data: commentaries = {}, refetch: refetchCommentaries } = useQuery<Record<number, string>>({
    queryKey: [`/api/seats/${seatId}/commentaries`],
    enabled: !!seatId && !!candidates?.length,
    initialData: {},
    refetchInterval: isGeneratingCommentary ? 2000 : false, // Poll every 2 seconds while generating
  });

  // Generate caricature mutation
  const generateCaricatureMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      setGeneratingCaricature(candidateId);
      const response = await fetch(`/api/candidates/${candidateId}/caricature`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to generate caricature');
      }
      return response.json() as Promise<CaricatureData>;
    },
    onSuccess: (data) => {
      // Invalidate the candidate query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${data.candidateId}`] });
      setGeneratingCaricature(null);
    },
    onError: () => {
      setGeneratingCaricature(null);
    },
  });

  const handleGenerateCaricature = (candidateId: number) => {
    if (generatingCaricature !== candidateId) {
      generateCaricatureMutation.mutate(candidateId);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (error || !candidates || candidates.length === 0) {
    return (
      <div className="p-6 bg-light-bg rounded-lg text-center">
        <p className="text-lg text-gray-600">
          {error ? "Error loading candidates" : "No candidates found for this seat yet."}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          We're still gathering information on all candidates for the 2025 election.
        </p>
      </div>
    );
  }

  // Sort candidates by incumbent first, then by ballot position
  const sortedCandidates = [...candidates].sort((a, b) => {
    if (a.isIncumbent && !b.isIncumbent) return -1;
    if (!a.isIncumbent && b.isIncumbent) return 1;
    return 0;
  });

  // Force a refresh of the commentaries
  useEffect(() => {
    // Setup a polling interval to refresh commentaries when the component first mounts
    const interval = setInterval(() => {
      if (isGeneratingCommentary) {
        refetchCommentaries();
        console.log("Polling for updated commentaries...");
      }
    }, 3000);
    
    // Clean up the interval on component unmount
    return () => clearInterval(interval);
  }, [isGeneratingCommentary, refetchCommentaries]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedCandidates.map((candidate) => (
        <Card key={candidate.id} className={candidate.isIncumbent ? "border-aussie-gold border-2" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={candidate.imageUrl || ""} alt={candidate.name} />
                  <AvatarFallback>
                    <User size={20} />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{candidate.name}</CardTitle>
                  <CardDescription>
                    {candidate.partyBallotName || (candidate.isIndependent ? "Independent" : "-")}
                    {candidate.position && <span> · {candidate.position}</span>}
                  </CardDescription>
                </div>
              </div>
              {candidate.isIncumbent && (
                <Badge className="bg-aussie-gold text-dark-text">Incumbent</Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Key Policies */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Key Policy Focus</h4>
              <div className="flex flex-wrap gap-1">
                {candidate.keyPolicies && candidate.keyPolicies.length > 0 ? (
                  candidate.keyPolicies.slice(0, 3).map((policy, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-100">
                      {policy}
                    </Badge>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No policies listed</span>
                )}
              </div>
            </div>
            
            {/* Commentary */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Aussie-Style Commentary</h4>
              {isGeneratingCommentary && !commentaries[candidate.id] ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex items-center space-x-2 text-xs text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Generating commentary...</span>
                  </div>
                </div>
              ) : commentaries[candidate.id] ? (
                <div className="text-sm py-2 border-l-2 pl-3 border-l-aussie-green/40 italic">
                  {commentaries[candidate.id]}
                </div>
              ) : (
                <span className="text-gray-500 text-sm">Commentary will be generated automatically</span>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              onClick={() => onViewCandidate(candidate.id)}
              variant="default"
              size="sm"
            >
              View Profile <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              onClick={() => handleGenerateCaricature(candidate.id)}
              variant="outline"
              size="sm"
              disabled={generateCaricatureMutation.isPending && generatingCaricature === candidate.id}
            >
              {generateCaricatureMutation.isPending && generatingCaricature === candidate.id
                ? "Generating..."
                : "Generate Caricature"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default CandidateTable;