import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import {
  inventory,
  productAddons,
  productRecipes,
  products,
  shifts,
  transactionItems,
  transactions,
} from "@db/schema";

type DbExecutor = any;

function parseAddons(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is { addonId: number; quantity: number } =>
        Number.isInteger(item?.addonId) && Number.isFinite(Number(item?.quantity)),
    );
  } catch {
    return [];
  }
}

async function restoreRecipeInventory(db: DbExecutor, productId: number, soldQuantity: number) {
  const recipes = await db
    .select()
    .from(productRecipes)
    .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isActive, true)));

  for (const recipe of recipes) {
    const usedQty = Math.ceil(Number(recipe.quantityUsed) * soldQuantity * (1 + Number(recipe.wastePercent) / 100));
    await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} + ${usedQty}`,
        totalValue: sql`(${inventory.quantity} + ${usedQty}) * ${inventory.unitCost}`,
        status: sql`case
          when (${inventory.quantity} + ${usedQty}) <= 0 then 'out_of_stock'
          when (${inventory.quantity} + ${usedQty}) <= ${inventory.minStock} then 'low'
          else 'normal'
        end`,
      })
      .where(eq(inventory.id, recipe.inventoryId));
  }
}

async function restoreAddonInventory(db: DbExecutor, addons: { addonId: number; quantity: number }[], itemQuantity: number) {
  for (const addon of addons) {
    const rows = await db.select().from(productAddons).where(eq(productAddons.id, addon.addonId)).limit(1);
    const addOn = rows[0];
    if (!addOn?.inventoryId || Number(addOn.quantityUsed) <= 0) continue;

    const usedQty = Math.ceil(Number(addOn.quantityUsed) * addon.quantity * itemQuantity);
    await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} + ${usedQty}`,
        totalValue: sql`(${inventory.quantity} + ${usedQty}) * ${inventory.unitCost}`,
        status: sql`case
          when (${inventory.quantity} + ${usedQty}) <= 0 then 'out_of_stock'
          when (${inventory.quantity} + ${usedQty}) <= ${inventory.minStock} then 'low'
          else 'normal'
        end`,
      })
      .where(eq(inventory.id, addOn.inventoryId));
  }
}

async function restoreTransactionStock(db: DbExecutor, transactionId: number) {
  const items = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, transactionId));

  for (const item of items) {
    await db
      .update(products)
      .set({ stockQuantity: sql`${products.stockQuantity} + ${item.quantity}` })
      .where(eq(products.id, item.productId));
    await restoreRecipeInventory(db, item.productId, item.quantity);
    await restoreAddonInventory(db, parseAddons(item.extras), item.quantity);
  }
}

async function reverseShiftSales(db: DbExecutor, tx: typeof transactions.$inferSelect) {
  const amount = Number(tx.totalAmount).toFixed(2);
  await db
    .update(shifts)
    .set({
      totalSales: sql`greatest(${shifts.totalSales} - ${amount}, 0)`,
      cashSales: sql`greatest(${shifts.cashSales} - ${tx.paymentMethod === "cash" ? amount : "0.00"}, 0)`,
      cardSales: sql`greatest(${shifts.cardSales} - ${["debit", "credit_card"].includes(tx.paymentMethod) ? amount : "0.00"}, 0)`,
      qrisSales: sql`greatest(${shifts.qrisSales} - ${tx.paymentMethod === "qris" ? amount : "0.00"}, 0)`,
      ewalletSales: sql`greatest(${shifts.ewalletSales} - ${tx.paymentMethod === "ewallet" ? amount : "0.00"}, 0)`,
      transferSales: sql`greatest(${shifts.transferSales} - ${tx.paymentMethod === "transfer_bank" ? amount : "0.00"}, 0)`,
    })
    .where(eq(shifts.id, tx.shiftId));
}

export async function voidOrRefundTransaction(
  db: DbExecutor,
  transactionId: number,
  kind: "void" | "refund",
) {
  const rows = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
  const tx = rows[0];

  if (!tx) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan." });
  }

  if (["void", "cancelled"].includes(tx.status) || ["void", "refunded"].includes(tx.paymentStatus)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Transaksi ini sudah void/refund/cancelled." });
  }

  await restoreTransactionStock(db, transactionId);
  await reverseShiftSales(db, tx);
  await db
    .update(transactions)
    .set({
      status: kind === "refund" ? "cancelled" : "void",
      paymentStatus: kind === "refund" ? "refunded" : "void",
    })
    .where(eq(transactions.id, transactionId));

  return tx;
}
