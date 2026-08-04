import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PHASE_DURATIONS,
  type GameState,
  type Phase,
  type PlayerView,
  type SubmissionView,
} from "./game-shared";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function makeToken() {
  return crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
}

function inSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

type RoomRow = {
  id: string;
  code: string;
  status: string;
  phase: string;
  current_round: number;
  total_rounds: number;
  prompt_id: string | null;
  used_prompt_ids: string[];
  phase_ends_at: string | null;
  paused: boolean;
  paused_remaining_ms: number | null;
  version: number;
};

async function loadRoom(code: string): Promise<RoomRow> {
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("ROOM_NOT_FOUND");
  return data as RoomRow;
}

async function bumpRoom(room: RoomRow, patch: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from("rooms")
    .update({ ...patch, version: room.version + 1, updated_at: new Date().toISOString() })
    .eq("id", room.id);
  if (error) throw new Error(error.message);
}

async function loadPlayer(roomId: string, token: string) {
  const { data } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .eq("token", token)
    .maybeSingle();
  return data;
}

export async function createRoom(input: {
  nickname: string;
  totalRounds: number;
  language: string;
}) {
  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    const { data } = await supabaseAdmin.from("rooms").select("id").eq("code", code).maybeSingle();
    if (!data) break;
    code = makeCode();
  }
  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .insert({
      code,
      total_rounds: Math.min(Math.max(input.totalRounds, 1), 15),
      language: input.language === "ar" ? "ar" : "en",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const token = makeToken();
  const { error: pErr } = await supabaseAdmin.from("players").insert({
    room_id: room.id,
    nickname: input.nickname.slice(0, 20),
    token,
    is_host: true,
  });
  if (pErr) throw new Error(pErr.message);
  return { code, token };
}

export async function joinRoom(input: { code: string; nickname: string }) {
  const room = await loadRoom(input.code);
  const { data: players } = await supabaseAdmin
    .from("players")
    .select("id, nickname, kicked")
    .eq("room_id", room.id);
  const active = (players ?? []).filter((p) => !p.kicked);
  if (active.length >= MAX_PLAYERS) throw new Error("ROOM_FULL");
  if (room.status !== "lobby") throw new Error("GAME_IN_PROGRESS");

  let nickname = input.nickname.slice(0, 20).trim() || "Player";
  const taken = new Set(active.map((p) => p.nickname.toLowerCase()));
  let suffix = 2;
  while (taken.has(nickname.toLowerCase())) nickname = `${input.nickname.slice(0, 16)} ${suffix++}`;

  const token = makeToken();
  const { error } = await supabaseAdmin
    .from("players")
    .insert({ room_id: room.id, nickname, token });
  if (error) throw new Error(error.message);
  await bumpRoom(room, {});
  return { code: room.code, token };
}

async function pickPrompt(room: RoomRow) {
  const { data } = await supabaseAdmin.from("prompts").select("id");
  const all = (data ?? []).map((p) => p.id);
  const unused = all.filter((id) => !room.used_prompt_ids.includes(id));
  const pool = unused.length > 0 ? unused : all;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

async function startRound(room: RoomRow, roundNumber: number) {
  const promptId = await pickPrompt(room);
  await bumpRoom(room, {
    status: "playing",
    phase: "prompt",
    current_round: roundNumber,
    prompt_id: promptId,
    used_prompt_ids: promptId ? [...room.used_prompt_ids, promptId] : room.used_prompt_ids,
    phase_ends_at: inSeconds(PHASE_DURATIONS['prompt']!),
    paused: false,
    paused_remaining_ms: null,
  });
}

export async function startGame(input: { code: string; token: string }) {
  const room = await loadRoom(input.code);
  const me = await loadPlayer(room.id, input.token);
  if (!me?.is_host) throw new Error("NOT_HOST");
  const { count } = await supabaseAdmin
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("kicked", false);
  if ((count ?? 0) < MIN_PLAYERS) throw new Error("NOT_ENOUGH_PLAYERS");
  await startRound(room, 1);
}

export async function submitEmoji(input: { code: string; token: string; emoji: string }) {
  const room = await loadRoom(input.code);
  if (room.phase !== "submit") throw new Error("WRONG_PHASE");
  const me = await loadPlayer(room.id, input.token);
  if (!me || me.kicked) throw new Error("NOT_IN_ROOM");
  const { error } = await supabaseAdmin.from("submissions").insert({
    room_id: room.id,
    round: room.current_round,
    player_id: me.id,
    emoji: input.emoji,
  });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  await bumpRoom(room, {});
}

export async function castVote(input: { code: string; token: string; submissionId: string }) {
  const room = await loadRoom(input.code);
  if (room.phase !== "vote") throw new Error("WRONG_PHASE");
  const me = await loadPlayer(room.id, input.token);
  if (!me || me.kicked) throw new Error("NOT_IN_ROOM");
  const { data: sub } = await supabaseAdmin
    .from("submissions")
    .select("id, player_id, round")
    .eq("id", input.submissionId)
    .maybeSingle();
  if (!sub || sub.round !== room.current_round) throw new Error("BAD_SUBMISSION");
  if (sub.player_id === me.id) throw new Error("NO_SELF_VOTE");
  const { error } = await supabaseAdmin.from("votes").insert({
    room_id: room.id,
    round: room.current_round,
    voter_id: me.id,
    submission_id: sub.id,
  });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  await bumpRoom(room, {});
}

async function scoreRound(room: RoomRow) {
  const { data: subs } = await supabaseAdmin
    .from("submissions")
    .select("id, player_id")
    .eq("room_id", room.id)
    .eq("round", room.current_round);
  const { data: votes } = await supabaseAdmin
    .from("votes")
    .select("voter_id, submission_id")
    .eq("room_id", room.id)
    .eq("round", room.current_round);

  const counts = new Map<string, number>();
  (subs ?? []).forEach((s) => counts.set(s.id, 0));
  (votes ?? []).forEach((v) => counts.set(v.submission_id, (counts.get(v.submission_id) ?? 0) + 1));

  for (const [id, count] of counts) {
    await supabaseAdmin.from("submissions").update({ vote_count: count }).eq("id", id);
  }

  const max = Math.max(0, ...counts.values());
  const winners = new Set([...counts.entries()].filter(([, c]) => c === max && c > 0).map(([id]) => id));

  const delta = new Map<string, number>();
  const add = (playerId: string, points: number) =>
    delta.set(playerId, (delta.get(playerId) ?? 0) + points);

  (subs ?? []).forEach((s) => {
    const count = counts.get(s.id) ?? 0;
    add(s.player_id, count * 5);
    if (winners.has(s.id)) add(s.player_id, 10);
  });
  const ownerOf = new Map((subs ?? []).map((s) => [s.id, s.player_id]));
  (votes ?? []).forEach((v) => {
    if (winners.has(v.submission_id) && ownerOf.get(v.submission_id) !== v.voter_id) {
      add(v.voter_id, 3);
    }
  });

  for (const [playerId, points] of delta) {
    if (points === 0) continue;
    const { data: p } = await supabaseAdmin
      .from("players")
      .select("score")
      .eq("id", playerId)
      .maybeSingle();
    await supabaseAdmin
      .from("players")
      .update({ score: (p?.score ?? 0) + points })
      .eq("id", playerId);
  }
}

export async function advanceIfDue(code: string) {
  const room = await loadRoom(code);
  if (room.paused || room.status === "final" || room.phase === "lobby") return;
  if (!room.phase_ends_at) return;

  const due = new Date(room.phase_ends_at).getTime() <= Date.now();
  let earlyFinish = false;
  if (!due && room.phase === "submit") {
    const [{ count: playerCount }, { count: subCount }] = await Promise.all([
      supabaseAdmin
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id)
        .eq("kicked", false),
      supabaseAdmin
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id)
        .eq("round", room.current_round),
    ]);
    earlyFinish = (playerCount ?? 0) > 0 && (subCount ?? 0) >= (playerCount ?? 0);
  }
  if (!due && !earlyFinish) return;

  await advancePhase(room);
}

async function advancePhase(room: RoomRow) {
  switch (room.phase) {
    case "prompt":
      await bumpRoom(room, { phase: "submit", phase_ends_at: inSeconds(PHASE_DURATIONS['submit']!) });
      return;
    case "submit":
      await bumpRoom(room, { phase: "reveal", phase_ends_at: inSeconds(PHASE_DURATIONS['reveal']!) });
      return;
    case "vote":
      await scoreRound(room);
      await bumpRoom(room, { phase: "score", phase_ends_at: inSeconds(PHASE_DURATIONS['score']!) });
      return;
    case "reveal": {
      const { count } = await supabaseAdmin
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id)
        .eq("round", room.current_round);
      if ((count ?? 0) < 2) {
        await scoreRound(room);
        await bumpRoom(room, { phase: "score", phase_ends_at: inSeconds(PHASE_DURATIONS['score']!) });
        return;
      }
      await bumpRoom(room, { phase: "vote", phase_ends_at: inSeconds(PHASE_DURATIONS['vote']!) });
      return;
    }
    case "score": {
      if (room.current_round >= room.total_rounds) {
        await bumpRoom(room, { phase: "final", status: "final", phase_ends_at: null });
        return;
      }
      await startRound({ ...room, version: room.version }, room.current_round + 1);
      return;
    }
    default:
      return;
  }
}

export async function hostAction(input: {
  code: string;
  token: string;
  action: "skip" | "pause" | "resume" | "end" | "kick" | "restart";
  targetId?: string;
}) {
  const room = await loadRoom(input.code);
  const me = await loadPlayer(room.id, input.token);
  if (!me?.is_host) throw new Error("NOT_HOST");

  switch (input.action) {
    case "skip":
      await advancePhase(room);
      return;
    case "pause": {
      const remaining = room.phase_ends_at
        ? Math.max(0, new Date(room.phase_ends_at).getTime() - Date.now())
        : null;
      await bumpRoom(room, { paused: true, paused_remaining_ms: remaining });
      return;
    }
    case "resume": {
      const endsAt = room.paused_remaining_ms
        ? new Date(Date.now() + room.paused_remaining_ms).toISOString()
        : room.phase_ends_at;
      await bumpRoom(room, { paused: false, paused_remaining_ms: null, phase_ends_at: endsAt });
      return;
    }
    case "end":
      await bumpRoom(room, { phase: "final", status: "final", phase_ends_at: null, paused: false });
      return;
    case "restart": {
      await supabaseAdmin.from("votes").delete().eq("room_id", room.id);
      await supabaseAdmin.from("submissions").delete().eq("room_id", room.id);
      await supabaseAdmin.from("players").update({ score: 0 }).eq("room_id", room.id);
      await bumpRoom(room, {
        status: "lobby",
        phase: "lobby",
        current_round: 0,
        prompt_id: null,
        phase_ends_at: null,
        paused: false,
      });
      return;
    }
    case "kick": {
      if (!input.targetId) return;
      await supabaseAdmin
        .from("players")
        .update({ kicked: true })
        .eq("id", input.targetId)
        .eq("room_id", room.id);
      await bumpRoom(room, {});
      return;
    }
  }
}

export async function getState(input: { code: string; token: string | null }): Promise<GameState> {
  const room = await loadRoom(input.code);
  const me = input.token ? await loadPlayer(room.id, input.token) : null;

  const [{ data: playersRaw }, { data: subsRaw }, { data: votesRaw }, { data: promptRow }] =
    await Promise.all([
      supabaseAdmin
        .from("players")
        .select("id, nickname, score, is_host, kicked")
        .eq("room_id", room.id)
        .eq("kicked", false)
        .order("created_at"),
      supabaseAdmin
        .from("submissions")
        .select("id, emoji, player_id, vote_count")
        .eq("room_id", room.id)
        .eq("round", room.current_round)
        .order("id"),
      supabaseAdmin
        .from("votes")
        .select("voter_id, submission_id")
        .eq("room_id", room.id)
        .eq("round", room.current_round),
      room.prompt_id
        ? supabaseAdmin
            .from("prompts")
            .select("text_en, text_ar")
            .eq("id", room.prompt_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const subs = subsRaw ?? [];
  const votes = votesRaw ?? [];
  const submittedIds = new Set(subs.map((s) => s.player_id));
  const votedIds = new Set(votes.map((v) => v.voter_id));

  const players: PlayerView[] = (playersRaw ?? []).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    score: p.score,
    isHost: p.is_host,
    submitted: submittedIds.has(p.id),
    voted: votedIds.has(p.id),
  }));

  const phase = room.phase as Phase;
  const revealScores = phase === "score" || phase === "final";
  const showSubs = phase === "reveal" || phase === "vote" || revealScores;

  const counts = new Map<string, number>();
  subs.forEach((s) => counts.set(s.id, 0));
  votes.forEach((v) => counts.set(v.submission_id, (counts.get(v.submission_id) ?? 0) + 1));
  const max = Math.max(0, ...counts.values());
  const nameById = new Map((playersRaw ?? []).map((p) => [p.id, p.nickname]));

  const submissions: SubmissionView[] = showSubs
    ? subs.map((s) => {
        const count = counts.get(s.id) ?? 0;
        const isWinner = revealScores && count === max && count > 0;
        let roundPoints: number | null = null;
        if (revealScores) {
          roundPoints = count * 5 + (isWinner ? 10 : 0);
          const myVote = votes.find((v) => v.voter_id === s.player_id);
          if (myVote && (counts.get(myVote.submission_id) ?? 0) === max && max > 0) {
            const owner = subs.find((x) => x.id === myVote.submission_id)?.player_id;
            if (owner !== s.player_id) roundPoints += 3;
          }
        }
        return {
          id: s.id,
          emoji: s.emoji,
          mine: !!me && s.player_id === me.id,
          ownerNickname: revealScores ? (nameById.get(s.player_id) ?? null) : null,
          voteCount: revealScores ? count : null,
          isWinner,
          roundPoints,
        };
      })
    : [];

  const mySub = me ? subs.find((s) => s.player_id === me.id) : undefined;
  const myVote = me ? votes.find((v) => v.voter_id === me.id) : undefined;

  return {
    code: room.code,
    phase,
    round: room.current_round,
    totalRounds: room.total_rounds,
    endsAt: room.paused ? null : room.phase_ends_at,
    paused: room.paused,
    prompt: promptRow ? { en: promptRow.text_en, ar: promptRow.text_ar } : null,
    me: me ? { id: me.id, nickname: me.nickname, isHost: me.is_host, score: me.score } : null,
    players,
    submissions,
    myEmoji: mySub?.emoji ?? null,
    myVoteSubmissionId: myVote?.submission_id ?? null,
  };
}

export async function touchPlayer(input: { code: string; token: string }) {
  const room = await loadRoom(input.code);
  await supabaseAdmin
    .from("players")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("room_id", room.id)
    .eq("token", input.token);
}
