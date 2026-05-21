import { z } from "zod";
import { createRouter, adminQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { membershipPrograms } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { getInsertId } from "./lib/db-result";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { decimalString, moneyString } from "./lib/validation";

export const membershipRouter = createRouter({
  list: authedQuery.query(async () => {
    return getDb()
      .select()
      .from(membershipPrograms)
      .where(eq(membershipPrograms.isActive, true))
      .orderBy(desc(membershipPrograms.createdAt));
  }),
  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        level: z.enum(["silver", "gold", "platinum"]),
        benefit: z.string().optional(),
        pointMultiplier: decimalString.default("1.00"),
        minSpend: moneyString.default("0.00"),
        validityDays: z.number().default(365),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await getDb().insert(membershipPrograms).values(input);
      const id = getInsertId(result);
      await writeAuditLog({
        user: ctx.user,
        action: "create_membership_program",
        entityType: "membership",
        entityId: id,
        details: { name: input.name, level: input.level },
        ipAddress: getClientIp(ctx.req),
      });
      return { id };
    }),
  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        level: z.enum(["silver", "gold", "platinum"]).optional(),
        benefit: z.string().optional(),
        pointMultiplier: decimalString.optional(),
        minSpend: moneyString.optional(),
        validityDays: z.number().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await getDb().update(membershipPrograms).set(data).where(eq(membershipPrograms.id, id));
      await writeAuditLog({
        user: ctx.user,
        action: "update_membership_program",
        entityType: "membership",
        entityId: id,
        details: data,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await getDb()
        .update(membershipPrograms)
        .set({ isActive: false })
        .where(eq(membershipPrograms.id, input.id));
      await writeAuditLog({
        user: ctx.user,
        action: "soft_delete_membership_program",
        entityType: "membership",
        entityId: input.id,
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),
});
