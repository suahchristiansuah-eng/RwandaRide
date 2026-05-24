import React, { useState } from "react";
import { SystemNotification, Booking } from "../types";
import { Bell, ScanBarcode, Play, Volume2, VolumeX, Trash2, Calendar, Share2, CornerDownRight, CheckSquare } from "lucide-react";

interface NotificationCenterProps {
  notifications: SystemNotification[];
  clearNotifications: () => void;
  markAsRead: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  bookings: Booking[];
  cancelBooking: (bookingId: string) => void;
}

export default function NotificationCenter({
  notifications,
  clearNotifications,
  markAsRead,
  soundEnabled,
  setSoundEnabled,
  bookings,
  cancelBooking,
}: NotificationCenterProps) {
  const [activeBoardingPassId, setActiveBoardingPassId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activePass = bookings.find((b) => b.id === activeBoardingPassId) || bookings[0];

  const handleCopyPassLink = (passId: string) => {
    // Generate a simulated public URL
    const url = `${window.location.origin}/view-ticket/${passId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(passId);
      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    });
  };

  return (
    <div id="notification-and-tickets-area" className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* 1. NOTIFICATIONS LOG (COLS 5) */}
      <div id="notifications-feed-card" className="md:col-span-5 glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[350px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Bell className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Live Notification Feed</h3>
                <p className="text-[10px] text-slate-400 font-mono">Real-time telemetry and state logging</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound switcher */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
                className={`p-1.5 rounded transition-all cursor-pointer border ${
                  soundEnabled
                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300 animate-pulse"
                    : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-350"
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Clear button */}
              <button
                type="button"
                onClick={clearNotifications}
                disabled={notifications.length === 0}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-40 border border-white/10"
                title="Clear notification feeds"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List panel */}
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                No telemetry alerts yet.<br />Fences are running.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden backdrop-blur-xs ${
                    notif.read ? "bg-black/10 border-white/5 opacity-60" : "bg-black/25 border-white/10"
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        notif.type === "SUCCESS"
                          ? "bg-emerald-400"
                          : notif.type === "ALERT"
                          ? "bg-blue-400"
                          : notif.type === "WARNING"
                          ? "bg-amber-400"
                          : "bg-indigo-400"
                      }`}
                    />
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center w-full gap-2 font-mono">
                        <span className="text-[11px] font-semibold text-slate-200">{notif.title}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">{notif.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-white/10 text-[10px] font-mono text-slate-500">
          Geofencing alerts trigger automatically inside the browser frame on radius entry events.
        </div>
      </div>

      {/* 2. TICKET WALLET (COLS 7) */}
      <div id="booking-pass-wallet" className="md:col-span-7 glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <ScanBarcode className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Ticket Boarding Passes</h3>
                <p className="text-[10px] text-slate-400 font-mono">Secure digitized travel wallet</p>
              </div>
            </div>

            {/* List selectors of booked tickets */}
            {bookings.length > 1 && (
              <select
                value={activeBoardingPassId || ""}
                onChange={(e) => setActiveBoardingPassId(e.target.value)}
                className="bg-black/30 border border-white/10 rounded text-[11px] text-white px-2 py-1 max-w-[150px] outline-none font-medium"
              >
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id} className="bg-slate-900 text-white">
                    Pass {booking.id} ({booking.seatId})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ACTIVE TRAVEL TICKET REPRESENTATION */}
          {bookings.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-slate-505 text-slate-500 text-xs py-14 flex flex-col items-center justify-center gap-3">
              <ScanBarcode className="w-8 h-8 text-indigo-400 animate-pulse" />
              <span>No boarding passes issued. Submit a seat on the booking planner to issue tickets instantly.</span>
            </div>
          ) : (
            <div id="boarding-pass-visual" className="bg-gradient-to-br from-indigo-950/20 to-black/45 rounded-xl border border-dashed border-indigo-500/35 p-4 font-mono select-text text-xs text-slate-300 relative overflow-hidden backdrop-blur-md">
              
              {/* Ticket Watermark decoration overlay */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center select-none rotate-12 pointer-events-none">
                <span className="text-xs font-bold text-white/5">BOARDING</span>
              </div>

              {/* Ticket header */}
              <div className="flex justify-between items-start pb-3.5 border-b border-dashed border-white/10">
                <div>
                  <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">TRANSITRESERVE PASS</div>
                  <div className="text-[13px] text-white font-bold font-sans mt-0.5">BOARDING VOUCHER</div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-500 font-mono">REF NO.</span>
                  <strong className="block text-amber-400 font-bold">{activePass.id}</strong>
                </div>
              </div>

              {/* Ticket Fields Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 text-[11px]">
                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[9px] font-mono">NAME OF PASSENGER</span>
                  <span className="text-white font-sans font-semibold">{activePass.passengerName}</span>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-slate-500 block text-[9px]">ASSIGNED BUS</span>
                  <span className="text-emerald-400 font-bold">COACH {activePass.busNumber}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[9px]">SERVICE LINE</span>
                  <span className="text-indigo-300 text-[10px] leading-tight block">{activePass.routeName}</span>
                </div>
                <div className="space-y-0.5 text-right font-bold text-white">
                  <span className="text-slate-500 block text-[9px] font-normal">ROW SEAT ID</span>
                  <div className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded inline-block px-2.5 py-0.5">
                    🪑 {activePass.seatId}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[9px]">DATE / TIME</span>
                  <span className="text-slate-300 text-[10px]">Today, {activePass.departureTime}</span>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-slate-500 block text-[9px]">FARE PAID</span>
                  <span className="text-slate-300 font-sans font-semibold">${activePass.price.toFixed(2)}</span>
                </div>
              </div>

              {/* BARCODE LAYOUT */}
              <div id="ticket-barcodes" className="pt-3 border-t border-dashed border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* SVG Mock QR Code and Barcode */}
                <div className="flex items-center gap-3">
                  {/* QR SVG */}
                  <svg className="w-14 h-14 bg-white p-1 rounded-md shrink-0" viewBox="0 0 24 24">
                    {/* Generates standard complex QR-looking pattern */}
                    <path d="M1,1h6v6H1V1 M2,2h4v4H2V2 M17,1h6v6H17V1 M18,2h4v4H18V2 M1,17h6v6H1V17 M2,18h4v4H2V18 M10,3h4v4H10V3 M3,10h4v4H3V10 M10,10h11v2H10V10 M15,13h3v2H15V13 M20,15h3v2H20V15 M11,16h4v4H11V16 M18,18H23v2H18v-2 M18,21h5v1H18v-1" fill="#000" />
                  </svg>

                  {/* Simulated vertical barcode lines */}
                  <div className="space-y-0.5">
                    <div className="flex gap-0.5 h-6 opacity-85 select-none shrink-0 pointer-events-none">
                      {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2].map((w, idx) => (
                        <div
                          key={idx}
                          className="bg-white shrink-0"
                          style={{ width: `${w}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] text-slate-500 tracking-wider">SECURE-BOARDING*{activePass.id}*</span>
                  </div>
                </div>

                {/* Simulation controls */}
                <div className="flex flex-wrap gap-2 justify-end text-[10px]">
                  {/* Share ticket public view */}
                  <button
                    type="button"
                    onClick={() => handleCopyPassLink(activePass.id)}
                    className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-200 transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                  >
                    <Share2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    {copiedId === activePass.id ? "Link Copied!" : "Share / Public View"}
                  </button>

                  <button
                    type="button"
                    onClick={() => cancelBooking(activePass.id)}
                    className="px-2 py-1 bg-red-950/20 hover:bg-red-900/40 text-rose-300 rounded border border-rose-500/25 transition-all cursor-pointer"
                  >
                    Void Booking
                  </button>
                </div>

              </div>

            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 leading-normal pointer-events-none">
          <span className="flex items-center gap-1 text-slate-400 font-mono"><CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> Verified Pass</span>
          <span className="font-mono">Security hash: AIFR-9482X</span>
        </div>

      </div>

    </div>
  );
}
