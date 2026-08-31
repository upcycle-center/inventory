import type { StorageArea } from "@/lib/supabase/types";

// Alphabetical by name, with the OTH (Other) catch-all always pinned last.
export function sortStorageAreas<T extends Pick<StorageArea, "code" | "name">>(areas: T[]): T[] {
  return [...areas].sort((a, b) => {
    if (a.code === "OTH") return 1;
    if (b.code === "OTH") return -1;
    return a.name.localeCompare(b.name);
  });
}
