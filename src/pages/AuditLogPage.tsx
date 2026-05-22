import { trpc } from "@/providers/trpc";
import { Shield, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 20;
const QUERY_LIMIT = PAGE_SIZE + 1;

const actionColors: Record<string, string> = {
  create: "text-green-400",
  update: "text-blue-400",
  delete: "text-red-400",
  login: "text-purple-400",
  logout: "text-gray-400",
  void: "text-amber-400",
  refund: "text-orange-400",
  approve: "text-cyan-400",
};

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const { data: logs } = trpc.audit.list.useQuery({ limit: QUERY_LIMIT, offset: page * PAGE_SIZE });
  const visibleLogs = (logs || []).slice(0, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
          <Shield size={18} className="text-[#D4A853]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Audit Log</h2>
          <p className="text-xs text-white/50">Riwayat aktivitas sistem</p>
        </div>
      </div>

      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
              <th className="text-left py-3 px-4">Waktu</th>
              <th className="text-left py-3 px-4">User</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-left py-3 px-4">Aksi</th>
              <th className="text-left py-3 px-4">Entity</th>
              <th className="text-left py-3 px-4">Detail</th>
            </tr>
          </thead>
          <tbody>
            {visibleLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-white/40">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Belum ada log</p>
                </td>
              </tr>
            ) : (
              visibleLogs.map((log) => (
                <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-xs text-white/50">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("id-ID") : "-"}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-white font-medium">{log.userName || "-"}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-white/[0.06] text-white/70 px-2 py-1 rounded-md capitalize">{log.userRole || "-"}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold ${actionColors[log.action] || "text-white/60"}`}>{log.action}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-white/60">{log.entityType} #{log.entityId}</td>
                  <td className="py-3 px-4 text-xs text-white/40 max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details).slice(0, 50) : "-"}
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
          itemCount={visibleLogs.length}
          hasNext={(logs || []).length > PAGE_SIZE}
          onPageChange={setPage}
          label="log"
        />
      </div>
    </div>
  );
}
