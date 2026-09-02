"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const genericError = "Invalid username or password.";

    const resolveRes = await fetch("/api/auth/resolve-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).catch(() => null);
    const { email } = (await resolveRes?.json().catch(() => ({ email: null }))) ?? { email: null };

    if (!email) {
      setLoading(false);
      setError(genericError);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(genericError);
      return;
    }

    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
    >
      <h1 className="mb-1 text-xl font-semibold">Venue Inventory</h1>
      <p className="mb-6 text-sm text-gray-500">Sign in to continue.</p>

      {searchParams.get("reset") === "success" && (
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Password updated. Sign in with your new password.
        </p>
      )}

      <label className="mb-1 block text-sm font-medium">Username</label>
      <input
        type="text"
        required
        autoComplete="username"
        autoCapitalize="none"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium">Password</label>
        <Link href="/forgot-password" className="text-xs text-brand hover:underline">
          Forgot password?
        </Link>
      </div>
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
