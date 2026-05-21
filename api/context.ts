import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./auth-router";

export type PublicUser = Omit<User, "passwordHash">;

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: PublicUser;
  sessionId?: number;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    const auth = await authenticateRequest(opts.req.headers);
    ctx.user = auth.user;
    ctx.sessionId = auth.sessionId;
  } catch {
    // Authentication is optional here
  }
  return ctx;
}
