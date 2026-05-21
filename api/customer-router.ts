import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getInsertId } from "./lib/db-result";
import { customers } from "@db/schema";
import { and, eq, like, desc, or } from "drizzle-orm";
import { getClientIp, writeAuditLog } from "./lib/audit";

export const customerRouter = createRouter({
  list: authedQuery
    .input(z.object({ search: z.string().optional(), level: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [eq(customers.isActive, true)];
      if (input?.search) {
        conditions.push(or(like(customers.name, `%${input.search}%`), like(customers.phone, `%${input.search}%`), like(customers.email, `%${input.search}%`))!);
      }
      if (input?.level) conditions.push(eq(customers.membershipLevel, input.level as "bronze" | "silver" | "gold" | "platinum"));
      return db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt));
    }),

  getById: authedQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const result = await db.select().from(customers).where(eq(customers.id, input.id)).limit(1);
    return result[0] ?? null;
  }),

  getByPhone: authedQuery.input(z.object({ phone: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const result = await db.select().from(customers).where(eq(customers.phone, input.phone)).limit(1);
    return result[0] ?? null;
  }),

  create: adminQuery
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      membershipLevel: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(customers).values(input);
      const id = getInsertId(result);
      await writeAuditLog({ user: ctx.user, action: "create_customer", entityType: "customer", entityId: id, details: { name: input.name, phone: input.phone }, ipAddress: getClientIp(ctx.req) });
      return { id };
    }),

  update: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      membershipLevel: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
      loyaltyPoints: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(customers).set(data).where(eq(customers.id, id));
      await writeAuditLog({ user: ctx.user, action: "update_customer", entityType: "customer", entityId: id, details: data, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),

  delete: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    await db.update(customers).set({ isActive: false }).where(eq(customers.id, input.id));
    await writeAuditLog({ user: ctx.user, action: "soft_delete_customer", entityType: "customer", entityId: input.id, ipAddress: getClientIp(ctx.req) });
    return { success: true };
  }),
});
