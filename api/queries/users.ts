import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";

export async function findUserById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findUserByUsername(username: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  await getDb()
    .insert(schema.users)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        ...data,
        updatedAt: new Date(),
      },
    });
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  await getDb()
    .update(schema.users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, id));
}

export async function touchLastSignIn(userId: number) {
  await getDb()
    .update(schema.users)
    .set({ lastSignInAt: new Date() })
    .where(eq(schema.users.id, userId));
}
