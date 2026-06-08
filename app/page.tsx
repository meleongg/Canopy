import { CanopyWorkspace, type WorkspaceCard } from "@/app/canopy-workspace";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cards = await getDashboardData();
  const serializedCards: WorkspaceCard[] = cards.map((card) => ({
    ...card,
    nextReviewAt: card.nextReviewAt.toISOString(),
    lastReviewedAt: card.lastReviewedAt?.toISOString() ?? null,
  }));

  return <CanopyWorkspace cards={serializedCards} />;
}
