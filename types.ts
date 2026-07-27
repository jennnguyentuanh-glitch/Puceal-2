export type ActiveTab = "home" | "how-it-works" | "notebook" | "start-speaking" | "faq" | "privacy" | "terms";

export type MatchMode = "discuss" | "debate";

export interface Room {
  roomId: string;
  user1: { uid: string; displayName: string };
  user2: { uid: string; displayName: string; isAI?: boolean };
  mode: MatchMode;
  language: string;
  topic: string;
  createdAt: number;
}

export interface SpeakingLog {
  id: string;
  date: string;
  partnerName: string;
  country: string;
  mode: MatchMode;
  duration: string;
  notes: string;
  glossary: string[];
}

export interface ProfileStats {
  rating: number;
  conversations: number;
  streak: number;
  minutes: number;
}
