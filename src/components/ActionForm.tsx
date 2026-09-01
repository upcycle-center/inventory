"use client";

import { forwardRef, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

export const ActionForm = forwardRef<
  HTMLFormElement,
  {
    action: (formData: FormData) => Promise<unknown> | void;
    children: ReactNode;
    className?: string;
    savedLabel?: string;
    id?: string;
    encType?: string;
  }
>(function ActionForm({ action, children, className, savedLabel = "Saved", id, encType }, ref) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <form
      ref={ref}
      id={id}
      encType={encType}
      className={className}
      action={(formData) => {
        setStatus("idle");
        setErrorMessage(null);
        startTransition(async () => {
          try {
            const result = await action(formData);
            // A Server Action can opt into an inline error message by
            // returning { error: string } instead of throwing — Next.js
            // redacts thrown Server Action error messages in production,
            // so a returned value is the only reliable way to surface one.
            const returnedError =
              result && typeof result === "object" && "error" in result
                ? (result as { error?: unknown }).error
                : null;
            if (typeof returnedError === "string" && returnedError) {
              setErrorMessage(returnedError);
              setStatus("error");
            } else {
              setStatus("saved");
            }
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
          timeoutRef.current = setTimeout(() => setStatus("idle"), 4000);
        });
      }}
    >
      {children}
      {isPending && <span className="ml-2 align-middle text-xs text-gray-400">Saving…</span>}
      {!isPending && status === "saved" && (
        <span className="ml-2 align-middle text-xs font-medium text-green-600">✓ {savedLabel}</span>
      )}
      {!isPending && status === "error" && (
        <span className="ml-2 align-middle text-xs font-medium text-red-600">{errorMessage ?? "Something went wrong"}</span>
      )}
    </form>
  );
});
