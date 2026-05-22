import { useState } from "react";
import { Clock, ChefHat, CheckCircle, AlertCircle, Flame, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

type KitchenStatus = "pending" | "processing" | "ready";

export default function KitchenPage() {
  const [filter, setFilter] = useState<"all" | KitchenStatus>("all");
  const utils = trpc.useUtils();
  const { data: orders = [] } = trpc.transaction.kitchenQueue.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const updateTxStatus = trpc.transaction.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.transaction.kitchenQueue.invalidate();
      toast.success("Status order diperbarui.");
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const statusConfig: Record<KitchenStatus, { color: string; bg: string; label: string; icon: typeof Clock }> = {
    pending: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Pending", icon: Clock },
    processing: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Processing", icon: Flame },
    ready: { color: "text-green-400", bg: "bg-green-500/10", label: "Ready", icon: CheckCircle },
  };

  const activeCount = orders.filter((o) => o.status !== "ready").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
            <ChefHat size={20} className="text-[#D4A853]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Kitchen Display</h2>
            <p className="text-xs text-white/50">{activeCount} order aktif dari transaksi real-time</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "processing", "ready"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f ? "bg-[#D4A853] text-black" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}
            >
              {f === "all" ? "Semua" : f === "pending" ? "Pending" : f === "processing" ? "Process" : "Ready"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="card-glass rounded-2xl p-8 text-center text-white/45 md:col-span-2 xl:col-span-3">
            <ChefHat size={34} className="mx-auto mb-3 text-[#D4A853]" />
            <p className="text-sm">Belum ada order kitchen.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const status = order.status as KitchenStatus;
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <div key={order.id} className="card-glass rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-[#D4A853] font-bold">{order.orderNumber}</span>
                      {Number(order.totalAmount) > 100000 && <AlertCircle size={14} className="text-amber-400" />}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">
                      {order.tableNumber ? `Meja ${order.tableNumber}` : order.orderType.replace("_", " ")} -{" "}
                      {new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
                    <Icon size={12} />
                    {config.label}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                      <div className="flex items-center gap-2 min-w-0">
                        <UtensilsCrossed size={14} className="text-white/30 flex-shrink-0" />
                        <span className="text-sm text-white/80 truncate">{item.productName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.variantName && <span className="text-xs text-white/40">{item.variantName}</span>}
                        <span className="text-sm font-bold text-white">x{item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {status === "pending" && (
                    <Button onClick={() => updateTxStatus.mutate({ id: order.id, status: "processing" })} className="flex-1 h-9 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs rounded-lg">
                      <Flame size={14} className="mr-1" /> Process
                    </Button>
                  )}
                  {status === "processing" && (
                    <Button onClick={() => updateTxStatus.mutate({ id: order.id, status: "ready" })} className="flex-1 h-9 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs rounded-lg">
                      <CheckCircle size={14} className="mr-1" /> Ready
                    </Button>
                  )}
                  {status === "ready" && (
                    <Button onClick={() => updateTxStatus.mutate({ id: order.id, status: "completed" })} className="flex-1 h-9 bg-white/[0.06] text-white/60 hover:bg-white/[0.1] text-xs rounded-lg">
                      <CheckCircle size={14} className="mr-1" /> Complete
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
