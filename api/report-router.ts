import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { transactions, transactionItems, customers, inventory } from "@db/schema";
import { gte, lte, and } from "drizzle-orm";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const reportRouter = createRouter({
  salesSummary: adminQuery
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const txs = await db.select().from(transactions).where(
        and(gte(transactions.createdAt, new Date(input.startDate)), lte(transactions.createdAt, new Date(input.endDate)))
      );
      const totalSales = txs.reduce((s, t) => s + Number(t.totalAmount), 0);
      const totalCogs = txs.reduce((s, t) => s + Number(t.totalCogs), 0);
      const grossProfit = txs.reduce((s, t) => s + Number(t.grossProfit), 0);
      const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
      const totalOrders = txs.length;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      const totalTax = txs.reduce((s, t) => s + Number(t.taxAmount), 0);
      const totalDiscount = txs.reduce((s, t) => s + Number(t.discountAmount), 0);
      const paymentMethods = txs.reduce((acc: Record<string, number>, t) => {
        acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + Number(t.totalAmount);
        return acc;
      }, {} as Record<string, number>);
      return { totalSales, totalCogs, grossProfit, grossMargin, totalOrders, avgOrderValue, totalTax, totalDiscount, paymentMethods };
    }),

  salesTrend: adminQuery
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const txs = await getDb().select().from(transactions).where(
        and(gte(transactions.createdAt, new Date(input.startDate)), lte(transactions.createdAt, new Date(input.endDate))),
      );
      const grouped = new Map<string, { name: string; sales: number; orders: number; grossProfit: number }>();
      for (const tx of txs) {
        const key = dateKey(new Date(tx.createdAt));
        const current = grouped.get(key) ?? { name: key.slice(5), sales: 0, orders: 0, grossProfit: 0 };
        current.sales += Number(tx.totalAmount);
        current.orders += 1;
        current.grossProfit += Number(tx.grossProfit);
        grouped.set(key, current);
      }
      return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
    }),

  hourlySales: adminQuery
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const txs = await getDb().select().from(transactions).where(
        and(gte(transactions.createdAt, new Date(input.startDate)), lte(transactions.createdAt, new Date(input.endDate))),
      );
      const grouped = new Map<string, { hour: string; orders: number; sales: number }>();
      for (const tx of txs) {
        const hour = `${new Date(tx.createdAt).getHours().toString().padStart(2, "0")}:00`;
        const current = grouped.get(hour) ?? { hour, orders: 0, sales: 0 };
        current.orders += 1;
        current.sales += Number(tx.totalAmount);
        grouped.set(hour, current);
      }
      return Array.from(grouped.values()).sort((a, b) => a.hour.localeCompare(b.hour));
    }),

  paymentDistribution: adminQuery
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const txs = await getDb().select().from(transactions).where(
        and(gte(transactions.createdAt, new Date(input.startDate)), lte(transactions.createdAt, new Date(input.endDate))),
      );
      const total = txs.reduce((sum, tx) => sum + Number(tx.totalAmount), 0);
      const grouped = txs.reduce((acc: Record<string, number>, tx) => {
        acc[tx.paymentMethod] = (acc[tx.paymentMethod] || 0) + Number(tx.totalAmount);
        return acc;
      }, {});
      return Object.entries(grouped).map(([name, amount]) => ({
        name,
        amount,
        value: total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0,
      }));
    }),

  topProducts: adminQuery
    .input(z.object({ startDate: z.string(), endDate: z.string(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = getDb();
      const items = await db.select().from(transactionItems).where(
        and(gte(transactionItems.createdAt, new Date(input.startDate)), lte(transactionItems.createdAt, new Date(input.endDate))),
      );
      const productMap = new Map<number, { name: string; quantity: number; revenue: number; cogs: number; grossProfit: number; margin: number }>();
      for (const item of items) {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.subtotal);
          existing.cogs += Number(item.cogsAmount);
          existing.grossProfit += Number(item.grossProfit);
          existing.margin = existing.revenue > 0 ? (existing.grossProfit / existing.revenue) * 100 : 0;
        } else {
          const revenue = Number(item.subtotal);
          const cogs = Number(item.cogsAmount);
          const grossProfit = Number(item.grossProfit);
          productMap.set(item.productId, {
            name: item.productName,
            quantity: item.quantity,
            revenue,
            cogs,
            grossProfit,
            margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          });
        }
      }
      return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, input.limit);
    }),

  customerAnalytics: adminQuery.query(async () => {
    const db = getDb();
    const allCustomers = await db.select().from(customers);
    const totalCustomers = allCustomers.length;
    const avgSpending = totalCustomers > 0 ? allCustomers.reduce((s, c) => s + Number(c.totalSpent), 0) / totalCustomers : 0;
    const avgVisits = totalCustomers > 0 ? allCustomers.reduce((s, c) => s + c.visitCount, 0) / totalCustomers : 0;
    const topCustomers = allCustomers.sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent)).slice(0, 10);
    const membershipDistribution = allCustomers.reduce((acc: Record<string, number>, c) => {
      acc[c.membershipLevel] = (acc[c.membershipLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { totalCustomers, avgSpending, avgVisits, topCustomers, membershipDistribution };
  }),

  inventoryStatus: adminQuery.query(async () => {
    const db = getDb();
    const items = await db.select().from(inventory);
    const totalItems = items.length;
    const totalValue = items.reduce((s, i) => s + Number(i.totalValue), 0);
    const lowStock = items.filter((i) => i.status === "low").length;
    const outOfStock = items.filter((i) => i.status === "out_of_stock").length;
    return { totalItems, totalValue, lowStock, outOfStock };
  }),
});
