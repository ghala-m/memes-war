import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

const dict = {
  en: {
    tagline: "Pick the emoji. Win the crowd.",
    subtitle:
      "A real-time party game: everyone answers the prompt with one emoji, then votes for the best.",
    play: "Play",
    createRoom: "Create Room",
    joinRoom: "Join Room",
    nickname: "Nickname",
    roomCode: "Room code",
    rounds: "Rounds",
    back: "Back",
    create: "Create",
    join: "Join",
    lobby: "Lobby",
    players: "Players",
    startGame: "Start Game",
    needPlayers: "Need at least 3 players",
    shareCode: "Share this code with your friends",
    round: "Round",
    of: "of",
    getReady: "Get ready…",
    pickEmoji: "Pick your emoji",
    locked: "Locked in",
    waitingOthers: "Waiting for the others…",
    theSubmissions: "The submissions",
    anonymous: "Anonymous until scoring",
    voteNow: "Vote for the best",
    cantVoteSelf: "You can't vote for your own",
    voted: "Vote cast",
    results: "Results",
    winner: "Winner",
    leaderboard: "Leaderboard",
    finalResults: "Final results",
    champion: "Champion",
    playAgain: "Play again",
    home: "Home",
    hostControls: "Host controls",
    skip: "Skip",
    pause: "Pause",
    resume: "Resume",
    end: "End game",
    kick: "Kick",
    paused: "Paused",
    pts: "pts",
    votes: "votes",
    you: "You",
    host: "Host",
    submitted: "submitted",
    notFound: "Room not found",
    joinThisRoom: "Join this room",
    scoring: "How scoring works",
    rule1: "+10 if your emoji wins the round",
    rule2: "+5 for every vote your emoji gets",
    rule3: "+3 if you vote for the winning emoji",
    questions: "Questions",
    chooseQuestions: "Choose questions (optional)",
    questionBank: "Question bank",
    myLibrary: "My library",
    addQuestion: "Add question",
    newQuestion: "New question",
    english: "English",
    arabic: "Arabic",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    remove: "Delete",
    selected: "selected",
    clearSelection: "Clear all",
    noSaved: "No saved questions yet — add one above.",
    randomNote: "Remaining rounds use random questions.",
    hostOnly: "Only the host can set the questions.",
    saved: "Saved",
    done: "Done",
  },

  ar: {
    tagline: "اختر الإيموجي. اكسب الجمهور.",
    subtitle: "لعبة جماعية مباشرة: كل لاعب يجاوب على السؤال بإيموجي واحد، ثم يصوّت على الأفضل.",
    play: "العب",
    createRoom: "إنشاء غرفة",
    joinRoom: "دخول غرفة",
    nickname: "الاسم",
    roomCode: "رمز الغرفة",
    rounds: "الجولات",
    back: "رجوع",
    create: "إنشاء",
    join: "دخول",
    lobby: "الغرفة",
    players: "اللاعبون",
    startGame: "ابدأ اللعبة",
    needPlayers: "نحتاج ٣ لاعبين على الأقل",
    shareCode: "شارك هذا الرمز مع أصدقائك",
    round: "الجولة",
    of: "من",
    getReady: "استعدوا…",
    pickEmoji: "اختر الإيموجي",
    locked: "تم التثبيت",
    waitingOthers: "بانتظار البقية…",
    theSubmissions: "الاختيارات",
    anonymous: "مجهولة حتى النتائج",
    voteNow: "صوّت للأفضل",
    cantVoteSelf: "لا يمكنك التصويت لاختيارك",
    voted: "تم التصويت",
    results: "النتائج",
    winner: "الفائز",
    leaderboard: "الترتيب",
    finalResults: "النتائج النهائية",
    champion: "البطل",
    playAgain: "العب مرة أخرى",
    home: "الرئيسية",
    hostControls: "تحكم المضيف",
    skip: "تخطي",
    pause: "إيقاف",
    resume: "استئناف",
    end: "إنهاء",
    kick: "طرد",
    paused: "متوقفة",
    pts: "نقطة",
    votes: "صوت",
    you: "أنت",
    host: "المضيف",
    submitted: "اختار",
    notFound: "الغرفة غير موجودة",
    joinThisRoom: "ادخل هذه الغرفة",
    scoring: "طريقة النقاط",
    rule1: "+١٠ إذا فاز الإيموجي الخاص بك",
    rule2: "+٥ لكل صوت يحصل عليه اختيارك",
    rule3: "+٣ إذا صوّت للإيموجي الفائز",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const I18nContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => dict.en[k] });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("mw_lang");
    if (stored === "ar" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("mw_lang", l);
  }, []);

  const t = useCallback((k: TKey) => dict[lang][k], [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
