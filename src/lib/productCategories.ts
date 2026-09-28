// Alphabetical by name, with the Uncategorized catch-all always pinned
// last -- same convention as sortStorageAreas for the OTH catch-all.
export function sortCategoryGroups<T extends { id: string; name: string }>(groups: T[]): T[] {
  return [...groups].sort((a, b) => {
    if (a.id === "uncategorized") return 1;
    if (b.id === "uncategorized") return -1;
    return a.name.localeCompare(b.name);
  });
}
