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

export const submitMemeFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ code: codeSchema, token: z.string().max(80), memeId: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { submitMeme } = await import("./game.server");
    await submitMeme(data);
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

/* ---------------- Host prompt library ---------------- */

const ownerKeySchema = z.string().min(8).max(80);

export const listPromptsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ownerKey: ownerKeySchema.nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { listPrompts } = await import("./game.server");
    return listPrompts(data);
  });

export const createPromptFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        ownerKey: ownerKeySchema,
        textEn: z.string().max(200),
        textAr: z.string().max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { createPrompt } = await import("./game.server");
    return createPrompt(data);
  });

export const updatePromptFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        ownerKey: ownerKeySchema,
        id: z.string().uuid(),
        textEn: z.string().max(200),
        textAr: z.string().max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { updatePrompt } = await import("./game.server");
    await updatePrompt(data);
    return { ok: true };
  });

export const deletePromptFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ ownerKey: ownerKeySchema, id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { deletePrompt } = await import("./game.server");
    await deletePrompt(data);
    return { ok: true };
  });

export const setQueuedPromptsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        code: codeSchema,
        token: z.string().max(80),
        promptIds: z.array(z.string().uuid()).max(30),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { setQueuedPrompts } = await import("./game.server");
    return setQueuedPrompts(data);
  });

export const getQueuedPromptsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const { getQueuedPrompts } = await import("./game.server");
    return getQueuedPrompts(data);
  });
