import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { ReviewSessionView } from "@/app/review/review-session-view";
import { getDashboardData } from "@/lib/data";
import { queryKeys } from "@/lib/query-keys";
import { serializeDashboardCards } from "@/lib/serialization";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await requireAuth();
  const cards = serializeDashboardCards(
    await getDashboardData(session.user.id),
  );
  const now = new Date();
  const dueCards = cards.filter((card) => new Date(card.nextReviewAt) <= now);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });

  queryClient.setQueryData(queryKeys.reviewQueue, dueCards);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReviewSessionView initialDueCards={dueCards} />
    </HydrationBoundary>
  );
}
