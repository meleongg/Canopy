import { isChinese, phoneticTokensForText } from "@/lib/phonetics";
import {
  type ExampleContext,
  MAX_EXAMPLE_CONTEXTS,
} from "@/lib/example-contexts";

export type ParsedVocabularyEntry = {
  languageCode: string;
  targetText: string;
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

function normalizeDefinitions(value: string | undefined) {
  return (value ?? "")
    .split(/[;/,]|(?:\s{2,})/)
    .map((definition) => definition.trim())
    .filter(Boolean);
}

function splitRow(row: string) {
  if (row.includes("\t")) {
    return row.split(/\t+/).map((column) => column.trim());
  }

  return row.split(",").map((column) => column.trim());
}

function isCommentRow(row: string) {
  return row.startsWith("//") || row.startsWith("#");
}

function isLikelyReading(value = "") {
  return /[1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(value);
}

function hasHan(value: string) {
  return /\p{Script=Han}/u.test(value);
}

function isPartOfSpeechToken(value: string) {
  return /^(noun|verb|adjective|adj|adverb|adv|pronoun|pron|preposition|prep|conjunction|conj|interjection|idiom|measure|particle)$/i.test(
    value,
  );
}

function isPinyinToken(value: string) {
  return !hasHan(value) && /[1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(value);
}

function isNeutralPinyinParticle(value: string) {
  return /^(de|le|ge|men|zi)$/i.test(
    value.replace(/[.,!?;:()[\]{}"“”‘’]/g, ""),
  );
}

function cleanPlecoDefinition(value: string) {
  return value
    .replace(
      /^(?:(?:noun|verb|adjective|adj|adverb|adv|pronoun|pron|preposition|prep|conjunction|conj|interjection|idiom|measure|particle|literary|figurative|fig)\s+)+/i,
      "",
    )
    .trim();
}

function splitPlecoDefinitions(value: string) {
  return value.split(";").map(cleanPlecoDefinition).filter(Boolean);
}

function parsePlecoBody(body: string): {
  definitions: string[];
  exampleContexts: ExampleContext[];
} {
  const tokens = body.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const definitionChunks: string[] = [];
  const exampleContexts: ExampleContext[] = [];
  let definitionTokens: string[] = [];
  let index = 0;

  function flushDefinitions() {
    const chunk = definitionTokens.join(" ").trim();
    if (chunk) {
      definitionChunks.push(chunk);
    }
    definitionTokens = [];
  }

  while (index < tokens.length) {
    const token = tokens[index];

    if (!hasHan(token)) {
      definitionTokens.push(token);
      index += 1;
      continue;
    }

    flushDefinitions();

    const sentenceTokens: string[] = [];
    while (index < tokens.length && hasHan(tokens[index])) {
      sentenceTokens.push(tokens[index]);
      index += 1;
    }

    const phoneticTokens: string[] = [];
    while (
      index < tokens.length &&
      (isPinyinToken(tokens[index]) ||
        (phoneticTokens.length > 0 && isNeutralPinyinParticle(tokens[index])))
    ) {
      phoneticTokens.push(tokens[index]);
      index += 1;
    }

    const translationTokens: string[] = [];
    while (index < tokens.length && !hasHan(tokens[index])) {
      const laterHanIndex = tokens.findIndex(
        (nextToken, nextIndex) => nextIndex > index && hasHan(nextToken),
      );
      if (
        translationTokens.length > 0 &&
        laterHanIndex > index &&
        isPartOfSpeechToken(tokens[index])
      ) {
        break;
      }

      translationTokens.push(tokens[index]);
      index += 1;
    }

    if (
      sentenceTokens.length > 0 &&
      exampleContexts.length < MAX_EXAMPLE_CONTEXTS
    ) {
      exampleContexts.push({
        sentence: sentenceTokens.join(" "),
        phonetic: phoneticTokens.join(" "),
        translation: translationTokens.join(" ").trim(),
        generatedAt: new Date().toISOString(),
      });
    }
  }

  flushDefinitions();

  return {
    definitions: definitionChunks.flatMap(splitPlecoDefinitions),
    exampleContexts,
  };
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

export async function parseVocabularyLog(
  rawText: string,
  languageCode = "zh-CN",
): Promise<ParsedVocabularyEntry[]> {
  const rows = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, "").trim())
    .filter((line) => line && !isCommentRow(line));

  const entries = await Promise.all(
    rows.map(async (row) => {
      const columns = splitRow(row);
      const [targetText, secondColumn, ...remainingColumns] = columns;
      const hasPlecoBody =
        columns.length >= 3 &&
        isLikelyReading(secondColumn) &&
        remainingColumns.length === 1;
      const hasExplicitReading = remainingColumns.length > 0;
      const possibleReading = hasExplicitReading ? secondColumn : "";
      const parsedPlecoBody = hasPlecoBody
        ? parsePlecoBody(remainingColumns[0] ?? "")
        : null;
      const definitionColumns =
        hasExplicitReading && !parsedPlecoBody
          ? remainingColumns
          : [secondColumn ?? ""];
      const definitions = parsedPlecoBody?.definitions.length
        ? parsedPlecoBody.definitions
        : normalizeDefinitions(definitionColumns.join("; "));
      const phoneticReading = phoneticTokensForText(
        languageCode,
        targetText,
        possibleReading && definitions.length > 0 ? possibleReading : "",
      );

      if (isChinese(languageCode)) {
        const segments = await segmentMandarin(targetText);
        return {
          languageCode,
          targetText,
          phoneticReading,
          definitions:
            definitions.length > 0
              ? definitions
              : [possibleReading ?? "Imported term"],
          exampleContexts: parsedPlecoBody?.exampleContexts,
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
        exampleContexts: parsedPlecoBody?.exampleContexts,
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
