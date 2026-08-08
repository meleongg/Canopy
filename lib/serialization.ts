import type { DashboardCard } from "@/lib/data";

export type SerializedDashboardCard = Omit<
  DashboardCard,
  "nextReviewAt" | "lastReviewedAt" | "createdAt"
> & {
  nextReviewAt: string;
  lastReviewedAt: string | null;
  createdAt: string;
};

export function serializeDashboardCards(
  cards: DashboardCard[],
): SerializedDashboardCard[] {
  return cards.map((card) => ({
    ...card,
    nextReviewAt: card.nextReviewAt.toISOString(),
    lastReviewedAt: card.lastReviewedAt?.toISOString() ?? null,
    createdAt: card.createdAt.toISOString(),
  }));
}
