import { Link } from "wouter";

const Footer = () => {
  return (
    <footer className="bg-dark-text text-white py-6">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/">
              <div className="inline-block">
                <h2 className="font-heading font-bold text-xl">
                  Aussie<span className="text-aussie-gold">Roast</span>Politics
                </h2>
              </div>
            </Link>
            <p className="text-sm opacity-75 mt-1">
              Democracy with a side of banter
            </p>
          </div>

          <div className="text-center md:text-right">
            <div className="flex space-x-4 mb-2 justify-center md:justify-end">
              <a
                href="#"
                className="text-white hover:text-aussie-gold transition-colors"
              >
                <i className="fab fa-twitter"></i>
              </a>
              <a
                href="#"
                className="text-white hover:text-aussie-gold transition-colors"
              >
                <i className="fab fa-facebook"></i>
              </a>
              <a
                href="#"
                className="text-white hover:text-aussie-gold transition-colors"
              >
                <i className="fab fa-instagram"></i>
              </a>
            </div>
            <p className="text-xs opacity-75">
              © 2025 AussieRoastPolitics. Powered by Grok3. <br />
              All roasts are AI-generated and meant for laughs, ya drongo!
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
