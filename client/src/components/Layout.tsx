import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="bg-pattern min-h-screen font-body text-dark-text flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto py-8 px-4 md:px-6 mb-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
