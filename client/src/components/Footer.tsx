import { ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-dark-bg text-gray py-10 relative z-10">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm md:text-base mb-3">
            This site has no party affiliation and is created for entertainment
            purposes only.
          </p>
          <p className="text-sm md:text-base mb-4">
            For official voting information and how-to-vote instructions, please
            visit the Australian Electoral Commission website.
          </p>
          <a
            href="https://www.aec.gov.au/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green hover:underline text-sm md:text-base font-bold"
          >
            Visit AEC Website <ExternalLink size={16} />
          </a>
          <p className="mt-8 text-xs text-black-400">
            © {new Date().getFullYear()} Aussie How-to-vote | All content is
            AI-generated and satirical in nature
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
