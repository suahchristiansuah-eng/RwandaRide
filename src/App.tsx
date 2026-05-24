import React, { useState, useEffect, useRef } from "react";
import { Coordinate, RwandaDriver, RwandaRide, SystemNotification } from "./types";
import {
  getDistanceKm,
  getRwandaProvince,
  calculateRidePrice,
  RWANDA_PRESET_HUBS,
  REGISTERED_DRIVERS,
  PopularHub
} from "./simulationData";
import RwandaMap from "./components/RwandaMap";
import PaymentFrame from "./components/PaymentFrame";
import ArchitecturePanel from "./components/ArchitecturePanel";
import {
  Compass,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Terminal,
  ArrowRight,
  Search,
  Share2,
  Smartphone,
  CheckCircle2,
  Volume2,
  VolumeX,
  Clock,
  Coins,
  ShieldAlert,
  Loader2,
  BellRing,
  Award
} from "lucide-react";

// Synthentic audio cues trigger helper
function playSynthesizerCue(type: "click" | "assigned" | "arrived" | "payment") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === "assigned") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(560, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.27);
    } else if (type === "payment") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(680, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.37);
    } else if (type === "arrived") {
      osc.type = "sine";
      // Double success chime
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(698.46, ctx.currentTime + 0.12); // F5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.24); // A5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
      osc.start();
      osc.stop(ctx.currentTime + 0.57);
    }
  } catch (e) {
    console.warn("AudioContext playback blocked:", e);
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"booking" | "tracking" | "architecture">("booking");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tickerTime, setTickerTime] = useState("");

  // Coordinates select State
  const [pickup, setPickup] = useState<Coordinate | null>(null);
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [clickMode, setClickMode] = useState<"pickup" | "destination">("pickup");
  const [routePath, setRoutePath] = useState<Coordinate[]>([]);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // Dynamic values
  const [distanceKm, setDistanceKm] = useState(0);
  const [calculatedFare, setCalculatedFare] = useState<{
    priceRwf: number;
    pickupProvince: string;
    destProvince: string;
    ratePerKm: number;
  } | null>(null);

  // Drivers and matching status
  const [availableDrivers, setAvailableDrivers] = useState<RwandaDriver[]>(REGISTERED_DRIVERS);
  const [selectedDriver, setSelectedDriver] = useState<RwandaDriver | null>(null);
  const [matchingStatus, setMatchingStatus] = useState<"IDLE" | "REQUESTED" | "ACCEPTED">("IDLE");
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);

  // Passenger state details
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [showPaymentPortal, setShowPaymentPortal] = useState(false);

  // Active Rides Storage (All simulations runs inside memory)
  const [activeRide, setActiveRide] = useState<RwandaRide | null>(null);
  
  // Custom alerts triggers
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: "init",
      title: "Rwanda Transit Active",
      message: "GPS telemetry and automatic province geofencing rules compiled.",
      type: "INFO",
      timestamp: new Date().toISOString(),
      read: false
    }
  ]);
  const [trackingSearchToken, setTrackingSearchToken] = useState("");

  // Live driver route tracing animation state
  const [driverProgressIndex, setDriverProgressIndex] = useState(0);
  const [driverCurrentCoords, setDriverCurrentCoords] = useState<Coordinate | null>(null);
  const [remainingDistTracker, setRemainingDistTracker] = useState(0);
  const [etaMinutesTracker, setEtaMinutesTracker] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  
  // Simulation intervals reference
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // UTC background clock ticker
  useEffect(() => {
    const t = setInterval(() => {
      setTickerTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const triggerSound = (type: "click" | "assigned" | "arrived" | "payment") => {
    if (soundEnabled) {
      playSynthesizerCue(type);
    }
  };

  // Push custom notification feed
  const pushNotification = (title: string, message: string, type: "INFO" | "SUCCESS" | "WARNING" | "ALERT") => {
    const newNotif: SystemNotification = {
      id: "notif-" + Math.floor(100000 + Math.random() * 900000),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    // HTML5 Web Notifications integration fallback
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message });
    }
  };

  // Handle map clicks to set coordinates and calculate fares
  const handleMapClick = async (lat: number, lng: number, mode: "pickup" | "destination") => {
    triggerSound("click");

    // Approximated descriptive name helper using local reverse calculation
    const province = getRwandaProvince(lat, lng);
    const descriptiveName = `${province} Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    const newCoord: Coordinate = {
      lat,
      lng,
      name: descriptiveName
    };

    if (mode === "pickup") {
      setPickup(newCoord);
      // Switch click selection to destination automatically to ease user burden
      setClickMode("destination");
      
      // If we already have a destination, recalculate
      if (destination) {
        evaluateRouteAndPrices(newCoord, destination);
      }
    } else {
      setDestination(newCoord);
      if (pickup) {
        evaluateRouteAndPrices(pickup, newCoord);
      }
    }
  };

  // Set coordinate utilizing preset popular dropdown choices
  const applyPresetHub = (hub: PopularHub, mode: "pickup" | "destination") => {
    triggerSound("click");
    const coord: Coordinate = {
      lat: hub.lat,
      lng: hub.lng,
      name: hub.name
    };

    if (mode === "pickup") {
      setPickup(coord);
      setClickMode("destination");
      if (destination) evaluateRouteAndPrices(coord, destination);
    } else {
      setDestination(coord);
      if (pickup) evaluateRouteAndPrices(pickup, coord);
    }
  };

  // Fetch from the free OSRM Highway Routing Engine in real-time
  const evaluateRouteAndPrices = async (pCoord: Coordinate, dCoord: Coordinate) => {
    setIsRoutingLoading(true);
    let coords: Coordinate[] = [];
    let distanceValue = getDistanceKm(pCoord.lat, pCoord.lng, dCoord.lat, dCoord.lng);

    try {
      // Query project OSRM public router routing
      const url = `https://router.project-osrm.org/route/v1/driving/${pCoord.lng},${pCoord.lat};${dCoord.lng},${dCoord.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const geometry = data.routes[0].geometry;
          distanceValue = data.routes[0].distance / 1000; // meters to km
          
          coords = geometry.coordinates.map((item: [number, number]) => ({
            lat: item[1],
            lng: item[0]
          }));
        }
      }
    } catch {
      console.warn("OSRM throttle, falling back to straight-line interpolation nodes");
    }

    // Direct line fallback if routing blocked or failed
    if (coords.length === 0) {
      const stepsCount = 30;
      for (let i = 0; i <= stepsCount; i++) {
        const f = i / stepsCount;
        coords.push({
          lat: pCoord.lat + (dCoord.lat - pCoord.lat) * f,
          lng: pCoord.lng + (dCoord.lng - pCoord.lng) * f
        });
      }
    }

    setRoutePath(coords);
    setDistanceKm(distanceValue);
    
    // Automatic province pricing rule triggers
    const pricing = calculateRidePrice(pCoord.lat, pCoord.lng, dCoord.lat, dCoord.lng, distanceValue);
    setCalculatedFare(pricing);
    setIsRoutingLoading(false);

    // Filter available drivers closest to Rwanda pickup location centroids
    const matchedDrivers = REGISTERED_DRIVERS.map(driver => {
      // Distances of potential driver vehicles to passenger
      const distToPassenger = getDistanceKm(driver.coords.lat, driver.coords.lng, pCoord.lat, pCoord.lng);
      return {
        ...driver,
        status: "AVAILABLE" as const
      };
    });
    setAvailableDrivers(matchedDrivers);
    
    // Clear out any stale selection
    setSelectedDriver(null);
    setMatchingStatus("IDLE");
  };

  // Request driver accept pickup request
  const requestDriverAccept = (driver: RwandaDriver) => {
    triggerSound("click");
    setSelectedDriver(driver);
    setIsMatchingLoading(true);

    // Simulates the driver checking their mobile dispatch terminal and accepting 
    setTimeout(() => {
      setIsMatchingLoading(false);
      setMatchingStatus("ACCEPTED");
      triggerSound("assigned");
      pushNotification(
        "DRIVER ASSIGNED",
        `${driver.name} accepted your booking request! Registered email: ${driver.email}`,
        "SUCCESS"
      );
    }, 1500);
  };

  // Create booking details and deploy payment portal modal
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName || !passengerPhone || !pickup || !destination || !selectedDriver || !calculatedFare) return;
    
    triggerSound("click");
    setShowPaymentPortal(true);
  };

  // Mobile money settlement completed. Spawn tracking vectors.
  const handlePaymentCompleted = (txRef: string) => {
    triggerSound("payment");
    setShowPaymentPortal(false);

    // Compile active RwandaRide details block
    const rideToken = "rw-track-" + Math.floor(10000 + Math.random() * 90000);
    const initiatedRide: RwandaRide = {
      id: "RIDE-" + Math.floor(100000 + Math.random() * 900000),
      pickupCoords: pickup!,
      destCoords: destination!,
      pickupName: pickup!.name,
      destName: destination!.name,
      provincePickup: calculatedFare!.pickupProvince,
      provinceDest: calculatedFare!.destProvince,
      distanceKm: distanceKm,
      ratePerKm: calculatedFare!.ratePerKm,
      priceRwf: calculatedFare!.priceRwf,
      passengerName,
      passengerPhone,
      driverId: selectedDriver!.id,
      driverName: selectedDriver!.name,
      driverEmail: selectedDriver!.email,
      driverPhone: selectedDriver!.phone,
      trackingToken: rideToken,
      status: "PAID",
      driverCoords: selectedDriver!.coords, // Initial location: driver spot
      paymentStatus: "COMPLETED",
      paymentReference: txRef
    };

    setActiveRide(initiatedRide);
    pushNotification(
      "RIDE INITIATED",
      `System assigned driver ${selectedDriver?.name}. SMS confirmation transmitted to ${passengerPhone}.`,
      "SUCCESS"
    );

    // Switch view to public tracker pane
    setTrackingSearchToken(rideToken);
    setActiveTab("tracking");

    // Initiate Driver crawling simulation ticks
    startLiveDriverSimulation(initiatedRide);
  };

  // Live simulation looping utilizing Socket.io-like telemetry states
  const startLiveDriverSimulation = (ride: RwandaRide) => {
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    
    // Let's create the full driving itinerary path.
    // Leg 1: Driver moves from their current location to the Passenger Pickup.
    // Leg 2: Driver boards customer, and travels from Passenger Pickup to Destination.
    
    const driverOrigin = ride.driverCoords;
    const passengerPickup = ride.pickupCoords;
    const finalDestination = ride.destCoords;
    
    let leg1Path: Coordinate[] = [];
    let leg2Path: Coordinate[] = [];

    // Simple routing calculation helpers
    const stepsLeg1 = 15;
    for (let i = 0; i <= stepsLeg1; i++) {
      const f = i / stepsLeg1;
      leg1Path.push({
        lat: driverOrigin.lat + (passengerPickup.lat - driverOrigin.lat) * f,
        lng: driverOrigin.lng + (passengerPickup.lng - driverOrigin.lng) * f
      });
    }

    // Use road math routePath we fetched if available, otherwise linear interpolate
    if (routePath.length > 0) {
      leg2Path = routePath;
    } else {
      const stepsLeg2 = 25;
      for (let i = 0; i <= stepsLeg2; i++) {
        const f = i / stepsLeg2;
        leg2Path.push({
          lat: passengerPickup.lat + (finalDestination.lat - passengerPickup.lat) * f,
          lng: finalDestination.lng + (finalDestination.lng - passengerPickup.lng) * f
        });
      }
    }

    // Combine both legs into a structured itinerary list
    // Each step represents a 3-second Socket broadcast ticker
    interface ItineraryNode {
      coords: Coordinate;
      leg: "EN_ROUTE_TO_PICKUP" | "EN_ROUTE_TO_DESTINATION";
      remainingDist: number;
    }

    const itinerary: ItineraryNode[] = [];
    
    // Append Leg 1 nodes
    leg1Path.forEach((pt, idx) => {
      const distRemaining = getDistanceKm(pt.lat, pt.lng, passengerPickup.lat, passengerPickup.lng);
      itinerary.push({
        coords: pt,
        leg: "EN_ROUTE_TO_PICKUP",
        remainingDist: distRemaining
      });
    });

    // Append Leg 2 nodes
    leg2Path.forEach((pt, idx) => {
      const distRemaining = getDistanceKm(pt.lat, pt.lng, finalDestination.lat, finalDestination.lng);
      itinerary.push({
        coords: pt,
        leg: "EN_ROUTE_TO_DESTINATION",
        remainingDist: distRemaining
      });
    });

    setDriverProgressIndex(0);
    setDriverCurrentCoords(itinerary[0].coords);
    setRemainingDistTracker(itinerary[0].remainingDist);
    setEtaMinutesTracker(Math.ceil(itinerary[0].remainingDist * 1.8));

    setTelemetryLogs([
      `[${new Date().toLocaleTimeString()}] [Socket.io] Established secure link on room:track:${ride.trackingToken}`,
      `[${new Date().toLocaleTimeString()}] [Socket.io] Registered mock telemetry broadcaster: ${ride.driverEmail}`,
      `[${new Date().toLocaleTimeString()}] [GPS] Dispatcher matching confirmed. Leg 1: En-Route to Passenger coordinates.`
    ]);

    let currentIndex = 0;
    let hasAlertedArrival = false;

    // Simulation ticker looping - updates every 3 seconds
    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex >= itinerary.length) {
        clearInterval(interval);
        setActiveRide(prev => prev ? { ...prev, status: "COMPLETED" } : null);
        setTelemetryLogs(prev => [
          `[${new Date().toLocaleTimeString()}] [GPS] Final destination arrived. Booking session completed.`,
          ...prev
        ]);
        pushNotification(
          "DESTINATION ARRIVED",
          `Transit completed. Thank you for travelling with TransitReserve!`,
          "SUCCESS"
        );
        return;
      }

      const node = itinerary[currentIndex];
      setDriverProgressIndex(currentIndex);
      setDriverCurrentCoords(node.coords);
      setRemainingDistTracker(node.remainingDist);
      setEtaMinutesTracker(Math.max(1, Math.ceil(node.remainingDist * 1.8)));

      // Update parent ride variables state
      setActiveRide(prev => {
        if (!prev) return null;
        const mappedStatus = node.leg === "EN_ROUTE_TO_PICKUP" ? "EN_ROUTE_TO_PICKUP" : "BOARDED";
        return {
          ...prev,
          status: mappedStatus as any,
          driverCoords: node.coords
        };
      });

      // Logging output
      setTelemetryLogs(prev => [
        `[${new Date().toLocaleTimeString()}] [Socket.io] Ticker broadcast from driver's GPS node: (${node.coords.lat.toFixed(5)}, ${node.coords.lng.toFixed(5)})`,
        `[${new Date().toLocaleTimeString()}] [GPS] Leg: ${node.leg} | Dist: ${node.remainingDist.toFixed(2)} km | ETA: ${Math.max(1, Math.ceil(node.remainingDist * 1.8))} min`,
        ...prev
      ]);

      // GEOFENCING arrival detector: When Leg 1 remaining distance drops below 100 meters (0.10 km)
      if (node.leg === "EN_ROUTE_TO_PICKUP" && node.remainingDist <= 0.12 && !hasAlertedArrival) {
        hasAlertedArrival = true;
        triggerSound("arrived");
        
        // Display browser alert fallbacks
        if (soundEnabled) {
          try {
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          } catch {}
        }

        pushNotification(
          "DRIVER ARRIVED",
          `YOUR DRIVER HAS ARRIVED! ${ride.driverName} is waiting for you at the pickup location.`,
          "ALERT"
        );

        // Display browser alert explicitly if tracking window is hidden
        alert("🚨 YOUR DRIVER HAS ARRIVED at your pickup coordinates in Rwanda!");
      }

    }, 3000);

    simulationIntervalRef.current = interval;
  };

  // Manual Trigger Force driverarrival bypass
  const forceDriverArrivalSim = () => {
    if (!activeRide) return;
    triggerSound("arrived");
    pushNotification(
      "DRIVER ARRIVED (MANUAL BYPASS)",
      `YOUR DRIVER HAS ARRIVED! Driver manually triggered arrival from vehicle terminal.`,
      "ALERT"
    );
    alert("🚨 YOUR DRIVER HAS ARRIVED (Bypassed from steering wheels terminal)!");
  };

  // Destroy tracking simulation on page navigation unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  // Use current browser geolocation API to snap pickup point
  const handleUseMyLocation = () => {
    triggerSound("click");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Verify inside Rwanda boundaries (approx -2.9 to -1.0 latitude, 28.8 to 30.9 longitude)
          const isInsideRwanda = latitude > -3.0 && latitude < -1.0 && longitude > 28.5 && longitude < 31.0;
          
          if (isInsideRwanda) {
            handleMapClick(latitude, longitude, "pickup");
            pushNotification("GPS Synced", "Accurately localized coordinate inside Rwanda.", "INFO");
          } else {
            // Apply downtown Kigali center default as friendly placeholder but alert user
            handleMapClick(-1.9441, 30.0619, "pickup");
            pushNotification(
              "Default Position applied",
              "Retrieved GPS coordinates outside Rwanda boundaries. Pinned central Kigali instead.",
              "WARNING"
            );
          }
        },
        (err) => {
          console.warn("Geolocation failure, using Kigali center default:", err);
          handleMapClick(-1.9441, 30.0619, "pickup");
        }
      );
    } else {
      handleMapClick(-1.9441, 30.0619, "pickup");
    }
  };

  // Reset booking system state
  const handleResetWorkflow = () => {
    triggerSound("click");
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    setActiveRide(null);
    setPickup(null);
    setDestination(null);
    setRoutePath([]);
    setDistanceKm(0);
    setCalculatedFare(null);
    setSelectedDriver(null);
    setMatchingStatus("IDLE");
    setPassengerName("");
    setPassengerPhone("");
    setClickMode("pickup");
  };

  // Search filter query parameter matching
  const viewableRide = activeRide;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      
      {/* GLOBAL LIVE FEED METRIC CARDS OVERLAY */}
      <div className="bg-white/[0.02] backdrop-blur-md border-b border-white/10 px-4 py-2 text-xs flex flex-wrap justify-between items-center gap-4 shadow-sm select-none">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-indigo-505 bg-indigo-500 animate-pulse" />
          <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">RWANDA SATELLITE CORE</span>
          <span className="text-slate-600 font-light">|</span>
          <span className="text-slate-350">Passenger geocoding dispatch network active</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono select-none">
          <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5 text-slate-400">
            <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>suahchristiansuah@gmail.com</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                triggerSound("click");
              }}
              className={`p-1 rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center cursor-pointer border ${
                soundEnabled
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-300"
                  : "bg-white/5 border-transparent text-slate-500"
              }`}
              title={soundEnabled ? "Mute audio feedbacks" : "Unmute audio feedbacks"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* PRIMARY APPLICATION NAVIGATION HEADER */}
      <header className="px-6 py-4 bg-white/[0.03] backdrop-blur-md border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg border border-white/15">
            <Compass className="w-6 h-6 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5 font-sans">
              TransitReserve <span className="text-[10px] font-mono font-normal tracking-wide bg-indigo-950/60 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded">Rwanda</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">GIS spatial routing, dynamic RWF fares, and public live tracking</p>
          </div>
        </div>

        {/* Global tab switches */}
        <nav className="flex bg-black/35 border border-white/10 p-0.5 rounded-lg text-xs backdrop-blur-sm shadow-inner shrink-0" aria-label="Main tabs">
          <button
            onClick={() => {
              setActiveTab("booking");
              triggerSound("click");
            }}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "booking" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Book Ride
          </button>
          <button
            onClick={() => {
              setActiveTab("tracking");
              triggerSound("click");
            }}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "tracking" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-450" /> Live Tracker
          </button>
          <button
            onClick={() => {
              setActiveTab("architecture");
              triggerSound("click");
            }}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "architecture" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-500" /> Schema & Snippets
          </button>
        </nav>
      </header>

      {/* CORE CONTENT LAYOUT */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* TAB 1: PASSENGER BOOKING WORKFLOW */}
        {activeTab === "booking" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* COLUMN LEFT: INTERACTIVE MAP (7 COLS) */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div className="glass-panel rounded-2xl p-4 flex-1 flex flex-col gap-3 min-h-[460px]">
                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold">Interactive Rwanda Cartography</span>
                  </div>

                  {/* Click instructions selector toggle */}
                  <div className="flex gap-1 bg-black/45 p-0.5 rounded border border-white/10 font-mono text-[9.5px]">
                    <button
                      type="button"
                      onClick={() => setClickMode("pickup")}
                      className={`px-2 py-1 rounded text-[10px] cursor-pointer transition-all ${
                        clickMode === "pickup" ? "bg-emerald-500/10 text-emerald-300 font-bold" : "text-slate-500"
                      }`}
                    >
                      Set Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => setClickMode("destination")}
                      className={`px-2 py-1 rounded text-[10px] cursor-pointer transition-all ${
                        clickMode === "destination" ? "bg-rose-500/15 text-rose-300 font-bold" : "text-slate-500"
                      }`}
                    >
                      Set Dest
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <RwandaMap
                    pickup={pickup}
                    destination={destination}
                    driverCoords={activeRide ? activeRide.driverCoords : null}
                    onMapClick={handleMapClick}
                    clickMode={clickMode}
                    routeCoordinates={routePath}
                    rideActive={activeRide !== null}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-650/10 hover:bg-indigo-650/30 text-indigo-300 border border-indigo-505 border-indigo-500/30 hover:border-indigo-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Compass className="w-4 h-4 text-indigo-400 animate-spin-slow shrink-0" />
                    Use My Location (GPS Verification)
                  </button>

                  <div className="flex-1 select-none pointer-events-none bg-black/30 px-3 py-2 border border-white/5 rounded-xl text-[10.5px] text-slate-400 font-mono leading-tight flex items-center justify-center">
                    <span>💡 Pro-Tip: Tap map spots directly to relocate pins on the fly.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN RIGHT: PANELS SIDEBAR (5 COLS) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* STEP 1: ROUTING COORDINATES PANEL */}
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-505/20">
                    <Compass className="w-4.5 h-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-indigo-400">
                      Step 1: Locations & Province
                    </h3>
                    <p className="text-[10px] text-slate-400">Set route coordinates in Rwanda</p>
                  </div>
                </div>

                {/* Preset Hub selectors selectors */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block mb-1">PRESET PASSENGER PICKUP Hub:</span>
                      <select
                        onChange={(e) => {
                          const h = RWANDA_PRESET_HUBS.find(x => x.id === e.target.value);
                          if (h) applyPresetHub(h, "pickup");
                        }}
                        className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white w-full outline-none"
                        value={pickup ? RWANDA_PRESET_HUBS.find(x => x.name === pickup.name)?.id || "" : ""}
                      >
                        <option value="">Select Pickup Spot...</option>
                        {RWANDA_PRESET_HUBS.map(h => (
                          <option key={h.id} value={h.id} className="bg-slate-900">{h.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block mb-1">PRESET PASSENGER DESTINATION Hub:</span>
                      <select
                        onChange={(e) => {
                          const h = RWANDA_PRESET_HUBS.find(x => x.id === e.target.value);
                          if (h) applyPresetHub(h, "destination");
                        }}
                        className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white w-full outline-none"
                        value={destination ? RWANDA_PRESET_HUBS.find(x => x.name === destination.name)?.id || "" : ""}
                      >
                        <option value="">Select Destination...</option>
                        {RWANDA_PRESET_HUBS.map(h => (
                          <option key={h.id} value={h.id} className="bg-slate-900">{h.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Geocoding display vectors */}
                  {pickup && (
                    <div className="bg-black/30 rounded-xl p-3.5 space-y-2 border border-white/5 text-xs">
                      <div className="flex gap-2 items-start">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 font-mono block uppercase">PICKUP SOURCE COORDINATES</span>
                          <strong className="text-white text-xs leading-snug">{pickup.name}</strong>
                          <span className="inline-block bg-emerald-500/10 text-emerald-400 text-[10px] tracking-wider px-1.5 py-0.5 rounded font-bold uppercase mt-1">
                            {getRwandaProvince(pickup.lat, pickup.lng)}
                          </span>
                        </div>
                      </div>

                      {destination && (
                        <>
                          <div className="h-px bg-white/5 my-2"></div>
                          <div className="flex gap-2 items-start">
                            <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] text-slate-500 font-mono block uppercase">DESTINATION COORDINATES</span>
                              <strong className="text-white text-xs leading-snug">{destination.name}</strong>
                              <span className="inline-block bg-rose-500/10 text-rose-400 text-[10px] tracking-wider px-1.5 py-0.5 rounded font-bold uppercase mt-1">
                                {getRwandaProvince(destination.lat, destination.lng)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Pricing dynamics preview box */}
                  {pickup && destination && calculatedFare && (
                    <div className="bg-gradient-to-br from-indigo-950/20 to-black/45 rounded-xl border border-indigo-400/25 p-4 space-y-3 font-sans">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-slate-400">Total Route Distance:</span>
                          <span className="text-white font-mono font-bold block">{distanceKm.toFixed(2)} KM</span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-slate-400">ETA:</span>
                          <span className="text-white font-mono font-bold block">
                            {isRoutingLoading ? "Evaluating curves..." : `~ ${Math.max(1, Math.round(distanceKm * 1.5))} mins`}
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-white/5"></div>

                      <div className="flex justify-between items-center bg-black/20 p-2.5 rounded border border-white/5 text-xs font-mono">
                        <div>
                          <span className="text-slate-500 text-[9px]">COMPUTED TRANSIT RATE:</span>
                          <span className="text-white block font-bold text-xs">
                            {calculatedFare.ratePerKm} RWF / KM
                          </span>
                          {calculatedFare.ratePerKm === 51.8 ? (
                            <span className="text-[9px] text-amber-400 block mt-0.5 leading-normal">
                              ⚠️ Kigali → Province pricing applied
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500 block mt-0.5 leading-normal">
                              Same province rate applied
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 block">TOTAL FARE:</span>
                          <span className="text-lg font-bold text-amber-500 font-mono font-black">
                            {new Intl.NumberFormat("en-US").format(calculatedFare.priceRwf)} RWF
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: CHOOSE REGISTERED DRIVER MATCHING */}
              {pickup && destination && calculatedFare && (
                <div className="glass-panel rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-505/20">
                      <Terminal className="w-4.5 h-4.5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-indigo-400">
                        Step 2: Allocate Driver
                      </h3>
                      <p className="text-[10px] text-slate-400">Contact drivers with registered emails</p>
                    </div>
                  </div>

                  {matchingStatus === "IDLE" && (
                    <div className="space-y-2.5">
                      <span className="text-[9.5px] text-slate-400 font-mono uppercase block">ACTIVE DRIVER REGISTRY IN THE REGION:</span>
                      
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {availableDrivers.map(dr => (
                          <div
                            key={dr.id}
                            className="p-3 bg-black/35 hover:bg-black/55 rounded-xl border border-white/5 flex items-center justify-between text-xs transition-all"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <strong className="text-white">{dr.name}</strong>
                                <span className="bg-amber-500/10 whitespace-nowrap text-amber-400 text-[9px] font-bold px-1 rounded">
                                  ★ {dr.rating}
                                </span>
                              </div>
                              <span className="text-[10px] text-indigo-400 font-mono block select-all">{dr.email}</span>
                              <span className="text-[9px] text-slate-500 block font-sans">{dr.vehicleModel}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => requestDriverAccept(dr)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-650/20 hover:bg-indigo-650 text-indigo-300 hover:text-white font-semibold text-[10.5px] text-xs transition-all cursor-pointer border border-indigo-500/30"
                            >
                              Tell Pickup
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isMatchingLoading && (
                    <div className="py-6 flex flex-col items-center justify-center gap-2 text-center text-xs">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                      <span className="text-slate-400">Notifying driver via registered system email...</span>
                    </div>
                  )}

                  {matchingStatus === "ACCEPTED" && selectedDriver && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold font-sans">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>Driver Matches Confirmed!</span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px] text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">DRIVER EMAIL:</span>
                          <span className="text-emerald-300 font-bold">{selectedDriver.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ASSIGNED VEHICLE:</span>
                          <span className="text-white">{selectedDriver.vehicleModel} ({selectedDriver.vehicleNo})</span>
                        </div>
                      </div>

                      <div className="h-px bg-white/5"></div>

                      {/* STEP 3: SUBMIT PASSENGER DETAILS FORM */}
                      <form onSubmit={handleDetailsSubmit} className="space-y-3 pt-1">
                        <span className="text-[9.5px] text-slate-400 font-mono block uppercase">ENTER REGISTERED RESERVATION DETAILS:</span>
                        
                        <div className="space-y-2">
                          <div>
                            <label className="text-[9px] font-mono text-slate-500 block mb-0.5 uppercase">PASSENGER NAME</label>
                            <input
                              type="text"
                              value={passengerName}
                              onChange={(e) => setPassengerName(e.target.value)}
                              placeholder="e.g. Mugisha Christian"
                              className="w-full bg-black/45 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-white outline-none focus:border-indigo-400/50"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-mono text-slate-500 block mb-0.5 uppercase">MOBILE PHONE (FOR CONFIRMATION SMS)</label>
                            <input
                              type="tel"
                              value={passengerPhone}
                              onChange={(e) => setPassengerPhone(e.target.value)}
                              placeholder="e.g. +250 788 112 233"
                              className="w-full bg-black/45 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-white outline-none focus:border-indigo-400/50"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-550 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1 border border-white/10"
                        >
                          <Coins className="w-4 h-4 text-amber-300" /> Confirm & Pay {new Intl.NumberFormat("en-US").format(calculatedFare.priceRwf)} RWF
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE PUBLIC TRACKING VIEW (NO AUTH REQUIRED) */}
        {activeTab === "tracking" && (
          <div className="animate-fade-in space-y-6">
            
            {/* PUBLIC SEARCH TOKEN BAR */}
            <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-2 items-center">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">Public Passenger Tracker Gate</h3>
                  <p className="text-[10px] text-slate-400">Visual passwordless ride updates via unique short URLs</p>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Enter Tracking Token (e.g. rw-track-1234)"
                  value={trackingSearchToken}
                  onChange={(e) => setTrackingSearchToken(e.target.value)}
                  className="bg-black/45 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none uppercase font-mono w-full md:w-[260px]"
                />
                <button
                  onClick={() => {
                    triggerSound("click");
                    if (viewableRide && trackingSearchToken.trim().toLowerCase() === viewableRide.trackingToken.toLowerCase()) {
                      pushNotification("Ride resolved", "Public ride telemetries linked successfully.", "INFO");
                    } else {
                      pushNotification("Ride query mismatch", "Active token record not found.", "WARNING");
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shrink-0 cursor-pointer"
                >
                  Query Link
                </button>
              </div>
            </div>

            {viewableRide && trackingSearchToken.toLowerCase().trim() === viewableRide.trackingToken.toLowerCase() ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* PUBLIC GIS MAP OVERLAY (COL 7) */}
                <div className="lg:col-span-7 h-full flex flex-col">
                  <div className="glass-panel p-4 rounded-2xl flex-1 flex flex-col gap-3 min-h-[440px]">
                    <div className="flex justify-between items-center bg-black/35 p-2 rounded-lg border border-white/5 text-xs font-mono">
                      <span className="text-slate-400">Live Telemetry Map Stream:</span>
                      <strong className="text-emerald-400 animate-pulse font-bold flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                        DRIVING COORDINATES BROADCASTING
                      </strong>
                    </div>

                    <div className="flex-1">
                      <RwandaMap
                        pickup={viewableRide.pickupCoords}
                        destination={viewableRide.destCoords}
                        driverCoords={driverCurrentCoords || viewableRide.driverCoords}
                        onMapClick={() => {}}
                        clickMode="pickup"
                        routeCoordinates={routePath}
                        rideActive={true}
                      />
                    </div>

                    {/* Shared tracking clipboard button */}
                    <div className="flex justify-between items-center pt-2 gap-4 text-xs font-mono">
                      <span className="text-slate-450 text-[10px] text-slate-500 select-all">
                        Public link: http://ais-dev.gov.rw/track/{viewableRide.trackingToken}
                      </span>
                      <button
                        onClick={() => {
                          triggerSound("click");
                          navigator.clipboard.writeText(`${window.location.origin}/track/${viewableRide.trackingToken}`);
                          pushNotification("Copied", "Public passwordless tracking link copied.", "SUCCESS");
                          alert("📋 Public link copied to clipboard! Anyone can track your driver real-time with zero authentication.");
                        }}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded flex items-center gap-1 text-[11.5px] cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share / Copy Link
                      </button>
                    </div>
                  </div>
                </div>

                {/* TRACKING DETAILS DASHBOARD (COL 5) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="glass-panel rounded-2xl p-6 space-y-4">
                    
                    {/* Active Driver Profile */}
                    <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                      <div className="w-11 h-11 bg-indigo-650 rounded-xl bg-black/20 flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                        👤
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{viewableRide.driverName}</h4>
                        <span className="text-[10px] bg-indigo-505/20 text-indigo-400 border border-indigo-500/20 px-1 py-0.5 rounded font-mono block w-fit mt-0.5">
                          {viewableRide.driverEmail}
                        </span>
                      </div>
                    </div>

                    {/* Vehicle details */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-350">
                        <span>Assigned Vehicle:</span>
                        <strong className="text-white">{viewableRide.vehicleModel}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-350">
                        <span>Plate License:</span>
                        <strong className="text-amber-400 font-mono text-sm">{selectedDriver?.vehicleNo}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-350">
                        <span>Rides Price Due:</span>
                        <strong className="text-emerald-400 font-mono font-bold">
                          {new Intl.NumberFormat("en-US").format(viewableRide.priceRwf)} RWF
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-350">
                        <span>Payment Status:</span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-emerald-500/15">
                          Success PAID
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-white/5"></div>

                    {/* Ride Tracking telemetry states HUD */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                        <span className="text-[9px] text-slate-500 font-mono block">REMAINING DISTANCE</span>
                        <strong className="text-white text-base font-mono block tracking-tight">
                          {remainingDistTracker.toFixed(2)} KM
                        </strong>
                      </div>

                      <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                        <span className="text-[9px] text-slate-500 font-mono block">DYNAMIC LIVE ETA</span>
                        <strong className="text-amber-400 text-base font-mono block tracking-tight">
                          {etaMinutesTracker} min
                        </strong>
                      </div>
                    </div>

                    {/* Active Leg indicators */}
                    <div className="p-3.5 bg-indigo-500/5 rounded-xl border border-indigo-500/20 text-xs text-slate-300">
                      <div className="flex gap-2 items-center">
                        <Clock className="w-5 h-5 text-indigo-400 shrink-0 select-none" />
                        <div>
                          <span className="text-[9px] text-indigo-400 font-mono block uppercase">RIDE STATE PROGRESS</span>
                          {viewableRide.status === "PAID" && (
                            <strong className="text-white font-semibold">Payment Confirmed. Driver arranging steering gears...</strong>
                          )}
                          {viewableRide.status === "EN_ROUTE_TO_PICKUP" && (
                            <strong className="text-indigo-200 font-semibold animate-pulse">🚗 Driver is driving towards your PICKUP point!</strong>
                          )}
                          {viewableRide.status === "BOARDED" && (
                            <strong className="text-emerald-400 font-semibold">📍 Passenger Boarded! Traveling to DESTINATION...</strong>
                          )}
                          {viewableRide.status === "COMPLETED" && (
                            <strong className="text-slate-400 font-semibold">🏁 Trip completed. Thank you!</strong>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Simulators bypass buttons */}
                    <div className="h-px bg-white/5"></div>
                    <div className="space-y-2">
                      <button
                        onClick={forceDriverArrivalSim}
                        className="w-full py-2 bg-indigo-650/20 hover:bg-indigo-650 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all border border-indigo-500/30 text-center"
                      >
                         Bypass Sim: Force Driver Arrival 🚨
                      </button>
                      <button
                        onClick={handleResetWorkflow}
                        className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-100 rounded-lg text-[11px] font-medium cursor-pointer transition-all text-center"
                      >
                        Reset / Book Another Ride
                      </button>
                    </div>

                    {/* Mobile Sockets Logs HUD */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-500 font-mono font-bold block">SOCKET.IO BROADCAST TERMINAL</span>
                      <div className="bg-black/60 border border-white/5 rounded-xl p-3 h-[120px] overflow-y-auto font-mono text-[9px] text-emerald-400 space-y-1 scrollbar-thin select-text">
                        {telemetryLogs.map((log, i) => (
                          <div key={i} className="leading-snug truncate">{log}</div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-slate-500 text-xs py-20 flex flex-col items-center justify-center gap-3 bg-black/15">
                <ShieldAlert className="w-10 h-10 text-indigo-400 animate-pulse" />
                <h4 className="text-sm font-bold text-white">No Public Tracker Linked</h4>
                <p className="max-w-md mx-auto text-slate-400">
                  Submit a ride reservation inside the **Book Ride** tab. After Mobile Money payment clearance, the public tracking room link generates here automatically.
                </p>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: DEVELOPER ARCHITECTURE CONSOLE */}
        {activeTab === "architecture" && (
          <div className="animate-fade-in text-slate-300">
            <ArchitecturePanel />
          </div>
        )}

      </main>

      {/* POPUP: MOBILE MONEY AUTHENTICATIONS FRAME */}
      {showPaymentPortal && calculatedFare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-text">
          <PaymentFrame
            amountRwf={calculatedFare.priceRwf}
            passengerPhone={passengerPhone}
            passengerName={passengerName}
            onPaymentSuccess={handlePaymentCompleted}
            onCancel={() => setShowPaymentPortal(false)}
          />
        </div>
      )}

      {/* FIXED FOOTER */}
      <footer className="px-6 py-4 bg-white/[0.01] backdrop-blur-md border-t border-white/10 text-center text-xs text-slate-500 font-mono">
        <p>© 2026 TransitReserve GIS Network Operations • Rwanda National Transport Authority Licensed</p>
      </footer>

    </div>
  );
}
