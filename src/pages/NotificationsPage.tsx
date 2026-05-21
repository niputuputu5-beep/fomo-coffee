import { AlertTriangle, CheckCircle2, Clock, Gift, ShieldCheck } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function NotificationsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: lowStock = [] } = trpc.inventory.getLowStock.useQuery();
  const { data: promos = [] } = trpc.promo.list.useQuery({ active: true });
  const { data: approvals = [] } = trpc.approval.list.useQuery(undefined, {
    enabled: user?.role === "owner" || user?.role === "admin",
  });
  const decideApproval = trpc.approval.decide.useMutation({
    onSuccess: async () => {
      await utils.approval.list.invalidate();
      toast.success("Approval diperbarui.");
    },
    onError: (error) => toast.error(error.message),
  });

  const notifications = [
    ...lowStock.slice(0, 3).map((item) => ({
      icon: AlertTriangle,
      title: `Stok ${item.itemName} hampir habis`,
      text: `Sisa ${item.quantity} ${item.unit}, minimum ${item.minStock}.`,
      tone: "text-amber-400",
    })),
    ...promos.slice(0, 2).map((promo) => ({
      icon: Gift,
      title: `Promo ${promo.code || promo.name} aktif`,
      text: promo.description || "Promo berjalan untuk periode saat ini.",
      tone: "text-[#D4A853]",
    })),
    {
      icon: Clock,
      title: "Shift perlu closing",
      text: "Pastikan kasir menutup shift sebelum end of day.",
      tone: "text-blue-400",
    },
    {
      icon: CheckCircle2,
      title: "Sinkronisasi aktif",
      text: "Kitchen Display dan data transaksi direfresh berkala dari server.",
      tone: "text-green-400",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4A853]">
          Operations
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">Notification Center</h2>
      </div>

      {(user?.role === "owner" || user?.role === "admin") && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/45">Approval Queue</h3>
          {approvals.filter((approval) => approval.status === "pending").length === 0 ? (
            <div className="card-glass rounded-2xl p-4 text-sm text-white/50">Tidak ada approval pending.</div>
          ) : (
            approvals.filter((approval) => approval.status === "pending").map((approval) => (
              <div key={approval.id} className="card-glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4A853]/10">
                    <ShieldCheck size={19} className="text-[#D4A853]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{approval.type.replace("_", " ").toUpperCase()}</h3>
                    <p className="mt-1 text-sm text-white/55">{approval.reason || `${approval.entityType} #${approval.entityId}`}</p>
                  </div>
                </div>
                {user?.role === "owner" && (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button size="sm" className="flex-1 btn-primary-gold rounded-lg sm:flex-none" onClick={() => decideApproval.mutate({ id: approval.id, status: "approved" })}>Approve</Button>
                    <Button size="sm" variant="outline" className="flex-1 border-white/[0.07] text-white/70 sm:flex-none" onClick={() => decideApproval.mutate({ id: approval.id, status: "rejected" })}>Reject</Button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      <div className="space-y-3">
        {notifications.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="card-glass flex items-start gap-4 rounded-2xl p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                <Icon size={19} className={item.tone} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-white/55">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
