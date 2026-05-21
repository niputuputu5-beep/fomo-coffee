import { useAuth } from "@/hooks/useAuth";
import { UserCircle, Mail, Shield, Clock, Edit3, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { QuickFormDialog } from "@/components/QuickFormDialog";
import { trpc } from "@/providers/trpc";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      await refresh();
      setEditOpen(false);
      toast.success("Profil diperbarui.");
    },
    onError: (error) => toast.error(error.message),
  });
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setPasswordOpen(false);
      toast.success("Password berhasil diganti.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card-glass rounded-2xl p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-[#D4A853] flex items-center justify-center text-black text-3xl font-bold mx-auto mb-4">
          {(user?.name || "U").charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{user?.name || "User"}</h2>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A853]/10 text-[#D4A853] text-xs font-semibold capitalize">
          <Shield size={12} />
          {user?.role || "cashier"}
        </span>

        <div className="mt-8 space-y-4 text-left">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04]">
            <Mail size={18} className="text-white/40" />
            <div>
              <p className="text-xs text-white/40">Email</p>
              <p className="text-sm text-white">{user?.email || "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04]">
            <UserCircle size={18} className="text-white/40" />
            <div>
              <p className="text-xs text-white/40">Username</p>
              <p className="text-sm text-white font-mono">{user?.username || "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04]">
            <Shield size={18} className="text-white/40" />
            <div>
              <p className="text-xs text-white/40">Role</p>
              <p className="text-sm text-white capitalize">{user?.role || "cashier"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04]">
            <Clock size={18} className="text-white/40" />
            <div>
              <p className="text-xs text-white/40">Last Login</p>
              <p className="text-sm text-white">{user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString("id-ID") : "-"}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-center">
          <Button onClick={() => setEditOpen(true)} variant="outline" className="border-white/[0.07] text-white/70 hover:bg-white/[0.06] rounded-xl">
            <Edit3 size={16} className="mr-2" /> Edit Profil
          </Button>
          <Button onClick={() => setPasswordOpen(true)} variant="outline" className="border-white/[0.07] text-white/70 hover:bg-white/[0.06] rounded-xl">
            <KeyRound size={16} className="mr-2" /> Ganti Password
          </Button>
        </div>
      </div>
      <QuickFormDialog
        open={editOpen}
        title="Edit Profil"
        fields={[
          { name: "name", label: "Nama", required: true },
          { name: "email", label: "Email", type: "email" },
        ]}
        initialValues={{ name: user?.name || "", email: user?.email || "" }}
        onOpenChange={setEditOpen}
        onSubmit={(values) => updateProfile.mutate({ name: values.name, email: values.email })}
      />
      <QuickFormDialog
        open={passwordOpen}
        title="Ganti Password"
        fields={[
          { name: "currentPassword", label: "Password Lama", type: "password", required: true },
          { name: "newPassword", label: "Password Baru", type: "password", required: true },
        ]}
        onOpenChange={setPasswordOpen}
        onSubmit={(values) =>
          changePassword.mutate({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          })
        }
      />
    </div>
  );
}
