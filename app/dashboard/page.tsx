import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { DashboardView } from "@/app/dashboard/dashboard-view";
import { getDashboardData } from "@/lib/data";
import { queryKeys } from "@/lib/query-keys";
import { requireAuth } from "@/lib/session";
import { serializeDashboardCards } from "@/lib/serialization";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  const cards = serializeDashboardCards(await getDashboardData(session.user.id));

  queryClient.setQueryData(queryKeys.dashboardCards, cards);
  queryClient.setQueryData(queryKeys.reviewQueue, cards);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView initialCards={cards} />
    </HydrationBoundary>
  );
}
