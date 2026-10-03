"use client";

import { useState, useTransition } from "react";
import { RECIPE_SIZE_DEFS, recipeSizeLabel, type RecipeSizeKey } from "@/lib/recipeCost";
import { locationDisplayName } from "@/lib/locationLabel";
import type { Location, Recipe } from "@/lib/supabase/types";
import { submitRecipeRequest, saveRecipeRequestDraft, cancelRecipeRequestDraft, type RecipeRequestLineInput } from "./actions";

export function RecipeRequestForm({
  locations,
  recipes,
  initialValues,
}: {
  locations: Location[];
  recipes: Recipe[];
  initialValues?: Record<string, unknown> | null;
}) {
  const initialLocationId = (initialValues?.location_id as string | undefined) ?? "";
  const initialLines = (initialValues?.lines as RecipeRequestLineInput[] | undefined) ?? [];

  const [locationId, setLocationId] = useState(initialLocationId);
  const [lines, setLines] = useState<RecipeRequestLineInput[]>(initialLines);

  const [recipeId, setRecipeId] = useState("");
  const [size, setSize] = useState<RecipeSizeKey>("single");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  function handleAddLine() {
    setError(null);
    if (!recipeId) {
      setError("Select a recipe to add.");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    setLines((prev) => [...prev, { recipe_id: recipeId, size, quantity: qty, note: note.trim() || null }]);
    setRecipeId("");
    setSize("single");
    setQuantity("1");
    setNote("");
  }

  function handleRemoveLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePost() {
    setError(null);
    setSaved(false);
    setDraftSaved(false);
    if (!locationId) {
      setError("Select a location first.");
      return;
    }
    if (!lines.length) {
      setError("Add at least one recipe.");
      return;
    }
    startTransition(async () => {
      const res = await submitRecipeRequest(locationId, lines);
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setLines([]);
      }
    });
  }

  function handleSaveDraft() {
    setError(null);
    setSaved(false);
    setDraftSaved(false);
    if (!locationId) {
      setError("Select a location first.");
      return;
    }
    startTransition(async () => {
      const res = await saveRecipeRequestDraft(locationId, lines);
      if (res?.error) {
        setError(res.error);
      } else {
        setDraftSaved(true);
      }
    });
  }

  function handleCancel() {
    setError(null);
    setSaved(false);
    setDraftSaved(false);
    startTransition(async () => {
      await cancelRecipeRequestDraft();
      setLocationId("");
      setLines([]);
    });
  }

  const hasInput = !!locationId || lines.length > 0;

  return (
    <div className="max-w-2xl">
      {initialValues && (
        <p className="mb-3 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
          Resuming a saved draft — add more recipes, post it, or keep building.
        </p>
      )}

      <label className="mb-4 block text-sm text-gray-600">
        Location
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {locationDisplayName(l)}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 grid gap-3 rounded-md border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium">Add a recipe</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Recipe
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select…</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Size
            <select value={size} onChange={(e) => setSize(e.target.value as RecipeSizeKey)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {RECIPE_SIZE_DEFS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Quantity
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-600">
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 7pm set"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button type="button" onClick={handleAddLine} className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add to request
        </button>
      </div>

      <p className="mb-2 text-sm text-gray-500">
        {lines.length} recipe{lines.length === 1 ? "" : "s"} lined up for this request.
      </p>
      <ul className="mb-4 space-y-1">
        {lines.map((line, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
            <span>
              {recipeById.get(line.recipe_id)?.name ?? "—"}
              <span className="ml-2 text-xs text-gray-400">
                {recipeSizeLabel(line.size)} × {line.quantity}
                {line.note ? ` — ${line.note}` : ""}
              </span>
            </span>
            <button type="button" onClick={() => handleRemoveLine(i)} className="text-red-600 hover:underline">
              Remove
            </button>
          </li>
        ))}
        {!lines.length && <li className="text-sm text-gray-400">No recipes added yet.</li>}
      </ul>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {saved && !isPending && <p className="mt-2 text-sm text-green-600">✓ Request posted to the queue</p>}
      {draftSaved && !isPending && <p className="mt-2 text-sm text-yellow-700">✓ Saved for later</p>}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={handlePost}
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Post request"}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Save for later
        </button>
        {hasInput && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
