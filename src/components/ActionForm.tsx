"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

export function ActionForm({
  action,
  children,
  className,
  savedLabel = "Saved",
  id,
  encType,
}: {
  action: (formData: FormData) => Promise<unknown> | void;
  children: ReactNode;
  className?: string;
  savedLabel?: string;
  id?: string;
  encType?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <form
      id={id}
      encType={encType}
      className={className}
      action={(formData) => {
        setStatus("idle");
        startTransition(async () => {
          try {
            await action(formData);
            setStatus("saved");
          } catch (err) {
            // Server Actions signal redirect()/notFound() via a thrown error
            // carrying a NEXT_REDIRECT/NEXT_NOT_FOUND digest — let Next.js
            // handle navigation instead of treating it as a failure.
            const digest = (err as { digest?: string } | null)?.digest;
            if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))) {
              throw err;
            }
            setStatus("error");
          }
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setStatus("idle"), 2500);
        });
      }}
    >
      {children}
      {isPending && <span className="ml-2 align-middle text-xs text-gray-400">Saving…</span>}
      {!isPending && status === "saved" && (
        <span className="ml-2 align-middle text-xs font-medium text-green-600">✓ {savedLabel}</span>
      )}
      {!isPending && status === "error" && (
        <span className="ml-2 align-middle text-xs font-medium text-red-600">Something went wrong</span>
      )}
    </form>
  );
}
