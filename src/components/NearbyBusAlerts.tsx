import React, { useState } from "react";
import { Bus, Coordinate } from "../types";
import { getDistanceKm } from "../simulationData";
import { Radar, Bell, BellOff, MapPin, Gauge, Shuffle, Sliders, Info } from "lucide-react";

interface NearbyBusAlertsProps {
  buses: Bus[];
  userLocation: Coordinate;
  detectionRadiusKm: number;
  setDetectionRadiusKm: (radius: number) => void;
  subscribedBuses: string[];
  toggleSubscription: (busId: string) => void;
  trafficFactor: number;
  setTrafficFactor: (factor: number) => void;
  audioFeedback: (type: "click" | "success" | "notification") => void;
}

export default function NearbyBusAlerts({
  buses,
  userLocation,
  detectionRadiusKm,
  setDetectionRadiusKm,
  subscribedBuses,
  toggleSubscription,
  trafficFactor,
  setTrafficFactor,
  audioFeedback,
}: NearbyBusAlertsProps) {
  // Compute calculated values for each bus
  const calculatedBuses = buses.map((bus) => {
    const distance = getDistanceKm(
      userLocation.lat,
      userLocation.lng,
      bus.coords.lat,
      bus.coords.lng
    );

    const isInsideRange = distance <= detectionRadiusKm;

    // ETA = (Distance in km / Speed in km/h) * 60 minutes * trafficFactor
    // Avoid division by zero
    const speed = bus.speed > 0 ? bus.speed : 25;
    const rawEta = (distance / speed) * 60 * trafficFactor;
    const etaMinutes = Math.max(1, Math.round(rawEta));

    return {
      ...bus,
      distanceKm: distance,
      isInsideRange,
      etaMinutes,
    };
  }).sort((a,b) => a.distanceKm - b.distanceKm); // Sort nearest first

  const activeBusesInsideRange = calculatedBuses.filter((b) => b.isInsideRange);

  return (
    <div id="nearby-bus-module" className="glass-panel rounded-2xl p-6 shadow-xl flex flex-col h-full justify-between">
      <div>
        {/* Module Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/25 relative">
              <Radar className="w-5 h-5 text-sky-400 animate-pulse-slow" />
              {activeBusesInsideRange.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-[10px] font-bold text-slate-905 text-slate-900 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {activeBusesInsideRange.length}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-sans tracking-tight">Geofence Bus Radar</h2>
              <p className="text-xs text-slate-400">Proximity tracking & autonomous ETA alerts</p>
            </div>
          </div>
        </div>

        {/* CONTROLS CARD */}
        <div className="bg-black/25 border border-white/5 p-3.5 rounded-xl space-y-4 mb-4 backdrop-blur-sm shadow-inner">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Geo-tracking configurations</span>
          </div>

          {/* Slider for radius threshold */}
          <div>
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-slate-300">Detection Radius:</span>
              <span className="text-sky-400 font-bold">{(detectionRadiusKm * 1000).toFixed(0)}m ({(detectionRadiusKm).toFixed(1)} km)</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="3.0"
              step="0.1"
              value={detectionRadiusKm}
              onChange={(e) => {
                setDetectionRadiusKm(parseFloat(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Traffic conditions toggle buttons */}
          <div>
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-slate-300">Live Traffic Factor:</span>
              <span className="text-amber-400 font-semibold text-[11px]">
                {trafficFactor === 1.0 ? "Light (1.0x)" : trafficFactor === 1.4 ? "Moderate (1.4x)" : "Heavy (2.2x)"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Light", val: 1.0, color: "hover:border-emerald-500 hover:text-emerald-300" },
                { label: "Moderate", val: 1.4, color: "hover:border-amber-500 hover:text-amber-300" },
                { label: "Heavy", val: 2.2, color: "hover:border-rose-500 hover:text-rose-300" },
              ].map((tf) => (
                <button
                  key={tf.label}
                  type="button"
                  onClick={() => {
                    setTrafficFactor(tf.val);
                    audioFeedback("click");
                  }}
                  className={`py-1 text-xs font-medium rounded border transition-all cursor-pointer ${
                    trafficFactor === tf.val
                      ? "bg-white/10 border-white/20 text-white font-semibold shadow-sm"
                      : `bg-black/20 border-white/5 text-slate-400 ${tf.color}`
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NEARBY BUS CARDS */}
        <h3 className="text-xs font-semibold text-slate-300 mb-2 font-sans">Active Fleet Status (Sorted by proximity)</h3>
        <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
          {calculatedBuses.map((bus) => {
            const isSubscribed = subscribedBuses.includes(bus.id);
            return (
              <div
                key={bus.id}
                className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-2.5 backdrop-blur-sm ${
                  bus.isInsideRange
                    ? "bg-indigo-500/10 border-indigo-500/35 shadow-sm"
                    : "bg-black/15 border-white/5"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-slate-200 font-semibold">
                      Coach {bus.busNumber}
                    </span>
                    <span className="text-xs font-medium text-slate-250 text-slate-200">{bus.routeName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-red-500 text-red-400" />
                      <span>{bus.distanceKm.toFixed(2)} km away</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-1">
                      <Gauge className="w-3 h-3 text-emerald-450 text-emerald-400" />
                      <span>{bus.speed} km/h</span>
                    </div>
                  </div>
                </div>

                {/* Right block: ETA and Alert Bell subscription */}
                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 font-mono">ETA</span>
                    <span
                      className={`text-xs font-bold leading-none ${
                        bus.isInsideRange ? "text-emerald-400 text-sm font-extrabold" : "text-white/80"
                      }`}
                    >
                      {bus.etaMinutes} min
                    </span>
                  </div>

                  {/* Subscription alert toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleSubscription(bus.id);
                      audioFeedback("click");
                    }}
                    title={isSubscribed ? "Mute range alerts" : "Mute/Unmute real-time geofence alerts"}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSubscribed
                        ? "bg-emerald-550/10 bg-emerald-500/10 border-emerald-500/30 text-emerald-305 text-emerald-300"
                        : "bg-black/20 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20"
                    }`}
                  >
                    {isSubscribed ? <Bell className="w-3.5 h-3.5 text-emerald-400" /> : <BellOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Warning */}
      <div className="mt-4 flex gap-2 items-start bg-black/25 p-2.5 rounded-lg border border-white/5 text-[11px] text-slate-400 pointer-events-none backdrop-blur-sm">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <span>
          Buses move dynamically around the circuit in real-time. Subscribing to coach alerts will deploy a notify ban when they cross your fence.
        </span>
      </div>
    </div>
  );
}
