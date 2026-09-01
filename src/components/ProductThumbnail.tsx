"use client";

import { useState } from "react";
import { ProductPlaceholderIcon } from "@/components/ProductPlaceholderIcon";

export function ProductThumbnail({ photoUrl, alt }: { photoUrl: string | null; alt: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => photoUrl && setExpanded(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={alt} className="h-full w-full object-contain" />
        ) : (
          <ProductPlaceholderIcon />
        )}
      </button>

      {expanded && photoUrl && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(false)}
          onKeyDown={(e) => e.key === "Escape" && setExpanded(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={alt} className="max-h-[85vh] max-w-[85vw] rounded-md bg-white object-contain" />
        </div>
      )}
    </>
  );
}
