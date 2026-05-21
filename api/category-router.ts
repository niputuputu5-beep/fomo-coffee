import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getInsertId } from "./lib/db-result";
import { categories } from "@db/schema";
import { eq, asc } from "drizzle-orm";
import { getClientIp, writeAuditLog } from "./lib/audit";

export const categoryRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
  }),

  getById: authedQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const result = await db.select().from(categories).where(eq(categories.id, input.id)).limit(1);
    return result[0] ?? null;
  }),

  create: adminQuery
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(categories).values(input);
      const id = getInsertId(result);
      await writeAuditLog({ user: ctx.user, action: "create_category", entityType: "category", entityId: id, details: { name: input.name, slug: input.slug }, ipAddress: getClientIp(ctx.req) });
      return { id };
    }),

  update: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(categories).set(data).where(eq(categories.id, id));
      await writeAuditLog({ user: ctx.user, action: "update_category", entityType: "category", entityId: id, details: data, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(categories).set({ isActive: false }).where(eq(categories.id, input.id));
      await writeAuditLog({ user: ctx.user, action: "soft_delete_category", entityType: "category", entityId: input.id, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),
});
