"use client";

import { forwardRef, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export const ActionForm = forwardRef<
  HTMLFormElement,
  {
    action: (formData: FormData) => Promise<unknown> | void;
    children: ReactNode;
    className?: string;
    savedLabel?: string;
    id?: string;
    encType?: string;
    // For an "Add X" form that should clear itself and be ready for the
    // next entry once saved -- never set on an edit form, where resetting
    // to defaultValue would visibly undo the save just made.
    resetOnSuccess?: boolean;
    // For a standalone "edit" page meant to close and return once saved,
    // rather than stay open -- navigates back through browser history.
    // Has no effect when the action itself redirects (that takes over).
    backOnSuccess?: boolean;
    // Fires on every status change -- lets a page show the saved/error
    // indicator somewhere other than right after this form (e.g. next
    // to an external submit button living elsewhere on the page).
    onStatusChange?: (status: "idle" | "saved" | "error", message?: string) => void;
    // Suppresses this form's own inline indicator -- pair with
    // onStatusChange when the page renders the indicator itself.
    hideStatus?: boolean;
  }
>(function ActionForm(
  { action, children, className, savedLabel = "Saved", id, encType, resetOnSuccess = false, backOnSuccess = false, onStatusChange, hideStatus = false },
  ref
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <form
      ref={(node) => {
        formRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as { current: HTMLFormElement | null }).current = node;
      }}
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
              onStatusChange?.("error", returnedError);
            } else {
              setStatus("saved");
              onStatusChange?.("saved");
              if (resetOnSuccess) formRef.current?.reset();
              if (backOnSuccess) {
                router.back();
                return;
              }
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
            onStatusChange?.("error");
          }
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setStatus("idle");
            onStatusChange?.("idle");
          }, 4000);
        });
      }}
    >
      {children}
      {!hideStatus && isPending && <span className="ml-2 align-middle text-xs text-gray-400">Saving…</span>}
      {!hideStatus && !isPending && status === "saved" && (
        <span className="ml-2 align-middle text-xs font-medium text-green-600">✓ {savedLabel}</span>
      )}
      {!hideStatus && !isPending && status === "error" && (
        <span className="ml-2 align-middle text-xs font-medium text-red-600">{errorMessage ?? "Something went wrong"}</span>
      )}
    </form>
  );
});
