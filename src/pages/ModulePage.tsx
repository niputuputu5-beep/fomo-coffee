import { setSeo } from "@/lib/seo";
import { ClipboardCheck, Edit2, PackageCheck, Search, Shield, Stars, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { PaginationControls } from "@/components/PaginationControls";
import { ThemedSelect } from "@/components/ThemedSelect";

const PAGE_SIZE = 10;

type ModuleKind = "membership" | "purchase-order" | "receiving";
type ModuleRow = {
  key: number;
  cells: string[];
  action?: React.ReactNode;
};

const pageMeta = {
  membership: {
    title: "Membership",
    description: "Kelola level member, poin loyalitas, voucher, dan masa berlaku membership.",
    icon: Stars,
    action: "Tambah Program Member",
  },
  "purchase-order": {
    title: "Purchase Order",
    description: "Alur PO supplier, approval pembelian, status pembayaran, dan riwayat harga beli.",
    icon: ClipboardCheck,
    action: "Buat Purchase Order",
  },
  receiving: {
    title: "Receiving Barang",
    description: "Penerimaan barang dari supplier untuk memperbarui inventory dan batch.",
    icon: PackageCheck,
    action: "Catat Receiving",
  },
} satisfies Record<ModuleKind, {
  title: string;
  description: string;
  icon: typeof Shield;
  action: string;
}>;

export default function ModulePage({ kind }: { kind: ModuleKind }) {
  const page = pageMeta[kind];
  const Icon = page.icon;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(0);
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const membership = trpc.membership.list.useQuery(undefined, { enabled: kind === "membership" });
  const purchaseOrders = trpc.purchase.list.useQuery(undefined, { enabled: kind === "purchase-order" });
  const receiving = trpc.receiving.list.useQuery(undefined, { enabled: kind === "receiving" });

  const createMembership = trpc.membership.create.useMutation({
    onSuccess: async () => {
      await utils.membership.list.invalidate();
      toast.success("Program membership tersimpan.");
      setOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMembership = trpc.membership.update.useMutation({
    onSuccess: async () => {
      await utils.membership.list.invalidate();
      toast.success("Program membership diperbarui.");
      setOpen(false);
      setEditing(null);
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMembership = trpc.membership.delete.useMutation({
    onSuccess: async () => {
      await utils.membership.list.invalidate();
      toast.success("Program membership dinonaktifkan.");
    },
    onError: (error) => toast.error(error.message),
  });
  const createPurchaseOrder = trpc.purchase.create.useMutation({
    onSuccess: async () => {
      await utils.purchase.list.invalidate();
      toast.success("Purchase order dibuat dan masuk approval.");
      setOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const updatePurchaseOrder = trpc.purchase.update.useMutation({
    onSuccess: async () => {
      await utils.purchase.list.invalidate();
      toast.success("Purchase order diperbarui.");
      setOpen(false);
      setEditing(null);
    },
    onError: (error) => toast.error(error.message),
  });
  const approvePurchaseOrder = trpc.purchase.approve.useMutation({
    onSuccess: async () => {
      await utils.purchase.list.invalidate();
      toast.success("Purchase order disetujui.");
    },
    onError: (error) => toast.error(error.message),
  });
  const cancelPurchaseOrder = trpc.purchase.cancel.useMutation({
    onSuccess: async () => {
      await utils.purchase.list.invalidate();
      toast.success("Purchase order dibatalkan.");
    },
    onError: (error) => toast.error(error.message),
  });
  const createReceiving = trpc.receiving.create.useMutation({
    onSuccess: async () => {
      await utils.receiving.list.invalidate();
      await utils.inventory.list.invalidate();
      toast.success("Receiving tersimpan dan inventory diperbarui.");
      setOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateReceiving = trpc.receiving.update.useMutation({
    onSuccess: async () => {
      await utils.receiving.list.invalidate();
      toast.success("Receiving diperbarui.");
      setOpen(false);
      setEditing(null);
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteReceiving = trpc.receiving.delete.useMutation({
    onSuccess: async () => {
      await utils.receiving.list.invalidate();
      toast.success("Receiving dihapus.");
    },
    onError: (error) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  useEffect(() => {
    setSeo({
      title: `${page.title} - FOMO COFFEE POS`,
      description: page.description,
      path: `/${kind}`,
    });
  }, [kind, page.description, page.title]);

  const fields = useMemo(() => {
    if (kind === "membership") {
      return [
        { name: "name", label: "Nama Program", required: true },
        { name: "level", label: "Level (silver/gold/platinum)", required: true },
        { name: "benefit", label: "Benefit", required: true },
        { name: "pointMultiplier", label: "Point Multiplier", type: "number" as const },
        { name: "minSpend", label: "Minimal Spend", type: "number" as const },
      ];
    }
    if (kind === "purchase-order") {
      return [
        { name: "supplierName", label: "Supplier", required: true },
        { name: "totalAmount", label: "Estimasi Nilai", type: "number" as const, required: true },
        { name: "expectedDate", label: "Tanggal Estimasi" },
        { name: "notes", label: "Catatan", type: "textarea" as const },
      ];
    }
    return [
      { name: "supplierName", label: "Supplier", required: true },
      { name: "itemName", label: "Item", required: true },
      { name: "batchNumber", label: "Batch" },
      { name: "quantityReceived", label: "Jumlah Diterima", type: "number" as const, required: true },
      { name: "unit", label: "Satuan" },
      { name: "unitCost", label: "Harga Satuan", type: "number" as const },
    ];
  }, [kind]);

  const rows = useMemo<ModuleRow[]>(() => {
    if (kind === "membership") {
      return (membership.data || [])
        .filter((item) => `${item.name} ${item.level} ${item.benefit || ""}`.toLowerCase().includes(search.toLowerCase()))
        .map((item) => ({
        key: item.id,
        cells: [item.name, item.level.toUpperCase(), item.benefit || "-", `${item.pointMultiplier}x`],
        action: (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
              onClick={() => {
                setEditing({
                  id: String(item.id),
                  name: item.name,
                  level: item.level,
                  benefit: item.benefit || "",
                  pointMultiplier: String(item.pointMultiplier),
                  minSpend: String(item.minSpend),
                });
                setOpen(true);
              }}
            >
              <Edit2 size={14} /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/25 text-red-300 hover:bg-red-500/10"
              onClick={() => deleteMembership.mutate({ id: item.id })}
            >
              <Trash2 size={14} /> Hapus
            </Button>
          </div>
        ),
      }));
    }
    if (kind === "purchase-order") {
      return (purchaseOrders.data || [])
        .filter((item) => !statusFilter || item.status === statusFilter)
        .filter((item) => `${item.poNumber} ${item.supplierName} ${item.status}`.toLowerCase().includes(search.toLowerCase()))
        .map((item) => ({
        key: item.id,
        cells: [item.poNumber, item.supplierName, `Rp${Number(item.totalAmount).toLocaleString("id-ID")}`, item.status],
        action: (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
              onClick={() => {
                setEditing({
                  id: String(item.id),
                  supplierName: item.supplierName,
                  totalAmount: String(item.totalAmount),
                  expectedDate: item.expectedDate ? new Date(item.expectedDate).toISOString().slice(0, 10) : "",
                  notes: item.notes || "",
                });
                setOpen(true);
              }}
            >
              <Edit2 size={14} /> Edit
            </Button>
            {item.status === "pending_approval" && user?.role === "owner" && (
              <Button size="sm" className="btn-primary-gold rounded-lg" onClick={() => approvePurchaseOrder.mutate({ id: item.id })}>
                Approve
              </Button>
            )}
            {!["cancelled", "received"].includes(item.status) && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/25 text-red-300 hover:bg-red-500/10"
                onClick={() => cancelPurchaseOrder.mutate({ id: item.id })}
              >
                <XCircle size={14} /> Cancel
              </Button>
            )}
          </div>
        ),
      }));
    }
    return (receiving.data || [])
      .filter((item) => !statusFilter || item.status === statusFilter)
      .filter((item) => `${item.receivingNumber} ${item.supplierName} ${item.itemName} ${item.status}`.toLowerCase().includes(search.toLowerCase()))
      .map((item) => ({
      key: item.id,
      cells: [item.receivingNumber, item.itemName, `${item.quantityReceived} ${item.unit}`, item.status],
      action: (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
            onClick={() => {
              setEditing({
                id: String(item.id),
                supplierName: item.supplierName,
                itemName: item.itemName,
                batchNumber: item.batchNumber || "",
                quantityReceived: String(item.quantityReceived),
                unit: item.unit,
                unitCost: "",
                notes: item.notes || "",
              });
              setOpen(true);
            }}
          >
            <Edit2 size={14} /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/25 text-red-300 hover:bg-red-500/10"
            onClick={() => deleteReceiving.mutate({ id: item.id })}
          >
            <Trash2 size={14} /> Hapus
          </Button>
        </div>
      ),
    }));
  }, [approvePurchaseOrder, cancelPurchaseOrder, deleteMembership, deleteReceiving, kind, membership.data, purchaseOrders.data, receiving.data, search, statusFilter, user?.role]);

  const isLoading = membership.isLoading || purchaseOrders.isLoading || receiving.isLoading;
  const pagedRows = rows.slice(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4A853]">
            Enterprise Module
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">{page.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
            {page.description}
          </p>
        </div>
        <Button onClick={openCreate} className="w-full btn-primary-gold rounded-xl sm:w-auto">
          {page.action}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_180px]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPageNumber(0); }}
            placeholder={`Cari ${page.title.toLowerCase()}...`}
            className="pl-10 h-10 bg-white/[0.04] border-white/[0.07] rounded-xl text-white placeholder:text-white/40"
          />
        </div>
        {kind !== "membership" && (
          <ThemedSelect
            value={statusFilter}
            onValueChange={(value) => { setStatusFilter(value); setPageNumber(0); }}
            options={kind === "purchase-order" ? [
              { value: "", label: "Semua status" },
              { value: "pending_approval", label: "Pending approval" },
              { value: "approved", label: "Approved" },
              { value: "ordered", label: "Ordered" },
              { value: "received", label: "Received" },
              { value: "cancelled", label: "Cancelled" },
            ] : [
              { value: "", label: "Semua status" },
              { value: "draft", label: "Draft" },
              { value: "checked", label: "Checked" },
              { value: "posted", label: "Posted" },
            ]}
          />
        )}
      </div>

      <div className="card-glass overflow-hidden rounded-2xl">
        <div className="border-b border-white/[0.07] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4A853]/10">
              <Icon size={20} className="text-[#D4A853]" />
            </div>
            <h3 className="text-base font-semibold text-white">Data Operasional</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
                <th className="px-4 py-3 text-left">Referensi</th>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Keterangan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/45">Memuat data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/45">Belum ada data.</td></tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.key} className="border-b border-white/[0.04]">
                    {row.cells.map((value, index) => (
                      <td key={`${row.key}-${index}`} className="px-4 py-3 text-sm text-white/72">
                        {value}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">{row.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={pageNumber}
          pageSize={PAGE_SIZE}
          itemCount={pagedRows.length}
          hasNext={(pageNumber + 1) * PAGE_SIZE < rows.length}
          onPageChange={setPageNumber}
          label="data"
        />
      </div>

      <QuickFormDialog
        open={open}
        title={editing ? `Edit ${page.title}` : page.action}
        fields={fields}
        initialValues={editing ?? undefined}
        submitLabel={editing ? "Update" : "Simpan"}
        onOpenChange={setOpen}
        onSubmit={(values) => {
          if (kind === "membership") {
            const payload = {
              name: values.name,
              level: values.level as "silver" | "gold" | "platinum",
              benefit: values.benefit,
              pointMultiplier: values.pointMultiplier || "1.00",
              minSpend: values.minSpend || "0.00",
            };
            if (editing) updateMembership.mutate({ id: Number(editing.id), ...payload });
            else createMembership.mutate(payload);
          } else if (kind === "purchase-order") {
            const payload = {
              supplierName: values.supplierName,
              totalAmount: values.totalAmount || "0.00",
              expectedDate: values.expectedDate || undefined,
              notes: values.notes || undefined,
            };
            if (editing) updatePurchaseOrder.mutate({ id: Number(editing.id), ...payload });
            else createPurchaseOrder.mutate(payload);
          } else {
            const payload = {
              supplierName: values.supplierName,
              itemName: values.itemName,
              batchNumber: values.batchNumber || undefined,
              quantityReceived: Number(values.quantityReceived || 0),
              unit: values.unit || "pcs",
              ...(values.unitCost ? { unitCost: values.unitCost } : {}),
            };
            if (editing) updateReceiving.mutate({ id: Number(editing.id), ...payload });
            else createReceiving.mutate(payload);
          }
        }}
      />
    </div>
  );
}
