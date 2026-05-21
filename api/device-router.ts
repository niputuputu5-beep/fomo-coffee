import { createRouter, authedQuery, ownerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { deviceSessions } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { z } from "zod";

export const deviceRouter = createRouter({
  list: ownerQuery.query(async () => {
    return getDb().select().from(deviceSessions).orderBy(desc(deviceSessions.lastSeenAt));
  }),
  heartbeat: authedQuery.mutation(async ({ ctx }) => {
    if (ctx.sessionId) {
      await getDb()
        .update(deviceSessions)
        .set({
          lastSeenAt: new Date(),
          ipAddress: getClientIp(ctx.req),
          userAgent: ctx.req.headers.get("user-agent") || undefined,
        })
        .where(eq(deviceSessions.id, ctx.sessionId));
    }
    return { success: true };
  }),
  revoke: ownerQuery
    .input(z.object({ id: z.number().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
    if (input?.id) {
      await getDb().update(deviceSessions).set({ status: "revoked" }).where(eq(deviceSessions.id, input.id));
    } else {
      await getDb().update(deviceSessions).set({ status: "revoked" }).where(eq(deviceSessions.status, "active"));
    }
    await writeAuditLog({
      user: ctx.user,
      action: "revoke_device_sessions",
      entityType: "device_session",
      entityId: input?.id,
      ipAddress: getClientIp(ctx.req),
    });
    return { success: true };
  }),
});
