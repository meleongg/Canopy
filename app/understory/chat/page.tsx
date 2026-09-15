import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { UnderstoryChatView } from "@/app/understory/chat/chat-view";
import { getDashboardData } from "@/lib/data";
import { queryKeys } from "@/lib/query-keys";
import { requireAuth } from "@/lib/session";
import { serializeDashboardCards } from "@/lib/serialization";
import { getUserPreferences } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

export default async function UnderstoryChatPage() {
  const session = await requireAuth();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  const cards = serializeDashboardCards(await getDashboardData(session.user.id));
  const preferences = await getUserPreferences(session.user.id);
  queryClient.setQueryData(queryKeys.understorySeeds, cards);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UnderstoryChatView
        initialCards={cards}
        playbackSpeed={Number(preferences.playbackSpeed)}
      />
    </HydrationBoundary>
  );
}
