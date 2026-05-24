import React, { useEffect, useRef, useState } from "react";
import { Coordinate } from "../types";

interface RwandaMapProps {
  pickup: Coordinate | null;
  destination: Coordinate | null;
  driverCoords: Coordinate | null;
  onMapClick: (lat: number, lng: number, mode: "pickup" | "destination") => void;
  clickMode: "pickup" | "destination";
  routeCoordinates?: Coordinate[];
  rideActive?: boolean;
}

export default function RwandaMap({
  pickup,
  destination,
  driverCoords,
  onMapClick,
  clickMode,
  routeCoordinates = [],
  rideActive = false
}: RwandaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  
  // Keep refs of markers and polylines to easily update them without re-creating the map
  const pickupMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  // Initialize leaf map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    const L = (window as any).L;
    if (!L) {
      console.warn("Leaflet (L) is not loaded on the window yet.");
      return;
    }

    // Standard Kigali center coordinates
    const defaultCenter = [-1.9441, 30.0619];
    
    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false
    });

    // Dark styled leaflet tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20
    }).addTo(map);

    // Click listener
    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      // Propagate clicked lat/lng
      onMapClick(lat, lng, clickMode);
    });

    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [clickMode]);

  // Update markers and paths dynamically when coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = (window as any).L;
    if (!L) return;

    // 1. Manage Pickup Marker
    if (pickup) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
      } else {
        const pickupIcon = L.divIcon({
          html: `<div class="relative flex items-center justify-center">
                  <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-75"></span>
                  <div class="h-4 w-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                    <span class="text-[8px] font-bold text-white font-sans">P</span>
                  </div>
                 </div>`,
          className: "custom-pickup-icon",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
          .addTo(map)
          .bindPopup(`<b>Pickup Point</b><br/>${pickup.name || 'Custom Coordinate'}`);
      }
    } else {
      if (pickupMarkerRef.current) {
        map.removeLayer(pickupMarkerRef.current);
        pickupMarkerRef.current = null;
      }
    }

    // 2. Manage Destination Marker
    if (destination) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      } else {
        const destIcon = L.divIcon({
          html: `<div class="relative flex items-center justify-center">
                  <div class="h-4 w-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                    <span class="text-[8px] font-bold text-white font-sans">D</span>
                  </div>
                 </div>`,
          className: "custom-dest-icon",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<b>Destination Point</b><br/>${destination.name || 'Custom Coordinate'}`);
      }
    } else {
      if (destMarkerRef.current) {
        map.removeLayer(destMarkerRef.current);
        destMarkerRef.current = null;
      }
    }

    // 3. Manage Driver Marker
    if (driverCoords) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverCoords.lat, driverCoords.lng]);
      } else {
        const driverIcon = L.divIcon({
          html: `<div class="relative flex items-center justify-center">
                  <span class="animate-pulse absolute inline-flex h-8 w-8 rounded-full bg-amber-400/30"></span>
                  <div class="h-6 w-6 bg-amber-400 rounded-lg border border-black flex items-center justify-center shadow-md text-sm">
                    🚕
                  </div>
                 </div>`,
          className: "custom-driver-icon",
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        driverMarkerRef.current = L.marker([driverCoords.lat, driverCoords.lng], { icon: driverIcon })
          .addTo(map)
          .bindPopup(`<b>Your Driver</b>`);
      }
    } else {
      if (driverMarkerRef.current) {
        map.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
      }
    }

    // 4. Manage Polyline Routing Path
    if (routeCoordinates && routeCoordinates.length > 0) {
      const isPaid = rideActive;
      const pathPoints = routeCoordinates.map(pt => [pt.lat, pt.lng]);
      
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(pathPoints);
        routePolylineRef.current.setStyle({
          color: isPaid ? "#818CF8" : "#94A3B8"
        });
      } else {
        routePolylineRef.current = L.polyline(pathPoints, {
          color: isPaid ? "#818CF8" : "#94A3B8",
          weight: 4,
          opacity: 0.8,
          dashArray: isPaid ? null : "5, 10" // Solid if paid, dashed if proposed model
        }).addTo(map);
      }
    } else {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
    }
  }, [pickup, destination, driverCoords, routeCoordinates, rideActive]);

  // Handle bounds fitting to show entire trip area nicely
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    const L = (window as any).L;
    if (!L) return;

    const points: any[] = [];
    if (pickup) points.push([pickup.lat, pickup.lng]);
    if (destination) points.push([destination.lat, destination.lng]);
    if (driverCoords) points.push([driverCoords.lat, driverCoords.lng]);

    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
    }
  }, [pickup, destination, rideActive]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-slate-950">
      {/* Container Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" id="leaflet-map-element"></div>
      
      {/* Dynamic Overlay Tag */}
      <div className="absolute top-3 right-3 z-10 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-350 flex items-center gap-1.5 shadow-lg select-none pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>OSRM CARTOGRAPHIC FEED ACTIVE</span>
      </div>
    </div>
  );
}
