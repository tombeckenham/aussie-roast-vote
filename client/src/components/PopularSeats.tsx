import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, PartyPopper, Star, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PopularSeat {
  slug: string;
  name: string;
  state: string;
  mpName: string;
  mpParty: string;
  mpImage?: string;
}

const popularSeats: PopularSeat[] = [
  {
    slug: "grayndler",
    name: "Grayndler",
    state: "NSW",
    mpName: "Anthony Albanese",
    mpParty: "Labor Party",
    mpImage: "https://www.aph.gov.au/api/parliamentarian/49271/image"
  },
  {
    slug: "dickson",
    name: "Dickson",
    state: "QLD",
    mpName: "Peter Dutton",
    mpParty: "Liberal Party",
    mpImage: "https://www.aph.gov.au/api/parliamentarian/HZE/image"
  },
  {
    slug: "mackellar",
    name: "Mackellar",
    state: "NSW",
    mpName: "Sophie Scamps",
    mpParty: "Independent",
    mpImage: "https://www.aph.gov.au/api/parliamentarian/282265/image"
  }
];

const PopularSeats = () => {
  const [, setLocation] = useLocation();

  const handleViewSeat = (slug: string) => {
    setLocation(`/electoral-seat/${slug}`);
  };

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
          {popularSeats.map((seat) => (
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
                    <AvatarImage src={seat.mpImage} alt={seat.mpName} />
                    <AvatarFallback>
                      <User size={24} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{seat.mpName}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <PartyPopper className="h-3 w-3 mr-1 text-gray-400" />
                      {seat.mpParty}
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