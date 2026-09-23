import { isChinese, phoneticTokensForText } from "@/lib/phonetics";
import type { ExampleContext } from "@/lib/example-contexts";

export type ParsedVocabularyEntry = {
  languageCode: string;
  targetText: string;
  dictionaryEntryId?: string;
  simplifiedText?: string;
  traditionalText?: string;
  phoneticReading: string[];
  definitions: string[];
  exampleContexts?: ExampleContext[];
  linguisticMeta?: {
    alternatives?: string[];
    partOfSpeech?: string[];
  };
};

type NodeRsJiebaModule = typeof import("@node-rs/jieba");
type NodeRsJiebaDictModule = typeof import("@node-rs/jieba/dict");

function normalizeDefinitions(value: string) {
  return value
    .split(/[;/,]|(?:\s{2,})/)
    .map((definition) => definition.trim())
    .filter(Boolean);
}

async function segmentMandarin(text: string) {
  try {
    const [{ Jieba }, { dict }] = (await Promise.all([
      import("@node-rs/jieba"),
      import("@node-rs/jieba/dict"),
    ])) as [NodeRsJiebaModule, NodeRsJiebaDictModule];
    return Jieba.withDict(dict).cut(text, false).filter(Boolean);
  } catch {
    return Array.from(text);
  }
}

/** Build one learner-owned card entry from the Add Card form fields. */
export async function buildManualVocabularyEntry(input: {
  languageCode: string;
  targetText: string;
  phoneticReading?: string;
  definitions: string;
}): Promise<ParsedVocabularyEntry | null> {
  const targetText = input.targetText.trim();
  const definitions = normalizeDefinitions(input.definitions);
  if (!targetText || definitions.length === 0) {
    return null;
  }

  const phoneticReading = phoneticTokensForText(
    input.languageCode,
    targetText,
    input.phoneticReading?.trim() ?? "",
  );

  if (isChinese(input.languageCode)) {
    const segments = await segmentMandarin(targetText);
    return {
      languageCode: input.languageCode,
      targetText,
      phoneticReading,
      definitions,
      linguisticMeta: {
        alternatives: segments.length > 1 ? segments : undefined,
      },
    };
  }

  return {
    languageCode: input.languageCode,
    targetText,
    phoneticReading,
    definitions,
  };
}
