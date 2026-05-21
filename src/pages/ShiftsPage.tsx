import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Clock, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 20;
const QUERY_LIMIT = PAGE_SIZE + 1;

export default function ShiftsPage() {
  const [openingCash, setOpeningCash] = useState("");
  const [closingShift, setClosingShift] = useState<{
    id: number; openingCash: string; cashSales: string; cardSales: string; qrisSales: string; ewalletSales: string; transferSales: string; totalSales: string; cashIn: string; cashOut: string;
  } | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [page, setPage] = useState(0);
  const { data: shifts, refetch } = trpc.shift.list.useQuery({ limit: QUERY_LIMIT, offset: page * PAGE_SIZE });
  const visibleShifts = (shifts || []).slice(0, PAGE_SIZE);
  const openShift = trpc.shift.open.useMutation({
    onSuccess: (result) => {
      refetch();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Shift dibuka!");
      }
    },
  });
  const closeShift = trpc.shift.close.useMutation({
    onSuccess: () => {
      refetch();
      setClosingShift(null);
      setActualCash("");
      setClosingNotes("");
      toast.success("Shift ditutup!");
    },
    onError: (error) => toast.error(error.message),
  });

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(price));
  };

  const expectedCash = closingShift
    ? Number(closingShift.openingCash) + Number(closingShift.cashSales) + Number(closingShift.cashIn) - Number(closingShift.cashOut)
    : 0;
  const cashDifference = closingShift ? Number(actualCash || 0) - expectedCash : 0;

  return (
    <div className="space-y-6">
      {/* Open Shift */}
      <div className="card-glass rounded-2xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Unlock size={18} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Buka Shift</h3>
              <p className="text-xs text-white/50">Mulai shift kasir baru</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full btn-primary-gold rounded-xl sm:w-auto">
                <Unlock size={16} className="mr-2" /> Buka Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1E1E20] border-white/[0.07] text-white">
              <DialogHeader><DialogTitle>Buka Shift Baru</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Modal Awal (Rp)</label>
                  <Input value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="500000" className="bg-white/[0.04] border-white/[0.07] text-white" />
                </div>
                <Button onClick={() => openShift.mutate({ openingCash })} className="w-full btn-primary-gold rounded-xl">
                  Buka Shift
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Shift History */}
      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.07]">
          <h3 className="text-base font-semibold text-white">Riwayat Shift</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
              <th className="text-left py-3 px-4">Kasir</th>
              <th className="text-right py-3 px-4">Modal</th>
              <th className="text-right py-3 px-4">Total Sales</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Dibuka</th>
              <th className="text-right py-3 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleShifts.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-white/40"><Clock size={32} className="mx-auto mb-2" /><p>Belum ada shift</p></td></tr>
            ) : (
              visibleShifts.map((shift) => (
                <tr key={shift.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-sm text-white font-medium">{shift.userName}</td>
                  <td className="py-3 px-4 text-right text-sm text-white/70">{formatPrice(shift.openingCash)}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-[#D4A853]">{formatPrice(shift.totalSales)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${shift.status === "open" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>
                      {shift.status === "open" ? "Aktif" : "Selesai"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-white/40">
                    {shift.openedAt ? new Date(shift.openedAt).toLocaleString("id-ID") : "-"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {shift.status === "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setClosingShift(shift);
                          setActualCash((Number(shift.openingCash) + Number(shift.cashSales) + Number(shift.cashIn) - Number(shift.cashOut)).toFixed(2));
                        }}
                        className="border-white/[0.07] text-white/70 hover:bg-white/[0.06]"
                      >
                        <Lock size={14} className="mr-1" /> Tutup
                      </Button>
                    ) : (
                      <span className="text-xs text-white/35">Closed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <PaginationControls
          page={page}
          pageSize={PAGE_SIZE}
          itemCount={visibleShifts.length}
          hasNext={(shifts || []).length > PAGE_SIZE}
          onPageChange={setPage}
          label="shift"
        />
      </div>
      <Dialog open={closingShift !== null} onOpenChange={(open) => !open && setClosingShift(null)}>
        <DialogContent className="bg-[#1E1E20] border-white/[0.07] text-white">
          <DialogHeader><DialogTitle>Closing Shift</DialogTitle></DialogHeader>
          {closingShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-white/45">Cash Sistem</p>
                  <p className="font-bold text-white">{formatPrice(expectedCash.toFixed(2))}</p>
                </div>
                <div className={`rounded-xl p-3 ${cashDifference === 0 ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                  <p className="text-white/45">Selisih</p>
                  <p className="font-bold text-white">{formatPrice(cashDifference.toFixed(2))}</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">Cash Aktual di Laci</label>
                <Input value={actualCash} onChange={(event) => setActualCash(event.target.value)} className="bg-white/[0.04] border-white/[0.07] text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">Catatan Closing</label>
                <Input value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} placeholder="Opsional" className="bg-white/[0.04] border-white/[0.07] text-white" />
              </div>
              <Button
                onClick={() => closeShift.mutate({
                  id: closingShift.id,
                  closingCash: actualCash || "0",
                  cashSales: closingShift.cashSales,
                  cardSales: closingShift.cardSales,
                  qrisSales: closingShift.qrisSales,
                  ewalletSales: closingShift.ewalletSales,
                  transferSales: closingShift.transferSales,
                  totalSales: closingShift.totalSales,
                  cashIn: closingShift.cashIn,
                  cashOut: closingShift.cashOut,
                  cashDifference: cashDifference.toFixed(2),
                  notes: closingNotes || undefined,
                })}
                className="w-full btn-primary-gold rounded-xl"
              >
                Konfirmasi Tutup Shift
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
