"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("This reset link is invalid or has expired. Request a new one from the sign-in page.");
      return;
    }

    router.push("/login?reset=success");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
    >
      <h1 className="mb-1 text-xl font-semibold">Set a new password</h1>
      <p className="mb-6 text-sm text-gray-500">Choose a new password for your account.</p>

      <label className="mb-1 block text-sm font-medium">New password</label>
      <input
        type="password"
        required
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <label className="mb-1 block text-sm font-medium">Confirm password</label>
      <input
        type="password"
        required
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
