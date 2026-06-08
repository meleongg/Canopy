import { convert, pinyin } from "pinyin-pro";
import { getJyutpingList, getJyutpingText } from "to-jyutping";

export function isCantonese(languageCode: string) {
  return languageCode.startsWith("zh-HK") || languageCode.startsWith("yue");
}

export function isChinese(languageCode: string) {
  return languageCode.startsWith("zh") || isCantonese(languageCode);
}

export function normalizeSuppliedReading(value: string) {
  const stripped = value.replace(/^\s*\[?|\]?\s*$/g, "").trim();
  const numberedTokens = stripped.match(/[a-züv:]+[1-5]/gi);
  const compactNumberedReading = stripped.replace(/[\s'·.-]/g, "");

  if (
    numberedTokens?.length &&
    numberedTokens.join("").toLowerCase() ===
      compactNumberedReading.toLowerCase()
  ) {
    return numberedTokens.map((token) =>
      convert(token.replace(/u:/gi, "v"), { format: "numToSymbol" }),
    );
  }

  return stripped
    .split(/\s+/)
    .map((token) => {
      if (/[a-züv:]+[1-5]/i.test(token)) {
        return convert(token.replace(/u:/gi, "v"), {
          format: "numToSymbol",
        });
      }

      return token;
    })
    .filter(Boolean);
}

export function phoneticTokensForText(
  languageCode: string,
  text: string,
  supplied = "",
) {
  if (supplied) {
    return normalizeSuppliedReading(supplied);
  }

  if (isCantonese(languageCode)) {
    return getJyutpingList(text)
      .map(([, reading]) => reading)
      .filter((reading): reading is string => Boolean(reading));
  }

  if (languageCode.startsWith("zh")) {
    return pinyin(text, {
      type: "array",
      toneType: "symbol",
      nonZh: "removed",
    });
  }

  return text.split(/\s+/).filter(Boolean);
}

export function phoneticTextForSentence(
  languageCode: string,
  sentence: string,
  fallback: string[] = [],
) {
  if (isCantonese(languageCode)) {
    return getJyutpingText(sentence);
  }

  if (languageCode.startsWith("zh")) {
    return phoneticTokensForText(languageCode, sentence).join(" ");
  }

  return fallback.join(" ");
}
