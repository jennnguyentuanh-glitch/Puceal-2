import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase Client on Server
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://zjnnntxndwpfynpjrqey.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_WM2GM8xsI7EZnpuF2cv5iQ_HvIiQQPQ";
let supabaseServer: any = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseServer = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.warn("Server Supabase init notice:", e);
  }
}

// Lazy initialization for Stripe Client
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY || "sk_test_51TxgXmRrU7sGy9OMrfcENh6GZeJ7MBhe47ZIV0A9MJK2tG9vKynoE5kVdYmoMZwZibSenBk1vFqFwSGn6wPi4L4900veNNGU6X";
    if (key) {
      stripeClient = new Stripe(key);
    }
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // In-memory data
  interface QueueUser {
    uid: string;
    displayName: string;
    mode: "discuss" | "debate";
    language: string;
    joinedAt: number;
  }

  interface Room {
    roomId: string;
    user1: { uid: string; displayName: string; isAI?: boolean };
    user2: { uid: string; displayName: string; isAI?: boolean };
    mode: "discuss" | "debate";
    language: string;
    topic: string;
    createdAt: number;
  }

  let queue: QueueUser[] = [];
  let rooms: Room[] = [];
  let notebooks: Record<string, any[]> = {};
  let activePresenceMap: Record<string, number> = {};

  // Real Presence heartbeat endpoint
  app.post("/api/presence/heartbeat", (req, res) => {
    const { uid } = req.body;
    if (uid) {
      activePresenceMap[uid] = Date.now();
    }

    // Clean up stale users (inactive for > 15 seconds)
    const now = Date.now();
    Object.keys(activePresenceMap).forEach((id) => {
      if (now - activePresenceMap[id] > 15000) {
        delete activePresenceMap[id];
      }
    });

    const count = Object.keys(activePresenceMap).length;
    res.json({ count });
  });

  function getLogs(uid: string) {
    if (!notebooks[uid]) {
      notebooks[uid] = [
        {
          id: "1",
          date: "2026-07-15",
          partnerName: "Akihiro",
          country: "Japan",
          mode: "discuss",
          duration: "05:00",
          notes: "Shared childhood memories and traditional Japanese festivals. Learned about paper lanterns.",
          glossary: ["Nostalgia", "Lantern festival", "Empathetic listening"]
        },
        {
          id: "2",
          date: "2026-07-18",
          partnerName: "Elena",
          country: "Spain",
          mode: "debate",
          duration: "05:00",
          notes: "Debated whether remote work increases creativity. Highlighted flexibility and deep work.",
          glossary: ["Rhetoric", "Asynchronous productivity", "Constructive debate"]
        }
      ];
    }
    return notebooks[uid];
  }

  // GoogleGenAI client (lazy load)
  let aiInstance: GoogleGenAI | null = null;
  function getAI() {
    if (!aiInstance) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will be unavailable.");
        return null;
      }
      aiInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiInstance;
  }

  // 1. Join matchmaking queue
  app.post("/api/match/join", (req, res) => {
    const { uid, displayName, mode, language } = req.body;
    if (!uid || !displayName || !mode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Cancel existing matchmaking status if any
    queue = queue.filter(u => u.uid !== uid);
    rooms = rooms.filter(r => r.user1.uid !== uid && r.user2.uid !== uid);

    const newUser: QueueUser = {
      uid,
      displayName,
      mode,
      language: language || "Any",
      joinedAt: Date.now()
    };

    queue.push(newUser);

    // Try matchmaking
    // Find compatible partner
    const partnerIndex = queue.findIndex(
      (q) =>
        q.uid !== uid &&
        q.mode === mode &&
        (q.language === newUser.language || q.language === "Any" || newUser.language === "Any")
    );

    if (partnerIndex !== -1) {
      const partner = queue[partnerIndex];
      // Remove both from queue
      queue = queue.filter((q) => q.uid !== uid && q.uid !== partner.uid);

      const roomId = `Puceal_${mode}_${Math.random().toString(36).substring(2, 9)}`;
      const room: Room = {
        roomId,
        user1: { uid, displayName },
        user2: { uid: partner.uid, displayName: partner.displayName },
        mode,
        language: newUser.language === "Any" ? partner.language : newUser.language,
        topic: "", // Generated later
        createdAt: Date.now()
      };
      rooms.push(room);
      return res.json({ matched: true, room });
    }

    res.json({ matched: false, status: "queued" });
  });

  // 2. Poll matchmaking status
  app.post("/api/match/status", (req, res) => {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    // Check if user is in a room
    const room = rooms.find(r => r.user1.uid === uid || r.user2.uid === uid);
    if (room) {
      return res.json({ matched: true, room });
    }

    // Check if still in queue
    const userInQueue = queue.find(q => q.uid === uid);
    if (!userInQueue) {
      return res.json({ matched: false, status: "idle" });
    }

    // Let the client know if they have been waiting for over 6 seconds to offer simulated matchmaking
    const waitTime = Date.now() - userInQueue.joinedAt;
    res.json({ 
      matched: false, 
      status: "queued", 
      offerSimulated: waitTime > 6000 
    });
  });

  // 3. Simulated matchmaking (force pairing with AI)
  app.post("/api/match/simulate", (req, res) => {
    const { uid } = req.body;
    const userInQueue = queue.find(q => q.uid === uid);
    if (!userInQueue) {
      return res.status(404).json({ error: "User not found in queue" });
    }

    queue = queue.filter(q => q.uid !== uid);

    const virtualPartners = [
      { name: "Socrates (AI Scholar)", country: "Greece" },
      { name: "Aria (AI Coach)", country: "Japan" },
      { name: "Julian (AI Debate Pro)", country: "Canada" },
      { name: "Chloe (AI Language Partner)", country: "France" }
    ];
    const chosenPartner = virtualPartners[Math.floor(Math.random() * virtualPartners.length)];

    const roomId = `Puceal_${userInQueue.mode}_sim_${Math.random().toString(36).substring(2, 9)}`;
    const room: Room = {
      roomId,
      user1: { uid, displayName: userInQueue.displayName },
      user2: { uid: "ai_partner", displayName: chosenPartner.name, isAI: true },
      mode: userInQueue.mode,
      language: userInQueue.language === "Any" ? "English" : userInQueue.language,
      topic: "",
      createdAt: Date.now()
    };

    rooms.push(room);
    res.json({ matched: true, room });
  });

  // 4. Cancel matchmaking queue
  app.post("/api/match/cancel", (req, res) => {
    const { uid } = req.body;
    queue = queue.filter(q => q.uid !== uid);
    rooms = rooms.filter(r => r.user1.uid !== uid && r.user2.uid !== uid);
    res.json({ success: true });
  });

  // 5. Leave room / end session
  app.post("/api/match/leave", (req, res) => {
    const { uid, roomId } = req.body;
    rooms = rooms.filter(r => r.roomId !== roomId);
    res.json({ success: true });
  });

  // 6. Gemini-powered Conversation Starters & Topics
  app.post("/api/gemini/topic", async (req, res) => {
    const { mode, language } = req.body;
    const ai = getAI();
    if (!ai) {
      const defaultTopic = mode === "discuss"
        ? "If you could instantly become an expert in any one subject or skill, what would it be?"
        : "Is reading printed books superior to reading ebooks or audiobooks? Pro: Prints are better; Con: Digital is superior.";
      return res.json({ topic: defaultTopic });
    }

    try {
      let prompt = "";
      if (mode === "discuss") {
        prompt = `Generate one friendly, engaging, and thought-provoking question for two strangers to discuss in a 5-minute casual conversation. Keep it concise, accessible, and warm. Current language: ${language || 'English'}. Do not include quotes.`;
      } else {
        prompt = `Generate a fun, light-hearted debate topic with a clearly defined Pro and Con side for a 5-minute conversation. Keep it polite, non-political, and highly conversational. Format with a clear Topic, Pro, and Con summary. Current language: ${language || 'English'}. Do not use complex markdown formatting, just plain text.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.85,
        }
      });

      res.json({ topic: response.text || "Share an interesting life goal that you want to achieve in the next 12 months!" });
    } catch (error: any) {
      console.error("Gemini Topic error:", error);
      res.json({ topic: "What is your absolute favorite creative hobby and how did you get started?" });
    }
  });

  // 7. Get user's speaking log history
  app.get("/api/notebook/logs", (req, res) => {
    const uid = (req.query.uid as string) || "default_user";
    res.json({ logs: getLogs(uid) });
  });

  // 8. Save speaking log
  app.post("/api/notebook/save", (req, res) => {
    const { uid, date, partnerName, country, mode, duration, notes, glossary } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    const logs = getLogs(uid);
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      date: date || new Date().toISOString().split("T")[0],
      partnerName: partnerName || "Speaking Partner",
      country: country || "Unknown",
      mode: mode || "discuss",
      duration: duration || "05:00",
      notes: notes || "",
      glossary: glossary || []
    };

    logs.unshift(newLog); // Prepend to history
    res.json({ success: true, logs });
  });

  // 9. Gemini Notebook Insights
  app.post("/api/notebook/insights", async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    const logs = getLogs(uid);
    if (logs.length === 0) {
      return res.json({
        insights: "💡 Complete your first live speaking match to unlock custom Gemini insights!"
      });
    }

    const ai = getAI();
    if (!ai) {
      return res.json({
        insights: "💡 You are doing fantastic! Keep connecting with speakers in both Discuss and Debate modes to grow your English/language confidence."
      });
    }

    try {
      const logSummary = logs
        .map(l => `- Date: ${l.date}, Mode: ${l.mode}, Partner: ${l.partnerName}, Notes: ${l.notes}, Glossary: ${l.glossary?.join(", ")}`)
        .join("\n");

      const prompt = `Based on the following log of speaking practice sessions, provide an encouraging, highly professional analysis of my learning progress. Highlight my strengths based on these logs, suggest 2 communication skills to focus on, and recommend 2 advanced words/idioms relevant to my practice logs. Format the response as simple scannable HTML paragraphs or bullet points, and keep it under 150 words total. Do not include outer html tags or head/body elements.
      
      Logs:
      ${logSummary}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ insights: response.text || "Your progress shows regular engagement. Focus on expanding vocabulary and structuring structured arguments during debates." });
    } catch (error) {
      console.error("Insights error:", error);
      res.json({ insights: "Great job on your speaking practice! To accelerate growth, try alternating between empathetic listening in Discuss Mode and active rebuttals in Debate Mode." });
    }
  });

  // 10. Site Assistant Chatbot API
  app.post("/api/chatbot", async (req, res) => {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const ai = getAI();
    const systemInstruction = `You are the AI Assistant for the Puceal web platform.
Puceal is a global real-time language speaking practice platform (5 minutes per session).
Key features of Puceal:
1. "Start Speaking": Allows real-time automatic matching with other language learners worldwide in either Discuss (casual conversation) or Debate (argumentative reasoning) modes.
2. "AI Buddy": If no peer match is found or if the user prefers practicing directly with AI, clicking "AI Buddy" starts a direct voice conversation with Gemini AI using the microphone (voice-only, no camera required).
3. "Live Session Notes": Users can write live notes during a call, which are automatically saved into their Notebook upon session completion.
4. "Notebook & Supabase": A personal repository for speaking practice logs, learned vocabulary, visual Bar Chart statistics, and Gemini AI progress insights.
5. "Device Calibration": Allows users to test microphone and camera on the home page before starting sessions.

Please answer clearly, concisely, and helpfully in English.`;

    if (!ai) {
      // Intelligent fallback response if GEMINI_API_KEY is missing
      const msgLower = message.toLowerCase();
      let reply = "Hello! I'm your Puceal Assistant. Puceal helps you practice speaking English and languages via 5-minute live sessions with peers or AI Buddy!";
      if (msgLower.includes("start speaking") || msgLower.includes("match")) {
        reply = "To get started, go to 'Start Speaking', choose Discuss or Debate mode, and click 'Start Matchmaking'. If no match is available, click 'AI Buddy' to converse directly with Gemini AI!";
      } else if (msgLower.includes("ai buddy") || msgLower.includes("gemini") || msgLower.includes("ai")) {
        reply = "AI Buddy lets you practice speaking directly with AI using your microphone (voice-only, no camera needed). It is perfect for solo practice anytime!";
      } else if (msgLower.includes("notebook") || msgLower.includes("note") || msgLower.includes("chart")) {
        reply = "All live session notes and vocabulary are automatically saved into your Notebook. You can also view your speaking practice Bar Chart and AI Insights there!";
      }
      return res.json({ reply });
    }

    try {
      const contents = [
        { role: "user", parts: [{ text: `[System Context: ${systemInstruction}]` }] },
        ...(Array.isArray(history) ? history.map((h: any) => ({
          role: h.sender === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        })) : []),
        { role: "user", parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
      });

      res.json({ reply: response.text || "Puceal is a live speaking platform powered by real-time video matching and AI Buddy. Choose Start Speaking to begin!" });
    } catch (error) {
      console.error("Chatbot API error:", error);
      res.json({ reply: "Puceal connects you with global language partners or AI Buddy. Try selecting Start Speaking to begin your practice!" });
    }
  });

  // 11. AI Buddy Response API for Live Session Chat
  app.post("/api/gemini/speech", async (req, res) => {
    const { userText, topic, mode } = req.body;
    const ai = getAI();
    if (!ai) {
      return res.json({ response: "That's a fantastic point! Could you elaborate a bit more on how that impacts your daily routine?" });
    }

    try {
      const prompt = `You are an encouraging, articulate English conversation partner speaking with a learner in a 5-minute session on Puceal. 
Topic: ${topic || 'General Discussion'}
Mode: ${mode || 'discuss'}
User said: "${userText}"

Reply naturally, warmly, and concisely in 1-2 spoken sentences to keep the conversation flowing smoothly. Offer a follow-up question.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ response: response.text || "I completely agree with your perspective. What led you to that conclusion?" });
    } catch (err) {
      console.error("Gemini Speech error:", err);
      res.json({ response: "That sounds fascinating! Tell me more about what you enjoy most about it." });
    }
  });

  // ==========================================
  // DONATION FEATURE ENDPOINTS (Stripe Checkout & Supabase DB)
  // ==========================================
  
  interface DonationRecord {
    id?: string;
    userId: string;
    donorName: string;
    donorEmail: string;
    amount: number;
    currency: string;
    status: "pending" | "success" | "failed";
    transactionId: string;
    message?: string;
    createdAt: string;
  }

  let memoryDonations: DonationRecord[] = [];

  // Helper to validate UUID format
  const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // 1. Create Donation Session & Stripe Checkout Session
  app.post("/api/donate/create-session", async (req, res) => {
    try {
      const { userId = "anonymous", donorName = "Puceal Supporter", donorEmail = "supporter@example.com", amount, currency = "USD", message = "" } = req.body;
      
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid donation amount." });
      }

      const transactionId = "DON-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7).toUpperCase();
      const createdAt = new Date().toISOString();

      const newDonation: DonationRecord = {
        userId,
        donorName,
        donorEmail,
        amount: parsedAmount,
        currency,
        status: "pending",
        transactionId,
        message,
        createdAt
      };

      memoryDonations.unshift(newDonation);

      // Attempt Supabase insert automatically
      const dbUserId = isUUID(userId) ? userId : null;
      if (supabaseServer) {
        try {
          await supabaseServer.from("donations").insert([{
            user_id: dbUserId,
            amount: parsedAmount,
            currency,
            status: "pending",
            transaction_id: transactionId,
            created_at: createdAt
          }]);
        } catch (dbErr) {
          console.warn("Supabase donation insert notice:", dbErr);
        }
      }

      // Create Stripe Checkout Session if Stripe is available
      const stripe = getStripe();
      let stripeCheckoutUrl = "";
      let stripeSessionId = "";

      if (stripe) {
        try {
          const appUrl = process.env.APP_URL || (req.headers.origin ? req.headers.origin : "http://localhost:3000");
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer_email: donorEmail && donorEmail.includes("@") ? donorEmail : undefined,
            line_items: [
              {
                price_data: {
                  currency: currency.toLowerCase(),
                  product_data: {
                    name: "Donation to Puceal Platform",
                    description: message || "Support global English practice & AI Buddy development",
                  },
                  unit_amount: Math.round(parsedAmount * 100), // in cents
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            metadata: {
              userId,
              donorName,
              donorEmail,
              amount: parsedAmount.toString(),
              transactionId,
              message,
            },
            success_url: `${appUrl}?donate_success=true&session_id={CHECKOUT_SESSION_ID}&tx_id=${transactionId}`,
            cancel_url: `${appUrl}?donate_cancel=true`,
          });

          stripeCheckoutUrl = session.url || "";
          stripeSessionId = session.id;
        } catch (stripeErr: any) {
          console.error("Stripe Checkout creation error:", stripeErr);
        }
      }

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PUCEAL-PAY-${transactionId}`;

      res.json({
        success: true,
        transactionId,
        amount: parsedAmount,
        currency,
        status: "pending",
        qrCodeUrl,
        stripeCheckoutUrl,
        stripeSessionId
      });
    } catch (error: any) {
      console.error("Create donation session error:", error);
      res.status(500).json({ success: false, message: "Server error creating donation session." });
    }
  });

  // 2. Verify Stripe Session and Sync with Supabase
  app.get("/api/donate/verify-session", async (req, res) => {
    const sessionId = req.query.session_id as string;
    const txId = req.query.tx_id as string;

    const stripe = getStripe();
    let isPaid = false;

    if (stripe && sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === "paid") {
          isPaid = true;
        }
      } catch (e) {
        console.warn("Stripe session retrieve error:", e);
      }
    } else {
      isPaid = true;
    }

    const targetTx = txId || sessionId;
    if (targetTx) {
      const memoryRecord = memoryDonations.find(d => d.transactionId === targetTx);
      if (memoryRecord) {
        memoryRecord.status = isPaid ? "success" : "pending";
      }

      if (supabaseServer) {
        try {
          await supabaseServer
            .from("donations")
            .update({ status: isPaid ? "success" : "pending" })
            .eq("transaction_id", targetTx);
        } catch (e) {
          console.warn("Supabase status update error:", e);
        }
      }
    }

    res.json({ success: isPaid, transactionId: targetTx });
  });

  // 3. Donation Status Check Endpoint
  app.get("/api/donate/status/:transactionId", async (req, res) => {
    const { transactionId } = req.params;
    
    // Check memory first
    const record = memoryDonations.find(d => d.transactionId === transactionId);
    
    if (supabaseServer) {
      try {
        const { data, error } = await supabaseServer
          .from("donations")
          .select("status, amount, transaction_id")
          .eq("transaction_id", transactionId)
          .single();

        if (!error && data) {
          return res.json({
            transactionId: data.transaction_id,
            status: data.status,
            amount: data.amount
          });
        }
      } catch (e) {
        // Fallback to memory
      }
    }

    if (record) {
      return res.json({
        transactionId: record.transactionId,
        status: record.status,
        amount: record.amount
      });
    }

    res.status(404).json({ success: false, message: "Transaction not found." });
  });

  // 4. Simulated Payment Trigger (For instant UI demo)
  app.post("/api/donate/simulated-pay", async (req, res) => {
    const { transactionId } = req.body;
    
    let found = memoryDonations.find(d => d.transactionId === transactionId);
    if (found) {
      found.status = "success";
    }

    if (supabaseServer) {
      try {
        await supabaseServer
          .from("donations")
          .update({ status: "success" })
          .eq("transaction_id", transactionId);
      } catch (e) {
        console.warn("Supabase status update error:", e);
      }
    }

    res.json({
      success: true,
      transactionId,
      status: "success",
      message: "Payment confirmed successfully!"
    });
  });

  // 5. Stripe / Custom Payment Webhook Endpoint
  app.post("/api/donate/webhook", async (req, res) => {
    try {
      const { transactionId, event = "payment.succeeded" } = req.body;

      if (!transactionId) {
        return res.status(400).json({ success: false, message: "Missing transactionId." });
      }

      // Update in memory
      const record = memoryDonations.find(d => d.transactionId === transactionId);
      const newStatus = event === "payment.succeeded" ? "success" : "failed";
      if (record) {
        record.status = newStatus;
      }

      // Update in Supabase database
      if (supabaseServer) {
        await supabaseServer
          .from("donations")
          .update({ status: newStatus })
          .eq("transaction_id", transactionId);
      }

      res.json({
        success: true,
        transactionId,
        status: newStatus,
        message: `Webhook processed for event: ${event}`
      });
    } catch (err: any) {
      console.error("Webhook error:", err);
      res.status(500).json({ success: false, message: "Webhook processing error." });
    }
  });

  // 6. Get User Donation History Endpoint
  app.get("/api/donate/history/:userId", async (req, res) => {
    const { userId } = req.params;

    if (supabaseServer) {
      try {
        let query = supabaseServer.from("donations").select("*").order("created_at", { ascending: false });
        if (isUUID(userId)) {
          query = query.eq("user_id", userId);
        }
        const { data, error } = await query;

        if (!error && data) {
          const formatted = data.map((d: any) => ({
            id: d.id,
            userId: d.user_id || "anonymous",
            donorName: d.donor_name || "Supporter",
            donorEmail: d.donor_email || "",
            amount: d.amount,
            currency: d.currency || "USD",
            status: d.status,
            transactionId: d.transaction_id,
            message: d.message || "",
            createdAt: d.created_at
          }));
          return res.json({ donations: formatted });
        }
      } catch (e) {
        console.warn("Error reading Supabase history:", e);
      }
    }

    // Memory fallback
    const filtered = memoryDonations.filter(d => d.userId === userId || d.userId === "anonymous" || userId === "anonymous");
    res.json({ donations: filtered });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
