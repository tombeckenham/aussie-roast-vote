import { memo } from "react";

interface AustraliaMapProps {
  onSeatSelect: (seatSlug: string) => void;
  seats: any[];
}

const AustraliaMap = memo(({ onSeatSelect, seats }: AustraliaMapProps) => {
  // This is a simplified Australia map
  return (
    <div className="text-center">
      <svg viewBox="0 0 800 600" className="w-full h-auto max-h-[250px]">
        {/* Base Australian continent shape */}
        <path
          d="M200,150 C300,100 400,50 500,100 C600,150 700,200 650,300 C600,400 500,500 400,450 C300,400 200,350 150,250 C100,150 150,180 200,150 Z"
          fill="#e6e6e6"
          stroke="#00843D"
          strokeWidth="2"
        />
        
        {/* Render circles for each seat */}
        {seats.map((seat) => {
          // Use position if provided, otherwise generate random position
          const x = seat.position?.x || Math.random() * 400 + 200;
          const y = seat.position?.y || Math.random() * 200 + 150;
          
          return (
            <circle
              key={seat.id}
              cx={x}
              cy={y}
              r="8"
              fill="#FFCD00"
              className="cursor-pointer hover:fill-cheeky-red"
              onClick={() => onSeatSelect(seat.slug)}
            >
              <title>{seat.name}, {seat.state}</title>
            </circle>
          );
        })}
        
        {/* Labels for states */}
        <text x="250" y="220" fill="#333" fontSize="14" fontWeight="bold">NSW</text>
        <text x="450" y="150" fill="#333" fontSize="14" fontWeight="bold">QLD</text>
        <text x="450" y="380" fill="#333" fontSize="14" fontWeight="bold">VIC</text>
        <text x="250" y="380" fill="#333" fontSize="14" fontWeight="bold">SA</text>
        <text x="150" y="250" fill="#333" fontSize="14" fontWeight="bold">WA</text>
        <text x="450" y="500" fill="#333" fontSize="14" fontWeight="bold">TAS</text>
      </svg>
      <p className="text-sm italic mt-2">Click on the map or search above</p>
    </div>
  );
});

AustraliaMap.displayName = "AustraliaMap";

export default AustraliaMap;
