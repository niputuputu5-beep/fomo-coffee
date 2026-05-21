export function getInsertId(result: unknown): number {
  const packet = Array.isArray(result) ? result[0] : result;
  const insertId = Number((packet as { insertId?: number | string } | undefined)?.insertId);
  return Number.isFinite(insertId) ? insertId : 0;
}

export function getAffectedRows(result: unknown): number {
  const packet = Array.isArray(result) ? result[0] : result;
  const affectedRows = Number((packet as { affectedRows?: number | string } | undefined)?.affectedRows);
  return Number.isFinite(affectedRows) ? affectedRows : 0;
}
