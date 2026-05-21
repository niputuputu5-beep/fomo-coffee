import { getDb } from "../api/queries/connection";
import {
  users,
  categories,
  products,
  productVariants,
  productRecipes,
  productAddons,
  customers,
  suppliers,
  inventory,
  promos,
  membershipPrograms,
  purchaseOrders,
  receivingRecords,
} from "./schema";
import { hashPassword } from "../api/lib/password";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  await db
    .insert(users)
    .values([
      {
        username: "owner",
        passwordHash: hashPassword("owner123"),
        name: "Owner FOMO",
        email: "owner@fomo.coffee",
        role: "owner",
      },
      {
        username: "admin",
        passwordHash: hashPassword("admin123"),
        name: "Admin FOMO",
        email: "admin@fomo.coffee",
        role: "admin",
      },
      {
        username: "cashier",
        passwordHash: hashPassword("cashier123"),
        name: "Cashier FOMO",
        email: "cashier@fomo.coffee",
        role: "cashier",
      },
    ])
    .onDuplicateKeyUpdate({
      set: {
        updatedAt: new Date(),
      },
    });
  console.log("Users seeded");

  // Seed Categories
  await db.insert(categories).ignore().values([
    { name: "Espresso", slug: "espresso", description: "Rich, concentrated coffee", icon: "Coffee", sortOrder: 1 },
    { name: "Latte & Milk", slug: "latte-milk", description: "Creamy milk-based coffee", icon: "Milk", sortOrder: 2 },
    { name: "Pastry", slug: "pastry", description: "Fresh baked goods", icon: "Croissant", sortOrder: 3 },
    { name: "Seasonal", slug: "seasonal", description: "Limited time specials", icon: "Sparkles", sortOrder: 4 },
    { name: "Cold Brew", slug: "cold-brew", description: "Smooth cold coffee", icon: "Snowflake", sortOrder: 5 },
  ]);
  console.log("Categories seeded");

  // Seed Products
  await db.insert(products).ignore().values([
    {
      name: "Signature Cappuccino",
      description: "Rich espresso with steamed milk and velvety foam",
      sku: "ESP-001",
      barcode: "8990010001",
      categoryId: 1,
      image: "/products/cappuccino.jpg",
      basePrice: "38000",
      costPrice: "15000",
      memberPrice: "34000",
      dineInPrice: "38000",
      takeawayPrice: "36000",
      isBestSeller: true,
      isFavorite: true,
      hasVariants: true,
      sugarLevels: JSON.stringify(["0%", "25%", "50%", "75%", "100%"]),
      iceLevels: JSON.stringify(["Hot", "Less Ice", "Normal Ice"]),
      stockQuantity: 100,
      minStock: 10,
    },
    {
      name: "Caramel Latte",
      description: "Smooth espresso with caramel syrup and steamed milk",
      sku: "LAT-001",
      barcode: "8990010002",
      categoryId: 2,
      image: "/products/latte.jpg",
      basePrice: "42000",
      costPrice: "18000",
      memberPrice: "38000",
      dineInPrice: "42000",
      takeawayPrice: "40000",
      isBestSeller: true,
      hasVariants: true,
      sugarLevels: JSON.stringify(["0%", "25%", "50%", "75%", "100%"]),
      iceLevels: JSON.stringify(["Hot", "Less Ice", "Normal Ice"]),
      stockQuantity: 80,
      minStock: 10,
    },
    {
      name: "Matcha Green Tea Latte",
      description: "Premium Japanese matcha with steamed milk",
      sku: "LAT-002",
      barcode: "8990010003",
      categoryId: 2,
      image: "/products/matcha.jpg",
      basePrice: "45000",
      costPrice: "20000",
      memberPrice: "40000",
      dineInPrice: "45000",
      takeawayPrice: "43000",
      isBestSeller: false,
      hasVariants: true,
      sugarLevels: JSON.stringify(["0%", "25%", "50%", "75%", "100%"]),
      iceLevels: JSON.stringify(["Hot", "Less Ice", "Normal Ice"]),
      stockQuantity: 60,
      minStock: 8,
    },
    {
      name: "Butter Croissant",
      description: "Flaky, buttery French pastry baked fresh daily",
      sku: "PAS-001",
      barcode: "8990010004",
      categoryId: 3,
      image: "/products/croissant.jpg",
      basePrice: "25000",
      costPrice: "10000",
      memberPrice: "22000",
      dineInPrice: "25000",
      takeawayPrice: "25000",
      isBestSeller: true,
      isFavorite: true,
      hasVariants: false,
      stockQuantity: 40,
      minStock: 5,
    },
    {
      name: "Chocolate Mocha",
      description: "Espresso with rich chocolate and whipped cream",
      sku: "ESP-002",
      barcode: "8990010005",
      categoryId: 1,
      image: "/products/mocha.jpg",
      basePrice: "45000",
      costPrice: "19000",
      memberPrice: "40000",
      dineInPrice: "45000",
      takeawayPrice: "43000",
      isBestSeller: false,
      isSeasonal: true,
      hasVariants: true,
      sugarLevels: JSON.stringify(["0%", "25%", "50%", "75%", "100%"]),
      iceLevels: JSON.stringify(["Hot", "Less Ice", "Normal Ice"]),
      stockQuantity: 50,
      minStock: 8,
    },
    {
      name: "Double Espresso",
      description: "Intense double shot of pure espresso",
      sku: "ESP-003",
      barcode: "8990010006",
      categoryId: 1,
      image: "/products/espresso.jpg",
      basePrice: "28000",
      costPrice: "10000",
      memberPrice: "25000",
      dineInPrice: "28000",
      takeawayPrice: "28000",
      isBestSeller: false,
      hasVariants: false,
      sugarLevels: JSON.stringify(["0%", "50%", "100%"]),
      stockQuantity: 120,
      minStock: 15,
    },
    {
      name: "Vanilla Latte",
      description: "Espresso with vanilla syrup and creamy milk",
      sku: "LAT-003",
      barcode: "8990010007",
      categoryId: 2,
      image: "/products/latte.jpg",
      basePrice: "40000",
      costPrice: "17000",
      memberPrice: "36000",
      hasVariants: true,
      sugarLevels: JSON.stringify(["0%", "25%", "50%", "75%", "100%"]),
      iceLevels: JSON.stringify(["Hot", "Less Ice", "Normal Ice"]),
      stockQuantity: 70,
      minStock: 10,
    },
    {
      name: "Hazelnut Cold Brew",
      description: "Smooth cold brew with hazelnut flavor",
      sku: "CB-001",
      barcode: "8990010008",
      categoryId: 5,
      image: "/products/latte.jpg",
      basePrice: "38000",
      costPrice: "15000",
      memberPrice: "34000",
      isSeasonal: true,
      hasVariants: true,
      sugarLevels: JSON.stringify(["0%", "25%", "50%", "100%"]),
      iceLevels: JSON.stringify(["Less Ice", "Normal Ice", "Extra Ice"]),
      stockQuantity: 45,
      minStock: 8,
    },
  ]);
  console.log("Products seeded");

  // Seed Product Variants
  await db.insert(productVariants).ignore().values([
    { productId: 1, name: "Small", sku: "ESP-001-S", price: "34000", memberPrice: "30000" },
    { productId: 1, name: "Medium", sku: "ESP-001-M", price: "38000", memberPrice: "34000" },
    { productId: 1, name: "Large", sku: "ESP-001-L", price: "42000", memberPrice: "38000" },
    { productId: 2, name: "Small", sku: "LAT-001-S", price: "38000", memberPrice: "34000" },
    { productId: 2, name: "Medium", sku: "LAT-001-M", price: "42000", memberPrice: "38000" },
    { productId: 2, name: "Large", sku: "LAT-001-L", price: "46000", memberPrice: "42000" },
    { productId: 3, name: "Small", sku: "LAT-002-S", price: "41000", memberPrice: "36000" },
    { productId: 3, name: "Medium", sku: "LAT-002-M", price: "45000", memberPrice: "40000" },
    { productId: 3, name: "Large", sku: "LAT-002-L", price: "49000", memberPrice: "44000" },
    { productId: 5, name: "Small", sku: "ESP-002-S", price: "41000", memberPrice: "36000" },
    { productId: 5, name: "Medium", sku: "ESP-002-M", price: "45000", memberPrice: "40000" },
    { productId: 5, name: "Large", sku: "ESP-002-L", price: "49000", memberPrice: "44000" },
    { productId: 7, name: "Small", sku: "LAT-003-S", price: "36000", memberPrice: "32000" },
    { productId: 7, name: "Medium", sku: "LAT-003-M", price: "40000", memberPrice: "36000" },
    { productId: 7, name: "Large", sku: "LAT-003-L", price: "44000", memberPrice: "40000" },
    { productId: 8, name: "Regular", sku: "CB-001-R", price: "38000", memberPrice: "34000" },
    { productId: 8, name: "Large", sku: "CB-001-L", price: "44000", memberPrice: "40000" },
  ]);
  console.log("Product variants seeded");

  // Seed Customers
  await db.insert(customers).ignore().values([
    { name: "Budi Santoso", phone: "081234567890", email: "budi@email.com", membershipLevel: "gold", loyaltyPoints: 1250, totalSpent: "2850000", visitCount: 45, gender: "male" },
    { name: "Dewi Kusuma", phone: "081234567891", email: "dewi@email.com", membershipLevel: "platinum", loyaltyPoints: 3200, totalSpent: "7200000", visitCount: 98, gender: "female" },
    { name: "Ahmad Rizki", phone: "081234567892", email: "ahmad@email.com", membershipLevel: "silver", loyaltyPoints: 480, totalSpent: "980000", visitCount: 22, gender: "male" },
    { name: "Siti Rahayu", phone: "081234567893", email: "siti@email.com", membershipLevel: "bronze", loyaltyPoints: 120, totalSpent: "350000", visitCount: 8, gender: "female" },
    { name: "Rudi Hartono", phone: "081234567894", email: "rudi@email.com", membershipLevel: "gold", loyaltyPoints: 2100, totalSpent: "4200000", visitCount: 67, gender: "male" },
    { name: "Maya Wijaya", phone: "081234567895", email: "maya@email.com", membershipLevel: "silver", loyaltyPoints: 650, totalSpent: "1400000", visitCount: 28, gender: "female" },
    { name: "Andi Pratama", phone: "081234567896", membershipLevel: "bronze", loyaltyPoints: 50, totalSpent: "180000", visitCount: 4, gender: "male" },
    { name: "Lina Susanti", phone: "081234567897", email: "lina@email.com", membershipLevel: "platinum", loyaltyPoints: 4500, totalSpent: "9800000", visitCount: 132, gender: "female" },
  ]);
  console.log("Customers seeded");

  // Seed Suppliers
  await db.insert(suppliers).ignore().values([
    { name: "PT. Kopi Nusantara", contactPerson: "Pak Agus", phone: "021-5550101", email: "agus@kopinusantara.co.id", address: "Jl. Kopi No. 123, Jakarta", paymentTerms: "Net 30", rating: "4.5" },
    { name: "CV. Susu Segar", contactPerson: "Ibu Rini", phone: "021-5550202", email: "rini@sususegar.co.id", address: "Jl. Dairy No. 45, Bogor", paymentTerms: "Net 15", rating: "4.8" },
    { name: "PT. Roti Enak", contactPerson: "Pak Dedi", phone: "021-5550303", email: "dedi@rotienak.co.id", address: "Jl. Bakery No. 78, Tangerang", paymentTerms: "Net 7", rating: "4.2" },
    { name: "Matcha Supplier Indo", contactPerson: "Ibu Yuki", phone: "021-5550404", email: "yuki@matchaid.com", address: "Jl. Teh Hijau No. 15, Jakarta", paymentTerms: "Net 30", rating: "4.7" },
  ]);
  console.log("Suppliers seeded");

  // Seed Inventory
  await db.insert(inventory).ignore().values([
    { itemName: "Arabica Coffee Beans (1kg)", sku: "INV-001", unit: "kg", quantity: 50, minStock: 10, supplierId: 1, unitCost: "85000", totalValue: "4250000", location: "Main Warehouse" },
    { itemName: "Robusta Coffee Beans (1kg)", sku: "INV-002", unit: "kg", quantity: 30, minStock: 8, supplierId: 1, unitCost: "65000", totalValue: "1950000", location: "Main Warehouse" },
    { itemName: "Fresh Milk (1L)", sku: "INV-003", unit: "liter", quantity: 100, minStock: 20, supplierId: 2, unitCost: "18000", totalValue: "1800000", location: "Cold Storage" },
    { itemName: "Butter (500g)", sku: "INV-004", unit: "pack", quantity: 40, minStock: 10, supplierId: 2, unitCost: "35000", totalValue: "1400000", location: "Cold Storage" },
    { itemName: "Premium Matcha Powder (100g)", sku: "INV-005", unit: "pack", quantity: 25, minStock: 5, supplierId: 4, unitCost: "125000", totalValue: "3125000", location: "Main Warehouse" },
    { itemName: "Pastry Flour (5kg)", sku: "INV-006", unit: "pack", quantity: 20, minStock: 5, supplierId: 3, unitCost: "45000", totalValue: "900000", location: "Main Warehouse" },
    { itemName: "Chocolate Syrup (750ml)", sku: "INV-007", unit: "bottle", quantity: 35, minStock: 8, supplierId: 2, unitCost: "52000", totalValue: "1820000", location: "Main Warehouse" },
    { itemName: "Caramel Syrup (750ml)", sku: "INV-008", unit: "bottle", quantity: 28, minStock: 8, supplierId: 2, unitCost: "48000", totalValue: "1344000", location: "Main Warehouse" },
    { itemName: "Vanilla Syrup (750ml)", sku: "INV-009", unit: "bottle", quantity: 22, minStock: 6, supplierId: 2, unitCost: "46000", totalValue: "1012000", location: "Main Warehouse" },
    { itemName: "Cups (12oz)", sku: "INV-010", unit: "sleeve", quantity: 200, minStock: 50, supplierId: 3, unitCost: "35000", totalValue: "7000000", location: "Storage A" },
    { itemName: "Espresso Shot Add-on", sku: "INV-011", unit: "shot", quantity: 300, minStock: 60, supplierId: 1, unitCost: "4500", totalValue: "1350000", location: "Bar Station" },
    { itemName: "Ice Cube Food Grade", sku: "INV-012", unit: "portion", quantity: 500, minStock: 100, supplierId: 2, unitCost: "500", totalValue: "250000", location: "Cold Storage" },
    { itemName: "Whipped Cream", sku: "INV-013", unit: "portion", quantity: 120, minStock: 25, supplierId: 2, unitCost: "2500", totalValue: "300000", location: "Cold Storage" },
    { itemName: "Extra Sauce Portion", sku: "INV-014", unit: "portion", quantity: 180, minStock: 40, supplierId: 2, unitCost: "1800", totalValue: "324000", location: "Bar Station" },
  ]);
  console.log("Inventory seeded");

  await db.insert(productAddons).ignore().values([
    { name: "Extra Espresso Shot", sku: "ADD-COFFEE-SHOT", description: "Tambahan 1 shot espresso", price: "7000", costPrice: "0", inventoryId: 11, inventoryName: "Espresso Shot Add-on", quantityUsed: "1.000", unit: "shot", sortOrder: 1 },
    { name: "Extra Ice", sku: "ADD-ICE", description: "Tambahan es batu", price: "2000", costPrice: "0", inventoryId: 12, inventoryName: "Ice Cube Food Grade", quantityUsed: "1.000", unit: "portion", sortOrder: 2 },
    { name: "Less Ice", sku: "ADD-LESS-ICE", description: "Es dikurangi tanpa biaya", price: "0", costPrice: "0", inventoryId: 12, inventoryName: "Ice Cube Food Grade", quantityUsed: "0.500", unit: "portion", sortOrder: 3 },
    { name: "Whipped Cream", sku: "ADD-WHIPPED-CREAM", description: "Tambahan whipped cream", price: "6000", costPrice: "0", inventoryId: 13, inventoryName: "Whipped Cream", quantityUsed: "1.000", unit: "portion", sortOrder: 4 },
    { name: "Caramel Sauce", sku: "ADD-CARAMEL-SAUCE", description: "Tambahan saus caramel", price: "5000", costPrice: "0", inventoryId: 14, inventoryName: "Extra Sauce Portion", quantityUsed: "1.000", unit: "portion", sortOrder: 5 },
    { name: "Chocolate Sauce", sku: "ADD-CHOC-SAUCE", description: "Tambahan saus cokelat", price: "5000", costPrice: "0", inventoryId: 14, inventoryName: "Extra Sauce Portion", quantityUsed: "1.000", unit: "portion", sortOrder: 6 },
  ]);
  console.log("Product add-ons seeded");

  await db.insert(productRecipes).ignore().values([
    { productId: 1, inventoryId: 1, inventoryName: "Arabica Coffee Beans (1kg)", quantityUsed: "0.020", unit: "kg", wastePercent: "3.00" },
    { productId: 1, inventoryId: 3, inventoryName: "Fresh Milk (1L)", quantityUsed: "0.180", unit: "liter", wastePercent: "2.00" },
    { productId: 2, inventoryId: 1, inventoryName: "Arabica Coffee Beans (1kg)", quantityUsed: "0.020", unit: "kg", wastePercent: "3.00" },
    { productId: 2, inventoryId: 3, inventoryName: "Fresh Milk (1L)", quantityUsed: "0.220", unit: "liter", wastePercent: "2.00" },
    { productId: 2, inventoryId: 8, inventoryName: "Caramel Syrup (750ml)", quantityUsed: "0.030", unit: "bottle", wastePercent: "1.00" },
    { productId: 3, inventoryId: 5, inventoryName: "Premium Matcha Powder (100g)", quantityUsed: "0.080", unit: "pack", wastePercent: "2.00" },
    { productId: 3, inventoryId: 3, inventoryName: "Fresh Milk (1L)", quantityUsed: "0.220", unit: "liter", wastePercent: "2.00" },
    { productId: 4, inventoryId: 4, inventoryName: "Butter (500g)", quantityUsed: "0.080", unit: "pack", wastePercent: "4.00" },
    { productId: 4, inventoryId: 6, inventoryName: "Pastry Flour (5kg)", quantityUsed: "0.050", unit: "pack", wastePercent: "4.00" },
    { productId: 5, inventoryId: 1, inventoryName: "Arabica Coffee Beans (1kg)", quantityUsed: "0.020", unit: "kg", wastePercent: "3.00" },
    { productId: 5, inventoryId: 7, inventoryName: "Chocolate Syrup (750ml)", quantityUsed: "0.030", unit: "bottle", wastePercent: "1.00" },
    { productId: 6, inventoryId: 1, inventoryName: "Arabica Coffee Beans (1kg)", quantityUsed: "0.018", unit: "kg", wastePercent: "3.00" },
    { productId: 7, inventoryId: 1, inventoryName: "Arabica Coffee Beans (1kg)", quantityUsed: "0.020", unit: "kg", wastePercent: "3.00" },
    { productId: 7, inventoryId: 3, inventoryName: "Fresh Milk (1L)", quantityUsed: "0.220", unit: "liter", wastePercent: "2.00" },
    { productId: 7, inventoryId: 9, inventoryName: "Vanilla Syrup (750ml)", quantityUsed: "0.030", unit: "bottle", wastePercent: "1.00" },
    { productId: 8, inventoryId: 1, inventoryName: "Arabica Coffee Beans (1kg)", quantityUsed: "0.030", unit: "kg", wastePercent: "3.00" },
  ]);
  console.log("Product recipes seeded");

  // Seed Promos
  await db.insert(promos).ignore().values([
    { name: "New Member Discount", code: "NEWMEMBER", description: "20% off for new members", type: "percentage", value: "20", minPurchase: "50000", maxDiscount: "30000", applicableTo: "all", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), usageLimit: 1000 },
    { name: "Happy Hour (2-5PM)", code: "HAPPYHOUR", description: "Buy 1 Get 1 Free during happy hour", type: "buy_x_get_y", value: "100", minPurchase: "35000", applicableTo: "all", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), usageLimit: 500 },
    { name: "Weekend Special", code: "WEEKEND", description: "15% off all pastries on weekends", type: "percentage", value: "15", applicableTo: "category", targetId: 3, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), usageLimit: 2000 },
    { name: "Cashback Rp10.000", code: "CASHBACK10", description: "Rp10.000 cashback for min purchase Rp100.000", type: "fixed_amount", value: "10000", minPurchase: "100000", applicableTo: "all", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), usageLimit: 300 },
  ]);
  console.log("Promos seeded");

  await db.insert(membershipPrograms).ignore().values([
    { name: "Silver Rewards", level: "silver", benefit: "Point 1x dan voucher birthday", pointMultiplier: "1.00", minSpend: "500000", validityDays: 365 },
    { name: "Gold Member", level: "gold", benefit: "Diskon 10%, point 1.5x, birthday voucher", pointMultiplier: "1.50", minSpend: "2500000", validityDays: 365 },
    { name: "Platinum Circle", level: "platinum", benefit: "Diskon 15%, point 2x, priority support", pointMultiplier: "2.00", minSpend: "6000000", validityDays: 365 },
  ]);
  console.log("Membership programs seeded");

  await db.insert(purchaseOrders).ignore().values([
    { poNumber: "PO-DEMO-001", supplierId: 1, supplierName: "PT. Kopi Nusantara", totalAmount: "4250000", status: "approved", paymentStatus: "unpaid", expectedDate: new Date("2026-05-25"), createdById: 2, createdByName: "Admin FOMO", approvedById: 1, approvedAt: new Date("2026-05-18") },
    { poNumber: "PO-DEMO-002", supplierId: 2, supplierName: "CV. Susu Segar", totalAmount: "1800000", status: "pending_approval", paymentStatus: "unpaid", expectedDate: new Date("2026-05-24"), createdById: 2, createdByName: "Admin FOMO" },
  ]);
  console.log("Purchase orders seeded");

  await db.insert(receivingRecords).ignore().values([
    { receivingNumber: "RCV-DEMO-001", purchaseOrderId: 1, supplierName: "PT. Kopi Nusantara", itemName: "Arabica Coffee Beans (1kg)", batchNumber: "BATCH-AR-0526", quantityReceived: 20, unit: "kg", status: "posted", receivedById: 2, receivedByName: "Admin FOMO" },
  ]);
  console.log("Receiving records seeded");

  console.log("Seed complete!");
}

seed().catch(console.error);
