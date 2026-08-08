import type { ExampleContext } from "@/lib/example-contexts";
import type { SerializedDashboardCard } from "@/lib/serialization";

export type WorkspaceCard = SerializedDashboardCard;

export type ImportDraft = {
  languageCode: string;
  targetText: string;
  phoneticReading: string[];
  definitions: string[];
  exampleContexts: ExampleContext[];
  linguisticMeta?: {
    alternatives?: string[];
    partOfSpeech?: string[];
  };
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
