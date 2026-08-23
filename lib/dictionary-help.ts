export type DictionaryHelpDensity = "helpful" | "all";

export type ContextualDictionaryEntry = {
  entryId: string;
  text: string;
  pinyin: string;
  definitions: string[];
  card?: { id: string; phoneticReading: string[]; definitions: string[] };
};

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
