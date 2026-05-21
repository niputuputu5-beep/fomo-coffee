import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Session } from "@contracts/constants";
import { deviceSessions, passwordResetRequests, type User } from "@db/schema";
import { getSessionCookieOptions } from "./lib/cookies";
import { verifyPassword } from "./lib/password";
import { signSessionToken, verifySessionToken } from "./session";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import {
  findUserById,
  findUserByUsername,
  updateUser,
  touchLastSignIn,
} from "./queries/users";
import { hashPassword } from "./lib/password";
import { getClientIp, writeAuditLog } from "./lib/audit";
import type { PublicUser } from "./context";
import { getDb } from "./queries/connection";
import { eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-result";

function toPublicUser(user: User): PublicUser {
  const publicUser = { ...user } as Partial<User>;
  delete publicUser.passwordHash;
  return publicUser as PublicUser;
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw new Error("No session cookie found.");
  }

  const claim = await verifySessionToken(token);
  if (!claim) {
    throw new Error("Invalid session token.");
  }

  const user = await findUserById(claim.userId);
  if (!user || user.status !== "active") {
    throw new Error("User not found or inactive.");
  }

  const sessionRows = await getDb()
    .select()
    .from(deviceSessions)
    .where(eq(deviceSessions.id, claim.sessionId))
    .limit(1);
  const session = sessionRows[0];
  if (!session || session.userId !== user.id || session.status !== "active") {
    throw new Error("Session revoked or expired.");
  }

  await getDb()
    .update(deviceSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(deviceSessions.id, claim.sessionId));

  return { user: toPublicUser(user), sessionId: claim.sessionId };
}

export const authRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        username: z.string().trim().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await findUserByUsername(input.username);
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Username atau password salah.",
        });
      }

      if (user.status !== "active") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Akun tidak aktif.",
        });
      }

      await touchLastSignIn(user.id);
      await writeAuditLog({
        user: toPublicUser(user),
        action: "login",
        entityType: "auth",
        entityId: user.id,
        ipAddress: getClientIp(ctx.req),
      });

      const sessionResult = await getDb().insert(deviceSessions).values({
        userId: user.id,
        userName: user.name || user.username,
        deviceName: "Browser POS Terminal",
        ipAddress: getClientIp(ctx.req),
        userAgent: ctx.req.headers.get("user-agent") || undefined,
      });
      const sessionId = getInsertId(sessionResult);
      const opts = getSessionCookieOptions(ctx.req.headers);
      const token = await signSessionToken({ userId: user.id, sessionId });
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        }),
      );

      return { success: true };
    }),
  me: authedQuery.query((opts) => opts.ctx.user),
  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().trim().min(1),
        email: z.string().email().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await updateUser(ctx.user.id, {
        name: input.name,
        email: input.email || null,
      });
      await writeAuditLog({
        user: ctx.user,
        action: "update_profile",
        entityType: "user",
        entityId: ctx.user.id,
        details: { name: input.name, email: input.email || null },
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
  changePassword: authedQuery
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await findUserById(ctx.user.id);
      if (!user || !verifyPassword(input.currentPassword, user.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Password lama salah.",
        });
      }

      await updateUser(ctx.user.id, {
        passwordHash: hashPassword(input.newPassword),
      });
      await writeAuditLog({
        user: ctx.user,
        action: "change_password",
        entityType: "user",
        entityId: ctx.user.id,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
  resetPassword: publicQuery
    .input(
      z.object({
        username: z.string().trim().min(1),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await findUserByUsername(input.username);

      if (user && (!user.email || user.email.toLowerCase() !== input.email.toLowerCase())) {
        await writeAuditLog({
          user: toPublicUser(user),
          action: "forgot_password_failed",
          entityType: "user",
          entityId: user.id,
          details: { reason: "email_mismatch" },
          ipAddress: getClientIp(ctx.req),
        });
      }

      if (user?.email && user.email.toLowerCase() === input.email.toLowerCase()) {
        await getDb().insert(passwordResetRequests).values({
          userId: user.id,
          username: user.username,
          email: user.email,
          requestedIp: getClientIp(ctx.req),
        });
        await writeAuditLog({
          user: toPublicUser(user),
          action: "forgot_password_requested",
          entityType: "user",
          entityId: user.id,
          ipAddress: getClientIp(ctx.req),
        });
      }

      return { success: true };
    }),
  logout: authedQuery.mutation(async ({ ctx }) => {
    if (ctx.sessionId) {
      await getDb()
        .update(deviceSessions)
        .set({ status: "revoked" })
        .where(eq(deviceSessions.id, ctx.sessionId));
    }
    await writeAuditLog({
      user: ctx.user,
      action: "logout",
      entityType: "auth",
      entityId: ctx.user.id,
      ipAddress: getClientIp(ctx.req),
    });
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
