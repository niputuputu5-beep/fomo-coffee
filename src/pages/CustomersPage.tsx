import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Search, UserPlus, Phone, Mail, Star, Crown, Gem, Award, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { ThemedSelect } from "@/components/ThemedSelect";

const PAGE_SIZE = 12;

const levelConfig: Record<string, { icon: any; color: string; bg: string }> = {
  bronze: { icon: Award, color: "text-amber-600", bg: "bg-amber-900/20" },
  silver: { icon: Star, color: "text-gray-300", bg: "bg-gray-700/20" },
  gold: { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10" },
  platinum: { icon: Gem, color: "text-cyan-400", bg: "bg-cyan-500/10" },
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ id: number; name: string; phone?: string | null; email?: string | null; membershipLevel: string; notes?: string | null } | null>(null);
  const customerFilter = { ...(search ? { search } : {}), ...(levelFilter ? { level: levelFilter } : {}) };
  const { data: customers, refetch } = trpc.customer.list.useQuery(Object.keys(customerFilter).length ? customerFilter : undefined);
  const createCustomer = trpc.customer.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Customer ditambahkan"); }, onError: (error) => toast.error(error.message) });
  const updateCustomer = trpc.customer.update.useMutation({ onSuccess: () => { refetch(); setEditing(null); toast.success("Customer diperbarui"); }, onError: (error) => toast.error(error.message) });
  const deleteCustomer = trpc.customer.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Customer dinonaktifkan"); }, onError: (error) => toast.error(error.message) });

  const handleAdd = (values: Record<string, string>) => {
    if (editing) {
      updateCustomer.mutate({
        id: editing.id,
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        membershipLevel: (values.membershipLevel || "bronze") as "bronze" | "silver" | "gold" | "platinum",
        notes: values.notes || undefined,
      });
      return;
    }
    createCustomer.mutate({
      name: values.name,
      phone: values.phone || undefined,
      email: values.email || undefined,
      membershipLevel: (values.membershipLevel || "bronze") as "bronze" | "silver" | "gold" | "platinum",
      notes: values.notes || undefined,
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(price));
  };
  const visibleCustomers = (customers || []).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full gap-2 sm:grid-cols-[minmax(180px,1fr)_160px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input placeholder="Cari customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-10 h-10 bg-white/[0.04] border-white/[0.07] rounded-xl text-white placeholder:text-white/40" />
          </div>
          <ThemedSelect
            value={levelFilter}
            onValueChange={(value) => { setLevelFilter(value); setPage(0); }}
            options={[
              { value: "", label: "Semua level" },
              { value: "bronze", label: "Bronze" },
              { value: "silver", label: "Silver" },
              { value: "gold", label: "Gold" },
              { value: "platinum", label: "Platinum" },
            ]}
          />
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="w-full btn-primary-gold rounded-xl sm:w-auto">
          <UserPlus size={16} className="mr-2" /> Tambah Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleCustomers.map((customer) => {
          const config = levelConfig[customer.membershipLevel] || levelConfig.bronze;
          const Icon = config.icon;
          return (
            <div key={customer.id} className="card-glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center`}>
                    <Icon size={20} className={config.color} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">{customer.name}</h3>
                    <span className={`text-xs font-medium capitalize ${config.color}`}>{customer.membershipLevel}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(customer)} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-white"><Edit2 size={14} /></button>
                  <button onClick={() => deleteCustomer.mutate({ id: customer.id })} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-2">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Phone size={12} />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Mail size={12} />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/[0.07]">
                <div className="text-center">
                  <p className="text-xs text-white/40">Points</p>
                  <p className="text-sm font-bold text-[#D4A853]">{customer.loyaltyPoints}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/40">Total</p>
                  <p className="text-sm font-bold text-white">{formatPrice(customer.totalSpent)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/40">Kunjungan</p>
                  <p className="text-sm font-bold text-white">{customer.visitCount}x</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        itemCount={visibleCustomers.length}
        hasNext={(page + 1) * PAGE_SIZE < (customers || []).length}
        onPageChange={setPage}
        label="customer"
      />
      <QuickFormDialog
        open={open || editing !== null}
        title={editing ? "Edit Customer" : "Tambah Customer"}
        fields={[
          { name: "name", label: "Nama Customer", required: true },
          { name: "phone", label: "Nomor Telepon" },
          { name: "email", label: "Email", type: "email" },
          { name: "membershipLevel", label: "Level (bronze/silver/gold/platinum)" },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        initialValues={editing ? {
          name: editing.name,
          phone: editing.phone || "",
          email: editing.email || "",
          membershipLevel: editing.membershipLevel,
          notes: editing.notes || "",
        } : { phone: "081234567899", membershipLevel: "bronze" }}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        onSubmit={handleAdd}
      />
    </div>
  );
}
