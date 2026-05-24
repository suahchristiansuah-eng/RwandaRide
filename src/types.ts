export interface Coordinate {
  lat: number;
  lng: number;
  name?: string;
}

export interface BusStop extends Coordinate {
  id: string;
  name: string;
}

export interface Route {
  id: string;
  name: string;
  color: string;
  stops: BusStop[];
  path: Coordinate[]; // Coordinates of points defining the route path for interpolation
}

export enum BusStatus {
  STANDBY = "STANDBY",
  EN_ROUTE = "EN_ROUTE",
  DELAYED = "DELAYED",
  COMPLETED = "COMPLETED"
}

export interface Bus {
  id: string;
  routeId: string;
  routeName: string;
  busNumber: string;
  capacity: number;
  coords: Coordinate;
  speed: number; // in km/h
  status: BusStatus;
  currentStopIndex: number;
  targetStopIndex: number;
  progressBetweenStops: number; // 0 to 1
  driverName: string;
}

export enum SeatStatus {
  AVAILABLE = "AVAILABLE",
  OCCUPIED = "OCCUPIED",
  SELECTED = "SELECTED"
}

export enum SeatType {
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
  ACCESSIBLE = "ACCESSIBLE"
}

export interface Seat {
  id: string;
  label: string;
  status: SeatStatus;
  type: SeatType;
  price: number;
}

export interface Booking {
  id: string;
  passengerName: string;
  passengerEmail: string;
  routeId: string;
  routeName: string;
  busId: string;
  busNumber: string;
  seatId: string;
  seatLabel: string;
  bookingTime: string;
  departureTime: string;
  price: number;
  status: "CONFIRMED" | "CANCELLED";
  qrCodeValue: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ALERT";
  timestamp: string;
  read: boolean;
}

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

export interface RwandaRide {
  id: string;
  pickupCoords: Coordinate;
  destCoords: Coordinate;
  pickupName?: string;
  destName?: string;
  provincePickup: string;
  provinceDest: string;
  distanceKm: number;
  ratePerKm: number;
  priceRwf: number;
  passengerName: string;
  passengerPhone: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverPhone: string;
  trackingToken: string;
  status: "REQUESTED" | "ACCEPTED" | "PAID" | "EN_ROUTE_TO_PICKUP" | "BOARDED" | "ARRIVED" | "COMPLETED";
  driverCoords: Coordinate;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
  paymentReference: string;
}
