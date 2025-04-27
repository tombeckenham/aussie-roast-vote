import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface SeatInfoProps {
  slug: string;
}

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

const SeatInfo = ({ slug }: SeatInfoProps) => {
  // Fetch seat details
  const { data: seat, isLoading, error } = useQuery<ElectoralSeat>({
    queryKey: [`/api/seats/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }

  if (error || !seat) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Seat Information</h2>
        <p>We couldn't load information for the {slug} division.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-aussie-blue">{seat.name}</h1>
        <p className="text-lg text-gray-600">{seat.state}</p>
      </div>

      {seat.description && (
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">{seat.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {seat.currentMp && (
          <div className="bg-light-bg p-4 rounded-lg">
            <h3 className="font-bold text-aussie-blue mb-1">Current MP</h3>
            <p>{seat.currentMp}</p>
            {seat.currentParty && <p className="text-sm text-gray-600">{seat.currentParty}</p>}
          </div>
        )}
        
        {seat.isMarginial && (
          <div className="bg-aussie-gold/20 p-4 rounded-lg">
            <h3 className="font-bold text-aussie-blue mb-1">Marginal Seat</h3>
            <p>This seat is considered marginal in the 2025 election.</p>
          </div>
        )}
        
        {seat.keyIssues && seat.keyIssues.length > 0 && (
          <div className="bg-light-bg p-4 rounded-lg col-span-1 md:col-span-3">
            <h3 className="font-bold text-aussie-blue mb-1">Key Issues</h3>
            <ul className="list-disc list-inside">
              {seat.keyIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatInfo;