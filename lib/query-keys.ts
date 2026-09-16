export const queryKeys = {
  dashboardCards: ["dashboardCards"] as const,
  reviewQueue: ["reviewQueue"] as const,
  overstorySeeds: ["overstorySeeds"] as const,
  understorySeeds: ["understorySeeds"] as const,
  userPreferences: ["userPreferences"] as const,
  practiceHistory: (filter: string) => ["practiceHistory", filter] as const,
  collectionRoot: ["collection"] as const,
  collection: (scope: "active" | "archived", query: string, page: number) =>
    ["collection", scope, query, page] as const,
  dictionaryHistory: ["dictionaryHistory"] as const,
  dictionarySearchRoot: ["dictionarySearch"] as const,
  dictionarySearch: (scope: string, query: string) =>
    ["dictionarySearch", scope, query] as const,
  dictionaryDiscoveries: ["dictionaryDiscoveries"] as const,
};
