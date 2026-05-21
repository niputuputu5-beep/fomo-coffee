import { authRouter } from "./auth-router";
import { categoryRouter } from "./category-router";
import { productRouter } from "./product-router";
import { customerRouter } from "./customer-router";
import { transactionRouter } from "./transaction-router";
import { shiftRouter } from "./shift-router";
import { supplierRouter } from "./supplier-router";
import { inventoryRouter } from "./inventory-router";
import { promoRouter } from "./promo-router";
import { auditRouter } from "./audit-router";
import { reportRouter } from "./report-router";
import { userRouter } from "./user-router";
import { membershipRouter } from "./membership-router";
import { purchaseRouter } from "./purchase-router";
import { receivingRouter } from "./receiving-router";
import { approvalRouter } from "./approval-router";
import { deviceRouter } from "./device-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  category: categoryRouter,
  product: productRouter,
  customer: customerRouter,
  transaction: transactionRouter,
  shift: shiftRouter,
  supplier: supplierRouter,
  inventory: inventoryRouter,
  promo: promoRouter,
  audit: auditRouter,
  report: reportRouter,
  user: userRouter,
  membership: membershipRouter,
  purchase: purchaseRouter,
  receiving: receivingRouter,
  approval: approvalRouter,
  device: deviceRouter,
});

export type AppRouter = typeof appRouter;
