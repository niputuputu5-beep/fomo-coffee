import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getInsertId } from "./lib/db-result";
import { products, productVariants, productAddons } from "@db/schema";
import { eq, and, like, desc, asc, or, sql } from "drizzle-orm";
import { getClientIp, writeAuditLog } from "./lib/audit";

export const productRouter = createRouter({
  list: authedQuery
    .input(z.object({
      categoryId: z.number().optional(),
      search: z.string().optional(),
      isActive: z.boolean().optional(),
      isBestSeller: z.boolean().optional(),
      isFavorite: z.boolean().optional(),
      availableOnly: z.boolean().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [eq(products.isActive, input?.isActive ?? true)];
      if (input?.categoryId) conditions.push(eq(products.categoryId, input.categoryId));
      if (input?.search) {
        conditions.push(or(like(products.name, `%${input.search}%`), like(products.sku, `%${input.search}%`))!);
      }
      if (input?.isBestSeller) conditions.push(eq(products.isBestSeller, true));
      if (input?.isFavorite) conditions.push(eq(products.isFavorite, true));
      if (input?.availableOnly) conditions.push(sql`${products.stockQuantity} > 0`);
      return db.select().from(products).where(and(...conditions)).orderBy(desc(products.isBestSeller), asc(products.name)).limit(input?.limit ?? 1000).offset(input?.offset ?? 0);
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  getVariants: authedQuery
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(productVariants)
        .where(and(eq(productVariants.productId, input.productId), eq(productVariants.isActive, true)));
    }),

  listAddons: authedQuery
    .input(z.object({ includeInactive: z.boolean().optional(), search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (!input?.includeInactive) conditions.push(eq(productAddons.isActive, true));
      if (input?.search) {
        conditions.push(or(like(productAddons.name, `%${input.search}%`), like(productAddons.sku, `%${input.search}%`))!);
      }
      if (conditions.length > 0) {
        return db.select().from(productAddons).where(and(...conditions)).orderBy(asc(productAddons.sortOrder), asc(productAddons.name)).limit(input?.limit ?? 1000).offset(input?.offset ?? 0);
      }
      return db.select().from(productAddons).orderBy(asc(productAddons.sortOrder), asc(productAddons.name)).limit(input?.limit ?? 1000).offset(input?.offset ?? 0);
    }),

  createAddon: adminQuery
    .input(z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      description: z.string().optional(),
      price: z.string().default("0.00"),
      costPrice: z.string().default("0.00"),
      inventoryId: z.number().optional(),
      inventoryName: z.string().optional(),
      quantityUsed: z.string().default("0.000"),
      unit: z.string().default("pcs"),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await getDb().insert(productAddons).values(input);
      const id = getInsertId(result);
      await writeAuditLog({ user: ctx.user, action: "create_product_addon", entityType: "product_addon", entityId: id, details: { name: input.name, sku: input.sku }, ipAddress: getClientIp(ctx.req) });
      return { id };
    }),

  updateAddon: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      sku: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      costPrice: z.string().optional(),
      inventoryId: z.number().optional(),
      inventoryName: z.string().optional(),
      quantityUsed: z.string().optional(),
      unit: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await getDb().update(productAddons).set(data).where(eq(productAddons.id, id));
      await writeAuditLog({ user: ctx.user, action: "update_product_addon", entityType: "product_addon", entityId: id, details: data, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),

  deleteAddon: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await getDb().update(productAddons).set({ isActive: false }).where(eq(productAddons.id, input.id));
      await writeAuditLog({ user: ctx.user, action: "soft_delete_product_addon", entityType: "product_addon", entityId: input.id, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),

  create: adminQuery
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      sku: z.string().min(1),
      barcode: z.string().optional(),
      categoryId: z.number(),
      image: z.string().optional(),
      basePrice: z.string(),
      costPrice: z.string().optional(),
      memberPrice: z.string().optional(),
      dineInPrice: z.string().optional(),
      takeawayPrice: z.string().optional(),
      taxPercent: z.string().optional(),
      isActive: z.boolean().optional(),
      isBestSeller: z.boolean().optional(),
      isFavorite: z.boolean().optional(),
      isSeasonal: z.boolean().optional(),
      hasVariants: z.boolean().optional(),
      stockQuantity: z.number().optional(),
      minStock: z.number().optional(),
      unit: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(products).values(input);
      const id = getInsertId(result);
      await writeAuditLog({ user: ctx.user, action: "create_product", entityType: "product", entityId: id, details: { name: input.name, sku: input.sku }, ipAddress: getClientIp(ctx.req) });
      return { id };
    }),

  update: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      sku: z.string().optional(),
      barcode: z.string().optional(),
      categoryId: z.number().optional(),
      image: z.string().optional(),
      basePrice: z.string().optional(),
      costPrice: z.string().optional(),
      memberPrice: z.string().optional(),
      dineInPrice: z.string().optional(),
      takeawayPrice: z.string().optional(),
      isActive: z.boolean().optional(),
      isBestSeller: z.boolean().optional(),
      isFavorite: z.boolean().optional(),
      isSeasonal: z.boolean().optional(),
      hasVariants: z.boolean().optional(),
      stockQuantity: z.number().optional(),
      minStock: z.number().optional(),
      taxPercent: z.string().optional(),
      unit: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(products).set(data).where(eq(products.id, id));
      await writeAuditLog({ user: ctx.user, action: "update_product", entityType: "product", entityId: id, details: data, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(products).set({ isActive: false }).where(eq(products.id, input.id));
      await writeAuditLog({ user: ctx.user, action: "soft_delete_product", entityType: "product", entityId: input.id, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),
});
