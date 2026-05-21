import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getAffectedRows, getInsertId } from "./lib/db-result";
import { transactions, transactionItems, shifts, products, productRecipes, inventory, productAddons, promos } from "@db/schema";
import { eq, desc, gte, lte, and, sql, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getClientIp, writeAuditLog } from "./lib/audit";
import { voidOrRefundTransaction } from "./lib/transaction-adjustments";
import { moneyString } from "./lib/validation";

type DbExecutor = any;

const TAX_RATE = 0.11;
const SERVICE_RATE = 0.05;
const MONEY_TOLERANCE = 1;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function assertMoneyClose(actual: string | undefined, expected: number, label: string) {
  if (actual === undefined) return;
  if (Math.abs(Number(actual) - expected) > MONEY_TOLERANCE) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} tidak sesuai dengan perhitungan server.`,
    });
  }
}

async function calculateItemCogs(db: DbExecutor, productId: number, quantity: number) {
  const recipes = await db
    .select()
    .from(productRecipes)
    .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isActive, true)));

  if (recipes.length > 0) {
    let unitCogs = 0;
    for (const recipe of recipes) {
      const stockRows = await db.select().from(inventory).where(eq(inventory.id, recipe.inventoryId)).limit(1);
      const stockItem = stockRows[0];
      if (!stockItem) continue;
      const usedQty = Number(recipe.quantityUsed) * (1 + Number(recipe.wastePercent) / 100);
      unitCogs += usedQty * Number(stockItem.unitCost);
    }
    return unitCogs * quantity;
  }

  const productRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return Number(productRows[0]?.costPrice || 0) * quantity;
}

async function calculateAddonCogs(db: DbExecutor, addons: { addonId: number; quantity: number }[] | undefined, itemQuantity: number) {
  if (!addons?.length) return 0;
  let total = 0;
  for (const addon of addons) {
    const rows = await db.select().from(productAddons).where(eq(productAddons.id, addon.addonId)).limit(1);
    const addOn = rows[0];
    if (!addOn || !addOn.isActive) continue;
    const addonQty = addon.quantity * itemQuantity;
    total += Number(addOn.costPrice) * addonQty;
    if (addOn.inventoryId && Number(addOn.quantityUsed) > 0) {
      const stockRows = await db.select().from(inventory).where(eq(inventory.id, addOn.inventoryId)).limit(1);
      const stockItem = stockRows[0];
      if (stockItem) total += Number(addOn.quantityUsed) * Number(stockItem.unitCost) * addonQty;
    }
  }
  return total;
}

async function deductRecipeInventory(db: DbExecutor, productId: number, soldQuantity: number) {
  const recipes = await db
    .select()
    .from(productRecipes)
    .where(and(eq(productRecipes.productId, productId), eq(productRecipes.isActive, true)));

  for (const recipe of recipes) {
    const usedQty = Math.ceil(Number(recipe.quantityUsed) * soldQuantity * (1 + Number(recipe.wastePercent) / 100));
    const stockRows = await db.select().from(inventory).where(eq(inventory.id, recipe.inventoryId)).limit(1);
    const stockItem = stockRows[0];
    if (!stockItem || stockItem.quantity < usedQty) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Stok bahan ${recipe.inventoryName} tidak mencukupi.`,
      });
    }
    await db
      .update(inventory)
      .set({
        quantity: sql`greatest(${inventory.quantity} - ${usedQty}, 0)`,
        totalValue: sql`greatest(${inventory.quantity} - ${usedQty}, 0) * ${inventory.unitCost}`,
        status: sql`case
          when greatest(${inventory.quantity} - ${usedQty}, 0) <= 0 then 'out_of_stock'
          when greatest(${inventory.quantity} - ${usedQty}, 0) <= ${inventory.minStock} then 'low'
          else 'normal'
        end`,
      })
      .where(eq(inventory.id, recipe.inventoryId));
  }
}

async function deductAddonInventory(db: DbExecutor, addons: { addonId: number; quantity: number }[] | undefined, itemQuantity: number) {
  if (!addons?.length) return;
  for (const addon of addons) {
    const rows = await db.select().from(productAddons).where(eq(productAddons.id, addon.addonId)).limit(1);
    const addOn = rows[0];
    if (!addOn?.inventoryId || Number(addOn.quantityUsed) <= 0) continue;
    const usedQty = Math.ceil(Number(addOn.quantityUsed) * addon.quantity * itemQuantity);
    const stockRows = await db.select().from(inventory).where(eq(inventory.id, addOn.inventoryId)).limit(1);
    const stockItem = stockRows[0];
    if (!stockItem || stockItem.quantity < usedQty) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Stok add-on ${addOn.name} tidak mencukupi.`,
      });
    }
    await db
      .update(inventory)
      .set({
        quantity: sql`greatest(${inventory.quantity} - ${usedQty}, 0)`,
        totalValue: sql`greatest(${inventory.quantity} - ${usedQty}, 0) * ${inventory.unitCost}`,
        status: sql`case
          when greatest(${inventory.quantity} - ${usedQty}, 0) <= 0 then 'out_of_stock'
          when greatest(${inventory.quantity} - ${usedQty}, 0) <= ${inventory.minStock} then 'low'
          else 'normal'
        end`,
      })
      .where(eq(inventory.id, addOn.inventoryId));
  }
}

async function buildServerItem(
  db: DbExecutor,
  item: {
    productId: number;
    quantity: number;
    sugarLevel?: string;
    iceLevel?: string;
    addons?: { addonId: number; quantity: number }[];
    notes?: string;
  },
  orderType: "dine_in" | "takeaway" | "delivery",
) {
  const productRows = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
  const product = productRows[0];

  if (!product || !product.isActive) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Produk tidak ditemukan atau tidak aktif." });
  }

  if (product.stockQuantity < item.quantity) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Stok ${product.name} tidak mencukupi.` });
  }

  const unitPrice = Number(
    orderType === "dine_in" && product.dineInPrice
      ? product.dineInPrice
      : orderType === "takeaway" && product.takeawayPrice
        ? product.takeawayPrice
        : product.basePrice,
  );
  const normalizedAddons = [];
  let addonUnitTotal = 0;

  for (const addonInput of item.addons ?? []) {
    const rows = await db.select().from(productAddons).where(eq(productAddons.id, addonInput.addonId)).limit(1);
    const addon = rows[0];
    if (!addon || !addon.isActive) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Add-on tidak ditemukan atau tidak aktif." });
    }
    const addonPrice = Number(addon.price);
    addonUnitTotal += addonPrice * addonInput.quantity;
    normalizedAddons.push({
      addonId: addon.id,
      name: addon.name,
      price: addon.price,
      quantity: addonInput.quantity,
    });
  }

  const subtotal = roundMoney((unitPrice + addonUnitTotal) * item.quantity);

  return {
    productId: product.id,
    productName: product.name,
    variantName: null,
    quantity: item.quantity,
    unitPrice: unitPrice.toFixed(2),
    subtotal: subtotal.toFixed(2),
    sugarLevel: item.sugarLevel,
    iceLevel: item.iceLevel,
    notes: item.notes,
    addons: normalizedAddons,
  };
}

async function calculatePromoDiscount(db: DbExecutor, promoCode: string | undefined, subtotal: number) {
  const code = promoCode?.trim();
  if (!code) return { discount: 0, code: undefined };

  const promoRows = await db.select().from(promos).where(eq(promos.code, code)).limit(1);
  const promo = promoRows[0];
  const now = new Date();

  if (
    !promo ||
    !promo.isActive ||
    new Date(promo.startDate) > now ||
    new Date(promo.endDate) < now ||
    Number(promo.minPurchase) > subtotal ||
    (promo.usageLimit !== null && promo.usageLimit !== undefined && promo.usageCount >= promo.usageLimit)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Kode promo tidak ditemukan, tidak aktif, expired, atau belum memenuhi minimum transaksi.",
    });
  }

  const rawDiscount =
    promo.type === "percentage"
      ? Math.min(subtotal * (Number(promo.value) / 100), Number(promo.maxDiscount || subtotal))
      : Number(promo.value);

  return { discount: roundMoney(Math.min(rawDiscount, subtotal)), code: promo.code };
}

export const transactionRouter = createRouter({
  list: authedQuery
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.string().optional(),
      shiftId: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [];
      if (ctx.user.role === "cashier") conditions.push(eq(transactions.userId, ctx.user.id));
      if (input?.startDate) conditions.push(gte(transactions.createdAt, new Date(input.startDate)));
      if (input?.endDate) conditions.push(lte(transactions.createdAt, new Date(input.endDate)));
      if (input?.status) conditions.push(eq(transactions.status, input.status as "pending" | "processing" | "ready" | "completed" | "cancelled" | "void"));
      if (input?.shiftId) conditions.push(eq(transactions.shiftId, input.shiftId));
      if (input?.search) {
        conditions.push(or(like(transactions.orderNumber, `%${input.search}%`), like(transactions.customerName, `%${input.search}%`), like(transactions.userName, `%${input.search}%`))!);
      }

      if (conditions.length > 0) {
        return db.select().from(transactions).where(and(...conditions)).orderBy(desc(transactions.createdAt)).limit(input?.limit ?? 50).offset(input?.offset ?? 0);
      }
      return db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(input?.limit ?? 50).offset(input?.offset ?? 0);
    }),

  getById: authedQuery.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const db = getDb();
    const tx = await db.select().from(transactions).where(eq(transactions.id, input.id)).limit(1);
    if (!tx[0]) return null;
    if (ctx.user.role === "cashier" && tx[0].userId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Kasir hanya dapat melihat transaksi miliknya sendiri." });
    }
    const items = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, input.id));
    return { ...tx[0], items };
  }),

  kitchenQueue: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const conditions = [
      eq(transactions.status, "pending"),
    ];
    if (ctx.user.role === "cashier") conditions.push(eq(transactions.userId, ctx.user.id));
    const pending = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(30);
    const activeStatuses = ["processing", "ready"] as const;
    const active =
      ctx.user.role === "cashier"
        ? await db
            .select()
            .from(transactions)
            .where(eq(transactions.userId, ctx.user.id))
            .orderBy(desc(transactions.createdAt))
            .limit(50)
        : await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(50);
    const queue = [...pending, ...active.filter((tx) => activeStatuses.includes(tx.status as "processing" | "ready"))]
      .filter((tx, index, rows) => rows.findIndex((row) => row.id === tx.id) === index)
      .slice(0, 30);

    const withItems = await Promise.all(
      queue.map(async (tx) => ({
        ...tx,
        items: await db.select().from(transactionItems).where(eq(transactionItems.transactionId, tx.id)),
      })),
    );

    return withItems;
  }),

  create: authedQuery
    .input(z.object({
      customerId: z.number().optional(),
      customerName: z.string().optional(),
      orderType: z.enum(["dine_in", "takeaway", "delivery"]),
      tableNumber: z.string().optional(),
      subtotal: moneyString,
      taxAmount: moneyString.optional(),
      serviceCharge: moneyString.optional(),
      discountAmount: moneyString.optional(),
      totalAmount: moneyString,
      paymentMethod: z.enum(["cash", "qris", "debit", "credit_card", "ewallet", "transfer_bank"]),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        productName: z.string(),
        variantName: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPrice: moneyString,
        subtotal: moneyString,
        sugarLevel: z.string().optional(),
        iceLevel: z.string().optional(),
        addons: z.array(z.object({
          addonId: z.number(),
          name: z.string(),
          price: moneyString,
          quantity: z.number().int().positive().default(1),
        })).optional(),
        notes: z.string().optional(),
      })).min(1),
      promoCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const openShift = await db
        .select()
        .from(shifts)
        .where(and(eq(shifts.userId, ctx.user.id), eq(shifts.status, "open")))
        .orderBy(desc(shifts.openedAt))
        .limit(1);

      if (!openShift[0]) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Buka shift kasir terlebih dahulu sebelum membuat transaksi.",
        });
      }

      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const created = await db.transaction(async (tx) => {
        const serverItems = await Promise.all(
          input.items.map((item) => buildServerItem(tx, item, input.orderType)),
        );
        const subtotal = roundMoney(serverItems.reduce((sum, item) => sum + Number(item.subtotal), 0));
        const serviceCharge = roundMoney(Number(input.serviceCharge || "0"));
        const expectedServiceCharge = roundMoney(subtotal * SERVICE_RATE);
        if (serviceCharge !== 0 && Math.abs(serviceCharge - expectedServiceCharge) > MONEY_TOLERANCE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Service charge tidak sesuai dengan perhitungan server.",
          });
        }

        const { discount, code: promoCode } = await calculatePromoDiscount(tx, input.promoCode, subtotal);
        const taxAmount = roundMoney((subtotal + serviceCharge) * TAX_RATE);
        const unroundedTotal = roundMoney(subtotal + serviceCharge + taxAmount - discount);
        const roundedTotal = roundMoney(Math.round(unroundedTotal / 100) * 100);
        const requestedTotal = Number(input.totalAmount);
        const totalAmount =
          Math.abs(requestedTotal - roundedTotal) <= MONEY_TOLERANCE
            ? roundedTotal
            : Math.abs(requestedTotal - unroundedTotal) <= MONEY_TOLERANCE
              ? unroundedTotal
              : Number.NaN;

        if (!Number.isFinite(totalAmount)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Total pembayaran tidak sesuai dengan perhitungan server.",
          });
        }

        assertMoneyClose(input.subtotal, subtotal, "Subtotal");
        assertMoneyClose(input.serviceCharge, serviceCharge, "Service charge");
        assertMoneyClose(input.taxAmount, taxAmount, "PPN");
        assertMoneyClose(input.discountAmount, discount, "Diskon");

        const itemCosts = await Promise.all(
          serverItems.map(async (item, index) => ({
            index,
            cogsAmount:
              (await calculateItemCogs(tx, item.productId, item.quantity)) +
              (await calculateAddonCogs(tx, item.addons, item.quantity)),
          })),
        );
        const totalCogs = roundMoney(itemCosts.reduce((sum, item) => sum + item.cogsAmount, 0));
        const grossProfit = roundMoney(totalAmount - totalCogs);

        const result = await tx.insert(transactions).values({
          customerId: input.customerId,
          customerName: input.customerName,
          orderType: input.orderType,
          tableNumber: input.tableNumber,
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          serviceCharge: serviceCharge.toFixed(2),
          discountAmount: discount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          totalCogs: totalCogs.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
          shiftId: openShift[0].id,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.username,
          orderNumber,
          status: "pending",
        });
        const txId = getInsertId(result);

        for (const [index, item] of serverItems.entries()) {
          const cogsAmount = itemCosts.find((cost) => cost.index === index)?.cogsAmount ?? 0;
          await tx.insert(transactionItems).values({
            transactionId: txId,
            productId: item.productId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            cogsAmount: cogsAmount.toFixed(2),
            grossProfit: (Number(item.subtotal) - cogsAmount).toFixed(2),
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            extras: item.addons.length ? JSON.stringify(item.addons) : item.notes,
            notes: item.notes,
          });
          const stockUpdate = await tx
            .update(products)
            .set({
              stockQuantity: sql`greatest(${products.stockQuantity} - ${item.quantity}, 0)`,
            })
            .where(and(eq(products.id, item.productId), gte(products.stockQuantity, item.quantity)));
          if (getAffectedRows(stockUpdate) === 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `Stok ${item.productName} tidak mencukupi.` });
          }
          await deductRecipeInventory(tx, item.productId, item.quantity);
          await deductAddonInventory(tx, item.addons, item.quantity);
        }

        const totalSql = totalAmount.toFixed(2);
        await tx
          .update(shifts)
          .set({
            totalSales: sql`${shifts.totalSales} + ${totalSql}`,
            cashSales: sql`${shifts.cashSales} + ${input.paymentMethod === "cash" ? totalSql : "0.00"}`,
            cardSales: sql`${shifts.cardSales} + ${["debit", "credit_card"].includes(input.paymentMethod) ? totalSql : "0.00"}`,
            qrisSales: sql`${shifts.qrisSales} + ${input.paymentMethod === "qris" ? totalSql : "0.00"}`,
            ewalletSales: sql`${shifts.ewalletSales} + ${input.paymentMethod === "ewallet" ? totalSql : "0.00"}`,
            transferSales: sql`${shifts.transferSales} + ${input.paymentMethod === "transfer_bank" ? totalSql : "0.00"}`,
          })
          .where(eq(shifts.id, openShift[0].id));

        if (promoCode) {
          await tx
            .update(promos)
            .set({ usageCount: sql`${promos.usageCount} + 1` })
            .where(eq(promos.code, promoCode));
        }

        return {
          txId,
          totalAmount: totalAmount.toFixed(2),
          totalCogs: totalCogs.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
        };
      });

      await writeAuditLog({
        user: ctx.user,
        action: "create_transaction",
        entityType: "transaction",
        entityId: created.txId,
        details: { orderNumber, totalAmount: created.totalAmount, totalCogs: created.totalCogs, grossProfit: created.grossProfit, paymentMethod: input.paymentMethod },
        ipAddress: getClientIp(ctx.req),
      });

      return { id: created.txId, orderNumber };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["pending", "processing", "ready", "completed", "cancelled", "void"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await db.select().from(transactions).where(eq(transactions.id, input.id)).limit(1);
      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaksi tidak ditemukan." });
      }
      if (ctx.user.role === "cashier" && existing[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Kasir hanya dapat mengubah transaksi miliknya sendiri." });
      }
      if (input.status === "void" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Void transaksi membutuhkan approval Owner." });
      }
      if (input.status === "void") {
        await db.transaction((tx) => voidOrRefundTransaction(tx, input.id, "void"));
      } else {
        await db.update(transactions).set({ status: input.status }).where(eq(transactions.id, input.id));
      }
      await writeAuditLog({
        user: ctx.user,
        action: "update_transaction_status",
        entityType: "transaction",
        entityId: input.id,
        details: { status: input.status },
        ipAddress: getClientIp(ctx.req),
      });
      return { success: true };
    }),

  getTodayStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const conditions = [gte(transactions.createdAt, today)];
    if (ctx.user.role === "cashier") conditions.push(eq(transactions.userId, ctx.user.id));
    const txs = await db.select().from(transactions).where(and(...conditions));
    const totalSales = txs.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const totalOrders = txs.length;
    return { totalSales, totalOrders, transactions: txs };
  }),
});
