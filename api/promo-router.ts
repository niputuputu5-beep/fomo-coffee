import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getInsertId } from "./lib/db-result";
import { promos } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { moneyString, nonNegativeInt, optionalMoneyString } from "./lib/validation";

export const promoRouter = createRouter({
  list: authedQuery
    .input(z.object({ active: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.active) {
        return db.select().from(promos).where(eq(promos.isActive, true)).orderBy(desc(promos.createdAt));
      }
      return db.select().from(promos).orderBy(desc(promos.createdAt));
    }),

  getByCode: authedQuery.input(z.object({ code: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const result = await db.select().from(promos).where(eq(promos.code, input.code)).limit(1);
    return result[0] ?? null;
  }),

  create: adminQuery
    .input(z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      description: z.string().optional(),
      type: z.enum(["percentage", "fixed_amount", "buy_x_get_y", "bundle", "happy_hour"]),
      value: moneyString,
      minPurchase: optionalMoneyString,
      maxDiscount: optionalMoneyString,
      applicableTo: z.enum(["all", "category", "product", "payment_method"]).optional(),
      targetId: z.number().optional(),
      startDate: z.string(),
      endDate: z.string(),
      usageLimit: nonNegativeInt.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(promos).values({
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
      const id = getInsertId(result);
      await writeAuditLog({ user: ctx.user, action: "create_promo", entityType: "promo", entityId: id, details: { name: input.name, code: input.code }, ipAddress: getClientIp(ctx.req) });
      return { id };
    }),

  update: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      description: z.string().optional(),
      type: z.enum(["percentage", "fixed_amount", "buy_x_get_y", "bundle", "happy_hour"]).optional(),
      value: optionalMoneyString,
      minPurchase: optionalMoneyString,
      maxDiscount: optionalMoneyString,
      applicableTo: z.enum(["all", "category", "product", "payment_method"]).optional(),
      targetId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isActive: z.boolean().optional(),
      usageCount: nonNegativeInt.optional(),
      usageLimit: nonNegativeInt.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(promos).set({
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      }).where(eq(promos.id, id));
      await writeAuditLog({ user: ctx.user, action: "update_promo", entityType: "promo", entityId: id, details: data, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),

  delete: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    await db.update(promos).set({ isActive: false }).where(eq(promos.id, input.id));
    await writeAuditLog({ user: ctx.user, action: "soft_delete_promo", entityType: "promo", entityId: input.id, ipAddress: getClientIp(ctx.req) });
    return { success: true };
  }),
});
