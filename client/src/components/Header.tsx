import { Link } from "wouter";

const Header = () => {
  // Calculate days until election (May 17, 2025)
  const electionDate = new Date("2025-05-17");
  const today = new Date();
  const daysToElection = Math.ceil(
    (electionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <header className="bg-aussie-green text-white shadow-md">
      <div className="container mx-auto py-4 px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <Link href="/">
            <a className="flex items-center">
              <svg
                className="w-10 h-10 rounded-full mr-3"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="50" cy="50" r="50" fill="#FFCD00" />
                <path
                  d="M50 20L80 80H20L50 20Z"
                  fill="#00843D"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <circle cx="50" cy="50" r="15" fill="#FFCD00" />
              </svg>
              <h1 className="font-heading font-bold text-2xl md:text-3xl">
                Aussie<span className="text-aussie-gold">Roast</span>Politics
              </h1>
            </a>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <span className="font-accent text-aussie-gold hidden md:inline-block">
            2025 Election Edition
          </span>
          <div className="relative">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-cheeky-red opacity-75 top-0 right-0"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cheeky-red"></span>
            <span className="ml-2">Live Updates</span>
          </div>
        </div>
      </div>
      <div className="bg-dark-text py-2">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-white text-sm text-center md:text-left">
            Election Day: <span className="font-bold">May 17, 2025</span> - Only{" "}
            <span className="font-bold text-aussie-gold">{daysToElection}</span>{" "}
            days to go!
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
