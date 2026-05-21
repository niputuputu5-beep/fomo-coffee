import { z } from "zod";
import { createRouter, adminQuery, authedQuery, ownerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { approvalRequests, transactions } from "@db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-result";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { TRPCError } from "@trpc/server";
import { voidOrRefundTransaction } from "./lib/transaction-adjustments";

export const approvalRouter = createRouter({
  list: adminQuery.query(async () => {
    return getDb().select().from(approvalRequests).orderBy(desc(approvalRequests.createdAt));
  }),
  request: authedQuery
    .input(
      z.object({
        type: z.enum(["void", "refund", "promo", "purchase_order"]),
        entityType: z.string().min(1),
        entityId: z.number().optional(),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.entityType === "transaction" && input.entityId) {
        const tx = await getDb().select().from(transactions).where(eq(transactions.id, input.entityId)).limit(1);
        if (!tx[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan." });
        if (["void", "cancelled"].includes(tx[0].status) || ["refunded", "void"].includes(tx[0].paymentStatus)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Transaksi ini sudah void/refund/cancelled." });
        }
        const pending = await getDb()
          .select()
          .from(approvalRequests)
          .where(and(
            eq(approvalRequests.entityType, "transaction"),
            eq(approvalRequests.entityId, input.entityId),
            eq(approvalRequests.type, input.type),
            eq(approvalRequests.status, "pending"),
          ))
          .limit(1);
        if (pending[0]) throw new TRPCError({ code: "CONFLICT", message: "Request approval untuk transaksi ini masih pending." });
      }
      const result = await getDb().insert(approvalRequests).values({
        ...input,
        requestedById: ctx.user.id,
        requestedByName: ctx.user.name || ctx.user.username,
      });
      const id = getInsertId(result);
      await writeAuditLog({
        user: ctx.user,
        action: "request_approval",
        entityType: "approval",
        entityId: id,
        details: input,
        ipAddress: getClientIp(ctx.req),
      });
      return { id };
    }),
  decide: ownerQuery
    .input(z.object({ id: z.number(), status: z.enum(["approved", "rejected"]) }))
    .mutation(async ({ input, ctx }) => {
      const rows = await getDb().select().from(approvalRequests).where(eq(approvalRequests.id, input.id)).limit(1);
      const request = rows[0];
      if (!request) {
        return { success: true };
      }
      if (request.status !== "pending") {
        return { success: true };
      }
      await getDb().transaction(async (tx) => {
        await tx
          .update(approvalRequests)
          .set({
            status: input.status,
            decidedById: ctx.user.id,
            decidedByName: ctx.user.name || ctx.user.username,
            decidedAt: new Date(),
          })
          .where(eq(approvalRequests.id, input.id));

        if (request?.entityType === "transaction" && request.entityId && input.status === "approved") {
          await voidOrRefundTransaction(tx, request.entityId, request.type === "refund" ? "refund" : "void");
        }
      });

      await writeAuditLog({
        user: ctx.user,
        action: "decide_approval",
        entityType: "approval",
        entityId: input.id,
        details: { status: input.status },
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
});
