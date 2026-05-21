import { useState } from "react";
import { Link } from "react-router";
import { KeyRound } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const resetPassword = trpc.auth.resetPassword.useMutation();

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm border-[#E7DED3] bg-white shadow-[0_18px_60px_rgba(42,33,28,0.12)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#B77945]/10">
            <KeyRound className="text-[#B77945]" size={22} />
          </div>
          <CardTitle>Reset Password</CardTitle>
          <p className="text-sm leading-6 text-[#6F6156]">
            Masukkan username dan email akun. Owner akan memverifikasi permintaan reset password.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              resetPassword.mutate({ username, email });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Akun</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {resetPassword.error ? (
              <p className="text-sm font-medium text-destructive">{resetPassword.error.message}</p>
            ) : null}
            {resetPassword.data ? (
              <p className="text-sm font-medium text-[#4F7B42]">Permintaan reset diterima. Hubungi Owner untuk proses berikutnya.</p>
            ) : null}
            <Button className="w-full" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Memproses..." : "Kirim Permintaan Reset"}
            </Button>
            <Link to="/login" className="block text-center text-xs text-[#7E6F63] hover:text-[#B77945]">
              Kembali ke login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
