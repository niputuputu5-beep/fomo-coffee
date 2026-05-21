import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  itemCount: number;
  hasNext?: boolean;
  onPageChange: (page: number) => void;
  label?: string;
};

export function PaginationControls({
  page,
  pageSize,
  itemCount,
  hasNext,
  onPageChange,
  label = "data",
}: PaginationControlsProps) {
  const nextEnabled = hasNext ?? itemCount >= pageSize;

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-white/45">
        Halaman {page + 1} • {itemCount} {label} ditampilkan
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(page - 1, 0))}
          className="border-white/[0.08] text-white/70"
        >
          <ChevronLeft size={14} className="mr-1" /> Sebelumnya
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!nextEnabled}
          onClick={() => onPageChange(page + 1)}
          className="border-white/[0.08] text-white/70"
        >
          Berikutnya <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
