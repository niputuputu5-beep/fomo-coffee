import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getInsertId } from "./lib/db-result";
import { shifts } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { TRPCError } from "@trpc/server";
import { moneyString } from "./lib/validation";

export const shiftRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional(), userId: z.number().optional(), limit: z.number().default(20), offset: z.number().default(0) }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;
      if (ctx.user.role === "cashier") {
        return db.select().from(shifts).where(eq(shifts.userId, ctx.user.id)).orderBy(desc(shifts.openedAt)).limit(limit).offset(offset);
      }
      if (input?.status) {
        return db.select().from(shifts).where(eq(shifts.status, input.status as "open" | "closed")).orderBy(desc(shifts.openedAt)).limit(limit).offset(offset);
      }
      if (input?.userId) {
        return db.select().from(shifts).where(eq(shifts.userId, input.userId)).orderBy(desc(shifts.openedAt)).limit(limit).offset(offset);
      }
      return db.select().from(shifts).orderBy(desc(shifts.openedAt)).limit(limit).offset(offset);
    }),

  getOpenShift: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select()
      .from(shifts)
      .where(eq(shifts.userId, ctx.user.id))
      .orderBy(desc(shifts.openedAt))
      .limit(1);
    if (result[0]?.status !== "open") return null;
    return result[0] ?? null;
  }),

  open: authedQuery
    .input(z.object({ openingCash: moneyString }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await db.select().from(shifts).where(eq(shifts.userId, ctx.user.id)).orderBy(desc(shifts.openedAt)).limit(1);
      if (existing[0]?.status === "open") return { error: "Shift user ini masih terbuka." };
      const result = await db.insert(shifts).values({
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.username,
        openingCash: input.openingCash,
      });
      const id = getInsertId(result);
      await writeAuditLog({
        user: ctx.user,
        action: "open_shift",
        entityType: "shift",
        entityId: id,
        details: { openingCash: input.openingCash },
        ipAddress: getClientIp(ctx.req),
      });
      return { id };
    }),

  close: authedQuery
    .input(z.object({
      id: z.number(),
      closingCash: moneyString,
      cashSales: moneyString,
      cardSales: moneyString,
      qrisSales: moneyString,
      ewalletSales: moneyString,
      transferSales: moneyString,
      totalSales: moneyString,
      cashIn: moneyString,
      cashOut: moneyString,
      cashDifference: z.string().trim().regex(/^-?\d+(\.\d{1,2})?$/, "Selisih kas harus berupa angka."),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const shift = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
      if (!shift[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift tidak ditemukan." });
      }
      if (ctx.user.role === "cashier" && shift[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Kasir hanya dapat menutup shift miliknya sendiri." });
      }
      await db.update(shifts).set({ ...data, status: "closed", closedAt: new Date() }).where(eq(shifts.id, id));
      await writeAuditLog({
        user: ctx.user,
        action: "close_shift",
        entityType: "shift",
        entityId: id,
        details: { closingCash: input.closingCash, totalSales: input.totalSales, cashDifference: input.cashDifference },
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
});
