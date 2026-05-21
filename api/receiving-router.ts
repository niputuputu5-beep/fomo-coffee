import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { inventory, purchaseOrders, receivingRecords } from "@db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getInsertId } from "./lib/db-result";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { moneyString, nonNegativeInt, positiveInt } from "./lib/validation";

function receivingInventorySku(id: number) {
  return `RCV-${id}`;
}

export const receivingRouter = createRouter({
  list: adminQuery.query(async () => {
    return getDb().select().from(receivingRecords).orderBy(desc(receivingRecords.createdAt));
  }),
  create: adminQuery
    .input(
      z.object({
        purchaseOrderId: z.number().optional(),
        supplierName: z.string().min(1),
        itemName: z.string().min(1),
        batchNumber: z.string().optional(),
        quantityReceived: positiveInt,
        unit: z.string().default("pcs"),
        unitCost: moneyString.default("0.00"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const receivingNumber = `RCV-${Date.now().toString(36).toUpperCase()}`;
      const id = await getDb().transaction(async (tx) => {
        const result = await tx.insert(receivingRecords).values({
          ...input,
          receivingNumber,
          receivedById: ctx.user.id,
          receivedByName: ctx.user.name || ctx.user.username,
        });
        const id = getInsertId(result);
        const totalValue = (Number(input.unitCost) * input.quantityReceived).toFixed(2);
        await tx.insert(inventory).values({
          itemName: input.itemName,
          sku: receivingInventorySku(id),
          unit: input.unit,
          quantity: input.quantityReceived,
          minStock: 5,
          location: "Receiving Dock",
          batchNumber: input.batchNumber,
          unitCost: input.unitCost,
          totalValue,
          status: input.quantityReceived <= 5 ? "low" : "normal",
        });
        if (input.purchaseOrderId) {
          await tx
            .update(purchaseOrders)
            .set({ status: "received" })
            .where(eq(purchaseOrders.id, input.purchaseOrderId));
        }
        return id;
      });
      await writeAuditLog({
        user: ctx.user,
        action: "create_receiving",
        entityType: "receiving",
        entityId: id,
        details: { receivingNumber, itemName: input.itemName, quantityReceived: input.quantityReceived },
        ipAddress: getClientIp(ctx.req),
      });
      return { id, receivingNumber };
    }),
  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        supplierName: z.string().min(1).optional(),
        itemName: z.string().min(1).optional(),
        batchNumber: z.string().optional(),
        quantityReceived: nonNegativeInt.optional(),
        unit: z.string().optional(),
        unitCost: moneyString.optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await getDb().transaction(async (tx) => {
        await tx.update(receivingRecords).set(data).where(eq(receivingRecords.id, id));
        await tx
          .update(inventory)
          .set({
            ...(data.itemName ? { itemName: data.itemName } : {}),
            ...(data.batchNumber !== undefined ? { batchNumber: data.batchNumber } : {}),
            ...(data.quantityReceived !== undefined
              ? {
                  quantity: data.quantityReceived,
                  status: sql`case
                    when ${data.quantityReceived} <= 0 then 'out_of_stock'
                    when ${data.quantityReceived} <= ${inventory.minStock} then 'low'
                    else 'normal'
                  end`,
                }
              : {}),
            ...(data.unitCost ? { unitCost: data.unitCost } : {}),
            ...(data.quantityReceived !== undefined || data.unitCost
              ? {
                  totalValue: sql`${data.quantityReceived ?? inventory.quantity} * ${data.unitCost ?? inventory.unitCost}`,
                }
              : {}),
            ...(data.unit ? { unit: data.unit } : {}),
          })
          .where(eq(inventory.sku, receivingInventorySku(id)));
      });
      await writeAuditLog({
        user: ctx.user,
        action: "update_receiving",
        entityType: "receiving",
        entityId: id,
        details: data,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await getDb().transaction(async (tx) => {
        await tx.delete(receivingRecords).where(eq(receivingRecords.id, input.id));
        await tx.delete(inventory).where(eq(inventory.sku, receivingInventorySku(input.id)));
      });
      await writeAuditLog({
        user: ctx.user,
        action: "delete_receiving",
        entityType: "receiving",
        entityId: input.id,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
});
