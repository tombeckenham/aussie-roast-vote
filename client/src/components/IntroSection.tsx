import { ExternalLink } from "lucide-react";

const IntroSection = () => {
  return (
    <section className="mb-12 text-center">
      <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4">
        The Honest Election Guide
      </h2>
      <p className="max-w-2xl mx-auto text-lg mb-3">
        Don't know who to vote for? Let's help you decide in the most Aussie way
        possible.
      </p>

      <p className="max-w-2xl mx-auto text-md font-semibold text-aussie-green">
        Election Day: Saturday, 3 May 2025
      </p>
      <div className="mt-6 inline-block bg-aussie-gold px-4 py-2 font-heading font-bold text-dark-text rounded-lg transform -rotate-2">
        <i className="fas fa-fire mr-2"></i> Make Australia Proud
      </div>
      <div className="text-sm mt-3">
        
      </div>
    </section>
  );
};

export default IntroSection;
