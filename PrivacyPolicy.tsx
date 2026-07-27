import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  Video,
  Database,
  Cpu,
  CreditCard,
  UserCheck,
  Cookie,
  Mail,
  CheckCircle2,
  FileText,
  Eye,
  Server,
  AlertTriangle
} from "lucide-react";

interface PrivacyPolicyProps {
  onBackToDashboard: () => void;
}

const sections = [
  { id: "section-1", title: "1. Introduction", icon: ShieldCheck },
  { id: "section-2", title: "2. Information We Collect", icon: Eye },
  { id: "section-3", title: "3. Third-Party Services & Data Flow", icon: Server },
  { id: "section-4", title: "4. Data Security & User Rights", icon: Lock },
  { id: "section-5", title: "5. Cookies & Analytics", icon: Cookie },
  { id: "section-6", title: "6. Contact & Support", icon: Mail },
];

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBackToDashboard }) => {
  const [activeSection, setActiveSection] = useState<string>("section-1");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sec.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-gray-800 font-sans pb-20">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-purple-100/80 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center space-x-2 text-xs font-bold text-[#4A1E9E] hover:text-[#3B187F] bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition cursor-pointer"
            id="privacy-back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500">
            <ShieldCheck className="w-4 h-4 text-[#4A1E9E]" />
            <span>Puceal Official Trust & Safety</span>
          </div>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-br from-[#4A1E9E] via-[#5B25C6] to-[#7C3AED] text-white py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto text-left space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-white/10 text-purple-100 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10">
            <Lock className="w-3.5 h-3.5 text-purple-200" />
            <span>Data Protection Standards</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-purple-100 text-sm max-w-2xl leading-relaxed">
            Your privacy and confidence are fundamental to Puceal. Learn how we handle your information with transparency, strict security, and zero unauthorized recording.
          </p>
          <div className="pt-2 text-xs font-medium text-purple-200 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-purple-300" />
            <span>Last Updated: May 2026</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sticky Table of Contents Navigation */}
          <aside className="lg:col-span-4 xl:col-span-3 sticky top-24 z-20 hidden lg:block">
            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-3 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-[#4A1E9E]" />
                <span>Contents</span>
              </h3>
              <nav className="space-y-1">
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                        isActive
                          ? "bg-[#4A1E9E] text-white shadow-md shadow-purple-900/10"
                          : "text-gray-600 hover:text-[#4A1E9E] hover:bg-purple-50/80"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-gray-400"}`} />
                      <span className="truncate">{sec.title}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-gray-100 text-left">
                <div className="p-3.5 bg-purple-50/80 rounded-2xl border border-purple-100 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#4A1E9E]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Peer-to-Peer Safety</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Calls are ephemeral and powered by Jitsi Meet. Video & audio streams are never recorded.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Policy Document Content */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-8 text-left">
            
            {/* Section 1: Introduction */}
            <section
              id="section-1"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-4"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    1. Introduction
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Platform Purpose & Our Commitment</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-3 font-normal">
                <p>
                  Welcome to <strong>Puceal</strong>, a global 1-on-1 English video exchange platform and AI Buddy practice space designed to connect language learners worldwide.
                </p>
                <p>
                  At Puceal, we believe that authentic language learning requires a safe, secure, and respectful environment. This Privacy Policy details how we handle, collect, and protect your information when you access our web application, practice speaking with global partners, or interact with our AI Buddy features.
                </p>
                <p>
                  We are deeply committed to protecting your personal data and safeguarding your privacy. We explicitly pledge never to monetize, rent, or sell your account details or private study notes to third-party data brokers.
                </p>
              </div>
            </section>

            {/* Section 2: Information We Collect */}
            <section
              id="section-2"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    2. Information We Collect
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Account Details, Metrics & Hardware Permissions</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                
                {/* Account Data */}
                <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-gray-900 text-sm">
                    <UserCheck className="w-4 h-4 text-[#4A1E9E]" />
                    <span>Account Data</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    When you register or log in, we collect your direct email address and account credentials. Passwords are securely hashed and managed exclusively via <strong>Supabase Authentication</strong> infrastructure.
                  </p>
                </div>

                {/* Profile Data */}
                <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-gray-900 text-sm">
                    <Database className="w-4 h-4 text-[#4A1E9E]" />
                    <span>Profile Data & Study Metrics</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    To maintain your learning dashboard, we store your chosen Display Name, total speaking minutes, consecutive streak counters, practice rating statistics, and saved entries inside your personal <em>"My Notebook"</em> vocabulary list.
                  </p>
                </div>

                {/* Camera & Microphone Access */}
                <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-gray-900 text-sm">
                    <Video className="w-4 h-4 text-[#4A1E9E]" />
                    <span>Camera & Microphone Access</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Your browser will request permission to access your device's camera and microphone. These permissions are requested strictly to facilitate real-time audio and video transmission during active 5-minute speaking calls or AI Buddy sessions. You retain full control to mute audio or disable video at any time during a call.
                  </p>
                </div>

                {/* Video/Audio Data Policy Highlight */}
                <div className="bg-gradient-to-r from-purple-950 via-[#4A1E9E] to-purple-900 text-white p-6 rounded-2xl shadow-md space-y-3 border border-purple-800">
                  <div className="flex items-center space-x-2 text-yellow-300 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Crucial Video & Audio Data Guarantee</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    Zero Recording & Zero Monitoring Policy
                  </h3>
                  <p className="text-xs text-purple-100 leading-relaxed">
                    1-on-1 video calls on Puceal are powered by the <strong>Jitsi Meet External API</strong>. All calls operate as peer-to-peer / ephemeral media sessions. Puceal <strong>NEVER records, monitors, listens to, or stores</strong> video frames or audio streams on any server. Once a 5-minute call concludes, the media stream terminates instantly and leaves no permanent trace.
                  </p>
                </div>

              </div>
            </section>

            {/* Section 3: Third-Party Services & Data Flow */}
            <section
              id="section-3"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    3. Third-Party Services & Data Flow
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Trusted Partners & Infrastructure Integrations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                
                {/* Supabase */}
                <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-[#4A1E9E]">
                    <Database className="w-4 h-4" />
                    <span>Supabase</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Serves as our primary cloud database and authentication provider. All user data access is protected by strict <strong>Row Level Security (RLS)</strong> policies ensuring users only view their own records.
                  </p>
                </div>

                {/* Google AI */}
                <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-[#4A1E9E]">
                    <Cpu className="w-4 h-4" />
                    <span>Google AI (Gemini Flash)</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Powers dynamic conversation topics, debate prompts, and AI Buddy responses. No personally identifiable user information is transmitted to Google AI services.
                  </p>
                </div>

                {/* Payment Processors */}
                <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-[#4A1E9E]">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Processors</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Voluntary support donations are processed directly via secure payment gateways (PayOS / Stripe). Credit card numbers and bank credentials are handled directly by processors and never touch Puceal's servers.
                  </p>
                </div>

              </div>
            </section>

            {/* Section 4: Data Security & User Rights */}
            <section
              id="section-4"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    4. Data Security & Your Rights
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Encryption Protocols & Account Ownership Controls</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#4A1E9E]" />
                    <span>Encryption & Defense Measures</span>
                  </h3>
                  <p>
                    All communication between your browser and Puceal servers is encrypted in transit using industry-standard <strong>TLS/SSL (HTTPS)</strong> protocols. Database records are guarded behind Supabase strict tenant isolation policies.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-[#4A1E9E]" />
                    <span>Your Rights & Account Deletion</span>
                  </h3>
                  <p>
                    You maintain complete ownership of your data. You have the right to request:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
                    <li>Access to a copy of all personal profile metrics and notebook entries saved under your account.</li>
                    <li>Correction of any inaccurate account details or email address.</li>
                    <li>Permanent deletion of your account, speaking logs, and associated notebook data from our database.</li>
                  </ul>
                  <p className="text-xs text-gray-500 italic mt-2">
                    To exercise your data deletion or access rights, simply contact our support team at <strong>support@puceal.com</strong>.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: Cookies & Analytics */}
            <section
              id="section-5"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-4"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <Cookie className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    5. Cookies & Local Storage
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Session State & Essential Storage</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-3">
                <p>
                  Puceal utilizes minimal cookies and browser local storage mechanisms strictly required for core functionality:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <span className="font-bold text-xs text-gray-900">Authentication Session Tokens</span>
                    <p className="text-[11px] text-gray-500">Essential session tokens created by Supabase Auth to keep you logged in securely.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <span className="font-bold text-xs text-gray-900">UI Preferences</span>
                    <p className="text-[11px] text-gray-500">Local storage keys storing your preferred speaking partner filters and theme states.</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 pt-1">
                  We do not employ invasive third-party cross-site tracking cookies or ad-network profiling scripts.
                </p>
              </div>
            </section>

            {/* Section 6: Contact & Support */}
            <section
              id="section-6"
              className="bg-gradient-to-br from-purple-50 via-white to-purple-100/50 p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-200/80 shadow-sm space-y-4"
            >
              <div className="flex items-center space-x-3 border-b border-purple-100 pb-4">
                <div className="p-2.5 bg-[#4A1E9E] text-white rounded-2xl">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    6. Contact & Data Support
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Inquiries, Data Requests & Feedback</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-3">
                <p>
                  If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data handling on Puceal, please reach out to us:
                </p>
                <div className="bg-white p-5 rounded-2xl border border-purple-100 inline-flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xs">
                  <div className="p-3 bg-purple-100 text-[#4A1E9E] rounded-xl">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Official Privacy Email</span>
                    <a
                      href="mailto:support@puceal.com"
                      className="font-bold text-sm text-[#4A1E9E] hover:underline"
                    >
                      support@puceal.com
                    </a>
                  </div>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>
    </div>
  );
};
