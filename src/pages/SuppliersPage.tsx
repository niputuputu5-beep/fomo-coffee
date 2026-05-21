import { trpc } from "@/providers/trpc";
import { Truck, Phone, Mail, MapPin, Star, Plus, Edit2, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { useState } from "react";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 10;

export default function SuppliersPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ id: number; name: string; contactPerson?: string | null; phone?: string | null; email?: string | null; address?: string | null; paymentTerms?: string | null } | null>(null);
  const { data: suppliers, refetch } = trpc.supplier.list.useQuery(search ? { search } : undefined);
  const createSupplier = trpc.supplier.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Supplier ditambahkan"); }, onError: (error) => toast.error(error.message) });
  const updateSupplier = trpc.supplier.update.useMutation({ onSuccess: () => { refetch(); setEditing(null); toast.success("Supplier diperbarui"); }, onError: (error) => toast.error(error.message) });
  const deleteSupplier = trpc.supplier.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Supplier dinonaktifkan"); }, onError: (error) => toast.error(error.message) });

  const handleAdd = (values: Record<string, string>) => {
    if (editing) {
      updateSupplier.mutate({
        id: editing.id,
        name: values.name,
        contactPerson: values.contactPerson || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        paymentTerms: values.paymentTerms || "Net 30",
      });
      return;
    }
    createSupplier.mutate({
      name: values.name,
      contactPerson: values.contactPerson || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      paymentTerms: values.paymentTerms || "Net 30",
    });
  };
  const visibleSuppliers = (suppliers || []).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input placeholder="Cari supplier..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            className="pl-10 h-10 bg-white/[0.04] border-white/[0.07] rounded-xl text-white placeholder:text-white/40" />
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="w-full btn-primary-gold rounded-xl sm:w-auto">
          <Plus size={16} className="mr-2" /> Tambah Supplier
        </Button>
      </div>
      <h2 className="text-sm text-white/60">{suppliers?.length || 0} supplier terdaftar</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleSuppliers.map((supplier) => (
          <div key={supplier.id} className="card-glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
                <Truck size={22} className="text-[#D4A853]" />
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className={i < Math.round(Number(supplier.rating)) ? "text-[#D4A853] fill-[#D4A853]" : "text-white/20"} />
                ))}
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-white mb-1">{supplier.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => setEditing(supplier)} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-white"><Edit2 size={14} /></button>
                <button onClick={() => deleteSupplier.mutate({ id: supplier.id })} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-xs text-white/50 mb-3">{supplier.contactPerson}</p>
            <div className="space-y-1.5 text-xs text-white/50">
              {supplier.phone && <div className="flex items-center gap-2"><Phone size={12} />{supplier.phone}</div>}
              {supplier.email && <div className="flex items-center gap-2"><Mail size={12} />{supplier.email}</div>}
              {supplier.address && <div className="flex items-center gap-2"><MapPin size={12} className="shrink-0" /><span className="truncate">{supplier.address}</span></div>}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.07] pt-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-white/40">Payment: {supplier.paymentTerms || "Net 30"}</span>
              <span className="text-xs text-white/40">Hutang: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(supplier.debt))}</span>
            </div>
          </div>
        ))}
      </div>
      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        itemCount={visibleSuppliers.length}
        hasNext={(page + 1) * PAGE_SIZE < (suppliers || []).length}
        onPageChange={setPage}
        label="supplier"
      />
      <QuickFormDialog
        open={open || editing !== null}
        title={editing ? "Edit Supplier" : "Tambah Supplier"}
        fields={[
          { name: "name", label: "Nama Supplier", required: true },
          { name: "contactPerson", label: "Contact Person" },
          { name: "phone", label: "Telepon" },
          { name: "email", label: "Email", type: "email" },
          { name: "paymentTerms", label: "Termin Pembayaran" },
          { name: "address", label: "Alamat", type: "textarea" },
        ]}
        initialValues={editing ? {
          name: editing.name,
          contactPerson: editing.contactPerson || "",
          phone: editing.phone || "",
          email: editing.email || "",
          paymentTerms: editing.paymentTerms || "Net 30",
          address: editing.address || "",
        } : { paymentTerms: "Net 30" }}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        onSubmit={handleAdd}
      />
    </div>
  );
}
