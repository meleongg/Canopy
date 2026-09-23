import type { SerializedDashboardCard } from "@/lib/serialization";

export type WorkspaceCard = SerializedDashboardCard;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
