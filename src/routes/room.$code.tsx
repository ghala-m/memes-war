import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { LangToggle } from "@/components/LangToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useI18n } from "@/lib/i18n";
import { MIN_PLAYERS, type GameState } from "@/lib/game-shared";
import { getHostKey, getNickname, getToken, setNickname, setToken } from "@/lib/player-session";
import {
  castVoteFn,
  createPromptFn,
  deletePromptFn,
  getQueuedPromptsFn,
  getStateFn,
  hostActionFn,
  joinRoomFn,
  listPromptsFn,
  setQueuedPromptsFn,
  startGameFn,
  submitMemeFn,
  touchPlayerFn,
  updatePromptFn,
} from "@/lib/game.functions";


export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — Memes War` },
      {
        name: "description",
        content: `Join Memes War room ${params.code} and battle your friends with memes in real time.`,
      },
      { property: "og:title", content: `Memes War — Room ${params.code}` },
      {
        property: "og:description",
        content: "Pick the meme. Win the crowd. Join the room and play.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoomPage,
});

function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
}

function RoomPage() {
  const { code } = Route.useParams();
  const upper = code.toUpperCase();
  const { t } = useI18n();
  const navigate = useNavigate();

  const getState = useServerFn(getStateFn);
  const joinRoom = useServerFn(joinRoomFn);
  const touch = useServerFn(touchPlayerFn);

  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTokenState(getToken(upper));
    setReady(true);
  }, [upper]);

  const query = useQuery({
    queryKey: ["room", upper, token],
    queryFn: () => getState({ data: { code: upper, token } }),
    refetchInterval: 1200,
    enabled: ready,
    retry: false,
  });

  // Live updates come from the 1.2s polling above (direct table reads are locked down).

  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(() => {
      void touch({ data: { code: upper, token } });
    }, 15000);
    return () => window.clearInterval(id);
  }, [token, upper, touch]);

  const state = query.data;

  if (!ready || (query.isLoading && !state)) {
    return <CenterMessage title="…" />;
  }

  if (query.isError) {
    return (
      <CenterMessage title={t("notFound")}>
        <Link to="/" className="btn-base btn-primary mt-4">
          {t("home")}
        </Link>
      </CenterMessage>
    );
  }

  if (!state) return <CenterMessage title="…" />;

  if (!state.me) {
    return (
      <JoinPanel
        code={upper}
        onJoined={(tk) => {
          setToken(upper, tk);
          setTokenState(tk);
          void query.refetch();
        }}
        joinRoom={joinRoom}
      />
    );
  }

  return (
    <GameScreen
      state={state}
      code={upper}
      token={token!}
      refetch={() => void query.refetch()}
      goHome={() => navigate({ to: "/" })}
    />
  );
}

function CenterMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      {children}
    </main>
  );
}

function MemeBrowser({
  memes,
  seconds,
  onPick,
  onClose,
}: {
  memes: { id: string; url: string }[];
  seconds: number | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
        <span className="font-display text-[0.6rem] tracking-widest uppercase">
          {t("browseAll")}
        </span>
        <div className="flex items-center gap-2">
          {seconds !== null && (
            <span className="rounded-full bg-primary px-3 py-1 font-display text-xs text-primary-foreground tabular-nums">
              {seconds}s
            </span>
          )}
          <button className="btn-base btn-ghost" onClick={onClose} aria-label={t("cancel")}>
            ✕
          </button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-3 sm:grid-cols-3 lg:grid-cols-4">
        {memes.map((meme) => (
          <button
            key={meme.id}
            aria-label="Meme card"
            className="meme-tile w-full"
            onClick={() => onPick(meme.id)}
          >
            <img src={meme.url} alt="Meme option" className="meme-img" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}



function JoinPanel({
  code,
  onJoined,
  joinRoom,
}: {
  code: string;
  onJoined: (token: string) => void;
  joinRoom: (args: { data: { code: string; nickname: string } }) => Promise<{ token: string }>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(getNickname());
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="panel w-full max-w-sm p-6">
        <h1 className="font-display text-2xl font-extrabold">{t("joinThisRoom")}</h1>
        <p className="mt-1 font-display text-3xl tracking-[0.3em] text-primary">{code}</p>
        <label className="mt-5 flex flex-col gap-1.5 text-sm font-semibold">
          {t("nickname")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="rounded-lg border border-input bg-secondary px-3 py-2.5 text-base outline-none focus:border-primary"
          />
        </label>
        <button
          className="btn-base btn-primary mt-4 w-full"
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await joinRoom({ data: { code, nickname: name.trim() } });
              setNickname(name.trim());
              onJoined(res.token);
            } catch {
              toast.error("Could not join this room.");
              setBusy(false);
            }
          }}
        >
          {t("join")}
        </button>
        <Link to="/" className="btn-base btn-ghost mt-2 w-full">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}

function GameScreen({
  state,
  code,
  token,
  refetch,
  goHome,
}: {
  state: GameState;
  code: string;
  token: string;
  refetch: () => void;
  goHome: () => void;
}) {
  const { t, lang } = useI18n();
  const submit = useServerFn(submitMemeFn);
  const vote = useServerFn(castVoteFn);
  const start = useServerFn(startGameFn);
  const host = useServerFn(hostActionFn);
  const seconds = useCountdown(state.endsAt);
  const prevPhase = useRef(state.phase);
  const [browsing, setBrowsing] = useState(false);

  useEffect(() => {
    if (state.phase !== "submit" || state.myMemeId) setBrowsing(false);
  }, [state.phase, state.myMemeId]);

  useEffect(() => {
    prevPhase.current = state.phase;
  }, [state.phase]);

  const me = state.me!;
  const prompt = state.prompt ? (lang === "ar" ? state.prompt.ar : state.prompt.en) : "";

  const leaderboard = useMemo(
    () => [...state.players].sort((a, b) => b.score - a.score),
    [state.players],
  );

  const act = useCallback(
    async (action: "skip" | "pause" | "resume" | "end" | "kick" | "restart", targetId?: string) => {
      try {
        await host({ data: { code, token, action, ...(targetId ? { targetId } : {}) } });
        refetch();
      } catch {
        toast.error("Action failed.");
      }
    },
    [host, code, token, refetch],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-base font-extrabold">
            MEMES<span className="text-primary">WAR</span>
          </span>
          <span className="font-display text-sm tracking-[0.25em] text-muted-foreground">
            {code}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {state.phase !== "lobby" && state.phase !== "final" && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
              {t("round")} {state.round}/{state.totalRounds}
            </span>
          )}
          {seconds !== null && (
            <span
              className="rounded-full bg-primary px-3 py-1 font-display text-sm font-extrabold text-primary-foreground tabular-nums"
              aria-live="polite"
            >
              {seconds}s
            </span>
          )}
          {state.paused && (
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
              {t("paused")}
            </span>
          )}
          <ThemeToggle />
          <LangToggle />
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center py-6">
        {state.phase === "lobby" && (
          <Lobby
            state={state}
            code={code}
            token={token}

            onStart={async () => {
              try {
                await start({ data: { code, token } });
                refetch();
              } catch {
                toast.error(t("needPlayers"));
              }
            }}
          />
        )}

        {state.phase === "prompt" && (
          <div className="text-center">
            <p className="text-sm font-bold tracking-widest text-accent uppercase">
              {t("getReady")}
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">{prompt}</h1>
          </div>
        )}

        {state.phase === "submit" && (
          <div>
            <h1 className="text-center font-display text-3xl font-extrabold sm:text-4xl">
              {prompt}
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {state.myMemeId ? `${t("locked")} — ${t("waitingOthers")}` : t("pickEmoji")}
            </p>
            {!state.myMemeId && (
              <div className="mt-4 flex justify-center">
                <button className="btn-base btn-primary" onClick={() => setBrowsing(true)}>
                  🖼 {t("browseAll")} ({state.hand.length})
                </button>
              </div>
            )}
            <div className="meme-rail mx-auto mt-6 flex max-w-5xl snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3">
              {state.hand.map((meme) => (
                <button
                  key={meme.id}
                  aria-label="Meme card"
                  disabled={!!state.myMemeId}
                  className={`meme-tile w-36 max-w-36 min-w-36 shrink-0 basis-36 snap-start sm:w-44 sm:max-w-44 sm:min-w-44 sm:basis-44 ${state.myMemeId === meme.id ? "tile-selected" : ""}`}
                  onClick={async () => {
                    try {
                      await submit({ data: { code, token, memeId: meme.id } });
                      refetch();
                    } catch {
                      toast.error("Too late!");
                    }
                  }}
                >
                  <img src={meme.url} alt="Meme option" className="meme-img" loading="lazy" />
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {state.players.filter((p) => p.submitted).length}/{state.players.length}{" "}
              {t("submitted")}
            </p>
            {browsing && (
              <MemeBrowser
                memes={state.hand}
                seconds={seconds}
                onClose={() => setBrowsing(false)}
                onPick={async (id) => {
                  try {
                    await submit({ data: { code, token, memeId: id } });
                    setBrowsing(false);
                    refetch();
                  } catch {
                    toast.error("Too late!");
                  }
                }}
              />
            )}
          </div>
        )}


        {(state.phase === "reveal" || state.phase === "vote") && (
          <div>
            <h1 className="text-center font-display text-2xl font-extrabold sm:text-3xl">
              {prompt}
            </h1>
            <p className="mt-2 text-center text-sm font-bold text-accent">
              {state.phase === "reveal" ? t("anonymous") : t("voteNow")}
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              {state.submissions.map((s) => {
                const selected = state.myVoteSubmissionId === s.id;
                const disabled = state.phase !== "vote" || s.mine || !!state.myVoteSubmissionId;
                return (
                  <button
                    key={s.id}
                    disabled={disabled}
                    aria-label={s.mine ? t("cantVoteSelf") : "Vote for this meme"}
                    className={`meme-tile ${selected ? "tile-selected" : ""}`}
                    onClick={async () => {
                      try {
                        await vote({ data: { code, token, submissionId: s.id } });
                        refetch();
                      } catch {
                        toast.error(t("cantVoteSelf"));
                      }
                    }}
                  >
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt="Meme submission" className="meme-img" />
                    ) : (
                      <span className="block h-full w-full bg-muted" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
            {state.phase === "vote" && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {state.myVoteSubmissionId ? t("voted") : t("cantVoteSelf")}
              </p>
            )}
          </div>
        )}

        {state.phase === "score" && (
          <div>
            <p className="text-center text-sm font-bold tracking-widest text-accent uppercase">
              {t("results")}
            </p>
            <div className="mx-auto mt-5 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              {[...state.submissions]
                .sort((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0))
                .map((s) => (
                  <div
                    key={s.id}
                    className={`panel flex flex-col items-center gap-1 p-3 ${
                      s.isWinner ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt="Winning meme"
                        className="meme-img aspect-square"
                      />
                    ) : null}
                    <span className="text-xs font-bold">{s.ownerNickname}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.voteCount} {t("votes")}
                    </span>
                    <span className="font-display text-sm font-extrabold text-primary">
                      +{s.roundPoints ?? 0}
                    </span>
                    {s.isWinner && (
                      <span className="text-[10px] font-bold tracking-wider text-accent uppercase">
                        🏆 {t("winner")}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {state.phase === "final" && (
          <div className="text-center">
            <p className="text-sm font-bold tracking-widest text-accent uppercase">
              {t("finalResults")}
            </p>
            <div className="mt-4 text-6xl">🏆</div>
            <h1 className="mt-2 font-display text-4xl font-extrabold">
              {leaderboard[0]?.nickname}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("champion")} — {leaderboard[0]?.score} {t("pts")}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              {me.isHost && (
                <button className="btn-base btn-primary" onClick={() => act("restart")}>
                  {t("playAgain")}
                </button>
              )}
              <button className="btn-base btn-ghost" onClick={goHome}>
                {t("home")}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-extrabold tracking-wide uppercase">
            {state.phase === "lobby" ? t("players") : t("leaderboard")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {state.players.length} {t("players")}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {leaderboard.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm"
            >
              <span className="w-5 font-display font-extrabold text-muted-foreground">{i + 1}</span>
              <span className="font-semibold">{p.nickname}</span>
              {p.isHost && (
                <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {t("host")}
                </span>
              )}
              {p.id === me.id && <span className="text-[10px] text-muted-foreground">({t("you")})</span>}
              {state.phase === "submit" && p.submitted && <span aria-hidden>✅</span>}
              {state.phase === "vote" && p.voted && <span aria-hidden>🗳️</span>}
              <span className="ms-auto font-display font-extrabold text-primary tabular-nums">
                {p.score}
              </span>
              {me.isHost && p.id !== me.id && (
                <button
                  className="text-[10px] font-bold text-destructive"
                  onClick={() => act("kick", p.id)}
                >
                  {t("kick")}
                </button>
              )}
            </li>
          ))}
        </ul>

        {me.isHost && state.phase !== "lobby" && state.phase !== "final" && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
            <span className="w-full text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              {t("hostControls")}
            </span>
            <button className="btn-base btn-ghost text-xs" onClick={() => act("skip")}>
              {t("skip")}
            </button>
            <button
              className="btn-base btn-ghost text-xs"
              onClick={() => act(state.paused ? "resume" : "pause")}
            >
              {state.paused ? t("resume") : t("pause")}
            </button>
            <button className="btn-base btn-ghost text-xs" onClick={() => act("end")}>
              {t("end")}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Lobby({
  state,
  code,
  token,
  onStart,
}: {
  state: GameState;
  code: string;
  token: string;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const me = state.me!;
  const [copied, setCopied] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/room/${state.code}`);
  }, [state.code]);

  return (
    <div className="text-center">
      <p className="font-display text-[0.6rem] tracking-widest text-accent-foreground uppercase">
        {t("shareCode")}
      </p>
      <button
        className="pixel-frame pixel-code mt-3 bg-card px-5 py-4 text-4xl text-primary sm:text-6xl"
        onClick={() => {
          void navigator.clipboard.writeText(state.code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        aria-label={`${t("roomCode")} ${state.code}`}
      >
        {state.code}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">{copied ? "✓" : "tap to copy"}</p>

      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="font-display text-[0.55rem] tracking-widest text-accent-foreground uppercase">
          {t("scanToJoin")}
        </p>
        <div className="pixel-frame bg-card p-3">
          <QRCode
            value={joinUrl}
            size={148}
            bgColor="transparent"
            fgColor="currentColor"
            className="h-[148px] w-[148px] text-foreground"
          />
        </div>
      </div>


      {me.isHost && <PromptPicker code={code} token={token} />}

      {me.isHost ? (
        <button
          className="btn-base btn-primary mt-6"
          disabled={state.players.length < MIN_PLAYERS}
          onClick={onStart}
        >
          {state.players.length < MIN_PLAYERS ? t("needPlayers") : t("startGame")}
        </button>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{t("waitingOthers")}</p>
      )}
    </div>
  );
}

type PromptItem = { id: string; text_en: string; text_ar: string; owner_key: string | null };

function PromptPicker({ code, token }: { code: string; token: string }) {
  const { t, lang } = useI18n();
  const listPrompts = useServerFn(listPromptsFn);
  const createPrompt = useServerFn(createPromptFn);
  const updatePrompt = useServerFn(updatePromptFn);
  const deletePrompt = useServerFn(deletePromptFn);
  const setQueued = useServerFn(setQueuedPromptsFn);
  const getQueued = useServerFn(getQueuedPromptsFn);

  const [open, setOpen] = useState(false);
  const [ownerKey, setOwnerKey] = useState("");
  const [bank, setBank] = useState<PromptItem[]>([]);
  const [mine, setMine] = useState<PromptItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOwnerKey(getHostKey());
  }, []);

  const load = useCallback(async () => {
    if (!ownerKey) return;
    const [lib, queued] = await Promise.all([
      listPrompts({ data: { ownerKey } }),
      getQueued({ data: { code } }),
    ]);
    setBank(lib.bank as PromptItem[]);
    setMine(lib.mine as PromptItem[]);
    setSelected((queued as PromptItem[]).map((p) => p.id));
  }, [ownerKey, listPrompts, getQueued, code]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const label = (p: PromptItem) => (lang === "ar" ? p.text_ar : p.text_en);

  async function persist(ids: string[]) {
    setSelected(ids);
    try {
      await setQueued({ data: { code, token, promptIds: ids } });
    } catch {
      toast.error(t("hostOnly"));
    }
  }

  function toggle(id: string) {
    void persist(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  async function saveQuestion() {
    if (!en.trim() && !ar.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updatePrompt({ data: { ownerKey, id: editingId, textEn: en, textAr: ar } });
      } else {
        await createPrompt({ data: { ownerKey, textEn: en, textAr: ar } });
      }
      setEn("");
      setAr("");
      setEditingId(null);
      await load();
      toast.success(t("saved"));
    } catch {
      toast.error("Could not save the question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-xl text-start">
      <button className="btn-base btn-accent w-full" onClick={() => setOpen((v) => !v)}>
        📝 {t("chooseQuestions")} {selected.length > 0 ? `(${selected.length})` : ""}
      </button>

      {open && (
        <div className="panel mt-3">
          <div className="panel-title">
            <span>questions.exe</span>
            <button className="font-pixel text-sm" onClick={() => setOpen(false)} aria-label="close">
              ✕
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="pixel-frame p-3">
              <p className="font-display text-[0.55rem] uppercase">
                {editingId ? t("edit") : t("newQuestion")}
              </p>
              <input
                className="pixel-input mt-2 text-sm outline-none"
                placeholder={t("english")}
                maxLength={200}
                value={en}
                onChange={(e) => setEn(e.target.value)}
              />
              <input
                className="pixel-input mt-2 text-sm outline-none"
                placeholder={t("arabic")}
                dir="rtl"
                maxLength={200}
                value={ar}
                onChange={(e) => setAr(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button className="btn-base btn-primary text-xs" disabled={busy} onClick={saveQuestion}>
                  {t("save")}
                </button>
                {editingId && (
                  <button
                    className="btn-base btn-ghost text-xs"
                    onClick={() => {
                      setEditingId(null);
                      setEn("");
                      setAr("");
                    }}
                  >
                    {t("cancel")}
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="font-display text-[0.55rem] uppercase">{t("myLibrary")}</p>
              {mine.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{t("noSaved")}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {mine.map((p) => (
                    <li key={p.id} className="pixel-frame flex items-center gap-2 p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                        aria-label={label(p)}
                      />
                      <span className="flex-1">{label(p)}</span>
                      <button
                        className="text-[10px] font-bold"
                        onClick={() => {
                          setEditingId(p.id);
                          setEn(p.text_en);
                          setAr(p.text_ar);
                        }}
                      >
                        {t("edit")}
                      </button>
                      <button
                        className="text-[10px] font-bold text-destructive"
                        onClick={async () => {
                          await deletePrompt({ data: { ownerKey, id: p.id } });
                          await persist(selected.filter((x) => x !== p.id));
                          await load();
                        }}
                      >
                        {t("remove")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="font-display text-[0.55rem] uppercase">{t("questionBank")}</p>
              <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pe-1">
                {bank.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                      aria-label={label(p)}
                    />
                    <span>{label(p)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t-[3px] border-border pt-3">
              <span className="font-pixel text-lg">
                {selected.length} {t("selected")}
              </span>
              <button className="btn-base btn-ghost text-xs" onClick={() => void persist([])}>
                {t("clearSelection")}
              </button>
              <button className="btn-base btn-primary ms-auto text-xs" onClick={() => setOpen(false)}>
                {t("done")}
              </button>
              <p className="w-full text-[10px] text-muted-foreground">{t("randomNote")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

