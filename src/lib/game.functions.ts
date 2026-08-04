import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const codeSchema = z.string().min(4).max(8);

export const createRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        nickname: z.string().min(1).max(20),
        totalRounds: z.number().int().min(1).max(15),
        language: z.string().max(4),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { createRoom } = await import("./game.server");
    return createRoom(data);
  });

export const joinRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ code: codeSchema, nickname: z.string().min(1).max(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { joinRoom } = await import("./game.server");
    return joinRoom(data);
  });

export const getStateFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ code: codeSchema, token: z.string().max(80).nullable() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getState, advanceIfDue } = await import("./game.server");
    await advanceIfDue(data.code);
    return getState(data);
  });

export const submitEmojiFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ code: codeSchema, token: z.string().max(80), emoji: z.string().min(1).max(8) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { submitEmoji } = await import("./game.server");
    await submitEmoji(data);
    return { ok: true };
  });

export const castVoteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ code: codeSchema, token: z.string().max(80), submissionId: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { castVote } = await import("./game.server");
    await castVote(data);
    return { ok: true };
  });

export const startGameFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ code: codeSchema, token: z.string().max(80) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { startGame } = await import("./game.server");
    await startGame(data);
    return { ok: true };
  });

export const hostActionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        code: codeSchema,
        token: z.string().max(80),
        action: z.enum(["skip", "pause", "resume", "end", "kick", "restart"]),
        targetId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { hostAction } = await import("./game.server");
    await hostAction(data);
    return { ok: true };
  });

export const touchPlayerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ code: codeSchema, token: z.string().max(80) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { touchPlayer } = await import("./game.server");
    await touchPlayer(data);
    return { ok: true };
  });
