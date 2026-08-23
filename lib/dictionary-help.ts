export type DictionaryHelpDensity = "helpful" | "all";

export function shouldHighlightDictionaryOccurrence({
  isSeed,
  density,
  occurrence,
}: {
  isSeed: boolean;
  density: DictionaryHelpDensity;
  occurrence: number;
}) {
  return isSeed || density === "all" || occurrence === 0;
}
