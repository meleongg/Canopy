import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { DashboardView } from "@/app/dashboard/dashboard-view";
import { getDashboardData, getDashboardLearningRhythm } from "@/lib/data";
import { queryKeys } from "@/lib/query-keys";
import { requireAuth } from "@/lib/session";
import { serializeDashboardCards } from "@/lib/serialization";
import { getOnboardingCompletedAt } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  const onboardingCompletedAt = await getOnboardingCompletedAt(session.user.id);
  if (!onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  const [dashboardCards, learningRhythm] = await Promise.all([
    getDashboardData(session.user.id),
    getDashboardLearningRhythm(session.user.id),
  ]);
  const cards = serializeDashboardCards(dashboardCards);

  queryClient.setQueryData(queryKeys.dashboardCards, cards);
  queryClient.setQueryData(queryKeys.reviewQueue, cards);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView
        initialCards={cards}
        initialLearningRhythm={learningRhythm}
      />
    </HydrationBoundary>
  );
}
