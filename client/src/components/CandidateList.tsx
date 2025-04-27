import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface CandidateListProps {
  seatId: number;
  onViewCandidate: (id: number) => void;
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
  policyHighlights: string[] | null;
  campaignSlogan: string | null;
  websiteUrl: string | null;
  socialMediaUrls: string[] | null;
  isIncumbent: boolean | null;
}

const CandidateList = ({ seatId, onViewCandidate }: CandidateListProps) => {
  // Fetch candidates for the electoral seat
  const { data: candidates, isLoading, error } = useQuery<Candidate[]>({
    queryKey: [`/api/seats/${seatId}/candidates`],
    enabled: !!seatId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
            <CardFooter>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </CardFooter>
          </Card>
        ))}
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {candidates.map((candidate) => (
        <Card key={candidate.id} className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{candidate.name}</CardTitle>
            <CardDescription>
              {candidate.partyBallotName || (candidate.isIndependent ? "Independent" : "Unknown party")}
              {candidate.isIncumbent && " (Incumbent)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidate.campaignSlogan && (
              <p className="italic text-gray-600 mb-2">"{candidate.campaignSlogan}"</p>
            )}
            {candidate.bio && <p className="text-sm text-gray-700 line-clamp-3">{candidate.bio}</p>}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => onViewCandidate(candidate.id)}
              variant="default"
            >
              View Candidate <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default CandidateList;