import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { ThemedSelect } from "@/components/ThemedSelect";

const PRODUCT_PAGE_SIZE = 20;
const ADDON_PAGE_SIZE = 10;
const PRODUCT_QUERY_LIMIT = PRODUCT_PAGE_SIZE + 1;
const ADDON_QUERY_LIMIT = ADDON_PAGE_SIZE + 1;

type EditableProduct = {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  basePrice: string;
  costPrice: string;
  memberPrice?: string | null;
  dineInPrice?: string | null;
  takeawayPrice?: string | null;
  minStock: number;
  description?: string | null;
  stockQuantity: number;
  isBestSeller: boolean;
  isFavorite: boolean;
  isSeasonal: boolean;
};

type EditableAddon = {
  id: number;
  name: string;
  sku: string;
  description?: string | null;
  price: string;
  costPrice: string;
  inventoryId?: number | null;
  inventoryName?: string | null;
  quantityUsed: string;
  unit: string;
  sortOrder: number;
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState("");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [productPage, setProductPage] = useState(0);
  const [addonPage, setAddonPage] = useState(0);
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);
  const [addonMode, setAddonMode] = useState<"add" | "edit" | null>(null);
  const [editingAddon, setEditingAddon] = useState<EditableAddon | null>(null);
  const productFilter = {
    ...(search ? { search } : {}),
    ...(categoryFilter ? { categoryId: Number(categoryFilter) } : {}),
    ...(flagFilter === "best" ? { isBestSeller: true } : {}),
    ...(flagFilter === "favorite" ? { isFavorite: true } : {}),
    limit: PRODUCT_QUERY_LIMIT,
    offset: productPage * PRODUCT_PAGE_SIZE,
  };
  const { data: products, refetch } = trpc.product.list.useQuery(productFilter);
  const visibleProducts = (products || []).slice(0, PRODUCT_PAGE_SIZE);
  const { data: categories } = trpc.category.list.useQuery();
  const { data: addons, refetch: refetchAddons } = trpc.product.listAddons.useQuery({ limit: ADDON_QUERY_LIMIT, offset: addonPage * ADDON_PAGE_SIZE });
  const visibleAddons = (addons || []).slice(0, ADDON_PAGE_SIZE);
  const createProduct = trpc.product.create.useMutation({ onSuccess: () => { refetch(); setFormMode(null); toast.success("Produk ditambahkan"); }, onError: (error) => toast.error(error.message) });
  const updateProduct = trpc.product.update.useMutation({ onSuccess: () => { refetch(); setFormMode(null); setEditingProduct(null); toast.success("Produk diperbarui"); }, onError: (error) => toast.error(error.message) });
  const deleteProduct = trpc.product.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Produk dihapus"); } });
  const createAddon = trpc.product.createAddon.useMutation({ onSuccess: () => { refetchAddons(); setAddonMode(null); toast.success("Add-on ditambahkan"); }, onError: (error) => toast.error(error.message) });
  const updateAddon = trpc.product.updateAddon.useMutation({ onSuccess: () => { refetchAddons(); setAddonMode(null); setEditingAddon(null); toast.success("Add-on diperbarui"); }, onError: (error) => toast.error(error.message) });
  const deleteAddon = trpc.product.deleteAddon.useMutation({ onSuccess: () => { refetchAddons(); toast.success("Add-on dinonaktifkan"); }, onError: (error) => toast.error(error.message) });

  const productFields = [
    { name: "name", label: "Nama Produk", required: true },
    { name: "sku", label: "SKU", required: true },
    { name: "categoryId", label: "Kategori ID", type: "number" as const, required: true },
    { name: "basePrice", label: "Harga", type: "number" as const, required: true },
    { name: "costPrice", label: "HPP Fallback", type: "number" as const },
    { name: "memberPrice", label: "Harga Member", type: "number" as const },
    { name: "dineInPrice", label: "Harga Dine In", type: "number" as const },
    { name: "takeawayPrice", label: "Harga Takeaway", type: "number" as const },
    { name: "stockQuantity", label: "Stok", type: "number" as const },
    { name: "minStock", label: "Stok Minimum", type: "number" as const },
    { name: "flags", label: "Flag (best,favorite,seasonal)" },
    { name: "description", label: "Deskripsi", type: "textarea" as const },
  ];

  const handleSubmit = (values: Record<string, string>) => {
    const flags = values.flags.toLowerCase();
    if (formMode === "edit" && editingProduct) {
      updateProduct.mutate({
        id: editingProduct.id,
        name: values.name,
        sku: values.sku,
        categoryId: Number(values.categoryId || 1),
        basePrice: values.basePrice,
        costPrice: values.costPrice || "0",
        memberPrice: values.memberPrice || undefined,
        dineInPrice: values.dineInPrice || undefined,
        takeawayPrice: values.takeawayPrice || undefined,
        stockQuantity: Number(values.stockQuantity || 0),
        minStock: Number(values.minStock || 5),
        isBestSeller: flags.includes("best"),
        isFavorite: flags.includes("favorite"),
        isSeasonal: flags.includes("seasonal"),
        description: values.description,
      });
      return;
    }

    createProduct.mutate({
      name: values.name,
      sku: values.sku || `PRD-${Date.now().toString().slice(-6)}`,
      categoryId: Number(values.categoryId || categories?.[0]?.id || 1),
      basePrice: values.basePrice,
      costPrice: values.costPrice || "0",
      memberPrice: values.memberPrice || undefined,
      dineInPrice: values.dineInPrice || undefined,
      takeawayPrice: values.takeawayPrice || undefined,
      stockQuantity: Number(values.stockQuantity || 20),
      minStock: Number(values.minStock || 5),
      isBestSeller: flags.includes("best"),
      isFavorite: flags.includes("favorite"),
      isSeasonal: flags.includes("seasonal"),
      image: "/products/cappuccino.jpg",
      description: values.description,
    });
  };

  const handleAddonSubmit = (values: Record<string, string>) => {
    const payload = {
      name: values.name,
      sku: values.sku || `ADD-${Date.now().toString().slice(-6)}`,
      description: values.description || undefined,
      price: values.price || "0",
      costPrice: values.costPrice || "0",
      inventoryId: values.inventoryId ? Number(values.inventoryId) : undefined,
      inventoryName: values.inventoryName || undefined,
      quantityUsed: values.quantityUsed || "0",
      unit: values.unit || "pcs",
      sortOrder: Number(values.sortOrder || 0),
    };
    if (addonMode === "edit" && editingAddon) updateAddon.mutate({ id: editingAddon.id, ...payload });
    else createAddon.mutate(payload);
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(price));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full gap-2 sm:grid-cols-[minmax(180px,1fr)_160px_150px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input placeholder="Cari produk / SKU..." value={search} onChange={(e) => { setSearch(e.target.value); setProductPage(0); }}
              className="pl-10 h-10 bg-white/[0.04] border-white/[0.07] rounded-xl text-white placeholder:text-white/40" />
          </div>
          <ThemedSelect
            value={categoryFilter}
            onValueChange={(value) => { setCategoryFilter(value); setProductPage(0); }}
            options={[{ value: "", label: "Semua kategori" }, ...(categories || []).map((category) => ({ value: String(category.id), label: category.name }))]}
          />
          <ThemedSelect
            value={flagFilter}
            onValueChange={(value) => { setFlagFilter(value); setProductPage(0); }}
            options={[
              { value: "", label: "Semua flag" },
              { value: "best", label: "Best seller" },
              { value: "favorite", label: "Favorite" },
            ]}
          />
        </div>
        <Button onClick={() => setFormMode("add")} className="w-full btn-primary-gold rounded-xl sm:w-auto">
          <Plus size={16} className="mr-2" /> Tambah Produk
        </Button>
      </div>

      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
              <th className="text-left py-3 px-4">Produk</th>
              <th className="text-left py-3 px-4">SKU</th>
              <th className="text-left py-3 px-4">Kategori</th>
              <th className="text-right py-3 px-4">Harga</th>
              <th className="text-right py-3 px-4">HPP</th>
              <th className="text-right py-3 px-4">Margin</th>
              <th className="text-right py-3 px-4">Stok</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => (
              <tr key={product.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img src={product.image || "/products/cappuccino.jpg"} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="max-w-[220px] truncate text-xs text-white/40">{product.description?.slice(0, 40)}...</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-white/60 font-mono">{product.sku}</td>
                <td className="py-3 px-4">
                  <span className="text-xs bg-white/[0.06] text-white/70 px-2 py-1 rounded-md">#{product.categoryId}</span>
                </td>
                <td className="py-3 px-4 text-right text-sm font-semibold text-[#D4A853]">{formatPrice(product.basePrice)}</td>
                <td className="py-3 px-4 text-right text-sm text-white/70">{formatPrice(product.costPrice)}</td>
                <td className="py-3 px-4 text-right text-sm text-green-400">
                  {Number(product.basePrice) > 0 ? (((Number(product.basePrice) - Number(product.costPrice)) / Number(product.basePrice)) * 100).toFixed(1) : "0.0"}%
                </td>
                <td className="py-3 px-4 text-right text-sm text-white/70">{product.stockQuantity}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {product.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditingProduct(product); setFormMode("edit"); }} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteProduct.mutate({ id: product.id })} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <PaginationControls
          page={productPage}
          pageSize={PRODUCT_PAGE_SIZE}
          itemCount={visibleProducts.length}
          hasNext={(products || []).length > PRODUCT_PAGE_SIZE}
          onPageChange={setProductPage}
          label="produk"
        />
      </div>

      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Add-ons POS</h3>
            <p className="text-xs text-white/45">Tambahan seperti extra shot, es batu, whipped cream, dan saus.</p>
          </div>
          <Button onClick={() => setAddonMode("add")} className="w-full btn-primary-gold rounded-xl sm:w-auto">
            <Plus size={16} className="mr-2" /> Tambah Add-on
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
                <th className="px-4 py-3 text-left">Add-on</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Inventory</th>
                <th className="px-4 py-3 text-right">Harga</th>
                <th className="px-4 py-3 text-right">Qty Pakai</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleAddons.map((addon) => (
                <tr key={addon.id} className="border-b border-white/[0.04] text-sm text-white/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{addon.name}</p>
                    <p className="text-xs text-white/40">{addon.description || "-"}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{addon.sku}</td>
                  <td className="px-4 py-3">{addon.inventoryName || "-"}</td>
                  <td className="px-4 py-3 text-right text-[#D4A853]">{formatPrice(addon.price)}</td>
                  <td className="px-4 py-3 text-right">{addon.quantityUsed} {addon.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingAddon(addon); setAddonMode("edit"); }} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteAddon.mutate({ id: addon.id })} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={addonPage}
          pageSize={ADDON_PAGE_SIZE}
          itemCount={visibleAddons.length}
          hasNext={(addons || []).length > ADDON_PAGE_SIZE}
          onPageChange={setAddonPage}
          label="add-on"
        />
      </div>
      <QuickFormDialog
        open={formMode !== null}
        title={formMode === "edit" ? "Edit Produk" : "Tambah Produk"}
        fields={productFields}
        initialValues={editingProduct ? {
          name: editingProduct.name,
          sku: editingProduct.sku,
          categoryId: String(editingProduct.categoryId),
          basePrice: editingProduct.basePrice,
          costPrice: editingProduct.costPrice,
          memberPrice: editingProduct.memberPrice ?? "",
          dineInPrice: editingProduct.dineInPrice ?? "",
          takeawayPrice: editingProduct.takeawayPrice ?? "",
          stockQuantity: String(editingProduct.stockQuantity),
          minStock: String(editingProduct.minStock),
          flags: [
            editingProduct.isBestSeller ? "best" : "",
            editingProduct.isFavorite ? "favorite" : "",
            editingProduct.isSeasonal ? "seasonal" : "",
          ].filter(Boolean).join(","),
          description: editingProduct.description ?? "",
        } : { sku: `PRD-${Date.now().toString().slice(-6)}`, categoryId: String(categories?.[0]?.id || 1), basePrice: "35000", costPrice: "0", stockQuantity: "20", minStock: "5" }}
        submitLabel={formMode === "edit" ? "Simpan Perubahan" : "Tambah Produk"}
        onOpenChange={(open) => {
          if (!open) {
            setFormMode(null);
            setEditingProduct(null);
          }
        }}
        onSubmit={handleSubmit}
      />
      <QuickFormDialog
        open={addonMode !== null}
        title={addonMode === "edit" ? "Edit Add-on" : "Tambah Add-on"}
        fields={[
          { name: "name", label: "Nama Add-on", required: true },
          { name: "sku", label: "SKU", required: true },
          { name: "price", label: "Harga Jual", type: "number" },
          { name: "costPrice", label: "HPP Manual", type: "number" },
          { name: "inventoryId", label: "Inventory ID", type: "number" },
          { name: "inventoryName", label: "Nama Inventory" },
          { name: "quantityUsed", label: "Qty Inventory Terpakai", type: "number" },
          { name: "unit", label: "Satuan" },
          { name: "sortOrder", label: "Urutan", type: "number" },
          { name: "description", label: "Deskripsi", type: "textarea" },
        ]}
        initialValues={editingAddon ? {
          name: editingAddon.name,
          sku: editingAddon.sku,
          price: editingAddon.price,
          costPrice: editingAddon.costPrice,
          inventoryId: editingAddon.inventoryId ? String(editingAddon.inventoryId) : "",
          inventoryName: editingAddon.inventoryName || "",
          quantityUsed: editingAddon.quantityUsed,
          unit: editingAddon.unit,
          sortOrder: String(editingAddon.sortOrder),
          description: editingAddon.description || "",
        } : { sku: `ADD-${Date.now().toString().slice(-6)}`, price: "5000", costPrice: "0", quantityUsed: "1", unit: "portion", sortOrder: String((addons?.length || 0) + 1) }}
        submitLabel={addonMode === "edit" ? "Simpan Add-on" : "Tambah Add-on"}
        onOpenChange={(open) => {
          if (!open) {
            setAddonMode(null);
            setEditingAddon(null);
          }
        }}
        onSubmit={handleAddonSubmit}
      />
    </div>
  );
}
