import { trpc } from "@/providers/trpc";
import { Gift, Percent, Clock, CheckCircle, XCircle, Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { useState } from "react";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 10;

const typeConfig: Record<string, { color: string; bg: string; label: string }> = {
  percentage: { color: "text-[#D4A853]", bg: "bg-[#D4A853]/10", label: "Diskon %" },
  fixed_amount: { color: "text-green-400", bg: "bg-green-500/10", label: "Potongan Harga" },
  buy_x_get_y: { color: "text-purple-400", bg: "bg-purple-500/10", label: "Buy X Get Y" },
  bundle: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Bundle" },
  happy_hour: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Happy Hour" },
};

export default function PromosPage() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{
    id: number; name: string; code?: string | null; type: string; value: string; minPurchase: string; maxDiscount?: string | null;
    applicableTo: string; targetId?: number | null; startDate: Date; endDate: Date; usageLimit?: number | null; description?: string | null; isActive: boolean;
  } | null>(null);
  const { data: promos, refetch } = trpc.promo.list.useQuery();
  const createPromo = trpc.promo.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Promo ditambahkan"); }, onError: (error) => toast.error(error.message) });
  const updatePromo = trpc.promo.update.useMutation({ onSuccess: () => { refetch(); setEditing(null); toast.success("Promo diperbarui"); }, onError: (error) => toast.error(error.message) });
  const deletePromo = trpc.promo.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Promo dinonaktifkan"); }, onError: (error) => toast.error(error.message) });

  const handleAdd = (values: Record<string, string>) => {
    if (editing) {
      updatePromo.mutate({
        id: editing.id,
        name: values.name,
        code: values.code || undefined,
        type: (values.type || "percentage") as "percentage" | "fixed_amount" | "buy_x_get_y" | "bundle" | "happy_hour",
        value: values.value || undefined,
        minPurchase: values.minPurchase || undefined,
        maxDiscount: values.maxDiscount || undefined,
        applicableTo: (values.applicableTo || "all") as "all" | "category" | "product" | "payment_method",
        targetId: values.targetId ? Number(values.targetId) : undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        usageLimit: Number(values.usageLimit || 100),
        description: values.description || undefined,
        isActive: values.isActive !== "false",
      });
      return;
    }
    createPromo.mutate({
      name: values.name,
      code: values.code || values.name.toUpperCase().replace(/\s+/g, ""),
      description: values.description || "Promo baru",
      type: (values.type || "percentage") as "percentage" | "fixed_amount" | "buy_x_get_y" | "bundle" | "happy_hour",
      value: values.value || "10",
      minPurchase: values.minPurchase || "0",
      maxDiscount: values.maxDiscount || undefined,
      applicableTo: (values.applicableTo || "all") as "all" | "category" | "product" | "payment_method",
      targetId: values.targetId ? Number(values.targetId) : undefined,
      startDate: values.startDate || new Date().toISOString(),
      endDate: values.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: Number(values.usageLimit || 100),
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(price));
  };
  const visiblePromos = (promos || []).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm text-white/60">{promos?.length || 0} promo terdaftar</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="w-full btn-primary-gold rounded-xl sm:w-auto">
          <Plus size={16} className="mr-2" /> Tambah Promo
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visiblePromos.map((promo) => {
          const config = typeConfig[promo.type] || typeConfig.percentage;
          return (
            <div key={promo.id} className="card-glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center`}>
                    <Gift size={20} className={config.color} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{promo.name}</h3>
                    <p className="text-xs text-white/40">{promo.code}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(promo)} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-white"><Edit2 size={14} /></button>
                  <button onClick={() => deletePromo.mutate({ id: promo.id })} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <span className={`inline-flex text-xs px-2 py-1 rounded-full ${promo.isActive ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>
                {promo.isActive ? <CheckCircle size={12} className="inline mr-1" /> : <XCircle size={12} className="inline mr-1" />}
                {promo.isActive ? "Aktif" : "Nonaktif"}
              </span>
              <p className="text-xs text-white/50 mb-3">{promo.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                <span className={`px-2 py-1 rounded-md ${config.bg} ${config.color} font-medium`}>{config.label}</span>
                <span className="flex items-center gap-1"><Percent size={12} />{promo.type === "percentage" ? `${promo.value}%` : formatPrice(promo.value)}</span>
                <span className="flex items-center gap-1"><Clock size={12} />Min: {formatPrice(promo.minPurchase)}</span>
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.07] pt-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-white/40">
                  {promo.startDate && promo.endDate ? `${new Date(promo.startDate).toLocaleDateString("id-ID")} - ${new Date(promo.endDate).toLocaleDateString("id-ID")}` : "Tanpa batas tanggal"}
                </span>
                <span className="text-xs text-white/40">Used: {promo.usageCount}/{promo.usageLimit || "unlimited"}</span>
              </div>
            </div>
          );
        })}
      </div>
      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        itemCount={visiblePromos.length}
        hasNext={(page + 1) * PAGE_SIZE < (promos || []).length}
        onPageChange={setPage}
        label="promo"
      />
      <QuickFormDialog
        open={open || editing !== null}
        title={editing ? "Edit Promo" : "Tambah Promo"}
        fields={[
          { name: "name", label: "Nama Promo", required: true },
          { name: "code", label: "Kode Promo" },
          { name: "type", label: "Tipe (percentage/fixed_amount/buy_x_get_y/bundle/happy_hour)" },
          { name: "value", label: "Nilai Diskon", type: "number" },
          { name: "minPurchase", label: "Min. Pembelian", type: "number" },
          { name: "maxDiscount", label: "Maks. Diskon", type: "number" },
          { name: "applicableTo", label: "Berlaku Untuk (all/category/product/payment_method)" },
          { name: "targetId", label: "Target ID", type: "number" },
          { name: "startDate", label: "Mulai (YYYY-MM-DD)" },
          { name: "endDate", label: "Berakhir (YYYY-MM-DD)" },
          { name: "usageLimit", label: "Batas Penggunaan", type: "number" },
          { name: "isActive", label: "Aktif? (true/false)" },
          { name: "description", label: "Deskripsi", type: "textarea" },
        ]}
        initialValues={editing ? {
          name: editing.name,
          code: editing.code || "",
          type: editing.type,
          value: editing.value,
          minPurchase: editing.minPurchase,
          maxDiscount: editing.maxDiscount || "",
          applicableTo: editing.applicableTo,
          targetId: editing.targetId ? String(editing.targetId) : "",
          startDate: new Date(editing.startDate).toISOString().slice(0, 10),
          endDate: new Date(editing.endDate).toISOString().slice(0, 10),
          usageLimit: String(editing.usageLimit || 100),
          isActive: String(editing.isActive),
          description: editing.description || "",
        } : { type: "percentage", value: "10", minPurchase: "0", applicableTo: "all", startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), usageLimit: "100", isActive: "true" }}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        onSubmit={handleAdd}
      />
    </div>
  );
}
