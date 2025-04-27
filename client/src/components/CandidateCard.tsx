import { FaTwitter, FaFacebook, FaGlobe } from "react-icons/fa";

interface CandidateCardProps {
  candidate: any;
  onViewDetails: () => void;
}

const CandidateCard = ({ candidate, onViewDetails }: CandidateCardProps) => {
  const { name, position, imageUrl, party, roast, keyPolicies, activities } = candidate;
  
  // Determine party color for the header
  let partyColor = "bg-aussie-gold";
  if (party) {
    if (party.name.toLowerCase().includes("liberal")) partyColor = "bg-blue-600";
    if (party.name.toLowerCase().includes("labor")) partyColor = "bg-red-600";
    if (party.name.toLowerCase().includes("green")) partyColor = "bg-green-600";
    if (party.name.toLowerCase().includes("independent")) partyColor = "bg-teal-500";
  }
  
  // Get today's campaign activity if available
  const todayActivity = activities && activities.length > 0 ? activities[0] : null;
  
  return (
    <div className="candidate-card bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300">
      <div className={`${partyColor} text-white px-4 py-2 flex justify-between items-center`}>
        <span className="font-heading font-bold">
          {party ? party.name : "Independent"}
        </span>
        {party && party.logoUrl && (
          <img 
            src={party.logoUrl} 
            alt={`${party.name} logo`} 
            className="w-6 h-6 rounded-full" 
          />
        )}
      </div>
      
      <div className="p-5">
        <div className="flex items-start mb-4">
          <img 
            src={imageUrl || `https://randomuser.me/api/portraits/men/${candidate.id}.jpg`} 
            alt={name} 
            className="w-20 h-20 object-cover rounded-lg mr-4"
          />
          <div>
            <h4 className="font-heading font-bold text-xl">{name}</h4>
            <p className="text-sm opacity-75">{position || "Candidate"}</p>
            <div className="flex mt-2 space-x-2">
              {candidate.twitterHandle && (
                <a 
                  href={`https://twitter.com/${candidate.twitterHandle.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-aussie-green hover:text-aussie-gold transition-colors"
                >
                  <FaTwitter />
                </a>
              )}
              {candidate.facebookUrl && (
                <a 
                  href={candidate.facebookUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-aussie-green hover:text-aussie-gold transition-colors"
                >
                  <FaFacebook />
                </a>
              )}
              {candidate.websiteUrl && (
                <a 
                  href={candidate.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-aussie-green hover:text-aussie-gold transition-colors"
                >
                  <FaGlobe />
                </a>
              )}
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h5 className="font-heading font-semibold text-lg">The Roast</h5>
            {roast?.isSpicy && (
              <span className="bg-cheeky-red text-white text-xs px-2 py-1 rounded-full">
                Spicy!
              </span>
            )}
          </div>
          <div className="bg-light-bg rounded-lg p-3 italic font-accent text-base">
            {roast?.content || "Roast coming soon..."}
          </div>
        </div>
        
        <div className="mb-4">
          <h5 className="font-heading font-semibold text-lg mb-2">Key Policies</h5>
          <ul className="space-y-1 text-sm">
            {keyPolicies?.slice(0, 3).map((policy, index) => (
              <li key={index} className="flex items-start">
                <span className="text-aussie-green mr-2">✓</span>
                {policy}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="border-t pt-4">
          <h5 className="font-heading font-semibold text-lg mb-2">
            Today's Campaign
          </h5>
          {todayActivity ? (
            <div className="flex items-start">
              <div className="text-aussie-green mr-3">
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <div className="text-sm">
                <p className="font-semibold">{todayActivity.title}</p>
                <p className="opacity-75">
                  {new Date(todayActivity.dateTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} - {todayActivity.location}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm italic">No scheduled events today</p>
          )}
        </div>
        
        <button 
          onClick={onViewDetails}
          className="mt-4 w-full bg-aussie-green hover:bg-aussie-green/80 text-white font-bold py-2 rounded-lg transition-colors"
        >
          More Details & Q&A
        </button>
      </div>
    </div>
  );
};

export default CandidateCard;
