import { trpc } from "@/providers/trpc";
import { Grid3X3, Coffee, Milk, Croissant, Sparkles, Snowflake, Plus, Edit2, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { useState } from "react";
import { PaginationControls } from "@/components/PaginationControls";

const catIcons: Record<string, any> = { Espresso: Coffee, "Latte & Milk": Milk, Pastry: Croissant, Seasonal: Sparkles, "Cold Brew": Snowflake };
const PAGE_SIZE = 12;

export default function CategoriesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ id: number; name: string; slug: string; description?: string | null } | null>(null);
  const { data: categories, refetch } = trpc.category.list.useQuery();
  const createCategory = trpc.category.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Kategori ditambahkan"); }, onError: (error) => toast.error(error.message) });
  const updateCategory = trpc.category.update.useMutation({ onSuccess: () => { refetch(); setEditing(null); toast.success("Kategori diperbarui"); }, onError: (error) => toast.error(error.message) });
  const deleteCategory = trpc.category.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Kategori dinonaktifkan"); }, onError: (error) => toast.error(error.message) });

  const handleAdd = (values: Record<string, string>) => {
    const name = values.name;
    if (editing) {
      updateCategory.mutate({
        id: editing.id,
        name,
        slug: (values.slug || name).toLowerCase().trim().replace(/\s+/g, "-"),
        description: values.description || "Kategori",
      });
      return;
    }
    createCategory.mutate({
      name,
      slug: (values.slug || name).toLowerCase().trim().replace(/\s+/g, "-"),
      description: values.description || "Kategori baru",
      icon: "Grid3X3",
      sortOrder: (categories?.length ?? 0) + 1,
    });
  };
  const filteredCategories = (categories || []).filter((cat) => `${cat.name} ${cat.slug} ${cat.description || ""}`.toLowerCase().includes(search.toLowerCase()));
  const visibleCategories = filteredCategories.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input placeholder="Cari kategori..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            className="pl-10 h-10 bg-white/[0.04] border-white/[0.07] rounded-xl text-white placeholder:text-white/40" />
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="w-full btn-primary-gold rounded-xl sm:w-auto">
          <Plus size={16} className="mr-2" /> Tambah Kategori
        </Button>
      </div>
      <h2 className="text-sm text-white/60">{filteredCategories.length} kategori tampil</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCategories.map((cat) => {
          const Icon = catIcons[cat.name] || Grid3X3;
          return (
            <div key={cat.id} className="card-glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-200 group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#D4A853]/10 flex items-center justify-center group-hover:bg-[#D4A853]/20 transition-colors">
                  <Icon size={24} className="text-[#D4A853]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{cat.name}</h3>
                  <p className="text-xs text-white/50">{cat.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.07]">
                <span className="text-xs text-white/40">Sort: {cat.sortOrder}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing(cat)} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-white"><Edit2 size={14} /></button>
                  <button onClick={() => deleteCategory.mutate({ id: cat.id })} className="rounded-lg bg-white/[0.06] p-2 text-white/55 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        itemCount={visibleCategories.length}
        hasNext={(page + 1) * PAGE_SIZE < filteredCategories.length}
        onPageChange={setPage}
        label="kategori"
      />
      <QuickFormDialog
        open={open || editing !== null}
        title={editing ? "Edit Kategori" : "Tambah Kategori"}
        fields={[
          { name: "name", label: "Nama Kategori", required: true },
          { name: "slug", label: "Slug" },
          { name: "description", label: "Deskripsi", type: "textarea" },
        ]}
        initialValues={editing ? { name: editing.name, slug: editing.slug, description: editing.description || "" } : undefined}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        onSubmit={handleAdd}
      />
    </div>
  );
}
