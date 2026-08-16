export const CC_CEDICT_SOURCE_URL =
  "https://www.mdbg.net/chinese/dictionary?page=cc-cedict";
export const CC_CEDICT_LICENSE_URL =
  "https://creativecommons.org/licenses/by-sa/4.0/";

export type CcCedictEntry = {
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
};

/**
 * Parses the V1 and V2 entry forms published by CC-CEDICT. Comments and
 * malformed lines return null so import callers can count only usable entries.
 */
export function parseCcCedictLine(line: string): CcCedictEntry | null {
  const value = line.trim();
  if (!value || value.startsWith("#")) {
    return null;
  }

  const match = value.match(
    /^(\S+)\s+(\S+)\s+(?:\[\[(.+?)\]\]|\[(.+?)\])\s+\/(.*)\/\s*$/u,
  );
  const pinyin = (match?.[3] ?? match?.[4] ?? "").trim();
  const definitions = (match?.[5] ?? "")
    .split("/")
    .map((definition) => definition.trim())
    .filter(Boolean);

  if (!match || !pinyin || definitions.length === 0) {
    return null;
  }

  return {
    traditional: match[1],
    simplified: match[2],
    pinyin,
    definitions,
  };
}
