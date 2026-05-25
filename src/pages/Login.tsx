import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/dashboard");
    },
  });

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm border-[#E7DED3] bg-white shadow-[0_18px_60px_rgba(42,33,28,0.12)]">
        <CardHeader className="text-center">
          <CardTitle>FOMO COFFEE Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              loginMutation.mutate({ username, password });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="off"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {loginMutation.error ? (
              <p className="text-sm text-destructive">
                {loginMutation.error.message}
              </p>
            ) : null}
            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
            <div className="flex items-center justify-between text-xs text-[#7E6F63]">
              <Link to="/" className="hover:text-[#B77945]">Landing page</Link>
              <Link to="/forgot-password" className="hover:text-[#B77945]">Forgot password</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
