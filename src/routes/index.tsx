import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";
import { createRoomFn, joinRoomFn } from "@/lib/game.functions";
import { setNickname, setToken } from "@/lib/player-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memes War — The Emoji Party Game" },
      {
        name: "description",
        content:
          "Create a room, share the code, and battle your friends with emojis. Real-time party game for 3–20 players, no download needed.",
      },
      { property: "og:title", content: "Memes War — The Emoji Party Game" },
      {
        property: "og:description",
        content: "Pick the emoji. Win the crowd. A real-time emoji party game for 3–20 players.",
      },
    ],
  }),
  component: Index,
});

type Mode = "home" | "create" | "join";

function Index() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const createRoom = useServerFn(createRoomFn);
  const joinRoom = useServerFn(joinRoomFn);

  const [mode, setMode] = useState<Mode>("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rounds, setRounds] = useState(5);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await createRoom({
        data: { nickname: name.trim(), totalRounds: rounds, language: lang },
      });
      setNickname(name.trim());
      setToken(res.code, res.token);
      navigate({ to: "/room/$code", params: { code: res.code } });
    } catch {
      toast.error("Could not create the room. Try again.");
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!name.trim() || code.trim().length < 4) return;
    setBusy(true);
    try {
      const res = await joinRoom({
        data: { code: code.trim().toUpperCase(), nickname: name.trim() },
      });
      setNickname(name.trim());
      setToken(res.code, res.token);
      navigate({ to: "/room/$code", params: { code: res.code } });
    } catch {
      toast.error("Could not join — check the code, the room may be full or already playing.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <span className="font-display text-lg font-extrabold tracking-tight">
          MEMES<span className="text-primary">WAR</span>
        </span>
        <LangToggle />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <div className="mb-6 flex gap-2 text-4xl sm:text-5xl" aria-hidden>
          <span className="rotate-[-8deg]">😂</span>
          <span className="translate-y-1">🔥</span>
          <span className="rotate-[10deg]">💀</span>
          <span className="translate-y-1">🫡</span>
        </div>
        <h1 className="font-display text-5xl leading-[0.95] font-extrabold sm:text-7xl">
          MEMES <span className="text-primary">WAR</span>
        </h1>
        <p className="mt-4 text-lg font-semibold text-accent">{t("tagline")}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("subtitle")}</p>

        <div className="panel mt-8 w-full max-w-md p-5 text-start">
          {mode === "home" && (
            <div className="flex flex-col gap-3">
              <button className="btn-base btn-primary w-full" onClick={() => setMode("create")}>
                {t("createRoom")}
              </button>
              <button className="btn-base btn-ghost w-full" onClick={() => setMode("join")}>
                {t("joinRoom")}
              </button>
            </div>
          )}

          {mode !== "home" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("nickname")}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                  className="rounded-lg border border-input bg-secondary px-3 py-2.5 text-base outline-none focus:border-primary"
                  placeholder="Sara"
                />
              </label>

              {mode === "join" && (
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  {t("roomCode")}
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="rounded-lg border border-input bg-secondary px-3 py-2.5 font-display text-2xl tracking-[0.35em] uppercase outline-none focus:border-primary"
                    placeholder="ABC123"
                  />
                </label>
              )}

              {mode === "create" && (
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  {t("rounds")}: {rounds}
                  <input
                    type="range"
                    min={3}
                    max={10}
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="accent-primary"
                  />
                </label>
              )}

              <div className="flex gap-2">
                <button
                  className="btn-base btn-ghost"
                  onClick={() => setMode("home")}
                  disabled={busy}
                >
                  {t("back")}
                </button>
                <button
                  className="btn-base btn-primary flex-1"
                  disabled={busy}
                  onClick={mode === "create" ? handleCreate : handleJoin}
                >
                  {mode === "create" ? t("create") : t("join")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 w-full max-w-md text-start">
          <h2 className="font-display text-sm font-extrabold tracking-wide uppercase">
            {t("scoring")}
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>🏆 {t("rule1")}</li>
            <li>🗳️ {t("rule2")}</li>
            <li>🎯 {t("rule3")}</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
