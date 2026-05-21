import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Eye, Printer, RotateCcw, Search, ShieldAlert, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 20;
const QUERY_LIMIT = PAGE_SIZE + 1;

type ParsedAddon = {
  addonId?: number;
  name: string;
  price?: string | number;
  quantity?: number;
};

const parseExtras = (value?: string | null) => {
  if (!value) return { addons: [] as ParsedAddon[], note: "" };
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return {
        addons: parsed
          .filter((item): item is ParsedAddon => item && typeof item === "object" && "name" in item)
          .map((item) => ({
            addonId: item.addonId,
            name: String(item.name),
            price: item.price,
            quantity: Number(item.quantity || 1),
          })),
        note: "",
      };
    }
  } catch {
    return { addons: [] as ParsedAddon[], note: value };
  }
  return { addons: [] as ParsedAddon[], note: value };
};

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: transactions } = trpc.transaction.list.useQuery(
    { ...(filter ? { status: filter } : {}), ...(search ? { search } : {}), limit: QUERY_LIMIT, offset: page * PAGE_SIZE }
  );
  const visibleTransactions = (transactions || []).slice(0, PAGE_SIZE);
  const { data: detail } = trpc.transaction.getById.useQuery({ id: selectedId || 0 }, { enabled: selectedId !== null });
  const requestApproval = trpc.approval.request.useMutation({
    onSuccess: () => toast.success("Request approval dikirim ke Owner."),
    onError: (error) => toast.error(error.message),
  });

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(price));
  };

  const statusColors: Record<string, string> = {
    completed: "bg-green-500/10 text-green-400",
    pending: "bg-amber-500/10 text-amber-400",
    processing: "bg-blue-500/10 text-blue-400",
    ready: "bg-purple-500/10 text-purple-400",
    cancelled: "bg-red-500/10 text-red-400",
    void: "bg-gray-500/10 text-gray-400",
  };

  const paymentIcons: Record<string, string> = {
    cash: "Cash",
    qris: "QRIS",
    debit: "Debit",
    credit_card: "Credit Card",
    ewallet: "E-Wallet",
    transfer_bank: "Transfer",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input placeholder="Cari transaksi..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10 h-10 bg-white/[0.04] border-white/[0.07] rounded-xl text-white placeholder:text-white/40" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["", "completed", "pending", "processing", "ready", "cancelled", "void"].map((s) => (
            <button key={s} onClick={() => { setFilter(s); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s ? "bg-[#D4A853] text-black" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}>
              {s || "Semua"}
            </button>
          ))}
        </div>
      </div>

      <div className="card-glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
              <th className="text-left py-3 px-4">No. Order</th>
              <th className="text-left py-3 px-4">Customer</th>
              <th className="text-left py-3 px-4">Tipe</th>
              <th className="text-left py-3 px-4">Pembayaran</th>
              <th className="text-right py-3 px-4">Total</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Tanggal</th>
              <th className="text-right py-3 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-white/40">
                  <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Belum ada transaksi</p>
                </td>
              </tr>
            ) : (
              visibleTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-[#D4A853]">{tx.orderNumber}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-white/80">{tx.customerName || "Walk-in"}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-white/[0.06] text-white/70 px-2 py-1 rounded-md">
                      {tx.orderType === "dine_in" ? "Dine In" : tx.orderType === "takeaway" ? "Takeaway" : "Delivery"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-white/60">{paymentIcons[tx.paymentMethod] || tx.paymentMethod}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-white">{formatPrice(tx.totalAmount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[tx.status] || "bg-white/[0.06] text-white/60"}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-white/40">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("id-ID") : "-"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setSelectedId(tx.id)} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-white" title="Detail">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => { setSelectedId(tx.id); setTimeout(() => window.print(), 150); }} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-white" title="Reprint">
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <PaginationControls
          page={page}
          pageSize={PAGE_SIZE}
          itemCount={(transactions || []).length}
          hasNext={(transactions || []).length > PAGE_SIZE}
          onPageChange={setPage}
          label="transaksi"
        />
      </div>
      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl border-white/[0.08] bg-[#1E1E20] text-white">
          <DialogHeader>
            <DialogTitle>Detail Transaksi {detail?.orderNumber}</DialogTitle>
          </DialogHeader>
          {!detail ? (
            <p className="text-sm text-white/45">Memuat detail...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-white/45">Customer:</span> {detail.customerName || "Walk-in"}</p>
                <p><span className="text-white/45">Kasir:</span> {detail.userName}</p>
                <p><span className="text-white/45">Status:</span> {detail.status}</p>
                <p><span className="text-white/45">Payment:</span> {paymentIcons[detail.paymentMethod] || detail.paymentMethod}</p>
                <p><span className="text-white/45">HPP:</span> {formatPrice(detail.totalCogs)}</p>
                <p><span className="text-white/45">Gross Profit:</span> {formatPrice(detail.grossProfit)}</p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-xs text-white/45">
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => {
                      const extras = parseExtras(item.extras || item.notes);
                      return (
                        <tr key={item.id} className="border-b border-white/[0.04] text-sm">
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.productName}</p>
                            {(item.sugarLevel || item.iceLevel) && (
                              <p className="text-xs text-white/45">
                                {[item.variantName, item.sugarLevel, item.iceLevel].filter(Boolean).join(" | ")}
                              </p>
                            )}
                            {extras.addons.map((addon, index) => (
                              <p key={`${addon.addonId || addon.name}-${index}`} className="text-xs text-white/40">
                                + {addon.name}{Number(addon.quantity || 1) > 1 ? ` x${addon.quantity}` : ""}
                                {addon.price ? ` (${formatPrice(String(addon.price))})` : ""}
                              </p>
                            ))}
                            {extras.note && <p className="text-xs text-white/40">{extras.note}</p>}
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatPrice(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right">{formatPrice(item.subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 border-t border-white/[0.07] pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-white/50">Total</p>
                  <p className="text-xl font-bold text-[#D4A853]">{formatPrice(detail.totalAmount)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.print()} className="border-white/[0.07] text-white/70">
                    <Printer size={14} className="mr-2" /> Reprint
                  </Button>
                  <Button variant="outline" onClick={() => requestApproval.mutate({ type: "refund", entityType: "transaction", entityId: detail.id, reason: `Refund ${detail.orderNumber}` })} className="border-amber-500/25 text-amber-300">
                    <RotateCcw size={14} className="mr-2" /> Refund
                  </Button>
                  <Button variant="outline" onClick={() => requestApproval.mutate({ type: "void", entityType: "transaction", entityId: detail.id, reason: `Void ${detail.orderNumber}` })} className="border-red-500/25 text-red-300">
                    <ShieldAlert size={14} className="mr-2" /> Void
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
