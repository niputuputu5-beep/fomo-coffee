import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, ownerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { passwordResetRequests, users } from "@db/schema";
import { hashPassword } from "./lib/password";
import { getInsertId } from "./lib/db-result";
import { getClientIp, writeAuditLog } from "./lib/audit";

function withoutPasswordHash<T extends { passwordHash: string }>(user: T) {
  const publicUser = { ...user } as Partial<T>;
  delete publicUser.passwordHash;
  return publicUser;
}

export const userRouter = createRouter({
  list: ownerQuery.query(async () => {
    const rows = await getDb().select().from(users).orderBy(desc(users.createdAt));
    return rows.map(withoutPasswordHash);
  }),
  passwordResetRequests: ownerQuery.query(async () => {
    return getDb().select().from(passwordResetRequests).orderBy(desc(passwordResetRequests.requestedAt));
  }),
  create: ownerQuery
    .input(
      z.object({
        username: z.string().trim().min(3),
        password: z.string().min(6),
        name: z.string().trim().min(1),
        email: z.string().email().optional().or(z.literal("")),
        role: z.enum(["owner", "admin", "cashier"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await getDb().insert(users).values({
        username: input.username,
        passwordHash: hashPassword(input.password),
        name: input.name,
        email: input.email || null,
        role: input.role,
      });
      const id = getInsertId(result);
      await writeAuditLog({ user: ctx.user, action: "create_user", entityType: "user", entityId: id, details: { username: input.username, role: input.role }, ipAddress: getClientIp(ctx.req) });
      return { id };
    }),
  update: ownerQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().trim().min(1).optional(),
        email: z.string().email().optional().or(z.literal("")),
        role: z.enum(["owner", "admin", "cashier"]).optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updateData = {
        ...data,
        ...(Object.prototype.hasOwnProperty.call(data, "email")
          ? { email: data.email || null }
          : {}),
        updatedAt: new Date(),
      };
      await getDb()
        .update(users)
        .set(updateData)
        .where(eq(users.id, id));
      await writeAuditLog({ user: ctx.user, action: "update_user", entityType: "user", entityId: id, details: data, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),
  resetPassword: ownerQuery
    .input(z.object({ id: z.number(), password: z.string().min(6), requestId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      await getDb()
        .update(users)
        .set({ passwordHash: hashPassword(input.password), updatedAt: new Date() })
        .where(eq(users.id, input.id));
      if (input.requestId) {
        await getDb()
          .update(passwordResetRequests)
          .set({
            status: "completed",
            decidedById: ctx.user.id,
            decidedByName: ctx.user.name || ctx.user.username,
            decidedAt: new Date(),
          })
          .where(eq(passwordResetRequests.id, input.requestId));
      }
      await writeAuditLog({ user: ctx.user, action: "reset_user_password", entityType: "user", entityId: input.id, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),
  rejectPasswordReset: ownerQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await getDb()
        .update(passwordResetRequests)
        .set({
          status: "rejected",
          decidedById: ctx.user.id,
          decidedByName: ctx.user.name || ctx.user.username,
          decidedAt: new Date(),
        })
        .where(eq(passwordResetRequests.id, input.id));
      await writeAuditLog({ user: ctx.user, action: "reject_password_reset", entityType: "password_reset", entityId: input.id, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),
});
