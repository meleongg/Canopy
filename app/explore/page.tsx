import { DictionaryExplorerView } from "@/app/explore/dictionary-explorer-view";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  await requireAuth();
  return <DictionaryExplorerView />;
}
