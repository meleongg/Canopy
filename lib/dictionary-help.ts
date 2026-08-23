export type ContextualDictionaryEntry = {
  entryId: string;
  text: string;
  pinyin: string;
  definitions: string[];
  card?: { id: string; phoneticReading: string[]; definitions: string[] };
};

export function shouldHighlightFocusedDictionaryOccurrence({
  isSeed,
  occurrence,
}: {
  isSeed: boolean;
  occurrence: number;
}) {
  return isSeed || occurrence === 0;
}
