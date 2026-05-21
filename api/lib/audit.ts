import { auditLogs } from "@db/schema";
import type { PublicUser } from "../context";
import { getDb } from "../queries/connection";

type AuditInput = {
  user?: PublicUser;
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function writeAuditLog({
  user,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: AuditInput) {
  await getDb().insert(auditLogs).values({
    userId: user?.id,
    userName: user?.name || user?.username,
    userRole: user?.role,
    action,
    entityType,
    entityId,
    details,
    ipAddress: ipAddress ?? undefined,
  });
}

export function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
