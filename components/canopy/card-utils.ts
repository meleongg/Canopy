import type { WorkspaceCard } from "@/components/canopy/types";

export type SeedFilter = "due" | "weak" | "recent";

export const seedFilterLabels: Record<SeedFilter, string> = {
  due: "Due",
  weak: "Weak",
  recent: "Recent",
};

export function growthLabel(card: WorkspaceCard) {
  if (card.repetition >= 5 || card.interval >= 30) {
    return "Deep roots";
  }
  if (card.repetition > 0) {
    return "Sprouted leaf";
  }
  return "Seedling";
}

export function dueLabel(card: WorkspaceCard) {
  const due = new Date(card.nextReviewAt);
  if (due <= new Date()) {
    return "Due now";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(due);
}

export function contextGeneratedLabel(generatedAt: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(generatedAt));
}

export function cardMatchesSearch(card: WorkspaceCard, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    card.targetText,
    card.languageCode,
    card.phoneticReading.join(" "),
    card.definitions.join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function filterSeedCards(cards: WorkspaceCard[], filter: SeedFilter) {
  const now = new Date();

  if (filter === "due") {
    return cards.filter((card) => new Date(card.nextReviewAt) <= now);
  }

  if (filter === "weak") {
    return cards.filter(
      (card) => card.easiness <= 240 || card.repetition === 0,
    );
  }

  return [...cards]
    .sort((a, b) => {
      const left = new Date(a.lastReviewedAt ?? a.nextReviewAt).getTime();
      const right = new Date(b.lastReviewedAt ?? b.nextReviewAt).getTime();
      return right - left;
    })
    .slice(0, 12);
}

export async function fetchCards() {
  return fetchCardsByScope("active");
}

export async function fetchCardsByScope(scope: "active" | "archived" | "all") {
  const response = await fetch(`/api/cards?scope=${scope}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as { cards: WorkspaceCard[] };
  return payload.cards;
}

export async function streamTextResponse(
  response: Response,
  onToken: (token: string) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    onToken(await response.text());
    return;
  }

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    onToken(decoder.decode(value));
  }
}
