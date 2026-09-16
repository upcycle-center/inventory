// A product's POS data-map memberships -- checking a box here is what
// gets it included in that POS system's export file (see Admin > Data
// Maps). Kept as its own fieldset, separate from ProductCoreFields, so
// more POS systems can be added here later without crowding pricing/type.
export function ProductPosFields({ defaultPosSquare }: { defaultPosSquare: boolean }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">POS</p>
      <p className="mb-3 text-sm text-gray-500">
        Which POS data-map export files this product should be included in.
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" name="pos_square" defaultChecked={defaultPosSquare} className="h-4 w-4" />
        POS Square — include in the Square data map export
      </label>
    </div>
  );
}
