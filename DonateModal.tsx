import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  DollarSign,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  History,
  CreditCard,
  X,
  Loader2,
  Gift
} from "lucide-react";
import { supabase } from "../supabaseClient";

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  currentUserId?: string;
}

export const DonateModal: React.FC<DonateModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = "",
  currentUserId = "anonymous"
}) => {
  const [activeTab, setActiveTab] = useState<"donate" | "history">("donate");
  
  // Form State
  const [selectedPreset, setSelectedPreset] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donorName, setDonorName] = useState<string>("Learner Supporter");
  const [donorEmail, setDonorEmail] = useState<string>(currentUserEmail || "");
  const [message, setMessage] = useState<string>("Keep up the great work with Puceal!");
  
  // Process State
  const [step, setStep] = useState<"form" | "checkout" | "success">("form");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<{
    transactionId: string;
    amount: number;
    status: string;
    qrCodeUrl?: string;
    stripeCheckoutUrl?: string;
  } | null>(null);
  
  // History State
  const [donationsHistory, setDonationsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Computed total donation amount
  const finalAmount = customAmount ? parseFloat(customAmount) : selectedPreset;

  useEffect(() => {
    if (currentUserEmail) {
      setDonorEmail(currentUserEmail);
    }
  }, [currentUserEmail]);

  useEffect(() => {
    if (isOpen && activeTab === "history") {
      fetchDonationHistory();
    }
  }, [isOpen, activeTab]);

  // Check URL params when modal opens to verify return from Stripe Checkout
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isSuccess = params.get("donate_success") === "true";
      const sessionId = params.get("session_id");
      const txId = params.get("tx_id");

      if (isSuccess && (sessionId || txId)) {
        fetch(`/api/donate/verify-session?session_id=${encodeURIComponent(sessionId || "")}&tx_id=${encodeURIComponent(txId || "")}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setCurrentTransaction({
                transactionId: data.transactionId || txId || "DON-STRIPE",
                amount: finalAmount || 10,
                status: "success"
              });
              setStep("success");
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch((err) => console.warn("Stripe verification error:", err));
      }
    }
  }, [isOpen]);

  // Poll status during checkout
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "checkout" && currentTransaction?.transactionId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/donate/status/${currentTransaction.transactionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
              setStep("success");
            }
          }
        } catch (e) {
          console.error("Status check error", e);
        }
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [step, currentTransaction]);

  const fetchDonationHistory = async () => {
    setLoadingHistory(true);
    try {
      // 1. Try server endpoint
      const res = await fetch(`/api/donate/history/${encodeURIComponent(currentUserId || "anonymous")}`);
      if (res.ok) {
        const data = await res.json();
        if (data.donations && data.donations.length > 0) {
          setDonationsHistory(data.donations);
          setLoadingHistory(false);
          return;
        }
      }

      // 2. Fallback to Supabase client directly
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setDonationsHistory(data);
      } else {
        // Fallback localstorage
        const local = JSON.parse(localStorage.getItem("puceal_mock_donations") || "[]");
        setDonationsHistory(local);
      }
    } catch (e) {
      console.warn("Using local history fallback", e);
      const local = JSON.parse(localStorage.getItem("puceal_mock_donations") || "[]");
      setDonationsHistory(local);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInitiateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isNaN(finalAmount) || finalAmount < 1) {
      setErrorMessage("Please enter a valid donation amount ($1 minimum).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/donate/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId || "anonymous",
          donorName: donorName || "Puceal Supporter",
          donorEmail: donorEmail || "supporter@example.com",
          amount: finalAmount,
          currency: "USD",
          message
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create donation session.");
      }

      setCurrentTransaction({
        transactionId: data.transactionId,
        amount: data.amount,
        status: data.status,
        qrCodeUrl: data.qrCodeUrl,
        stripeCheckoutUrl: data.stripeCheckoutUrl
      });

      // If Stripe Checkout URL is provided, open in new browser tab
      if (data.stripeCheckoutUrl) {
        window.open(data.stripeCheckoutUrl, "_blank");
      }

      setStep("checkout");
    } catch (err: any) {
      console.error("Donation creation error:", err);
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Simulate payment completion
  const handleSimulatePayment = async () => {
    if (!currentTransaction) return;
    setLoading(true);
    try {
      const res = await fetch("/api/donate/simulated-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: currentTransaction.transactionId
        })
      });

      const data = await res.json();
      if (data.success) {
        setStep("success");
      } else {
        setErrorMessage(data.message || "Simulation failed.");
      }
    } catch (e: any) {
      setErrorMessage("Payment simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep("form");
    setErrorMessage(null);
    setCurrentTransaction(null);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={() => {
          resetModal();
          onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto font-sans"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md sm:max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100 my-auto text-left"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#4A1E9E] via-[#5B25C6] to-[#7C3AED] p-4.5 sm:p-5 text-white relative">
            <button
              onClick={() => {
                resetModal();
                onClose();
              }}
              className="absolute top-4 right-4 p-1.5 sm:p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer flex items-center justify-center shadow-2xs z-20"
              title="Thoát / Close"
            >
              <X className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-1.5 pr-8">
              <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md border border-white/20">
                <Heart className="w-5 h-5 text-pink-300 fill-pink-300 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center space-x-1 bg-pink-500/20 text-pink-200 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Support Our Mission</span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                  Donate to Puceal
                </h2>
              </div>
            </div>

            <p className="text-purple-100 text-[11px] sm:text-xs mt-1 pr-2 leading-relaxed opacity-95">
              Puceal provides a global English speaking matching platform & AI Buddy free. Your contribution maintains servers & builds new features!
            </p>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 mt-3.5 bg-black/20 p-1 rounded-2xl backdrop-blur-sm border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("donate");
                  resetModal();
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === "donate"
                    ? "bg-white text-[#4A1E9E] shadow-sm"
                    : "text-purple-200 hover:text-white hover:bg-white/5"
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Donate</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white text-[#4A1E9E] shadow-sm"
                    : "text-purple-200 hover:text-white hover:bg-white/5"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6">
            {/* TAB 1: DONATE FORM & FLOW */}
            {activeTab === "donate" && (
              <div>
                {/* STEP 1: FORM */}
                {step === "form" && (
                  <form onSubmit={handleInitiateDonation} className="space-y-5">
                    {errorMessage && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Preset Amounts */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                        Select Amount (USD)
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[5, 10, 20].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => {
                              setSelectedPreset(amount);
                              setCustomAmount("");
                            }}
                            className={`py-3.5 px-4 rounded-2xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                              selectedPreset === amount && !customAmount
                                ? "border-[#4A1E9E] bg-purple-50 text-[#4A1E9E] font-bold shadow-sm ring-2 ring-[#4A1E9E]/20"
                                : "border-gray-200 hover:border-purple-300 text-gray-700 font-semibold"
                            }`}
                          >
                            <span className="text-lg font-bold">${amount}</span>
                            <span className="text-[10px] text-gray-500 font-medium mt-0.5">
                              {amount === 5 ? "☕ Coffee" : amount === 10 ? "⚡ 1 Week Server" : "🚀 AI Development"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Amount */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Or Enter Custom Amount ($)
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Custom Amount (Min $1)"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-9 pr-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                        />
                      </div>
                    </div>

                    {/* Donor Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Donor Name
                        </label>
                        <input
                          type="text"
                          required
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          required
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Encouraging Message
                      </label>
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Say something nice..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                      />
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-[#4A1E9E] via-[#6B21A8] to-[#6366F1] hover:from-[#3B187F] hover:to-[#4F46E5] text-white font-bold rounded-2xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Preparing Stripe Checkout...</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 text-pink-300 fill-pink-300" />
                          <span>Donate ${finalAmount} USD with Stripe</span>
                        </>
                      )}
                    </button>
                    <div className="flex items-center justify-center space-x-1.5 text-[10px] text-gray-400 font-medium pt-1">
                      <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                      <span>Secured by Stripe Checkout & Saved to Supabase</span>
                    </div>
                  </form>
                )}

                {/* STEP 2: CHECKOUT & QR CODE / STRIPE / WEBHOOK SIMULATION */}
                {step === "checkout" && currentTransaction && (
                  <div className="text-center space-y-5 py-2">
                    <div className="inline-flex items-center space-x-2 bg-purple-50 text-[#4A1E9E] px-4 py-1.5 rounded-full text-xs font-bold border border-purple-100">
                      <CreditCard className="w-4 h-4" />
                      <span>Transaction ID: {currentTransaction.transactionId}</span>
                    </div>

                    <div className="bg-gradient-to-b from-gray-50 to-purple-50/30 p-6 rounded-3xl border border-purple-100 max-w-sm mx-auto space-y-4 shadow-inner">
                      <div className="text-[#4A1E9E] font-serif text-3xl font-extrabold">
                        ${currentTransaction.amount} USD
                      </div>

                      {currentTransaction.stripeCheckoutUrl ? (
                        <div className="space-y-3">
                          <a
                            href={currentTransaction.stripeCheckoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3.5 px-4 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold rounded-2xl text-xs transition shadow flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Proceed to Stripe Checkout</span>
                          </a>
                          <p className="text-[10px] text-gray-500">
                            Click above to open the secure Stripe payment page.
                          </p>
                        </div>
                      ) : (
                        /* Mock QR Code */
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm inline-block">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=PUCEAL-DONATE-${currentTransaction.transactionId}`}
                            alt="Donation Payment QR"
                            className="w-40 h-40 object-contain mx-auto rounded-lg"
                          />
                          <span className="block text-[10px] text-gray-400 font-mono mt-2">
                            Scan to pay via Banking / Wallet
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 font-medium pt-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4A1E9E]" />
                        <span>Awaiting payment confirmation...</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSimulatePayment}
                        disabled={loading}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition shadow flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Simulate Payment Success</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setStep("form")}
                        className="text-xs text-gray-500 hover:text-gray-800 underline font-semibold transition"
                      >
                        Back to edit details
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: SUCCESS CELEBRATION */}
                {step === "success" && currentTransaction && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-5 py-4"
                  >
                    <div className="w-20 h-20 bg-emerald-100 border-4 border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-lg">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>

                    <div>
                      <h3 className="font-serif text-2xl font-bold text-gray-900">
                        Thank You For Your Support! ❤️
                      </h3>
                      <p className="text-gray-600 text-xs mt-1 max-w-sm mx-auto">
                        Your donation of <span className="font-bold text-[#4A1E9E]">${currentTransaction.amount} USD</span> has been recorded successfully!
                      </p>
                    </div>

                    <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 text-left space-y-2 text-xs text-gray-700 max-w-sm mx-auto font-mono">
                      <div className="flex justify-between border-b border-purple-100 pb-1.5">
                        <span className="text-gray-400">Transaction ID:</span>
                        <span className="font-bold text-gray-800">{currentTransaction.transactionId}</span>
                      </div>
                      <div className="flex justify-between border-b border-purple-100 pb-1.5">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-emerald-600 font-bold uppercase">SUCCESS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Donor Name:</span>
                        <span className="font-semibold text-gray-800">{donorName}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        resetModal();
                        onClose();
                      }}
                      className="w-full py-3.5 bg-[#4A1E9E] hover:bg-[#3B187F] text-white font-bold rounded-2xl text-xs transition shadow-md cursor-pointer"
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* TAB 2: DONATION HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-800 flex items-center space-x-2">
                    <History className="w-4 h-4 text-[#4A1E9E]" />
                    <span>Donation History</span>
                  </h3>
                  <button
                    onClick={fetchDonationHistory}
                    className="text-[11px] text-[#4A1E9E] hover:underline font-semibold"
                  >
                    Refresh
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="py-12 text-center text-gray-400 flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#4A1E9E]" />
                    <span className="text-xs">Loading donation history...</span>
                  </div>
                ) : donationsHistory.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Gift className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No donations recorded yet.</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Be the first to support Puceal!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {donationsHistory.map((item, idx) => (
                      <div
                        key={item.id || item.transaction_id || idx}
                        className="p-3.5 bg-gray-50 hover:bg-purple-50/40 rounded-2xl border border-gray-200 transition flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-gray-900">
                              {item.donor_name || "Supporter"}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {item.transaction_id}
                            </span>
                          </div>
                          {item.message && (
                            <p className="text-[11px] text-gray-500 italic">"{item.message}"</p>
                          )}
                          <p className="text-[10px] text-gray-400">
                            {new Date(item.created_at || Date.now()).toLocaleDateString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric"
                            })}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-[#4A1E9E]">
                            +${item.amount} USD
                          </div>
                          <span
                            className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              item.status === "success"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {item.status || "success"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

