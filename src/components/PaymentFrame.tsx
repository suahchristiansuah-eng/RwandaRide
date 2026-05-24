import React, { useState } from "react";
import { CreditCard, Wallet, Smartphone, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";

interface PaymentFrameProps {
  amountRwf: number;
  passengerPhone: string;
  passengerName: string;
  onPaymentSuccess: (reference: string) => void;
  onCancel: () => void;
}

export default function PaymentFrame({
  amountRwf,
  passengerPhone,
  passengerName,
  onPaymentSuccess,
  onCancel
}: PaymentFrameProps) {
  const [provider, setProvider] = useState<"MTN" | "AIRTEL">("MTN");
  const [pinCode, setPinCode] = useState("");
  const [step, setStep] = useState<"METHOD" | "PAYING" | "SUCCESS">("METHOD");
  const [loading, setLoading] = useState(false);

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length < 4) return;
    
    setLoading(true);
    setStep("PAYING");
    
    // Simulate mobile money USSD prompt and payment routing timer
    setTimeout(() => {
      setLoading(false);
      setStep("SUCCESS");
      const generatedRef = "REF-" + Math.floor(100000 + Math.random() * 900000);
      
      // Delay callback slightly to let user celebrate the animation
      setTimeout(() => {
        onPaymentSuccess(generatedRef);
      }, 1500);
    }, 2000);
  };

  const formattedAmount = new Intl.NumberFormat("en-US").format(amountRwf);

  return (
    <div className="glass-panel-heavy rounded-2xl p-6 shadow-2xl border border-white/10 max-w-md w-full mx-auto space-y-6">
      {/* Step titles */}
      <div className="text-center">
        <h2 className="text-sm font-semibold tracking-wider font-mono text-indigo-400 uppercase">
          SECURE RIDE PAYMENT PORTAL
        </h2>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Authorized transit gateway for Rwanda
        </p>
      </div>

      {step === "METHOD" && (
        <div className="space-y-4">
          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
            <span className="text-[10px] text-slate-500 font-mono block">TRANSACTION SUMMARY</span>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Passenger Passenger Name:</span>
              <span className="text-white font-semibold">{passengerName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Phone Identifier:</span>
              <span className="text-white font-mono">{passengerPhone}</span>
            </div>
            <div className="h-px bg-white/5 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Total Price Due:</span>
              <span className="text-lg text-amber-400 font-extrabold font-mono">
                {formattedAmount} RWF
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 block font-sans">
              Choose your payment network:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider("MTN")}
                className={`p-3.5 rounded-xl border font-sans text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  provider === "MTN"
                    ? "bg-amber-500/10 border-amber-400 text-amber-200"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#FCB813] flex items-center justify-center text-black font-extrabold text-[10px]">
                  MTN
                </div>
                <div className="text-center">
                  <span className="block font-bold">MTN MoMo</span>
                  <span className="text-[9px] text-amber-400/70 font-mono">Immediate Push</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider("AIRTEL")}
                className={`p-3.5 rounded-xl border font-sans text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  provider === "AIRTEL"
                    ? "bg-rose-500/15 border-rose-500 text-rose-200"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-extrabold text-[10px]">
                  airtel
                </div>
                <div className="text-center">
                  <span className="block font-bold">Airtel Money</span>
                  <span className="text-[9px] text-rose-400/70 font-mono">Secure Token</span>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handlePaySubmit} className="space-y-3 pt-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Enter Mobile Money PIN (4-digit simulation):
              </label>
              <input
                type="password"
                maxLength={4}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full text-center tracking-widest text-lg font-mono py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-indigo-400/50"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl font-medium text-xs bg-white/5 hover:bg-white/15 text-slate-300 border border-white/5 transition-all cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={pinCode.length < 4}
                className="flex-1 py-2.5 rounded-xl font-medium text-xs bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg border border-white/10 transition-all cursor-pointer"
              >
                Approve Payment ({formattedAmount} RWF)
              </button>
            </div>
          </form>

          <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1 leading-normal">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            End-to-end encrypted under Rwanda National Telecom Rules
          </p>
        </div>
      )}

      {step === "PAYING" && (
        <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
          <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">
              Securing Mobilized Telemetries...
            </h3>
            <p className="text-xs text-slate-400 max-w-[280px]">
              Sending secure USSD request to matching carrier network. Please authorize the popup prompt if it appears.
            </p>
          </div>
        </div>
      )}

      {step === "SUCCESS" && (
        <div className="py-8 flex flex-col items-center justify-center gap-4 text-center animate-pulse">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-base text-emerald-400 font-bold font-sans">
              RWF PAYMENT COMPLETED
            </h3>
            <p className="text-xs text-slate-300">
              Transaction successfully settled.
            </p>
            <p className="text-[10px] font-mono text-slate-500 mt-2">
              Reference code cataloged. Loading tracker interface...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
