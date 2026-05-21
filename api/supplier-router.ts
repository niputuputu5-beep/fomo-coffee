import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getInsertId } from "./lib/db-result";
import { suppliers } from "@db/schema";
import { and, eq, like, desc, or } from "drizzle-orm";
import { getClientIp, writeAuditLog } from "./lib/audit";

export const supplierRouter = createRouter({
  list: authedQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db.select().from(suppliers).where(and(
          eq(suppliers.isActive, true),
          or(like(suppliers.name, `%${input.search}%`), like(suppliers.contactPerson, `%${input.search}%`), like(suppliers.phone, `%${input.search}%`))!,
        )).orderBy(desc(suppliers.createdAt));
      }
      return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(desc(suppliers.createdAt));
    }),

  getById: authedQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const result = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).limit(1);
    return result[0] ?? null;
  }),

  create: adminQuery
    .input(z.object({
      name: z.string().min(1),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      npwp: z.string().optional(),
      paymentTerms: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(suppliers).values(input);
      const id = getInsertId(result);
      await writeAuditLog({ user: ctx.user, action: "create_supplier", entityType: "supplier", entityId: id, details: { name: input.name }, ipAddress: getClientIp(ctx.req) });
      return { id };
    }),

  update: adminQuery
    .input(z.object({ id: z.number(), name: z.string().optional(), contactPerson: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(), npwp: z.string().optional(), paymentTerms: z.string().optional(), rating: z.string().optional(), debt: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(suppliers).set(data).where(eq(suppliers.id, id));
      await writeAuditLog({ user: ctx.user, action: "update_supplier", entityType: "supplier", entityId: id, details: data, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),

  delete: adminQuery.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    await db.update(suppliers).set({ isActive: false }).where(eq(suppliers.id, input.id));
    await writeAuditLog({ user: ctx.user, action: "soft_delete_supplier", entityType: "supplier", entityId: input.id, ipAddress: getClientIp(ctx.req) });
    return { success: true };
  }),
});
