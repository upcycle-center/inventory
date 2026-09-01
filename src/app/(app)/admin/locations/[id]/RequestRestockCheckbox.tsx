"use client";

import { useTransition } from "react";
import { toggleRestockRequest } from "./actions";

export function RequestRestockCheckbox({
  locationId,
  productId,
  requested,
}: {
  locationId: string;
  productId: string;
  requested: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      defaultChecked={requested}
      disabled={isPending}
      title="Add to the Restock Requests queue"
      onChange={(e) => {
        const next = e.currentTarget.checked;
        startTransition(async () => {
          await toggleRestockRequest(locationId, productId, next);
        });
      }}
      className="h-4 w-4"
    />
  );
}
