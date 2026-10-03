"use client";

import { useMemo, useState } from "react";

export interface SearchableProduct {
  id: string;
  description: string;
}

// Type-to-search product picker for a long list a plain <select> makes
// unusable -- types a few letters, picks from the filtered matches. Sets
// a hidden <input name={name}> so it drops into a normal <form>/ActionForm
// exactly like a <select> would.
export function ProductSearchSelect({
  products,
  name,
  placeholder = "Type to search products…",
}: {
  products: SearchableProduct[];
  name: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchableProduct | null>(null);
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products.slice(0, 20);
    return products.filter((p) => p.description.toLowerCase().includes(term)).slice(0, 20);
  }, [products, query]);

  function choose(p: SearchableProduct) {
    setSelected(p);
    setQuery(p.description);
    setOpen(false);
  }

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (selected && value !== selected.description) setSelected(null);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full min-w-[16rem] overflow-y-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && !matches.length && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg">
          No matches.
        </div>
      )}
    </div>
  );
}
