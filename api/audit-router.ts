import { z } from "zod";
import { createRouter, ownerQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getInsertId } from "./lib/db-result";
import { auditLogs } from "@db/schema";
import { eq, desc, gte, like, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

function parseAuditDetails(details?: string) {
  if (!details) return undefined;
  try {
    return JSON.parse(details);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Format JSON details audit log tidak valid." });
  }
}

export const auditRouter = createRouter({
  list: ownerQuery
    .input(z.object({
      entityType: z.string().optional(),
      action: z.string().optional(),
      startDate: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.entityType) conditions.push(eq(auditLogs.entityType, input.entityType));
      if (input?.action) conditions.push(eq(auditLogs.action, input.action));
      if (input?.startDate) conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      if (input?.search) conditions.push(like(sql`coalesce(${auditLogs.userName}, '')`, `%${input.search}%`));

      if (conditions.length > 0) {
        return db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(input?.limit ?? 50).offset(input?.offset ?? 0);
      }
      return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(input?.limit ?? 50).offset(input?.offset ?? 0);
    }),

  create: ownerQuery
    .input(z.object({
      userId: z.number().optional(),
      userName: z.string().optional(),
      userRole: z.string().optional(),
      action: z.string(),
      entityType: z.string(),
      entityId: z.number().optional(),
      details: z.string().optional(),
      ipAddress: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(auditLogs).values({
        ...input,
        details: parseAuditDetails(input.details),
      });
      return { id: getInsertId(result) };
    }),
});
