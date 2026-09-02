export const PHASE_DURATIONS: Record<string, number> = {
  prompt: 5,
  submit: 60,
  reveal: 10,
  vote: 30,
  score: 10,
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;

export const EMOJI_SET = [
  "😂",
  "😭",
  "😍",
  "🤩",
  "😎",
  "🥹",
  "😤",
  "🤬",
  "😱",
  "🥶",
  "🤡",
  "💀",
  "🙃",
  "😴",
  "🤢",
  "🫠",
  "👀",
  "🔥",
  "💩",
  "🧠",
  "🫡",
  "🙏",
  "💅",
  "🐐",
] as const;

export const HAND_SIZE = 12;

export type Phase = "lobby" | "prompt" | "submit" | "reveal" | "vote" | "score" | "final";

export type MemeCard = {
  id: string;
  url: string;
  categories: string[];
};

export type PlayerView = {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  submitted: boolean;
  voted: boolean;
};

export type SubmissionView = {
  id: string;
  emoji: string;
  imageUrl: string | null;
  mine: boolean;
  ownerNickname: string | null;
  voteCount: number | null;
  isWinner: boolean;
  roundPoints: number | null;
};

export type GameState = {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  endsAt: string | null;
  paused: boolean;
  prompt: { en: string; ar: string } | null;
  me: { id: string; nickname: string; isHost: boolean; score: number } | null;
  players: PlayerView[];
  submissions: SubmissionView[];
  hand: MemeCard[];
  myMemeId: string | null;
  myEmoji: string | null;
  myVoteSubmissionId: string | null;
};

