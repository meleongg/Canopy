export const MAX_EXAMPLE_CONTEXTS = 3;

export type ExampleContext = {
  sentence: string;
  phonetic: string;
  translation: string;
  generatedAt: string;
};

export function normalizeExampleContexts(value: unknown): ExampleContext[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<ExampleContext>;
      if (!candidate.sentence) {
        return null;
      }

      return {
        sentence: String(candidate.sentence),
        phonetic: String(candidate.phonetic ?? ""),
        translation: String(candidate.translation ?? ""),
        generatedAt: String(candidate.generatedAt ?? new Date().toISOString()),
      };
    })
    .filter((item): item is ExampleContext => Boolean(item))
    .slice(0, MAX_EXAMPLE_CONTEXTS);
}
