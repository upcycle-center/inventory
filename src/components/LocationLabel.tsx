// Consistent "YD code in front of the name" rendering everywhere a
// location shows up in the UI -- table cells, headings, list items.
export function LocationLabel({ location }: { location: { name: string; yellow_dog_code?: string | null } }) {
  return (
    <>
      {location.yellow_dog_code && (
        <span className="mr-1 font-mono text-xs text-gray-400">{location.yellow_dog_code}</span>
      )}
      {location.name}
    </>
  );
}
