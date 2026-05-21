import * as jose from "jose";
import { env } from "./lib/env";
import { Session } from "@contracts/constants";

const JWT_ALG = "HS256";

export type SessionPayload = {
  userId: number;
  sessionId: number;
};

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const secret = new TextEncoder().encode(env.sessionSecret);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(Session.maxAgeMs / 1000)}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(env.sessionSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });
    const userId = Number(payload.userId);
    const sessionId = Number(payload.sessionId);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(sessionId) || sessionId <= 0) {
      return null;
    }

    return { userId, sessionId };
  } catch {
    return null;
  }
}
