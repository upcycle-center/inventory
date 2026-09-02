"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const resolveRes = await fetch("/api/auth/resolve-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).catch(() => null);
    const { email } = (await resolveRes?.json().catch(() => ({ email: null }))) ?? { email: null };

    if (email) {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    }

    // Same message either way — don't reveal whether the username exists.
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
    >
      <h1 className="mb-1 text-xl font-semibold">Reset password</h1>
      <p className="mb-6 text-sm text-gray-500">
        Enter your username and we&apos;ll email a reset link to the address on file.
      </p>

      {submitted ? (
        <p className="mb-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
          If that username exists, a password reset link has been sent to the email on file.
        </p>
      ) : (
        <>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </>
      )}

      <Link href="/login" className="mt-4 block text-center text-sm text-brand hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
