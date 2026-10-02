export function sightingsLabel(count: number): string {
  return count === 1 ? "1 sighting" : `${count.toLocaleString()} sightings`;
}

export function speciesCountLabel(count: number): string {
  return count === 1 ? "1 species" : `${count.toLocaleString()} species`;
}
