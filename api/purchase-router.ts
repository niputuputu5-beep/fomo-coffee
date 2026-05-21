import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRouter, adminQuery, ownerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { approvalRequests, purchaseOrders } from "@db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-result";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { moneyString, optionalMoneyString } from "./lib/validation";

export const purchaseRouter = createRouter({
  list: adminQuery.query(async () => {
    return getDb().select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  }),
  create: adminQuery
    .input(
      z.object({
        supplierId: z.number().optional(),
        supplierName: z.string().min(1),
        totalAmount: moneyString.default("0.00"),
        expectedDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
      const result = await getDb().insert(purchaseOrders).values({
        ...input,
        poNumber,
        status: "pending_approval",
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : undefined,
        createdById: ctx.user.id,
        createdByName: ctx.user.name || ctx.user.username,
      });
      const id = getInsertId(result);
      await getDb().insert(approvalRequests).values({
        type: "purchase_order",
        entityType: "purchase_order",
        entityId: id,
        requestedById: ctx.user.id,
        requestedByName: ctx.user.name || ctx.user.username,
        reason: `Approval PO ${poNumber}`,
      });
      await writeAuditLog({
        user: ctx.user,
        action: "create_purchase_order",
        entityType: "purchase_order",
        entityId: id,
        details: { poNumber, supplierName: input.supplierName, totalAmount: input.totalAmount },
        ipAddress: getClientIp(ctx.req),
      });
      return { id, poNumber };
    }),
  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        supplierName: z.string().min(1).optional(),
        totalAmount: optionalMoneyString,
        expectedDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await getDb()
        .update(purchaseOrders)
        .set({
          ...data,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        })
        .where(eq(purchaseOrders.id, id));
      await writeAuditLog({
        user: ctx.user,
        action: "update_purchase_order",
        entityType: "purchase_order",
        entityId: id,
        details: data,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
  approve: ownerQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const rows = await getDb().select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Purchase order tidak ditemukan." });
      await getDb()
        .update(purchaseOrders)
        .set({ status: "approved", approvedById: ctx.user.id, approvedAt: new Date() })
        .where(eq(purchaseOrders.id, input.id));
      await getDb()
        .update(approvalRequests)
        .set({
          status: "approved",
          decidedById: ctx.user.id,
          decidedByName: ctx.user.name || ctx.user.username,
          decidedAt: new Date(),
        })
        .where(and(eq(approvalRequests.entityType, "purchase_order"), eq(approvalRequests.entityId, input.id)));
      await writeAuditLog({
        user: ctx.user,
        action: "approve_purchase_order",
        entityType: "purchase_order",
        entityId: input.id,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
  cancel: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await getDb()
        .update(purchaseOrders)
        .set({ status: "cancelled" })
        .where(eq(purchaseOrders.id, input.id));
      await writeAuditLog({
        user: ctx.user,
        action: "cancel_purchase_order",
        entityType: "purchase_order",
        entityId: input.id,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
});
