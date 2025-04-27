import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FaTwitter, FaGlobe, FaEnvelope, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";

interface CandidateDetailProps {
  id: number;
  onClose: () => void;
}

const CandidateDetail = ({ id, onClose }: CandidateDetailProps) => {
  const [question, setQuestion] = useState("");
  const [caricatureImage, setCaricatureImage] = useState<string | null>(null);
  const [generatingCaricature, setGeneratingCaricature] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: candidate, isLoading, error } = useQuery({
    queryKey: [`/api/candidates/${id}`],
    enabled: !!id,
  });

  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", `/api/candidates/${id}/ask`, { question });
      return response.json();
    },
    onSuccess: () => {
      // Clear the question input and refetch candidate data to get updated QA history
      setQuestion("");
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}`] });
      toast({
        title: "Question submitted",
        description: "Check out the answer below!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to submit question",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const generateCaricatureMutation = useMutation({
    mutationFn: async () => {
      setGeneratingCaricature(true);
      const response = await apiRequest("POST", `/api/candidates/${id}/caricature`, {});
      return response.json();
    },
    onSuccess: (data) => {
      // We don't use the description anymore
      setCaricatureImage(data.imageData);
      toast({
        title: "Caricature generated!",
        description: data.imageData ? 
          "Check out the humorous caricature image below." : 
          "Failed to generate image. Please try again.",
      });
      setGeneratingCaricature(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to generate caricature",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setGeneratingCaricature(false);
    },
  });

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    askQuestionMutation.mutate(question);
  };

  // Format date for activities
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Helper function to split text into paragraphs
  const splitIntoParagraphs = (text: string | null) => {
    if (!text) return [];
    return text.split('\n').filter(p => p.trim() !== '');
  };

  if (isLoading) {
    return (
      <section className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
          <div className="sticky top-0 bg-aussie-green text-white p-4 flex justify-between items-center">
            <h3 className="font-heading font-bold text-xl">Loading...</h3>
            <button className="text-white hover:text-aussie-gold transition-colors" onClick={onClose}>
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <div className="p-6 flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aussie-green"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !candidate) {
    return (
      <section className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
          <div className="sticky top-0 bg-aussie-green text-white p-4 flex justify-between items-center">
            <h3 className="font-heading font-bold text-xl">Error</h3>
            <button className="text-white hover:text-aussie-gold transition-colors" onClick={onClose}>
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <div className="p-6 text-center">
            <p className="text-red-500">Failed to load candidate details. Please try again.</p>
          </div>
        </div>
      </section>
    );
  }

  // Determine party badges
  const partyBadgeColor = candidate.party ? 
    candidate.party.name.toLowerCase().includes("liberal") ? "bg-blue-600" :
    candidate.party.name.toLowerCase().includes("labor") ? "bg-red-600" :
    candidate.party.name.toLowerCase().includes("green") ? "bg-green-600" :
    "bg-teal-500" : "bg-teal-500";

  return (
    <section className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-aussie-green text-white p-4 flex justify-between items-center z-10">
          <h3 className="font-heading font-bold text-xl">{candidate.name} - Deep Dive</h3>
          <button 
            className="text-white hover:text-aussie-gold transition-colors"
            onClick={onClose}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
            <img 
              src={candidate.imageUrl || `https://randomuser.me/api/portraits/men/${candidate.id}.jpg`} 
              alt={candidate.name} 
              className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-lg"
            />
            
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`${partyBadgeColor} text-white text-sm font-bold px-3 py-1 rounded-full`}>
                  {candidate.party ? candidate.party.name : "Independent"}
                </span>
                {candidate.isIncumbent && (
                  <span className="bg-aussie-gold text-dark-text text-sm font-bold px-3 py-1 rounded-full">
                    Current MP
                  </span>
                )}
              </div>
              
              <h4 className="font-heading font-bold text-2xl mb-2">{candidate.name}</h4>
              <p className="mb-4">{candidate.bio || candidate.position}</p>
              
              <div className="flex flex-wrap gap-4">
                {candidate.twitterHandle && (
                  <a 
                    href={`https://twitter.com/${candidate.twitterHandle.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center text-aussie-green hover:text-aussie-gold transition-colors"
                  >
                    <FaTwitter className="mr-2" /> {candidate.twitterHandle}
                  </a>
                )}
                {candidate.websiteUrl && (
                  <a 
                    href={candidate.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center text-aussie-green hover:text-aussie-gold transition-colors"
                  >
                    <FaGlobe className="mr-2" /> Website
                  </a>
                )}
                {candidate.email && (
                  <a 
                    href={`mailto:${candidate.email}`} 
                    className="flex items-center text-aussie-green hover:text-aussie-gold transition-colors"
                  >
                    <FaEnvelope className="mr-2" /> Contact
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-light-bg rounded-lg p-4">
              <h5 className="font-heading font-semibold text-lg mb-3">The Extended Roast</h5>
              <div className="space-y-3 italic font-accent text-base">
                {candidate.roast?.fullContent.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                )) || "Extended roast coming soon..."}
              </div>
            </div>
            
            <div className="bg-light-bg rounded-lg p-4">
              <h5 className="font-heading font-semibold text-lg mb-3">Policies & Voting Record</h5>
              <ul className="space-y-2">
                {candidate.keyPolicies?.map((policy, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">
                      <FaCheckCircle />
                    </span>
                    <div>
                      <p className="font-semibold">{policy}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Caricature Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h5 className="font-heading font-semibold text-xl">Caricature</h5>
              <button 
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center"
                onClick={() => generateCaricatureMutation.mutate()}
                disabled={generatingCaricature}
              >
                {generatingCaricature ? 
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </> : 
                  "Generate Caricature"}
              </button>
            </div>
            
            <div className="flex justify-center">
              {/* Only display the image in a centered container */}
              {caricatureImage ? (
                <div className="bg-white rounded-lg p-6 shadow-md flex flex-col items-center max-w-md mx-auto">
                  <h6 className="font-heading font-semibold text-lg mb-3 text-center">Visual Caricature</h6>
                  <img 
                    src={`data:image/png;base64,${caricatureImage}`}
                    alt={`${candidate.name} caricature`}
                    className="rounded-lg max-w-full h-auto shadow-md mb-2"
                  />
                  <p className="text-xs mt-4 text-center opacity-75">
                    Generated using xAI's Grok-2-vision model
                  </p>
                </div>
              ) : (
                <div className="bg-light-bg rounded-lg p-8 text-center w-full max-w-md mx-auto">
                  <h6 className="font-heading font-semibold text-lg mb-3 text-center">Visual Caricature</h6>
                  <div className="text-center italic my-8">
                    {generatingCaricature ? 
                      "AI is creating a caricature image... This might take a moment." : 
                      "Click 'Generate Caricature' to create a humorous visual interpretation of this candidate in Australian style."}
                  </div>
                </div>
              )}
            </div>
            
            {generatingCaricature && (
              <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-lg text-center">
                <p className="text-sm">
                  <span className="font-bold">Please wait:</span> Generating caricature image 
                  can take 30-45 seconds. xAI's Grok-2-vision is creating a humorous visual interpretation.
                </p>
              </div>
            )}
          </div>

          {/* Campaign Trail Section */}
          <div className="mb-8">
            <h5 className="font-heading font-semibold text-xl mb-3">Campaign Trail</h5>
            <div className="relative pl-8 border-l-2 border-aussie-green">
              {candidate.activities && candidate.activities.length > 0 ? (
                candidate.activities.map((activity, index) => (
                  <div key={index} className="mb-6 relative">
                    <div className="absolute w-4 h-4 bg-aussie-green rounded-full -left-[10.5px] top-0"></div>
                    <div className="bg-white rounded-lg p-4 shadow-md">
                      <p className="font-semibold">{activity.title}</p>
                      <p className="text-sm mb-2">
                        {formatDateTime(activity.dateTime)} - {activity.location}
                      </p>
                      <p className="text-sm italic">{activity.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg p-4 shadow-md">
                  <p className="text-center italic">No upcoming campaign activities</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Q&A Section */}
          <div className="mb-8">
            <h5 className="font-heading font-semibold text-xl mb-4">Ask About {candidate.name}</h5>
            <div className="bg-light-bg rounded-lg p-4">
              <div className="mb-4 space-y-4">
                {/* Previous Q&A */}
                {candidate.qaHistory && candidate.qaHistory.length > 0 ? (
                  candidate.qaHistory.map((qa, index) => (
                    <div key={index} className="flex flex-col gap-3">
                      <div className="bg-white rounded-lg p-3 shadow-sm self-start max-w-[80%]">
                        <p className="font-semibold text-sm">{qa.question}</p>
                      </div>
                      
                      <div className="bg-aussie-green text-white rounded-lg p-3 shadow-sm self-end max-w-[80%]">
                        {qa.answer.split('\n').map((paragraph, i) => (
                          <p key={i} className="text-sm mb-2">{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center italic text-sm">
                    No questions asked yet. Be the first!
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSubmitQuestion} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={`Ask a question about ${candidate.name}...`}
                  className="flex-1 border-2 border-aussie-green rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aussie-green"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={askQuestionMutation.isPending}
                />
                <button 
                  type="submit"
                  className="bg-aussie-green hover:bg-aussie-green/80 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  disabled={!question.trim() || askQuestionMutation.isPending}
                >
                  {askQuestionMutation.isPending ? "Asking..." : "Ask"}
                </button>
              </form>
              <p className="text-xs mt-2 text-center opacity-75">
                Powered by Grok3 AI - Responses include factual information with Aussie humor
              </p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button 
              className="bg-aussie-gold hover:bg-aussie-gold/80 text-dark-text font-bold px-6 py-2 rounded-lg transition-colors"
              onClick={onClose}
            >
              Back to Candidate List
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CandidateDetail;
