import React, { useState } from "react";
import { Terminal, Database, Code, BookOpen, ShieldCheck, Clipboard, Check } from "lucide-react";

export default function ArchitecturePanel() {
  const [activeSubTab, setActiveSubTab] = useState<"plan" | "schema" | "snippets">("plan");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const triggerCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const dbSchemaSQL = `-- PostgreSQL + PostGIS Ride-Hailing Catalog Schema
-- Requires: CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE ride_status AS ENUM (
  'REQUESTED', 'ACCEPTED', 'PAID', 'EN_ROUTE_TO_PICKUP', 'BOARDED', 'ARRIVED', 'COMPLETED'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING', 'COMPLETED', 'FAILED'
);

CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Spatial location nodes (using Geography for sub-meter distance accuracy)
  pickup_coords GEOGRAPHY(Point, 4326) NOT NULL,
  dest_coords GEOGRAPHY(Point, 4326) NOT NULL,
  
  -- Geocoded descriptive addresses
  pickup_name VARCHAR(255),
  dest_name VARCHAR(255),
  
  -- Detected spatial administrative provinces
  province_pickup VARCHAR(100) NOT NULL,
  province_dest VARCHAR(100) NOT NULL,
  
  -- Numeric metrics calculated dynamically
  distance_km NUMERIC(8, 2) NOT NULL,
  price_rwf INT NOT NULL,
  rate_per_km NUMERIC(6, 2) NOT NULL,
  
  -- Passenger details (Public workflow - passwordless alerts)
  passenger_name VARCHAR(150) NOT NULL,
  passenger_phone VARCHAR(50) NOT NULL,
  
  -- Registered driver allocations
  driver_id VARCHAR(100) NOT NULL,
  driver_coords GEOGRAPHY(Point, 4326),
  
  -- Non-auth public tracking references
  tracking_token VARCHAR(255) UNIQUE NOT NULL,
  status ride_status DEFAULT 'REQUESTED' NOT NULL,
  
  -- Financial clearance tracking
  payment_status payment_status DEFAULT 'PENDING' NOT NULL,
  payment_reference VARCHAR(150) UNIQUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for spatial querying optimization and ultra-fast bounding geofences (GIST)
CREATE INDEX idx_rides_pickup_spatial ON rides USING GIST (pickup_coords);
CREATE INDEX idx_rides_driver_spatial ON rides USING GIST (driver_coords);
CREATE INDEX idx_rides_tracking_token ON rides (tracking_token);`;

  const codeSnippets = {
    mapClick: `// Map click coordinates capturer (Frontend Hook using Pure Leaflet)
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  
  // Update state with clicked coordinates
  setCoordinates((prev) => ({
    ...prev,
    [currentInputMode]: {
      lat,
      lng,
      name: \`Map Location (\${lat.toFixed(4)}, \${lng.toFixed(4)})\`
    }
  }));
});`,
    provinceCheck: `/**
 * Province detection using Nominatim Reverse Geocoding API with local coordinate bounding fallback
 */
async function detectProvince(lat, lng) {
  try {
    const response = await fetch(
      \`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=\${lat}&lon=\${lng}\`
    );
    const data = await response.json();
    
    // Scan Nominatim addresses for province or state naming values
    const state = data.address?.state || data.address?.region || data.address?.state_district;
    if (state) {
      return state; // e.g., "Kigali Province", "Northern Province"
    }
  } catch (error) {
    console.warn("Nominatim service throttled, applying local bounding fallback");
  }
  
  // Local high-fidelity centroid fallback approximation for Rwanda provinces
  if (lat > -2.05 && lat < -1.88 && lng > 29.96 && lng < 30.18) {
    return "Kigali Province";
  }
  if (lng >= 30.16) return "Eastern Province";
  if (lat >= -1.75 && lng >= 29.5) return "Northern Province";
  if (lng < 29.52) return "Western Province";
  return "Southern Province";
}`,
    priceCalc: `/**
 * Strict pricing rule: 
 * If pickup is Kigali Province and destination is in another province -> 51.8 RWF per km.
 * All other cases (Kigali to Kigali, or outer provinces to either same or another province) -> 41.8 RWF per km.
 */
function calculateFare(pickupProv, destProv, distanceKm) {
  let rate = 41.8; // Default rate per KM
  
  if (pickupProv === "Kigali Province" && destProv !== "Kigali Province") {
    rate = 51.8;
  }
  
  return {
    rate,
    totalPrice: Math.round(distanceKm * rate)
  };
}`,
    trackingLink: `// Generator for secure, public, un-authenticated real-time tracking links
function createTrackingLink(rideId) {
  // Generate a random high-entropy tracking token
  const hashToken = crypto.randomBytes(16).toString("hex");
  
  // Save ride state linking the token in the DB
  await db.query("UPDATE rides SET tracking_token = $1 WHERE id = $2", [hashToken, rideId]);
  
  // Return passenger tracking link
  return \`\${process.env.APP_BASE_URL}/track/\${hashToken}\`;
}`,
    socketBroadcaster: `// Node.JS Backend - Socket.io coordinate streaming telemetry
io.on("connection", (socket) => {
  console.log("Telemetry node connected:", socket.id);
  
  // Driver updates coordinates every 3-5 seconds
  socket.on("driver:telemetry:update", async (payload) => {
    const { trackingToken, lat, lng, remainingDistance, eta } = payload;
    
    // 1. Persist new location in database asynchronously
    await db.query(
      "UPDATE rides SET driver_coords = ST_SetSRID(ST_Point($1, $2), 4326) WHERE tracking_token = $3",
      [lng, lat, trackingToken]
    );
    
    // 2. Broadcast to all clients viewing that public tracking room
    io.to(\`room:track:\${trackingToken}\`).emit("tracker:telemetry:broadcast", {
      lat,
      lng,
      remainingDistance,
      eta,
      timestamp: new Date()
    });
  });
});`,
    socketSubscriber: `// Frontend - WebSocket public tracking stream client
import { io } from "socket.io-client";

function subscribeToDriver(trackingToken, onUpdate) {
  const socket = io(process.env.VITE_WEBSOCKET_URL || "/");
  
  // Join specific ride channel room without loginauth
  socket.emit("join-room", \`room:track:\${trackingToken}\`);
  
  socket.on("tracker:telemetry:broadcast", (data) => {
    console.log("Telemetry ping:", data);
    onUpdate({
      driverCoords: { lat: data.lat, lng: data.lng },
      remainingDistance: data.remainingDistance,
      eta: data.eta
    });
  });

  return () => socket.disconnect();
}`,
    notifications: `// Web Announcement Notification triggers
function notifyArrival(driverName) {
  const title = "YOUR DRIVER HAS ARRIVED! 🚕";
  const body = \`\${driverName} is waiting for you at your designated pickup point.\`;
  
  // 1. In-App visual audio cues
  playNotificationSound();
  
  // 2. HTML5 Web Notification API implementation (background alert fallback)
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/taxi-icon.png" });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body });
        }
      });
    }
  }
}`
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100 font-sans tracking-tight">
              Developer Architecture Console
            </h2>
            <p className="text-xs text-slate-400">
              Technical specifications, database geometry schemas, and system code snippets
            </p>
          </div>
        </div>

        {/* Sub tab navigation */}
        <div className="flex bg-black/35 border border-white/10 p-0.5 rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveSubTab("plan")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "plan" ? "bg-indigo-600/80 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Plan
          </button>
          <button
            onClick={() => setActiveSubTab("schema")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "schema" ? "bg-indigo-600/80 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5 inline mr-1" /> Schema (SQL)
          </button>
          <button
            onClick={() => setActiveSubTab("snippets")}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeSubTab === "snippets" ? "bg-indigo-600/80 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5 inline mr-1" /> Code Snippets
          </button>
        </div>
      </div>

      {activeSubTab === "plan" && (
        <div className="space-y-4">
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 text-xs space-y-2 leading-relaxed text-slate-300">
            <h3 className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs font-sans">
              <ShieldCheck className="w-4 h-4" /> Comprehensive Implementation Guide (Kigali Province Scope)
            </h3>
            <p>
              This full-stack system tracks active drivers moving along GIS coordinates towards passengers in Rwanda, updating clients in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 bg-black/25 p-4 rounded-xl border border-white/5 text-xs">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <span className="w-5 h-5 bg-indigo-600/40 border border-indigo-400/50 rounded-full flex items-center justify-center text-[10px] font-mono text-indigo-200">1</span>
                Project Initialization
              </h4>
              <ul className="space-y-2 list-disc pl-4 text-slate-400 leading-normal">
                <li>Create Node.js, Express, and React projects with TypeScript.</li>
                <li>Provision a PostgreSQL database and install the <strong>PostGIS</strong> geographic extension for native spatial calculations.</li>
                <li>Configure the system environment using <code className="text-white font-mono bg-white/5 px-1 rounded">dotenv</code> for secure secrets storage.</li>
              </ul>

              <h4 className="font-bold text-white flex items-center gap-1.5 pt-2">
                <span className="w-5 h-5 bg-indigo-600/40 border border-indigo-400/50 rounded-full flex items-center justify-center text-[10px] font-mono text-indigo-200">2</span>
                Geography & OSRM Engine
              </h4>
              <ul className="space-y-2 list-disc pl-4 text-slate-400 leading-normal">
                <li>Integrate <strong>Leaflet.js</strong> maps mapped around Kigali, Rwanda.</li>
                <li>Query the free public OSRM API to fetch driving geometries in latitude/longitude point coordinates between vectors.</li>
                <li>Apply dynamic distance calculations representing realistic, streetgrade traffic and delays.</li>
              </ul>
            </div>

            <div className="space-y-3 bg-black/25 p-4 rounded-xl border border-white/5 text-xs">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <span className="w-5 h-5 bg-indigo-600/40 border border-indigo-400/50 rounded-full flex items-center justify-center text-[10px] font-mono text-indigo-200">3</span>
                Real-Time Sockets Channels
              </h4>
              <ul className="space-y-2 list-disc pl-4 text-slate-400 leading-normal">
                <li>Configure <strong>Socket.io</strong> server-side listeners bound to specific tracking tokens.</li>
                <li>The driver app pushes cellular coordinate updates every 3 seconds to the server.</li>
                <li>The server broadcasts that coordinate telemetry immediately to all connected clients listening on the tracking room.</li>
              </ul>

              <h4 className="font-bold text-white flex items-center gap-1.5 pt-2">
                <span className="w-5 h-5 bg-indigo-600/40 border border-indigo-400/50 rounded-full flex items-center justify-center text-[10px] font-mono text-indigo-200">4</span>
                Alerts & Security Gateways
              </h4>
              <ul className="space-y-2 list-disc pl-4 text-slate-400 leading-normal">
                <li>Write a point-in-polygon database spatial query using PostGIS (<code className="text-white font-mono">ST_DWithin</code>) to track when the driver enters within 100 meters of the customer's coordinate.</li>
                <li>Trigger high-volume push requests to the browser's native Notification API immediately upon distance entry.</li>
                <li>Process payments securely off-thread via MTN MoMo API webhooks before deploying the vehicle.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "schema" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-black/30 p-2 border-b border-white/10">
            <span className="text-xs font-mono text-slate-400">PostgreSQL + PostGIS - RIDES TABLE SCHEMA</span>
            <button
              onClick={() => triggerCopy("schema-sql", dbSchemaSQL)}
              className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/45 text-indigo-300 font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-all border border-indigo-500/20"
            >
              {copiedId === "schema-sql" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Clipboard className="w-3 h-3" /> Copy SQL
                </>
              )}
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[10.5px] overflow-auto max-h-[300px] leading-relaxed select-text border border-white/5">
            {dbSchemaSQL}
          </pre>
        </div>
      )}

      {activeSubTab === "snippets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-1.5 flex flex-col font-sans">
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase mb-2">SELECT API FILE:</span>
            {[
              { id: "mapClick", label: "Leaflet Map Click Capture" },
              { id: "provinceCheck", label: "Province Reverse Geocoding" },
              { id: "priceCalc", label: "Fare Calculation Logic" },
              { id: "trackingLink", label: "Tracking Link Generation" },
              { id: "socketBroadcaster", label: "Socket.io Server Telemetry" },
              { id: "socketSubscriber", label: "Socket.io Client Subscription" },
              { id: "notifications", label: "Browser Notifications API" }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSubTab(`snippets-view-${s.id}` as any)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  activeSubTab.replace("snippets-view-", "") === s.id
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-sans"
                    : "bg-white/5 border-transparent text-slate-400 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 space-y-3">
            {(() => {
              const currentSnippetName = activeSubTab.includes("snippets-view-")
                ? activeSubTab.replace("snippets-view-", "")
                : "mapClick";
              
              const codeText = codeSnippets[currentSnippetName as keyof typeof codeSnippets];

              return (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-black/40 p-2 border-b border-white/10">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      FILE SNIPPET: {currentSnippetName}.ts
                    </span>
                    <button
                      onClick={() => triggerCopy(currentSnippetName, codeText)}
                      className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/45 text-indigo-300 font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-all border border-indigo-500/20"
                    >
                      {copiedId === currentSnippetName ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Clipboard className="w-3 h-3" /> Copy Snippet
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 text-indigo-300 border border-white/5 rounded-xl font-mono text-[10.5px] overflow-auto max-h-[300px] leading-relaxed select-text">
                    {codeText}
                  </pre>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Dynamic ETA Calculation block */}
      <div className="bg-black/25 p-4 rounded-xl border border-white/5 text-[11px] font-mono text-slate-400 leading-relaxed">
        <strong className="text-white font-sans text-xs flex items-center gap-1 mb-1">
          ⚙️ Live ETA & Dynamic Route Calculations (The Math)
        </strong>
        <span>
          Dynamic ETA (minutes) is evaluated constantly at 3-second intervals. Remaining distances are calculated utilizing real-time GPS coordinate telemetry nodes with the Haversine equation:
          <br />
          <code className="text-emerald-400 mt-1.5 block">
            d = 2R * asin( sqrt( sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlng/2) ) )
          </code>
          <br />
          The ETA is calculated as <code className="text-emerald-400">ETA = (Remaining Distance / Driving Speed multiplier) * Traffic Factor</code>. In production, this calculates along the active OSRM street coordinates, triggering the 100m geofence event when the remaining driving distance drops inside <code className="text-white font-bold">0.10 km</code>.
        </span>
      </div>
    </div>
  );
}
