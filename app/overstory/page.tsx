import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { OverstoryView } from "@/app/overstory/overstory-view";
import { getDashboardData } from "@/lib/data";
import { queryKeys } from "@/lib/query-keys";
import { requireAuth } from "@/lib/session";
import { serializeDashboardCards } from "@/lib/serialization";

export const dynamic = "force-dynamic";

export default async function OverstoryPage() {
  const session = await requireAuth();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  const cards = serializeDashboardCards(await getDashboardData(session.user.id));
  queryClient.setQueryData(queryKeys.overstorySeeds, cards);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OverstoryView initialCards={cards} />
    </HydrationBoundary>
  );
}
