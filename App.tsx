import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  MessageSquare, Flame, BookOpen, Video, Compass, HelpCircle, 
  Mic, MicOff, VideoOff, AlertTriangle, Heart, Smile, Star, 
  Volume2, Globe, Calendar, Award, BookMarked, CheckCircle2, 
  Languages, Sparkles, RefreshCw, Play, Users, Check, 
  ChevronDown, ChevronUp, Plus, Trash2, User, ArrowRight,
  Shield, VolumeX, Settings, PhoneOff, X, LogOut, Send, Bot, BarChart2, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { ActiveTab, MatchMode, Room, SpeakingLog, ProfileStats } from "./types";
import { supabase } from "./supabaseClient";
import { DonateModal } from "./components/DonateModal";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsOfService } from "./components/TermsOfService";


declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function App() {
  // Global & Session States
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [uid, setUid] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("Learner");
  const [language, setLanguage] = useState<string>("English");
  const [realOnlineCount, setRealOnlineCount] = useState<number>(0);
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    rating: 4.9,
    conversations: 14,
    streak: 5,
    minutes: 70
  });

  // User Authentication & Settings States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  // Matchmaking State Machine
  const [matchState, setMatchState] = useState<"idle" | "queue" | "live" | "evaluate">("idle");
  const [currentMode, setCurrentMode] = useState<MatchMode>("discuss");
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [geminiTopic, setGeminiTopic] = useState<string>("");
  const [topicLoading, setTopicLoading] = useState<boolean>(false);
  const [queueOfferSimulated, setQueueOfferSimulated] = useState<boolean>(false);
  const [queueDots, setQueueDots] = useState<string>("");

  // Live Video Controls & In-Call Session Notes
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCamOff, setIsCamOff] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(300); // 5 minutes
  const [liveNotes, setLiveNotes] = useState<string>("");

  // AI Buddy Conversation States during call
  const [aiBuddyMessages, setAiBuddyMessages] = useState<Array<{ id: string; sender: "user" | "ai"; text: string }>>([]);
  const [aiBuddyInput, setAiBuddyInput] = useState<string>("");
  const [aiBuddySpeaking, setAiBuddySpeaking] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);

  // Initialize SpeechSynthesis voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Helper to play a subtle, pleasant chime sound when a match is found
  const playMatchChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: C5 (523.25 Hz) - Gentle initial chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: G5 (783.99 Hz) - Rising melody
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.22, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);

      // Note 3: C6 (1046.50 Hz) - Bright, clear finish chime
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1046.50, now + 0.24);
      gain3.gain.setValueAtTime(0, now + 0.24);
      gain3.gain.linearRampToValueAtTime(0.25, now + 0.26);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.85);
    } catch (e) {
      console.warn("Could not play match chime:", e);
    }
  };

  // Dynamically update document title to alert tab switchers
  useEffect(() => {
    if (matchState === "queue") {
      document.title = "🔍 Searching for speaker... - Puceal";
    } else if (matchState === "live") {
      document.title = "🎉 Match Found! Live Session - Puceal";
    } else {
      document.title = "Puceal - 1-on-1 English Video Exchange & AI Buddy";
    }
  }, [matchState]);

  // Helper to trigger Text-To-Speech out loud for AI Buddy
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel") || !v.name.includes("Compact")));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }

        utterance.onstart = () => setAiBuddySpeaking(true);
        utterance.onend = () => setAiBuddySpeaking(false);
        utterance.onerror = () => setAiBuddySpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis notice:", e);
        setAiBuddySpeaking(false);
      }
    }
  };

  // Helper to trigger Speech-To-Text microphone recording for AI Buddy
  const startListeningMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. You can type your message into the box below!");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningMic(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setAiBuddyInput(transcript);
          handleSendAiBuddyMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Mic recognition start error:", err);
      setIsListeningMic(false);
    }
  };

  // Global Site Assistant Chatbot Widget States
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [chatbotMessages, setChatbotMessages] = useState<Array<{ id: string; sender: "user" | "bot"; text: string; time: string }>>([
    {
      id: "welcome_1",
      sender: "bot",
      text: "Hello! I'm your Puceal AI Assistant 🌟. Feel free to ask me anything about Puceal, Start Speaking mode, AI Buddy, or your Notebook!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatbotInput, setChatbotInput] = useState<string>("");
  const [chatbotLoading, setChatbotLoading] = useState<boolean>(false);

  // Notebook Logs & AI Insights States
  const [logs, setLogs] = useState<SpeakingLog[]>([]);
  const [insights, setInsights] = useState<string>("");
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);

  // Post Session Evaluation States
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [sessionNotes, setSessionNotes] = useState<string>("");
  const [sessionGlossary, setSessionGlossary] = useState<string>("");

  // Helper to compute actual study time from logs
  const getFormattedActualStudyTime = useCallback(() => {
    let totalMinutes = 0;
    if (logs && logs.length > 0) {
      logs.forEach((log) => {
        if (log.duration) {
          const parts = log.duration.split(":");
          if (parts.length === 2) {
            const mins = parseInt(parts[0], 10) || 0;
            const secs = parseInt(parts[1], 10) || 0;
            totalMinutes += mins + Math.round(secs / 60);
          } else {
            const parsed = parseInt(log.duration, 10);
            if (!isNaN(parsed)) totalMinutes += parsed;
          }
        } else {
          totalMinutes += 5;
        }
      });
    } else {
      totalMinutes = profileStats.minutes || 0;
    }

    if (totalMinutes >= 60) {
      const hours = (totalMinutes / 60).toFixed(1);
      return `${hours} hrs (${totalMinutes}m)`;
    }
    return `${totalMinutes} mins`;
  }, [logs, profileStats.minutes]);

  // Helper to format local date string (YYYY-MM-DD)
  const getLocalDateStr = useCallback((d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Database activity dates state from Supabase user_streaks
  const [dbStreakHistory, setDbStreakHistory] = useState<string[]>([]);

  // Set of all unique calendar dates (YYYY-MM-DD) where the user has recorded activity in Supabase/Logs
  const activeDateSet = useMemo(() => {
    const dates = new Set<string>();
    dbStreakHistory.forEach((d) => {
      if (d && typeof d === "string") {
        const cleanDate = d.split("T")[0].trim();
        if (cleanDate.length === 10) dates.add(cleanDate);
      }
    });
    logs.forEach((log) => {
      if (log.date) {
        const cleanDate = log.date.split("T")[0].trim();
        if (cleanDate.length === 10) {
          dates.add(cleanDate);
        }
      }
    });
    return dates;
  }, [logs, dbStreakHistory]);

  // Dynamic consecutive streak calculation backed by activity dates in Supabase
  const currentStreak = useMemo(() => {
    if (activeDateSet.size === 0) return 0;

    const today = new Date();
    const todayStr = getLocalDateStr(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    let streak = 0;
    let checkDate = new Date();

    if (activeDateSet.has(todayStr)) {
      checkDate = new Date(today);
    } else if (activeDateSet.has(yesterdayStr)) {
      checkDate = new Date(yesterday);
    } else {
      return 0;
    }

    while (true) {
      const checkStr = getLocalDateStr(checkDate);
      if (activeDateSet.has(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [activeDateSet, getLocalDateStr]);

  // Dynamic 7 days of the current week (F, Sa, Su, M, Tu, W, Th)
  const weeklyDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getLocalDateStr(today);

    // Calculate Friday of current week cycle (F, Sa, Su, M, Tu, W, Th)
    const offsetFromFriday = (today.getDay() + 2) % 7;
    const friday = new Date(today);
    friday.setDate(today.getDate() - offsetFromFriday);

    const dayLabels = [
      { label: "F", dayOffset: 0 },
      { label: "Sa", dayOffset: 1 },
      { label: "Su", dayOffset: 2 },
      { label: "M", dayOffset: 3 },
      { label: "Tu", dayOffset: 4 },
      { label: "W", dayOffset: 5 },
      { label: "Th", dayOffset: 6 }
    ];

    return dayLabels.map(({ label, dayOffset }) => {
      const d = new Date(friday);
      d.setDate(friday.getDate() + dayOffset);
      const dateStr = getLocalDateStr(d);
      const active = activeDateSet.has(dateStr);
      const isToday = (dateStr === todayStr);

      return {
        label,
        dateStr,
        active,
        isToday
      };
    });
  }, [activeDateSet, getLocalDateStr]);

  // Keep profileStats synced with dynamic currentStreak and conversations
  useEffect(() => {
    setProfileStats((prev) => ({
      ...prev,
      streak: currentStreak,
      conversations: logs.length > 0 ? logs.length : prev.conversations
    }));

    const authClient = supabase?.auth as any;
    if (isLoggedIn && authClient && typeof authClient.updateUser === 'function') {
      authClient.updateUser({
        data: {
          current_streak: currentStreak,
          last_activity_date: getLocalDateStr()
        }
      }).catch(() => {});
    }
  }, [currentStreak, logs.length, isLoggedIn, getLocalDateStr]);

  // Manual Entry Modal States
  const [showAddEntryModal, setShowAddEntryModal] = useState<boolean>(false);
  const [newEntryNotes, setNewEntryNotes] = useState<string>("");
  const [newEntryPartner, setNewEntryPartner] = useState<string>("");
  const [newEntryMode, setNewEntryMode] = useState<MatchMode>("discuss");
  const [newEntryGlossary, setNewEntryGlossary] = useState<string>("");
  const [addEntryLoading, setAddEntryLoading] = useState<boolean>(false);

  // Home Page Device Calibration States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [faqOpen, setFaqOpen] = useState<Record<string, boolean>>({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [showReportSuccess, setShowReportSuccess] = useState<boolean>(false);
  const [devicePermissionError, setDevicePermissionError] = useState<string>("");

  // References
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const jitsiRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const volumeIntervalRef = useRef<any>(null);
  const queueIntervalRef = useRef<any>(null);

  // Initialize UID, DisplayName and Authentication Status
  useEffect(() => {
    let savedUid = localStorage.getItem("puceal_uid");
    if (!savedUid) {
      savedUid = "user_" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("puceal_uid", savedUid);
    }
    setUid(savedUid);

    const savedLoggedIn = localStorage.getItem("puceal_logged_in") === "true";
    setIsLoggedIn(savedLoggedIn);
    if (savedLoggedIn) {
      const savedEmail = localStorage.getItem("puceal_email") || "";
      setUserEmail(savedEmail);
    }

    const savedName = localStorage.getItem("puceal_name");
    if (savedName) {
      setDisplayName(savedName);
      setAuthName(savedName);
    } else {
      const defaultNames = ["Alex", "Aiden", "Maya", "Sophie", "Jin", "Hana", "Lucas", "Liam"];
      const randomName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
      setDisplayName(randomName);
      setAuthName(randomName);
      localStorage.setItem("puceal_name", randomName);
    }

    const savedLang = localStorage.getItem("puceal_lang");
    if (savedLang) {
      setLanguage(savedLang);
    }

    fetchLogs(savedUid);
  }, []);

  // Real-time presence heartbeat effect
  useEffect(() => {
    if (!uid) return;

    const pingPresence = async () => {
      try {
        const res = await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid })
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.count === "number") {
            setRealOnlineCount(data.count);
          }
        }
      } catch (err) {
        console.warn("Presence ping error:", err);
      }
    };

    pingPresence();
    const interval = setInterval(pingPresence, 5000);
    return () => clearInterval(interval);
  }, [uid]);

  // Sync authName with guest displayName when it changes
  useEffect(() => {
    if (!authName && displayName) {
      setAuthName(displayName);
    }
  }, [displayName, authName]);

  // Fetch Speaking Logs from Supabase entries/notes table or fallback API
  const fetchLogs = async (userUid: string) => {
    const currentUid = userUid || uid;
    let loadedFromSupabase = false;

    try {
      if (supabase && typeof supabase.from === 'function') {
        // Fetch user streak & activity history from Supabase user_streaks
        try {
          const { data: streakRow } = await supabase
            .from('user_streaks')
            .select('*')
            .order('updated_at', { ascending: false })
            .maybeSingle();

          if (streakRow && Array.isArray(streakRow.activity_history)) {
            setDbStreakHistory(streakRow.activity_history);
          }
        } catch (sErr) {
          console.warn("Notice: user_streaks table query failed or not created yet", sErr);
        }

        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .order('id', { ascending: false });

        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .order('created_at', { ascending: false });

        const combinedData: any[] = [];
        if (!entriesError && Array.isArray(entriesData)) {
          combinedData.push(...entriesData);
        }
        if (!notesError && Array.isArray(notesData)) {
          notesData.forEach(item => {
            combinedData.push({
              id: item.id,
              date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              partner_name: item.topic_prompt || "Practice Partner",
              country: "Global Network",
              mode: item.mode || "discuss",
              duration: "05:00",
              notes: item.user_reflection || item.notes || "",
              glossary: []
            });
          });
        }

        if (combinedData.length > 0) {
          const formattedLogs: SpeakingLog[] = combinedData.map((item: any) => ({
            id: String(item.id || Math.random().toString(36).substring(2, 9)),
            date: item.date || (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            partnerName: item.partner_name || item.partnerName || "Speaking Partner",
            country: item.country || "Global Network",
            mode: (item.mode as MatchMode) || "discuss",
            duration: item.duration || "05:00",
            notes: item.notes || item.user_reflection || item.content || item.title || "Practice session",
            glossary: Array.isArray(item.glossary)
              ? item.glossary
              : typeof item.glossary === "string"
              ? item.glossary.split(",").map((s: string) => s.trim()).filter(Boolean)
              : []
          }));

          setLogs(formattedLogs);
          loadedFromSupabase = true;
        }
      }
    } catch (err) {
      console.warn("Supabase entries fetch notice:", err);
    }

    if (!loadedFromSupabase) {
      try {
        const res = await fetch(`/api/notebook/logs?uid=${currentUid}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
      }
    }
  };

  // Handle Manual Entry creation in Supabase
  const handleCreateManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryNotes.trim()) return;

    setAddEntryLoading(true);

    try {
      if (!supabase || typeof supabase.from !== 'function') {
        alert("Lỗi Supabase: Client Supabase chưa sẵn sàng!");
        setAddEntryLoading(false);
        return;
      }

      // 1. Kiểm tra đăng nhập qua await supabase.auth.getUser()
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authErr || !user) {
        alert("Lỗi: Bạn chưa đăng nhập!");
        setAddEntryLoading(false);
        return;
      }

      const glossaryArr = newEntryGlossary
        .split(",")
        .map(w => w.trim())
        .filter(w => w.length > 0);

      const partnerName = newEntryPartner.trim() || "Practice Partner";
      const logDate = new Date().toISOString().split("T")[0];

      // 2. Thực hiện insert dữ liệu luôn có user_id: user.id
      let insertError: any = null;

      const { error: notesErr } = await supabase.from('notes').insert([
        {
          user_id: user.id,
          topic_prompt: partnerName,
          user_reflection: newEntryNotes.trim(),
          mode: (newEntryMode || "discuss").toLowerCase() === "debate" ? "debate" : "discuss"
        }
      ]);

      const { error: entriesErr } = await supabase.from('entries').insert([
        {
          user_id: user.id,
          partner_name: partnerName,
          country: "Global Network",
          mode: newEntryMode,
          duration: "05:00",
          notes: newEntryNotes.trim(),
          glossary: glossaryArr,
          date: logDate
        }
      ]);

      if (notesErr && entriesErr) {
        insertError = notesErr || entriesErr;
      } else if (!notesErr || !entriesErr) {
        insertError = null;
      }

      // 3. Thông báo Alert trực tiếp
      if (insertError) {
        alert("Lỗi Supabase: " + insertError.message);
      } else {
        const todayStr = getLocalDateStr();
        setDbStreakHistory(prev => prev.includes(todayStr) ? prev : [...prev, todayStr]);

        alert("Thành công! Đã lưu vào database.");

        try {
          await fetch("/api/notebook/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: user.id,
              partnerName,
              country: "Global Network",
              mode: newEntryMode,
              duration: "05:00",
              notes: newEntryNotes.trim(),
              glossary: glossaryArr
            })
          });
        } catch (err) {
          console.error("Manual entry backend save error:", err);
        }

        await fetchLogs(user.id);

        setNewEntryNotes("");
        setNewEntryPartner("");
        setNewEntryGlossary("");
        setShowAddEntryModal(false);
      }
    } catch (err: any) {
      alert("Lỗi Supabase: " + (err?.message || String(err)));
    } finally {
      setAddEntryLoading(false);
    }
  };

  // Fetch custom AI Insights based on logs
  const fetchAIInsights = async () => {
    if (!uid) return;
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/notebook/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights);
      }
    } catch (err) {
      console.error("Error fetching insights:", err);
      setInsights("You are making amazing progress! Keep participating in Discuss and Debate mode sessions to unlock personalized learning tips.");
    } finally {
      setInsightsLoading(false);
    }
  };

  // Fetch AI Insights once when clicking Notebook
  useEffect(() => {
    if (activeTab === "notebook" && !insights) {
      fetchAIInsights();
    }
  }, [activeTab]);

  // Handle Display Name Change
  const updateDisplayName = (name: string) => {
    setDisplayName(name);
    localStorage.setItem("puceal_name", name);
  };

  // Handle Speaking Language Change
  const updateLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("puceal_lang", lang);
  };

  // Real login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authEmail || !authPassword) {
      setAuthError("Please fill in all fields.");
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      
      if (error) {
        setAuthError(error.message);
        return;
      }
      
      if (data && data.user) {
        const user = data.user;
        setIsLoggedIn(true);
        setUserEmail(user.email || authEmail);
        setUid(user.id);
        
        const retrievedName = user.user_metadata?.display_name || user.user_metadata?.fullName || "Learner";
        setDisplayName(retrievedName);
        
        localStorage.setItem("puceal_logged_in", "true");
        localStorage.setItem("puceal_email", user.email || authEmail);
        localStorage.setItem("puceal_uid", user.id);
        localStorage.setItem("puceal_name", retrievedName);
        
        // Reset fields
        setAuthEmail("");
        setAuthPassword("");
        setAuthError("");
        
        // Redirect to Home page
        setActiveTab("home");
      }
    } catch (err: any) {
      console.error("Login exception:", err);
      setAuthError(err.message || "An unexpected error occurred during Sign In.");
    }
  };

  // Real signup handler
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authEmail || !authPassword || !authName) {
      setAuthError("Please fill in all fields.");
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: {
          data: {
            display_name: authName,
          }
        }
      });
      
      if (error) {
        setAuthError(error.message);
        return;
      }
      
      if (data && data.user) {
        const user = data.user;
        
        setIsLoggedIn(true);
        setUserEmail(user.email || authEmail);
        setUid(user.id);
        setDisplayName(authName);
        
        localStorage.setItem("puceal_logged_in", "true");
        localStorage.setItem("puceal_email", user.email || authEmail);
        localStorage.setItem("puceal_uid", user.id);
        localStorage.setItem("puceal_name", authName);
        
        // Update local stats for new user
        setProfileStats({
          rating: 4.9,
          conversations: 0,
          streak: 1,
          minutes: 0
        });
        
        // Reset fields
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
        setAuthError("");
        
        // Redirect to Home page
        setActiveTab("home");
      }
    } catch (err: any) {
      console.error("Signup exception:", err);
      setAuthError(err.message || "An unexpected error occurred during Sign Up.");
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Supabase signOut error:", err);
    }
    
    setIsLoggedIn(false);
    setUserEmail("");
    localStorage.setItem("puceal_logged_in", "false");
    localStorage.removeItem("puceal_email");
    
    // Reset back to random learner
    const defaultNames = ["Alex", "Aiden", "Maya", "Sophie", "Jin", "Hana", "Lucas", "Liam"];
    const randomName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
    setDisplayName(randomName);
    setAuthName(randomName);
    localStorage.setItem("puceal_name", randomName);
    
    setProfileStats({
      rating: 4.9,
      conversations: 0,
      streak: 0,
      minutes: 0
    });
    
    // Switch to home tab
    setActiveTab("home");
    setShowProfileModal(false);
  };

  // Inline AuthScreen component/JSX to render when not logged in
  const renderAuthScreen = (redirect: ActiveTab) => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="max-w-md mx-auto bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-gray-100 text-center space-y-6 my-8 font-sans"
      >
        <div className="space-y-3">
          <span className="text-xs font-bold text-[#4A1E9E] uppercase tracking-widest bg-[#EDE9FE] px-4 py-1.5 rounded-full inline-block">
            🔒 Members Only Space
          </span>
          <h2 className="font-serif text-3xl font-bold text-gray-900 leading-tight">
            {authMode === "signup" ? "Create Free Account" : "Welcome Back"}
          </h2>
          <p className="text-gray-500 text-xs max-w-xs mx-auto leading-relaxed">
            {redirect === "notebook" 
              ? "Sign up or log in to secure your personal vocabulary glossary, daily streaks, and personalized AI speech reviews."
              : "Access the matching lobby to start structured 5-minute video exchanges in Discuss or Debate mode."}
          </p>
        </div>



        {/* Toggle between Login and Signup */}
        <div className="p-1 bg-gray-100 rounded-xl flex max-w-xs mx-auto relative shadow-inner">
          <button
            type="button"
            onClick={() => {
              setAuthMode("signup");
              setAuthError("");
            }}
            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer ${
              authMode === "signup"
                ? "bg-white text-[#4A1E9E] shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthError("");
            }}
            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer ${
              authMode === "login"
                ? "bg-white text-[#4A1E9E] shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Log In
          </button>
        </div>

        {/* Error Message */}
        {authError && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-xs font-semibold border border-rose-100 leading-normal text-left">
            ⚠️ {authError}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={authMode === "signup" ? handleSignup : handleLogin} className="space-y-4 text-left">
          {authMode === "signup" && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={18}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#4A1E9E] hover:bg-[#3B187F] text-white font-serif text-base font-bold py-3 rounded-2xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer mt-2"
          >
            <span>{authMode === "signup" ? "Get Started for Free" : "Log In to Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>



        <div className="border-t border-gray-100 pt-4 flex justify-between text-[11px] text-gray-400 font-sans leading-relaxed">
          <p className="flex items-center gap-1 mx-auto">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Unrecorded, private peer-to-peer loops</span>
          </p>
        </div>
      </motion.div>
    );
  };

  // Toggle Webcam Test on Home tab
  const toggleWebcamTest = async () => {
    setDevicePermissionError("");
    if (cameraActive) {
      stopWebcamTest();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        setMicActive(true);
        
        // Simulate volume activity
        if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = setInterval(() => {
          setMicVolume(Math.floor(Math.random() * 80) + 10);
        }, 150);

      } catch (err) {
        console.error("Webcam permissions error:", err);
        setDevicePermissionError("Camera or Microphone permission denied. Please grant permission in your browser address bar.");
      }
    }
  };

  const stopWebcamTest = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setMicActive(false);
    setMicVolume(0);
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
  };

  // Always clean up webcam test when switching tabs
  useEffect(() => {
    return () => {
      stopWebcamTest();
    };
  }, [activeTab]);

  // Start matchmaking queue
  const startMatching = async () => {
    setMatchState("queue");
    setQueueOfferSimulated(false);
    
    // Start polling status
    if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
    
    // Trigger queue on backend
    try {
      await fetch("/api/match/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          displayName,
          mode: currentMode,
          language
        })
      });
    } catch (err) {
      console.error("Match join error:", err);
    }

    let dotCounter = 0;
    let timerCounter = 0;
    queueIntervalRef.current = setInterval(async () => {
      // Animate dots
      dotCounter = (dotCounter + 1) % 4;
      setQueueDots(".".repeat(dotCounter));
      timerCounter += 1;

      // Poll status
      try {
        const res = await fetch("/api/match/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.matched && data.room) {
            clearInterval(queueIntervalRef.current);
            enterLiveRoom(data.room);
          } else if (data.offerSimulated) {
            setQueueOfferSimulated(true);
          }
        }
      } catch (err) {
        console.error("Match status poll error:", err);
      }
    }, 1500);
  };

  // Exit/Cancel Matchmaking queue
  const cancelMatching = async () => {
    if (queueIntervalRef.current) {
      clearInterval(queueIntervalRef.current);
      queueIntervalRef.current = null;
    }
    setMatchState("idle");
    try {
      await fetch("/api/match/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
    } catch (err) {
      console.error("Cancel matching error:", err);
    }
  };

  // Join the simulated match (with Socrates, Emma, etc.)
  const matchWithAI = async () => {
    if (queueIntervalRef.current) {
      clearInterval(queueIntervalRef.current);
      queueIntervalRef.current = null;
    }
    try {
      const res = await fetch("/api/match/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.matched && data.room) {
          enterLiveRoom(data.room);
        }
      }
    } catch (err) {
      console.error("Simulate match error:", err);
    }
  };

  // Enter the Jitsi video call room or AI Buddy room
  const enterLiveRoom = async (room: Room) => {
    playMatchChime();
    setActiveRoom(room);
    setMatchState("live");
    setTimerSeconds(300); // 5 minutes count down
    setLiveNotes(""); // Reset live notes for current call session

    if (room.user2.isAI) {
      setIsCamOff(true); // AI Buddy uses Microphone only (no camera required)
      const greeting = `Hello ${displayName}! I'm ${room.user2.displayName}, your Gemini AI speaking buddy for this 5-minute ${room.mode} session. I'm listening via your microphone!`;
      setAiBuddyMessages([
        {
          id: "ai_1",
          sender: "ai",
          text: greeting
        }
      ]);
      speakText(greeting);
    } else {
      setIsCamOff(false);
    }

    // Fetch topic from Gemini server-side
    setTopicLoading(true);
    setGeminiTopic("Gemini is framing the perfect topic...");
    try {
      const res = await fetch("/api/gemini/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: room.mode, language: room.language })
      });
      if (res.ok) {
        const data = await res.json();
        setGeminiTopic(data.topic);
      }
    } catch (err) {
      setGeminiTopic("Share your favorite weekend activities and something new you want to try!");
    } finally {
      setTopicLoading(false);
    }

    // Start 5 minute count down
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          leaveLiveRoom(true); // Terminate and move to evaluation
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handler for interacting with Gemini AI Buddy during calls
  const handleSendAiBuddyMessage = async (textToSend?: string) => {
    const text = textToSend || aiBuddyInput;
    if (!text.trim() || aiBuddySpeaking) return;

    const userMsg = { id: Math.random().toString(36).substring(2, 9), sender: "user" as const, text: text.trim() };
    setAiBuddyMessages((prev) => [...prev, userMsg]);
    setAiBuddyInput("");
    setAiBuddySpeaking(true);

    try {
      const res = await fetch("/api/gemini/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: text.trim(),
          topic: geminiTopic,
          mode: activeRoom?.mode || "discuss"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.response || "That's a very insightful point!";
        const aiMsg = { id: Math.random().toString(36).substring(2, 9), sender: "ai" as const, text: responseText };
        setAiBuddyMessages((prev) => [...prev, aiMsg]);
        speakText(responseText);
      }
    } catch (err) {
      console.error("AI Buddy speech error:", err);
    } finally {
      setAiBuddySpeaking(false);
    }
  };

  // Handler for Global Site Assistant Chatbot
  const handleSendChatbotMessage = async (textToSend?: string) => {
    const query = textToSend || chatbotInput;
    if (!query.trim() || chatbotLoading) return;

    const userMsg = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "user" as const,
      text: query.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatbotMessages((prev) => [...prev, userMsg]);
    setChatbotInput("");
    setChatbotLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query.trim(),
          history: chatbotMessages
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg = {
          id: Math.random().toString(36).substring(2, 9),
          sender: "bot" as const,
          text: data.reply || "Is there anything else I can assist you with regarding Puceal?",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatbotMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
    } finally {
      setChatbotLoading(false);
    }
  };

  // Initialize and mount Jitsi Inline Iframe
  useEffect(() => {
    if (matchState === "live" && activeRoom) {
      const timer = setTimeout(() => {
        const container = document.getElementById("jitsi-container");
        if (container && !jitsiRef.current) {
          try {
            const domain = "meet.jit.si";
            const options = {
              roomName: activeRoom.roomId,
              width: "100%",
              height: "440px",
              parentNode: container,
              configOverwrite: {
                startWithAudioMuted: isMuted,
                startWithVideoMuted: isCamOff,
                disableDeepLinking: true, // Crucial: prevents mobile redirecting
                prejoinPageEnabled: false, // Jumps lobby straight to inline Puceal UI
                toolbarButtons: [] // Enforces our custom floating controls
              },
              interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                DISPLAY_WELCOME_PAGE: false
              }
            };

            if (window.JitsiMeetExternalAPI) {
              const api = new window.JitsiMeetExternalAPI(domain, options);
              jitsiRef.current = api;
            }
          } catch (e) {
            console.error("Jitsi SDK load failed", e);
          }
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        if (jitsiRef.current) {
          jitsiRef.current.dispose();
          jitsiRef.current = null;
        }
      };
    }
  }, [matchState, activeRoom]);

  // Jitsi Action helpers
  const handleToggleMute = () => {
    if (jitsiRef.current) {
      jitsiRef.current.executeCommand("toggleAudio");
      setIsMuted((prev) => !prev);
    }
  };

  const handleToggleCam = () => {
    if (jitsiRef.current) {
      jitsiRef.current.executeCommand("toggleVideo");
      setIsCamOff((prev) => !prev);
    }
  };

  // Leave room
  const leaveLiveRoom = async (goToEvaluation = false) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (jitsiRef.current) {
      jitsiRef.current.executeCommand("hangup");
      jitsiRef.current.dispose();
      jitsiRef.current = null;
    }

    // Call API leave
    if (activeRoom) {
      try {
        await fetch("/api/match/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, roomId: activeRoom.roomId })
        });
      } catch (err) {
        console.error("Leave room error:", err);
      }
    }

    if (goToEvaluation) {
      setMatchState("evaluate");
      setSelectedEmoji("");
      setSessionNotes(liveNotes || "");
      setSessionGlossary("");
    } else {
      setMatchState("idle");
      setActiveRoom(null);
    }
  };

  // Save the evaluation and write log to Notebook
  const saveEvaluation = async () => {
    if (!activeRoom) return;

    const glossaryArray = sessionGlossary
      .split(",")
      .map(w => w.trim())
      .filter(w => w.length > 0);

    const partnerName = activeRoom.user1.uid === uid ? activeRoom.user2.displayName : activeRoom.user1.displayName;
    const country = activeRoom.user2.isAI ? "AI Workspace" : "Global Network";
    const durationStr = `${Math.floor((300 - timerSeconds) / 60).toString().padStart(2, "0")}:${((300 - timerSeconds) % 60).toString().padStart(2, "0")}`;
    const logDuration = durationStr === "00:00" ? "05:00" : durationStr;
    const logNotes = sessionNotes || `Great ${activeRoom.mode} exchange with ${partnerName}!`;
    const logDate = new Date().toISOString().split("T")[0];

    // Insert into Supabase entries & notes tables with auth check and alert feedback
    try {
      if (!supabase || typeof supabase.from !== 'function') {
        alert("Lỗi Supabase: Client Supabase chưa sẵn sàng!");
        return;
      }

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authErr || !user) {
        alert("Lỗi: Bạn chưa đăng nhập!");
        return;
      }

      let insertError: any = null;

      const { error: notesErr } = await supabase.from('notes').insert([
        {
          user_id: user.id,
          topic_prompt: partnerName,
          user_reflection: logNotes,
          mode: (activeRoom.mode || "discuss").toLowerCase() === "debate" ? "debate" : "discuss"
        }
      ]);

      const { error: entriesErr } = await supabase.from('entries').insert([
        {
          user_id: user.id,
          partner_name: partnerName,
          country: country,
          mode: activeRoom.mode,
          duration: logDuration,
          notes: logNotes,
          glossary: glossaryArray,
          date: logDate
        }
      ]);

      if (notesErr && entriesErr) {
        insertError = notesErr || entriesErr;
      } else if (!notesErr || !entriesErr) {
        insertError = null;
      }

      if (insertError) {
        alert("Lỗi Supabase: " + insertError.message);
      } else {
        const todayStr = getLocalDateStr();
        setDbStreakHistory(prev => prev.includes(todayStr) ? prev : [...prev, todayStr]);

        alert("Thành công! Đã lưu vào database.");
        await fetchLogs(user.id);
      }
    } catch (err: any) {
      alert("Lỗi Supabase: " + (err?.message || String(err)));
    }

    try {
      const res = await fetch("/api/notebook/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          partnerName,
          country,
          mode: activeRoom.mode,
          duration: logDuration,
          notes: logNotes,
          glossary: glossaryArray
        })
      });

      if (res.ok) {
        // Update local stats dynamically
        setProfileStats((prev) => ({
          ...prev,
          conversations: prev.conversations + 1,
          streak: prev.streak + 1,
          minutes: prev.minutes + 5
        }));

        setInsights("");
      }
    } catch (err) {
      console.error("Save speaking log error:", err);
    }

    await fetchLogs(uid);

    setMatchState("idle");
    setActiveRoom(null);
    setActiveTab("notebook");
  };

  // Helper to format remaining timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper for accordion toggle
  const toggleFaq = (key: string) => {
    setFaqOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen text-gray-800 bg-[#FFFDF9] font-sans antialiased selection:bg-[#EDE9FE]">
      
      {/* 1. PERSISTENT NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 bg-[#FFFDF9]/90 backdrop-blur-md border-b border-gray-100 px-6 md:px-10 h-20 flex items-center justify-between" id="puceal-navbar">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("home")}>
          <span className="font-logo font-bold text-[30px] tracking-tight text-[#4A1E9E]">
            Puceal
          </span>
        </div>

        {/* Navigation Tabs Links */}
        <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-gray-500 uppercase tracking-widest" id="nav-tabs">
          {(["home", "how-it-works", "notebook", "start-speaking", "faq"] as ActiveTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  if (matchState === "live") {
                    if (confirm("Are you sure you want to leave the live call room? Your current speaking session progress will be lost.")) {
                      leaveLiveRoom();
                      setActiveTab(tab);
                    }
                  } else {
                    setActiveTab(tab);
                  }
                }}
                className={`transition-colors py-1 cursor-pointer font-sans ${
                  isActive 
                    ? "text-[#4A1E9E] border-b-2 border-[#4A1E9E] font-extrabold" 
                    : "text-gray-500 hover:text-[#4A1E9E]"
                }`}
                id={`tab-btn-${tab}`}
              >
                {tab.replace("-", " ").toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* User Profile Stats Dropdown & Donate Button */}
        <div className="flex items-center space-x-3" id="profile-status">
          <button
            type="button"
            onClick={() => setIsDonateModalOpen(true)}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm transition hover:scale-105 cursor-pointer"
            id="donate-navbar-btn"
          >
            <Heart className="w-3.5 h-3.5 fill-white" />
            <span>Donate</span>
          </button>

          <div className="hidden lg:flex items-center space-x-1.5 bg-[#EDE9FE] px-3 py-1.5 rounded-full text-xs font-bold text-[#4A1E9E]">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            <span>{profileStats.streak} Day</span>
          </div>

          <div 
            className="flex items-center gap-3 bg-[#EDE9FE] hover:bg-[#E4DFFE] px-4 py-2 rounded-full cursor-pointer transition-colors" 
            id="profile-indicator"
            onClick={() => setShowProfileModal(true)}
          >
            <div className="w-8 h-8 rounded-full bg-[#4A1E9E] flex items-center justify-center text-white text-xs font-bold uppercase">
              {displayName.substring(0, 2)}
            </div>
            <span className="text-sm font-semibold text-[#4A1E9E] hidden sm:inline">{displayName}</span>
          </div>
        </div>
      </nav>

      {/* Navigation Mobile Fallback bar */}
      <div className="flex md:hidden bg-white px-4 py-3 border-b border-gray-100 space-x-6 overflow-x-auto scrollbar-none">
        {(["home", "how-it-works", "notebook", "start-speaking", "faq"] as ActiveTab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                if (matchState === "live") {
                  if (confirm("Are you sure you want to leave the live call room?")) {
                    leaveLiveRoom();
                    setActiveTab(tab);
                  }
                } else {
                  setActiveTab(tab);
                }
              }}
              className={`text-[11px] font-bold uppercase tracking-widest pb-1 transition-all ${
                isActive ? "text-[#4A1E9E] border-b-2 border-[#4A1E9E]" : "text-gray-400"
              }`}
            >
              {tab.replace("-", " ").toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* 2. BODY CONTENT ROUTED VIA STATE TAB */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        
        {/* ======================================= */}
        {/* [PAGE 1]: HOME (Minimalist EdTech)       */}
        {/* ======================================= */}
        {activeTab === "home" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-12 max-w-5xl mx-auto w-full"
            id="page-home"
          >
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#4A1E9E] via-[#5F249F] to-[#251052] text-white px-8 py-16 md:py-20 shadow-xl border border-[#4A1E9E]/30 text-center space-y-6">
              {/* Soft ambient background glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_70%)] pointer-events-none"></div>
              
              <div className="relative z-10 max-w-3xl mx-auto space-y-5">
                {realOnlineCount > 0 && (
                  <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 text-xs font-semibold text-yellow-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{realOnlineCount} {realOnlineCount === 1 ? "learner" : "learners"} active right now</span>
                  </div>
                )}

                <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight text-white">
                  Speak till Fluent.
                </h1>

                <p className="text-gray-200 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
                  Master spontaneous debates and casual English with global peers in 5-minute live audio matches.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={() => setActiveTab("start-speaking")} 
                    className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-lg hover:scale-105 flex items-center space-x-3 cursor-pointer"
                  >
                    <span>Start 5-Min Match</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Key Highlights Grid (3 horizontal cards with soft rounded corners) */}
            <div className="space-y-4">
              <h3 className="font-serif text-2xl font-bold text-center text-[#4A1E9E]">
                Why 5-Minute Matches Work
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Highlight 1 */}
                <div className="bg-[#FEF3C7] p-8 rounded-[32px] border border-yellow-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-200/80 text-amber-900 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif text-xl font-bold text-amber-950">Active Recall Engine</h4>
                    <p className="text-amber-900/80 text-sm leading-relaxed font-sans">
                      Force real-time vocabulary retrieval under gentle, timed conversation pressure without scripts or memorization.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-amber-800 border-t border-amber-300/40 pt-3 flex items-center justify-between">
                    <span>Spontaneous Speech</span>
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  </div>
                </div>

                {/* Highlight 2 */}
                <div className="bg-[#E0F2FE] p-8 rounded-[32px] border border-blue-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-200/80 text-blue-900 flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif text-xl font-bold text-blue-950">Daily Micro-Habit</h4>
                    <p className="text-blue-900/80 text-sm leading-relaxed font-sans">
                      Build compounding fluency with bite-sized, 5-minute structured daily audio matches that easily fit into your routine.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-blue-800 border-t border-blue-300/40 pt-3 flex items-center justify-between">
                    <span>Consistency Loop</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  </div>
                </div>

                {/* Highlight 3 */}
                <div className="bg-[#EDE9FE] p-8 rounded-[32px] border border-[#DDD6FE] shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#DDD6FE]/80 text-[#4A1E9E] flex items-center justify-center">
                      <Globe className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif text-xl font-bold text-[#4A1E9E]">Diverse Perspectives</h4>
                    <p className="text-[#4A1E9E]/80 text-sm leading-relaxed font-sans">
                      Connect instantly with peers worldwide to exchange ideas, explore cultures, and practice critical debate.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-[#4A1E9E] border-t border-[#4A1E9E]/20 pt-3 flex items-center justify-between">
                    <span>Global Peer Network</span>
                    <CheckCircle2 className="w-4 h-4 text-[#4A1E9E]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Device Status Widget (Calibration) */}
            <div className="bg-[#E0F2FE] p-8 rounded-[32px] border border-blue-200 space-y-5 shadow-sm max-w-4xl mx-auto w-full" id="device-preview-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-blue-950 flex items-center space-x-2">
                    <Video className="w-5 h-5 text-blue-700" />
                    <span>Device Test & Calibration</span>
                  </h3>
                  <p className="text-blue-800/70 text-xs">Verify your audio and visual streams are responsive before matching</p>
                </div>
                
                <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold ${
                  cameraActive ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${cameraActive ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`}></span>
                  {cameraActive ? "Camera & Mic Calibrated" : "Calibration Offline"}
                </span>
              </div>

              {/* Webcam Preview Screen */}
              <div className="relative bg-slate-900 rounded-3xl overflow-hidden aspect-video max-h-[220px] flex items-center justify-center border-4 border-white shadow-md">
                {cameraActive ? (
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto text-gray-300">
                      <VideoOff className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-gray-300">Camera preview is off</p>
                    <p className="text-xs text-gray-400">Click Calibrate below to authorize media sharing</p>
                  </div>
                )}

                {micActive && (
                  <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm p-3 rounded-xl flex items-center space-x-3 text-white">
                    <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex-grow bg-white/20 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-400 h-full transition-all duration-150"
                        style={{ width: `${micVolume}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono shrink-0 w-8 text-right">{micVolume}%</span>
                  </div>
                )}
              </div>

              {devicePermissionError && (
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-3.5 rounded-2xl border border-rose-100 font-sans">
                  ⚠️ {devicePermissionError}
                </p>
              )}

              <div className="flex flex-wrap gap-4 items-center justify-between pt-2">
                <button
                  onClick={toggleWebcamTest}
                  className={`px-6 py-3.5 rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer ${
                    cameraActive 
                      ? "bg-rose-500 hover:bg-rose-600 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {cameraActive ? "Disable Preview" : "Calibrate Camera & Mic"}
                </button>
              </div>
            </div>

            {/* Quick Profile Summary Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-[#FEF3C7] p-6 rounded-[32px] border border-yellow-200 text-center shadow-sm">
                <span className="block text-4xl font-serif font-black text-amber-950 mb-1">{profileStats.conversations}</span>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Conversations</span>
              </div>
              <div className="bg-[#E0F2FE] p-6 rounded-[32px] border border-blue-200 text-center shadow-sm">
                <span className="block text-4xl font-serif font-black text-blue-950 mb-1">{getFormattedActualStudyTime()}</span>
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Actual Practice Time</span>
              </div>
              <div className="bg-[#EDE9FE] p-6 rounded-[32px] border border-[#DDD6FE] text-center shadow-sm">
                <span className="block text-4xl font-serif font-black text-[#4A1E9E] mb-1">+{profileStats.streak}</span>
                <span className="text-xs font-bold text-[#4A1E9E]/80 uppercase tracking-wider">Day Streak</span>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="bg-gradient-to-r from-[#4A1E9E] to-[#7C3AED] p-10 rounded-[36px] text-white text-center space-y-4 shadow-xl border border-purple-300/20">
              <h3 className="font-serif text-3xl font-bold">Ready to rewire your English fluency?</h3>
              <p className="text-purple-100 text-sm max-w-lg mx-auto font-light">
                No subscription or lengthy commitments needed. Experience instant, structured 5-minute live audio practice.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab("start-speaking")}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-lg hover:scale-105 cursor-pointer inline-flex items-center space-x-2"
                >
                  <span>Join a Match — It’s Free</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================= */}
        {/* [PAGE 2]: HOW IT WORKS (Minimalist)     */}
        {/* ======================================= */}
        {activeTab === "how-it-works" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-12 max-w-5xl mx-auto w-full"
            id="page-how-it-works"
          >
            {/* Header */}
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <h2 className="font-serif text-4xl md:text-5xl font-black text-[#4A1E9E] tracking-tight">
                How 5 Minutes Rewires Your Fluency
              </h2>
              <p className="text-gray-600 text-base md:text-lg font-light leading-relaxed">
                A science-backed 3-step loop to turn passive words into active speech.
              </p>
            </div>

            {/* Step Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 01 */}
              <div className="bg-[#FEF3C7] p-8 rounded-[32px] border border-yellow-200 space-y-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-200/80 text-amber-950 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black font-serif bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">
                      01
                    </span>
                  </div>
                  <h4 className="font-serif text-xl font-bold text-amber-950 uppercase tracking-wide">
                    INSTANT MATCH
                  </h4>
                  <p className="text-amber-900/80 text-sm leading-relaxed font-sans">
                    Pair randomly with a global learner in seconds. Select your preferred practice mode: Casual Chat or 5-Min Critical Debate.
                  </p>
                </div>
                <div className="text-xs font-semibold text-amber-800 border-t border-amber-300/40 pt-3 flex items-center justify-between">
                  <span>Matchmaking Engine</span>
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                </div>
              </div>

              {/* Step 02 */}
              <div className="bg-[#E0F2FE] p-8 rounded-[32px] border border-blue-200 space-y-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-200/80 text-blue-950 flex items-center justify-center">
                      <Mic className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black font-serif bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
                      02
                    </span>
                  </div>
                  <h4 className="font-serif text-xl font-bold text-blue-950 uppercase tracking-wide">
                    ACTIVE RECALL & SPEAK
                  </h4>
                  <p className="text-blue-900/80 text-sm leading-relaxed font-sans">
                    The 5-minute clock starts. No scripts allowed—force your brain to retrieve stored vocabulary, structure arguments, and speak under mild pressure.
                  </p>
                </div>
                <div className="text-xs font-semibold text-blue-800 border-t border-blue-300/40 pt-3 flex items-center justify-between">
                  <span>5-Minute Session</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                </div>
              </div>

              {/* Step 03 */}
              <div className="bg-[#EDE9FE] p-8 rounded-[32px] border border-[#DDD6FE] space-y-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#DDD6FE]/80 text-[#4A1E9E] flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black font-serif bg-gradient-to-r from-purple-600 to-[#4A1E9E] bg-clip-text text-transparent">
                      03
                    </span>
                  </div>
                  <h4 className="font-serif text-xl font-bold text-[#4A1E9E] uppercase tracking-wide">
                    REFLECT & LEVEL UP
                  </h4>
                  <p className="text-[#4A1E9E]/80 text-sm leading-relaxed font-sans">
                    Match ends automatically at 00:00. Reflect on your speech, retain new words effortlessly, and repeat daily to build dynamic fluency.
                  </p>
                </div>
                <div className="text-xs font-semibold text-[#4A1E9E] border-t border-[#4A1E9E]/20 pt-3 flex items-center justify-between">
                  <span>Notebook Auto-Save</span>
                  <CheckCircle2 className="w-4 h-4 text-[#4A1E9E]" />
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center pt-2">
              <button
                onClick={() => setActiveTab("start-speaking")}
                className="bg-[#4A1E9E] hover:bg-[#3B187F] text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-lg hover:scale-105 cursor-pointer inline-flex items-center space-x-2.5"
              >
                <span>Try Your First Match</span>
                <ArrowRight className="w-5 h-5 text-yellow-300" />
              </button>
            </div>

            {/* Platform Etiquette Comparisons */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-serif text-2xl font-bold text-center text-[#4A1E9E]">
                Platform Etiquette & Modes
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 p-6 rounded-2xl bg-[#FEF3C7]/20 border border-yellow-200/40">
                  <h5 className="font-bold text-amber-950 flex items-center space-x-2 text-lg">
                    <Smile className="w-5 h-5 text-amber-600" />
                    <span>Casual Chat Mode</span>
                  </h5>
                  <p className="text-sm text-gray-600 leading-relaxed font-sans">
                    Designed for active vocabulary building and casual communication confidence. Focus on listening to your partner, exploring their culture, finding mutual interests, and offering support.
                  </p>
                  <ul className="text-xs text-amber-900/80 space-y-1.5 list-disc pl-5 font-sans">
                    <li>Share authentic experiences and memories</li>
                    <li>Practice active listening and backchanneling ("I see", "That's amazing")</li>
                    <li>Maintain a polite, gentle conversational flow</li>
                  </ul>
                </div>

                <div className="space-y-3 p-6 rounded-2xl bg-[#EDE9FE]/20 border border-[#EDE9FE]/30">
                  <h5 className="font-bold text-[#4A1E9E] flex items-center space-x-2 text-lg">
                    <Flame className="w-5 h-5 text-red-500" />
                    <span>5-Min Critical Debate Mode</span>
                  </h5>
                  <p className="text-sm text-gray-600 leading-relaxed font-sans">
                    Designed for logical formulation, persuasive phrasing, and mental agility. Engage with intellectual topics, define clearly structured Pro vs Con positions, and build rebuttals with respect.
                  </p>
                  <ul className="text-xs text-[#4A1E9E]/80 space-y-1.5 list-disc pl-5 font-sans">
                    <li>Take polite opposition sides on light-hearted debate topics</li>
                    <li>Avoid highly emotional or polarizing political arguments</li>
                    <li>Support assertions with simple reasoning or anecdotes</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================= */}
        {/* [PAGE 3]: MY NOTEBOOK                   */}
        {/* ======================================= */}
        {activeTab === "notebook" && (
          !isLoggedIn ? (
            renderAuthScreen("notebook")
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
              id="page-notebook"
            >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h2 className="font-serif text-3xl font-bold text-[#4A1E9E]">
                  My Notebook
                </h2>
                <p className="text-gray-500 text-sm">
                  Review your personal language logs, vocabulary words, and specialized AI speech insights stored in Supabase.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAddEntryModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-2xl text-sm transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Manual Entry</span>
                </button>

                {/* Refresh Insights button */}
                <button
                  onClick={fetchAIInsights}
                  disabled={insightsLoading}
                  className="bg-[#4A1E9E] hover:bg-[#3B187F] disabled:bg-[#4A1E9E]/50 text-white font-semibold px-5 py-2.5 rounded-2xl text-sm transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${insightsLoading ? "animate-spin" : ""}`} />
                  <span>{insightsLoading ? "Analyzing logs..." : "Regenerate AI Insights"}</span>
                </button>
              </div>
            </div>

            {/* Modal for creating a manual entry in Supabase */}
            <AnimatePresence>
              {showAddEntryModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl border border-gray-100 space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-gray-900">New Notebook Entry</h3>
                      </div>
                      <button
                        onClick={() => setShowAddEntryModal(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateManualEntry} className="space-y-4 text-left">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Speaking Partner Name
                        </label>
                        <input
                          type="text"
                          value={newEntryPartner}
                          onChange={(e) => setNewEntryPartner(e.target.value)}
                          placeholder="e.g. Maria or AI Coach"
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Mode
                          </label>
                          <select
                            value={newEntryMode}
                            onChange={(e) => setNewEntryMode(e.target.value as MatchMode)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                          >
                            <option value="discuss">Discuss Mode</option>
                            <option value="debate">Debate Mode</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Key Vocabulary / Words
                          </label>
                          <input
                            type="text"
                            value={newEntryGlossary}
                            onChange={(e) => setNewEntryGlossary(e.target.value)}
                            placeholder="e.g. Eloquent, Rebuttal"
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Notes & Key Takeaways
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={newEntryNotes}
                          onChange={(e) => setNewEntryNotes(e.target.value)}
                          placeholder="Write down what you learned or discussed..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                        />
                      </div>

                      <div className="flex items-center space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddEntryModal(false)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl text-xs transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addEntryLoading}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 rounded-2xl text-xs transition shadow-sm"
                        >
                          {addEntryLoading ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Notebook grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* AI Insights Summary Card */}
              <div className="lg:col-span-4 bg-[#EDE9FE] p-8 rounded-[32px] border border-[#DDD6FE] space-y-5 shadow-sm" id="insights-summary-card">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-lg font-bold text-[#4A1E9E] flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                    <span>AI Insights</span>
                  </h4>
                  <span className="text-[10px] bg-white text-indigo-800 font-bold px-2 py-0.5 rounded-md font-mono uppercase">
                    AI Engine
                  </span>
                </div>

                {insightsLoading ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-[#4A1E9E] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-gray-500 font-semibold">AI is analyzing your notebooks...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div 
                      className="text-[#4A1E9E]/90 text-sm leading-relaxed space-y-3 prose prose-indigo font-sans"
                      dangerouslySetInnerHTML={{ __html: insights || "💡 Add a speaking log entry to receive personalized progress analyses and vocabulary advice from AI." }}
                    />
                  </div>
                )}
              </div>

              {/* History logs and Glossary list */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Bar Chart Statistics Card */}
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
                  {(() => {
                    const chartData = [
                      { mode: "Discuss", sessions: logs.filter(l => l.mode === "discuss").length, minutes: logs.filter(l => l.mode === "discuss").length * 5, fill: "#F59E0B" },
                      { mode: "Debate", sessions: logs.filter(l => l.mode === "debate").length, minutes: logs.filter(l => l.mode === "debate").length * 5, fill: "#4A1E9E" },
                      { mode: "AI Buddy", sessions: logs.filter(l => (l.partnerName || "").toLowerCase().includes("ai")).length, minutes: logs.filter(l => (l.partnerName || "").toLowerCase().includes("ai")).length * 5, fill: "#10B981" }
                    ].filter(item => item.sessions > 0);

                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                          <div>
                            <h4 className="font-serif text-lg font-bold text-gray-900 flex items-center space-x-2">
                              <BarChart2 className="w-5 h-5 text-[#4A1E9E]" />
                              <span>Speaking Statistics & Bar Chart</span>
                            </h4>
                            <p className="text-gray-500 text-xs mt-0.5 font-sans">
                              Practice sessions & time spent (minutes) breakdown across used modes
                            </p>
                          </div>

                          {chartData.length > 0 && (
                            <div className="flex items-center space-x-4 text-xs font-semibold font-sans">
                              {chartData.some(d => d.mode === "Discuss") && (
                                <div className="flex items-center space-x-1.5">
                                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                                  <span className="text-gray-600">Discuss</span>
                                </div>
                              )}
                              {chartData.some(d => d.mode === "Debate") && (
                                <div className="flex items-center space-x-1.5">
                                  <span className="w-3 h-3 rounded-full bg-[#4A1E9E] inline-block"></span>
                                  <span className="text-gray-600">Debate</span>
                                </div>
                              )}
                              {chartData.some(d => d.mode === "AI Buddy") && (
                                <div className="flex items-center space-x-1.5">
                                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                                  <span className="text-gray-600">AI Buddy</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="h-64 w-full pt-2">
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="mode" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} 
                                />
                                <Bar dataKey="sessions" name="Sessions" radius={[8, 8, 0, 0]}>
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                                </Bar>
                                <Bar dataKey="minutes" name="Minutes" fill="#93C5FD" radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                              <BarChart2 className="w-8 h-8 text-gray-300 mb-2" />
                              <p className="text-sm font-semibold text-gray-500">No session activity recorded yet</p>
                              <p className="text-xs text-gray-400 mt-1">Complete a practice session in Discuss, Debate, or AI Buddy to view your activity chart here.</p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* My Glossary Widget */}
                <div className="bg-[#E0F2FE] p-8 rounded-[32px] border border-blue-200 shadow-sm">
                  <h4 className="font-serif text-lg font-bold text-blue-950 flex items-center space-x-2 mb-3">
                    <BookMarked className="w-5 h-5 text-blue-700" />
                    <span>My Vocabulary Glossary</span>
                  </h4>
                  <p className="text-blue-900/70 text-xs mb-4 font-sans">Saved words, key idioms, and specialized terms from evaluated conversations</p>
                  
                  {/* Gather all glossary words from logs */}
                  {logs.flatMap(l => l.glossary || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(logs.flatMap(l => l.glossary || []))).map((word, i) => (
                        <span 
                          key={i} 
                          className="inline-flex items-center bg-white px-4 py-2 rounded-full text-xs font-semibold text-blue-900 border border-blue-200/50 shadow-sm font-sans"
                        >
                          <Check className="w-3.5 h-3.5 text-blue-500 mr-1.5 shrink-0" />
                          {word}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-blue-800/80 italic font-medium font-sans">Your glossary is empty. Vocabulary items saved during post-session logs will appear here.</p>
                  )}
                </div>

                {/* History Table logs */}
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-4" id="speaking-history-panel">
                  <h4 className="font-serif text-lg font-bold text-gray-900 flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span>Conversations Log History</span>
                  </h4>

                  {logs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse font-sans" id="history-table">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                            <th className="py-3 px-2">Date & Mode</th>
                            <th className="py-3 px-2">Speaker Name</th>
                            <th className="py-3 px-2">Context / Notes</th>
                            <th className="py-3 px-2 text-right">Words</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition">
                              <td className="py-3 px-2 whitespace-nowrap">
                                <p className="font-semibold text-xs text-gray-400 font-mono">{log.date}</p>
                                <span className={`inline-flex px-2.5 py-1 mt-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  log.mode === "discuss" 
                                    ? "bg-amber-100 text-amber-800" 
                                    : "bg-purple-100 text-purple-800"
                                }`}>
                                  {log.mode}
                                </span>
                              </td>
                              <td className="py-3 px-2 whitespace-nowrap">
                                <p className="font-bold text-gray-800">{log.partnerName}</p>
                                <p className="text-[10px] text-gray-400 flex items-center">
                                  <Globe className="w-3 h-3 mr-1" />
                                  {log.country}
                                </p>
                              </td>
                              <td className="py-3 px-2 max-w-[300px]">
                                <p className="text-xs text-gray-600 font-medium leading-relaxed italic">
                                  "{log.notes}"
                                </p>
                              </td>
                              <td className="py-3 px-2 text-right">
                                {log.glossary && log.glossary.length > 0 ? (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 font-mono font-bold px-2 py-1 rounded-md border border-blue-100">
                                    {log.glossary.length} saved
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm font-semibold text-gray-500">No speaking logs recorded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Matched speaking exchanges will be archived here securely.</p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </motion.div>
          )
        )}

        {/* ========================================================= */}
        {/* [PAGE 4]: START SPEAKING (The Core Matchmaking Engine)    */}
        {/* ========================================================= */}
        {activeTab === "start-speaking" && (
          !isLoggedIn ? (
            renderAuthScreen("start-speaking")
          ) : (
            <div className="space-y-6" id="page-start-speaking">
            
            {/* STATE 1: READY TO MATCH */}
            {matchState === "idle" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto bg-white rounded-[32px] p-10 shadow-sm border border-gray-100 text-center space-y-8"
              >
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#4A1E9E] uppercase tracking-widest bg-[#EDE9FE] px-4 py-1.5 rounded-full inline-block">
                    Matchmaking Hub
                  </span>
                  <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#4A1E9E]">
                    Ready for a Conversation?
                  </h2>
                  <p className="text-gray-500 text-sm max-w-lg mx-auto font-sans">
                    Select your preferred match vibe and let our matching engine connect you with compatible speakers worldwide.
                  </p>
                </div>

                {/* Segmented Controller (Discuss vs Debate) */}
                <div className="p-1.5 bg-gray-100/80 rounded-2xl flex max-w-md mx-auto relative shadow-inner">
                  <button
                    onClick={() => setCurrentMode("discuss")}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                      currentMode === "discuss"
                        ? "bg-white text-[#4A1E9E] shadow-md"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Smile className="w-4 h-4 text-amber-500 fill-amber-100" />
                    <span>Discuss Mode</span>
                  </button>
                  <button
                    onClick={() => setCurrentMode("debate")}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                      currentMode === "debate"
                        ? "bg-white text-[#4A1E9E] shadow-md"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Flame className="w-4 h-4 text-rose-500 fill-rose-100" />
                    <span>Debate Mode</span>
                  </button>
                </div>

                {/* Info about selected Mode */}
                <div className="p-5 rounded-2xl bg-[#EDE9FE]/30 border border-[#EDE9FE]/60 text-left space-y-1 max-w-md mx-auto font-sans">
                  <p className="text-xs font-bold text-[#4A1E9E] uppercase tracking-wider">
                    {currentMode === "discuss" ? "🟢 Empathetic Chat" : "⚡ Intellectual Debate"}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {currentMode === "discuss"
                      ? "You'll match with a peer to talk about warm, casual conversation prompts. Focus on active listening, building vocabulary, and mutual understanding."
                      : "You'll match with a peer to take opposite sides (Pro vs Con) on a light-hearted debate topic. Practice rhetoric, structured arguments, and polite counters."}
                  </p>
                </div>

                {/* Matchmaking Action Buttons */}
                <div className="space-y-4">
                  <div className="max-w-md mx-auto">
                    <button
                      onClick={startMatching}
                      className="w-full bg-[#4A1E9E] hover:bg-[#3B187F] text-white font-serif text-base font-bold py-4 px-5 rounded-2xl transition-all duration-200 transform hover:scale-[1.01] shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>Start Matchmaking</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center space-x-1.5 text-xs text-gray-400 font-mono">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Matching language preference: <b>{language}</b></span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STATE 2: THE MATCHMAKING QUEUE */}
            {matchState === "queue" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto text-center py-16 space-y-8"
              >
                {/* wave animation */}
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                  <div className="absolute w-36 h-36 bg-[#4A1E9E]/10 rounded-full animate-ping pointer-events-none"></div>
                  <div className="absolute w-28 h-28 bg-[#4A1E9E]/15 rounded-full animate-pulse pointer-events-none"></div>
                  <div className="w-20 h-20 bg-gradient-to-tr from-[#4A1E9E] to-[#7C3AED] rounded-full flex items-center justify-center text-white shadow-xl relative z-10">
                    <Users className="w-10 h-10 animate-bounce" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-serif text-2xl font-bold text-gray-900">
                    Looking for a partner{queueDots}
                  </h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto font-medium font-sans">
                    Pre-checking WebRTC pathways & syncing language preferences...
                  </p>
                  <div className="inline-flex items-center space-x-2 bg-purple-50 border border-purple-100 rounded-full px-4 py-2 text-xs font-semibold text-[#4A1E9E]">
                    <Volume2 className="w-4 h-4 text-[#4A1E9E] animate-pulse" />
                    <span>Sound alert active on match</span>
                    <button 
                      onClick={playMatchChime}
                      className="text-[11px] underline font-bold text-[#4A1E9E] hover:text-[#3B187F] ml-1 cursor-pointer bg-transparent border-none p-0"
                      id="test-chime-btn"
                    >
                      (Test chime)
                    </button>
                  </div>
                </div>

                {/* Simulated offer card if queue is slow */}
                <AnimatePresence>
                  {queueOfferSimulated && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#FEF3C7] p-6 rounded-[32px] border border-yellow-200 text-left max-w-md mx-auto space-y-3 shadow-md"
                    >
                      <p className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600 fill-amber-100" />
                        <span>Practice Instantly with AI Speaker Buddy</span>
                      </p>
                      <p className="text-xs text-amber-900 leading-relaxed font-sans">
                        There are currently no other speakers queued in your specific language combo. Jump straight into Jitsi video room with Socrates or Emma, our virtual speaking trainers!
                      </p>
                      <button
                        onClick={matchWithAI}
                        className="bg-[#4A1E9E] text-white font-semibold text-xs px-4.5 py-2.5 rounded-xl transition hover:bg-[#3B187F] shadow-sm flex items-center space-x-2 cursor-pointer font-sans"
                      >
                        <span>Match with AI Buddy</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <button
                    onClick={cancelMatching}
                    className="border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold px-6 py-3 rounded-2xl text-sm transition shadow-sm cursor-pointer font-sans"
                  >
                    Cancel Matchmaking Queue
                  </button>
                </div>
              </motion.div>
            )}

            {/* STATE 3: THE LIVE VIDEO SUITE (Inline Embedded) */}
            {matchState === "live" && activeRoom && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8"
              >
                {/* Video column */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Digital timer card */}
                  <div className="bg-white px-8 py-5 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`w-3.5 h-3.5 rounded-full ${
                        timerSeconds < 15 ? "bg-rose-500 animate-ping" : "bg-emerald-500 animate-pulse"
                      }`} />
                      <div className="text-left leading-tight font-sans">
                        <p className="text-xs text-gray-400 font-mono">ROOM: {activeRoom.roomId}</p>
                        <p className="text-sm font-bold text-gray-800">
                          Matched with: <span className="text-[#4A1E9E]">{activeRoom.user1.uid === uid ? activeRoom.user2.displayName : activeRoom.user1.displayName}</span>
                        </p>
                      </div>
                    </div>

                    {/* reactive countdown */}
                    <div className={`px-5 py-2.5 rounded-2xl font-mono font-bold text-2xl border-2 transition-all ${
                      timerSeconds <= 15 
                        ? "bg-rose-50 border-rose-500 text-rose-600 animate-pulse"
                        : timerSeconds <= 60
                        ? "bg-amber-50 border-amber-500 text-amber-600"
                        : "bg-gray-50 border-gray-200 text-gray-800"
                    }`}>
                      {formatTimer(timerSeconds)}
                    </div>
                  </div>

                  {/* Jitsi meet inline iframe target or AI Buddy Voice Partner card */}
                  <div className="relative">
                    {activeRoom.user2.isAI ? (
                      /* AI Buddy Voice-Only Workspace (Camera is NOT used/required) */
                      <div className="bg-gradient-to-b from-slate-900 via-[#1E1035] to-slate-950 w-full min-h-[480px] rounded-[32px] p-5 shadow-xl border-4 border-white flex flex-col justify-between text-white relative overflow-hidden font-sans">
                        {/* Audio Wave Visualizer Background Effect */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                          <div className="w-80 h-80 rounded-full bg-purple-600 animate-ping"></div>
                          <div className="w-60 h-60 rounded-full bg-indigo-500 animate-pulse"></div>
                        </div>

                        {/* Top Badge */}
                        <div className="flex items-center justify-between z-10 border-b border-white/10 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 animate-pulse" />
                            </div>
                            <div>
                              <h4 className="font-serif font-bold text-sm text-white">{activeRoom.user2.displayName} (AI Buddy)</h4>
                              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                <span>Voice Connected • Mic Only</span>
                              </p>
                            </div>
                          </div>

                          <span className="bg-white/10 text-[10px] px-2.5 py-0.5 rounded-full font-mono border border-white/15">
                            Gemini 3.5 Flash
                          </span>
                        </div>

                        {/* Central Avatar Visualizer (Shifted & Compact) */}
                        <div className="py-2 flex flex-col items-center justify-center space-y-2 z-10">
                          <div className="relative">
                            <div className={`w-18 h-18 rounded-full bg-gradient-to-tr from-[#4A1E9E] to-emerald-500 flex items-center justify-center shadow-2xl transition-all ${aiBuddySpeaking ? "scale-105 ring-6 ring-emerald-500/30 animate-pulse" : ""}`}>
                              <Bot className="w-9 h-9 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                              <Mic className="w-3 h-3 text-white" />
                            </div>
                          </div>

                          <div className="text-center space-y-0.5 max-w-md">
                            <p className="text-[11px] text-gray-300 font-medium">
                              {aiBuddySpeaking ? "Gemini is replying..." : "Speak into your microphone or type below..."}
                            </p>
                          </div>
                        </div>

                        {/* Conversation Transcript Box & Speech Input (Shifted to bottom) */}
                        <div className="space-y-2.5 z-10 mt-auto">
                          <div className="bg-black/50 backdrop-blur-md rounded-2xl p-3 border border-white/10 max-h-36 overflow-y-auto space-y-2 text-xs">
                            {aiBuddyMessages.map((m) => (
                              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] px-3 py-1.5 rounded-xl flex items-start gap-2 ${m.sender === "user" ? "bg-[#4A1E9E] text-white" : "bg-emerald-950/80 text-emerald-100 border border-emerald-500/20"}`}>
                                  <div className="flex-1">
                                    <p className="font-semibold text-[9px] opacity-70 mb-0.5">{m.sender === "user" ? "You" : activeRoom.user2.displayName}</p>
                                    <p>{m.text}</p>
                                  </div>
                                  {m.sender === "ai" && (
                                    <button
                                      onClick={() => speakText(m.text)}
                                      className="text-emerald-400 hover:text-emerald-200 p-1 rounded-md hover:bg-white/10 transition cursor-pointer"
                                      title="Listen out loud"
                                    >
                                      <Volume2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <form onSubmit={(e) => { e.preventDefault(); handleSendAiBuddyMessage(); }} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={startListeningMic}
                              className={`p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
                                isListeningMic 
                                  ? "bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30" 
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                              }`}
                              title="Speak into Microphone"
                            >
                              <Mic className="w-4 h-4" />
                            </button>

                            <input
                              type="text"
                              value={aiBuddyInput}
                              onChange={(e) => setAiBuddyInput(e.target.value)}
                              placeholder={isListeningMic ? "Listening to your voice..." : "Type or click mic to speak..."}
                              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />

                            <button
                              type="submit"
                              disabled={!aiBuddyInput.trim() || aiBuddySpeaking}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send</span>
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      /* Human Match Jitsi Video Stream */
                      <div 
                        id="jitsi-container" 
                        className="bg-slate-950 w-full h-[450px] rounded-[32px] overflow-hidden shadow-lg border-4 border-white"
                      />
                    )}

                    {/* Leave Room Confirmation Overlay */}
                    {showLeaveConfirm && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-6 rounded-[32px] font-sans animate-fade-in">
                        <div className="bg-white p-8 rounded-[24px] max-w-sm w-full text-center space-y-5 shadow-2xl border border-gray-100">
                          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                            <PhoneOff className="w-6 h-6 animate-pulse" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="font-serif text-lg font-bold text-gray-900">End Conversation?</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              Are you sure you want to end this conversation session? Your live session notes will be automatically saved in your notebook.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowLeaveConfirm(false)}
                              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
                            >
                              Go Back
                            </button>
                            <button
                              onClick={() => {
                                setShowLeaveConfirm(false);
                                leaveLiveRoom(true);
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                            >
                              Yes, Leave & Save
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Report Success Toast */}
                    {showReportSuccess && (
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-white/10 flex items-center gap-2 z-30 animate-bounce font-sans">
                        <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>Report submitted. We prioritize conversation safety!</span>
                      </div>
                    )}
                  </div>

                  {/* Call Controls Bar moved down to the white section below the screen */}
                  <div className="bg-white px-6 py-4 rounded-[28px] shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3 font-sans">
                    <div className="flex items-center space-x-2.5 sm:space-x-3">
                      <button
                        onClick={handleToggleMute}
                        className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                          isMuted 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                      >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        <span>{isMuted ? "Unmute" : "Mute"}</span>
                      </button>

                      {!activeRoom.user2.isAI ? (
                        <button
                          onClick={handleToggleCam}
                          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                            isCamOff 
                              ? "bg-rose-500 text-white shadow-xs" 
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                          title={isCamOff ? "Start Camera" : "Stop Camera"}
                        >
                          {isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                          <span>{isCamOff ? "Start Video" : "Stop Video"}</span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-2xl text-xs font-bold flex items-center gap-1.5">
                          <Mic className="w-4 h-4 text-emerald-600" />
                          <span>Voice Connected</span>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowReportSuccess(true);
                          setTimeout(() => setShowReportSuccess(false), 3000);
                        }}
                        className="p-2.5 rounded-2xl bg-gray-100 hover:bg-rose-50 text-amber-600 hover:text-rose-600 transition-all cursor-pointer border border-transparent hover:border-rose-100"
                        title="Report bad behavior"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => setShowLeaveConfirm(true)}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      title="Leave call room"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Leave Room</span>
                    </button>
                  </div>

                </div>

                {/* Topic / Gemini / Chat column (Wider col-span-5) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Gemini Topic Card */}
                  <div className="bg-[#FEF3C7] p-8 rounded-[32px] border border-yellow-200 space-y-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-lg font-bold text-amber-950 flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-amber-700 animate-pulse" />
                        <span>Gemini Icebreaker Topic</span>
                      </h4>
                      <span className="text-[9px] bg-white text-amber-900 font-bold px-1.5 py-0.5 rounded uppercase">
                        AI Starter
                      </span>
                    </div>

                    {topicLoading ? (
                      <div className="py-8 text-center space-y-2">
                        <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-[11px] text-amber-900 font-semibold font-mono uppercase tracking-wider">Framing topic...</p>
                      </div>
                    ) : (
                      <div className="space-y-4 text-amber-950 font-sans">
                        <p className="text-sm font-semibold leading-relaxed bg-white/60 p-4 rounded-2xl border border-white/20 shadow-inner">
                          {geminiTopic}
                        </p>
                      </div>
                    )}

                    <div className="text-[11px] text-amber-800/80 leading-normal border-t border-amber-300/30 pt-3 font-sans">
                      💡 Use this prompt whenever there's a quiet moment or an argument stalls! You have a full 5 minutes.
                    </div>
                  </div>

                  {/* Live Session Notes Card (Notes during call - Automatically saved to Notebook) */}
                  <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-4 shadow-sm text-left font-sans">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-base font-bold text-[#4A1E9E] flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-[#4A1E9E]" />
                        <span>Live Session Notes</span>
                      </h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full font-mono">
                        Auto-saves to Notebook
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed">
                      Write down notes, new words, or takeaways during your call. They will automatically save to your Notebook when the call ends!
                    </p>

                    <textarea
                      rows={4}
                      value={liveNotes}
                      onChange={(e) => setLiveNotes(e.target.value)}
                      placeholder="Type your session notes here (e.g. New phrase: 'In terms of...', Partner's argument on AI)..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E] text-gray-800"
                    />
                  </div>

                  {/* Mode Guidelines reminders */}
                  <div className="bg-[#E0F2FE] p-8 rounded-[32px] border border-blue-200 text-xs text-blue-950 space-y-3.5">
                    <h5 className="font-bold uppercase tracking-wider text-blue-900">Exchange Strategy</h5>
                    
                    {activeRoom.mode === "discuss" ? (
                      <div className="space-y-2 font-sans">
                        <p>📍 <b>Goal:</b> Connect and understand your partner's unique life experiences.</p>
                        <p>📍 Ask subsequent follow up questions and repeat back parts of their sharing to signal empathy.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 font-sans">
                        <p>📍 <b>Goal:</b> Practice formulating claims, rebuttals, and persuasive English syntax.</p>
                        <p>📍 Present arguments clearly, list Pro/Con benefits, and remain completely polite.</p>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* STATE 4: POST-SESSION EVALUATION */}
            {matchState === "evaluate" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto bg-white rounded-[32px] p-10 shadow-sm border border-gray-100 space-y-6"
                id="evaluation-dialog"
              >
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#E0F2FE] text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="font-serif text-3xl font-bold text-gray-900">
                    Excellent Speaking Practice!
                  </h3>
                  <p className="text-gray-500 text-xs max-w-sm mx-auto font-sans">
                    Take a moment to evaluate your exchange partner and archive any vocabulary keywords securely in your notebook.
                  </p>
                </div>

                {/* Rating & Emoji evaluation */}
                <div className="space-y-4 text-center">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Rate Your Partner
                    </p>
                    <div className="flex items-center justify-center space-x-2">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isStarred = selectedRating >= starVal;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => setSelectedRating(starVal)}
                            className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                            title={`Rate ${starVal} Star${starVal > 1 ? "s" : ""}`}
                          >
                            <Star
                              className={`w-7 h-7 ${
                                isStarred
                                  ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                                  : "text-gray-200 fill-gray-100"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Evaluate Your Partner's Vibe
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {[
                      { emoji: "😊", label: "Friendly Vibe" },
                      { emoji: "🗣️", label: "Great Speaker" },
                      { emoji: "🤝", label: "Respectful Partner" }
                    ].map((badge) => {
                      const isSelected = selectedEmoji === badge.label;
                      return (
                        <button
                          key={badge.label}
                          onClick={() => setSelectedEmoji(badge.label)}
                          className={`flex-1 p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-[#EDE9FE] border-[#4A1E9E] text-[#4A1E9E] scale-105 font-bold shadow-sm" 
                              : "border-gray-100 hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          <span className="text-2xl block mb-1">{badge.emoji}</span>
                          <span className="text-[10px] font-semibold uppercase">{badge.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Notes input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Session Summary / Notes
                    </label>
                    <textarea
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder="Discussed our favorite local foods and culinary festivals..."
                      rows={3}
                      className="w-full bg-gray-50/85 border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/10"
                    />
                  </div>

                  {/* Vocabulary keywords input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      New Vocabulary learned (Optional)
                    </label>
                    <p className="text-[10px] text-gray-400 mb-2">Separate multiple terms with commas</p>
                    <input
                      type="text"
                      value={sessionGlossary}
                      onChange={(e) => setSessionGlossary(e.target.value)}
                      placeholder="e.g. Nostalgia, Rhetoric, Eloquent"
                      className="w-full bg-gray-50/85 border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/10"
                    />
                  </div>
                </div>

                {/* Action controls */}
                <div className="pt-3">
                  <button
                    onClick={saveEvaluation}
                    className="w-full bg-[#4A1E9E] hover:bg-[#3B187F] text-white font-serif text-base font-bold py-3.5 rounded-2xl transition hover:scale-[1.01] shadow-md cursor-pointer"
                  >
                    Save Speaking Log to Notebook
                  </button>
                </div>
              </motion.div>
            )}

          </div>
          )
        )}

        {/* ======================================= */}
        {/* [PAGE 5]: FAQ                           */}
        {/* ======================================= */}
        {activeTab === "faq" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8 max-w-3xl mx-auto"
            id="page-faq"
          >
            <div className="text-center space-y-3">
              <h2 className="font-serif text-3xl font-bold text-[#4A1E9E]">
                Frequently Asked Questions
              </h2>
              <p className="text-gray-500 text-sm font-sans">
                Get answers to common queries regarding matching, privacy, and speaking options on Puceal.
              </p>
            </div>

            {/* Accordions */}
            <div className="space-y-4" id="faq-accordions">
              
              {/* Q1 */}
              <div className="bg-[#FEF3C7] rounded-[32px] overflow-hidden border border-yellow-200 shadow-sm">
                <button
                  onClick={() => toggleFaq("q1")}
                  className="w-full px-6 py-5.5 flex items-center justify-between text-left font-serif font-bold text-amber-950 text-base md:text-lg focus:outline-none cursor-pointer"
                >
                  <span>Is Puceal free to use?</span>
                  {faqOpen["q1"] ? <ChevronUp className="w-5 h-5 shrink-0 text-amber-800" /> : <ChevronDown className="w-5 h-5 shrink-0 text-amber-800" />}
                </button>
                
                <AnimatePresence>
                  {faqOpen["q1"] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 text-xs md:text-sm text-amber-900/90 leading-relaxed border-t border-amber-300/30 pt-3 font-sans"
                    >
                      Yes, completely! Puceal is a collaborative community-driven language tool designed to facilitate free matching and empathetic speech calibration for language learners, scholars, and critical thinkers worldwide.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Q2 */}
              <div className="bg-[#E0F2FE] rounded-[32px] overflow-hidden border border-blue-200 shadow-sm">
                <button
                  onClick={() => toggleFaq("q2")}
                  className="w-full px-6 py-5.5 flex items-center justify-between text-left font-serif font-bold text-blue-950 text-base md:text-lg focus:outline-none cursor-pointer"
                >
                  <span>What happens when the 5 minutes run out?</span>
                  {faqOpen["q2"] ? <ChevronUp className="w-5 h-5 shrink-0 text-blue-800" /> : <ChevronDown className="w-5 h-5 shrink-0 text-blue-800" />}
                </button>
                
                <AnimatePresence>
                  {faqOpen["q2"] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 text-xs md:text-sm text-blue-900/90 leading-relaxed border-t border-blue-300/30 pt-3 font-sans"
                    >
                      The Jitsi connection automatically soft-terminates. You are immediately redirected to the Post-Session Evaluation tab. This ensures both partners can comfortably save glossary vocabulary, write summaries, and leave ratings before commencing their next match.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Q3 */}
              <div className="bg-[#EDE9FE] rounded-[32px] overflow-hidden border border-[#DDD6FE] shadow-sm">
                <button
                  onClick={() => toggleFaq("q3")}
                  className="w-full px-6 py-5.5 flex items-center justify-between text-left font-serif font-bold text-[#4A1E9E] text-base md:text-lg focus:outline-none cursor-pointer"
                >
                  <span>How is my security and privacy protected?</span>
                  {faqOpen["q3"] ? <ChevronUp className="w-5 h-5 shrink-0 text-[#4A1E9E]" /> : <ChevronDown className="w-5 h-5 shrink-0 text-[#4A1E9E]" />}
                </button>
                
                <AnimatePresence>
                  {faqOpen["q3"] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 text-xs md:text-sm text-[#4A1E9E]/90 leading-relaxed border-t border-[#4A1E9E]/20 pt-3 font-sans"
                    >
                      Puceal securely utilizes transient Jitsi conference lines. Your video calls are completely peer-to-peer and unrecorded. Once both speakers disconnect from the room, Jitsi immediately terminates and self-destructs the room parameters automatically. No visual or audio data ever touches our database!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Q4 */}
              <div className="bg-gray-50 rounded-[32px] overflow-hidden border border-gray-200 shadow-sm">
                <button
                  onClick={() => toggleFaq("q4")}
                  className="w-full px-6 py-5.5 flex items-center justify-between text-left font-serif font-bold text-gray-800 text-base md:text-lg focus:outline-none cursor-pointer"
                >
                  <span>Can I practice alone if no other speaker is online?</span>
                  {faqOpen["q4"] ? <ChevronUp className="w-5 h-5 shrink-0 text-gray-700" /> : <ChevronDown className="w-5 h-5 shrink-0 text-gray-700" />}
                </button>
                
                <AnimatePresence>
                  {faqOpen["q4"] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 text-xs md:text-sm text-gray-700/90 leading-relaxed border-t border-gray-200 pt-3 font-sans"
                    >
                      Yes! If you stay in the matchmaking queue for more than 6 seconds, Puceal's custom queue detector will invite you to match with one of our AI Speaking Buddies (like Socrates or Chloe). This joins you to an active speaking workspace where you can practice video speaking directly, test topics with Gemini, and write glossary logs.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* [PAGE 6]: PRIVACY POLICY                                  */}
        {/* ========================================================= */}
        {activeTab === "privacy" && (
          <PrivacyPolicy onBackToDashboard={() => setActiveTab("home")} />
        )}

        {/* ========================================================= */}
        {/* [PAGE 7]: TERMS OF SERVICE                                */}
        {/* ========================================================= */}
        {activeTab === "terms" && (
          <TermsOfService onBackToDashboard={() => setActiveTab("home")} />
        )}

      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#FFFDF9] border-t border-gray-100 py-16 px-6 font-sans text-gray-500 mt-20 relative">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          {/* Left Column: Logo & Buttons */}
          <div className="flex flex-col items-center md:items-start space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="font-logo font-bold text-[#4A1E9E] text-2xl tracking-tight">Puceal</span>
            </div>
            
            <div className="flex flex-col gap-3 w-full max-w-[220px]">
              <button 
                onClick={() => alert("Contact support at support@puceal.com")}
                className="w-full bg-[#F3F0FB] hover:bg-[#E8E4F7] text-[#4A1E9E] font-bold text-sm py-3 px-6 rounded-2xl transition-all cursor-pointer text-center shadow-xs border border-transparent"
              >
                Contact Us
              </button>

              <button 
                onClick={() => setIsDonateModalOpen(true)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm py-3 px-6 rounded-2xl transition-all cursor-pointer text-center shadow-md flex items-center justify-center space-x-2"
                id="footer-donate-btn"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Donate to Puceal</span>
              </button>
            </div>
            
            <div className="flex gap-6 text-xs text-gray-400 font-medium">
              <button 
                onClick={() => {
                  setActiveTab("privacy");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }} 
                className="hover:text-[#4A1E9E] transition cursor-pointer text-gray-400 font-medium text-xs bg-transparent border-none p-0"
                id="footer-privacy-btn"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => {
                  setActiveTab("terms");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }} 
                className="hover:text-[#4A1E9E] transition cursor-pointer text-gray-400 font-medium text-xs bg-transparent border-none p-0"
                id="footer-terms-btn"
              >
                Terms of Service
              </button>
            </div>
          </div>

          {/* Right Column: Socials & Details */}
          <div className="flex flex-col items-center md:items-start space-y-6 text-center md:text-left text-xs text-gray-400 leading-relaxed">
            {/* Social media icons */}
            <div className="flex gap-3 justify-center md:justify-start">
              {/* Instagram */}
              <a 
                href="https://www.instagram.com/puceal_dailyenglishspeaking?igsh=MTVycmpiazJidWhzOA%3D%3D&utm_source=qr" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white hover:bg-rose-50 hover:border-rose-300 transition text-gray-500 hover:text-rose-500 shadow-xs cursor-pointer"
                id="footer-instagram-link"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
              {/* YouTube */}
              <a 
                href="https://youtube.com/@puceal?si=oYRY6R3RbidH-xKZ" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white hover:bg-rose-50 hover:border-red-300 transition text-gray-500 hover:text-red-600 shadow-xs cursor-pointer"
                id="footer-youtube-link"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.107C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.511a3.003 3.003 0 00-2.11 2.107C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.107C4.482 20.455 12 20.455 12 20.455s7.518 0 9.388-.511a3.003 3.003 0 002.11-2.107C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              {/* TikTok */}
              <a 
                href="https://www.tiktok.com/@puceal?_r=1&_t=ZS-98KEyr8NSdB" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white hover:bg-slate-50 hover:border-black transition text-gray-500 hover:text-black shadow-xs cursor-pointer"
                id="footer-tiktok-link"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.81-.74-3.94-1.69-.22-.19-.42-.38-.62-.59-.04 1.78-.02 3.56-.02 5.34 0 1.95-.44 3.96-1.55 5.57-1.31 1.93-3.6 3.12-5.94 3.18-2.6.07-5.26-1.12-6.66-3.32-1.54-2.42-1.4-5.83.47-8.08.71-.85 1.63-1.49 2.66-1.85V10.2c-.8.25-1.54.75-2.03 1.44-.82 1.16-.83 2.78-.06 3.97.77 1.19 2.22 1.91 3.63 1.74 1.34-.16 2.5-1.2 2.76-2.52.09-.46.08-.94.08-1.41V0c-.01.01 0 .02 0 .02z"/>
                </svg>
              </a>
              {/* Facebook */}
              <a 
                href="https://www.facebook.com/share/1C91KA5DEH/?mibextid=wwXIfr" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white hover:bg-blue-50 hover:border-blue-300 transition text-gray-500 hover:text-blue-600 shadow-xs cursor-pointer"
                id="footer-facebook-link"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>

            <div className="space-y-1.5 text-gray-400">
              <p className="font-semibold text-gray-700">Puceal, Inc.</p>
              <p>Founder: <span className="font-medium text-gray-600">Anh Nguyen Tu</span></p>
            </div>

            <div className="space-y-0.5 text-gray-400">
              <p>© 2026 PUCEAL Inc.</p>
              <p>All Rights Reserved.</p>
              <p className="font-mono text-[10px] text-gray-300">v.1.0.0</p>
            </div>
          </div>

        </div>

      </footer>

      {/* Speaker Identity & Account Settings Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div 
            onClick={() => setShowProfileModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] w-full max-w-md p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 relative text-left my-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition cursor-pointer flex items-center justify-center shadow-2xs"
                title="Thoát / Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-[#4A1E9E] flex items-center gap-2">
                  <User className="w-6 h-6 text-[#4A1E9E]" />
                  <span>Speaker Workspace</span>
                </h3>
                <p className="text-gray-400 text-xs">
                  {isLoggedIn ? `Logged in as ${userEmail}` : "Customize your temporary speaker profile"}
                </p>
              </div>

              {/* Speaker Customization Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => updateDisplayName(e.target.value)}
                    placeholder="e.g. Alex"
                    maxLength={18}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20 focus:border-[#4A1E9E]"
                  />
                </div>

                {isLoggedIn && (
                  <div className="space-y-4">
                    {/* Account Metrics (Conversations & Actual Practice Time) */}
                    <div className="bg-[#EDE9FE]/40 rounded-2xl p-4 border border-[#DDD6FE]/30 space-y-2.5">
                      <p className="text-xs font-bold text-[#4A1E9E] uppercase tracking-wider">Account Metrics</p>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase">Conversations</span>
                          <span className="text-sm font-bold text-gray-800">{profileStats.conversations}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase">Actual Practice Time</span>
                          <span className="text-sm font-bold text-gray-800">{getFormattedActualStudyTime()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Streak Box matching Duolingo style (Dynamic Supabase Backed) */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4 text-left font-sans">
                      <div className="flex items-center space-x-4">
                        {/* Large Flame Badge */}
                        <div className={`relative w-18 h-20 rounded-[28px] flex flex-col items-center justify-center text-white shadow-inner border transition-all ${
                          currentStreak > 0 
                            ? "bg-gradient-to-b from-orange-500 to-amber-600 border-orange-400 shadow-orange-200" 
                            : "bg-gray-200 border-gray-300"
                        }`}>
                          <div className="relative">
                            <Flame className={`w-6 h-6 mb-0.5 ${currentStreak > 0 ? "text-white fill-white animate-pulse" : "text-gray-400 fill-gray-400"}`} />
                          </div>
                          <span className="text-lg font-extrabold text-white leading-none tracking-tight">
                            {currentStreak}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xl font-black text-gray-900 tracking-tight">Streak</h4>
                            {currentStreak > 0 && (
                              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium leading-normal max-w-[210px]">
                            {currentStreak > 0
                              ? `${currentStreak} day${currentStreak > 1 ? "s" : ""} in a row! Keep practicing daily.`
                              : "Complete a lesson today to start your streak!"}
                          </p>
                        </div>
                      </div>

                      {/* 7 Days Row (Dynamic Weekly Calendar) */}
                      <div className="grid grid-cols-7 gap-1 text-center pt-3 border-t border-gray-100">
                        {weeklyDays.map((dayItem, idx) => (
                          <div key={idx} className="flex flex-col items-center space-y-1">
                            <span className={`text-xs font-bold ${dayItem.isToday ? "text-orange-600 font-extrabold underline" : "text-gray-400"}`}>
                              {dayItem.label}
                            </span>
                            <div
                              title={`${dayItem.dateStr}${dayItem.active ? " (Completed)" : ""}`}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                dayItem.active
                                  ? "bg-orange-500 text-white shadow-xs"
                                  : dayItem.isToday
                                  ? "bg-orange-100 text-orange-500 border-2 border-dashed border-orange-400"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {dayItem.active ? (
                                <Check className="w-4.5 h-4.5 stroke-[3]" />
                              ) : (
                                <span className="text-[10px] font-bold opacity-60">{dayItem.dateStr.split("-")[2]}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Login / SignUp Switch or Logout + Explicit Close Button */}
              <div className="border-t border-gray-100 pt-5 flex items-center justify-between gap-3">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                    <button
                      onClick={() => setShowProfileModal(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <X className="w-4 h-4" />
                      <span>Thoát / Close</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col space-y-3 w-full">
                    <p className="text-[11px] text-gray-400 text-center leading-normal">
                      🔒 Log in to lock in your streaks, vocabulary lists, and track speech progress!
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAuthMode("login");
                          setShowProfileModal(false);
                          setActiveTab("start-speaking"); // redirects to Auth Screen
                        }}
                        className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                      >
                        Log In
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode("signup");
                          setShowProfileModal(false);
                          setActiveTab("start-speaking"); // redirects to Auth Screen
                        }}
                        className="flex-1 text-center bg-[#4A1E9E] hover:bg-[#3B187F] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                      >
                        Sign Up
                      </button>
                      <button
                        onClick={() => setShowProfileModal(false)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold px-3 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center"
                        title="Thoát / Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING SITE ASSISTANT CHATBOT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 font-sans">
        {!isChatbotOpen ? (
          <button
            onClick={() => setIsChatbotOpen(true)}
            className="bg-gradient-to-r from-[#4A1E9E] to-[#7C3AED] hover:from-[#3B187F] hover:to-[#6D28D9] text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer border-2 border-white/20 relative group"
            title="Ask Puceal AI Assistant"
          >
            <Bot className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></span>
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 sm:w-96 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col h-[500px] max-h-[85vh] z-50 text-left"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#4A1E9E] to-[#6D28D9] p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Bot className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h4 className="font-logo font-bold text-sm">Puceal AI Assistant</h4>
                  <p className="text-[10px] text-gray-200 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Ready 24/7</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChatbotOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/60 text-xs">
              {chatbotMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#4A1E9E] text-white rounded-br-xs font-medium"
                        : "bg-white text-gray-800 border border-gray-100 shadow-xs rounded-bl-xs"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className={`text-[9px] mt-1 block font-mono ${msg.sender === "user" ? "text-purple-200 text-right" : "text-gray-400"}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}

              {chatbotLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 p-3 rounded-2xl flex items-center space-x-2 text-gray-400 text-xs shadow-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4A1E9E]" />
                    <span>AI is typing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggested Query Chips */}
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
              {[
                "What is Puceal?",
                "How to use AI Buddy?",
                "Where are Live Notes saved?",
                "View Bar Chart stats"
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendChatbotMessage(chip)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-[#4A1E9E] font-medium border border-purple-100 transition cursor-pointer shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendChatbotMessage(); }} className="p-3 bg-white border-t border-gray-100 flex items-center space-x-2">
              <input
                type="text"
                value={chatbotInput}
                onChange={(e) => setChatbotInput(e.target.value)}
                placeholder="Ask about Puceal..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4A1E9E]/20"
              />
              <button
                type="submit"
                disabled={!chatbotInput.trim() || chatbotLoading}
                className="bg-[#4A1E9E] hover:bg-[#3B187F] disabled:bg-gray-300 text-white p-2.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </div>

      {/* Global Donate Modal */}
      <DonateModal
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
        currentUserEmail={userEmail}
        currentUserId={uid}
      />

    </div>
  );
}
