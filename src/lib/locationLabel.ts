// Plain-text counterpart to <LocationLabel> for contexts that can't hold
// JSX -- <option> text, template strings inside a sentence.
export function locationDisplayName(location: { name: string; yellow_dog_code?: string | null }): string {
  return location.yellow_dog_code ? `${location.yellow_dog_code} ${location.name}` : location.name;
}
