import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  Search,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Receipt,
  Coffee,
  Croissant,
  Milk,
  Snowflake,
  Sparkles,
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  ArrowRightLeft,
  Percent,
  Printer,
  WalletCards,
  WifiOff,
  MessageCircle,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const categoryIcons: Record<string, React.ReactNode> = {
  Espresso: <Coffee size={14} />,
  "Latte & Milk": <Milk size={14} />,
  Pastry: <Croissant size={14} />,
  Seasonal: <Sparkles size={14} />,
  "Cold Brew": <Snowflake size={14} />,
};

interface CartItem {
  productId: number;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  sugarLevel: string;
  iceLevel: string;
  addons: { addonId: number; name: string; price: number; quantity: number }[];
  image: string;
}

interface ReceiptData {
  id?: number;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  orderType: "dine_in" | "takeaway" | "delivery";
  tableNumber?: string;
  paymentMethod: "cash" | "qris" | "debit" | "credit_card" | "ewallet" | "transfer_bank";
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  discount: number;
  roundingAmount: number;
  total: number;
  cashReceived: number;
  changeAmount: number;
  notes?: string;
  createdAt: Date;
  items: CartItem[];
}

interface PosProduct {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  basePrice: string;
  dineInPrice: string | null;
  takeawayPrice: string | null;
  sugarLevels: string | null;
  iceLevels: string | null;
  isBestSeller: boolean;
}

type TransactionPayload = {
  customerId?: number;
  customerName?: string;
  orderType: "dine_in" | "takeaway" | "delivery";
  tableNumber?: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  serviceCharge: string;
  totalAmount: string;
  paymentMethod: "cash" | "qris" | "debit" | "credit_card" | "ewallet" | "transfer_bank";
  promoCode?: string;
  notes?: string;
  items: Array<{
    productId: number;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    sugarLevel: string;
    iceLevel: string;
    addons: Array<{ addonId: number; name: string; price: string; quantity: number }>;
  }>;
};

type QueuedTransaction = TransactionPayload & { queuedAt: string };

const parseOptionList = (value?: string | null, fallback: string[] = []) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed.length > 0 ? parsed : fallback;
    }
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return fallback;
};

const paymentLabels: Record<ReceiptData["paymentMethod"], string> = {
  cash: "Cash",
  qris: "QRIS",
  debit: "Debit",
  credit_card: "Credit",
  ewallet: "E-Wallet",
  transfer_bank: "Transfer",
};

const orderTypeLabels: Record<ReceiptData["orderType"], string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export default function PosPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "debit" | "credit_card" | "ewallet" | "transfer_bank">("cash");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string | null; type: string; value: string; maxDiscount: string | null } | null>(null);
  const [notes, setNotes] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [roundingEnabled, setRoundingEnabled] = useState(true);
  const [customProduct, setCustomProduct] = useState<PosProduct | null>(null);
  const [customizingCartIndex, setCustomizingCartIndex] = useState<number | null>(null);
  const [draftSugarLevel, setDraftSugarLevel] = useState("50%");
  const [draftIceLevel, setDraftIceLevel] = useState("Normal Ice");
  const [draftAddons, setDraftAddons] = useState<Record<number, number>>({});
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [heldOrders, setHeldOrders] = useState<Array<{ id: string; label: string; cart: CartItem[]; customer: typeof selectedCustomer; orderType: typeof orderType; tableNumber: string; notes: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem("fomo-held-orders") || "[]");
    } catch {
      return [];
    }
  });
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const { data: categories } = trpc.category.list.useQuery();
  const { data: products, isLoading: isProductsLoading } = trpc.product.list.useQuery(
    selectedCategory ? { categoryId: selectedCategory, availableOnly: true } : searchQuery ? { search: searchQuery, availableOnly: true } : { availableOnly: true }
  );
  const { data: addons } = trpc.product.listAddons.useQuery();
  const { data: customers } = trpc.customer.list.useQuery();
  const { data: openShift } = trpc.shift.getOpenShift.useQuery(undefined, {
    enabled: !!user,
  });
  const utils = trpc.useUtils();
  const openQuickShift = trpc.shift.open.useMutation({
    onSuccess: async (result) => {
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      await utils.shift.getOpenShift.invalidate();
      toast.success("Shift cepat dibuka. Complete Order sudah bisa digunakan.");
    },
    onError: (error) => toast.error(error.message),
  });
  const promoLookup = trpc.promo.getByCode.useQuery(
    { code: promoCode },
    { enabled: false, retry: false },
  );
  const createTransaction = trpc.transaction.create.useMutation({
    onSuccess: (result) => {
      toast.success("Transaksi berhasil!");
      setReceiptData((current) => current ? { ...current, id: result.id, orderNumber: result.orderNumber } : current);
      setCart([]);
      setSelectedCustomer(null);
      setPromoCode("");
      setAppliedPromo(null);
      setNotes("");
      setCashReceived("");
    },
    onError: (err) => {
      setReceiptData(null);
      toast.error(err.message);
    },
  });
  const syncTransaction = trpc.transaction.create.useMutation();

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxRate = 0.11;
  const serviceCharge = serviceEnabled ? subtotal * 0.05 : 0;
  const taxableAmount = subtotal + serviceCharge;
  const taxAmount = taxableAmount * taxRate;
  const discount = appliedPromo
    ? appliedPromo.type === "percentage"
      ? Math.min(subtotal * (Number(appliedPromo.value) / 100), Number(appliedPromo.maxDiscount || subtotal))
      : Number(appliedPromo.value)
    : 0;
  const rawTotal = taxableAmount + taxAmount - discount;
  const roundingAmount = roundingEnabled ? Math.round(rawTotal / 100) * 100 - rawTotal : 0;
  const total = rawTotal + roundingAmount;
  const changeAmount = paymentMethod === "cash" ? Number(cashReceived || 0) - total : 0;
  const activeAddons = addons || [];
  const sugarOptions = parseOptionList(customProduct?.sugarLevels, ["0%", "25%", "50%", "75%", "100%"]);
  const iceOptions = parseOptionList(customProduct?.iceLevels, ["Hot", "Less Ice", "Normal Ice", "Extra Ice"]);
  const customBasePrice = customProduct
    ? Number(orderType === "dine_in" && customProduct.dineInPrice
      ? customProduct.dineInPrice
      : orderType === "takeaway" && customProduct.takeawayPrice
        ? customProduct.takeawayPrice
        : customProduct.basePrice)
    : 0;
  const selectedAddonItems = activeAddons
    .map((addon) => ({
      addonId: addon.id,
      name: addon.name,
      price: Number(addon.price),
      quantity: draftAddons[addon.id] || 0,
    }))
    .filter((addon) => addon.quantity > 0);
  const customAddonTotal = selectedAddonItems.reduce((sum, addon) => sum + addon.price * addon.quantity, 0);
  const customItemTotal = customBasePrice + customAddonTotal;

  const openProductCustomizer = (product: PosProduct, cartIndex: number | null = null) => {
    const existing = cartIndex !== null ? cart[cartIndex] : null;
    const sugar = existing?.sugarLevel || parseOptionList(product.sugarLevels, ["50%"])[0] || "50%";
    const ice = existing?.iceLevel || parseOptionList(product.iceLevels, ["Normal Ice"])[0] || "Normal Ice";
    setCustomProduct(product);
    setCustomizingCartIndex(cartIndex);
    setDraftSugarLevel(sugar);
    setDraftIceLevel(ice);
    setDraftAddons(Object.fromEntries((existing?.addons || []).map((addon) => [addon.addonId, addon.quantity])));
  };

  const closeProductCustomizer = () => {
    setCustomProduct(null);
    setCustomizingCartIndex(null);
    setDraftAddons({});
  };

  const setAddonQuantity = (addonId: number, delta: number) => {
    setDraftAddons((current) => {
      const nextQty = Math.max(0, (current[addonId] || 0) + delta);
      const next = { ...current };
      if (nextQty === 0) delete next[addonId];
      else next[addonId] = nextQty;
      return next;
    });
  };

  const addToCart = () => {
    if (!customProduct) return;
    const nextItem: CartItem = {
      productId: customProduct.id,
      productName: customProduct.name,
      variantName: "Medium",
      unitPrice: customBasePrice,
      quantity: customizingCartIndex !== null ? cart[customizingCartIndex]?.quantity || 1 : 1,
      subtotal: 0,
      sugarLevel: draftSugarLevel,
      iceLevel: draftIceLevel,
      addons: selectedAddonItems,
      image: customProduct.image || "",
    };
    const recalculated = recalculateItem(nextItem);

    if (customizingCartIndex !== null) {
      setCart(cart.map((item, index) => (index === customizingCartIndex ? recalculated : item)));
    } else {
      const existingIndex = cart.findIndex((item) =>
        item.productId === recalculated.productId &&
        item.variantName === recalculated.variantName &&
        item.sugarLevel === recalculated.sugarLevel &&
        item.iceLevel === recalculated.iceLevel &&
        JSON.stringify(item.addons) === JSON.stringify(recalculated.addons)
      );
      if (existingIndex >= 0) {
        setCart(cart.map((item, index) => index === existingIndex ? recalculateItem({ ...item, quantity: item.quantity + 1 }) : item));
      } else {
        setCart([...cart, recalculated]);
      }
    }
    closeProductCustomizer();
  };

  const getAddonTotal = (item: CartItem) => item.addons.reduce((sum, addon) => sum + addon.price * addon.quantity, 0) * item.quantity;

  const recalculateItem = (item: CartItem) => ({
    ...item,
    subtotal: (item.unitPrice * item.quantity) + getAddonTotal(item),
  });

  const updateQty = (index: number, delta: number) => {
    setCart(cart.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return recalculateItem({ ...item, quantity: newQty });
    }));
  };

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
  };

  const buildReceiptText = (receipt: ReceiptData) => {
    const lines = [
      "FOMO COFFEE",
      receipt.orderNumber,
      receipt.createdAt.toLocaleString("id-ID"),
      `Customer: ${receipt.customerName || "Walk-in"}`,
      `Kasir: ${receipt.cashierName || "-"}`,
      `Tipe: ${orderTypeLabels[receipt.orderType]}${receipt.tableNumber ? ` / Meja ${receipt.tableNumber}` : ""}`,
      "",
      ...receipt.items.flatMap((item) => [
        `${item.quantity}x ${item.productName}`,
        `   ${item.sugarLevel} | ${item.iceLevel}`,
        ...item.addons.map((addon) => `   + ${addon.name}${addon.quantity > 1 ? ` x${addon.quantity}` : ""} ${formatPrice(addon.price * addon.quantity * item.quantity)}`),
        `   ${formatPrice(item.subtotal)}`,
      ]),
      "",
      `Subtotal: ${formatPrice(receipt.subtotal)}`,
      `PPN: ${formatPrice(receipt.taxAmount)}`,
      receipt.serviceCharge > 0 ? `Service: ${formatPrice(receipt.serviceCharge)}` : "",
      receipt.discount > 0 ? `Diskon: -${formatPrice(receipt.discount)}` : "",
      receipt.roundingAmount !== 0 ? `Rounding: ${formatPrice(receipt.roundingAmount)}` : "",
      `TOTAL: ${formatPrice(receipt.total)}`,
      `Bayar: ${paymentLabels[receipt.paymentMethod]}`,
      receipt.paymentMethod === "cash" ? `Uang diterima: ${formatPrice(receipt.cashReceived)}` : "",
      receipt.paymentMethod === "cash" ? `Kembali: ${formatPrice(Math.max(receipt.changeAmount, 0))}` : "",
      "",
      "Terima kasih sudah berkunjung ke FOMO COFFEE.",
    ];
    return lines.filter(Boolean).join("\n");
  };

  const printReceipt = (receipt: ReceiptData) => {
    const receiptHtml = `
      <html>
        <head>
          <title>Struk ${receipt.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; color: #111; }
            .receipt { width: 280px; padding: 16px; }
            h1 { font-size: 18px; margin: 0; text-align: center; letter-spacing: 1px; }
            .center { text-align: center; }
            .muted { color: #555; font-size: 11px; }
            .line { border-top: 1px dashed #999; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin: 4px 0; }
            .item { font-size: 12px; margin: 8px 0; }
            .addon { color: #555; font-size: 11px; padding-left: 8px; }
            .total { font-weight: 700; font-size: 15px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>FOMO COFFEE</h1>
            <p class="center muted">${receipt.orderNumber}<br/>${receipt.createdAt.toLocaleString("id-ID")}</p>
            <div class="line"></div>
            <div class="row"><span>Customer</span><strong>${receipt.customerName || "Walk-in"}</strong></div>
            <div class="row"><span>Kasir</span><strong>${receipt.cashierName || "-"}</strong></div>
            <div class="row"><span>Tipe</span><strong>${orderTypeLabels[receipt.orderType]}${receipt.tableNumber ? ` / ${receipt.tableNumber}` : ""}</strong></div>
            <div class="line"></div>
            ${receipt.items.map((item) => `
              <div class="item">
                <div class="row"><strong>${item.quantity}x ${item.productName}</strong><strong>${formatPrice(item.subtotal)}</strong></div>
                <div class="addon">${item.sugarLevel} | ${item.iceLevel}</div>
                ${item.addons.map((addon) => `<div class="addon">+ ${addon.name}${addon.quantity > 1 ? ` x${addon.quantity}` : ""} (${formatPrice(addon.price * addon.quantity * item.quantity)})</div>`).join("")}
              </div>
            `).join("")}
            <div class="line"></div>
            <div class="row"><span>Subtotal</span><span>${formatPrice(receipt.subtotal)}</span></div>
            <div class="row"><span>PPN</span><span>${formatPrice(receipt.taxAmount)}</span></div>
            ${receipt.serviceCharge > 0 ? `<div class="row"><span>Service</span><span>${formatPrice(receipt.serviceCharge)}</span></div>` : ""}
            ${receipt.discount > 0 ? `<div class="row"><span>Diskon</span><span>-${formatPrice(receipt.discount)}</span></div>` : ""}
            ${receipt.roundingAmount !== 0 ? `<div class="row"><span>Rounding</span><span>${formatPrice(receipt.roundingAmount)}</span></div>` : ""}
            <div class="row total"><span>Total</span><span>${formatPrice(receipt.total)}</span></div>
            <div class="row"><span>Bayar</span><span>${paymentLabels[receipt.paymentMethod]}</span></div>
            ${receipt.paymentMethod === "cash" ? `<div class="row"><span>Uang diterima</span><span>${formatPrice(receipt.cashReceived)}</span></div>` : ""}
            ${receipt.paymentMethod === "cash" ? `<div class="row"><span>Kembali</span><span>${formatPrice(Math.max(receipt.changeAmount, 0))}</span></div>` : ""}
            <div class="line"></div>
            <p class="center muted">Terima kasih sudah berkunjung ke FOMO COFFEE.</p>
          </div>
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=360,height=640");
    if (!printWindow) {
      toast.error("Popup print diblokir browser.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const sendReceiptToWhatsApp = (receipt: ReceiptData) => {
    const phone = receipt.customerPhone?.replace(/\D/g, "").replace(/^0/, "62") || "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildReceiptText(receipt))}`;
    window.open(url, "_blank");
  };

  const handleCompleteOrder = () => {
    if (cart.length === 0) {
      toast.error("Keranjang masih kosong!");
      return;
    }
    if (!user) {
      toast.error("Login diperlukan!");
      return;
    }
    if (!openShift) {
      toast.error("Buka shift kasir terlebih dahulu, atau gunakan tombol Buka Shift Cepat.");
      return;
    }
    if (paymentMethod === "cash" && Number(cashReceived || 0) < total) {
      toast.error("Uang diterima belum cukup untuk pembayaran cash.");
      return;
    }

    const selectedCustomerRecord = selectedCustomer ? customers?.find((customer) => customer.id === selectedCustomer.id) : null;
    const receiptSnapshot: ReceiptData = {
      orderNumber: "Memproses...",
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomerRecord?.phone || undefined,
      cashierName: user.name || user.username,
      orderType,
      tableNumber: tableNumber || undefined,
      paymentMethod,
      subtotal,
      taxAmount,
      serviceCharge,
      discount,
      roundingAmount,
      total,
      cashReceived: Number(cashReceived || 0),
      changeAmount,
      notes: notes || undefined,
      createdAt: new Date(),
      items: cart.map((item) => ({ ...item, addons: item.addons.map((addon) => ({ ...addon })) })),
    };

    const payload: TransactionPayload = {
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      orderType,
      tableNumber: tableNumber || undefined,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      discountAmount: discount.toFixed(2),
      serviceCharge: serviceCharge.toFixed(2),
      totalAmount: total.toFixed(2),
      paymentMethod,
      promoCode: appliedPromo?.code || undefined,
      notes: notes || undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        subtotal: item.subtotal.toFixed(2),
        sugarLevel: item.sugarLevel,
        iceLevel: item.iceLevel,
        addons: item.addons.map((addon) => ({
          addonId: addon.addonId,
          name: addon.name,
          price: addon.price.toFixed(2),
          quantity: addon.quantity,
        })),
      })),
    };

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("fomo-offline-transactions") || "[]") as QueuedTransaction[];
      localStorage.setItem("fomo-offline-transactions", JSON.stringify([{ ...payload, queuedAt: new Date().toISOString() }, ...queue]));
      toast.success("Offline mode: transaksi disimpan ke antrean lokal.");
      setCart([]);
      setAppliedPromo(null);
      return;
    }

    setReceiptData(receiptSnapshot);
    createTransaction.mutate(payload);
  };

  const persistHeldOrders = (orders: typeof heldOrders) => {
    setHeldOrders(orders);
    localStorage.setItem("fomo-held-orders", JSON.stringify(orders));
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong, tidak ada yang bisa di-hold.");
      return;
    }
    const label = tableNumber ? `Meja ${tableNumber}` : selectedCustomer?.name || `Hold ${heldOrders.length + 1}`;
    const next = [{ id: Date.now().toString(), label, cart, customer: selectedCustomer, orderType, tableNumber, notes }, ...heldOrders].slice(0, 10);
    persistHeldOrders(next);
    setCart([]);
    setSelectedCustomer(null);
    setTableNumber("");
    setNotes("");
    toast.success("Order di-hold dan bisa dipanggil kembali.");
  };

  const handleRecallOrder = (id: string) => {
    const order = heldOrders.find((item) => item.id === id);
    if (!order) return;
    setCart(order.cart);
    setSelectedCustomer(order.customer);
    setOrderType(order.orderType);
    setTableNumber(order.tableNumber);
    setNotes(order.notes);
    persistHeldOrders(heldOrders.filter((item) => item.id !== id));
    toast.success(`Order ${order.label} dipanggil kembali.`);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error("Masukkan kode promo terlebih dahulu.");
      return;
    }
    const result = await promoLookup.refetch();
    const promo = result.data;
    const now = new Date();
    const isValid =
      promo?.isActive &&
      new Date(promo.startDate) <= now &&
      new Date(promo.endDate) >= now &&
      Number(promo.minPurchase) <= subtotal &&
      (!promo.usageLimit || promo.usageCount < promo.usageLimit);
    if (promo && isValid) {
      setAppliedPromo({
        code: promo.code,
        type: promo.type,
        value: promo.value,
        maxDiscount: promo.maxDiscount,
      });
      toast.success(`Promo ${promo.code || promo.name} diterapkan.`);
    } else {
      toast.error("Kode promo tidak ditemukan, tidak aktif, expired, atau belum memenuhi minimum transaksi.");
      setPromoCode("");
      setAppliedPromo(null);
    }
  };

  const handlePrintReceipt = () => {
    if (cart.length === 0) {
      toast.error("Tidak ada item untuk dicetak.");
      return;
    }
    window.print();
    toast.success("Perintah print struk dikirim.");
  };

  const handleCashDrawer = () => {
    toast.info("Cash drawer belum tersambung ke driver terminal. Gunakan tombol ini setelah integrasi hardware aktif.");
  };

  const handleWhatsApp = () => {
    if (!selectedCustomer) {
      toast.error("Pilih customer terlebih dahulu.");
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`Halo ${selectedCustomer.name}, pesanan FOMO COFFEE Anda sedang diproses.`)}`, "_blank");
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline || !openShift || syncTransaction.isPending) return;
    const rawQueue = localStorage.getItem("fomo-offline-transactions");
    if (!rawQueue) return;

    let queue: QueuedTransaction[] = [];
    try {
      queue = JSON.parse(rawQueue) as QueuedTransaction[];
    } catch {
      localStorage.removeItem("fomo-offline-transactions");
      return;
    }

    if (queue.length === 0) return;

    let cancelled = false;
    const syncQueue = async () => {
      const remaining = [...queue].reverse();
      let synced = 0;
      while (remaining.length > 0 && !cancelled) {
        const item = remaining.shift();
        if (!item) break;
        const payload: TransactionPayload = { ...item };
        delete (payload as Partial<QueuedTransaction>).queuedAt;
        try {
          await syncTransaction.mutateAsync(payload);
          synced += 1;
        } catch (error) {
          remaining.unshift(item);
          localStorage.setItem("fomo-offline-transactions", JSON.stringify(remaining.reverse()));
          toast.error(error instanceof Error ? error.message : "Gagal sync transaksi offline.");
          return;
        }
      }

      if (!cancelled) {
        localStorage.removeItem("fomo-offline-transactions");
        await utils.transaction.list.invalidate();
        await utils.shift.getOpenShift.invalidate();
        toast.success(`${synced} transaksi offline berhasil disinkronkan.`);
      }
    };

    void syncQueue();
    return () => {
      cancelled = true;
    };
  }, [isOnline, openShift, syncTransaction, utils.shift.getOpenShift, utils.transaction.list]);

  return (
    <>
    <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* Product Grid Area */}
      <div className="flex min-w-0 flex-col">
        {/* Category Pills */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
            className={`h-8 px-3 sm:px-5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
              !selectedCategory && !searchQuery
                ? "bg-[#D4A853] text-black"
                : "bg-transparent text-white/50 border border-white/[0.07] hover:bg-white/[0.06] hover:text-white/70"
            } max-w-max`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setSearchQuery(""); }}
              className={`h-8 px-3 sm:px-5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 max-w-max ${
                selectedCategory === cat.id
                  ? "bg-[#D4A853] text-black"
                  : "bg-transparent text-white/50 border border-white/[0.07] hover:bg-white/[0.06] hover:text-white/70"
              }`}
            >
              {categoryIcons[cat.name] || <Coffee size={14} />}
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Cari menu..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategory(null); }}
            className="pl-10 h-10 bg-[rgba(37,37,39,0.82)] border-white/[0.07] rounded-full text-sm text-white placeholder:text-white/40 focus:border-[rgba(212,168,83,0.3)]"
          />
        </div>

        {/* Product Grid */}
        <div className="card-glass min-h-[320px] sm:min-h-[420px] overflow-y-auto rounded-3xl p-4 sm:p-5 xl:max-h-[calc(100vh-13rem)]">
          {isProductsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-2xl bg-white/[0.05]" />
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => openProductCustomizer(product)}
                  className="group text-left rounded-2xl overflow-hidden bg-[#141415] shadow-[0_4px_16px_rgba(0,0,0,0.24)] hover:shadow-[0_6px_20px_rgba(212,168,83,0.15)] hover:-translate-y-1 active:scale-[0.97] transition-all duration-250"
                >
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={product.image || "/products/cappuccino.jpg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.isBestSeller && (
                      <span className="absolute top-2 left-2 bg-[#D4A853] text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Best Seller
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                    <p className="text-[11px] text-white/40 italic truncate mt-0.5">{product.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-[#D4A853]">
                        {formatPrice(Number(product.basePrice))}
                      </span>
                      <span className="text-[10px] bg-[#D4A853] text-black px-2.5 py-1 rounded-full font-semibold uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-y-1 group-hover:translate-y-0">
                        Order
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] px-6 text-center">
              <Coffee size={34} className="mb-3 text-white/25" />
              <p className="text-sm font-semibold text-white/70">Menu tidak ditemukan</p>
              <p className="mt-1 max-w-sm text-xs text-white/40">
                Coba ubah kategori/pencarian, atau cek status produk dan stok di halaman produk.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Order Summary Panel */}
      <div className="card-glass flex max-h-none min-h-0 w-full flex-col overflow-visible rounded-2xl p-4 sm:p-5 xl:sticky xl:top-3 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
        {!isOnline && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <WifiOff size={14} /> Offline mode aktif. Transaksi masuk antrean lokal.
          </div>
        )}
        {!openShift && (
          <div className="mb-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700">
            <p className="mb-2 font-semibold">Belum ada shift aktif.</p>
            <button
              onClick={() => openQuickShift.mutate({ openingCash: "0" })}
              className="h-8 rounded-lg bg-[#D4A853] px-3 font-bold text-black"
            >
              Buka Shift Cepat
            </button>
          </div>
        )}
        {/* Customer Select */}
        <div className="mb-4">
          <select
            value={selectedCustomer?.id || ""}
            onChange={(e) => {
              const cust = customers?.find((c) => c.id === Number(e.target.value));
              setSelectedCustomer(cust ? { id: cust.id, name: cust.name } : null);
            }}
            className="w-full h-11 bg-[rgba(37,37,39,0.82)] border border-white/[0.07] rounded-xl px-3.5 text-sm text-white focus:border-[rgba(212,168,83,0.3)] outline-none appearance-none"
          >
            <option value="">Walk-in Customer</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#252527]">
                {c.name} - {c.phone} ({c.membershipLevel})
              </option>
            ))}
          </select>
        </div>

        {/* Order Type */}
        <div className="flex gap-2 mb-4">
          {(["dine_in", "takeaway", "delivery"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                orderType === type
                  ? "bg-[#D4A853] text-black"
                  : "bg-white/[0.04] text-white/50 hover:text-white/70"
              }`}
            >
              {type === "dine_in" ? "Dine In" : type === "takeaway" ? "Takeaway" : "Delivery"}
            </button>
          ))}
        </div>

        {/* Table Number */}
        {orderType === "dine_in" && (
          <Input
            placeholder="Nomor Meja"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="h-9 bg-white/[0.04] border-white/[0.07] rounded-lg text-sm mb-4 text-white placeholder:text-white/40"
          />
        )}

        {/* Cart Items */}
        <div className="mb-4 max-h-[320px] overflow-y-auto scrollbar-thin xl:max-h-none xl:min-h-[160px] xl:flex-none">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-white/30">
              <ShoppingCart size={32} className="mb-2" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs">Pilih produk untuk memulai</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex text-[11px] text-white/40 uppercase tracking-wider font-semibold pb-2 border-b border-white/[0.12]">
                <span className="flex-[2]">Item</span>
                <span className="w-16 text-center">Qty</span>
                <span className="w-24 text-right">Harga</span>
              </div>
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center py-2 border-b border-white/[0.04] group hover:bg-white/[0.02] rounded-lg px-1 -mx-1 transition-colors">
                  <div className="flex-[2] min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.productName}</p>
                    <p className="text-[10px] text-[#D4A853] font-mono">{item.variantName} | {item.sugarLevel} | {item.iceLevel}</p>
                    {item.addons.length > 0 && (
                      <p className="mt-1 text-[10px] text-white/45">
                        + {item.addons.map((addon) => `${addon.name}${addon.quantity > 1 ? ` x${addon.quantity}` : ""}`).join(", ")}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const product = products?.find((row) => row.id === item.productId);
                        if (product) openProductCustomizer(product, idx);
                      }}
                      className="mt-2 rounded-full border border-[#D4A853]/30 px-2 py-0.5 text-[10px] font-semibold text-[#D4A853] hover:bg-[#D4A853] hover:text-black"
                    >
                      Edit add-ons
                    </button>
                  </div>
                  <div className="w-16 flex items-center justify-center gap-1.5">
                    <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="w-24 flex items-center justify-end gap-2">
                    <span className="text-sm font-semibold">{formatPrice(item.subtotal)}</span>
                    <button onClick={() => removeItem(idx)} className="text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <button onClick={handleHoldOrder} className="h-9 rounded-lg bg-white/[0.04] text-xs font-semibold text-white/65 hover:bg-white/[0.08]">
            Hold Order
          </button>
          <select
            value=""
            onChange={(event) => event.target.value && handleRecallOrder(event.target.value)}
            className="h-9 rounded-lg border border-white/[0.07] bg-[#1E1E20] px-2 text-xs text-white"
          >
            <option value="">Recall ({heldOrders.length})</option>
            {heldOrders.map((order) => <option key={order.id} value={order.id}>{order.label}</option>)}
          </select>
        </div>

        {/* Promo Code */}
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Kode promo"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value);
              setAppliedPromo(null);
            }}
            className="h-9 bg-white/[0.04] border-white/[0.07] rounded-lg text-sm text-white placeholder:text-white/40"
          />
          <button onClick={handleApplyPromo} className="h-9 px-3 rounded-lg bg-[#D4A853] text-black text-xs font-bold hover:brightness-110 transition-all">
            <Percent size={14} />
          </button>
        </div>

        {/* Totals */}
        <div className="space-y-2 mb-4 border-t border-white/[0.12] pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Subtotal</span>
            <span className="text-white font-medium">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">PPN (11%)</span>
            <span className="text-white font-medium">{formatPrice(taxAmount)}</span>
          </div>
          {serviceEnabled && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Service (5%)</span>
              <span className="text-white font-medium">{formatPrice(serviceCharge)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Diskon</span>
              <span className="text-[#D4A853] font-medium">-{formatPrice(discount)}</span>
            </div>
          )}
          {roundingAmount !== 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Rounding</span>
              <span className="text-white font-medium">{formatPrice(roundingAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-white/[0.12]">
            <span className="text-lg font-bold text-white">Total</span>
            <span className="text-xl font-bold text-[#D4A853]">{formatPrice(total)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { key: "cash" as const, icon: Banknote, label: "Cash" },
            { key: "qris" as const, icon: QrCode, label: "QRIS" },
            { key: "debit" as const, icon: CreditCard, label: "Debit" },
            { key: "credit_card" as const, icon: CreditCard, label: "Credit" },
            { key: "ewallet" as const, icon: Smartphone, label: "E-Wallet" },
            { key: "transfer_bank" as const, icon: ArrowRightLeft, label: "Transfer" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setPaymentMethod(key)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-medium transition-all ${
                paymentMethod === key
                  ? "bg-[#D4A853] text-black"
                  : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-white/60">
          <button onClick={() => setServiceEnabled((value) => !value)} className={`h-8 rounded-lg ${serviceEnabled ? "bg-[#D4A853] text-black" : "bg-white/[0.04]"}`}>
            Service 5%
          </button>
          <button onClick={() => setRoundingEnabled((value) => !value)} className={`h-8 rounded-lg ${roundingEnabled ? "bg-[#D4A853] text-black" : "bg-white/[0.04]"}`}>
            Rounding
          </button>
        </div>

        {paymentMethod === "cash" && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Input
              placeholder="Uang diterima"
              value={cashReceived}
              onChange={(event) => setCashReceived(event.target.value)}
              className="h-9 bg-white/[0.04] border-white/[0.07] rounded-lg text-sm text-white placeholder:text-white/40"
            />
            <div className={`flex h-9 items-center justify-center rounded-lg text-xs font-semibold ${changeAmount < 0 ? "bg-red-500/10 text-red-300" : "bg-green-500/10 text-green-300"}`}>
              Kembali {formatPrice(Math.max(changeAmount, 0))}
            </div>
          </div>
        )}

        {/* Notes */}
        <Input
          placeholder="Catatan pesanan..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-9 bg-white/[0.04] border-white/[0.07] rounded-lg text-sm mb-4 text-white placeholder:text-white/40"
        />

        <div className="grid grid-cols-3 gap-2 mb-4">
          <button onClick={handlePrintReceipt} className="h-9 rounded-lg bg-white/[0.04] text-white/60 hover:bg-white/[0.08] flex items-center justify-center" title="Print struk">
            <Printer size={15} />
          </button>
          <button onClick={handleCashDrawer} className="h-9 rounded-lg bg-white/[0.04] text-white/60 hover:bg-white/[0.08] flex items-center justify-center" title="Open cash drawer">
            <WalletCards size={15} />
          </button>
          <button onClick={handleWhatsApp} className="h-9 rounded-lg bg-white/[0.04] text-white/60 hover:bg-white/[0.08] flex items-center justify-center" title="WhatsApp customer">
            <MessageCircle size={15} />
          </button>
        </div>

        {/* Complete Button */}
        <Button
          onClick={handleCompleteOrder}
          disabled={cart.length === 0 || createTransaction.isPending}
          className="h-12 w-full rounded-xl btn-primary-gold text-sm font-bold uppercase tracking-[0.08em]"
        >
          {createTransaction.isPending ? "Memproses..." : (
            <>
              <Receipt size={16} className="mr-2" />
              Complete Order
            </>
          )}
        </Button>
      </div>
    </div>
    <Dialog open={!!customProduct} onOpenChange={(open) => !open && closeProductCustomizer()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-[#E7DED3] bg-[#F7F3EC] text-[#241C17] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customProduct?.name || "Atur Item"}</DialogTitle>
        </DialogHeader>

        {customProduct && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <div className="aspect-square overflow-hidden rounded-xl bg-white">
                <img
                  src={customProduct.image || "/products/cappuccino.jpg"}
                  alt={customProduct.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[#76675C]">{customProduct.description || "Pilih level dan add-ons sebelum masuk keranjang."}</p>
                <div className="mt-3 rounded-xl border border-[#E7DED3] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#76675C]">Harga item</p>
                  <p className="mt-1 text-2xl font-bold text-[#B77945]">{formatPrice(customItemTotal)}</p>
                  {customAddonTotal > 0 && (
                    <p className="mt-1 text-xs text-[#76675C]">
                      Menu {formatPrice(customBasePrice)} + add-ons {formatPrice(customAddonTotal)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#76675C]">Sugar level</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {sugarOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDraftSugarLevel(option)}
                    className={`h-10 rounded-lg border text-sm font-semibold ${
                      draftSugarLevel === option
                        ? "border-[#B77945] bg-[#B77945] text-white"
                        : "border-[#E7DED3] bg-white text-[#6F6156]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#76675C]">Ice level</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {iceOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDraftIceLevel(option)}
                    className={`h-10 rounded-lg border text-sm font-semibold ${
                      draftIceLevel === option
                        ? "border-[#B77945] bg-[#B77945] text-white"
                        : "border-[#E7DED3] bg-white text-[#6F6156]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#76675C]">Add-ons</p>
                {selectedAddonItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraftAddons({})}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-[#B77945] hover:bg-white"
                  >
                    <X size={12} /> Reset
                  </button>
                )}
              </div>
              {activeAddons.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeAddons.map((addon) => {
                    const qty = draftAddons[addon.id] || 0;
                    return (
                      <div key={addon.id} className={`rounded-xl border p-3 ${qty > 0 ? "border-[#B77945] bg-white" : "border-[#E7DED3] bg-white/70"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#241C17]">{addon.name}</p>
                            <p className="mt-0.5 text-xs text-[#76675C]">{addon.description || addon.inventoryName || "Tambahan item"}</p>
                            <p className="mt-1 text-sm font-bold text-[#B77945]">{formatPrice(Number(addon.price))}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAddonQuantity(addon.id, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7DED3] bg-[#F7F3EC] text-[#6F6156]"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm font-bold">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setAddonQuantity(addon.id, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B77945] text-white"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#E7DED3] bg-white/70 p-5 text-center text-sm text-[#76675C]">
                  Add-ons aktif belum tersedia. Kelola di halaman Produk.
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#E7DED3] pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeProductCustomizer} className="h-11">
                Batal
              </Button>
              <Button type="button" onClick={addToCart} className="h-11 btn-primary-gold">
                {customizingCartIndex !== null ? "Simpan Item" : "Tambah ke Keranjang"} - {formatPrice(customItemTotal)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <Dialog open={!!receiptData} onOpenChange={(open) => !open && setReceiptData(null)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-[#E7DED3] bg-[#F7F3EC] text-[#241C17] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Struk Pembayaran</DialogTitle>
        </DialogHeader>

        {receiptData && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E7DED3] bg-white p-4 font-mono text-sm">
              <div className="text-center">
                <p className="text-lg font-bold tracking-widest">FOMO COFFEE</p>
                <p className="mt-1 text-xs text-[#76675C]">{receiptData.orderNumber}</p>
                <p className="text-xs text-[#76675C]">{receiptData.createdAt.toLocaleString("id-ID")}</p>
              </div>

              <div className="my-3 border-t border-dashed border-[#D7C9BA]" />
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-3"><span>Customer</span><strong className="text-right">{receiptData.customerName || "Walk-in"}</strong></div>
                <div className="flex justify-between gap-3"><span>Kasir</span><strong className="text-right">{receiptData.cashierName || "-"}</strong></div>
                <div className="flex justify-between gap-3"><span>Tipe</span><strong className="text-right">{orderTypeLabels[receiptData.orderType]}{receiptData.tableNumber ? ` / ${receiptData.tableNumber}` : ""}</strong></div>
                <div className="flex justify-between gap-3"><span>Bayar</span><strong className="text-right">{paymentLabels[receiptData.paymentMethod]}</strong></div>
              </div>

              <div className="my-3 border-t border-dashed border-[#D7C9BA]" />
              <div className="space-y-3">
                {receiptData.items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold">{item.quantity}x {item.productName}</span>
                      <span className="font-bold">{formatPrice(item.subtotal)}</span>
                    </div>
                    <p className="mt-0.5 text-[#76675C]">{item.sugarLevel} | {item.iceLevel}</p>
                    {item.addons.map((addon) => (
                      <p key={addon.addonId} className="text-[#76675C]">
                        + {addon.name}{addon.quantity > 1 ? ` x${addon.quantity}` : ""} ({formatPrice(addon.price * addon.quantity * item.quantity)})
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              <div className="my-3 border-t border-dashed border-[#D7C9BA]" />
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(receiptData.subtotal)}</span></div>
                <div className="flex justify-between"><span>PPN</span><span>{formatPrice(receiptData.taxAmount)}</span></div>
                {receiptData.serviceCharge > 0 && <div className="flex justify-between"><span>Service</span><span>{formatPrice(receiptData.serviceCharge)}</span></div>}
                {receiptData.discount > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{formatPrice(receiptData.discount)}</span></div>}
                {receiptData.roundingAmount !== 0 && <div className="flex justify-between"><span>Rounding</span><span>{formatPrice(receiptData.roundingAmount)}</span></div>}
                <div className="flex justify-between pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(receiptData.total)}</span>
                </div>
                {receiptData.paymentMethod === "cash" && (
                  <>
                    <div className="flex justify-between"><span>Uang diterima</span><span>{formatPrice(receiptData.cashReceived)}</span></div>
                    <div className="flex justify-between"><span>Kembali</span><span>{formatPrice(Math.max(receiptData.changeAmount, 0))}</span></div>
                  </>
                )}
              </div>
              <div className="my-3 border-t border-dashed border-[#D7C9BA]" />
              <p className="text-center text-xs text-[#76675C]">Terima kasih sudah berkunjung ke FOMO COFFEE.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={() => printReceipt(receiptData)} className="h-11 btn-primary-gold">
                <Printer size={15} className="mr-2" /> Print
              </Button>
              <Button type="button" variant="outline" onClick={() => sendReceiptToWhatsApp(receiptData)} className="h-11 border-[#D7C9BA] bg-white text-[#241C17]">
                <MessageCircle size={15} className="mr-2" /> WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
