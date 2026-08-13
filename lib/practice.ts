export const PRACTICE_COUNTS = [5, 10, 20] as const;

export const PRACTICE_SOURCES = [
  {
    value: "random",
    label: "Random",
    description: "A varied handful from your active collection.",
  },
  {
    value: "recent",
    label: "Recently added",
    description: "Spend more time with vocabulary you just brought in.",
  },
  {
    value: "earlier",
    label: "Earlier additions",
    description: "Return to vocabulary from further back in your collection.",
  },
] as const;

export type PracticeSource = (typeof PRACTICE_SOURCES)[number]["value"];

export function practiceCountFrom(value: string | string[] | undefined) {
  const count = Number(Array.isArray(value) ? value[0] : value);
  return PRACTICE_COUNTS.includes(count as (typeof PRACTICE_COUNTS)[number])
    ? count
    : null;
}

export function practiceSourceFrom(value: string | string[] | undefined) {
  const source = Array.isArray(value) ? value[0] : value;
  return PRACTICE_SOURCES.some((option) => option.value === source)
    ? (source as PracticeSource)
    : "random";
}

export function practiceSourceLabel(source: PracticeSource) {
  return PRACTICE_SOURCES.find((option) => option.value === source)!.label;
}
