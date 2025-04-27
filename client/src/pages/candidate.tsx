import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import CandidateDetail from "@/components/CandidateDetail";

const CandidatePage = () => {
  const [match, params] = useRoute("/candidate/:id");
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Prevent background scrolling when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!match || !params.id) {
    return null;
  }

  const candidateId = parseInt(params.id, 10);

  const handleClose = () => {
    setLocation("/");
  };

  return (
    <CandidateDetail id={candidateId} onClose={handleClose} />
  );
};

export default CandidatePage;
