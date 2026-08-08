import { requireAuth } from "@/lib/session";
import { HistoryView } from "./history-view";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await requireAuth();
  return <HistoryView />;
}
