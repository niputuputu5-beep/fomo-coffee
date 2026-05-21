import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  decimal,
  boolean,
  json,
  bigint,
  date,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ==================== USERS ====================
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["owner", "admin", "cashier"]).default("cashier").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== CATEGORIES ====================
export const categories = mysqlTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Category = typeof categories.$inferSelect;

// ==================== PRODUCTS ====================
export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  barcode: varchar("barcode", { length: 50 }),
  categoryId: bigint("categoryId", { mode: "number", unsigned: true }).notNull(),
  image: varchar("image", { length: 500 }),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).default("0.00").notNull(),
  memberPrice: decimal("memberPrice", { precision: 10, scale: 2 }),
  dineInPrice: decimal("dineInPrice", { precision: 10, scale: 2 }),
  takeawayPrice: decimal("takeawayPrice", { precision: 10, scale: 2 }),
  taxPercent: decimal("taxPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isBestSeller: boolean("isBestSeller").default(false).notNull(),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  isSeasonal: boolean("isSeasonal").default(false).notNull(),
  hasVariants: boolean("hasVariants").default(false).notNull(),
  sugarLevels: text("sugarLevels"),
  iceLevels: text("iceLevels"),
  extras: text("extras"),
  stockQuantity: int("stockQuantity").default(0).notNull(),
  minStock: int("minStock").default(5).notNull(),
  unit: varchar("unit", { length: 20 }).default("pcs").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;

// ==================== PRODUCT VARIANTS ====================
export const productVariants = mysqlTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  memberPrice: decimal("memberPrice", { precision: 10, scale: 2 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;

// ==================== PRODUCT RECIPES / BOM ====================
export const productRecipes = mysqlTable(
  "product_recipes",
  {
    id: serial("id").primaryKey(),
    productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
    inventoryId: bigint("inventoryId", { mode: "number", unsigned: true }).notNull(),
    inventoryName: varchar("inventoryName", { length: 255 }).notNull(),
    quantityUsed: decimal("quantityUsed", { precision: 10, scale: 3 }).default("1.000").notNull(),
    unit: varchar("unit", { length: 20 }).default("pcs").notNull(),
    wastePercent: decimal("wastePercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("product_recipes_product_inventory_unique").on(table.productId, table.inventoryId)],
);

export type ProductRecipe = typeof productRecipes.$inferSelect;

// ==================== PRODUCT ADD-ONS ====================
export const productAddons = mysqlTable("product_addons", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).default("0.00").notNull(),
  inventoryId: bigint("inventoryId", { mode: "number", unsigned: true }),
  inventoryName: varchar("inventoryName", { length: 255 }),
  quantityUsed: decimal("quantityUsed", { precision: 10, scale: 3 }).default("0.000").notNull(),
  unit: varchar("unit", { length: 20 }).default("pcs").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type ProductAddon = typeof productAddons.$inferSelect;

// ==================== CUSTOMERS ====================
export const customers = mysqlTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  email: varchar("email", { length: 320 }),
  birthDate: date("birthDate"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  membershipLevel: mysqlEnum("membershipLevel", ["bronze", "silver", "gold", "platinum"]).default("bronze").notNull(),
  loyaltyPoints: int("loyaltyPoints").default(0).notNull(),
  totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).default("0.00").notNull(),
  visitCount: int("visitCount").default(0).notNull(),
  lastVisit: timestamp("lastVisit"),
  notes: text("notes"),
  isBlacklisted: boolean("isBlacklisted").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Customer = typeof customers.$inferSelect;

// ==================== SHIFTS ====================
export const shifts = mysqlTable("shifts", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  userName: varchar("userName", { length: 255 }).notNull(),
  openingCash: decimal("openingCash", { precision: 10, scale: 2 }).notNull(),
  closingCash: decimal("closingCash", { precision: 10, scale: 2 }),
  cashSales: decimal("cashSales", { precision: 12, scale: 2 }).default("0.00").notNull(),
  cardSales: decimal("cardSales", { precision: 12, scale: 2 }).default("0.00").notNull(),
  qrisSales: decimal("qrisSales", { precision: 12, scale: 2 }).default("0.00").notNull(),
  ewalletSales: decimal("ewalletSales", { precision: 12, scale: 2 }).default("0.00").notNull(),
  transferSales: decimal("transferSales", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalSales: decimal("totalSales", { precision: 12, scale: 2 }).default("0.00").notNull(),
  cashIn: decimal("cashIn", { precision: 10, scale: 2 }).default("0.00").notNull(),
  cashOut: decimal("cashOut", { precision: 10, scale: 2 }).default("0.00").notNull(),
  cashDifference: decimal("cashDifference", { precision: 10, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;

// ==================== TRANSACTIONS ====================
export const transactions = mysqlTable("transactions", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  shiftId: bigint("shiftId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  userName: varchar("userName", { length: 255 }).notNull(),
  customerId: bigint("customerId", { mode: "number", unsigned: true }),
  customerName: varchar("customerName", { length: 255 }),
  orderType: mysqlEnum("orderType", ["dine_in", "takeaway", "delivery"]).default("dine_in").notNull(),
  tableNumber: varchar("tableNumber", { length: 10 }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  serviceCharge: decimal("serviceCharge", { precision: 10, scale: 2 }).default("0.00").notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalCogs: decimal("totalCogs", { precision: 12, scale: 2 }).default("0.00").notNull(),
  grossProfit: decimal("grossProfit", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "qris", "debit", "credit_card", "ewallet", "transfer_bank"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded", "void"]).default("paid").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "ready", "completed", "cancelled", "void"]).default("completed").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Transaction = typeof transactions.$inferSelect;

// ==================== TRANSACTION ITEMS ====================
export const transactionItems = mysqlTable("transaction_items", {
  id: serial("id").primaryKey(),
  transactionId: bigint("transactionId", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  variantName: varchar("variantName", { length: 50 }),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  cogsAmount: decimal("cogsAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  grossProfit: decimal("grossProfit", { precision: 10, scale: 2 }).default("0.00").notNull(),
  sugarLevel: varchar("sugarLevel", { length: 20 }),
  iceLevel: varchar("iceLevel", { length: 20 }),
  extras: text("extras"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TransactionItem = typeof transactionItems.$inferSelect;

// ==================== SUPPLIERS ====================
export const suppliers = mysqlTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  npwp: varchar("npwp", { length: 30 }),
  paymentTerms: varchar("paymentTerms", { length: 50 }),
  rating: decimal("rating", { precision: 3, scale: 1 }).default("0.0").notNull(),
  debt: decimal("debt", { precision: 12, scale: 2 }).default("0.00").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Supplier = typeof suppliers.$inferSelect;

// ==================== INVENTORY ====================
export const inventory = mysqlTable("inventory", {
  id: serial("id").primaryKey(),
  productId: bigint("productId", { mode: "number", unsigned: true }),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  unit: varchar("unit", { length: 20 }).default("pcs").notNull(),
  quantity: int("quantity").default(0).notNull(),
  minStock: int("minStock").default(5).notNull(),
  supplierId: bigint("supplierId", { mode: "number", unsigned: true }),
  location: varchar("location", { length: 100 }).default("Main Warehouse").notNull(),
  batchNumber: varchar("batchNumber", { length: 50 }),
  expiryDate: date("expiryDate"),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalValue: decimal("totalValue", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["normal", "low", "out_of_stock", "expired"]).default("normal").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Inventory = typeof inventory.$inferSelect;

// ==================== STOCK ADJUSTMENTS / OPNAME ====================
export const stockAdjustments = mysqlTable("stock_adjustments", {
  id: serial("id").primaryKey(),
  inventoryId: bigint("inventoryId", { mode: "number", unsigned: true }).notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["opname", "adjustment", "waste", "transfer"]).default("opname").notNull(),
  previousQuantity: int("previousQuantity").default(0).notNull(),
  actualQuantity: int("actualQuantity").default(0).notNull(),
  difference: int("difference").default(0).notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  valueDifference: decimal("valueDifference", { precision: 12, scale: 2 }).default("0.00").notNull(),
  reason: text("reason"),
  createdById: bigint("createdById", { mode: "number", unsigned: true }),
  createdByName: varchar("createdByName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockAdjustment = typeof stockAdjustments.$inferSelect;

// ==================== PROMOS ====================
export const promos = mysqlTable("promos", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique(),
  description: text("description"),
  type: mysqlEnum("type", ["percentage", "fixed_amount", "buy_x_get_y", "bundle", "happy_hour"]).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minPurchase: decimal("minPurchase", { precision: 10, scale: 2 }).default("0.00").notNull(),
  maxDiscount: decimal("maxDiscount", { precision: 10, scale: 2 }),
  applicableTo: mysqlEnum("applicableTo", ["all", "category", "product", "payment_method"]).default("all").notNull(),
  targetId: bigint("targetId", { mode: "number", unsigned: true }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  usageLimit: int("usageLimit"),
  usageCount: int("usageCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Promo = typeof promos.$inferSelect;

// ==================== MEMBERSHIP PROGRAMS ====================
export const membershipPrograms = mysqlTable("membership_programs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  level: mysqlEnum("level", ["silver", "gold", "platinum"]).notNull(),
  benefit: text("benefit"),
  pointMultiplier: decimal("pointMultiplier", { precision: 4, scale: 2 }).default("1.00").notNull(),
  minSpend: decimal("minSpend", { precision: 12, scale: 2 }).default("0.00").notNull(),
  validityDays: int("validityDays").default(365).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type MembershipProgram = typeof membershipPrograms.$inferSelect;

// ==================== PURCHASE ORDERS ====================
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: varchar("poNumber", { length: 50 }).notNull().unique(),
  supplierId: bigint("supplierId", { mode: "number", unsigned: true }),
  supplierName: varchar("supplierName", { length: 255 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "ordered", "received", "cancelled"]).default("draft").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partial", "paid"]).default("unpaid").notNull(),
  expectedDate: date("expectedDate"),
  notes: text("notes"),
  createdById: bigint("createdById", { mode: "number", unsigned: true }),
  createdByName: varchar("createdByName", { length: 255 }),
  approvedById: bigint("approvedById", { mode: "number", unsigned: true }),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// ==================== RECEIVING ====================
export const receivingRecords = mysqlTable("receiving_records", {
  id: serial("id").primaryKey(),
  receivingNumber: varchar("receivingNumber", { length: 50 }).notNull().unique(),
  purchaseOrderId: bigint("purchaseOrderId", { mode: "number", unsigned: true }),
  supplierName: varchar("supplierName", { length: 255 }).notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  batchNumber: varchar("batchNumber", { length: 50 }),
  quantityReceived: int("quantityReceived").default(0).notNull(),
  unit: varchar("unit", { length: 20 }).default("pcs").notNull(),
  status: mysqlEnum("status", ["draft", "checked", "posted"]).default("draft").notNull(),
  receivedById: bigint("receivedById", { mode: "number", unsigned: true }),
  receivedByName: varchar("receivedByName", { length: 255 }),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReceivingRecord = typeof receivingRecords.$inferSelect;

// ==================== APPROVAL REQUESTS ====================
export const approvalRequests = mysqlTable("approval_requests", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", ["void", "refund", "promo", "purchase_order"]).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: bigint("entityId", { mode: "number", unsigned: true }),
  requestedById: bigint("requestedById", { mode: "number", unsigned: true }),
  requestedByName: varchar("requestedByName", { length: 255 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reason: text("reason"),
  decidedById: bigint("decidedById", { mode: "number", unsigned: true }),
  decidedByName: varchar("decidedByName", { length: 255 }),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalRequest = typeof approvalRequests.$inferSelect;

// ==================== PASSWORD RESET REQUESTS ====================
export const passwordResetRequests = mysqlTable("password_reset_requests", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  username: varchar("username", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "rejected"]).default("pending").notNull(),
  requestedIp: varchar("requestedIp", { length: 45 }),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  decidedById: bigint("decidedById", { mode: "number", unsigned: true }),
  decidedByName: varchar("decidedByName", { length: 255 }),
  decidedAt: timestamp("decidedAt"),
});

export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;

// ==================== DEVICE SESSIONS ====================
export const deviceSessions = mysqlTable("device_sessions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  userName: varchar("userName", { length: 255 }),
  deviceName: varchar("deviceName", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["active", "expired", "revoked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeviceSession = typeof deviceSessions.$inferSelect;

// ==================== AUDIT LOGS ====================
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  userName: varchar("userName", { length: 255 }),
  userRole: varchar("userRole", { length: 20 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: bigint("entityId", { mode: "number", unsigned: true }),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
