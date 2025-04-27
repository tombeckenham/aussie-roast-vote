import { useQuery } from "@tanstack/react-query";

interface SeatInfoProps {
  slug: string;
}

const SeatInfo = ({ slug }: SeatInfoProps) => {
  const { data: seat, isLoading, error } = useQuery({
    queryKey: [`/api/seats/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <section className="mb-12">
        <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded mb-6"></div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 h-32 bg-gray-200 rounded"></div>
            <div className="flex-1 h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !seat) {
    return (
      <section className="mb-12">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-center text-red-500">
            Error loading electorate information. Please try again.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="bg-gradient-to-r from-aussie-green to-aussie-green/80 text-white rounded-t-xl px-6 py-4 flex justify-between items-center">
        <div>
          <h3 className="font-heading font-bold text-2xl">{seat.name}, {seat.state}</h3>
          <p className="text-sm opacity-90">
            Current MP: {seat.currentMp} ({seat.currentParty})
          </p>
        </div>
        <div className="text-right">
          <span className="bg-white text-aussie-green text-sm font-bold px-3 py-1 rounded-full">
            {seat.isMarginial ? "Marginal Seat" : "Safe Seat"}
          </span>
        </div>
      </div>
      
      <div className="bg-white shadow-lg rounded-b-xl p-6">
        <div className="mb-6">
          <h4 className="font-heading font-bold text-xl mb-2">About This Electorate</h4>
          <p>{seat.description}</p>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px] bg-light-bg rounded-lg p-4">
            <h5 className="font-heading font-semibold">Key Issues</h5>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              {seat.keyIssues?.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
          <div className="flex-1 min-w-[200px] bg-light-bg rounded-lg p-4">
            <h5 className="font-heading font-semibold">2022 Results</h5>
            <ul className="space-y-1 mt-2 text-sm">
              {seat.previousResults && seat.previousResults["2022"] ? (
                seat.previousResults["2022"].map((result, index) => {
                  // Determine color based on party
                  let color = "gray";
                  if (result.party.toLowerCase().includes("liberal")) color = "blue";
                  if (result.party.toLowerCase().includes("labor")) color = "red";
                  if (result.party.toLowerCase().includes("green")) color = "green";
                  if (result.party.toLowerCase().includes("independent")) color = "teal";
                  
                  return (
                    <li key={index}>
                      <span className={`inline-block w-3 h-3 bg-${color}-500 rounded-full mr-2`}></span>
                      {result.party}: {result.percentage}%
                    </li>
                  );
                })
              ) : (
                <li>No previous results available</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeatInfo;
