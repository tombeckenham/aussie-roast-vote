import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import Candidate from "@/pages/candidate";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";

function App() {
  return (
    <TooltipProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/candidate/:id" component={Candidate} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
