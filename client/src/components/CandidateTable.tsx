import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, User, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: commentaries = {} } = useQuery<Record<number, string>>({
    queryKey: [`/api/seats/${seatId}/roasts`],
    enabled: !!seatId && !!candidates?.length,
    initialData: {},
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

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate Name</TableHead>
            <TableHead>Party/Independence</TableHead>
            <TableHead>Key Policy Focus</TableHead>
            <TableHead>Commentary</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCandidates.map((candidate) => (
            <TableRow key={candidate.id} className={candidate.isIncumbent ? "bg-aussie-gold/10" : ""}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={candidate.imageUrl || ""} alt={candidate.name} />
                    <AvatarFallback>
                      <User size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {candidate.name}
                    {candidate.isIncumbent && (
                      <Badge className="ml-2 bg-aussie-gold text-dark-text">Incumbent</Badge>
                    )}
                    {candidate.position && (
                      <div className="text-xs text-gray-500">{candidate.position}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {candidate.partyBallotName || (candidate.isIndependent ? "Independent" : "-")}
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
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
                  <div className="text-sm max-w-md">
                    {commentaries[candidate.id]}
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">Commentary will be generated automatically</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => onViewCandidate(candidate.id)}
                    variant="default"
                    size="sm"
                  >
                    View <ChevronRight className="ml-1 h-4 w-4" />
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CandidateTable;