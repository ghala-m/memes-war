import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { LangToggle } from "@/components/LangToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
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
        <span className="font-display text-[0.7rem] tracking-widest uppercase">
          MEMES<span className="text-primary">WAR</span>
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LangToggle />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <div className="mb-6 flex gap-2 text-4xl sm:text-5xl" aria-hidden>
          <span className="rotate-[-8deg]">😂</span>
          <span className="translate-y-1">🔥</span>
          <span className="rotate-[10deg]">💀</span>
          <span className="translate-y-1">🫡</span>
        </div>
        <h1 className="font-display text-2xl leading-relaxed sm:text-4xl">
          MEMES <span className="text-primary">WAR</span>
        </h1>
        <p className="font-display mt-5 text-[0.6rem] tracking-wide text-accent-foreground">
          {t("tagline")}
        </p>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{t("subtitle")}</p>

        <div className="panel scanlines mt-8 w-full max-w-md text-start">
          <div className="panel-title">
            <span>{mode === "home" ? "start.exe" : mode === "create" ? "create.exe" : "join.exe"}</span>
            <span aria-hidden className="font-pixel text-sm">
              ▪ ▫ ✕
            </span>
          </div>
          <div className="p-5">
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
                    className="pixel-input text-base outline-none"
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
                      className="pixel-input pixel-code text-3xl uppercase outline-none"
                      placeholder="ABC123"
                    />
                  </label>
                )}

                {mode === "create" && (
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">
                    {t("rounds")}: <span className="font-pixel text-xl">{rounds}</span>
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
        </div>

        <div className="pixel-frame mt-8 w-full max-w-md p-4 text-start">
          <h2 className="font-display text-[0.6rem] tracking-wide uppercase">⚠ {t("scoring")}</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>🏆 {t("rule1")}</li>
            <li>🗳️ {t("rule2")}</li>
            <li>🎯 {t("rule3")}</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

