import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Edit2,
  Filter,
  Package,
  RotateCcw,
  Search,
  Trash2,
  Warehouse,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { ThemedSelect } from "@/components/ThemedSelect";

const ADJUSTMENT_PAGE_SIZE = 12;
const ADJUSTMENT_QUERY_LIMIT = ADJUSTMENT_PAGE_SIZE + 1;
const INVENTORY_PAGE_SIZE = 20;

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  normal: { icon: CheckCircle, color: "text-green-700", bg: "bg-green-500/10", label: "Normal" },
  low: { icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-500/10", label: "Low" },
  out_of_stock: { icon: XCircle, color: "text-red-700", bg: "bg-red-500/10", label: "Habis" },
  expired: { icon: XCircle, color: "text-gray-700", bg: "bg-gray-500/10", label: "Expired" },
};

type InventoryItem = {
  id: number;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  minStock: number;
  unitCost: string;
  totalValue: string;
  location: string | null;
  status: string;
  expiryDate?: Date | string | null;
};

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards" | "opname">("table");
  const [open, setOpen] = useState(false);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [adjustmentPage, setAdjustmentPage] = useState(0);
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState("");
  const [adjustmentInventoryId, setAdjustmentInventoryId] = useState("");
  const [opnameActuals, setOpnameActuals] = useState<Record<number, string>>({});
  const [opnameReasons, setOpnameReasons] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [opnameTarget, setOpnameTarget] = useState<InventoryItem | null>(null);

  const inventoryFilter = { ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) };
  const { data: items, refetch } = trpc.inventory.list.useQuery(Object.keys(inventoryFilter).length ? inventoryFilter : undefined);
  const adjustmentInput = {
    ...(adjustmentTypeFilter ? { type: adjustmentTypeFilter as "opname" | "adjustment" | "waste" | "transfer" } : {}),
    ...(adjustmentInventoryId ? { inventoryId: Number(adjustmentInventoryId) } : {}),
    limit: ADJUSTMENT_QUERY_LIMIT,
    offset: adjustmentPage * ADJUSTMENT_PAGE_SIZE,
  };
  const { data: adjustments, refetch: refetchAdjustments } = trpc.inventory.adjustmentHistory.useQuery(adjustmentInput);
  const visibleAdjustments = (adjustments || []).slice(0, ADJUSTMENT_PAGE_SIZE);

  const createItem = trpc.inventory.create.useMutation({
    onSuccess: () => {
      refetch();
      setOpen(false);
      toast.success("Item inventory ditambahkan");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateItem = trpc.inventory.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditing(null);
      toast.success("Item inventory diperbarui");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteItem = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Item inventory dinonaktifkan");
    },
    onError: (error) => toast.error(error.message),
  });
  const stockOpname = trpc.inventory.stockOpname.useMutation({
    onSuccess: () => {
      refetch();
      refetchAdjustments();
      setOpnameTarget(null);
      toast.success("Stok opname tersimpan.");
    },
    onError: (error) => toast.error(error.message),
  });

  const allItems = useMemo(() => items || [], [items]);
  const locations = useMemo(
    () => Array.from(new Set(allItems.map((item) => item.location || "Main Warehouse"))).sort(),
    [allItems],
  );
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (locationFilter && (item.location || "Main Warehouse") !== locationFilter) return false;
      if (stockFilter === "below_min" && item.quantity > item.minStock) return false;
      if (stockFilter === "zero" && item.quantity > 0) return false;
      if (stockFilter === "value_high" && Number(item.totalValue) < 1000000) return false;
      return true;
    });
  }, [allItems, locationFilter, stockFilter]);
  const visibleItems = filteredItems.slice(inventoryPage * INVENTORY_PAGE_SIZE, (inventoryPage + 1) * INVENTORY_PAGE_SIZE);

  const summary = useMemo(() => {
    const totalValue = filteredItems.reduce((sum, item) => sum + Number(item.totalValue), 0);
    const lowCount = filteredItems.filter((item) => item.status === "low").length;
    const zeroCount = filteredItems.filter((item) => item.status === "out_of_stock").length;
    const needOpname = filteredItems.filter((item) => item.quantity <= item.minStock).length;
    return { totalValue, lowCount, zeroCount, needOpname };
  }, [filteredItems]);

  const adjustmentSummary = visibleAdjustments.reduce(
    (current, item) => ({
      plus: current.plus + (item.difference > 0 ? item.difference : 0),
      minus: current.minus + (item.difference < 0 ? Math.abs(item.difference) : 0),
      value: current.value + Number(item.valueDifference),
    }),
    { plus: 0, minus: 0, value: 0 },
  );

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(price));
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setLocationFilter("");
    setStockFilter("");
    setInventoryPage(0);
  };

  const handleAdd = (values: Record<string, string>) => {
    if (editing) {
      updateItem.mutate({
        id: editing.id,
        itemName: values.itemName,
        quantity: Number(values.quantity || 0),
        minStock: Number(values.minStock || 5),
        location: values.location || "Main Warehouse",
        unitCost: values.unitCost || "0",
      });
      return;
    }
    createItem.mutate({
      itemName: values.itemName,
      sku: values.sku || `INV-${Date.now().toString().slice(-6)}`,
      unit: values.unit || "pcs",
      quantity: Number(values.quantity || 0),
      minStock: Number(values.minStock || 5),
      location: values.location || "Main Warehouse",
      unitCost: values.unitCost || "0",
    });
  };

  const submitQuickOpname = (item: InventoryItem) => {
    const actualQuantity = Number(opnameActuals[item.id] ?? item.quantity);
    if (Number.isNaN(actualQuantity) || actualQuantity < 0) {
      toast.error("Stok aktual tidak valid.");
      return;
    }
    stockOpname.mutate({
      inventoryId: item.id,
      actualQuantity,
      reason: opnameReasons[item.id] || undefined,
    });
  };

  const renderStatus = (status: string) => {
    const config = statusConfig[status] || statusConfig.normal;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${config.bg} ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="card-glass rounded-2xl p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_160px_180px_170px]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Cari nama item atau SKU..."
                value={search}
                onChange={(event) => { setSearch(event.target.value); setInventoryPage(0); }}
                className="h-10 rounded-xl border-white/[0.07] bg-white/[0.04] pl-10 text-white placeholder:text-white/40"
              />
            </div>
            <ThemedSelect
              value={statusFilter}
              onValueChange={(value) => { setStatusFilter(value); setInventoryPage(0); }}
              options={[
                { value: "", label: "Semua status" },
                { value: "normal", label: "Normal" },
                { value: "low", label: "Low stock" },
                { value: "out_of_stock", label: "Habis" },
                { value: "expired", label: "Expired" },
              ]}
            />
            <ThemedSelect
              value={locationFilter}
              onValueChange={(value) => { setLocationFilter(value); setInventoryPage(0); }}
              options={[{ value: "", label: "Semua lokasi" }, ...locations.map((location) => ({ value: location, label: location }))]}
            />
            <ThemedSelect
              value={stockFilter}
              onValueChange={(value) => { setStockFilter(value); setInventoryPage(0); }}
              options={[
                { value: "", label: "Semua stok" },
                { value: "below_min", label: "Perlu dicek" },
                { value: "zero", label: "Stok nol" },
                { value: "value_high", label: "Nilai tinggi" },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetFilters} className="h-10 border-white/[0.07]">
              <RotateCcw size={15} className="mr-2" /> Reset
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-10 btn-primary-gold rounded-xl">
              <Package size={16} className="mr-2" /> Tambah Item
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: "table", label: "Tabel stok" },
            { key: "opname", label: "Opname cepat" },
            { key: "cards", label: "Kartu item" },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key as typeof viewMode)}
              className={`h-9 rounded-lg px-3 text-sm font-semibold ${viewMode === mode.key ? "bg-[#B77945] text-white" : "bg-white/[0.55] text-[#6F6156]"}`}
            >
              {mode.label}
            </button>
          ))}
          <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/[0.55] px-3 text-sm text-[#6F6156]">
            <Filter size={14} /> {filteredItems.length} item tampil
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="card-glass rounded-2xl p-4">
          <p className="text-xs text-white/45">Total item tampil</p>
          <p className="mt-1 text-2xl font-bold text-white">{filteredItems.length}</p>
        </div>
        <div className="card-glass rounded-2xl p-4">
          <p className="text-xs text-white/45">Perlu dicek</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{summary.needOpname}</p>
        </div>
        <div className="card-glass rounded-2xl p-4">
          <p className="text-xs text-white/45">Low / habis</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{summary.lowCount + summary.zeroCount}</p>
        </div>
        <div className="card-glass rounded-2xl p-4">
          <p className="text-xs text-white/45">Nilai stok tampil</p>
          <p className="mt-1 text-lg font-bold text-[#B77945]">{formatPrice(summary.totalValue)}</p>
        </div>
      </div>

      {viewMode === "table" && (
        <div className="card-glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Lokasi</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-right">Minimum</th>
                  <th className="px-4 py-3 text-right">Harga Satuan</th>
                  <th className="px-4 py-3 text-right">Nilai</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id} className="border-b border-white/[0.04] text-sm hover:bg-white/[0.35]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{item.itemName}</p>
                      <p className="font-mono text-xs text-white/40">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-white/65">{item.location || "Main Warehouse"}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-white/65">{item.minStock} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-white/65">{formatPrice(item.unitCost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#B77945]">{formatPrice(item.totalValue)}</td>
                    <td className="px-4 py-3 text-center">{renderStatus(item.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setOpnameTarget(item)} className="rounded-lg bg-white/[0.6] p-2 text-[#6F6156] hover:text-[#B77945]" title="Stok Opname">
                          <ClipboardCheck size={15} />
                        </button>
                        <button onClick={() => setEditing(item)} className="rounded-lg bg-white/[0.6] p-2 text-[#6F6156] hover:text-[#B77945]" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => deleteItem.mutate({ id: item.id })} className="rounded-lg bg-white/[0.6] p-2 text-[#6F6156] hover:text-red-600" title="Hapus">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={inventoryPage}
            pageSize={INVENTORY_PAGE_SIZE}
            itemCount={visibleItems.length}
            hasNext={(inventoryPage + 1) * INVENTORY_PAGE_SIZE < filteredItems.length}
            onPageChange={setInventoryPage}
            label="item"
          />
        </div>
      )}

      {viewMode === "opname" && (
        <div className="card-glass rounded-2xl p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Opname Cepat</h3>
              <p className="mt-1 text-xs text-white/45">Isi stok aktual hasil hitung fisik, sistem akan menghitung selisih sebelum disimpan.</p>
            </div>
            <Button variant="outline" onClick={() => { setOpnameActuals({}); setOpnameReasons({}); }} className="border-white/[0.07]">
              <RotateCcw size={14} className="mr-2" /> Reset input
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Sistem</th>
                  <th className="px-3 py-2 text-right">Aktual</th>
                  <th className="px-3 py-2 text-right">Selisih</th>
                  <th className="px-3 py-2 text-left">Catatan</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const actual = Number(opnameActuals[item.id] ?? item.quantity);
                  const difference = actual - item.quantity;
                  return (
                    <tr key={item.id} className="border-b border-white/[0.04] text-sm">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-white">{item.itemName}</p>
                        <p className="text-xs text-white/40">{item.sku} - {item.location || "Main Warehouse"}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          value={opnameActuals[item.id] ?? String(item.quantity)}
                          onChange={(event) => setOpnameActuals((current) => ({ ...current, [item.id]: event.target.value }))}
                          className="ml-auto h-9 w-28 rounded-lg border-white/[0.07] bg-white/[0.6] text-right"
                        />
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${difference < 0 ? "text-red-700" : difference > 0 ? "text-green-700" : "text-white/55"}`}>
                        {difference > 0 ? "+" : ""}{Number.isNaN(difference) ? "-" : difference}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          placeholder="Contoh: pecah, salah input, transfer..."
                          value={opnameReasons[item.id] || ""}
                          onChange={(event) => setOpnameReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                          className="h-9 rounded-lg border-white/[0.07] bg-white/[0.6]"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" onClick={() => submitQuickOpname(item)} disabled={stockOpname.isPending} className="btn-primary-gold">
                          Simpan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={inventoryPage}
            pageSize={INVENTORY_PAGE_SIZE}
            itemCount={visibleItems.length}
            hasNext={(inventoryPage + 1) * INVENTORY_PAGE_SIZE < filteredItems.length}
            onPageChange={setInventoryPage}
            label="item"
          />
        </div>
      )}

      {viewMode === "cards" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <div key={item.id} className="card-glass rounded-2xl p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.55]">
                    <Warehouse size={18} className="text-white/40" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">{item.itemName}</h3>
                    <p className="font-mono text-xs text-white/40">{item.sku}</p>
                  </div>
                </div>
                {renderStatus(item.status)}
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-3">
                <div><p className="text-[10px] uppercase text-white/40">Stok</p><p className="text-sm font-bold text-white">{item.quantity} {item.unit}</p></div>
                <div><p className="text-[10px] uppercase text-white/40">Min</p><p className="text-sm text-white/70">{item.minStock}</p></div>
                <div><p className="text-[10px] uppercase text-white/40">Nilai</p><p className="text-sm font-semibold text-[#B77945]">{formatPrice(item.totalValue)}</p></div>
              </div>
              <p className="mt-2 text-xs text-white/40">Lokasi: {item.location || "Main Warehouse"}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpnameTarget(item)} className="border-white/[0.07] text-white/70"><ClipboardCheck size={14} /></Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(item)} className="border-white/[0.07] text-white/70"><Edit2 size={14} /></Button>
                <Button size="sm" variant="outline" onClick={() => deleteItem.mutate({ id: item.id })} className="border-white/[0.07] text-white/70"><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
          <div className="lg:col-span-2 xl:col-span-3">
            <PaginationControls
              page={inventoryPage}
              pageSize={INVENTORY_PAGE_SIZE}
              itemCount={visibleItems.length}
              hasNext={(inventoryPage + 1) * INVENTORY_PAGE_SIZE < filteredItems.length}
              onPageChange={setInventoryPage}
              label="item"
            />
          </div>
        </div>
      )}

      <div className="card-glass rounded-2xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Riwayat Stok Opname</h3>
            <p className="mt-1 text-xs text-white/45">Sebelum = stok sistem, Aktual = hasil hitung fisik. Selisih dan nilai selisih otomatis tercatat untuk audit.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ThemedSelect
              value={adjustmentInventoryId}
              onValueChange={(value) => { setAdjustmentInventoryId(value); setAdjustmentPage(0); }}
              options={[{ value: "", label: "Semua item" }, ...allItems.map((item) => ({ value: String(item.id), label: item.itemName }))]}
            />
            <ThemedSelect
              value={adjustmentTypeFilter}
              onValueChange={(value) => { setAdjustmentTypeFilter(value); setAdjustmentPage(0); }}
              options={[
                { value: "", label: "Semua tipe" },
                { value: "opname", label: "Opname" },
                { value: "adjustment", label: "Adjustment" },
                { value: "waste", label: "Waste" },
                { value: "transfer", label: "Transfer" },
              ]}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/[0.5] p-3"><p className="text-xs text-white/45">Tambah halaman ini</p><p className="text-xl font-bold text-green-700">+{adjustmentSummary.plus}</p></div>
          <div className="rounded-xl bg-white/[0.5] p-3"><p className="text-xs text-white/45">Kurang halaman ini</p><p className="text-xl font-bold text-red-700">-{adjustmentSummary.minus}</p></div>
          <div className="rounded-xl bg-white/[0.5] p-3"><p className="text-xs text-white/45">Nilai selisih</p><p className="text-xl font-bold text-[#B77945]">{formatPrice(adjustmentSummary.value)}</p></div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Tipe</th>
                <th className="px-3 py-2 text-right">Sebelum</th>
                <th className="px-3 py-2 text-right">Aktual</th>
                <th className="px-3 py-2 text-right">Selisih</th>
                <th className="px-3 py-2 text-right">Nilai</th>
                <th className="px-3 py-2 text-left">Alasan</th>
                <th className="px-3 py-2 text-left">User</th>
              </tr>
            </thead>
            <tbody>
              {visibleAdjustments.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-white/45">Belum ada riwayat untuk filter ini.</td></tr>
              ) : visibleAdjustments.map((adjustment) => (
                <tr key={adjustment.id} className="border-b border-white/[0.04] text-sm text-white/65">
                  <td className="px-3 py-2">{new Date(adjustment.createdAt).toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 font-medium text-white">{adjustment.itemName}</td>
                  <td className="px-3 py-2 capitalize">{adjustment.type}</td>
                  <td className="px-3 py-2 text-right">{adjustment.previousQuantity}</td>
                  <td className="px-3 py-2 text-right">{adjustment.actualQuantity}</td>
                  <td className={`px-3 py-2 text-right font-bold ${adjustment.difference < 0 ? "text-red-700" : adjustment.difference > 0 ? "text-green-700" : ""}`}>{adjustment.difference}</td>
                  <td className="px-3 py-2 text-right">{formatPrice(adjustment.valueDifference)}</td>
                  <td className="px-3 py-2">{adjustment.reason || "-"}</td>
                  <td className="px-3 py-2">{adjustment.createdByName || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={adjustmentPage}
          pageSize={ADJUSTMENT_PAGE_SIZE}
          itemCount={visibleAdjustments.length}
          hasNext={(adjustments || []).length > ADJUSTMENT_PAGE_SIZE}
          onPageChange={setAdjustmentPage}
          label="riwayat"
        />
      </div>

      <QuickFormDialog
        open={open || editing !== null}
        title={editing ? "Edit Item Inventory" : "Tambah Item Inventory"}
        fields={[
          { name: "itemName", label: "Nama Item", required: true },
          { name: "sku", label: "SKU" },
          { name: "unit", label: "Satuan" },
          { name: "quantity", label: "Jumlah", type: "number" },
          { name: "minStock", label: "Stok Minimum", type: "number" },
          { name: "unitCost", label: "Harga Satuan", type: "number" },
          { name: "location", label: "Lokasi" },
        ]}
        initialValues={editing ? {
          itemName: editing.itemName,
          sku: editing.sku,
          unit: editing.unit,
          quantity: String(editing.quantity),
          minStock: String(editing.minStock),
          unitCost: editing.unitCost,
          location: editing.location || "Main Warehouse",
        } : { unit: "pcs", quantity: "10", minStock: "5", unitCost: "10000", location: "Main Warehouse" }}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        onSubmit={handleAdd}
      />
      <QuickFormDialog
        open={opnameTarget !== null}
        title={`Stok Opname ${opnameTarget?.itemName || ""}`}
        fields={[
          { name: "systemQuantity", label: "Stok Sistem", type: "number" },
          { name: "actualQuantity", label: "Stok Aktual Hasil Hitung", type: "number", required: true },
          { name: "reason", label: "Alasan / Catatan Selisih", type: "textarea" },
        ]}
        initialValues={{ systemQuantity: String(opnameTarget?.quantity ?? 0), actualQuantity: String(opnameTarget?.quantity ?? 0) }}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOpnameTarget(null);
        }}
        onSubmit={(values) => {
          if (!opnameTarget) return;
          stockOpname.mutate({
            inventoryId: opnameTarget.id,
            actualQuantity: Number(values.actualQuantity || 0),
            reason: values.reason || undefined,
          });
        }}
      />
    </div>
  );
}
