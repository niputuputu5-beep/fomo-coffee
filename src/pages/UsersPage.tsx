import { useState } from "react";
import { CheckCircle2, KeyRound, Plus, Shield, UserCog, XCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { toast } from "sonner";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 15;

export default function UsersPage() {
  const [open, setOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<number | null>(null);
  const [resetRequest, setResetRequest] = useState<{ requestId: number; userId: number } | null>(null);
  const [page, setPage] = useState(0);
  const { data: users, refetch } = trpc.user.list.useQuery();
  const { data: resetRequests = [], refetch: refetchResetRequests } = trpc.user.passwordResetRequests.useQuery();
  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      refetch();
      setOpen(false);
      toast.success("User berhasil dibuat.");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status user diperbarui.");
    },
    onError: (error) => toast.error(error.message),
  });
  const resetPassword = trpc.user.resetPassword.useMutation({
    onSuccess: () => {
      setResetTarget(null);
      setResetRequest(null);
      refetchResetRequests();
      toast.success("Password user direset.");
    },
    onError: (error) => toast.error(error.message),
  });
  const rejectReset = trpc.user.rejectPasswordReset.useMutation({
    onSuccess: () => {
      refetchResetRequests();
      toast.success("Permintaan reset ditolak.");
    },
    onError: (error) => toast.error(error.message),
  });
  const visibleUsers = (users || []).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pendingResetRequests = resetRequests.filter((request) => request.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4A853]">
            Owner Control
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">User Management</h2>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full btn-primary-gold rounded-xl sm:w-auto">
          <Plus size={16} className="mr-2" /> Tambah User
        </Button>
      </div>

      <div className="card-glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => {
              const userId = Number(user.id);
              return (
              <tr key={userId} className="border-b border-white/[0.04]">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/45">{user.username} · {user.email || "-"}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#D4A853]/10 px-2 py-1 text-xs capitalize text-[#D4A853]">
                    <Shield size={12} /> {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={user.status === "active" ? "text-sm text-green-400" : "text-sm text-red-400"}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateUser.mutate({
                          id: userId,
                          status: user.status === "active" ? "inactive" : "active",
                        })
                      }
                      className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                    >
                      <UserCog size={14} className="mr-1" /> Toggle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResetTarget(userId)}
                      className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
                    >
                      <KeyRound size={14} className="mr-1" /> Reset
                    </Button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        </div>
        <PaginationControls
          page={page}
          pageSize={PAGE_SIZE}
          itemCount={visibleUsers.length}
          hasNext={(page + 1) * PAGE_SIZE < (users || []).length}
          onPageChange={setPage}
          label="user"
        />
      </div>

      <div className="card-glass overflow-hidden rounded-2xl">
        <div className="border-b border-white/[0.07] p-4">
          <h3 className="text-base font-semibold text-white">Permintaan Reset Password</h3>
          <p className="mt-1 text-xs text-white/45">Request dari halaman Forgot Password yang menunggu keputusan owner.</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wider text-white/50">
              <th className="px-4 py-3 text-left">Username</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pendingResetRequests.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-white/45">Tidak ada request pending.</td>
              </tr>
            ) : (
              pendingResetRequests.map((request) => (
                <tr key={request.id} className="border-b border-white/[0.04] text-sm text-white/70">
                  <td className="px-4 py-3">{request.username}</td>
                  <td className="px-4 py-3">{request.email}</td>
                  <td className="px-4 py-3">{new Date(request.requestedAt).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {request.userId ? (
                        <Button
                          size="sm"
                          className="btn-primary-gold"
                          onClick={() => setResetRequest({ requestId: Number(request.id), userId: Number(request.userId) })}
                        >
                          <CheckCircle2 size={14} className="mr-1" /> Reset
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectReset.mutate({ id: Number(request.id) })}
                        className="border-red-500/25 text-red-300 hover:bg-red-500/10"
                      >
                        <XCircle size={14} className="mr-1" /> Tolak
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <QuickFormDialog
        open={open}
        title="Tambah User"
        fields={[
          { name: "username", label: "Username", required: true },
          { name: "password", label: "Password", type: "password", required: true },
          { name: "name", label: "Nama", required: true },
          { name: "email", label: "Email", type: "email" },
          { name: "role", label: "Role (owner/admin/cashier)", required: true },
        ]}
        initialValues={{ role: "cashier", password: "password123" }}
        onOpenChange={setOpen}
        onSubmit={(values) =>
          createUser.mutate({
            username: values.username,
            password: values.password,
            name: values.name,
            email: values.email,
            role: values.role as "owner" | "admin" | "cashier",
          })
        }
      />

      <QuickFormDialog
        open={resetTarget !== null || resetRequest !== null}
        title="Reset Password User"
        fields={[{ name: "password", label: "Password Baru", type: "password", required: true }]}
        initialValues={{ password: "password123" }}
        onOpenChange={(isOpen) => {
          if (!isOpen) setResetTarget(null);
          if (!isOpen) setResetRequest(null);
        }}
        onSubmit={(values) => {
          const userId = resetRequest?.userId ?? resetTarget;
          if (userId) {
            resetPassword.mutate({ id: userId, password: values.password, requestId: resetRequest?.requestId });
          }
        }}
      />
    </div>
  );
}
