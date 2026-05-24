import { Coordinate } from "./types";

// Standard Haversine distance formula in KM
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Automatic Rwanda Province classification based on precise coordinates
export function getRwandaProvince(lat: number, lng: number): string {
  // Rough bounding coordinates checks for Rwandan provinces
  // Kigali Province (Capital) is in the center, typically between lat -2.03 and -1.86, and lng 29.98 and 30.17
  if (lat > -2.05 && lat < -1.88 && lng > 29.96 && lng < 30.18) {
    return "Kigali Province";
  }
  // Eastern Province is generally everything east of 30.16
  if (lng >= 30.16) {
    return "Eastern Province";
  }
  // Northern Province is north of lat -1.75
  if (lat >= -1.75 && lng >= 29.5) {
    return "Northern Province";
  }
  // Western Province: everything west of lng 29.52
  if (lng < 29.52) {
    return "Western Province";
  }
  // Southern Province: everything else (south and southwest)
  return "Southern Province";
}

// Price calculation function implementing the strict RWF pricing rules
// Kigali Province to any other province: 51.8 RWF per km
// All other cases (including same province Kigali->Kigali or outer provinces): 41.8 RWF per km
export function calculateRidePrice(
  pickupLat: number,
  pickupLng: number,
  destLat: number,
  destLng: number,
  distanceKm: number
): {
  priceRwf: number;
  pickupProvince: string;
  destProvince: string;
  ratePerKm: number;
} {
  const pickupProv = getRwandaProvince(pickupLat, pickupLng);
  const destProv = getRwandaProvince(destLat, destLng);
  
  let ratePerKm = 41.8; // Default rate
  if (pickupProv === "Kigali Province" && destProv !== "Kigali Province") {
    ratePerKm = 51.8;
  }
  
  // Calculate price and round to nearest RWF
  const priceRwf = Math.round(distanceKm * ratePerKm);
  
  return {
    priceRwf,
    pickupProvince: pickupProv,
    destProvince: destProv,
    ratePerKm
  };
}

// Popular geographic hubs across Rwanda for easy select searches
export interface PopularHub {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  description: string;
}

export const RWANDA_PRESET_HUBS: PopularHub[] = [
  {
    id: "kigali-nyabugogo",
    name: "Nyabugogo Bus Terminal (Kigali)",
    province: "Kigali Province",
    lat: -1.9392,
    lng: 30.0446,
    description: "Central national transit terminal center in Kigali"
  },
  {
    id: "kigali-downtown",
    name: "Kigali Downtown Hub (Chic Mall)",
    province: "Kigali Province",
    lat: -1.9441,
    lng: 30.0619,
    description: "Business central business district of Kigali city"
  },
  {
    id: "kigali-airport",
    name: "Kigali International Airport (Kanombe)",
    province: "Kigali Province",
    lat: -1.9630,
    lng: 30.1350,
    description: "Gateway Airport complex in Kigali"
  },
  {
    id: "musanze-town",
    name: "Musanze Town Bus Park",
    province: "Northern Province",
    lat: -1.5037,
    lng: 29.6350,
    description: "Northern Province focal terminal, volcano gate"
  },
  {
    id: "rubavu-gisenyi",
    name: "Gisenyi Bus Terminal (Rubavu)",
    province: "Western Province",
    lat: -1.7022,
    lng: 29.2565,
    description: "Lakeside terminal border with DRC, Western Province"
  },
  {
    id: "huye-town",
    name: "Huye (Butare) Bus Park",
    province: "Southern Province",
    lat: -2.5967,
    lng: 29.7394,
    description: "Historic university town bus park, Southern Province"
  },
  {
    id: "muhanga-station",
    name: "Muhanga Center Bus Terminal",
    province: "Southern Province",
    lat: -2.0800,
    lng: 29.7600,
    description: "Core intersection point linking South to Kigali"
  },
  {
    id: "rwamagana-town",
    name: "Rwamagana Bus Park",
    province: "Eastern Province",
    lat: -1.9487,
    lng: 30.4347,
    description: "Eastern Province strategic transport hub"
  },
  {
    id: "nyagatare-town",
    name: "Nyagatare Bus Terminal",
    province: "Eastern Province",
    lat: -1.2986,
    lng: 30.3245,
    description: "Northern-Eastern strategic agricultural hub terminal"
  },
  {
    id: "kibuye-karongi",
    name: "Karongi (Kibuye) lakeside",
    province: "Western Province",
    lat: -2.0620,
    lng: 29.3524,
    description: "Scenic Lake Kivu western terminal"
  }
];

export interface RwandaDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleNo: string;
  vehicleModel: string;
  rating: number;
  coords: Coordinate;
  status: "AVAILABLE" | "ACCEPTED" | "EN_ROUTE_TO_PICKUP" | "BOARDED" | "ARRIVED";
}

// Preset registered drivers in Kigali & provinces with professional profile structures
export const REGISTERED_DRIVERS: RwandaDriver[] = [
  {
    id: "dr-jean",
    name: "Jean-Paul Habimana",
    email: "jean.paul@transit.rw",
    phone: "+250 788 123 456",
    vehicleNo: "RAA 411 C",
    vehicleModel: "Toyota Corolla (Silver)",
    rating: 4.9,
    coords: { lat: -1.9410, lng: 30.0520 }, // Near Nyabugogo
    status: "AVAILABLE"
  },
  {
    id: "dr-claudine",
    name: "Claudine Mutoni",
    email: "claudine.mutoni@transit.rw",
    phone: "+250 782 987 654",
    vehicleNo: "RAB 520 D",
    vehicleModel: "Toyota RAV4 (Dark Grey)",
    rating: 4.85,
    coords: { lat: -1.9560, lng: 30.1250 }, // Near Kanombe Airport
    status: "AVAILABLE"
  },
  {
    id: "dr-gasana",
    name: "Emmanuel Gasana",
    email: "gasana.e@transit.rw",
    phone: "+250 786 523 001",
    vehicleNo: "RAE 905 A",
    vehicleModel: "Hyundai Elantra (White)",
    rating: 4.75,
    coords: { lat: -1.5050, lng: 29.6380 }, // Near Musanze
    status: "AVAILABLE"
  },
  {
    id: "dr-aimee",
    name: "Aimeé Uwase",
    email: "uwase.aimee@transit.rw",
    phone: "+250 783 114 882",
    vehicleNo: "RAC 810 Y",
    vehicleModel: "Toyota Avanza (Gold XL)",
    rating: 4.92,
    coords: { lat: -2.0600, lng: 29.3500 }, // Near West Lake Kivu (Karongi)
    status: "AVAILABLE"
  },
  {
    id: "dr-shema",
    name: "Eric Shema",
    email: "shema.eric@transit.rw",
    phone: "+250 789 663 331",
    vehicleNo: "RAD 140 Z",
    vehicleModel: "Volkswagen Polo (Deep Blue)",
    rating: 4.8,
    coords: { lat: -1.9460, lng: 30.4310 }, // Near Rwamagana
    status: "AVAILABLE"
  }
];
