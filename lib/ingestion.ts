import { pinyin } from "pinyin-pro";
import { getJyutpingList } from "to-jyutping";

export type ParsedVocabularyEntry = {
  languageCode: string;
  targetText: string;
  phoneticReading: string[];
  definitions: string[];
  linguisticMeta?: {
    alternatives?: string[];
    partOfSpeech?: string[];
  };
};

type NodeRsJiebaModule = typeof import("@node-rs/jieba");
type NodeRsJiebaDictModule = typeof import("@node-rs/jieba/dict");

function normalizeDefinitions(value: string | undefined) {
  return (value ?? "")
    .split(/[;/,]|(?:\s{2,})/)
    .map((definition) => definition.trim())
    .filter(Boolean);
}

function stripPlecoBrackets(value: string) {
  return value.replace(/^\s*\[?|\]?\s*$/g, "").trim();
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

async function phoneticFor(
  languageCode: string,
  targetText: string,
  supplied = "",
) {
  if (supplied) {
    return stripPlecoBrackets(supplied).split(/\s+/).filter(Boolean);
  }

  if (languageCode.startsWith("zh-HK") || languageCode.startsWith("yue")) {
    return getJyutpingList(targetText)
      .map(([, reading]) => reading)
      .filter((reading): reading is string => Boolean(reading));
  }

  if (languageCode.startsWith("zh")) {
    return pinyin(targetText, { type: "array", toneType: "symbol" });
  }

  return targetText.split(/\s+/).filter(Boolean);
}

export async function parseVocabularyLog(
  rawText: string,
  languageCode = "zh-CN",
): Promise<ParsedVocabularyEntry[]> {
  const rows = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = await Promise.all(
    rows.map(async (row) => {
      const columns = row.split(/\t+/).map((column) => column.trim());
      const [targetText, possibleReading, ...definitionColumns] = columns;
      const definitions = normalizeDefinitions(definitionColumns.join("; "));
      const phoneticReading = await phoneticFor(
        languageCode,
        targetText,
        possibleReading && definitions.length > 0 ? possibleReading : "",
      );

      if (languageCode.startsWith("zh")) {
        const segments = await segmentMandarin(targetText);
        return {
          languageCode,
          targetText,
          phoneticReading,
          definitions:
            definitions.length > 0
              ? definitions
              : [possibleReading ?? "Imported term"],
          linguisticMeta: {
            alternatives: segments.length > 1 ? segments : undefined,
          },
        };
      }

      return {
        languageCode,
        targetText,
        phoneticReading,
        definitions:
          definitions.length > 0
            ? definitions
            : [possibleReading ?? "Imported term"],
      };
    }),
  );

  return Array.from(
    new Map(
      entries
        .filter((entry) => entry.targetText)
        .map((entry) => [`${entry.languageCode}:${entry.targetText}`, entry]),
    ).values(),
  );
}
