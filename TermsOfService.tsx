import React, { useState, useEffect } from "react";
import {
  FileText,
  ShieldCheck,
  ArrowLeft,
  Users,
  AlertOctagon,
  CreditCard,
  Copyright,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Lock,
  Scale
} from "lucide-react";

interface TermsOfServiceProps {
  onBackToDashboard: () => void;
}

const sections = [
  { id: "section-1", title: "1. Acceptance of Terms", icon: CheckCircle2 },
  { id: "section-2", title: "2. User Accounts & Safety", icon: Users },
  { id: "section-3", title: "3. Community Code of Conduct", icon: AlertOctagon },
  { id: "section-4", title: "4. Donations & Financial Terms", icon: CreditCard },
  { id: "section-5", title: "5. Intellectual Property", icon: Copyright },
  { id: "section-6", title: "6. Limitation of Liability", icon: AlertTriangle },
  { id: "section-7", title: "7. Contact & Legal Inquiries", icon: Mail },
];

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBackToDashboard }) => {
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
            id="terms-back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500">
            <Scale className="w-4 h-4 text-[#4A1E9E]" />
            <span>Puceal Legal Terms & Governance</span>
          </div>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-br from-[#4A1E9E] via-[#5B25C6] to-[#7C3AED] text-white py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto text-left space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-white/10 text-purple-100 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
            <span>Binding Agreement</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-purple-100 text-sm max-w-2xl leading-relaxed">
            Please read these Terms of Service carefully before using Puceal. By creating an account or participating in live video exchanges, you agree to follow our platform rules and community safety guidelines.
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
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    <span>Zero Tolerance Policy</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Harassment, nudity, hate speech, and abuse result in immediate and permanent account suspension.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-8 text-left">
            
            {/* Section 1: Acceptance of Terms */}
            <section
              id="section-1"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-4"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Agreement Overview & Eligibility</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-3">
                <p>
                  By creating an account, accessing, or using <strong>Puceal</strong> (including our 1-on-1 video exchange platform, AI Buddy features, and learning notebook), you confirm that you have read, understood, and agreed to be bound by these Terms of Service.
                </p>
                <p>
                  Puceal is intended exclusively for individuals who agree to foster respectful human connections, open-minded cultural dialogue, and constructive language practice. If you do not agree to all terms stated herein, you must immediately cease accessing and using the platform.
                </p>
                <p>
                  We reserve the right to modify these Terms of Service at any time. Any changes will be published directly on this page with an updated "Last Updated" revision date. Continued usage of Puceal after updates constitutes acceptance of the revised Terms.
                </p>
              </div>
            </section>

            {/* Section 2: User Accounts & Safety */}
            <section
              id="section-2"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    2. User Accounts & Security
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Account Responsibilities & Safeguards</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-gray-900 text-sm">
                    <Lock className="w-4 h-4 text-[#4A1E9E]" />
                    <span>Credential Security</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    You are responsible for maintaining the confidentiality of your login credentials (email and password). You agree to notify us immediately of any unauthorized access to or compromise of your account.
                  </p>
                </div>

                <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-gray-900 text-sm">
                    <Users className="w-4 h-4 text-[#4A1E9E]" />
                    <span>Accurate Profile Information</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Users must provide authentic and non-misleading information during registration. Impersonating other individuals, creating deceptive accounts, or operating multiple fake profiles to bypass system bans is strictly prohibited.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Community Code of Conduct & Rules */}
            <section
              id="section-3"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    3. Community Code of Conduct
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Behavior Standards & Reporting Policy</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                
                {/* Zero-Tolerance Banner */}
                <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-800 text-white p-6 rounded-2xl shadow-md space-y-3 border border-rose-800">
                  <div className="flex items-center space-x-2 text-rose-200 font-bold text-xs uppercase tracking-wider">
                    <AlertOctagon className="w-4 h-4 text-rose-300" />
                    <span>Strict Safety Mandate</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    Zero-Tolerance Policy for Misconduct
                  </h3>
                  <p className="text-xs text-rose-100 leading-relaxed">
                    Puceal maintains a strict zero-tolerance policy regarding any form of harassment, discrimination, verbal abuse, sexual explicit content or nudity, hate speech, bullying, or commercial spam during 5-minute video calls or chat interactions.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm">Prohibited Activities Include:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
                    <li>Displaying explicit, offensive, or inappropriate content on camera.</li>
                    <li>Using discriminatory, profane, racist, or threatening language.</li>
                    <li>Soliciting personal financial details, passwords, or external payment transfers from partners.</li>
                    <li>Attempting to record, capture, or broadcast another user's stream without their explicit consent.</li>
                    <li>Disrupting sessions intentionally or refusing to engage respectfully with matched peers.</li>
                  </ul>
                </div>

                <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-100 space-y-2">
                  <span className="font-bold text-xs text-[#4A1E9E]">User Reporting & Enforcement</span>
                  <p className="text-xs text-gray-600">
                    Every 1-on-1 video call screen includes an instant <strong>Report User</strong> feature. Reported violations are logged with safety telemetry. Puceal moderators reserve the right to issue immediate temporary suspensions or permanent account bans without prior warning upon confirming a violation.
                  </p>
                </div>

              </div>
            </section>

            {/* Section 4: Donations & Financial Terms */}
            <section
              id="section-4"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    4. Donations & Financial Terms
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Voluntary Support & Refund Policy</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm">Voluntary Contributions</h3>
                  <p>
                    Puceal provides core speaking match services and AI Buddy tools completely free of charge. Monetary contributions or donations made via our modal are strictly voluntary and dedicated directly to server hosting, TURN/STUN bandwidth, and AI API operational costs.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm">Refund Policy</h3>
                  <p>
                    Because donations are immediate voluntary contributions used to offset server operating expenses, all donations are final and non-refundable, except where mandated by applicable consumer protection laws or in cases of demonstrable duplicate billing errors during transaction processing.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: Intellectual Property */}
            <section
              id="section-5"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-4"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <Copyright className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    5. Intellectual Property & Content
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Ownership & Rights</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-3">
                <p>
                  The Puceal name, logo, visual design system, custom UI components, website source code, and promotional assets are the exclusive intellectual property of Puceal and protected by international copyright laws.
                </p>
                <p>
                  <strong>Your Saved Content:</strong> You retain full ownership of any personal vocabulary notes, study reflections, or custom entries written inside your personal <em>"My Notebook"</em> section.
                </p>
              </div>
            </section>

            {/* Section 6: Limitation of Liability */}
            <section
              id="section-6"
              className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-100/80 shadow-sm space-y-4"
            >
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 bg-purple-100/70 text-[#4A1E9E] rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    6. Limitation of Liability & Disclaimers
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">Service Availability & Peer Disclaimers</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-3">
                <p>
                  Puceal is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied.
                </p>
                <p>
                  While we endeavor to maintain uninterrupted platform availability, we do not guarantee error-free server uptime, continuous video frame rate, or uninterrupted connectivity. Puceal is not liable for indirect, incidental, or consequential damages resulting from platform downtime or individual peer conduct during live video sessions.
                </p>
              </div>
            </section>

            {/* Section 7: Contact & Legal Inquiries */}
            <section
              id="section-7"
              className="bg-gradient-to-br from-purple-50 via-white to-purple-100/50 p-6 sm:p-8 md:p-10 rounded-3xl border border-purple-200/80 shadow-sm space-y-4"
            >
              <div className="flex items-center space-x-3 border-b border-purple-100 pb-4">
                <div className="p-2.5 bg-[#4A1E9E] text-white rounded-2xl">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900">
                    7. Contact & Legal Support
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Questions & Governance Inquiries</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-3">
                <p>
                  If you have any questions or legal inquiries regarding these Terms of Service or platform governance, please contact us:
                </p>
                <div className="bg-white p-5 rounded-2xl border border-purple-100 inline-flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xs">
                  <div className="p-3 bg-purple-100 text-[#4A1E9E] rounded-xl">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Official Support Email</span>
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
