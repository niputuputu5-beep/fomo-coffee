import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getInsertId } from "./lib/db-result";
import { inventory, stockAdjustments } from "@db/schema";
import { and, eq, like, desc, or } from "drizzle-orm";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { TRPCError } from "@trpc/server";

function getInventoryStatus(quantity: number, minStock: number) {
  if (quantity <= 0) return "out_of_stock" as const;
  if (quantity <= minStock) return "low" as const;
  return "normal" as const;
}

export const inventoryRouter = createRouter({
  list: authedQuery
    .input(z.object({ search: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [eq(inventory.isActive, true)];
      if (input?.search) {
        conditions.push(or(
          like(inventory.itemName, `%${input.search}%`),
          like(inventory.sku, `%${input.search}%`),
          like(inventory.location, `%${input.search}%`),
        )!);
      }
      if (input?.status) conditions.push(eq(inventory.status, input.status as "normal" | "low" | "out_of_stock" | "expired"));
      return db.select().from(inventory).where(and(...conditions)).orderBy(desc(inventory.createdAt));
    }),

  getLowStock: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(inventory).where(and(eq(inventory.isActive, true), eq(inventory.status, "low")));
  }),

  create: adminQuery
    .input(z.object({
      itemName: z.string().min(1),
      sku: z.string().min(1),
      unit: z.string().default("pcs"),
      quantity: z.number().default(0),
      minStock: z.number().default(5),
      supplierId: z.number().optional(),
      location: z.string().default("Main Warehouse"),
      batchNumber: z.string().optional(),
      unitCost: z.string().default("0.00"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const totalValue = (Number(input.unitCost) * input.quantity).toFixed(2);
      const status = getInventoryStatus(input.quantity, input.minStock);
      const result = await db.insert(inventory).values({ ...input, totalValue, status });
      const id = getInsertId(result);
      await writeAuditLog({ user: ctx.user, action: "create_inventory_item", entityType: "inventory", entityId: id, details: { itemName: input.itemName, sku: input.sku, quantity: input.quantity }, ipAddress: getClientIp(ctx.req) });
      return { id };
    }),

  update: adminQuery
    .input(z.object({
      id: z.number(),
      itemName: z.string().optional(),
      sku: z.string().trim().min(1).optional(),
      quantity: z.number().optional(),
      minStock: z.number().optional(),
      unitCost: z.string().optional(),
      location: z.string().optional(),
      status: z.enum(["normal", "low", "out_of_stock", "expired"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const current = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
      const nextQuantity = data.quantity ?? current[0]?.quantity ?? 0;
      const nextMinStock = data.minStock ?? current[0]?.minStock ?? 5;
      const nextUnitCost = data.unitCost ?? current[0]?.unitCost ?? "0.00";
      const totalValue = (Number(nextUnitCost) * nextQuantity).toFixed(2);
      await db
        .update(inventory)
        .set({
          ...data,
          status: data.status ?? getInventoryStatus(nextQuantity, nextMinStock),
          totalValue,
        })
        .where(eq(inventory.id, id));
      await writeAuditLog({ user: ctx.user, action: "update_inventory_item", entityType: "inventory", entityId: id, details: data, ipAddress: getClientIp(ctx.req) });
      return { success: true };
    }),

  stockOpname: adminQuery
    .input(z.object({
      inventoryId: z.number(),
      actualQuantity: z.number().min(0),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const rows = await db.select().from(inventory).where(eq(inventory.id, input.inventoryId)).limit(1);
      const item = rows[0];
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item inventory tidak ditemukan." });

      const difference = input.actualQuantity - item.quantity;
      const valueDifference = difference * Number(item.unitCost);
      const totalValue = (input.actualQuantity * Number(item.unitCost)).toFixed(2);
      await db.update(inventory).set({
        quantity: input.actualQuantity,
        totalValue,
        status: getInventoryStatus(input.actualQuantity, item.minStock),
      }).where(eq(inventory.id, input.inventoryId));

      const result = await db.insert(stockAdjustments).values({
        inventoryId: item.id,
        itemName: item.itemName,
        type: "opname",
        previousQuantity: item.quantity,
        actualQuantity: input.actualQuantity,
        difference,
        unitCost: item.unitCost,
        valueDifference: valueDifference.toFixed(2),
        reason: input.reason,
        createdById: ctx.user.id,
        createdByName: ctx.user.name || ctx.user.username,
      });
      const id = getInsertId(result);
      await writeAuditLog({
        user: ctx.user,
        action: "stock_opname",
        entityType: "inventory",
        entityId: item.id,
        details: { adjustmentId: id, previousQuantity: item.quantity, actualQuantity: input.actualQuantity, difference, valueDifference },
        ipAddress: getClientIp(ctx.req),
      });
      return { id };
    }),

  adjustmentHistory: adminQuery
    .input(z.object({
      inventoryId: z.number().optional(),
      type: z.enum(["opname", "adjustment", "waste", "transfer"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.inventoryId) conditions.push(eq(stockAdjustments.inventoryId, input.inventoryId));
      if (input?.type) conditions.push(eq(stockAdjustments.type, input.type));
      if (conditions.length > 0) {
        return getDb().select().from(stockAdjustments).where(and(...conditions)).orderBy(desc(stockAdjustments.createdAt)).limit(input?.limit ?? 20).offset(input?.offset ?? 0);
      }
      return getDb().select().from(stockAdjustments).orderBy(desc(stockAdjustments.createdAt)).limit(input?.limit ?? 20).offset(input?.offset ?? 0);
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await getDb()
        .update(inventory)
        .set({ isActive: false, status: "out_of_stock" })
        .where(eq(inventory.id, input.id));
      await writeAuditLog({
        user: ctx.user,
        action: "soft_delete_inventory_item",
        entityType: "inventory",
        entityId: input.id,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
});
