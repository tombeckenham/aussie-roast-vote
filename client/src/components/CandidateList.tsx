import { useQuery } from "@tanstack/react-query";
import CandidateCard from "./CandidateCard";

interface CandidateListProps {
  seatId?: number;
  onViewCandidate: (id: number) => void;
}

const CandidateList = ({ seatId, onViewCandidate }: CandidateListProps) => {
  const { data: candidates, isLoading, error } = useQuery({
    queryKey: [`/api/seats/${seatId}/candidates`],
    enabled: !!seatId,
  });

  if (!seatId) {
    return (
      <section className="mb-12">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <p>Please select an electorate to see candidates</p>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mb-12">
        <h3 className="font-heading font-bold text-2xl mb-6">
          Loading Candidates...
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
              <div className="h-10 bg-gray-200"></div>
              <div className="p-5">
                <div className="flex items-start mb-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg mr-4"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-24 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !candidates) {
    return (
      <section className="mb-12">
        <h3 className="font-heading font-bold text-2xl mb-6">
          Meet Your Candidates
        </h3>
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <p className="text-red-500">
            Error loading candidates. Please try again.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h3 className="font-heading font-bold text-2xl mb-6">
        Meet Your Candidates{" "}
        <span className="text-sm font-normal font-body">
          (and we'll roast 'em for you!)
        </span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <CandidateCard 
            key={candidate.id} 
            candidate={candidate} 
            onViewDetails={() => onViewCandidate(candidate.id)} 
          />
        ))}
      </div>
    </section>
  );
};

export default CandidateList;
