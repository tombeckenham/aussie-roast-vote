import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, PartyPopper, Star, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ElectoralSeat {
  id: number;
  name: string;
  slug: string;
  state: string;
  description?: string;
  currentMp?: string;
  currentParty?: string;
  currentMpPhotoUrl?: string;
}

// Slugs for our featured seats
const featuredSeatSlugs = ["grayndler", "dickson", "mackellar"];

const PopularSeats = () => {
  const [, setLocation] = useLocation();

  // Fetch each seat directly by slug for better data
  const grayndlerQuery = useQuery<ElectoralSeat>({
    queryKey: ["/api/seats/grayndler"],
  });

  const dicksonQuery = useQuery<ElectoralSeat>({
    queryKey: ["/api/seats/dickson"],
  });

  const mackellarQuery = useQuery<ElectoralSeat>({
    queryKey: ["/api/seats/mackellar"],
  });

  const isLoading = grayndlerQuery.isLoading || dicksonQuery.isLoading || mackellarQuery.isLoading;
  const hasError = grayndlerQuery.error || dicksonQuery.error || mackellarQuery.error;

  // Combine the featured seats
  const featuredSeats = [
    grayndlerQuery.data,
    dicksonQuery.data,
    mackellarQuery.data
  ].filter(Boolean) as ElectoralSeat[];

  const handleViewSeat = (slug: string) => {
    setLocation(`/division/${slug}`);
  };

  if (isLoading) {
    return (
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Popular Electorates</h2>
            <div className="text-gray-600 max-w-2xl mx-auto">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-4/5 mx-auto" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3 mb-3">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (hasError || featuredSeats.length === 0) {
    console.error("Error loading featured seats:", hasError);
    return null; // Hide section if there's an error
  }

  return (
    <section className="py-8 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Popular Electorates</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Key electorates represented by prominent members of parliament in the current federal government.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredSeats.map((seat) => (
            <Card key={seat.slug} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  <Star className="h-5 w-5 text-aussie-gold" />
                  <div>
                    <CardTitle className="text-lg">{seat.name}</CardTitle>
                    <CardDescription className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                      {seat.state}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="h-14 w-14 border-2 border-aussie-green">
                    <AvatarImage src={seat.currentMpPhotoUrl} alt={seat.currentMp} />
                    <AvatarFallback>
                      <User size={24} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{seat.currentMp}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <PartyPopper className="h-3 w-3 mr-1 text-gray-400" />
                      {seat.currentParty}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <Building2 className="h-3 w-3 mr-1 text-gray-400" />
                      Current Member
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="default" 
                  className="w-full bg-aussie-green hover:bg-aussie-green/90"
                  onClick={() => handleViewSeat(seat.slug)}
                >
                  View Candidates
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularSeats;