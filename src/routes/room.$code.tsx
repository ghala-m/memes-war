import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { EMOJI_SET, MIN_PLAYERS, type GameState } from "@/lib/game-shared";
import { getNickname, getToken, setNickname, setToken } from "@/lib/player-session";
import {
  castVoteFn,
  getStateFn,
  hostActionFn,
  joinRoomFn,
  startGameFn,
  submitEmojiFn,
  touchPlayerFn,
} from "@/lib/game.functions";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — Memes War` },
      {
        name: "description",
        content: `Join Memes War room ${params.code} and battle your friends with emojis in real time.`,
      },
      { property: "og:title", content: `Memes War — Room ${params.code}` },
      {
        property: "og:description",
        content: "Pick the emoji. Win the crowd. Join the room and play.",
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

  const refetch = query.refetch;
  useEffect(() => {
    const channel = supabase
      .channel(`room-${upper}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${upper}` },
        () => {
          void refetch();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [upper, refetch]);

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
  const submit = useServerFn(submitEmojiFn);
  const vote = useServerFn(castVoteFn);
  const start = useServerFn(startGameFn);
  const host = useServerFn(hostActionFn);
  const seconds = useCountdown(state.endsAt);
  const prevPhase = useRef(state.phase);

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
          <LangToggle />
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center py-6">
        {state.phase === "lobby" && (
          <Lobby
            state={state}
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
              {state.myEmoji ? `${t("locked")} — ${t("waitingOthers")}` : t("pickEmoji")}
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-4 gap-2.5 sm:grid-cols-6 sm:gap-3">
              {EMOJI_SET.map((emoji) => (
                <button
                  key={emoji}
                  aria-label={`Emoji ${emoji}`}
                  disabled={!!state.myEmoji}
                  className={`emoji-tile ${state.myEmoji === emoji ? "tile-selected" : ""}`}
                  onClick={async () => {
                    try {
                      await submit({ data: { code, token, emoji } });
                      refetch();
                    } catch {
                      toast.error("Too late!");
                    }
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {state.players.filter((p) => p.submitted).length}/{state.players.length}{" "}
              {t("submitted")}
            </p>
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
            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-3 sm:grid-cols-4">
              {state.submissions.map((s) => {
                const selected = state.myVoteSubmissionId === s.id;
                const disabled = state.phase !== "vote" || s.mine || !!state.myVoteSubmissionId;
                return (
                  <button
                    key={s.id}
                    disabled={disabled}
                    aria-label={s.mine ? `${s.emoji} — ${t("cantVoteSelf")}` : `Vote ${s.emoji}`}
                    className={`emoji-tile ${selected ? "tile-selected" : ""}`}
                    onClick={async () => {
                      try {
                        await vote({ data: { code, token, submissionId: s.id } });
                        refetch();
                      } catch {
                        toast.error(t("cantVoteSelf"));
                      }
                    }}
                  >
                    {s.emoji}
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
                    <span className="text-4xl">{s.emoji}</span>
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

function Lobby({ state, onStart }: { state: GameState; onStart: () => void }) {
  const { t } = useI18n();
  const me = state.me!;
  const [copied, setCopied] = useState(false);

  return (
    <div className="text-center">
      <p className="text-sm font-bold tracking-widest text-accent uppercase">{t("shareCode")}</p>
      <button
        className="mt-3 font-display text-6xl font-extrabold tracking-[0.2em] text-primary sm:text-7xl"
        onClick={() => {
          void navigator.clipboard.writeText(state.code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        aria-label={`${t("roomCode")} ${state.code}`}
      >
        {state.code}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">{copied ? "✓" : "tap to copy"}</p>

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
