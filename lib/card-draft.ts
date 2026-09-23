import { normalizeSuppliedReading } from "@/lib/phonetics";

export const MAX_HEADWORD_HAN_CHARS = 8;
export const MAX_SOURCE_CONTEXT_CHARS = 500;
export const MAX_ENGLISH_INTENT_CHARS = 500;

export type CaptureMode = "inbound" | "outbound";

export type CardDraftFields = {
  targetText: string;
  phoneticReading: string;
  definitions: string;
  dictionaryEntryId?: string;
};

/** One editable draft option returned by `/api/cards/draft`. */
export type CardDraftOption = {
  id: string;
  register: "casual" | "neutral" | "formal" | null;
  registerLabel: string | null;
  headword: string;
  phoneticReading: string;
  definitions: string;
  contextualMeaning: string;
  sourceSentence: string;
  dictionaryEntryId: string | null;
  grounded: boolean;
};

export type CardDraftAssistResult = {
  mode: CaptureMode;
  options: CardDraftOption[];
  helpMessage: string | null;
};

/** Client-safe shape returned by `/api/dictionary/autofill`. */
export type AutofillMatch = {
  entryId: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
  matchKind: "exact" | "partial" | "component";
};

export type AutofillResult = {
  query: string;
  matches: AutofillMatch[];
  exactMatch: boolean;
  suggestSplit: boolean;
  helpMessage: string | null;
};

export function countHanCharacters(text: string) {
  return (text.match(/\p{Script=Han}/gu) ?? []).length;
}

export function headwordLengthMessage(text: string) {
  const hanCount = countHanCharacters(text);
  if (hanCount > MAX_HEADWORD_HAN_CHARS) {
    return `Keep the headword to ${MAX_HEADWORD_HAN_CHARS} Chinese characters or fewer (now ${hanCount}).`;
  }
  return null;
}

/** Shared mapping: CC-CEDICT entry → editable Add Card draft fields. */
export function draftFieldsFromDictionaryEntry(entry: {
  entryId: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  definitions: string[];
}): CardDraftFields {
  return {
    targetText: entry.simplified,
    phoneticReading: normalizeSuppliedReading(entry.pinyin)
      .map((token) => token.toLocaleLowerCase())
      .join(" "),
    definitions: entry.definitions.join("; "),
    dictionaryEntryId: entry.entryId,
  };
}
